"""Pydantic request/response schemas for the member schedule API.

Validation rules implemented here (per implementation requirements):
- title required, max 120 characters (raised from 60 on 2026-07-16 — see
  database/migrations/2026-07-16-increase-member-schedule-title-limit.sql)
- notes max 240 characters
- priority must be High / Medium / Low
- date must be a valid date
- start/end optional; if both present, end must be greater than start
- source_scope and is_official_truth are never accepted from create/update
  request bodies — they are server-controlled only.

Category (2026-07-22 — replaces the 2026-07-14 permanent-category rule):
the backend is the only authority for category classification. `category`
is accepted on both create and update requests only for backward
compatibility with any existing caller that still sends it — it is never
read for classification (see classify_new_task/classify_updated_task in
backend/routers/member_schedules.py), so a client cannot select or
override the assigned category by sending any value, valid or not. Kept
as a loosely-typed Optional[str] (not an enum) on both schemas so an
unexpected value is silently ignored rather than rejected.
MemberScheduleEventOut.category stays a plain `str` so existing
pre-migration rows with an old placeholder category value can still be
read/serialized without breaking GET.
"""

from datetime import date as date_type, datetime, time as time_type
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from backend.config import (
    LEAVE_COORDINATION_COPY_NOTICE,
    LEAVE_FULL_DAY_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES,
    LEAVE_POLICY_SOURCE_ID,
    SHORT_LEAVE_MONTHLY_CAP_MINUTES,
    VALID_PRIORITIES,
)
from backend.time_utils import derive_task_outcome


class TimeFrameIn(BaseModel):
    """One time frame within a multiple-time-frames-per-Task submission
    (multiple-time-frames-per-task, 2026-07-27). Each valid frame becomes
    its own separate MemberScheduleEvent row — see the module-level note
    on MemberScheduleEventCreate.time_frames for the full contract.
    Deliberately loosely typed (no end>start validator here, unlike the
    top-level start/end pair) — mirrors BulkTaskRowIn's own reasoning: real
    validation happens once in the router (classify_time_frame_set) so an
    incomplete/invalid frame produces one structured, frame-numbered error
    instead of a generic Pydantic 422 that can't reference "time frame 2"."""

    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None


class MemberScheduleEventCreate(BaseModel):
    date: date_type
    title: str = Field(..., max_length=120, min_length=1)
    # Non-authoritative — accepted only for backward compatibility, never
    # read for classification. See module docstring above.
    category: Optional[str] = None
    priority: str = Field(default="Medium")
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    notes: Optional[str] = Field(default=None, max_length=240)
    # Lunch/different-title ADVISORY confirmation (2026-07-27 — see
    # backend/routers/member_schedules.py detect_schedule_advisories/
    # schedule_confirmation_fingerprint). Additive, optional field: absent
    # or None on a first submission. When a prior response returned
    # {"error": "schedule_confirmation_required", ...,
    # "confirmation_fingerprint": "..."}, the frontend resubmits the exact
    # same payload with this field set to that value. The backend always
    # recomputes the current advisory set and its own fingerprint from
    # scratch — this value is never trusted as still-current truth, only
    # compared against the freshly recomputed one.
    confirmation_fingerprint: Optional[str] = None
    # Multiple time frames per Task (2026-07-27), additive: when present
    # and nonempty, this list is AUTHORITATIVE and the top-level start/end
    # above must both be absent/None (checked in the router — a request
    # that sets both is rejected as contradictory, never silently
    # resolved). Every frame is validated (backend/routers/
    # member_schedules.py classify_time_frame_set) and, once accepted,
    # becomes its own separate MemberScheduleEvent row sharing this same
    # date/title/priority/notes — no database schema change; see
    # create_member_schedule_event for the full sequence. Absent or empty
    # preserves the exact pre-existing single start/end behavior for old
    # callers.
    time_frames: Optional[List[TimeFrameIn]] = None

    @field_validator("priority")
    @classmethod
    def priority_must_be_valid(cls, value: str) -> str:
        if value not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of {VALID_PRIORITIES}")
        return value

    @model_validator(mode="after")
    def end_after_start(self) -> "MemberScheduleEventCreate":
        if self.start is not None and self.end is not None and self.end <= self.start:
            raise ValueError("end must be greater than start when both are provided")
        return self


