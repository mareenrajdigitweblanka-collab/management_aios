#!/usr/bin/env python3
"""Import the real, git-ignored, normalized HR staff CSV into
management_aios.staff_dashboard_records.

Source: member-aios/staff-data/source/normalized/hr-staff-dashboard.csv
(local-only, git-ignored — see member-aios/staff-data/README.md §5a). HR
remains the authoritative staff-record source (CLAUDE.md §9.1); this script
populates a controlled dashboard PROJECTION only.

Known, expected source conditions this script preserves rather than
"corrects" (see member-aios/staff-data/source-maps/hr-staff-source-map-draft.md):
- 5 employee_number values are reused across 11 rows in the source itself.
  This script does NOT deduplicate, merge, or renumber those rows — each
  gets its own source_record_key and is imported as a distinct row.
- employment_stage is '[VERIFY]' for every row as of 2026-07-13 (no
  HR-approved derivation rule exists). This script does not infer a value
  for it.

Safety:
- Prints counts only — never a full row, never a NIC value, never
  DATABASE_URL or any other credential.
- --dry-run performs no database write of any kind.
- --apply writes inside a single transaction; on any unexpected error the
  whole transaction is rolled back (no partial import).
- Never deletes a row. A row present in the database but no longer in the
  source CSV is left untouched (source_status/is_current bookkeeping exists
  on the table for a future, separate, explicitly authorized process to use
  — this script does not set is_current=False on anything).

Usage:
    python scripts/import_staff_dashboard_csv.py --dry-run
    python scripts/import_staff_dashboard_csv.py --apply
"""

import argparse
import csv
import hashlib
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import (  # noqa: E402
    DATABASE_URL,
    STAFF_APPROVED_COLUMNS,
    STAFF_EXCLUDED_COLUMNS,
)

DEFAULT_CSV_PATH = (
    Path(__file__).resolve().parent.parent
    / "member-aios"
    / "staff-data"
    / "source"
    / "normalized"
    / "hr-staff-dashboard.csv"
)

# Fields that go into the deterministic source_record_key, per this task's
# explicit instruction — the raw (as-read, whitespace-stripped) CSV string
# values, not any parsed/normalized form, so the key is stable regardless of
# later normalization changes.
HASH_KEY_FIELDS = (
    "source_file",
    "source_page",
    "source_row_reference",
    "employee_number",
    "full_name",
    "date_of_joining",
)


class RowRejected(Exception):
    def __init__(self, reason):
        self.reason = reason
        super().__init__(reason)


def normalize_value(value):
    """Empty/whitespace-only strings become None. Everything else
    (including the literal '[VERIFY]') is preserved as-is."""
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


def parse_date_of_joining(raw_value):
    """Best-effort parse of DD/MM/YYYY (the format observed throughout the
    source). Returns a date or None. A row is never rejected solely because
    this fails to parse — the raw string is still preserved in the hash
    inputs, and the column is simply left NULL in that case, consistent
    with 'preserve and flag, do not correct' for known source gaps (2 rows
    were already flagged low-confidence during normalization — see
    member-aios/staff-data/source-maps/hr-staff-source-map-draft.md §4.5)."""
    if not raw_value:
        return None
    candidate = raw_value.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(candidate, fmt).date()
        except ValueError:
            continue
    return None


def parse_source_page(raw_value):
    if not raw_value:
        return None
    try:
        return int(raw_value.strip())
    except ValueError:
        return None


