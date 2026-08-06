"""Staff Review Summaries endpoints (REQ-CAL-REV-001 — Reviewer-Owned Staff
Review Meeting Summaries).

Management Team members conduct review meetings about company staff (who
may be a non-management staff member or another Management Team member).
Each summary is authored by, and — through the end of its own creation day
only (REQ-CAL-REV-LOCK-004, 2026-08-06) — updated by the reviewer who
created it, never by the reviewed staff member. As of the 2026-08-03
revised business rule, every authenticated Management Team member may READ
summaries created by other Management Team members. Only the owning
reviewer may create records under their identity or update their own
summaries while their own edit window is still open; NO ONE may delete a
Review Summary at all any more (REQ-CAL-REV-LOCK-004 superseded the prior
owner-soft-delete rule — see delete_staff_review_summary below). Public
users, invalid tokens, and ordinary reviewed staff without a Management
Team token still have no access at all — see get_verified_member below.

Structural difference from backend/routers/member_leave.py: these routes
carry NO {member_key} URL path segment — the acting identity is always
"whoever the verified Calendar token says" (Depends(get_verified_member)),
so there is no separate URL-embedded identity to compare against, and
require_matching_member's 403-on-mismatch pattern does not apply.

Read (list/detail) vs. write (create/update/delete) now have DIFFERENT
scoping rules:
  - LIST is scoped to a "selected reviewer" — the optional
    ?reviewer_member_key= query parameter, defaulting to the acting member
    when omitted, validated against VALID_MEMBER_KEYS when supplied. This
    is a deliberate, explicit read-widening: any authenticated member may
    pass any other valid member's key to read that reviewer's history.
  - DETAIL is scoped to id + deleted_at IS NULL only — no owner filter at
    all — since any authenticated member may open any active summary by
    id (see _get_active_summary_or_404).
  - UPDATE remains scoped to id + reviewer_member_key = acting member +
    deleted_at IS NULL, mirroring backend/routers/member_leave.py's
    _get_active_record_or_404 pattern exactly (see
    _get_owned_summary_or_404) — cross-reviewer update still returns a
    non-disclosing 404 (never 403), since a 403 would confirm the
    record's existence/ownership to a non-owner. DELETE (REQ-CAL-REV-
    LOCK-004, 2026-08-06) no longer has any scoping at all — it rejects
    every caller identically without ever looking a record up; see
    delete_staff_review_summary below.

All five routes require a valid Calendar member token
(Depends(get_verified_member)) — including GET, a deliberate divergence
from Task/Leave's public-GET convention, justified by the private nature
of review content (approved requirement §8/§3). There is no public GET
route; an invalid or missing token is always 401 regardless of which
reviewer's records are requested.

Source contract: docs/2026-08-03_calendar-review-summaries-requirement.md
and docs/2026-08-03_calendar-review-summaries-technical-design.md.
REQ-CAL-REV-001 shared-read/owner-write revision:
validation/calendar-review-summaries-technical-design-check-2026-08-03.md.

REQ-CAL-REV-TAB-002 (2026-08-06) additive change: LIST gained one opt-in
?include_all_reviewers=true parameter (requires reviewed_staff_id, mutually
exclusive with reviewer_member_key) so the dedicated Review Summaries tab
can default to showing every reviewer's active summaries for one employee.
No other route or existing LIST behavior changed. See
docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md
§4.

REQ-CAL-REV-LOCK-004 (2026-08-06) — No-Delete and Same-Day Edit Lock:
  - DELETE is permanently disabled for every caller — creator, any other
    reviewer, alike — see delete_staff_review_summary below. The route is
    kept (for API/URL compatibility) but never mutates a row; it always
    returns 409 review_summary_delete_disabled once authentication
    passes. No frontend Delete control exists any more either
    (web-view/js/review-summaries.js).
  - UPDATE keeps its existing owner-only 404 gate (_get_owned_summary_or_404,
    unchanged) and ADDS a same-Asia/Colombo-calendar-day lock on top: the
    owning reviewer may only edit while colombo_date_of(record.created_at)
    equals colombo_today() — i.e. through 23:59:59 Asia/Colombo on the
    record's own creation date, permanently read-only from 00:00:00 the
    next Colombo day. meeting_date never affects this — only created_at
    does (approved business rule). See _can_edit_review_summary below.
  - Every read route (create/list/detail) now additionally returns a
    server-derived can_edit boolean (and an edit_deadline timestamp) on
    each record via _to_out — computed fresh on every read, never stored,
    reusing the exact same _can_edit_review_summary the UPDATE route's own
    enforcement uses, so the displayed affordance and the enforced rule
    can never disagree.
  - Zero schema/database changes — see backend/models.py (unmodified) and
    docs/2026-08-06_review-summary-no-delete-same-day-edit-technical-
    design.md.
"""

