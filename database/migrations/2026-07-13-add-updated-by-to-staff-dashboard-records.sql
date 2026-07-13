-- Management AIOS — Add updated_by to management_aios.staff_dashboard_records
-- 2026-07-13. Applied to the live database this same day, with explicit
-- user authorization (see validation/staff-location-source-reconciliation-
-- check-2026-07-13.md §7 and handover/staff-location-data-integration-
-- 2026-07-13.md).
--
-- Purpose: the HR-verified staff-location integration task requires
-- recording who/what last changed a row's location — set to
-- 'HR verified staff-location update' by scripts/update_staff_locations_
-- from_hr_sources.py. The table had imported_by/imported_at (set once, at
-- import time, by scripts/import_staff_dashboard_csv.py) but no per-update
-- actor column. This migration adds one.
--
-- Additive only: a single nullable TEXT column. Does not alter any existing
-- column, constraint, row, or any other table. Existing rows get
-- updated_by = NULL (not '[VERIFY]' — this is a bookkeeping field, not a
-- dashboard-facing business value, so the '[VERIFY]' convention used for
-- HR-sourced fields does not apply here).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS — safe to re-run.
--
-- HOW TO APPLY:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-13-add-updated-by-to-staff-dashboard-records.sql
-- or paste into the Neon SQL Editor and run once.

BEGIN;

ALTER TABLE management_aios.staff_dashboard_records
    ADD COLUMN IF NOT EXISTS updated_by TEXT NULL;

COMMIT;

-- Validation queries — run after COMMIT to confirm.

-- 1. Column exists with the expected type/nullability.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_dashboard_records'
  AND column_name = 'updated_by';

-- 2. Total row count unchanged (expected 310).
SELECT count(*) AS row_count FROM management_aios.staff_dashboard_records;

-- 3. All existing rows have updated_by = NULL (expected 310 — nothing has
--    used this column yet).
SELECT count(*) AS null_updated_by_count
FROM management_aios.staff_dashboard_records
WHERE updated_by IS NULL;

-- Rollback (if ever needed — safe as long as no downstream code depends on
-- reading updated_by yet):
--
-- BEGIN;
-- ALTER TABLE management_aios.staff_dashboard_records DROP COLUMN IF EXISTS updated_by;
-- COMMIT;
