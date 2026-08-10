# Knowledge Management — Restore, Detail and Filter Flows Closure (REQ-KM-UI-005)

**Date:** 2026-08-10
**Requirement:** REQ-KM-UI-005 — close three known gaps in the REQ-KM-UI-004 frontend/API integration: Restore blocked by a backend read-visibility gap, View Details reusing a list row instead of calling the real detail endpoint, and Team/Document Type filter options collapsing under filtering.
**Scope:** Backend gap closure (one minimal, additive, read-only route) + frontend integration. No redesign of the module.
**Starting commit:** `6880ccf` — "Connect Knowledge Management frontend to CRUD API" (REQ-KM-UI-004, not pushed).

---

## 1. Deleted-read API

**New route:** `GET /api/knowledge-documents/deleted` — `backend/routers/knowledge_documents.py`.

- Returns ONLY soft-deleted documents (`deleted_at IS NOT NULL`); the default LIST route continues to exclude them unconditionally, unchanged.
- Response schema: `KnowledgeDocumentDeletedOut` (`backend/schemas.py`) — `id, title, team, document_type, creator, current_version, deleted_by, deleted_at, delete_reason`. A deliberately narrower schema than `KnowledgeDocumentOut` (no lifecycle_status/compliance_status/google_ownership_status/warnings — none of those are meaningful for a soft-deleted row). All three deletion fields are required (non-Optional): the `knowledge_documents_soft_delete_pairing_check` CHECK constraint guarantees they are always populated together.
- Deterministic ordering: `deleted_at DESC` (most recently deleted first), then `id ASC` as a stable tiebreaker.
- Never mutates anything — a plain `SELECT`, no `db.add()`/`db.commit()` in this route.
- **Route order:** registered in the source file BEFORE `GET /{document_id}`, so the static `/deleted` path is matched first and is never swallowed by the dynamic `{document_id}` path (which would otherwise try to parse `"deleted"` as a UUID and 422). Verified directly by the backend test suite (`test_56_authenticated_accepted` returns 200, not 422).

