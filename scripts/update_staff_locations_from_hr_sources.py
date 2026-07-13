#!/usr/bin/env python3
"""Update management_aios.staff_dashboard_records.location from four
HR-verified branch/WFH location CSV files.

Source files (NOT tracked in this repository — see --source-dir):
  Personal Target - HRD - 2.2 Jaffna branch Staffs.csv     (expected 89 rows)
  Personal Target - HRD - 2.3 Nelliyadi staffs.csv         (expected 23 rows)
  Personal Target - HRD - 2.4 Chankanai Branch Staffs.csv  (expected 7 rows)
  Personal Target - HRD - 2.5 WFH Staffs.csv               (expected 4 rows)
Expected total valid staff rows: 123.

This script only ever UPDATES the `location`, `updated_at`, and `updated_by`
columns of rows that already exist in staff_dashboard_records. It never
inserts a new staff row, never deletes a row, and never touches
employee_number, full_name, designation, department_team, staff_status, or
employment_stage.

Matching: normalized source Employee ID == normalized DB employee_number
(trim, uppercase, strip internal spaces and hyphens — see normalize_employee_id).
Exactly one DB match -> MATCHED. Zero -> UNMATCHED. More than one ->
AMBIGUOUS. Only MATCHED rows with location_change_required are written.

Safety gate (AMBER): per this task's explicit instruction, the database is
never updated (no --apply write, no --emit-sql file) if any of the following
hold — the whole run stops and reports AMBER with exact conflict counts:
  - total valid source rows across the four files != 123
  - any normalized employee ID appears in more than one source file
  - any normalized source employee ID matches more than one DB row
--dry-run always runs to completion and reports these conditions read-only.

Never prints: DATABASE_URL or any other credential, full staff records, NIC
values, or any personal field beyond employee_number/location/name/
designation/team counts and identifiers already required for the
reconciliation report.

Usage:
    python scripts/update_staff_locations_from_hr_sources.py --source-dir "<dir>" --dry-run
    python scripts/update_staff_locations_from_hr_sources.py --source-dir "<dir>" --emit-sql OUT.sql
    python scripts/update_staff_locations_from_hr_sources.py --source-dir "<dir>" --apply
"""

import argparse
import csv
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.config import DATABASE_URL  # noqa: E402

UPDATED_BY = "HR verified staff-location update"

SOURCE_FILES = {
    "Jaffna": "Personal Target - HRD - 2.2 Jaffna branch Staffs.csv",
    "Nelliyadi": "Personal Target - HRD - 2.3 Nelliyadi staffs.csv",
    "Chankanai": "Personal Target - HRD - 2.4 Chankanai Branch Staffs.csv",
    "WFH": "Personal Target - HRD - 2.5 WFH Staffs.csv",
}

EXPECTED_COUNTS = {
    "Jaffna": 89,
    "Nelliyadi": 23,
    "Chankanai": 7,
    "WFH": 4,
}
EXPECTED_TOTAL = 123

CANONICAL_LOCATIONS = ("Jaffna", "Nelliyadi", "Chankanai", "WFH")

EXPECTED_HEADER = ["No", "Employee ID", "Location", "Full Name", "Designation", "Department / Team"]


def normalize_employee_id(raw):
    """trim -> uppercase -> remove internal spaces -> remove hyphens.
    Used only for comparison; never written back to the database."""
    if raw is None:
        return ""
    return raw.strip().upper().replace(" ", "").replace("-", "")


class SourceRow:
    __slots__ = (
        "source_file", "source_row", "source_employee_id", "normalized_employee_id",
        "source_location", "full_name", "designation", "department_team",
    )

    def __init__(self, source_file, source_row, employee_id, location, full_name, designation, department_team):
        self.source_file = source_file
        self.source_row = source_row
        self.source_employee_id = employee_id
        self.normalized_employee_id = normalize_employee_id(employee_id)
        self.source_location = location
        self.full_name = full_name
        self.designation = designation
        self.department_team = department_team


