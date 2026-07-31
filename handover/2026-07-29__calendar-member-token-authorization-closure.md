---
name: calendar-member-token-authorization-handover
type: handover
scope: management_aios Calendar — member-token authorization for Task/Leave mutations
created: 2026-07-29
status: AMBER — implemented and tested on feature branch feat/calendar-member-token-authorization (backend 579/580, 1 pre-existing unrelated failure; frontend 99/99); not committed, not pushed, not deployed this session; pending reviewer sign-off — see §8
owner: builder (Mareenraj), per this task's implementation instructions
reviewer: pending — see §7 routing
---

# Calendar Member-Token Authorization — Handover — 2026-07-29

## 1. What this task was

Implemented the approved Calendar member-token authorization design: five per-member backend tokens, entered once per browser and stored in `localStorage`, automatically reused on every later Task/Leave mutation; the backend derives the acting member from the token (never the URL) and denies cross-member mutations with 403. Full requirement: `docs/2026-07-29_calendar-member-token-authorization-requirement.md`. Full test/CORS/risk evidence: `validation/calendar-member-token-authorization-implementation-check-2026-07-29.md`.

## 2. Files created

| File | Purpose |
|---|---|
| `backend/routers/calendar_auth.py` | Shared token validator, FastAPI dependency, cross-member guard, `POST /api/calendar-auth/verify`. |
| `backend/tests/calendar_auth_test_support.py` | Shared TestClient/SQLite/test-token setup (not a test file itself). |
| `backend/tests/test_calendar_auth.py` | 18 tests — verify endpoint, startup fail-closed config validation, CORS preflight, token exposure. |
| `backend/tests/test_calendar_mutation_authorization.py` | 29 tests — own/cross-member behavior for all 9 mutation routes, public reads, 404/409 preservation. |
| `web-view/js/calendar/auth.js` | Frontend storage, authorize dialog, `ensureAuthorized()` replay guard, 401 handling, indicator, Forget/change. |
| `web-view/js/calendar/auth-test-dom.mjs` | Minimal hand-rolled DOM/localStorage stand-in for `auth.test.mjs` (jsdom could not be installed in this environment — see validation doc §2). |
| `web-view/js/calendar/auth.test.mjs` | 12 tests covering the dialog flow, replay guard, 401/Forget clearing, and the tampered-display-field guarantee. |
| `docs/2026-07-29_calendar-member-token-authorization-requirement.md` | Requirement, endpoint matrix, configuration contract. |
| `validation/calendar-member-token-authorization-implementation-check-2026-07-29.md` | Test/CORS/browser evidence, token lifecycle, risks. |

## 3. Files modified

