---
name: calendar-selected-date-form-sync-check
type: validation
created: 2026-07-16
requirement-id: REQ-LEAVE-COPY-001
status: PASS — Leave Start Date (and Multi-Day End Date) now synchronize with every calendar date-selection path, via one shared helper; no backend/database/API/business-rule change
source-boundary: web-view/index.html only. backend/, database/ — confirmed unchanged. member-aios/mayurika-hr/staff-data/ not accessed.
root-truth: CLAUDE.md — canonical
---

# Calendar Selected-Date Form Synchronization — Validation Check — 2026-07-16

## Requirement

When a user clicks a date anywhere in the shared calendar (Month grid, mini-picker, or a Week/Day empty-slot click), both the Schedule Item date field and the Leave Start Date field must update to that date, and — for Multi-Day leave — the Leave End Date field must also initialize to that same date. This is a frontend-only UX consistency fix; no leave/task business rule, validation, conflict, reporting, or API behavior changes.

## Current Bug

The Schedule Item date field (`fieldDate`) updated correctly on every calendar date click. The Leave Start Date field (`leaveFieldStartDate`) only updated on the *first* date click after the calendar loaded — every subsequent click left it stuck on whatever date it was last set to.

## Root Cause

In `selectDate(dateStr)` (`web-view/index.html`), the Schedule Item date was set unconditionally:

```js
fieldDate.value = dateStr;
```

but the Leave Start Date was set behind a "set only if currently empty" guard:

```js
if (leaveFieldStartDate && !leaveFieldStartDate.value) { leaveFieldStartDate.value = dateStr; }
```

The guard `!leaveFieldStartDate.value` is true only before the field has ever been given a value. Once any date click (or the initial page-load selection) set a value once, the field was never empty again, so every later click silently did nothing to it — while the Schedule Item field, having no such guard, kept updating normally. There was also no handling at all for the Leave End Date field on Multi-Day leave.

## Selected-Date Source of Truth

`state.selectedDate` (per `.msc-instance` container, inside `mountScheduleCalendarInstance`) remains the single authoritative selected-date value — unchanged by this fix. `state.anchorDate` (a `Date` object derived from the same ISO string via the existing `parseDateStr` helper) continues to drive which day/week/month is rendered. No second, independent "selected date" or "today" concept was introduced.

## Shared Sync Helper

Added one new function, `syncSelectedDateToForms(dateStr)`, immediately above `selectDate`, called from exactly one place — the end of `selectDate` — replacing the old guarded line. It:
- Sets `fieldDate.value = dateStr` (Schedule Item date) — unconditionally, same as before.
- Sets `leaveFieldStartDate.value = dateStr` — now unconditionally (the fix).
- Sets `leaveFieldEndDate.value = dateStr` **only when** `leaveFieldType.value === 'Multi-Day'` — the Multi-Day initialize-to-same-date rule. For every other leave type, End Date is left untouched (it stays hidden/not-applicable per the pre-existing `updateLeaveFormFieldVisibility` logic — no new leave rule was introduced, and no automatic multi-day range is created).

`dateStr` is the same ISO `YYYY-MM-DD` string already flowing through `selectDate`/`toDateStr`/`parseDateStr` throughout this file — no locale-formatted string, no `Date`→UTC round-trip, no new date-parsing path was introduced. This matches the project's existing convention (`toDateStr`/`parseDateStr`, unchanged).

Every date-selection path funnels through `selectDate`, and therefore through this one helper — confirmed by code review, no duplicate date-assignment logic exists anywhere else in the file (grep-verified: the only other `leaveFieldStartDate.value`/`leaveFieldEndDate.value` assignments are inside `resetLeaveForm()`, which clears the fields to `''` after a successful Create Leave submission — an unrelated, pre-existing, unmodified reset path, not a selection-sync path).

## Month Calendar Click Result

`calGrid.querySelectorAll('.msc-cal-cell').forEach(...)` click handler calls `selectDate(cell.getAttribute('data-date'))` — unchanged call site, now correctly propagates to both forms via the fixed helper. This includes adjacent-month dates shown in the 42-cell grid (`buildMonthGridCells` includes leading/trailing days from neighboring months with the same `data-date` attribute format), so no special-case was needed.

## Mini-Calendar Result

