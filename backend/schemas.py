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

Category (2026-07-14): create requests accept only the two permanent
values (VALID_SCHEDULE_CATEGORIES) — the requested value is a hint the
router's classify_schedule_category() may still override to "Unscheduled
Task" for a late-created task (see backend/routers/member_schedules.py).
Update requests keep `category` as a loosely-typed optional field on
purpose: the router compares any supplied value against the row's stored
category and rejects a mismatch with 422 rather than silently applying it
(see update_member_schedule_event) — the field is not validated against
the enum here so that message is the one the client sees, not a generic
Pydantic enum error. MemberScheduleEventOut.category stays a plain `str`
(not the enum) so existing pre-migration rows with an old placeholder
category value can still be read/serialized without breaking GET.
"""

from datetime import date as date_type, datetime, time as time_type
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from backend.config import (
    DEFAULT_SCHEDULE_CATEGORY,
    LEAVE_COORDINATION_COPY_NOTICE,
    LEAVE_FULL_DAY_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES,
    LEAVE_POLICY_SOURCE_ID,
    SHORT_LEAVE_MONTHLY_CAP_MINUTES,
    VALID_PRIORITIES,
)

ScheduleCategory = Literal["Scheduled Task", "Unscheduled Task"]


class MemberScheduleEventCreate(BaseModel):
    date: date_type
    title: str = Field(..., max_length=120, min_length=1)
    category: ScheduleCategory = DEFAULT_SCHEDULE_CATEGORY
    priority: str = Field(default="Medium")
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    notes: Optional[str] = Field(default=None, max_length=240)

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
    the ScheduleCategory enum — it exists only so the router can detect a
    client attempting to change it and reject with a clear 422 message
    (see update_member_schedule_event). It is never assigned to the ORM
    row in this router regardless of value."""

    date: Optional[date_type] = None
    title: Optional[str] = Field(default=None, max_length=120, min_length=1)
    category: Optional[str] = None
    priority: Optional[str] = None
    start: Optional[time_type] = None
    end: Optional[time_type] = None
    notes: Optional[str] = Field(default=None, max_length=240)

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

    model_config = {"from_attributes": True, "populate_by_name": True}


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


class StaffRecordOut(BaseModel):
    """Dashboard-facing staff record shape — exactly the 16 approved fields
    (member-aios/staff-data/data-maps/staff-field-map-draft.md). Internal
    bookkeeping columns (source_record_key, source_hash, source_status,
    is_current, imported_at, imported_by, created_at, updated_at) are
    intentionally not exposed here — this is a read-only dashboard
    projection, not a full table dump. No salary/address/email/phone/
    guardian field exists on the ORM model this is built from, so none can
    appear here regardless of this schema's definition."""

    employee_number: Optional[str] = None
    epf_number: Optional[str] = None
    date_of_joining: Optional[date_type] = None
    full_name: Optional[str] = None
    calling_name: Optional[str] = None
    location: Optional[str] = None
    staff_status: Optional[str] = None
    department_team: Optional[str] = None
    designation: Optional[str] = None
    cv_reference: Optional[str] = None
    nic: Optional[str] = None
    remarks: Optional[str] = None
    employment_stage: Optional[str] = None
    source_file: Optional[str] = None
    source_page: Optional[int] = None
    source_row_reference: Optional[str] = None

    model_config = {"from_attributes": True}


class StaffListResponse(BaseModel):
    records: list[StaffRecordOut]
    total: int
    limit: int
    offset: int
    filters: dict


class StaffSummaryResponse(BaseModel):
    total: int
    active: int
    inactive: int
    ph: int
    permanent: int
    probation: int
    training_7_day: int
    verify: int


class StaffFilterOptionsResponse(BaseModel):
    teams: list[str]
    staff_statuses: list[str]
    employment_stages: list[str]
    locations: list[str]
