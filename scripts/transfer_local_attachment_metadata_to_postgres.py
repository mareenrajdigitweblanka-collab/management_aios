#!/usr/bin/env python3
"""Transfer Review Summary attachment METADATA from the machine-local
prototype SQLite file into the shared PostgreSQL table
management_aios.staff_review_summary_attachments (2026-09-24).

Background: while the PostgreSQL migration was blocked, attachment metadata
lived in local_data/local_prototype_attachments.db (backend/
local_attachment_metadata.py, LOCAL_PROTOTYPE_ATTACHMENTS=true). File BYTES
never lived there - they are private ("authenticated") Cloudinary assets and
stay exactly where they are; this script only copies the metadata rows that
say which asset belongs to which review summary. Nothing here reads, moves,
re-uploads, or deletes a Cloudinary asset, and the SQLite file is never
modified or deleted.

Usage (run from the repository root, with DATABASE_URL pointing at the
intended target - see backend/config.py / .env):

    python -m scripts.transfer_local_attachment_metadata_to_postgres
        DRY RUN (default). Reads only; prints the target identity, the
        target's readiness (table + privileges), every classification
        below, and what --apply would do. Writes nothing to PostgreSQL.

    python -m scripts.transfer_local_attachment_metadata_to_postgres --backup-only
        Only takes the verified SQLite backup (see below).

    python -m scripts.transfer_local_attachment_metadata_to_postgres --apply \\
        --confirm-target HOST:PORT/DATABASE
        Performs the transfer. --confirm-target must exactly match the
        identity printed by the dry run - a guard against running against
        the wrong database (e.g. a copy instead of the intended one).

Options: --sqlite-path, --backup-dir, --include-pending (also transfer
    never-claimed "pending" uploads; off by default - they belong to no
    review and are normally swept by
    scripts/cleanup_pending_review_summary_attachments.py),
    --require-asset (verify every row that would be imported against
    Cloudinary's Admin API: the asset must exist and its byte size must equal
    the stored size. A pending row with no asset is EXCLUDED as a test
    fixture / failed upload; a LINKED row with no asset, a size mismatch, or
    a verification error BLOCKS the transfer. --apply always behaves as if
    this were given - unverified rows are never imported),
    --verify-excluded (also look up the excluded rows' assets, for the
    report only - never changes any decision),
    --report PATH (write a JSON file listing every SQLite row by id with its
    classification, reason, review link and Cloudinary status),
    --verify-storage (advisory HEAD check of each row's Cloudinary asset;
    prints status counts only, never a URL; never blocks the transfer).

What each SQLite row is classified as:
    importable          linked to a review summary that exists in PostgreSQL
    excluded (missing summary)   linked to a summary id that PostgreSQL does
                        not have - cannot be imported (the foreign key would
                        reject it; the foreign key is never dropped to make
                        it fit). Reported by count and never deleted.
    excluded (pending)  summary_id is NULL; skipped unless --include-pending
    already present     the target already holds an identical row (rerun)
    conflict            the target holds a DIFFERENT row with the same id or
                        the same storage_public_id - blocks --apply
    invalid             a value the PostgreSQL CHECK constraints or the
                        download route could not use - blocks --apply if the
                        row would otherwise be imported

Safety properties:
    - --apply refuses unless the target table exists, the role has
      SELECT+INSERT on it, no blocking issue exists, and --confirm-target
      matches. It never creates or alters any table or grants anything.
    - The SQLite file is backed up (sqlite3 backup API - consistent even
      while the app is writing) and the backup is integrity-checked and
      row-counted BEFORE any PostgreSQL write; the transfer then reads the
      BACKUP, so it works from one fixed snapshot.
    - IDs, review links, timestamps (SQLite stores naive UTC) and every
      other column are preserved exactly. Insert is ON CONFLICT (id) DO
      NOTHING inside one transaction; every inserted row is read back and
      compared, and the transaction is rolled back on any mismatch or if
      the review-summary row count changed.
    - Safe to rerun: rows already present are skipped; new SQLite rows
      created since the last run are picked up.
"""

import argparse
import hashlib
import json
import sqlite3
import sys
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine, make_url

from backend.attachment_integrity import find_orphan_attachments
from backend.attachment_storage import ATTACHMENT_STORAGE_FOLDER
from backend.config import (
    ATTACHMENT_TYPE_STORAGE_RESOURCE_TYPE,
    DATABASE_URL,
    LOCAL_ATTACHMENT_METADATA_DB_PATH,
    VALID_ATTACHMENT_TYPES,
    load_cloudinary_config,
)