from datetime import date as date_type, datetime, time as time_type, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from zoneinfo import ZoneInfo

from backend.config import SCHEDULE_TIMEZONE, VALID_MEMBER_KEYS
from backend.database import get_db
from backend.models import StaffDashboardRecord, StaffReviewSummary
from backend.review_summary_pdf_export import (
    build_content_disposition_header,
    build_review_summary_pdf,
    reviewer_scope_label_for,
)
from backend.routers.calendar_auth import get_verified_member
from backend.schemas import (
    StaffReviewSummaryCreate,
    StaffReviewSummaryListResponse,
    StaffReviewSummaryOut,
    StaffReviewSummaryUpdate,
)
from backend.time_utils import colombo_date_of, colombo_today

_COLOMBO = ZoneInfo(SCHEDULE_TIMEZONE)

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
    """Used only by the UPDATE route (REQ-CAL-REV-LOCK-004, 2026-08-06:
    DELETE no longer looks up or owns any record at all — see
    delete_staff_review_summary below). Single combined query — id + owner
    + deleted_at IS NULL all in one filter call — so a
    nonexistent id, a soft-deleted id, and an id belonging to a different
    reviewer are indistinguishable by construction. This is what makes the
    404 non-disclosing: there is no separate "look up by id, then check
    owner" step that could leak existence via a different status code or
    timing."""
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


