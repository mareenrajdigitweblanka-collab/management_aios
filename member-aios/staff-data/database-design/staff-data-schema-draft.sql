-- Management AIOS — Staff Data Staging Schema (DRAFT — NOT APPLIED)
-- Draft only, 2026-07-13. This script has NOT been run against any database.
-- No CREATE statement in this file has been executed by this task. Applying
-- this schema is a separate, explicitly authorized step that must not happen
-- before member-aios/staff-data/handover/ records an approval to proceed.
--
-- Scope: dashboard-specific staging schema for member-aios/staff-data/ only.
-- This is NOT a company-wide HR system decision (see README.md §1). HR
-- (Mayurika) remains the authoritative source for staff records — this
-- schema stages a read import for dashboard display, it does not replace
-- HR's staff master.
--
-- Source basis: SRC-STAFF-001 (Digitweblanka Staffs Data - Overall Staffs.csv)
-- — see ../source-maps/hr-staff-source-map-draft.md and
-- ../data-maps/staff-field-map-draft.md for full field mapping and rationale.
--
-- Salary exclusion: this schema intentionally has NO salary, compensation,
-- or bonus column. CLAUDE.md §6 places salary data out of scope for this
-- AIOS at all times. Do not add one without a separate, explicit,
-- MD + HR-approved change.
--
-- Testing/demo truth boundary: mirrors the pattern already established in
-- database/member_schedule_events_schema.sql — source_scope and
-- is_official_truth default to non-official values. No application code
-- may set is_official_truth = TRUE or change source_scope away from
-- 'dashboard_staging' until HR (Mayurika) confirms the row set is a live,
-- HR-approved import.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.staff_data_staging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity (SRC-STAFF-001 fields — see data-maps/staff-field-map-draft.md)
    employee_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    location TEXT NULL,
    designation TEXT NULL,

    -- Department/Team — raw value as received from HR, plus normalized value.
    -- Canonical normalization for known variants (e.g. "Portfolio team" /
    -- "portfolio team" -> "PH") was confirmed by Mayurika for the source CSV
    -- (SRC-MAYU-CONF-003, SRC-MAYU-CONF-004, SRC-MAYU-CONF-005,
    -- SRC-MAYU-CONF-006). Not all variant groups are confirmed — see
    -- source-maps/hr-staff-source-map-draft.md §6.
    department_team_raw TEXT NULL,
    department_team_normalized TEXT NULL,

    -- Employment status is NOT confirmed at row level for SRC-STAFF-001 (it
    -- is a cumulative 2015-2026 historical roster, not a current-employees
    -- extract — see hr-staff-source-map-draft.md §4). This column exists so
    -- an explicit HR-confirmed status can be recorded per row; it must stay
    -- NULL until HR provides that confirmation, and must not be inferred.
    active_status TEXT NULL,

    -- Staging/import provenance
    source_scope TEXT NOT NULL DEFAULT 'dashboard_staging',
    is_official_truth BOOLEAN NOT NULL DEFAULT FALSE,
    imported_from TEXT NOT NULL DEFAULT 'SRC-STAFF-001',

    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT staff_data_staging_source_scope_check
    CHECK (source_scope IN ('dashboard_staging', 'pilot', 'approved_live')),

    CONSTRAINT staff_data_staging_active_status_check
    CHECK (active_status IS NULL OR active_status IN ('active', 'inactive', 'unconfirmed'))
);

CREATE INDEX IF NOT EXISTS idx_staff_data_staging_department
ON management_aios.staff_data_staging (department_team_normalized)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_data_staging_employee_id
ON management_aios.staff_data_staging (employee_id)
WHERE deleted_at IS NULL;

-- Explicitly excluded from this schema, and must not be added without a
-- separate MD + HR-approved change:
--   - salary / compensation / bonus columns (CLAUDE.md §6 — out of scope)
--   - disciplinary case detail columns (aggregate-only, CLAUDE.md §6)
--   - health / medical leave detail columns (process-level only, CLAUDE.md §6)
--   - PDPA raw document columns (Mayurika holds these; not stored here)

-- Do not run this file against any database as part of this task. See
-- ../../../validation/staff-data-source-storage-discovery-check-2026-07-13.md
-- item P — database changes MUST be NONE for this task.
