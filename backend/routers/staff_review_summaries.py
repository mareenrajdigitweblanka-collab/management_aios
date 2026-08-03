"""Staff Review Summaries endpoints (REQ-CAL-REV-001 — Reviewer-Owned Staff
Review Meeting Summaries).

Management Team members conduct review meetings about company staff (who
may be a non-management staff member or another Management Team member).
Each summary is privately owned by the reviewer who created it — never by
the reviewed staff member. Only the owning reviewer may create, view,
update, or soft-delete their own summaries; other reviewers cannot
discover or access them; the reviewed staff member has no access in
Phase 1.

Structural difference from backend/routers/member_leave.py: these routes
carry NO {member_key} URL path segment — ownership is always "whoever the
verified Calendar token says," so there is no separate URL-embedded
identity to compare against, and require_matching_member's 403-on-mismatch
pattern does not apply. Every filter is instead an implicit
`WHERE reviewer_member_key = acting_member` added directly to each query,
mirroring how backend/routers/member_leave.py's _get_active_record_or_404
already combines id + owner + deleted_at IS NULL in one filter call — just
substituting the token-derived value for the URL one. Cross-reviewer
detail/update/delete access returns a non-disclosing 404 (never 403),
since a 403 would confirm the record's existence to a non-owner.

All five routes require a valid Calendar member token
(Depends(get_verified_member)) — including GET, a deliberate divergence
from Task/Leave's public-GET convention, justified by the private nature
of review content (approved requirement §8/§3).

Source contract: docs/2026-08-03_calendar-review-summaries-requirement.md
and docs/2026-08-03_calendar-review-summaries-technical-design.md.
"""

from datetime import date as date_type, datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import StaffDashboardRecord, StaffReviewSummary
from backend.routers.calendar_auth import get_verified_member
from backend.schemas import (
    StaffReviewSummaryCreate,
    StaffReviewSummaryListResponse,
    StaffReviewSummaryOut,
    StaffReviewSummaryUpdate,
)

router = APIRouter(prefix="/api/staff-review-summaries", tags=["staff-review-summaries"])

DEFAULT_LIMIT = 50
MAX_LIMIT = 500


def _set_no_store(response: Response) -> None:
    """Private, reviewer-owned content must never be cached by a shared
    cache or the browser's own HTTP cache — a deliberate, new convention
    for this feature (no existing route in this backend sets an explicit
    cache header; see the technical design's privacy-controls section)."""
    response.headers["Cache-Control"] = "no-store"


def _reviewed_staff_or_422(db: Session, reviewed_staff_id: UUID) -> StaffDashboardRecord:
    """reviewed_staff_id must resolve to an existing staff row — an
    unknown id is a client input error (422), not a 404 (404 is reserved
    for "authenticated but not this reviewer's record" on the other four
    routes). Deliberately does NOT filter on staff_status/is_current — a
    reviewer may record a summary about an inactive/departed staff member
    (e.g. an exit-review discussion); the selector's active-by-default UI
    behavior is a convenience, not a server-enforced rule."""
    staff = (
        db.query(StaffDashboardRecord)
        .filter(StaffDashboardRecord.id == reviewed_staff_id)
        .first()
    )
    if staff is None:
        raise HTTPException(
            status_code=422,
            detail="reviewed_staff_id does not match an existing staff record.",
        )
    return staff


