-- DRAFT — NOT EXECUTED
--
-- Management AIOS — Create management_aios.knowledge_documents,
-- knowledge_document_versions, knowledge_document_audit_log
-- REQ-KM-CRUD-002 — Knowledge Management persistent CRUD design.
-- 2026-08-10 (revised — business rules locked, see
-- docs/knowledge-management-crud-design-2026-08-10.md §7). Additive only —
-- does not drop, alter, or rewrite any existing table.
-- member_schedule_events, member_leave_records, staff_dashboard_records,
-- and staff_review_summaries are untouched by this migration.
--
-- ══════════════════════════════════════════════════════════════════════
-- THIS FILE IS A DESIGN ARTIFACT ONLY. IT HAS NOT BEEN EXECUTED AGAINST
-- ANY DATABASE. DO NOT RUN IT.
--
-- Live management_aios PostgreSQL inspection: NOT COMPLETED.
-- Duplicate-object clearance: OPEN.
-- Migration execution: BLOCKED pending live read-only database inspection.
--
-- Do not run this file until:
--   1. A live, read-only inspection of management_aios confirms no
--      pre-existing/conflicting object under these three names (see
--      docs/knowledge-management-crud-design-2026-08-10.md §1 — this has
--      not happened in any session to date).
--   2. Explicit human approval to apply it against the correct Neon
--      instance.
--   3. A separate, explicit decision on when to switch the frontend from
--      the static APPROVED_DOCUMENTS registry to the live API — NOT a
--      data-seeding step (design doc §7 rule 4: the 3 existing frontend
--      sample records are never auto-migrated into these tables).
-- ══════════════════════════════════════════════════════════════════════
--
-- Full design rationale, business-rule mapping (locked 2026-08-10), and
-- API design: docs/knowledge-management-crud-design-2026-08-10.md
--
-- Idempotent: CREATE TABLE/INDEX use IF NOT EXISTS — safe to re-run once
-- eventually applied.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.knowledge_documents (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title                       VARCHAR(200) NOT NULL,
    team                        VARCHAR(120) NOT NULL,
    document_type               VARCHAR(40)  NOT NULL,
    job_role                    VARCHAR(120) NULL,
    document_category           VARCHAR(120) NULL,
    creator                     VARCHAR(200) NULL,

    source_url                  VARCHAR(2048) NOT NULL,
    -- Normalized form of source_url (lowercased scheme/host, query string
    -- and fragment stripped, trailing slash stripped) — computed by the
    -- API on every write, never client-supplied directly. Basis of the
    -- duplicate-prevention rule below (design doc §7 rule 3). Known,
    -- documented limitation: a plain URL-normalization heuristic, not
    -- Google-file-ID extraction — deliberately not AI/smart duplicate
    -- detection, per explicit instruction.
    source_url_normalized       VARCHAR(2048) NOT NULL,
    current_version             VARCHAR(20)  NOT NULL DEFAULT '1.0',

    lifecycle_status            VARCHAR(20)  NOT NULL DEFAULT 'Active',
    compliance_status           VARCHAR(20)  NOT NULL DEFAULT 'Pending',
    -- Extensible-but-validated design (design doc §6) — 'Verified' is a
    -- legal DB value today so no future schema migration is needed to
    -- unlock it; no application route writes it until a dedicated,
    -- future, real Google-verification feature exists. See design doc §6
    -- for the full comparison against a lookup-table alternative
    -- (rejected — no precedent anywhere in this schema).
    google_ownership_status     VARCHAR(20)  NOT NULL DEFAULT 'Not Applicable',

    created_by                  VARCHAR(80)  NOT NULL,
    updated_by                  VARCHAR(80)  NULL,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    -- Soft-delete state (design doc §7 rule 5) — all three populated
    -- together, or all three NULL together (see the pairing check
    -- below); never a partial state. Cleared together on RESTORE — the
    -- historical fact of the deletion survives only in
    -- knowledge_document_audit_log, never here.
    deleted_at                  TIMESTAMPTZ  NULL,
    deleted_by                  VARCHAR(80)  NULL,
    delete_reason               VARCHAR(500) NULL,

    CONSTRAINT knowledge_documents_document_type_check
        CHECK (document_type IN (
            'Google Sheet', 'Google Doc', 'Google Drive File', 'PDF',
            'Word Document', 'Excel File', 'ZIP File', 'Skill File',
            'Image', 'Video', 'External URL', 'Internal Documentation Link'
        )),

    CONSTRAINT knowledge_documents_lifecycle_status_check
        CHECK (lifecycle_status IN ('Active', 'Archived')),

    CONSTRAINT knowledge_documents_compliance_status_check
        CHECK (compliance_status IN ('Pending', 'Completed')),

    -- 'Verified' IS a legal value here (design doc §6, Option C) — the
    -- "no fake ownership verification" guarantee is enforced at the
    -- application layer (no Create/Update schema accepts client input of
    -- 'Verified'), never by the database being structurally incapable of
    -- holding it. This is deliberate, not an oversight.
    CONSTRAINT knowledge_documents_google_ownership_status_check
        CHECK (google_ownership_status IN ('Not Applicable', 'Not Verified', 'Verified')),

    -- A Google-type document cannot reach Completed while ownership is
    -- unverified (SRD §6/§17). Structurally still permits
    -- 'Verified'+'Completed' together — because no application code path
    -- can ever produce google_ownership_status='Verified' today, this
    -- remains, in practice, "no Google-type document can be marked
    -- Completed at this phase" without the schema itself blocking the
    -- future real-verification feature.
    CONSTRAINT knowledge_documents_compliance_google_gate_check
        CHECK (
            compliance_status = 'Pending'
            OR document_type NOT IN ('Google Sheet', 'Google Doc', 'Google Drive File')
            OR google_ownership_status = 'Verified'
        ),

    -- Soft-delete pairing (design doc §7 rule 5) — same symmetric-pairing
    -- shape as MemberScheduleEvent's outcome_reason check and
    -- MemberLeaveRecord's half_day_period check elsewhere in this schema.
    CONSTRAINT knowledge_documents_soft_delete_pairing_check
        CHECK (
            (deleted_at IS NULL AND deleted_by IS NULL AND delete_reason IS NULL)
            OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL AND delete_reason IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_active
    ON management_aios.knowledge_documents (deleted_at)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_team
    ON management_aios.knowledge_documents (team)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_type
    ON management_aios.knowledge_documents (document_type)
    WHERE deleted_at IS NULL;

-- Title is explicitly NOT unique (design doc §7 rule 3 — different
-- teams/categories may legitimately share a title). Duplicate prevention
-- instead targets the ACTIVE normalized source URL: two active
-- (non-deleted) records can never share the same source_url_normalized.
-- A PARTIAL unique index (not a table-wide UNIQUE) so a soft-deleted
-- record's URL can be legitimately reused by a later, unrelated
-- registration.
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_documents_active_source_url_normalized
    ON management_aios.knowledge_documents (source_url_normalized)
    WHERE deleted_at IS NULL;

-- RESTORE edge case (found during final migration review, 2026-08-10 —
-- not a schema defect, an application-layer implication of this
-- constraint worth documenting here where the constraint lives): if
-- document A is soft-deleted, and a later document B is legitimately
-- created reusing A's now-inactive source_url_normalized (allowed — A is
-- excluded from this partial index while deleted_at IS NOT NULL), then
-- restoring A afterward would violate this same index (A and B would
-- both be active with the same source_url_normalized). The RESTORE route
-- (design doc §5.6) MUST pre-check for this exact collision — the same
-- shape of check CREATE/VERSION already perform — and return a clean
-- 409, rather than let a caller see a raw constraint-violation error.
-- The database constraint itself is correct and intentionally rejects
-- this state either way; this note exists so the application-layer
-- pre-check is not missed when the route is actually implemented.

CREATE TABLE IF NOT EXISTS management_aios.knowledge_document_versions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id       UUID NOT NULL REFERENCES management_aios.knowledge_documents(id),

    version_label     VARCHAR(20)   NOT NULL,
    source_url        VARCHAR(2048) NOT NULL,
    change_note       VARCHAR(500)  NULL,

    created_by        VARCHAR(80)   NOT NULL,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Append-only by construction (design doc §3.2/§7 version rules) — no
-- application route ever issues UPDATE/DELETE against this table.
CREATE INDEX IF NOT EXISTS idx_knowledge_document_versions_document
    ON management_aios.knowledge_document_versions (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS management_aios.knowledge_document_audit_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id       UUID NOT NULL REFERENCES management_aios.knowledge_documents(id),

    action            VARCHAR(30) NOT NULL,
    actor_member_key  VARCHAR(80) NOT NULL,
    detail            JSONB NULL,

    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT knowledge_document_audit_log_action_check
        CHECK (action IN (
            'create', 'update_metadata', 'create_version',
            'archive', 'unarchive', 'soft_delete', 'restore'
        ))
);

-- Immutable by construction (design doc §3.3/§7 rule 2: no edit, no
-- delete, no rewrite) — no application route ever issues UPDATE/DELETE
-- against this table.
CREATE INDEX IF NOT EXISTS idx_knowledge_document_audit_log_document
    ON management_aios.knowledge_document_audit_log (document_id, occurred_at DESC);

COMMIT;

-- ── Validation queries — run after COMMIT to confirm ──────────────────────

-- 1. All three tables exist with the expected column sets.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'management_aios'
  AND table_name IN ('knowledge_documents', 'knowledge_document_versions', 'knowledge_document_audit_log')
ORDER BY table_name, ordinal_position;

-- 2. All CHECK constraints exist on knowledge_documents (expect 6: type,
--    lifecycle_status, compliance_status, google_ownership_status,
--    compliance_google_gate, soft_delete_pairing).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'management_aios.knowledge_documents'::regclass
  AND contype = 'c';

-- 3. All three primary keys exist.
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
    'management_aios.knowledge_documents'::regclass,
    'management_aios.knowledge_document_versions'::regclass,
    'management_aios.knowledge_document_audit_log'::regclass
)
  AND contype = 'p';

