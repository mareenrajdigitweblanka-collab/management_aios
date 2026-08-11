# Knowledge Management — Current-Phase Final Gap Closure (Preview + Upload Scope Decision)

**Date:** 2026-08-11 (same day as, and building directly on, [docs/knowledge-management-srd-compliance-audit-2026-08-11.md](knowledge-management-srd-compliance-audit-2026-08-11.md) — read that document first for the full requirement matrix; this one records only what changed in this later session).

**Approved current-phase decisions (as given by the user/developer this session):**
1. Real Google Owner-Access verification for `digitweb6@gmail.com` — **DEFERRED to a future phase.**
2. "Most Frequently Accessed Documents" dashboard widget — **DEFERRED to a future phase.**
3. Browser document Preview — **REQUIRED NOW.**
4. Knowledge Management must support BOTH physical file upload/storage AND link-based document registration.

**Status:** Item 3 implemented and tested (Google Sheet/Doc/Drive File/PDF/Image/Video). Item 4's link-registration half was already implemented (prior sessions) and is unaffected.

**CLOSURE CORRECTION (same day, immediately following this session):** the user/developer has since explicitly approved deferring the remaining open items rather than leaving them as unresolved blockers:

- Item 4's physical-upload half — **DEFERRED to a future phase** (was reported BLOCKED pending a storage-architecture decision; that technical finding still stands as the *reason*, but the operative classification is now DEFERRED, an approved scope decision, not merely an unresolved gap).
- Word Document preview — **DEFERRED to a future phase** (was reported BLOCKED pending an approved viewer/conversion integration; same reclassification).
- Excel File preview — **DEFERRED to a future phase** (same reclassification).

None of these three were implemented before or after this correction — only their classification changed, from "blocked, pending a decision" to "deferred, decision made." See §9 for the complete, current deferred-requirement list (five items total).

**Protected path:** `member-aios/mayurika-hr/staff-data/` never opened, listed, read, or referenced this session.

---

## 1. Baseline

- Branch `main`, HEAD `794da0c72aa333634695f191e673a56ab0e9f017`, `origin/main` identical — same commit as the start of the earlier session this same day; nothing was committed between sessions.
- Working tree carried forward the earlier session's uncommitted changes (advanced filters + dashboard summary) plus the 3 pre-existing unrelated untracked files. Nothing unrelated was touched.

---

## 2. Storage architecture investigation (required before any upload work)

Searched the full repository (excluding the protected path) for an already-approved persistent file-storage mechanism:

| Checked | Method | Result |
|---|---|---|
| Storage SDKs (`boto3`, Supabase client, Azure Blob SDK, Google Cloud Storage client, Cloudflare R2 client, Vercel Blob client) | `backend/requirements.txt`, `pyproject.toml` | **None present.** Only `fastapi, uvicorn, sqlalchemy, psycopg[binary], pydantic, python-dotenv, openpyxl, reportlab` (+ test-only `httpx`, `pypdf`). |
| Storage environment variables | `.env.example` and the real local `.env` (keys only, values never printed) | **None present.** Only `DATABASE_URL`, `ALLOWED_ORIGINS`, `ENVIRONMENT`, and the 6 `CALENDAR_AUTH_TOKEN_HASH_*` variables. |
| Existing upload endpoints / `UploadFile` / multipart handling | Repo-wide search across `backend/` | **None found.** No route anywhere in this FastAPI app accepts a file body. |
| Existing file-attachment DB pattern (`bytea`, blob column, storage-key column) | `database/migrations/*.sql`, `backend/models.py` | **None found.** No table in this schema stores or references binary content or a storage key. |
| Deployment filesystem persistence | `pyproject.toml` `[tool.vercel]`, existing 2026-08-10 discovery doc | Deployment target is Vercel serverless — filesystem is ephemeral/non-persistent across invocations, confirmed already in `docs/knowledge-management-discovery-2026-08-10.md` §8. |
| Repo-wide keyword sweep | `boto3\|S3_BUCKET\|supabase\|SUPABASE\|cloudflare\|R2_\|azure.*blob\|AZURE_STORAGE\|vercel.*blob\|VERCEL_BLOB\|UploadFile\|multipart\|google-cloud-storage\|storage\.googleapis\|BLOB_READ_WRITE_TOKEN` (case-insensitive) | 3 files matched — all three are `docs/*.md` files **discussing** storage as not-yet-built (this same investigation, and the 2026-08-10 discovery doc); zero matches in any `.py`, `.js`, `.sql`, or config file. |

