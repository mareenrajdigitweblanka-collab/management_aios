---
name: calendar-member-token-authorization-implementation-check
type: validation-report
created: 2026-07-29
created-by: Mareenraj (builder)
requirement-id: REQ-CALENDAR-AUTH-001
---

# Validation — Calendar Member-Token Authorization Implementation Check (2026-07-29)

Companion evidence for `docs/2026-07-29_calendar-member-token-authorization-requirement.md`. No raw tokens, hashes, partial tokens, screenshots containing tokens, or production environment values appear anywhere in this file.

## 1. Test evidence — backend

Command: `python -m unittest discover -s backend/tests -p "test_*.py"` run from repo root.

- **Result: 579/580 passing.**
- The one failure (`test_pending_task_no_outcome`, `backend/tests/test_weekly_schedule_xlsx_export.py`) is a **pre-existing, unrelated failure** confirmed present on `main` at commit `f5cdbb8` **before** this branch's changes (verified via `git stash` + re-run). It concerns a date-sensitive "Pending" vs. "No response" outcome label, unrelated to authorization. Not fixed in this session (out of scope for this requirement).
- New test files, all passing:
  - `backend/tests/test_calendar_auth.py` — 18 tests (verify endpoint success/failure cases, missing/malformed/prefix-only/whitespace-only tokens, one-member-never-verifies-as-another, token/hash absent from response body, 6 fail-closed startup-configuration tests — missing/blank/malformed-hex/wrong-length/duplicate-hash all raise `RuntimeError` before the app would serve traffic; valid configuration starts cleanly — and 2 CORS preflight tests).
  - `backend/tests/test_calendar_mutation_authorization.py` — 29 tests, covering all 9 mutation routes: own-member success, cross-member 403 denial with a row-unchanged/zero-insert assertion for every route, 2 missing-token 401 cases, 2 genuine-404 preservation cases, 2 existing-409 preservation cases (`outcome_recorded_immutable`, `outcome_locked`), and 4 public-read-without-token cases (Task list, Leave list, weekly report, leave summary).
- All tests use `fastapi.testclient.TestClient` against the real app (`backend.main.app`) — genuine HTTP-level requests through FastAPI's real routing, dependency injection, and CORS middleware, never direct Python function calls (per the requirement's explicit instruction). `httpx` was added to `backend/requirements.txt` as a test-only dependency — it was not previously installed in this environment (`fastapi.testclient.TestClient` raised `RuntimeError` without it) and is not imported by any production code path.
- Setup uses an isolated in-memory SQLite database per test (`backend/tests/calendar_auth_test_support.py`), the same pattern `backend/tests/test_task_outcome_endpoint.py` already established, with `get_db` overridden per test via `app.dependency_overrides`. Two SQLite stand-ins (`hashtext`, `pg_advisory_xact_lock`) were registered on the test connection so `backend/routers/leave_logic.py`'s real, unmodified Postgres-only advisory-lock statement can run unmodified against SQLite — this is the same "one SQL statement, both dialects" convention `backend/models.py`'s CHECK constraints already use; no Leave locking *semantics* are exercised by this stand-in (a single in-memory SQLite connection has no real concurrent-connection model to lock against).
- Five fixed, non-production test tokens (`backend/tests/calendar_auth_test_support.py TEST_TOKENS`) are hashed with the same `hashlib.sha256(...).hexdigest()` the real loader expects and injected via `unittest.mock.patch.dict(os.environ, ...)` per test.

## 2. Test evidence — frontend

Command: `node --test *.test.mjs` run from `web-view/js/calendar/`.