def _get_owned_summary_or_404(
    db: Session, summary_id: UUID, acting_member: str
) -> StaffReviewSummary:
    """Single combined query — id + owner + deleted_at IS NULL all in one
    filter call — so a nonexistent id, a soft-deleted id, and an id
    belonging to a different reviewer are indistinguishable by
    construction. This is what makes the 404 non-disclosing: there is no
    separate "look up by id, then check owner" step that could leak
    existence via a different status code or timing."""
    record = (
        db.query(StaffReviewSummary)
        .filter(
            StaffReviewSummary.id == summary_id,
            StaffReviewSummary.reviewer_member_key == acting_member,
            StaffReviewSummary.deleted_at.is_(None),
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Review summary not found.")
    return record


def _to_out(record: StaffReviewSummary, db: Session) -> StaffReviewSummaryOut:
    """Live-joins to staff_dashboard_records for display name fields — no
    reviewed_staff_name_snapshot column exists (approved technical design
    §5), so history always shows the staff member's current name, not a
    name captured at review time."""
    staff = (
        db.query(StaffDashboardRecord)
        .filter(StaffDashboardRecord.id == record.reviewed_staff_id)
        .first()
    )
    return StaffReviewSummaryOut(
        id=record.id,
        reviewer_member_key=record.reviewer_member_key,
        reviewed_staff_id=record.reviewed_staff_id,
        reviewed_staff_full_name=staff.full_name if staff else None,
        reviewed_staff_calling_name=staff.calling_name if staff else None,
        meeting_date=record.meeting_date,
        summary_text=record.summary_text,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.post("", response_model=StaffReviewSummaryOut, status_code=201)
def create_staff_review_summary(
    payload: StaffReviewSummaryCreate,
    response: Response,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """reviewer_member_key is assigned from the verified token only — it
    is not declared on StaffReviewSummaryCreate at all, so a client cannot
    send it, spoof it, or override it regardless of request body content.
    Multiple summaries for the same reviewer+staff+date are allowed — no
    uniqueness constraint (approved requirement §7)."""
    _set_no_store(response)
    _reviewed_staff_or_422(db, payload.reviewed_staff_id)

    now = datetime.now(timezone.utc)
    record = StaffReviewSummary(
        reviewer_member_key=acting_member,
        reviewed_staff_id=payload.reviewed_staff_id,
        meeting_date=payload.meeting_date,
        summary_text=payload.summary_text,
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_out(record, db)


@router.get("", response_model=StaffReviewSummaryListResponse)
def list_staff_review_summaries(
    response: Response,
    reviewed_staff_id: Optional[UUID] = Query(default=None),
    date_from: Optional[date_type] = Query(default=None),
    date_to: Optional[date_type] = Query(default=None),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Every query is unconditionally scoped to
    `reviewer_member_key = acting_member` — there is no route or query
    parameter that can ever return another reviewer's rows. Ordered
    meeting_date DESC, created_at DESC (approved requirement §6/§9), the
    exact reverse-direction mirror of member_leave.py's
    asc(start_date), asc(created_at)."""
    _set_no_store(response)

    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must not be after date_to.")

    query = db.query(StaffReviewSummary).filter(
        StaffReviewSummary.reviewer_member_key == acting_member,
        StaffReviewSummary.deleted_at.is_(None),
    )
    if reviewed_staff_id is not None:
        query = query.filter(StaffReviewSummary.reviewed_staff_id == reviewed_staff_id)
    if date_from is not None:
        query = query.filter(StaffReviewSummary.meeting_date >= date_from)
    if date_to is not None:
        query = query.filter(StaffReviewSummary.meeting_date <= date_to)

    total = query.with_entities(func.count(StaffReviewSummary.id)).scalar()

    rows = (
        query.order_by(
            StaffReviewSummary.meeting_date.desc(), StaffReviewSummary.created_at.desc()
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return StaffReviewSummaryListResponse(
        records=[_to_out(record, db) for record in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{summary_id}", response_model=StaffReviewSummaryOut)
def get_staff_review_summary(
    summary_id: UUID,
    response: Response,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    _set_no_store(response)
    record = _get_owned_summary_or_404(db, summary_id, acting_member)
    return _to_out(record, db)


@router.put("/{summary_id}", response_model=StaffReviewSummaryOut)
def update_staff_review_summary(
    summary_id: UUID,
    payload: StaffReviewSummaryUpdate,
    response: Response,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """reviewed_staff_id is never editable here (StaffReviewSummaryUpdate
    has no such field) — Phase 1 has no requirement for reassigning who
    was reviewed. created_at is never touched; updated_at is refreshed on
    every successful update, mirroring member_leave.py's identical
    pattern."""
    _set_no_store(response)
    record = _get_owned_summary_or_404(db, summary_id, acting_member)

    update_data = payload.model_dump(exclude_unset=True)
    if "meeting_date" in update_data:
        record.meeting_date = update_data["meeting_date"]
    if "summary_text" in update_data:
        record.summary_text = update_data["summary_text"]

    record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return _to_out(record, db)


@router.delete("/{summary_id}", status_code=200)
def delete_staff_review_summary(
    summary_id: UUID,
    response: Response,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Soft delete only — sets deleted_at, never issues a hard DELETE.
    Repeating this call on an already-deleted (or nonexistent, or
    cross-reviewer) id returns 404, matching the existing
    member_leave.py delete convention."""
    _set_no_store(response)
    record = _get_owned_summary_or_404(db, summary_id, acting_member)

    record.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": str(record.id), "deleted": True}
