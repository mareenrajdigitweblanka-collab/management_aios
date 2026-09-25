-- Management AIOS — allow ATTACHMENT-ONLY review summaries.
-- 2026-09-25.  *** DRAFT — NOT EXECUTED. Requires the table OWNER. ***
--
-- Why this exists: attachment-only reviews are a requirement, but they do NOT
-- work today, at any of three layers:
--   1. Database (this file):  management_aios.staff_review_summaries.summary_text
--      is NOT NULL and carries staff_review_summaries_summary_text_nonblank_check
--      (length(trim(summary_text)) > 0).
--   2. Backend: backend/schemas.py StaffReviewSummaryCreate/Update require
--      summary_text (min_length=1 + a non-blank validator); StaffReviewSummaryOut
--      declares summary_text: str.
--   3. Frontend: web-view/js/review-summaries.js validateSummaryText() blocks
--      an empty summary before any request is sent.
-- backend/tests/test_attachment_claim.py::AttachmentOnlyReviewIsNotSupportedYetTests
-- pins that current behavior so no one claims otherwise.
--
-- Blocker: management_aios.staff_review_summaries is owned by role `postgres`
-- (verified read-only, 2026-09-24); the application role temp_user cannot ALTER
-- it and must NOT be granted ownership for this. Someone with the owner role
-- must review and run this file. Nothing here was run.
--
-- Design choice — NULL, not placeholder text: a review with no text stores
-- summary_text = NULL. Storing '' or a filler such as "(attachment only)"
-- would be fake content shown in history, PDF and ZIP exports. The non-blank
-- rule is KEPT for any text that IS supplied (NULL passes; '' and '   ' still
-- fail). The max-length CHECK (<= 10000) already passes NULL and is untouched.
--
-- What a database CHECK cannot do: "text OR at least one attachment" spans two
-- tables, so it cannot be a CHECK. The backend must enforce it inside the
-- create transaction (after backend/attachment_claim.py has linked the files,
-- refuse and roll back when text is NULL and zero attachments were linked).
-- A trigger could enforce it in the database too; it is deliberately not
-- included here (adds hidden behavior; needs a separate decision).
--
-- Existing rows: none are changed (every current row has non-blank text).
--
-- Required application changes BEFORE anyone relies on this (not done — none
-- may ship ahead of this migration, or the API would return 500 on a NOT NULL
-- violation):
--   * backend/models.py StaffReviewSummary.summary_text -> nullable; replace
--     the model's nonblank CHECK with the NULL-tolerant form below.
--   * backend/schemas.py: StaffReviewSummaryCreate.summary_text Optional; a
--     model validator: text is None/blank -> require >= 1 attachment_ids;
--     StaffReviewSummaryOut.summary_text Optional[str]; decide whether the
--     Update route may clear text on a review that has attachments.
--   * backend/routers/staff_review_summaries.py create route: after the claim,
--     text NULL and 0 files linked -> 422 + rollback.
--   * backend/review_summary_pdf_export.py and the ZIP export: render a review
--     with no text ("No written summary — attachments only"), never crash on None.
--   * web-view/js/review-summaries.js: validateSummaryText accepts empty text
--     when >= 1 attachment finished uploading; list/detail render null text.
--   * Tests for all of the above (backend + web-view/js/review-summaries.test.mjs).
--
-- Rollback (only valid while no attachment-only row exists):
--   ALTER TABLE management_aios.staff_review_summaries
--       DROP CONSTRAINT staff_review_summaries_summary_text_nonblank_check;
--   ALTER TABLE management_aios.staff_review_summaries
--       ADD CONSTRAINT staff_review_summaries_summary_text_nonblank_check
--       CHECK (length(TRIM(BOTH FROM summary_text)) > 0);
--   ALTER TABLE management_aios.staff_review_summaries
--       ALTER COLUMN summary_text SET NOT NULL;   -- fails if any NULL text exists

BEGIN;

-- Refuse to run against anything but the expected current definition.
DO $$
DECLARE
    is_not_null boolean;
    check_def   text;
BEGIN
    IF current_database() <> 'order_management_copy' THEN
        RAISE EXCEPTION 'aborted: expected database order_management_copy, connected to %', current_database();
    END IF;
    IF NOT pg_has_role(current_user,
                       (SELECT relowner FROM pg_class WHERE oid = 'management_aios.staff_review_summaries'::regclass),
                       'USAGE') THEN
        RAISE EXCEPTION 'aborted: % is not the owner of management_aios.staff_review_summaries', current_user;
    END IF;
    SELECT a.attnotnull INTO is_not_null
      FROM pg_attribute a
     WHERE a.attrelid = 'management_aios.staff_review_summaries'::regclass
       AND a.attname = 'summary_text' AND NOT a.attisdropped;
    IF is_not_null IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'aborted: summary_text is not NOT NULL as expected (already migrated?)';
    END IF;
    SELECT pg_get_constraintdef(oid) INTO check_def
      FROM pg_constraint
     WHERE conrelid = 'management_aios.staff_review_summaries'::regclass
       AND conname = 'staff_review_summaries_summary_text_nonblank_check';
    IF check_def IS NULL OR check_def NOT LIKE '%length(TRIM(BOTH FROM summary_text)) > 0%' THEN
        RAISE EXCEPTION 'aborted: unexpected nonblank check definition: %', coalesce(check_def, '<missing>');
    END IF;
END $$;

ALTER TABLE management_aios.staff_review_summaries
    ALTER COLUMN summary_text DROP NOT NULL;

ALTER TABLE management_aios.staff_review_summaries
    DROP CONSTRAINT staff_review_summaries_summary_text_nonblank_check;

ALTER TABLE management_aios.staff_review_summaries
    ADD CONSTRAINT staff_review_summaries_summary_text_nonblank_check
    CHECK (summary_text IS NULL OR length(TRIM(BOTH FROM summary_text)) > 0);

COMMIT;

-- ── Validation (read-only) ────────────────────────────────────────────────
-- 1. summary_text is now nullable (expect attnotnull = false).
SELECT attname, attnotnull FROM pg_attribute
 WHERE attrelid = 'management_aios.staff_review_summaries'::regclass AND attname = 'summary_text';
-- 2. The three CHECK constraints (nonblank now NULL-tolerant).
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid = 'management_aios.staff_review_summaries'::regclass AND contype = 'c' ORDER BY conname;
-- 3. Row count unchanged (was 83 on 2026-09-24).
SELECT count(*) FROM management_aios.staff_review_summaries;
