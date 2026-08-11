# Knowledge Management Module — SRD Compliance Audit + Safe Gap Closure

**Requirement source:** SRD PDF "Centralized Document Repository & Knowledge Management Module" (Project: Management AIOS; Requested By: Arun — Implementation Officer; supplied in-conversation, 2026-08-11). Same status as noted in `docs/knowledge-management-discovery-2026-08-10.md`: **not yet a registered Source ID** under CLAUDE.md §2 — this document does not promote it to one. Every claim below is either (a) a fact about the existing repository, verified by reading code/tests, or (b) a change made in this session, verified by running the actual test suites.

**Date:** 2026-08-11
**Status:** Audit complete. Safe, non-blocked gaps implemented, tested, and documented below. Not pushed to `origin/main`.

**Superseded-in-part notice (same day, later session):** the Approved Current-Phase Decisions in [docs/knowledge-management-preview-and-upload-scope-2026-08-11.md](knowledge-management-preview-and-upload-scope-2026-08-11.md) formally reclassify §3.D (Google Ownership) and the "Most Frequently Accessed" line of §3.L below from this document's BLOCKED framing to **DEFERRED** (an explicit, approved current-phase scope decision, not merely an unresolved technical gap) — see that document for the current, authoritative status of every requirement touched by this session and the next. §3.C/§3.H (document types / preview) are also updated there: Preview is now implemented for the technically-safe types, and physical upload was investigated and found to require a new storage-architecture decision (reported, not implemented). This document's own matrix rows are left unedited below as the historical record of what was true at 2026-08-11 (first session); do not read them as still-current without cross-checking the newer document.

**Protected path:** `member-aios/mayurika-hr/staff-data/` was never opened, listed, read, or referenced at any point in this session.

---

## 1. Starting baseline

- Branch `main`, HEAD `794da0c72aa333634695f191e673a56ab0e9f017`, `origin/main` identical (0 ahead / 0 behind) at the start of this session.
- Working tree at session start: 3 untracked files unrelated to Knowledge Management (`docs/saved-token-startup-performance-discovery-2026-08-11.md`, `validation/saved-token-startup-performance-discovery-check-2026-08-11.md`, `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md`) — none touched by this task.

---

## 2. Existing implementation reused (not rebuilt)

A prior effort on 2026-08-10 (see `docs/knowledge-management-*-2026-08-10.md` / `validation/knowledge-management-*-check-2026-08-10.md` / `handover/2026-08-10__knowledge-management-*.md`) already delivered a Phase 1 metadata/link registry, fully live against the `management_aios` Postgres schema:

- **Database** (`database/migrations/2026-08-10-create-knowledge-documents.sql`, executed and verified live — see `validation/knowledge-management-migration-execution-check-2026-08-10.md`): `knowledge_documents`, `knowledge_document_versions` (append-only), `knowledge_document_audit_log` (immutable), with CHECK constraints for `document_type` (12 values), `lifecycle_status` (Active/Archived), `compliance_status` (Pending/Completed), `google_ownership_status` (Not Applicable/Not Verified/Verified — 'Verified' unreachable by any code path), and a partial-unique index preventing duplicate active source URLs.
- **Backend** (`backend/routers/knowledge_documents.py`, `backend/routers/knowledge_document_logic.py`, `backend/schemas.py`): full CRUD — create, list/detail, metadata update, explicit version creation, archive/unarchive, soft delete, restore, deleted-list, version history, audit history. Every mutating route rejects `MD`; every route (including LIST/DETAIL, since REQ-AUTH-MODULES-007) requires the existing per-member Calendar Bearer token. `created_by`/`updated_by`/`deleted_by`/`actor_member_key` are always server-derived — no request schema accepts them.
- **Frontend** (`web-view/js/knowledge-management.js`, `web-view/css/knowledge-management.css`): whole-panel auth gate, Active/Deleted Documents toggle, search + Team + Document Type + Lifecycle Status filters, Create/Edit/Create-Version/Archive/Unarchive/Delete/Restore modals, Version History and Audit History modals, the single canonical 17-value `KM_DEFAULT_TEAMS` list.
- **Tests**: 63 backend tests (`backend/tests/test_knowledge_documents.py`), 112 frontend tests (`web-view/js/knowledge-management.test.mjs`), all passing before this session's changes.

