---
Project Name: Authenticated-Only Staff Data, Issues, and Knowledge Management
Start Date: 2026-08-10
Expected Deadline: 2026-08-10
User / Stakeholder: Mareenraj (builder)
Company Value Contribution: Closes an access-control gap — Staff Data, Issues, and Knowledge Management were reachable (frontend and/or backend API) without any authentication, exposing staff records and internal documents to any unauthenticated visitor
MVP Submission Date: 2026-08-10
Project Owner: Mareenraj
Status: Implemented
---

# Authenticated-Only Staff Data, Issues, and Knowledge Management — Requirement — REQ-AUTH-MODULES-007

## 1. Purpose

Restrict three Management AIOS modules — **Staff Data**, **Issues**, and **Knowledge Management** — to authenticated Management AIOS users only, on both the frontend (navigation/visibility) and the backend (API data access). Unauthenticated users must not be able to view these modules or retrieve their data. This requirement reuses the existing Calendar member-token Bearer-auth system verbatim (`backend/routers/calendar_auth.py` / `web-view/js/calendar/auth.js`) — no new login system, no new token type, no module-specific password.

## 2. Scope

**In scope:**
- Backend: `GET /api/staff`, `GET /api/staff/summary`, `GET /api/staff/filter-options` (`backend/routers/staff.py`) — previously fully public, now require `Depends(get_verified_member)`.
- Backend: `GET /api/knowledge-documents` (list) and `GET /api/knowledge-documents/{id}` (detail) (`backend/routers/knowledge_documents.py`) — previously public reads, now require `Depends(get_verified_member)`. Every other Knowledge Management route already required it.
- Backend: Issues has no dedicated API — it is frontend-only (`docs/2026-08-10_management-issues-frontend-requirement.md`), reading its Raised-By/Team dropdown options from the (now-protected) Staff API above. No separate Issues router exists to gate.
- Frontend: one shared authenticated-module guard (`web-view/js/auth-gate.js`), wired into `web-view/js/navigation.js` — the three protected sidebar items stay visible (never hidden — an unauthenticated user needs a discoverable way to start authorization) but are marked locked (`aria-disabled`, `.app-nav-btn--locked`) and refuse to activate their panel while unauthenticated; clicking one opens the existing "Authorize this browser" token dialog and only switches panels on a confirmed successful authorization.
- Frontend: each of the three modules (`staff-data.js`, `issues.js`, `knowledge-management.js`) independently checks authentication before mounting/fetching, rendering the shared "Authorize this browser to access <module>." placeholder instead of any data while unauthenticated, and re-mounting live on every authentication transition (`CALENDAR_AUTH_CHANGED_EVENT`).
- Frontend: the two **PH Staff Data pilots embedded inside Arun's and Paraparan's own Calendar tabs** (`#arun-staff-pilot`, `#paraparan-staff-pilot`) are also gated — see §5 conflict/decision. The rest of those two Calendar tabs (Task/Leave calendar, KPI panel) remains fully public, unchanged.

**Explicitly out of scope:**
- Any change to Staff Data content, schema, or database.
- Any change to Issues assignment-authority rules (`hasAssignmentAuthority`, exact-identity allowlist) — authentication ("can this user enter/read Issues") and assignment authority ("can this authenticated user assign an Issue") are kept as two separate questions; only the former changed.
- `member-aios/mayurika-hr/staff-data/` — never opened or modified.
- Review Summaries' own pre-existing whole-panel auth gate (already authenticated-only before this requirement) — untouched except for one defensive Authorization-header addition to its already-gated staff search call (see §5).
- Deployment / push to remote.

## 3. Existing auth architecture reused

- **Backend:** `Depends(get_verified_member)` (`backend/routers/calendar_auth.py`) — validates the `Authorization: Bearer <token>` header against five configured per-member SHA-256 token hashes (plus an optional sixth, MD, read-only). Returns 401 for missing/malformed/invalid tokens. No new dependency, no new comparison logic.
- **Frontend:** `web-view/js/calendar/auth.js` — `getStoredToken()`/`getStoredMemberKey()` (browser-wide `localStorage` token), `ensureAuthorized()` (opens the "Authorize this browser" dialog if no token is stored, resolves once verified), `handleUnauthorizedResponse()` (discards a token rejected with 401 and fires `CALENDAR_AUTH_CHANGED_EVENT`), and the "Change token" topbar control. No new dialog, no new storage key.

## 4. Design decision — Staff API sharing conflict

`GET /api/staff` and `GET /api/staff/filter-options` are not exclusive to the Staff Data tab. Before this requirement, they were also called, unauthenticated, by the "PH Staff Data" pilot embedded inside **Arun's** and **Paraparan's** own Calendar tabs — panels otherwise documented as public-viewing-always (`backend/routers/calendar_auth.py`: *"Everyone may continue viewing all Calendar data and existing read-only reports without a token."*).

Presented to the project owner as a three-way choice (protect the shared endpoint and also gate the two embedded pilots; split into a second, narrower public endpoint for the pilots; or leave the Staff API public and only gate the frontend tab). **Decision: also gate the two embedded PH Staff Data pilots.** Rationale: this IS Staff Data content, reused in a second UI location — gating it consistently everywhere it appears is simpler and more defensible than maintaining two backend routes with different auth rules over the same table. The rest of Arun's and Paraparan's Calendar tabs (Task/Leave calendar, KPI panel — the KPI panel is synthetic in-memory data, not sourced from the Staff API) remain fully public, unaffected.

Issues (`issues.js`) and Review Summaries (`review-summaries.js`) also call the same Staff API, but neither needed a design decision: Issues is itself one of the three modules being gated (its Staff/Team option fetch now only ever runs once the Issues workspace is already authenticated), and Review Summaries was already a whole-panel-gated, authenticated-only module before this requirement (its staff search field is unreachable while unauthorized) — an Authorization header was added to that one fetch call for correctness/defense-in-depth only, not because it was ever reachable unauthenticated.

## 5. Frontend gate design

One shared module, `web-view/js/auth-gate.js`, is the single source of truth for:
- `PROTECTED_TABS` — `['staff-data', 'issues', 'knowledge-management']`.
- `isAuthenticated()` — `!!getStoredMemberKey()`.
- `buildAuthRequiredNotice(tabId)` — the shared "Authorize this browser to access `<Module>`." placeholder + button, used identically by all three modules (and by the embedded PH pilots for Staff Data).
- `onAuthChange(handler)` — subscribes to `CALENDAR_AUTH_CHANGED_EVENT`.

`web-view/js/navigation.js`'s `activatePanel()` is the single place every panel switch in this app goes through (nav click, `[data-goto]` jump, and the new auth-loss fallback) — gating it there is sufficient to reject direct/programmatic activation of a protected tab from any current caller in this codebase.

Each of `staff-data.js`, `issues.js`, `knowledge-management.js` independently checks `isAuthenticated()` (or, for `issues.js`, its own already-existing `getAuthenticatedMemberKey` test seam) before mounting/fetching, and re-runs that check on every `CALENDAR_AUTH_CHANGED_EVENT` — this is defense-in-depth beyond the sidebar gate, covering the case where a token becomes invalid (401) while a protected panel is already open.

## 6. Protected path

`member-aios/mayurika-hr/staff-data/` was never opened or modified.

## 7. Next step

None outstanding for this requirement — see `validation/authenticated-module-access-check-2026-08-10.md` and `handover/2026-08-10__authenticated-module-access-closure.md` for full test results and known limits (in particular: verification was performed against the automated HTTP-level test suite, not a live database-backed server — no production database credentials were available in this environment).