- **Result: 99/99 passing** (87 pre-existing + 12 new, zero regressions).
- New file `web-view/js/calendar/auth.test.mjs` covers: initial dialog appears only when unauthorized; verification happens before storage (nothing stored until a 200 response); a rejected token keeps the dialog open with an inline error and stores nothing; persistence across a simulated reload (fresh module import, same fake `localStorage`); no repeated prompt on a later valid own-member mutation (verify request count stays at 1); the replay guard (two concurrent `ensureAuthorized()` calls share the exact same promise and verify exactly once; a triple-clicked Submit button only sends one verify request); 401 clears the stored token and hides the indicator; retrying after a 401 reopens the dialog; Forget/change clears storage and hides the indicator without reopening the dialog; a hand-edited `verifiedMemberKey` in localStorage changes only the displayed label, never the token actually used; the indicator resolves the on-page member label rather than the raw key; and cancelling the dialog rejects with a distinct `auth_cancelled` code and stores nothing.
- **Environment note:** this repository has no npm dependencies at all (`web-view/js/calendar/package.json` declares only `{"private": true, "type": "module"}`). `npm install jsdom` was attempted and failed in this sandboxed environment with a TLS/cipher error (`ERR_SSL_CIPHER_OPERATION_FAILED`); the partial, broken `node_modules` directory that install left behind was removed before proceeding. Rather than depend on an unavailable library, `web-view/js/calendar/auth.js`'s dialog was written to build its DOM via `createElement`/`appendChild` with direct element references (never `innerHTML` + `querySelector` afterward), specifically so a small, purpose-built DOM/localStorage stand-in (`web-view/js/calendar/auth-test-dom.mjs`, not itself a test file) is enough to exercise auth.js's real code paths end-to-end without a full HTML parser. Each test re-imports `auth.js` with a cache-busting query string so its module-level singletons (the dialog element, the indicator cache, the in-flight authorization promise) never leak state between tests.
- **Coverage boundary, stated plainly:** "automatic Authorization header attachment" and "no token on GET requests" are `instance.js`'s responsibility — a direct, mechanical pass-through of `ensureAuthorized()`'s resolved token into a fetch header, gated on `method !== 'GET'` (see `web-view/js/calendar/instance.js` `apiRequest`/`leaveApiRequest`, both modified identically). `instance.js` is a single ~6,000-line closure factory (`mountScheduleCalendarInstance`) not independently mountable in a unit test without reproducing the entire calendar's DOM, so this exact contract is instead verified at the HTTP level by the backend's own TestClient tests (§1 above), which send real `Authorization` headers and confirm the backend's 200/401/403 responses, and confirm GET routes succeed with no header sent at all.

## 3. CORS evidence

`backend/main.py`'s `CORSMiddleware` `allow_headers` was changed from `["Content-Type"]` to `["Content-Type", "Authorization"]`. `allow_credentials` stays `False` (bearer tokens are not cookies and do not need it) and the production origin allowlist (`ALLOWED_ORIGINS`, defaulting to `https://management-aios.vercel.app`) was **not** broadened. Verified by `test_calendar_auth.py::CorsPreflightTests`: an `OPTIONS` preflight from the production origin requesting `authorization,content-type` for a `POST` returns `200` with `access-control-allow-headers` containing both, `access-control-allow-origin` echoing the exact production origin, and no `access-control-allow-credentials` header present; a second test confirms the pre-existing Content-Type-only preflight for a `GET` route is unaffected.

## 4. Browser evidence

