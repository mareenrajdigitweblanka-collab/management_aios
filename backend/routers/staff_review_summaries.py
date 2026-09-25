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

REQ-CAL-REV-MD-READ-006 (2026-08-06) — MD Read-Only Review Summary
Authorization:
  - MD (backend/config.py MD_MEMBER_KEY = "md") is a separate, additive
    read-only identity — NOT a Management Team member, NOT in
    VALID_MEMBER_KEYS, and never a valid reviewer_member_key (the DB CHECK
    constraint on that column still only allows the original five keys).
  - LIST, DETAIL, and PDF export required NO code change here: all three
    already grant "any authenticated Management Team member" shared read
    access with no owner filter (2026-08-03 revised business rule) or, for
    LIST/PDF-export's optional reviewer filter, validate against
    VALID_MEMBER_KEYS unchanged — MD simply becomes one more identity that
    Depends(get_verified_member) can successfully resolve.
  - CREATE and UPDATE explicitly reject MD FIRST, before any other
    validation or database access, via _reject_md_write below — see that
    function's own docstring for why this is 403, not the usual
    non-disclosing 404.
  - DELETE needed no change: it already rejects every caller identically
    with 409, regardless of identity (REQ-CAL-REV-LOCK-004).
"""

import mimetypes
import re
import time
import unicodedata
import urllib.parse
import zipfile
from datetime import date as date_type, datetime, time as time_type, timezone
from io import BytesIO
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile
from fastapi.responses import JSONResponse
from psycopg.errors import UndefinedTable
from sqlalchemy import func
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from zoneinfo import ZoneInfo

from backend.attachment_claim import AttachmentClaimError, claim_pending_attachments_for_summary
from backend.attachment_storage import (
    AttachmentStorage,
    AttachmentStorageUnavailable,
    build_storage_public_id,
    get_attachment_storage,
)
from backend.config import (
    ATTACHMENT_EXTENSION_TYPES,
    ATTACHMENT_TYPE_STORAGE_RESOURCE_TYPE,
    HISTORY_PDF_EXPORT_TIME_BUDGET_SECONDS,
    MAX_ATTACHMENT_FILE_SIZE_BYTES,
    MAX_ATTACHMENTS_PER_SUMMARY,
    MAX_EMBEDDABLE_ATTACHMENT_BYTES_FOR_PDF,
    MAX_HISTORY_PDF_EXPORT_ATTACHMENT_BYTES,
    MAX_HISTORY_PDF_EXPORT_RECORDS,
    MAX_HISTORY_PDF_EXPORT_TOTAL_PAGES,
    MD_MEMBER_KEY,
    SCHEDULE_TIMEZONE,
    VALID_MEMBER_KEYS,
    is_local_prototype_attachments_enabled,
)
from backend.database import get_db
from backend.local_attachment_metadata import (
    local_claim_attachments,
    local_get_attachment_for_summary,
    local_get_pending_by_ids,
    local_insert_pending_attachment,
    local_list_attachments_for_summary,
)
from backend.models import StaffDashboardRecord, StaffReviewSummary, StaffReviewSummaryAttachment
from backend.review_summary_pdf_export import (
    append_office_conversions,
    append_pdf_attachments,
    build_all_reviews_content_disposition_header,
    build_content_disposition_header,
    build_review_summary_pdf,
    build_review_summary_pdf_filename,
    build_review_summary_zip_filename,
    count_pdf_pages,
    reviewer_scope_label_for,
)
from backend.routers.calendar_auth import get_verified_member
from backend.schemas import (
    StaffReviewSummaryAttachmentOut,
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


# ── Attachments (REQ-CAL-REV-ATTACH-001, 2026-09-23) ─────────────────────

_UNSAFE_ATTACHMENT_FILENAME_CHARS_RE = re.compile(r'[\\/:*?"<>|\r\n\t\x00-\x1f]')
_ATTACHMENT_FILENAME_FALLBACK = "attachment"


def sanitize_attachment_filename(raw: Optional[str]) -> str:
    """Human-readable, filesystem/HTTP-header-safe display filename for a
    stored attachment (StaffReviewSummaryAttachment.original_filename) —
    same "strip path separators, control characters, and .. traversal
    segments" convention as backend/review_summary_pdf_export.py's own
    _sanitize_filename_component, but this one preserves the extension
    unconditionally (it must still classify correctly via
    ATTACHMENT_EXTENSION_TYPES) and keeps spaces. This value is NEVER used
    to derive the storage key (see build_storage_public_id) — it is
    display/download metadata only."""
    if not raw:
        return _ATTACHMENT_FILENAME_FALLBACK
    text = unicodedata.normalize("NFKC", raw).strip()
    text = text.replace("..", "")
    text = text.replace("/", "_").replace("\\", "_")
    text = _UNSAFE_ATTACHMENT_FILENAME_CHARS_RE.sub("_", text)
    text = text.strip(" .")
    if not text:
        return _ATTACHMENT_FILENAME_FALLBACK
    return text[:255]


def _content_disposition_value(filename: str) -> str:
    """Same RFC 5987/6266 double-form (ASCII filename= plus UTF-8
    filename*=) build_content_disposition_header already uses for the PDF
    export — reused here for individual attachment downloads and the ZIP
    export so every binary-download route in this file shares one
    approach. urllib.parse.quote(..., safe='') percent-encodes any control
    character, so this can never be used for header injection regardless
    of input."""
    normalized = unicodedata.normalize("NFKD", filename)
    ascii_name = normalized.encode("ascii", "ignore").decode("ascii").strip() or _ATTACHMENT_FILENAME_FALLBACK
    ascii_name = ascii_name.replace('"', "")
    encoded_utf8 = urllib.parse.quote(filename, safe="")
    return 'attachment; filename="' + ascii_name + '"; filename*=UTF-8\'\'' + encoded_utf8


def _classify_attachment_extension(filename: str) -> Optional[str]:
    """Returns the attachment_type ('audio'/'word'/'excel'/'image'/'pdf')
    for a filename's extension, or None for an unsupported/missing
    extension. The SOLE source of truth for what kind of file was
    uploaded — the client-declared Content-Type header is never trusted
    for this decision (backend/config.py ATTACHMENT_EXTENSION_TYPES
    docstring)."""
    lowered = filename.lower()
    for ext, attachment_type in ATTACHMENT_EXTENSION_TYPES.items():
        if lowered.endswith(ext):
            return attachment_type
    return None


def _resolve_attachment_content_type(filename: str, attachment_type: str) -> str:
    """Server-derived Content-Type (via Python's own mimetypes module),
    never the client-declared one — the request's declared content-type is
    read nowhere in this module. Falls back to a generic, always-safe
    value per coarse category when mimetypes cannot guess (e.g. an
    unusual but still-allowed extension)."""
    guessed, _encoding = mimetypes.guess_type(filename)
    if guessed:
        return guessed
    fallback_by_type = {
        "audio": "application/octet-stream",
        "word": "application/octet-stream",
        "excel": "application/octet-stream",
        "image": "application/octet-stream",
        "pdf": "application/pdf",
    }
    return fallback_by_type.get(attachment_type, "application/octet-stream")


def _attachment_to_out(record: StaffReviewSummaryAttachment) -> StaffReviewSummaryAttachmentOut:
    return StaffReviewSummaryAttachmentOut.model_validate(record)


# ── Missing-migration guard (2026-09-23) ──────────────────────────────────
#
# database/migrations/2026-09-23-create-staff-review-summary-attachments.sql
# may not have been applied to every environment yet (e.g. a local backend
# whose database role lacks the REFERENCES privilege the migration's
# foreign key needs — a real, observed local-environment gap, never
# something this backend can silently work around by touching the
# database itself). Before this guard existed, that produced an
# UNHANDLED psycopg.errors.UndefinedTable that propagated all the way to
# Starlette's ServerErrorMiddleware — which returns its fallback 500
# response via the ORIGINAL send callable, bypassing CORSMiddleware's own
# response-header injection entirely (CORSMiddleware only adds headers to
# responses that flow back out through its own wrapped `send`). The
# browser therefore saw a response with no Access-Control-Allow-Origin
# header at all and reported it as a bare network failure ("Failed to
# fetch" / "We couldn't connect") — never the real reason, and
# indistinguishable from an actual connectivity problem.
#
# Every call site below that queries or writes StaffReviewSummaryAttachment
# goes through _is_missing_attachment_table_error / the two helpers
# immediately following it, so a missing table always becomes a clean,
# typed HTTPException — which DOES flow through the normal Starlette
# exception-handling path (caught by ExceptionMiddleware, still inside
# CORSMiddleware's wrapped call), so the browser always receives a real,
# readable, CORS-correct response instead of an opaque connection error.
_ATTACHMENT_STORAGE_NOT_READY_MESSAGE = (
    "Attachment storage is not ready: database migration required."
)


def _is_missing_attachment_table_error(exc: Exception) -> bool:
    return isinstance(exc, ProgrammingError) and isinstance(exc.orig, UndefinedTable)


def _attachment_storage_not_ready_exception() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "error": "attachment_storage_not_ready",
            "message": _ATTACHMENT_STORAGE_NOT_READY_MESSAGE,
        },
    )


def _list_attachments_for_summary(
    db: Session, summary_id: UUID, *, ok_if_missing_table: bool = False
) -> List[StaffReviewSummaryAttachment]:
    """ok_if_missing_table=False (the default — used by every pure-read
    route: LIST, DETAIL, PDF/ZIP export, the download route) raises a
    clean 503 the instant the table is missing, so review history shows an
    explicit "migration required" state rather than silently claiming
    "no attachments" for records that might genuinely have some once the
    migration runs.

    ok_if_missing_table=True is used ONLY by _to_out when called from
    CREATE/UPDATE, i.e. strictly AFTER the summary row's own insert/update
    has already committed successfully — at that point the write itself
    already succeeded, and failing the whole request here would falsely
    report a failure for data that was actually saved (risking a confused
    user retrying and creating a duplicate summary). Degrading to an empty
    list is also factually correct in this exact case: if the attachments
    table has never existed, no attachment row can ever have been created
    for ANY summary, so "this summary currently has zero attachments" is
    always true, never a guess.

    Local Prototype mode (2026-09-23): when
    is_local_prototype_attachments_enabled() is True, this reads from the
    separate local SQLite metadata store instead — see
    backend/local_attachment_metadata.py. That store always exists (it is
    created automatically on first use), so ok_if_missing_table never
    applies in this branch."""
    if is_local_prototype_attachments_enabled():
        return local_list_attachments_for_summary(summary_id)
    try:
        return (
            db.query(StaffReviewSummaryAttachment)
            .filter(StaffReviewSummaryAttachment.summary_id == summary_id)
            .order_by(StaffReviewSummaryAttachment.created_at)
            .all()
        )
    except ProgrammingError as exc:
        db.rollback()  # leaves the session usable for anything the caller still needs to do
        if _is_missing_attachment_table_error(exc) and ok_if_missing_table:
            return []
        if _is_missing_attachment_table_error(exc):
            raise _attachment_storage_not_ready_exception() from exc
        raise


def _set_no_store(response: Response) -> None:
    """Private, reviewer-owned content must never be cached by a shared
    cache or the browser's own HTTP cache — a deliberate, new convention
    for this feature (no existing route in this backend sets an explicit
    cache header; see the technical design's privacy-controls section)."""
    response.headers["Cache-Control"] = "no-store"


def _reject_md_write(acting_member: str) -> None:
    """REQ-CAL-REV-MD-READ-006 (2026-08-06) — MD is a read-only Review
    Summary viewer and must never create or update a record. Called FIRST,
    before any other validation or database access, by both CREATE and
    UPDATE below, so MD is rejected before mutation rather than relying
    only on the incidental fact that _get_owned_summary_or_404 would also
    404 for MD (no summary is ever owned by "md" — the DB CHECK constraint
    on reviewer_member_key doesn't even permit it). 403 (not 404) is used
    deliberately here — unlike the non-disclosing cross-reviewer 404 on
    UPDATE, there is nothing to avoid disclosing: MD's read-only status is
    already public (the topbar banner shows it), so a clear, typed 403
    mirrors this codebase's own require_matching_member convention
    (backend/routers/calendar_auth.py) for "you are authenticated, but not
    authorized to do this," rather than the ownership-hiding 404."""
    if acting_member == MD_MEMBER_KEY:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "review_summary_read_only_member",
                "message": "MD has read-only Review Summary access and cannot create or edit records.",
                "actingMember": acting_member,
            },
        )


