-- Management AIOS — Remove Approval/Status Workflow From member_leave_records
-- REQ-LEAVE-COPY-001-SIMPLIFICATION-AMENDMENT
-- 2026-07-16
--
-- User decision: the calendar leave-copy feature must not have a Pending/
-- Approved/Rejected/Cancelled workflow. A saved leave record is immediately
-- active; the only lifecycle event after creation is soft-deletion
-- (deleted_at). This migration removes the status column, its CHECK
-- constraint, and status-dependent indexes from the already-created
-- management_aios.member_leave_records table (created by
-- database/migrations/2026-07-16-create-member-leave-records.sql).
--
-- Migration mapping (per the user's explicit instruction):
--   Pending   -> becomes an active row (no change to deleted_at)
--   Approved  -> becomes an active row (no change to deleted_at)
--   Rejected  -> soft-deleted (deleted_at populated) — a rejection is a
--                completed coordination decision that the record should not
--                stand, matching the "not visible in normal or active views"
--                intent of the old Rejected status.
--   Cancelled -> soft-deleted (deleted_at populated) — same rationale as
--                Rejected: the record should no longer be active.
--
-- Only rows where deleted_at IS NULL are touched by the Rejected/Cancelled
-- soft-delete step below — an already soft-deleted row is left exactly as
-- it was (COALESCE keeps its original deleted_at timestamp rather than
-- overwriting it with the migration's run time).
--
-- Does not drop management_aios.member_leave_records. Does not alter
-- management_aios.member_schedule_events or
-- management_aios.staff_dashboard_records.
--
-- Idempotent: every step uses IF EXISTS / guards so re-running this file
-- against a database it has already been applied to is a safe no-op.

BEGIN;

-- ── 1. Pre-migration inspection — record counts grouped by status ────────
-- (Also run manually and recorded in
--  evidence/database/member-leave-status-removal-migration-execution-2026-07-16.md
--  before this transaction is opened against the live database.)
DO $$
DECLARE
    has_status_column boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'management_aios'
          AND table_name = 'member_leave_records'
          AND column_name = 'status'
    ) INTO has_status_column;

    IF has_status_column THEN
        RAISE NOTICE 'Pre-migration status counts (see query below for exact figures).';
    ELSE
        RAISE NOTICE 'status column already absent — this migration has already been applied. Skipping status-dependent steps.';
    END IF;
END $$;

-- Run this SELECT manually immediately before BEGIN and record the output
-- in the execution evidence file (only meaningful while the status column
-- still exists):
--
-- SELECT status, count(*) FROM management_aios.member_leave_records
-- WHERE deleted_at IS NULL GROUP BY status ORDER BY status;

-- ── 2. Soft-delete Rejected/Cancelled active rows ─────────────────────────
-- Pending and Approved rows are left untouched here — they become active
-- rows simply by virtue of the status column being dropped afterward; no
-- data change is needed for them. Only Rejected/Cancelled rows, which were
-- previously excluded from the normal calendar view, are soft-deleted so
-- they remain excluded under the new deleted_at-only lifecycle model.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'management_aios'
          AND table_name = 'member_leave_records'
          AND column_name = 'status'
    ) THEN
        UPDATE management_aios.member_leave_records
        SET deleted_at = COALESCE(deleted_at, now())
        WHERE status IN ('Rejected', 'Cancelled')
          AND deleted_at IS NULL;
    END IF;
END $$;

-- ── 3. Drop status-dependent indexes ──────────────────────────────────────
DROP INDEX IF EXISTS management_aios.idx_member_leave_records_member_status;
DROP INDEX IF EXISTS management_aios.idx_member_leave_records_approved_conflict;

-- ── 4. Drop the status CHECK constraint ───────────────────────────────────
ALTER TABLE management_aios.member_leave_records
    DROP CONSTRAINT IF EXISTS member_leave_records_status_check;

-- ── 5. Drop the status column ─────────────────────────────────────────────
ALTER TABLE management_aios.member_leave_records
    DROP COLUMN IF EXISTS status;

-- ── 6. Add/retain indexes suitable for the new active-row model ──────────
-- Member/date active-leave queries (normal view + calendar rendering) —
-- already existed under the pre-simplification schema; retained as-is.
CREATE INDEX IF NOT EXISTS idx_member_leave_records_member_date
    ON management_aios.member_leave_records (member_key, start_date)
    WHERE deleted_at IS NULL;

-- Short-leave monthly cap sum — replaces the dropped
-- idx_member_leave_records_member_status (which was keyed on status).
-- Filters to Short Leave rows only, matching the cap query's own filter.
CREATE INDEX IF NOT EXISTS idx_member_leave_records_short_leave_active
    ON management_aios.member_leave_records (member_key, start_date)
    WHERE deleted_at IS NULL AND leave_type = 'Short Leave';

-- Task-conflict queries — replaces the dropped
-- idx_member_leave_records_approved_conflict (previously partial on
-- status = 'Approved'); now covers every active row, since every active
-- row can conflict with a task under the new rule.
CREATE INDEX IF NOT EXISTS idx_member_leave_records_active_conflict
    ON management_aios.member_leave_records (member_key, start_date, end_date)
    WHERE deleted_at IS NULL;

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. status column is absent.
SELECT count(*) AS status_column_present
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'member_leave_records'
  AND column_name = 'status';
-- Expected: 0

-- 2. status CHECK constraint is absent.
SELECT count(*) AS status_constraint_present
FROM pg_constraint
WHERE conrelid = 'management_aios.member_leave_records'::regclass
  AND conname = 'member_leave_records_status_check';
-- Expected: 0

-- 3. Active row count after migration.
SELECT count(*) AS active_row_count
FROM management_aios.member_leave_records
WHERE deleted_at IS NULL;

-- 4. Soft-deleted row count after migration (includes any rows that were
--    already soft-deleted before this migration, plus the
--    Rejected/Cancelled rows migrated by step 2).
SELECT count(*) AS soft_deleted_row_count
FROM management_aios.member_leave_records
WHERE deleted_at IS NOT NULL;

-- 5. Confirm the new indexes exist and the dropped ones do not.
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'management_aios'
  AND tablename = 'member_leave_records'
ORDER BY indexname;

-- 6. Confirm member_schedule_events row count is unaffected (run before and
--    after; the two counts must match).
SELECT count(*) AS existing_schedule_event_count
FROM management_aios.member_schedule_events;

-- ── Rollback ────────────────────────────────────────────────────────────
-- Preferred rollback is redeploying the prior application commit (which
-- still expects the status column/constraint) — this migration's own
-- effect on the database would then need a *separate*, explicitly reviewed
-- migration to re-add a status column, since the data needed to
-- reconstruct exact prior status values (Pending vs. Approved for rows
-- that remained active) is not recoverable from deleted_at alone. Do NOT
-- auto-reintroduce a guessed status value — see rollback notes in
-- handover/2026-07-16__leave-status-workflow-removal-closure.md. Do not
-- drop management_aios.member_leave_records under any circumstance as part
-- of this rollback.
