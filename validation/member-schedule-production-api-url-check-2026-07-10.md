# Member Schedule Frontend — Production API URL Finalization Check (2026-07-10)

**Task type:** Local frontend edit only. No commit, no push performed.

---

## 1. URLs

- **Frontend URL:** `https://management-aios.vercel.app`
- **Backend URL:** `https://management-aios-api.vercel.app`
- **Local API URL:** `http://127.0.0.1:8000/api/member-schedules`
- **Production API URL:** `https://management-aios-api.vercel.app/api/member-schedules`

## 2. Change made

`web-view/index.html` — `MEMBER_SCHEDULE_API_BASE` (single centralized declaration, unchanged
location, unchanged local/hosted branching logic):

- `PRODUCTION_BASE` changed from the placeholder
  `https://REPLACE_WITH_ACTUAL_BACKEND_PROJECT.vercel.app/api/member-schedules` to the real hosted
  backend value `https://management-aios-api.vercel.app/api/member-schedules`.
- `LOCAL_BASE` unchanged: `http://127.0.0.1:8000/api/member-schedules`.
- Branch condition unchanged: `localhost`/`127.0.0.1` hostname → `LOCAL_BASE`; any other hostname
  (including the hosted production dashboard) → `PRODUCTION_BASE`.
- Only the surrounding comment text and the `PRODUCTION_BASE` string literal changed — no other
  line in the diff (confirmed via `git diff -- web-view/index.html`).

## 3. Placeholder removal result

Confirmed fully removed — `grep -n "REPLACE_WITH_ACTUAL_BACKEND_PROJECT" web-view/index.html`
returns no matches.

## 4. Six-tab / four-calendar check

- `.tab-btn` count: 6 (unchanged)
- `.msc-instance` count: 4 (unchanged — mayurika, suman, arun, rajiv)
- `MEMBER_SCHEDULE_API_BASE` declaration count: 1 (still centralized, not duplicated)
- `localStorage.getItem`/`setItem` calls: 0 (still none — not restored)
- `ACTIVE WITH LIMITS` (Rajiv) occurrences: 5 (unchanged)
- Testing/pilot wording (`Testing Preview Only`, `testing/demo`, `dashboard_testing`) occurrences: 3
  (unchanged)

## 5. Calendar CRUD/fetch logic

Unchanged. `git diff -- web-view/index.html` shows exactly one hunk, touching only the block
comment and the `PRODUCTION_BASE` line inside the `MEMBER_SCHEDULE_API_BASE` IIFE. No other
function (`apiItemToFrontend`, `frontendToApiPayload`, `mountScheduleCalendarInstance`, fetch
helpers, modal/accessibility logic) was touched.

## 6. Credential scan

Scanned `web-view/index.html` for connection-string patterns, `neon.tech`, `neondb_owner`, `npg_`
prefix, and `DATABASE_URL` — no matches. No database value is hardcoded in the frontend; the file
only ever calls the backend's HTTP API.

## 7. Protected files changed

None. `CLAUDE.md`, `evidence/source-register.md`, `context/verify-register.md`, and all
`member-aios` source files are untouched. GAP-40/GAP-44 not referenced or changed.

## 8. Git status

```
 M backend/__pycache__/__init__.cpython-314.pyc
 M backend/__pycache__/config.cpython-314.pyc
 M backend/__pycache__/database.cpython-314.pyc
 M backend/__pycache__/main.cpython-314.pyc
 M backend/__pycache__/models.cpython-314.pyc
 M backend/__pycache__/schemas.cpython-314.pyc
 M backend/routers/__pycache__/__init__.cpython-314.pyc
 M backend/routers/__pycache__/member_schedules.cpython-314.pyc
 M web-view/index.html
```

The 8 modified `.pyc` files are pre-existing tracked-bytecode noise, unrelated to and untouched by
this task. `git diff --check` on the full working tree: clean (no whitespace errors).

## 9. Commit / push

**NONE.** No `git add`, `git commit`, or `git push` was run.

## 10. Verdict

**AMBER.**

The frontend edit itself is complete and passes every verification listed above. Verdict is AMBER
rather than PASS because this task did not independently confirm the hosted backend is actually
serving successfully (no `/health` check was run or supplied as part of this task) — the previous
task's fix (`pyproject.toml` dependency declaration, commit `adfc6c9`) was pushed but its real-world
Vercel build result has not yet been confirmed in this session. Once `https://management-aios-api.vercel.app/health`
is confirmed returning `200`, and this frontend change is committed/pushed and redeployed, the
end-to-end production wiring can be verified with the manual four-tab test from `backend/README.md`.
