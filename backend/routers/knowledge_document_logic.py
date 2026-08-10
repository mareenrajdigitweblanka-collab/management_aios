"""Knowledge Management shared business logic (REQ-KM-CRUD-003).

Pure functions, no FastAPI dependency, no auth — same
"business-logic module separate from the router" convention as
backend/routers/leave_logic.py. knowledge_documents.py (the router) is the
only caller; every function here is also directly unit-testable without an
HTTP request.

URL normalization (design doc §4/§7 rule 3) is deliberately ONE function,
shared by every route that ever compares or stores a source URL (create,
metadata update's rejection check, create-version, restore's collision
check) — never duplicated per route, per explicit instruction.
"""

from typing import List, Optional
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.models import KnowledgeDocument

_SAFE_SCHEMES = ("http", "https")


def is_safe_http_url(url: Optional[str]) -> bool:
    """True only for a syntactically valid http:// or https:// URL with a
    non-blank host. Mirrors web-view/js/knowledge-management.js's
    isSafeHttpUrl() — same defense-in-depth rationale, now also enforced
    server-side (the frontend check alone is never trusted). Rejects
    javascript:, data:, blank strings, and anything urlsplit cannot
    parse."""
    if not url or not isinstance(url, str):
        return False
    try:
        parsed = urlsplit(url)
    except ValueError:
        return False
    return parsed.scheme.lower() in _SAFE_SCHEMES and bool(parsed.netloc)


def normalize_source_url(url: str) -> str:
    """Deterministic normalization used as the basis of the active-source-
    URL duplicate check (design doc §3.1/§7 rule 3): lowercases scheme and
    host, strips the query string and fragment, strips a trailing slash
    from the path. A plain URL-normalization heuristic, not Google-file-ID
    extraction — deliberately not AI/smart duplicate detection, per
    explicit instruction (a Drive "file ID only" link and an "/edit" link
    to the same underlying file are NOT recognized as the same document by
    this function; documented as a known limitation, not fixed here).

    Callers must validate with is_safe_http_url() first — this function
    does not itself reject an unsafe scheme."""
    parsed = urlsplit(url)
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/")
    return urlunsplit((scheme, netloc, path, "", ""))


def normalize_title_for_comparison(title: str) -> str:
    """Exact case-insensitive, trimmed comparison key for the same-title-
    different-URL WARNING check (rule 5) — trimming/case-folding is not
    "fuzzy" matching (the content must still match exactly); no similarity
    scoring of any kind is implemented here or anywhere else in this
    module."""
    return (title or "").strip().lower()


class DuplicateSourceUrlError(Exception):
    """Raised when a create/version/restore operation would result in two
    ACTIVE (non-soft-deleted) knowledge_documents rows sharing the same
    source_url_normalized. Callers catch this and translate it into an
    HTTP 409 using duplicate_source_url_response_body(exc.existing) — same
    catch-and-translate pattern as leave_logic.LeaveOverlapError."""

    def __init__(self, existing: KnowledgeDocument):
        self.existing = existing
        super().__init__("An active document already uses this source URL.")


def duplicate_source_url_response_body(existing: KnowledgeDocument) -> dict:
    """409 response body — deliberately omits creator/team (not needed to
    identify the conflict, matches leave_logic's "omit unnecessary text"
    convention)."""
    return {
        "error": "knowledge_document_duplicate_source_url",
        "message": "An active document already uses this source URL.",
        "conflict": {
            "id": str(existing.id),
            "title": existing.title,
        },
    }


def find_active_document_by_normalized_url(
    db: Session, normalized_url: str, exclude_id: Optional[UUID] = None
) -> Optional[KnowledgeDocument]:
    """The ONE query every duplicate-URL check (create, create-version,
    restore) uses — never reimplemented per route."""
    query = db.query(KnowledgeDocument).filter(
        KnowledgeDocument.source_url_normalized == normalized_url,
        KnowledgeDocument.deleted_at.is_(None),
    )
    if exclude_id is not None:
        query = query.filter(KnowledgeDocument.id != exclude_id)
    return query.first()


def assert_no_active_duplicate_source_url(
    db: Session, normalized_url: str, exclude_id: Optional[UUID] = None
) -> None:
    """Raises DuplicateSourceUrlError before any write — the application-
    layer control that must be the normal user-facing error path (rule
    15), not the database's own partial unique index (which remains only
    as defense-in-depth)."""
    existing = find_active_document_by_normalized_url(db, normalized_url, exclude_id)
    if existing is not None:
        raise DuplicateSourceUrlError(existing)


def find_same_title_different_url_warning(
    db: Session, title: str, normalized_url: str, exclude_id: Optional[UUID] = None
) -> Optional[str]:
    """Rule 5 — a non-blocking warning, never a rejection. Returns a
    ready-to-display warning string, or None when no exact-title/
    different-URL match exists among ACTIVE documents. No fuzzy/similarity
    matching of any kind — exact (case-insensitive, trimmed) title
    equality only."""
    comparison_title = normalize_title_for_comparison(title)
    if not comparison_title:
        return None
    query = db.query(KnowledgeDocument).filter(
        func.lower(func.trim(KnowledgeDocument.title)) == comparison_title,
        KnowledgeDocument.source_url_normalized != normalized_url,
        KnowledgeDocument.deleted_at.is_(None),
    )
    if exclude_id is not None:
        query = query.filter(KnowledgeDocument.id != exclude_id)
    existing = query.first()
    if existing is None:
        return None
    return (
        "A document titled \"" + existing.title + "\" with a different "
        "source URL already exists."
    )


def audit_detail_for_metadata_update(changes: List[dict]) -> Optional[dict]:
    """Builds the single JSONB `detail` payload for one update_metadata
    audit row — one row per action (rule: "Create audit event
    atomically"), carrying every changed field as {field, from, to}
    entries, not one audit row per field."""
    if not changes:
        return None
    return {"changes": changes}
