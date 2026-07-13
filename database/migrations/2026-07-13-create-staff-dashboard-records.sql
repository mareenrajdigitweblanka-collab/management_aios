-- Management AIOS — Create management_aios.staff_dashboard_records
-- DRAFT — 2026-07-13. Review before applying. Not executed by this task
-- until explicitly reviewed and approved (see PHASE 3 of the Staff Data
-- database import task).
--
-- Purpose: a controlled, read-model PROJECTION of the HR-provided staff
-- roster for the Staff Data dashboard. HR remains the authoritative source
-- (CLAUDE.md §9.1) — this table does not replace, supersede, or feed back
-- into any HR system. It is populated only by
-- scripts/import_staff_dashboard_csv.py, reading the local, git-ignored
-- real normalized CSV (member-aios/staff-data/source/normalized/
-- hr-staff-dashboard.csv). No other write path exists for this table.
--
-- Scope: dashboard-specific, per this task's approved field list. This is
-- NOT a company-wide HR data model decision.
--
-- Excluded columns (never present here, by design — not filtered out at
-- query time, simply do not exist in this DDL): salary, home_address,
-- personal_email, personal_phone, contact_number, guardian_phone,
-- guardian_number.
--
-- Does not alter management_aios.member_schedule_events or any other
-- existing table.
--
-- Idempotent: CREATE TABLE/INDEX use IF NOT EXISTS — safe to re-run.

BEGIN;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.staff_dashboard_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Deterministic key — see "Uniqueness" note below. NOT employee_number
    -- alone: the HR source contains reused employee_number values across
    -- distinct people (5 identifiers across 11 rows, confirmed source
    -- defect — see member-aios/staff-data/evidence/
    -- hr-duplicate-employee-id-review-2026-07-13.md). Renumbering or
    -- deduplicating those rows is explicitly out of scope for this table;
    -- they are preserved and each gets its own source_record_key.
    source_record_key TEXT NOT NULL,

    -- Approved dashboard fields (see member-aios/staff-data/data-maps/
    -- staff-field-map-draft.md) — exactly the 16-column CSV shape.
    employee_number TEXT,
    epf_number TEXT,
    date_of_joining DATE,
    full_name TEXT,
    calling_name TEXT,
    location TEXT,
    staff_status TEXT,
    department_team TEXT,
    designation TEXT,
    cv_reference TEXT,
    nic TEXT,
    remarks TEXT,
    employment_stage TEXT,
    source_file TEXT,
    source_page INTEGER,
    source_row_reference TEXT,

    -- Import/provenance bookkeeping — not part of the dashboard-facing API
    -- contract (the API returns only the 16 fields above).
    source_hash TEXT NOT NULL,
    source_status TEXT NOT NULL DEFAULT 'imported',
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    imported_by TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT staff_dashboard_records_source_record_key_key
        UNIQUE (source_record_key),

    CONSTRAINT staff_dashboard_records_staff_status_check
        CHECK (staff_status IS NULL OR staff_status IN ('Active', 'Inactive')),

    -- employment_stage intentionally allows the literal '[VERIFY]' value —
    -- see member-aios/staff-data/source-maps/hr-staff-source-map-draft.md
    -- §6: no HR-approved derivation rule exists, so this AIOS must not
    -- invent or silently resolve it. All 310 rows are '[VERIFY]' as of
    -- 2026-07-13 — that is a correct, expected import result, not a defect.
    CONSTRAINT staff_dashboard_records_employment_stage_check
        CHECK (
            employment_stage IS NULL
            OR employment_stage IN ('Permanent', 'Probation', 'training_7_day', '[VERIFY]')
        ),

    CONSTRAINT staff_dashboard_records_source_status_check
        CHECK (source_status IN ('imported', 'superseded'))
);

CREATE INDEX IF NOT EXISTS idx_staff_dashboard_records_department_team
    ON management_aios.staff_dashboard_records (department_team)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_staff_dashboard_records_staff_status
    ON management_aios.staff_dashboard_records (staff_status)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_staff_dashboard_records_employment_stage
    ON management_aios.staff_dashboard_records (employment_stage)
    WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_staff_dashboard_records_employee_number
    ON management_aios.staff_dashboard_records (employee_number);

CREATE INDEX IF NOT EXISTS idx_staff_dashboard_records_full_name
    ON management_aios.staff_dashboard_records (full_name);

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. Table exists with the expected column set.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_dashboard_records'
ORDER BY ordinal_position;

-- 2. Unique constraint on source_record_key exists.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.staff_dashboard_records'::regclass
  AND contype = 'u';

-- 3. Row count (expected 0 immediately after this migration — the import
--    script populates the table as a separate, later step).
SELECT count(*) AS row_count FROM management_aios.staff_dashboard_records;

-- 4. Confirm no excluded-field column was accidentally created.
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_dashboard_records'
  AND column_name IN (
      'salary', 'home_address', 'personal_email', 'personal_phone',
      'contact_number', 'guardian_phone', 'guardian_number'
  );
-- Expected: 0 rows.

-- ── Rollback (if ever needed — only safe before this table holds data
--    anyone depends on; this drops the table entirely) ──────────────────
--
-- BEGIN;
-- DROP TABLE IF EXISTS management_aios.staff_dashboard_records;
-- COMMIT;