`renderMiniPicker()`'s per-cell click handler already called `selectDate(btn.getAttribute('data-date'))` — same shared function, so it now automatically benefits from the same fix with no separate code path or duplicated logic.

## Week View Result

Week view's own day-column empty-slot click/drag (`wireEmptyCellCreate` → `prefillCreateForm` → `selectDate`) already funneled through `selectDate` and now synchronizes both forms identically. Drag-move/resize of an *existing* task (`commitItemTimeChange`) was not touched — that path updates a specific task's own date/time via the PUT endpoint and was out of scope (per the task's explicit "do not change drag/resize behavior").

## Day View Result

Day view's empty-slot click (same `wireEmptyCellCreate`/`prefillCreateForm`/`selectDate` path as Week) now synchronizes both forms identically. Switching Month → Week → Day preserves the already-synchronized `state.selectedDate`/`state.anchorDate` (view-switcher buttons only change `state.currentView` and re-render; they do not reset the selected date), so the date shown by Day view continues to match Leave Start Date, Schedule Item Date, and the active leave list after a view switch.

**Scope note (documented, not a defect):** the Day/Week view's own `prevBtn`/`nextBtn` navigation buttons move `state.anchorDate` by ±1 day / ±7 days and re-render, but do not call `selectDate` — this is pre-existing behavior, unchanged by this fix. These buttons page through the calendar without picking a specific date for the forms (the same way Month view's prev/next moves between months without selecting a day); explicitly selecting a date still requires clicking a date cell/slot, mini-picker cell, or the Today button, all of which are covered by the fix above. The task's explicit test matrix (Step 17) validates date clicks and Month→Week→Day view switching, not prev/next paging — both are satisfied without altering `prevBtn`/`nextBtn`.

## Leave Start Date Result

Fixed — updates on every calendar date-selection click, not just the first.

## Multi-Day End Date Result

When "Multi-Day" is the selected leave type at the moment a date is clicked, both Start Date and End Date initialize to that same clicked date. The user may then manually widen the End Date, per the requirement. No automatic multi-day range or new leave rule was introduced — this only fires on an explicit calendar date click, exactly matching the requirement's Step 4 wording.

## Schedule Item Date Result

Unchanged in behavior (still updates on every date click) — now implemented via the shared helper instead of an inline assignment, so there is one code path for both forms rather than two.

## Leave Heading/List Result

`leaveListDateLabel.textContent = dateStr` and the `renderLeaveList()` call inside `selectDate` were already present and unchanged — the leave list and its date heading already refreshed correctly for the selected date; this was not part of the bug and required no change. Pending/Approved visibility rules and the History view are untouched.

## Five-Member Result

All changes live inside the single shared `mountScheduleCalendarInstance` factory and its one `selectDate`/`syncSelectedDateToForms` pair — there is no per-member branch, condition, or duplicated function anywhere in this diff. Since this factory is invoked once per `.msc-instance` (mayurika, suman, arun, rajiv, paraparan — unchanged in `initAllScheduleCalendars`), the fix applies identically and automatically to all five member calendars.

## Backend/Database Unchanged

Confirmed via `git diff --stat`: the only modified file is `web-view/index.html` (+31/-2 lines). No file under `backend/` or `database/` appears in the diff. No API route, request/response shape, validation rule, conflict rule, reporting calculation, or classification logic was touched. `member-aios/mayurika-hr/staff-data/` remains untracked and was not accessed.

## Static Checks

- `node --check` on the extracted schedule-calendar `<script>` block (93,763 characters after this change) — **passed, no syntax errors**.
- Python `html.parser` full-file tag-balance check — **0 errors, 0 unclosed tags**.
- Grep-confirmed exactly one call site for `syncSelectedDateToForms` (from `selectDate`) and no duplicated date-selection-sync logic elsewhere in the file.

## Known Limits

No live browser interaction test was performed in this session (no browser-automation tool available, consistent with prior sessions' documented limitation). The five manual/live tests described in the task (Step 17) should be performed once this is deployed — see the handover file's "One Next Step".

## PASS / FAIL

**PASS.** Root cause identified and fixed with a single shared helper reused by every existing date-selection path (Month grid, mini-picker, Week/Day empty-slot click, Today button); Multi-Day End Date now initializes correctly; no duplicate logic was introduced; static syntax/structure checks pass; no backend, database, API, or business-rule file was changed.
