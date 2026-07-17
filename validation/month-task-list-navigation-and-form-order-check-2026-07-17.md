# Month-View Task-List Navigation and Form Order — Validation Check

**Date:** 2026-07-17
**Scope:** `web-view/js/calendar/instance.js`, `web-view/css/calendar.css`. No backend, database, API, task/leave conflict logic, or Schedule Summary logic touched.

---

## 1. Confirmed Requirement

Month-view date-box/task-chip/"+N more" clicks must navigate to the existing
Schedule Item list filtered to that date (never open a task-detail view in
Month). Leave-only and empty date boxes must do nothing. Leave chips must
never trigger this navigation. Page section order must become: 1) Schedule
Item creation form, 2) Leave applying form, 3) Schedule Item list, with
Schedule Summary staying above all three. Frontend-only; Week/Day behavior,
Schedule Summary, and all backend/API/database logic preserved.

## 2. Task-Presence Rule (Step 3)

A Month date is task-bearing when `itemsForDate(dateStr).length > 0`, where
`itemsForDate` is the existing function (`instance.js`) that filters the
already-loaded `items` array (populated once via `loadItems()` from the
member's live API — no `localStorage`, no other member's array) by exact
`date` string equality. This is the same array and same date field every
other Month/Week/Day renderer already reads — no new data source, no
duplicate task state. `leaveItems`/`leaveItemsForDate` are never consulted
for this rule, per the requirement.

## 3. Date-Cell Behavior (Steps 6, 17, 18)

- **Task-bearing cell** (`renderMonthView`): rendered with class
  `msc-cal-cell--actionable`, `role="button"`, `tabindex="0"`, and
  `aria-label="{D Month YYYY}, {N} task(s). Open Schedule Item list."`. Click
  and `Enter`/`Space` keydown both call
  `navigateToScheduleItemListForDate(dateStr)`.
- **Empty or leave-only cell**: no `role`/`tabindex`/`aria-label`, and — the
  key change — **no click listener is attached at all** (previously every
  cell called `selectDate()` unconditionally). Clicking does nothing:
  no date selection, no scroll, no focus, no form change.
- CSS: `.msc-cal-cell` no longer has `cursor:pointer`/hover styling
  unconditionally (that was a pre-existing bug relative to this requirement
  — every cell looked clickable). `cursor:pointer`, hover background, and a
  `:focus-visible` ring now live on `.msc-cal-cell--actionable` only.

## 4. Task-Chip Behavior (Step 7)

Task chips (`.msc-cal-chip`) now render with `data-date`, `role="button"`,
`tabindex="0"`, and their own click/keydown handlers that call
`e.stopPropagation()` then `navigateToScheduleItemListForDate(chip's date)`.
**Investigation finding:** Month task chips had no task-detail/edit behavior
to suppress before this change — no `data-id`, no click listener existed on
them at all prior to this task (unlike Week/Day's `.msc-tg-event`/
`.msc-tg-allday-chip`, which call `viewItem()` and are untouched). Previously
a chip click silently bubbled to the cell's unconditional `selectDate()`
call; now it has its own explicit, keyboard-accessible handler.

## 5. "+N More" Behavior (Step 8)

`.msc-cal-chip-more` now renders with `data-date`, `role="button"`,
`tabindex="0"`, and the same navigate-with-stopPropagation handler as task
chips. **Investigation finding:** the overflow count is computed as
`dayItems.length - MAX_CAL_CHIPS`, where `dayItems = itemsForDate(c.dateStr)`
— tasks only. Leave chips are rendered in a separate, later loop
(`leaveItemsForDate`) that never contributes to this count and has no
overflow/"+more" mechanism of its own. Therefore "+N more" is structurally
**always** task-bearing whenever it renders at all — the "overflow consists
only of leave, no tasks" edge case described in the requirement cannot occur
in this codebase; confirmed by reading the render logic rather than assumed.

## 6. Leave-Only Behavior (Step 4/6)

A cell containing leave but zero tasks has `taskCount === 0`, so it is
rendered without the `--actionable` class and gets no click listener —
identical to an empty cell. No date selection, scroll, or focus occurs.

## 7. Leave-Chip Behavior (Step 9)

`.msc-cal-chip-leave` gained one handler: `click` → `e.stopPropagation()`
only. This matters specifically for a **mixed** cell (has both tasks and
leave): without this, clicking a leave chip inside such a cell would bubble
to the now-actionable cell background and incorrectly trigger navigation.
Leave chips get no `role`/`tabindex` change and no navigation call — clicking
one does nothing beyond stopping the bubble. No existing leave detail/delete
behavior existed on leave chips to preserve (there was none).

## 8. Filtering Result (Steps 4, 5)

No new filter variable or second list was introduced.
`navigateToScheduleItemListForDate(dateStr)` calls the existing
`selectDate(dateStr)`, which already (a) sets `state.selectedDate`, (b)
syncs the Schedule Item and Leave form date fields via
`syncSelectedDateToForms()`, (c) cancels any in-progress edit, (d) re-renders
`renderList()` — which already filters the existing loaded `items` array by
`it.date === state.selectedDate` — and (e) re-renders `renderLeaveList()` and
reloads the summary reports. The list's existing context label
(`Schedule Items — <span class="msc-list-date-label">`) already displays the
selected date; no second label was invented. On top of `selectDate()`, the
helper scrolls `.msc-list-heading` (or falls back to `.msc-list`) into view
(`scrollIntoView({behavior:'smooth', block:'start'})`, matching the existing
`sidebarCreateBtn` scroll convention already in this file) and moves focus to
it (`tabindex="-1"` added to that heading specifically for this purpose — an
addition, not a removal, of an accessibility attribute).

