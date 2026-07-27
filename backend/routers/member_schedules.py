"""Member schedule endpoints.

Preserves the testing/demo truth boundary at every write path:
- POST always forces source_scope='dashboard_testing' and is_official_truth=False,
  regardless of any such fields present in the request body (they are not even
  accepted by MemberScheduleEventCreate).
- PUT only ever touches editable fields (date/title/priority/start/end/notes)
  plus the server-computed category — source_scope and is_official_truth are
  never assigned on update.
- clear-testing-data only soft-deletes rows where source_scope='dashboard_testing'
  AND is_official_truth=False; pilot/approved_live rows are left untouched.

Category classification (2026-07-22 — replaces the 2026-07-14 previous-day-
cutoff / permanent-category rule, see backend/tests/test_schedule_classification.py
for the historical note): every task belongs to a Monday-Sunday calendar
week based on its event_date, and its weekly planning cutoff is the
preceding Sunday 23:59:59 Asia/Colombo (get_preceding_sunday_cutoff below).

- On create, classify_new_task() compares the authoritative server-side
  created_at against that cutoff. No manually-selected category is ever
  honored — the request's `category` field (kept only for backward
  compatibility) is never read for classification.
- On every successful update — Edit-form save, title/notes/priority/date/
  start/end change, drag, or resize, all of which funnel through the same
  PUT handler — classify_updated_task() re-evaluates the task using the
  authoritative server-side update timestamp and the resulting event date's
  own week cutoff. Classification is one-way: once a task is 'Unscheduled
  Task' it can never automatically become 'Scheduled Task' again.
- GET/list, Schedule Summary aggregation, and report generation never call
  either classification function — they only ever read the stored category
  column, so existing historical rows are frozen until a specific task is
  itself successfully edited.

Task outcome (2026-07-24, CONFIRMED UNTOUCHED-TASK OUTCOME — see
backend/time_utils.py): a fully separate concept from category/
classification above. PUT /{member_key}/{event_id}/outcome is the only
write path for the outcome column; it never touches category, never calls
classify_updated_task, and never affects Schedule Summary aggregation.
'Pending'/'No response' are display states derived at read time from
outcome + event_date — never persisted, never produced by a scheduled/
midnight job (no such job exists anywhere in this codebase).

Reason/timestamp/actor (2026-07-24, same day, FINAL CONFIRMED
REASON-TRANSITION RULE): the same PUT /{member_key}/{event_id}/outcome
endpoint also owns outcome_reason/outcome_updated_at/outcome_updated_by.
outcome_reason is required (trimmed, nonblank, <=250 chars) exactly when
outcome='Uncompleted' and forced to NULL otherwise (validated in
backend/schemas.py TaskOutcomeUpdate, enforced again by a DB pairing CHECK
constraint) — a Completed transition always clears a prior reason to NULL
in the same atomic write, so it is never retained or returned once
cleared. outcome_updated_at/outcome_updated_by are a dedicated audit pair,
separate from the pre-existing updated_at/updated_by columns.
"""

import calendar
import hashlib
import json
from datetime import date as date_type, datetime, time as time_type, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy import asc, nullslast
from sqlalchemy.orm import Session

from backend import xlsx_export
from backend.config import (
    ACTUAL_OFFICE_BREAK_END,
    ACTUAL_OFFICE_BREAK_START,
    DEFAULT_SOURCE_SCOPE,
    LEAVE_FULL_DAY_DEDUCTION_MINUTES,
    MAX_BULK_TASK_ROWS,
    MEMBER_LABELS,
    SCHEDULE_TIMEZONE,
    VALID_MEMBER_KEYS,
    VALID_PRIORITIES,
)
from backend.database import get_db
from backend.models import MemberLeaveRecord, MemberScheduleEvent
from backend.routers import leave_logic
from backend.schemas import (
    BulkTaskCreateRequest,
    BulkTaskCreateSuccessOut,
    BulkTaskRowIn,
    DailyScheduleReportOut,
    DurationChangeOut,
    MemberScheduleEventCreate,
    MemberScheduleEventOut,
    MemberScheduleEventUpdate,
    MonthlyScheduleReportOut,
    TaskOutcomeUpdate,
    TimeFrameIn,
    WeeklyScheduleReportOut,
)
from backend.time_utils import colombo_today, derive_task_outcome

router = APIRouter(prefix="/api/member-schedules", tags=["member-schedules"])

_COLOMBO = ZoneInfo(SCHEDULE_TIMEZONE)


def _validate_member_key(member_key: str) -> str:
    if member_key not in VALID_MEMBER_KEYS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown member_key '{member_key}'. Must be one of {VALID_MEMBER_KEYS}.",
        )
    return member_key


def _get_active_event_or_404(
    db: Session, member_key: str, event_id: UUID
) -> MemberScheduleEvent:
    event = (
        db.query(MemberScheduleEvent)
        .filter(
            MemberScheduleEvent.id == event_id,
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.deleted_at.is_(None),
        )
        .first()
    )
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


def get_target_week_start(event_date: date_type) -> date_type:
    """Monday of the Monday-Sunday calendar week containing event_date.
    Single source of truth shared with the weekly report boundary logic
    (_monday_of_week below) — classification and reporting must never
    define "the week" two different ways."""
    return _monday_of_week(event_date)


def get_preceding_sunday_cutoff(event_date: date_type) -> datetime:
    """The weekly planning cutoff for event_date's Monday-Sunday week:
    23:59:59 Asia/Colombo on the Sunday immediately before that week's
    Monday. Returned as a timezone-aware datetime so it can be compared
    directly against any UTC-aware timestamp (created_at/updated_at) —
    Python compares aware datetimes correctly regardless of which zone
    each one carries, so no manual UTC conversion is needed here."""
    monday = get_target_week_start(event_date)
    preceding_sunday = monday - timedelta(days=1)
    return datetime(
        preceding_sunday.year,
        preceding_sunday.month,
        preceding_sunday.day,
        23, 59, 59,
        tzinfo=_COLOMBO,
    )


def classify_new_task(event_date: date_type, created_at: datetime) -> str:
    """Create-time classification (2026-07-22 weekly cutoff rule —
    replaces the 2026-07-14 previous-day-cutoff rule; see
    backend/tests/test_schedule_classification.py for the rule history).

    Deliberately takes no requested/manual category argument: a task's
    initial category is decided entirely by comparing the authoritative
    server-side created_at against get_preceding_sunday_cutoff(event_date).
    'Scheduled Task' for created_at strictly before the cutoff instant;
    'Unscheduled Task' at or after it. start_time/end_time play no part —
    identical rule for timed and untimed tasks."""
    return "Scheduled Task" if created_at < get_preceding_sunday_cutoff(event_date) else "Unscheduled Task"


def classify_updated_task(
    current_category: str,
    resulting_event_date: date_type,
    updated_at: datetime,
) -> str:
    """Update-time reclassification (2026-07-22) — called on every
    successful Task update (Edit-form save, title/notes/priority/date/
    start/end change, drag, resize; all funnel through the same PUT
    handler in update_member_schedule_event). Classification is one-way:

    1. If current_category is already 'Unscheduled Task', it stays
       'Unscheduled Task' unconditionally — dragging or editing an
       Unscheduled task, even into a future week, never restores
       'Scheduled Task'.
    2. Otherwise (current_category is 'Scheduled Task'), the cutoff is
       recalculated for resulting_event_date's own Monday-Sunday week
       (the week after the edit, if the edit changed the event date).
    3. If the authoritative server-side updated_at is at or after that
       cutoff, the task becomes 'Unscheduled Task'.
    4. Otherwise 'Scheduled Task' is retained.
    """
    if current_category == "Unscheduled Task":
        return "Unscheduled Task"

    if updated_at >= get_preceding_sunday_cutoff(resulting_event_date):
        return "Unscheduled Task"

    return "Scheduled Task"


# ── Bulk Tasks (2026-07-23; per-row Date field — CONFIRMED ADD-ROW DATE
#    RULE task, 2026-07-24) ────────────────────────────────────────────────
#
# Additive feature: POST /{member_key}/bulk below. Reuses every existing
# rule unmodified — classify_new_task/classify_updated_task above,
# leave_logic.find_conflicting_active_leave (no second Leave-conflict
# formula), VALID_PRIORITIES, and the same title/notes length limits as
# MemberScheduleEventCreate. Originally a single common `date` shared by
# every row in the batch ("same-day Bulk Tasks"); the CONFIRMED ADD-ROW
# DATE RULE task (2026-07-24) superseded that decision — every row now
# carries and is validated against its own `date` (BulkTaskRowIn.date), so
# one submission may legitimately span several different dates. The
# helpers below are pure functions (no `db` parameter except where a query
# against MemberScheduleEvent is unavoidable —
# _find_existing_task_duplicate_warnings) so they can be unit-tested the
# same DB-free way this codebase already tests
# find_conflicting_active_leave/find_conflicting_active_tasks — see
# backend/tests/test_bulk_task_creation.py.


def _is_blank_bulk_row(row: BulkTaskRowIn) -> bool:
    """A row is blank only when title, start, end, and notes are ALL
    empty (Step 5 business rule) — priority is deliberately excluded from
    this check. Every row the frontend form submits always carries some
    priority value (the form defaults the select to 'Medium'), so
    priority alone must never make an otherwise-blank row count as
    filled, and an otherwise-filled row must never be treated as blank
    just because priority was left at its default."""
    title_empty = not (row.title or "").strip()
    notes_empty = not (row.notes or "").strip()
    # MULTIPLE TIME FRAMES PER TASK (2026-07-27) — a row using time_frames
    # instead of start/end never has row.start/row.end set at all (see
    # resolve_submitted_time_frames), so a row with real content ONLY in
    # time_frames (no title/notes, blank frame-1 fields) must still count
    # as nonblank — otherwise it would be silently dropped here before
    # title-required validation ever ran.
    has_time_frames = bool(row.time_frames)
    return title_empty and row.start is None and row.end is None and notes_empty and not has_time_frames


def _bulk_row_effective_priority(row: BulkTaskRowIn) -> str:
    """Same default ('Medium') MemberScheduleEventCreate.priority uses —
    applied identically at validation time and at row-construction time so
    the two can never disagree on what priority a row with no explicit
    value actually gets."""
    return row.priority if row.priority else "Medium"


def _bulk_row_field_errors(row: BulkTaskRowIn) -> List[dict]:
    """Hard-validation errors for one NONBLANK row, reusing the exact
    rules MemberScheduleEventCreate enforces (title required/≤120 chars,
    notes ≤240 chars, priority in VALID_PRIORITIES, end > start when both
    given), plus the per-row date_required check added by the CONFIRMED
    ADD-ROW DATE RULE task (2026-07-24) — there is no top-level common
    date any more, so every nonblank row must carry its own. Returns every
    applicable error for this row (not just the first) — the caller
    collects these across every row before deciding whether to reject the
    batch, per Step 6 ("do not stop after reporting only the first invalid
    row"). `field`/`code` values are returned without a `row` key; the
    caller (create_member_schedule_events_bulk) attaches the row number."""
    errors: List[dict] = []

    if row.date is None:
        errors.append({
            "field": "date", "code": "date_required",
            "message": "Choose a date for this task.",
        })

    title = (row.title or "").strip()
    if not title:
        errors.append({
            "field": "title", "code": "title_required",
            "message": "Enter a title for this task.",
        })
    elif len(title) > 120:
        errors.append({
            "field": "title", "code": "title_too_long",
            "message": "Title must be 120 characters or fewer.",
        })

    if row.notes is not None and len(row.notes) > 240:
        errors.append({
            "field": "notes", "code": "notes_too_long",
            "message": "Notes must be 240 characters or fewer.",
        })

    priority = _bulk_row_effective_priority(row)
    if priority not in VALID_PRIORITIES:
        errors.append({
            "field": "priority", "code": "invalid_priority",
            "message": "Choose a valid priority (" + ", ".join(VALID_PRIORITIES) + ").",
        })

    if row.start is not None and row.end is not None and row.end <= row.start:
        errors.append({
            "field": "end", "code": "invalid_time_range",
            "message": "End time must be later than start time.",
        })

    return errors


def _bulk_leave_conflict_errors(
    db: Session,
    member_key: str,
    expanded: List[Tuple[int, int, int, "BulkTaskRowIn"]],
) -> List[dict]:
    """Authoritative Leave re-check for every accepted frame (Step 7) —
    calls the SAME leave_logic.find_conflicting_active_leave() function the
    single-create/update endpoints already call; no second Leave-conflict
    formula is implemented here. Checked against each frame's own row date
    (CONFIRMED ADD-ROW DATE RULE, 2026-07-24 — there is no common batch
    date any more) rather than one shared date for the whole batch. A
    conflict is folded into the same validation_failed error contract as
    field errors (Step 6/18 both surface Leave conflicts as ordinary row
    messages, e.g. "Row 7 — This date is covered by Full-Day Leave.")
    rather than a separate 409 — Bulk Tasks has only three response
    outcomes (validation_failed / duplicate_confirmation_required /
    created), so there is no fourth "leave_conflict" shape to preserve
    here.

    FRAME-LEVEL ERROR CONTEXT (2026-07-27): accepts the full `expanded`
    list (row_number, frame_number, frame_count, frame_row) — not the
    stripped (row_number, frame_row) pairs this function used before —
    specifically so a Leave conflict on one frame of a multi-frame row can
    be attributed to that exact frame (logical_task_index/time_frame_index)
    instead of only the row. A row with exactly one frame (frame_count==1,
    the pre-existing shape) gets byte-for-byte the same message as before
    this task; the Full-Day/Multi-Day-specific wording is preserved
    unchanged for that case. Only called once every nonblank row already
    has a date (the caller runs field-level validation, including
    date_required, first), so frame_row.date is never None here."""
    errors: List[dict] = []
    for row_number, frame_number, frame_count, row in expanded:
        conflicts = leave_logic.find_conflicting_active_leave(
            db, member_key, row.date, row.start, row.end
        )
        if not conflicts:
            continue
        anchor_field = "start" if (row.start is not None or row.end is not None) else "title"
        error = {
            "row": row_number, "field": anchor_field,
            "code": "leave_conflict", "logical_task_index": row_number,
        }
        if frame_count > 1:
            error["time_frame_index"] = frame_number
            error["message"] = (
                "Task " + str(row_number) + ", time frame " + str(frame_number)
                + ": " + leave_logic.LEAVE_CONFLICT_FRAME_MESSAGE
            )
        else:
            full_day = next(
                (c for c in conflicts if c.leave_type in ("Full-Day", "Multi-Day")), None
            )
            if full_day is not None:
                error["message"] = "This date is covered by " + full_day.leave_type + " Leave."
            else:
                error["message"] = "This task's time conflicts with an active leave record."
        errors.append(error)
    return errors


def _normalize_title_for_duplicate(title: Optional[str]) -> str:
    """Trim + case-fold only — used purely to compare titles for the
    duplicate-warning definition (Step 8); the stored/displayed Task title
    is always the as-submitted, validation-trimmed value, never this
    normalized form."""
    return (title or "").strip().casefold()


