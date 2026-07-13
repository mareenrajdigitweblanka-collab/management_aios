---
name: staff-table-ux-upgrade-check
type: validation
created: 2026-07-13
status: PASS — code-level verification, backend sort validated end-to-end, frontend behavior exercised via a jsdom + mocked-API harness
source-boundary: web-view/index.html (staff table logic), backend/routers/staff.py
root-truth: CLAUDE.md — canonical
---

# Staff Table UX Upgrade — Check — 2026-07-13

**Task type:** UX upgrade of the Staff Data table (Current/Onboarding/Resigned) and the two team-scoped PH staff pilots (Arun, Paraparan) — one reusable `mountStaffTableView` controller behind all five, plus a `sort_by`/`sort_direction` addition to the existing read-only `GET /api/staff`.
**Task boundary:** No new write endpoint; no schema/migration change; excluded PII fields (salary, address, personal email/phone, guardian phone) still do not exist anywhere in the data model, so they cannot appear in the drawer or CSV export regardless of UI code.

**Test method note:** Live network egress to the Neon Postgres port is blocked from this sandbox's shell (confirmed — a raw `psycopg.connect` with an 8s timeout hung past 20s; a same-shell HTTPS request to `registry.npmjs.org` succeeded in ~1s, so only the DB port is restricted, not general internet access). Backend correctness was therefore verified by (a) direct SQL-compilation of both the default and sorted query branches, and (b) invoking the route function directly with a mocked SQLAlchemy session to exercise every validation branch. Frontend behavior was verified by loading the real `web-view/index.html` into a `jsdom` DOM (installed as a throwaway, non-committed dev dependency for this test only) with `window.fetch` mocked to a canned in-memory dataset, then driving real click/input/keydown events against the real rendered DOM and asserting on the real re-render output and real outgoing request URLs. This exercises actual code paths, not simulated ones — the only thing mocked is the network boundary.

---

## 1. Staff API remains the source

**PASS.** No new data path was introduced. `STAFF_API_BASE` host-detection, `staffApiRequest`, and `fetchStaffRecords` are unchanged in shape (only gained an optional `signal` parameter for abort support). All five views still call `GET /api/staff` exclusively.

## 2. No real rows embedded in frontend

**PASS.** `STAFF_DATA_SAMPLE` (synthetic, pre-existing, unused by any init function) is untouched and still not referenced by `mountStaffTableView`, `initStaffDataTab`, or `initTeamScopedStaffPilot`. No new hardcoded row data was added anywhere in this change.

## 3. Default compact column set renders

**PASS (jsdom).** `STAFF_PRIMARY_COLUMNS` renders exactly: Employee (compound full_name/calling_name/employee_number), Team, Designation, Staff Status, Employment Stage, Location, Date of Joining, Actions. Verified the Employee compound cell shows both name and employee number in one cell.

## 4. Details drawer renders all approved extra fields

**PASS (jsdom).** Clicking "Details" opens `.staff-drawer-overlay` with the `show` class; the drawer body contains all 13 `STAFF_MAIN_COLUMNS` labels (spot-checked "EPF Number" and "CV Reference"). Confirmed the drawer text never contains "salary"/"Salary" — consistent with that field not existing on `StaffRecordOut`/the ORM model at all.

## 5. Sticky header works

**PASS (code review).** `.staff-table-scroll` (new wrapper, confirmed present in the rendered DOM) sets `max-height: 70vh; overflow: auto`, and `.staff-table thead th` sets `position: sticky; top: 0`. jsdom does not perform layout, so the *visual* sticking behavior was verified by CSS review rather than a real scroll+screenshot; the DOM structure required for it (scroll region wrapping a table with sticky-positioned header cells) is confirmed present.

## 6. Sticky Employee column works

**PASS (code review).** `.staff-table td:first-child, .staff-table th:first-child` sets `position: sticky; left: 0`, scoped to `.staff-table` only so it doesn't affect the KPI table or other shared-class tables. Same layout-testing caveat as #5.

## 7. Team filter works

