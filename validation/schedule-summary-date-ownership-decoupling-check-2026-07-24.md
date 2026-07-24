# Validation — Schedule Summary Date Ownership Decoupling (2026-07-24)

**Feature ID:** schedule-summary-date-ownership-decoupling
**Branch:** main
**Starting HEAD:** `e75e28c` (Fix Bulk Tasks modal scroll and first-row alignment)

---

## 1. Requirement

Schedule Summary (Daily/Weekly/Monthly cards) previously reran whenever a Calendar date cell was
clicked, because it read the Calendar's own `state.selectedDate` instead of owning an independent
reference date. Required: Schedule Summary must default to today (Asia/Colombo), expose its own
manual Date selector, and refresh only on its own explicit triggers (initial load, manual change,
Task/Leave data changes, member switch) — never as a side effect of Calendar-cell selection.

---

## 2. Root-cause analysis (STEP 2)

**Why Calendar-cell click reran Schedule Summary:** `selectDate(dateStr)`
(`web-view/js/calendar/instance.js`) was the single function behind every Calendar interaction —
cell click (via `openCreateChoiceFromCalendar`), mini-calendar click, and the Today button — and
its last line was `loadSummaries(dateStr);`. Every caller of `selectDate()` therefore also reran
Schedule Summary for whichever date the Calendar happened to select.

**Shared state variable causing the coupling:** `state.selectedDate` — a single per-member-instance
object property serving both roles (Calendar's selected cell *and*, indirectly through
`selectDate()`, Schedule Summary's reference date).

**Every caller of Summary loading (`loadSummaries`), before this fix:**

| Call site | Trigger |
|---|---|
| `selectDate()` (was line 2970) | Every Calendar-cell click, mini-calendar click, Today click, initial mount, and every Task create/update/Bulk-create success (all of which call `selectDate()`) |
| Task delete success (guarded `if (state.selectedDate)`) | Task delete |
| Leave create success (guarded) | Leave create |
| Leave update success (guarded) | Leave update |
| Leave delete success (guarded) | Leave delete |

**Narrowest safe separation:** remove the single `loadSummaries(dateStr)` line from
`selectDate()` (root fix — this alone decouples every Calendar-cell/mini-calendar/Today/Prev/Next/
view-switch interaction, since none of them call `loadSummaries` directly). Add one new
independent state field (`state.summaryDate`) and two new functions (`setSummaryDate(dateStr)` —
the only entry point a UI control may call to change it; `refreshSummary()` — reloads using the
current `state.summaryDate`, used by every data-change success handler). No other function in
`selectDate()`'s body (Calendar cell rendering, Priority Queue preview, Tasks workspace sync,
form date sync) was touched.

---

## 3. New independent Summary date state (STEP 3)

`web-view/js/calendar/instance.js`, `state` object:

```js
var state = {
  viewYear: null, viewMonth: null, selectedDate: null, editingId: null,
  currentView: 'month', anchorDate: null,
  summaryDate: null, summaryReqToken: 0
};
```

`summaryDate` is written in exactly two places: `setSummaryDate()` (manual selector + initial
default) — never by `selectDate()`, any Calendar click handler, Task/Leave date field, or Bulk
Tasks row date. `summaryReqToken` is an internal stale-response guard (§9).

---

## 4. Asia/Colombo default (STEP 4)

`web-view/js/calendar/core.js` — new exported helper, distinct from the pre-existing
browser-local `toDateStr(new Date())` used by Calendar's own "Today":

```js
var COLOMBO_TODAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' });
export function getColomboTodayStr() { return COLOMBO_TODAY_FMT.format(new Date()); }
```

`en-CA` locale formats as `YYYY-MM-DD` directly (verified: `node -e "console.log(new
Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo'}).format(new Date()))"` → `2026-07-24`).
Called once per instance at mount (`setSummaryDate(getColomboTodayStr())`, before the
`loadItems()`/`loadLeaveItems()` chain — Summary reports don't depend on the client-side
`items`/`leaveItems` arrays, so the default loads immediately rather than waiting on them).

---

## 5. Manual Summary date selector (STEP 5)

