# Authenticated-Only Staff Data, Issues, and Knowledge Management — Validation Check — 2026-08-10

*(Requirement: `docs/authenticated-module-access-requirement-2026-08-10.md` — REQ-AUTH-MODULES-007)*

## 1. Git gate

| Check | Result |
|---|---|
| Starting branch | `main` |
| Starting HEAD | `e83bbf033ba8b0a182624905ff1bc9a44947f310` |
| `origin/main` | same commit — 0 ahead / 0 behind |
| Unrelated tracked work at start | None. One pre-existing untracked file (`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md`) was already present and untouched by this task. |

## 2. Auth architecture reused

Confirmed by inspection, no new system introduced:

- **Backend:** `get_verified_member` / `require_matching_member` (`backend/routers/calendar_auth.py`) — unchanged. Applied as a new `Depends(get_verified_member)` on 5 previously-public GET routes.
- **Frontend:** `getStoredToken`/`getStoredMemberKey`/`ensureAuthorized`/`handleUnauthorizedResponse`/`CALENDAR_AUTH_CHANGED_EVENT` (`web-view/js/calendar/auth.js`) — unchanged, reused by a new shared module `web-view/js/auth-gate.js`.
- No new login form, no new token type, no new localStorage key.

## 3. Staff Data

| | Before | After |
|---|---|---|
| `GET /api/staff` | Public | Requires `Depends(get_verified_member)` |
| `GET /api/staff/summary` | Public | Requires `Depends(get_verified_member)` |
| `GET /api/staff/filter-options` | Public | Requires `Depends(get_verified_member)` |
| Staff Data sidebar tab | Always reachable, fetched on boot regardless of visibility | Locked (visible, `aria-disabled`) until authenticated; fetches nothing until authenticated |
| Direct tab activation | Always worked | Blocked — `activatePanel()` refuses and opens the token dialog instead |
| **PH Staff Data pilot embedded in Arun's Calendar tab** (`#arun-staff-pilot`) | Public, fetched on boot | Gated — placeholder shown, no fetch, until authenticated (design decision, §4 of the requirement doc) |
| **PH Staff Data pilot embedded in Paraparan's Calendar tab** (`#paraparan-staff-pilot`) | Public, fetched on boot | Gated, same as above |
| KPI panel inside those same two tabs | Public (synthetic, non-Staff-API data) | **Unaffected** — still public, still renders unconditionally |
| Content/schema | — | Unchanged — 0 fields added/removed/renamed |

## 4. Issues

Issues has no dedicated backend API (frontend-only, per `docs/2026-08-10_management-issues-frontend-requirement.md`) — its only server dependency is the Staff Data API above (Raised-By/Team dropdown source), now itself protected.

| | Before | After |
|---|---|---|
| Issues sidebar tab | Always reachable | Locked until authenticated; direct activation blocked |
| Workspace mount / Staff+Team option fetch | Ran on boot regardless of auth | Only runs once authenticated (`getAuthenticatedMemberKey()` gate in `mountIssuesWorkspace`) |
| Assignment authority (`hasAssignmentAuthority`) | Exact-identity allowlist (`rajiv`, `md`) | **Unchanged** — a separate question ("can this authenticated user assign") from authentication ("can this user enter/read") |

## 5. Knowledge Management

| Route | Before | After |
|---|---|---|
| `GET /api/knowledge-documents` (list) | Public | Requires `Depends(get_verified_member)` |
| `GET /api/knowledge-documents/{id}` (detail) | Public | Requires `Depends(get_verified_member)` |
| `GET /api/knowledge-documents/deleted` | Auth-required | Unchanged |
| `.../versions`, `.../audit` (GET) | Auth-required | Unchanged |
| create / edit / version / archive / unarchive / delete / restore | Auth-required | Unchanged |
| KM sidebar tab / workspace mount | Fetched on boot regardless of auth | Placeholder shown, no `list()` call, until authenticated |
| Schema | — | Unchanged |

All 12 KM read/write routes now require authentication (was already true for 10 of 12; list/detail were the 2 that changed).

## 6. Sidebar / navigation