### Conclusion

**Original finding: NEW STORAGE ARCHITECTURE DECISION REQUIRED.** No approved, persistent, production-safe file-storage mechanism exists anywhere in this repository or its runtime configuration. Per this task's own explicit stop condition ("If no persistent upload storage exists, STOP BEFORE IMPLEMENTING physical upload... Do not store uploaded production files in ephemeral Vercel/local runtime storage. Do not store arbitrary large binary files directly in PostgreSQL unless there is existing approved architecture proving this is intended"), **physical file upload was not implemented this session.** No workaround was substituted — no ephemeral-filesystem write path and no ad hoc `bytea` column were added.

**Current classification: DEFERRED to a future phase** (closure correction, same day). The user/developer has since explicitly approved deferring physical upload rather than leaving it as an open blocker requiring immediate resolution. The technical finding above is unchanged and remains the *reason* physical upload cannot be built yet — the decision to not pursue it in the current phase is the new, operative fact.

**What would unblock this (future phase):** an explicit decision + provisioning of one object-storage provider (e.g. Supabase Storage — already present as a connected-but-unauthorized MCP server in this environment per the system context, so may be the natural first candidate to evaluate — or an S3-compatible bucket / Vercel Blob), plus the corresponding SDK dependency and credential environment variable(s). Once provisioned, the canonical-record design in §3 below (same `knowledge_documents` row for both upload and link) can be implemented without further architecture rework.

---

## 3. Physical upload architecture (design only — not implemented, pending §2)

Recorded here so the eventual implementation doesn't have to re-derive it, and so this document satisfies the report's requirement to describe the intended design even though building it is blocked:

- **Same canonical record, not a second table.** `knowledge_documents` already has `source_url`/`source_url_normalized` (required, NOT NULL). The safest non-duplicating design once storage exists: keep those columns for the link case; add nullable upload-specific columns (`storage_provider`, `storage_key`, `original_filename`, `mime_type`, `file_size_bytes`) used only when the document's content source is an upload. A single `content_source` discriminator (`'link'` | `'upload'`) determines which set of fields is authoritative for a given row — this avoids two parallel document tables while keeping the existing `source_url` NOT NULL constraint compatible (an uploaded file would still get a `source_url` pointing at the storage provider's own object URL/signed-URL endpoint, keeping every existing route — list/detail/versions/audit — working unchanged).
- **No schema change was made this session** — this is a design note only, explicitly not implemented, per the storage blocker above.

---

## 4. Browser Preview — implemented this session

**File:** `web-view/js/knowledge-management.js` — new pure function `buildDocumentPreviewSpec(record)` (exported, directly unit-tested) plus a DOM-rendering function `buildPreviewSection(record)`, wired into the existing Detail modal (`renderDetailState`) immediately after the "Open Document" link. Preview only ever runs after an explicit "View" click (real detail already fetched) — never on the table/list view, so nothing is embedded or requested from a third party just by browsing the document list.

Because every current document is link-only (no upload exists yet — §2), every preview targets the document's own `source_url` directly; nothing is fetched, proxied, or cached through this application's own backend.

