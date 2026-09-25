# Review Summary attachments — cut-over from local SQLite to shared PostgreSQL

**2026-09-24 (revised: no foreign key).** Replaces the machine-local prototype
store described in `docs/2026-09-23_local-prototype-attachment-metadata.md`.

Nothing here moves file bytes. Originals stay in Cloudinary as private
(`type="authenticated"`) assets addressed by `storage_public_id`
(`management-aios/review-summary-attachments/<uuid4>`) +
`storage_resource_type` (`image` / `video` / `raw`). Only *metadata* — which
asset belongs to which review, its filename, type, size, uploader and
timestamp — moves. No Cloudinary secret and no file bytes are stored in
PostgreSQL. Summary text and meeting date stay in
`management_aios.staff_review_summaries`, which is never altered.

## Design

`management_aios.staff_review_summary_attachments` (database
`order_management_copy`), columns `id, summary_id, uploaded_by,
original_filename, content_type, attachment_type, file_size_bytes,
storage_provider, storage_public_id, storage_resource_type, created_at`,
8 CHECK constraints (4 added 2026-09-25: provider, non-blank filename/content type/public id), 3 indexes (including UNIQUE `storage_public_id`).

**`summary_id` has no foreign key** (approved design): the application role
lacks `REFERENCES` on `staff_review_summaries` and none is requested. It stays
nullable for a pending upload. Integrity is enforced and *verified*:

* a link is written only by `create_staff_review_summary`, in the same
  transaction that inserts the summary, after `_claim_pending_attachments`
  checked each attachment exists, is pending and belongs to the acting reviewer;
* every read (list, detail, download, exports) goes through the active-summary
  lookup and scopes the attachment by `(id, summary_id)`;
* summaries are never hard-deleted (delete route answers 409) and there is no
  attachment-delete route; a soft-deleted summary hides its attachments;
* the **orphan check** (a linked attachment whose summary does not exist) must
  return zero rows — `backend/attachment_integrity.py`,
  `scripts/check_review_summary_attachment_orphans.py`, migration validation
  query 6, and the transfer tool refuses (and rolls back) any insert that would
  create one.

The migration verifies an existing table instead of trusting `IF NOT EXISTS`:
wrong column type/nullability, missing primary key, missing/different CHECK
constraints, or a same-named index with a different definition abort the whole
transaction with a message naming the differences. It also aborts if
`management_aios.staff_review_summaries` (uuid `id`) is not in the connected
database. It needs only CREATE on schema `management_aios`.

## Commands (repository root, `DATABASE_URL` = the intended target)

```
# 0. Identify the target (read-only)
python -m scripts.apply_review_summary_attachments_migration           # dry run

# 1. Stop writes to the local backend, then a verified SQLite backup
python -m scripts.transfer_local_attachment_metadata_to_postgres --backup-only

# 2. Migrate (creates the table / verifies an existing one)
python -m scripts.apply_review_summary_attachments_migration --apply --confirm-target HOST:PORT/DATABASE
#    equivalent: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/2026-09-23-create-staff-review-summary-attachments.sql

# 3. Dry run of the transfer with Cloudinary verification and a per-row report
python -m scripts.transfer_local_attachment_metadata_to_postgres --include-pending --require-asset --verify-excluded --report local_data/reports/dryrun.json

# 4. Apply (always re-verifies assets; backs up again; refuses on any blocker)
python -m scripts.transfer_local_attachment_metadata_to_postgres --include-pending --apply --confirm-target HOST:PORT/DATABASE --report local_data/reports/applied.json

# 5. Verify: zero orphans, counts, then switch the backend
python -m scripts.check_review_summary_attachment_orphans
#    remove LOCAL_PROTOTYPE_ATTACHMENTS from .env, restart ONE backend
#    GET /api/staff-review-summaries/attachments/storage-mode  ->  {"mode": "postgres"}
```

### What the transfer imports
Each SQLite row is classified by ID with a reason (`--report`):

| Class | Rule |
|---|---|
| importable | linked to an existing review **or** pending; **its Cloudinary asset exists and its byte size equals the stored size** |
| excluded — summary missing | linked to a review id PostgreSQL does not have |
| excluded — pending, no asset | a pending row whose Cloudinary asset does not exist (test fixture / failed upload) |
| blocking | a *linked* row with no asset, a size mismatch, a Cloudinary lookup error (uncertain), duplicate/conflicting ids or storage ids, invalid values |

IDs, review links, Cloudinary public IDs and timestamps are preserved exactly;
every inserted row is read back and compared inside the transaction. Rerunning
is safe (`ON CONFLICT (id) DO NOTHING`). The SQLite file and its backups are
never modified or deleted.

