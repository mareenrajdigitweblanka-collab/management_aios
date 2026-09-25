-- Management AIOS — Create management_aios.staff_review_summary_attachments
-- REQ-CAL-REV-ATTACH-001 — Review Summary Attachments.
-- 2026-09-23; revised 2026-09-24 (no foreign key — see "No foreign key" below);
-- finalized 2026-09-25 (four extra CHECK constraints — see "Revision 2026-09-25").
-- Additive only — does not drop, alter, or rewrite any existing table.
-- management_aios.staff_review_summaries, staff_dashboard_records,
-- member_schedule_events, member_leave_records, knowledge_documents, and
-- announcements are all untouched by this migration.
--
-- Storage model: file BYTES are never stored in this table or any other
-- database row — only the third-party storage provider's own reference
-- (storage_public_id, storage_resource_type) plus display/validation
-- metadata (original_filename, content_type, attachment_type,
-- file_size_bytes). The backend (backend/attachment_storage.py) is the only
-- code path that ever talks to the storage provider, and every download
-- route re-checks the same authorization rule the parent summary already
-- enforces (backend/routers/staff_review_summaries.py) before streaming
-- bytes back — never a raw, unauthenticated provider URL handed to the
-- browser. No Cloudinary secret is stored anywhere in the database.
--
-- No foreign key (approved design, 2026-09-24): summary_id deliberately has
-- NO REFERENCES clause — the application role does not hold REFERENCES on
-- management_aios.staff_review_summaries and none is requested. Integrity
-- is enforced by the application instead, and is checkable at any time:
--   * a link is only ever written by create_staff_review_summary, in the
--     same transaction that inserts the summary row (so the summary exists
--     by construction), after _claim_pending_attachments has validated that
--     every attachment id exists, is still pending, and was uploaded by the
--     acting reviewer;
--   * every read (list/detail/download/export) goes through the active
--     summary lookup (deleted_at IS NULL) and scopes the attachment by
--     (id, summary_id);
--   * summaries are never hard-deleted (the delete route always answers 409)
--     and there is no attachment-delete route;
--   * the read-only orphan query at the end of this file (and
--     scripts/check_review_summary_attachment_orphans.py, and the transfer
--     tool's own post-insert check) must return zero rows.
--
-- Revision 2026-09-25 — differences from the 2026-09-24 draft (all additive,
-- none references another table):
--   * CHECK storage_provider = 'cloudinary' — the only provider the backend
--     implements; a typo or future provider must arrive with a migration.
--   * CHECK length(trim(original_filename)) > 0, length(trim(content_type)) > 0
--     and length(trim(storage_public_id)) > 0 — with no parent table to lean
--     on, a blank filename/type/asset id would be an undownloadable row the
--     database could not otherwise reject.
--   * The structure verifier below now expects those four constraints too,
--     so a pre-existing table missing them aborts instead of being accepted.
--   * Column list, primary key, defaults, the three indexes, nullable
--     summary_id and the absence of any foreign key are UNCHANGED.
--
-- Two-phase, atomicity-preserving upload flow (so a failed upload can never
-- produce a "successful" summary with missing files):
--   1. POST .../attachments (multipart) uploads ONE file to the storage
--      provider and, only once that upload durably succeeds, inserts ONE
--      row here with summary_id = NULL ("pending" — not yet attached to any
--      summary). If the provider upload fails, no row is ever inserted.
--   2. POST /api/staff-review-summaries (create) accepts a list of pending
--      attachment ids and, in the SAME transaction as the new
--      staff_review_summaries row, validates each one (exists, summary_id
--      IS NULL, uploaded_by = the acting reviewer) and re-points its
--      summary_id to the new record. If any referenced id is invalid, the
--      whole create request fails and NOTHING is written.
-- A row that stays summary_id = NULL (upload started, summary create never
-- completed) is an orphaned partial upload; scripts/cleanup_pending_review_
-- summary_attachments.py removes those (never a linked row).
--
-- Safe to re-run, and it never hides a mismatch: the whole script is one
-- transaction. It (1) checks that this really is the right database
-- (management_aios.staff_review_summaries exists with a uuid id), (2)
-- creates the table only if it is absent, then (3) ALWAYS verifies the
-- table's columns/types/nullability, primary key, the eight CHECK
-- constraints, and the three indexes against the definition below —
-- including a table that already existed — and RAISES EXCEPTION, rolling
-- everything back, on any difference. (CREATE ... IF NOT EXISTS alone would
-- silently accept an incompatible pre-existing table.) Run it with
-- psql -v ON_ERROR_STOP=1, or with scripts/apply_review_summary_attachments_
-- migration.py, which stops on the first error.
--
-- Needs only CREATE on schema management_aios. gen_random_uuid() is
-- built in since PostgreSQL 13, so no extension is created.

BEGIN;

-- (1) Right database?
DO $$
DECLARE
    parent_id_type text;
BEGIN
    IF to_regclass('management_aios.staff_review_summaries') IS NULL THEN
        RAISE EXCEPTION 'attachment migration aborted: management_aios.staff_review_summaries does not exist in database "%" — wrong database?', current_database();
    END IF;
    SELECT format_type(a.atttypid, a.atttypmod) INTO parent_id_type
      FROM pg_attribute a
     WHERE a.attrelid = 'management_aios.staff_review_summaries'::regclass
       AND a.attname = 'id' AND NOT a.attisdropped;
    IF parent_id_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION 'attachment migration aborted: staff_review_summaries.id is % (expected uuid)', parent_id_type;
    END IF;
END $$;

-- (2) Create only if absent.
DO $$
BEGIN
    IF to_regclass('management_aios.staff_review_summary_attachments') IS NULL THEN
        CREATE TABLE management_aios.staff_review_summary_attachments (
            id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            -- NULL while "pending" (uploaded, not yet attached to a summary).
            -- Set exactly once, atomically, by the summary-create transaction;
            -- never changed after that. NO foreign key — see the header.
            summary_id              UUID NULL,

            -- The member who uploaded the file — always server-derived from the
            -- verified Calendar token, never client-supplied.
            uploaded_by             VARCHAR(80)  NOT NULL,

            -- Sanitized but human-readable — the display and download-filename
            -- source. Never used to derive the storage key.
            original_filename       VARCHAR(255) NOT NULL,
            content_type            VARCHAR(120) NOT NULL,

            -- Coarse category used by validation and export rendering rules.
            attachment_type         VARCHAR(20)  NOT NULL,

            file_size_bytes         INTEGER      NOT NULL,

            -- Provider abstraction column; only 'cloudinary' is implemented.
            storage_provider        VARCHAR(20)  NOT NULL DEFAULT 'cloudinary',
            -- Cloudinary's own asset identifier (server-generated UUID key).
            storage_public_id       VARCHAR(255) NOT NULL,
            -- Cloudinary's resource_type taxonomy ('image', 'video', 'raw').
            storage_resource_type   VARCHAR(20)  NOT NULL,

            created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

            CONSTRAINT staff_review_summary_attachments_uploaded_by_check
                CHECK (uploaded_by IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')),
            CONSTRAINT staff_review_summary_attachments_attachment_type_check
                CHECK (attachment_type IN ('audio', 'word', 'excel', 'image', 'pdf')),
            CONSTRAINT staff_review_summary_attachments_file_size_positive_check
                CHECK (file_size_bytes > 0),
            CONSTRAINT staff_review_summary_attachments_storage_resource_type_check
                CHECK (storage_resource_type IN ('image', 'video', 'raw')),
            CONSTRAINT staff_review_summary_attachments_storage_provider_check
                CHECK (storage_provider = 'cloudinary'),
            CONSTRAINT staff_review_summary_attachments_filename_nonblank_check
                CHECK (length(trim(original_filename)) > 0),
            CONSTRAINT staff_review_summary_attachments_content_type_nonblank_check
                CHECK (length(trim(content_type)) > 0),
            CONSTRAINT staff_review_summary_attachments_public_id_nonblank_check
                CHECK (length(trim(storage_public_id)) > 0)
        );
    END IF;
END $$;

-- (3a) Verify the table's structure (new OR pre-existing) BEFORE touching it further:
-- columns, primary key, CHECK constraints. An incompatible table fails here, clearly.
DO $$
DECLARE
    rel        regclass := 'management_aios.staff_review_summary_attachments'::regclass;
    problems   text := '';
    r          record;
BEGIN
    -- columns: name, exact type, nullability — in both directions
    FOR r IN
        WITH expected(col, typ, nn) AS (VALUES
            ('id', 'uuid', true),
            ('summary_id', 'uuid', false),
            ('uploaded_by', 'character varying(80)', true),
            ('original_filename', 'character varying(255)', true),
            ('content_type', 'character varying(120)', true),
            ('attachment_type', 'character varying(20)', true),
            ('file_size_bytes', 'integer', true),
            ('storage_provider', 'character varying(20)', true),
            ('storage_public_id', 'character varying(255)', true),
            ('storage_resource_type', 'character varying(20)', true),
            ('created_at', 'timestamp with time zone', true)
        ),
        actual AS (
            SELECT a.attname::text AS col, format_type(a.atttypid, a.atttypmod) AS typ, a.attnotnull AS nn
              FROM pg_attribute a
             WHERE a.attrelid = rel AND a.attnum > 0 AND NOT a.attisdropped
        )
        SELECT coalesce(e.col, x.col) AS col, e.typ AS want_typ, x.typ AS have_typ, e.nn AS want_nn, x.nn AS have_nn
          FROM expected e FULL JOIN actual x ON x.col = e.col
         WHERE e.col IS NULL OR x.col IS NULL OR e.typ <> x.typ OR e.nn <> x.nn
    LOOP
        problems := problems || format(E'\n  column %s: expected %s notnull=%s, found %s notnull=%s',
                                       r.col, r.want_typ, r.want_nn, r.have_typ, r.have_nn);
    END LOOP;

    -- primary key on (id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
         WHERE c.conrelid = rel AND c.contype = 'p'
           AND (SELECT array_agg(a.attname::text) FROM pg_attribute a WHERE a.attrelid = rel AND a.attnum = ANY (c.conkey)) = ARRAY['id']
    ) THEN
        problems := problems || E'\n  primary key on (id) is missing';
    END IF;

    -- the eight CHECK constraints, by name and content
    FOR r IN
        SELECT * FROM (VALUES
            ('staff_review_summary_attachments_uploaded_by_check', ARRAY['mayurika', 'suman', 'arun', 'rajiv', 'paraparan']),
            ('staff_review_summary_attachments_attachment_type_check', ARRAY['audio', 'word', 'excel', 'image', 'pdf']),
            ('staff_review_summary_attachments_file_size_positive_check', ARRAY['file_size_bytes', '> 0']),
            ('staff_review_summary_attachments_storage_resource_type_check', ARRAY['image', 'video', 'raw']),
            ('staff_review_summary_attachments_storage_provider_check', ARRAY['storage_provider', 'cloudinary']),
            ('staff_review_summary_attachments_filename_nonblank_check', ARRAY['original_filename', '> 0']),
            ('staff_review_summary_attachments_content_type_nonblank_check', ARRAY['content_type', '> 0']),
            ('staff_review_summary_attachments_public_id_nonblank_check', ARRAY['storage_public_id', '> 0'])
        ) AS t(conname, needles)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
             WHERE c.conrelid = rel AND c.contype = 'c' AND c.conname = r.conname
               AND NOT EXISTS (SELECT 1 FROM unnest(r.needles) n WHERE pg_get_constraintdef(c.oid) NOT LIKE '%' || n || '%')
        ) THEN
            problems := problems || format(E'\n  CHECK constraint %s is missing or differs', r.conname);
        END IF;
    END LOOP;

    IF problems <> '' THEN
        RAISE EXCEPTION 'attachment migration aborted: management_aios.staff_review_summary_attachments already exists with an INCOMPATIBLE definition:%', problems;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = rel AND contype = 'f') THEN
        RAISE NOTICE 'note: the table has a foreign key; this design does not require one (it is harmless if the summaries are never hard-deleted)';
    END IF;
