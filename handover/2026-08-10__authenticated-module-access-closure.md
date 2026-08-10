# Handover — Authenticated-Only Staff Data, Issues, and Knowledge Management Closure (REQ-AUTH-MODULES-007)

**Date:** 2026-08-10
**Requirement:** REQ-AUTH-MODULES-007
**Status:** Backend + frontend implementation complete, tested, committed locally. **Not pushed.**

---

## What this closes out

Staff Data, Issues, and Knowledge Management were reachable — both their frontend tabs and their underlying API reads — without any authentication. Anyone with the app URL (or the API base URL directly) could view staff records and internal Knowledge Management documents. This closes that gap by requiring the existing Calendar member token everywhere those three modules read or write data:

1. **Backend:** `GET /api/staff`, `GET /api/staff/summary`, `GET /api/staff/filter-options`, `GET /api/knowledge-documents` (list), and `GET /api/knowledge-documents/{id}` (detail) now all require `Depends(get_verified_member)` — the same dependency every Calendar mutation route already used. Issues has no dedicated backend of its own (frontend-only), so protecting the Staff API also closes its one server dependency.
2. **Frontend:** a new shared guard (`web-view/js/auth-gate.js`) locks the three sidebar items (visible but `aria-disabled`, never hidden) and blocks direct/programmatic tab activation while unauthenticated, at the single choke point every panel switch already goes through (`navigation.js`'s `activatePanel()`). Each module independently withholds its own data fetch until authenticated and re-mounts live on every authorization change — no page refresh needed.
3. **A real conflict was found and resolved with the project owner's sign-off, not silently worked around:** the Staff API is also used, unauthenticated, by a "PH Staff Data" pilot embedded inside Arun's and Paraparan's own Calendar tabs — tabs otherwise documented as always public. The decision (confirmed via `AskUserQuestion`) was to gate those two embedded pilots as well, since it is the same Staff Data, just shown in a second place; the rest of those two Calendar tabs is untouched and still fully public.

Full detail: [docs/authenticated-module-access-requirement-2026-08-10.md](../docs/authenticated-module-access-requirement-2026-08-10.md)
Full test/scope validation: [validation/authenticated-module-access-check-2026-08-10.md](../validation/authenticated-module-access-check-2026-08-10.md)

## What a Management Team reviewer should know

- **This is not yet live for real users.** This commit exists locally on `main` and has not been pushed to `origin/main`. Nothing changes in production until explicitly pushed.
- **No new authorization system.** All three modules now use the exact same "Authorize this browser" token dialog every other authenticated feature (Calendar mutations, Review Summaries, Knowledge Management mutations) already used.
- **Assignment authority in Issues did not change.** Who may *enter and read* Issues (this task) and who may *assign* an Issue (`hasAssignmentAuthority` — Rajiv and MD only) remain two independent checks; only the first one changed.
- **The Arun/Paraparan PH Staff Data pilots are now gated too** — see point 3 above. If a Management Team member expected to see that panel without authorizing first, that is the intended new behavior, not a bug.
- **No content, schema, or database change of any kind.** This is a read-authorization change only.

## Verification performed this session

- Backend: 66/66 Knowledge Management tests passing (63 existing + 3 new), 9/9 new Staff Data auth tests, full backend suite 884 tests with 2 pre-existing failures unrelated to this work (confirmed via `git stash` against the pre-task commit).
- Frontend: full suite 541/541 passing, including 30 new tests across 3 new test files (`navigation.test.mjs`, `auth-gate.test.mjs`, `staff-data.test.mjs`) and additions to `issues.test.mjs`/`knowledge-management.test.mjs`. Zero regressions.
- Zero database/schema changes. Zero production writes from any test (all backend tests run against an isolated in-memory SQLite database).
- **Not verified against a live, database-backed server** — this environment has no PostgreSQL credentials for the real `management_aios` database. Verification is the automated HTTP-level test suite (`fastapi.testclient.TestClient` against the real app, same routing/dependency code path a live server uses). A live-server smoke check is recommended at next deploy.

## Known limitations carried forward

1. `GET /api/staff/summary` has no known frontend consumer today but was protected anyway, as part of the same domain as the two routes that do have consumers — leaving one read route in the domain public would not have closed the stated gap.
2. Live-server verification (real Postgres, real deployed frontend) has not been performed in this session — see §9 of the validation doc.

## One next step

At next deploy, run a manual live-server smoke check: confirm `curl https://management-aios-api.vercel.app/api/staff` (no header) returns 401, and that the same call with a valid `Authorization: Bearer <token>` header returns 200 — then repeat for `GET /api/knowledge-documents`.