# ── FINAL AUTHORITATIVE SAME-TASK MULTIPLE-TIME-PERIOD RULE (2026-07-27) ────
#
# Supersedes the narrower 2026-07-27 "FINAL CONFIRMED TIMED-VERSUS-UNTIMED
# RULE" pass, which only caught a timed occurrence conflicting with an
# untimed one and did not yet catch exact-duplicate or overlapping-timed
# occurrences, nor both-untimed duplicates. For the same member, same
# normalized Task title, and same Task date:
#
#   1. Different non-overlapping timed periods            -> ALLOW
#   2. Adjacent timed periods (end == other's start)       -> ALLOW
#   3. Exact same start and end time                       -> BLOCK (exact_task_duplicate)
#   4. Any positive-duration timed overlap                 -> BLOCK (same_task_time_overlap)
#   5. Both Tasks untimed                                  -> BLOCK (same_task_time_required)
#   6. One timed and one untimed                           -> BLOCK (same_task_time_required)
#
# Different Task titles may overlap freely — this rule only ever compares
# rows that already share a normalized title (_normalize_title_for_duplicate,
# the same normalization the pre-existing soft duplicate-warning system
# below uses, so "the same title" never means two different things in this
# file). This rule never touches Task-vs-Leave overlap rules (leave_logic),
# which are a completely separate, unmodified check.
#
# ONE shared classifier (classify_same_task_conflict, per SAME_TASK_CONFLICT_*
# below) is the single formula for all three write paths — Single Task
# creation, Task editing, and Bulk Tasks (both within-batch and against
# existing active Tasks). It operates on plain SameTaskOccurrence tuples
# rather than any one ORM/Pydantic model directly, which is what lets one
# function serve a DB-backed MemberScheduleEvent row (single create/update,
# bulk-against-existing) and an in-memory BulkTaskRowIn row (bulk
# within-batch) without a second, parallel implementation — each call site
# only adapts its own data into that common shape first.

SAME_TASK_CONFLICT_NONE = "none"
SAME_TASK_CONFLICT_EXACT_DUPLICATE = "exact_duplicate"
SAME_TASK_CONFLICT_TIME_OVERLAP = "time_overlap"
SAME_TASK_CONFLICT_BOTH_UNTIMED = "both_untimed"
SAME_TASK_CONFLICT_TIMED_VS_UNTIMED = "timed_vs_untimed"

SAME_TASK_TIME_REQUIRED_MESSAGE = (
    "This task already exists on the selected date. Add separate "
    "non-overlapping times to create another occurrence."
)

# Machine-readable code + user-facing message per classification (STEP 5 of
# the approved rule). BOTH_UNTIMED and TIMED_VS_UNTIMED deliberately share
# one code/message (same_task_time_required) — both describe the same
# underlying problem ("no reliable interval to prove separateness"), exactly
# as the approved rule specifies; EXACT_DUPLICATE and TIME_OVERLAP each get
# their own distinct code/message so the frontend (and the user) can tell a
# perfect duplicate from a partial-overlap conflict. Titles are a frontend-
# only concern (ui/error-mapper.js KNOWN_ERRORS) — never sent by the backend.
SAME_TASK_CONFLICT_INFO = {
    SAME_TASK_CONFLICT_EXACT_DUPLICATE: {
        "code": "exact_task_duplicate",
        "message": "This task already exists at the same date and time.",
    },
    SAME_TASK_CONFLICT_TIME_OVERLAP: {
        "code": "same_task_time_overlap",
        "message": "This task already has another time period that overlaps the selected time.",
    },
    SAME_TASK_CONFLICT_BOTH_UNTIMED: {
        "code": "same_task_time_required",
        "message": SAME_TASK_TIME_REQUIRED_MESSAGE,
    },
    SAME_TASK_CONFLICT_TIMED_VS_UNTIMED: {
        "code": "same_task_time_required",
        "message": SAME_TASK_TIME_REQUIRED_MESSAGE,
    },
}


def _is_timed_occurrence(start: Optional[time_type], end: Optional[time_type]) -> bool:
    """A Task 'occurrence' counts as timed only when it carries a complete
    start+end interval — mirrors _task_duration_minutes' own 'either time
    missing -> no reliable interval' rule above. A row with only one of
    start/end set is treated as untimed for this rule, same as for
    duration reporting. This preserves all existing schema-layer validation
    for partial/invalid time fields (MemberScheduleEventCreate/Update's
    end_after_start validator, and BulkTaskRowIn's equivalent per-row check
    in _bulk_row_field_errors) unchanged — this function only classifies
    values that already passed that validation."""
    return start is not None and end is not None


def _classify_time_pair(
    candidate_start: Optional[time_type],
    candidate_end: Optional[time_type],
    existing_start: Optional[time_type],
    existing_end: Optional[time_type],
) -> str:
    """Pure, DB-free classification of ONE candidate-vs-existing time pair —
    assumes the two occurrences already match on member + date + normalized
    title (every caller filters down to that scope first). Returns one of
    the SAME_TASK_CONFLICT_* constants.

    Both-untimed and timed-vs-untimed are decided before either occurrence's
    actual clock time is ever compared (STEP 4/5: an untimed occurrence has
    no reliable interval, so it is never compared as an interval at all).
    For two timed occurrences, exact duplicate is checked BEFORE general
    overlap (STEP 4's explicit ordering requirement) so an identical
    start+end pair is reported as exact_duplicate, never merely overlap.
    General overlap uses the approved half-open interval formula:
    candidate_start < existing_end AND existing_start < candidate_end —
    which is False (allowed) for two back-to-back adjacent periods such as
    09:00-10:00 and 10:00-11:00, and True (blocked) for any positive-
    duration overlap, including one period fully containing the other."""
    candidate_timed = _is_timed_occurrence(candidate_start, candidate_end)
    existing_timed = _is_timed_occurrence(existing_start, existing_end)

    if not candidate_timed and not existing_timed:
        return SAME_TASK_CONFLICT_BOTH_UNTIMED
    if candidate_timed != existing_timed:
        return SAME_TASK_CONFLICT_TIMED_VS_UNTIMED

    # Both timed from here on — real start/end values on both sides.
    if candidate_start == existing_start and candidate_end == existing_end:
        return SAME_TASK_CONFLICT_EXACT_DUPLICATE

    if candidate_start < existing_end and existing_start < candidate_end:
        return SAME_TASK_CONFLICT_TIME_OVERLAP

    return SAME_TASK_CONFLICT_NONE


class SameTaskOccurrence:
    """Uniform, source-agnostic shape classify_same_task_conflict() compares
    a candidate against — deliberately NOT a MemberScheduleEvent or
    BulkTaskRowIn directly, so the classifier never needs to know which of
    the three call sites (single create/update against the database, Bulk
    Tasks within-batch, Bulk Tasks against the database) built it. `key` is
    whatever uniquely identifies this occurrence for self-exclusion — the
    real event UUID for a database row, or the row's 1-indexed submission
    position for an in-memory Bulk Tasks row (see
    _bulk_within_batch_time_conflicts)."""

    __slots__ = ("key", "event_date", "title", "start", "end")

    def __init__(self, key, event_date, title, start, end):
        self.key = key
        self.event_date = event_date
        self.title = title
        self.start = start
        self.end = end


def classify_same_task_conflict(
    candidate_date: date_type,
    candidate_title: Optional[str],
    candidate_start: Optional[time_type],
    candidate_end: Optional[time_type],
    existing_occurrences,
    exclude_key=None,
):
    """THE single shared classifier (STEP 3) for the FINAL AUTHORITATIVE
    SAME-TASK MULTIPLE-TIME-PERIOD RULE — Single Task creation, Task
    editing, and both Bulk Tasks checks (within-batch and against existing
    active Tasks) all call this one function; none of them re-implements
    any part of the classification logic itself.

    existing_occurrences: an iterable of SameTaskOccurrence — already
    scoped by the caller to "active Tasks for this member" (deleted_at IS
    NULL is enforced by every caller's own query, never by this function,
    since this function never touches a database session). exclude_key
    lets an edit exclude its own row from comparison against itself (STEP
    8 / required behavior #4).

    Returns (classification, conflicting_occurrence_or_None) — the FIRST
    conflicting occurrence found, or (SAME_TASK_CONFLICT_NONE, None) when
    nothing conflicts. Different normalized titles and different dates
    never conflict (checked first, before any time comparison) — different
    Task titles may overlap and remain allowed, exactly as required."""
    candidate_normalized_title = _normalize_title_for_duplicate(candidate_title)

    for occurrence in existing_occurrences:
        if exclude_key is not None and occurrence.key == exclude_key:
            continue
        if occurrence.event_date != candidate_date:
            continue
        if _normalize_title_for_duplicate(occurrence.title) != candidate_normalized_title:
            continue
        classification = _classify_time_pair(
            candidate_start, candidate_end, occurrence.start, occurrence.end
        )
        if classification != SAME_TASK_CONFLICT_NONE:
            return classification, occurrence

    return SAME_TASK_CONFLICT_NONE, None


# FRAME-LEVEL ERROR CONTEXT (2026-07-27) — base message used ONLY when a
# same-title hard conflict is attributable to one specific time frame
# within a genuinely multi-frame submission (time_frame_index is not
# None). A single-occurrence submission — the overwhelming majority of
# Task saves — is completely unaffected: same_task_conflict_response_body
# with time_frame_index=None (its pre-existing default) returns
# byte-for-byte the same body it always has, via SAME_TASK_CONFLICT_INFO
# above. EXACT_DUPLICATE and TIME_OVERLAP share one frame-indexed message
# ("SAVED SAME-TITLE CONFLICT") — the distinction between a perfect
# duplicate and a partial overlap remains available via the unchanged
# `error` code either way.
SAME_TASK_CONFLICT_FRAME_MESSAGE = {
    SAME_TASK_CONFLICT_EXACT_DUPLICATE: "The same task is already scheduled during this time.",
    SAME_TASK_CONFLICT_TIME_OVERLAP: "The same task is already scheduled during this time.",
    SAME_TASK_CONFLICT_BOTH_UNTIMED: (
        "This task already exists without a separate time, or an untimed "
        "version is included. Use one untimed task or complete, "
        "non-overlapping time frames."
    ),
    SAME_TASK_CONFLICT_TIMED_VS_UNTIMED: (
        "This task already exists without a separate time, or an untimed "
        "version is included. Use one untimed task or complete, "
        "non-overlapping time frames."
    ),
}


def same_task_conflict_response_body(classification: str, time_frame_index: Optional[int] = None) -> dict:
    """409 body for the single-create/update endpoints — same raw,
    no-'detail'-wrapper shape as leave_conflict_response_body
    (backend/routers/leave_logic.py), tagged with the classification's own
    machine-readable code (STEP 5) so the frontend can map it via
    ui/error-mapper.js without reading message text. Never exposes a raw
    database error, an internal row ID, or a stack trace — only the fixed
    code/message pair for this classification.

    time_frame_index (FRAME-LEVEL ERROR CONTEXT, 2026-07-27), additive:
    None (the default) returns exactly the pre-existing single-occurrence
    body. When the caller identifies which of several submitted time
    frames triggered this conflict, passing its 1-indexed position here
    prefixes the message with "Time frame N: " and exposes that same
    value as `time_frame_index` — never a database id, never a zero-based
    index."""
    info = SAME_TASK_CONFLICT_INFO[classification]
    if time_frame_index is None:
        return {"error": info["code"], "message": info["message"]}
    message = "Time frame " + str(time_frame_index) + ": " + SAME_TASK_CONFLICT_FRAME_MESSAGE[classification]
    return {"error": info["code"], "message": message, "time_frame_index": time_frame_index}


def _active_same_date_occurrences(
    db: Session, member_key: str, event_date: date_type
) -> List["SameTaskOccurrence"]:
    """Adapts active (deleted_at IS NULL) MemberScheduleEvent rows for
    member_key on event_date into the classifier's shared SameTaskOccurrence
    shape — the one place a database row is translated into that shape, so
    Single Task creation/editing and the Bulk-against-existing check (below)
    can never disagree about which rows qualify or how they're adapted."""
    rows = (
        db.query(MemberScheduleEvent)
        .filter(
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.deleted_at.is_(None),
            MemberScheduleEvent.event_date == event_date,
        )
        .all()
    )
    return [
        SameTaskOccurrence(
            key=row.id, event_date=row.event_date, title=row.title,
            start=row.start_time, end=row.end_time,
        )
        for row in rows
    ]


# ── MULTIPLE TIME FRAMES PER TASK (2026-07-27) ──────────────────────────────
#
# Additive feature: a Task submission (Single create, Task edit's "add
# another time", or one Bulk row) may now carry SEVERAL non-overlapping time
# frames instead of one start/end pair. Each accepted frame becomes its own
# separate MemberScheduleEvent row sharing the same member/date/title/
# priority/notes — no database schema change, and every existing hard/
# advisory rule above (classify_same_task_conflict, leave_logic,
# detect_schedule_advisories, schedule_confirmation_fingerprint) is reused
# UNCHANGED, once per frame. This section only adds the shape/internal-
# overlap validation a set of frames must pass BEFORE any of those existing
# rules run — resolve_submitted_time_frames() adapts each call site's own
# (start, end, time_frames) request shape into one ordered list of
# (start, end) tuples, and classify_time_frame_set() is the one shared
# formula for validating that list, reused identically by Single create,
# Task edit, and each Bulk row.
#
# ── APPROVED OCCURRENCE LIMIT (2026-07-27 owner approval — supersedes the
# earlier [VERIFY] status) ───────────────────────────────────────────────
#
# Approved business rule: "Maximum 30 total Task occurrences per
# submission after time-frame expansion." An occurrence is one Task
# database record. Applies consistently across every write surface via
# check_occurrence_limit() below — the ONE shared backend validator every
# endpoint calls with its own already-computed expanded_count, rather
# than each independently comparing against a limit itself:
#   - Single Task create: expanded_count = number of resolved time frames.
#   - Bulk Tasks: expanded_count = sum of resolved time frames across
#     every logical Bulk row (not the row count itself — see the
#     pre-existing, unrelated MAX_BULK_TASK_ROWS row-count cap below,
#     which this does not replace).
#   - Task edit: expanded_count = 1 (the selected occurrence) + the
#     number of additional time frames.
# A backward-compatible one-time (no time_frames/additional_time_frames)
# request always counts as exactly one occurrence.
#
# MAX_TASK_OCCURRENCES_PER_SUBMISSION is deliberately its OWN literal
# (30), not derived from MAX_BULK_TASK_ROWS — the two now happen to share
# a value because they were approved separately, not because one implies
# the other: MAX_BULK_TASK_ROWS caps how many logical Bulk rows a
# submission may contain (a pre-existing, unrelated rule), while this
# caps total expanded Task occurrences after time-frame expansion (this
# task's own approved rule). Changing one must never silently change the
# other.
MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30

_TOO_MANY_TASK_OCCURRENCES_SINGLE_MESSAGE = (
    "You can add up to " + str(MAX_TASK_OCCURRENCES_PER_SUBMISSION)
    + " task time frames in one submission. Remove some time frames and try again."
)
_TOO_MANY_TASK_OCCURRENCES_BULK_MESSAGE = (
    "You can add up to " + str(MAX_TASK_OCCURRENCES_PER_SUBMISSION)
    + " task time frames across all Bulk Task rows. Remove some time frames and try again."
)


def check_occurrence_limit(expanded_count: int, for_bulk: bool = False) -> Optional[dict]:
    """THE single shared backend occurrence-count validator (STEP 3/4 of
    the approval task) — create_member_schedule_event, Task edit's
    update_member_schedule_event, and create_member_schedule_events_bulk
    all call this ONE function with their own already-computed
    expanded_count; none of them independently counts against or compares
    to MAX_TASK_OCCURRENCES_PER_SUBMISSION itself.

    Returns None when expanded_count is within the approved limit — the
    caller proceeds exactly as it otherwise would. Returns a 422 body
    (title is a frontend-only concern, per this module's existing
    SAME_TASK_CONFLICT_INFO convention — 'Too many task times', supplied
    by ui/error-mapper.js) once expanded_count exceeds it — for_bulk
    selects the approved Bulk-specific wording ("across all Bulk Task
    rows") versus the shared Single/Edit wording. Every caller of this
    function returns immediately on a non-None result: zero Tasks
    created, zero Tasks updated, no Continue-anyway bypass, and no
    advisory fingerprint is ever computed for a submission this rejects
    (STEP 5 of the approval task) — this check always runs before any
    same-title/Leave/advisory check, exactly like every other hard
    validation in this module."""
    if expanded_count <= MAX_TASK_OCCURRENCES_PER_SUBMISSION:
        return None
    message = _TOO_MANY_TASK_OCCURRENCES_BULK_MESSAGE if for_bulk else _TOO_MANY_TASK_OCCURRENCES_SINGLE_MESSAGE
    return {"error": "too_many_task_occurrences", "message": message}