Not exercised in a real browser this session (implementation-only; no deployment performed, per the task's explicit instruction not to deploy). Coverage above is HTTP-level (backend) and DOM-stand-in-level (frontend); a manual browser walkthrough against a running `backend` + `web-view` pair is recommended before promoting this branch, per §7 below.

## 5. Known localStorage / XSS risk

A bearer token stored in `localStorage` is readable by any script running on the page — a successful XSS on `management-aios.vercel.app` could exfiltrate it. This is an accepted tradeoff of the approved "enter once per browser" usability requirement (a session-cookie-only design would not survive the required persistence contract). Mitigation: review the existing CSP and third-party scripts loaded by `web-view/index.html` before release (not performed in this implementation session — flagged as a pre-release action item, §7). The shared-browser warning shown in the authorize dialog (and documented in the requirement, §3) is a process control, not a technical one — it does not reduce this risk, only the shared-secret-per-browser risk.

## 6. Token generation, distribution, rotation, and revocation

- **Generation:** an operator generates five independent, high-entropy random tokens out-of-band (e.g. `python -c "import secrets; print(secrets.token_urlsafe(32))"`) and computes each one's SHA-256 hex digest (e.g. `python -c "import hashlib; print(hashlib.sha256(b'<token>').hexdigest())"`).
- **Distribution:** each raw token is given to its one member through a secure out-of-band channel (never committed, never emailed in plaintext, never pasted into this repository or any tracked file). Only the **hash** is ever stored, and only in the backend's environment configuration (Vercel backend project settings, not the frontend project).
- **Rotation:** the operator replaces that member's `CALENDAR_AUTH_TOKEN_HASH_<MEMBER>` value and redeploys the backend. The old token stops matching immediately; that member's next mutation attempt (their browser still holds the old token) returns 401, the frontend clears its saved token, and the member re-authorizes with the new one. No other member is affected.
- **Emergency revocation:** identical mechanism to rotation — remove or replace the hash and redeploy. There is no server-side token cache to purge, so the effect is immediate on the next request.

## 7. Owner / reviewer

Per CLAUDE.md §18 (Reviewer Routing Rule), this spans backend authorization implementation and Calendar governance. Recommended reviewer: Arun (Implementation Officer — KPI/implementation domain) for the backend authorization design, with Mayurika (HR) informed given the Calendar's HR/leave-visibility relevance (CLAUDE.md §4). No Varmen review is required for ongoing work of this kind unless explicitly requested in a specific conversation turn (CLAUDE.md §18).

## 8. Rollback plan

This work lives entirely on `feat/calendar-member-token-authorization` and has not been merged, deployed, or pushed. To roll back: discard or do not merge the branch — `main` is unaffected. If a future merge needs to be reverted, `git revert` the merge commit; no database migration was applied (none was required), so no schema-level rollback step exists.

## 9. Remaining risks (carried into the closure document)

1. Shared-secret-per-member model — one token authorizes the whole browser profile; the shared-browser warning is a documented process control, not a technical one.
2. XSS-exfiltration exposure for a localStorage-stored bearer token (§5) — CSP/third-party-script review is a stated pre-release action item, not resolved here.
3. Rotating a compromised token logs out every legitimate browser using it, not just the compromised one — an accepted operational tradeoff of having no per-device credential.
4. No dedicated security/audit log beyond the existing `updated_by`/`outcome_updated_by` columns, which now receive the verified acting member's key instead of an unauthenticated value — a real improvement, but still not a full audit trail.
5. No browser-level manual walkthrough performed this session (§4).

## 10. Route-protection inventory (security review, 2026-07-29)

A second session performed an exact security review of the implementation above before commit. Static grep of `@router.*` decorators in `backend/routers/member_schedules.py` and `backend/routers/member_leave.py` found exactly one registration per approved route, each pointing to a `*_route` wrapper (never a bare, unprotected core function name). This was independently confirmed against FastAPI's own generated OpenAPI schema (`app.openapi()`), the authoritative route registry — a dict keyed by path, so it cannot itself contain a duplicate method+path entry:

| Method | Path | operationId |
| --- | --- | --- |
| POST | `/api/calendar-auth/verify` | `verify_calendar_auth_token_...` |
| POST | `/api/member-schedules/{member_key}` | `create_member_schedule_event_route_...` |
| POST | `/api/member-schedules/{member_key}/bulk` | `create_member_schedule_events_bulk_route_...` |
| PUT | `/api/member-schedules/{member_key}/{event_id}` | `update_member_schedule_event_route_...` |
| DELETE | `/api/member-schedules/{member_key}/{event_id}` | `delete_member_schedule_event_route_...` |
| PUT | `/api/member-schedules/{member_key}/{event_id}/outcome` | `update_member_schedule_event_outcome_route_...` |
| DELETE | `/api/member-schedules/{member_key}/clear-testing-data` | `clear_testing_data_route_...` |
| POST | `/api/member-leave/{member_key}` | `create_member_leave_record_route_...` |
| PUT | `/api/member-leave/{member_key}/{leave_id}` | `update_member_leave_record_route_...` |
| DELETE | `/api/member-leave/{member_key}/{leave_id}` | `delete_member_leave_record_route_...` |

Total: 21 HTTP operations registered (the 10 above + 11 unauthenticated GET routes: Task list/daily/weekly/monthly reports/weekly export, Leave list/summary, 3 Staff read routes, `/health`). None of the 9 core business-logic function names (`create_member_schedule_event`, `create_member_schedule_events_bulk`, `update_member_schedule_event`, `delete_member_schedule_event`, `update_member_schedule_event_outcome`, `clear_testing_data`, `create_member_leave_record`, `update_member_leave_record`, `delete_member_leave_record`) appear as a registered path operation anywhere in the schema — they remain plain Python functions, directly callable (with no auth) only by the pre-existing test suite that already did so, never independently reachable over HTTP. For every wrapper, code reading confirms the order is: (1) `_validate_member_key` (404 for an unknown member), (2) `require_matching_member` (403 on acting-member mismatch), (3) delegation to the core function — which is the only point any database session is touched. No database access occurs before authorization on any of the 9 routes. **No defect found; no route-level correction was required.**

## 11. Corrections applied during this same-day security review

- `.env.example`: removed trailing whitespace on the `CALENDAR_AUTH_TOKEN_HASH_RAJIV` line and an extra blank line at end-of-file — both flagged by `git diff --check` (now exits 0). Placeholder content itself (`set_a_real_token_hash_here` for all five variables) was already names/placeholders-only with no real value; this was a whitespace-only fix, not a content or security correction.
- Configuration error-message review confirmed: the per-variable `RuntimeError` messages raised by `backend/config.py load_calendar_auth_token_hashes` (e.g. naming which `CALENDAR_AUTH_TOKEN_HASH_*` variable is missing/malformed) are caught by `backend/routers/calendar_auth.py`'s per-request path and converted to one fully generic `401 "Calendar authorization is not available."` before ever reaching a client — the variable-naming detail is visible only in server-side startup logs, never in any HTTP response. No secret value (hash or token) appears in any error message, startup or per-request. No correction was required here.
- Dependency, CORS, and frontend token-handling reviews (backend/requirements.txt diff, `allow_headers`/`allow_credentials`/origin allowlist, and `auth.js`/`instance.js` token-in-header-only/no-console-logging/no-innerHTML/no-token-redisplay behavior) found no defects requiring correction.

## 12. Commit-inventory correction (2026-07-31)

The implementation was committed as `bcedadc145837043cddcaa3c55cb8b7bb21c3946` (branch `feat/calendar-member-token-authorization`, base `f5cdbb8`) and pushed to `origin`. A follow-up review found that the prior closing report's phrasing — "All 23 files from the implementation plus the 3 evidence files" — read as if 3 additional files existed beyond the 23, implying 26. This was a **reporting-wording error only**, verified against Git as the source of truth:

```bash
git diff --name-status f5cdbb8..bcedadc145837043cddcaa3c55cb8b7bb21c3946
git diff --stat        f5cdbb8..bcedadc145837043cddcaa3c55cb8b7bb21c3946
```

**Commit `bcedadc` contains 23 unique changed files in total: 10 added and 13 modified (0 deleted).** The requirement, validation, and handover files (`docs/2026-07-29_calendar-member-token-authorization-requirement.md`, this file, and `handover/2026-07-29__calendar-member-token-authorization-closure.md`) are three of the 10 **added** files — they are already included within the 23, not three files in addition to it. No file was added, removed, or changed as part of this correction; only the prior report's wording was inaccurate. A repeat secret scan of the full commit diff found no real token, hash, or production credential, and the protected path `member-aios/mayurika-hr/staff-data/` does not appear anywhere in the commit.

## 13. Frontend UX correction (2026-07-31)

A focused frontend-only follow-up pass, branched as `fix/calendar-auth-ux-corrections` off `main` (which by this point already includes the merged PR #2). **No backend route, schema, or authorization rule was changed** — the backend already returned `actingMember`/`targetMember` in its 403 `detail` body (`backend/routers/calendar_auth.py require_matching_member`, unchanged), which is all this pass needed. Files touched: `web-view/js/calendar/auth.js`, `web-view/js/calendar/instance.js`, `web-view/js/ui/error-mapper.js`, `web-view/index.html`, `web-view/css/base.css`, `web-view/css/ui.css`, `web-view/js/calendar/auth.test.mjs`, `web-view/js/calendar/auth-test-dom.mjs`.

### 13.1 UX requirement addressed

Five confirmed problems from the approved UX correction: (1) the topbar control's wording ("Forget or change token") was confusing; (2) clicking it destructively cleared authorization instead of opening a token-entry form; (3) a cross-member mutation attempt could leave the Create/Edit modal open behind (or interleaved with) the authorization dialog; (4) the cross-member error toast was not visually distinct enough as an error; (5) an invalid token, Cancel, a network failure, a 401, or a 403 could leave the originating Task/Leave button stuck showing "Saving…".

### 13.2 Exact wording changes

| Element | Before | After |
| --- | --- | --- |
| Topbar control text | "Forget or change token" | "Change token" |
| Topbar control id | `calendarAuthForgetBtn` | `calendarAuthChangeTokenBtn` |
| Topbar control CSS class | `.topbar-calendar-auth-forget` | `.topbar-calendar-auth-change-btn` |
| Dialog title (new mode) | — | "Change Calendar token" |
| Dialog description (new mode) | — | "Enter a different member token for this browser. Your current authorization will remain active until the new token is verified." |
| Dialog submit button (new mode) | — | "Change token" (Cancel unchanged) |
| Success confirmation | — | "Calendar authorization changed to `<member>`." (toast) |
| Cross-member alert title | generic "Not authorized for this member" (KNOWN_ERRORS fallback, now used only if the dynamic labels are ever missing) | "You can't manage `<selected member>`'s Calendar" |
| Cross-member alert message | generic "You can only manage your own Tasks and Leave." (same fallback-only status) | "You are authorized as `<acting member>`. You can only create or change `<acting member>`'s Tasks and Leave." |

### 13.3 Change-token behavior

Implemented as a second `open()` mode on the SAME lazy-singleton dialog `ensureAuthorized()` already used (`web-view/js/calendar/auth.js`, `ensureTokenDialog()`), parameterized by title/message/submit-label/`announceSuccess` rather than a second dialog implementation. `openChangeTokenDialog()` (new, exported): opens immediately on click (no intermediate confirmation step), never calls `clearStoredAuth()` on open, never prefills the input from the currently-saved token (the input is always built empty via `createElement` and only ever cleared, never populated, by `close()`), and only calls `writeStoredAuth()` — replacing the prior token — after `verifyToken()` resolves successfully. Always resolves (never rejects) with a boolean, so the topbar click handler needs no `.catch()`.

### 13.4 Retain-on-cancel / retain-on-invalid behavior

Verified by `auth.test.mjs`: Cancel and Escape both resolve `openChangeTokenDialog()` with `false` and leave `getStoredToken()`/`getStoredMemberKey()` completely unchanged (the original token). An invalid replacement token (mocked 401 from `/api/calendar-auth/verify`) shows the existing inline red error, keeps the dialog open for correction, and — critically — also leaves the original stored token unchanged (never partially overwritten). A cross-member 403 from the backend (existing behavior, confirmed unchanged) likewise never triggers `handleUnauthorizedResponse()`/`clearStoredAuth()` — only a genuine 401 does that.

### 13.5 Cross-member alert result

New `guardMutationAccess(targetMemberKey)` (`auth.js`) is the single pre-flight gate called by every mutation-initiating UI action before its own modal/confirmation/form ever opens and before any request is sent: `instance.js`'s `openCreatePopup()` (the one shared entry point for Task create, Bulk Task create, Task edit-open, Leave create, and Leave edit-open), `deleteItem()` (Task delete), `deleteLeaveRecord()` (Leave delete), and both Task Outcome click handlers (Mark Completed, Mark Uncompleted). Verified by `auth.test.mjs`: a cross-member attempt (token already verified for a different member than the current calendar tab) resolves `false`, shows the dynamic alert (§13.2), retains the valid token, and never opens an authorize dialog. A first-time attempt (no token yet) opens "Authorize this browser" first; once verified, a matching member resumes the original action exactly once, a mismatched member shows the same alert without ever reopening the dialog ("do not reopen the token dialog after a valid 403" — this is the equivalent already-authorized-elsewhere case, handled identically). The identical dynamic copy is also used as the fallback for the rare residual backend-403 case (`instance.js` `apiRequest`/`leaveApiRequest`, now attaching `actingMemberLabel`/`targetMemberLabel` resolved via `auth.js`'s exported `labelForMemberKey`; `ui/error-mapper.js` `mapApiError` renders from those two fields, keeping `ui/*` a leaf module with no calendar/DOM import of its own).

### 13.6 Red error styling result

`ui/toast.js`'s error toast already had a red left border and red icon (`var(--error)`, tokens.css's `#b91c1c` — the same "blocked" red already used elsewhere for accessible error text, e.g. `--status-error-text`). Added: `.ui-toast--error .ui-toast-title`/`.ui-toast-message` now also render in `var(--error)`, so title, description, icon, and border are all consistently red. Color is never the only signal — the icon (✕) and the message text remain regardless of color perception. Every error/warning toast already renders with `role="alert"` (unchanged, `ui/toast.js`), which is treated as an implicit assertive live-region announcement by browsers — no separate `aria-live` wrapper was needed on top of that. The dismiss control was already a real, keyboard-focusable `<button>` with visible hover/focus-visible states — confirmed adequate, not modified.

