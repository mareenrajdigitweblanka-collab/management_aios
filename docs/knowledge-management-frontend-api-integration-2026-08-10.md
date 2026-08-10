# Knowledge Management — Frontend API Integration (REQ-KM-UI-004)

**Date:** 2026-08-10
**Requirement:** REQ-KM-UI-004 — replace the temporary Knowledge Management "Company Documents" frontend registry with the real, persistent Knowledge Management CRUD API and expose the CRUD workflows to authenticated Management Team users.
**Scope:** Frontend integration only. No backend, schema, or migration changes were made or required.
**Backend API used:** `backend/routers/knowledge_documents.py`, commit `1e3d433` — "Implement Knowledge Management backend CRUD API" (REQ-KM-CRUD-003).
**Live table source:** `database/migrations/2026-08-10-create-knowledge-documents.sql`, executed against the live `order_management_copy` database, schema `management_aios` (REQ-KM-CRUD-002).

> **RESOLVED 2026-08-10 by REQ-KM-UI-005:** §5's "Restore — explicitly not built" and §9 item 1's "blocked" status below are historical — they described the state as of THIS task's completion. REQ-KM-UI-005 (same day, later task) closed that gap with a new backend route (`GET /api/knowledge-documents/deleted`) and a full Deleted Documents / Restore UI. This section is preserved unedited as the historical record of what REQ-KM-UI-004 itself shipped; see [docs/knowledge-management-restore-detail-closure-2026-08-10.md](knowledge-management-restore-detail-closure-2026-08-10.md) for the current, resolved state and current test totals (this file's §8 counts are also a historical snapshot, not the current total).

---

## 1. What changed

The Knowledge Management "Company Documents" view (`web-view/js/knowledge-management.js`) was previously a static, first-usable-implementation view backed by a hardcoded `APPROVED_DOCUMENTS` array of exactly 3 sample document records, with a visible "Sample documents" notice. That entire static registry and its notice have been removed. The module is now wired end-to-end to the live backend CRUD API — the API response is the only source of truth; there is no fallback to sample/static data on any failure.