TIME_FRAME_INCOMPLETE_MESSAGE = (
    "Enter both a start and end time for every time frame, or keep only "
    "one untimed task."
)

TIME_FRAME_VALIDATION_MESSAGES = {
    "time_frame_incomplete": TIME_FRAME_INCOMPLETE_MESSAGE,
    "time_frame_invalid_range": "The end time must be later than the start time.",
    "time_frame_duplicate": (
        "Two time frames use the same start and end time. Change or "
        "remove one of them."
    ),
    "time_frame_overlap": "Two time frames overlap. Use separate, non-overlapping times.",
    "contradictory_time_fields": (
        "Enter times using either the start/end fields or time frames, not both."
    ),
}


def resolve_submitted_time_frames(
    top_start: Optional[time_type],
    top_end: Optional[time_type],
    time_frames: Optional[List["TimeFrameIn"]],
) -> Tuple[Optional[List[Tuple[Optional[time_type], Optional[time_type]]]], Optional[str]]:
    """Adapts one request's (start, end, time_frames) into a single ordered
    list of (start, end) tuples — frame 1 first — or an error code. Shared
    by Single create and each Bulk row (Task edit builds its own frame list
    directly, since frame 1 there is always the edited occurrence's
    effective start/end, never payload.start/payload.end verbatim — see
    update_member_schedule_event).

    When `time_frames` is absent or empty: returns the pre-existing single
    [(top_start, top_end)] frame, byte-for-byte the same value an old
    caller's start/end pair always produced — exact backward compatibility,
    no new validation applied here beyond what already ran at the schema
    layer for that pair.

    When `time_frames` is nonempty, it is AUTHORITATIVE: top_start and
    top_end must both be None, or this is rejected as
    'contradictory_time_fields' — the request is never silently resolved by
    preferring one side over the other.

    Deliberately does NOT itself cap the length of `time_frames` (APPROVED
    OCCURRENCE LIMIT, 2026-07-27) — that responsibility belongs entirely to
    check_occurrence_limit() above, called once by each endpoint against
    its own submission-wide expanded_count, so the 30-occurrence limit is
    never independently counted or compared in more than one place. A
    request with more frames than the approved limit still resolves
    successfully here; the caller's own check_occurrence_limit() call is
    what rejects it.

    Returns (frames, error_code) — error_code is None on success and frames
    is None on failure, so callers can branch on `error_code is not None`
    without also checking frames."""
    if not time_frames:
        return [(top_start, top_end)], None
    if top_start is not None or top_end is not None:
        return None, "contradictory_time_fields"
    return [(frame.start_time, frame.end_time) for frame in time_frames], None


def time_frame_error_response_body(code: str, **extra) -> dict:
    """409/422 body for any multiple-time-frames validation failure —
    same raw, no-'detail'-wrapper shape as every other hard-validation
    response in this module. `extra` carries the additive, 1-indexed
    `frame`/`frames` locator fields (never 0-indexed — Phase 11's "do not
    expose zero-based indexes" rule applies here too, not just to Bulk)."""
    body = {"error": code, "message": TIME_FRAME_VALIDATION_MESSAGES[code]}
    body.update(extra)
    return body


def classify_time_frame_set(
    frames: List[Tuple[Optional[time_type], Optional[time_type]]],
) -> Tuple[str, Optional[int], Optional[int]]:
    """THE single shared shape/internal-overlap classifier for a submitted
    list of (start, end) frames — 1-indexed by position (frame 1 =
    frames[0]) to match what the user sees on the form. Returns
    (outcome, a, b):
      - ('ok', None, None) — every frame accepted; proceed to the existing
        per-frame hard/advisory checks (classify_same_task_conflict, Leave,
        detect_schedule_advisories) unchanged.
      - ('incomplete', frame_number, None) — untimed-mode violation
        (PHASE 4): a frame that is neither fully blank nor fully timed.
        frame_number is the offending frame's 1-indexed position when 2+
        frames were submitted (FRAME-LEVEL ERROR CONTEXT, 2026-07-27) —
        None for the single-frame case (frames has exactly one entry),
        preserving that case's exact pre-existing (outcome, None, None)
        shape. A single fully blank frame (both None) is always allowed —
        one untimed Task.
      - ('invalid_range', frame_number, None) — that frame's end is not
        later than its start.
      - ('duplicate', frame_a, frame_b) — two frames share the exact same
        start and end.
      - ('overlap', frame_a, frame_b) — two frames' timed intervals overlap
        (half-open interval formula, identical to _classify_time_pair's own
        overlap branch — adjacent frames, end == other's start, are NOT an
        overlap and remain allowed).

    Checked in this fixed order (shape before pairwise comparison, first
    conflicting pair wins) so a request with multiple problems always gets
    one deterministic, reproducible error rather than whichever check
    happens to run first in a different implementation."""
    if len(frames) == 1:
        start, end = frames[0]
        if start is None and end is None:
            return "ok", None, None
        if start is None or end is None:
            return "incomplete", None, None
    else:
        for index, (start, end) in enumerate(frames, start=1):
            if start is None or end is None:
                return "incomplete", index, None

    for index, (start, end) in enumerate(frames, start=1):
        if start is not None and end is not None and end <= start:
            return "invalid_range", index, None

    for i in range(len(frames)):
        a_start, a_end = frames[i]
        for j in range(i + 1, len(frames)):
            b_start, b_end = frames[j]
            if a_start is None or a_end is None or b_start is None or b_end is None:
                continue
            if a_start == b_start and a_end == b_end:
                return "duplicate", i + 1, j + 1
            if a_start < b_end and b_start < a_end:
                return "overlap", i + 1, j + 1

    return "ok", None, None


# ── FRAME-LEVEL ERROR CONTEXT (2026-07-27) ───────────────────────────────
#
# Base (unprefixed) message text for a classify_time_frame_set() outcome,
# used ONLY once a submission genuinely has more than one time frame (a
# single-frame submission — the overwhelming majority of Task saves — is
# completely unaffected: time_frame_set_error_response_body's frame_count
# <= 1 branch below returns byte-for-byte the same body it always has,
# via TIME_FRAME_VALIDATION_MESSAGES/time_frame_error_response_body).
# "Time frame N: " (or "Task N, time frame M: " — Bulk prepends its own
# logical-task prefix in _expand_bulk_rows_into_frames below) is added by
# the caller, never baked in here, so the exact same base text is reused
# word-for-word by Single Task, Task Edit, and Bulk. duplicate/overlap
# name only the LATER of the two conflicting frames (never both) — this
# reads more naturally as "this new entry conflicts with something
# already there" and matches the approved examples exactly.
_TIME_FRAME_SHAPE_BASE_MESSAGE = {
    "incomplete": "Enter both a start and end time.",
    "invalid_range": "The end time must be later than the start time.",
    "duplicate": "This time is already used by another time frame.",
    "overlap": "This time overlaps another time frame. Use separate, non-overlapping times.",
}

# Bulk's own duplicate/overlap wording additionally names "for the same
# task" (PHASE 5's exact required examples) — Bulk has multiple logical
# Task rows in play, so this clarifies the conflict is between two frames
# of the SAME row, not a different row entirely. incomplete/invalid_range
# are identical across every surface, so only these two keys differ.
_BULK_TIME_FRAME_SHAPE_BASE_MESSAGE = dict(_TIME_FRAME_SHAPE_BASE_MESSAGE)
_BULK_TIME_FRAME_SHAPE_BASE_MESSAGE.update({
    "duplicate": "This time is already used by another time frame for the same task.",
    "overlap": "This time overlaps another time frame for the same task. Use separate, non-overlapping times.",
})


def time_frame_set_error_response_body(
    outcome: str, a: Optional[int], b: Optional[int], frame_count: int = 1, for_bulk: bool = False,
) -> dict:
    """Maps one classify_time_frame_set() non-'ok' outcome to its 422 body.
    Never called with outcome == 'ok' — callers check that first.

    frame_count is the TOTAL number of frames in THIS submission (Single
    create's/Task edit's len(frames), or one Bulk row's own frame count —
    2026-07-27, FRAME-LEVEL ERROR CONTEXT task). frame_count <= 1 returns
    EXACTLY the body this function has always returned (no 'Time frame N:'
    prefix, no time_frame_index key) — 'duplicate'/'overlap' can never
    actually occur with frame_count <= 1 (both require comparing at least
    two frames), so that branch below is reachable only for
    'incomplete'/'invalid_range'. frame_count > 1 prefixes the message
    with 'Time frame N: ' and adds the offending 1-indexed `time_frame_index`
    — never a database id, never a zero-based index (PHASE 11's "do not
    expose zero-based indexes" rule). for_bulk selects
    _BULK_TIME_FRAME_SHAPE_BASE_MESSAGE's "for the same task" wording for
    duplicate/overlap instead of the plain Single/Edit text — the caller
    (Bulk's _expand_bulk_rows_into_frames) still prepends its own
    "Task N, " prefix on top of whatever this returns."""
    if frame_count <= 1:
        if outcome == "incomplete":
            return time_frame_error_response_body("time_frame_incomplete")
        if outcome == "invalid_range":
            return time_frame_error_response_body("time_frame_invalid_range", frame=a)
        if outcome == "duplicate":
            return time_frame_error_response_body("time_frame_duplicate", frames=[a, b])
        if outcome == "overlap":
            return time_frame_error_response_body("time_frame_overlap", frames=[a, b])
        raise ValueError("time_frame_set_error_response_body called with outcome 'ok'")

    if outcome in ("incomplete", "invalid_range"):
        frame_index = a
    elif outcome in ("duplicate", "overlap"):
        frame_index = b  # the later of the two conflicting frames — see module note above
    else:
        raise ValueError("time_frame_set_error_response_body called with outcome 'ok'")

    code = {
        "incomplete": "time_frame_incomplete",
        "invalid_range": "time_frame_invalid_range",
        "duplicate": "time_frame_duplicate",
        "overlap": "time_frame_overlap",
    }[outcome]
    base_messages = _BULK_TIME_FRAME_SHAPE_BASE_MESSAGE if for_bulk else _TIME_FRAME_SHAPE_BASE_MESSAGE
    message = "Time frame " + str(frame_index) + ": " + base_messages[outcome]
    return {"error": code, "message": message, "time_frame_index": frame_index}


# ── LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION (2026-07-27) ──
#
# ADVISORY (confirmable), never a hard block — strictly separate from every
# hard-block domain above (same-title via classify_same_task_conflict,
# Task/Leave via leave_logic). Two independent conditions, either or both of
# which may apply to one candidate Task:
#
#   1. Lunch-break overlap: the candidate's [start, end) interval overlaps
#      the company lunch interval, every calendar day including weekends.
#      Reuses ACTUAL_OFFICE_BREAK_START/END (backend/config.py) — the
#      already-registered "actual company office break" constant (12:45-
#      13:30), never a second, independently-defined lunch constant.
#   2. Different-title Task-time overlap: the candidate overlaps an ACTIVE
#      Task for the SAME member and SAME date whose normalized title
#      DIFFERS from the candidate's. Same-normalized-title occurrences are
#      classify_same_task_conflict's domain exclusively — this detector
#      only ever compares against occurrences that classifier would already
#      treat as SAME_TASK_CONFLICT_NONE by title, so the two checks can
#      never disagree or double-flag the same pair.
#
# Both conditions require the CANDIDATE to be timed (an untimed Task can
# never overlap anything, per the half-open-interval time model shared with
# classify_same_task_conflict). detect_schedule_advisories() is the one
# shared detector every write path (single create, Task edit, Bulk Tasks —
# once per row) calls; none of them re-implements either formula.

ADVISORY_LUNCH_BREAK_OVERLAP = "lunch_break_overlap"
ADVISORY_DIFFERENT_TASK_TIME_OVERLAP = "different_task_time_overlap"

# Fixed emission order for one candidate's warnings — lunch before
# different-title — so the response body, the popup summary, and the
# confirmation fingerprint are all deterministic regardless of dict/set
# iteration order (STEP 24 of the approved test matrix).
_ADVISORY_CODE_ORDER = (ADVISORY_LUNCH_BREAK_OVERLAP, ADVISORY_DIFFERENT_TASK_TIME_OVERLAP)


def _overlaps_lunch_break(start: Optional[time_type], end: Optional[time_type]) -> bool:
    """True when a timed [start, end) interval overlaps the company lunch
    interval [12:45, 13:30) — applies identically on every calendar day,
    including Saturday/Sunday (there is no day-of-week branch here at all).
    An untimed candidate (either value None) never overlaps anything.
    Approved half-open formula: candidate_start < lunch_end AND
    lunch_start < candidate_end — a Task ending exactly at 12:45 or starting
    exactly at 13:30 does NOT warn (matches the approved boundary cases)."""
    if start is None or end is None:
        return False
    return start < ACTUAL_OFFICE_BREAK_END and ACTUAL_OFFICE_BREAK_START < end


def _timed_intervals_overlap(
    a_start: time_type, a_end: time_type, b_start: time_type, b_end: time_type
) -> bool:
    """Same half-open interval formula classify_same_task_conflict's own
    overlap branch uses (candidate_start < existing_end AND existing_start <
    candidate_end) — kept as an independent one-line pure function rather
    than extracted out of _classify_time_pair, so the live, already-shipped
    same-title classifier is never touched by this additive feature. Only
    ever called here with two already-timed pairs (both callers check
    start/end is not None first)."""
    return a_start < b_end and b_start < a_end


def detect_schedule_advisories(
    candidate_date: date_type,
    candidate_title: Optional[str],
    candidate_start: Optional[time_type],
    candidate_end: Optional[time_type],
    existing_occurrences,
    exclude_key=None,
) -> Tuple[List[str], List]:
    """THE single shared ADVISORY detector (lunch + different-title
    overlap) — Single Task creation, Task editing, and Bulk Tasks (each
    nonblank row) all call this one function via build_schedule_confirmation
    below; none of them re-implements either formula.

    existing_occurrences: same SameTaskOccurrence shape/scoping
    classify_same_task_conflict uses (already scoped by the caller to
    "active Tasks for this member" — deleted_at IS NULL is enforced by
    every caller's own query, never here). For Bulk Tasks, a caller may
    additionally merge in-batch rows (adapted to the same shape, keyed by
    row number) into this list — see _bulk_schedule_advisories below.

    Returns (warning_codes, conflict_keys):
    - warning_codes: ADVISORY_LUNCH_BREAK_OVERLAP and/or
      ADVISORY_DIFFERENT_TASK_TIME_OVERLAP, in _ADVISORY_CODE_ORDER, or an
      empty list when nothing applies.
    - conflict_keys: every existing occurrence's own key that produced a
      different-title overlap (empty when that warning did not fire) — used
      only to build the confirmation fingerprint (schedule_confirmation_
      fingerprint below); never exposed to the client directly, so no
      internal database ID ever appears in user-visible text."""
    warning_codes: List[str] = []
    conflict_keys: List = []

    if _overlaps_lunch_break(candidate_start, candidate_end):
        warning_codes.append(ADVISORY_LUNCH_BREAK_OVERLAP)

    if candidate_start is not None and candidate_end is not None:
        candidate_normalized_title = _normalize_title_for_duplicate(candidate_title)
        for occurrence in existing_occurrences:
            if exclude_key is not None and occurrence.key == exclude_key:
                continue
            if occurrence.event_date != candidate_date:
                continue
            if occurrence.start is None or occurrence.end is None:
                continue
            if _normalize_title_for_duplicate(occurrence.title) == candidate_normalized_title:
                continue  # same-title domain — classify_same_task_conflict's, not this detector's
            if _timed_intervals_overlap(candidate_start, candidate_end, occurrence.start, occurrence.end):
                conflict_keys.append(occurrence.key)

    if conflict_keys:
        warning_codes.append(ADVISORY_DIFFERENT_TASK_TIME_OVERLAP)

    return warning_codes, conflict_keys