None of this was rebuilt. This session extends it.

---

## 3. Full SRD requirement compliance matrix

Legend: **PASS** (fully satisfied and verified) · **PARTIAL** (some but not all of the requirement is met) · **MISSING** (not implemented, but implementable without a new business/infra decision) · **CONFLICT** (SRD wording conflicts with an existing, already-approved decision) · **BLOCKED** (genuinely requires an external credential, infrastructure provisioning, or business decision this session cannot make) · **FUTURE-ONLY** (SRD explicitly scopes it as future work).

### A. Centralized Repository Structure

| Requirement | Status | Notes |
|---|---|---|
| Company Documents / Team Documents / Job Role Documents / SOP Library / Skill Files / Templates / Search Documents | **PASS** (as filterable views, not folders) | Per this task's own instruction ("prefer views/filter/navigation over duplicate storage"), these are represented via `team`, `document_category` (free text), `job_role`, and `document_type` = `Skill File`, plus the Search bar — not a folder hierarchy. No duplicate storage was created. |
| 17 named SRD example teams (Management, HR Department, Website, Portfolio Holder, Graphic Design, Customer Service, Postage, Inventory, Development, Amazon, eBay, Automation, Accounting, Warehouse, Technical Support, future teams) | **CONFLICT (documented, not resolved)** | `KM_DEFAULT_TEAMS` (17 real company team values, `web-view/js/knowledge-management.js`) does not match the SRD's illustrative list 1:1 — e.g. no "HR Department," "Website Team," "Warehouse Team," or "Automation Team" entries exist in the live list; some are renamed ("Accounts Team" vs. "Accounting Team," "Graphic Designing Team" vs. "Graphic Design Team"). Per CLAUDE.md §3, **Rajiv holds canonical authority over team structure** — this was not silently rewritten. See §7 below. |
| "the ONE canonical Team source... shared standardized 17-Team dropdown" (this task's own §2 assumption) | **CORRECTED FINDING** | `KM_DEFAULT_TEAMS` is Knowledge-Management-specific, not shared app-wide. Staff Data has a separate, data-derived team concept. This was verified by code search, not assumed. |

### B. Document Registration Metadata

| Field | DB column | Backend | Frontend | Required/Optional | Status |
|---|---|---|---|---|---|
| Document Title / Heading | `title` | ✓ | ✓ | Required | PASS |
| Document Category | `document_category` | ✓ | ✓ | Optional | PASS |
| Team | `team` | ✓ | ✓ (fixed 17-value select) | Required | PASS |
| Job Role | `job_role` | ✓ | ✓ | Optional | PASS |
| Document Type | `document_type` | ✓ (12-value CHECK) | ✓ | Required | PASS |
| Google Sheet / File Link | `source_url` | ✓ (validated http/https-only) | ✓ | Required | PASS |
| Document Creator Name | `creator` | ✓ | ✓ | Optional | PASS |
| Uploaded By = authenticated user | `created_by` | ✓ server-derived, never client-supplied | display-only | Required (system) | PASS |
| Date Added / Last Updated Date | `created_at`/`updated_at` | ✓ server-derived | ✓ display | Required (system) | PASS |
| Version | `current_version` | ✓ server-managed | ✓ display | Required (system) | PASS |
| Status | `lifecycle_status` + `compliance_status` | ✓ | ✓ | Required | PASS — see §E for why this is two fields, not one |

### C. Document Type Support Matrix

See §H below (dedicated table). Summary: **registration PASS for all 12 types**; **physical upload/storage BLOCKED** (link-only by explicit prior architecture decision — no object storage exists); **open/download PASS** (external link); **preview MISSING/BLOCKED** by type (see §H).

### D. Google Ownership Business Rule

**Status: BLOCKED.** Verified this session by repository-wide search (excluding the protected path):
- `backend/requirements.txt` — no Google API client, no OAuth library.
- `.env.example` — no Google credential, OAuth client ID/secret, or service-account variable of any kind.
- No code anywhere calls a Google API, and `google_ownership_status='Verified'` is a legal DB value that **no route can ever write** (`backend/config.py` `VALID_KNOWLEDGE_GOOGLE_OWNERSHIP_STATUSES_CLIENT_SETTABLE` deliberately excludes it).

No fabricated verification was added. No manual checkbox workaround was substituted for the requirement. The dashboard's "Google Sheets Without Verified Owner Access" widget (added this session, §5) reports the real, current, always-unverified state honestly rather than pretending a check occurred.

**Exact external dependency needed to close this:** a Google Cloud project + service account (or domain-wide delegation) with at minimum `drive.metadata.readonly` scope, to call `permissions.list` and check for `role: owner` against `digitweb6@gmail.com`. Also unresolved: Shared Drive files have no single individual owner, so the SRD's per-user Owner-Access rule may not apply uniformly — a business clarification, not just a technical one.

### E. Status Model

**Status: PASS.** `lifecycle_status` (Active/Archived) and `compliance_status` (Pending/Completed) are two independent, already-implemented columns — this is the correct resolution of the SRD's own §4/§6/§17 terminology ambiguity (flagged as open in `docs/knowledge-management-discovery-2026-08-10.md` §14, resolved during the 2026-08-10 CRUD design). Nothing was collapsed or re-modeled this session.

### F. Team-wise Library

**Status: PASS** for filtering mechanics (Team filter already existed and works). See §A for the separate, documented naming-taxonomy discrepancy.

### G. Search and Filter — extended this session

| SRD field | Status before this session | Status after |
|---|---|---|
| Document Title | PASS (search) | PASS |
| Team | PASS | PASS |
| Document Type | PASS | PASS |
| Status (lifecycle) | PASS | PASS |
| Document Creator | MISSING | **PASS** — new `creator` filter (partial match) |
| Uploaded By | MISSING | **PASS** — new `created_by`/"Uploaded By" filter (exact match, member-registry-driven select) |
| Job Role | MISSING | **PASS** — new `job_role` filter (partial match) |
| Version | MISSING | **PASS** — new `version` filter (exact match) |
| Compliance Status | MISSING | **PASS** — new `compliance_status` filter |
| Created Date | MISSING | **PASS** — new `created_from`/`created_to` date-range filter |
| Last Updated Date | MISSING | **PASS** — new `updated_from`/`updated_to` date-range filter |

Every new filter maps onto an existing `knowledge_documents` column — no schema change was needed.

### H. Preview

**Status: MISSING/BLOCKED — not implemented this session.** No in-app preview exists for any document type. Rationale for leaving this blocked rather than partially building it: documents are pure external links (no binary storage — see §C), and embedding arbitrary external URLs in an iframe is a real security-review surface (`X-Frame-Options`/CSP vary per target site and were already flagged as unsafe-to-assume in the 2026-08-10 discovery). This was scoped as Phase 4 (after storage) in the original architecture plan and remains correctly deferred.

| Type | Register | Upload | Open/Download | Preview | Status |
|---|---|---|---|---|---|
| Google Sheet/Doc/Drive File | PASS | N/A (link-only) | PASS (external link) | MISSING | Preview would need Google's embed URL pattern + interacts with the BLOCKED §D ownership rule |
| PDF | PASS | BLOCKED (no storage) | PASS | MISSING | Native-browser-capable in principle; not built |
| Word/Excel | PASS | BLOCKED (no storage) | PASS | BLOCKED | No conversion/viewer service exists |
| ZIP | PASS | BLOCKED (no storage) | PASS | N/A by SRD's own spec (download only) | Matches SRD |
| Skill File | PASS | BLOCKED (no storage) | PASS | MISSING | Format not defined by SRD |
| Image | PASS | BLOCKED (no storage) | PASS | MISSING | Native-browser-capable in principle; not built |
| Video | PASS | BLOCKED (no storage) | PASS | MISSING | Native-browser-capable in principle; not built |
| External URL / Internal Documentation Link | PASS | N/A | PASS | N/A (open in new tab) | — |

### I. Upload / Change Tracking

**Status: PASS.** `created_by`/`updated_by`/`updated_at`, plus `knowledge_document_versions.change_note`, already provide everything the SRD asks for. Nothing duplicated.

### J. Audit Log

**Status: PASS.** Immutable, 7-action audit log already existed and was reused (not touched) — extended only by reading from it (the new dashboard's "Recent Updates" widget, §5).

### K. Soft Delete

**Status: PASS.** No hard-delete route exists anywhere; already fully implemented (delete/deleted-list/restore/audit).

### L. Dashboard Widgets — new this session

New `GET /api/knowledge-documents/summary` endpoint + frontend dashboard. Every figure is computed live from `knowledge_documents`/`knowledge_document_versions`/`knowledge_document_audit_log` — nothing is cached or fabricated.

| Widget | Source | Status |
|---|---|---|
| Total Documents | count, active scope | **PASS** |
| Documents by Team | `GROUP BY team`, active scope | **PASS** |
| Recently Added Documents | `ORDER BY created_at DESC LIMIT 5` | **PASS** |
| Recently Updated Documents | `ORDER BY updated_at DESC LIMIT 5` | **PASS** |
| Google Sheets without Owner Access | count of active Google-type docs where `google_ownership_status != 'Verified'` (currently all of them — honest, not fabricated) | **PASS** (reports real BLOCKED state) |
| Recent Updates | audit log, joined to document title, newest 10 | **PASS** |
| Most Frequently Accessed Documents | — | **NOT IMPLEMENTED** (user declined this option — no view/access tracking exists; would require new schema) |
| Documents Missing Creator Information | count where `creator IS NULL` | **PASS** |
| Archived Documents | count where `lifecycle_status='Archived'` | **PASS** |
| Pending Documents | count where `compliance_status='Pending'` | **PASS** |
| Latest Version Updates | `knowledge_document_versions ORDER BY created_at DESC LIMIT 5` | **PASS** |

### M. Authentication / User Attribution

**Status: PASS.** Reused verbatim — no second auth system. `created_by`/`updated_by`/`deleted_by` are always derived from the verified Bearer-token identity server-side.

### N. Future AI Readiness

**Status: FUTURE-ONLY, correctly not implemented.** No AI/OCR/Knowledge Graph feature was built. Architecture assessment: `document_type`/`team`/`job_role` are already structured (not free-text-only) columns, which keeps a future smart-search/keyword-extraction layer viable without a redesign.

---

## 4. Duplicate-truth check

Before every change, the existing `knowledge_documents`/`knowledge_document_versions`/`knowledge_document_audit_log` schema was checked first. No new table, no new document/version/audit storage, and no second Team list was created. The only schema-adjacent addition is a response-shape-only Pydantic model (`KnowledgeDocumentSummaryResponse` and its two small nested models) — these compute from existing tables at request time; nothing is persisted.

---

## 5. What was implemented this session

**Backend** (`backend/schemas.py`, `backend/routers/knowledge_documents.py`, `backend/tests/test_knowledge_documents.py`):
1. Extended `_apply_filters` and the `GET /api/knowledge-documents` LIST route with `compliance_status`, `creator`, `job_role`, `created_by`, `version`, `created_from`, `created_to`, `updated_from`, `updated_to` — completing SRD §9.
2. New `GET /api/knowledge-documents/summary` route (registered before `/{document_id}`, same static-before-dynamic convention as `/deleted`) — completing SRD §13, minus "Most Frequently Accessed" (declined).
3. 17 new backend tests (`AdvancedFilterTests`, `SummaryTests`).

**Frontend** (`web-view/js/knowledge-management.js`, `web-view/css/knowledge-management.css`, `web-view/js/knowledge-management.test.mjs`):
1. A collapsible "More Filters" panel (Document Creator, Uploaded By [member-registry-driven, MD excluded], Job Role, Version, Compliance Status, Created/Updated date ranges), reusing existing `.msc-km-filter-field`/`.msc-km-select`/`.msc-km-input` styling.
2. A new dashboard widgets region (stat tiles + Documents by Team / Recently Added / Recently Updated / Recent Updates / Latest Version Updates cards), refreshed on mount and after every mutation.
3. 23 new frontend tests (advanced filters + dashboard widgets, including empty/error/retry states and the "unauthenticated mount never calls the summary endpoint" auth-gate guarantee).

**Nothing else changed.** No Google integration, no binary storage, no preview, no access-tracking, and no Team taxonomy edit were attempted.
