-- Management AIOS — Task Outcome Column Migration
-- 2026-07-24. DRAFT — NOT EXECUTED against any database by this task.
-- Confirmed not yet applied to the live production database as of this
-- revision (verified directly via the Neon SQL Editor against
-- org "mareenraj" / project "AIOS" / branch "production" / database
-- "schedule": management_aios.member_schedule_events currently has 17
-- columns, none named outcome*, and neither CHECK constraint below exists
-- there yet). Apply manually via the Neon SQL Editor (or another approved
-- environment with confirmed working direct Neon access) — see the note in
-- database/migrations/2026-07-14-schedule-task-category-classification.sql
-- about direct PostgreSQL access being unreliable from the builder's
-- workstation. Recommend applying to a Neon branch first and validating
-- there before applying to production.
--
-- Revision history:
--   2026-07-24 (CONFIRMED UNTOUCHED-TASK OUTCOME): original draft — added
--     `outcome` only (nullable Completed/Uncompleted/NULL).
--   2026-07-24, same day (FINAL CONFIRMED REASON-TRANSITION RULE): adds
--     `outcome_reason`, `outcome_updated_at`, `outcome_updated_by`, and the
--     outcome/outcome_reason pairing CHECK constraint. Edited in place (not
--     a second migration file) because the original draft had not yet been
--     executed anywhere — there is no partially-applied state to reconcile.
--   2026-07-24, same day (closure review pass — FINAL BUSINESS RULES): no
--     column/constraint shape change — the "actions only on the task's own
--     date" rule and the date-change/delete locks are enforced entirely in
--     backend/routers/member_schedules.py against the columns this
--     migration already adds, not by any new DDL. The pairing CHECK
--     constraint's trim/length functions were rewritten from the
--     Postgres-specific btrim()/char_length() spellings to the portable
--     trim()/length() spellings (both valid on Postgres; this also lets
--     backend/tests/test_task_outcome_endpoint.py exercise the identical
--     constraint against an ephemeral SQLite database) — confirmed
--     equivalent on Postgres, not a behavior change. The most recent
--     direct confirmation that this migration has not been applied to the
--     production branch (17 columns, neither outcome CHECK constraint
--     present) is the Neon SQL Editor check from the immediately preceding
--     review turn in this same engagement, not re-run again for this
--     revision — see the closure-review handover doc for the exact
--     evidence chain and its limits (no independent check was possible
--     this turn; only production was ever directly queried, never a
--     separate local/dev/staging environment). Treated as still safe to
--     edit this file in place rather than fork a second migration, on the
--     balance of that evidence plus no CI/migration-runner existing in
--     this repo — see the handover doc for the full reasoning and its
--     residual uncertainty.
--
-- Purpose: add the full task-outcome column set to
-- management_aios.member_schedule_events:
--   - outcome            TEXT NULL — 'Completed' / 'Uncompleted' / NULL.
--     NULL means no outcome recorded yet. The 'Pending'/'No response'
--     display states are never stored — derived at read time from
--     `outcome` + `event_date` (backend/time_utils.py derive_task_outcome).
--   - outcome_reason      VARCHAR(250) NULL — required (trimmed, nonblank,
--     <=250 chars) exactly when outcome='Uncompleted'; NULL in every other
--     case, enforced by the pairing CHECK constraint below. A transition to
--     Completed always clears this to NULL in the same write — nothing
--     retains a prior reason as hidden text, and no API response ever
--     returns a cleared reason.
--   - outcome_updated_at  TIMESTAMPTZ NULL — authoritative server-side UTC
--     instant of the last outcome write. Deliberately separate from the
--     pre-existing updated_at column, which stays reserved for
--     title/date/priority/time/notes content edits.
--   - outcome_updated_by  TEXT NULL — canonical member_key (from the URL
--     path, never client-supplied) that made the last outcome write.
--     Deliberately separate from the pre-existing updated_by column, same
--     reasoning as outcome_updated_at.
-- No scheduled/midnight database job is created by this migration or
-- anywhere else in this codebase — Pending/No response derivation happens
-- purely on read, never via a write.
--
-- Scope: adds four columns and two CHECK constraints. No existing row is
-- otherwise modified — every existing row gets outcome = NULL,
-- outcome_reason = NULL, outcome_updated_at = NULL, outcome_updated_by =
-- NULL, all of which satisfy both CHECK constraints trivially (the
-- "outcome IS NULL AND outcome_reason IS NULL" branch).
--
-- HOW TO APPLY:
--   psql "$DATABASE_URL" -f database/migrations/2026-07-24-add-task-outcome-column.sql
-- or paste the whole file into the Neon SQL Editor and run it once.
--
-- Safely rerunnable: every ADD COLUMN uses IF NOT EXISTS; both constraints
-- are dropped-if-exists immediately before being re-added, matching the
-- pattern used in
-- database/migrations/2026-07-14-schedule-task-category-classification.sql.
--
-- Deploy-order warning (from the read-only gap review that preceded this
-- revision): the backend ORM model (backend/models.py) already declares all
-- four columns. If backend application code is deployed before this
-- migration runs, every query against member_schedule_events — not just the
-- new outcome endpoint — will reference columns that do not yet exist on
-- the live table and will fail. Apply this migration BEFORE deploying the
-- updated backend; deploy the updated frontend last.

