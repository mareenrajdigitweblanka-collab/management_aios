---
name: month-cell-single-click-task-list-double-click-create-check
type: validation
created: 2026-07-22
status: PASS — 13/13 real-browser scenarios pass (desktop + mobile viewport), zero console errors; 21/21 existing calendar unit tests pass; backend/database/migrations diffs empty. Addendum (2026-07-22, same day): Full-Day-leave-date edge case — PASS, 6/6 live-browser scenarios against the real local backend, test data cleaned up, backend/database/migrations diffs still empty.
source-boundary: web-view/js/calendar/instance.js only. backend/, database/, database/migrations/, member-aios/mayurika-hr/staff-data/ — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Month-Cell Single-Click Task List / Double-Click Create — Check — 2026-07-22

**Requirement:** In Month view, a single click on a date cell's blank area must open the existing Task-list popup if the date has one or more Tasks, or show a friendly toast if it has none (Leave-only dates count as "none" for this rule). A double click on the same blank area must open the existing Create chooser (Task/Leave/Close), exactly once, and must never let the single-click action fire first. The existing two visible Task chips, the `+N more` overflow, individual Task-chip/`+N more`/Leave-chip clicks, keyboard access, and all backend/API/database behavior must remain unchanged.

---

## STEP 1 — Repository Safety

```
git branch --show-current   -> main
git rev-parse --short HEAD  -> e262fbb
git status --short          -> ?? member-aios/mayurika-hr/staff-data/   (untracked, protected, untouched)
```

No unexpected tracked changes existed before this task started. Protected folder confirmed untracked/untouched throughout (re-checked after every commit below).

## STEP 2 — Discovery (current click ownership, read before any edit)

This calendar is a hand-built grid (no FullCalendar `dateClick`). Confirmed by direct read of `web-view/js/calendar/instance.js`:

- `renderMonthView()` builds each Month cell as `.msc-cal-cell--actionable[data-date="…"]`, containing (in DOM order): a `.msc-cal-daynum` day-number label, up to `MONTH_VISIBLE_TASK_CAP` (2) `.msc-cal-chip` Task chips, an optional `.msc-cal-chip-more` overflow chip, and any `.msc-cal-chip-leave` Leave chips.
- Before this change, the cell's own `click`/`keydown` listener called `openCreateChoiceFromCalendar()` **directly and synchronously** — the Create chooser opened on every blank-area single click, regardless of whether the date had Tasks. This is the exact behavior the requirement asks to change.
- Every chip type (`.msc-cal-chip`, `.msc-cal-chip-more`, `.msc-cal-chip-leave`) already had its own `click`/`keydown` handler that calls `e.stopPropagation()` before running `viewItem()` / `openMorePopup()` / `viewLeaveItem()` respectively — this is what already kept a chip click from also firing the cell-level handler, and remains the mechanism that protects them today.
- `openMorePopup(dateStr, anchorEl, opts)` is the existing Task-list popup (`.msc-more-popup`) — it already renders correctly for 1, 2, or any number of tasks (title + live count + one row per task), and is reused as-is by the new single-click path; no second list implementation was written.
- `openCreateMenu(anchorEl)` / `openCreateChoiceFromCalendar(opts)` is the existing Create chooser (`.msc-create-menu`, Task/Leave/Close) — reused as-is by the new double-click path.
- No `dblclick` handling existed anywhere in Month view before this change.
- `ui/toast.js`'s `showToast()` already de-duplicates by exact `type|title|message` key — a repeat call with an identical toast still visible simply resets its own dismiss timer instead of stacking a second copy. This is relied on directly rather than re-implemented.

## STEP 3 — Single/Double-Click Coordinator

Implemented entirely inside the per-member closure `mountScheduleCalendarInstance()` (one closure per member — five independent instances, so there is no cross-member timer state to isolate by construction).

```js
var CELL_CLICK_DELAY_MS = 250;
var pendingCellClick = null; // setTimeout id, or null when nothing is pending

function clearPendingCellClick() {
  if (pendingCellClick !== null) { clearTimeout(pendingCellClick); pendingCellClick = null; }
}

function handleCellSingleClick(dateKey) {
  var dayItems = itemsForDate(dateKey);
  if (dayItems.length > 0) { openMorePopup(dateKey, resolveMorePopupAnchor(dateKey)); }
  else { showEmptyDayToast(); }
}

function scheduleCellSingleClick(dateKey) {
  clearPendingCellClick();
  pendingCellClick = setTimeout(function () {
    pendingCellClick = null;
    handleCellSingleClick(dateKey);
  }, CELL_CLICK_DELAY_MS);
}
```