| File | Change |
|---|---|
| `web-view/js/config.js` | Added `KNOWLEDGE_DOCUMENTS_API_BASE` (host-detection pattern, matching every other domain's API base constant in this file). |
| `web-view/js/knowledge-management.js` | Fully rewritten. Static registry and sample notice removed. Added a centralized API client, list/loading/empty/error states, server-side filters, Create/Detail/Edit/Version modals, Archive/Unarchive/Delete actions, read-only Version and Audit history viewers, and auth-aware error handling. |
| `web-view/css/knowledge-management.css` | Removed the now-dead `.msc-km-sample-notice` rule. Added rules for the new loading/error states, modal forms, detail view, and history viewers. |
| `web-view/js/ui/error-mapper.js` | Added 4 Knowledge Management-specific entries to `KNOWN_ERRORS`: `knowledge_document_duplicate_source_url`, `knowledge_document_already_archived`, `knowledge_document_already_active`, `knowledge_document_read_only_member`. |
| `web-view/index.html` | No structural change — the existing `#tab-knowledge-management` panel and `#knowledgeManagementWorkspace` mount point are reused as-is. Only the explanatory HTML comment above the panel was updated to reflect the current integrated state. |
| `web-view/js/knowledge-management.test.mjs` | Fully rewritten — 55 tests covering the real API-integrated behavior, replacing the prior static-registry test suite. |

## 2. API endpoints integrated

All 11 backend routes under `/api/knowledge-documents` (`KNOWLEDGE_DOCUMENTS_API_BASE`) are wired:

| Method | Path | Auth | Frontend usage |
|---|---|---|---|
| GET | `/api/knowledge-documents` | Public | List, with `search`/`team`/`document_type`/`lifecycle_status`/`limit`/`offset` query params |
| GET | `/api/knowledge-documents/{id}` | Public | Not currently called directly — detail modal uses the already-fetched list row |
| POST | `/api/knowledge-documents` | Bearer token | Create Document modal |
| PATCH | `/api/knowledge-documents/{id}` | Bearer token | Edit Metadata modal |
| POST | `/api/knowledge-documents/{id}/versions` | Bearer token | Create New Version modal |
| POST | `/api/knowledge-documents/{id}/archive` | Bearer token | Archive action (behind confirmation) |
| POST | `/api/knowledge-documents/{id}/unarchive` | Bearer token | Unarchive action |
| DELETE | `/api/knowledge-documents/{id}` | Bearer token | Soft Delete modal (requires a reason) |
| POST | `/api/knowledge-documents/{id}/restore` | Bearer token | Client function exists (`restoreKnowledgeDocument`) but has **no UI entry point** — see §5 |
| GET | `/api/knowledge-documents/{id}/versions` | Bearer token | Version History viewer (read-only) |
| GET | `/api/knowledge-documents/{id}/audit` | Bearer token | Audit History viewer (read-only) |

Auth model matches the backend exactly: LIST and single-document GET are public (no token required, same shape as Task/Leave); every mutation and both history-read routes require the existing Calendar member Bearer token.

## 3. Authorization

The existing Calendar member-token system (`web-view/js/calendar/auth.js`) is reused verbatim — there is no second, Knowledge-Management-specific auth system. `ensureAuthorized()` is called before any protected request; if no verified token is stored, the existing token-entry dialog opens. On a 401 (expired/invalid token), the stored token is cleared and the user is prompted to re-authorize. On a 403 from an MD (read-only) token attempting a mutation, the backend's `knowledge_document_read_only_member` error code is mapped to a clear, non-generic message via `ui/error-mapper.js`.

## 4. Data flow

- On mount, `loadDocuments()` calls the live LIST endpoint. There are four render states: `loading`, `data`, `empty` (zero records, no active filters), and `error` (API failure — never silently falls back to a static list).
- Filters (search, team, document type, lifecycle status) are all sent server-side as query parameters and combined with AND semantics; there is no client-side re-filtering of an already-fetched list.
- A monotonically increasing `state.requestId` guards against a slow, superseded request overwriting a newer one (e.g., typing quickly in the search box).
- Every successful mutation (create, edit, version, archive, unarchive, delete) triggers a fresh `loadDocuments()` call so the list always reflects server state — there is no local, optimistic list mutation.

## 5. Restore — explicitly not built (documented limitation, HISTORICAL — see note below)

> **RESOLVED 2026-08-10 by REQ-KM-UI-005** — this entire section describes the state as it was when REQ-KM-UI-004 shipped, preserved as a historical record. Restore now has a full UI. See [docs/knowledge-management-restore-detail-closure-2026-08-10.md](knowledge-management-restore-detail-closure-2026-08-10.md).

The backend's `POST /api/knowledge-documents/{id}/restore` route exists, and the frontend API-client function `restoreKnowledgeDocument(id)` was implemented for future use, but **no Restore UI entry point was built**. The LIST endpoint has no way to enumerate soft-deleted documents (no `?include_deleted=` parameter or equivalent), so there is no way for the frontend to show a user which documents exist to restore. Per explicit instruction, no client-side storage of deleted-document IDs was built as a workaround (this would silently drift from server truth and violate the "API is the only source of truth" rule).

**RESTORE FRONTEND BLOCKED BY API READ-VISIBILITY GAP** *(historical — resolved 2026-08-10, see banner above)*.

This was documented as a known, deliberate limitation — not an oversight — at the time. Resolving it required a backend change (a way to list soft-deleted documents), which REQ-KM-UI-005 delivered the same day as a separate, explicitly scoped task.

## 6. Error handling

Every API error is passed through `mapApiError()` (`ui/error-mapper.js`), which returns only pre-approved, generic-safe copy — it never surfaces a raw backend error message or HTTP status text directly to the user. Field-level errors (e.g., a 409 duplicate source URL on Create) are attached to the specific offending field via `setFieldError()`. All other errors surface as a toast via `showToast()`.

## 7. Accessibility

Every interactive control is a real `<button>`/`<input>`/`<select>` with an associated `<label>`. Modals trap Tab focus within themselves (`trapTab`/`getFocusableEls`, shared `ui/popup.js`), close on Escape, and return focus to the triggering element on close. Destructive/state-changing actions (Archive, Soft Delete) require an explicit confirmation step before the API is called. Buttons show a busy state (`setButtonBusy`) and are disabled for the duration of an in-flight request to prevent duplicate submission.

## 8. Test results

- `knowledge-management.test.mjs`: **55/55 passing** (categories: DATA SOURCE 1-7, LIST/FILTER 8-13, CREATE 14-23, DETAIL 24-25, UPDATE 26-30, VERSION 31-34, ARCHIVE 35-37, UNARCHIVE 38-39, DELETE 40-43, RESTORE 44, HISTORY 45-47, SECURITY 48-51, REGRESSION 52-55).
- Full frontend suite (`node --test *.test.mjs`, all 5 test files in `web-view/js/`): **275/275 passing**, 0 failures — no regressions in Issues, Review Summaries, or navigation-structure coverage.
- No backend files were changed in this task; the backend test suite (54 tests, REQ-KM-CRUD-003) was not re-run because nothing it covers changed. Backend files changed by this task: **0**.
- Production database writes performed by this task: **0**. All frontend tests run against fixture/mock `api` objects or a stubbed `fetch` — no test in this suite ever reaches the live database.

## 9. Known limitations (items 1-3 RESOLVED 2026-08-10 by REQ-KM-UI-005 — see that closure doc for current state)

1. ~~Restore has no UI (§5) — deliberate, documented, blocked on a backend read-visibility gap.~~ **RESOLVED** — Restore now has a full UI (Deleted Documents view + confirmation).
2. ~~`GET /api/knowledge-documents/{id}` (single-document detail-by-ID) is implemented on the backend and in the frontend API client, but the Detail modal currently reuses the already-fetched list row instead of calling it.~~ **RESOLVED** — View Details now calls the real GET endpoint.
3. ~~The Team filter's option list is derived from whatever teams are present in the current result set — a team with zero currently-listed documents will not appear as a filter option until a document exists for it.~~ **RESOLVED** — Team options are now captured once from an unfiltered baseline and never collapse under filtering/search.

## 10. Next step

Have a Management Team domain owner (per the CLAUDE.md §18 reviewer routing rule — Arun for implementation/KPI-adjacent tooling, or whichever domain owner is assigned Knowledge Management ownership) exercise the live UI against the real backend in a browser and confirm the workflows match operational expectations before this is promoted beyond a frontend-only, unpushed commit.