BEGIN;

-- 1. Pre-migration total row count (informational). Compare this against
--    the post-migration count produced later in this same transaction,
--    before deciding whether to COMMIT or ROLLBACK.
SELECT COUNT(*) AS pre_migration_total_rows
FROM management_aios.member_schedule_events;

-- 2. Add the four columns. Every existing row (including soft-deleted
--    rows) gets NULL in all four — no data to backfill, since none of
--    these columns has ever existed before.
ALTER TABLE management_aios.member_schedule_events
    ADD COLUMN IF NOT EXISTS outcome TEXT NULL;

ALTER TABLE management_aios.member_schedule_events
    ADD COLUMN IF NOT EXISTS outcome_reason VARCHAR(250) NULL;

ALTER TABLE management_aios.member_schedule_events
    ADD COLUMN IF NOT EXISTS outcome_updated_at TIMESTAMPTZ NULL;

ALTER TABLE management_aios.member_schedule_events
    ADD COLUMN IF NOT EXISTS outcome_updated_by TEXT NULL;

-- 3/4. No existing conflicting named outcome constraints to remove — DROP
--    IF EXISTS is a safe no-op on first run and makes the ADD immediately
--    below idempotent on any later re-run of this script.
ALTER TABLE management_aios.member_schedule_events
    DROP CONSTRAINT IF EXISTS member_schedule_events_outcome_check;

ALTER TABLE management_aios.member_schedule_events
    ADD CONSTRAINT member_schedule_events_outcome_check
    CHECK (outcome IS NULL OR outcome IN ('Completed', 'Uncompleted'));

ALTER TABLE management_aios.member_schedule_events
    DROP CONSTRAINT IF EXISTS member_schedule_events_outcome_reason_pairing_check;

ALTER TABLE management_aios.member_schedule_events
    ADD CONSTRAINT member_schedule_events_outcome_reason_pairing_check
    CHECK (
        (outcome = 'Uncompleted' AND outcome_reason IS NOT NULL
            AND trim(outcome_reason) <> ''
            AND length(trim(outcome_reason)) <= 250)
        OR (outcome = 'Completed' AND outcome_reason IS NULL)
        OR (outcome IS NULL AND outcome_reason IS NULL)
    );

-- 5. Validation — every one of these must read exactly as annotated for
--    this migration to be considered successful. If any value looks
--    wrong, run ROLLBACK instead of COMMIT.

-- Must equal the pre_migration_total_rows value from step 1 exactly — no
-- row was inserted or deleted.
SELECT COUNT(*) AS post_migration_total_rows
FROM management_aios.member_schedule_events;

-- Must be 0 — every outcome value (including every pre-existing row's
-- untouched NULL) is either NULL or one of the two allowed values.
SELECT COUNT(*) AS rows_outside_allowed_outcome
FROM management_aios.member_schedule_events
WHERE outcome IS NOT NULL AND outcome NOT IN ('Completed', 'Uncompleted');

-- Must be 0 — every row satisfies the outcome/outcome_reason pairing rule.
-- Every pre-existing row has outcome=NULL and outcome_reason=NULL, which
-- satisfies the third branch trivially.
SELECT COUNT(*) AS rows_violating_reason_pairing
FROM management_aios.member_schedule_events
WHERE NOT (
    (outcome = 'Uncompleted' AND outcome_reason IS NOT NULL
        AND trim(outcome_reason) <> ''
        AND length(trim(outcome_reason)) <= 250)
    OR (outcome = 'Completed' AND outcome_reason IS NULL)
    OR (outcome IS NULL AND outcome_reason IS NULL)
);

COMMIT;

-- Post-COMMIT confirmation query (run separately, after COMMIT, to confirm
-- both constraints are live and correctly defined):
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'management_aios.member_schedule_events'::regclass
--   AND conname IN (
--       'member_schedule_events_outcome_check',
--       'member_schedule_events_outcome_reason_pairing_check'
--   );
--
-- Rollback note: this migration only adds new, previously-nonexistent
-- columns and constraints — it does not overwrite or remove any existing
-- data. If a rollback is ever required:
--   ALTER TABLE management_aios.member_schedule_events
--       DROP CONSTRAINT IF EXISTS member_schedule_events_outcome_reason_pairing_check;
--   ALTER TABLE management_aios.member_schedule_events
--       DROP CONSTRAINT IF EXISTS member_schedule_events_outcome_check;
--   ALTER TABLE management_aios.member_schedule_events
--       DROP COLUMN IF EXISTS outcome_updated_by;
--   ALTER TABLE management_aios.member_schedule_events
--       DROP COLUMN IF EXISTS outcome_updated_at;
--   ALTER TABLE management_aios.member_schedule_events
--       DROP COLUMN IF EXISTS outcome_reason;
--   ALTER TABLE management_aios.member_schedule_events
--       DROP COLUMN IF EXISTS outcome;