A native browser double click fires `click, click, dblclick` on the same element (in that order) before any rerender happens, because neither `click` handler mutates the DOM anymore (they only schedule/reschedule a timer) — so the cell node the `dblclick` lands on is still the original, attached node. `dblclick` calls `clearPendingCellClick()` then opens the Create chooser directly (the same `go()` function keyboard Enter already used, unchanged). 250ms was chosen because it sits comfortably inside the double-click window most OS defaults use (300-500ms) while staying short enough that a genuine single click does not feel delayed — documented in-code at the coordinator's definition.

**Cleanup is centralized, not scattered**, per the requirement's "single centralized helper" pattern already used elsewhere in this file:

| Trigger (Step 3 requirement) | Where it's cleared |
|---|---|
| Create chooser opens (any path — dblclick, keyboard Enter, sidebar Create button) | Inside `openCreateMenu()` itself — the one function every "open the chooser" path already funnels through |
| Task list opens through another route (`+N more` chip, `reopenTaskListOrigin`) | Inside `openMorePopup()` itself — the one function every "open the list" path already funnels through |
| View changes (Month → Week/Day) | `viewSwitcherBtns` click handler, before `renderActiveView()` |
| Month grid rerenders (navigation, `selectDate`, initial render) | Top of `renderMonthView()` itself |
| A Task/`+N more`/Leave chip is clicked (Step 5) | Each chip's own `go()` handler, alongside its existing `stopPropagation()` |
| Member changes | Not applicable — each member is already a separate closure/instance (`mountScheduleCalendarInstance` called once per `.msc-instance` container in `initAllScheduleCalendars()`); there is no shared timer to leak across members, and no runtime "switch this instance to another member" path exists in this codebase |
| Calendar instance is destroyed | Not applicable — this codebase has no instance-teardown/unmount lifecycle (every member's calendar is mounted once, for the page's lifetime); nothing to clean up on a lifecycle event that does not exist |

## STEP 9 — Event-Target Safety (chip dblclick bubbling)

The existing chip `click` handlers already stop `click` from bubbling to the cell. `dblclick` is a distinct event type browsers still dispatch and bubble regardless of a stopped `click` — without a guard, double-clicking a Task/`+N more`/Leave chip would bubble one `dblclick` up to the cell and incorrectly open the Create chooser. Fixed by adding a no-op `dblclick` listener (`e.stopPropagation()` only) to all three chip types — verified directly (Test I below).

## STEP 11 — Keyboard Accessibility

Keyboard Enter/Space on a cell (`isKeyActivation`) is **left completely unchanged** — it still calls `go()` (open the Create chooser) directly and synchronously, with no delay and no Task-list-vs-toast branching. There is no keyboard equivalent of a "double click" to coordinate against, and the requirement explicitly allows retaining current Enter behavior absent evidence to change it. Verified directly (Test K below).

## STEP 10 — Touch/Mobile

Verified directly at a 390×844 mobile viewport with `hasTouch`/`isMobile` enabled (Test suite 2, below). `page.tap()` (a real touch tap, not a mouse click) exercises the exact same `click` event path as desktop, so the single-tap-opens-list / empty-tap-shows-toast behavior is confirmed working identically. No new long-press interaction was added — the existing sidebar Create button remains the reliable mobile creation path (confirmed still present/visible at this viewport). Per this codebase's own existing (unrelated to this task) mobile default, a viewport ≤640px starts in Day view, not Month — the coordinator was manually switched into Month view first to exercise it at all, exactly like a mobile user tapping the "Month" view-switcher would.

## Real-Browser Validation — Performed (not a known limit this time)

Unlike several prior closures in this repo, real-browser validation **was** performed this session using `playwright-core` (already cached Chromium build `1223` on this machine; matched by pinning `playwright-core@1.60.0` — confirmed via `browsers.json` revision lookup, no new browser download needed).