Native `<input type="date" class="msc-summary-date-input">` inside a new
`<div class="msc-summary-header">` row (title + selector), added to the Schedule Summary section
markup (`instance.js`), labeled "Summary date" (never "Calendar date"). Per-instance unique id
(`msc-summary-date-<memberKey>`) follows the file's existing id-uniqueness convention. Initialized
to Asia/Colombo today; `change` event is its only entry point into `setSummaryDate()`. Styled in
`web-view/css/calendar.css` (`.msc-summary-header`, `.msc-summary-date-label`,
`.msc-summary-date-input`) reusing the same border/radius/font tokens as the existing
`.msc-form-grid input` rule — no new input component introduced.

---

## 6. Manual date change behavior (STEP 6) / removal of Calendar-cell coupling (STEP 7)

`setSummaryDate(dateStr)`:

```js
function setSummaryDate(dateStr) {
  if (!isValidDateStr(dateStr)) { return; }
  state.summaryDate = dateStr;
  if (summaryDateInput) { summaryDateInput.value = dateStr; }
  loadSummaries(dateStr);
}
```

`loadSummaries(dateStr)` unchanged in what it does (`loadDailySummary` → exact date;
`loadWeeklySummary` → `getReportWeekStart` Monday–Sunday week containing the date, unchanged
helper; `loadMonthlySummary` → calendar month containing the date, unchanged derivation) — only
*who calls it and with what date* changed. `selectDate()` no longer calls `loadSummaries` at all,
so Calendar-cell clicks, mini-calendar clicks, and the Today button — all of which still call
`selectDate()` for their existing Calendar-selection/create-dialog/highlight responsibilities —
no longer touch Summary as a side effect. `selectDate()`'s Calendar-side responsibilities
(`state.selectedDate`, `state.anchorDate`/`viewYear`/`viewMonth`, `selectedDateLabel`,
`syncSelectedDateToForms`, `cancelEdit`, `renderActiveView`, `renderPriorityPreview`, Tasks
workspace sync) are untouched.

---

## 7. Mini-calendar / navigation independence (STEP 8)

Mini-calendar click, Today button, Prev/Next, and Month/Week/Day view-switch all call either
`selectDate()` or only `renderActiveView()`/state view fields — none call `loadSummaries`,
`setSummaryDate`, or `refreshSummary` anywhere in the file (confirmed by exhaustive grep, §12).

---

## 8. Data-change refresh behavior (STEP 9)

`refreshSummary()` — reloads using `state.summaryDate` only, never a Task/Leave record's own date:

```js
function refreshSummary() {
  if (state.summaryDate) { loadSummaries(state.summaryDate); }
}
```

Called from exactly the required trigger list, immediately after each success path's existing
`renderActiveView()`/state update (no other behavior in these handlers changed):

| Trigger | Call site |
|---|---|
| Single Task create | `apiRequest('POST', apiBase, ...)` success |
| Task edit | `apiRequest('PUT', ...)` success (Task update) |
| Task delete | `deleteItem()` `onConfirm` success |
| Task drag | `commitItemTimeChange(...).then()` in `attachDragHandlers` |
| Task resize | `commitItemTimeChange(...).then()` in `attachResizeHandler` |
| Bulk Tasks create | `performBulkSubmit()` success |
| Leave create | `leaveApiRequest('POST', ...)` success |
| Leave edit | `leaveApiRequest('PUT', ...)` success |
| Leave delete | `deleteLeaveRecord()` `onConfirm` success |

Task create/update and Bulk Tasks still also call `selectDate(...)` immediately before
`refreshSummary()` — preserved, existing "Calendar follows the just-created/edited item" behavior
(STRICTLY PRESERVE: Calendar date selection) — but since `selectDate()` no longer loads Summary,
this no longer moves the Summary Date to the Task/Leave's own date; `refreshSummary()` is the
separate, explicit call that keeps Summary anchored to `state.summaryDate`.

Task drag/resize previously did not refresh Summary at all (a pre-existing gap, confirmed by
reading `attachDragHandlers`/`attachResizeHandler` before this task) — `refreshSummary()` calls
were added to both success paths to satisfy this requirement; no other drag/resize behavior
changed.

---

## 9. Member switching (STEP 10)