END $$;

-- Primary read path: every attachment belonging to one summary, in upload
-- order. Partial — a pending row is never returned by it.
CREATE INDEX IF NOT EXISTS idx_staff_review_summary_attachments_summary
    ON management_aios.staff_review_summary_attachments (summary_id, created_at)
    WHERE summary_id IS NOT NULL;

-- Cleanup-script read path: one uploader's stale pending uploads, oldest first.
CREATE INDEX IF NOT EXISTS idx_staff_review_summary_attachments_pending
    ON management_aios.staff_review_summary_attachments (uploaded_by, created_at)
    WHERE summary_id IS NULL;

-- Each storage asset maps to exactly one row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_review_summary_attachments_storage_public_id
    ON management_aios.staff_review_summary_attachments (storage_public_id);

-- (3b) Verify the indexes (name and definition) — an index of the same name but a
-- different definition would otherwise be hidden by IF NOT EXISTS.
DO $$
DECLARE
    problems   text := '';
    r          record;
BEGIN
    -- indexes: name and definition
    FOR r IN
        SELECT * FROM (VALUES
            ('idx_staff_review_summary_attachments_summary', ARRAY['(summary_id, created_at)', 'WHERE (summary_id IS NOT NULL)']),
            ('idx_staff_review_summary_attachments_pending', ARRAY['(uploaded_by, created_at)', 'WHERE (summary_id IS NULL)']),
            ('idx_staff_review_summary_attachments_storage_public_id', ARRAY['UNIQUE', '(storage_public_id)'])
        ) AS t(idxname, needles)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes i
             WHERE i.schemaname = 'management_aios' AND i.tablename = 'staff_review_summary_attachments' AND i.indexname = r.idxname
               AND NOT EXISTS (SELECT 1 FROM unnest(r.needles) n WHERE i.indexdef NOT LIKE '%' || n || '%')
        ) THEN
            problems := problems || format(E'\n  index %s is missing or differs', r.idxname);
        END IF;
    END LOOP;

    IF problems <> '' THEN
        RAISE EXCEPTION 'attachment migration aborted: management_aios.staff_review_summary_attachments has INCOMPATIBLE indexes:%', problems;
    END IF;
