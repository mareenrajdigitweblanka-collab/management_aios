"""Local Prototype Attachment metadata store (REQ-CAL-REV-ATTACH-001-LOCAL-
PROTO, 2026-09-23).

Enabled ONLY when LOCAL_PROTOTYPE_ATTACHMENTS=true (backend/config.py
is_local_prototype_attachments_enabled) — off by default. When on,
attachment METADATA (never file bytes — those still go to Cloudinary via
the existing, unmodified backend/attachment_storage.py — and never staff
review text/summary content, which stays exactly where it already is, in
PostgreSQL via the existing StaffReviewSummary table) is written to a
separate, local-only SQLite file instead of the still-unmigrated
management_aios.staff_review_summary_attachments Postgres table.

WHY this exists: the real PostgreSQL migration (database/migrations/
2026-09-23-create-staff-review-summary-attachments.sql) is blocked in this
local environment by a privilege gap discovered via a disposable,
rolled-back dry run — the configured database role has SELECT/INSERT/
UPDATE on staff_review_summaries but not REFERENCES, which the migration's
foreign key needs, and only the table's owning role (not this one) can
grant it. This mode is a LOCAL PROTOTYPE workaround for exercising
Cloudinary upload/download/PDF/ZIP locally in the meantime — it is NOT a
substitute for that migration, NOT a production storage strategy, and NOT
silently a browser cache (nothing here ever touches localStorage/
sessionStorage/IndexedDB — this is a real server-side SQLite file).

⚠ LOCAL-ONLY PERSISTENCE — READ BEFORE RELYING ON THIS DATA ⚠
This SQLite file lives at LOCAL_ATTACHMENT_METADATA_DB_PATH (config.py),
inside the git-ignored local_data/ directory. It:
  - is NEVER committed to git (see .gitignore) and will NOT follow this
    repository to another machine, another developer's checkout, or any
    deployment (Vercel or otherwise);
  - has NO relationship whatsoever to the real, shared PostgreSQL database
    — a review summary's own text/reviewer/employee/dates stay fully
    durable and shared (they were never touched by this mode), but WHICH
    ATTACHMENTS belong to it is knowledge that exists only on this one
    machine, in this one file, until the real migration replaces this
    mode entirely;
  - has NO cross-database transaction with the PostgreSQL summary insert:
    claiming a pending attachment (re-pointing its summary_id once the
    real PostgreSQL summary row has already committed) is a SEPARATE,
    SECOND write, in this SQLite file, right after — if it fails after the
    PostgreSQL insert already succeeded, the summary exists with its
    attachments still "pending" rather than claimed. This is an inherent,
    documented limitation of splitting metadata across two database
    engines with no distributed-transaction coordinator, acceptable only
    because this is explicitly a local prototype, never production.

EXPORT / TRANSITION PLAN — once the real PostgreSQL migration is applied
(privilege granted, migration run against the real database):
  1. Stop using LOCAL_PROTOTYPE_ATTACHMENTS (unset it or set it to a value
     other than "true") — every route immediately reverts to the original,
     unmodified PostgreSQL-backed code path (backend/routers/
     staff_review_summaries.py), which was never altered by this module.
  2. Export this SQLite file's rows (a plain `SELECT * FROM
     local_attachment_metadata`, or open the .db file directly with any
     SQLite client) and INSERT them into the now-real
     management_aios.staff_review_summary_attachments table, preserving
     each row's summary_id / storage_public_id / storage_resource_type
     exactly — the Cloudinary assets themselves need no changes at all,
     since this mode never used a different storage provider or a
     different upload convention, only a different metadata database.
  3. Delete local_data/ once the export is confirmed against the real
     database (git-ignored, so this is purely local cleanup, not a repo
     change).
This module intentionally mirrors StaffReviewSummaryAttachment's own
column set exactly (backend/models.py) so that export mapping is a
column-for-column copy, never a data transformation.
"""

import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy import Column, DateTime, Integer, String, Uuid, create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

import backend.config as config

LocalAttachmentBase = declarative_base()