def _reviewed_staff_or_422(db: Session, reviewed_staff_id: int) -> StaffDashboardRecord:
    """reviewed_staff_id must resolve to an existing staff row — an
    unknown id is a client input error (422), not a 404 (404 is reserved
    for "authenticated but not this reviewer's record" on the other four
    routes). Deliberately does NOT filter on delete_status — a reviewer
    may record a summary about a departed staff member (e.g. an
    exit-review discussion); the selector's UI behavior is a convenience,
    not a server-enforced rule. reviewed_staff_id is INTEGER as of
    2026-08-11 (staff_dashboard_records.id is now employee_management.
    staff.id directly — see backend/models.py StaffDashboardRecord
    docstring), was UUID before."""
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


def _to_out(
    record: StaffReviewSummary, db: Session, acting_member: str, *, attachments_optional: bool = False
) -> StaffReviewSummaryOut:
    """Live-joins to staff_dashboard_records for display name fields — no
    reviewed_staff_name_snapshot column exists (approved technical design
    §5), so history always shows the staff member's current name, not a
    name captured at review time.

    REQ-CAL-REV-LOCK-004: can_edit/edit_deadline are computed here, fresh
    on every call — never stored — so every read route (create/list/
    detail) shows the exact same, currently-true answer. can_edit is only
    ever true for acting_member == record.reviewer_member_key (the
    record's own creator); a non-owner reading a shared record always
    gets can_edit=False, matching "OTHER REVIEWER: no Edit control".

    attachments_optional (2026-09-23): False (default) for pure reads
    (LIST/DETAIL) — a missing attachments table raises a clean 503 there
    (see _list_attachments_for_summary). True ONLY when this is called
    from CREATE/UPDATE, strictly after that record's own insert/update has
    already committed — see _list_attachments_for_summary's own docstring
    for why degrading to an empty list is the correct behavior there,
    never a false failure for a write that actually succeeded."""
    staff = (
        db.query(StaffDashboardRecord)
        .filter(StaffDashboardRecord.id == record.reviewed_staff_id)
        .first()
    )
    is_owner = record.reviewer_member_key == acting_member
    attachments = [
        _attachment_to_out(a)
        for a in _list_attachments_for_summary(db, record.id, ok_if_missing_table=attachments_optional)
    ]
    return StaffReviewSummaryOut(
        id=record.id,
        reviewer_member_key=record.reviewer_member_key,
        reviewed_staff_id=record.reviewed_staff_id,
        reviewed_staff_full_name=staff.name if staff else None,
        meeting_date=record.meeting_date,
        summary_text=record.summary_text,
        created_at=record.created_at,
        updated_at=record.updated_at,
        can_edit=is_owner and _can_edit_review_summary(record.created_at),
        edit_deadline=_review_summary_edit_deadline(record.created_at),
        attachments=attachments,
    )


