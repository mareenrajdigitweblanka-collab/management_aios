#!/usr/bin/env python3
"""SUPERSEDED 2026-08-11 (same day as writing) — DO NOT RUN.

Built for an intermediate, curated 5-column staff_dashboard_records shape
(employee_number/date_of_joining/full_name/department_team/designation)
that existed for only part of 2026-08-11. Later the same day,
staff_dashboard_records was rebuilt as an EXACT mirror of
employee_management.staff (same columns, same integer primary key) per
explicit, deliberate user instruction — see
database/migrations/2026-08-11-mirror-staff-dashboard-records-from-
ledsone.sql, backend/models.py StaffDashboardRecord docstring, and
member-aios/staff-data/README.md §0. This script's INSERT column list and
source_record_key/source_hash/is_current bookkeeping columns no longer
exist on the table — running it now fails immediately.

There is currently no repeatable write path to staff_dashboard_records —
the 312-row 2026-08-11 population was a one-time bulk load. A future
re-sync needs a new script built against the current (exact-mirror) shape.
Kept for history, not deleted, per this repo's convention of marking
rather than removing superseded write paths.

Original docstring follows, unmodified, for historical reference:

Sync management_aios.staff_dashboard_records from
employee_management.staff on the Ledsone operational Postgres database.

2026-08-11 — replaces scripts/import_staff_dashboard_csv.py (superseded,
see its own module docstring) as the write path for this table. Deliberate
architecture change, flagged to Mayurika/HR per CLAUDE.md §9.1/§18 — see
member-aios/staff-data/README.md for the full rationale, including the
known coverage gap (Ledsone's employee_management.staff currently has far
fewer usable rows than the table this replaces) that this script does not
attempt to fix.

Source (Ledsone, read-only — LEDSONE_DATABASE_URL, `tech_user` role):
    SELECT s.id, replace(s.staff_code,' ','') AS employee_number,
           s.name AS full_name, s.designation, s.joined_date,
           dept.name AS department_team
    FROM employee_management.staff s
    JOIN employee_management.department_employee de
        ON de.emp_id = s.id AND de.delete_status = false
    JOIN employee_management.department dept ON dept.id = de.dep_id
    WHERE s.delete_status = false AND s.staff_code IS NOT NULL
Rows without a department_employee match are skipped (department_team is
required by the destination table's meaning, even though the column is
nullable) — see --dry-run output for a skipped count.

FK safety (staff_review_summaries.reviewed_staff_id, NOT NULL, NO ACTION
on delete): writes happen in this order so the foreign key is never
violated —
  1. Upsert every fresh Ledsone row (new/updated UUIDs, source_status=
     'synced'), keyed by a deterministic source_record_key
     (f"ledsone-staff-{ledsone_staff_id}") so re-runs update in place
     rather than duplicate.
  2. Re-point staff_review_summaries.reviewed_staff_id from each old row
     to the matching new 'synced' row, matched via
     reviewed_staff_employee_number (added by database/migrations/
     2026-08-11-add-reviewed-staff-employee-number-to-staff-review-
     summaries.sql — apply that migration first). A review whose
     employee_number has no match in the fresh set is left pointing at
     its old row — see step 3.
  3. Mark every remaining pre-sync row (source_status != 'synced') that is
     STILL referenced by a staff_review_summaries row as 'superseded'
     (kept, not deleted — the FK requires it to keep existing). Every
     remaining pre-sync row that is NOT referenced by anything is deleted.

Never a cross-database SQL join — Ledsone and management_aios are two
separate Postgres servers reachable only through two separate
connections (LEDSONE_DATABASE_URL, DATABASE_URL). This script reads one,
then writes the other, as explicit separate steps.

Safety:
- Prints counts only — never a full row, never DATABASE_URL/
  LEDSONE_DATABASE_URL or any other credential.
- --dry-run performs no write of any kind to either database.
- --apply writes inside a single transaction; on any unexpected error the
  whole transaction is rolled back (no partial sync).

Usage:
    python scripts/sync_staff_dashboard_from_ledsone.py --dry-run
    python scripts/sync_staff_dashboard_from_ledsone.py --apply
"""

import argparse
import hashlib
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import create_engine, text  # noqa: E402

from backend.config import DATABASE_URL, LEDSONE_DATABASE_URL  # noqa: E402

