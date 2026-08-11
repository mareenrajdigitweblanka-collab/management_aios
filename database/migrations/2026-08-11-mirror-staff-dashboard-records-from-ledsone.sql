-- Management AIOS — Rebuild management_aios.staff_dashboard_records as an
-- exact mirror of employee_management.staff (Ledsone)
-- 2026-08-11. Third and final step of re-sourcing staff_dashboard_records
-- from Ledsone — supersedes the intermediate curated-5-column design from
-- earlier the same day (2026-08-11-drop-uncovered-columns-from-staff-
-- dashboard-records.sql, scripts/sync_staff_dashboard_from_ledsone.py).
-- Both are now superseded in turn — see their own files for the full
-- lineage. Explicit, deliberate user instruction: replace all columns and
-- data with an EXACT mirror of employee_management.staff, including using
-- its own integer primary key directly (no UUID surrogate).
--
-- Column mapping: every employee_management.staff column is mirrored
-- verbatim (same name, same type) EXCEPT fcm_token, which is deliberately
-- excluded — it is a push-notification device token (a security
-- credential), not staff data, the same category of exclusion the
-- original CSV design applied to salary/personal-contact fields.
--
-- Orphaned review summaries: 5 of the then-11 staff_review_summaries rows
-- referenced employee_numbers (DWL299, DWL300 x2, DWL304, DWL310) that do
-- not exist anywhere in employee_management.staff under any match. Per
-- explicit user instruction, these 5 rows were deleted (destroying that
-- reviewer-authored content) rather than kept as non-Ledsone exceptions —
-- see member-aios/staff-data/README.md §0 for the full record of this
-- decision. The remaining 6 rows were remapped via reviewed_staff_
-- employee_number (added earlier the same day) matched against staff_code
-- (normalized, spaces stripped) — all 6 matched exactly one row, no
-- ambiguity.
--
-- reviewed_staff_id changes type from UUID to INTEGER (staff_dashboard_
-- records.id is now employee_management.staff.id directly, not a
-- generated UUID) — this is a breaking type change to the API contract
-- (StaffRecordOut.id, StaffReviewSummaryCreate/Out.reviewed_staff_id):
-- both change from string(uuid) to integer. backend/models.py,
-- backend/schemas.py, backend/routers/staff.py, backend/routers/
-- staff_review_summaries.py, and web-view/js/staff-data.js /
-- review-summaries.js were all updated in the same change — see their own
-- diffs/docstrings. Do not apply this migration without deploying that
-- code change in the same release.
--
-- DATA: this file is schema-only. The 312-row data population (an exact,
-- verified mirror of employee_management.staff as of 2026-08-11 — row
-- count, id sum, staff_code count, delete_status count, and leave-balance
-- sum all cross-checked against the source) was performed as a one-time
-- bulk load in the same session this migration was authored, not by a
-- repeatable script — scripts/sync_staff_dashboard_from_ledsone.py is
-- superseded (built for the prior 5-column shape) and has not been
-- rewritten for this shape. A future re-sync needs a new script built
-- against this table's current (mirrored) shape.
--
-- NOT idempotent — DROP TABLE is destructive by construction. This file
-- documents what was applied; do not re-run it against a database that
-- already has this shape.
--
-- HOW TO APPLY (schema only — see DATA note above for population):
--   psql "$DATABASE_URL" -f database/migrations/2026-08-11-mirror-staff-dashboard-records-from-ledsone.sql

BEGIN;

DELETE FROM management_aios.staff_review_summaries
WHERE reviewed_staff_employee_number IN ('DWL299','DWL300','DWL304','DWL310');

ALTER TABLE management_aios.staff_review_summaries
    DROP CONSTRAINT IF EXISTS staff_review_summaries_reviewed_staff_id_fkey;

ALTER TABLE management_aios.staff_review_summaries
    ALTER COLUMN reviewed_staff_id DROP NOT NULL;

ALTER TABLE management_aios.staff_review_summaries
    ALTER COLUMN reviewed_staff_id TYPE INTEGER USING NULL;

DROP TABLE management_aios.staff_dashboard_records;

CREATE TABLE management_aios.staff_dashboard_records (
    id INTEGER PRIMARY KEY,
    staff_code TEXT,
    name TEXT,
    role INTEGER,
    email TEXT,
    phone TEXT,
    roster TEXT,
    designation TEXT,
    joined_date DATE,
    confirmed_date DATE,
    address TEXT,
    skype TEXT,
    delete_status BOOLEAN,
    team_id INTEGER,
    is_approved INTEGER,
    staff_type TEXT,
    staff_level TEXT,
    informed_leave_balance DOUBLE PRECISION,
    urgent_leave_balance DOUBLE PRECISION,
    backup_staffs TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── DATA POPULATION HAPPENS HERE (see DATA note above) — 312 rows,
--    one-time bulk load from employee_management.staff, not reproduced in
--    this file. ──

-- After data population, the following completes the FK remap (run once
-- staff_dashboard_records is populated):
--
-- UPDATE management_aios.staff_review_summaries r
-- SET reviewed_staff_id = d.id
-- FROM management_aios.staff_dashboard_records d
-- WHERE replace(d.staff_code, ' ', '') = r.reviewed_staff_employee_number;
--
-- ALTER TABLE management_aios.staff_review_summaries
--     ALTER COLUMN reviewed_staff_id SET NOT NULL;
--
-- ALTER TABLE management_aios.staff_review_summaries
--     ADD CONSTRAINT staff_review_summaries_reviewed_staff_id_fkey
--     FOREIGN KEY (reviewed_staff_id) REFERENCES management_aios.staff_dashboard_records(id);

COMMIT;

-- ── Validation queries — run after the full sequence (schema + data +
--    FK remap) completes ──────────────────────────────────────────────

-- 1. Row count matches Ledsone exactly (expected 312 as of 2026-08-11).
SELECT count(*) AS row_count FROM management_aios.staff_dashboard_records;

-- 2. Column shape (expected 22: 19 mirrored + id + 3 bookkeeping).
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'management_aios' AND table_name = 'staff_dashboard_records'
ORDER BY ordinal_position;

-- 3. fcm_token was never created (expected 0 rows).
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'management_aios' AND table_name = 'staff_dashboard_records'
  AND column_name = 'fcm_token';

-- 4. FK restored and every review summary resolves to a real row
--    (expected 0 orphaned).
SELECT count(*) AS orphaned
FROM management_aios.staff_review_summaries r
LEFT JOIN management_aios.staff_dashboard_records d ON d.id = r.reviewed_staff_id
WHERE d.id IS NULL;

-- 5. reviewed_staff_id is now integer, not uuid.
SELECT data_type FROM information_schema.columns
WHERE table_schema = 'management_aios' AND table_name = 'staff_review_summaries'
  AND column_name = 'reviewed_staff_id';

-- Rollback: not meaningful once real staff_review_summaries data depends
-- on the new integer ids — treat this as a one-way migration. Restoring
-- the prior UUID-keyed, 5-column shape requires re-running
-- 2026-08-11-drop-uncovered-columns-from-staff-dashboard-records.sql's
-- rollback section and re-populating from a backup taken before this
-- file ran (none was taken — see member-aios/staff-data/README.md §0).