No runtime member-switch/reset function exists or was needed: all five member calendars
(mayurika/suman/arun/rajiv/paraparan) are mounted once, independently, for the page's lifetime by
`initAllScheduleCalendars()`, each with its own private `state` closure (including its own
`summaryDate`). Switching the visible member tab is a CSS show/hide handled entirely by
`navigation.js`, outside this module. Each member's `summaryDate` is therefore *structurally*
independent — it is set to Asia/Colombo today once at that member's own mount time and is never
written by any other member's interactions. Verified directly (not just by static reading) — §13,
Test 4.

---

## 10. Error / loading / stale-response behavior (STEP 11, STEP 9 "no stale results")

`loadDailySummary`/`loadWeeklySummary`/`loadMonthlySummary` each now accept a `token` parameter.
`loadSummaries(dateStr)` increments `state.summaryReqToken` once per call and passes the new value
to all three; each request's `.then`/`.catch` callback re-checks `token === state.summaryReqToken`
before touching the DOM, so a response for a since-superseded date is silently dropped instead of
overwriting a newer selection. Existing error rendering (`mapApiError`, `msc-empty` + `role="alert"`)
and loading state (`showInlineLoading`) are otherwise unchanged; `summaryDateInput`'s value is never
reset automatically on error, matching STEP 11.

---

## 11. Formulas unchanged (STEP 12)

No change to `_count_percentages`/`_duration_percentages` (backend, untouched — §14), no change to
`getReportWeekStart` (Monday–Sunday), no change to `getSplitWarningState`/`getMetricStatusCopy`/
`combineSummaryStatus`/`getPeriodStatusCopy`/`getSplitBarSegments`/`formatPercentage`/
`formatDuration`/`formatChange` (all in `core.js`, none edited). `summary-helpers.test.mjs` — the
existing 21-test suite covering these — passes unchanged (§12).

---

## 12. Static and request checks (STEP 16)

| Check | Result |
|---|---|
| `node --check` on `core.js`, `instance.js` | OK, no syntax errors |
| `node --test web-view/js/calendar/summary-helpers.test.mjs` | **21/21 pass**, unchanged — confirms formula/threshold logic untouched |
| ES-module import resolution | Confirmed live — a jsdom harness (§13) actually imports and mounts `instance.js`/`core.js`/`date-icon.js` via real ESM resolution |
| CSS brace-balance check | `calendar.css` — balanced (script-verified open==close depth 0) |
| Duplicate-ID scan | New `<input>`/`<label>` ids use the file's existing per-instance `+ memberKey` suffix convention — no collision across the 5 mounted instances |
| Missing DOM-hook scan | `summaryDateInput = container.querySelector('.msc-summary-date-input')` matches the new markup's class exactly |
| `loadSummaries(` caller scan | `grep -n "loadSummaries("` → only `refreshSummary()` and `setSummaryDate()` call it now; `selectDate()` no longer does |
| `state.selectedDate` residual-use scan | Remaining uses are Calendar-only (cell highlight, `selectDate()` setter, Bulk Tasks anchor fallback) — none feed Summary |
| Stale-response protection | `summaryReqToken` guard added (§10); verified live under rapid date changes is a natural extension of Test 3 (§13) — single in-flight request per date change in this harness, and the token check makes an overtaken response a no-op by construction |
| Duplicate-request-per-click scan | A single Calendar-cell click fires **zero** `/reports/` requests (§13, Test 2) — was previously 3 (daily+weekly+monthly) per click |

---

## 13. Live behavioral verification (real DOM, real production code — not just static reading)