SOURCE_QUERY = text(
    """
    SELECT s.id AS ledsone_staff_id,
           replace(s.staff_code, ' ', '') AS employee_number,
           s.name AS full_name,
           s.designation AS designation,
           s.joined_date AS date_of_joining,
           dept.name AS department_team
    FROM employee_management.staff s
    JOIN employee_management.department_employee de
        ON de.emp_id = s.id AND de.delete_status = false
    JOIN employee_management.department dept ON dept.id = de.dep_id
    WHERE s.delete_status = false AND s.staff_code IS NOT NULL
    """
)

# Content fields that participate in the change-detection hash — mirrors
# scripts/import_staff_dashboard_csv.py's compute_source_hash pattern.
HASH_FIELDS = ("employee_number", "full_name", "department_team", "designation", "date_of_joining")


def source_record_key(ledsone_staff_id):
    return "ledsone-staff-%s" % ledsone_staff_id


def compute_source_hash(record):
    parts = [str(record.get(f) or "") for f in HASH_FIELDS]
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


def fetch_ledsone_rows():
    """Read-only fetch from Ledsone. Returns (accepted, skipped_no_department)."""
    if not LEDSONE_DATABASE_URL:
        raise SystemExit(
            "ERROR: LEDSONE_DATABASE_URL is not set. See .env.example — this script "
            "cannot read employee_management.staff without it."
        )
    engine = create_engine(LEDSONE_DATABASE_URL, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            rows = conn.execute(SOURCE_QUERY).mappings().all()
    finally:
        engine.dispose()

    accepted = []
    for row in rows:
        record = dict(row)
        record["source_record_key"] = source_record_key(record["ledsone_staff_id"])
        record["source_hash"] = compute_source_hash(record)
        accepted.append(record)
    return accepted


def classify_against_existing(accepted, session):
    """Read-only comparison. Returns (to_insert, to_update, unchanged) —
    each a list of `accepted` records."""
    from backend.models import StaffDashboardRecord

    existing = {
        row.source_record_key: row.source_hash
        for row in session.query(
            StaffDashboardRecord.source_record_key, StaffDashboardRecord.source_hash
        ).all()
    }
    to_insert, to_update, unchanged = [], [], []
    for record in accepted:
        prior_hash = existing.get(record["source_record_key"])
        if prior_hash is None:
            to_insert.append(record)
        elif prior_hash != record["source_hash"]:
            to_update.append(record)
        else:
            unchanged.append(record)
    return to_insert, to_update, unchanged


def plan_legacy_disposition(session, synced_source_record_keys):
    """Read-only. Returns (protected_ids, deletable_ids) among every
    staff_dashboard_records row NOT in this sync's fresh set
    (source_status != 'synced' OR source_record_key not in
    synced_source_record_keys) — protected means still referenced by a
    live staff_review_summaries.reviewed_staff_id."""
    from backend.models import StaffDashboardRecord, StaffReviewSummary

    legacy_rows = (
        session.query(StaffDashboardRecord.id)
        .filter(~StaffDashboardRecord.source_record_key.in_(synced_source_record_keys))
        .all()
    )
    legacy_ids = {row.id for row in legacy_rows}
    if not legacy_ids:
        return set(), set()

    referenced_ids = {
        row.reviewed_staff_id
        for row in session.query(StaffReviewSummary.reviewed_staff_id)
        .filter(StaffReviewSummary.reviewed_staff_id.in_(legacy_ids))
        .all()
    }
    protected = legacy_ids & referenced_ids
    deletable = legacy_ids - referenced_ids
    return protected, deletable


def apply_sync(accepted, imported_by):
    from backend.models import StaffDashboardRecord, StaffReviewSummary

    from backend.database import get_session_factory

    session = get_session_factory()()
    now = datetime.utcnow()
    inserted = updated = unchanged = remapped = superseded = deleted = 0
    try:
        existing_rows = {
            row.source_record_key: row for row in session.query(StaffDashboardRecord).all()
        }
        synced_ids_by_employee_number = {}

        for record in accepted:
            key = record["source_record_key"]
            existing = existing_rows.get(key)
            if existing is None:
                new_row = StaffDashboardRecord(
                    source_record_key=key,
                    employee_number=record["employee_number"],
                    full_name=record["full_name"],
                    department_team=record["department_team"],
                    designation=record["designation"],
                    date_of_joining=record["date_of_joining"],
                    source_file="employee_management.staff (Ledsone)",
                    source_row_reference=str(record["ledsone_staff_id"]),
                    source_hash=record["source_hash"],
                    source_status="synced",
                    is_current=True,
                    imported_by=imported_by,
                )
                session.add(new_row)
                session.flush()  # populate new_row.id
                synced_ids_by_employee_number[record["employee_number"]] = new_row.id
                inserted += 1
            elif existing.source_hash != record["source_hash"]:
                existing.employee_number = record["employee_number"]
                existing.full_name = record["full_name"]
                existing.department_team = record["department_team"]
                existing.designation = record["designation"]
                existing.date_of_joining = record["date_of_joining"]
                existing.source_file = "employee_management.staff (Ledsone)"
                existing.source_row_reference = str(record["ledsone_staff_id"])
                existing.source_hash = record["source_hash"]
                existing.source_status = "synced"
                existing.updated_at = now
                existing.imported_by = imported_by
                synced_ids_by_employee_number[record["employee_number"]] = existing.id
                updated += 1
            else:
                synced_ids_by_employee_number[record["employee_number"]] = existing.id
                unchanged += 1

        session.flush()

        # Re-point review-summary FKs onto the fresh rows, via the durable
        # employee_number key (reviewed_staff_employee_number).
        review_rows = (
            session.query(StaffReviewSummary)
            .filter(StaffReviewSummary.reviewed_staff_employee_number.isnot(None))
            .all()
        )
        for review in review_rows:
            new_id = synced_ids_by_employee_number.get(review.reviewed_staff_employee_number)
            if new_id is not None and review.reviewed_staff_id != new_id:
                review.reviewed_staff_id = new_id
                review.updated_at = now
                remapped += 1

        session.flush()

        synced_keys = {r["source_record_key"] for r in accepted}
        protected_ids, deletable_ids = plan_legacy_disposition(session, synced_keys)

        if protected_ids:
            (
                session.query(StaffDashboardRecord)
                .filter(StaffDashboardRecord.id.in_(protected_ids))
                .update({"source_status": "superseded", "updated_at": now}, synchronize_session=False)
            )
            superseded = len(protected_ids)

        if deletable_ids:
            (
                session.query(StaffDashboardRecord)
                .filter(StaffDashboardRecord.id.in_(deletable_ids))
                .delete(synchronize_session=False)
            )
            deleted = len(deletable_ids)

        session.commit()
        return dict(
            inserted=inserted, updated=updated, unchanged=unchanged,
            remapped=remapped, superseded=superseded, deleted=deleted,
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Report planned changes only; no writes.")
    mode.add_argument("--apply", action="store_true", help="Perform the sync inside a transaction.")
    parser.add_argument(
        "--imported-by", default="scripts/sync_staff_dashboard_from_ledsone.py",
        help="Value stored in imported_by for audit purposes (no credentials).",
    )
    args = parser.parse_args()

    print("Reading employee_management.staff from Ledsone (row content not printed)…")
    accepted = fetch_ledsone_rows()
    print(f"Fetched {len(accepted)} eligible rows "
          f"(delete_status = false AND staff_code IS NOT NULL AND department match found).")

    if args.dry_run:
        if not DATABASE_URL:
            print("DB comparison: SKIPPED (DATABASE_URL not set — insert/update counts "
                  "would be evaluated at --apply time).")
            print("DRY RUN — no database write performed.")
            return
        from backend.database import get_session_factory

        session = get_session_factory()()
        try:
            to_insert, to_update, unchanged = classify_against_existing(accepted, session)
            synced_keys = {r["source_record_key"] for r in accepted}
            protected_ids, deletable_ids = plan_legacy_disposition(session, synced_keys)
            print(f"Would insert: {len(to_insert)}")
            print(f"Would update: {len(to_update)}")
            print(f"Would leave unchanged: {len(unchanged)}")
            print(f"Legacy rows that would be protected (still referenced by a review): {len(protected_ids)}")
            print(f"Legacy rows that would be deleted (no longer referenced): {len(deletable_ids)}")
        finally:
            session.close()
        print("DRY RUN — no database write performed.")
        return

    if args.apply:
        if not DATABASE_URL:
            raise SystemExit("ERROR: DATABASE_URL is not set. Cannot --apply.")
        result = apply_sync(accepted, args.imported_by)
        print(f"Inserted: {result['inserted']}")
        print(f"Updated: {result['updated']}")
        print(f"Unchanged: {result['unchanged']}")
        print(f"Review summaries remapped: {result['remapped']}")
        print(f"Legacy rows marked superseded (protected by a review): {result['superseded']}")
        print(f"Legacy rows deleted: {result['deleted']}")
        print("APPLY complete — transaction committed.")


if __name__ == "__main__":
    main()
