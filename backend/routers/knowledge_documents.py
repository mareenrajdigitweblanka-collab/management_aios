"""Knowledge Management — Company Documents backend CRUD API
(REQ-KM-CRUD-002 design, REQ-KM-CRUD-003 implementation; REQ-KM-UI-005 added
GET /deleted, the one new route below).

Operates against management_aios.knowledge_documents,
knowledge_document_versions, knowledge_document_audit_log — all three
already created by database/migrations/2026-08-10-create-knowledge-
documents.sql (executed against the live database; see
validation/knowledge-management-migration-execution-check-2026-08-10.md).
This router never creates, alters, or drops that schema.

Permission model (locked, REQ-KM-CRUD-002 rule 1 — deliberately DIFFERENT
from Task/Leave's own-{member_key}-only lock and from StaffReviewSummary's
creator-only-update lock): ANY authenticated Management Team member may
create/edit-metadata/create-version/archive/unarchive/soft-delete/restore
ANY document, and ANY authenticated Management Team member may read version
history and audit history. There is no per-owner scoping column, no
require_matching_member call, and no non-disclosing-404 ownership check
anywhere in this file — every mutating route accepts any acting_member
Depends(get_verified_member) resolves, except MD.

MD (backend/config.py MD_MEMBER_KEY) is explicitly NOT a Management Team
member (see MEMBER_DIRECTORY, which excludes it) and is rejected from every
mutating route here — _reject_md_write below, same pattern and rationale as
backend/routers/staff_review_summaries.py's own _reject_md_write. LIST/
DETAIL remain public (no token required at all), matching Task/Leave's own
public-GET convention — Phase 16's auth test list only covers create/
update/version/archive/delete/restore, not list/detail.

Duplicate-URL prevention (rule 3/15) is ALWAYS an application-layer
pre-check via knowledge_document_logic.assert_no_active_duplicate_source_url
BEFORE any db.add() — the database's own partial unique index
(idx_knowledge_documents_active_source_url_normalized, backend/models.py)
exists only as defense-in-depth; it must never be the normal user-facing
error path (rule 15's explicit instruction for RESTORE, applied
consistently to every route that ever writes source_url_normalized).

Version history (knowledge_document_versions) and audit history
(knowledge_document_audit_log) are both looked up WITHOUT a deleted_at
filter on the parent document — deliberately: an audit trail's entire
purpose is to remain visible for a document that is currently soft-deleted
(e.g. to see who deleted it and why, per rule 6's "preserve historical
delete information via audit records"), so filtering it out on the parent's
current lifecycle state would defeat that purpose. LIST/DETAIL (the
"current live business state" views) do filter on deleted_at — see
_base_active_query / _get_active_document_or_404 below.

GET /deleted (REQ-KM-UI-005) is the mirror image of LIST: it returns ONLY
soft-deleted documents, using KnowledgeDocumentDeletedOut (a narrower schema
carrying deleted_by/deleted_at/delete_reason, which KnowledgeDocumentOut
does not). It requires a valid token (unlike public LIST/DETAIL) but does
NOT call _reject_md_write — it is a read-only route, and MD is not excluded
from any read route in this file (only writes). It is registered BEFORE
"/{document_id}" specifically so the static path is never swallowed by the
dynamic one — see that route's own docstring for the full explanation.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy import asc, func
from sqlalchemy.orm import Session

from backend.config import KNOWLEDGE_GOOGLE_DOCUMENT_TYPES, MD_MEMBER_KEY
from backend.database import get_db
from backend.models import KnowledgeDocument, KnowledgeDocumentAuditLog, KnowledgeDocumentVersion
from backend.routers import knowledge_document_logic as kdl
from backend.routers.calendar_auth import get_verified_member
from backend.schemas import (
    KnowledgeDocumentAuditLogOut,
    KnowledgeDocumentCreate,
    KnowledgeDocumentDeletedOut,
    KnowledgeDocumentDeleteRequest,
    KnowledgeDocumentListResponse,
    KnowledgeDocumentMetadataUpdate,
    KnowledgeDocumentOut,
    KnowledgeDocumentVersionCreate,
    KnowledgeDocumentVersionOut,
)

router = APIRouter(prefix="/api/knowledge-documents", tags=["knowledge-documents"])


def _now() -> datetime:
    return datetime.now(timezone.utc)

DEFAULT_LIMIT = 50
MAX_LIMIT = 500

_NOT_FOUND_DETAIL = "Knowledge document not found."


def _reject_md_write(acting_member: str) -> None:
    """MD is a read-only, non-Management-Team identity everywhere else in
    this codebase (backend/routers/staff_review_summaries.py's own
    _reject_md_write is the direct precedent) — rule 1 says "any
    authenticated Management Team member," and MD categorically is not
    one (backend/config.py MEMBER_DIRECTORY excludes it). Called first, on
    every mutating route, before any database access."""
    if acting_member == MD_MEMBER_KEY:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "knowledge_document_read_only_member",
                "message": "MD has read-only access and cannot create or edit Knowledge Management records.",
                "actingMember": acting_member,
            },
        )


def _base_active_query(db: Session):
    return db.query(KnowledgeDocument).filter(KnowledgeDocument.deleted_at.is_(None))


def _get_active_document_or_404(db: Session, document_id: UUID) -> KnowledgeDocument:
    """Used by DETAIL, metadata UPDATE, VERSION create, ARCHIVE, UNARCHIVE,
    and SOFT DELETE — every route that operates on a document's current
    live business state. A soft-deleted or nonexistent id is
    indistinguishable here (both 404), matching this codebase's existing
    _get_active_record_or_404 convention (backend/routers/member_leave.py)."""
    record = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.id == document_id, KnowledgeDocument.deleted_at.is_(None))
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_DETAIL)
    return record


def _get_deleted_document_or_404(db: Session, document_id: UUID) -> KnowledgeDocument:
    """Used only by RESTORE — the mirror image of
    _get_active_document_or_404: 404 if the id is missing OR not currently
    soft-deleted (nothing to restore)."""
    record = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.id == document_id, KnowledgeDocument.deleted_at.isnot(None))
        .first()
    )
    if record is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_DETAIL)
    return record


def _get_any_document_or_404(db: Session, document_id: UUID) -> KnowledgeDocument:
    """Used only by version-history and audit-history GET — deliberately
    ignores deleted_at entirely (see module docstring)."""
    record = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail=_NOT_FOUND_DETAIL)
    return record


def _apply_filters(
    query,
    team: Optional[str],
    document_type: Optional[str],
    lifecycle_status: Optional[str],
    search: Optional[str],
):
    if team:
        query = query.filter(KnowledgeDocument.team == team)
    if document_type:
        query = query.filter(KnowledgeDocument.document_type == document_type)
    if lifecycle_status:
        query = query.filter(KnowledgeDocument.lifecycle_status == lifecycle_status)
    if search:
        like_term = f"%{search}%"
        query = query.filter(KnowledgeDocument.title.ilike(like_term))
    return query


def _to_out(record: KnowledgeDocument, warnings: Optional[List[str]] = None) -> KnowledgeDocumentOut:
    out = KnowledgeDocumentOut.model_validate(record)
    out.warnings = warnings or []
    return out


def _default_google_ownership_status(document_type: str) -> str:
    """Server-derived only — never client-supplied (rule 8). 'Not Verified'
    for the three Google types (real Google Drive verification is not
    implemented — REQ-KM-001 discovery §7, still BLOCKED); 'Not Applicable'
    for every other type."""
    if document_type in KNOWLEDGE_GOOGLE_DOCUMENT_TYPES:
        return "Not Verified"
    return "Not Applicable"


def _append_audit(
    db: Session,
    document_id: UUID,
    action: str,
    actor_member_key: str,
    detail: Optional[dict] = None,
) -> None:
    """The ONE place every route appends an audit_log row — never inlined
    per route, so every action string always matches
    knowledge_document_audit_log_action_check (backend/models.py) by
    construction."""
    db.add(
        KnowledgeDocumentAuditLog(
            document_id=document_id,
            action=action,
            actor_member_key=actor_member_key,
            detail=detail,
            occurred_at=_now(),
        )
    )


# ── LIST ──────────────────────────────────────────────────────────────────


@router.get("", response_model=KnowledgeDocumentListResponse)
def list_knowledge_documents(
    team: Optional[str] = Query(default=None),
    document_type: Optional[str] = Query(default=None),
    lifecycle_status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=200),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Public — no token required, matching Task/Leave's own public-GET
    convention (Phase 16's auth-required test list does not include list).
    Excludes soft-deleted records by default (no ?include_deleted= escape
    hatch — not evidenced as a requirement). Deterministic ordering: title
    ascending, then id ascending as a stable tiebreaker."""
    query = _apply_filters(_base_active_query(db), team, document_type, lifecycle_status, search)

    total = query.with_entities(func.count(KnowledgeDocument.id)).scalar()

    rows = (
        query.order_by(asc(KnowledgeDocument.title), asc(KnowledgeDocument.id))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return KnowledgeDocumentListResponse(
        records=[_to_out(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


# ── DELETED (REQ-KM-UI-005 Phase 3) ─────────────────────────────────────────


@router.get("/deleted", response_model=List[KnowledgeDocumentDeletedOut])
def list_deleted_knowledge_documents(
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Read-only mirror image of the default LIST route above: returns
    ONLY soft-deleted documents (deleted_at IS NOT NULL), never an active
    one. Exists so the frontend can enumerate what is available to
    restore — the default LIST route deliberately never exposes deleted
    rows (see its own docstring), so without this route there is no way
    to discover a deleted document's id at all.

    IMPORTANT ROUTE ORDER: this function is defined (and therefore
    registered on `router`) BEFORE get_knowledge_document's
    "/{document_id}" route below. FastAPI/Starlette matches routes in
    registration order — if "/{document_id}" were registered first, a
    request to GET /api/knowledge-documents/deleted would match it first
    (with document_id="deleted") and fail UUID validation with a 422,
    never reaching this handler. Registering the static "/deleted" path
    first guarantees it is matched before the dynamic path is even tried.

    Auth: any authenticated Management Team member (Depends(get_verified_
    member), same as every other route in this file) — no _reject_md_write
    call, matching the version/audit history GET routes below: this is a
    read-only route, and rule 1's Management-Team-only restriction has
    only ever been applied to WRITES in this router (MD is not rejected
    from any GET route here). The permission rationale is the same one
    that already permits any Management Team member to call RESTORE
    itself (rule 1) — reading what is available to restore is a strict
    subset of being allowed to restore it.

    Never mutates anything — a plain SELECT, no db.add()/db.commit() call
    anywhere in this function. Deterministic ordering: most-recently-
    deleted first (deleted_at DESC), then id ascending as a stable
    tiebreaker for two documents deleted in the same instant."""
    rows = (
        db.query(KnowledgeDocument)
        .filter(KnowledgeDocument.deleted_at.isnot(None))
        .order_by(KnowledgeDocument.deleted_at.desc(), asc(KnowledgeDocument.id))
        .all()
    )
    return [KnowledgeDocumentDeletedOut.model_validate(r) for r in rows]


# ── DETAIL ────────────────────────────────────────────────────────────────


@router.get("/{document_id}", response_model=KnowledgeDocumentOut)
def get_knowledge_document(document_id: UUID, db: Session = Depends(get_db)):
    """Public. 404 for a missing or soft-deleted id — same non-disclosing
    shape either way (Phase 6)."""
    record = _get_active_document_or_404(db, document_id)
    return _to_out(record)


# ── CREATE ────────────────────────────────────────────────────────────────


@router.post("", response_model=KnowledgeDocumentOut, status_code=201)
def create_knowledge_document(
    payload: KnowledgeDocumentCreate,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """created_by/updated_by are set from acting_member only —
    KnowledgeDocumentCreate has no such field, so a client cannot spoof
    either (rule 2). Duplicate-active-URL is a 409 BEFORE any write (rule
    4); a same-title/different-URL match is a non-blocking warning in the
    response only (rule 5). Inserts the parent document row, its initial
    v1.0 knowledge_document_versions row, and one audit_log row
    (action='create') — all in one transaction, one db.commit()."""
    _reject_md_write(acting_member)

    normalized_url = kdl.normalize_source_url(payload.source_url)

    existing = kdl.find_active_document_by_normalized_url(db, normalized_url)
    if existing is not None:
        return JSONResponse(
            status_code=409,
            content=kdl.duplicate_source_url_response_body(existing),
        )

    warning = kdl.find_same_title_different_url_warning(db, payload.title, normalized_url)

    now = _now()
    document = KnowledgeDocument(
        title=payload.title,
        team=payload.team,
        document_type=payload.document_type,
        job_role=payload.job_role,
        document_category=payload.document_category,
        creator=payload.creator,
        source_url=payload.source_url,
        source_url_normalized=normalized_url,
        current_version="1.0",
        lifecycle_status="Active",
        compliance_status="Pending",
        google_ownership_status=_default_google_ownership_status(payload.document_type),
        created_by=acting_member,
        updated_by=acting_member,
        created_at=now,
        updated_at=now,
    )
    db.add(document)
    db.flush()  # populates document.id (Python-side default) before the child rows below

    db.add(
        KnowledgeDocumentVersion(
            document_id=document.id,
            version_label="1.0",
            source_url=payload.source_url,
            change_note=None,
            created_by=acting_member,
            created_at=now,
        )
    )
    _append_audit(db, document.id, "create", acting_member)

    db.commit()
    db.refresh(document)

    return _to_out(document, warnings=[warning] if warning else [])


# ── METADATA UPDATE ──────────────────────────────────────────────────────

_METADATA_FIELDS = (
    "title", "team", "document_type", "job_role",
    "document_category", "creator", "lifecycle_status", "compliance_status",
)


@router.patch("/{document_id}", response_model=KnowledgeDocumentOut)
def update_knowledge_document_metadata(
    document_id: UUID,
    payload: KnowledgeDocumentMetadataUpdate,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Metadata-only — never touches source_url/source_url_normalized/
    current_version/knowledge_document_versions (rule 10). A client
    attempting to send source_url gets a clear 422 rejection at the schema
    layer (KnowledgeDocumentMetadataUpdate.reject_source_url), before this
    function is ever called. Any authenticated Management Team member may
    edit any document (rule 1) — no owner check. Appends exactly one
    audit_log row (action='update_metadata') with a {field, from, to}
    array of only the fields actually supplied."""
    _reject_md_write(acting_member)
    document = _get_active_document_or_404(db, document_id)

    update_data = payload.model_dump(exclude_unset=True, exclude={"change_description", "source_url"})

    changes = []
    for field in _METADATA_FIELDS:
        if field in update_data:
            new_value = update_data[field]
            old_value = getattr(document, field)
            if new_value != old_value:
                changes.append({"field": field, "from": old_value, "to": new_value})
            setattr(document, field, new_value)

    document.updated_by = acting_member
    document.updated_at = _now()

    _append_audit(
        db, document.id, "update_metadata", acting_member,
        detail=kdl.audit_detail_for_metadata_update(changes),
    )

    db.commit()
    db.refresh(document)
    return _to_out(document)


# ── CREATE VERSION ────────────────────────────────────────────────────────


@router.post("/{document_id}/versions", response_model=KnowledgeDocumentOut, status_code=201)
def create_knowledge_document_version(
    document_id: UUID,
    payload: KnowledgeDocumentVersionCreate,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """The ONLY route that ever appends to knowledge_document_versions
    after CREATE, and the only route that ever changes
    knowledge_documents.source_url/source_url_normalized/current_version
    (rule 11). Duplicate-active-URL check excludes this document's own
    row (it is being re-pointed, not colliding with itself)."""
    _reject_md_write(acting_member)
    document = _get_active_document_or_404(db, document_id)

    normalized_url = kdl.normalize_source_url(payload.source_url)

    existing = kdl.find_active_document_by_normalized_url(db, normalized_url, exclude_id=document.id)
    if existing is not None:
        return JSONResponse(
            status_code=409,
            content=kdl.duplicate_source_url_response_body(existing),
        )

    now = _now()
    from_version = document.current_version
    from_source_url = document.source_url

    db.add(
        KnowledgeDocumentVersion(
            document_id=document.id,
            version_label=payload.version_label,
            source_url=payload.source_url,
            change_note=payload.change_description,
            created_by=acting_member,
            created_at=now,
        )
    )

    document.source_url = payload.source_url
    document.source_url_normalized = normalized_url
    document.current_version = payload.version_label
    document.updated_by = acting_member
    document.updated_at = now

    _append_audit(
        db, document.id, "create_version", acting_member,
        detail={
            "from_version": from_version,
            "to_version": payload.version_label,
            "from_source_url": from_source_url,
            "to_source_url": payload.source_url,
        },
    )

    db.commit()
    db.refresh(document)
    return _to_out(document)


# ── ARCHIVE / UNARCHIVE ──────────────────────────────────────────────────


@router.post("/{document_id}/archive", response_model=KnowledgeDocumentOut)
def archive_knowledge_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """lifecycle_status='Archived' only — never touches deleted_at (rule
    12: archive != delete). 409 if already Archived, matching this
    codebase's "clear rejection, not silent no-op" convention."""
    _reject_md_write(acting_member)
    document = _get_active_document_or_404(db, document_id)

    if document.lifecycle_status == "Archived":
        return JSONResponse(
            status_code=409,
            content={
                "error": "knowledge_document_already_archived",
                "message": "This document is already archived.",
            },
        )

    document.lifecycle_status = "Archived"
    document.updated_by = acting_member
    document.updated_at = _now()

    _append_audit(
        db, document.id, "archive", acting_member,
        detail={"lifecycle_status": {"from": "Active", "to": "Archived"}},
    )

    db.commit()
    db.refresh(document)
    return _to_out(document)


@router.post("/{document_id}/unarchive", response_model=KnowledgeDocumentOut)
def unarchive_knowledge_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    _reject_md_write(acting_member)
    document = _get_active_document_or_404(db, document_id)

    if document.lifecycle_status == "Active":
        return JSONResponse(
            status_code=409,
            content={
                "error": "knowledge_document_already_active",
                "message": "This document is already active.",
            },
        )

    document.lifecycle_status = "Active"
    document.updated_by = acting_member
    document.updated_at = _now()

    _append_audit(
        db, document.id, "unarchive", acting_member,
        detail={"lifecycle_status": {"from": "Archived", "to": "Active"}},
    )

    db.commit()
    db.refresh(document)
    return _to_out(document)


# ── SOFT DELETE ───────────────────────────────────────────────────────────


@router.delete("/{document_id}")
def soft_delete_knowledge_document(
    document_id: UUID,
    payload: KnowledgeDocumentDeleteRequest,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """SOFT DELETE ONLY (rules 13-14) — sets deleted_at/deleted_by/
    delete_reason together (knowledge_documents_soft_delete_pairing_check).
    No SQL DELETE statement is ever issued by this or any other route in
    this file. 404 if already soft-deleted or missing, mirroring
    member_leave.py's delete_member_leave_record convention."""
    _reject_md_write(acting_member)
    document = _get_active_document_or_404(db, document_id)

    document.deleted_at = _now()
    document.deleted_by = acting_member
    document.delete_reason = payload.delete_reason

    _append_audit(
        db, document.id, "soft_delete", acting_member,
        detail={"deleted_by": acting_member, "delete_reason": payload.delete_reason},
    )

    db.commit()
    return {"id": str(document.id), "deleted": True}


# ── RESTORE ───────────────────────────────────────────────────────────────


@router.post("/{document_id}/restore", response_model=KnowledgeDocumentOut)
def restore_knowledge_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """404 if the id is missing or NOT currently soft-deleted. Before
    clearing the deletion fields, pre-checks whether this document's OWN
    source_url_normalized now collides with a DIFFERENT active document
    that legitimately reused it while this one was deleted (rule 15) — if
    so, 409, and the OTHER record is never touched. On success, clears
    deleted_at/deleted_by/delete_reason together (satisfying the pairing
    constraint in the NULL direction) — the historical fact of the
    original deletion survives permanently in the immutable
    knowledge_document_audit_log 'soft_delete' row, untouched by this
    route (rule 6)."""
    _reject_md_write(acting_member)
    document = _get_deleted_document_or_404(db, document_id)

    conflict = kdl.find_active_document_by_normalized_url(
        db, document.source_url_normalized, exclude_id=document.id
    )
    if conflict is not None:
        return JSONResponse(
            status_code=409,
            content=kdl.duplicate_source_url_response_body(conflict),
        )

    document.deleted_at = None
    document.deleted_by = None
    document.delete_reason = None
    document.updated_by = acting_member
    document.updated_at = _now()

    _append_audit(db, document.id, "restore", acting_member)

    db.commit()
    db.refresh(document)
    return _to_out(document)


# ── VERSION HISTORY ───────────────────────────────────────────────────────


@router.get("/{document_id}/versions", response_model=List[KnowledgeDocumentVersionOut])
def list_knowledge_document_versions(
    document_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Requires a valid token (Phase 13) — any authenticated Management
    Team member, no owner scoping. Deliberately ignores the parent
    document's deleted_at (see module docstring) — 404 only if the
    document id has never existed at all. Newest-first, matching
    idx_knowledge_document_versions_document's own (document_id,
    created_at DESC) index."""
    _get_any_document_or_404(db, document_id)
    rows = (
        db.query(KnowledgeDocumentVersion)
        .filter(KnowledgeDocumentVersion.document_id == document_id)
        .order_by(KnowledgeDocumentVersion.created_at.desc())
        .all()
    )
    return [KnowledgeDocumentVersionOut.model_validate(r) for r in rows]


# ── AUDIT HISTORY ─────────────────────────────────────────────────────────


@router.get("/{document_id}/audit", response_model=List[KnowledgeDocumentAuditLogOut])
def list_knowledge_document_audit_log(
    document_id: UUID,
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    """Requires a valid token (Phase 14) — any authenticated Management
    Team member may read (rule 1/2), no owner scoping. Immutable — no
    update/delete route exists anywhere for this table (rule 17).
    Deliberately ignores the parent document's deleted_at, same reasoning
    as version history above. Newest-first."""
    _get_any_document_or_404(db, document_id)
    rows = (
        db.query(KnowledgeDocumentAuditLog)
        .filter(KnowledgeDocumentAuditLog.document_id == document_id)
        .order_by(KnowledgeDocumentAuditLog.occurred_at.desc())
        .all()
    )
    return [KnowledgeDocumentAuditLogOut.model_validate(r) for r in rows]