This workstation has no direct Neon Postgres connection or local browser (documented, pre-existing
limitation — see `validation/schedule-summary-md-percentage-dashboard-check-2026-07-22.md` §20).
Instead of relying on static code reading alone, `web-view/js/calendar/instance.js` was mounted
**unmodified** in a real `jsdom` DOM (`npm install jsdom` in an isolated scratch directory — not
added to this repo's dependencies) with `fetch` mocked to return backend-shaped fake report JSON.
`initAllScheduleCalendars()` was called for real, and real DOM events (`click`, `change`) were
dispatched against the real rendered markup.

```
TEST1 summaryInput.value === Colombo today: true ( 2026-07-24 vs 2026-07-24 )
TEST1 initial report calls fired: 6 (3 per instance x 2 mounted instances)
TEST1 daily report call used today: true
TEST2 found an actionable day cell: true
TEST2 new /reports/ calls after Calendar-cell click: 0 (expect 0)
TEST2 summaryInput.value unchanged after cell click: true
TEST3 new /reports/ calls after manual date change: 3 (expect 3)
TEST3 daily call uses new date: true
TEST3 summaryInput.value updated: true
TEST4 Suman summaryInput still Colombo today: true ( 2026-07-24 )
TEST4 Mayurika summaryInput still the manually-set date: true
DONE
```

This directly exercises (not infers) the exact fix: initial Asia/Colombo default, zero Summary
requests from a Calendar-cell click, exactly 3 Summary requests from a manual date change, and
independent per-member `summaryDate` state.

---

## 14. Backend / API / database proof (STEP 17)

```
git diff --stat -- backend/     → (empty)
git diff --stat -- database/    → (empty; no database/ directory exists in this repo)
git status --short              → only web-view/css/calendar.css, web-view/js/calendar/core.js,
                                   web-view/js/calendar/instance.js modified; the protected
                                   member-aios/mayurika-hr/staff-data/ folder is untouched
```

**Backend changes: NONE. API changes: NONE. Database changes: NONE. Migration changes: NONE.
Summary formula changes: NO. Business-rule changes: NO.**

Baseline backend regression (unchanged, run for environment-health confirmation only):
`python -m unittest backend.tests.test_schedule_duration_reports
backend.tests.test_schedule_classification backend.tests.test_member_leave
backend.tests.test_task_leave_overlap backend.tests.test_bulk_task_creation` → **234 tests, OK**.

---

## 15. Files modified

- `web-view/js/calendar/core.js` — added `getColomboTodayStr()`, `isValidDateStr()` (both new,
  pure, exported; no existing export changed).
- `web-view/js/calendar/instance.js` — added `state.summaryDate`/`state.summaryReqToken`; added
  `setSummaryDate()`/`refreshSummary()`; added stale-response token guard to
  `loadDailySummary`/`loadWeeklySummary`/`loadMonthlySummary`; removed the `loadSummaries(dateStr)`
  call from `selectDate()`; replaced the four guarded `if (state.selectedDate) {
  loadSummaries(state.selectedDate); }` refresh sites with `refreshSummary()`; added
  `refreshSummary()` calls after Task create/update, Bulk Tasks, Task drag, Task resize; added the
  Summary-date `<input>` markup, its DOM ref, its `change` listener, and the initial-mount default
  call.
- `web-view/css/calendar.css` — added `.msc-summary-header`/`.msc-summary-date-label`/
  `.msc-summary-date-input` rules (responsive wrap under 480px).

No file under `member-aios/mayurika-hr/staff-data/` was read, staged, or modified.

---

## 16. Responsive layout (STEP 15)

`.msc-summary-header` is `display:flex; flex-wrap:wrap; justify-content:space-between` — the Date
selector wraps below the title on narrow widths instead of overlapping it, matching the existing
`.msc-summary-section` full-width/box-sizing pattern already verified across the breakpoint set in
`validation/schedule-summary-responsive-layout-check-2026-07-14.md`. Not independently re-screenshotted
in this task (no local browser, §13) — same documented, pre-existing limitation.

---

## 17. PASS / AMBER / FAIL

**Code-level + behavioral (jsdom-driven): PASS.** Root coupling identified and removed at its one
source (`selectDate()`); Summary now owns an independent `summaryDate` with its own default,
manual selector, data-change refresh list, and stale-response guard; Calendar-cell/mini-calendar/
Today/Prev/Next/view-switch independence confirmed by exhaustive caller-grep and by live jsdom
event-dispatch (zero Summary requests from a cell click); member isolation confirmed structurally
and live; formulas/backend/API/database unchanged (21/21 frontend + 234/234 backend tests pass,
empty `git diff` on backend/database).

**Rendered-pixel / real-browser interaction (responsive breakpoints, 200% zoom, DevTools console):
AMBER.** No local browser is available on this workstation (§13, §16) — the same pre-existing,
documented limitation as prior Schedule Summary validation files in this repo. Recommend a
maintainer with browser access do a final visual pass on the five member pages before/after
production deploy.

---

## 18. One next step

A maintainer with browser access should open each of the five member Calendar pages in
production, confirm the "Summary date" input renders correctly at the required breakpoints
(1920×1080 down to 390px, and 200% zoom) with no title overlap or horizontal overflow, and spot-
check one manual date change and one Calendar-cell click per member against DevTools' Network tab.