def _advisory_candidate_state(
    row_index: Optional[int],
    candidate_date: date_type,
    candidate_title: Optional[str],
    candidate_start: Optional[time_type],
    candidate_end: Optional[time_type],
    warning_codes: List[str],
    conflict_keys: List,
    frame_index: Optional[int] = None,
) -> dict:
    """One candidate's JSON-serializable contribution to the confirmation
    fingerprint (STEP: fingerprint must represent relevant request data,
    current advisory codes, Bulk row ownership, current conflicting Task
    facts, and lunch status) — never returned to the client directly, only
    hashed by schedule_confirmation_fingerprint below. Deliberately includes
    the raw candidate date/title/start/end (not just the derived codes) so
    a payload edit that happens to reproduce the same warning codes against
    a different underlying date/time/title still changes the fingerprint —
    a stale confirmation is only ever honored for the EXACT unchanged
    payload it was issued for.

    frame_index (MULTIPLE TIME FRAMES PER TASK, 2026-07-27), additive: only
    ever passed by a Bulk row that itself has more than one time frame —
    row_index alone (the Task row number) can no longer uniquely identify a
    candidate once one Task row expands into several frames, so this
    optional 1-indexed frame position is folded into the state dict when
    present. Every other caller (single create/edit, and Bulk when every
    row still has exactly one frame) never passes this, so the dict shape
    — and therefore the fingerprint — is byte-for-byte unchanged for them."""
    state = {
        "row_index": row_index,
        "date": candidate_date.isoformat(),
        "title": _normalize_title_for_duplicate(candidate_title),
        "start": candidate_start.isoformat() if candidate_start else None,
        "end": candidate_end.isoformat() if candidate_end else None,
        "codes": list(warning_codes),
        "conflicts": sorted(str(key) for key in conflict_keys),
    }
    if frame_index is not None:
        state["frame_index"] = frame_index
    return state


