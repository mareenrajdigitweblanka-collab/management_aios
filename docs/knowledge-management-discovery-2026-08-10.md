# Knowledge Management Module — Discovery Report

**Requirement ID:** REQ-KM-001
**Requirement:** Centralized Document Repository & Knowledge Management Module
**Requested By:** Arun — Implementation Officer
**Prepared For:** Mareenraj (Automation Team)
**Date:** 2026-08-10
**Status:** DISCOVERY ONLY — read-only architecture assessment. Nothing was implemented, migrated, or deployed.
**Source of this discovery:** SRD PDF supplied in-conversation, "Centralized Document Repository & Knowledge Management Module" (Project: Management AIOS). Not yet a registered Source ID under CLAUDE.md §2 — this discovery does not promote it to one.

**Protected path:** `member-aios/mayurika-hr/staff-data/` was never opened, read, listed, or referenced during this discovery.

**Live `management_aios` PostgreSQL inspection: NOT COMPLETED.** The connector/database access needed to query the Management AIOS's own live database was unavailable and unauthorized in this session. Every finding in this report about `management_aios` is derived from static inspection of repository code (SQLAlchemy models, tracked migration SQL) only — not a live query. See §5a and §16.

---

## 1. Purpose

Determine how the SRD's Knowledge Management module (Company/Team/Job-Role Documents, SOP Library, Skill Files, Templates, Search Documents) can be safely added to the Management AIOS without creating duplicate document truth or duplicating existing functionality — before any schema, backend, or frontend work begins.

---

## 2. Repository State (read-only)

- Branch: `main`, HEAD `d71455a1d79a46b870c092ec04cc1cae741566e9`, `origin/main` identical (0 ahead / 0 behind).
- Pre-existing working-tree state (present before this discovery started, not created by it): `web-view/css/issues.css` modified (the on-hold Issues toolbar-layout task), and one pre-existing untracked validation file. Neither was opened, read for content changes, or touched by this discovery.
- No files were created, modified, or deleted outside the two discovery documents below.

---

## 3. Existing Frontend Assets

- **Navigation shell:** `web-view/js/navigation.js` is a single generic controller driving every `.app-nav-btn` / `.tab-panel` pair via `data-tab` — no per-tab hardcoded switch/case. A new Knowledge Management tab would plug into this exact pattern (one nav button + one panel) without touching existing tab logic.
- **File Map tab** (`web-view/index.html`, `#tab-file-map`): a **static, hand-authored HTML reference** of repository folders/files. Its own copy states: *"This is a static snapshot; it does not scan the live repository."* It has no metadata fields, no upload path, no search backend, no versioning, no audit log — it is a documentation/navigation aid, not a document management system.
- **Data module = Staff Data tab** (`web-view/js/staff-data.js`), backed by `GET /api/staff` — a read-only, searchable/filterable table (team, staff_status, employment_stage, location, free-text search) sourced from the backend. This is the closest existing precedent for a searchable, filterable records table.
- **No existing document/file/evidence/search UI** exists beyond the two above.
- **Reusable UI primitives:** `web-view/js/ui/{dialog.js, popup.js, toast.js, loading.js, form-feedback.js, error-mapper.js, scroll-lock.js}` — generic modal/toast/loading/error-mapping helpers already shared across Calendar, Issues, and Review Summaries. `web-view/css/components.css` — shared card/table/badge classes.
- **No file preview component** exists anywhere in the frontend today.
- **No dynamic "open external URL" behavior** exists beyond plain `<a href>` tags used statically in File Map.
- **Identity available to the frontend:** no general login/session system. Identity is feature-scoped: a per-member Bearer token (Calendar auth) resolved to a display identity via `web-view/js/member-registry.js` (`MEMBER_REGISTRY`: mayurika, suman, arun, rajiv, paraparan, plus read-only `md`). `web-view/js/issues.js` already reuses `MEMBER_REGISTRY` + `GET /api/staff/filter-options` for its own assignee/team pickers (see the recent "Use system staff and teams in Issues UI" commit) — this is the direct precedent for KM's Creator/Uploaded-By/Team fields.

