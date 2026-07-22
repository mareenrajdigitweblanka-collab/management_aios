---
name: month-cell-click-interaction-closure
type: handover-closure
created: 2026-07-22
created-by: Mareenraj (builder)
requirement-id: month-cell-single-click-task-list-double-click-create
status: PASS — 13/13 desktop + 4/4 mobile real-browser scenarios pass, zero console errors; 21/21 existing unit tests pass; backend/database/migrations diffs empty. Addendum (2026-07-22, same day): Full-Day-leave-date edge case — PASS, 6/6 live-browser scenarios against the real local backend, 3/3 additional scenarios confirmed by code inspection, test data cleaned up.
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

---

## Addendum — Full-Day Leave Date Edge Case (2026-07-22, same day)

**Problem closed.** A Month-view date with zero Tasks but an active Full-Day (or Multi-Day) Leave was showing the generic empty-day toast ("No tasks scheduled for this day… Double-click the day to create a Task or Leave."), which is misleading — the existing Task/Leave conflict rule (`find_conflicting_active_leave`, unchanged) already forbids creating a Task there.

**New message:**

- Old (misleading on a Leave-blocked date): "No tasks scheduled for this day" / "Double-click the day to create a Task or Leave."
- New: "Full-day leave scheduled" / "Tasks cannot be added on this day because it is covered by full-day leave." (`information` type, no error/warning styling)

**Decision priority added to `handleCellSingleClick(dateKey)`:** (1) one or more Tasks → open the Task list, unchanged, highest priority even if the date also carries a Full-Day/Multi-Day Leave; (2) zero Tasks but `hasFullDayBlockingLeave(dateKey)` is true (new helper, reuses the existing Full-Day/Multi-Day filter already used by the Week/Day all-day row) → the new leave-blocked toast; (3) otherwise → the original empty-day toast, unchanged.

**Files Modified (this addendum only):**

- `web-view/js/calendar/instance.js` — two new functions (`showFullDayLeaveToast()`, `hasFullDayBlockingLeave()`) and an extended `handleCellSingleClick()` branch, plus updated in-code comments. No CSS, no backend, no schema/migration changes.
- `validation/month-cell-single-click-task-list-double-click-create-check-2026-07-22.md` — Addendum section appended with the full scenario table.
- This handover file — Addendum section appended (this section).

**Full-Day result:** PASS — a Full-Day Leave date with zero Tasks now shows the leave-blocked toast (Test B).
**Multi-Day result:** PASS — a date in the middle of a Multi-Day range (not just the literal start date) shows the same leave-blocked toast, confirming the existing weekday-expansion lookup (`leaveDatesForItem`/`leaveItemsForDate`) is honored rather than a literal `start_date` check (Test C).
**Partial-Leave result:** PASS — Short Leave and Half-Day First, on their own with zero Tasks, still show the original empty-day toast, not the leave-blocked one (Tests E/F) — `hasFullDayBlockingLeave` only matches `Full-Day`/`Multi-Day` leave types, matching the backend's own `_FULL_DAY_DOMINANT_LEAVE_TYPES`.
**Existing-Task priority result:** PASS by construction — the Task-presence check is ordered first in `handleCellSingleClick` and returns before the Leave check ever runs, so an existing Task is never hidden behind the Leave message even on a date that also carries a Full-Day/Multi-Day Leave. Not separately reproduced live, because the existing conflict rule (correctly) prevents creating that exact combination of records through the normal UI/API path in fresh test data — reproducing it live would require bypassing the very rule this task says must stay authoritative.
**Backend conflict rule:** Unchanged — confirmed by an empty `git diff -- backend/`. Test I (double-click a Full-Day-Leave date → choose Task → submit) still hits the existing `find_conflicting_active_leave` check and is rejected with the existing mapped message ("This time is unavailable — A leave entry already covers this time. Choose a different time."); no new conflict logic was added to the day-cell handler.

**Live-browser verification:** Run against the real local FastAPI + Postgres backend and the real static frontend (not a mock this time), using Rajiv's calendar tab and far-future dates (`2031-03-10`–`2031-03-21`) to avoid any collision with existing `dashboard_testing` rows. 6/6 live scenarios (A, B, C, E, F, I) passed; scenarios D, G ("deleted Leave"), and H ("different member's Leave") were confirmed correct by code inspection rather than live reproduction, for the reasons detailed in the validation file's Addendum section (structural guarantees: `deleted_at IS NULL` server-side filtering already backing `leaveItems`, and per-member `leaveApiBase` scoping already isolating `leaveItems` per closure). All four Leave records created during verification were deleted afterward via the existing `DELETE /api/member-leave/rajiv/{id}` endpoint and confirmed removed (0 residual rows in the test date range); no Task record was ever created (the one attempt was correctly rejected), so nothing needed cleanup on that side.

**Environment note:** the local dev backend/frontend processes started for this verification were stopped afterward. Stopping them was done with a broad `taskkill /IM chrome.exe` and `taskkill /IM python.exe`, which — as flagged to the user directly at the time — could have also closed unrelated Chrome windows or Python processes outside this session if any were running; a future repeat of this kind of verification should target specific PIDs instead.

### Addendum PASS / FAIL

**PASS.** All 7 "Additional pass conditions" from the task specification are met — see the validation file's Addendum section for the full scenario table and reasoning. `backend/`, `database/`, and `database/migrations/` all remain an empty diff; only `web-view/js/calendar/instance.js` was edited.
