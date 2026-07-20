"""Shared helper functions for the member leave coordination-copy feature
(REQ-LEAVE-COPY-001). Kept in its own module, separate from
backend/routers/member_schedules.py and backend/routers/member_leave.py, so
both routers can call the same well-tested logic without duplicating it and
without either router needing to know the other's internals.

This module never claims official HR leave truth, official leave balance,
payroll, no-pay status, disciplinary status, or medical truth. All minute
values returned here are "leave deduction minutes" / "leave-system credited
minutes" mirrored from the separate official leave system — never
independently verified actual productive working time.

Source contract: docs/2026-07-16_management-calendar-leave-copy-requirement.md
and docs/management-calendar-leave-copy-design.md.
"""

from datetime import date as date_type, time as time_type, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import text as sa_text
from sqlalchemy.orm import Session

from backend.config import (
    LEAVE_FULL_DAY_DEDUCTION_MINUTES,
    LEAVE_FULL_DAY_END,
    LEAVE_FULL_DAY_START,
    LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_FIRST_END,
    LEAVE_HALF_DAY_FIRST_START,
    LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_SECOND_END,
    LEAVE_HALF_DAY_SECOND_START,
    LEAVE_MAX_DAILY_DEDUCTION_MINUTES,
    SHORT_LEAVE_MAX_REQUEST_MINUTES,
    SHORT_LEAVE_MONTHLY_CAP_MINUTES,
)
from backend.models import MemberLeaveRecord, MemberScheduleEvent

HALF_DAY_LEAVE_TYPES = ("Half-Day First", "Half-Day Second")


def half_day_period_for_leave_type(leave_type: str) -> Optional[str]:
    if leave_type == "Half-Day First":
        return "First"
    if leave_type == "Half-Day Second":
        return "Second"
    return None


def leave_type_requires_time(leave_type: str) -> bool:
    return leave_type == "Short Leave"


def leave_type_is_single_day(leave_type: str) -> bool:
    return leave_type != "Multi-Day"


def expand_weekdays(start_date: date_type, end_date: date_type) -> List[date_type]:
    """Monday-Friday dates in [start_date, end_date] inclusive. Saturdays
    and Sundays are excluded automatically (requirement §8.4). Public
    holidays receive no special handling in this phase — a weekday that is
    a public holiday is still returned as an included weekday."""
    if end_date < start_date:
        return []
    included = []
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # Monday=0 .. Friday=4
            included.append(current)
        current += timedelta(days=1)
    return included


def validate_short_leave_duration_minutes(
    start_time: time_type, end_time: time_type
) -> int:
    """Returns the request's duration in minutes, or raises ValueError if
    the duration is not positive or exceeds the per-request cap (120
    minutes). Callers translate ValueError into an HTTP 422."""
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute
    duration = end_minutes - start_minutes
    if duration <= 0:
        raise ValueError("end_time must be later than start_time.")
    if duration > SHORT_LEAVE_MAX_REQUEST_MINUTES:
        raise ValueError(
            f"Short Leave requests cannot exceed {SHORT_LEAVE_MAX_REQUEST_MINUTES} minutes."
        )
    return duration


def validate_leave_dates_and_times(
    leave_type: str,
    start_date: date_type,
    end_date: date_type,
    start_time: Optional[time_type],
    end_time: Optional[time_type],
) -> None:
    """Re-usable cross-field validation for both create and update flows.
    Raises ValueError with a caller-facing message on any violation."""
    if leave_type_is_single_day(leave_type):
        if end_date != start_date:
            raise ValueError(f"{leave_type} requires end_date to equal start_date.")
    else:
        if end_date < start_date:
            raise ValueError("end_date must not be before start_date.")
        if not expand_weekdays(start_date, end_date):
            raise ValueError(
                "Multi-Day leave must include at least one Monday-Friday date."
            )

    if leave_type_requires_time(leave_type):
        if start_time is None or end_time is None:
            raise ValueError(f"{leave_type} requires both start_time and end_time.")
        validate_short_leave_duration_minutes(start_time, end_time)
    else:
        if start_time is not None or end_time is not None:
            raise ValueError(f"{leave_type} does not accept start_time/end_time.")