**Could Knowledge Management reuse an existing module?** Partially — the navigation shell, UI primitives, and member/staff identity sources are directly reusable. There is no existing document CRUD/search backend to reuse; that part is net-new.

**Does File Map already overlap with this requirement?** No functional overlap (File Map is static, unmanaged, unsearched-by-backend, unversioned). There is conceptual overlap in *purpose* ("where do I find documents"). File Map was explicitly not modified in this discovery per the task's constraints; any future consolidation decision is a separate business call, not made here.

---

## 4. Existing Backend Assets

- **Routers:** `calendar_auth.py`, `leave_logic.py`, `member_leave.py`, `member_schedules.py`, `staff.py`, `staff_review_summaries.py`. No `documents`/`files`/`attachments`/`evidence`/`uploads`/`storage`/`knowledge` router exists.
- **Models** (`backend/models.py`, all in Postgres schema `management_aios`): `MemberScheduleEvent`, `MemberLeaveRecord`, `StaffDashboardRecord`, `StaffReviewSummary`. None represent documents, files, attachments, or links.
- **Targeted search** for `UploadFile`, `multipart`, `boto3`, `S3`, Google Drive/OAuth/service-account patterns across `backend/`: **zero matches.**
- **Dependencies** (`backend/requirements.txt`): `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg[binary]`, `pydantic`, `python-dotenv`, `openpyxl`, `reportlab`, plus test-only `httpx`/`pypdf`. No Google API client (`google-api-python-client`, `google-auth*`), no cloud storage SDK (`boto3`, Supabase client, etc.).
- **Environment variables** (`.env.example`, `backend/config.py`): `DATABASE_URL`, `ALLOWED_ORIGINS`, `ENVIRONMENT`, `CALENDAR_AUTH_TOKEN_HASH_{MAYURIKA,SUMAN,ARUN,RAJIV,PARAPARAN}` (required), `CALENDAR_AUTH_TOKEN_HASH_MD` (optional). No storage or Google credential variables exist anywhere.
- No backend file was opened for editing; this section is inspection only.

---

## 5. PostgreSQL — Read-Only Discovery

Two distinct databases are relevant to this repository, and only one was reachable in this session.

### 5a. `management_aios` (Neon — the Management AIOS's own database, `DATABASE_URL`)

**Live inspection status: NOT COMPLETED.** No live MCP/tool connection to this specific database was available or authenticated in this session (the `claude.ai postgres` connector requires authorization the user has not yet granted here). No `SELECT`, no schema introspection, and no row-level query of any kind was run against this database in this session.

Everything below is instead derived from **static analysis of `backend/models.py` and `database/migrations/*.sql` only** — i.e. what the tracked source code says the schema should contain, not a live query of what the schema actually contains today:

- Tracked ORM models / migration files describe: `member_schedule_events`, `member_leave_records`, `staff_dashboard_records`, `staff_review_summaries`. None are document/file/attachment/evidence-related.
- No table named anything resembling `document`, `knowledge`, `repository`, `attachment`, or `link` appears in the tracked migration history.

**Existing Management AIOS document/storage truth:** no document repository or document-storage truth was found in the inspected repository code or static assets (frontend, backend, tracked migration SQL — §§3–5a). **Live database state remains unverified** — an unmigrated, undocumented, or manually-created table in the live `management_aios` database (one that has no corresponding file in this repository) cannot be ruled out from static analysis alone. This gap closes only once the live database is inspected read-only in a future, properly authorized session.

### 5b. `ledsone` (company operational database — reached via `mcp__ledsone__*`, authenticated, read-only queries only)

