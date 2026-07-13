---
name: staff-data-actual-data-frontend-check
type: validation
created: 2026-07-13
status: AMBER — code-level/structural verification complete; live browser + real-data tests pending DB access and deployment
source-boundary: web-view/index.html
root-truth: CLAUDE.md — canonical
---

# Staff Data Frontend (Real Data) — Check — 2026-07-13

**Task type:** Convert the Staff Data module from embedded synthetic data to the live Staff API.
**Task boundary:** No real data embedded in HTML/JS source; existing schedule calendars and shared PH KPI pilot state preserved unmodified; no commit/push.

---

## Files Changed

`web-view/index.html` only — extended/modified in place:

- Tab badge, and 3 explanatory `.member-testing-table-note` blocks (Staff Data tab, Arun's PH section, Paraparan tab), rewritten from "synthetic sample data only" language to accurately describe real, live, API-sourced data — while preserving the `TECHNICAL PILOT CLASSIFICATION — BUSINESS RULE [VERIFY]` labeling for the Current/Onboarding/Resigned split, which remains an unresolved business rule regardless of the underlying data being real.
- New CSS: `.staff-table-loading`, `.staff-table-error`, `.staff-total-count`.
- New JS: `STAFF_API_BASE` (mirrors the existing `MEMBER_SCHEDULE_API_BASE` local/production host-detection pattern), `staffApiRequest`, `buildStaffQuery`, `fetchStaffRecords`, `mergeStaffFilters`, `STAFF_SUBTAB_BASE_FILTERS`, `showStaffLoading`, `showStaffError`.
- Rewritten JS: `renderStaffTable` (now shows a "Showing N of TOTAL records" line), `initStaffDataTab`, `initTeamScopedStaffPilot` — all now fetch from the Staff API instead of filtering the in-memory `STAFF_DATA_SAMPLE` array.
- Removed (as dead code once the above was rewritten): the client-side `filterStaffRows`, `classifyCurrentStaff`, `classifyResignedStaff`, `classifyOnboardingStaff` functions — their logic now lives server-side (query params) and in the new `STAFF_SUBTAB_BASE_FILTERS`/`mergeStaffFilters` pair.
- `STAFF_DATA_SAMPLE` (the 10-row synthetic array) **retained**, explicitly re-commented as dev/fallback-only — confirmed unreferenced by any operational code path (grep-verified).
- `PILOT_KPI_STATE`, `renderKpiPanel`, and every other KPI-pilot function/variable: **untouched**.

---

## No Embedded Real Staff Records

**PASS.** Regex-scanned the entire file for `DWL###`-style real employee-number patterns and 9/12-digit NIC patterns: **zero matches**, both before and after this session's edits. No real employee name, NIC, or employee number was ever typed, pasted, or embedded into `web-view/index.html` — the only staff data this file can ever display is fetched live from the Staff API at render time; nothing is baked into the page source.

---

## Structural / Syntax Verification (No Live Browser Required)

| Check | Result |
|---|---|
| HTML tag-stack balance across the whole file | PASS — 0 errors, empty stack at EOF |
| All 3 `<script>` blocks pass `node --check` | PASS |
| `data-tab="..."` ↔ `id="tab-..."` correspondence | PASS — 8/8, unchanged from before this session |
| `.msc-instance` calendar mount count | PASS — still 5 (unchanged — this task did not touch the schedule calendar system) |
| `PILOT_KPI_STATE` / `renderKpiPanel` still present, unmodified | PASS |
| No `DWL###` codes or NIC patterns anywhere in the file | PASS |
| `git diff --check` | PASS |

---

## Reusable Filter Result

**PASS, by construction.** `createStaffFilterBar()` remains the single filter-bar-building function (unchanged signature shape, now taking a plain team-name array instead of a rows array), instantiated 3 times: once for the Staff Data tab (shared across its 3 subtabs), once for the Arun PH view, once for the Paraparan view. `mergeStaffFilters()` is the single function that combines a view's base classification with the user's shared-filter selection, used identically by all 5 consumers (Current Staff, Onboarding Staff Process, Resigned Staff, Arun, Paraparan) — no per-subtab filter logic exists.

---

## Table Columns

**PASS.** `STAFF_MAIN_COLUMNS` (unchanged from the prior pilot session) renders exactly: Employee Number, EPF Number, Date of Joining, Full Name, Calling Name, Location, Staff Status, Department/Team ("Team"), Designation, CV Reference, NIC, Remarks, Employment Stage — 13 columns. `source_file`, `source_page`, `source_row_reference` remain on each fetched record object (for internal traceability, e.g. future debugging) but are excluded from `STAFF_MAIN_COLUMNS` and never rendered.

---

## Loading / Empty / Error / Total-Count States

**PASS, implemented:**

- **Loading:** `showStaffLoading()` — shown immediately when a fetch starts, before the API responds.
- **Empty:** `renderStaffTable()`'s existing empty branch, now reads "No staff records match the current filters." (updated from the prior pilot's "No pilot rows…" wording) — shown when the API returns 0 matching rows.
- **API error:** `showStaffError()` — shown if the `fetch()` rejects or the API returns a non-2xx status; message names the API base URL and points to `backend/README.md` for how to start the local backend, mirroring the existing schedule-calendar error-message convention.
- **Total record count:** every successful render includes a "Showing N of TOTAL records" line, using the API's `total` field (not just the current page's row count), satisfying "safe record-count handling" without requiring a full pager UI for this dataset size.

