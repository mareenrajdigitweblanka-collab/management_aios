-- Management AIOS — Member Dashboard Schedule Events
-- Local implementation draft, 2026-07-09. Not applied to any live database
-- by this task. Apply manually against your own PostgreSQL instance.
--
-- Testing/demo truth boundary: source_scope and is_official_truth default to
-- non-official values. No application code in backend/ ever sets
-- is_official_truth = TRUE or changes source_scope away from
-- 'dashboard_testing'. See backend/README.md and
-- docs/member-dashboard-schedule-api-plan-2026-07-09.md for the full design
-- rationale.

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
    title VARCHAR(60) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Sample Task',
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
    CHECK (member_key IN ('mayurika', 'suman', 'arun', 'rajiv')),

    CONSTRAINT member_schedule_events_priority_check
    CHECK (priority IN ('High', 'Medium', 'Low')),

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
