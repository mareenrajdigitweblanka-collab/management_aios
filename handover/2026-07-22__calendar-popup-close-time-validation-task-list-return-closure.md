# Handover — Calendar Popup Close, Time Validation, Task-List, Return Flow (2026-07-22)

## Summary

Added a visible, keyboard/focus-correct Close button to the Create
chooser popup; added a client-side Task time-order check (End must be
later than Start) that mirrors the backend's existing rule and shows a
field-specific message instead of a generic "Check the highlighted
fields" round-trip; restructured the `+N more` Task list into a
non-scrolling header (date + Task count + Close) over one internally
scrolling, scroll-contained body; and made the Task-detail Edit flow
origin-aware, so Update and Cancel Edit return to the originating `+N
more` list (with scroll position and row focus restored) when that's
where editing began, while leaving the pre-existing direct-calendar
behavior untouched. No backend, database, API contract, or business rule
changed. Full detail in
`validation/calendar-popup-close-time-validation-task-list-return-check-2026-07-22.md`.

## Files created

- `validation/calendar-popup-close-time-validation-task-list-return-check-2026-07-22.md`
- This document

## Files modified

- `web-view/js/calendar/instance.js` (2,207 → 2,468 lines)
- `web-view/css/calendar.css` (2,000 → 2,095 lines)

No other file was touched. `backend/`, `database/`, and
`member-aios/mayurika-hr/staff-data/` are untouched.

## Functions changed (instance.js)

- **Create chooser:** `closeCreateMenu` (now accepts an optional
  `focusTarget`), `openCreateMenu` (now records `createMenuTriggerEl`),
  `onCreateMenuKeydown` (Escape now returns focus to the real opener),
  new `createMenuClose` click handler.
- **Task time validation:** new `validateTaskTimeRange()`, called from
  both the Add-Task and Update-Task click handlers; new `input`
  listeners on the date/title/start/end fields to clear their errors as
  the user corrects them.
- **`+N more` list:** `positionMorePopup` (hardened clamping + header
  offset), new `repositionMorePopupIfOpen`/`onMorePopupBodyWheel`/
  `resolveMorePopupAnchor`/`reopenTaskListOrigin`, `closeMorePopup`
  (now also removes the wheel listener), `openMorePopup` (new `opts`
  parameter: `restoreScrollTop`, `focusTaskId`; renders the Task count;
  records `taskFlowOrigin` on row activation).
- **Origin-aware return:** `viewItem` (new optional third `origin`
  argument), the detail popup's Edit-button handler (snapshots
  `editOriginFlowOrigin`), `handleCancelEditClick`, and the Update
  success handler (both branch on `editOriginFlowOrigin` to call
  `reopenTaskListOrigin` instead of, or in addition to, their prior
  behavior).
- **Sidebar toggles:** this calendar instance's own sidebar-collapse
  click handler, and a new listener on the global
  `#sidebarCollapseToggle`, both call `repositionMorePopupIfOpen()`.

## Origin-state ownership

`taskFlowOrigin` and `editOriginFlowOrigin` are plain `var`s inside
`mountScheduleCalendarInstance(container)` — one independent copy per
mounted member calendar (5 total), never written to `window`/`document`,
never sent to the backend, never included in any API request body. See
the validation document §13/§19 for the full model and the member-
isolation argument.

## Popup lifecycle

- **Create chooser:** open (sidebar button or a calendar empty-area
  click) → close via Close button / Escape / outside click. Close
  button and Escape both return focus to whatever opened it; outside
  click does not force a focus change (unchanged).
- **`+N more` list:** open (a "+N more" chip click) → a row activation
  records the origin, closes the list, opens Task detail → Edit → Update
  or Cancel Edit reopens the same list (fresh anchor resolved, scroll
  position and row/list-container focus restored) → Close/Escape/
  outside-click dismiss it normally otherwise.

## Event-listener cleanup

`closeMorePopup()` removes all three listeners it added in
`openMorePopup()`: the capture-phase document `click` and `keydown`
listeners (pre-existing pattern, unchanged) and the new `wheel` listener
on `.msc-more-popup-body`. The `window resize` listener and the two
sidebar-collapse listeners are added once per instance at mount time (not
per popup-open/close cycle) and are expected to live for the page's
lifetime, matching how every other instance-level listener in this file
(e.g. the `setInterval` now-line refresh) already behaves — there is
nothing to remove them for, since a mounted calendar instance is never
unmounted while the page is open.

## Maintenance instructions

- To add a new origin type beyond `direct-calendar`/`more-task-list`:
  extend `viewItem`'s third argument and add a branch in both
  `handleCancelEditClick` and the Update success handler that checks
  `flowOrigin.type === '<new-type>'` before falling through to the
  existing `direct-calendar`/no-origin behavior.
- To add a new field to the `+N more` row: edit `openMorePopup()`'s
  `dayItems.forEach` markup block and the corresponding
  `.msc-more-popup-item-*` CSS in `calendar.css` — keep the time column
  fixed-width and the title flexible, per the existing pattern.
- Do not remove the `overscroll-behavior: contain` rule on
  `.msc-more-popup-body` without also reconsidering
  `onMorePopupBodyWheel()` — the CSS property is the primary containment
  mechanism; the JS handler is a narrow backstop, not a replacement.

## Deployment

Same static-site Vercel deployment as prior tasks
(`https://management-aios.vercel.app`, auto-deploys on push to `main`).
No new environment variables, build step, or configuration change.

## Rollback

Revert the commit(s) listed below — no migration, environment variable,
or Vercel configuration accompanies this change, so a plain file revert
fully undoes it.

## Commits

(Recorded once created.)

1. Improve calendar popup and task-list navigation UX
2. Document calendar popup and return-flow validation

## Known limitations

- Real-browser/responsive/accessibility/console validation was not
  performed in this environment (no working browser-automation tool
  available) — see the validation document §25/§26 for the full list,
  including the deliberate choice not to add a custom `touchmove`
  scroll-boundary handler.
- Viewing (not editing) a Task from the list, then closing, does not
  reopen the list — only Update and Cancel Edit are origin-aware, per
  this task's explicit scope. Same for Delete-from-list.

## One next step

Open the deployed app and, on at least the Mayurika calendar: open the
Create chooser from both the sidebar button and a blank Month cell and
confirm the new Close button and Escape both work and return focus
correctly; try creating a Task with an End time before its Start time
and confirm the specific "End time must be later than start time."
field message appears (no generic banner, no native alert); open a date
with several Tasks via "+N more," confirm the header (date + count +
Close) stays visible while only the list scrolls and the background
page never scrolls with it; then select a Task from that list, edit it,
and confirm both Update and Cancel Edit return to that same list with
its scroll position preserved — closing the one verification gap this
task could not perform itself.
