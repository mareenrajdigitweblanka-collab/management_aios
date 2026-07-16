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
from backend.models import MemberLeaveRecord

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
