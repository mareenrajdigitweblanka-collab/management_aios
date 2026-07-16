-- Management AIOS — Member Dashboard Schedule Events
-- Local implementation draft, 2026-07-09. Not applied to any live database
-- by this task. Apply manually against your own PostgreSQL instance.
--
-- 2026-07-13: member_key CHECK constraint updated to include 'paraparan'.
-- Because this script uses CREATE TABLE IF NOT EXISTS, re-running it against
-- an already-existing table (e.g. the deployed Neon instance) does NOT alter
-- an existing constraint — this file only reflects the target state for a
-- fresh install. For an existing deployment, apply
-- database/migrations/2026-07-13-add-paraparan-member-key.sql instead (draft
-- only as of 2026-07-13 — not yet executed against any database by this
-- task).
--
-- Testing/demo truth boundary: source_scope and is_official_truth default to
-- non-official values. No application code in backend/ ever sets
-- is_official_truth = TRUE or changes source_scope away from
-- 'dashboard_testing'. See backend/README.md and
-- docs/member-dashboard-schedule-api-plan-2026-07-09.md for the full design
-- rationale.
--
-- 2026-07-14: category CHECK constraint added, restricting the column to
-- the permanent two-value classification system ('Scheduled Task' /
-- 'Unscheduled Task'), replacing the earlier free-text placeholder values
-- ('Sample Task' and friends). Because this script uses CREATE TABLE IF NOT
-- EXISTS, re-running it against an already-existing table does NOT add this
-- constraint or change the existing default — this file only reflects the
-- target state for a fresh install. For an existing deployment, apply
-- database/migrations/2026-07-14-schedule-task-category-classification.sql
-- instead, which migrates existing rows to 'Scheduled Task' before adding
-- the constraint.
--
-- 2026-07-16: title column widened from VARCHAR(60) to VARCHAR(120). Because
-- this script uses CREATE TABLE IF NOT EXISTS, re-running it against an
-- already-existing table does NOT widen an existing column — this file only
-- reflects the target state for a fresh install. For an existing deployment,
-- apply database/migrations/2026-07-16-increase-member-schedule-title-limit.sql
-- instead, which safely widens the live column via ALTER COLUMN ... TYPE.

-- gen_random_uuid() is built into PostgreSQL core since PG 13; pgcrypto is
-- only needed on older servers. Guarded so it is a no-op (and does not fail)
-- on managed instances where the extension is already present or where core
-- gen_random_uuid() already covers it.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.member_schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    member_key TEXT NOT NULL,
    member_label TEXT NOT NULL,

    event_date DATE NOT NULL,
    title VARCHAR(120) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Scheduled Task',
    priority TEXT NOT NULL DEFAULT 'Medium',
    start_time TIME NULL,
    end_time TIME NULL,
    notes VARCHAR(240) NULL,

    source_scope TEXT NOT NULL DEFAULT 'dashboard_testing',
    is_official_truth BOOLEAN NOT NULL DEFAULT FALSE,

    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT member_schedule_events_member_key_check
    CHECK (member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')),

    CONSTRAINT member_schedule_events_priority_check
    CHECK (priority IN ('High', 'Medium', 'Low')),

    CONSTRAINT member_schedule_events_category_check
    CHECK (category IN ('Scheduled Task', 'Unscheduled Task')),

    CONSTRAINT member_schedule_events_source_scope_check
    CHECK (source_scope IN ('dashboard_testing', 'pilot', 'approved_live')),

    CONSTRAINT member_schedule_events_time_check
    CHECK (
        start_time IS NULL
        OR end_time IS NULL
        OR end_time > start_time
    )
);

CREATE INDEX IF NOT EXISTS idx_member_schedule_events_member_date
ON management_aios.member_schedule_events (member_key, event_date)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_member_schedule_events_scope
ON management_aios.member_schedule_events (source_scope, is_official_truth);