SCHEMA = "management_aios"
TARGET_TABLE = "staff_review_summary_attachments"
SUMMARIES_TABLE = "staff_review_summaries"
VALID_UPLOADERS = ("mayurika", "suman", "arun", "rajiv", "paraparan")
VALID_RESOURCE_TYPES = ("image", "video", "raw")
COLUMNS = (
    "id", "summary_id", "uploaded_by", "original_filename", "content_type",
    "attachment_type", "file_size_bytes", "storage_provider",
    "storage_public_id", "storage_resource_type", "created_at",
)

IMPORTABLE = "importable"
EXCLUDED_MISSING_SUMMARY = "excluded_missing_summary"
EXCLUDED_PENDING = "excluded_pending"
ALREADY_PRESENT = "already_present"
CONFLICT = "conflict"
INVALID = "invalid"


# ── SQLite side ────────────────────────────────────────────────────────────


def read_sqlite_rows(path: Path) -> List[dict]:
    """Read-only. Returns raw dicts keyed by column name."""
    uri = "file:%s?mode=ro" % path.resolve().as_posix()
    conn = sqlite3.connect(uri, uri=True)
    try:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT %s FROM local_attachment_metadata" % ", ".join(COLUMNS))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def backup_sqlite(path: Path, backup_dir: Path) -> Tuple[Path, str, int]:
    """Consistent copy via the sqlite3 backup API (safe while the app is
    writing), then verified: PRAGMA integrity_check must be 'ok' and the
    row count must equal the source's. Returns (backup_path, sha256, rows).
    Never overwrites an existing backup."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target = backup_dir / ("%s.%s.bak" % (path.stem, stamp))
    if target.exists():
        raise RuntimeError("Backup file already exists: %s" % target)
    src = sqlite3.connect("file:%s?mode=ro" % path.resolve().as_posix(), uri=True)
    dst = sqlite3.connect(str(target))
    try:
        src.backup(dst)
        src_count = src.execute("SELECT count(*) FROM local_attachment_metadata").fetchone()[0]
    finally:
        dst.close()
        src.close()
    check = sqlite3.connect("file:%s?mode=ro" % target.resolve().as_posix(), uri=True)
    try:
        integrity = check.execute("PRAGMA integrity_check").fetchone()[0]
        backup_count = check.execute("SELECT count(*) FROM local_attachment_metadata").fetchone()[0]
    finally:
        check.close()
    if integrity != "ok" or backup_count != src_count:
        raise RuntimeError(
            "Backup verification failed (integrity=%s, rows %s vs %s)." % (integrity, backup_count, src_count)
        )
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    return target, digest, backup_count


# ── Row parsing / validation (pure) ────────────────────────────────────────


def _parse_uuid(value) -> Optional[uuid.UUID]:
    if value is None or value == "":
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        raise ValueError("not a valid UUID: %r" % (str(value)[:40],))


def _parse_created_at(value) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)  # SQLite stored naive UTC
    return parsed


def parse_row(raw: dict) -> Tuple[Optional[dict], List[str]]:
    """Returns (typed_row, problems). typed_row is None when the id itself
    is unusable. `problems` lists everything that would make PostgreSQL or
    the download route reject/misuse the row - including whether it has
    every field needed for an authorized Cloudinary download."""
    problems: List[str] = []
    try:
        row_id = _parse_uuid(raw.get("id"))
    except ValueError as exc:
        return None, ["id " + str(exc)]
    if row_id is None:
        return None, ["id is empty"]

    row = {"id": row_id}
    try:
        row["summary_id"] = _parse_uuid(raw.get("summary_id"))
    except ValueError as exc:
        row["summary_id"] = None
        problems.append("summary_id " + str(exc))
    try:
        row["created_at"] = _parse_created_at(raw.get("created_at"))
    except (ValueError, TypeError):
        row["created_at"] = None
        problems.append("created_at is not a valid timestamp")

    for name in ("uploaded_by", "original_filename", "content_type", "attachment_type",
                 "storage_provider", "storage_public_id", "storage_resource_type"):
        row[name] = raw.get(name)
    row["file_size_bytes"] = raw.get("file_size_bytes")

    if row["uploaded_by"] not in VALID_UPLOADERS:
        problems.append("uploaded_by is not a Management Team member key")
    if row["attachment_type"] not in VALID_ATTACHMENT_TYPES:
        problems.append("attachment_type is not allowed")
    if not isinstance(row["file_size_bytes"], int) or row["file_size_bytes"] <= 0:
        problems.append("file_size_bytes must be a positive integer")
    if not str(row["original_filename"] or "").strip() or len(str(row["original_filename"])) > 255:
        problems.append("original_filename missing or over 255 characters")
    if not str(row["content_type"] or "").strip() or len(str(row["content_type"])) > 120:
        problems.append("content_type missing or over 120 characters")
    # Fields the authenticated download route needs (backend/attachment_storage.py
    # CloudinaryAttachmentStorage.download_bytes): provider, public id, resource type.
    if row["storage_provider"] != "cloudinary":
        problems.append("storage_provider is not 'cloudinary'")
    public_id = row["storage_public_id"] or ""
    if not public_id.strip() or len(public_id) > 255:
        problems.append("storage_public_id missing or over 255 characters")
    elif not public_id.startswith(ATTACHMENT_STORAGE_FOLDER + "/"):
        problems.append("storage_public_id is not under the expected Cloudinary folder")
    if row["storage_resource_type"] not in VALID_RESOURCE_TYPES:
        problems.append("storage_resource_type is not image/video/raw")
    elif (row["attachment_type"] in ATTACHMENT_TYPE_STORAGE_RESOURCE_TYPE
          and row["storage_resource_type"] != ATTACHMENT_TYPE_STORAGE_RESOURCE_TYPE[row["attachment_type"]]):
        problems.append("storage_resource_type does not match the type the download route will request")
    return row, problems


def rows_equal(a: dict, b: dict) -> bool:
    """Compares every preserved column (timestamps as instants)."""
    for column in COLUMNS:
        left, right = a.get(column), b.get(column)
        if column == "created_at":
            if left is None or right is None or left != right:
                return False
        elif left != right:
            return False
    return True


class Analysis:
    def __init__(self):
        self.classified: Dict[str, List[dict]] = {
            IMPORTABLE: [], EXCLUDED_MISSING_SUMMARY: [], EXCLUDED_PENDING: [],
            ALREADY_PRESENT: [], CONFLICT: [], INVALID: [],
        }
        self.blocking: List[str] = []
        self.notes: List[str] = []
        self.total = 0
        self.linked = 0
        self.pending = 0
        self.linked_to_soft_deleted = 0

    def count(self, key: str) -> int:
        return len(self.classified[key])

    @property
    def to_insert(self) -> List[dict]:
        return self.classified[IMPORTABLE]


def analyze(
    raw_rows: List[dict],
    *,
    summaries: Dict[uuid.UUID, Optional[datetime]],
    target_by_id: Dict[uuid.UUID, dict],
    target_by_public_id: Dict[str, uuid.UUID],
    include_pending: bool = False,
    summary_reviewers: Optional[Dict[uuid.UUID, str]] = None,
) -> Analysis:
    """Pure classification - no I/O. `summaries` maps every existing
    PostgreSQL summary id to its deleted_at (None = active). `summary_reviewers`
    (optional) maps each summary id to its reviewer_member_key; when given, a
    linked row whose uploader is not that reviewer is refused, because without
    a foreign key the same-reviewer rule the app enforces on new links must
    be re-verified for transferred ones."""
    result = Analysis()
    result.total = len(raw_rows)
    seen_ids: Dict[uuid.UUID, int] = {}
    seen_public_ids: Dict[str, uuid.UUID] = {}

    for raw in raw_rows:
        row, problems = parse_row(raw)
        if row is None:
            result.classified[INVALID].append({"raw_id": raw.get("id"), "problems": problems})
            result.blocking.append("Unusable id %r: %s" % (str(raw.get("id"))[:40], "; ".join(problems)))
            continue
        row["problems"] = problems
        if row["summary_id"] is None and raw.get("summary_id") in (None, ""):
            result.pending += 1
        else:
            result.linked += 1

        if row["id"] in seen_ids:
            result.blocking.append("Duplicate id in SQLite: %s" % row["id"])
            continue
        seen_ids[row["id"]] = 1
        pid = row["storage_public_id"]
        would_import = True

        if row["summary_id"] is None and raw.get("summary_id") in (None, ""):
            if not include_pending:
                row["reason"] = "pending (never linked to a review); --include-pending not given"
                result.classified[EXCLUDED_PENDING].append(row)
                would_import = False
        elif row["summary_id"] is not None and row["summary_id"] not in summaries:
            row["reason"] = "linked to summary %s which does not exist in PostgreSQL" % row["summary_id"]
            result.classified[EXCLUDED_MISSING_SUMMARY].append(row)
            would_import = False
        elif row["summary_id"] is not None and summaries.get(row["summary_id"]) is not None:
            result.linked_to_soft_deleted += 1  # still importable - link is preserved

        if (would_import and summary_reviewers is not None and row["summary_id"] is not None
                and summary_reviewers.get(row["summary_id"]) not in (None, row["uploaded_by"])):
            problems.append("uploaded_by is not the reviewer who owns the linked review summary")

        if not would_import:
            continue

        if problems:
            row["reason"] = "; ".join(problems)
            result.classified[INVALID].append(row)
            result.blocking.append("Row %s is not importable: %s" % (row["id"], "; ".join(problems)))
            continue

        if pid in seen_public_ids:
            row["reason"] = "duplicate storage_public_id"
            result.classified[INVALID].append(row)
            result.blocking.append(
                "Duplicate storage_public_id in SQLite (rows %s and %s)" % (seen_public_ids[pid], row["id"])
            )
            continue
        seen_public_ids[pid] = row["id"]

        existing = target_by_id.get(row["id"])
        if existing is not None:
            if rows_equal(row, existing):
                row["reason"] = "already present in the target, identical"
                result.classified[ALREADY_PRESENT].append(row)
            else:
                row["reason"] = "target has a different row with the same id"
                result.classified[CONFLICT].append(row)
                result.blocking.append("Target already has a DIFFERENT row with id %s" % row["id"])
            continue
        other = target_by_public_id.get(pid)
        if other is not None and other != row["id"]:
            row["reason"] = "target already tracks this storage_public_id under another id"
            result.classified[CONFLICT].append(row)
            result.blocking.append("Target already has storage_public_id of row %s under id %s" % (row["id"], other))
            continue
        result.classified[IMPORTABLE].append(row)

    return result


# ── PostgreSQL side ────────────────────────────────────────────────────────


def target_identity(engine: Engine) -> str:
    url = engine.url
    if url.get_backend_name() == "sqlite":
        return "sqlite:%s" % (url.database or ":memory:")
    return "%s:%s/%s" % (url.host, url.port or 5432, url.database)


def _qualified(engine: Engine, table: str) -> str:
    # Real PostgreSQL uses the management_aios schema; the SQLite test
    # engine ATTACHes an in-memory database under the same name.
    return "%s.%s" % (SCHEMA, table)


def check_target_readiness(engine: Engine) -> dict:
    """What can be said about the target without writing anything."""
    info = {"table_exists": False, "can_select": None, "can_insert": None,
            "can_create_table": None, "can_reference": None, "notes": []}
    with engine.connect() as conn:
        is_pg = engine.dialect.name == "postgresql"
        if is_pg:
            conn.execute(text("SET TRANSACTION READ ONLY"))
            info["table_exists"] = conn.execute(
                text("SELECT to_regclass(:n) IS NOT NULL"), {"n": _qualified(engine, TARGET_TABLE)}
            ).scalar()
            info["can_create_table"] = conn.execute(
                text("SELECT has_schema_privilege(current_user, :s, 'CREATE')"), {"s": SCHEMA}
            ).scalar()
            info["can_reference"] = conn.execute(
                text("SELECT has_table_privilege(current_user, :t, 'REFERENCES')"),
                {"t": _qualified(engine, SUMMARIES_TABLE)},
            ).scalar()
            if info["table_exists"]:
                info["can_select"] = conn.execute(
                    text("SELECT has_table_privilege(current_user, :t, 'SELECT')"),
                    {"t": _qualified(engine, TARGET_TABLE)},
                ).scalar()
                info["can_insert"] = conn.execute(
                    text("SELECT has_table_privilege(current_user, :t, 'INSERT')"),
                    {"t": _qualified(engine, TARGET_TABLE)},
                ).scalar()
        else:
            info["table_exists"] = inspect(engine).has_table(TARGET_TABLE, schema=SCHEMA)
            info["can_select"] = info["can_insert"] = info["table_exists"]
    return info


def load_target_state(engine: Engine, table_exists: bool):
    with engine.connect() as conn:
        summaries = {
            _as_uuid(r[0]): r[1]
            for r in conn.execute(text("SELECT id, deleted_at FROM %s" % _qualified(engine, SUMMARIES_TABLE)))
        }
        by_id: Dict[uuid.UUID, dict] = {}
        by_public_id: Dict[str, uuid.UUID] = {}
        if table_exists:
            for r in conn.execute(text("SELECT %s FROM %s" % (", ".join(COLUMNS), _qualified(engine, TARGET_TABLE)))):
                row = dict(zip(COLUMNS, r))
                row["id"] = _as_uuid(row["id"])
                row["summary_id"] = _as_uuid(row["summary_id"]) if row["summary_id"] is not None else None
                row["created_at"] = _parse_created_at(row["created_at"])
                by_id[row["id"]] = row
                by_public_id[row["storage_public_id"]] = row["id"]
    return summaries, by_id, by_public_id


def load_summary_reviewers(engine: Engine) -> Dict[uuid.UUID, str]:
    with engine.connect() as conn:
        return {
            _as_uuid(r[0]): r[1]
            for r in conn.execute(text("SELECT id, reviewer_member_key FROM %s" % _qualified(engine, SUMMARIES_TABLE)))
        }


def _as_uuid(value) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def count_rows(engine: Engine, table: str) -> int:
    with engine.connect() as conn:
        return conn.execute(text("SELECT count(*) FROM %s" % _qualified(engine, table))).scalar()


def apply_transfer(engine: Engine, rows: List[dict]) -> dict:
    """One transaction: insert (ON CONFLICT (id) DO NOTHING), read every
    row back and compare, confirm the summaries table is untouched, then
    commit. Any discrepancy rolls everything back and raises."""
    insert_sql = text(
        "INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (id) DO NOTHING"
        % (_qualified(engine, TARGET_TABLE), ", ".join(COLUMNS), ", ".join(":" + c for c in COLUMNS))
    )
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            summaries_before = conn.execute(text("SELECT count(*) FROM %s" % _qualified(engine, SUMMARIES_TABLE))).scalar()
            before = conn.execute(text("SELECT count(*) FROM %s" % _qualified(engine, TARGET_TABLE))).scalar()
            inserted = 0
            for row in rows:
                params = {c: row[c] for c in COLUMNS}
                if engine.dialect.name != "postgresql":
                    # SQLite (tests only) stores SQLAlchemy Uuid as CHAR(32) hex
                    params["id"] = params["id"].hex
                    if params["summary_id"] is not None:
                        params["summary_id"] = params["summary_id"].hex
                inserted += conn.execute(insert_sql, params).rowcount
            after = conn.execute(text("SELECT count(*) FROM %s" % _qualified(engine, TARGET_TABLE))).scalar()
            summaries_after = conn.execute(text("SELECT count(*) FROM %s" % _qualified(engine, SUMMARIES_TABLE))).scalar()
            if after - before != inserted:
                raise RuntimeError("Row-count mismatch: table grew by %s, inserted %s." % (after - before, inserted))
            if summaries_after != summaries_before:
                raise RuntimeError("staff_review_summaries row count changed - aborting.")
            # No foreign key protects summary_id: refuse (and roll back) if any
            # inserted row links to a summary that does not exist.
            orphans = find_orphan_attachments(conn, [r["id"] for r in rows])
            if orphans:
                raise RuntimeError("Orphan attachment link(s) after insert (summary missing): %s" % orphans)
            for row in rows:
                readback = conn.execute(
                    text("SELECT %s FROM %s WHERE id = :id" % (", ".join(COLUMNS), _qualified(engine, TARGET_TABLE))),
                    {"id": row["id"] if engine.dialect.name == "postgresql" else row["id"].hex},
                ).fetchone()
                if readback is None:
                    raise RuntimeError("Row %s missing after insert." % row["id"])
                got = dict(zip(COLUMNS, readback))
                got["id"] = _as_uuid(got["id"])
                got["summary_id"] = _as_uuid(got["summary_id"]) if got["summary_id"] is not None else None
                got["created_at"] = _parse_created_at(got["created_at"])
                if not rows_equal(row, got):
                    raise RuntimeError("Row %s differs from the source after insert." % row["id"])
            trans.commit()
        except Exception:
            trans.rollback()
            raise
    return {"before": before, "after": after, "inserted": inserted}


# ── Cloudinary asset existence (Admin API) ─────────────────────────────────


def cloudinary_asset_status(row: dict) -> dict:
    """Cloudinary Admin API lookup of the row's private asset. Returns
    {"status": "exists", "bytes": n, "format": f} or {"status": "missing"}.
    Any other outcome (outage, auth error, rate limit) RAISES, so it can
    never be mistaken for 'no asset'."""
    config = load_cloudinary_config()
    if config is None:
        raise RuntimeError("Cloudinary is not configured; cannot verify assets.")
    import cloudinary
    import cloudinary.api
    import cloudinary.exceptions

    # bounded wait: an unreachable Admin API must surface as an error quickly
    # (recorded as "could not verify" -> blocking), never hang the transfer
    cloudinary.config(secure=True, timeout=20, **config)
    try:
        res = cloudinary.api.resource(
            row["storage_public_id"], resource_type=row["storage_resource_type"], type="authenticated"
        )
    except cloudinary.exceptions.NotFound:
        return {"status": "missing"}
    return {"status": "exists", "bytes": res.get("bytes"), "format": res.get("format")}


def cloudinary_delivery_status(row: dict) -> dict:
    """FALLBACK, dry-run reporting only (--asset-check delivery): probes the
    asset through Cloudinary's delivery host (res.cloudinary.com) with a
    signed HEAD request, for when the Admin API host (api.cloudinary.com)
    is unreachable. 200 = exists (Content-Length gives the byte size); 404 =
    missing; 401 = exists but delivery-restricted (Cloudinary's PDF/ZIP
    account setting) - byte size cannot be verified; anything else raises.
    Weaker than the Admin API, so --apply never uses it."""
    import urllib.error
    import urllib.request

    config = load_cloudinary_config()
    if config is None:
        raise RuntimeError("Cloudinary is not configured; cannot verify assets.")
    import cloudinary
    import cloudinary.utils

    cloudinary.config(secure=True, **config)
    url, _ = cloudinary.utils.cloudinary_url(
        row["storage_public_id"], resource_type=row["storage_resource_type"], type="authenticated", sign_url=True
    )
    try:
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=20) as resp:
            length = resp.headers.get("Content-Length")
            return {"status": "exists", "bytes": int(length) if length else None, "method": "delivery"}
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return {"status": "missing", "method": "delivery"}
        if exc.code == 401:
            return {"status": "exists", "bytes": None, "method": "delivery", "note": "delivery-restricted (401); size not verified"}
        raise


def check_assets(rows: List[dict], checker=cloudinary_asset_status) -> None:
    """Sets row["asset"] on every row: the checker's dict, or
    {"status": "error", "detail": ...}. Never raises."""
    for row in rows:
        try:
            row["asset"] = checker(row)
        except Exception as exc:  # verification uncertainty is recorded, not guessed
            row["asset"] = {"status": "error", "detail": type(exc).__name__ + ": " + str(exc)[:120]}


def apply_asset_verification(analysis: "Analysis", checker=cloudinary_asset_status) -> None:
    """Verifies every row that would be imported. exists + byte size equal ->
    stays importable. Pending + missing -> EXCLUDED_PENDING ("no Cloudinary
    asset": a test fixture or failed upload). Linked + missing, a size
    mismatch, or a verification error -> BLOCKING (a human must decide)."""
    check_assets(analysis.classified[IMPORTABLE], checker)
    kept = []
    for row in analysis.classified[IMPORTABLE]:
        asset = row["asset"]
        pending = row["summary_id"] is None
        if asset["status"] == "exists":
            if asset.get("bytes") is not None and asset["bytes"] != row["file_size_bytes"]:
                row["reason"] = "Cloudinary size %s != stored size %s" % (asset["bytes"], row["file_size_bytes"])
                analysis.blocking.append("Row %s: %s" % (row["id"], row["reason"]))
                analysis.classified[INVALID].append(row)
            else:
                kept.append(row)
        elif asset["status"] == "missing":
            row["reason"] = "no Cloudinary asset for this row"
            if pending:
                analysis.classified[EXCLUDED_PENDING].append(row)
            else:
                analysis.blocking.append("Linked row %s has NO Cloudinary asset" % row["id"])
                analysis.classified[INVALID].append(row)
        else:
            row["reason"] = "could not verify Cloudinary asset: " + asset.get("detail", "unknown error")
            analysis.blocking.append("Row %s: %s" % (row["id"], row["reason"]))
            analysis.classified[INVALID].append(row)
    analysis.classified[IMPORTABLE] = kept


def write_report(path: Path, analysis: "Analysis", identity_text: str) -> None:
    """JSON report: one entry per SQLite row, by id, with classification and
    reason. Contains ids and filenames only - never a URL or credential."""
    entries = []
    for key, rows in analysis.classified.items():
        for row in rows:
            entries.append({
                "id": str(row.get("id", row.get("raw_id"))),
                "classification": key,
                "reason": row.get("reason") or ("; ".join(row.get("problems", [])) or None),
                "summary_id": str(row["summary_id"]) if row.get("summary_id") else None,
                "attachment_type": row.get("attachment_type"),
                "original_filename": row.get("original_filename"),
                "uploaded_by": row.get("uploaded_by"),
                "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
                "cloudinary": row.get("asset"),
            })
    entries.sort(key=lambda e: (e["classification"], e["created_at"] or ""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"target": identity_text, "counts": {k: len(v) for k, v in analysis.classified.items()}, "rows": entries}, indent=2), encoding="utf-8")


# ── Advisory Cloudinary check ──────────────────────────────────────────────


def verify_storage(rows: List[dict]) -> Counter:
    """HEAD each asset's signed URL. Advisory only: reports status counts
    (never a URL). A 401 'deny or ACL failure' on PDFs is a Cloudinary
    ACCOUNT delivery setting, not a metadata problem."""
    import urllib.error
    import urllib.request

    config = load_cloudinary_config()
    if config is None:
        raise RuntimeError("Cloudinary is not configured; cannot --verify-storage.")
    import cloudinary
    import cloudinary.utils

    cloudinary.config(secure=True, **config)
    statuses: Counter = Counter()
    for row in rows:
        url, _ = cloudinary.utils.cloudinary_url(
            row["storage_public_id"], resource_type=row["storage_resource_type"],
            type="authenticated", sign_url=True,
        )
        try:
            with urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=20) as resp:
                statuses[(row["attachment_type"], resp.status)] += 1
        except urllib.error.HTTPError as exc:
            statuses[(row["attachment_type"], exc.code)] += 1
        except Exception as exc:  # network etc.
            statuses[(row["attachment_type"], type(exc).__name__)] += 1
    return statuses


# ── CLI ────────────────────────────────────────────────────────────────────


def _print_report(analysis: Analysis, readiness: dict, identity: str, include_pending: bool) -> None:
    print("Target database: %s" % identity)
    print("Target table %s.%s exists: %s" % (SCHEMA, TARGET_TABLE, readiness["table_exists"]))
    if not readiness["table_exists"]:
        print("  can create table in schema (CREATE): %s" % readiness["can_create_table"])
        print("  can REFERENCE %s.%s: %s" % (SCHEMA, SUMMARIES_TABLE, readiness["can_reference"]))
    else:
        print("  SELECT: %s  INSERT: %s" % (readiness["can_select"], readiness["can_insert"]))
    print("SQLite rows: total=%d linked=%d pending=%d" % (analysis.total, analysis.linked, analysis.pending))
    print("  importable (new)                         : %d" % analysis.count(IMPORTABLE))
    print("  already present in target (identical)    : %d" % analysis.count(ALREADY_PRESENT))
    print("  excluded - summary not in PostgreSQL     : %d" % analysis.count(EXCLUDED_MISSING_SUMMARY))
    print("  excluded - pending (never claimed)%s: %d" % ("" if not include_pending else " [included]", analysis.count(EXCLUDED_PENDING)))
    print("  conflicts with existing target rows      : %d" % analysis.count(CONFLICT))
    print("  invalid rows that would be imported      : %d" % analysis.count(INVALID))
    if analysis.linked_to_soft_deleted:
        print("  importable rows linked to soft-deleted summaries (link preserved): %d" % analysis.linked_to_soft_deleted)
    kinds = Counter((r["attachment_type"], r["storage_resource_type"]) for r in analysis.to_insert + analysis.classified[ALREADY_PRESENT])
    if kinds:
        print("  importable/present by (type, cloudinary resource_type): %s" % dict(kinds))
    for line in analysis.blocking:
        print("BLOCKING: %s" % line)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--sqlite-path", default=LOCAL_ATTACHMENT_METADATA_DB_PATH)
    parser.add_argument("--backup-dir", default=str(Path(LOCAL_ATTACHMENT_METADATA_DB_PATH).parent / "backups"))
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirm-target", default=None, help="HOST:PORT/DATABASE, exactly as printed by a dry run")
    parser.add_argument("--include-pending", action="store_true")
    parser.add_argument("--require-asset", action="store_true")
    parser.add_argument("--verify-excluded", action="store_true")
    parser.add_argument("--asset-check", choices=("admin", "delivery"), default="admin",
                        help="admin (default, Cloudinary Admin API) or delivery (weaker HEAD probe; dry run only)")
    parser.add_argument("--report", default=None)
    parser.add_argument("--backup-only", action="store_true")
    parser.add_argument("--verify-storage", action="store_true")
    args = parser.parse_args(argv)

    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        print("SQLite file not found: %s" % sqlite_path)
        return 2

    if args.backup_only:
        path, digest, count = backup_sqlite(sqlite_path, Path(args.backup_dir))
        print("Backup written: %s (%d rows, sha256 %s)" % (path, count, digest))
        return 0

    if not DATABASE_URL:
        print("DATABASE_URL is not set.")
        return 2
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    identity = target_identity(engine)
    readiness = check_target_readiness(engine)

    source_path = sqlite_path
    backup_info = None
    if args.apply:
        # Gate everything that can be checked BEFORE taking the backup / writing.
        if args.confirm_target != identity:
            print("Refusing --apply: --confirm-target must be exactly %r (got %r)." % (identity, args.confirm_target))
            return 2
        if not readiness["table_exists"]:
            print("Refusing --apply: %s.%s does not exist. Apply the migration first "
                  "(database/migrations/2026-09-23-create-staff-review-summary-attachments.sql)." % (SCHEMA, TARGET_TABLE))
            return 3
        if not (readiness["can_select"] and readiness["can_insert"]):
            print("Refusing --apply: the database role lacks SELECT and/or INSERT on %s.%s." % (SCHEMA, TARGET_TABLE))
            return 3
        backup_path, digest, count = backup_sqlite(sqlite_path, Path(args.backup_dir))
        backup_info = (backup_path, digest, count)
        source_path = backup_path  # work from the fixed snapshot

    raw_rows = read_sqlite_rows(source_path)
    summaries, by_id, by_public_id = load_target_state(engine, readiness["table_exists"])
    analysis = analyze(raw_rows, summaries=summaries, target_by_id=by_id,
                       target_by_public_id=by_public_id, include_pending=args.include_pending,
                       summary_reviewers=load_summary_reviewers(engine))
    if args.apply and args.asset_check != "admin":
        print("Refusing --apply with --asset-check %s: apply requires the Admin API check." % args.asset_check)
        return 2
    checker = cloudinary_asset_status if args.asset_check == "admin" else cloudinary_delivery_status
    if args.require_asset or args.apply:
        apply_asset_verification(analysis, checker)
    if args.verify_excluded:
        check_assets(analysis.classified[EXCLUDED_PENDING] + analysis.classified[EXCLUDED_MISSING_SUMMARY]
                     + analysis.classified[INVALID], checker)
    print("Mode: %s" % ("APPLY" if args.apply else "DRY RUN (no PostgreSQL writes)"))
    if backup_info:
        print("SQLite backup: %s (%d rows, sha256 %s)" % (backup_info[0], backup_info[2], backup_info[1]))
    _print_report(analysis, readiness, identity, args.include_pending)

    if args.report:
        write_report(Path(args.report), analysis, identity)
        print("Per-row report written: %s" % args.report)

    if args.verify_storage:
        checked = analysis.to_insert + analysis.classified[ALREADY_PRESENT]
        print("Cloudinary asset check (advisory, %d rows): %s" % (len(checked), dict(verify_storage(checked))))

    if not args.apply:
        if not readiness["table_exists"]:
            print("DRY RUN result: cannot apply yet - target table is missing (see readiness above).")
        elif analysis.blocking:
            print("DRY RUN result: BLOCKED - resolve the BLOCKING items first.")
        else:
            print("DRY RUN result: OK - would insert %d row(s), skip %d already present." %
                  (analysis.count(IMPORTABLE), analysis.count(ALREADY_PRESENT)))
        return 1 if (analysis.blocking or not readiness["table_exists"]) else 0

    if analysis.blocking:
        print("Refusing --apply: blocking issues above. Nothing was written to PostgreSQL.")
        return 3

    summaries_before = count_rows(engine, SUMMARIES_TABLE)
    result = apply_transfer(engine, analysis.to_insert)
    summaries_after = count_rows(engine, SUMMARIES_TABLE)
    print("APPLIED. target %s.%s rows: before=%d after=%d (inserted %d, already present %d)" % (
        SCHEMA, TARGET_TABLE, result["before"], result["after"], result["inserted"], analysis.count(ALREADY_PRESENT)))
    print("%s.%s rows: before=%d after=%d (must be equal)" % (SCHEMA, SUMMARIES_TABLE, summaries_before, summaries_after))
    print("SQLite source file was not modified; backup kept at %s" % backup_info[0])
    return 0


if __name__ == "__main__":
    sys.exit(main())