def _claim_pending_attachments(
    db: Session, attachment_ids: List[UUID], acting_member: str
) -> List[StaffReviewSummaryAttachment]:
    """Validates every attachment_id from StaffReviewSummaryCreate BEFORE
    any row is written for the new summary — each must exist, be still
    "pending" (summary_id IS NULL), and have been uploaded by this same
    acting reviewer (a reviewer can never attach someone else's pending
    upload to their own summary). Raises 422 — no database write at all,
    not even a partial one — on the first violation; returns the ORM rows
    to the caller, which re-points their summary_id in the SAME
    transaction as the new summary row (create_staff_review_summary
    below), so an invalid attachment_id can never produce a summary with
    a missing/partial attachment list.

    Local Prototype mode (2026-09-23): reads pending candidates from the
    local SQLite metadata store instead (backend/local_attachment_metadata.py)
    when enabled — the validation rules below are identical either way; only
    where the candidate rows come from differs. Claiming (re-pointing
    summary_id) happens as a SEPARATE step in that mode — see
    create_staff_review_summary's own local-prototype branch — never in the
    same transaction as the PostgreSQL summary insert, which is impossible
    across two separate database engines (a documented, accepted limitation
    of this being an explicit local prototype)."""
    if not attachment_ids:
        return []
    unique_ids = list(dict.fromkeys(attachment_ids))  # de-dupe, preserve order
    if is_local_prototype_attachments_enabled():
        rows_by_id = local_get_pending_by_ids(unique_ids)
    else:
        try:
            rows_by_id = {
                row.id: row
                for row in db.query(StaffReviewSummaryAttachment)
                .filter(StaffReviewSummaryAttachment.id.in_(unique_ids))
                .all()
            }
        except ProgrammingError as exc:
            db.rollback()
            if _is_missing_attachment_table_error(exc):
                # Runs BEFORE the summary row is ever created — safe to
                # raise directly, nothing has been written yet.
                raise _attachment_storage_not_ready_exception() from exc
            raise
    for attachment_id in unique_ids:
        row = rows_by_id.get(attachment_id)
        if row is None:
            raise HTTPException(
                status_code=422,
                detail=f"Attachment {attachment_id} does not exist.",
            )
        if row.summary_id is not None:
            raise HTTPException(
                status_code=422,
                detail=f"Attachment {attachment_id} is already attached to a summary.",
            )
        if row.uploaded_by != acting_member:
            raise HTTPException(
                status_code=422,
                detail=f"Attachment {attachment_id} was not uploaded by this reviewer.",
            )
    return [rows_by_id[attachment_id] for attachment_id in unique_ids]