def parse_source_file(path, expected_location):
    """Parses one HR location CSV. Skips the title row (row 1), the header
    row (row 2), and the final 'Total Staff: N' row. A row is a valid staff
    row only if Employee ID is not blank and the first column does not begin
    with 'Total Staff'. Returns (rows, header_ok, location_conflicts)."""
    rows = []
    location_conflicts = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        raw_rows = list(reader)

    if len(raw_rows) < 3:
        raise SystemExit(f"ERROR: {path.name} has fewer than 3 lines (title/header/data). Aborting.")

    header = raw_rows[1]
    header_ok = header == EXPECTED_HEADER

    for line_num, r in enumerate(raw_rows[2:], start=3):
        if not r or not r[0].strip():
            continue
        if r[0].strip().startswith("Total Staff"):
            continue
        if len(r) < 6:
            continue
        no, employee_id, location, full_name, designation, department_team = r[0], r[1], r[2], r[3], r[4], r[5]
        if not employee_id.strip():
            continue
        if location.strip() != expected_location:
            location_conflicts.append((line_num, employee_id, location))
        rows.append(
            SourceRow(
                source_file=path.name,
                source_row=line_num,
                employee_id=employee_id.strip(),
                location=location.strip(),
                full_name=full_name.strip(),
                designation=designation.strip(),
                department_team=department_team.strip(),
            )
        )
    return rows, header_ok, location_conflicts


def load_all_sources(source_dir):
    """Locates and parses all four expected files. Raises SystemExit if a
    file is missing. Returns dict: location -> (rows, header_ok, location_conflicts)."""
    source_dir = Path(source_dir)
    if not source_dir.is_dir():
        raise SystemExit(f"ERROR: --source-dir not found or not a directory: {source_dir}")

    result = {}
    missing = []
    for location, filename in SOURCE_FILES.items():
        path = source_dir / filename
        if not path.exists():
            missing.append(filename)
            continue
        result[location] = parse_source_file(path, location)

    if missing:
        raise SystemExit(
            "ERROR: expected source file(s) not found in --source-dir:\n  "
            + "\n  ".join(missing)
            + "\nAborting — no file was read further."
        )
    return result


def find_cross_file_duplicates(all_sources):
    """Returns dict: normalized_employee_id -> list of (location, source_employee_id)
    for any normalized ID that appears in more than one location's file."""
    seen = {}
    for location, (rows, _header_ok, _conflicts) in all_sources.items():
        for row in rows:
            seen.setdefault(row.normalized_employee_id, []).append((location, row.source_employee_id))
    return {k: v for k, v in seen.items() if len({loc for loc, _ in v}) > 1}


def try_connect_readonly(timeout_seconds=10):
    """Bounded-wait read-only DB connection attempt. Returns a live
    SQLAlchemy Session, or None if unreachable within timeout_seconds."""
    if not DATABASE_URL:
        return None

    import queue
    import threading

    result_queue = queue.Queue(maxsize=1)

    def worker():
        try:
            from backend.database import get_session_factory
            from sqlalchemy import text

            session = get_session_factory()()
            session.execute(text("SELECT 1"))
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


def check_updated_by_column(session):
    """Returns True if management_aios.staff_dashboard_records currently has
    an `updated_by` column on the live database. StaffDashboardRecord (the
    ORM model) does not declare one as of 2026-07-13 — the table has
    imported_by/imported_at (set once at import) but no per-update actor
    column. If this returns False, apply_updates()/generate_sql_updates()
    refuse to run rather than silently skip writing the required audit
    value (a plain, unmapped Python attribute assignment on an ORM instance
    would not raise an error but also would not persist anything)."""
    from sqlalchemy import text

    row = session.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'management_aios' "
            "AND table_name = 'staff_dashboard_records' "
            "AND column_name = 'updated_by'"
        )
    ).first()
    return row is not None


def fetch_current_staff(session):
    from backend.models import StaffDashboardRecord

    return (
        session.query(StaffDashboardRecord)
        .filter(StaffDashboardRecord.is_current.is_(True))
        .all()
    )


