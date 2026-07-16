-- Management AIOS — Member Leave Coordination Copy (REQ-LEAVE-COPY-001)
-- Companion "fresh install" schema file, matching the convention set by
-- database/member_schedule_events_schema.sql. Mirrors backend/models.py
-- (MemberLeaveRecord) exactly. Uses CREATE TABLE IF NOT EXISTS, so re-running
-- this against an already-existing table does NOT alter its constraints —
-- for an existing deployment, apply
-- database/migrations/2026-07-16-create-member-leave-records.sql instead.
--
-- Official-truth boundary: this table is a calendar coordination COPY of
-- leave. The separate official HR leave system remains authoritative for
-- leave balance, payroll, no-pay, and disciplinary determinations.
-- coordination_copy_only is fixed TRUE by CHECK constraint and is never set
-- to FALSE by any application code.
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

    status TEXT NOT NULL DEFAULT 'Pending',

    purpose VARCHAR(240) NULL,
    external_reference VARCHAR(120) NULL,

    coordination_copy_only BOOLEAN NOT NULL DEFAULT TRUE,
    policy_source_id TEXT NOT NULL DEFAULT 'SRC-POLICY-001',

    -- Snapshotted once, at the moment status becomes 'Approved'. NULL until
    -- then. Never recomputed from live configuration afterward, so a later
    -- configuration change cannot silently rewrite historical reporting.
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

-- Normal calendar view queries (member + date range, active rows only).
CREATE INDEX IF NOT EXISTS idx_member_leave_records_member_date
ON management_aios.member_leave_records (member_key, start_date)
WHERE deleted_at IS NULL;

-- History / status-filtered queries, and the short-leave monthly-cap sum
-- (which always filters by member_key + leave_type + status='Approved').
CREATE INDEX IF NOT EXISTS idx_member_leave_records_member_status
ON management_aios.member_leave_records (member_key, status)
WHERE deleted_at IS NULL;

-- Approved-leave conflict checks against task saves (member + date range +
-- status — partial index keeps it small since most rows are not Approved).
CREATE INDEX IF NOT EXISTS idx_member_leave_records_approved_conflict
ON management_aios.member_leave_records (member_key, start_date, end_date)
WHERE deleted_at IS NULL AND status = 'Approved';