END $$;

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. Table exists with the expected column set (expect 11 rows).
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name = 'staff_review_summary_attachments'
ORDER BY ordinal_position;

-- 2. All CHECK constraints exist (expect 8).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.staff_review_summary_attachments'::regclass
  AND contype = 'c';

-- 3. No foreign key by design (expect 0 rows).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.staff_review_summary_attachments'::regclass
  AND contype = 'f';

-- 4. All indexes exist (expect 3 + the primary-key index).
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'management_aios'
  AND tablename = 'staff_review_summary_attachments';

-- 5. Row count.
SELECT count(*) AS row_count FROM management_aios.staff_review_summary_attachments;

-- 6. ORPHAN VALIDATION (read-only) — a linked attachment whose summary does
--    not exist. Must return ZERO rows, now and after every transfer/deploy.
SELECT a.id, a.summary_id, a.original_filename, a.created_at
FROM management_aios.staff_review_summary_attachments a
LEFT JOIN management_aios.staff_review_summaries s ON s.id = a.summary_id
WHERE a.summary_id IS NOT NULL
  AND s.id IS NULL;

-- 7. Existing tables are unaffected (run before and after; counts must match).
SELECT count(*) AS existing_staff_review_summaries_count FROM management_aios.staff_review_summaries;
SELECT count(*) AS existing_staff_dashboard_records_count FROM management_aios.staff_dashboard_records;

-- ── Rollback (if ever needed) ──────────────────────────────────────────────
-- Three distinct rollback concepts — do not conflate them:
--
-- (a) Before this migration is applied: nothing to undo.
--
-- (b) Feature disablement (after real attachment data exists): set
--     LOCAL_PROTOTYPE_ATTACHMENTS=true again only if the SQLite file still
--     holds every link you need — attachments uploaded AFTER the cut-over
--     exist ONLY in this table. Otherwise remove/hide the attachment
--     routes/UI. All rows and all Cloudinary files remain intact.
--
-- (c) Destructive schema rollback — must NEVER be the automatic rollback
--     once real data exists; it destroys every attachment's metadata row
--     (the Cloudinary files are NOT deleted and become orphaned). Only with
--     an explicit export/backup and owner sign-off:
--
-- BEGIN;
-- DROP TABLE IF EXISTS management_aios.staff_review_summary_attachments;
-- COMMIT;