**Isolation from the live dev backend:** a real FastAPI backend was already running locally on `127.0.0.1:8000` (PID confirmed via `netstat`/`/health`) connected to a live dataset — this was **not used, modified, or written to**. A throwaway, read-only mock HTTP server (stdlib `http.server`, no framework) was started on port `8010` instead, serving fixture JSON shaped to exactly match `MemberScheduleEventOut`/`MemberLeaveRecordOut`/`Daily·Weekly·MonthlyScheduleReportOut` (`backend/schemas.py`) for one test date per scenario (0/1/2/4 tasks, plus a Leave-only date). `web-view/js/config.js`'s two `LOCAL_BASE` constants were temporarily edited from port `8000` to `8010` to point the frontend at this isolated mock instead of the live dev server, and **fully reverted via `git checkout -- web-view/js/config.js`** before this validation/handover pair was written — confirmed by a clean `git diff -- web-view/js/config.js` (empty) after revert. `web-view/` itself was served statically via `python -m http.server 5500 --bind 127.0.0.1` (unmodified files). No write/create/update/delete request was ever issued against any backend during this test — every interaction exercised is read-only from the API's perspective (opening a popup is a pure client-side DOM action).

### Test Suite 1 — Desktop, 1440×900, Chromium (headless)

Arun's calendar instance, fixture dates at `today+0` (1 task), `+1` (2 tasks), `+2` (4 tasks → 2 visible chips + "+2 more"), `+3` (0 tasks, 0 leave), `+4` (0 tasks, 1 Leave record).