def compute_effective_leave_minutes(
    leave_type: str,
    start_date: date_type,
    end_date: date_type,
    start_time: Optional[time_type],
    end_time: Optional[time_type],
) -> int:
    """The leave-deduction minutes snapshotted onto effective_leave_minutes
    at creation, and recomputed here again whenever a date/time field is
    edited (design §7 — "Config Snapshot Rule", adapted to the 2026-07-16
    simplification amendment's immediate-active lifecycle). These are
    leave-system credited minutes, not independently verified actual
    productive working time."""
    if leave_type == "Short Leave":
        return validate_short_leave_duration_minutes(start_time, end_time)
    if leave_type == "Half-Day First":
        return LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES
    if leave_type == "Half-Day Second":
        return LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES
    if leave_type == "Full-Day":
        return LEAVE_FULL_DAY_DEDUCTION_MINUTES
    if leave_type == "Multi-Day":
        included = expand_weekdays(start_date, end_date)
        return LEAVE_FULL_DAY_DEDUCTION_MINUTES * len(included)
    raise ValueError(f"Unknown leave_type '{leave_type}'.")


def compute_short_leave_active_minutes_for_month(
    db: Session,
    member_key: str,
    year: int,
    month: int,
    exclude_id=None,
    lock: bool = False,
) -> int:
    """Sum of active Short Leave minutes for member_key in the given
    calendar month. Every row where deleted_at IS NULL counts — there is no
    Pending/Approved distinction (2026-07-16 simplification amendment);
    only soft-deleted rows never contribute.

    When lock=True, takes a SELECT ... FOR UPDATE row lock on the matching
    rows so a concurrent transaction attempting to save another Short
    Leave request for the same member/month cannot read a stale sum before
    this transaction commits — see backend/routers/member_leave.py for the
    transaction boundary this is always called within when lock=True."""
    query = db.query(MemberLeaveRecord).filter(
        MemberLeaveRecord.member_key == member_key,
        MemberLeaveRecord.leave_type == "Short Leave",
        MemberLeaveRecord.deleted_at.is_(None),
    )
    if exclude_id is not None:
        query = query.filter(MemberLeaveRecord.id != exclude_id)
    if lock:
        query = query.with_for_update()

    total = 0
    for row in query.all():
        if row.start_date.year == year and row.start_date.month == month:
            total += row.effective_leave_minutes or 0
    return total


def assert_active_short_leave_monthly_cap_not_exceeded(
    db: Session,
    member_key: str,
    target_date: date_type,
    proposed_minutes: int,
    exclude_id=None,
) -> None:
    """Raises ValueError if saving proposed_minutes of Short Leave for
    member_key in target_date's calendar month would push the active
    monthly total over SHORT_LEAVE_MONTHLY_CAP_MINUTES (120). Always call
    within a transaction that has already taken the row lock (see
    compute_short_leave_active_minutes_for_month(lock=True)) so two
    concurrent creates/edits cannot both pass this check before either
    commits."""
    existing = compute_short_leave_active_minutes_for_month(
        db, member_key, target_date.year, target_date.month, exclude_id=exclude_id, lock=True
    )
    if existing + proposed_minutes > SHORT_LEAVE_MONTHLY_CAP_MINUTES:
        raise ValueError(
            f"Saving this request would bring {member_key}'s active Short "
            f"Leave total for {target_date.strftime('%Y-%m')} to "
            f"{existing + proposed_minutes} minutes, exceeding the "
            f"{SHORT_LEAVE_MONTHLY_CAP_MINUTES}-minute monthly cap "
            f"({existing} already active)."
        )


def _minutes_since_midnight(t: time_type) -> int:
    return t.hour * 60 + t.minute


def _leave_record_day_interval(
    record: MemberLeaveRecord, target_date: date_type
) -> Optional[Tuple[int, int]]:
    """The (start_minutes, end_minutes) interval a single active leave
    record contributes on target_date, or None if it doesn't cover that
    date. Half-Day/Full-Day intervals use the configured leave-system
    period, not the actual office break (backend/config.py)."""
    if record.leave_type == "Short Leave":
        if record.start_date == target_date and record.start_time and record.end_time:
            return (
                _minutes_since_midnight(record.start_time),
                _minutes_since_midnight(record.end_time),
            )
        return None
    if record.leave_type == "Half-Day First":
        if record.start_date == target_date:
            return (
                _minutes_since_midnight(LEAVE_HALF_DAY_FIRST_START),
                _minutes_since_midnight(LEAVE_HALF_DAY_FIRST_END),
            )
        return None
    if record.leave_type == "Half-Day Second":
        if record.start_date == target_date:
            return (
                _minutes_since_midnight(LEAVE_HALF_DAY_SECOND_START),
                _minutes_since_midnight(LEAVE_HALF_DAY_SECOND_END),
            )
        return None
    if record.leave_type == "Full-Day":
        if record.start_date == target_date:
            return (
                _minutes_since_midnight(LEAVE_FULL_DAY_START),
                _minutes_since_midnight(LEAVE_FULL_DAY_END),
            )
        return None
    if record.leave_type == "Multi-Day":
        if target_date in expand_weekdays(record.start_date, record.end_date):
            return (
                _minutes_since_midnight(LEAVE_FULL_DAY_START),
                _minutes_since_midnight(LEAVE_FULL_DAY_END),
            )
        return None
    return None