### 13.7 Busy-state reset result

Every `setButtonBusy(btn, false)` reset that follows a mutation's promise chain was converted from `.then(fn)` to `.finally(fn)` (`addBtn`/Task create, `updateBtn`/Task update, `triggerBtn`/Task outcome, `bulkCreateBtn`/Bulk create, `leaveCreateBtn`/Leave create, `leaveUpdateBtn`/Leave update) — this restores the button on every settlement path (success, business-rule rejection, network failure, and now also `auth_cancelled`/`auth_required`/`cross_member_denied`) unconditionally, rather than relying on each flow's own internal `.catch()` never re-throwing. Task/Leave Delete and Task Outcome's confirmation step use the shared `ui/dialog.js` `confirmDestructive()`, whose own busy-state handling was already unconditional (`settle()` always resets its internal confirm button; a rejected/`false`-returning `onConfirm` also resets it) — confirmed unchanged and adequate. The NEW pre-block gate itself never marks a "Saving…" state on the triggering button while its own dialog is open (opening a popup, or the pre-block check, was never a network operation) — only the dialog's own "Verifying…" submit button shows busy state during that phase, and it is reset on every exit path (Cancel, Escape, close button, invalid token, network failure) via the existing `close()`/`catch()` logic in `ensureTokenDialog()`, confirmed via `auth.test.mjs`.