137 tables across schemas: `accounting`, `amazon_campaigns`, `amazon_fba`, `business_reports`, `configurator`, `customer_service`, `customers`, `ebay_campaigns`, `employee_management`, `google_ads`, `google_analytics`, `google_search_console`, `inventory`, `listings`, `order_management`, `public`, `staff`, `suppliers`. **No `management_aios` schema exists in this database** — it is confirmed to be a separate system from the Management AIOS's own backing store.

The only document-shaped table found: **`suppliers.supplier_documents`** (288 rows) — a narrow supplier-compliance file registry (`document_type` ENUM: gpsr_label / instruction_manual / inspection_checklist; `marketplace` ENUM: UK/US/Germany; `file_name`, `file_url`, `temp_url`, `file_size`, `mime_type`, `description`, `created_at`, `updated_at`). This table exists in a separate operational database (`ledsone`) and a separate business domain (supplier compliance) from the Management AIOS. **It is not proposed for reuse or modification by REQ-KM-001.** It is recorded here only as an **external overlap signal** — a naming-convention data point (`file_url` + `file_name` + `mime_type` + `document_type` columns) — not as a resolution of the duplicate-truth question in §6, which concerns the (unverified — see §5a) live `management_aios` database, not `ledsone`.

Only `SELECT`/introspection statements were run. No `INSERT`/`UPDATE`/`DELETE`/`CREATE`/`ALTER`/`DROP` was executed at any point.

---

## 6. Source-of-Truth Assessment

The SRD states the module "shall serve as the organization's Single Source of Truth." This wording is **not** treated here as permission to duplicate documents that already have an authoritative home elsewhere (e.g., HR-owned PDPA-controlled documents are explicitly out of scope for duplication under CLAUDE.md §6).

| Option | Description | Assessment |
|---|---|---|
| A | Metadata + authoritative external link only | Safe, but doesn't satisfy the SRD's binary-upload requirement (PDF/Word/Excel/ZIP/images/videos). |
| B | Metadata + uploaded physical files | Not currently buildable safely — see §8 (no storage mechanism exists). |
| **C — Recommended** | **Hybrid:** external cloud documents (Google Sheets/Docs/Drive files, external URLs) stay externally stored, with Management AIOS holding canonical metadata + link + version/audit state; uploaded binaries use a to-be-approved managed object-storage layer, with Management AIOS storing metadata + a storage reference, never raw bytes in Postgres. | Matches what the SRD actually asks for and what this codebase can safely support without inventing new infrastructure at this stage. |

**Duplicate-truth conclusion:** no direct duplicate collision was found in the repository assets inspected in this session (frontend, backend, tracked migration SQL — §§3–5). This is **not** a clearance. **Duplicate-truth risk remains OPEN** until both of the following occur:

1. The live `management_aios` database is inspected read-only (§5a — not completed in this session), confirming no undocumented document/storage table already exists there; and
2. The final source-of-truth/storage architecture (the Option A/B/C choice above) is reviewed and approved by Arun (requester).