- Staff Data, Issues, Knowledge Management nav items: **never hidden** — visible, focusable, marked `aria-disabled="true"` + `.app-nav-btn--locked` while unauthenticated (an unauthenticated user still needs a discoverable way to start authorization).
- Clicking a locked item opens the existing "Authorize this browser" token dialog; the panel activates automatically only on a confirmed successful authorization.
- Direct/programmatic tab activation is blocked at the single shared choke point (`navigation.js`'s `activatePanel()`), not just at the click handler — the only other panel-switch caller in this codebase (`[data-goto]` snapshot-card jumps) goes through the same function.
- On authorization: locked state clears and the module fetches/mounts, live, no page refresh (`CALENDAR_AUTH_CHANGED_EVENT`).
- On auth loss (401 / token cleared) while a protected panel is the active one: navigation falls back to the default public tab (`root-aios`); a public panel being active at the time of auth loss is left untouched.
- Unrelated public navigation (Root AIOS, File Map, member Calendar tabs, Review Summaries) — unaffected; explicitly covered by a regression test.

## 7. Test results (literal totals)

### Backend — `python -m unittest discover -s backend/tests -p "test_*.py"`

```
Ran 884 tests in 11.951s
FAILED (failures=2)
```

Both failures are **pre-existing and unrelated** — confirmed via `git stash` against the unmodified baseline before this task began:
- `test_calendar_auth.StartupConfigurationValidationTests.test_missing_variable_fails_closed`
- `test_weekly_schedule_xlsx_export.TaskRowTests.test_pending_task_no_outcome`

New/changed backend tests for this requirement:
- `backend/tests/test_staff_auth.py` — **new file**, 9 tests (unauthenticated/authenticated list, filter-options, summary; invalid token; cross-member read parity including MD).
- `backend/tests/test_knowledge_documents.py` — 3 new tests (`test_25b_unauthenticated_list_rejected`, `test_25c_unauthenticated_detail_rejected`, `test_md_can_read_list_and_detail`), plus 6 existing LIST/DETAIL tests updated to carry an auth header.
- `backend/tests/test_md_review_summary_authorization.py` — 1 existing test (`test_md_gains_no_additional_staff_data_access`) rewritten for the new 401-when-unauthenticated reality; 1 docstring corrected.
- `backend/tests/test_staff_review_summaries.py` — 2 existing tests given an auth header.

All new/updated tests pass. **66/66** in `test_knowledge_documents.py` alone, **9/9** in `test_staff_auth.py` alone.

### Frontend — `node --test *.test.mjs calendar/*.test.mjs` (from `web-view/js/`)

```
tests 541
pass 541
fail 0
```

New frontend tests for this requirement:
- `web-view/js/navigation.test.mjs` — **new file**, 13 tests (sidebar lock state, direct-activation blocking for all 3 protected tabs, unrelated-nav regression, live auth-grant/auth-loss transitions).
- `web-view/js/auth-gate.test.mjs` — **new file**, 7 tests (shared module's exported primitives).
- `web-view/js/staff-data.test.mjs` — **new file**, 5 tests (Staff Data tab gate, embedded PH pilot gate, 401 handling).
- `web-view/js/issues.test.mjs` — 3 new tests (unauthenticated placeholder + zero fetch, production-default placeholder, authenticated real workspace).
- `web-view/js/knowledge-management.test.mjs` — 2 new tests (unauthenticated placeholder + zero `list()` call, re-mount-after-authorization).
- `web-view/js/navigation-test-dom.mjs` — new, purpose-built DOM/localStorage stand-in (no `.test.` in the name — not picked up by the test runner itself).
- `web-view/js/review-summaries-test-dom.mjs` — one additive method (`insertBefore`) added to the existing shared stand-in; every existing caller unaffected (all pre-existing tests in files that reuse this stand-in still pass).

## 8. DB / schema changes

**Zero.** No migration file, no model change, no column added/removed/renamed. This is a read-authorization change only.

## 9. Known limits

- **No live-server verification.** This environment has no PostgreSQL credentials for the real `management_aios` database (`backend/README.md`'s own documented testing/demo boundary — the app does not create/migrate schema and must be pointed at a real Postgres instance). Verification here is the automated HTTP-level test suite (`fastapi.testclient.TestClient` against the real `backend.main.app`, isolated in-memory SQLite per test) — the same request/dependency/routing code path a live server uses, but not a literal running deployment. A live-server smoke check (`curl` against a real `DATABASE_URL`-backed instance) is recommended before/at next deploy.
- The two pre-existing backend test failures (§7) are unrelated to this change and were not investigated further — out of scope.
- `GET /api/staff/summary` has no known frontend consumer today (confirmed by repo-wide search); it was protected anyway as part of the same router/domain, since leaving one read route in the domain public while the other two are protected would not close the stated gap.

## 10. PASS / FAIL

**PASS.**