def build_reconciliation(all_sources, db_rows):
    """Classifies every source row against the DB rows (by normalized
    employee_number). Returns a list of reconciliation record dicts (the
    exact allowed reconciliation columns) plus summary counters."""
    by_norm = {}
    for row in db_rows:
        norm = normalize_employee_id(row.employee_number)
        by_norm.setdefault(norm, []).append(row)

    records = []
    counters = {
        "matched": 0,
        "unmatched": 0,
        "ambiguous": 0,
        "already_correct": 0,
        "location_change_required": 0,
        "name_conflicts": 0,
        "designation_conflicts": 0,
        "team_conflicts": 0,
    }

    def names_match(source_name, db_name):
        if not source_name or not db_name:
            return None  # not evaluable
        return source_name.strip().lower() == db_name.strip().lower()

    for location, (rows, _header_ok, _conflicts) in all_sources.items():
        for row in rows:
            candidates = by_norm.get(row.normalized_employee_id, [])
            if len(candidates) == 0:
                status = "UNMATCHED"
                counters["unmatched"] += 1
                db_id = db_emp = db_loc = None
                change_required = False
                name_match = designation_match = team_match = None
            elif len(candidates) > 1:
                status = "AMBIGUOUS"
                counters["ambiguous"] += 1
                db_id = db_emp = db_loc = None
                change_required = False
                name_match = designation_match = team_match = None
            else:
                status = "MATCHED"
                counters["matched"] += 1
                db_row = candidates[0]
                db_id = str(db_row.id)
                db_emp = db_row.employee_number
                db_loc = db_row.location
                change_required = db_loc != row.source_location
                if change_required:
                    counters["location_change_required"] += 1
                else:
                    counters["already_correct"] += 1
                name_match = names_match(row.full_name, db_row.full_name)
                designation_match = (
                    None
                    if not row.designation or not db_row.designation
                    else row.designation.strip().lower() == db_row.designation.strip().lower()
                )
                team_match = (
                    None
                    if not row.department_team or not db_row.department_team
                    else row.department_team.strip().lower() == db_row.department_team.strip().lower()
                )
                if name_match is False:
                    counters["name_conflicts"] += 1
                if designation_match is False:
                    counters["designation_conflicts"] += 1
                if team_match is False:
                    counters["team_conflicts"] += 1

            note = ""
            if status == "AMBIGUOUS":
                note = f"{len(candidates)} DB rows share this normalized employee_number — not updated."
            elif status == "UNMATCHED":
                note = "No DB row with this normalized employee_number — not updated."
            elif change_required:
                note = f"Location differs: DB has '{db_loc}', source says '{row.source_location}'."

            records.append(
                {
                    "source_file": row.source_file,
                    "source_row": row.source_row,
                    "source_employee_id": row.source_employee_id,
                    "normalized_employee_id": row.normalized_employee_id,
                    "source_location": row.source_location,
                    "database_record_id": db_id or "",
                    "database_employee_number": db_emp or "",
                    "current_database_location": db_loc or "",
                    "match_status": status,
                    "location_change_required": "YES" if change_required else "NO",
                    "name_match": "" if name_match is None else ("YES" if name_match else "NO"),
                    "designation_match": "" if designation_match is None else ("YES" if designation_match else "NO"),
                    "team_match": "" if team_match is None else ("YES" if team_match else "NO"),
                    "review_note": note,
                }
            )

    return records, counters


RECONCILIATION_COLUMNS = (
    "source_file", "source_row", "source_employee_id", "normalized_employee_id",
    "source_location", "database_record_id", "database_employee_number",
    "current_database_location", "match_status", "location_change_required",
    "name_match", "designation_match", "team_match", "review_note",
)


def write_reconciliation_csv(records, out_path):
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=RECONCILIATION_COLUMNS)
        writer.writeheader()
        for record in records:
            writer.writerow(record)


def evaluate_gate(all_sources, cross_file_dupes, counters, has_updated_by_column):
    """Returns (status, reasons) where status is 'PASS' or 'AMBER'. Mirrors
    this task's explicit stop-condition list — any one of these blocks all
    database writes (--apply and --emit-sql both refuse)."""
    reasons = []

    if not has_updated_by_column:
        reasons.append(
            "management_aios.staff_dashboard_records has no `updated_by` column — "
            "cannot satisfy 'updated_by = HR verified staff-location update' without "
            "a schema migration (see database/migrations/); imported_by/imported_at "
            "exist but are set once at import, not per-update"
        )

    total_rows = sum(len(rows) for rows, _h, _c in all_sources.values())
    if total_rows != EXPECTED_TOTAL:
        reasons.append(f"total valid source rows = {total_rows}, expected {EXPECTED_TOTAL}")

    for location, expected in EXPECTED_COUNTS.items():
        actual = len(all_sources[location][0])
        if actual != expected:
            reasons.append(f"{location}: parsed {actual} rows, expected {expected}")

    for location, (_rows, header_ok, _conflicts) in all_sources.items():
        if not header_ok:
            reasons.append(f"{location}: header row does not match expected column order")

    for location, (_rows, _header_ok, conflicts) in all_sources.items():
        if conflicts:
            reasons.append(f"{location}: {len(conflicts)} row(s) with a Location value conflicting with the file's branch")

    if cross_file_dupes:
        reasons.append(f"{len(cross_file_dupes)} normalized employee ID(s) appear in more than one source file")

    if counters["ambiguous"] > 0:
        reasons.append(f"{counters['ambiguous']} normalized source employee ID(s) match more than one DB record")

    status = "AMBER" if reasons else "PASS"
    return status, reasons