def compute_source_record_key(raw_row):
    parts = [str(raw_row.get(f) or "").strip() for f in HASH_KEY_FIELDS]
    joined = "|".join(parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def compute_source_hash(raw_row):
    parts = [str(raw_row.get(f) or "").strip() for f in STAFF_APPROVED_COLUMNS]
    joined = "|".join(parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def validate_header(fieldnames):
    if fieldnames is None:
        raise SystemExit("ERROR: CSV has no header row.")

    header = list(fieldnames)
    expected = list(STAFF_APPROVED_COLUMNS)

    excluded_present = [c for c in header if c in STAFF_EXCLUDED_COLUMNS]
    if excluded_present:
        raise SystemExit(
            "ERROR: CSV header contains excluded field(s) that must never be "
            f"imported: {excluded_present}. Aborting — no row was read."
        )

    if header != expected:
        unexpected = [c for c in header if c not in expected]
        missing = [c for c in expected if c not in header]
        raise SystemExit(
            "ERROR: CSV header does not match the exact 16 approved columns.\n"
            f"  Expected (in order): {expected}\n"
            f"  Found:               {header}\n"
            f"  Unexpected columns:  {unexpected}\n"
            f"  Missing columns:     {missing}\n"
            "Aborting — no row was read."
        )


def read_and_validate_rows(csv_path):
    """Returns (accepted, rejected_count) — accepted is a list of dicts
    with normalized values plus computed source_record_key/source_hash.
    Never returns or logs full row content beyond what the caller
    explicitly prints (which this module restricts to counts only)."""
    accepted = []
    rejected_count = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        validate_header(reader.fieldnames)

        for line_num, raw_row in enumerate(reader, start=2):  # header is line 1
            try:
                if len(raw_row) != len(STAFF_APPROVED_COLUMNS) or None in raw_row:
                    raise RowRejected("malformed row (unexpected field count)")

                employee_number = normalize_value(raw_row.get("employee_number"))
                full_name = normalize_value(raw_row.get("full_name"))
                date_raw = normalize_value(raw_row.get("date_of_joining"))
                source_row_reference = normalize_value(raw_row.get("source_row_reference"))

                if not any([employee_number, full_name, date_raw, source_row_reference]):
                    raise RowRejected(
                        "row has no usable identifying fields "
                        "(employee_number, full_name, date_of_joining, "
                        "source_row_reference all blank)"
                    )

                record = {
                    "employee_number": employee_number,
                    "epf_number": normalize_value(raw_row.get("epf_number")),
                    "date_of_joining": parse_date_of_joining(date_raw),
                    "full_name": full_name,
                    "calling_name": normalize_value(raw_row.get("calling_name")),
                    "location": normalize_value(raw_row.get("location")),
                    "staff_status": normalize_value(raw_row.get("staff_status")),
                    "department_team": normalize_value(raw_row.get("department_team")),
                    "designation": normalize_value(raw_row.get("designation")),
                    "cv_reference": normalize_value(raw_row.get("cv_reference")),
                    "nic": normalize_value(raw_row.get("nic")),
                    "remarks": normalize_value(raw_row.get("remarks")),
                    "employment_stage": normalize_value(raw_row.get("employment_stage")),
                    "source_file": normalize_value(raw_row.get("source_file")),
                    "source_page": parse_source_page(raw_row.get("source_page")),
                    "source_row_reference": source_row_reference,
                    "source_record_key": compute_source_record_key(raw_row),
                    "source_hash": compute_source_hash(raw_row),
                    "_line_num": line_num,
                }
                accepted.append(record)
            except RowRejected as exc:
                rejected_count += 1
                print(f"  rejected: line {line_num} — {exc.reason}")

    return accepted, rejected_count


def try_connect_readonly(timeout_seconds=8):
    """Best-effort read-only DB connection for dry-run comparison. Returns
    a live SQLAlchemy Session, or None if unreachable within
    `timeout_seconds` (e.g. blocked outbound Postgres access) — callers
    must handle None gracefully rather than fail the whole dry-run.

    Bounded with a daemon worker thread rather than a plain socket/driver
    -level timeout: some sandboxed environments have been observed to hang
    past an explicit connect_timeout on the connection attempt itself, so
    this bounds the wait from the outside regardless of whether the
    underlying call cooperates. The worker thread is daemonized so, even
    if the connection attempt is still blocked when the timeout elapses,
    this function returns None immediately and the abandoned (harmless,
    read-only) attempt cannot prevent the script process from exiting."""
    if not DATABASE_URL:
        return None

    import queue
    import threading

    result_queue = queue.Queue(maxsize=1)

    def worker():
        try:
            from backend.database import get_session_factory

            session = get_session_factory()()
            session.execute(__import__("sqlalchemy").text("SELECT 1"))
            result_queue.put(("ok", session))
        except Exception as exc:
            result_queue.put(("error", exc))

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
    try:
        status, payload = result_queue.get(timeout=timeout_seconds)
        return payload if status == "ok" else None
    except queue.Empty:
        return None


def classify_against_existing(accepted, session):
    """Returns (inserted, updated, unchanged) counts by comparing each
    accepted row's source_record_key/source_hash against what is already
    stored. Does not write anything — read-only comparison."""
    from backend.models import StaffDashboardRecord

    existing = {
        row.source_record_key: row.source_hash
        for row in session.query(
            StaffDashboardRecord.source_record_key, StaffDashboardRecord.source_hash
        ).all()
    }
    inserted = updated = unchanged = 0
    for record in accepted:
        prior_hash = existing.get(record["source_record_key"])
        if prior_hash is None:
            inserted += 1
        elif prior_hash != record["source_hash"]:
            updated += 1
        else:
            unchanged += 1
    return inserted, updated, unchanged


def apply_import(accepted, imported_by):
    from backend.database import get_session_factory
    from backend.models import StaffDashboardRecord

    session = get_session_factory()()
    inserted = updated = unchanged = 0
    try:
        existing_rows = {
            row.source_record_key: row
            for row in session.query(StaffDashboardRecord).all()
        }
        now = datetime.utcnow()
        for record in accepted:
            key = record["source_record_key"]
            existing = existing_rows.get(key)
            if existing is None:
                new_row = StaffDashboardRecord(
                    source_record_key=key,
                    employee_number=record["employee_number"],
                    epf_number=record["epf_number"],
                    date_of_joining=record["date_of_joining"],
                    full_name=record["full_name"],
                    calling_name=record["calling_name"],
                    location=record["location"],
                    staff_status=record["staff_status"],
                    department_team=record["department_team"],
                    designation=record["designation"],
                    cv_reference=record["cv_reference"],
                    nic=record["nic"],
                    remarks=record["remarks"],
                    employment_stage=record["employment_stage"],
                    source_file=record["source_file"],
                    source_page=record["source_page"],
                    source_row_reference=record["source_row_reference"],
                    source_hash=record["source_hash"],
                    source_status="imported",
                    is_current=True,
                    imported_by=imported_by,
                )
                session.add(new_row)
                inserted += 1
            elif existing.source_hash != record["source_hash"]:
                for field in (
                    "employee_number", "epf_number", "date_of_joining", "full_name",
                    "calling_name", "location", "staff_status", "department_team",
                    "designation", "cv_reference", "nic", "remarks", "employment_stage",
                    "source_file", "source_page", "source_row_reference",
                ):
                    setattr(existing, field, record[field])
                existing.source_hash = record["source_hash"]
                existing.updated_at = now
                existing.imported_by = imported_by
                updated += 1
            else:
                unchanged += 1
        session.commit()
        return inserted, updated, unchanged
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def sql_literal(value):
    """Renders a Python value as a SQL literal. None -> NULL; strings are
    single-quote-escaped; dates use ISO format; everything else falls back
    to str()."""
    if value is None:
        return "NULL"
    if isinstance(value, date):
        return "'" + value.isoformat() + "'"
    if isinstance(value, int):
        return str(value)
    escaped = str(value).replace("'", "''")
    return "'" + escaped + "'"


UPSERT_COLUMNS = (
    "source_record_key", "employee_number", "epf_number", "date_of_joining",
    "full_name", "calling_name", "location", "staff_status", "department_team",
    "designation", "cv_reference", "nic", "remarks", "employment_stage",
    "source_file", "source_page", "source_row_reference", "source_hash",
    "source_status", "is_current", "imported_by",
)


def generate_sql_upsert(accepted, out_path, imported_by):
    """Writes a single-transaction SQL script performing the same
    insert-or-update-by-source_record_key upsert as apply_import(), for
    running directly via a SQL client (e.g. the Neon SQL Editor) when a
    direct Python/psycopg connection to the database is not reachable from
    the current network.

    WARNING: the output file contains real employee names and NIC values
    as literal SQL text. It is written wherever the caller points --out —
    this script does not write it anywhere inside the repository by
    default, and the caller is responsible for not placing it under
    version control."""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(
            "-- GENERATED — contains real employee data as literal SQL values.\n"
            "-- DO NOT COMMIT THIS FILE. DO NOT PLACE IT UNDER GIT TRACKING.\n"
            "-- Generated by scripts/import_staff_dashboard_csv.py --emit-sql\n"
            "-- from the real, git-ignored, local CSV. Upserts by\n"
            "-- source_record_key (insert if new, update if the row's content\n"
            "-- changed, no-op if unchanged) — same semantics as --apply.\n"
            "-- Run this once against management_aios.staff_dashboard_records\n"
            "-- (the table created by\n"
            "-- database/migrations/2026-07-13-create-staff-dashboard-records.sql\n"
            "-- — apply that migration first if not already applied).\n\n"
            "BEGIN;\n\n"
        )
        for record in accepted:
            values = []
            for col in UPSERT_COLUMNS:
                if col == "is_current":
                    values.append("TRUE")
                elif col == "source_status":
                    values.append("'imported'")
                elif col == "imported_by":
                    values.append(sql_literal(imported_by))
                else:
                    values.append(sql_literal(record[col]))
            update_clauses = ", ".join(
                f"{col} = EXCLUDED.{col}"
                for col in UPSERT_COLUMNS
                if col not in ("source_record_key", "source_status", "is_current")
            )
            update_clauses += ", updated_at = now()"
            f.write(
                "INSERT INTO management_aios.staff_dashboard_records (\n    "
                + ", ".join(UPSERT_COLUMNS)
                + "\n) VALUES (\n    "
                + ", ".join(values)
                + "\n)\nON CONFLICT (source_record_key) DO UPDATE SET\n    "
                + update_clauses
                + "\nWHERE staff_dashboard_records.source_hash IS DISTINCT FROM EXCLUDED.source_hash;\n\n"
            )
        f.write(
            "COMMIT;\n\n"
            "-- ── Validation queries — run after COMMIT ──────────────────────\n\n"
            "-- 1. Total row count (expected 310).\n"
            "SELECT count(*) AS row_count FROM management_aios.staff_dashboard_records;\n\n"
            "-- 2. PH count (expected 42).\n"
            "SELECT count(*) AS ph_count FROM management_aios.staff_dashboard_records\n"
            "WHERE department_team = 'PH';\n\n"
            "-- 3. employment_stage = '[VERIFY]' count (expected 310).\n"
            "SELECT count(*) AS verify_count FROM management_aios.staff_dashboard_records\n"
            "WHERE employment_stage = '[VERIFY]';\n\n"
            "-- 4. Unexpected staff_status values (expected 0 rows).\n"
            "SELECT DISTINCT staff_status FROM management_aios.staff_dashboard_records\n"
            "WHERE staff_status IS NOT NULL AND staff_status NOT IN ('Active', 'Inactive');\n\n"
            "-- 5. Duplicate employee_number values (expected 5 values, 11 rows total —\n"
            "--    a known, preserved source condition, not an import defect).\n"
            "SELECT employee_number, count(*) AS row_count\n"
            "FROM management_aios.staff_dashboard_records\n"
            "WHERE employee_number IS NOT NULL\n"
            "GROUP BY employee_number\n"
            "HAVING count(*) > 1\n"
            "ORDER BY employee_number;\n"
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Validate and preview only; no DB write.")
    mode.add_argument("--apply", action="store_true", help="Perform the import inside a transaction.")
    mode.add_argument(
        "--emit-sql", metavar="OUT_PATH",
        help="Write a standalone SQL upsert script to OUT_PATH instead of connecting to the "
        "database directly (for running via a SQL client, e.g. when direct Python DB "
        "connectivity is not reachable). OUT_PATH must be outside the repository — this "
        "script does not enforce that, but the generated file contains real employee data "
        "as literal SQL and must never be committed.",
    )
    parser.add_argument(
        "--csv", default=str(DEFAULT_CSV_PATH),
        help="Path to the normalized staff CSV (default: the approved real local CSV path).",
    )
    parser.add_argument(
        "--imported-by", default="scripts/import_staff_dashboard_csv.py",
        help="Value stored in imported_by for audit purposes (no credentials).",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise SystemExit(f"ERROR: CSV not found at {csv_path}. Not reading anywhere else.")

    print(f"Reading CSV: {csv_path.name} (path not printed further; row content never printed)")
    accepted, rejected_count = read_and_validate_rows(csv_path)
    print(f"Parsed: {len(accepted)} accepted, {rejected_count} rejected")

    if args.emit_sql:
        out_path = Path(args.emit_sql).resolve()
        generate_sql_upsert(accepted, out_path, args.imported_by)
        print(f"SQL upsert script written: {out_path} ({len(accepted)} upsert statements)")
        print("WARNING: this file contains real employee data (names, NIC values) as literal "
              "SQL text. Do not commit it or place it under any git-tracked directory. Run it "
              "via a SQL client (e.g. Neon SQL Editor), then delete it once applied.")
        return

    if args.dry_run:
        session = try_connect_readonly()
        if session is None:
            print(
                "DB comparison: SKIPPED (no reachable database connection from this "
                "environment). Accepted rows would be evaluated for insert/update at "
                "--apply time."
            )
        else:
            try:
                inserted, updated, unchanged = classify_against_existing(accepted, session)
                print(f"Would insert: {inserted}")
                print(f"Would update: {updated}")
                print(f"Would leave unchanged: {unchanged}")
            finally:
                session.close()
        print("DRY RUN — no database write performed.")
        return

    if args.apply:
        if not DATABASE_URL:
            raise SystemExit("ERROR: DATABASE_URL is not set. Cannot --apply.")
        inserted, updated, unchanged = apply_import(accepted, args.imported_by)
        print(f"Inserted: {inserted}")
        print(f"Updated: {updated}")
        print(f"Unchanged: {unchanged}")
        print(f"Rejected: {rejected_count}")
        print("APPLY complete — transaction committed.")


if __name__ == "__main__":
    main()
