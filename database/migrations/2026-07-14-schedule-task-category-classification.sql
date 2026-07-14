-- Management AIOS — Schedule Task Category Classification Migration
-- 2026-07-14. DRAFT — NOT EXECUTED against any database by this task. Must
-- be run manually via the Neon SQL Editor (or another approved environment
-- with confirmed working direct Neon access) per
-- validation/schedule-task-classification-check-2026-07-14.md. Direct
-- PostgreSQL access from the builder's workstation has already been proven
-- unreliable at the SSL/protocol-handshake layer (see
-- handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md
-- §7 and validation/schedule-task-classification-check-2026-07-14.md) — do
-- not attempt to run this script from that workstation.
--
-- Purpose: migrate management_aios.member_schedule_events.category from
-- the four free-text placeholder values ('Sample Task', 'Sample Review',
-- 'Sample Follow-up', 'Sample Planning') and any other pre-existing value
-- to the permanent two-value classification system ('Scheduled Task' /
-- 'Unscheduled Task'), then lock the column down with a CHECK constraint
-- matching database/member_schedule_events_schema.sql's updated target
-- state.
--
-- Scope: the category column only. No row is inserted or deleted by this
-- script. Every other column (id, title, event_date, start_time, end_time,
-- notes, member_key, priority, created_at, deleted_at, source_scope,
-- is_official_truth) is left byte-identical. updated_at is deliberately
-- NOT touched — this is a technical classification migration, not a user
-- edit, so the existing per-row edit-history timestamp is preserved
-- exactly as it was.
--
-- Includes soft-deleted rows: the UPDATE below has no deleted_at filter —
-- it applies to every row in the table, active or soft-deleted, per the
-- confirmed business rule that ALL existing rows (including soft-deleted
-- ones) become 'Scheduled Task'.
--
-- HOW TO APPLY:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-14-schedule-task-category-classification.sql
-- or paste the whole file into the Neon SQL Editor and run it once.
--
-- Safely rerunnable: the UPDATE only touches rows where category is not
-- already 'Scheduled Task' (a no-op on any later run once migrated); the
-- ALTER COLUMN SET DEFAULT is idempotent; the constraint is dropped-if-
-- exists immediately before being re-added (matching the pattern already
-- used in database/migrations/2026-07-13-add-paraparan-member-key.sql), so
-- re-running this whole script after a first successful run is a no-op
-- that still passes every validation check below. No conflicting
-- previously-named category constraint exists on this table today (the
-- column has been unconstrained free TEXT since the table was created —
-- see database/member_schedule_events_schema.sql's prior revisions), so
-- the DROP IF EXISTS immediately below never removes a real, differently-
-- defined constraint; it only exists to make this script's own constraint
-- step idempotent against itself.

BEGIN;

-- 1. Pre-migration total row count (informational). Compare this against
--    the post-migration count produced later in this same transaction,
--    before deciding whether to COMMIT or ROLLBACK.
SELECT COUNT(*) AS pre_migration_total_rows
FROM management_aios.member_schedule_events;

-- 2. Update every row, including soft-deleted rows, to the target
--    category. IS DISTINCT FROM (not != ) correctly treats a NULL
--    category as distinct from 'Scheduled Task' too, so any null value is
--    also caught and migrated. No WHERE deleted_at filter — deliberate,
--    per the business rule that soft-deleted rows are migrated as well.
UPDATE management_aios.member_schedule_events
SET category = 'Scheduled Task'
WHERE category IS DISTINCT FROM 'Scheduled Task';

-- 3. Change the column default for future inserts. Defense-in-depth only
--    — the application's SQLAlchemy model (backend/models.py) and Pydantic
--    create schema (backend/schemas.py) are the primary enforcement path;
--    this keeps the database's own default consistent with them for any
--    insert that does not go through the API.
ALTER TABLE management_aios.member_schedule_events
    ALTER COLUMN category SET DEFAULT 'Scheduled Task';

-- 4/5. No existing conflicting named category constraint to remove (see
--    note above) — DROP IF EXISTS is a safe no-op on first run and makes
--    the ADD immediately below idempotent on any later re-run of this
--    script.
ALTER TABLE management_aios.member_schedule_events
    DROP CONSTRAINT IF EXISTS member_schedule_events_category_check;

ALTER TABLE management_aios.member_schedule_events
    ADD CONSTRAINT member_schedule_events_category_check
    CHECK (category IN ('Scheduled Task', 'Unscheduled Task'));

-- 6. Validation — every one of these must read exactly as annotated for
--    this migration to be considered successful. If any value looks
--    wrong, run ROLLBACK instead of COMMIT.

-- Must equal the pre_migration_total_rows value from step 1 exactly — no
-- row was inserted or deleted.
SELECT COUNT(*) AS post_migration_total_rows
FROM management_aios.member_schedule_events;

-- Must be 0.
SELECT COUNT(*) AS null_category_count
FROM management_aios.member_schedule_events
WHERE category IS NULL;

-- Must be 0 — every row's category is now one of the two allowed values.
SELECT COUNT(*) AS rows_outside_allowed_list
FROM management_aios.member_schedule_events
WHERE category NOT IN ('Scheduled Task', 'Unscheduled Task');

-- Must be 0 — every existing row (including soft-deleted) is now exactly
-- 'Scheduled Task'.
SELECT COUNT(*) AS rows_not_yet_scheduled_task
FROM management_aios.member_schedule_events
WHERE category IS DISTINCT FROM 'Scheduled Task';

COMMIT;

-- Post-COMMIT confirmation query (run separately, after COMMIT, to confirm
-- the constraint is live and correctly defined):
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'management_aios.member_schedule_events'::regclass
--   AND conname = 'member_schedule_events_category_check';

-- Rollback note: this migration is not mechanically reversible once
-- committed — the original category values ('Sample Task', 'Sample
-- Review', 'Sample Follow-up', 'Sample Planning', or any other
-- pre-existing value) are overwritten in place and not retained anywhere
-- in the database afterward. The only record of the pre-migration category
-- distribution is whatever aggregate evidence was captured and saved to
-- validation/schedule-task-classification-check-2026-07-14.md before this
-- script was run. If a rollback is ever required, it must be reconstructed
-- manually from that evidence file — there is no automated UPDATE for it
-- in this script.
