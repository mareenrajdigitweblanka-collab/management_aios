-- Management AIOS — Add 'paraparan' to member_schedule_events.member_key
-- DRAFT ONLY — 2026-07-13. NOT EXECUTED against any database by this task.
--
-- Purpose: the existing management_aios.member_schedule_events table (Neon,
-- production) has a CHECK constraint restricting member_key to
-- ('mayurika', 'suman', 'arun', 'rajiv'). The Paraparan tab's schedule
-- calendar reuses the existing generic member-schedule API/routes/table
-- (per member-aios/staff-data/... and validation/paraparan-member-schedule-
-- integration-check-2026-07-13.md) — no new table, no new routes. This
-- migration is the one required database-level change to let member_key =
-- 'paraparan' pass PostgreSQL's own CHECK constraint; without it, any
-- create/update request for Paraparan will be accepted by the API's
-- Python-level validation (backend/config.py VALID_MEMBER_KEYS) and then
-- rejected by PostgreSQL with a check-constraint violation.
--
-- This does not change any other constraint, column, or row. It does not
-- touch source_scope/is_official_truth defaults or any existing member's
-- data. It is additive only — 'mayurika', 'suman', 'arun', 'rajiv' remain
-- valid.
--
-- HOW TO APPLY (only after explicit human authorization — this task does
-- not run this):
--   psql "$DATABASE_URL" -f database/migrations/2026-07-13-add-paraparan-member-key.sql
-- or paste into the Neon SQL Editor and run once. Idempotent: safe to
-- re-run (DROP CONSTRAINT IF EXISTS before re-adding).

BEGIN;

ALTER TABLE management_aios.member_schedule_events
    DROP CONSTRAINT IF EXISTS member_schedule_events_member_key_check;

ALTER TABLE management_aios.member_schedule_events
    ADD CONSTRAINT member_schedule_events_member_key_check
    CHECK (member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan'));

COMMIT;

-- Validation query — run after COMMIT to confirm the new constraint
-- definition and that its name is unchanged:
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.member_schedule_events'::regclass
  AND conname = 'member_schedule_events_member_key_check';

-- Rollback (if ever needed — would fail if any 'paraparan' rows already
-- exist, since they would violate the narrower constraint being restored):
--
-- BEGIN;
-- ALTER TABLE management_aios.member_schedule_events
--     DROP CONSTRAINT IF EXISTS member_schedule_events_member_key_check;
-- ALTER TABLE management_aios.member_schedule_events
--     ADD CONSTRAINT member_schedule_events_member_key_check
--     CHECK (member_key IN ('mayurika', 'suman', 'arun', 'rajiv'));
-- COMMIT;