def _dedupe_and_sort_conflict_details(conflict_details: List[dict]) -> List[dict]:
    """Display-only dedup + sort for a candidate's conflicting-Task summary
    (2026-07-27 plain-language confirmation copy task) — collapses two
    entries that display identically (same title/start/end, e.g. two
    distinct DB rows that happen to coincide) down to one, then orders the
    remainder by start time, then end time, then title, so the popup and
    every caller (single create/edit, each Bulk row) present conflicts in
    one deterministic, readable order. Operates purely on the small
    display dicts built by build_schedule_confirmation below — never
    touches conflict_keys/_advisory_candidate_state, so the confirmation
    fingerprint is completely unaffected by this ordering/dedup."""
    seen = set()
    deduped: List[dict] = []
    for item in conflict_details:
        key = (item["title"], item["start_time"], item["end_time"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    deduped.sort(key=lambda item: (item["start_time"], item["end_time"], item["title"]))
    return deduped


def build_schedule_confirmation(
    candidate_date: date_type,
    candidate_title: Optional[str],
    candidate_start: Optional[time_type],
    candidate_end: Optional[time_type],
    existing_occurrences,
    exclude_key=None,
    row_index: Optional[int] = None,
    frame_index: Optional[int] = None,
) -> Tuple[List[dict], dict]:
    """One-candidate convenience wrapper around detect_schedule_advisories —
    used directly by the single-create/edit endpoints (one candidate) and
    once per frame by Bulk Tasks. Returns (warnings, candidate_state):
    warnings is a list of {"code", "row_index"} dicts (the client-facing
    shape, in _ADVISORY_CODE_ORDER) — row_index is always None for single
    create/edit with exactly one frame, the frame's own 1-indexed position
    for a multi-frame single create, and the Task row's own 1-indexed
    position for Bulk; candidate_state is the JSON-serializable dict
    schedule_confirmation_fingerprint hashes, never returned to the client
    directly.

    frame_index (MULTIPLE TIME FRAMES PER TASK, 2026-07-27), additive: only
    passed by Bulk for a row that has more than one time frame, so the
    client can distinguish "Task 2, time frame 3" from just "Task 2" —
    stamped onto every warning entry this call produces and threaded into
    _advisory_candidate_state. None (the default) for every other caller,
    which leaves both the warning shape and the fingerprint completely
    unchanged from before this field existed.

    2026-07-27 plain-language confirmation copy task: the
    ADVISORY_DIFFERENT_TASK_TIME_OVERLAP warning entry additionally carries
    a `conflicts` array — safe, display-only {"title","start_time",
    "end_time"} dicts for every conflicting occurrence, deduped/sorted for
    readability — built by cross-referencing conflict_keys (already
    computed by detect_schedule_advisories) back against the SAME
    existing_occurrences list already in scope here, so no second DB query
    is introduced. This is purely additive: conflict_keys itself, and
    therefore _advisory_candidate_state/schedule_confirmation_fingerprint,
    are completely unchanged by this — the fingerprint remains the sole
    write-authorizing contract; `conflicts` exists only so the frontend can
    show the user which existing Task and time is involved, never as a
    second source of truth an old client's absence of this field could
    ever break (any client that does not read `conflicts` behaves exactly
    as it did before this field existed)."""
    warning_codes, conflict_keys = detect_schedule_advisories(
        candidate_date, candidate_title, candidate_start, candidate_end,
        existing_occurrences, exclude_key=exclude_key,
    )

    conflict_details: List[dict] = []
    if conflict_keys:
        conflict_key_set = set(conflict_keys)
        conflict_details = _dedupe_and_sort_conflict_details([
            {
                "title": occurrence.title,
                "start_time": occurrence.start.strftime("%H:%M"),
                "end_time": occurrence.end.strftime("%H:%M"),
            }
            for occurrence in existing_occurrences
            if occurrence.key in conflict_key_set
        ])

    warnings = []
    for code in warning_codes:
        entry = {"code": code, "row_index": row_index}
        if frame_index is not None:
            entry["frame_index"] = frame_index
        if code == ADVISORY_DIFFERENT_TASK_TIME_OVERLAP:
            entry["conflicts"] = conflict_details
        warnings.append(entry)

    state = _advisory_candidate_state(
        row_index, candidate_date, candidate_title, candidate_start, candidate_end,
        warning_codes, conflict_keys, frame_index=frame_index,
    )
    return warnings, state


def schedule_confirmation_fingerprint(candidate_states: List[dict]) -> str:
    """Deterministic SHA-256 hex digest over every candidate's
    _advisory_candidate_state dict (sorted by row_index so dict/list
    ordering can never affect the digest), request-scoped only — never
    stored in the database (PHASE 8: "does not need to be stored"). Any
    change to the request data, the current advisory codes, or the current
    conflicting Task facts (a new conflicting Task appearing before a
    confirmed retry, an edited payload, a changed lunch status) changes this
    digest, so a stale confirmation can never silently match a freshly
    recomputed one."""
    ordered = sorted(
        candidate_states,
        key=lambda state: (state["row_index"] if state["row_index"] is not None else -1),
    )
    encoded = json.dumps(ordered, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def schedule_confirmation_response_body(warnings: List[dict], candidate_states: List[dict]) -> dict:
    """409 body for the "advisory confirmation required, zero writes"
    contract — same raw, no-"detail"-wrapper shape as
    leave_conflict_response_body/same_task_conflict_response_body. Never
    exposes a raw database error, an internal row ID, or a stack trace —
    warnings only ever carry {"code", "row_index"}, and
    confirmation_fingerprint is an opaque SHA-256 digest."""
    return {
        "error": "schedule_confirmation_required",
        "warnings": warnings,
        "confirmation_fingerprint": schedule_confirmation_fingerprint(candidate_states),
    }


# ── MULTIPLE TIME FRAMES PER TASK, Bulk row expansion (2026-07-27) ──────────
#
# Each Bulk row may now carry several time frames (BulkTaskRowIn.time_frames)
# instead of one start/end pair. _expand_bulk_rows_into_frames() is the ONE
# place that resolves/shape-validates every row's frame(s) and turns them
# into individual (row_number, frame_number, frame_count, frame_row) tuples
# — every downstream helper below (_bulk_within_batch_time_conflicts,
# _bulk_existing_task_time_conflict_errors, _bulk_leave_conflict_errors,
# _find_batch_duplicate_warnings, _find_existing_task_duplicate_warnings)
# keeps using the SAME row_number as its key for every frame belonging to
# one row — deliberately, not a fresh per-frame key — so:
#   1. None of those functions needs to change AT ALL: they already accept
#      a plain List[Tuple[int, BulkTaskRowIn]], and a real BulkTaskRowIn
#      carrying one frame's own start/end is exactly what they expect.
#   2. Sibling frames of the SAME row share one exclude_key, so
#      classify_same_task_conflict's self-exclusion naturally skips
#      comparing a row's own frames against each other — already proven
#      non-conflicting by classify_time_frame_set before expansion ever
#      runs, so this is the correct behavior, not a gap.
#   3. Every produced error/warning's `row` or `rows` value is already the
#      correct, user-facing Task row number — no separate remapping step is
#      needed, and messages built by e.g. _find_batch_duplicate_warnings
#      (which bakes "Row N" into its own text) are automatically correct.
#   4. When every row has exactly one frame (the pre-existing shape), the
#      expanded list is byte-for-byte identical to the original
#      nonblank_rows list, so existing single-frame-per-row Bulk behavior
#      is completely unaffected.


def _lowercase_first(text: str) -> str:
    """"Time frame 2: ..." -> "time frame 2: ..." — used only to fold a
    time_frame_set_error_response_body message into a Bulk "Task N, "
    prefix (FRAME-LEVEL ERROR CONTEXT, 2026-07-27) without an awkward
    double capital ("Task 2, Time frame 3: ..."). Never touches anything
    but the first character; safe for an empty string."""
    return (text[:1].lower() + text[1:]) if text else text


def _expand_bulk_rows_into_frames(
    nonblank_rows: List[Tuple[int, "BulkTaskRowIn"]],
) -> Tuple[List[dict], List[Tuple[int, int, int, "BulkTaskRowIn"]]]:
    """Resolves and shape-validates every nonblank row's time frame(s)
    (PHASE 5/11) BEFORE any same-task/leave/duplicate/advisory check runs —
    mirrors _bulk_row_field_errors' own convention of gating every
    downstream check behind one clean pass. Returns (shape_errors,
    expanded):

    - shape_errors: one {row, field, code, message} entry per row whose
      time frame(s) failed resolve_submitted_time_frames/
      classify_time_frame_set. User-facing numbering (PHASE 11 — "Task 2,
      time frame 3", never a zero-based index): the message is prefixed
      with "Time frame N: " (or "Time frames N and M: ") only when the
      classifier identified specific frame position(s); a whole-row
      'contradictory_time_fields' failure has no single frame to name, so
      its message is used as-is. The approved occurrence-limit check
      (check_occurrence_limit, called separately by the caller against
      this row's OWN resolved frame count summed with every other row's)
      is a distinct, whole-SUBMISSION concern and never appears here.
    - expanded: one (row_number, frame_number, frame_count, frame_row)
      tuple per ACCEPTED frame across every row that had no shape error,
      in stable (row, frame) order. frame_row is a real BulkTaskRowIn
      carrying the row's own date/title/priority/notes plus this one
      frame's start/end — the exact shape every existing same-task/leave/
      duplicate/advisory helper already expects."""
    shape_errors: List[dict] = []
    expanded: List[Tuple[int, int, int, "BulkTaskRowIn"]] = []
    for row_number, row in nonblank_rows:
        frames, resolve_error = resolve_submitted_time_frames(
            row.start, row.end, row.time_frames
        )
        if resolve_error is not None:
            shape_errors.append({
                "row": row_number, "field": "start",
                "code": resolve_error,
                "message": TIME_FRAME_VALIDATION_MESSAGES[resolve_error],
                # logical_task_index (FRAME-LEVEL ERROR CONTEXT, 2026-07-27)
                # — always the same value as `row` above; `row` is kept
                # unchanged for the pre-existing frontend/DOM-targeting
                # contract (applyBulkRowErrors keys off it), and
                # logical_task_index is the additive, semantically-named
                # field the structured Task/time-frame error concept uses.
                # No time_frame_index here — a whole-row
                # 'contradictory_time_fields' failure has no single frame
                # to name.
                "logical_task_index": row_number,
            })
            continue

        shape_outcome, a, b = classify_time_frame_set(frames)
        if shape_outcome != "ok":
            body = time_frame_set_error_response_body(
                shape_outcome, a, b, frame_count=len(frames), for_bulk=True
            )
            error = {
                "row": row_number, "field": "start",
                "code": body["error"], "message": body["message"],
                "logical_task_index": row_number,
            }
            if "time_frame_index" in body:
                # body["message"] is already "Time frame N: <text>" — this
                # row has more than one time frame, so the user-facing
                # message becomes "Task <row>, time frame N: <text>"
                # (PHASE 5's exact required wording), and time_frame_index
                # is carried alongside logical_task_index so the frontend
                # can target the specific nested frame row/input, never
                # just the logical Task row as a whole.
                error["time_frame_index"] = body["time_frame_index"]
                error["message"] = "Task " + str(row_number) + ", " + _lowercase_first(body["message"])
            shape_errors.append(error)
            continue

        frame_count = len(frames)
        for frame_number, (start, end) in enumerate(frames, start=1):
            frame_row = BulkTaskRowIn(
                date=row.date, title=row.title, priority=row.priority,
                start=start, end=end, notes=row.notes,
            )
            expanded.append((row_number, frame_number, frame_count, frame_row))

    return shape_errors, expanded


def _bulk_schedule_advisories(
    db: Session, member_key: str, expanded: List[Tuple[int, int, int, "BulkTaskRowIn"]],
) -> Tuple[List[dict], List[dict]]:
    """Lunch + different-title ADVISORY detection across a Bulk Tasks
    submission — covers all three required comparison sources in one pass
    per frame: (A) lunch, (B) every OTHER frame in the same submitted batch
    (any row, including sibling frames of a different row) sharing this
    frame's own date, and (C) already-active Tasks saved for this member on
    that date. (B) and (C) are merged into one `existing_occurrences` list
    per frame (rather than two separate passes, unlike the hard same-title
    classifier's own within-batch/against-existing split) since
    detect_schedule_advisories is one shared, single-call detector — a
    batch frame's own row_number key can never collide with a database
    row's UUID key, so exclude_key safely excludes every frame belonging to
    THIS SAME row (already proven mutually non-conflicting by
    classify_time_frame_set before expansion). Returns (warnings,
    candidate_states) — warnings is every frame's {"code","row_index",
    ["frame_index"]} entries in frame-then-code order; candidate_states is
    the full per-frame state list schedule_confirmation_fingerprint hashes
    (every accepted frame is included, even one with zero warning codes, so
    the fingerprint is sensitive to any frame's underlying data changing).
    frame_index (see build_schedule_confirmation) is only ever passed for a
    row that itself has more than one frame — a row with exactly one frame
    behaves exactly as it always has (row_index alone, no frame_index)."""
    batch_occurrences_by_date: dict = {}
    for row_number, _frame_number, _frame_count, frame_row in expanded:
        batch_occurrences_by_date.setdefault(frame_row.date, []).append(
            SameTaskOccurrence(
                key=row_number, event_date=frame_row.date, title=frame_row.title,
                start=frame_row.start, end=frame_row.end,
            )
        )

    warnings: List[dict] = []
    candidate_states: List[dict] = []
    for row_number, frame_number, frame_count, frame_row in expanded:
        combined_occurrences = (
            _active_same_date_occurrences(db, member_key, frame_row.date)
            + batch_occurrences_by_date.get(frame_row.date, [])
        )
        frame_index = frame_number if frame_count > 1 else None
        frame_warnings, state = build_schedule_confirmation(
            frame_row.date, frame_row.title, frame_row.start, frame_row.end,
            combined_occurrences, exclude_key=row_number, row_index=row_number,
            frame_index=frame_index,
        )
        warnings.extend(frame_warnings)
        candidate_states.append(state)

    return warnings, candidate_states


def _dedupe_and_sort_bulk_errors(errors: List[dict]) -> List[dict]:
    """PHASE 7 (multiple errors, 2026-07-27 FRAME-LEVEL ERROR CONTEXT
    follow-up task): every hard-validation error the Bulk endpoint
    collects is still shown — never replaced by one generic banner — this
    only (1) removes an EXACT duplicate (identical row/field/code/message)
    that two independent checks happened to both produce for the same
    frame (e.g. a frame conflicting with both an in-batch frame and an
    existing saved Task, landing on the identical resulting message), and
    (2) orders the remainder by logical Task row, then time frame, so the
    user reads errors in the same order they'd naturally scan the form.
    Errors with no `row` (a whole-submission problem like "no tasks
    submitted"/"too many tasks") sort first — a blocking, unscoped issue
    is read before any per-row detail. Deliberately never drops a
    non-duplicate error — two DIFFERENT problems on the same frame (e.g.
    an overlap AND a separate field error) are both kept."""
    seen = set()
    deduped: List[dict] = []
    for error in errors:
        key = (error.get("row"), error.get("field"), error.get("code"), error.get("message"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(error)
    deduped.sort(key=lambda e: (
        e.get("row") if e.get("row") is not None else -1,
        e.get("time_frame_index") if e.get("time_frame_index") is not None else 0,
    ))
    return deduped


def _bulk_same_task_conflict_error(
    row_number: int, frame_number: int, frame_count: int, classification: str, anchor_field: str,
) -> dict:
    """Shared error-dict builder for a Bulk same-task hard conflict
    (FRAME-LEVEL ERROR CONTEXT, 2026-07-27) — the ONE narrow correction
    point both _bulk_within_batch_time_conflicts and
    _bulk_existing_task_time_conflict_errors below call, so the two
    same-title conflict sources (within-batch, against-existing) can never
    word this differently. frame_count <= 1 (the pre-existing shape)
    returns byte-for-byte the same {row, field, code, message} error this
    codebase has always produced; frame_count > 1 adds
    logical_task_index/time_frame_index and the "Task N, time frame M: "
    wording, reusing SAME_TASK_CONFLICT_FRAME_MESSAGE — the exact same
    base text Single Task/Task Edit's own frame-indexed same-title
    messages use (same_task_conflict_response_body)."""
    info = SAME_TASK_CONFLICT_INFO[classification]
    error = {
        "row": row_number, "field": anchor_field,
        "code": info["code"], "logical_task_index": row_number,
    }
    if frame_count > 1:
        error["time_frame_index"] = frame_number
        error["message"] = (
            "Task " + str(row_number) + ", time frame " + str(frame_number)
            + ": " + SAME_TASK_CONFLICT_FRAME_MESSAGE[classification]
        )
    else:
        error["message"] = info["message"]
    return error


def _bulk_within_batch_time_conflicts(
    expanded: List[Tuple[int, int, int, "BulkTaskRowIn"]],
) -> List[dict]:
    """FINAL AUTHORITATIVE SAME-TASK MULTIPLE-TIME-PERIOD RULE, WITHIN the
    current Bulk Tasks submission only (STEP 7.A) — every accepted frame is
    checked, via the shared classify_same_task_conflict(), against every
    OTHER frame in the batch (every frame belonging to the SAME row is
    excluded via exclude_key=row_number — already proven mutually
    non-conflicting by classify_time_frame_set before expansion, see
    _expand_bulk_rows_into_frames), so exact duplicates, overlaps,
    both-untimed, and timed-vs-untimed pairs are all caught the same way a
    DB-backed check would catch them. A conflicting pair naturally flags
    BOTH frames involved: iterating frame A as the candidate finds frame B
    as the conflicting occurrence (flags A), and iterating frame B as the
    candidate finds frame A (flags B) — every classification here is
    symmetric (equality, timed-status mismatch, and interval overlap are
    all symmetric relations), so no separate "flag the other side too"
    step is needed.

    FRAME-LEVEL ERROR CONTEXT (2026-07-27): accepts the full `expanded`
    list (row_number, frame_number, frame_count, frame_row) — not the
    stripped (row_number, frame_row) pairs this function used before —
    specifically so a conflict on one frame of a multi-frame row can be
    attributed to that exact frame. Only called once every nonblank row
    already has a date (see _bulk_leave_conflict_errors' docstring), so
    frame_row.date is never None here."""
    occurrences = [
        SameTaskOccurrence(key=row_number, event_date=row.date, title=row.title,
                            start=row.start, end=row.end)
        for row_number, _frame_number, _frame_count, row in expanded
    ]

    errors: List[dict] = []
    for row_number, frame_number, frame_count, row in expanded:
        classification, _conflict = classify_same_task_conflict(
            row.date, row.title, row.start, row.end, occurrences, exclude_key=row_number,
        )
        if classification == SAME_TASK_CONFLICT_NONE:
            continue
        anchor_field = "start" if (row.start is not None or row.end is not None) else "title"
        errors.append(
            _bulk_same_task_conflict_error(row_number, frame_number, frame_count, classification, anchor_field)
        )
    return errors


def _bulk_existing_task_time_conflict_errors(
    db: Session,
    member_key: str,
    expanded: List[Tuple[int, int, int, "BulkTaskRowIn"]],
) -> List[dict]:
    """FINAL AUTHORITATIVE SAME-TASK MULTIPLE-TIME-PERIOD RULE, each
    accepted frame AGAINST Tasks already saved for this member (STEP 7.B) —
    reuses classify_same_task_conflict() via _active_same_date_occurrences(),
    the same formula/adapter the single-create/update endpoints call; no
    second formula is implemented here. FRAME-LEVEL ERROR CONTEXT
    (2026-07-27): see _bulk_within_batch_time_conflicts' docstring above —
    same `expanded`-list-instead-of-stripped-pairs rationale."""
    errors: List[dict] = []
    for row_number, frame_number, frame_count, row in expanded:
        occurrences = _active_same_date_occurrences(db, member_key, row.date)
        classification, _conflict = classify_same_task_conflict(
            row.date, row.title, row.start, row.end, occurrences,
        )
        if classification == SAME_TASK_CONFLICT_NONE:
            continue
        anchor_field = "start" if (row.start is not None or row.end is not None) else "title"
        errors.append(
            _bulk_same_task_conflict_error(row_number, frame_number, frame_count, classification, anchor_field)
        )
    return errors


def _normalize_time_for_duplicate(value: Optional[time_type]) -> Optional[str]:
    """HH:MM representation for duplicate comparison only (Step 8) —
    seconds are never part of a Task's start/end time in this API, so
    truncation loses no information."""
    return value.strftime("%H:%M") if value is not None else None


def _bulk_duplicate_key(
    title: Optional[str], start: Optional[time_type], end: Optional[time_type]
) -> Tuple[str, Optional[str], Optional[str]]:
    """The duplicate-identity tuple (Step 8): normalized title + normalized
    start + normalized end. Untimed rows/tasks naturally compare on
    (title, None, None) — two untimed tasks with the same title are a
    duplicate; an untimed and a timed task sharing a title are not (their
    keys differ), matching "do not treat title-only similarity as a
    duplicate when time combinations differ.\" Date is deliberately NOT
    part of this tuple — callers that need date-scoped identity (every
    caller, since the CONFIRMED ADD-ROW DATE RULE task, 2026-07-24, made
    date per-row) prepend the row's own date themselves, so this stays the
    one shared title/time comparison used both within-batch and against
    an already date-filtered set of existing tasks."""
    return (
        _normalize_title_for_duplicate(title),
        _normalize_time_for_duplicate(start),
        _normalize_time_for_duplicate(end),
    )


def _format_row_list(rows: List[int]) -> str:
    ordered = sorted(rows)
    if len(ordered) == 1:
        return "Row " + str(ordered[0])
    if len(ordered) == 2:
        return "Rows " + str(ordered[0]) + " and " + str(ordered[1])
    return "Rows " + ", ".join(str(r) for r in ordered[:-1]) + ", and " + str(ordered[-1])


def _format_time_range_for_message(
    start: Optional[time_type], end: Optional[time_type]
) -> str:
    if start is None and end is None:
        return "no set time"
    return (start.strftime("%H:%M") if start else "?") + "–" + (end.strftime("%H:%M") if end else "?")


def _find_batch_duplicate_warnings(
    nonblank_rows: List[Tuple[int, "BulkTaskRowIn"]],
) -> List[dict]:
    """Duplicates among rows inside the current submission only (Step 9).
    Groups nonblank rows by (date, Step 8 duplicate key) — date is
    prepended to the grouping key (CONFIRMED ADD-ROW DATE RULE, 2026-07-24)
    so two rows sharing a title/time on DIFFERENT dates are never treated
    as duplicates of each other, now that every row carries its own date.
    Any group with 2+ rows produces one warning naming every matching row
    number. Does not compare against existing saved Tasks — that is
    _find_existing_task_duplicate_warnings below."""
    groups: dict = {}
    for row_number, row in nonblank_rows:
        key = (row.date,) + _bulk_duplicate_key(row.title, row.start, row.end)
        if key not in groups:
            groups[key] = {
                "rows": [], "title": (row.title or "").strip(),
                "start": row.start, "end": row.end, "date": row.date,
            }
        groups[key]["rows"].append(row_number)

    warnings: List[dict] = []
    for group in groups.values():
        if len(group["rows"]) < 2:
            continue
        message = (
            _format_row_list(group["rows"]) + " match: \"" + group["title"] + "\", "
            + _format_time_range_for_message(group["start"], group["end"])
            + (", on " + group["date"].isoformat() if group["date"] else "") + "."
        )
        warnings.append({
            "source": "current_batch",
            "rows": sorted(group["rows"]),
            "title": group["title"],
            "start": group["start"].isoformat() if group["start"] else None,
            "end": group["end"].isoformat() if group["end"] else None,
            "existing_task_id": None,
            "message": message,
        })
    return warnings


def _find_existing_task_duplicate_warnings(
    db: Session,
    member_key: str,
    nonblank_rows: List[Tuple[int, "BulkTaskRowIn"]],
) -> List[dict]:
    """Duplicates against Tasks already saved for this member, scoped to
    each row's OWN date (Step 10; per-row date scoping added by the
    CONFIRMED ADD-ROW DATE RULE task, 2026-07-24 — there is no common
    batch date any more). Only active rows (deleted_at IS NULL)
    participate — a soft-deleted Task never triggers a warning. Only
    MemberScheduleEvent is queried; Leave records never participate in
    Task duplicate detection (Step 10 explicit rule). `existing_task_id`
    is carried in the structured warning for internal correlation only —
    never interpolated into the user-facing `message` (Step 10: "do not
    expose unnecessary internal IDs in visible frontend text"). Only
    called once every nonblank row already has a date (see
    _bulk_leave_conflict_errors' docstring), so row.date is never None
    here."""
    distinct_dates = sorted({row.date for _, row in nonblank_rows})
    existing_tasks = (
        db.query(MemberScheduleEvent)
        .filter(
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.event_date.in_(distinct_dates),
            MemberScheduleEvent.deleted_at.is_(None),
        )
        .all()
    )
    if not existing_tasks:
        return []

    existing_by_key: dict = {}
    for task in existing_tasks:
        key = (task.event_date,) + _bulk_duplicate_key(task.title, task.start_time, task.end_time)
        existing_by_key.setdefault(key, []).append(task)

    warnings: List[dict] = []
    for row_number, row in nonblank_rows:
        key = (row.date,) + _bulk_duplicate_key(row.title, row.start, row.end)
        matches = existing_by_key.get(key)
        if not matches:
            continue
        for task in matches:
            message = (
                "Row " + str(row_number) + " matches a task already saved for "
                + row.date.isoformat() + ": \"" + task.title + "\", "
                + _format_time_range_for_message(task.start_time, task.end_time) + "."
            )
            warnings.append({
                "source": "existing_task",
                "rows": [row_number],
                "title": task.title,
                "start": task.start_time.isoformat() if task.start_time else None,
                "end": task.end_time.isoformat() if task.end_time else None,
                "existing_task_id": str(task.id),
                "message": message,
            })
    return warnings


def _percentages(scheduled: int, total: int) -> Tuple[int, int]:
    """Whole-number percentages that always sum to 100 when total > 0.
    scheduled_percentage is computed first (Python's round() — round-half-
    to-even — is the one documented rounding method used everywhere in
    this router); unscheduled_percentage is always 100 minus that value,
    never computed independently, so the two can never sum to 99 or 101."""
    if total == 0:
        return 0, 0
    scheduled_percentage = round(scheduled / total * 100)
    unscheduled_percentage = 100 - scheduled_percentage
    return scheduled_percentage, unscheduled_percentage


def _count_percentages(
    scheduled_count: int, total_count: int
) -> Tuple[Optional[float], Optional[float]]:
    """Count-based Scheduled/Unscheduled split percentages
    (schedule-summary-count-duration-percentage, 2026-07-17), rounded to
    two decimal places. Distinct from the pre-existing whole-number
    _percentages() helper: this one returns two-decimal floats and, like
    _duration_percentages(), returns (None, None) when the denominator is
    zero rather than (0, 0) — a valid 0.00%/0.00% split is a different
    claim from 'no tasks to divide by', so None (-> N/A on the frontend)
    is returned instead of 0.0. total_count is scheduled_count +
    unscheduled_count only; no leave-deduction / adjusted-reference /
    expected-working figure is ever used as the denominator. Unscheduled
    is derived from the same raw fraction (100 - share) so the two always
    sum to exactly 100.00, mirroring _duration_percentages()."""
    if total_count == 0:
        return None, None
    scheduled_percentage = round(scheduled_count / total_count * 100, 2)
    unscheduled_percentage = round(100 - (scheduled_count / total_count * 100), 2)
    return scheduled_percentage, unscheduled_percentage


def _duration_percentages(
    scheduled_minutes: int, total_minutes: int
) -> Tuple[Optional[float], Optional[float]]:
    """Duration-based percentages (2026-07-14 duration reporting), rounded
    to two decimal places. Mirrors _percentages()'s derive-the-second-value
    approach so the two always sum to exactly 100.00 rather than risking a
    99.99/100.01 drift from two independent round() calls — at least as
    strict as the approved 'allowing only unavoidable two-decimal rounding
    effects' rule. Both are None when total_minutes == 0: a valid 0%/0%
    split is a different claim from 'no valid duration to divide by', so
    None (-> N/A on the frontend) is returned instead of 0.0."""
    if total_minutes == 0:
        return None, None
    scheduled_percentage = round(scheduled_minutes / total_minutes * 100, 2)
    unscheduled_percentage = round(100 - (scheduled_minutes / total_minutes * 100), 2)
    return scheduled_percentage, unscheduled_percentage


def _task_duration_minutes(
    start_time: Optional[time_type], end_time: Optional[time_type]
) -> Tuple[int, bool]:
    """The single backend-authoritative duration calculation (2026-07-14
    duration reporting). Returns (minutes, used).

    - Either time missing -> (0, False): included in counts, ignored for
      duration (approved rule §4).
    - end_time <= start_time -> (0, False): defensive handling for a
      legacy/unexpected row that violates the
      member_schedule_events_time_check constraint (equal times or
      end-before-start) — included in counts, ignored for duration, with
      no overnight inference (approved rules §9/§10). Under current
      write-path validation (MemberScheduleEventCreate/Update.end_after_start
      plus the DB constraint) this branch should not be reachable for rows
      created through this API; it exists only to fail safe on stray data.
    - end_time > start_time -> (whole minutes, True). Computed via
      datetime.combine on a shared arbitrary date so the two time-of-day
      values can be subtracted safely; integer minutes only (floor), never
      float hours, per the approved integer-minutes rule (§2). Overnight
      spans are excluded from this implementation (§8/§11) — there is no
      date component on start_time/end_time to infer one from, and
      end_time <= start_time is always treated as ignored, never as an
      overnight signal."""
    if start_time is None or end_time is None:
        return 0, False
    start_dt = datetime.combine(date_type.min, start_time)
    end_dt = datetime.combine(date_type.min, end_time)
    if end_dt <= start_dt:
        return 0, False
    minutes = int((end_dt - start_dt).total_seconds() // 60)
    return minutes, True


def _aggregate_schedule_period(
    db: Session, member_key: str, date_from: date_type, date_to: date_type
) -> dict:
    """Single query per period/member — pulls category/start_time/end_time
    for every active, in-range row and derives every count, duration,
    used/ignored, and duration-percentage field from that one result set.
    _task_duration_minutes is the only place that decides 'used' vs.
    'ignored', so duration_used + duration_ignored is guaranteed to equal
    the category count by construction. Grouping uses only the stored
    category column — neither classify_new_task nor classify_updated_task
    is ever called here, and no row's category is recalculated or
    modified by this read path."""
    rows = (
        db.query(
            MemberScheduleEvent.category,
            MemberScheduleEvent.start_time,
            MemberScheduleEvent.end_time,
        )
        .filter(
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.deleted_at.is_(None),
            MemberScheduleEvent.event_date >= date_from,
            MemberScheduleEvent.event_date <= date_to,
        )
        .all()
    )

    scheduled_count = unscheduled_count = 0
    scheduled_duration = unscheduled_duration = 0
    scheduled_used = unscheduled_used = 0
    scheduled_ignored = unscheduled_ignored = 0

    for category, start_time, end_time in rows:
        is_scheduled = category == "Scheduled Task"
        if is_scheduled:
            scheduled_count += 1
        else:
            unscheduled_count += 1

        minutes, used = _task_duration_minutes(start_time, end_time)
        if used:
            if is_scheduled:
                scheduled_duration += minutes
                scheduled_used += 1
            else:
                unscheduled_duration += minutes
                unscheduled_used += 1
        elif is_scheduled:
            scheduled_ignored += 1
        else:
            unscheduled_ignored += 1

    total_count = scheduled_count + unscheduled_count
    scheduled_pct, unscheduled_pct = _percentages(scheduled_count, total_count)
    scheduled_count_pct, unscheduled_count_pct = _count_percentages(
        scheduled_count, total_count
    )

    total_duration = scheduled_duration + unscheduled_duration
    scheduled_duration_pct, unscheduled_duration_pct = _duration_percentages(
        scheduled_duration, total_duration
    )

    return {
        "scheduled_count": scheduled_count,
        "unscheduled_count": unscheduled_count,
        "total_count": total_count,
        "scheduled_percentage": scheduled_pct,
        "unscheduled_percentage": unscheduled_pct,
        "scheduled_count_percentage": scheduled_count_pct,
        "unscheduled_count_percentage": unscheduled_count_pct,
        "scheduled_duration_minutes": scheduled_duration,
        "unscheduled_duration_minutes": unscheduled_duration,
        "total_duration_minutes": total_duration,
        "scheduled_duration_used_task_count": scheduled_used,
        "unscheduled_duration_used_task_count": unscheduled_used,
        "total_duration_used_task_count": scheduled_used + unscheduled_used,
        "scheduled_duration_ignored_task_count": scheduled_ignored,
        "unscheduled_duration_ignored_task_count": unscheduled_ignored,
        "total_duration_ignored_task_count": scheduled_ignored + unscheduled_ignored,
        "scheduled_duration_percentage": scheduled_duration_pct,
        "unscheduled_duration_percentage": unscheduled_duration_pct,
    }


def _duration_change(
    current_minutes: int, previous_minutes: int
) -> Tuple[Optional[float], str]:
    """Shared previous-vs-current comparison for one category's duration
    (approved rules §27-§30). Rounded to two decimal places in the backend
    — never computed in JavaScript. Returns (percentage, direction);
    direction is one of increase/decrease/unchanged/not_applicable.
    percentage is None exactly when direction is 'not_applicable' (both
    periods are zero-duration — nothing to compute a ratio from, and no
    approved rule assigns a numeric value to that case)."""
    if previous_minutes == current_minutes:
        if previous_minutes == 0:
            return None, "not_applicable"
        return 0.0, "unchanged"
    if previous_minutes == 0:
        return 100.0, "increase"
    if current_minutes == 0:
        return 100.0, "decrease"
    percentage = round(
        abs(current_minutes - previous_minutes) / previous_minutes * 100, 2
    )
    direction = "increase" if current_minutes > previous_minutes else "decrease"
    return percentage, direction


def _monday_of_week(any_date: date_type) -> date_type:
    """Monday-Sunday week convention (2026-07-14 — replaces the earlier
    Sunday-start convention). date.weekday() returns 0 for Monday, 6 for
    Sunday, so subtracting that many days always lands on the Monday of
    the week containing any_date, regardless of which day of the week is
    supplied."""
    return any_date - timedelta(days=any_date.weekday())


def _month_boundaries(year: int, month: int) -> Tuple[date_type, date_type]:
    """First and last calendar day of (year, month).
    calendar.monthrange handles 30/31-day months and leap-year February
    automatically."""
    last_day = calendar.monthrange(year, month)[1]
    return date_type(year, month, 1), date_type(year, month, last_day)


def _previous_month(year: int, month: int) -> Tuple[int, int]:
    """January (month=1) rolls back to December of the previous year;
    every other month simply decrements. No day-of-month alignment is
    performed — the previous period is always the entire previous
    calendar month (approved rule §25)."""
    if month == 1:
        return year - 1, 12
    return year, month - 1


def _build_duration_comparison(current: dict, previous: dict) -> dict:
    """Shared assembly of the previous-period totals + comparison fields
    common to all three (daily/weekly/monthly) report responses."""
    scheduled_pct, scheduled_direction = _duration_change(
        current["scheduled_duration_minutes"], previous["scheduled_duration_minutes"]
    )
    unscheduled_pct, unscheduled_direction = _duration_change(
        current["unscheduled_duration_minutes"], previous["unscheduled_duration_minutes"]
    )
    return {
        "previous_scheduled_duration_minutes": previous["scheduled_duration_minutes"],
        "previous_unscheduled_duration_minutes": previous["unscheduled_duration_minutes"],
        "previous_total_duration_minutes": previous["total_duration_minutes"],
        "scheduled_duration_change": DurationChangeOut(
            percentage=scheduled_pct, direction=scheduled_direction
        ),
        "unscheduled_duration_change": DurationChangeOut(
            percentage=unscheduled_pct, direction=unscheduled_direction
        ),
    }


def _leave_report_additions(
    db: Session, member_key: str, date_from: date_type, date_to: date_type, scheduled_duration_minutes: int
) -> dict:
    """Additive leave-coordination-copy fields (REQ-LEAVE-COPY-001), layered
    on top of the existing Scheduled/Unscheduled counts/durations/
    percentages without altering any of them. base_leave_deduction_reference_minutes
    is a weekday-count reference figure built from the confirmed Full-Day
    leave-deduction constant — this system has no attendance/working-hours
    model and none is invented here; these are leave-deduction minutes /
    leave-system credited minutes, never a claim of verified actual
    productive working time or official attendance.

    active_leave_minutes (2026-07-16 simplification amendment — renamed
    from approved_leave_minutes) sums every leave row where
    deleted_at IS NULL; there is no Pending/Approved workflow to
    distinguish."""
    weekday_count = len(leave_logic.expand_weekdays(date_from, date_to))
    base_reference_minutes = weekday_count * LEAVE_FULL_DAY_DEDUCTION_MINUTES

    active_leave_minutes = leave_logic.compute_active_leave_minutes_for_period(
        db, member_key, date_from, date_to
    )

    adjusted_expected_work_minutes = max(base_reference_minutes - active_leave_minutes, 0)

    task_coverage_percentage = None
    if adjusted_expected_work_minutes > 0:
        task_coverage_percentage = round(
            scheduled_duration_minutes / adjusted_expected_work_minutes * 100, 2
        )

    return {
        "base_leave_deduction_reference_minutes": base_reference_minutes,
        "active_leave_minutes": active_leave_minutes,
        "adjusted_expected_work_minutes": adjusted_expected_work_minutes,
        "task_coverage_percentage": task_coverage_percentage,
    }


@router.get("/{member_key}", response_model=List[MemberScheduleEventOut])
def list_member_schedule_events(
    member_key: str,
    start_date: Optional[date_type] = Query(default=None),
    end_date: Optional[date_type] = Query(default=None),
    db: Session = Depends(get_db),
):
    _validate_member_key(member_key)

    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="start_date must not be after end_date.",
        )

    query = db.query(MemberScheduleEvent).filter(
        MemberScheduleEvent.member_key == member_key,
        MemberScheduleEvent.deleted_at.is_(None),
    )

    if start_date is not None:
        query = query.filter(MemberScheduleEvent.event_date >= start_date)
    if end_date is not None:
        query = query.filter(MemberScheduleEvent.event_date <= end_date)

    query = query.order_by(
        asc(MemberScheduleEvent.event_date),
        nullslast(asc(MemberScheduleEvent.start_time)),
        asc(MemberScheduleEvent.created_at),
    )

    return query.all()


@router.get("/{member_key}/reports/daily", response_model=DailyScheduleReportOut)
def get_daily_schedule_report(
    member_key: str,
    date: date_type = Query(...),
    db: Session = Depends(get_db),
):
    """Current period: the selected date. Previous period: the immediately
    preceding calendar date (approved rule §20)."""
    _validate_member_key(member_key)

    current = _aggregate_schedule_period(db, member_key, date, date)

    previous_date = date - timedelta(days=1)
    previous = _aggregate_schedule_period(db, member_key, previous_date, previous_date)

    comparison = _build_duration_comparison(current, previous)
    leave_additions = _leave_report_additions(
        db, member_key, date, date, current["scheduled_duration_minutes"]
    )

    return DailyScheduleReportOut(
        member_key=member_key,
        date=date,
        previous_period_start=previous_date,
        previous_period_end=previous_date,
        **current,
        **comparison,
        **leave_additions,
    )


@router.get("/{member_key}/reports/weekly", response_model=WeeklyScheduleReportOut)
def get_weekly_schedule_report(
    member_key: str,
    week_start: date_type = Query(...),
    db: Session = Depends(get_db),
):
    """Monday-Sunday week convention (2026-07-14 — replaces the earlier
    Sunday-start convention; approved rules §21-§23). Any week_start value
    supplied by the caller is normalized to the Monday of the week that
    contains it, rather than rejected — the response's own
    week_start/week_end fields always reflect the actual Monday-Sunday
    boundaries used, so a caller passing a non-Monday date sees exactly
    which week was reported on rather than having the normalization happen
    silently. Current period: Monday-Sunday inclusive. Previous period: the
    immediately preceding Monday-Sunday week (approved rule §21)."""
    _validate_member_key(member_key)

    monday = _monday_of_week(week_start)
    sunday = monday + timedelta(days=6)

    current = _aggregate_schedule_period(db, member_key, monday, sunday)

    previous_monday = monday - timedelta(days=7)
    previous_sunday = previous_monday + timedelta(days=6)
    previous = _aggregate_schedule_period(
        db, member_key, previous_monday, previous_sunday
    )

    comparison = _build_duration_comparison(current, previous)
    leave_additions = _leave_report_additions(
        db, member_key, monday, sunday, current["scheduled_duration_minutes"]
    )

    return WeeklyScheduleReportOut(
        member_key=member_key,
        week_start=monday,
        week_end=sunday,
        previous_period_start=previous_monday,
        previous_period_end=previous_sunday,
        **current,
        **comparison,
        **leave_additions,
    )


@router.get("/{member_key}/reports/weekly/export")
def export_weekly_schedule(
    member_key: str,
    week_start: date_type = Query(...),
    db: Session = Depends(get_db),
):
    """Weekly Schedule .xlsx export (member-weekly-schedule-xlsx-export,
    2026-07-24) — a point-in-time download only; this endpoint issues
    read-only SELECT queries and never calls db.add/db.commit. Row shaping,
    sorting, and workbook formatting live in backend/xlsx_export.py; this
    handler only queries the two source tables, reuses the existing
    _aggregate_schedule_period() for Weekly Summary's task counts/
    durations (never recomputed independently), and decides the empty-week
    short-circuit.

    Monday-Sunday convention matches get_weekly_schedule_report above
    (any week_start is normalized via _monday_of_week — the caller's own
    week_start/week_end are echoed back in the empty-week JSON body so a
    caller passing a non-Monday date sees exactly which week was used).

    Response shape is one of two things, distinguished by the frontend on
    Content-Type (never on status code, since both are 200):
    - Both Tasks and Leave are empty for the week: a small JSON body
      {"empty": true, member_key, week_start, week_end} — no workbook is
      built, matching the approved "no file, one toast" empty-week rule.
    - Otherwise: the generated .xlsx as
      application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
      with a Content-Disposition attachment filename built by
      xlsx_export.build_export_filename — the same function the frontend
      independently re-derives its own download filename from, so the two
      can never disagree."""
    _validate_member_key(member_key)

    monday = _monday_of_week(week_start)
    sunday = monday + timedelta(days=6)

    tasks = (
        db.query(MemberScheduleEvent)
        .filter(
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.deleted_at.is_(None),
            MemberScheduleEvent.event_date >= monday,
            MemberScheduleEvent.event_date <= sunday,
        )
        .all()
    )
    leave_records = (
        db.query(MemberLeaveRecord)
        .filter(
            MemberLeaveRecord.member_key == member_key,
            MemberLeaveRecord.deleted_at.is_(None),
            MemberLeaveRecord.start_date <= sunday,
            MemberLeaveRecord.end_date >= monday,
        )
        .all()
    )

    if not tasks and not leave_records:
        return JSONResponse(status_code=200, content={
            "empty": True,
            "member_key": member_key,
            "week_start": monday.isoformat(),
            "week_end": sunday.isoformat(),
        })

    aggregate = _aggregate_schedule_period(db, member_key, monday, sunday)

    workbook_bytes = xlsx_export.build_weekly_schedule_workbook(
        member_key=member_key,
        member_label=MEMBER_LABELS[member_key],
        week_start=monday,
        week_end=sunday,
        tasks=tasks,
        leave_records=leave_records,
        aggregate=aggregate,
        leave_count=len(leave_records),
        generated_at_utc=datetime.now(timezone.utc),
    )

    filename = xlsx_export.build_export_filename(member_key, monday, sunday)

    return Response(
        content=workbook_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=" + filename},
    )


@router.get("/{member_key}/reports/monthly", response_model=MonthlyScheduleReportOut)
def get_monthly_schedule_report(
    member_key: str,
    month: str = Query(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    db: Session = Depends(get_db),
):
    """Strict YYYY-MM input (01-12 only) — a value that doesn't match the
    pattern is rejected by FastAPI/Pydantic with HTTP 422 before this
    function body runs. Current period: the full selected calendar month;
    for an in-progress month, tasks simply don't exist yet for future
    dates, so no truncation logic is needed. Previous period: the entire
    previous calendar month, never aligned to the same day-of-month
    (approved rules §24-§26), with January correctly rolling back to
    December of the prior year and leap-year February handled by
    calendar.monthrange."""
    _validate_member_key(member_key)

    year_str, month_str = month.split("-")
    year, month_number = int(year_str), int(month_str)

    month_start, month_end = _month_boundaries(year, month_number)
    current = _aggregate_schedule_period(db, member_key, month_start, month_end)

    previous_year, previous_month_number = _previous_month(year, month_number)
    previous_start, previous_end = _month_boundaries(
        previous_year, previous_month_number
    )
    previous = _aggregate_schedule_period(db, member_key, previous_start, previous_end)

    comparison = _build_duration_comparison(current, previous)
    leave_additions = _leave_report_additions(
        db, member_key, month_start, month_end, current["scheduled_duration_minutes"]
    )

    return MonthlyScheduleReportOut(
        member_key=member_key,
        month=month,
        month_start=month_start,
        month_end=month_end,
        previous_period_start=previous_start,
        previous_period_end=previous_end,
        **current,
        **comparison,
        **leave_additions,
    )


@router.post("/{member_key}", response_model=MemberScheduleEventOut, status_code=201)
def create_member_schedule_event(
    member_key: str,
    payload: MemberScheduleEventCreate,
    db: Session = Depends(get_db),
):
    """Single Task creation. Additive as of 2026-07-27 (MULTIPLE TIME FRAMES
    PER TASK, see the helper section above): payload.time_frames, when
    nonempty, replaces the single payload.start/payload.end pair with
    several candidate frames — each accepted frame becomes its own separate
    MemberScheduleEvent row sharing this same date/title/priority/notes. An
    old caller that never sends time_frames gets byte-for-byte the same
    single-event behavior and the same MemberScheduleEventOut response as
    before (the `if len(frames) == 1` branch below returns the bare ORM
    object exactly as this endpoint always has). A multi-frame request
    returns the same {"status","created_count","items"} shape Bulk Tasks
    already uses (built by hand here since response_model stays
    MemberScheduleEventOut for the single-event case — returning a
    JSONResponse directly, as every other non-2xx branch in this endpoint
    already does, bypasses response_model for this one branch only)."""
    _validate_member_key(member_key)

    frames, resolve_error = resolve_submitted_time_frames(
        payload.start, payload.end, payload.time_frames
    )
    if resolve_error is not None:
        return JSONResponse(
            status_code=422, content=time_frame_error_response_body(resolve_error)
        )

    # APPROVED OCCURRENCE LIMIT (2026-07-27) — expanded_count for Single
    # Task create is simply the number of resolved frames (each becomes
    # its own Task record). Checked via the ONE shared validator before
    # shape validation — a submission that is simply too large is rejected
    # on its own terms, independent of whether its frames also happen to
    # be individually valid.
    occurrence_limit_error = check_occurrence_limit(len(frames), for_bulk=False)
    if occurrence_limit_error is not None:
        return JSONResponse(status_code=422, content=occurrence_limit_error)

    shape_outcome, shape_a, shape_b = classify_time_frame_set(frames)
    if shape_outcome != "ok":
        return JSONResponse(
            status_code=422,
            content=time_frame_set_error_response_body(
                shape_outcome, shape_a, shape_b, frame_count=len(frames)
            ),
        )

    # One instant used for both classification and storage, generated once
    # at the start of the request — never trust browser time, never derive
    # classification from a separately-generated updated_at/DB now().
    created_at = datetime.now(timezone.utc)

    # payload.category (if the client sent one) is accepted only for
    # backward compatibility and is never read here — non-authoritative,
    # cannot bypass classification (see MemberScheduleEventCreate docstring).
    category = classify_new_task(event_date=payload.date, created_at=created_at)

    same_date_occurrences = _active_same_date_occurrences(db, member_key, payload.date)

    # FINAL AUTHORITATIVE SAME-TASK MULTIPLE-TIME-PERIOD RULE (2026-07-27) —
    # checked once per frame, before the Leave-conflict check below; the
    # FIRST hard conflict found rejects the WHOLE submission — zero records
    # created, exactly like every other hard-block path here (Phase 7:
    # never create frame 1 while rejecting frame 2).
    for index, (start, end) in enumerate(frames, start=1):
        same_task_classification, _same_task_conflict = classify_same_task_conflict(
            payload.date, payload.title, start, end, same_date_occurrences,
        )
        if same_task_classification != SAME_TASK_CONFLICT_NONE:
            frame_index = index if len(frames) > 1 else None
            return JSONResponse(
                status_code=409,
                content=same_task_conflict_response_body(
                    same_task_classification, time_frame_index=frame_index
                ),
            )

    for index, (start, end) in enumerate(frames, start=1):
        conflicts = leave_logic.find_conflicting_active_leave(
            db, member_key, payload.date, start, end
        )
        if conflicts:
            frame_index = index if len(frames) > 1 else None
            return JSONResponse(
                status_code=409,
                content=leave_logic.leave_conflict_response_body(conflicts, time_frame_index=frame_index),
            )

    # LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION (2026-07-27)
    # — ADVISORY, checked only after every hard block above has already
    # passed for every frame (a doomed request never reaches here). One
    # candidate_state per frame, combined into ONE confirmation response
    # covering the whole submission (never one popup per frame) — row_index
    # is None when there is only one frame (identical fingerprint shape to
    # the pre-existing single-frame behavior), and each frame's own
    # 1-indexed position once there are several, mirroring how Bulk already
    # numbers its rows.
    all_warnings: List[dict] = []
    candidate_states: List[dict] = []
    for index, (start, end) in enumerate(frames, start=1):
        row_index = index if len(frames) > 1 else None
        frame_warnings, state = build_schedule_confirmation(
            payload.date, payload.title, start, end, same_date_occurrences,
            row_index=row_index,
        )
        all_warnings.extend(frame_warnings)
        candidate_states.append(state)

    if all_warnings:
        fingerprint = schedule_confirmation_fingerprint(candidate_states)
        if payload.confirmation_fingerprint != fingerprint:
            return JSONResponse(
                status_code=409,
                content=schedule_confirmation_response_body(all_warnings, candidate_states),
            )

    # ── Atomic multi-insert (Phase 7) ────────────────────────────────────
    # Every frame shares one member/date/title/priority/notes/category —
    # only start_time/end_time differ per row, exactly the "shared fields
    # copied correctly, independent event ID per occurrence" contract.
    events = [
        MemberScheduleEvent(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            event_date=payload.date,
            title=payload.title,
            category=category,
            priority=payload.priority,
            start_time=start,
            end_time=end,
            notes=payload.notes,
            source_scope=DEFAULT_SOURCE_SCOPE,
            is_official_truth=False,
            created_at=created_at,
            updated_at=created_at,
        )
        for start, end in frames
    ]

    try:
        for event in events:
            db.add(event)
        db.flush()
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Task could not be created due to a server error. Please try again.",
        )

    for event in events:
        db.refresh(event)

    if len(events) == 1:
        return events[0]

    items = [
        MemberScheduleEventOut.model_validate(event).model_dump(mode="json")
        for event in events
    ]
    return JSONResponse(
        status_code=201,
        content={"status": "created", "created_count": len(events), "items": items},
    )


@router.post("/{member_key}/bulk", response_model=BulkTaskCreateSuccessOut, status_code=201)
def create_member_schedule_events_bulk(
    member_key: str,
    payload: BulkTaskCreateRequest,
    db: Session = Depends(get_db),
):
    """Bulk Tasks (2026-07-23; per-row Date field — CONFIRMED ADD-ROW DATE
    RULE task, 2026-07-24) — additive endpoint; the single-create route
    above (POST /{member_key}) is completely unchanged. Each row in
    payload.tasks carries its own `date` — a batch is no longer required
    to be same-day.

    Every call to this endpoint independently revalidates everything from
    scratch — hard field rules, the authoritative Leave-conflict check,
    and every duplicate/advisory check — against current database state.
    Nothing from an earlier response (e.g. a prior
    duplicate_confirmation_required or schedule_confirmation_required
    reply) is ever trusted as still true; confirm_duplicates=True and a
    matching confirmation_fingerprint each only skip their own "stop and
    ask" step, neither skips re-validation.

    Four possible outcomes, matching the approved contract exactly:
    - validation_failed (422): zero rows inserted, one error per problem.
    - duplicate_confirmation_required (409): zero rows inserted, one
      warning per current-batch or existing-Task exact title/time
      duplicate match (pre-existing soft-duplicate system, unmodified).
    - schedule_confirmation_required (409, additive 2026-07-27): zero rows
      inserted, one warning per row with a lunch-break and/or
      different-title time-overlap ADVISORY — see
      detect_schedule_advisories/_bulk_schedule_advisories above. A batch
      may require both this and the duplicate confirmation above, one at a
      time, each independently confirmed and revalidated.
    - created (201, response_model=BulkTaskCreateSuccessOut): every
      nonblank row inserted in one all-or-nothing transaction, sharing one
      authoritative created_at/updated_at/category.
    """
    _validate_member_key(member_key)

    nonblank_rows = [
        (index + 1, row) for index, row in enumerate(payload.tasks)
        if not _is_blank_bulk_row(row)
    ]

    if not nonblank_rows:
        return JSONResponse(status_code=422, content={
            "status": "validation_failed",
            "created_count": 0,
            "errors": [{
                "row": None, "field": "tasks", "code": "no_tasks_submitted",
                "message": "Add at least one task before submitting.",
            }],
        })

    if len(nonblank_rows) > MAX_BULK_TASK_ROWS:
        return JSONResponse(status_code=422, content={
            "status": "validation_failed",
            "created_count": 0,
            "errors": [{
                "row": None, "field": "tasks", "code": "too_many_rows",
                "message": (
                    "A maximum of " + str(MAX_BULK_TASK_ROWS)
                    + " tasks can be created in one submission."
                ),
            }],
        })

    # Hard field validation first (Step 6), collected across every
    # nonblank row — never stops at the first invalid row.
    errors: List[dict] = []
    for row_number, row in nonblank_rows:
        for field_error in _bulk_row_field_errors(row):
            errors.append({"row": row_number, **field_error})

    # MULTIPLE TIME FRAMES PER TASK (2026-07-27) — shape/internal-overlap
    # validation of every row's time frame(s), gated the same way the
    # plain-field errors above already are: only attempted once every row's
    # title/notes/priority/date already pass, and any failure here likewise
    # blocks the same-task/leave checks below for the WHOLE batch (same
    # "collect across every row, then stop" convention _bulk_row_field_
    # errors already established) until fixed. `expanded` is the row list
    # every downstream helper below now consumes instead of nonblank_rows —
    # see _expand_bulk_rows_into_frames' docstring for why none of those
    # helpers themselves need to change.
    expanded: List[Tuple[int, int, int, "BulkTaskRowIn"]] = []
    if not errors:
        shape_errors, expanded = _expand_bulk_rows_into_frames(nonblank_rows)
        errors.extend(shape_errors)

    expanded_rows: List[Tuple[int, "BulkTaskRowIn"]] = [
        (row_number, frame_row) for row_number, _fn, _fc, frame_row in expanded
    ]

    # APPROVED OCCURRENCE LIMIT (2026-07-27 owner approval) — a Bulk batch
    # may now expand to more individual Task records than it has logical
    # rows; the whole submission's expanded_count (sum of every row's own
    # resolved frame count) is checked against the single shared
    # check_occurrence_limit() validator defined above — the SAME function
    # Single Task create and Task edit call with their own expanded_count,
    # so this limit is never independently counted in more than one place.
    # This is a DIFFERENT concern from the pre-existing MAX_BULK_TASK_ROWS
    # row-count cap enforced earlier in this function (that one limits how
    # many logical Bulk rows may be submitted at all, regardless of time
    # frames, and is unaffected by this task).
    if not errors:
        occurrence_limit_error = check_occurrence_limit(len(expanded_rows), for_bulk=True)
        if occurrence_limit_error is not None:
            errors.append({
                "row": None, "field": "tasks",
                "code": occurrence_limit_error["error"],
                "message": occurrence_limit_error["message"],
            })

    # FINAL CONFIRMED TIMED-VERSUS-UNTIMED RULE (2026-07-27) and the
    # authoritative Leave re-check (Step 7) only run once field-level and
    # time-frame-shape rules already pass for every row — no point flagging
    # either kind of conflict on a row whose title/time is itself invalid.
    # Within-batch and against-existing-Tasks time conflicts are
    # independent checks (Tests C/D/E); both always run so every offending
    # row is reported at once, matching the existing "collect across every
    # row" convention (never stop at the first invalid row).
    if not errors:
        # FRAME-LEVEL ERROR CONTEXT (2026-07-27): these three checks take
        # the full `expanded` list (row_number, frame_number, frame_count,
        # frame_row), not the stripped expanded_rows pairs — see each
        # function's own docstring for why.
        errors.extend(_bulk_within_batch_time_conflicts(expanded))
        errors.extend(
            _bulk_existing_task_time_conflict_errors(db, member_key, expanded)
        )
        errors.extend(
            _bulk_leave_conflict_errors(db, member_key, expanded)
        )

    if errors:
        return JSONResponse(status_code=422, content={
            "status": "validation_failed",
            "created_count": 0,
            "errors": _dedupe_and_sort_bulk_errors(errors),
        })

    # Duplicate detection (Step 8/9/10) — warnings, not hard errors. Both
    # sources are always computed (even when confirm_duplicates=True) so
    # the check is never skipped, only the "stop and ask" short-circuit is.
    # expanded_rows keeps every frame keyed by its own Task row number (see
    # _expand_bulk_rows_into_frames), so the "Row N" wording these two
    # functions already build into their own messages stays correct even
    # for a multi-frame row.
    warnings: List[dict] = _find_batch_duplicate_warnings(expanded_rows)
    warnings.extend(
        _find_existing_task_duplicate_warnings(db, member_key, expanded_rows)
    )

    if warnings and not payload.confirm_duplicates:
        return JSONResponse(status_code=409, content={
            "status": "duplicate_confirmation_required",
            "created_count": 0,
            "warnings": warnings,
        })

    # LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION (2026-07-27)
    # — ADVISORY, checked once every hard error AND the pre-existing exact
    # title/time soft-duplicate warning above have already been cleared (a
    # doomed or already-pending-confirmation batch never reaches here).
    # Independent bypass token from confirm_duplicates above — a batch can
    # require both confirmations in sequence, one at a time, each fully
    # revalidated. Zero writes on this path; the whole batch remains
    # atomic — either every accepted frame is created, or none is.
    schedule_warnings, candidate_states = _bulk_schedule_advisories(db, member_key, expanded)
    if schedule_warnings:
        fingerprint = schedule_confirmation_fingerprint(candidate_states)
        if payload.confirmation_fingerprint != fingerprint:
            return JSONResponse(
                status_code=409,
                content=schedule_confirmation_response_body(schedule_warnings, candidate_states),
            )

    # ── Atomic transaction (Step 12/13) ──────────────────────────────────
    # One authoritative UTC instant shared by every frame's created_at and
    # updated_at — this is what prevents rows created in the same batch
    # from ever disagreeing on "when this batch happened". category,
    # however, is computed PER FRAME (CONFIRMED ADD-ROW DATE RULE,
    # 2026-07-24, extended to per-frame by MULTIPLE TIME FRAMES PER TASK)
    # since it depends on (event_date, created_at) and rows no longer
    # necessarily share one event_date — two frames in the same batch can
    # therefore land in different Scheduled/Unscheduled categories if their
    # own dates fall on opposite sides of that date's own weekly cutoff,
    # which is correct: classification has always been a per-event_date
    # decision, never a per-batch or per-row one. Every frame belonging to
    # one Task row shares that row's own date, so in practice every sibling
    # frame of one row always lands in the same category as its siblings.
    created_at = datetime.now(timezone.utc)

    events = [
        MemberScheduleEvent(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            event_date=frame_row.date,
            title=(frame_row.title or "").strip(),
            category=classify_new_task(event_date=frame_row.date, created_at=created_at),
            priority=_bulk_row_effective_priority(frame_row),
            start_time=frame_row.start,
            end_time=frame_row.end,
            notes=((frame_row.notes or "").strip() or None),
            source_scope=DEFAULT_SOURCE_SCOPE,
            is_official_truth=False,
            created_at=created_at,
            updated_at=created_at,
        )
        for _row_number, frame_row in expanded_rows
    ]

    try:
        for event in events:
            db.add(event)
        db.flush()
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Tasks could not be created due to a server error. Please try again.",
        )

    for event in events:
        db.refresh(event)

    # Plain dict, not BulkTaskCreateSuccessOut(...) — matches the existing
    # single-create route's convention of returning raw ORM objects and
    # letting FastAPI's response_model do the MemberScheduleEventOut
    # conversion only at the HTTP layer. Constructing the pydantic model
    # eagerly here would force-validate every event's `id` before this
    # function returns; id is only guaranteed populated after a REAL
    # SQLAlchemy flush/refresh against a live connection, not by this
    # function's own logic, so eager construction is the wrong layer for
    # that validation to happen at.
    return {"status": "created", "created_count": len(events), "items": events}


@router.put("/{member_key}/{event_id}", response_model=MemberScheduleEventOut)
def update_member_schedule_event(
    member_key: str,
    event_id: UUID,
    payload: MemberScheduleEventUpdate,
    db: Session = Depends(get_db),
):
    _validate_member_key(member_key)
    event = _get_active_event_or_404(db, member_key, event_id)

    update_data = payload.model_dump(exclude_unset=True)

    # payload.category (if the client sent one, e.g. for backward
    # compatibility) is never read here — non-authoritative, cannot bypass
    # classification. The stored category is only ever set below, from
    # classify_updated_task().
    update_data.pop("category", None)

    # FINAL BUSINESS RULES (2026-07-24) — Rule 8: once an outcome is
    # recorded, the task's event_date can never change again. Drag and
    # resize funnel through this same handler (see the module docstring),
    # so this one check also blocks a cross-day drag — a same-day resize
    # (start/end time only) is unaffected since it never sends a changed
    # `date`. Title/notes/priority/start/end-time editing remain allowed
    # even with a recorded outcome (explicit carve-out from Rule 8) — only
    # an actual date change is blocked, checked before the leave-conflict
    # check below so a doomed request never runs that query for nothing.
    if (
        event.outcome is not None
        and "date" in update_data
        and update_data["date"] != event.event_date
    ):
        return JSONResponse(
            status_code=409,
            content={
                "error": "outcome_recorded_immutable",
                "message": (
                    "This task's date can't be changed — an outcome has "
                    "already been recorded for it."
                ),
            },
        )

    effective_date = update_data.get("date", event.event_date)
    effective_title = update_data.get("title", event.title)
    effective_start = update_data.get("start", event.start_time)
    effective_end = update_data.get("end", event.end_time)
    effective_priority = update_data.get("priority", event.priority)
    effective_notes = update_data.get("notes", event.notes)

    # MULTIPLE TIME FRAMES PER TASK, Task Edit surface (2026-07-27) — the
    # occurrence being edited (event_id) is always "Time frame 1"; any
    # payload.additional_time_frames entries are candidate NEW occurrences
    # 2..N, sharing this same resulting date/title/priority/notes.
    # classify_time_frame_set's frame numbering therefore lines up exactly
    # with what the user sees on the Edit form ("Time frame 1" = the
    # occurrence they opened, "Time frame 2" = the first added row, ...).
    # Absent/empty additional_time_frames reduces this to the single
    # pre-existing frame — same shape validation (PHASE 4's start-without-
    # end / end-without-start rule) now applies there too, universally,
    # not only when a frame is added.
    additional_frames = [
        (frame.start_time, frame.end_time) for frame in (payload.additional_time_frames or [])
    ]
    frames = [(effective_start, effective_end)] + additional_frames

    # APPROVED OCCURRENCE LIMIT (2026-07-27) — expanded_count for Task edit
    # is the selected occurrence (always counted, even though it is an
    # update, not an insert) plus every additional time frame. Checked via
    # the ONE shared validator, before shape validation, exactly like
    # Single Task create above — updates nothing and inserts nothing on
    # rejection.
    occurrence_limit_error = check_occurrence_limit(len(frames), for_bulk=False)
    if occurrence_limit_error is not None:
        return JSONResponse(status_code=422, content=occurrence_limit_error)

    shape_outcome, shape_a, shape_b = classify_time_frame_set(frames)
    if shape_outcome != "ok":
        return JSONResponse(
            status_code=422,
            content=time_frame_set_error_response_body(
                shape_outcome, shape_a, shape_b, frame_count=len(frames)
            ),
        )

    # FINAL AUTHORITATIVE SAME-TASK MULTIPLE-TIME-PERIOD RULE (2026-07-27) —
    # evaluated once per frame against the resulting (post-edit) date/
    # title, excluding this task's own row from comparison for EVERY frame
    # (STEP 8 / required behavior #4) — additional frames have no event id
    # of their own yet, so the only row that could ever falsely conflict
    # with any of them is the one being edited itself, already excluded via
    # exclude_key=event.id. Frames are already known mutually
    # non-conflicting (classify_time_frame_set above), so this only checks
    # each frame against OTHER active occurrences. The FIRST hard conflict
    # found rejects the WHOLE request — nothing updated, nothing inserted
    # (Phase 13: never partially apply an edit-with-added-frames).
    effective_date_occurrences = _active_same_date_occurrences(db, member_key, effective_date)
    for index, (start, end) in enumerate(frames, start=1):
        same_task_classification, _same_task_conflict = classify_same_task_conflict(
            effective_date, effective_title, start, end,
            effective_date_occurrences, exclude_key=event.id,
        )
        if same_task_classification != SAME_TASK_CONFLICT_NONE:
            frame_index = index if len(frames) > 1 else None
            return JSONResponse(
                status_code=409,
                content=same_task_conflict_response_body(
                    same_task_classification, time_frame_index=frame_index
                ),
            )

    # Task/Leave hard block (PHASE 16) — one conflicting frame rolls back
    # the whole edit, including the selected occurrence's own update; no
    # Continue-anyway bypass exists for this check, same as every other
    # write path in this module.
    for index, (start, end) in enumerate(frames, start=1):
        conflicts = leave_logic.find_conflicting_active_leave(
            db, member_key, effective_date, start, end
        )
        if conflicts:
            frame_index = index if len(frames) > 1 else None
            return JSONResponse(
                status_code=409,
                content=leave_logic.leave_conflict_response_body(conflicts, time_frame_index=frame_index),
            )

    # LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION (2026-07-27)
    # — ADVISORY, evaluated once per frame against the resulting (post-edit)
    # date/title, excluding this task's own row (exclude_key=event.id, same
    # self-exclusion the same-title classifier above applies). Reuses
    # effective_date_occurrences (no second query). row_index stays None
    # when there is only the one (possibly edited) frame — byte-for-byte
    # the same single-candidate fingerprint shape as before this feature —
    # and becomes each frame's own 1-indexed position (1 = the edited
    # occurrence) once additional frames exist, combined into ONE
    # confirmation response covering the whole edit (never one popup per
    # frame).
    all_warnings: List[dict] = []
    candidate_states: List[dict] = []
    for index, (start, end) in enumerate(frames, start=1):
        row_index = index if len(frames) > 1 else None
        frame_warnings, state = build_schedule_confirmation(
            effective_date, effective_title, start, end,
            effective_date_occurrences, exclude_key=event.id, row_index=row_index,
        )
        all_warnings.extend(frame_warnings)
        candidate_states.append(state)

    if all_warnings:
        fingerprint = schedule_confirmation_fingerprint(candidate_states)
        if payload.confirmation_fingerprint != fingerprint:
            return JSONResponse(
                status_code=409,
                content=schedule_confirmation_response_body(all_warnings, candidate_states),
            )

    if "date" in update_data:
        event.event_date = update_data["date"]
    if "title" in update_data:
        event.title = update_data["title"]
    if "priority" in update_data:
        event.priority = update_data["priority"]
    if "start" in update_data:
        event.start_time = update_data["start"]
    if "end" in update_data:
        event.end_time = update_data["end"]
    if "notes" in update_data:
        event.notes = update_data["notes"]

    # Authoritative server-side update timestamp, generated once and used
    # for both storage and reclassification — never trust browser time or
    # a client-supplied timestamp. resulting_event_date is event.event_date
    # as just assigned above (the new date if this update changed it,
    # otherwise the task's existing date) — classify_updated_task always
    # evaluates against the week the task now belongs to, never the week
    # it belonged to before this update. The SAME instant is reused below
    # as created_at/updated_at for any additional new occurrences, so the
    # edited row and its new siblings always agree on "when this happened".
    updated_at = datetime.now(timezone.utc)
    event.category = classify_updated_task(
        current_category=event.category,
        resulting_event_date=event.event_date,
        updated_at=updated_at,
    )
    event.updated_at = updated_at

    # New occurrences (PHASE 12/17) — each a genuinely NEW row, so
    # classify_new_task (not classify_updated_task) decides its category;
    # each starts with no outcome/outcome_reason (column defaults — never
    # copied from the edited occurrence, and never set here). Existing
    # sibling occurrences that were not explicitly loaded into this edit
    # (any other same-title/date row besides event.id) are never queried,
    # touched, or discovered by this endpoint — only event.id is updated
    # and only these new frames are inserted.
    new_events = [
        MemberScheduleEvent(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            event_date=effective_date,
            title=effective_title,
            category=classify_new_task(event_date=effective_date, created_at=updated_at),
            priority=effective_priority,
            start_time=start,
            end_time=end,
            notes=effective_notes,
            source_scope=DEFAULT_SOURCE_SCOPE,
            is_official_truth=False,
            created_at=updated_at,
            updated_at=updated_at,
        )
        for start, end in additional_frames
    ]

    # ── Atomic transaction (PHASE 13) ────────────────────────────────────
    # The selected occurrence's update and every new occurrence's insert
    # commit together or not at all — a failure after db.add() below rolls
    # back the in-session attribute changes already made to `event` too,
    # not just the new inserts (db.rollback() reverts the whole pending
    # unit of work, exactly like the Bulk/Single-create atomic transactions
    # above).
    try:
        for new_event in new_events:
            db.add(new_event)
        db.flush()
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Task could not be updated due to a server error. Please try again.",
        )

    db.refresh(event)
    for new_event in new_events:
        db.refresh(new_event)

    if not new_events:
        return event

    items = [
        MemberScheduleEventOut.model_validate(item).model_dump(mode="json")
        for item in [event] + new_events
    ]
    return JSONResponse(
        status_code=200,
        content={"status": "updated", "created_count": len(new_events), "items": items},
    )


@router.put("/{member_key}/{event_id}/outcome", response_model=MemberScheduleEventOut)
def update_member_schedule_event_outcome(
    member_key: str,
    event_id: UUID,
    payload: TaskOutcomeUpdate,
    db: Session = Depends(get_db),
):
    """CONFIRMED UNTOUCHED-TASK OUTCOME (2026-07-24) — the only write path
    for MemberScheduleEvent.outcome/outcome_reason/outcome_updated_at/
    outcome_updated_by. Deliberately a separate endpoint from the general
    PUT /{member_key}/{event_id} above: outcome is orthogonal to
    date/title/priority/time/notes editing and must never touch
    classify_updated_task() or the stored category, and must never affect
    Schedule Summary's _aggregate_schedule_period (both read the category
    column only — this endpoint never assigns it).

    FINAL BUSINESS RULES (2026-07-24, this revision — narrows the window):
    actions are permitted ONLY on the task's own Asia/Colombo calendar date
    (today == event_date) — a future task (today < event_date) is rejected
    with 409 outcome_not_available_yet, and a past task (today >
    event_date) is rejected with 409 outcome_locked, whether or not an
    outcome was already recorded either way. Reuses derive_task_outcome()
    (backend/time_utils.py) for this check so the lock decision and the
    outcome_locked field returned in every response can never disagree. On
    either 409, NONE of outcome/outcome_reason/outcome_updated_at/
    outcome_updated_by are touched — the function returns before any
    assignment to `event` runs.

    FINAL CONFIRMED REASON-TRANSITION RULE (2026-07-24, same day): payload
    (TaskOutcomeUpdate) has already normalized `reason` by the time this
    body runs — trimmed and required for 'Uncompleted', forced to None for
    'Completed' (a nonblank reason alongside 'Completed' is rejected by the
    schema layer before this function is ever called). So this handler only
    needs to assign, never re-validate:
      - event.outcome = payload.outcome
      - event.outcome_reason = payload.reason (None for Completed, the
        trimmed text for Uncompleted — this is what "clear the previous
        Uncompleted reason" and "do not retain it as hidden text" mean in
        practice: the previous value is simply overwritten with None in
        the same UPDATE, never preserved in any column, log, or shadow
        field, so a subsequent GET can never surface it again)
      - event.outcome_updated_at = now (one instant, generated once below,
        the same "authoritative server clock, generated once, never
        client-supplied" convention create_member_schedule_event/
        update_member_schedule_event already use for created_at/updated_at)
      - event.outcome_updated_by = member_key (the URL path's own
        member_key, already validated by _validate_member_key above — this
        app has no separate authenticated-actor concept, so the calendar
        instance's own member context IS the canonical actor)

    Atomicity: every assignment above happens on the same in-memory `event`
    ORM object; nothing is flushed to the database until the single
    db.commit() call below. If that commit fails for any reason (e.g. a
    CHECK-constraint violation that somehow reached this point despite the
    schema-layer validation above), SQLAlchemy/Postgres roll back the
    entire UPDATE as one unit — outcome, outcome_reason,
    outcome_updated_at, and outcome_updated_by are guaranteed to either all
    change together or none of them change at all. This is the existing
    session lifecycle (backend/database.py get_db(): a single Session, one
    commit, close() in a finally block) — no new transaction-management
    code was introduced for this guarantee.

    updated_at/updated_by (the general, pre-existing columns) are
    deliberately left untouched by this endpoint — they remain the audit
    trail for actual title/date/priority/time/notes content edits (see the
    general PUT handler above and formatTaskTimestamp() in the frontend).
    outcome_updated_at/outcome_updated_by are a dedicated, separate audit
    pair that exists specifically so an outcome action is never confused
    with a content edit, and so it is never left unaudited either."""
    _validate_member_key(member_key)
    event = _get_active_event_or_404(db, member_key, event_id)

    today = colombo_today()
    _, locked = derive_task_outcome(event.event_date, event.outcome, today=today)
    if locked:
        if today < event.event_date:
            return JSONResponse(
                status_code=409,
                content={
                    "error": "outcome_not_available_yet",
                    "message": (
                        "Outcome actions are available on the task's own date "
                        "(Asia/Colombo). This task is not there yet."
                    ),
                },
            )
        return JSONResponse(
            status_code=409,
            content={
                "error": "outcome_locked",
                "message": (
                    "This task's outcome can no longer be changed — its "
                    "date (Asia/Colombo) has passed."
                ),
            },
        )

    event.outcome = payload.outcome
    event.outcome_reason = payload.reason
    event.outcome_updated_at = datetime.now(timezone.utc)
    event.outcome_updated_by = member_key
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{member_key}/clear-testing-data", status_code=200)
def clear_testing_data(member_key: str, db: Session = Depends(get_db)):
    _validate_member_key(member_key)

    now = datetime.now(timezone.utc)
    updated_count = (
        db.query(MemberScheduleEvent)
        .filter(
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.deleted_at.is_(None),
            MemberScheduleEvent.source_scope == "dashboard_testing",
            MemberScheduleEvent.is_official_truth.is_(False),
        )
        .update({"deleted_at": now}, synchronize_session=False)
    )
    db.commit()
    return {"member_key": member_key, "cleared_count": updated_count}


@router.delete("/{member_key}/{event_id}", status_code=200)
def delete_member_schedule_event(
    member_key: str, event_id: UUID, db: Session = Depends(get_db)
):
    """FINAL BUSINESS RULES (2026-07-24) — Rule 8: once an outcome is
    recorded, the task is permanently preserved as read-only evidence and
    can never be deleted (no rule in this codebase ever clears outcome
    back to NULL, so this is a one-way, permanent protection once an
    outcome is first recorded)."""
    _validate_member_key(member_key)
    event = _get_active_event_or_404(db, member_key, event_id)

    if event.outcome is not None:
        return JSONResponse(
            status_code=409,
            content={
                "error": "outcome_recorded_immutable",
                "message": (
                    "This task can't be deleted — an outcome has already "
                    "been recorded for it."
                ),
            },
        )

    event.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": str(event.id), "deleted": True}
