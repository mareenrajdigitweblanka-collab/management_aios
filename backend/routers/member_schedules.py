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
"""

import calendar
from datetime import date as date_type, datetime, time as time_type, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy import asc, nullslast
from sqlalchemy.orm import Session

from backend.config import (
    DEFAULT_SOURCE_SCOPE,
    LEAVE_FULL_DAY_DEDUCTION_MINUTES,
    MEMBER_LABELS,
    SCHEDULE_TIMEZONE,
    VALID_MEMBER_KEYS,
)
from backend.database import get_db
from backend.models import MemberScheduleEvent
from backend.routers import leave_logic
from backend.schemas import (
    DailyScheduleReportOut,
    DurationChangeOut,
    MemberScheduleEventCreate,
    MemberScheduleEventOut,
    MemberScheduleEventUpdate,
    MonthlyScheduleReportOut,
    WeeklyScheduleReportOut,
)

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
    _validate_member_key(member_key)

    # One instant used for both classification and storage, generated once
    # at the start of the request — never trust browser time, never derive
    # classification from a separately-generated updated_at/DB now().
    created_at = datetime.now(timezone.utc)

    # payload.category (if the client sent one) is accepted only for
    # backward compatibility and is never read here — non-authoritative,
    # cannot bypass classification (see MemberScheduleEventCreate docstring).
    category = classify_new_task(event_date=payload.date, created_at=created_at)

    conflicts = leave_logic.find_conflicting_active_leave(
        db, member_key, payload.date, payload.start, payload.end
    )
    if conflicts:
        return JSONResponse(
            status_code=409, content=leave_logic.leave_conflict_response_body(conflicts)
        )

    event = MemberScheduleEvent(
        member_key=member_key,
        member_label=MEMBER_LABELS[member_key],
        event_date=payload.date,
        title=payload.title,
        category=category,
        priority=payload.priority,
        start_time=payload.start,
        end_time=payload.end,
        notes=payload.notes,
        source_scope=DEFAULT_SOURCE_SCOPE,
        is_official_truth=False,
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


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

    effective_date = update_data.get("date", event.event_date)
    effective_start = update_data.get("start", event.start_time)
    effective_end = update_data.get("end", event.end_time)

    conflicts = leave_logic.find_conflicting_active_leave(
        db, member_key, effective_date, effective_start, effective_end
    )
    if conflicts:
        return JSONResponse(
            status_code=409, content=leave_logic.leave_conflict_response_body(conflicts)
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
    # it belonged to before this update.
    updated_at = datetime.now(timezone.utc)
    event.category = classify_updated_task(
        current_category=event.category,
        resulting_event_date=event.event_date,
        updated_at=updated_at,
    )
    event.updated_at = updated_at

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
    _validate_member_key(member_key)
    event = _get_active_event_or_404(db, member_key, event_id)

    event.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": str(event.id), "deleted": True}
