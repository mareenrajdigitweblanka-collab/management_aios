"""Member schedule endpoints.

Preserves the testing/demo truth boundary at every write path:
- POST always forces source_scope='dashboard_testing' and is_official_truth=False,
  regardless of any such fields present in the request body (they are not even
  accepted by MemberScheduleEventCreate).
- PUT only ever touches editable fields (date/title/priority/start/end/notes) —
  source_scope, is_official_truth, and category are never assigned on update.
- clear-testing-data only soft-deletes rows where source_scope='dashboard_testing'
  AND is_official_truth=False; pilot/approved_live rows are left untouched.

Category classification (2026-07-14): every task's category is decided once,
at creation, by classify_schedule_category() below, and is permanent after
that — see update_member_schedule_event for the immutability enforcement.
Nothing in this router recalculates category on GET, PUT, drag/drop, or
resize (drag/resize all funnel through the same PUT handler and simply
re-send the row's existing category unchanged from the frontend, which this
handler's lock also independently guarantees server-side).
"""

from datetime import date as date_type, datetime, timedelta, timezone
from typing import List, Optional, Tuple
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, func, nullslast
from sqlalchemy.orm import Session

from backend.config import (
    DEFAULT_SOURCE_SCOPE,
    MEMBER_LABELS,
    SCHEDULE_TIMEZONE,
    VALID_MEMBER_KEYS,
)
from backend.database import get_db
from backend.models import MemberScheduleEvent
from backend.schemas import (
    DailyScheduleReportOut,
    MemberScheduleEventCreate,
    MemberScheduleEventOut,
    MemberScheduleEventUpdate,
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


def classify_schedule_category(
    requested_category: str,
    event_date: date_type,
    created_at: datetime,
) -> str:
    """Create-time-only classification. Called exactly once, from
    create_member_schedule_event, never from GET/PUT/drag/resize — the
    stored value this returns becomes permanent (see the update-lock in
    update_member_schedule_event). Later edits (event_date, title,
    priority, notes, start_time, end_time) and drag/drop/resize never
    call this function again, so nothing that happens after creation can
    change a task's category.

    The rule (previous-day cutoff, 2026-07-14 — replaces the earlier
    planned-start-time rule):

    - Requesting 'Unscheduled Task' always returns 'Unscheduled Task'. A
      user may intentionally opt out early; nothing overrides that choice.
    - Otherwise, take the creation instant (created_at, always a UTC-aware
      datetime) and read off its calendar date in Asia/Colombo
      (created_at.astimezone(_COLOMBO).date()). If that Asia/Colombo date
      is strictly earlier than event_date, the requested category is
      honored — so 'Scheduled Task' is allowed for any creation time up
      to and including 11:59:59.999999 PM Asia/Colombo on the day before
      event_date.
    - If the Asia/Colombo creation date is event_date itself or later,
      the category is always forced to 'Unscheduled Task', regardless of
      what was requested — starting at exactly 12:00:00 AM Asia/Colombo
      on event_date.
    - start_time/end_time play no part in this decision — a task's
      planned time of day no longer matters, only the calendar day it was
      created on relative to the calendar day it is for. This applies
      identically to timed and untimed (start_time IS NULL) tasks; there
      is no separate untimed-task branch.
    """
    if requested_category == "Unscheduled Task":
        return "Unscheduled Task"

    created_local_date = created_at.astimezone(_COLOMBO).date()

    if created_local_date < event_date:
        return requested_category

    return "Unscheduled Task"


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


def _count_scheduled_vs_unscheduled(
    db: Session, member_key: str, date_from: date_type, date_to: date_type
) -> Tuple[int, int]:
    """One grouped aggregate query per report. Any category value other
    than the exact string 'Scheduled Task' (including pre-migration legacy
    placeholder values, if a report is ever run before the migration
    completes) counts as unscheduled — only an exact 'Scheduled Task' match
    counts as scheduled."""
    rows = (
        db.query(MemberScheduleEvent.category, func.count())
        .filter(
            MemberScheduleEvent.member_key == member_key,
            MemberScheduleEvent.deleted_at.is_(None),
            MemberScheduleEvent.event_date >= date_from,
            MemberScheduleEvent.event_date <= date_to,
        )
        .group_by(MemberScheduleEvent.category)
        .all()
    )
    scheduled = 0
    unscheduled = 0
    for category, count in rows:
        if category == "Scheduled Task":
            scheduled += count
        else:
            unscheduled += count
    return scheduled, unscheduled


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
    _validate_member_key(member_key)

    scheduled, unscheduled = _count_scheduled_vs_unscheduled(db, member_key, date, date)
    total = scheduled + unscheduled
    scheduled_pct, unscheduled_pct = _percentages(scheduled, total)

    return DailyScheduleReportOut(
        member_key=member_key,
        date=date,
        scheduled_count=scheduled,
        unscheduled_count=unscheduled,
        total_count=total,
        scheduled_percentage=scheduled_pct,
        unscheduled_percentage=unscheduled_pct,
    )


@router.get("/{member_key}/reports/weekly", response_model=WeeklyScheduleReportOut)
def get_weekly_schedule_report(
    member_key: str,
    week_start: date_type = Query(...),
    db: Session = Depends(get_db),
):
    _validate_member_key(member_key)

    # Matches the frontend's existing getWeekStart() convention
    # (web-view/index.html): Sunday-start, 7-day week ending Saturday.
    week_end = week_start + timedelta(days=6)

    scheduled, unscheduled = _count_scheduled_vs_unscheduled(
        db, member_key, week_start, week_end
    )
    total = scheduled + unscheduled
    scheduled_pct, unscheduled_pct = _percentages(scheduled, total)

    return WeeklyScheduleReportOut(
        member_key=member_key,
        week_start=week_start,
        week_end=week_end,
        scheduled_count=scheduled,
        unscheduled_count=unscheduled,
        total_count=total,
        scheduled_percentage=scheduled_pct,
        unscheduled_percentage=unscheduled_pct,
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

    category = classify_schedule_category(
        requested_category=payload.category,
        event_date=payload.date,
        created_at=created_at,
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

    # Category is permanent after creation. A client may resend the
    # existing value unchanged (drag/drop and resize both do this — see
    # web-view/index.html commitItemTimeChange) without effect; any
    # attempt to actually change it — Unscheduled -> Scheduled or
    # Scheduled -> Unscheduled — is rejected before any other field on
    # this row is touched.
    if "category" in update_data and update_data["category"] != event.category:
        raise HTTPException(
            status_code=422,
            detail="Task category is permanent after creation.",
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

    event.updated_at = datetime.now(timezone.utc)

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
