-- Management AIOS — Create management_aios.staff_review_summaries
-- REQ-CAL-REV-001 — Reviewer-Owned Staff Review Meeting Summaries
-- 2026-08-03. Additive only — does not drop, alter, or rewrite any existing
-- table. management_aios.staff_dashboard_records, member_schedule_events,
-- and member_leave_records are untouched by this migration.
--
-- Ownership boundary: every row is privately owned by the reviewer
-- (reviewer_member_key) who created it — never by the reviewed staff
-- member. Only the owning reviewer may create/read/update/soft-delete a
-- given row (enforced at the API layer, backend/routers/
-- staff_review_summaries.py); no admin/coordinator override exists.
--
-- Approved source documents (treated as the implementation contract):
--   docs/2026-08-03_calendar-review-summaries-requirement.md
--   docs/2026-08-03_calendar-review-summaries-technical-design.md
--   validation/calendar-review-summaries-technical-design-check-2026-08-03.md
--
-- Idempotent: CREATE TABLE/INDEX use IF NOT EXISTS — safe to re-run.
--
-- Execution note (2026-08-03): this migration is authored and reviewed as
-- part of REQ-CAL-REV-001 implementation but has NOT been executed against
-- the live Management AIOS PostgreSQL database in this session. Apply this
-- file manually against the correct Neon/management_aios instance —
-- after management_aios.staff_dashboard_records already exists (this
-- table's foreign key depends on it) — before this feature is considered
-- deployed.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.staff_review_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reviewer_member_key TEXT NOT NULL,
    reviewed_staff_id UUID NOT NULL REFERENCES management_aios.staff_dashboard_records(id),

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

-- Primary reviewer-owned history query: filter by reviewer + reviewed
-- staff, order meeting_date DESC then created_at DESC, active rows only.
CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_staff_date
    ON management_aios.staff_review_summaries (reviewer_member_key, reviewed_staff_id, meeting_date DESC, created_at DESC)
    WHERE deleted_at IS NULL;

-- Reviewer-owned detail/update/delete lookup by id.
CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_id
    ON management_aios.staff_review_summaries (reviewer_member_key, id)
    WHERE deleted_at IS NULL;

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. Table exists with the expected column set.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_review_summaries'
ORDER BY ordinal_position;

-- 2. All CHECK constraints exist.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.staff_review_summaries'::regclass
  AND contype = 'c';

-- 3. The foreign key to staff_dashboard_records exists.
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.staff_review_summaries'::regclass
  AND contype = 'f';

-- 4. Both indexes exist.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'management_aios'
  AND tablename = 'staff_review_summaries';

-- 5. Row count (expected 0 immediately after this migration).
SELECT count(*) AS row_count FROM management_aios.staff_review_summaries;

-- 6. Confirm staff_dashboard_records row count is unaffected by this
--    migration (run before and after; the two counts must match).
SELECT count(*) AS existing_staff_dashboard_record_count
FROM management_aios.staff_dashboard_records;

-- ── Rollback (if ever needed) ──────────────────────────────────────────────
-- Three distinct rollback concepts — do not conflate them:
--
-- (a) Deployment rollback (before this migration is ever applied): do not
--     apply this file; nothing to undo since nothing was run.
--
-- (b) Feature disablement (after real reviewer data exists): unmount
--     backend/routers/staff_review_summaries.py from backend/main.py and
--     hide the frontend Review Summaries workspace. All reviewer rows
--     remain intact in the table, simply unreachable via API — this is
--     the correct action once real reviewer data exists and the feature
--     needs to be paused.
--
-- (c) Destructive schema rollback — must NEVER be the automatic/default
--     rollback once real reviewer data exists; it permanently destroys
--     every Management Team member's private review history. Only run
--     with explicit export/backup and explicit business-owner sign-off:
--
-- BEGIN;
-- DROP TABLE IF EXISTS management_aios.staff_review_summaries;
-- COMMIT;
