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
