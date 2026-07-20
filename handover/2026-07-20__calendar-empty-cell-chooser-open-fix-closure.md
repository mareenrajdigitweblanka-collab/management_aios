# Handover — Calendar Empty-Cell Chooser-Open Fix (2026-07-20)

## Symptom

Clicking a blank Month-view date cell selected the date and updated the
mini-calendar, but the Task/Leave create chooser did not visibly appear.
Same underlying path affects Week/Day empty timed slots and empty all-day
areas.

## Root cause

`openCreateChoiceFromCalendar()` called `selectDate(dateKey)` — which
rerenders the active view's grid pane via `innerHTML` replacement — and
only afterward opened the create menu against the DOM node the user had
originally clicked. That node was detached by the rerender by the time it
was used, so `positionCreateMenu()`'s `getBoundingClientRect()` read an
all-zero rect and pinned the chooser to the viewport's top-left corner
instead of near the click — invisible/unnoticed to the user, not actually
failing to open. Full trace in
`validation/calendar-empty-cell-chooser-open-fix-2026-07-20.md`.

## Fix

`openCreateChoiceFromCalendar({ dateKey, allDay, startTime, endTime,
resolveAnchor })` — `anchorElement` (a raw, soon-to-be-stale DOM node) was
replaced with `resolveAnchor` (a zero-arg function invoked *after*
`selectDate()`'s rerender completes), which re-queries a fresh,
currently-attached anchor by stable `data-date`/`data-hour` attributes
against a render-stable container reference (`calGrid` for Month;
`weekGridEl`/`dayGridEl` for Week/Day — these container nodes are never
replaced, only their `innerHTML` is). Falls back to the sidebar "+ Create"
button if the resolver finds nothing.

All four call sites updated: Month cell click, Week/Day empty-slot click,
Week/Day drag-to-create release, Week/Day all-day column click.

## Files changed

- `web-view/js/calendar/instance.js` only (47 insertions / 10 deletions).

Not modified: `backend/`, `database/`, `database/migrations/`, API
contracts, task/leave overlap rules, Schedule Summary, semantic event
colors, application sidebar, `web-view/css/calendar.css`,
`web-view/index.html`, `web-view/js/calendar/core.js`. Protected path
`member-aios/mayurika-hr/staff-data/` untouched.

## Click-away safety (verified, not changed)

`onDocClickForCreateMenu` is registered on `document` with `useCapture:
true` from inside `openCreateMenu()`, itself called synchronously during
the originating click's own target-phase handler. Per the DOM dispatch
algorithm, `document`'s capturing phase has already completed by the time
a target-phase listener runs, and capture-registered listeners are never
invoked during the bubbling phase — so a listener added at this point
cannot fire for the *same* click event. No change was needed or made here;
this was verified by tracing the spec, not assumed from the existing
comment.

## Static checks

`node --check` clean on both calendar modules; CSS brace balance OK
(unmodified file); `git diff --stat -- backend/ database/` empty; all 6
sampled frontend assets returned HTTP 200 from a local static server.

## Browser validation

Not performed — no browser-automation tool available in this session,
consistent with every prior calendar task in this repository. Verified
instead via direct source tracing of the DOM lifecycle (innerHTML
replacement timing vs. anchor resolution timing) and the DOM event
dispatch spec (click-away). See validation doc for full reasoning.

## PASS / AMBER / FAIL

**AMBER** — root cause fixed with a narrow, single-file diff; all static
checks pass; backend/database/API untouched. AMBER (not PASS) solely
because mandatory real-browser click-through could not be run — no
browser-automation tool available.

## Next step

Have a maintainer with browser access click through the Step 11 regression
matrix (Month/Week/Day empty areas, Task chip/Leave chip/+N more no-ops,
drag/resize no-ops, popup open/Escape/click-away, console-clean) before
treating this as a confirmed production fix.