-- 4. Both foreign keys exist.
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
    'management_aios.knowledge_document_versions'::regclass,
    'management_aios.knowledge_document_audit_log'::regclass
)
  AND contype = 'f';

-- 5. All indexes exist (expect 6 total: 3 plain + 1 unique partial + 2
--    FK-table indexes), including the primary-key indexes Postgres
--    creates automatically for each table's id column.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'management_aios'
  AND tablename IN ('knowledge_documents', 'knowledge_document_versions', 'knowledge_document_audit_log');

-- 5a. The active-source-URL partial unique index specifically — confirm
--     it is UNIQUE and scoped to WHERE deleted_at IS NULL (not a
--     table-wide unique constraint). Expect exactly 1 row.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'management_aios'
  AND tablename = 'knowledge_documents'
  AND indexname = 'idx_knowledge_documents_active_source_url_normalized'
  AND indexdef ILIKE '%UNIQUE%'
  AND indexdef ILIKE '%WHERE%deleted_at IS NULL%';

-- 6. Row counts (expected 0 immediately after this migration — per design
--    doc §7 rule 4, the 3 existing frontend sample records are NEVER
--    auto-seeded by this or any migration — confirms no sample/test data
--    was inserted).
SELECT count(*) AS knowledge_documents_row_count FROM management_aios.knowledge_documents;
SELECT count(*) AS knowledge_document_versions_row_count FROM management_aios.knowledge_document_versions;
SELECT count(*) AS knowledge_document_audit_log_row_count FROM management_aios.knowledge_document_audit_log;

