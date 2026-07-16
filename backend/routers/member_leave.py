"""Member leave coordination-copy endpoints (REQ-LEAVE-COPY-001).

This feature is a calendar coordination copy of leave, never official HR
leave truth. Every output includes coordination_copy_only=true and an
official_truth_notice stating the separate HR leave system remains
official. No route here calculates or claims official leave balance,
payroll, no-pay status, disciplinary status, or medical truth.

Lifecycle (2026-07-16 simplification amendment — REQ-LEAVE-COPY-001
SIMPLIFICATION AMENDMENT): there is no approval/status workflow. Every
saved leave record is immediately active — it appears in the normal
calendar, blocks conflicting task saves, and contributes leave-deduction
minutes as soon as it is created. The only way to remove a leave record is
DELETE, which soft-deletes it (deleted_at). A row's existence with
deleted_at IS NULL is its active state; no status/active-inactive enum
column exists.

No authentication or role-based authorization exists anywhere in this
router (matches the existing member-schedules access model) —
created_by/updated_by, if supplied, are optional unauthenticated free-text
labels only.

Source contract: docs/2026-07-16_management-calendar-leave-copy-requirement.md
and docs/management-calendar-leave-copy-design.md.
"""

from datetime import date as date_type, datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc
from sqlalchemy.orm import Session

from backend.config import (
    LEAVE_COORDINATION_COPY_NOTICE,
    LEAVE_FULL_DAY_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES,
    LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES,
    LEAVE_POLICY_SOURCE_ID,
    MEMBER_LABELS,
    SHORT_LEAVE_MONTHLY_CAP_MINUTES,
    VALID_MEMBER_KEYS,
)
from backend.database import get_db
from backend.models import MemberLeaveRecord
from backend.routers import leave_logic
from backend.schemas import (
    LeaveConfigurationOut,
    LeaveSummaryOut,
    MemberLeaveRecordCreate,
    MemberLeaveRecordOut,
    MemberLeaveRecordUpdate,
)

router = APIRouter(prefix="/api/member-leave", tags=["member-leave"])


def _validate_member_key(member_key: str) -> str:
    if member_key not in VALID_MEMBER_KEYS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown member_key '{member_key}'. Must be one of {VALID_MEMBER_KEYS}.",
        )
    return member_key