| Type | Implementation | Status |
|---|---|---|
| PDF | Browser-native `<iframe src={source_url}>` — no external viewer needed; modern browsers render PDF URLs natively inside an iframe. | **PASS** |
| Image | `<img src={source_url}>` | **PASS** |
| Video | `<video src={source_url} controls>` — codec/format support is left to the browser, consistent with "where MIME/source permits." | **PASS** |
| Google Sheet | Google's own edit/share URL is rewritten to Google's own `/preview` URL for the same file id (`https://docs.google.com/spreadsheets/d/{id}/preview`), rendered in a sandboxed iframe. If the URL doesn't match the expected Google Sheets URL shape, no guess is made — reported unavailable, Open Document still works. | **PASS** (where reliably transformable) |
| Google Doc | Same pattern, `https://docs.google.com/document/d/{id}/preview`. | **PASS** (where reliably transformable) |
| Google Drive File | Same pattern for both `.../file/d/{id}/...` and `.../open?id={id}` URL shapes, `https://drive.google.com/file/d/{id}/preview`. | **PASS** (where reliably transformable) |
| Word Document | No approved viewer (Microsoft Office Online embed, Google Docs Viewer, or a server-side conversion service) exists in this codebase. Explicitly reported to the user as unavailable — never rendered as a fake/broken viewer. | **DEFERRED** (closure correction, same day — explicitly approved for a future phase; originally reported BLOCKED, exact dependency unchanged: an approved third-party document-viewer integration or conversion service, none currently authorized) |
| Excel File | Same reasoning as Word. | **DEFERRED** (same reclassification, same dependency) |
| ZIP File | Per the SRD's own spec: details + download/open only, explicitly no preview. | **N/A by design (not a gap)** |
| Skill File | Format is undefined by the SRD; no safe generic preview exists for an arbitrary/unknown format. | **N/A (not in SRD's required preview list; format undefined)** |
| External URL / Internal Documentation Link | Not in the SRD's required preview list (§9 only requires PDF/Images/Google Sheets/Google Docs/Word/Excel/Videos, plus ZIP's explicit no-preview). Left as "Open Document" only, unchanged from before this session. | **N/A (out of required scope)** |

**Google access controls were not bypassed.** The `/preview` URL Google itself publishes is the same permission surface as the original share link — a viewer without access sees Google's own access-denied page rendered inside the iframe, never this application's content.