-- 7. Confirm existing tables are unaffected by this migration (run before
--    and after; counts must match).
SELECT count(*) AS existing_staff_review_summaries_count FROM management_aios.staff_review_summaries;
SELECT count(*) AS existing_staff_dashboard_records_count FROM management_aios.staff_dashboard_records;
SELECT count(*) AS existing_member_leave_records_count FROM management_aios.member_leave_records;
SELECT count(*) AS existing_member_schedule_events_count FROM management_aios.member_schedule_events;

-- ── Rollback (if ever needed) ──────────────────────────────────────────────
-- Three distinct rollback concepts — do not conflate them:
--
-- (a) Deployment rollback (before this migration is ever applied): do not
--     apply this file; nothing to undo since nothing was run.
--
-- (b) Feature disablement (after real registry data exists): unmount the
--     knowledge_documents router (once it exists) from backend/main.py and
--     hide the frontend Knowledge Management workspace. All rows remain
--     intact in the tables, simply unreachable via API — this is the
--     correct action once real data exists and the feature needs pausing.
--
-- (c) Destructive schema rollback — must NEVER be the automatic/default
--     rollback once real registry data exists; it permanently destroys
--     every registered document's metadata, version history, and audit
--     trail (including the historical delete/restore record). Only run
--     with explicit export/backup and explicit business-owner sign-off:
--
-- BEGIN;
-- DROP TABLE IF EXISTS management_aios.knowledge_document_audit_log;
-- DROP TABLE IF EXISTS management_aios.knowledge_document_versions;
-- DROP TABLE IF EXISTS management_aios.knowledge_documents;
-- COMMIT;