### 13.8 Keyboard/focus result

Verified by `auth.test.mjs`: opening either dialog mode moves focus to the token input; Escape and Cancel close without changing the saved token; focus returns to whichever control triggered the dialog (the "Change token" button, or whatever had focus before a mutation's first-time authorize flow) on every close, including after a successful replacement; the input remains focused and available for correction after an inline verification error.

### 13.9 Desktop / mobile / 200% zoom results

**Not verified in a live browser this session** — no browser automation/screenshot tool was available in this environment (checked via tool search; none found). Coverage for this pass is: (a) 30 automated `auth.test.mjs` tests exercising the real code paths through a hand-rolled DOM stand-in (not pixel/layout rendering), and (b) a code-level responsive review: the new topbar indicator reuses the existing flex-row topbar (no new fixed pixel widths/heights), and a new `max-width: 58vw` + label ellipsis-truncation rule was added at the existing `max-width: 640px` breakpoint (`web-view/css/base.css`) so the indicator degrades gracefully on narrow viewports without ever shrinking or hiding the "Change token" button itself, mirroring the existing `.topbar-planning-warning` narrow-viewport pattern. 200% zoom was not independently modeled — it was not distinguished from the narrow-viewport case in this review, since browser zoom and a narrower effective viewport produce the same CSS layout constraints. A live desktop/mobile/200%-zoom walkthrough remains a pre-merge action item (§13.11).

### 13.10 Test totals

- New/updated file: `web-view/js/calendar/auth.test.mjs` — **30/30 passing** (up from 12; net +18: Change-token dialog open/prefill/cancel/invalid/success/wiring, `crossMemberAlertCopy`/`guardMutationAccess` pre-block behavior for both already-authorized and first-time-authorization paths, keyboard/focus, and a static regression guard reading the real `index.html` for the "Change token" wording).
- Complete Calendar frontend suite (`node --test *.test.mjs` from `web-view/js/calendar/`): **117/117 passing** (87 pre-existing + 30 auth), zero regressions.
- Backend: not touched this pass; not re-run (no backend file in this session's diff — confirmed via `git status --short`).

### 13.11 Screenshot paths

None — no browser tool was available to capture any, and the task explicitly prohibits tokens/hashes appearing in any screenshot or evidence file, so none were fabricated or simulated.

### 13.12 Remaining limitations (this pass)

1. No live browser walkthrough (desktop, mobile, or 200% zoom) — code-level/automated-test coverage only (§13.9).
2. The `.finally()` busy-state hardening (§13.7) is a genuine, verified defensive improvement, but was not re-confirmed via a live click-through — only via code reading and the existing automated suite (which does not drive real `setTimeout`-based network timing).
3. All limitations already carried from §9 (shared-secret-per-member model, localStorage/XSS exposure, no CSP/script audit, no per-device token, audit-log scope) are unchanged and still open.
4. This pass has not been committed, pushed, or reviewed as of this section being written — see the handover document for the commit/push record once complete.

### 13.13 Final status (this pass)

**AMBER** — implementation and automated tests complete and passing; a live browser walkthrough, CSP/script review, and reviewer sign-off remain pending, consistent with the overall feature's status.

### 13.14 One next step

Commit and push this pass (see handover document), then request reviewer sign-off before a live desktop/mobile/200%-zoom walkthrough is performed against a running preview.

## 14. Show/hide token toggle (2026-07-31 usability addition)

A small, focused usability addition on branch `feat/calendar-auth-token-visibility-toggle` (off `main`, which by this point includes both prior UX-correction merges). **No backend, token-validation, or localStorage-structure change** — purely a frontend input-masking convenience.

### 14.1 Eye icon requirement

Add a show/hide toggle to the member-token input in both dialog modes ("Authorize this browser" and "Change Calendar token"), masked by default, revealing only the currently-typed value in that one open input.

### 14.2 Files changed

`web-view/js/calendar/auth.js` (the toggle button, icon rendering, and visibility state — added to the one shared dialog builder both modes already use, no duplicate input component), `web-view/css/ui.css` (positioning/sizing/hover/focus-visible styles), `web-view/js/calendar/auth-test-dom.mjs` (added `document.createElementNS` support — a documented alias to the existing `createElement`, since the fake DOM does no real rendering and the SVG namespace is otherwise irrelevant to it), `web-view/js/calendar/auth.test.mjs` (7 new tests).

### 14.3 Show/hide behavior result

Implemented as one boolean (`tokenVisible`) toggling `inputEl.type` between `'password'` and `'text'` — never touches `inputEl.value` itself, so the typed value is provably unaffected by toggling (verified by test). Icon is a real inline SVG (`document.createElementNS`, not `innerHTML`, matching this dialog's existing no-innerHTML convention) — an eye outline + pupil by default, with an added diagonal slash line once visible, re-rendered on every toggle. Clicking the icon keeps focus in the token input itself (a deliberate UX choice — toggling should not interrupt typing).

### 14.4 Accessibility result

`aria-label` switches between `"Show token"` and `"Hide token"`; `aria-pressed` switches between `"false"`/`"true"` alongside it (a natural, correct addition for a toggle-button role, not explicitly required but low-cost and standards-correct). It is a real `<button type="button">` — Tab reachability and Enter/Space activation are native browser behavior, not custom key handling (confirmed: `ui/popup.js`'s `trapTab`/`getFocusableEls` selector already includes `button:not([disabled])`, so no focus-trap change was needed). `:focus-visible` gives a visible focus ring using the same `var(--focus-ring)` token every other control in this dialog uses. The decorative SVG itself carries `aria-hidden="true"` — the button's own `aria-label` is the sole accessible name.

### 14.5 No-prefill / no-reveal result

The toggle button never calls `getStoredToken()`/`readStoredAuth()` and never writes `inputEl.value` — it only ever reads/writes `inputEl.type` and its own `aria-*`/icon state. Verified by a dedicated test: with a real token already saved, opening "Change Calendar token" and toggling visibility on the (still-empty) input reveals nothing, because there is nothing in the field to reveal — the saved token itself is asserted unchanged throughout. `close()` (fired on every exit path — Cancel, Escape, backdrop click, successful submit) now also calls `setTokenVisible(false)`, so a dialog left visible is never carried into the next open.

### 14.6 Desktop / mobile / 200% zoom result

**Not live-tested** — same tooling gap as the prior UX-correction pass (no browser automation available in this environment). Code-level review: the input keeps `box-sizing: border-box` (pre-existing), so the new `padding-right: 40px` (room for the icon) can never push the input wider than its container at any viewport width — no overflow risk. The icon button is `28×28px` (CSS px), meeting the WCAG 2.2 AA minimum target size (24×24px) and consistent with this app's existing compact icon-button sizing elsewhere (e.g. `ui/toast.js`'s dismiss button). At 200% browser zoom, all sizing is in relative/px units that scale uniformly with the rest of the page — no fixed-viewport-unit sizing was introduced that could break independently of the rest of the dialog.

### 14.7 Test totals

- `auth.test.mjs`: **37/37 passing** (up from 30; net +7: masked-by-default in both modes, toggle-to-visible-and-back, aria-label/aria-pressed updates, native keyboard/focus semantics, reopen-resets-to-masked, no-reveal-of-saved-token, toggle present and functional in both dialog modes).
- Complete Calendar frontend suite: **124/124 passing** (87 pre-existing + 37 auth), zero regressions.
- Backend: not touched, not re-run (no backend file in this pass's diff).

### 14.8 Screenshot paths

None — no browser tool was available, and no token/hash may appear in any screenshot regardless.

### 14.9 Remaining limitations

1. No live browser walkthrough (desktop, mobile, 200% zoom) — same gap as §13.12, still open.
2. Icon is a small hand-built SVG (open eye / slashed eye), not a design-system icon library asset — visually simple by design, not pixel-matched against any external icon set.
3. All limitations carried from §9/§13.12 (shared-secret-per-member model, localStorage/XSS exposure, no CSP/script audit) remain open and unaffected by this pass.

### 14.10 Final status (this pass)

**AMBER** — implementation and automated tests complete and passing; live-browser validation remains pending, consistent with the overall feature's status.

### 14.11 One next step

Commit and push (see handover document), then fold this into the same pending live-browser walkthrough already queued for the rest of the feature.
