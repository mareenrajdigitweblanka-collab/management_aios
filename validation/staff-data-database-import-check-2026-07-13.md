---
name: staff-data-database-import-check
type: validation
created: 2026-07-13
status: AMBER — migration reviewed and dry-run verified; apply and import --apply pending DB access this sandbox cannot reach
source-boundary: database/migrations/2026-07-13-create-staff-dashboard-records.sql, scripts/import_staff_dashboard_csv.py, member-aios/staff-data/source/normalized/hr-staff-dashboard.csv
root-truth: CLAUDE.md — canonical
---

# Staff Data Database Import — Check — 2026-07-13

**Task type:** Create and review the `staff_dashboard_records` migration; dry-run and (pending) apply the real CSV import.
**Task boundary:** No salary/address/email/phone/guardian column created; no alteration to `member_schedule_events`; HR remains the authoritative source; this table is a controlled dashboard projection only.

---

## Migration Review

Self-reviewed `database/migrations/2026-07-13-create-staff-dashboard-records.sql` against the required checklist:

| # | Requirement | Result |
|---|---|---|
| 1 | Target schema/table | `management_aios.staff_dashboard_records` |
| 2 | Columns | `id` (UUID PK), `source_record_key` (unique), the 16 approved dashboard fields (`employee_number` … `source_row_reference`), plus provenance bookkeeping (`source_hash`, `source_status`, `is_current`, `imported_at`, `imported_by`, `created_at`, `updated_at`) — matches the task's suggested column list exactly |
| 3 | Excluded fields | Confirmed absent: no `salary`/`home_address`/`personal_email`/`personal_phone`/`contact_number`/`guardian_phone`/`guardian_number` column exists anywhere in the DDL. Migration includes an explicit post-apply validation query (`SELECT column_name FROM information_schema.columns WHERE ... column_name IN (...)`) expected to return 0 rows. |
| 4 | Indexes | `department_team`, `staff_status`, `employment_stage` (partial, `WHERE is_current = TRUE`, matching the API's most common filter columns), `employee_number`, `full_name` (supports search/sort) |
| 5 | Uniqueness method | `source_record_key` (deterministic hash of `source_file`, `source_page`, `source_row_reference`, `employee_number`, `full_name`, `date_of_joining`) — **not** `employee_number` alone, per the task's explicit instruction, since the source has 5 reused `employee_number` values across 11 rows |
| 6 | Rollback | Commented `DROP TABLE IF EXISTS management_aios.staff_dashboard_records;` block present |
| 7 | Migration safety | Wrapped in `BEGIN;`/`COMMIT;`; `CREATE TABLE`/`CREATE INDEX` all use `IF NOT EXISTS` (idempotent, safe to re-run); does not reference or alter `member_schedule_events` anywhere; includes 4 validation queries (column list, unique-constraint definition, row count, excluded-field check) |

**Result: PASS.** No defect found this pass — unlike the prior `paraparan` migration review, no correction was needed.

---

## Table Created

**NOT YET APPLIED.** The migration has not been executed against the Neon database. See "Pending Actions" below.

---

## Row Count Before/After

**N/A — table does not exist yet.** Before: 0 (table not created). After: pending apply.

---

## Import Dry-Run

Ran locally against the real, git-ignored CSV (`member-aios/staff-data/source/normalized/hr-staff-dashboard.csv` — never read or copied elsewhere by this task):

```
Reading CSV: hr-staff-dashboard.csv (path not printed further; row content never printed)
Parsed: 310 accepted, 0 rejected
DB comparison: SKIPPED (no reachable database connection from this environment). Accepted rows would be evaluated for insert/update at --apply time.
DRY RUN — no database write performed.
```

**Result: PASS.**

- **310 accepted, 0 rejected** — matches the expected 310-row count exactly.
- **0 excluded-field columns** — the header validation (`validate_header()`) checks the CSV header against the exact 16 approved columns *and* separately checks for any of the 7 excluded field names; since the script did not abort with a `SystemExit`, both checks passed.
- **No full row output** — confirmed by inspecting the script's own print statements (only counts) and by reviewing the actual console output above.
- **No NIC value printed** — confirmed (script has no code path that ever prints a `nic` field value).
- **No credential printed** — confirmed (`DATABASE_URL` is never printed; only used internally to attempt a connection).

**DB comparison skipped, not failed.** This sandbox cannot reach the configured Neon database directly (same diagnosed network-egress restriction — outbound PostgreSQL/port-5432 traffic — documented in `validation/paraparan-member-schedule-integration-check-2026-07-13.md`). The dry-run's DB-reachability probe was made deliberately fast and bounded (a daemon-threaded connection attempt with an 8-second hard timeout) specifically so this known restriction could not hang the script — confirmed working: the command completed in well under 30 seconds instead of hanging indefinitely, as an earlier, less defensive version of this same probe did on first attempt (fixed during this session; see "Known Fix" below).

### Known Fix (This Session)

The first `--dry-run` attempt hung indefinitely. Root cause: the DB-reachability probe used a plain SQLAlchemy `connect_args={'connect_timeout': N}`, which does not reliably bound the connection attempt in this sandboxed environment (the same underlying restriction that has caused hangs in prior sessions — an explicit socket-level `connect_timeout` was observed not to be honored). Fix: `try_connect_readonly()` now runs the connection attempt in a **daemon** background thread and waits on a `queue.Queue.get(timeout=8)` from the main thread — this bounds the wait from the *caller's* side regardless of whether the underlying blocking call cooperates with its own timeout, and the daemon thread cannot prevent the process from exiting even if the abandoned attempt is still blocked in the background.

---

## Import Apply

**NOT YET RUN.** `--apply` requires a reachable database connection, which this sandbox does not have. See "Pending Actions" below.

---

## Database Row Counts

**N/A — pending apply.**

---

## Duplicate Employee-ID Result

**Preserved by design, not yet empirically confirmed post-import.** The import script does not deduplicate, merge, or renumber rows with a reused `employee_number` — each of the 11 affected rows (5 reused `employee_number` values: `DWL302` ×3, `DWL296`/`DWL303`/`DWL305`/`DWL319` ×2 each — see `member-aios/staff-data/evidence/hr-duplicate-employee-id-review-2026-07-13.md`) gets its own distinct `source_record_key` (computed from `source_file`+`source_page`+`source_row_reference`+`employee_number`+`full_name`+`date_of_joining`, all of which differ per physical row even when `employee_number` repeats) and is imported as a separate row. This will be empirically confirmed by a row-count query after `--apply` (expected: 11 rows across exactly 5 `employee_number` values with `count(*) > 1`).

---

## Excluded-Field Validation

**PASS, at three independent layers:**

1. **Table DDL** — no excluded column exists in `staff_dashboard_records` (self-review above; migration's own validation query will confirm empirically post-apply).
2. **Import script** — `validate_header()` aborts the entire import (no row read) if any excluded field name appears in the CSV header.
3. **API schema** — `StaffRecordOut` (`backend/schemas.py`) declares only the 16 approved fields; even if the ORM model somehow gained an extra column in the future, this Pydantic response model would not expose it.

---

## Rollback Plan

Present in the migration file as a commented block: `DROP TABLE IF EXISTS management_aios.staff_dashboard_records;` wrapped in `BEGIN`/`COMMIT`. Safe to run at any point before the table is depended upon elsewhere (no other table references it via foreign key).

---

## Pending Actions (Require Database Access This Sandbox Cannot Reach)

Consistent with the diagnosed restriction from the Paraparan schedule task (outbound PostgreSQL/port-5432 traffic blocked; HTTPS/443 works fine), the following require either the user applying the migration/running the import directly (e.g. via the Neon SQL Editor for the migration, and a local terminal with real network access for the import script), or another environment with real Postgres connectivity:

1. Apply `database/migrations/2026-07-13-create-staff-dashboard-records.sql`.
2. Run the migration's 4 built-in validation queries and confirm results.
3. Re-run `python scripts/import_staff_dashboard_csv.py --dry-run` with DB reachable, to get real insert/update/unchanged predictions (expected: 310 insert, 0 update, 0 unchanged, on a first run against an empty table).
4. Run `python scripts/import_staff_dashboard_csv.py --apply`.
5. Confirm: table row count = 310; PH count = 42; `[VERIFY]` employment_stage count = 310; the 5 duplicate `employee_number` values each appear the expected number of times; no unexpected `staff_status` value.

This validation file will be updated once those steps are completed.