def apply_updates(records, imported_by):
    """Writes location updates for MATCHED rows with location_change_required
    only, inside a single transaction. Rolls back fully on any error. Never
    inserts, never deletes, never touches any column other than location/
    updated_at/updated_by."""
    from backend.database import get_session_factory
    from backend.models import StaffDashboardRecord
    import uuid

    to_update = [r for r in records if r["match_status"] == "MATCHED" and r["location_change_required"] == "YES"]

    session = get_session_factory()()
    updated = 0
    try:
        if not check_updated_by_column(session):
            raise SystemExit(
                "ERROR: management_aios.staff_dashboard_records has no `updated_by` column — "
                "refusing to apply (would silently fail to record the required audit value). "
                "Add the column via a reviewed migration first."
            )
        for record in to_update:
            row = session.get(StaffDashboardRecord, uuid.UUID(record["database_record_id"]))
            if row is None:
                raise RuntimeError("A matched database_record_id disappeared mid-transaction — aborting.")
            row.location = record["source_location"]
            row.updated_at = datetime.utcnow()
            row.updated_by = imported_by
            updated += 1
        session.commit()
        return updated
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, date):
        return "'" + value.isoformat() + "'"
    escaped = str(value).replace("'", "''")
    return "'" + escaped + "'"


def generate_sql_updates(records, out_path, imported_by):
    """Writes a transaction-safe SQL file containing only validated location
    UPDATE statements for MATCHED rows with location_change_required. Never
    includes names, NICs, emails, phones, or addresses — only
    database_record_id (UUID), the target location, and updated_by."""
    to_update = [r for r in records if r["match_status"] == "MATCHED" and r["location_change_required"] == "YES"]
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(
            "-- GENERATED — HR-verified branch/WFH location updates.\n"
            "-- No employee name, NIC, or other PII appears in this file — only\n"
            "-- staff_dashboard_records.id (UUID) and the target location value.\n"
            "-- Generated by scripts/update_staff_locations_from_hr_sources.py --emit-sql\n"
            f"-- {len(to_update)} UPDATE statement(s), one per matched record whose\n"
            "-- location differs from the HR-verified source. Run against\n"
            "-- management_aios.staff_dashboard_records.\n\n"
            "BEGIN;\n\n"
        )
        for record in to_update:
            f.write(
                "UPDATE management_aios.staff_dashboard_records\n"
                f"SET location = {sql_literal(record['source_location'])},\n"
                "    updated_at = now(),\n"
                f"    updated_by = {sql_literal(imported_by)}\n"
                f"WHERE id = {sql_literal(record['database_record_id'])};\n\n"
            )
        f.write(
            "COMMIT;\n\n"
            "-- ── Validation queries — run after COMMIT ──────────────────────\n\n"
            "-- 1. Total row count unchanged (expected 310).\n"
            "SELECT count(*) AS row_count FROM management_aios.staff_dashboard_records;\n\n"
            "-- 2. Location distribution after update.\n"
            "SELECT location, count(*) FROM management_aios.staff_dashboard_records\n"
            "GROUP BY location ORDER BY location;\n\n"
            "-- 3. Confirm updated_by reflects this run for the changed rows.\n"
            "SELECT count(*) FROM management_aios.staff_dashboard_records\n"
            f"WHERE updated_by = {sql_literal(imported_by)};\n"
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Validate, parse, reconcile, and report only. No DB write.")
    mode.add_argument("--apply", action="store_true", help="Apply validated location updates inside one transaction.")
    mode.add_argument(
        "--emit-sql", metavar="OUT_PATH",
        help="Write a standalone SQL UPDATE script to OUT_PATH instead of connecting directly. "
        "OUT_PATH must be outside the repository.",
    )
    parser.add_argument("--source-dir", required=True, help="Directory containing the four HR location CSV files.")
    parser.add_argument(
        "--reconciliation-csv", default=None,
        help="Optional path to also write the full reconciliation CSV (repository-safe — no NIC/address/"
        "email/phone/guardian/salary columns; see member-aios/staff-data/evidence/"
        "staff-location-update-reconciliation-2026-07-13.csv).",
    )
    parser.add_argument("--imported-by", default=UPDATED_BY, help="Value stored in updated_by (no credentials).")
    args = parser.parse_args()

    print(f"Reading source files from: {args.source_dir}")
    all_sources = load_all_sources(args.source_dir)

    for location, expected in EXPECTED_COUNTS.items():
        actual = len(all_sources[location][0])
        print(f"  {location}: parsed {actual} rows (expected {expected})")

    total_rows = sum(len(rows) for rows, _h, _c in all_sources.values())
    print(f"Total valid source rows: {total_rows} (expected {EXPECTED_TOTAL})")

    cross_file_dupes = find_cross_file_duplicates(all_sources)
    print(f"Cross-file duplicate normalized employee IDs: {len(cross_file_dupes)}")

    session = try_connect_readonly()
    if session is None:
        raise SystemExit(
            "ERROR: could not reach the database (DATABASE_URL unset or unreachable). "
            "Cannot reconcile against staff_dashboard_records without a read connection. "
            "Use --emit-sql only after obtaining a reconciliation report from an environment "
            "with database access."
        )

    try:
        db_rows = fetch_current_staff(session)
        has_updated_by_column = check_updated_by_column(session)
    finally:
        session.close()

    print(f"DB current staff rows: {len(db_rows)}")
    print(f"`updated_by` column present on staff_dashboard_records: {has_updated_by_column}")

    records, counters = build_reconciliation(all_sources, db_rows)
    status, reasons = evaluate_gate(all_sources, cross_file_dupes, counters, has_updated_by_column)

    print("\n--- Reconciliation summary ---")
    print(f"Matched:                    {counters['matched']}")
    print(f"Unmatched:                  {counters['unmatched']}")
    print(f"Ambiguous:                  {counters['ambiguous']}")
    print(f"Already correct location:   {counters['already_correct']}")
    print(f"Location change required:   {counters['location_change_required']}")
    print(f"Name conflicts:             {counters['name_conflicts']}")
    print(f"Designation conflicts:      {counters['designation_conflicts']}")
    print(f"Team conflicts:             {counters['team_conflicts']}")
    print(f"Cross-file duplicate IDs:   {len(cross_file_dupes)}")
    print(f"\nGate status: {status}")
    for reason in reasons:
        print(f"  - {reason}")

    if args.reconciliation_csv:
        write_reconciliation_csv(records, args.reconciliation_csv)
        print(f"\nReconciliation CSV written: {args.reconciliation_csv}")

    if args.dry_run:
        print("\nDRY RUN — no database write performed.")
        return

    if status != "PASS":
        raise SystemExit(
            f"\nABORTING — gate status is AMBER, not PASS. Per task rule, the database is not "
            f"updated (no --apply write, no --emit-sql file) while any stop-condition holds. "
            f"See reasons above. Resolve the underlying conflict(s) (e.g. HR/Arun resolving the "
            f"duplicate employee_number rows) and re-run."
        )

    if args.emit_sql:
        out_path = Path(args.emit_sql).resolve()
        generate_sql_updates(records, out_path, args.imported_by)
        to_update_count = sum(
            1 for r in records if r["match_status"] == "MATCHED" and r["location_change_required"] == "YES"
        )
        print(f"\nSQL update script written: {out_path} ({to_update_count} UPDATE statement(s))")
        return

    if args.apply:
        updated = apply_updates(records, args.imported_by)
        print(f"\nAPPLY complete — transaction committed. Rows updated: {updated}")


if __name__ == "__main__":
    main()
