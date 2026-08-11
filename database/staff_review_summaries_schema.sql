-- Management AIOS — Staff Review Summaries (REQ-CAL-REV-001)
-- Companion "fresh install" schema file, matching the convention set by
-- database/member_leave_records_schema.sql. Mirrors backend/models.py
-- (StaffReviewSummary) exactly. Uses CREATE TABLE IF NOT EXISTS, so
-- re-running this against an already-existing table does NOT alter its
-- constraints — for an existing deployment, apply
-- database/migrations/2026-08-03-create-staff-review-summaries.sql instead.
--
-- Depends on management_aios.staff_dashboard_records already existing
-- (reviewed_staff_id's foreign key target) — apply
-- database/migrations/2026-08-11-mirror-staff-dashboard-records-from-
-- ledsone.sql first (staff_dashboard_records.id is INTEGER as of
-- 2026-08-11 — an exact mirror of employee_management.staff.id on
-- Ledsone, not a generated UUID; reviewed_staff_id below matches that
-- type change).
--
-- Ownership boundary: every row is privately owned by the reviewer
-- (reviewer_member_key) who created it — never by the reviewed staff
-- member. No admin/coordinator override exists at the schema or API layer.
--
-- Does not alter management_aios.staff_dashboard_records,
-- member_schedule_events, or member_leave_records.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.staff_review_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reviewer_member_key TEXT NOT NULL,
    reviewed_staff_id INTEGER NOT NULL REFERENCES management_aios.staff_dashboard_records(id),

    -- Durable lookup key, independent of reviewed_staff_id's UUID — added
    -- 2026-08-11 (database/migrations/2026-08-11-add-reviewed-staff-
    -- employee-number-to-staff-review-summaries.sql) so re-sourcing
    -- staff_dashboard_records (new UUIDs per row) can remap
    -- reviewed_staff_id without orphaning existing review rows. Snapshotted
    -- once per row, at backfill/creation time — not re-synced automatically
    -- if a person's employee_number ever changes upstream.
    reviewed_staff_employee_number TEXT NULL,

    meeting_date DATE NOT NULL,
    summary_text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT staff_review_summaries_reviewer_member_key_check
    CHECK (reviewer_member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')),

    CONSTRAINT staff_review_summaries_summary_text_nonblank_check
    CHECK (length(trim(summary_text)) > 0),

    CONSTRAINT staff_review_summaries_summary_text_max_length_check
    CHECK (length(summary_text) <= 10000)
);

-- Primary reviewer-owned history query (reviewer + reviewed staff, active
-- rows only, ordered meeting_date DESC then created_at DESC).
CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_staff_date
ON management_aios.staff_review_summaries (reviewer_member_key, reviewed_staff_id, meeting_date DESC, created_at DESC)
WHERE deleted_at IS NULL;

-- Reviewer-owned detail/update/delete lookup by id.
CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_id
ON management_aios.staff_review_summaries (reviewer_member_key, id)
WHERE deleted_at IS NULL;