**Iframe security:** every preview iframe carries `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"` (Google's own Docs/Sheets/Drive viewer needs script execution and same-origin access to render; no `allow-top-navigation` or `allow-forms` is granted, so the embedded page can never navigate or redirect the parent tab) and `referrerpolicy="no-referrer"`. Built via `createElement`/direct property assignment throughout — no `innerHTML` for any document-authored value (title, URL), matching this module's existing convention.

**No new audit action was added for "preview" or "open."** The existing audit log is scoped to mutations only (create/update_metadata/create_version/archive/unarchive/soft_delete/restore); adding view-tracking here would effectively (partially) implement the explicitly-deferred "Most Frequently Accessed Documents" feature through the back door. Consistent with the user's deferral decision, no such tracking was added.

---

## 5. Link registration status

**Unaffected, still PASS.** No backend or schema change was made this session. Regression-covered by the full existing `CreateTests`/`ListDetailTests` suite (unchanged, still passing — see §7) plus the new Preview tests, which exercise Detail rendering against link-based fixtures of every document type.

---

## 6. Updated document type matrix

Physical Upload is **DEFERRED** for every type (closure correction, same day — explicitly approved; originally reported BLOCKED pending a storage-architecture decision, §2). Word/Excel Preview is **DEFERRED** (same correction, §4).

| Type | Registration (link) | Physical Upload | Open/Download | Preview | Version Support | Status | Evidence |
|---|---|---|---|---|---|---|---|
| Google Sheet | PASS | DEFERRED (§2) | PASS | **PASS** | PASS (link swap via explicit version) | Current | `knowledge-management.test.mjs` tests 134, 148 |
| Google Doc | PASS | DEFERRED (§2) | PASS | **PASS** | PASS | Current | test 135 |
| Google Drive File | PASS | DEFERRED (§2) | PASS | **PASS** | PASS | Current | tests 136, 137 |
| PDF | PASS | DEFERRED (§2) | PASS | **PASS** | PASS | Current | test 139 |
| Image | PASS | DEFERRED (§2) | PASS | **PASS** | PASS | Current | tests 140, 149 |
| Video | PASS | DEFERRED (§2) | PASS | **PASS** | PASS | Current | tests 141, 150 |
| Word Document | PASS | DEFERRED (§2) | PASS | **DEFERRED** (§4 — no viewer) | PASS | Current | tests 142, 151 |
| Excel File | PASS | DEFERRED (§2) | PASS | **DEFERRED** (§4 — no viewer) | PASS | Current | test 143 |
| ZIP File | PASS | DEFERRED (§2) | PASS | N/A by SRD spec | PASS | Current | tests 144, 152 |
| Skill File | PASS | DEFERRED (§2) | PASS | N/A (format undefined) | PASS | Current | test 145 |
| External URL | PASS | N/A (link-native) | PASS | N/A (not in SRD preview list) | PASS | Current | test 146 |
| Internal Documentation Link | PASS | N/A (link-native) | PASS | N/A (not in SRD preview list) | PASS | Current | (covered by the same code path as External URL) |

---

## 7. Version-history integration

**No change needed or made.** Every row above is link-based; the existing explicit version-creation flow (`POST /api/knowledge-documents/{id}/versions`) already handles "a new version replaces the current `source_url`, the old one is preserved immutably in `knowledge_document_versions`" — exactly the semantics required. Because physical upload remains DEFERRED, there is no new "uploaded-binary version" concept to reconcile with this model yet; when upload is eventually revisited, the same explicit version-creation route is the correct integration point (a new version can carry either a new `source_url` or new upload metadata, never both silently).

---

## 8. Audit integration

**No new audit action added.** All 7 existing actions (`create`, `update_metadata`, `create_version`, `archive`, `unarchive`, `soft_delete`, `restore`) remain the complete, immutable set. Preview/open is deliberately not logged (§4) — consistent with the "Most Frequently Accessed Documents" deferral.

---

## 9. Deferred requirements (explicit, per approved current-phase decision)

**Updated by closure correction (same day) — now five items, all DEFERRED, none BLOCKED, none PASS, none forgotten:**

| # | Requirement | Classification | Reason |
|---|---|---|---|
| A | Real Google Owner-Access verification for `digitweb6@gmail.com` | **DEFERRED** | User/developer explicitly deferred to a future phase. (Also independently technically blocked today — no Google API credentials exist, per the earlier 2026-08-11 audit §3.D — but the operative classification is DEFERRED, per explicit scope decision, not merely "not yet built.") |
| B | "Most Frequently Accessed Documents" dashboard widget | **DEFERRED** | User/developer explicitly deferred to a future phase. No access-tracking schema exists; none was added. |
| C | Physical file upload/storage | **DEFERRED** | User/developer explicitly deferred to a future phase (closure correction). Originally reported BLOCKED — no approved persistent storage mechanism exists anywhere in this repository (§2) — that technical finding is unchanged and is the reason the deferral was necessary, not evidence it was skipped. |
| D | Word Document browser preview | **DEFERRED** | User/developer explicitly deferred to a future phase (closure correction). Originally reported BLOCKED — no approved document-viewer/conversion integration exists (§4) — same reasoning as C. |
| E | Excel File browser preview | **DEFERRED** | User/developer explicitly deferred to a future phase (closure correction). Same reasoning as D. |

None of the five is implemented. None is labeled PASS. All five remain real SRD requirements carried forward for a future phase, not abandoned.

---

## 10. Reconciling the frontend test-count history

Multiple same-repo documents across 2026-08-10–11 report different Knowledge Management frontend test totals (55 → 87 → 110 → 112 → 135 → now 155). This is **not a discrepancy or error** — each number is an accurate point-in-time snapshot as the module grew across sequential sessions the same two days; every number was independently verified by actually running the suite at the time, not carried forward by assumption. The current, authoritative count, verified this session: **155/155** (`web-view/js/knowledge-management.test.mjs`), full frontend suite **449/449**. Older documents are left unedited as historical records (per this repo's own convention of not rewriting completed historical entries) — this section is the reconciliation.
