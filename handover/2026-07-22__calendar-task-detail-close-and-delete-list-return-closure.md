# Handover — Calendar Task-Detail Close & Delete List-Return (2026-07-22)

## Summary

Closes two gaps left by the prior `calendar-popup-close-time-validation-
task-list-return` task: (1) closing Task Details (visible Close button,
Escape, or backdrop click) for a Task opened from the "+N more" list now
reopens that same list instead of just returning focus to its anchor
chip; (2) successfully deleting such a Task now refreshes the calendar
data, recounts the remaining Tasks for that date, and reopens the list
only if more than 2 remain — otherwise the user stays on the calendar.
A real regression (the detail popup's Edit button also calling the now
origin-aware `closeViewModal()`) was caught and fixed during
implementation. No backend, database, API contract, or business rule
changed.

## Files created

- `validation/calendar-task-detail-close-and-delete-list-return-check-2026-07-22.md`
- This document

## Files modified

- `web-view/js/calendar/instance.js` only (2,468 → 2,537 lines).

No CSS or other file was touched. `backend/`, `database/`, and
`member-aios/mayurika-hr/staff-data/` are untouched.

## Functions changed

- `closeViewModal()` — now branches on `taskFlowOrigin`: reopens the
  originating "+N more" list (via the existing `reopenTaskListOrigin()`)
  when the closed detail view came from one, otherwise takes the
  pre-existing plain focus-return path. Clears `taskFlowOrigin`
  unconditionally.
- The detail popup's Edit-button click handler — now clears
  `taskFlowOrigin = null` immediately after snapshotting it into
  `editOriginFlowOrigin`, before calling `closeViewModal()`, so Edit's
  own close is never mistaken for a "return to list" close (the
  regression found during this task).
- The detail popup's Delete-button (`viewDeleteBtn`) click handler — now
  captures the origin before deleting, computes the authoritative
  remaining-task count from the already-refreshed `items` array after a
  successful delete, clears the origin, closes the modal, and
  conditionally reopens the list only when more than 2 Tasks remain. A
  failed delete returns early and touches none of this.

## Origin-state ownership

Unchanged — see the validation document §3. No new state variables were
added this task.

## Popup lifecycle

- **Close (Close button / Escape / backdrop):** detail popup closes →
  origin-aware reopen (list) or plain focus-return (direct-calendar),
  decided entirely inside `closeViewModal()`.
- **Delete:** confirm dialog → DELETE request → on success, `items`
  refreshed in place, calendar re-rendered, toast shown, then this
  task's new conditional list-reopen logic runs; on failure, nothing
  beyond the existing error toast happens and Task Details stays open.

## Event-listener cleanup

No new listeners were added by this task — it only adds branching logic
inside existing handlers (`closeViewModal`, the Edit and Delete button
click handlers). The existing `reopenTaskListOrigin`/`openMorePopup`/
`closeMorePopup` listener-cleanup behavior (documented in the prior
task's handover) is unchanged and already correct.

## Maintenance instructions

- If a third origin type is ever added, remember `closeViewModal()` now
  needs its own branch for it too, in addition to
  `handleCancelEditClick()` and the Update-success handler from the
  prior task.
- Any future code path that calls `closeViewModal()` for a reason other
  than "the user is done looking at this Task" (as Edit's handler does,
  to open the edit form instead) must clear `taskFlowOrigin = null`
  first, exactly as the Edit-button fix in this task does — otherwise
  `closeViewModal()`'s reopen-the-list behavior will fire unexpectedly
  underneath whatever that other code path is about to show.

## Deployment

Same static-site Vercel deployment as prior tasks
(`https://management-aios.vercel.app`), auto-deploys on push to `main`.
No new environment variables or configuration.

## Rollback

Revert the commit(s) listed below — no migration or configuration
accompanies this change.

## Commits

1. `c43748c` — Restore task list after task detail and deletion
2. `8e309ca` — Document task-list return validation

## Known limitations

- Real-browser validation was not performed in this environment (no
  working browser-automation tool available) — same limitation as the
  two prior tasks in this series.
- Backdrop-click on Task Details now also triggers the origin-aware
  reopen, an interpretive extension beyond the two explicitly-named
  triggers (Close button, Escape) — documented in the validation
  document §5, not hidden.

## One next step

Open the deployed app and, on the Mayurika calendar: open a date with 5+
Tasks via "+N more," select one, close Task Details with the visible
Close button, and confirm the same list reopens with its scroll
position intact; then repeat opening a Task from a date with exactly 3
tasks, delete it, and confirm the list does **not** reopen (2 remain) —
closing the one verification gap this task could not perform itself.