class LocalAttachmentMetadata(LocalAttachmentBase):
    """SQLite-only mirror of backend/models.py StaffReviewSummaryAttachment
    — same column set, deliberately, so export to the real PostgreSQL
    table (once migrated) is a column-for-column copy. summary_id is a
    plain UUID column here, NEVER a foreign key (SQLite has no way to
    reference a row in a completely different PostgreSQL database) —
    referential integrity for summary_id is enforced entirely at the
    application layer, in backend/routers/staff_review_summaries.py,
    exactly the same way it already is for the real PostgreSQL table's own
    reviewed_staff_id (see that table's own docstring)."""

    __tablename__ = "local_attachment_metadata"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    summary_id = Column(Uuid(as_uuid=True), nullable=True)  # NULL while pending — see the migration file's own two-phase-flow docstring
    uploaded_by = Column(String, nullable=False)
    original_filename = Column(String(255), nullable=False)
    content_type = Column(String(120), nullable=False)
    attachment_type = Column(String(20), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    storage_provider = Column(String(20), nullable=False, default="cloudinary")
    storage_public_id = Column(String(255), nullable=False)
    storage_resource_type = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


_engine = None
_session_factory = None


def _resolve_db_path() -> Path:
    # Relative to the process working directory (this backend is always
    # run with the repository root as cwd — see backend/README.md), same
    # convention DATABASE_URL's own relative-path handling would use.
    # Read from the config MODULE at call time (not a name imported once at
    # import time): tests patch config.LOCAL_ATTACHMENT_METADATA_DB_PATH to a
    # temp file, and an import-time copy silently ignored that patch — every
    # test run then wrote into the real local_data/ file (fixed 2026-09-24).
    return Path(config.LOCAL_ATTACHMENT_METADATA_DB_PATH).resolve()


def get_local_attachment_engine():
    """Lazily creates the SQLite engine AND the local_data/ directory AND
    the table itself on first use — "initialize only the new local SQLite
    file automatically" (never anything else, never PostgreSQL). Mirrors
    backend/database.py get_engine()'s lazy-singleton shape."""
    global _engine
    if _engine is None:
        db_path = _resolve_db_path()
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(
            "sqlite:///" + str(db_path),
            connect_args={"check_same_thread": False},
        )
        LocalAttachmentBase.metadata.create_all(_engine)
    return _engine


def get_local_attachment_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(bind=get_local_attachment_engine(), autocommit=False, autoflush=False)
    return _session_factory


@contextmanager
def local_attachment_session():
    """One independent session per call — this is a SEPARATE database
    engine from the request's main `db: Session = Depends(get_db)`
    (PostgreSQL), with its own connection and its own commit/rollback
    lifecycle; the two are never the same transaction (see this module's
    own docstring for why a claim can, in a genuine failure window, commit
    to one and not the other)."""
    factory = get_local_attachment_session_factory()
    session = factory()
    try:
        yield session
    finally:
        session.close()


def reset_local_attachment_engine_for_tests():
    """Test-only — forces a fresh engine/session-factory pair (and, since
    each test already points LOCAL_ATTACHMENT_METADATA_DB_PATH at its own
    temp file, a fresh on-disk SQLite file) on the next call. Never used by
    any production code path."""
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None


# ── Query/write functions — mirror the shape of the equivalent Postgres-
#    backed functions in backend/routers/staff_review_summaries.py exactly
#    (same filtering semantics: pending = summary_id IS NULL, list = ordered
#    by created_at, ownership = uploaded_by), so the router's call sites
#    can branch on is_local_prototype_attachments_enabled() and otherwise
#    treat the two implementations identically. ─────────────────────────


def local_insert_pending_attachment(
    *, uploaded_by: str, original_filename: str, content_type: str, attachment_type: str,
    file_size_bytes: int, storage_public_id: str, storage_resource_type: str,
) -> LocalAttachmentMetadata:
    with local_attachment_session() as session:
        record = LocalAttachmentMetadata(
            id=uuid.uuid4(),
            summary_id=None,
            uploaded_by=uploaded_by,
            original_filename=original_filename,
            content_type=content_type,
            attachment_type=attachment_type,
            file_size_bytes=file_size_bytes,
            storage_provider="cloudinary",
            storage_public_id=storage_public_id,
            storage_resource_type=storage_resource_type,
            created_at=datetime.now(timezone.utc),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        session.expunge(record)
        return record


def local_get_pending_by_ids(ids: List[uuid.UUID]) -> Dict[uuid.UUID, LocalAttachmentMetadata]:
    if not ids:
        return {}
    with local_attachment_session() as session:
        rows = (
            session.query(LocalAttachmentMetadata)
            .filter(LocalAttachmentMetadata.id.in_(ids))
            .all()
        )
        session.expunge_all()
        return {row.id: row for row in rows}


def local_claim_attachments(ids: List[uuid.UUID], summary_id: uuid.UUID) -> None:
    """Re-points every id's summary_id — called ONLY after the caller has
    already validated every id via local_get_pending_by_ids (existence,
    still-pending, owned by the acting reviewer — see
    backend/routers/staff_review_summaries.py _claim_pending_attachments)
    and ONLY after the real PostgreSQL summary row has already committed.
    This is its own, separate SQLite transaction — see this module's own
    docstring for the documented cross-database non-atomicity this
    implies."""
    if not ids:
        return
    with local_attachment_session() as session:
        session.query(LocalAttachmentMetadata).filter(
            LocalAttachmentMetadata.id.in_(ids)
        ).update({LocalAttachmentMetadata.summary_id: summary_id}, synchronize_session=False)
        session.commit()


def local_list_attachments_for_summary(summary_id: uuid.UUID) -> List[LocalAttachmentMetadata]:
    """Pending rows (summary_id IS NULL) are never returned — "pending
    files must not appear as saved attachments" — matching the exact same
    guarantee the PostgreSQL-backed idx_staff_review_summary_attachments_
    summary partial index enforces for the original implementation."""
    with local_attachment_session() as session:
        rows = (
            session.query(LocalAttachmentMetadata)
            .filter(LocalAttachmentMetadata.summary_id == summary_id)
            .order_by(LocalAttachmentMetadata.created_at)
            .all()
        )
        session.expunge_all()
        return rows


def local_get_attachment_for_summary(
    attachment_id: uuid.UUID, summary_id: uuid.UUID
) -> Optional[LocalAttachmentMetadata]:
    with local_attachment_session() as session:
        row = (
            session.query(LocalAttachmentMetadata)
            .filter(
                LocalAttachmentMetadata.id == attachment_id,
                LocalAttachmentMetadata.summary_id == summary_id,
            )
            .first()
        )
        if row is not None:
            session.expunge(row)
        return row
