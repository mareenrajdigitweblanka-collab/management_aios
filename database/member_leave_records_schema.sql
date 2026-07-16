-- Management AIOS — Member Leave Coordination Copy (REQ-LEAVE-COPY-001)
-- Companion "fresh install" schema file, matching the convention set by
-- database/member_schedule_events_schema.sql. Mirrors backend/models.py
-- (MemberLeaveRecord) exactly. Uses CREATE TABLE IF NOT EXISTS, so re-running
-- this against an already-existing table does NOT alter its constraints —
-- for an existing deployment, apply
-- database/migrations/2026-07-16-create-member-leave-records.sql followed by
-- database/migrations/2026-07-16-remove-member-leave-status-workflow.sql
-- instead.
--
-- Official-truth boundary: this table is a calendar coordination COPY of
-- leave. The separate official HR leave system remains authoritative for
-- leave balance, payroll, no-pay, and disciplinary determinations.
-- coordination_copy_only is fixed TRUE by CHECK constraint and is never set
-- to FALSE by any application code.
--
-- Lifecycle (2026-07-16 simplification amendment, REQ-LEAVE-COPY-001):
-- there is no approval/status workflow. Every saved row is immediately
-- active; the only lifecycle event after creation is soft-deletion
-- (deleted_at). A row's existence with deleted_at IS NULL is its active
-- state — no status/active-inactive enum column exists.
--
-- Does not alter management_aios.member_schedule_events or
-- management_aios.staff_dashboard_records.

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

    purpose VARCHAR(240) NULL,
    external_reference VARCHAR(120) NULL,

    coordination_copy_only BOOLEAN NOT NULL DEFAULT TRUE,
    policy_source_id TEXT NOT NULL DEFAULT 'SRC-POLICY-001',

    -- Snapshotted once, at creation, and recalculated in the same
    -- transaction whenever a date/time field is edited. Never recomputed
    -- from live configuration on GET/report read, so a later configuration
    -- change cannot silently rewrite an existing record's historical
    -- reporting contribution.
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

-- Normal calendar view queries (member + date range, active rows only).
CREATE INDEX IF NOT EXISTS idx_member_leave_records_member_date
ON management_aios.member_leave_records (member_key, start_date)
WHERE deleted_at IS NULL;

-- Short-leave monthly cap sum (member + leave_type = 'Short Leave', active
-- rows only).
CREATE INDEX IF NOT EXISTS idx_member_leave_records_short_leave_active
ON management_aios.member_leave_records (member_key, start_date)
WHERE deleted_at IS NULL AND leave_type = 'Short Leave';

-- Active-leave conflict checks against task saves (member + date range,
-- active rows only — every active row can conflict with a task under the
-- simplified lifecycle, so this is no longer status-partial).
CREATE INDEX IF NOT EXISTS idx_member_leave_records_active_conflict
ON management_aios.member_leave_records (member_key, start_date, end_date)
WHERE deleted_at IS NULL;