## 9. Member Isolation (Step 13)

Not re-architected — already guaranteed by the existing per-instance closure
design. `mountScheduleCalendarInstance(container)` is called once per
`.msc-instance` element (Mayurika, Suman, Arun, Rajiv, Paraparan each have
their own container), and `navigateToScheduleItemListForDate`, `state`,
`items`, `leaveItems`, and every DOM reference (`listEl`, `calGrid`, etc.)
are closure-scoped to that single `container` via `container.querySelector`
— never `document.querySelector` and never a `window`-global. Verified by
inspection: no new global variable was introduced anywhere in this change.

## 10. Exact Form/List Order (Step 10)

Confirmed by structural diff and by rendering the `container.innerHTML`
template with stub values and locating each marker's string offset:

```
msc-form-card   (Schedule Item creation form) < msc-leave-card (Leave applying form) < msc-list-heading (Schedule Item list)
```

Schedule Summary (`.msc-summary-section`) was not moved — it remains
immediately after the calendar grid/toolbar shell and before all three
reordered sections, exactly as before. Achieved by splitting the single
`hr-table-card` that previously wrapped
form+list+priority-preview+clear-button+footer+modal into three separate
`hr-table-card` wrappers (form alone; the untouched leave card, relocated as
one atomic block; then list+priority-preview+clear+footer+modal together) —
no component's internal markup, IDs, classes, or event hooks were rewritten,
only which outer wrapper contains them and in what order.

## 11. Week/Day Preservation (Step 2, 7)

`renderTimeGrid()`, `wireTimeGridInteractions()`, `attachDragHandlers()`,
`attachResizeHandler()`, `wireEmptyCellCreate()`, `prefillCreateForm()`, and
`viewItem()` (the task-detail modal) are untouched — confirmed via
`git diff` hunk locations, all of which fall within `renderMonthView()`
(cell/chip/+more generation and event wiring), the new
`navigateToScheduleItemListForDate()` function placed next to `selectDate()`,
and the `container.innerHTML` template's section ordering. No hunk touches
any Week/Day-only code path. `.msc-cal-cell` (Month only) is structurally
separate from `.msc-tg-daycol`/`.msc-tg-hourcell`/`.msc-tg-event`
(Week/Day) — confirmed no shared selector exists between them.

## 12. Schedule Summary Unchanged (Step 16)

Confirmed via `git diff -- web-view/js/calendar/instance.js | grep -iE
"summary|renderSummaryStats|loadDailySummary|loadWeeklySummary|
loadMonthlySummary"` — the only match was the unrelated, identical (moved
but byte-for-byte unchanged) `<details><summary>Technical details</summary>`
disclosure widget markup. `renderSummaryStats()`, `loadDailySummary()`,
`loadWeeklySummary()`, `loadMonthlySummary()`, `loadSummaries()`, their
labels, row order, and API calls have zero diff.

## 13. Static Validation (executed)

- `node --check` on all 6 files under `web-view/js/` (including
  `calendar/core.js` and `calendar/instance.js`) — **all pass**.
- CSS brace balance on all 6 files under `web-view/css/` — **all balanced**
  (`calendar.css` 193/193 after the edit).
- HTML tag-balance scan on `index.html` (unaffected by this task) — **0
  unclosed, 0 mismatches**; duplicate-id scan — **21/21 unique, 0
  duplicates**.
- **Dynamic tag-balance verification of the calendar's generated markup**:
  extracted the `container.innerHTML = ...` string-concatenation expression
  from `instance.js`, evaluated it in Node with stub values (both the
  pre-edit `git show HEAD` version and the post-edit working-tree version),
  and ran the same tag-stack parser against each rendered HTML fragment.
  Both versions report identically "1 unclosed div at position 0, 0
  mismatches" — proving this is a pre-existing artifact of the
  extraction/stub method (not a regression) and that my edit introduced
  **zero** new tag-nesting errors. Confirmed the reordered markers appear in
  the required sequence: `msc-form-card` position < `msc-leave-card`
  position < `msc-list-heading` position.
- ES module import graph (`app.js` → `navigation.js`, `calendar/instance.js`,
  `staff-data.js`) — unchanged, all resolve.
- Local static HTTP server — all 13 checked assets (root document + 6 CSS +
  6 JS, including nested `js/calendar/*`) return HTTP 200.
- `git diff --stat -- backend/ database/` — **empty (zero changes)**.
- `git diff --stat` overall — exactly 2 files:
  `web-view/css/calendar.css` (23 lines), `web-view/js/calendar/instance.js`
  (199 lines) — matching the approved scope exactly.

## 14. Real Browser Validation — NOT PERFORMED

As in the prior two dashboard tasks in this session, **this environment has
no browser-automation or screenshot tool available** (confirmed via tool
search). Click-through behavior (task-bearing cell → list, chip → list,
"+N more" → list, empty/leave-only → nothing, keyboard activation,
scroll/focus landing, console-error-free operation, responsive usability)
could not be observed in a live browser. Per the task's own instruction
("Do not claim full PASS without browser validation"), this is called out
explicitly rather than assumed. All behavior above is verified by direct
code inspection and the automated checks in §13, not by rendering.

## 15. Result

**AMBER.** All static/structural validation passed cleanly, the
task-presence rule, navigation helper, click/keyboard wiring, leave-chip
exclusion, member isolation, section reorder, and Schedule-Summary/Week-Day
preservation are all verified by direct inspection and automated checks.
The result is AMBER rather than PASS solely because Step 21 (real browser
click-through validation) could not be performed in this environment.
