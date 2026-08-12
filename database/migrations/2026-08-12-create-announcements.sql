-- EXECUTED — 2026-08-12
--
-- Management AIOS — Create management_aios.announcements,
-- management_aios.announcement_mentions
-- REQ-ANN-001 — Announcement & Notification feature, Phase 1.
-- 2026-08-12. Additive only — does not drop, alter, or rewrite any
-- existing table. member_schedule_events, member_leave_records,
-- staff_dashboard_records, staff_review_summaries, and knowledge_documents
-- (+ its two child tables) are untouched by this migration (confirmed
-- unaffected by live read-only recount after execution).
--
-- ══════════════════════════════════════════════════════════════════════
-- EXECUTION STATUS: EXECUTED.
--
-- History: this file was originally authored and committed as a DRAFT —
-- NOT EXECUTED design artifact, with an explicit instruction that Claude
-- Code must not run it. It remained unexecuted through that stage. It was
-- later executed manually by the user/admin (human-authorized, outside
-- Claude Code, via a manual DB client), after the required schema
-- privilege was confirmed present for the executing role. This header is
-- updated after the fact to record that execution truthfully — the file
-- was never rewritten to imply it had always been executable, and no
-- historical sequence has been altered.
--
-- Target DB: order_management_copy. Target schema: management_aios.
--
-- Live read-only verification performed after execution (2026-08-12,
-- via read-only MCP queries against order_management_copy) confirmed:
--   - management_aios.announcements and management_aios.announcement_mentions
--     both exist (to_regclass resolved on both).
--   - Both tables contain 0 rows (no seed/business data introduced).
--   - Live columns, CHECK/PK/FK constraints, and indexes on both tables
--     match this file's definitions exactly (see
--     validation/announcement-notification-migration-execution-check-2026-08-12.md
--     for the full column/constraint/index comparison).
--   - pgcrypto was already installed and the management_aios schema
--     already existed prior to this migration, so the CREATE EXTENSION
--     and CREATE SCHEMA statements below were no-ops either way (both use
--     IF NOT EXISTS). Whether the manual execution run included these two
--     statements verbatim or a trimmed block that omitted them cannot be
--     distinguished from the resulting DB state alone (both paths are
--     idempotent to the same end state) — this is recorded as not
--     independently evidenced rather than asserted either way.
--   - Pre-existing tables (member_schedule_events, member_leave_records,
--     staff_dashboard_records, staff_review_summaries, knowledge_documents)
--     were confirmed still present and queryable after execution.
--
-- An unrelated object, management_aios.test_table (owner: temp_user, not
-- part of this migration or REQ-ANN-001), was observed to exist live —
-- see the validation asset above; it is not touched by this file.
-- ══════════════════════════════════════════════════════════════════════
--
-- Full design rationale: docs/2026-08-12_management-aios-announcement-
-- notification-technical-design.md
--
-- Idempotent: CREATE TABLE/INDEX use IF NOT EXISTS — safe to re-run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.announcements (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title             VARCHAR(200) NOT NULL,
    body              TEXT NOT NULL,

    status            VARCHAR(20) NOT NULL DEFAULT 'Draft',

    created_by        VARCHAR(80) NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Set exactly once, at Publish, by the ONE publish route — never
    -- updated again afterward (technical design §5: no route can ever
    -- target a Published id for mutation).
    published_at      TIMESTAMPTZ NULL,

    -- Draft-only soft delete (technical design §2) — a Published row is
    -- never soft-deleted; see the status-scoped CHECK below. No
    -- delete_reason column (Phase-1 simplification, unlike
    -- knowledge_documents — see requirement doc §8 and technical design
    -- §1); deleted_by alone identifies who deleted a Draft.
    deleted_at        TIMESTAMPTZ NULL,
    deleted_by        VARCHAR(80) NULL,

    CONSTRAINT announcements_status_check
        CHECK (status IN ('Draft', 'Published')),

    -- published_at populated iff status='Published' — same paired-CHECK
    -- shape as knowledge_documents_soft_delete_pairing_check elsewhere in
    -- this schema, applied here to the Draft/Publish boundary instead.
    CONSTRAINT announcements_published_at_pairing_check
        CHECK (
            (status = 'Draft' AND published_at IS NULL)
            OR (status = 'Published' AND published_at IS NOT NULL)
        ),

    -- A Published announcement can never be soft-deleted (business rule:
    -- Published is permanent — technical design §5). Deletion is only
    -- ever legal while status='Draft'.
    CONSTRAINT announcements_delete_only_while_draft_check
        CHECK (deleted_at IS NULL OR status = 'Draft'),

    -- deleted_at/deleted_by pairing — both set together or both NULL,
    -- same shape as every other soft-delete pair in this schema.
    CONSTRAINT announcements_soft_delete_pairing_check
        CHECK (
            (deleted_at IS NULL AND deleted_by IS NULL)
            OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
        ),

    CONSTRAINT announcements_title_nonblank_check
        CHECK (length(trim(title)) > 0),

    CONSTRAINT announcements_body_nonblank_check
        CHECK (length(trim(body)) > 0),

    CONSTRAINT announcements_body_max_length_check
        CHECK (length(body) <= 10000)
);

-- Published History — newest-published-first, excluding soft-deleted
-- (defense-in-depth; Published rows are never soft-deleted per the CHECK
-- above, but the partial index still scopes correctly either way).
CREATE INDEX IF NOT EXISTS idx_announcements_published
    ON management_aios.announcements (published_at DESC)
    WHERE status = 'Published' AND deleted_at IS NULL;

