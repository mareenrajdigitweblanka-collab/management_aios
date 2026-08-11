-- Management AIOS — Drop uncovered columns from
-- management_aios.staff_dashboard_records
-- 2026-08-11. Second step of re-sourcing staff_dashboard_records from
-- employee_management.staff (Ledsone) instead of the HR-provided CSV
-- import — see scripts/sync_staff_dashboard_from_ledsone.py and
-- member-aios/staff-data/README.md for the full rationale and governance
-- note. Apply AFTER 2026-08-11-add-reviewed-staff-employee-number-to-
-- staff-review-summaries.sql and BEFORE running the new sync script.
--
-- Purpose: employee_management.staff (the new source) has no equivalent
-- for these 8 columns. Per explicit instruction, they are dropped outright
-- rather than merged or nulled-and-kept:
--   epf_number, nic, cv_reference, calling_name, location, remarks,
--   employment_stage, staff_status
--
-- This is a BREAKING change to the dashboard-facing API contract
-- (StaffRecordOut) and to GET /api/staff/summary and
-- GET /api/staff/filter-options, whose entire logic is built on
-- staff_status/employment_stage/location — both routes are removed in the
-- same change as this migration (backend/routers/staff.py,
-- backend/schemas.py), and the corresponding filter/summary UI is removed
-- from web-view/js/staff-data.js. Do not apply this migration without
-- deploying that code change in the same release — the live app will 500
-- on those two routes otherwise.
--
-- Dropping employment_stage and staff_status also drops their CHECK
-- constraints automatically (staff_dashboard_records_employment_stage_check,
-- staff_dashboard_records_staff_status_check) — no separate DROP CONSTRAINT
-- needed. No NOT NULL constraint exists on any of the 8 columns, so there
-- is no data-loss guard blocking this.
--
-- Also drops the three now-orphaned partial indexes that were built on
-- these columns (idx_staff_dashboard_records_department_team is unaffected
-- — it indexes department_team, which is NOT being dropped).
--
-- Also widens staff_dashboard_records_source_status_check to allow
-- 'synced' (the value scripts/sync_staff_dashboard_from_ledsone.py sets on
-- Ledsone-sourced rows), alongside the existing 'imported'/'superseded'
-- values used by the now-superseded CSV import path.
--
-- NOT idempotent in the traditional sense (DROP COLUMN has no
-- "IF NOT EXISTS already satisfied" concept the same way ADD does), but
-- DROP COLUMN IF EXISTS is used throughout so re-running this file after a
-- successful run is a safe no-op.
--
-- HOW TO APPLY:
--   psql "$DATABASE_URL" -f database/migrations/2026-08-11-drop-uncovered-columns-from-staff-dashboard-records.sql
-- or paste into the Neon SQL Editor and run once.

BEGIN;

DROP INDEX IF EXISTS management_aios.idx_staff_dashboard_records_staff_status;
DROP INDEX IF EXISTS management_aios.idx_staff_dashboard_records_employment_stage;

ALTER TABLE management_aios.staff_dashboard_records
    DROP COLUMN IF EXISTS epf_number,
    DROP COLUMN IF EXISTS nic,
    DROP COLUMN IF EXISTS cv_reference,
    DROP COLUMN IF EXISTS calling_name,
    DROP COLUMN IF EXISTS location,
    DROP COLUMN IF EXISTS remarks,
    DROP COLUMN IF EXISTS employment_stage,
    DROP COLUMN IF EXISTS staff_status;

ALTER TABLE management_aios.staff_dashboard_records
    DROP CONSTRAINT IF EXISTS staff_dashboard_records_source_status_check;

ALTER TABLE management_aios.staff_dashboard_records
    ADD CONSTRAINT staff_dashboard_records_source_status_check
    CHECK (source_status IN ('imported', 'superseded', 'synced'));

COMMIT;

-- Validation queries — run after COMMIT to confirm.

-- 1. None of the 8 dropped columns remain (expected 0 rows).
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_dashboard_records'
  AND column_name IN (
      'epf_number', 'nic', 'cv_reference', 'calling_name', 'location',
      'remarks', 'employment_stage', 'staff_status'
  );

-- 2. The remaining dashboard-facing columns are still present (expected 8
--    rows: employee_number, date_of_joining, full_name, department_team,
--    designation, source_file, source_page, source_row_reference).
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_dashboard_records'
  AND column_name IN (
      'employee_number', 'date_of_joining', 'full_name', 'department_team',
      'designation', 'source_file', 'source_page', 'source_row_reference'
  )
ORDER BY column_name;

-- 3. The two CHECK constraints tied to the dropped columns are gone
--    (expected 0 rows).
SELECT conname
FROM pg_constraint
WHERE conrelid = 'management_aios.staff_dashboard_records'::regclass
  AND conname IN (
      'staff_dashboard_records_employment_stage_check',
      'staff_dashboard_records_staff_status_check'
  );

-- 4. source_status check now allows 'synced' too.
SELECT pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.staff_dashboard_records'::regclass
  AND conname = 'staff_dashboard_records_source_status_check';

-- 5. Row count unchanged by this migration (compare against the count
--    before running this file).
SELECT count(*) AS row_count FROM management_aios.staff_dashboard_records;

-- Rollback (destructive to re-add — the dropped columns' DATA is gone, not
-- just recoverable structure. Only meaningful before this migration is
-- applied to the live database; once applied, treat as a one-way change and
-- restore from a backup/export taken before COMMIT if the data itself is
-- ever needed again):
--
-- BEGIN;
-- ALTER TABLE management_aios.staff_dashboard_records
--     ADD COLUMN IF NOT EXISTS epf_number TEXT,
--     ADD COLUMN IF NOT EXISTS nic TEXT,
--     ADD COLUMN IF NOT EXISTS cv_reference TEXT,
--     ADD COLUMN IF NOT EXISTS calling_name TEXT,
--     ADD COLUMN IF NOT EXISTS location TEXT,
--     ADD COLUMN IF NOT EXISTS remarks TEXT,
--     ADD COLUMN IF NOT EXISTS employment_stage TEXT,
--     ADD COLUMN IF NOT EXISTS staff_status TEXT;
-- -- (CHECK constraints and indexes would need to be re-added separately;
-- -- see database/migrations/2026-07-13-create-staff-dashboard-records.sql
-- -- for their exact definitions. Column DATA is not restored by this.)
-- COMMIT;