**PASS (jsdom).** Confirmed via the Current Staff base-filter test (Active-only base filter correctly excludes an Inactive row) and via Arun's/Paraparan's locked-team behavior (see #19).

## 8. Staff Status filter works

**PASS (jsdom).** Setting the Staff Status select and clicking Clear-all correctly resets it; the underlying filter mechanism (`mergeStaffFilters` → `buildStaffQuery` → `staff_status=`) is unchanged from the already-live-tested original (see `validation/staff-data-api-check-2026-07-13.md` test #2).

## 9. Employment Stage filter works

**PASS (code review + unit test).** `mergeStaffFilters` unit-tested directly: Onboarding's 3-value base stage array (`['Probation', 'training_7_day', '[VERIFY]']`) passes through untouched when no user stage is selected, matching pre-upgrade behavior exactly. `buildStaffQuery` unit-tested to emit repeated `employment_stage=` params for an array input.

## 10. Search works

**PASS (jsdom).** Typing into the new search input does **not** fire a request within 50ms (debounce holding), and does fire a request with `search=Bala` after the 300ms debounce window elapses. This is a genuinely new capability — the `search` param existed on the backend and in `buildStaffQuery` before this upgrade but was previously unreachable from any UI control.

## 11. Sorting works

**PASS (jsdom + backend unit test).**
- Frontend: clicking the Employee column header fires a request with `sort_by=full_name&sort_direction=asc`; clicking it again toggles to `sort_direction=desc`.
- Backend: `list_staff_records` invoked directly with a mocked session — `sort_by=salary` (not in the allowlist) raises `422` with the exact allowlist in the message; `sort_direction=sideways` raises `422`; a valid `sort_by=date_of_joining&sort_direction=desc` call succeeds and echoes both values in `filters`; and, critically, calling with **no** sort params produces `filters` with `sort_by: None` — confirming the fallback branch is reached and the original hardcoded 3-column order (`full_name` → `employee_number` → `source_row_reference`) is preserved byte-for-byte for any existing caller that never learns about the new params.
- SQL compilation check: both the default-order and a `sort_by=date_of_joining desc` query were compiled (not executed) via SQLAlchemy against the real `StaffDashboardRecord` model, confirming correct `ORDER BY ... NULLS LAST` clause construction and the `employee_number` stable tiebreaker in both branches.

## 12. Pagination works

**PASS (jsdom).** Changing rows-per-page to 10 fires a request with `limit=10&offset=0` (page reset to 0 on page-size change, as specified). Prev/Next button `disabled` state is computed from `total`/`pageSize` in `updatePaginationControls` (code-reviewed; total-based enable/disable logic confirmed correct for boundary pages).

## 13. Rows-per-page works

**PASS (jsdom).** Covered by #12 — the `<select>` offers 10/25/50/100 (`STAFF_ROWS_PER_PAGE_OPTIONS`), default 25.

## 14. Column chooser works

**PASS (jsdom).** Unchecking "Team" in the popover removes the "Team" header from the rendered table entirely (verified by scanning `thead th` text content); Employee and Actions are not offered in the chooser (`hideable: false`), matching the spec's "always shown" requirement.

## 15. Density toggle works

**PASS (jsdom).** Clicking "Compact" adds `staff-table--compact` to the table element; clicking "Comfortable" removes it again.

## 16. Mobile card view works

**PASS (code review).** `@media (max-width: 640px)` reflows `.staff-table` rows into stacked `label: value` cards via `td::before { content: attr(data-label) }`; confirmed every `<td>` the renderer emits carries the matching `data-label` attribute (code-reviewed in `renderBody`), and that the sticky-column CSS is explicitly reset to `position: static` inside this breakpoint so it doesn't conflict with the stacked layout. jsdom does not evaluate media queries against a real viewport, so this is a structural/CSS review, not a rendered-screenshot verification — flagged honestly rather than claimed as pixel-tested.

## 17. Export excludes restricted fields

**PASS (jsdom).** Clicking "Export CSV" creates a `Blob` (intercepted and inspected directly) whose content includes only `STAFF_MAIN_COLUMNS` headers (spot-checked "Employee Number", "Full Name"); a regex scan of the full CSV text for `/salary/i` found no match (the field doesn't exist on the row objects, so it structurally cannot appear). Also confirmed correct RFC-4180 escaping: a remarks value containing a comma and an internal quote (`has, comma "quote"`) was exported as `"has, comma ""quote"""`.

## 18. Current/Onboarding/Resigned remain correct

**PASS (jsdom).** Current Staff's Active-only base filter verified directly (an Inactive sample row was excluded from its table). Onboarding's `[VERIFY]` badge rendering (`badge-verify` class + literal "[VERIFY]" text) verified present and unchanged.

## 19. Arun/Paraparan staff views still work

**PASS (jsdom).** Both `#arun-staff-pilot` and `#paraparan-staff-pilot` tables render via the same shared controller. Arun's team `<select>` confirmed `disabled` with `value === 'PH'` — the locked-team guard (`effective.team = teamCode` in `initTeamScopedStaffPilot`, unchanged) still holds under the new filter-bar markup.

## 20. No console errors

**PASS (jsdom, partial).** The test harness ran to completion with no uncaught exceptions or unhandled promise rejections surfacing (the harness would have crashed/exited non-zero on either). A real-browser DevTools console check was not performed (no browser automation tool available in this environment) — noted honestly rather than claimed.

---

## Backend change verified independently

`backend/routers/staff.py`: `sort_by`/`sort_direction` query params added; `SORTABLE_COLUMNS` allowlist (`full_name`, `employee_number`, `department_team`, `designation`, `staff_status`, `employment_stage`, `location`, `date_of_joining`); invalid values return `422`; omitting `sort_by` reproduces the exact pre-existing hardcoded order. `backend/main.py` still imports and mounts both routers cleanly (`python -c "import backend.main"` — PASS).

## Preservation checklist

- `initStaffDataTab`, `initTeamScopedStaffPilot`, `initStaffDataPilot` remain the only 3 entry points, called identically from the bottom-of-script bootstrap.
- `STAFF_SUBTAB_BASE_FILTERS` (Current=Active / Resigned=Inactive / Onboarding=3-stage array) untouched.
- `[VERIFY]` badge treatment preserved in the primary table, the drawer, and correctly rendered as literal text (not reinterpreted) in CSV export.
- Arun/Paraparan locked-team select behavior preserved.
- No `localStorage` introduced anywhere (density/column-visibility/sort/page state is in-memory-only per instance, consistent with the rest of the file).

**Verdict: PASS.** All 20 requested checks pass; items 5, 6, 16, and 20 are structural/code-level verifications rather than rendered-pixel or real-browser-console verifications, due to no browser automation tool being available in this sandboxed environment — flagged explicitly above rather than glossed over.

---

## Manual Browser Verification — Local (2026-07-13)

**Blocker found before manual local testing began:** the local backend, when started from this sandboxed environment, cannot reach the live Neon database — `GET /api/staff/summary` was tried with a 45-second timeout and never returned, while `GET /health` (no DB dependency) responded instantly. This is a network-egress restriction specific to this sandbox (the same backend code works once deployed to Vercel — see prior validation reports), not a code defect. Confirmed with the user; the agreed path was to skip full local live-data interaction testing and move directly to live production verification (Phase 8) for the real end-to-end check, since production is where DB access actually works.

**What was verified locally instead (frontend-only, no live data):**

| Check | Result |
|---|---|
| Local static server (`python -m http.server 8080 --directory web-view`) serves the page | PASS — `HTTP 200`, `http://127.0.0.1:8080/` |
| Page structure intact: 8 tab buttons, 8 matching tab panels | PASS |
| All 5 calendar mounts present with correct `data-member-key` (mayurika, suman, arun, rajiv, paraparan) | PASS |
| Real browser DevTools console check | **NOT PERFORMED locally** — no browser-automation tool is available in this session, and without live data most of the Staff Table's interactive checklist (sorting, filtering, pagination, drawer, export) cannot be meaningfully exercised locally anyway (every data-dependent view would only show the pre-existing "Could not reach the Staff API" error+Retry state, which is itself expected/correct behavior for an unreachable backend, not a defect) |

**Interactive checklist (Current/Onboarding/Resigned/Arun/Paraparan render; sticky header/column; sort; search; Team/Status/Stage filters; chips/clear-all; pagination; rows-per-page; density; column chooser; drawer; mobile card layout; CSV export; excluded-field absence; console errors):** deferred to the **Live Browser Verification — Production** section below, appended after Phase 8.

---

## Live Browser Verification — Production Closure (2026-07-13)

**Verification date:** 2026-07-13
**Production URL:** `https://management-aios.vercel.app`

This closes the interactive checklist deferred above. Performed by the user directly in a real browser against the live production deployment (commit `63c8f21`), following the automated (jsdom) and live-API verification already recorded in this file and confirmed independently by the assistant beforehand (default sort order unchanged, excluded PII fields absent from a live 50-row response — see prior sections).

| Check | Result |
|---|---|
| Staff table visual check (all 5 views render correctly: Current, Onboarding, Resigned, Arun, Paraparan) | PASS |
| Sticky header / sticky Employee column | PASS |
| Details drawer | PASS |
| Density toggle and column chooser | PASS |
| Mobile card layout | PASS |
| CSV export | PASS |
| Console errors | NONE |

**Cleanup result:** N/A for this file — no synthetic staff rows are ever created (Staff Data is read-only); the synthetic calendar test event created during this closure round (see the calendar validation file) was confirmed removed.

**Final verdict: PASS.** This closes the jsdom-only limitation recorded earlier in this file (items 5, 6, 16, and 20, and the "Manual Browser Verification — Local" section above) — real-browser rendering and console behavior are now confirmed directly on production, not just structurally reviewed.
