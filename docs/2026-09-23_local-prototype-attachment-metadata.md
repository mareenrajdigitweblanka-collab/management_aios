# Local Prototype Attachment Metadata Mode

> **Being replaced (2026-09-24).** The transfer tool and cut-over runbook are in
> `docs/2026-09-24_review-summary-attachments-postgres-cutover.md`. The export
> steps below are superseded by `scripts/transfer_local_attachment_metadata_to_postgres.py`.

**REQ-CAL-REV-ATTACH-001-LOCAL-PROTO — 2026-09-23**

## Why this exists

The real PostgreSQL attachment migration
(`database/migrations/2026-09-23-create-staff-review-summary-attachments.sql`)
could not be applied to this local backend's database. A disposable,
rolled-back transaction dry run confirmed the DDL itself is valid, but
applying it for real is blocked by a privilege gap: the configured database
role (`temp_user`) has `SELECT`/`INSERT`/`UPDATE` on
`management_aios.staff_review_summaries` but not `REFERENCES`, which the new
table's foreign key requires, and only the table's owning role can grant
it. No database privileges were granted and no migration was applied to
work around this — see the conversation record for the full dry-run
evidence.

This mode exists so Cloudinary attachment upload/download/PDF export/ZIP
export can still be exercised locally in the meantime.

## What actually changed

| Data | Where it lives | Changed by this mode? |
|---|---|---|
| Staff review summary text, reviewer, employee, dates | PostgreSQL (`management_aios.staff_review_summaries`) | **No** — completely untouched |
| Original attachment file bytes | Cloudinary | **No** — same provider, same upload convention, same `backend/attachment_storage.py`, unchanged |
| Attachment metadata (which file belongs to which summary, filename, type, size, uploader, Cloudinary reference) | A new, separate, local-only SQLite file | **Yes — this is the only thing this mode adds** |

## Enabling it

Set, in your local `.env` (never committed, never a shared/production
value):

```
LOCAL_PROTOTYPE_ATTACHMENTS=true
```

Off by default. When unset (or any value other than the exact literal
`true`), every attachment route uses the original, unmodified PostgreSQL-
backed implementation exactly as before — which will keep returning
`attachment_storage_not_ready` (503) until the real migration is applied.

The metadata file is created automatically, at `local_data/local_prototype_attachments.db`
(configurable via `backend.config.LOCAL_ATTACHMENT_METADATA_DB_PATH`), the
first time it's needed. **No PostgreSQL schema is ever touched by this
mode** — `local_data/` is listed in `.gitignore` and is never committed.

## ⚠ Local-only persistence — read before relying on this data

This SQLite file:

- **will not follow this repository to another machine, another
  developer's checkout, or any deployment** (Vercel or otherwise). It is
  not committed, and there is no mechanism that copies it anywhere.
- has **no relationship to the real, shared PostgreSQL database**. A
  review summary's own text/reviewer/employee/dates stay fully durable and
  shared (never touched by this mode) — but *which attachments belong to
  it* is knowledge that exists only on this one machine, in this one file,
  until the real migration replaces this mode.
- has **no cross-database transaction** with the PostgreSQL summary
  insert. Claiming a pending attachment (pointing it at the summary that
  was just created) is a second, separate SQLite write, performed
  immediately after the PostgreSQL insert commits. If that second write
  ever failed after the first succeeded, the summary would exist with its
  attachment(s) still "pending" rather than attached. This is an inherent,
  accepted limitation of splitting metadata across two database engines
  with no distributed-transaction coordinator — acceptable only because
  this is explicitly a local prototype, never production.

Nothing in this mode ever uses `localStorage`, `sessionStorage`,
`IndexedDB`, a service worker, or the browser HTTP cache — it is a real
server-side SQLite file, not a browser-side substitute.

## Export / transition plan to the real PostgreSQL migration

Once the real migration is applied (privilege granted, migration run
against the real database):

1. **Stop using this mode** — unset `LOCAL_PROTOTYPE_ATTACHMENTS` (or set
   it to anything other than `true`). Every attachment route immediately
   reverts to the original, unmodified PostgreSQL-backed code path, which
   this mode never altered.
2. **Export the SQLite rows.** `backend/local_attachment_metadata.py`'s
   `LocalAttachmentMetadata` model mirrors
   `backend/models.py`'s `StaffReviewSummaryAttachment` column-for-column
   on purpose, so this is a direct copy, never a data transformation:

   ```sql
   -- Run against local_data/local_prototype_attachments.db
   SELECT id, summary_id, uploaded_by, original_filename, content_type,
          attachment_type, file_size_bytes, storage_provider,
          storage_public_id, storage_resource_type, created_at
   FROM local_attachment_metadata;
   ```

3. **Insert each row into the real table** (`management_aios.staff_review_summary_attachments`)
   with the exact same column values. The Cloudinary assets themselves
   need no changes at all — this mode never used a different storage
   provider, upload convention, or public_id scheme.
4. **Delete `local_data/`** once the export is confirmed against the real
   database. It is git-ignored, so this is purely local cleanup.

## What was and wasn't verified

Automated tests (`backend/tests/test_local_prototype_attachments.py`) use
`FakeAttachmentStorage` — a test double, never a real Cloudinary call — to
verify the upload → pending → claim flow, authorization rules, history
listing, individual download, PDF export, ZIP export, and persistence
across a simulated backend restart, all against the local SQLite metadata
store. **Passing these tests does not by itself prove the real Cloudinary
integration works** — see the accompanying conversation record / final
report for the separate, real-credentials verification (or its absence,
reported accurately) that this document's own tests cannot provide.