def _get_active_summary_or_404(db: Session, summary_id: UUID) -> StaffReviewSummary:
    """Used only by the read route (detail). No reviewer_member_key filter
    at all — any authenticated Management Team member may open any active
    summary by id (2026-08-03 revised business rule: shared read access).
    Still excludes soft-deleted rows, and still returns 404 (not the
    record) for a missing/deleted id."""
    record = (
        db.query(StaffReviewSummary)
        .filter(
            StaffReviewSummary.id == summary_id,
            StaffReviewSummary.deleted_at.is_(None),
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Review summary not found.")
    return record


def _review_summary_edit_deadline(created_at: datetime) -> datetime:
    """23:59:59 Asia/Colombo on created_at's own Colombo calendar date —
    the human-readable cutoff (approved business rule §5/§6). Informational
    only: returned on every record regardless of whether that instant has
    already passed, so a caller can always see when its own edit window
    closed/closes. Never persisted (backend/models.py has no such
    column)."""
    creation_date = colombo_date_of(created_at)
    return datetime.combine(creation_date, time_type(23, 59, 59), tzinfo=_COLOMBO)


def _can_edit_review_summary(created_at: datetime, today: Optional[date_type] = None) -> bool:
    """The sole edit-eligibility rule (REQ-CAL-REV-LOCK-004): true only
    while Asia/Colombo "today" is exactly created_at's own Colombo
    calendar date — never before (a future/anomalous created_at fails
    closed here too, since today != a later date is simply not-equal, the
    same as any other non-match) and never after. meeting_date plays no
    part in this decision at all. `today` is optional and injectable
    (mirrors time_utils.derive_task_outcome's identical pattern) purely so
    boundary tests stay deterministic — production callers always omit it
    and get colombo_today()."""
    if today is None:
        today = colombo_today()
    return colombo_date_of(created_at) == today


def _valid_reviewer_member_key_or_422(reviewer_member_key: str) -> str:
    """Validates an explicitly-supplied ?reviewer_member_key= against the
    same VALID_MEMBER_KEYS tuple backend/routers/member_leave.py validates
    its {member_key} URL path segment against (backend/config.py) — the
    set of Management Team member keys is not secret (every sidebar tab
    already names them), so rejecting an unknown key with 422 discloses
    nothing a client couldn't already see."""
    if reviewer_member_key not in VALID_MEMBER_KEYS:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown reviewer_member_key '{reviewer_member_key}'. "
            f"Must be one of {VALID_MEMBER_KEYS}.",
        )
    return reviewer_member_key


def _to_out(record: StaffReviewSummary, db: Session, acting_member: str) -> StaffReviewSummaryOut:
    """Live-joins to staff_dashboard_records for display name fields — no
    reviewed_staff_name_snapshot column exists (approved technical design
    §5), so history always shows the staff member's current name, not a
    name captured at review time.

    REQ-CAL-REV-LOCK-004: can_edit/edit_deadline are computed here, fresh
    on every call — never stored — so every read route (create/list/
    detail) shows the exact same, currently-true answer. can_edit is only
    ever true for acting_member == record.reviewer_member_key (the
    record's own creator); a non-owner reading a shared record always
    gets can_edit=False, matching "OTHER REVIEWER: no Edit control"."""
    staff = (
        db.query(StaffDashboardRecord)
        .filter(StaffDashboardRecord.id == record.reviewed_staff_id)
        .first()
    )
    is_owner = record.reviewer_member_key == acting_member
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
        can_edit=is_owner and _can_edit_review_summary(record.created_at),
        edit_deadline=_review_summary_edit_deadline(record.created_at),
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
    return _to_out(record, db, acting_member)


def _build_review_summary_query(
    db: Session,
    acting_member: str,
    reviewer_member_key: Optional[str],
    reviewed_staff_id: Optional[UUID],
    date_from: Optional[date_type],
    date_to: Optional[date_type],
    include_all_reviewers: bool,
):
    """Shared filter-building logic (REQ-CAL-REV-PDF-003 §5.2) — extracted,
    behavior-preserving, from list_staff_review_summaries's own inline
    validation+query construction. Both the LIST route and the PDF export
    route call this ONE function, so the two can never silently disagree
    about which rows a given (acting_member, filter) combination returns.
    Does not apply ordering, offset, or limit — callers add those
    themselves (LIST paginates; export does not, per requirement decision
    3/9 — "the complete active Review Summary history," never one page of
    it)."""
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must not be after date_to.")

    if include_all_reviewers:
        if reviewed_staff_id is None:
            raise HTTPException(
                status_code=422,
                detail="reviewed_staff_id is required when include_all_reviewers=true.",
            )
        if reviewer_member_key is not None:
            raise HTTPException(
                status_code=422,
                detail="reviewer_member_key and include_all_reviewers are mutually exclusive.",
            )
        query = db.query(StaffReviewSummary).filter(
            StaffReviewSummary.deleted_at.is_(None),
        )
    else:
        selected_reviewer = acting_member
        if reviewer_member_key is not None:
            selected_reviewer = _valid_reviewer_member_key_or_422(reviewer_member_key)
        query = db.query(StaffReviewSummary).filter(
            StaffReviewSummary.reviewer_member_key == selected_reviewer,
            StaffReviewSummary.deleted_at.is_(None),
        )

    if reviewed_staff_id is not None:
        query = query.filter(StaffReviewSummary.reviewed_staff_id == reviewed_staff_id)
    if date_from is not None:
        query = query.filter(StaffReviewSummary.meeting_date >= date_from)
    if date_to is not None:
        query = query.filter(StaffReviewSummary.meeting_date <= date_to)

    return query


@router.get("", response_model=StaffReviewSummaryListResponse)
def list_staff_review_summaries(
    response: Response,
    reviewer_member_key: Optional[str] = Query(default=None),
    reviewed_staff_id: Optional[UUID] = Query(default=None),
    date_from: Optional[date_type] = Query(default=None),
    date_to: Optional[date_type] = Query(default=None),
    include_all_reviewers: bool = Query(default=False),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Scoped to a "selected reviewer" (2026-08-03 revised business rule):
    ?reviewer_member_key= is optional and, when omitted, defaults to the
    authenticated acting member — the prior owner-only behavior is
    therefore unchanged for a caller that never passes the parameter. When
    supplied, it is validated against VALID_MEMBER_KEYS and the query is
    scoped to THAT reviewer's rows instead — any authenticated Management
    Team member may read any other valid reviewer's history this way; a
    valid token is still always required (Depends(get_verified_member)).
    Ordered meeting_date DESC, created_at DESC (approved requirement
    §6/§9), the exact reverse-direction mirror of member_leave.py's
    asc(start_date), asc(created_at).

    include_all_reviewers=true (REQ-CAL-REV-TAB-002, 2026-08-06 — dedicated
    tab's "All reviewers" default) is a strictly separate, additive branch:
    when true, reviewed_staff_id is required (422 otherwise — prevents an
    unscoped every-reviewer/every-employee scan) and reviewer_member_key
    must be omitted (422 if both are supplied — the two parameters express
    mutually exclusive UI states). The query then drops the
    reviewer_member_key filter entirely and returns every reviewer's active
    summaries for that one employee. When include_all_reviewers is omitted
    or false (its default), this entire branch is inert and the
    single-reviewer behavior above is byte-for-byte unchanged — including
    the omitted-reviewer_member_key-defaults-to-self case."""
    _set_no_store(response)

    query = _build_review_summary_query(
        db, acting_member, reviewer_member_key, reviewed_staff_id,
        date_from, date_to, include_all_reviewers,
    )

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
        records=[_to_out(record, db, acting_member) for record in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/export/pdf")
def export_staff_review_summaries_pdf(
    response: Response,
    reviewed_staff_id: UUID = Query(...),
    reviewer_member_key: Optional[str] = Query(default=None),
    include_all_reviewers: bool = Query(default=False),
    date_from: Optional[date_type] = Query(default=None),
    date_to: Optional[date_type] = Query(default=None),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Authorized Employee Review Summary PDF export (REQ-CAL-REV-PDF-003).

    Declared here — before GET /{summary_id} below — so a request to
    /export/pdf can never be captured by that dynamic route (which would
    otherwise attempt to parse "export" as a UUID and reject it with 422
    before this handler ever runs); this source-order placement is a
    deliberate, documented safeguard (technical design §5.1), not
    incidental. /export/pdf is also a two-path-segment literal, a distinct
    shape from /{summary_id}'s single segment, so the two cannot collide
    under any registration order — this placement is defense in depth on
    top of that structural fact, not the only thing preventing collision.

    Read-only: no db.add/db.commit anywhere in this path, matching
    xlsx_export.py's own documented read-only guarantee. Reuses
    _build_review_summary_query (§5.2) — the exact same filter/soft-delete/
    authorization logic LIST already uses — so an export can never return a
    record LIST would not also return for the same acting member and
    filters. reviewed_staff_id is required here independent of the
    include_all_reviewers-requires-reviewed_staff_id rule inside the shared
    function, closing the gap where a specific-reviewer export could
    otherwise omit it.

    Zero matching active records -> 404 with a generic detail message, no
    PDF bytes generated at all (requirement §5.10, corrected round 1) —
    never a blank/misleading PDF.

    Cache-Control on the success path is set directly on the Response
    object this function returns (below), NOT via _set_no_store(response)
    alone — when a route handler returns a Response instance directly (as
    this one does, for the binary PDF body), FastAPI uses that returned
    object as-is rather than merging headers set on the separately
    injected `response` dependency. _set_no_store(response) is still
    called for consistency with every other route on this router."""
    _set_no_store(response)
    staff = _reviewed_staff_or_422(db, reviewed_staff_id)

    query = _build_review_summary_query(
        db, acting_member, reviewer_member_key, reviewed_staff_id,
        date_from, date_to, include_all_reviewers,
    )
    rows = (
        query.order_by(
            StaffReviewSummary.meeting_date.desc(), StaffReviewSummary.created_at.desc()
        )
        .all()
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No review summaries match the selected filters.",
        )

    records = [
        {
            "reviewer_member_key": row.reviewer_member_key,
            "meeting_date": row.meeting_date,
            "summary_text": row.summary_text,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
        for row in rows
    ]

    if include_all_reviewers:
        reviewer_scope_label = "All reviewers"
    elif reviewer_member_key is not None:
        # "Mayurika — HR" (Phase 7, FIX-02) — the full "Name — Role" form
        # for a specific-reviewer scope line, not just the bare name.
        reviewer_scope_label = reviewer_scope_label_for(reviewer_member_key)
    else:
        reviewer_scope_label = reviewer_scope_label_for(acting_member)

    employee_label = staff.full_name or staff.calling_name or "Unknown staff record"
    generated_at_local = datetime.now(timezone.utc).astimezone(_COLOMBO)

    pdf_bytes = build_review_summary_pdf(
        reviewed_staff_label=employee_label,
        reviewer_scope_label=reviewer_scope_label,
        date_from=date_from,
        date_to=date_to,
        generated_at_local=generated_at_local,
        records=records,
    )
    content_disposition = build_content_disposition_header(employee_label, date_type.today())

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": content_disposition,
            "Cache-Control": "no-store",
        },
    )


@router.get("/{summary_id}", response_model=StaffReviewSummaryOut)
def get_staff_review_summary(
    summary_id: UUID,
    response: Response,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Any authenticated Management Team member may open any active
    summary by id (2026-08-03 revised business rule) — acting_member is
    still required (a valid token gates the route at all) but is not used
    to filter the lookup; see _get_active_summary_or_404."""
    _set_no_store(response)
    record = _get_active_summary_or_404(db, summary_id)
    return _to_out(record, db, acting_member)


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
    pattern.

    REQ-CAL-REV-LOCK-004 (2026-08-06): the pre-existing owner-only 404 gate
    (_get_owned_summary_or_404) still runs FIRST and is unchanged — a
    cross-reviewer or nonexistent id is still a non-disclosing 404, exactly
    as before. Only once ownership is confirmed does the new same-Colombo-
    calendar-day check run; a locked (owned but not-today) record is
    rejected with 409, never a silent no-op and never a 200. No request
    field can ever reach reviewer_member_key/created_at/an edit deadline —
    StaffReviewSummaryUpdate (backend/schemas.py) has no such fields, so
    there is nothing here to strip; the schema itself is the enforcement."""
    _set_no_store(response)
    record = _get_owned_summary_or_404(db, summary_id, acting_member)

    if not _can_edit_review_summary(record.created_at):
        return JSONResponse(
            status_code=409,
            content={
                "error": "review_summary_edit_locked",
                "message": "Editing period ended. This review summary is now read-only.",
            },
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "meeting_date" in update_data:
        record.meeting_date = update_data["meeting_date"]
    if "summary_text" in update_data:
        record.summary_text = update_data["summary_text"]

    record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(record)
    return _to_out(record, db, acting_member)


@router.delete("/{summary_id}", status_code=409)
def delete_staff_review_summary(
    summary_id: UUID,
    response: Response,
    acting_member: str = Depends(get_verified_member),
):
    """REQ-CAL-REV-LOCK-004 (2026-08-06): No user may delete a Review
    Summary — the approved business rule is a blanket prohibition, not an
    ownership rule, so this now rejects EVERY caller identically (the
    record's own creator, any other reviewer alike), with no lookup, no
    owner check, and no row touched at all. The route is kept only for API
    URL compatibility (a client that still POSTs a DELETE gets a clear,
    typed rejection instead of a 404/405) — Depends(get_verified_member)
    still gates it, so a missing/invalid token is still 401 before this
    body ever runs (same as every other route on this router). 409 (not
    403) mirrors this codebase's own established convention for "this
    mutation is permanently blocked by a business rule" — see
    backend/routers/member_schedules.py's delete_member_schedule_event
    (409 outcome_recorded_immutable) for the identical precedent. Never
    returns 200/204; never sets deleted_at; never calls db.commit()."""
    _set_no_store(response)
    return JSONResponse(
        status_code=409,
        content={
            "error": "review_summary_delete_disabled",
            "message": "Review summaries can't be deleted. This record is permanent.",
        },
    )