def merge_intervals(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """Standard sorted interval merge. Overlapping or touching intervals
    (start <= previous end) are combined into one, so overlapping
    Short/Half-Day active leave periods are never double-counted (design
    §9 — overlap deduplication)."""
    if not intervals:
        return []
    ordered = sorted(intervals)
    merged = [ordered[0]]
    for start, end in ordered[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged


def active_leave_minutes_for_date(
    active_rows: List[MemberLeaveRecord], target_date: date_type
) -> int:
    """Leave-deduction minutes for a single date, computed by merging every
    active leave record's contributed interval on that date and capping
    the total at LEAVE_MAX_DAILY_DEDUCTION_MINUTES (540). A Full-Day or
    Multi-Day-included weekday's interval spans the whole leave-system
    workday, so merging naturally makes it dominate any overlapping
    partial-day (Short/Half-Day) contribution on the same date rather than
    summing on top of it."""
    intervals = []
    for row in active_rows:
        interval = _leave_record_day_interval(row, target_date)
        if interval is not None:
            intervals.append(interval)
    merged = merge_intervals(intervals)
    total = sum(end - start for start, end in merged)
    return min(total, LEAVE_MAX_DAILY_DEDUCTION_MINUTES)


def compute_active_leave_minutes_for_period(
    db: Session, member_key: str, date_from: date_type, date_to: date_type
) -> int:
    """Total leave-deduction minutes for member_key across
    [date_from, date_to] inclusive, with same-date overlap deduplication
    (design §9) — duplicate/overlapping active leave records covering the
    same date never double-deduct. Every row where deleted_at IS NULL
    counts — there is no Pending/Approved distinction."""
    rows = (
        db.query(MemberLeaveRecord)
        .filter(
            MemberLeaveRecord.member_key == member_key,
            MemberLeaveRecord.deleted_at.is_(None),
            MemberLeaveRecord.start_date <= date_to,
            MemberLeaveRecord.end_date >= date_from,
        )
        .all()
    )
    if not rows:
        return 0

    total = 0
    current = date_from
    while current <= date_to:
        total += active_leave_minutes_for_date(rows, current)
        current += timedelta(days=1)
    return total


def find_conflicting_active_leave(
    db: Session,
    member_key: str,
    task_date: date_type,
    task_start_time: Optional[time_type],
    task_end_time: Optional[time_type],
) -> List[MemberLeaveRecord]:
    """Active leave records (deleted_at IS NULL) that conflict with a task
    on task_date. There is no Pending/Approved distinction (2026-07-16
    simplification amendment) — every active row is queried.

    - Full-Day / Multi-Day (included weekday): conflicts with ANY task on
      that date, timed or untimed.
    - Short Leave / Half-Day First / Half-Day Second: conflicts only with a
      TIMED task whose [start,end) overlaps the leave's own time window. An
      untimed task does not conflict with a Short/Half-Day leave record
      (requirement §8.7 case list; the approved document does not state
      otherwise for this case)."""
    candidates = (
        db.query(MemberLeaveRecord)
        .filter(
            MemberLeaveRecord.member_key == member_key,
            MemberLeaveRecord.deleted_at.is_(None),
            MemberLeaveRecord.start_date <= task_date,
            MemberLeaveRecord.end_date >= task_date,
        )
        .all()
    )

    conflicts = []
    for record in candidates:
        interval = _leave_record_day_interval(record, task_date)
        if interval is None:
            continue

        if record.leave_type in ("Full-Day", "Multi-Day"):
            conflicts.append(record)
            continue

        # Short Leave / Half-Day First / Half-Day Second: only a timed task
        # whose window overlaps the leave's own interval conflicts.
        if task_start_time is None or task_end_time is None:
            continue
        task_start = _minutes_since_midnight(task_start_time)
        task_end = _minutes_since_midnight(task_end_time)
        leave_start, leave_end = interval
        if task_start < leave_end and leave_start < task_end:
            conflicts.append(record)

    return conflicts


def leave_conflict_response_body(conflicts: List[MemberLeaveRecord]) -> dict:
    """Builds the 409 response body. Deliberately omits `purpose` and any
    other free-text field beyond leave_id/leave_type/date/time (requirement
    §8.7 — "omit unnecessary sensitive purpose text"). No `status` field
    (2026-07-16 simplification amendment) — there is no workflow status to
    report."""
    return {
        "error": "leave_conflict",
        "message": "This task conflicts with active leave.",
        "conflicts": [
            {
                "leave_id": str(record.id),
                "leave_type": record.leave_type,
                "start_date": record.start_date.isoformat(),
                "end_date": record.end_date.isoformat(),
                "start_time": record.start_time.isoformat() if record.start_time else None,
                "end_time": record.end_time.isoformat() if record.end_time else None,
            }
            for record in conflicts
        ],
    }


# ── Leave-versus-task overlap prevention (calendar-empty-slot-create-and-
# overlap-rules, 2026-07-20) ────────────────────────────────────────────
#
# The reverse direction of find_conflicting_active_leave() above: that
# function blocks a TASK save against active leave; this one blocks a LEAVE
# save against active tasks (member-confirmed requirement "Leave records
# must not overlap Task records"). Mirrors the same Full-Day-dominance /
# partial-day-interval asymmetry find_conflicting_active_leave() already
# applies from the task side, just with the roles of "proposed" and
# "candidate" swapped — kept as its own function rather than a generic
# bidirectional helper so each direction's docstring/tests stay legible on
# their own, matching this module's existing task-vs-leave /
# leave-vs-leave split.
#
# Forward-references _leave_dates()/_partial_day_minutes_interval()/
# _FULL_DAY_DOMINANT_LEAVE_TYPES, defined further below in the
# leave-versus-leave section — valid Python (names are resolved when this
# function is called, not when it is defined) and reads in the natural
# order task-vs-leave -> leave-vs-task -> leave-vs-leave.


def find_conflicting_active_tasks(
    db: Session,
    member_key: str,
    leave_type: str,
    start_date: date_type,
    end_date: date_type,
    start_time: Optional[time_type],
    end_time: Optional[time_type],
) -> List[MemberScheduleEvent]:
    """Active schedule/task rows (deleted_at IS NULL) that conflict with a
    proposed leave record (leave_type, start_date, end_date, start_time,
    end_time — the same shape callers already pass to
    assert_no_leave_overlap).

    - Full-Day / Multi-Day (each included weekday): conflicts with ANY task
      on that date, timed or untimed — same Full-Day-dominance rule
      find_conflicting_active_leave() already applies from the task side.
    - Short Leave / Half-Day First / Half-Day Second: conflicts only with a
      TIMED task whose [start,end) overlaps the leave's own time window. An
      untimed task never conflicts with a partial-day leave request — same
      asymmetry find_conflicting_active_leave() already applies.

    Concurrency note (documented per Step 14 rather than silently
    redesigned): this issues a plain SELECT with no row lock and no
    schedule-side advisory lock — acquire_member_leave_lock (called by
    every leave create/update path before this) only serializes concurrent
    LEAVE writes for member_key; it does not lock member_schedule_events
    rows, and task creation takes no lock of its own. A task could
    therefore be committed for this member, for an affected date, in the
    narrow window between this SELECT and the leave write's own commit,
    producing an unflagged overlap. This is the same class of race
    find_conflicting_active_leave() (the existing task-vs-leave direction)
    already has, unresolved, on the task side — pre-existing in this
    codebase, not introduced here. Closing it would require either locking
    member_schedule_events rows or a cross-table constraint, both out of
    this task's explicitly approved scope (no schema/migration changes)."""
    occupied_dates = set(_leave_dates(leave_type, start_date, end_date))
    if not occupied_dates:
        return []

    candidates = (
        db.query(MemberScheduleEvent)
        .filter(
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.deleted_at.is_(None),
            MemberScheduleEvent.event_date.in_(occupied_dates),
        )
        .all()
    )
    if not candidates:
        return []

    full_day_dominant = leave_type in _FULL_DAY_DOMINANT_LEAVE_TYPES
    leave_start = leave_end = None
    if not full_day_dominant:
        leave_start, leave_end = _partial_day_minutes_interval(leave_type, start_time, end_time)

    conflicts = []
    for task in candidates:
        # Defensive re-check, not reliant on the SQL filter above having
        # actually run (matches _leave_record_day_interval's equivalent
        # target_date guard on the task-vs-leave side) — a candidate whose
        # event_date isn't one of the leave's occupied dates is never a
        # conflict, regardless of how it ended up in `candidates`.
        if task.event_date not in occupied_dates:
            continue
        if full_day_dominant:
            conflicts.append(task)
            continue
        if task.start_time is None or task.end_time is None:
            continue
        task_start = _minutes_since_midnight(task.start_time)
        task_end = _minutes_since_midnight(task.end_time)
        if task_start < leave_end and leave_start < task_end:
            conflicts.append(task)

    return conflicts


def task_conflict_response_body(conflicts: List[MemberScheduleEvent]) -> dict:
    """Builds the 409 response body when a proposed leave overlaps one or
    more active tasks. New contract (2026-07-20) — the reverse direction of
    leave_conflict_response_body above. Deliberately omits `notes` (the
    task's own free-text field) and `title`, matching
    leave_conflict_response_body's "omit unnecessary sensitive text"
    convention; `category`/`event_date`/times are the safe conflict
    identifiers Step 12 permits."""
    return {
        "error": "task_conflict",
        "message": "This leave request conflicts with one or more active tasks.",
        "conflicts": [
            {
                "task_id": str(task.id),
                "category": task.category,
                "event_date": task.event_date.isoformat(),
                "start_time": task.start_time.isoformat() if task.start_time else None,
                "end_time": task.end_time.isoformat() if task.end_time else None,
            }
            for task in conflicts
        ],
    }


# ── Leave-versus-leave overlap prevention (member-leave-overlap-prevention,
# 2026-07-17) ─────────────────────────────────────────────────────────────
#
# Distinct from find_conflicting_active_leave() above, which blocks a TASK
# save against active leave. This section blocks a member from ever holding
# two overlapping active LEAVE records at once (the reported bug: two
# Full-Day rows for the same member on the same date). Active leave
# definition is unchanged: deleted_at IS NULL — there is no
# Pending/Approved/Rejected/Cancelled workflow (2026-07-16 simplification
# amendment); only soft-deleted rows are excluded.
#
# Full-Day dominance (per the approved overlap matrix): a Full-Day or
# Multi-Day-included-weekday occupies the ENTIRE date for overlap purposes
# and conflicts with any other active leave on that date, regardless of
# that other record's own time window. This is deliberately NOT implemented
# by reusing _leave_record_day_interval()'s 08:30-18:00 Full-Day window in
# a plain interval-overlap test — an untimed Short Leave request outside
# that configured window (e.g. a hypothetical 07:00 start) would then be
# incorrectly treated as non-overlapping. Dominance is checked explicitly
# instead, before any time-interval comparison is attempted.

_FULL_DAY_DOMINANT_LEAVE_TYPES = ("Full-Day", "Multi-Day")
_PARTIAL_DAY_LEAVE_TYPES = ("Short Leave", "Half-Day First", "Half-Day Second")


class LeaveOverlapError(Exception):
    """Raised by assert_no_leave_overlap when the proposed leave overlaps
    one or more of the member's existing active leave records. Callers
    catch this and translate it into an HTTP 409 using
    leave_overlap_response_body(exc.conflicts)."""

    def __init__(self, conflicts: List[MemberLeaveRecord]):
        self.conflicts = conflicts
        super().__init__("Proposed leave overlaps existing active leave.")


def _leave_dates(leave_type: str, start_date: date_type, end_date: date_type) -> List[date_type]:
    """The set of calendar dates a leave record (proposed or stored)
    actually occupies for overlap purposes. Multi-Day expands to its
    included Monday-Friday dates only (Saturday/Sunday are never occupied —
    OVERLAP MATRIX "Allow" case 4); every other leave_type occupies exactly
    its single start_date (start_date == end_date is already guaranteed for
    these types by the model/schema CHECK constraints)."""
    if leave_type == "Multi-Day":
        return expand_weekdays(start_date, end_date)
    return [start_date]


def _partial_day_minutes_interval(
    leave_type: str, start_time: Optional[time_type], end_time: Optional[time_type]
) -> Tuple[int, int]:
    """(start_minutes, end_minutes) for a partial-day leave_type only —
    never call this with a Full-Day-dominant leave_type (see
    _FULL_DAY_DOMINANT_LEAVE_TYPES; dominance is decided before this is
    reached). Half-Day windows use the fixed configured leave-system clock
    period, not any caller-supplied time."""
    if leave_type == "Short Leave":
        return (_minutes_since_midnight(start_time), _minutes_since_midnight(end_time))
    if leave_type == "Half-Day First":
        return (
            _minutes_since_midnight(LEAVE_HALF_DAY_FIRST_START),
            _minutes_since_midnight(LEAVE_HALF_DAY_FIRST_END),
        )
    if leave_type == "Half-Day Second":
        return (
            _minutes_since_midnight(LEAVE_HALF_DAY_SECOND_START),
            _minutes_since_midnight(LEAVE_HALF_DAY_SECOND_END),
        )
    raise ValueError(
        f"_partial_day_minutes_interval called with non-partial-day leave_type '{leave_type}'."
    )


def _leave_pair_overlaps_on_shared_date(
    a_leave_type: str,
    a_start_time: Optional[time_type],
    a_end_time: Optional[time_type],
    b_leave_type: str,
    b_start_time: Optional[time_type],
    b_end_time: Optional[time_type],
) -> bool:
    """True if leave A and leave B conflict on a calendar date both are
    known to occupy (caller has already established the shared date via
    _leave_dates()). Implements the approved OVERLAP MATRIX:

    - Either side is Full-Day or Multi-Day (that date) -> always overlaps,
      independent of the other side's leave_type or time (FULL-DAY
      DOMINANCE — matrix rows 1-5).
    - Otherwise both sides are partial-day (Short Leave / Half-Day First /
      Half-Day Second) -> half-open time-interval overlap:
      new_start < existing_end AND new_end > existing_start (matrix rows
      6-10; adjacent periods such as 10:00-11:00 touching 09:00-10:00 are
      NOT an overlap, and First-Half/Second-Half never overlap each other
      since their configured windows do not touch)."""
    if a_leave_type in _FULL_DAY_DOMINANT_LEAVE_TYPES or b_leave_type in _FULL_DAY_DOMINANT_LEAVE_TYPES:
        return True

    a_start, a_end = _partial_day_minutes_interval(a_leave_type, a_start_time, a_end_time)
    b_start, b_end = _partial_day_minutes_interval(b_leave_type, b_start_time, b_end_time)
    return a_start < b_end and b_start < a_end


def find_overlapping_leave_records(
    db: Session,
    member_key: str,
    leave_type: str,
    start_date: date_type,
    end_date: date_type,
    start_time: Optional[time_type],
    end_time: Optional[time_type],
    exclude_leave_id=None,
    lock: bool = False,
) -> List[MemberLeaveRecord]:
    """CENTRAL HELPER (member-leave-overlap-prevention, CORE RULE) — the one
    place both create and edit leave-overlap validation is implemented, so
    POST and PUT in backend/routers/member_leave.py never duplicate this
    logic.

    Returns every active (deleted_at IS NULL) leave record belonging to
    member_key that overlaps the proposed leave described by
    (leave_type, start_date, end_date, start_time, end_time), per the
    approved OVERLAP MATRIX. Does not mutate any row.

    - exclude_leave_id: pass the record's own id on an edit so it is never
      compared against itself (matrix "Allow" — self is not a conflict).
    - lock: when True, takes SELECT ... FOR UPDATE on the candidate rows,
      the same row-locking convention already used by
      assert_active_short_leave_monthly_cap_not_exceeded above. Always
      called with lock=True from assert_no_leave_overlap, which callers use
      inside a transaction that has also acquired acquire_member_leave_lock
      (the member-scoped advisory lock) — the row lock alone cannot close
      the race between two brand-new leave records that would only overlap
      each other (neither yet exists to be locked); the advisory lock is
      what actually serializes that case. See acquire_member_leave_lock's
      docstring."""
    proposed_dates = set(_leave_dates(leave_type, start_date, end_date))
    if not proposed_dates:
        return []

    query = db.query(MemberLeaveRecord).filter(
        MemberLeaveRecord.member_key == member_key,
        MemberLeaveRecord.deleted_at.is_(None),
        MemberLeaveRecord.start_date <= end_date,
        MemberLeaveRecord.end_date >= start_date,
    )
    if exclude_leave_id is not None:
        query = query.filter(MemberLeaveRecord.id != exclude_leave_id)
    if lock:
        query = query.with_for_update()

    candidates = query.all()
    # Redundant Python-side exclude guard (the query above already excludes
    # exclude_leave_id at the SQL layer) — kept so this self-exclusion rule
    # is independently verifiable by backend/tests/test_member_leave.py's
    # DB-free fake-session tests, matching this codebase's established
    # testing convention (no test in this repo opens a live database
    # connection).
    if exclude_leave_id is not None:
        candidates = [record for record in candidates if record.id != exclude_leave_id]
    if not candidates:
        return []

    conflicts = []
    for record in candidates:
        record_dates = set(_leave_dates(record.leave_type, record.start_date, record.end_date))
        if not (proposed_dates & record_dates):
            continue
        if _leave_pair_overlaps_on_shared_date(
            leave_type, start_time, end_time,
            record.leave_type, record.start_time, record.end_time,
        ):
            conflicts.append(record)

    return conflicts


def acquire_member_leave_lock(db: Session, member_key: str) -> None:
    """Transaction-scoped PostgreSQL advisory lock (pg_advisory_xact_lock)
    keyed on a hash of member_key. Must be called, inside the write
    transaction, before find_overlapping_leave_records/
    assert_no_leave_overlap on every leave create/edit path.

    Why this exists in addition to the SELECT ... FOR UPDATE row lock in
    find_overlapping_leave_records: a row lock can only lock rows that
    already exist. Two concurrent requests creating a member's very first
    leave record (or two brand-new records that only overlap each other and
    nothing pre-existing) would each run their overlap SELECT against zero
    matching rows, both find no conflict, and both commit — a plain
    unlocked SELECT-then-INSERT race the task requirements explicitly call
    out as insufficient. The advisory lock closes this: it is member-scoped
    (not row-scoped), so a second concurrent transaction for the same
    member_key blocks at this call until the first transaction commits or
    rolls back, at which point its own overlap check sees the first
    transaction's now-committed row. Automatically released at
    COMMIT/ROLLBACK (the _xact_ variant, not pg_advisory_lock) — no
    explicit unlock call is needed and a crashed request can never leave
    the lock held.

    Requires a PostgreSQL session. Not exercised by backend/tests/
    test_member_leave.py, which — per this repo's established testing
    convention — never opens a live database connection; documented as a
    known limitation in validation/member-leave-overlap-prevention-check-2026-07-17.md."""
    db.execute(sa_text("SELECT pg_advisory_xact_lock(hashtext(:member_key))"), {"member_key": member_key})


def assert_no_leave_overlap(
    db: Session,
    member_key: str,
    leave_type: str,
    start_date: date_type,
    end_date: date_type,
    start_time: Optional[time_type],
    end_time: Optional[time_type],
    exclude_leave_id=None,
) -> None:
    """Raises LeaveOverlapError if the proposed leave overlaps any of
    member_key's existing active leave records. Always locks the candidate
    rows (lock=True) — callers must have already called
    acquire_member_leave_lock(db, member_key) earlier in the same
    transaction so the two locks together close the race described in
    acquire_member_leave_lock's docstring."""
    conflicts = find_overlapping_leave_records(
        db, member_key, leave_type, start_date, end_date, start_time, end_time,
        exclude_leave_id=exclude_leave_id, lock=True,
    )
    if conflicts:
        raise LeaveOverlapError(conflicts)


def leave_overlap_response_body(conflicts: List[MemberLeaveRecord]) -> dict:
    """Builds the 409 leave_overlap response body (member-leave-overlap-
    prevention CORE RULE). Deliberately omits `purpose` and any other
    free-text field beyond leave_id/leave_type/date/time, matching
    leave_conflict_response_body's convention above."""
    return {
        "error": "leave_overlap",
        "message": (
            "This member already has leave that overlaps the selected date or time."
        ),
        "conflicts": [
            {
                "leave_id": str(record.id),
                "leave_type": record.leave_type,
                "start_date": record.start_date.isoformat(),
                "end_date": record.end_date.isoformat(),
                "start_time": record.start_time.isoformat() if record.start_time else None,
                "end_time": record.end_time.isoformat() if record.end_time else None,
            }
            for record in conflicts
        ],
    }