No database schema change, no new table, no change to the RESTORE business rule (`POST /{id}/restore` is untouched — this task only adds a way to discover what's available to restore).

## 2. Auth

`GET /deleted` requires `Depends(get_verified_member)` — any authenticated Management Team member, same as every other route in this router. It deliberately does **not** call `_reject_md_write`: this is a read-only route, and MD is not excluded from any read route in this router (only writes) — the same convention already used by the version/audit history GET routes. This matches the task's stated rationale: "any authenticated Management Team member may read deleted Knowledge Management records because the locked permission model already permits Restore."

Frontend: the existing Calendar Bearer token is reused verbatim (`kmProtectedRequest`, which already calls `ensureAuthorized()` before every protected request). No second token/auth mechanism was introduced. Clicking "Deleted Documents" for the first time in a session with no stored token opens the existing "Authorize this browser" dialog automatically, the same way every other protected Knowledge Management action already does.

## 3. Restore UI

**Deleted Documents view** — an internal toggle within the existing Knowledge Management panel (`Active Documents` / `Deleted Documents` tabs, `role="tablist"`/`"tab"`/`"tabpanel"`), not a new sidebar item. Mirrors the exact pattern `issues.js` already uses for its own Issues/Assigned Tickets toggle (`.msc-issues-view-tab*` → `.msc-km-view-tab*`).

The Deleted Documents table shows exactly the fields the new route returns: Document Title, Team, Document Type, Creator, Version, Deleted By, Deleted At, Delete Reason, and a Restore action — no invented metadata. Deleted rows never show Edit Metadata, Create Version, Archive, Unarchive, or Delete-again controls — Restore is the only action.

**Restore confirmation:** "Restore this document to the active Knowledge Management library?" via the shared `confirmDestructive` dialog (same primitive used for Archive). On success: the Deleted Documents list is refetched (the row disappears because the server no longer returns it — no local splice/cache), the active document list is also refetched, and a success toast is shown.

**No client-side restore workaround of any kind** — every render of the Deleted Documents list comes straight from `GET .../deleted`; nothing about which documents are deleted is cached, inferred, or reconstructed locally between renders.

## 4. Restore collision UX

If `POST /{id}/restore` returns 409 (the document's normalized source URL now collides with a different active document that reused it while this one was deleted), the frontend shows a restore-specific message, not the shared generic duplicate-URL wording used by Create/Create Version (which would incorrectly read as "you're creating a duplicate" rather than "restore is blocked"):

> "This document cannot be restored because another active document already uses the same source link."

The other (active) record is never touched by this flow — confirmed by the backend's own pre-existing collision check (`RestoreTests.test_50_restore_url_collision_is_409`, unchanged by this task) and by the frontend never attempting any URL-rewrite or force-restore fallback.

## 5. Real detail endpoint wiring

`openDetailModal` now calls the real `GET /api/knowledge-documents/{id}` endpoint instead of reusing the already-fetched list row. Flow: click View → modal opens showing a loading state (with the triggering list row's title kept visible as context, never discarded) → `GET` resolves → canonical record renders. On failure, a clear error state with Retry (calling the same GET again) replaces the loading state, still with the list row's title visible for context.

Every action button inside the Detail modal (Edit Metadata, Create New Version, Archive/Unarchive, View Version History, View Audit History, Delete) now operates on the freshly fetched canonical `record`, not the stale list row — a strict improvement, since e.g. the Archive/Unarchive button label now reflects the document's true current `lifecycle_status` even if it changed since the list was last loaded.

No field not present in the canonical GET response is ever invented or displayed.

## 6. Stable filter options

**Root cause (confirmed by direct inspection before any code was written):** `populateTeamOptions()` derived its dropdown values from `state.documents` — the current, possibly-filtered result set — on every render, so selecting a Team collapsed the dropdown to just that one value. Document Type was actually **already stable** before this task: its options were populated once at mount from the fixed `DOCUMENT_TYPE_OPTIONS` enum (12 known document types), never rebuilt from `state.documents` — so only Team needed a code fix; Document Type needed test coverage to confirm/lock in behavior that was already correct.

**Fix:** `state.filterOptionsBaseline` is captured from the most recent successful **unfiltered** LIST response only (`search=''`, `team=all`, `documentType=all`, `lifecycleStatus=all`). `populateTeamOptions()` now reads from this baseline, never from the current (possibly filtered) `state.documents`. Filtering, searching, or switching directly between Team/Document Type values never rebuilds or erases the baseline.

**Pagination handling:** the LIST endpoint is paginated (`limit`/`offset`, hardcoded frontend `limit=200`), but the response includes `total`. The baseline is only accepted as `complete` when the unfiltered response's `records.length >= total` — i.e., nothing was truncated. A truncated unfiltered response never overwrites an already-`complete` baseline with a partial one (no regression), and this repo's current document volume is far below 200, so `complete` is expected to stay `true` in practice. **If this library ever exceeds ~200 active documents, `complete` will correctly flip to `false`** — at that point a dedicated read-only distinct-values endpoint would be the correct follow-up. That endpoint was **not** built in this task because it is not currently necessary (per the task's own explicit instruction: "Only add such an endpoint if necessary").

## 7. Tests

**Backend — 6 new tests** (`backend/tests/test_knowledge_documents.py`, `DeletedListTests`, numbered 55-60, continuing this file's existing sequence): unauthenticated rejected (401), authenticated accepted (200), only deleted records returned, active records excluded, deterministic ordering (`deleted_at DESC`), no mutation occurs.

**Frontend — 32 new tests** (`web-view/js/knowledge-management.test.mjs`, numbered 56-87, continuing this file's existing 1-55 sequence from REQ-KM-UI-004):

| Category | Tests | Count |
|---|---|---|
| DELETED VIEW | 56-64 | 9 |
| RESTORE | 65-71 | 7 |
| DETAIL | 72-76 | 5 |
| FILTER STABILITY | 77-83 | 7 |
| SAFETY | 84-87 | 4 |

Every category the task listed at minimum is covered: control existence, endpoint-loading, auth header attachment, correct rendering, view isolation (active rows never leak into the deleted view and vice versa), absence of mutation controls on deleted rows, confirmation-before-call, correct endpoint/id, row removal on success, active-list refresh, success toast, 409 collision messaging, no-client-workaround, real GET wiring, loading/error/retry states, canonical-record rendering, baseline capture, non-collapse under Team/Type filtering and search, direct value-to-value switching, no hard-delete UI, no actor-spoof fields, and continued absence of the REQ-KM-001 static sample registry/notice.

### Full suite results

```
Backend — Knowledge Management only:
python -m unittest backend.tests.test_knowledge_documents
Ran 63 tests — OK (57 from REQ-KM-CRUD-003 + 6 new)

Backend — full suite:
python -m unittest discover -s backend/tests -p "test_*.py"
Ran 872 tests — 2 failures (BOTH pre-existing and unrelated — see §8)

Frontend — Knowledge Management only:
node --test knowledge-management.test.mjs
# tests 87
# pass 87
# fail 0

Frontend — full suite (all 5 files in web-view/js/):
node --test *.test.mjs
# tests 307
# pass 307
# fail 0
```

## 8. Pre-existing, unrelated backend failures (confirmed, not caused by this task)

Two backend tests fail on the full-suite run, in both directions confirmed unrelated to this task:

1. `test_calendar_auth.StartupConfigurationValidationTests.test_missing_variable_fails_closed`
2. `test_weekly_schedule_xlsx_export.TaskRowTests.test_pending_task_no_outcome`

Verification performed: both fail identically (a) in isolation (run alone, no cross-test interference), and (b) after `git stash`-ing every change made by this task and re-running against the unmodified base commit `6880ccf`. Neither test file was touched by this task (only `backend/routers/knowledge_documents.py`, `backend/schemas.py`, and `backend/tests/test_knowledge_documents.py` were changed on the backend side). Reported here for transparency, not fixed — out of scope for REQ-KM-UI-005.

## 9. Files changed

**Backend (3 files):**
- `backend/routers/knowledge_documents.py` — new `GET /deleted` route + updated module docstring
- `backend/schemas.py` — new `KnowledgeDocumentDeletedOut` schema
- `backend/tests/test_knowledge_documents.py` — 6 new tests (`DeletedListTests`)

**Frontend (3 files):**
- `web-view/js/knowledge-management.js` — Deleted Documents view/toggle, Restore wiring, real detail GET, stable filter-options baseline, updated module docstring
- `web-view/css/knowledge-management.css` — view-tab styling, detail-context note styling
- `web-view/js/knowledge-management.test.mjs` — 32 new tests, plus fixes to 2 pre-existing tests whose fixtures needed a `detail` override after Phase 6's change (Unarchive tests 38-39)

**Documentation (this task, 3 new + 1 updated):**
- `docs/knowledge-management-restore-detail-closure-2026-08-10.md` (this file)
- `validation/knowledge-management-restore-detail-check-2026-08-10.md`
- `handover/2026-08-10__knowledge-management-restore-detail-closure.md`
- `docs/knowledge-management-frontend-api-integration-2026-08-10.md` — updated to mark the Restore-blocked/list-row-detail/collapsing-filter items as RESOLVED, with history preserved (not rewritten)

## 10. Database / schema changes

**Zero.** No migration file was created or modified. No table was created, altered, or dropped. The new route is a `SELECT` against existing columns (`deleted_at`, `deleted_by`, `delete_reason`, all already present in `knowledge_documents` since the REQ-KM-CRUD-002 migration).

## 11. Production writes

**Zero.** Every backend test in this task runs against an isolated in-memory SQLite database (`backend/tests/calendar_auth_test_support.py`), never `order_management_copy`. Every frontend test runs against fixture `api` objects or a stubbed `fetch`. No test in this task, and no manual step performed while building it, ever wrote to or read from the live production database.

## 12. Known limitations

1. If the Knowledge Management library ever exceeds ~200 active documents, the Team filter's baseline-completeness detection will correctly flag itself as incomplete (§6) — at that point a dedicated read-only distinct-values endpoint would be the right follow-up. Not built now because current document volume makes it unnecessary.
2. `GET /api/knowledge-documents/{id}` is now called on every View click — a full round-trip per click rather than reusing cached data. Deliberate (this was the explicit objective of Phase 6) and not considered a performance concern at current or foreseeable document volumes.

## 13. Verdict

**PASS.** All required backend and frontend behaviors are implemented, all required tests pass, the full regression suites (backend and frontend) show zero new failures, and scope integrity (protected paths, no schema changes, zero production writes) is confirmed in §§9-11.

## 14. One next step

Have the assigned Knowledge Management domain owner exercise the Deleted Documents / Restore flow and the real Detail-loading flow in a browser against the real backend, then decide whether to push the combined REQ-KM-UI-004 + REQ-KM-UI-005 commits to `origin/main`.