-- Creator's own Draft list lookup.
CREATE INDEX IF NOT EXISTS idx_announcements_creator_drafts
    ON management_aios.announcements (created_by, created_at DESC)
    WHERE status = 'Draft' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS management_aios.announcement_mentions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id        UUID NOT NULL REFERENCES management_aios.announcements(id),

    -- Plain VARCHAR — deliberately NOT constrained by a CHECK against a
    -- hard-coded member list (technical design §4 / requirement doc §6
    -- corrected architecture instruction). Membership is validated at the
    -- application layer against backend.config.VALID_MEMBER_KEYS on every
    -- write, so adding/removing a member never requires a schema change
    -- here.
    mentioned_member_key   VARCHAR(80) NOT NULL,

    -- Mention-selection time (Draft creation/edit, or added just before
    -- Publish) — NOT the notification time. See notified_at below.
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- NULL while the parent announcement is still Draft — a Draft mention
    -- row is a mention SELECTION only, never a notification. Set exactly
    -- once, at Publish, for every mention row that exists at that moment.
    -- Every notification-facing query (unread-count, mentions feed) must
    -- require notified_at IS NOT NULL so Draft mentions never appear in
    -- any member's bell (technical design §3 — mandatory architecture
    -- correction).
    notified_at            TIMESTAMPTZ NULL,

    -- NULL = unread; a timestamp = read. The sole read/unread signal —
    -- no separate boolean/enum column, matching member_leave_records'
    -- existing "nullable column is the lifecycle signal" convention.
    read_at                TIMESTAMPTZ NULL,

    -- A mentioned member cannot be marked read before they were ever
    -- notified, and read_at can never predate notified_at.
    CONSTRAINT announcement_mentions_read_requires_notified_check
        CHECK (read_at IS NULL OR notified_at IS NOT NULL),

    CONSTRAINT announcement_mentions_read_not_before_notified_check
        CHECK (read_at IS NULL OR notified_at IS NULL OR read_at >= notified_at)
);

-- No duplicate mention of the same member on the same announcement —
-- application-layer pre-check is the primary control; this is
-- defense-in-depth, same double-layer convention as
-- idx_knowledge_documents_active_source_url_normalized.
CREATE UNIQUE INDEX IF NOT EXISTS idx_announcement_mentions_unique_target
    ON management_aios.announcement_mentions (announcement_id, mentioned_member_key);

-- Per-announcement mention lookup (Draft edit reconciliation, Publish,
-- read-receipts view).
CREATE INDEX IF NOT EXISTS idx_announcement_mentions_announcement
    ON management_aios.announcement_mentions (announcement_id);

-- Bell feed / unread-count query: "this member's active notifications,
-- newest first" — scoped to notified (Published) rows only.
CREATE INDEX IF NOT EXISTS idx_announcement_mentions_member_notified
    ON management_aios.announcement_mentions (mentioned_member_key, notified_at DESC)
    WHERE notified_at IS NOT NULL;

-- Unread-count fast path specifically.
CREATE INDEX IF NOT EXISTS idx_announcement_mentions_member_unread
    ON management_aios.announcement_mentions (mentioned_member_key)
    WHERE notified_at IS NOT NULL AND read_at IS NULL;

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. Both tables exist with the expected column sets.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name IN ('announcements', 'announcement_mentions')
ORDER BY table_name, ordinal_position;

-- 2. All CHECK constraints exist on announcements (expect 6: status,
--    published_at pairing, delete-only-while-draft, soft-delete pairing,
--    title nonblank, body nonblank + max length is a 7th).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.announcements'::regclass
  AND contype = 'c';

-- 3. CHECK constraints on announcement_mentions (expect 2: read-requires-
--    notified, read-not-before-notified).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.announcement_mentions'::regclass
  AND contype = 'c';

-- 4. Both primary keys exist.
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
    'management_aios.announcements'::regclass,
    'management_aios.announcement_mentions'::regclass
)
  AND contype = 'p';

-- 5. The one foreign key exists.
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.announcement_mentions'::regclass
  AND contype = 'f';

-- 6. All indexes exist (expect 7 total: 2 on announcements + 4 on
--    announcement_mentions + the unique-target index), including the
--    primary-key indexes Postgres creates automatically.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'management_aios'
  AND tablename IN ('announcements', 'announcement_mentions');

-- 7. Row counts (expected 0 immediately after this migration — no seed
--    data is ever inserted by this file).
SELECT count(*) AS announcements_row_count FROM management_aios.announcements;
SELECT count(*) AS announcement_mentions_row_count FROM management_aios.announcement_mentions;

-- 8. Confirm existing tables are unaffected by this migration (run before
--    and after; counts must match).
SELECT count(*) AS existing_knowledge_documents_count FROM management_aios.knowledge_documents;
SELECT count(*) AS existing_staff_review_summaries_count FROM management_aios.staff_review_summaries;
SELECT count(*) AS existing_staff_dashboard_records_count FROM management_aios.staff_dashboard_records;
SELECT count(*) AS existing_member_leave_records_count FROM management_aios.member_leave_records;
SELECT count(*) AS existing_member_schedule_events_count FROM management_aios.member_schedule_events;

-- ── Rollback (if ever needed) ──────────────────────────────────────────────
-- (a) Deployment rollback (before this migration is ever applied): do not
--     apply this file; nothing to undo since nothing was run.
--
-- (b) Feature disablement (after real announcement data exists): unmount
--     the announcements router from backend/main.py and hide the frontend
--     Announcements workspace. All rows remain intact, simply unreachable
--     via API.
--
-- (c) Destructive schema rollback — must NEVER be the automatic/default
--     rollback once real announcement data exists; it permanently destroys
--     every announcement and its full mention/read-receipt history. Only
--     run with explicit export/backup and explicit business-owner sign-off:
--
-- BEGIN;
-- DROP TABLE IF EXISTS management_aios.announcement_mentions;
-- DROP TABLE IF EXISTS management_aios.announcements;
-- COMMIT;
