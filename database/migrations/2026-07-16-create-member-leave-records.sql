-- Management AIOS — Create management_aios.member_leave_records
-- REQ-LEAVE-COPY-001 — Calendar Leave Coordination Copy
-- 2026-07-16. Additive only — does not drop, alter, or rewrite any existing
-- table. management_aios.member_schedule_events and
-- management_aios.staff_dashboard_records are untouched by this migration.
--
-- Official-truth boundary: this table stores a calendar coordination COPY
-- of leave only. The separate official HR leave system remains the source
-- of truth for leave balance, payroll, no-pay, and disciplinary
-- determinations. coordination_copy_only is fixed TRUE by CHECK constraint
-- and no application code ever sets it to FALSE.
--
-- Approved source documents (treated as the implementation contract):
--   docs/2026-07-16_management-calendar-leave-copy-requirement.md
--   docs/management-calendar-leave-copy-design.md
--
-- Idempotent: CREATE TABLE/INDEX use IF NOT EXISTS — safe to re-run.
--
-- Execution note (2026-07-16): this migration was authored and reviewed as
-- part of REQ-LEAVE-COPY-001 implementation, but was NOT executed against
-- the live Management AIOS PostgreSQL database in this session — the only
-- database connection available was confirmed (via schema listing) to be
-- an unrelated company database with no management_aios schema and no
-- member_schedule_events table. See
-- evidence/database/management-calendar-leave-copy-migration-execution-2026-07-16.md
-- for the full pre-check evidence. Apply this file manually against the
-- correct Neon/management_aios instance before the feature is considered
-- deployed.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.member_leave_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_key TEXT NOT NULL,
    member_label TEXT NOT NULL,

    leave_type TEXT NOT NULL,
    half_day_period TEXT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,

    status TEXT NOT NULL DEFAULT 'Pending',

    purpose VARCHAR(240) NULL,
    external_reference VARCHAR(120) NULL,

    coordination_copy_only BOOLEAN NOT NULL DEFAULT TRUE,
    policy_source_id TEXT NOT NULL DEFAULT 'SRC-POLICY-001',

    effective_leave_minutes INTEGER NULL,

    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT member_leave_records_member_key_check
        CHECK (member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')),

    CONSTRAINT member_leave_records_leave_type_check
        CHECK (leave_type IN ('Short Leave', 'Half-Day First', 'Half-Day Second', 'Full-Day', 'Multi-Day')),

    CONSTRAINT member_leave_records_status_check
        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),

    CONSTRAINT member_leave_records_half_day_period_pairing_check
        CHECK (
            (leave_type IN ('Half-Day First', 'Half-Day Second') AND half_day_period IS NOT NULL)
            OR (leave_type NOT IN ('Half-Day First', 'Half-Day Second') AND half_day_period IS NULL)
        ),

    CONSTRAINT member_leave_records_half_day_period_value_check
        CHECK (half_day_period IS NULL OR half_day_period IN ('First', 'Second')),

    CONSTRAINT member_leave_records_date_range_check
        CHECK (end_date >= start_date),

    CONSTRAINT member_leave_records_single_day_range_check
        CHECK (leave_type = 'Multi-Day' OR end_date = start_date),

    CONSTRAINT member_leave_records_short_leave_time_required_check
        CHECK (leave_type != 'Short Leave' OR (start_time IS NOT NULL AND end_time IS NOT NULL)),

    CONSTRAINT member_leave_records_non_short_leave_no_time_check
        CHECK (leave_type = 'Short Leave' OR (start_time IS NULL AND end_time IS NULL)),

    CONSTRAINT member_leave_records_time_check
        CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),

    CONSTRAINT member_leave_records_coordination_copy_check
        CHECK (coordination_copy_only = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_member_leave_records_member_date
    ON management_aios.member_leave_records (member_key, start_date)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_leave_records_member_status
    ON management_aios.member_leave_records (member_key, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_leave_records_approved_conflict
    ON management_aios.member_leave_records (member_key, start_date, end_date)
    WHERE deleted_at IS NULL AND status = 'Approved';

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. Table exists with the expected column set.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'member_leave_records'
ORDER BY ordinal_position;

-- 2. All CHECK constraints exist.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.member_leave_records'::regclass
  AND contype = 'c';

-- 3. All three indexes exist.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'management_aios'
  AND tablename = 'member_leave_records';

-- 4. coordination_copy_only defaults to / is fixed TRUE.
SELECT column_default
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'member_leave_records'
  AND column_name = 'coordination_copy_only';

-- 5. Row count (expected 0 immediately after this migration).
SELECT count(*) AS row_count FROM management_aios.member_leave_records;

-- 6. Confirm member_schedule_events row count is unaffected by this
--    migration (run before and after; the two counts must match).
SELECT count(*) AS existing_schedule_event_count
FROM management_aios.member_schedule_events;

-- ── Rollback (if ever needed) ──────────────────────────────────────────────
-- Preferred rollback is application-level: unmount backend/routers/
-- member_leave.py from backend/main.py and hide the frontend leave UI —
-- this preserves all leave-copy history. Only drop the table if explicit
-- deletion approval has been given (this destroys coordination-copy
-- history, which the approved requirement treats as worth preserving):
--
-- BEGIN;
-- DROP TABLE IF EXISTS management_aios.member_leave_records;
-- COMMIT;
