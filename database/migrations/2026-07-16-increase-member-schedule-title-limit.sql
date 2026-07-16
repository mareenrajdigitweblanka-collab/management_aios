-- Management AIOS — Increase management_aios.member_schedule_events.title limit
-- 2026-07-16. Widens the Schedule Item title column from VARCHAR(60) to
-- VARCHAR(120). Additive and non-destructive:
--   - Does not drop the table.
--   - Does not modify any existing stored title value — widening a VARCHAR
--     length constraint in PostgreSQL is a metadata-only operation (no table
--     rewrite, no data touched), since every existing value is already
--     <= 60 characters and therefore already <= 120.
--   - Does not touch category, priority, notes, member_key, dates/times,
--     source_scope, is_official_truth, created_by/updated_by, timestamps, or
--     soft-delete (deleted_at) columns/constraints.
--   - Does not touch management_aios.staff_dashboard_records or
--     management_aios.member_leave_records.
--
-- Idempotent: ALTER COLUMN ... TYPE VARCHAR(120) is safe to re-run even if
-- the column has already been widened (PostgreSQL allows altering a column
-- to the type it already has; no error, no additional effect).
--
-- Execution note (2026-07-16): prepared as part of the Schedule Item title
-- limit increase to 120 characters. Apply against the correct Management
-- AIOS Neon database only — confirm management_aios schema and
-- management_aios.member_schedule_events exist first (see
-- evidence/database/ for this feature's established pre-check convention).

BEGIN;

ALTER TABLE management_aios.member_schedule_events
    ALTER COLUMN title TYPE VARCHAR(120);

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. Column now reports a max length of 120.
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'member_schedule_events'
  AND column_name = 'title';

-- 2. Row count unchanged by this migration (compare to the pre-migration
--    count; the two must match — no row was inserted, updated, or deleted).
SELECT count(*) AS existing_schedule_event_count
FROM management_aios.member_schedule_events;

-- 3. No existing title was truncated (every stored title's length is still
--    exactly what it was before — this migration widens the limit, it never
--    shortens data). Expected: 0 rows (nothing over 120 chars could have
--    existed under the old 60-char limit, so this is a sanity check, not an
--    expected finding).
SELECT id, length(title) AS title_length
FROM management_aios.member_schedule_events
WHERE length(title) > 120;

-- ── Rollback (if ever needed — narrows the column back to 60; only safe if
--    no stored title exceeds 60 characters, since narrowing a VARCHAR to a
--    shorter length fails if any existing value would be truncated) ──────
--
-- BEGIN;
-- ALTER TABLE management_aios.member_schedule_events
--     ALTER COLUMN title TYPE VARCHAR(60);
-- COMMIT;