---

## Current / Onboarding / Resigned Counts

**PENDING — requires a live API with imported data.** Cannot be observed until the database is populated (see `validation/staff-data-database-import-check-2026-07-13.md`) and a backend serving `/api/staff` is reachable from a browser. Expected, once available: Current Staff = count where `staff_status = Active`; Resigned Staff = count where `staff_status = Inactive`; Onboarding = count where `employment_stage` is `Probation`/`training_7_day`/`[VERIFY]` (expected 310, since all rows are currently `[VERIFY]`, per the unresolved employment-stage rule).

---

## Arun PH Result / Paraparan PH Result

**PENDING — same blocker.** Both views call `fetchStaffRecords({team: 'PH', ...})` — expected count once live: **42** (matches the evidence-backed PH normalization count, unchanged by this task). Both use the identical `initTeamScopedStaffPilot()` function (one function, two call sites, confirmed by code review — no parallel Arun/Paraparan implementation exists).

---

## Existing Schedule Regression

**PASS, structurally.** The schedule-calendar script block (`MEMBER_SCHEDULE_API_BASE`, `mountScheduleCalendarInstance`, etc.) was not touched by this session's edits — confirmed by diffing the relevant script block's content against its pre-session state (unchanged). All 5 `.msc-instance` mounts (mayurika, suman, arun, rajiv, paraparan) remain present and structurally intact. A live browser click-through was not performed this session (see "Known Limits" below).

---

## Shared KPI Regression

**PASS.** `PILOT_KPI_STATE` and `renderKpiPanel` are byte-for-byte unchanged from before this session — confirmed by direct comparison of the relevant script block. The Staff Data conversion in this task deliberately did not touch anything KPI-related, per the task's explicit instruction.

---

## Browser Console Result

**PENDING.** Not observed this session — requires an actual browser, a running backend, and an imported database, none of which are simultaneously available from this sandbox. See "Known Limits."

---

## Known Limits (This Session)

1. **No live browser test was performed.** As in the Paraparan schedule task, Playwright/browser automation was not used (not requested for this phase, and this sandbox previously failed to download a browser due to network restrictions). All verification above is structural (HTML balance, JS syntax, function-reference grep) and code-level (schema/model field review), not a rendered-page observation.
2. **No real data has been fetched or displayed**, because the database table does not exist yet (migration not applied) and no data has been imported. Every count/result in this file that depends on real data is marked PENDING, not fabricated.
3. Once the database steps in `validation/staff-data-database-import-check-2026-07-13.md` are complete, this file should be updated with: real Current/Onboarding/Resigned counts, real Arun/Paraparan PH counts (expected 42 each), an actual browser console check, and a live click-through confirming the loading/empty/error states render correctly.

---

## Verdict (This Session)

**AMBER.** Every check achievable without a populated, reachable database passed cleanly: no real data embedded in source, correct structural integrity, correct reuse of shared filter/table/component logic, correct preservation of the existing schedule calendars and shared KPI pilot state, and correctly implemented loading/empty/error/total-count UI states. AMBER, not PASS, because the actual real-data rendering, count accuracy, and live browser behavior remain unverified pending the database migration/import (a human-gated, DB-access-dependent step this sandbox cannot perform directly — see the coordination note in `validation/staff-data-database-import-check-2026-07-13.md`).