| File | Change |
|---|---|
| `backend/config.py` | Added `CALENDAR_AUTH_TOKEN_ENV_VARS` and `load_calendar_auth_token_hashes()` (fail-closed loader, no caching). |
| `backend/main.py` | Added a `lifespan` startup handler calling the loader (fails app boot on bad config); mounted `calendar_auth` router; added `Authorization` to `CORSMiddleware.allow_headers`. |
| `backend/requirements.txt` | Added `httpx` (test-only, for `fastapi.testclient.TestClient`). |
| `backend/routers/member_schedules.py` | Added 6 thin `*_route` wrapper functions (one per mutation route) that enforce auth before delegating to the pre-existing, **unmodified**, still-directly-callable business-logic functions; set `event.updated_by`/kept `event.outcome_updated_by` from the now-verified `member_key`. |
| `backend/routers/member_leave.py` | Same pattern — 3 `*_route` wrappers; Leave update's `updated_by` is now always set from the verified `member_key` rather than the client-supplied payload field. |
| `.env.example` | Documented the 5 `CALENDAR_AUTH_TOKEN_HASH_*` variable names with placeholder (non-real) example hash values. |
| `web-view/js/config.js` | Added `CALENDAR_AUTH_API_BASE`. |
| `web-view/js/calendar/instance.js` | `apiRequest`/`leaveApiRequest` now call `ensureAuthorized()` before any non-GET request, attach `Authorization: Bearer <token>`, and handle 401 (clear + tag `auth_required`)/403 (tag `cross_member_denied`, keep token, show the backend's own message). |
| `web-view/js/ui/error-mapper.js` | Added `auth_required`/`cross_member_denied`/`auth_cancelled` KNOWN_ERRORS entries. |
| `web-view/js/app.js` | Calls `initCalendarAuthIndicator()` at boot. |
| `web-view/index.html` | Added the topbar "Authorized as" indicator + "Forget or change token" markup. |
| `web-view/css/base.css` | `.topbar-calendar-auth*` styles. |
| `web-view/css/ui.css` | `.calendar-auth-*` dialog input/error/warning styles. |

No file under `member-aios/mayurika-hr/staff-data/` (protected) was touched. No database schema/migration file was touched (none was required).

## 4. Authoritative pattern — do not duplicate

Every mutation route follows the same **wrapper-delegates-to-unmodified-core** shape: `_route` function validates + authorizes, then calls the original function (same name it always had) with the exact same arguments it always took. **Do not** add `acting_member`/auth parameters directly to the 9 core business-logic functions — that would break the ~230 existing direct-call tests across `test_bulk_task_creation.py`, `test_multiple_time_frames.py`, `test_frame_level_error_context.py`, `test_schedule_advisory_confirmation.py`, `test_same_task_multiple_time_period_rule.py`, `test_occurrence_limit.py`, and `test_task_outcome_endpoint.py`, none of which were touched or need to be. `backend/routers/calendar_auth.py:require_matching_member` is the one shared 403 check every wrapper calls — extend it, never re-implement the comparison per route.

## 5. How to extend tests

Backend: add new cases to `backend/tests/test_calendar_mutation_authorization.py` (own/cross-member, per route) or `test_calendar_auth.py` (verify endpoint, config validation, CORS) — both use `backend/tests/calendar_auth_test_support.py`'s `patched_calendar_auth_env()`/`bearer_header()`/`make_sqlite_engine_and_session_factory()` helpers; do not hand-roll a second SQLite/env setup. Frontend: add cases to `web-view/js/calendar/auth.test.mjs` using `auth-test-dom.mjs`'s `installFakeBrowserGlobals()` + a fresh cache-busted `import('./auth.js?...')` per test (required — auth.js has module-level singleton state).

## 6. Verified this session

- `python -m unittest discover -s backend/tests -p "test_*.py"` → 579/580 (1 pre-existing, unrelated, date-sensitive failure confirmed present on `main` before this branch — see validation doc §1).
- `node --test *.test.mjs` (from `web-view/js/calendar/`) → 99/99 (87 pre-existing + 12 new).
- CORS preflight for `Authorization` header from the production origin — verified via `test_calendar_auth.py::CorsPreflightTests`.
- Fail-closed startup configuration validation — verified via 6 dedicated tests (missing/blank/malformed/wrong-length/duplicate hash all raise `RuntimeError`; valid config starts cleanly).

## 7. Reviewer routing

Per CLAUDE.md §18: Arun (Implementation Officer) for the backend authorization design; Mayurika (HR) informed given Calendar/HR relevance. No Varmen review required for this kind of ongoing work unless explicitly requested.

## 8. Why AMBER, not a clean pass

- Not committed, not pushed, not merged, not deployed this session (the task explicitly said not to deploy). `git status` on `feat/calendar-member-token-authorization` shows the files in §2/§3 as uncommitted working-tree changes.
- No live browser walkthrough was performed (no running backend + real browser this session) — coverage is HTTP-level (backend TestClient) and DOM-stand-in-level (frontend), not an actual click-through.
- CSP/third-party-script review (recommended before release, given the localStorage-token XSS exposure noted in the validation doc §5) was not performed this session.

## 9. Rollback

Nothing has been merged or deployed, so rollback is simply: do not merge/deploy this branch. `main` is completely unaffected by this work.

## 10. One next step

Reviewer (Arun, per §7) reviews the design and code on `feat/calendar-member-token-authorization`; once approved, generate the five real per-member tokens out-of-band, configure their hashes in the backend's Vercel project environment, and perform a live browser walkthrough (first-use dialog, persistence, 401, 403, Forget) before merging/deploying.

## 11. Commit-inventory correction (2026-07-31)

A prior closing report described the commit as "23 files from the implementation plus the 3 evidence files," which read as if 3 files existed beyond the 23 (implying 26). This was a **reporting-wording error only**, corrected here after re-deriving the true count directly from Git (`git diff --name-status f5cdbb8..bcedadc145837043cddcaa3c55cb8b7bb21c3946`, `git diff --stat` over the same range):

**Commit `bcedadc145837043cddcaa3c55cb8b7bb21c3946` contains 23 unique changed files in total: 10 added and 13 modified (0 deleted).** The requirement, validation, and handover documents (§2 above) are three of those 10 added files, not three additional files on top of 23. §2's "Files created" table lists 9 of the 10 added files by design (a handover document does not customarily list itself); the 10th added file is this document. No file content changed as part of this correction — only prior reporting wording.

## 12. Frontend UX correction (2026-07-31)

A separate, focused follow-up pass on branch `fix/calendar-auth-ux-corrections` (created off `main` once it included the merged PR #2 — the original `feat/calendar-member-token-authorization` branch was not reused for this pass). Full detail: `validation/calendar-member-token-authorization-implementation-check-2026-07-29.md` §13. Summary:

- **What changed:** topbar wording "Forget or change token" → "Change token"; the control now opens a non-destructive "Change Calendar token" dialog (current token stays active until a replacement verifies) instead of immediately clearing authorization; a new `guardMutationAccess()` pre-block gate in `auth.js` stops every mutation-initiating UI action (Create/Bulk-Create/Leave-Create, Task/Leave Edit-open, Task/Leave Delete, Task Outcome) before its own modal/confirmation opens and before any request is sent, so a cross-member attempt is blocked client-side with a dynamic, plain-language alert rather than only being caught by the backend after a form was already filled in; the cross-member toast copy is now dynamic (names the actual acting/target members) on both the client pre-block path and the backend-403 fallback path; error toasts are now consistently red (icon, border, title, message); every mutation's busy-state ("Saving…") reset was hardened from `.then()` to `.finally()` so it restores on every exit path, not just success.
- **What did NOT change:** no backend route, schema, dependency, or authorization rule (the backend already returned `actingMember`/`targetMember` in its 403 body, which is all this pass needed); no database migration; `management_aios_calendar_auth_v1` storage shape unchanged; 401-clears/403-retains behavior unchanged.
- **Files touched:** `web-view/js/calendar/auth.js`, `web-view/js/calendar/instance.js`, `web-view/js/ui/error-mapper.js`, `web-view/index.html`, `web-view/css/base.css`, `web-view/css/ui.css`, `web-view/js/calendar/auth.test.mjs`, `web-view/js/calendar/auth-test-dom.mjs`.
- **Tests:** `auth.test.mjs` 30/30 (up from 12); full Calendar frontend suite 117/117; backend untouched and not re-run this pass.
- **Not done this pass:** live browser walkthrough (desktop/mobile/200% zoom) — no browser automation tool was available in this environment; a code-level responsive CSS review was performed instead (§13.9 of the validation document). This remains a pre-merge gate alongside the CSP/script review already carried from the original feature.
- **Status:** AMBER, same as the overall feature — implementation and automated tests complete; live-browser validation, CSP review, and reviewer sign-off remain pending.

## 13. Show/hide token toggle (2026-07-31 usability addition)

A small, focused usability addition on branch `feat/calendar-auth-token-visibility-toggle` (off `main`, which by this point also includes a small unrelated red-alert-styling fix, `fix/calendar-auth-error-red-styling`, merged as PR #4). Full detail: `validation/calendar-member-token-authorization-implementation-check-2026-07-29.md` §14.

- **What changed:** an eye-icon toggle button was added to the member-token input in both dialog modes ("Authorize this browser" and "Change Calendar token"), added to the one shared dialog builder both modes already use (no duplicate input component). Masked (`type="password"`) by default; clicking toggles `type` to `"text"`/back, with `aria-label` switching "Show token"/"Hide token" and `aria-pressed` switching `"false"`/`"true"`. The toggle only ever reads/writes `inputEl.type` — never `inputEl.value`, never the saved localStorage token — so it structurally cannot reveal or be influenced by anything beyond what's currently typed into that one open input. Resets to masked on every dialog close (Cancel, Escape, backdrop click, successful submit), so a later reopen never carries over a "revealed" state.
- **What did NOT change:** no backend code, token validation, or `management_aios_calendar_auth_v1` storage structure; no change to which fields exist in the stored record or what's sent to the backend.
- **Files touched:** `web-view/js/calendar/auth.js`, `web-view/css/ui.css`, `web-view/js/calendar/auth-test-dom.mjs` (added `document.createElementNS` support to the test DOM stand-in), `web-view/js/calendar/auth.test.mjs` (7 new tests).
- **Tests:** `auth.test.mjs` 37/37 (up from 30); full Calendar frontend suite 124/124; backend untouched and not re-run this pass.
- **Not done this pass:** live browser walkthrough — same tooling gap as §12; a code-level responsive/accessibility review was performed instead (§14.6 of the validation document).
- **Status:** AMBER, same as the overall feature.