class MemberScheduleEventUpdate(BaseModel):
    """Editable fields only. source_scope and is_official_truth are
    intentionally absent from this model so they can never be set via the
    update endpoint, regardless of request body content.

    `category` is intentionally kept as a loosely-typed Optional[str], not
    an enum — accepted only for backward compatibility with any existing
    caller that still sends it. The router discards it unread (see
    update_member_schedule_event) and always assigns the server-computed
    value from classify_updated_task() instead."""

    date: Optional[date_type] = None
    title: Optional[str] = Field(default=None, max_length=120, min_length=1)
    category: Optional[str] = None
    priority: Optional[str] = None
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    notes: Optional[str] = Field(default=None, max_length=240)
    # Same additive advisory-confirmation field as MemberScheduleEventCreate
    # above — see its docstring. Evaluated against the resulting (post-edit)
    # date/title/start/end, excluding this task's own row.
    confirmation_fingerprint: Optional[str] = None
    # Multiple time frames per Task, Edit surface (2026-07-27), additive:
    # the occurrence being edited (event_id in the URL) is always "time
    # frame 1" — its date/title/priority/notes/start/end continue to be
    # edited exactly as before via the fields above. additional_time_frames
    # lists EXTRA new occurrences to create alongside that edit, sharing the
    # edited occurrence's final date/title/priority/notes. Absent or empty
    # preserves the exact pre-existing single-row update behavior. This
    # never causes any existing sibling occurrence (any other row that
    # happens to share the same title/date) to be discovered, grouped, or
    # modified — only event_id itself is updated, and only the frames
    # listed here are newly inserted. See update_member_schedule_event.
    additional_time_frames: Optional[List[TimeFrameIn]] = None

    @field_validator("priority")
    @classmethod
    def priority_must_be_valid(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_PRIORITIES:
            raise ValueError(f"priority must be one of {VALID_PRIORITIES}")
        return value

    @model_validator(mode="after")
    def end_after_start(self) -> "MemberScheduleEventUpdate":
        if self.start is not None and self.end is not None and self.end <= self.start:
            raise ValueError("end must be greater than start when both are provided")
        return self


class MemberScheduleEventOut(BaseModel):
    id: UUID
    member_key: str
    member_label: str
    date: date_type = Field(validation_alias="event_date")
    title: str
    category: str
    priority: str
    start: Optional[time_type] = Field(default=None, validation_alias="start_time")
    end: Optional[time_type] = Field(default=None, validation_alias="end_time")
    notes: Optional[str] = None
    source_scope: str
    is_official_truth: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # ── Task outcome (CONFIRMED UNTOUCHED-TASK OUTCOME, 2026-07-24) ──────
    # `outcome` is the only client-settable value here (via PUT
    # /{member_key}/{event_id}/outcome — TaskOutcomeUpdate below) and stays
    # None until a user explicitly marks a task Completed or Uncompleted.
    # `outcome_status` and `outcome_locked` are never stored — both are
    # derived fresh on every response by the validator below (never in
    # JavaScript), from `date`/`outcome` and Asia/Colombo "now", so a task
    # automatically reads as "No response" once its deadline passes
    # without any write ever happening (no scheduled/midnight job exists
    # in this codebase, and none is introduced by this feature). See
    # backend/time_utils.py derive_task_outcome() for the full rationale.
    outcome: Optional[Literal["Completed", "Uncompleted"]] = None
    outcome_status: str = "Pending"
    outcome_locked: bool = False

    # FINAL CONFIRMED REASON-TRANSITION RULE (2026-07-24). outcome_reason,
    # outcome_updated_at, and outcome_updated_by are plain passthrough
    # fields — stored as-is, never derived here (unlike outcome_status/
    # outcome_locked above). outcome_reason is NULL whenever outcome is
    # NULL or 'Completed' (enforced at write time by TaskOutcomeUpdate and
    # by the DB pairing CHECK constraint — see backend/models.py), so a
    # cleared reason is never returned by this API once a task has been
    # marked Completed; there is no separate "hide the old reason" step
    # here because there is nothing left to hide.
    outcome_reason: Optional[str] = None
    outcome_updated_at: Optional[datetime] = None
    outcome_updated_by: Optional[str] = None

    model_config = {"from_attributes": True, "populate_by_name": True}

    @model_validator(mode="after")
    def compute_outcome_fields(self) -> "MemberScheduleEventOut":
        self.outcome_status, self.outcome_locked = derive_task_outcome(self.date, self.outcome)
        return self


class TaskOutcomeUpdate(BaseModel):
    """Request body for PUT /api/member-schedules/{member_key}/{event_id}/outcome
    (CONFIRMED UNTOUCHED-TASK OUTCOME, 2026-07-24; reason/timestamp/actor
    behavior added same-day by the FINAL CONFIRMED REASON-TRANSITION RULE)
    — the only write path for MemberScheduleEvent.outcome/outcome_reason.
    'Pending' and 'No response' are never accepted here: they are derived,
    read-only display states (MemberScheduleEventOut.outcome_status), never
    persisted values. The endpoint itself
    (backend/routers/member_schedules.py update_member_schedule_event_outcome)
    rejects the request once the task's own deadline has passed, regardless
    of whether an outcome was already recorded.

    Reason contract (CONFIRMED):
    - outcome='Uncompleted' requires `reason` to be present and, once
      trimmed, nonblank and <=250 characters — otherwise this raises a
      ValidationError (422). The stored value is always the trimmed string,
      never the raw one (so leading/trailing whitespace never counts
      against the 250-character limit and is never persisted).
    - outcome='Completed' requires `reason` to be omitted, null, or an
      empty/whitespace-only string — normalized to None either way. A
      nonblank `reason` alongside outcome='Completed' is rejected with a
      ValidationError (422): this endpoint deliberately REJECTS rather than
      silently discards a client-supplied Completed reason, so a caller
      that thinks it is saving a reason against a Completed task finds out
      immediately rather than losing that text silently. The documented,
      deterministic Completed request shape is therefore always
      {"outcome": "Completed", "reason": null}.
    - Whatever value survives validation is exactly what the router writes
      to outcome_reason — see update_member_schedule_event_outcome, which
      never re-derives or re-trims it."""

    outcome: Literal["Completed", "Uncompleted"]
    reason: Optional[str] = None

    @model_validator(mode="after")
    def validate_reason_for_outcome(self) -> "TaskOutcomeUpdate":
        if self.outcome == "Uncompleted":
            trimmed = (self.reason or "").strip()
            if not trimmed:
                raise ValueError("A reason is required when marking a task Uncompleted.")
            if len(trimmed) > 250:
                raise ValueError("Reason must be 250 characters or fewer.")
            self.reason = trimmed
        else:  # Completed
            if self.reason is not None and self.reason.strip():
                raise ValueError(
                    "A reason cannot be provided when marking a task Completed — "
                    "the previous Uncompleted reason (if any) is cleared automatically."
                )
            self.reason = None
        return self


class BulkTaskRowIn(BaseModel):
    """One row of a same-day Bulk Tasks submission (POST
    /api/member-schedules/{member_key}/bulk). Deliberately loosely typed
    for title/priority/notes (plain Optional[str], no length/enum
    constraint at this layer) so a blank or partially-filled row can never
    fail Pydantic-level validation before the router's own blank-row
    detection and hard-validation pass run — every real rule (date
    required, title required/≤120 chars, notes ≤240 chars, priority in
    VALID_PRIORITIES, end > start) is enforced in
    backend/routers/member_schedules.py:_bulk_row_field_errors, which
    returns structured {row, field, code, message} errors instead of
    FastAPI's generic 422 body. start/end use the same field names as
    MemberScheduleEventCreate (not start_time/end_time) to match this
    API's existing single-Task-create convention. No `category` field
    exists here by design — category is always backend-assigned,
    identically to the single-create endpoint.

    `date` (CONFIRMED ADD-ROW DATE RULE, 2026-07-24 — supersedes the
    former "one common date shared by every row" business decision):
    every row now carries its own date. It is Optional here, like
    start/end, so a blank row (no date chosen yet) can never fail
    Pydantic-level validation before the router's own blank-row check
    runs; a NONBLANK row with no date is a hard `date_required` error from
    _bulk_row_field_errors, exactly like a missing title."""

    date: Optional[date_type] = None
    title: Optional[str] = None
    priority: Optional[str] = None
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    notes: Optional[str] = None
    # Multiple time frames per Task, Bulk surface (2026-07-27), additive:
    # same authoritative-when-present contract as
    # MemberScheduleEventCreate.time_frames — when nonempty, this row's own
    # start/end above must both be absent/None (checked in the router), and
    # each frame in this list expands into its own separate
    # MemberScheduleEvent row sharing this row's date/title/priority/notes.
    # Absent or empty preserves the exact pre-existing single-frame-per-row
    # Bulk behavior for old callers.
    time_frames: Optional[List[TimeFrameIn]] = None


class BulkTaskCreateRequest(BaseModel):
    """Request body for same-day Bulk Tasks creation. There is no
    top-level common `date` any more (CONFIRMED ADD-ROW DATE RULE,
    2026-07-24 — supersedes the former confirmed business decision #2 of
    one date shared by every row) — each row carries its own date via
    BulkTaskRowIn.date, independently editable and independently
    validated. `confirm_duplicates` defaults False: the first submission
    of a batch containing duplicate title/date/time combinations (within
    the batch or against existing active Tasks for a row's own member/
    date) is rejected with status="duplicate_confirmation_required" and
    creates nothing; the frontend resubmits the identical batch with
    confirm_duplicates=True only after the user explicitly confirms. The
    backend never trusts the earlier response as current truth — every
    call to this endpoint independently revalidates hard rules, Leave
    conflicts, and duplicates from scratch."""

    tasks: List[BulkTaskRowIn] = Field(default_factory=list)
    confirm_duplicates: bool = False
    # Same additive advisory-confirmation field as MemberScheduleEventCreate
    # (lunch/different-title overlap — a separate concern from
    # confirm_duplicates above, which only ever bypasses the pre-existing
    # exact title/time soft-duplicate warning). See
    # backend/routers/member_schedules.py detect_schedule_advisories/
    # schedule_confirmation_fingerprint.
    confirmation_fingerprint: Optional[str] = None


class BulkTaskRowErrorOut(BaseModel):
    """One hard-validation failure. `row` is the 1-indexed position of the
    row in the ORIGINAL submitted `tasks` array (including any blank rows
    that were skipped) — this matches what the user sees as "Row N" on
    their own form, so a reported row number is never shifted by earlier
    rows being blank. `row` is null for request-level errors that are not
    tied to one specific row (no nonblank rows submitted; nonblank row
    count exceeds MAX_BULK_TASK_ROWS)."""

    row: Optional[int] = None
    field: str
    code: str
    message: str


class BulkDuplicateWarningOut(BaseModel):
    """One duplicate-title/time warning (confirmed business decision #7).
    `source` is 'current_batch' (two or more submitted rows share the same
    normalized title/time — `rows` lists every matching row number) or
    'existing_task' (one submitted row matches a Task already saved for
    this member and the common date — `rows` is that single row number,
    and `existing_task_id` carries the stored Task's id for internal
    correlation only). `existing_task_id` is deliberately never
    interpolated into `message` — Step 10's "do not expose unnecessary
    internal IDs in visible frontend text" rule."""

    source: Literal["current_batch", "existing_task"]
    rows: List[int]
    title: str
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    existing_task_id: Optional[str] = None
    message: str


class BulkTaskCreateSuccessOut(BaseModel):
    """Success response — every nonblank, validated row was inserted in
    one atomic transaction sharing one authoritative created_at/updated_at
    and therefore one classification decision (Step 13). `items` reuses
    the exact same MemberScheduleEventOut shape the single-create endpoint
    already returns, so the frontend's existing apiItemToFrontend()
    conversion needs no bulk-specific variant."""

    status: Literal["created"] = "created"
    created_count: int
    items: List[MemberScheduleEventOut]


class HealthResponse(BaseModel):
    status: str
    service: str


class DurationChangeOut(BaseModel):
    """Previous-vs-current comparison for one category's duration.
    percentage is null exactly when direction is 'not_applicable'
    (previous == current == 0) — see backend/routers/member_schedules.py
    _duration_change()."""

    percentage: Optional[float] = None
    direction: Literal["increase", "decrease", "unchanged", "not_applicable"]


class DailyScheduleReportOut(BaseModel):
    # --- Existing fields (2026-07-14 and earlier) — preserved verbatim,
    # count-based, unchanged meaning. Do not repoint these to duration. ---
    member_key: str
    date: date_type
    scheduled_count: int
    unscheduled_count: int
    total_count: int
    scheduled_percentage: int
    unscheduled_percentage: int

    # --- New: count-based split percentages (schedule-summary-count-
    # duration-percentage, 2026-07-17). Two-decimal floats, null exactly
    # when total_count == 0 (no tasks to divide by -> N/A on the frontend).
    # Denominator is total_count only; never a leave-deduction or
    # adjusted-reference figure. Distinct from the whole-number
    # scheduled_percentage/unscheduled_percentage fields above, which are
    # preserved verbatim. ---
    scheduled_count_percentage: Optional[float] = None
    unscheduled_count_percentage: Optional[float] = None

    # --- New: duration metrics (2026-07-14 duration reporting) ---
    scheduled_duration_minutes: int
    unscheduled_duration_minutes: int
    total_duration_minutes: int

    scheduled_duration_used_task_count: int
    unscheduled_duration_used_task_count: int
    total_duration_used_task_count: int

    scheduled_duration_ignored_task_count: int
    unscheduled_duration_ignored_task_count: int
    total_duration_ignored_task_count: int

    # Null when total_duration_minutes == 0 (no valid duration to divide by).
    scheduled_duration_percentage: Optional[float] = None
    unscheduled_duration_percentage: Optional[float] = None

    # --- New: previous-period comparison ---
    previous_period_start: date_type
    previous_period_end: date_type

    previous_scheduled_duration_minutes: int
    previous_unscheduled_duration_minutes: int
    previous_total_duration_minutes: int

    scheduled_duration_change: DurationChangeOut
    unscheduled_duration_change: DurationChangeOut

    # --- New: leave-coordination-copy additions (REQ-LEAVE-COPY-001). These
    # are additive only — none of the fields above are altered in value or
    # meaning. base_leave_deduction_reference_minutes is a weekday-count
    # reference figure built from the confirmed Full-Day leave-deduction
    # constant (LEAVE_FULL_DAY_DEDUCTION_MINUTES) — it is NOT an official
    # attendance model or a claim about actual productive working time;
    # this system has no such model and does not invent one here.
    # active_leave_minutes (2026-07-16 simplification amendment — renamed
    # from approved_leave_minutes) counts every leave row where
    # deleted_at IS NULL; there is no Pending/Approved workflow to
    # distinguish. ---
    base_leave_deduction_reference_minutes: int
    active_leave_minutes: int
    adjusted_expected_work_minutes: int
    task_coverage_percentage: Optional[float] = None


class WeeklyScheduleReportOut(BaseModel):
    # --- Existing fields — preserved verbatim, count-based. ---
    member_key: str
    week_start: date_type
    week_end: date_type
    scheduled_count: int
    unscheduled_count: int
    total_count: int
    scheduled_percentage: int
    unscheduled_percentage: int

    # --- New: count-based split percentages (schedule-summary-count-
    # duration-percentage, 2026-07-17) — see DailyScheduleReportOut. ---
    scheduled_count_percentage: Optional[float] = None
    unscheduled_count_percentage: Optional[float] = None

    # --- New: duration metrics ---
    scheduled_duration_minutes: int
    unscheduled_duration_minutes: int
    total_duration_minutes: int

    scheduled_duration_used_task_count: int
    unscheduled_duration_used_task_count: int
    total_duration_used_task_count: int

    scheduled_duration_ignored_task_count: int
    unscheduled_duration_ignored_task_count: int
    total_duration_ignored_task_count: int

    scheduled_duration_percentage: Optional[float] = None
    unscheduled_duration_percentage: Optional[float] = None

    # --- New: previous-period comparison ---
    previous_period_start: date_type
    previous_period_end: date_type

    previous_scheduled_duration_minutes: int
    previous_unscheduled_duration_minutes: int
    previous_total_duration_minutes: int

    scheduled_duration_change: DurationChangeOut
    unscheduled_duration_change: DurationChangeOut

    base_leave_deduction_reference_minutes: int
    active_leave_minutes: int
    adjusted_expected_work_minutes: int
    task_coverage_percentage: Optional[float] = None


class MonthlyScheduleReportOut(BaseModel):
    """New report (2026-07-14 duration reporting). No count-based
    predecessor exists for monthly, so all fields use the duration-report
    naming introduced here — there is nothing legacy to preserve."""

    member_key: str
    month: str  # "YYYY-MM"
    month_start: date_type
    month_end: date_type

    scheduled_count: int
    unscheduled_count: int
    total_count: int
    scheduled_percentage: int
    unscheduled_percentage: int

    # --- New: count-based split percentages (schedule-summary-count-
    # duration-percentage, 2026-07-17) — see DailyScheduleReportOut. ---
    scheduled_count_percentage: Optional[float] = None
    unscheduled_count_percentage: Optional[float] = None

    scheduled_duration_minutes: int
    unscheduled_duration_minutes: int
    total_duration_minutes: int

    scheduled_duration_used_task_count: int
    unscheduled_duration_used_task_count: int
    total_duration_used_task_count: int

    scheduled_duration_ignored_task_count: int
    unscheduled_duration_ignored_task_count: int
    total_duration_ignored_task_count: int

    scheduled_duration_percentage: Optional[float] = None
    unscheduled_duration_percentage: Optional[float] = None

    previous_period_start: date_type
    previous_period_end: date_type

    previous_scheduled_duration_minutes: int
    previous_unscheduled_duration_minutes: int
    previous_total_duration_minutes: int

    scheduled_duration_change: DurationChangeOut
    unscheduled_duration_change: DurationChangeOut

    base_leave_deduction_reference_minutes: int
    active_leave_minutes: int
    adjusted_expected_work_minutes: int
    task_coverage_percentage: Optional[float] = None


LeaveType = Literal[
    "Short Leave", "Half-Day First", "Half-Day Second", "Full-Day", "Multi-Day"
]

_SINGLE_DATE_LEAVE_TYPES = ("Short Leave", "Half-Day First", "Half-Day Second", "Full-Day")


class MemberLeaveRecordCreate(BaseModel):
    """leave_type is immutable after creation (no update path changes it —
    mirrors the existing task category-immutability convention in
    backend/routers/member_schedules.py). half_day_period is never accepted
    from the client — the router derives it from leave_type server-side, so
    a client can never send a leave_type/half_day_period mismatch.

    There is no status field (2026-07-16 simplification amendment) — every
    new record is immediately active. coordination_copy_only,
    policy_source_id, and effective_leave_minutes are server-controlled
    only; effective_leave_minutes is computed and snapshotted at creation,
    not left NULL pending a later approval step."""

    leave_type: LeaveType
    start_date: date_type
    end_date: Optional[date_type] = None
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None
    purpose: Optional[str] = Field(default=None, max_length=240)
    external_reference: Optional[str] = Field(default=None, max_length=120)
    created_by: Optional[str] = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def apply_and_validate_dates(self) -> "MemberLeaveRecordCreate":
        if self.leave_type in _SINGLE_DATE_LEAVE_TYPES:
            if self.end_date is not None and self.end_date != self.start_date:
                raise ValueError(
                    f"{self.leave_type} requires end_date to equal start_date."
                )
            self.end_date = self.start_date
        else:  # Multi-Day
            if self.end_date is None:
                raise ValueError("Multi-Day leave requires end_date.")
            if self.end_date < self.start_date:
                raise ValueError("end_date must not be before start_date.")
        return self

    @model_validator(mode="after")
    def validate_time_fields(self) -> "MemberLeaveRecordCreate":
        if self.leave_type == "Short Leave":
            if self.start_time is None or self.end_time is None:
                raise ValueError("Short Leave requires both start_time and end_time.")
            if self.end_time <= self.start_time:
                raise ValueError("end_time must be later than start_time.")
        else:
            if self.start_time is not None or self.end_time is not None:
                raise ValueError(
                    f"{self.leave_type} does not accept start_time/end_time."
                )
        return self


class MemberLeaveRecordUpdate(BaseModel):
    """Editable fields for an active leave record. leave_type and
    half_day_period are never accepted here — changing the fundamental
    nature of a leave request requires deleting it and creating a new
    one, same rationale as task category immutability.

    There is no status field to transition (2026-07-16 simplification
    amendment) — an active record stays active until deleted via
    DELETE /api/member-leave/{member_key}/{leave_id}, which this schema
    does not model (no request body)."""

    start_date: Optional[date_type] = None
    end_date: Optional[date_type] = None
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None
    purpose: Optional[str] = Field(default=None, max_length=240)
    external_reference: Optional[str] = Field(default=None, max_length=120)
    updated_by: Optional[str] = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def end_after_start(self) -> "MemberLeaveRecordUpdate":
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time when both are provided.")
        if self.start_date is not None and self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date must not be before start_date.")
        return self


class MemberLeaveRecordOut(BaseModel):
    id: UUID
    member_key: str
    member_label: str
    leave_type: str
    half_day_period: Optional[str] = None
    start_date: date_type
    end_date: date_type
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None
    purpose: Optional[str] = None
    external_reference: Optional[str] = None
    coordination_copy_only: bool = True
    policy_source_id: str
    effective_leave_minutes: Optional[int] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    official_truth_notice: str = LEAVE_COORDINATION_COPY_NOTICE

    model_config = {"from_attributes": True, "populate_by_name": True}


class LeaveConfigurationOut(BaseModel):
    half_day_first_deduction_minutes: int = LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES
    half_day_second_deduction_minutes: int = LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES
    full_day_deduction_minutes: int = LEAVE_FULL_DAY_DEDUCTION_MINUTES
    short_leave_monthly_cap_minutes: int = SHORT_LEAVE_MONTHLY_CAP_MINUTES


class LeaveSummaryOut(BaseModel):
    member_key: str
    month: str  # "YYYY-MM"
    short_leave_active_minutes: int
    short_leave_cap_minutes: int
    short_leave_remaining_minutes: int
    configuration: LeaveConfigurationOut
    coordination_copy_only: bool = True
    official_truth_notice: str = LEAVE_COORDINATION_COPY_NOTICE
    policy_source_id: str = LEAVE_POLICY_SOURCE_ID


class LeaveConflictItemOut(BaseModel):
    leave_id: str
    leave_type: str
    start_date: date_type
    end_date: date_type
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None


class LeaveConflictResponseOut(BaseModel):
    """Documents the exact 409 body shape returned by
    backend/routers/member_schedules.py when a task save conflicts with
    active leave (every leave row where deleted_at IS NULL — there is no
    approval workflow to distinguish, 2026-07-16 simplification amendment).
    Not used as a FastAPI response_model (the route returns a JSONResponse
    directly so the body has no "detail" wrapper) — this schema exists so
    the contract is typed and testable."""

    error: Literal["leave_conflict"] = "leave_conflict"
    message: str
    conflicts: list[LeaveConflictItemOut]


class LeaveOverlapItemOut(BaseModel):
    """Same shape as LeaveConflictItemOut — kept as its own class (rather
    than reused) since the two 409 contracts (leave-vs-task,
    leave-vs-leave) are documented independently and may diverge later."""

    leave_id: str
    leave_type: str
    start_date: date_type
    end_date: date_type
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None


class LeaveOverlapResponseOut(BaseModel):
    """Documents the exact 409 body shape returned by
    backend/routers/member_leave.py (create and update) when a proposed
    leave record overlaps another active leave record already held by the
    same member (member-leave-overlap-prevention, 2026-07-17). Not used as
    a FastAPI response_model (the routes return a JSONResponse directly) —
    this schema exists so the contract is typed and testable. Deliberately
    has no `purpose` field on either the response or LeaveOverlapItemOut."""

    error: Literal["leave_overlap"] = "leave_overlap"
    message: str
    conflicts: list[LeaveOverlapItemOut]


class TaskConflictItemOut(BaseModel):
    task_id: str
    category: str
    event_date: date_type
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None


class TaskConflictResponseOut(BaseModel):
    """Documents the exact 409 body shape returned by
    backend/routers/member_leave.py (create and update) when a proposed
    leave record overlaps one or more active tasks (calendar-empty-slot-
    create-and-overlap-rules, 2026-07-20 — the reverse direction of
    LeaveConflictResponseOut above). Not used as a FastAPI response_model
    (the routes return a JSONResponse directly) — this schema exists so the
    contract is typed and testable. Deliberately has no `title`/`notes`
    field on either the response or TaskConflictItemOut."""

    error: Literal["task_conflict"] = "task_conflict"
    message: str
    conflicts: list[TaskConflictItemOut]


class StaffRecordOut(BaseModel):
    """Dashboard-facing staff record shape. As of 2026-08-11 this is an
    EXACT mirror of employee_management.staff on Ledsone — every column on
    StaffDashboardRecord is exposed here except the three pure bookkeeping
    timestamps (synced_at/created_at/updated_at), per explicit, deliberate
    user instruction (see member-aios/staff-data/README.md §0 and
    backend/models.py StaffDashboardRecord docstring for the full
    rationale, including the fcm_token exclusion).

    `id` is employee_management.staff.id directly (INTEGER, not a
    generated UUID as of 2026-08-11) — the approved stable identifier for
    the Staff Review Summaries feature.

    Includes PDPA-sensitive fields (email, phone, address, skype) and
    HR-sensitive fields (informed_leave_balance, urgent_leave_balance,
    is_approved) per the same explicit instruction — CLAUDE.md §6 governs
    handling of this data once exposed; this is a wider surface than the
    Staff Data dashboard has ever exposed before 2026-08-11."""

    id: int
    staff_code: Optional[str] = None
    name: Optional[str] = None
    role: Optional[int] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    roster: Optional[str] = None
    designation: Optional[str] = None
    joined_date: Optional[date_type] = None
    confirmed_date: Optional[date_type] = None
    address: Optional[str] = None
    skype: Optional[str] = None
    delete_status: Optional[bool] = None
    team_id: Optional[int] = None
    is_approved: Optional[int] = None
    staff_type: Optional[str] = None
    staff_level: Optional[str] = None
    informed_leave_balance: Optional[float] = None
    urgent_leave_balance: Optional[float] = None
    backup_staffs: Optional[str] = None

    model_config = {"from_attributes": True}


class StaffListResponse(BaseModel):
    records: list[StaffRecordOut]
    total: int
    limit: int
    offset: int
    filters: dict


class StaffFilterOptionsResponse(BaseModel):
    """team_ids replaces the former department_team name list — Ledsone's
    employee_management.staff carries only the raw team_id integer (mostly
    NULL), not a human-readable team/department name (that required a join
    the 2026-08-11 exact-mirror instruction does not include). See
    StaffRecordOut docstring."""

    team_ids: list[int]


# ── Staff Review Summaries (REQ-CAL-REV-001, 2026-08-03) ─────────────────
# Reviewer-owned staff review meeting summaries. reviewer_member_key is
# NEVER accepted from the client on any of these schemas — it is always
# server-derived from the validated Calendar token (backend/routers/
# calendar_auth.py get_verified_member) and assigned directly by the
# router, mirroring MemberLeaveRecordCreate's exclusion of member_key
# above. reviewed_staff_id uses staff.id (StaffRecordOut.id, INTEGER as of
# 2026-08-11 — employee_management.staff.id directly, not a generated
# UUID), never employee_number/staff_code — see that schema's docstring.


class StaffReviewSummaryCreate(BaseModel):
    """Request body for POST /api/staff-review-summaries. Only these three
    fields may ever be supplied by the browser — reviewer_member_key,
    created_at, updated_at, deleted_at, and id are all absent from this
    model by design, so a client attempting to send any of them has the
    value silently ignored by Pydantic, exactly as MemberLeaveRecordCreate
    excludes member_key/half_day_period above."""

    reviewed_staff_id: int
    meeting_date: date_type
    summary_text: str = Field(..., min_length=1, max_length=10000)

    @field_validator("summary_text")
    @classmethod
    def trim_and_validate_summary_text(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("summary_text must contain at least 1 non-whitespace character.")
        if len(trimmed) > 10000:
            raise ValueError("summary_text must be 10,000 characters or fewer after trimming.")
        return trimmed


class StaffReviewSummaryUpdate(BaseModel):
    """Editable fields only. reviewed_staff_id is intentionally absent —
    Phase 1 has no requirement for reassigning who was reviewed (mirrors
    MemberLeaveRecordUpdate's exclusion of leave_type above); correcting
    the reviewed person requires deleting this summary and creating a new
    one. reviewer_member_key, created_at, updated_at, and deleted_at are
    likewise never accepted here."""

    meeting_date: Optional[date_type] = None
    summary_text: Optional[str] = Field(default=None, min_length=1, max_length=10000)

    @field_validator("summary_text")
    @classmethod
    def trim_and_validate_summary_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("summary_text must contain at least 1 non-whitespace character.")
        if len(trimmed) > 10000:
            raise ValueError("summary_text must be 10,000 characters or fewer after trimming.")
        return trimmed


class StaffReviewSummaryOut(BaseModel):
    """Response shape for every Staff Review Summaries route. Never
    returned for a soft-deleted record (deleted_at IS NOT NULL) — every
    route filters those out server-side (backend/routers/
    staff_review_summaries.py), so this schema has no deleted_at field at
    all; there is nothing for it to ever expose.

    reviewed_staff_full_name is populated by the router via a live lookup
    against staff_dashboard_records at read time (no
    reviewed_staff_name_snapshot column exists — approved technical design
    §5) — display always reflects the current name, not a
    name-at-review-time snapshot. The API field name is kept as
    `reviewed_staff_full_name` for contract stability even though the
    underlying ORM column is now `StaffDashboardRecord.name` (Ledsone's own
    column name, since 2026-08-11) — the router maps name -> this field.

    reviewed_staff_calling_name was removed 2026-08-11 along with
    StaffDashboardRecord.calling_name (Ledsone's employee_management.staff
    has no equivalent field) — see member-aios/staff-data/README.md."""

    id: UUID
    reviewer_member_key: str
    reviewed_staff_id: int
    reviewed_staff_full_name: Optional[str] = None
    meeting_date: date_type
    summary_text: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # REQ-CAL-REV-LOCK-004 (2026-08-06) — derived server-side on every
    # read from (reviewer_member_key, created_at) vs. the authoritative
    # Asia/Colombo clock; never stored, never client-supplied. can_edit is
    # true only for the record's own creator, and only through 23:59:59
    # Asia/Colombo on created_at's own calendar date. edit_deadline is
    # informational (that same cutoff instant) and is populated even when
    # can_edit is already false. Both are additive/backward-compatible —
    # no existing field's meaning changes.
    can_edit: bool = False
    edit_deadline: Optional[datetime] = None

    model_config = {"from_attributes": True}


class StaffReviewSummaryListResponse(BaseModel):
    records: list[StaffReviewSummaryOut]
    total: int
    limit: int
    offset: int


# ── Knowledge Management (REQ-KM-CRUD-002/003) ───────────────────────────
#
# Request models never accept a system-owned field (id/created_at/
# updated_at/created_by/updated_by/deleted_at/deleted_by/
# source_url_normalized/current_version/lifecycle_status/compliance_status/
# google_ownership_status at create time) — every one of those is either
# server-derived from the verified actor token
# (backend/routers/calendar_auth.py get_verified_member) or server-computed
# (backend/routers/knowledge_document_logic.py normalize_source_url), per
# REQ-KM-CRUD-002 rule 2/REQ-KM-CRUD-003 Phase 3. A client attempting to
# send any of them has the value silently ignored by Pydantic, exactly as
# StaffReviewSummaryCreate excludes reviewer_member_key above.

from urllib.parse import urlsplit as _km_urlsplit  # noqa: E402 — grouped with this section, not the file-top imports, to keep the diff scoped to this addition

from backend.config import (  # noqa: E402
    VALID_KNOWLEDGE_COMPLIANCE_STATUSES,
    VALID_KNOWLEDGE_DOCUMENT_TYPES,
    VALID_KNOWLEDGE_LIFECYCLE_STATUSES,
)


def _validate_safe_http_url(value: str) -> str:
    """Schema-layer input-shape check only (422 on a syntactically unsafe
    URL) — distinct from, and not a duplicate of, the ONE shared
    normalization/duplicate-detection algorithm in
    backend/routers/knowledge_document_logic.py (Phase 4), which the
    router calls separately. Rejects javascript:/data:/blank/unparsable
    values; accepts only http:// and https://."""
    try:
        parsed = _km_urlsplit(value)
    except ValueError:
        raise ValueError("source_url must be a valid http(s) URL.")
    if parsed.scheme.lower() not in ("http", "https") or not parsed.netloc:
        raise ValueError("source_url must be a valid http(s) URL.")
    return value


class KnowledgeDocumentCreate(BaseModel):
    """Request body for POST /api/knowledge-documents. Business metadata
    only — lifecycle_status ('Active'), compliance_status ('Pending'), and
    google_ownership_status (derived from document_type) are always
    server-set at create time, never accepted here (design doc §5.1)."""

    title: str = Field(..., min_length=1, max_length=200)
    team: str = Field(..., min_length=1, max_length=120)
    document_type: str
    job_role: Optional[str] = Field(default=None, max_length=120)
    document_category: Optional[str] = Field(default=None, max_length=120)
    creator: Optional[str] = Field(default=None, max_length=200)
    source_url: str = Field(..., max_length=2048)

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title must contain at least 1 non-whitespace character.")
        return trimmed

    @field_validator("team")
    @classmethod
    def trim_team(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("team must contain at least 1 non-whitespace character.")
        return trimmed

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, value: str) -> str:
        if value not in VALID_KNOWLEDGE_DOCUMENT_TYPES:
            raise ValueError(f"document_type must be one of {VALID_KNOWLEDGE_DOCUMENT_TYPES}.")
        return value

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str) -> str:
        return _validate_safe_http_url(value)


class KnowledgeDocumentMetadataUpdate(BaseModel):
    """Request body for PATCH /api/knowledge-documents/{document_id}
    (metadata-only — REQ-KM-CRUD-003 Phase 8). change_description is
    REQUIRED (rule: "Require: change_description"). source_url is declared
    here ONLY so a client that sends it gets a clear, explicit rejection
    (model_validator below) instructing them to use the Create Version
    endpoint instead — design doc §7 rule 8/REQ-KM-CRUD-003 Phase 8
    explicitly requires this be an explicit reject, not silent field
    -dropping. google_ownership_status is never accepted here at all (no
    field for it exists on this model) — 'Verified' can never reach this
    route by any path."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    team: Optional[str] = Field(default=None, min_length=1, max_length=120)
    document_type: Optional[str] = None
    job_role: Optional[str] = Field(default=None, max_length=120)
    document_category: Optional[str] = Field(default=None, max_length=120)
    creator: Optional[str] = Field(default=None, max_length=200)
    lifecycle_status: Optional[str] = None
    compliance_status: Optional[str] = None
    change_description: str = Field(..., min_length=1, max_length=500)

    # Present only to produce a clear rejection — see class docstring.
    source_url: Optional[str] = Field(default=None, max_length=2048)

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title must contain at least 1 non-whitespace character.")
        return trimmed

    @field_validator("team")
    @classmethod
    def trim_team(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("team must contain at least 1 non-whitespace character.")
        return trimmed

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_KNOWLEDGE_DOCUMENT_TYPES:
            raise ValueError(f"document_type must be one of {VALID_KNOWLEDGE_DOCUMENT_TYPES}.")
        return value

    @field_validator("lifecycle_status")
    @classmethod
    def validate_lifecycle_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_KNOWLEDGE_LIFECYCLE_STATUSES:
            raise ValueError(f"lifecycle_status must be one of {VALID_KNOWLEDGE_LIFECYCLE_STATUSES}.")
        return value

    @field_validator("compliance_status")
    @classmethod
    def validate_compliance_status(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_KNOWLEDGE_COMPLIANCE_STATUSES:
            raise ValueError(f"compliance_status must be one of {VALID_KNOWLEDGE_COMPLIANCE_STATUSES}.")
        return value

    @field_validator("change_description")
    @classmethod
    def trim_change_description(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("change_description must contain at least 1 non-whitespace character.")
        return trimmed

    @model_validator(mode="after")
    def reject_source_url(self):
        if self.source_url is not None:
            raise ValueError(
                "source_url cannot be changed through metadata update. "
                "Use POST /api/knowledge-documents/{document_id}/versions instead."
            )
        return self


class KnowledgeDocumentVersionCreate(BaseModel):
    """Request body for POST /api/knowledge-documents/{document_id}/versions
    (REQ-KM-CRUD-003 Phase 9). All three fields required."""

    source_url: str = Field(..., max_length=2048)
    version_label: str = Field(..., min_length=1, max_length=20)
    change_description: str = Field(..., min_length=1, max_length=500)

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str) -> str:
        return _validate_safe_http_url(value)

    @field_validator("version_label")
    @classmethod
    def trim_version_label(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("version_label must contain at least 1 non-whitespace character.")
        return trimmed

    @field_validator("change_description")
    @classmethod
    def trim_change_description(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("change_description must contain at least 1 non-whitespace character.")
        return trimmed


class KnowledgeDocumentDeleteRequest(BaseModel):
    """Request body for DELETE /api/knowledge-documents/{document_id}
    (REQ-KM-CRUD-003 Phase 11) — delete_reason is REQUIRED, matching
    knowledge_documents_soft_delete_pairing_check (backend/models.py)."""

    delete_reason: str = Field(..., min_length=1, max_length=500)

    @field_validator("delete_reason")
    @classmethod
    def trim_delete_reason(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("delete_reason must contain at least 1 non-whitespace character.")
        return trimmed


class KnowledgeDocumentDeletedOut(BaseModel):
    """Response shape for GET /api/knowledge-documents/deleted
    (REQ-KM-UI-005 Phase 3) — soft-deleted records only. Deliberately a
    separate, narrower schema from KnowledgeDocumentOut rather than reusing
    it with deleted_at/deleted_by/delete_reason bolted on: the Deleted
    Documents UI (REQ-KM-UI-005 Phase 4) needs exactly these fields and no
    others (no lifecycle_status/compliance_status/google_ownership_status/
    warnings — none of those are meaningful for a soft-deleted row). All
    three deletion fields are required (non-Optional): the
    knowledge_documents_soft_delete_pairing_check CHECK constraint
    (backend/models.py) guarantees they are always populated together for
    any row where deleted_at IS NOT NULL."""

    id: UUID
    title: str
    team: str
    document_type: str
    creator: Optional[str] = None
    current_version: str
    deleted_by: str
    deleted_at: datetime
    delete_reason: str

    model_config = {"from_attributes": True}


class KnowledgeDocumentOut(BaseModel):
    """Response shape for every non-history Knowledge Management route
    (create/detail/list/metadata-update/version-create/archive/unarchive/
    restore). Never returned for a soft-deleted record outside the
    restore-collision context — every list/detail route filters those out
    server-side. `warnings` (design doc §3 Phase 3) is populated only by
    CREATE, when a same-title-different-URL match exists (rule 5) — every
    other route returns an empty list."""

    id: UUID
    title: str
    team: str
    document_type: str
    job_role: Optional[str] = None
    document_category: Optional[str] = None
    creator: Optional[str] = None
    source_url: str
    current_version: str
    lifecycle_status: str
    compliance_status: str
    google_ownership_status: str
    created_by: str
    updated_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    warnings: List[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class KnowledgeDocumentListResponse(BaseModel):
    records: List[KnowledgeDocumentOut]
    total: int
    limit: int
    offset: int


class KnowledgeDocumentVersionOut(BaseModel):
    id: UUID
    document_id: UUID
    version_label: str
    source_url: str
    change_note: Optional[str] = None
    created_by: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class KnowledgeDocumentAuditLogOut(BaseModel):
    id: UUID
    document_id: UUID
    action: str
    actor_member_key: str
    detail: Optional[dict] = None
    occurred_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Dashboard summary (SRD "Centralized Document Repository & Knowledge
# Management Module" §13) — GET /api/knowledge-documents/summary. Every
# figure is computed live from knowledge_documents / knowledge_document_
# versions / knowledge_document_audit_log by the route itself; none of
# these fields is a separately stored or cached value, so nothing here can
# drift from the underlying records.


class KnowledgeDocumentTeamCount(BaseModel):
    team: str
    count: int


class KnowledgeDocumentActivityItem(BaseModel):
    """One row of the summary's recent_activity feed — the audit log's own
    action/actor/timestamp plus the parent document's title, so the
    dashboard can render a cross-document feed without a second lookup per
    row on the frontend. Deliberately ignores the parent document's
    deleted_at, same reasoning as the per-document audit-history route
    (knowledge_documents.py module docstring) — a soft-deleted document's
    own 'soft_delete' action is exactly the kind of thing this feed exists
    to surface."""

    document_id: UUID
    document_title: str
    action: str
    actor_member_key: str
    occurred_at: Optional[datetime] = None


class KnowledgeDocumentSummaryResponse(BaseModel):
    """google_unverified counts active Google-type documents whose
    google_ownership_status is not 'Verified' — currently ALL of them,
    because no code path ever sets 'Verified' (REQ-KM-001 discovery §7,
    still BLOCKED on Google API credentials/scopes). This widget reports
    that real, current state; it does not simulate or claim a permission
    check that has not actually happened."""

    total: int
    active: int
    archived: int
    pending: int
    completed: int
    missing_creator: int
    google_unverified: int
    by_team: List[KnowledgeDocumentTeamCount]
    recently_added: List[KnowledgeDocumentOut]
    recently_updated: List[KnowledgeDocumentOut]
    recent_activity: List[KnowledgeDocumentActivityItem]
    latest_version_updates: List[KnowledgeDocumentVersionOut]


# ── Announcements & Notifications (REQ-ANN-001, 2026-08-12) ─────────────
#
# created_by is NEVER accepted from the client on any of these schemas —
# always server-derived from get_verified_member, mirroring every other
# *_by field in this file. mentioned_member_key is validated here against
# VALID_MEMBER_KEYS (the same canonical registry every other module reads)
# — deliberately NOT a second, independently-maintained member list, and
# never enforced by a database CHECK constraint (see backend/models.py
# AnnouncementMention docstring and the migration file's own comment).

from backend.config import VALID_MEMBER_KEYS  # noqa: E402 — grouped with this section


def _dedup_preserve_order(values: List[str]) -> List[str]:
    seen = set()
    out = []
    for v in values:
        if v not in seen:
            seen.add(v)
            out.append(v)
    return out


def _validate_mention_keys(value: Optional[List[str]]) -> List[str]:
    """Shared validator for both Create and Update — zero, one, or many
    mentions are all legal (REQ-ANN-001 §4). This layer only checks
    dedup + membership — it cannot reject self-mention here because a
    Pydantic field_validator never sees the authenticated acting_member
    (identity resolves later, in the router, via
    Depends(get_verified_member)). Self-mention rejection is enforced by
    backend/routers/announcements.py's _reject_self_mention, called from
    create_announcement and update_announcement_draft — the only two
    places both the mention list and acting_member are in scope
    (REQ-ANN-001 Stage A, 2026-08-12 production UX correction — self-
    mention was allowed in the original REQ-ANN-001 §4/§8 design; the
    2026-08-12 production acceptance review reversed that decision).
    Duplicate selections are silently deduplicated (defense-in-depth; the
    frontend picker already prevents them and the DB's own unique index is
    the final backstop). An unknown member_key is a hard 422 — never
    silently dropped, so a typo/stale key is never mistaken for "no
    mentions"."""
    if not value:
        return []
    deduped = _dedup_preserve_order(value)
    invalid = [v for v in deduped if v not in VALID_MEMBER_KEYS]
    if invalid:
        raise ValueError(f"mention_member_keys contains unknown member key(s): {invalid}")
    return deduped


class AnnouncementCreate(BaseModel):
    """Request body for POST /api/announcements — always creates a Draft.
    status/created_by/published_at/deleted_at/deleted_by are all absent
    from this model by design; a client attempting to send any of them has
    the value silently ignored by Pydantic, exactly as
    KnowledgeDocumentCreate excludes lifecycle_status above."""

    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=10000)
    mention_member_keys: List[str] = Field(default_factory=list)

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title must contain at least 1 non-whitespace character.")
        return trimmed

    @field_validator("body")
    @classmethod
    def trim_body(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("body must contain at least 1 non-whitespace character.")
        if len(trimmed) > 10000:
            raise ValueError("body must be 10,000 characters or fewer after trimming.")
        return trimmed

    @field_validator("mention_member_keys")
    @classmethod
    def validate_mentions(cls, value: List[str]) -> List[str]:
        return _validate_mention_keys(value)


class AnnouncementUpdate(BaseModel):
    """Request body for PATCH /api/announcements/{id} — Draft only (the
    router's ownership lookup never resolves a Published id for this
    route — technical design §5). mention_member_keys, when supplied
    (including an explicit empty list), REPLACES the Draft's full mention
    set; omitting the field entirely leaves the existing mention set
    unchanged. status/published_at are never accepted — Publish is its own
    dedicated endpoint, never a side effect of a metadata PATCH."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    body: Optional[str] = Field(default=None, min_length=1, max_length=10000)
    mention_member_keys: Optional[List[str]] = None

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title must contain at least 1 non-whitespace character.")
        return trimmed

    @field_validator("body")
    @classmethod
    def trim_body(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("body must contain at least 1 non-whitespace character.")
        if len(trimmed) > 10000:
            raise ValueError("body must be 10,000 characters or fewer after trimming.")
        return trimmed

    @field_validator("mention_member_keys")
    @classmethod
    def validate_mentions(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return None
        return _validate_mention_keys(value)


class AnnouncementOut(BaseModel):
    """Response shape for every Announcement route except the notification
    feed/read-receipts views below. mention_member_keys is populated by the
    router from a separate announcement_mentions query — not an
    from_attributes relationship load — so this schema is always
    constructed explicitly (backend/routers/announcements.py _to_out),
    never via model_validate(record) directly."""

    id: UUID
    title: str
    body: str
    status: Literal["Draft", "Published"]
    created_by: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    mention_member_keys: List[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AnnouncementListResponse(BaseModel):
    records: List[AnnouncementOut]
    total: int
    limit: int
    offset: int


class AnnouncementMentionNotificationOut(BaseModel):
    """One row of the notification feed (GET /api/announcements/
    notifications) — powers both the bell's unread-count poll and the
    Notification History tab (REQ-ANN-001 Stage A §8/§9). Always scoped
    server-side to the current member's own mentions on Published
    announcements only (notified_at IS NOT NULL); never another member's
    feed (REQ-ANN-001 §7). body_preview is a short, truncated excerpt of
    the announcement body — enough to identify the announcement in the
    history list without a second request; see
    backend/routers/announcements.py _body_preview."""

    mention_id: UUID
    announcement_id: UUID
    title: str
    created_by: str
    published_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    body_preview: Optional[str] = None


class AnnouncementUnreadCountOut(BaseModel):
    unread_count: int


class AnnouncementNotificationFeedOut(BaseModel):
    """Response for GET /api/announcements/notifications — the single
    notification endpoint (smallest API surface, REQ-ANN-001 §12): the 30s
    poll only needs unread_count; the Notification History tab needs items
    too. Both are computed from the same scoped query (current member,
    Published, notified_at IS NOT NULL) so the two can never disagree."""

    unread_count: int
    items: List[AnnouncementMentionNotificationOut]


class AnnouncementReadReceiptItemOut(BaseModel):
    member_key: str
    display_label: str
    read: bool
    read_at: Optional[datetime] = None


class AnnouncementReadReceiptsOut(BaseModel):
    """Response for GET /api/announcements/{id}/read-receipts — creator-only
    (technical design §5-equivalent ownership check; non-creator gets 404,
    never this body)."""

    announcement_id: UUID
    mentioned_count: int
    read_count: int
    unread_count: int
    receipts: List[AnnouncementReadReceiptItemOut]


class AnnouncementWsTicketOut(BaseModel):
    """Response for POST /api/announcements/ws-ticket (REQ-ANN-001 Stage B,
    2026-08-12) — a short-lived signed ticket the browser passes in the
    WebSocket URL's query string instead of the long-lived member bearer
    token (which cannot safely travel in a URL). Never the token, never
    the signing secret — see backend/routers/announcements.py
    _issue_ws_ticket."""

    ticket: str
    expires_in: int