@router.post("/attachments", response_model=StaffReviewSummaryAttachmentOut, status_code=201)
def upload_review_summary_attachment(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
    storage: AttachmentStorage = Depends(get_attachment_storage),
):
    """Phase 1 of the two-phase, atomicity-preserving attachment flow (see
    the migration file's own docstring for the full rationale): uploads
    ONE file to the storage provider and, only once that upload durably
    succeeds, inserts ONE "pending" row (summary_id = NULL). The browser
    calls this once per selected file BEFORE pressing Save, then passes
    every returned id in attachment_ids on the actual
    POST /api/staff-review-summaries call — see
    StaffReviewSummaryCreate.attachment_ids and _claim_pending_attachments
    above. A pending row belongs to no summary and is invisible to every
    read route until claimed; an upload that is never claimed is an
    orphaned partial upload, cleaned up periodically by
    scripts/cleanup_pending_review_summary_attachments.py.

    REQ-CAL-REV-MD-READ-006: MD is rejected first — MD is read-only for
    this whole feature, matching _reject_md_write's use on CREATE/UPDATE.

    Validation order (all server-side, never trusted from the client
    alone — approved requirement §2): extension -> attachment_type (422 if
    unsupported), size <= MAX_ATTACHMENT_FILE_SIZE_BYTES (413 if over,
    checked by reading at most one byte past the limit — never buffers an
    arbitrarily large upload into memory to reject it), non-empty (422).
    Only once every check passes does this call the storage provider at
    all — including a cheap pre-flight check (2026-09-23) that the
    database can actually persist the pending row at all: if
    staff_review_summary_attachments doesn't exist yet, this fails BEFORE
    ever calling storage.upload(), so a missing migration can never cause
    a real file to land in Cloudinary with no way to ever track or clean
    it up."""
    _reject_md_write(acting_member)

    local_prototype = is_local_prototype_attachments_enabled()
    if not local_prototype:
        try:
            db.query(StaffReviewSummaryAttachment.id).limit(1).all()
        except ProgrammingError as exc:
            db.rollback()
            if _is_missing_attachment_table_error(exc):
                raise _attachment_storage_not_ready_exception() from exc
            raise
    # Local Prototype mode: no pre-flight needed — the local SQLite
    # metadata store is created automatically on first use (see
    # backend/local_attachment_metadata.py get_local_attachment_engine),
    # so it can never be "missing" the way the un-migrated PostgreSQL
    # table can be.

    attachment_type = _classify_attachment_extension(file.filename or "")
    if attachment_type is None:
        raise HTTPException(
            status_code=422,
            detail="Unsupported file type. Allowed: audio, Word (.doc/.docx), "
            "Excel (.xls/.xlsx), images, and PDF.",
        )

    chunk = file.file.read(MAX_ATTACHMENT_FILE_SIZE_BYTES + 1)
    if len(chunk) > MAX_ATTACHMENT_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the maximum allowed size of "
            f"{MAX_ATTACHMENT_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
        )
    if not chunk:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    safe_filename = sanitize_attachment_filename(file.filename)
    content_type = _resolve_attachment_content_type(safe_filename, attachment_type)
    resource_type = ATTACHMENT_TYPE_STORAGE_RESOURCE_TYPE[attachment_type]
    public_id = build_storage_public_id()

    try:
        storage.upload(
            chunk, public_id=public_id, resource_type=resource_type, content_type=content_type
        )
    except AttachmentStorageUnavailable:
        raise HTTPException(status_code=503, detail="Attachment storage is not available.")
    except Exception:
        # Any other provider-side failure — never insert a database row
        # for a file that is not durably stored (approved requirement §2:
        # "a failed upload must not silently produce a successful summary
        # with missing files").
        raise HTTPException(status_code=502, detail="Attachment upload failed. Please try again.")

    if local_prototype:
        record = local_insert_pending_attachment(
            uploaded_by=acting_member,
            original_filename=safe_filename,
            content_type=content_type,
            attachment_type=attachment_type,
            file_size_bytes=len(chunk),
            storage_public_id=public_id,
            storage_resource_type=resource_type,
        )
        return _attachment_to_out(record)

    record = StaffReviewSummaryAttachment(
        summary_id=None,
        uploaded_by=acting_member,
        original_filename=safe_filename,
        content_type=content_type,
        attachment_type=attachment_type,
        file_size_bytes=len(chunk),
        storage_provider="cloudinary",
        storage_public_id=public_id,
        storage_resource_type=resource_type,
        # Explicit, not left to the DB server_default — same convention
        # every other insert in this router already follows (see
        # create_staff_review_summary's own `now = datetime.now(...)`) so
        # the app server's clock is always the single source of truth,
        # never the database server's.
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _attachment_to_out(record)


@router.get("/attachments/storage-mode")
def attachment_storage_mode(acting_member: str = Depends(get_verified_member)) -> dict:
    """Tells the frontend which attachment metadata backend is currently
    active (REQ-CAL-REV-ATTACH-001-LOCAL-PROTO, 2026-09-23) — used ONLY to
    adjust display copy ("Local prototype storage" — web-view/js/
    review-summaries.js), never to change any validation/authorization
    rule, which is identical either way. Authenticated (like every other
    route on this router) even though the value itself is not sensitive,
    for consistency. Declared before the dynamic /{summary_id} routes so
    "attachments" is never captured as a summary_id — same reasoning as
    /export/pdf and /export/zip above; "storage-mode" is also a
    two-segment literal path here, a distinct shape from /{summary_id}'s
    single segment, so this cannot collide with that route under any
    registration order."""
    return {
        "mode": "local_prototype" if is_local_prototype_attachments_enabled() else "postgres",
    }


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
    uniqueness constraint (approved requirement §7).

    REQ-CAL-REV-MD-READ-006: MD is rejected first, before the
    reviewed_staff_id lookup and before any database write — see
    _reject_md_write.

    REQ-CAL-REV-ATTACH-001 (2026-09-23): attachment_ids are validated
    (_claim_pending_attachments) BEFORE the summary row is created; on any
    validation failure this raises 422 and writes nothing at all. On
    success, the new summary row and every claimed attachment's
    summary_id update happen in this one transaction — db.flush() (not
    db.commit()) obtains the new record's id first, so every claimed
    attachment can be re-pointed before the single, atomic db.commit().

    Local Prototype mode (2026-09-23): claimed_attachments are rows from
    the separate local SQLite metadata store, not this PostgreSQL session
    — they cannot be re-pointed inside this same transaction (two separate
    database engines have no shared transaction). Instead, the claim
    happens as its OWN, SEPARATE write, in local SQLite, immediately after
    this PostgreSQL commit succeeds — see backend/local_attachment_metadata.py's
    own module docstring for the documented, accepted non-atomicity this
    implies for a local prototype."""
    _set_no_store(response)
    _reject_md_write(acting_member)
    _reviewed_staff_or_422(db, payload.reviewed_staff_id)
    local_prototype = is_local_prototype_attachments_enabled()
    claimed_attachments = _claim_pending_attachments(db, payload.attachment_ids, acting_member)

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
    db.flush()  # assigns record.id without ending the transaction

    if not local_prototype and claimed_attachments:
        # No database foreign key exists on summary_id (backend/attachment_claim.py),
        # so the link is written only through this guarded claim: same
        # transaction as the summary insert, re-verifying summary/owner,
        # the per-summary file limit, and that each file is still pending
        # and uploaded by this reviewer. Any failure rolls the summary back too.
        try:
            claim_pending_attachments_for_summary(
                db,
                summary_id=record.id,
                acting_member=acting_member,
                attachment_ids=[a.id for a in claimed_attachments],
            )
        except AttachmentClaimError as exc:
            db.rollback()
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    db.commit()
    db.refresh(record)

    if local_prototype and claimed_attachments:
        local_claim_attachments([a.id for a in claimed_attachments], record.id)

    # attachments_optional=True — the write above already committed; see
    # _to_out's own docstring for why a missing attachments table must
    # degrade here, never turn this already-successful save into a false
    # failure. Requirement: "Do not display 'saved' until the backend
    # confirms both the summary and its attachment association" — the
    # claim above (whichever branch) always completes, synchronously,
    # BEFORE this response is built and returned, so a 201 here always
    # means both steps are done.
    return _to_out(record, db, acting_member, attachments_optional=True)


def _build_review_summary_query(
    db: Session,
    acting_member: str,
    reviewer_member_key: Optional[str],
    reviewed_staff_id: Optional[int],
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
    reviewed_staff_id: Optional[int] = Query(default=None),
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


def _attachment_export_dict(attachment: StaffReviewSummaryAttachment, storage: AttachmentStorage) -> dict:
    """Builds one attachment dict for the PDF export module. embed_bytes is
    populated for image/pdf/word/excel attachment types at or under
    MAX_EMBEDDABLE_ATTACHMENT_BYTES_FOR_PDF (2026-09-23: word/excel added —
    their bytes are fetched so they can be converted to PDF pages and
    appended; see append_office_conversions) — audio never has its bytes
    fetched for PDF purposes at all (never embedded or transcribed, by
    approved requirement).

    embed_skip_reason (2026-09-23) distinguishes the two reasons
    embed_bytes can be None, so build_review_summary_pdf's note is never
    misleading: "too_large" (over MAX_EMBEDDABLE_ATTACHMENT_BYTES_FOR_PDF —
    never even attempted) vs "fetch_failed" (a real storage.download_bytes
    error — the attachment IS under the size cap but its bytes could not be
    retrieved, e.g. a storage-provider-side access restriction). Either way
    the export degrades to a filename-only listing rather than failing the
    whole export — one unreadable attachment must never break an entire
    filtered-history export for every other record in it."""
    embed_bytes = None
    embed_skip_reason = None
    if attachment.attachment_type in ("image", "pdf", "word", "excel"):
        if attachment.file_size_bytes > MAX_EMBEDDABLE_ATTACHMENT_BYTES_FOR_PDF:
            embed_skip_reason = "too_large"
        else:
            try:
                embed_bytes = storage.download_bytes(
                    attachment.storage_public_id, attachment.storage_resource_type
                )
            except Exception:
                embed_bytes = None
                embed_skip_reason = "fetch_failed"
    return {
        "id": attachment.id,
        "original_filename": attachment.original_filename,
        "attachment_type": attachment.attachment_type,
        "content_type": attachment.content_type,
        "file_size_bytes": attachment.file_size_bytes,
        "embed_bytes": embed_bytes,
        "embed_skip_reason": embed_skip_reason,
    }


def _build_pdf_ready_records(db: Session, storage: AttachmentStorage, rows: List[StaffReviewSummary]):
    """rows: StaffReviewSummary ORM rows, already ordered (meeting_date
    DESC, created_at DESC — the same order both /export/pdf and /export/zip
    already use). Returns (records_for_pdf, pdf_attachments_to_append,
    office_attachments_to_append): records_for_pdf is the dict list
    build_review_summary_pdf expects (each with an added "attachments" key);
    pdf_attachments_to_append is the flat list append_pdf_attachments
    expects — only PDF-type attachments whose embed_bytes were actually
    resolved; office_attachments_to_append is the flat list
    append_office_conversions expects (2026-09-23) — only word/excel
    attachments whose embed_bytes were actually resolved. An over-size or
    unreadable attachment of any of these types is already handled as a
    filename-only note by build_review_summary_pdf itself, and audio never
    reaches either list (never embedded or transcribed, by approved
    requirement)."""
    records_for_pdf = []
    pdf_attachments_to_append = []
    office_attachments_to_append = []
    for index, row in enumerate(rows, start=1):
        # ok_if_missing_table=True (2026-09-23) — PDF/ZIP export is a
        # pre-existing, otherwise-text-only feature; it must keep working
        # exactly as it did before this attachments feature existed rather
        # than newly failing just because attachments can't be looked up
        # yet. Same "table absent => genuinely zero attachments exist"
        # reasoning as _to_out's CREATE/UPDATE case.
        attachment_dicts = [
            _attachment_export_dict(a, storage)
            for a in _list_attachments_for_summary(db, row.id, ok_if_missing_table=True)
        ]
        records_for_pdf.append({
            "reviewer_member_key": row.reviewer_member_key,
            "meeting_date": row.meeting_date,
            "summary_text": row.summary_text,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "attachments": attachment_dicts,
        })
        record_label = "Review " + str(index)
        for attachment_dict in attachment_dicts:
            if attachment_dict["embed_bytes"] is None:
                continue
            if attachment_dict["attachment_type"] == "pdf":
                pdf_attachments_to_append.append({
                    "record_label": record_label,
                    "original_filename": attachment_dict["original_filename"],
                    "embed_bytes": attachment_dict["embed_bytes"],
                })
            elif attachment_dict["attachment_type"] in ("word", "excel"):
                office_attachments_to_append.append({
                    "record_label": record_label,
                    "original_filename": attachment_dict["original_filename"],
                    "attachment_type": attachment_dict["attachment_type"],
                    "embed_bytes": attachment_dict["embed_bytes"],
                })
    return records_for_pdf, pdf_attachments_to_append, office_attachments_to_append


@router.get("/export/pdf")
def export_staff_review_summaries_pdf(
    response: Response,
    reviewed_staff_id: int = Query(...),
    reviewer_member_key: Optional[str] = Query(default=None),
    include_all_reviewers: bool = Query(default=False),
    date_from: Optional[date_type] = Query(default=None),
    date_to: Optional[date_type] = Query(default=None),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
    storage: AttachmentStorage = Depends(get_attachment_storage),
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

    records, pdf_attachments_to_append, office_attachments_to_append = _build_pdf_ready_records(db, storage, rows)

    if include_all_reviewers:
        reviewer_scope_label = "All reviewers"
    elif reviewer_member_key is not None:
        # "Mayurika — HR" (Phase 7, FIX-02) — the full "Name — Role" form
        # for a specific-reviewer scope line, not just the bare name.
        reviewer_scope_label = reviewer_scope_label_for(reviewer_member_key)
    else:
        reviewer_scope_label = reviewer_scope_label_for(acting_member)

    # StaffDashboardRecord.full_name/calling_name renamed/dropped 2026-08-11
    # — this is now Ledsone's own `name` column (see backend/schemas.py
    # StaffReviewSummaryOut docstring).
    employee_label = staff.name or "Unknown staff record"
    generated_at_local = datetime.now(timezone.utc).astimezone(_COLOMBO)

    pdf_bytes = build_review_summary_pdf(
        reviewed_staff_label=employee_label,
        reviewer_scope_label=reviewer_scope_label,
        date_from=date_from,
        date_to=date_to,
        generated_at_local=generated_at_local,
        records=records,
    )
    # REQ-CAL-REV-ATTACH-001 (2026-09-23) — appends every PDF-attachment's
    # own pages onto the end of the export, each behind a labelled divider
    # page (see append_pdf_attachments' own docstring). A no-op (returns
    # pdf_bytes unchanged) when there are no PDF attachments to append.
    pdf_bytes = append_pdf_attachments(pdf_bytes, pdf_attachments_to_append)
    # REQ-CAL-REV-PDF-ATTACH-CONVERT-001 (2026-09-23) — appends a converted
    # PDF for every Word/Excel attachment, each behind its own labelled
    # divider page (see append_office_conversions' own docstring). A no-op
    # when there are no Word/Excel attachments to append.
    pdf_bytes = append_office_conversions(pdf_bytes, office_attachments_to_append)
    content_disposition = build_content_disposition_header(employee_label, date_type.today())

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": content_disposition,
            "Cache-Control": "no-store",
        },
    )


def _zip_entry_folder_name(index: int, meeting_date: date_type) -> str:
    """"Review_1_2026-09-20/" style per-record folder inside the ZIP —
    keeps two records' same-named attachments (e.g. two "notes.docx"
    files) from ever colliding inside the archive."""
    return "Review_" + str(index) + "_" + meeting_date.isoformat()


def _zip_attachment_filename(record_folder: str, original_filename: str, seen_names: set) -> str:
    """De-duplicates a filename WITHIN one record's folder (two attachments
    on the same record could share an original_filename) by appending a
    numeric suffix — never overwrites a previous entry inside the ZIP."""
    candidate = original_filename
    counter = 2
    while (record_folder, candidate) in seen_names:
        stem, dot, ext = original_filename.rpartition(".")
        candidate = (stem + "_" + str(counter) + dot + ext) if dot else (original_filename + "_" + str(counter))
        counter += 1
    seen_names.add((record_folder, candidate))
    return candidate


@router.get("/export/zip")
def export_staff_review_summaries_zip(
    response: Response,
    reviewed_staff_id: int = Query(...),
    reviewer_member_key: Optional[str] = Query(default=None),
    include_all_reviewers: bool = Query(default=False),
    date_from: Optional[date_type] = Query(default=None),
    date_to: Optional[date_type] = Query(default=None),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
    storage: AttachmentStorage = Depends(get_attachment_storage),
):
    """"Download complete review" (REQ-CAL-REV-ATTACH-001, 2026-09-23) — one
    ZIP containing the same summary PDF /export/pdf produces (see
    _build_pdf_ready_records — byte-for-byte the same generation path, so
    the two downloads can never silently disagree about a record's
    content) PLUS every original attachment file, including audio, which
    /export/pdf never embeds. Declared before GET /{summary_id} for the
    exact same route-collision reason documented on /export/pdf above —
    /export/zip is also a two-segment literal, so this is defense in depth
    on top of a structural non-collision, not the only thing preventing
    it.

    Applies the EXACT SAME filter set as /export/pdf
    (reviewed_staff_id/reviewer_member_key/include_all_reviewers/
    date_from/date_to via the shared _build_review_summary_query) — this
    download always covers the current filtered history, never a single
    record only, exactly matching /export/pdf's own scope (see that
    route's "Reviewer scope"/"Date scope" section inside the PDF itself,
    which states the covered scope explicitly).

    Zero matching active records -> 404, same as /export/pdf — never an
    empty/misleading ZIP."""
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

    records, pdf_attachments_to_append, office_attachments_to_append = _build_pdf_ready_records(db, storage, rows)

    if include_all_reviewers:
        reviewer_scope_label = "All reviewers"
    elif reviewer_member_key is not None:
        reviewer_scope_label = reviewer_scope_label_for(reviewer_member_key)
    else:
        reviewer_scope_label = reviewer_scope_label_for(acting_member)

    employee_label = staff.name or "Unknown staff record"
    generated_at_local = datetime.now(timezone.utc).astimezone(_COLOMBO)

    pdf_bytes = build_review_summary_pdf(
        reviewed_staff_label=employee_label,
        reviewer_scope_label=reviewer_scope_label,
        date_from=date_from,
        date_to=date_to,
        generated_at_local=generated_at_local,
        records=records,
    )
    pdf_bytes = append_pdf_attachments(pdf_bytes, pdf_attachments_to_append)
    pdf_bytes = append_office_conversions(pdf_bytes, office_attachments_to_append)
    pdf_filename = build_review_summary_pdf_filename(employee_label, date_type.today())

    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(pdf_filename, pdf_bytes)
        seen_names: set = set()
        for index, row in enumerate(rows, start=1):
            folder = _zip_entry_folder_name(index, row.meeting_date)
            for attachment in _list_attachments_for_summary(db, row.id):
                try:
                    file_bytes = storage.download_bytes(
                        attachment.storage_public_id, attachment.storage_resource_type
                    )
                except Exception:
                    # One unreadable attachment must never fail the whole
                    # ZIP for every other record/attachment in it — a
                    # placeholder text entry replaces the missing file so
                    # the reader knows something was skipped, rather than
                    # the archive silently having fewer files than the PDF
                    # describes.
                    placeholder_name = _zip_attachment_filename(
                        folder, attachment.original_filename + ".unavailable.txt", seen_names
                    )
                    archive.writestr(
                        folder + "/" + placeholder_name,
                        "This attachment could not be retrieved from storage at export time.",
                    )
                    continue
                entry_name = _zip_attachment_filename(folder, attachment.original_filename, seen_names)
                archive.writestr(folder + "/" + entry_name, file_bytes)

    zip_bytes = zip_buffer.getvalue()
    zip_filename = build_review_summary_zip_filename(employee_label, date_type.today())

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": _content_disposition_value(zip_filename),
            "Cache-Control": "no-store",
        },
    )


@router.get("/export/pdf/history")
def export_all_reviews_pdf(
    response: Response,
    reviewed_staff_id: int = Query(...),
    reviewer_member_key: Optional[str] = Query(default=None),
    include_all_reviewers: bool = Query(default=False),
    date_from: Optional[date_type] = Query(default=None),
    date_to: Optional[date_type] = Query(default=None),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
    storage: AttachmentStorage = Depends(get_attachment_storage),
):
    """"Download all reviews as one PDF" (REQ-CAL-REV-HISTORY-PDF-001,
    2026-09-23) — one combined PDF covering EVERY review summary matching
    the current Review History filters for one employee, in chronological
    (oldest-first) order, each with its full summary text and every
    supported attachment converted/embedded as pages immediately after it
    — the Word/Excel/PDF/image conversion pipeline is the exact same
    shared code /export/pdf and /export/zip already use (_build_pdf_ready_
    records, build_review_summary_pdf, append_pdf_attachments, append_
    office_conversions — nothing here re-implements any part of that).

    Declared here — before GET /{summary_id} below — for the exact same
    route-collision reasoning already documented on /export/pdf and
    /export/zip above: a 3-segment literal path can never be captured by
    that 1-segment dynamic route regardless of declaration order, but this
    keeps every export route grouped together as defense in depth.

    Distinct from /export/pdf in two ways, both deliberate:
      1. Chronological (meeting_date ASC, created_at ASC) instead of
         /export/pdf's newest-first order — this endpoint's whole purpose
         is a readable, start-to-finish history, not a "latest snapshot."
      2. Genuinely unbounded in scope (same as /export/pdf — no LIMIT/
         OFFSET is ever applied; "across all result pages, never just the
         first 50" is true by construction, not by a raised cap), but
         guarded by the explicit, clearly-reported limits below
         (MAX_HISTORY_PDF_EXPORT_RECORDS/_ATTACHMENT_BYTES/_TOTAL_PAGES,
         HISTORY_PDF_EXPORT_TIME_BUDGET_SECONDS — backend/config.py) that
         /export/pdf has never needed, because combining an unbounded
         number of reviews (each potentially carrying multiple large
         Word/Excel/PDF/image attachments that are now converted to PDF
         pages) has no natural upper bound the way one review's own export
         does. Every limit fails with a specific, actionable message
         (never a silent truncation, never a bare 500) — see each check
         below.

    Same authorization as /export/pdf: a valid Calendar member token
    (Depends(get_verified_member)) and _reviewed_staff_or_422 — no new
    permission rule, no schema change, no migration.

    Every attachment byte is still fetched exclusively through
    `storage.download_bytes` (backend/attachment_storage.py) — the same
    authorized, server-side-only Cloudinary path /export/pdf and
    /export/zip already use. No Cloudinary credential or unrestricted URL
    ever reaches the browser; the browser only ever receives already-
    assembled PDF bytes.

    Nothing here writes a temp file to disk — like every other export in
    this router, the whole PDF is assembled in memory (BytesIO, inside
    build_review_summary_pdf/append_pdf_attachments/append_office_
    conversions) and returned directly; there is nothing to "clean up
    after the response" because nothing outside process memory was ever
    created."""
    _set_no_store(response)
    staff = _reviewed_staff_or_422(db, reviewed_staff_id)

    start_time = time.monotonic()

    query = _build_review_summary_query(
        db, acting_member, reviewer_member_key, reviewed_staff_id,
        date_from, date_to, include_all_reviewers,
    )

    total_records = query.with_entities(func.count(StaffReviewSummary.id)).scalar()
    if total_records == 0:
        raise HTTPException(
            status_code=404,
            detail="No review summaries match the selected filters.",
        )
    if total_records > MAX_HISTORY_PDF_EXPORT_RECORDS:
        raise HTTPException(
            status_code=413,
            detail=(
                "This selection matches " + str(total_records) + " reviews, which is more than the "
                + str(MAX_HISTORY_PDF_EXPORT_RECORDS) + "-review limit for a single combined PDF. "
                "Narrow the reviewer or date filters and try again."
            ),
        )

    rows = (
        query.order_by(
            StaffReviewSummary.meeting_date.asc(), StaffReviewSummary.created_at.asc()
        )
        .all()
    )

    # Pre-flight combined-attachment-size check, BEFORE any Cloudinary
    # download or conversion work begins — cheap metadata-only lookups
    # (reuses _list_attachments_for_summary, the exact same function
    # _build_pdf_ready_records will call again per row below; the
    # redundancy is deliberate simplicity over a second, parallel
    # aggregate-SQL/SQLite implementation for this one pre-flight check).
    # Only the types _attachment_export_dict ever downloads count toward
    # this — audio is never fetched for PDF purposes at all, so it never
    # counts against this limit either.
    total_attachment_bytes = 0
    for row in rows:
        for attachment in _list_attachments_for_summary(db, row.id, ok_if_missing_table=True):
            if attachment.attachment_type in ("image", "pdf", "word", "excel"):
                total_attachment_bytes += attachment.file_size_bytes
    if total_attachment_bytes > MAX_HISTORY_PDF_EXPORT_ATTACHMENT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                "The attachments across these reviews total more than "
                + str(MAX_HISTORY_PDF_EXPORT_ATTACHMENT_BYTES // (1024 * 1024))
                + " MB combined, which is too large for a single PDF. Narrow the reviewer or date "
                "filters and try again."
            ),
        )

    records, pdf_attachments_to_append, office_attachments_to_append = _build_pdf_ready_records(db, storage, rows)

    if time.monotonic() - start_time > HISTORY_PDF_EXPORT_TIME_BUDGET_SECONDS:
        raise HTTPException(
            status_code=504,
            detail="Preparing this combined PDF is taking too long. Narrow the reviewer or date filters and try again.",
        )

    if include_all_reviewers:
        reviewer_scope_label = "All reviewers"
    elif reviewer_member_key is not None:
        reviewer_scope_label = reviewer_scope_label_for(reviewer_member_key)
    else:
        reviewer_scope_label = reviewer_scope_label_for(acting_member)

    employee_label = staff.name or "Unknown staff record"
    generated_at_local = datetime.now(timezone.utc).astimezone(_COLOMBO)

    pdf_bytes = build_review_summary_pdf(
        reviewed_staff_label=employee_label,
        reviewer_scope_label=reviewer_scope_label,
        date_from=date_from,
        date_to=date_to,
        generated_at_local=generated_at_local,
        records=records,
    )
    pdf_bytes = append_pdf_attachments(pdf_bytes, pdf_attachments_to_append)
    pdf_bytes = append_office_conversions(pdf_bytes, office_attachments_to_append)

    if time.monotonic() - start_time > HISTORY_PDF_EXPORT_TIME_BUDGET_SECONDS:
        raise HTTPException(
            status_code=504,
            detail="Preparing this combined PDF is taking too long. Narrow the reviewer or date filters and try again.",
        )

    total_pages = count_pdf_pages(pdf_bytes)
    if total_pages > MAX_HISTORY_PDF_EXPORT_TOTAL_PAGES:
        raise HTTPException(
            status_code=413,
            detail=(
                "The combined PDF would be " + str(total_pages) + " pages, more than the "
                + str(MAX_HISTORY_PDF_EXPORT_TOTAL_PAGES) + "-page limit. Narrow the reviewer or date "
                "filters and try again."
            ),
        )

    content_disposition = build_all_reviews_content_disposition_header(employee_label, date_type.today())

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


@router.get("/{summary_id}/attachments/{attachment_id}")
def download_review_summary_attachment(
    summary_id: UUID,
    attachment_id: UUID,
    response: Response,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
    storage: AttachmentStorage = Depends(get_attachment_storage),
):
    """Individual original-file download (REQ-CAL-REV-ATTACH-001,
    2026-09-23). Authorization mirrors GET /{summary_id} exactly — any
    authenticated Management Team member (or MD) may download, matching
    the shared-read rule for the parent summary; there is no separate,
    stricter per-attachment permission (approved requirement §4: "preserve
    any stricter existing attachment permissions" — none exist to
    preserve, since attachments never existed before this feature).

    _get_active_summary_or_404 first (same non-disclosing 404 shape as
    every other summary_id route on this file) so a soft-deleted or
    nonexistent summary_id never reveals whether attachment_id exists
    either. The attachment lookup is then scoped to
    (id=attachment_id, summary_id=summary_id) in one filter — an
    attachment_id that exists but belongs to a DIFFERENT summary is
    therefore also a plain 404, never a 403 that would disclose it exists
    elsewhere.

    Bytes are always fetched from the storage provider server-side and
    streamed back through this authenticated route — the browser is never
    given a raw, unauthenticated storage URL (see
    backend/attachment_storage.py module docstring)."""
    _set_no_store(response)
    _get_active_summary_or_404(db, summary_id)
    if is_local_prototype_attachments_enabled():
        attachment = local_get_attachment_for_summary(attachment_id, summary_id)
    else:
        try:
            attachment = (
                db.query(StaffReviewSummaryAttachment)
                .filter(
                    StaffReviewSummaryAttachment.id == attachment_id,
                    StaffReviewSummaryAttachment.summary_id == summary_id,
                )
                .first()
            )
        except ProgrammingError as exc:
            db.rollback()
            if _is_missing_attachment_table_error(exc):
                raise _attachment_storage_not_ready_exception() from exc
            raise
    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found.")

    try:
        file_bytes = storage.download_bytes(attachment.storage_public_id, attachment.storage_resource_type)
    except AttachmentStorageUnavailable:
        raise HTTPException(status_code=503, detail="Attachment storage is not available.")
    except Exception:
        raise HTTPException(status_code=502, detail="Could not retrieve the attachment. Please try again.")

    return Response(
        content=file_bytes,
        media_type=attachment.content_type,
        headers={
            "Content-Disposition": _content_disposition_value(attachment.original_filename),
            "Cache-Control": "no-store",
        },
    )


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
    there is nothing here to strip; the schema itself is the enforcement.

    REQ-CAL-REV-MD-READ-006: MD is rejected first, before the owned-summary
    lookup — see _reject_md_write. This is defense in depth on top of the
    fact that _get_owned_summary_or_404 would also 404 for MD regardless
    (no summary can ever be owned by "md")."""
    _set_no_store(response)
    _reject_md_write(acting_member)
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
    # attachments_optional=True — the write above already committed; see
    # _to_out's own docstring for why a missing attachments table must
    # degrade here, never turn this already-successful save into a false
    # failure.
    return _to_out(record, db, acting_member, attachments_optional=True)


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