| # | Test | Result | Detail |
|---|---|---|---|
| A | Single click, 1-task date → Task list opens | PASS | count text "1 task" |
| B | Single click, 2-task date → Task list opens | PASS | count "2 tasks", 2 rows rendered |
| C | Single click, 4-task date → same list (2 chips + "+2 more" unchanged; clicking either the cell or the "+N more" chip opens the identical list) | PASS | chips=2, moreChip="+2 more", both paths show "4 tasks" |
| D | Single click, empty date → toast, no list, no chooser | PASS | title/message exact match (see wording below) |
| D2 | Rapid re-click on the same empty date → no duplicate toast stacking | PASS | toastCount=1 (relies on `showToast`'s existing key-based de-dup) |
| E | Single click, Leave-only date (0 Tasks) → treated as empty (toast, not list) | PASS | listOpen=false |
| F | Double click, empty date → Create chooser opens exactly once, Task+Leave items present, no toast | PASS | items=2 |
| G | Double click, occupied (4-task) date → Create chooser opens, Task list never opens first | PASS | chooser=true, list=false |
| H | Individual Task-chip click → Task Details opens; no list, no chooser | PASS | details=true, list=false, chooser=false |
| I | Double-clicking a Task chip → does not bubble a `dblclick` into the cell and open the Create chooser | PASS | chooser=false |
| J | Member isolation — clicking on Arun's calendar produces zero popups on Mayurika's calendar | PASS | no cross-instance popup |
| K | Keyboard Enter on a cell → opens Create chooser directly, immediately (no delay, no list) | PASS | chooser=true, list=false |
| L | Clicking a cell then switching Month→Week before the 250ms delay elapses → the stale pending action does not fire on the now-inactive Month view (no list, no toast) | PASS | list=false, toast=false |

**Empty-day toast wording (exact, matches the approved copy):**
- Title: `No tasks scheduled for this day`
- Message: `Double-click the day to create a Task or Leave.`

**13/13 pass. Zero browser console errors/page errors across the entire run.**

### Test Suite 2 — Mobile/touch, 390×844, Chromium (headless, `hasTouch`/`isMobile`)

| # | Test | Result | Detail |
|---|---|---|---|
| 1 | No horizontal page overflow at 390px | PASS | `scrollWidth` ≤ `clientWidth` |
| 2 | Single tap on a 2-task date → Task list opens, fully within the 390×844 viewport | PASS | popup rect within bounds |
| 3 | Single tap on an empty date → toast appears | PASS | |
| 4 | Sidebar Create button remains visible/present (mobile fallback creation path) | PASS | |

**4/4 pass. Zero console errors.**

## STEP 12 — Test Matrix Cross-Reference

| Required scenario | Covered by |
|---|---|
| A. One Task | Test A |
| B. Two Tasks | Test B |
| C. More than two Tasks | Test C |
| D. Empty date | Test D, D2 |
| E. Double click empty date | Test F |
| F. Double click occupied date | Test G |
| G. Existing controls (chip, "+N more") unchanged | Test C (+N more path), Test H (chip) |
| H. Member isolation | Test J (Arun vs. Mayurika directly exercised; the remaining three members — Suman, Rajiv, Paraparan — are mounted via the identical `mountScheduleCalendarInstance()` closure with no member-specific branching in the changed code, so the same guarantee applies structurally, not just for the one pair exercised) |

## STEP 13 — Responsive Validation

Directly exercised at 1440×900 (Suite 1) and 390×844 (Suite 2). The remaining listed breakpoints (1920×1080, 1600×900, 1366×768, 1024px, 768px) were not individually screenshotted this session — the popup/toast/chooser positioning logic touched by this task (`positionMorePopup`, `openCreateMenu`'s `positionCreateMenu`, `ui/toast.js`) is **unchanged** by this diff (no CSS file was touched at all — confirmed by `git diff --stat` showing only `instance.js`), so no new viewport-dependent regression surface was introduced beyond what 1440px/390px already exercise.

## STEP 14/16 — Regression Safety / Backend Proof

```
git diff -- backend/                 -> (empty)
git diff -- database/                -> (empty)
git diff -- database/migrations/     -> (empty)
git diff --stat                      -> web-view/js/calendar/instance.js | 109 ++++++++++++++++++++++++++++++++++++++-
                                         1 file changed, 108 insertions(+), 1 deletion(-)
```

Backend changes: **NONE**. API changes: **NONE**. Database changes: **NONE**. Migration changes: **NONE**. Business-rule changes: **NO**.

## STEP 15 — Static and Browser Checks

- `node --check web-view/js/calendar/instance.js` — PASS.
- `node --check` swept across every file under `web-view/js/**/*.js` — all PASS (no import-resolution/syntax breakage introduced).
- `node --test web-view/js/calendar/summary-helpers.test.mjs` — **21/21 existing tests pass** (unrelated Schedule Summary helpers, confirms no accidental cross-contamination).
- Real-browser checks (Suites 1 & 2 above): zero duplicate click handlers observed (each scenario's single expected popup/toast/chooser opened exactly once), zero delayed popups appearing after a double click (Test G), zero stale-timer firings after a Month→Week view switch (Test L), zero console errors across both suites, zero duplicate toasts (Test D2), zero duplicate Create choosers (Test F/G both assert exactly one chooser instance's visibility).
- Backend regression tests (`backend/tests/`) were **not executed** this session (`pytest` is not installed in this environment) — accepted as low-risk because `git diff -- backend/` is empty; zero backend files were touched by this change, so the existing backend test suite's pass/fail state is provably unaffected.

## Known Limitations

- The five-member isolation guarantee (Step 12/H) was directly exercised for one pair (Arun/Mayurika); the other three members share the identical, unmodified mounting code path and are not separately screenshotted.
- Responsive validation directly covers 1440×900 and 390×844 only (see Step 13 reasoning for why the untouched CSS/positioning logic makes the remaining breakpoints low-risk, not why they were skipped for cost reasons).
- Backend's own `unittest`/`pytest` suite was not re-run (tooling unavailable in this environment) — justified above by an empty `backend/` diff.
- Desktop double-click is confirmed as an *additional* shortcut, not the only creation path — the sidebar Create button (unchanged) remains the reliable, always-available path on both desktop and mobile.

## PASS / AMBER / FAIL

**PASS.** All 17 PASS conditions from the task specification are met: single click opens the Task list for 1/2/3+ task dates (Tests A/B/C); the two visible chips and `+N more` are unchanged (Test C, and confirmed by an empty diff outside `instance.js`'s JS logic — no chip-rendering markup was touched); individual Task chips still open Task Details (Test H); the empty-date toast matches the approved wording and never opens an empty list (Test D); double click opens the Create chooser exactly once and is never preceded by the single-click action (Tests F/G); Task and Leave options remain available (Test F: `items=2`); member isolation holds (Test J); the mobile Create button remains usable (Suite 2 test 4); no console errors occurred across either suite; and backend/API/database/migrations are all confirmed unchanged by empty `git diff`.

---

## Addendum — Full-Day Leave Date Edge Case (2026-07-22)

**Problem.** The single-click empty-day toast introduced above ("No tasks scheduled for this day" / "Double-click the day to create a Task or Leave.") did not distinguish a genuinely empty date from a date that has zero Tasks only because the existing Task/Leave conflict rule (`find_conflicting_active_leave`, `backend/routers/leave_logic.py`) already forbids creating a Task there — a date under an active Full-Day or Multi-Day Leave. The old message actively invited an action ("double-click to create a Task") that the backend would then reject.

**Decision priority implemented in `handleCellSingleClick(dateKey)`** (`web-view/js/calendar/instance.js`, ~lines 932-950):

1. `itemsForDate(dateKey).length > 0` → open the existing Task-list popup (unchanged, highest priority — an existing Task is never hidden behind a Leave message, including on a date that also carries a Full-Day/Multi-Day Leave).
2. Else `hasFullDayBlockingLeave(dateKey)` (new, lines ~918-930) → show the new leave-specific toast.
3. Else → show the original empty-day toast (unchanged).

`hasFullDayBlockingLeave(dateKey)` is `leaveItemsForDate(dateKey).some(lv => lv.leave_type === 'Full-Day' || lv.leave_type === 'Multi-Day')` — the identical Full-Day/Multi-Day filter already used by the Week/Day all-day row (`renderTimeGrid`), not a new rule. `leaveItemsForDate` is already member-scoped (one closure per member) and server-filtered on `deleted_at IS NULL`, so deleted, other-member, or out-of-range Leave records structurally never reach this check.

**New toast (old vs. new):**

| Field | Old (misleading on a Leave-blocked date) | New |
| --- | --- | --- |
| Title | `No tasks scheduled for this day` | `Full-day leave scheduled` |
| Message | `Double-click the day to create a Task or Leave.` | `Tasks cannot be added on this day because it is covered by full-day leave.` |
| Toast type | `information` | `information` (no error/warning styling — matches the requirement's default preference and the existing toast-type convention) |

**No new business logic was duplicated.** The day-cell handler only reads already-loaded `leaveItems` client state to pick a message; it does not call, mirror, or re-implement `find_conflicting_active_leave`, `find_conflicting_active_tasks`, or any leave-overlap/date-expansion logic. Backend conflict enforcement (`backend/routers/member_schedules.py` `create_member_schedule_event`/`update_member_schedule_event`, and `leave_logic.py`) is completely unchanged — confirmed by an empty `git diff -- backend/`.

### Live-browser verification

Performed against the **real** local backend (FastAPI + Postgres, `python -m uvicorn backend.main:app --port 8000`) and frontend (`python -m http.server 8080 --directory web-view`), driven by a scripted Playwright/Chromium session (cached Chromium build `1223`) — not a throwaway mock server this time, since the goal was to exercise the genuine `find_conflicting_active_leave`/`find_conflicting_active_tasks` conflict path end-to-end.

**Isolation from existing data:** Rajiv's calendar tab was used with far-future dates (`2031-03-10` through `2031-03-21`) chosen specifically to avoid any collision with the real `dashboard_testing` rows already present in the database (e.g. Mayurika's July 2026 fixture data). All Leave records created during this session were deleted afterward via `DELETE /api/member-leave/rajiv/{id}` for each of the 4 created IDs, and confirmed removed by re-querying `GET /api/member-leave/rajiv` (0 remaining rows in the `2031-03-*` range). No Task record was ever created (the one creation attempt in Test I was correctly rejected by the existing conflict rule), so there was nothing to clean up on the Task side. `GET /api/member-schedules/rajiv` and `GET /api/member-leave/rajiv` both confirmed 0 residual rows in the test date range after cleanup.

| # | Scenario | Setup | Result | Toast / status observed |
| --- | --- | --- | --- | --- |
| A | Empty date, no Leave | `2031-03-10`, nothing | PASS | "No tasks scheduled for this day" / "Double-click the day to create a Task or Leave." |
| B | Full-Day Leave, zero Tasks | `2031-03-11`, Full-Day Leave created via double-click → Create chooser → Leave | PASS | "Full-day leave scheduled" / "Tasks cannot be added on this day because it is covered by full-day leave." |
| C | Multi-Day Leave covering date, zero Tasks | Multi-Day Leave `2031-03-17`–`2031-03-19`; clicked the **mid-range** date `2031-03-18` (not the start date, to confirm the existing weekday-expansion lookup is honored, not just a literal `start_date` match) | PASS | Same full-day-blocked toast as B |
| E | Short Leave only, zero Tasks | `2031-03-20`, Short Leave 09:00–11:00 created | PASS | Old empty-day toast (correctly **not** the full-day-blocked message) |
| F | Half-Day First only, zero Tasks | `2031-03-21`, Half-Day First Leave created | PASS | Old empty-day toast (correctly **not** the full-day-blocked message) |
| I | Double-click the Full-Day-Leave date (`2031-03-11`) | Create chooser opened → chose Task → filled title → submitted | PASS | Create chooser opened exactly once (`scenarioI_chooserOpened=1`); Task creation was rejected by the existing conflict rule with the existing mapped message: *"This time is unavailable — A leave entry already covers this time. Choose a different time."* No Task record was created (confirmed via API); Leave option remained available in the same chooser. |

Scenario D (existing Task + Full-Day Leave on the same date → Task list must still open) and scenarios G/H (deleted Leave / different member's Leave → must not affect the message) were **verified by code inspection rather than live reproduction**, for a reason the task itself anticipates: the existing conflict rule (`find_conflicting_active_leave` / `find_conflicting_active_tasks`) blocks creating a Task and a Full-Day/Multi-Day Leave on the same date **in either order** through the normal UI/API path, so this combined state cannot be freshly produced without bypassing that rule (which would itself violate "do not duplicate/bypass business logic"). Instead:

- **D** is guaranteed by the `if (dayItems.length > 0) { … } else if (hasFullDayBlockingLeave …)` ordering in `handleCellSingleClick` — the Task-presence branch is checked first and returns before the Leave check ever runs, so it is correct by construction for any date that does carry both a Task and a Full-Day/Multi-Day Leave (e.g. historical data predating the 2026-07-16 conflict-simplification amendment, or a hand-inserted row) — not conditional on how that state arose.
- **G** is guaranteed by `leaveItemsForDate` reading from `leaveItems`, which per its own existing code comment (`instance.js` line ~819-822) is already `deleted_at IS NULL, server-filtered` — a soft-deleted Leave record is never present in the array `hasFullDayBlockingLeave` iterates, by construction.
- **H** is guaranteed by `leaveApiBase` being built per-member (`MEMBER_LEAVE_API_BASE + '/' + memberKey`) inside a per-member closure (`mountScheduleCalendarInstance`) — another member's Leave records are never fetched into this member's `leaveItems` array in the first place, structurally, not via a filter that could be bypassed.

**6/6 live scenarios PASS; 3/3 code-inspection-guaranteed scenarios (D, G, H) confirmed correct by construction.** Zero new browser console errors attributable to this change (the run showed exactly one expected `409 Conflict` — the deliberate Test I task-creation rejection — plus one unrelated `404` for a missing favicon request, pre-existing and unrelated to this diff).

### Regression / boundary re-confirmation

```text
git diff -- backend/                 -> (empty)
git diff -- database/                -> (empty)
git diff -- database/migrations/     -> (empty)
node --check web-view/js/calendar/instance.js -> OK
```

Only `web-view/js/calendar/instance.js` was edited for this addendum (new `showFullDayLeaveToast()`, `hasFullDayBlockingLeave()`, and the extended `handleCellSingleClick()` branch, plus updated in-code comments — no CSS, no backend, no schema/migration changes).

### Addendum PASS / AMBER / FAIL

**PASS.** All 7 "Additional pass conditions" from the task specification are met: Full-Day Leave dates no longer show the normal empty-day creation message (Test B); the leave-specific message clearly explains Tasks cannot be added (Test B wording); existing Tasks on a date still open through the Task list (guaranteed by construction, Test D reasoning above); partial Leave (Short Leave, Half-Day First) is not incorrectly treated as a full-day block (Tests E/F); Multi-Day full-day coverage uses the correct message, including for a mid-range date, not just the literal start date (Test C); existing Task/Leave conflict logic remains authoritative and untouched (Test I, empty `backend/` diff); and backend/API/database/migrations remain unchanged (empty diffs above). All test data created against the live local backend during verification was deleted and confirmed removed.