def _get_active_record_or_404(
    db: Session, member_key: str, leave_id: UUID
) -> MemberLeaveRecord:
    record = (
        db.query(MemberLeaveRecord)
        .filter(
            MemberLeaveRecord.id == leave_id,
            MemberLeaveRecord.member_key == member_key,
            MemberLeaveRecord.deleted_at.is_(None),
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Leave record not found.")
    return record


def _to_out(record: MemberLeaveRecord) -> MemberLeaveRecordOut:
    """Explicit field-by-field construction rather than
    MemberLeaveRecordOut.model_validate(record, from_attributes=True) —
    official_truth_notice has no corresponding ORM column, so this avoids
    depending on Pydantic's from_attributes default-fallback behavior for a
    field the source object doesn't define at all."""
    return MemberLeaveRecordOut(
        id=record.id,
        member_key=record.member_key,
        member_label=record.member_label,
        leave_type=record.leave_type,
        half_day_period=record.half_day_period,
        start_date=record.start_date,
        end_date=record.end_date,
        start_time=record.start_time,
        end_time=record.end_time,
        purpose=record.purpose,
        external_reference=record.external_reference,
        coordination_copy_only=record.coordination_copy_only,
        policy_source_id=record.policy_source_id,
        effective_leave_minutes=record.effective_leave_minutes,
        created_by=record.created_by,
        updated_by=record.updated_by,
        created_at=record.created_at,
        updated_at=record.updated_at,
        official_truth_notice=LEAVE_COORDINATION_COPY_NOTICE,
    )


@router.get("/{member_key}", response_model=List[MemberLeaveRecordOut])
def list_member_leave_records(
    member_key: str,
    start_date: Optional[date_type] = Query(default=None),
    end_date: Optional[date_type] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Every active leave row (deleted_at IS NULL). There is no
    Pending/Approved/Rejected/Cancelled workflow — a saved record is
    immediately active and stays that way until deleted; a deleted record
    is server-side excluded here, not merely hidden by the frontend."""
    _validate_member_key(member_key)

    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must not be after end_date.")

    query = db.query(MemberLeaveRecord).filter(
        MemberLeaveRecord.member_key == member_key,
        MemberLeaveRecord.deleted_at.is_(None),
    )
    if start_date is not None:
        query = query.filter(MemberLeaveRecord.end_date >= start_date)
    if end_date is not None:
        query = query.filter(MemberLeaveRecord.start_date <= end_date)

    query = query.order_by(asc(MemberLeaveRecord.start_date), asc(MemberLeaveRecord.created_at))
    return [_to_out(record) for record in query.all()]


@router.post("/{member_key}", response_model=MemberLeaveRecordOut, status_code=201)
def create_member_leave_record(
    member_key: str,
    payload: MemberLeaveRecordCreate,
    db: Session = Depends(get_db),
):
    """Every new record is immediately active — there is no Pending/Approved
    workflow to move through. effective_leave_minutes is computed and
    snapshotted right here, at creation, not left NULL pending a later
    approval step. A Short Leave create is blocked before it is stored if
    it would push the member's active monthly Short Leave total over the
    cap."""
    _validate_member_key(member_key)

    try:
        leave_logic.validate_leave_dates_and_times(
            payload.leave_type,
            payload.start_date,
            payload.end_date,
            payload.start_time,
            payload.end_time,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    effective_minutes = leave_logic.compute_effective_leave_minutes(
        payload.leave_type, payload.start_date, payload.end_date, payload.start_time, payload.end_time
    )

    if payload.leave_type == "Short Leave":
        try:
            leave_logic.assert_active_short_leave_monthly_cap_not_exceeded(
                db, member_key, payload.start_date, effective_minutes
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    now = datetime.now(timezone.utc)
    half_day_period = leave_logic.half_day_period_for_leave_type(payload.leave_type)

    record = MemberLeaveRecord(
        member_key=member_key,
        member_label=MEMBER_LABELS[member_key],
        leave_type=payload.leave_type,
        half_day_period=half_day_period,
        start_date=payload.start_date,
        end_date=payload.end_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        purpose=payload.purpose,
        external_reference=payload.external_reference,
        coordination_copy_only=True,
        policy_source_id=LEAVE_POLICY_SOURCE_ID,
        effective_leave_minutes=effective_minutes,
        created_by=payload.created_by,
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_out(record)


@router.put("/{member_key}/{leave_id}", response_model=MemberLeaveRecordOut)
def update_member_leave_record(
    member_key: str,
    leave_id: UUID,
    payload: MemberLeaveRecordUpdate,
    db: Session = Depends(get_db),
):
    """Edits fields on an active leave record. leave_type and
    half_day_period are never editable (immutable after creation, same
    convention as task category immutability). A soft-deleted record
    cannot be edited (_get_active_record_or_404 excludes it, returning
    404). Any date/time field change re-validates the leave shape,
    recalculates effective_leave_minutes in this same transaction, and — for
    Short Leave — re-checks the *destination* month's active cap, excluding
    this record's own prior contribution."""
    _validate_member_key(member_key)
    record = _get_active_record_or_404(db, member_key, leave_id)

    update_data = payload.model_dump(exclude_unset=True)

    new_start_date = update_data.get("start_date", record.start_date)
    new_end_date = update_data.get("end_date", record.end_date)
    new_start_time = update_data.get("start_time", record.start_time)
    new_end_time = update_data.get("end_time", record.end_time)

    fields_changed = any(
        key in update_data for key in ("start_date", "end_date", "start_time", "end_time")
    )

    new_effective_minutes = record.effective_leave_minutes
    if fields_changed:
        try:
            leave_logic.validate_leave_dates_and_times(
                record.leave_type, new_start_date, new_end_date, new_start_time, new_end_time
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        new_effective_minutes = leave_logic.compute_effective_leave_minutes(
            record.leave_type, new_start_date, new_end_date, new_start_time, new_end_time
        )

        if record.leave_type == "Short Leave":
            try:
                leave_logic.assert_active_short_leave_monthly_cap_not_exceeded(
                    db, member_key, new_start_date, new_effective_minutes, exclude_id=record.id
                )
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc)) from exc

    # Apply field edits only after all validation above has passed.
    if "start_date" in update_data:
        record.start_date = update_data["start_date"]
    if "end_date" in update_data:
        record.end_date = update_data["end_date"]
    if "start_time" in update_data:
        record.start_time = update_data["start_time"]
    if "end_time" in update_data:
        record.end_time = update_data["end_time"]
    if "purpose" in update_data:
        record.purpose = update_data["purpose"]
    if "external_reference" in update_data:
        record.external_reference = update_data["external_reference"]
    if "updated_by" in update_data:
        record.updated_by = update_data["updated_by"]

    if fields_changed:
        record.effective_leave_minutes = new_effective_minutes

    record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return _to_out(record)


@router.delete("/{member_key}/{leave_id}", status_code=200)
def delete_member_leave_record(
    member_key: str, leave_id: UUID, db: Session = Depends(get_db)
):
    """Soft-deletes an active leave record — the only removal mechanism now
    that there is no Cancelled/Rejected status. A deleted record
    immediately stops appearing in GET, stops blocking conflicting task
    saves, and stops contributing leave-deduction minutes to reports.
    Repeating this call on an already-deleted (or nonexistent) id returns
    404, matching the existing member_schedules delete convention
    (_get_active_event_or_404 in backend/routers/member_schedules.py)."""
    _validate_member_key(member_key)
    record = _get_active_record_or_404(db, member_key, leave_id)

    record.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": str(record.id), "deleted": True}


@router.get("/{member_key}/summary", response_model=LeaveSummaryOut)
def get_member_leave_summary(
    member_key: str,
    month: str = Query(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    db: Session = Depends(get_db),
):
    _validate_member_key(member_key)

    year_str, month_str = month.split("-")
    year, month_number = int(year_str), int(month_str)

    active_minutes = leave_logic.compute_short_leave_active_minutes_for_month(
        db, member_key, year, month_number
    )
    remaining = max(SHORT_LEAVE_MONTHLY_CAP_MINUTES - active_minutes, 0)

    return LeaveSummaryOut(
        member_key=member_key,
        month=month,
        short_leave_active_minutes=active_minutes,
        short_leave_cap_minutes=SHORT_LEAVE_MONTHLY_CAP_MINUTES,
        short_leave_remaining_minutes=remaining,
        configuration=LeaveConfigurationOut(
            half_day_first_deduction_minutes=LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES,
            half_day_second_deduction_minutes=LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES,
            full_day_deduction_minutes=LEAVE_FULL_DAY_DEDUCTION_MINUTES,
            short_leave_monthly_cap_minutes=SHORT_LEAVE_MONTHLY_CAP_MINUTES,
        ),
    )