## Rollback

* **Before step 2:** nothing to undo.
* **Code/flag rollback:** set `LOCAL_PROTOTYPE_ATTACHMENTS=true` again — only
  safe while the SQLite file still holds every link you need. Anything uploaded
  after the cut-over exists **only** in PostgreSQL.
* **Data rollback:** imported rows are metadata keyed by id; `DROP TABLE` (last
  section of the migration file) destroys them and orphans the Cloudinary files
  — never automatic, only with a backup and owner sign-off.

## Verifying uploads survive a new machine/deployment

1. On a second machine/directory with **no `local_data/`** and the same
   `DATABASE_URL`: `storage-mode` = `postgres`; the review's attachments list
   and download.
2. `check_review_summary_attachment_orphans` → `orphans: 0`.
3. Read the rows: compare `id`, `summary_id`, `storage_public_id` with the
   report.
4. Upload a real file on machine A, open the review on machine B and download.
5. Restart the backend on each; repeat.

## Deployed backend (Vercel) — not touched

`backend/README.md` documents a separate Vercel project whose `DATABASE_URL`
is set only in the Vercel dashboard. Nothing in this repository shows which
database/role it uses, so **do not deploy or switch it** until its host,
database and role (no password) are read from that dashboard and match the
database that now holds `staff_review_summary_attachments`. Also set the three
`CLOUDINARY_*` variables there, and leave `LOCAL_PROTOTYPE_ATTACHMENTS` unset.

## PDF attachments

Cloudinary's signed *delivery* URL returns `401 deny or ACL failure` for PDFs
(account-level PDF/ZIP delivery restriction); references were correct.
`CloudinaryAttachmentStorage.download_bytes` now falls back, only on a 401, to
Cloudinary's API-signed private download (nothing made public). Optional:
enable "PDF and ZIP files delivery" in Cloudinary to make PDFs faster.

## Cut-over record — 2026-09-25

**Done (verified read-only afterwards):**

* Migration applied by `temp_user` to `149.28.134.54:5435/order_management_copy`
  (file SHA-256 `a0e9d63511e8fe52ea3f323758c81762562893ea832889d84e630313582e4428`).
  A first attempt aborted and rolled back (two new constraint names were 65
  characters; PostgreSQL truncates at 63, so the migration's own verifier
  refused). Names were shortened, a regression test was added
  (`backend/tests/test_attachment_claim.py::MigrationDefinitionTests`), and the
  second run applied. No grant, ownership change or foreign key was involved.
* 19 verified local links transferred (`local_data/reports/applied.json`):
  IDs, review links and timestamps preserved; 0 column mismatches; 0 orphans.
* Application-level integrity replaces the missing foreign key:
  `backend/attachment_claim.py` (summary exists/active/owned, file limit,
  pending + same uploader, one conditional UPDATE inside the create transaction).
* `LOCAL_PROTOTYPE_ATTACHMENTS` is ignored when `ENVIRONMENT=production`
  (`backend/config.py`), so a deployment can never fall back to SQLite.

**Left behind in `local_data/local_prototype_attachments.db` (never transferred):**

| Rows | Why |
|---|---|
| 142 | linked to review IDs that do not exist in PostgreSQL; Cloudinary asset also missing (test fixtures) |
| 69 | pending, no Cloudinary asset (test fixtures / failed uploads) |
| 2 | pending, real Cloudinary assets, never claimed by a review — need a claim plan (attach to a specific review, or delete the assets) before any import |

The SQLite file and both backups (`local_data/backups/`) are unchanged.

**Rollback:**

1. Local/dev only: set `LOCAL_PROTOTYPE_ATTACHMENTS=true` with `ENVIRONMENT` not
   `production`. Anything created after the cut-over (including the two test
   attachments below) exists only in PostgreSQL.
2. Remove exactly the imported rows (destructive; needs sign-off): delete from
   `management_aios.staff_review_summary_attachments` the ids listed with
   classification `importable` in `local_data/reports/applied.json`.
3. Remove the table (destructive; orphans the Cloudinary files): the DROP TABLE
   at the end of the migration file, only with a backup and owner sign-off.

**Test data created by the end-to-end check:** one review on the `Staff Test`
account (id `1ac27d5d-6496-4769-bb8e-35a6b2a7243e`, text starts "[TEST 2026-09-25]")
with two attachments (`e2e-test.pdf`, `e2e-test.docx`). The API has no delete;
an owner-role soft-delete (`deleted_at`) is the clean way to hide it.

**Not supported yet:** attachment-only reviews — see
`database/migrations/2026-09-25-allow-attachment-only-review-summaries.sql`
(DRAFT, owner-only).
