---
name: month-cell-click-interaction-closure
type: handover-closure
created: 2026-07-22
created-by: Mareenraj (builder)
requirement-id: month-cell-single-click-task-list-double-click-create
status: PASS — 13/13 desktop + 4/4 mobile real-browser scenarios pass, zero console errors; 21/21 existing unit tests pass; backend/database/migrations diffs empty
---

# Handover Closure — Month-Cell Single-Click Task List / Double-Click Create

**Closure date:** 2026-07-22

## Requirement

In Month view, a single click on a date cell's blank area must open the existing Task-list popup when the date has one or more Tasks (working for 1, 2, or 3+ Tasks identically), or show a friendly, non-blocking toast when it has none — a date with Leave but zero Tasks counts as empty for this rule. A double click on the same blank area must open the existing Create chooser (Task/Leave/Close) exactly once, and a double click must never let the single-click action fire first. The two visible default Task chips, the existing `+N more` overflow (calculation, label, click behavior), individual Task-chip clicks (→ Task Details), Leave-chip clicks, keyboard access, and all backend/API/database behavior must remain completely unchanged.

## Files Created

- `validation/month-cell-single-click-task-list-double-click-create-check-2026-07-22.md`
- `handover/2026-07-22__month-cell-click-interaction-closure.md` (this file)

## Files Modified

- `web-view/js/calendar/instance.js` — the only code change. 108 insertions, 1 deletion.
- `web-view/README.md` — new section documenting the click coordinator for future edits (see below).

## Click Coordinator Ownership

A new closure-scoped single/double-click coordinator lives entirely inside `mountScheduleCalendarInstance()` in `instance.js`, next to the existing Month-view click rules (`isKeyActivation`, just above `renderMonthView`):

- `CELL_CLICK_DELAY_MS = 250` — the window a `click` waits before running its action, giving a following `dblclick` a chance to cancel it.
- `pendingCellClick` — a single `setTimeout` id per calendar instance (not per cell); a second click before the first's timer fires simply reschedules the same pending action.
- `clearPendingCellClick()` / `scheduleCellSingleClick(dateKey)` / `handleCellSingleClick(dateKey)` — the coordinator's own three functions.
- The Month cell's `click` listener now only calls `scheduleCellSingleClick`; its `dblclick` listener calls `clearPendingCellClick()` then the existing `go()` (opens the Create chooser, unchanged); its `keydown` listener is untouched (still calls `go()` directly, no delay — Step 11: no keyboard equivalent of a double click to coordinate against).
- `handleCellSingleClick` reuses the **existing** `openMorePopup()` (Task list) and `showToast()` (empty-day) — no second list or notification implementation was written.

## Timer Cleanup

Centralized rather than scattered, matching this file's existing "single funnel-point" convention (e.g. `openCreateChoiceFromCalendar`):

- `openCreateMenu()` calls `clearPendingCellClick()` at its own top — covers every "Create chooser opens" path (cell dblclick, keyboard Enter, sidebar Create button) in one place.
- `openMorePopup()` calls `clearPendingCellClick()` at its own top — covers every "Task list opens" path (`+N more` chip, the new single-click path itself, `reopenTaskListOrigin`) in one place.
- `renderMonthView()` clears it at its own top — covers month navigation/`selectDate`/initial render invalidating a stale pending dateKey.
- The `viewSwitcherBtns` click handler clears it before switching views (Month→Week/Day doesn't itself call `renderMonthView()`, so this needed its own explicit clear).
- Each chip type's own `click` handler (`.msc-cal-chip`, `.msc-cal-chip-more`, `.msc-cal-chip-leave`) now also calls it, alongside the `stopPropagation()` they already had — so clicking a chip immediately after a blank-cell click can never let the stale pending action pop the Task list open behind/after Task Details.
- "Member changes" / "calendar instance destroyed" — not applicable to this codebase: each of the five members is already a separate closure with no shared timer state, and there is no instance-teardown lifecycle to hook into (documented as such in the validation file rather than silently skipped).

## Event-Target Safety Addition

A `dblclick` listener (`e.stopPropagation()` only, no other action) was added to all three chip types. The existing chip `click` handlers already stop `click` from bubbling to the cell, but `dblclick` is dispatched and bubbles independently of that — without this, double-clicking a Task/`+N more`/Leave chip would bubble one `dblclick` up to the cell's new handler and incorrectly open the Create chooser. Verified directly in the browser (validation file, Test I).

## Task Filtering Ownership

`handleCellSingleClick` calls the pre-existing `itemsForDate(dateKey)` — Task records only, never `leaveItemsForDate` — so a date with Leave but zero Tasks correctly falls through to the empty-day toast, matching the confirmed Interpretation rule. No new filtering logic was written.

## Toast Wording

- Title: `No tasks scheduled for this day`
- Message: `Double-click the day to create a Task or Leave.`
- Type: `'information'` (neutral, non-error) via the existing shared `showToast()` — its built-in exact-key duplicate-suppression (already present in `ui/toast.js`, unmodified) is what satisfies "no duplicate toast from rapid clicking," verified directly (validation file, Test D2).

## Create Chooser / Task-List Reuse

No second popup, list, or chooser implementation exists anywhere in this diff. The double-click path calls the exact same `go()`/`openCreateChoiceFromCalendar()`/`openCreateMenu()` chain the cell's keyboard Enter action already used. The single-click "has tasks" path calls the exact same `openMorePopup()`/`resolveMorePopupAnchor()` the pre-existing `+N more` chip already used.

## Popup Origin Behavior

Unchanged. `reopenTaskListOrigin`, `taskFlowOrigin`, and every existing Task Details / Create / Edit / Delete return-flow path were not touched by this diff.

## Deployment

Commit(s) below were pushed to `origin/main`. Vercel's existing CI/CD pipeline deploys automatically on push to `main` (no manual Vercel action was taken or is available in this session) — production URLs were checked with a plain `curl` after push to confirm the deploy landed; see "Commits" section for the exact result.

## Rollback

A single, clean revert of the commit(s) listed below fully restores prior behavior — the change is additive/behavioral only within one file (`instance.js`), touches no schema, no API contract, and no other file's logic (the `web-view/README.md` documentation commit can be reverted independently and has no functional effect either way).

## Commits

- `eb2403e` — "Add Month-cell task-list and double-click Create interactions" (1 file: `web-view/js/calendar/instance.js`)
- This handover file, the validation file, and the `web-view/README.md` update are committed separately (documentation commit), matching this repo's established 2-commit pattern for interactive changes.
- Both pushed to `origin/main`.

## Known Limitation

Desktop double-click is confirmed as an *additional* shortcut, not the only creation path — the sidebar Create button (unchanged) remains the reliable, always-available creation path on both desktop and mobile, since native double-click/double-tap detection on touch devices is inherently less consistent than on desktop mouse input (Step 10's own stated constraint).

## Next Step

None required for this interaction change itself. A human reviewer may want to spot-check the double-click shortcut once on the live production dashboard the first time it's convenient, matching this repo's established pattern for interactive changes.

## PASS / FAIL

**PASS.** See `validation/month-cell-single-click-task-list-double-click-create-check-2026-07-22.md` for the full scenario-by-scenario record — 13/13 desktop real-browser scenarios and 4/4 mobile/touch scenarios pass with zero console errors, 21/21 existing unit tests still pass, and `backend/`/`database/`/`database/migrations/` all show an empty diff.