"Single Source of Truth" (the SRD's own wording) is read here as a candidate interpretation only — *metadata + audit trail is the source of truth*, not *physical content copy is the source of truth* — and is not adopted as confirmed architecture until Arun signs off.

---

## 7. Google Ownership Rule Feasibility (§6 of the SRD)

**Verdict: BLOCKED** (currently).

| Question | Finding |
|---|---|
| Google Drive API integration present? | No. |
| OAuth/service-account config present? | No — nothing in `.env.example` or `backend/config.py`. |
| Can the system verify file permissions today? | No. |
| Can it distinguish Owner from Editor/Viewer? | No — no code path calls the Drive API at all. |
| Can ownership be verified for arbitrary Google links? | No. |
| Shared Drive complication? | Files native to a Shared Drive have no single individual owner (the Drive itself is the effective owner) — the SRD's per-user Owner-Access rule as written may not apply uniformly to Shared Drive files; this needs a business clarification, not just a technical fix. |
| Credentials/scopes that would be required later | A Google Cloud project + service account (or domain-wide delegation), at minimum `drive.metadata.readonly` to call `permissions.list` and check for `role: owner`; broader `drive.readonly` if content itself must ever be fetched. None of this exists today and none was requested or implemented in this discovery. |

This rule is not claimed to be technically enforceable at this time. It becomes feasible only after a Google Cloud credential/scope decision is made and approved — a future infrastructure decision, not this discovery's output.

---

## 8. Document/Binary Storage Feasibility

No approved binary-upload mechanism exists in this codebase.

- No `boto3`/S3 SDK, no Supabase storage client, no `bytea`/blob column pattern anywhere in `database/*.sql` or `backend/models.py`.
- No local-filesystem write path exists in the FastAPI backend.
- Deployment is Vercel (`ALLOWED_ORIGINS` defaults to `https://management-aios.vercel.app`). Vercel serverless functions have an ephemeral, non-persistent filesystem — writing uploaded binaries to local disk would not survive across invocations/deployments and is unsafe.
- Storing binary content directly in Postgres (`bytea`) is technically possible but unprecedented anywhere in this schema, and would bloat the Neon database and complicate backups.

**Conclusion:** storing PDFs/Word/Excel/ZIP/images/videos directly inside the current application deployment is **not safe today**. It requires an explicitly approved external object-storage service (e.g., Supabase Storage, an S3-compatible bucket) — an infrastructure decision outside this discovery's scope.

---

## 9. Existing Staff / Team / Role / Uploader Sources

- **Staff/team/role (backend, authoritative read-only projection):** `backend/routers/staff.py` → `GET /api/staff`, `GET /api/staff/summary`, `GET /api/staff/filter-options` (live distinct `teams`, `staff_statuses`, `employment_stages`, `locations`), backed by `StaffDashboardRecord` (`management_aios.staff_dashboard_records`). HR remains the authoritative source per CLAUDE.md §9.1; this is a controlled read-only dashboard projection, not a replacement HR master.
- **Job role:** `StaffDashboardRecord.designation`, exposed via `StaffRecordOut`.
- **Management Team member identity (5 members + optional MD):** backend `backend/config.py` `MEMBER_DIRECTORY`/`MEMBER_LABELS`; frontend `web-view/js/member-registry.js` `MEMBER_REGISTRY` — already reused by `web-view/js/issues.js`.
- **Recommendation:** the SRD's example "Uploaded By" name list (Rajiv, Arunraj, Mayurika, Suman, Paraparan, Arun) must **not** be hardcoded into a new module — it should resolve from these existing sources, matching how `issues.js` already does it.
- **Logged-in uploader:** there is **no general-purpose login/session system** in this codebase. Identity is feature-scoped, per-member Bearer tokens (Calendar auth: `backend/routers/calendar_auth.py`, `CALENDAR_AUTH_TOKEN_ENV_VARS`). The SRD's "Auto (Logged-in User)" field assumes a session concept that does not yet exist for a general Knowledge Management area. **Open business/architecture decision:** extend the existing per-member token model to KM, or design a new shared identity check. Not resolved here.

---

## 10. Version Model

Existing convention across every mutable table in `management_aios` (`MemberScheduleEvent`, `MemberLeaveRecord`, `StaffReviewSummary`): `created_by`/`updated_by` (free text or member_key), `created_at`/`updated_at` (server-default `now()`), `deleted_at` (nullable soft-delete signal). No version-number column exists anywhere yet — `StaffDashboardRecord.source_status` (`imported`/`superseded`) is a narrower, distinct import-supersession flag, not a general version counter.

**Proposed (conceptual only, not implemented):** an integer or `Vn.n` version counter per document row, bumped on every metadata/link/file change, with a separate append-only `document_versions`-style history table (mirroring the SRD's own audit-log requirement) rather than overwriting version history in place.

**Flagged as an unresolved business decision (per SRD ambiguity):** whether a new version should represent (a) a metadata-only change, (b) a linked-document revision, (c) an uploaded-file replacement, or (d) all of the above. Needs Arun's confirmation before any schema is drafted.

---

## 11. Soft Delete

Established, repo-wide convention: nullable `deleted_at TIMESTAMPTZ` column; a row is active iff `deleted_at IS NULL`; every existing router filters on this (or the narrower `is_current` flag used only by `StaffDashboardRecord`). **Recommendation:** reuse this exact `deleted_at` convention for Knowledge Management rather than inventing a new delete/status flag — this directly satisfies the SRD's "documents shall not be permanently deleted" requirement using an already-proven pattern.

---

## 12. Preview Feasibility Matrix

| Type | Classification | Note |
|---|---|---|
| PDF | NATIVE BROWSER | Standard `<iframe>`/`<object>` PDF rendering. |
| Images | NATIVE BROWSER | `<img>`. |
| Google Sheets | EMBED/EXTERNAL VIEWER | Google's own embed URL; depends on the file's sharing state and interacts with §7's ownership rule. |
| Google Docs | EMBED/EXTERNAL VIEWER | Same as above. |
| Word (.docx) | SERVER CONVERSION NEEDED | No native browser rendering exists in this stack; would need an Office/Google viewer proxy or server-side conversion — none exist today. |
| Excel (.xlsx) | SERVER CONVERSION NEEDED | Same reasoning as Word. |
| Videos | NATIVE BROWSER | `<video>`, subject to codec/format support. |
| ZIP | DOWNLOAD ONLY | SRD itself specifies this. |
| Skill Files | UNKNOWN | Format not defined by the SRD; likely Markdown/text based on this repo's existing `skills/` convention, but not confirmed. |
| External URLs | Effectively "open in new tab" | Embeddability depends on the target site's own `X-Frame-Options`; not reliably safe to assume iframe embedding for arbitrary external links. |

No preview functionality was implemented in this discovery.

---

## 13. Permission-Model Gaps (unresolved business decisions)

The SRD does not define who may: register, edit metadata, upload/replace files, create new versions, archive, restore, view all documents, view team-restricted documents, or view confidential documents. No RBAC/permission system exists in this codebase beyond per-member Calendar auth, which proves *identity* ("you are this specific person"), not *authorization* ("you may do X"). Per CLAUDE.md §13, this discovery does not invent any authority, approval chain, or permission logic — these are flagged as open questions for Arun (and likely MD/Varmen per standard AIOS governance) to resolve before implementation.

---

## 14. Status-Model Ambiguity

The SRD uses "Active"/"Archived" (§4 registration form) alongside "Pending"/"Completed" (§6 Google-ownership gating, §17 acceptance criterion 5) — these read as two different concepts under one word:

1. A lifecycle/visibility state — Active / Archived (naturally pairs with the soft-delete convention in §11).
2. A completion/compliance gate — Pending vs. Completed, specifically about the Google Owner-Access check.

**Minimum business decision needed:** confirm whether "Completed" is a separate compliance-status field from "Active/Archived," or whether the SRD intends one combined enum. No status model was built in this discovery — this ambiguity must be resolved by Arun first.

---

## 15. Future AI-Readiness Metadata (conceptual only)

Without implementing any AI feature, if/when a KM schema is eventually designed it should avoid free-text-only fields for facets a future search/AI layer will need to join against — specifically:

- Canonical title/heading and free-text description (already SRD-mandated).
- `document_type`/category and team/job-role tags as structured, foreign-keyed values (joined to the existing staff/team source in §9), not free text — this is what makes future smart search, keyword extraction, and related-document recommendations possible without a redesign.
- A content-hash or last-modified fingerprint per version, to support future duplicate-document detection without needing OCR/content parsing yet.

No AI feature, index, or embedding pipeline was designed or implemented — this section is a forward-compatibility note only.

---

## 16. Known Limitations of This Discovery

- **Live `management_aios` PostgreSQL inspection: NOT COMPLETED.** The Management AIOS's own Postgres database (Neon) was not queried live in this session — connector access was unavailable/unauthorized. Findings about it (§5a) are static-analysis-only (models + migration SQL) and cannot rule out drift, an undocumented table, or a manually-created object that has no corresponding file in this repository. A future session with the `claude.ai postgres` connector authorized must run this live inspection before the duplicate-truth question (§6) can be closed.
- Skill File format, and several SRD-example teams (e.g. "Graphic Design Team," "Warehouse Team") were not cross-checked against the live `department_team` values returned by `/api/staff/filter-options` — do not assume the SRD's team list and the live staff data's team list are identical without checking.
- No user interviews were conducted as part of this discovery; all permission/status/version ambiguities in §§10, 13, 14 remain genuinely open.

---

## 17. Proposed Architecture Summary (conceptual, not implemented)

1. New `management_aios.km_documents` table (name illustrative only) following the exact `created_by/updated_by/created_at/updated_at/deleted_at` convention already used by every other table in this schema (§10–§11), plus the SRD's mandatory metadata fields, plus structured (not free-text) team/category/job-role foreign keys (§15).
2. A new, append-only `km_document_versions`-style table for version history, mirroring the SRD's audit-log requirement, once §10's version-semantics question is answered.
3. Hybrid storage per §6 Option C: link-only for Google/external documents now; binary uploads deferred until an object-storage service is approved (§8).
4. Google Owner-Access verification deferred until Google API credentials/scopes are approved (§7) — not enforced at launch; the SRD's §6 rule can only be a manual/informational field until then.
5. New backend router + frontend tab following the existing `staff.py`/Staff-Data-tab and `navigation.js` patterns, reusing `member-registry.js`/`/api/staff/filter-options` for identity and team/role data (§3, §9) rather than hardcoding lists.
6. Preview support built incrementally per §12's matrix — native-browser types (PDF/images/video) first; conversion-dependent types (Word/Excel) deferred.

---

## 18. Implementation Phases (proposed, not started)

| Phase | Scope | Blocked by |
|---|---|---|
| 0 | Business decisions: source-of-truth interpretation (§6), permission model (§13), status model (§14), version semantics (§10), storage-service selection (§8), Google credential decision (§7) | Arun / MD sign-off |
| 1 | Metadata-only registry (link-based documents only; no binary upload; no Google ownership check) | Phase 0 decisions |
| 2 | Google ownership check (informational/manual first, automated once credentials exist) | Phase 0 §7 decision + credentials |
| 3 | Binary upload via approved object storage | Phase 0 §8 decision + storage provisioning |
| 4 | Preview functionality per §12 | Phases 1–3 |
| 5 | AI-readiness features (§15) | Phases 1–4 complete and stable |

---

## 19. PASS / AMBER / BLOCKED

**AMBER.** Discovery is complete for the repository assets that were reachable in this session, and no unsafe action was taken. The module cannot proceed to implementation until the Phase 0 business decisions in §18 are made — most critically the Google ownership feasibility (§7 — BLOCKED), binary storage mechanism (§8 — BLOCKED), and the duplicate-truth risk (§6 — OPEN, pending the live `management_aios` inspection that was not completed this session, §5a).

---

## 20. One Next Step

Arun (requester) reviews §6 (source-of-truth interpretation — duplicate-truth risk OPEN), §7 (Google ownership — currently BLOCKED), §8 (storage — currently BLOCKED), §10 (version semantics), §13 (permission model), and §14 (status model) and provides explicit decisions on each; in parallel, the live `management_aios` database should be inspected read-only (§5a, §16 — not completed this session) before any schema or code is drafted.
