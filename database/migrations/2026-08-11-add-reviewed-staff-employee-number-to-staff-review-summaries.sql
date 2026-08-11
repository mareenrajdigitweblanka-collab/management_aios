-- Management AIOS — Add reviewed_staff_employee_number to
-- management_aios.staff_review_summaries
-- 2026-08-11. Prerequisite step for re-sourcing staff_dashboard_records
-- from employee_management.staff (Ledsone) instead of the HR-provided CSV
-- import — see database/migrations/2026-08-11-drop-uncovered-columns-from-
-- staff-dashboard-records.sql and scripts/sync_staff_dashboard_from_ledsone.py.
--
-- Purpose: staff_review_summaries.reviewed_staff_id is a NOT NULL foreign
-- key into staff_dashboard_records.id (a UUID). Re-sourcing that table
-- regenerates rows with new UUIDs, which would orphan every existing review
-- row unless something durable, independent of the UUID, survives the
-- re-source. employee_number is that durable key: this migration snapshots
-- it onto staff_review_summaries directly (from the CURRENT, pre-re-source
-- staff_dashboard_records join) so the sync script can look up each
-- review's correct new row afterward without depending on the old UUID.
--
-- Additive only: one nullable TEXT column, backfilled once from the
-- existing FK join. Does not alter reviewed_staff_id itself, any
-- constraint, or any other table.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS; the backfill UPDATE only touches
-- rows where the new column is still NULL, so re-running this file is safe.
--
-- HOW TO APPLY:
--   psql "$DATABASE_URL" -f database/migrations/2026-08-11-add-reviewed-staff-employee-number-to-staff-review-summaries.sql
-- or paste into the Neon SQL Editor and run once, BEFORE the column-drop
-- migration and BEFORE running the new sync script.

BEGIN;

ALTER TABLE management_aios.staff_review_summaries
    ADD COLUMN IF NOT EXISTS reviewed_staff_employee_number TEXT NULL;

UPDATE management_aios.staff_review_summaries r
SET reviewed_staff_employee_number = d.employee_number
FROM management_aios.staff_dashboard_records d
WHERE d.id = r.reviewed_staff_id
  AND r.reviewed_staff_employee_number IS NULL;

COMMIT;

-- Validation queries — run after COMMIT to confirm.

-- 1. Column exists with the expected type/nullability.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_review_summaries'
  AND column_name = 'reviewed_staff_employee_number';

-- 2. Every row was backfilled (expected 0 — every existing review row's
--    reviewed_staff_id currently resolves to a real staff_dashboard_records
--    row with a non-null employee_number, per pre-migration verification).
SELECT count(*) AS unbackfilled_count
FROM management_aios.staff_review_summaries
WHERE reviewed_staff_employee_number IS NULL;

-- 3. Row count unchanged (this migration never inserts/deletes a row).
SELECT count(*) AS row_count FROM management_aios.staff_review_summaries;

-- Rollback (safe as long as the sync script has not yet run against this
-- column):
--
-- BEGIN;
-- ALTER TABLE management_aios.staff_review_summaries
--     DROP COLUMN IF EXISTS reviewed_staff_employee_number;
-- COMMIT;
