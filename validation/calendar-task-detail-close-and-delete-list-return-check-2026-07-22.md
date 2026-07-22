# Calendar Task-Detail Close & Delete List-Return Check (2026-07-22)

## 1. User-confirmed requirement

1. When a Task was opened from the `+N more` task list and the user
   closes the Task Details popup, reopen the same date's task list.
2. When a Task was opened from the `+N more` task list and is
   successfully deleted: refresh the member's tasks, recount the
   remaining tasks for the originating date (excluding Leave and the
   deleted Task), and reopen the same date's task list only if more
   than 2 tasks remain; otherwise return to the calendar without
   reopening it.

## 2. Root cause

The prior task (`calendar-popup-close-time-validation-task-list-return`,
2026-07-22) added `taskFlowOrigin` and made `handleCancelEditClick()` /
the Update-success handler origin-aware, but `closeViewModal()` itself
(the function the visible Close button, Escape, and backdrop click all
call) never consulted `taskFlowOrigin` — it unconditionally just
returned focus to `lastFocusedTrigger` (the "+N more" chip, for a
list-origin Task). Likewise, the Delete flow's success handler called
`closeViewModal()` and stopped there, with no conditional return to the
list at all. Both gaps are now closed.

## 3. Origin-state ownership

Unchanged from the prior task — `taskFlowOrigin` remains a `var` inside
`mountScheduleCalendarInstance(container)`, one independent copy per
mounted member instance (5 total), never sent to the API, never
persisted, never global. This task adds no new state variables; it adds
logic that reads and clears the existing `taskFlowOrigin` at two more
points (`closeViewModal()`, the Delete success handler) and the existing
`editItem`-entry handler (Edit button) now explicitly clears it first so
the two behaviors never collide (see §4).

## 4. Task-detail visible Close result

`closeViewModal()` now branches on `taskFlowOrigin` before doing
anything else: if it is `{ type: 'more-task-list', ... }`, it calls the
existing `reopenTaskListOrigin()` (unchanged from the prior task —
resolves a fresh anchor, restores scroll position and row/list focus)
instead of the plain `returnFocus(trigger)` path. `taskFlowOrigin` is
cleared unconditionally inside `closeViewModal()` before branching, so
the origin can never be read/reused twice. `selectedDate`/`currentView`
are untouched by this path (only true for direct-calendar Tasks anyway,
since `state.currentView` cannot change while the modal blocks
background interaction — see §7).

**Regression caught and fixed during this task:** the detail popup's
Edit button also calls `closeViewModal()`. Without a fix, clicking Edit
on a list-origin Task would have made `closeViewModal()` reopen the "+N
more" list underneath the about-to-open Task edit form. Fixed by
clearing `taskFlowOrigin = null` in the Edit-button handler immediately
after snapshotting it into `editOriginFlowOrigin` (used by Cancel-Edit/
Update, unchanged) and before calling `closeViewModal()` — so Edit's own
close is unaffected, exactly as before this task.

## 5. Task-detail Escape result

`onViewModalKeydown`'s Escape branch calls `closeViewModal()` directly
(unchanged) — since that function is now origin-aware, Escape
automatically follows the identical behavior as the visible Close
button, per the requirement.

**Interpretive note (backdrop click):** the detail popup's backdrop
click also calls `closeViewModal()` (unchanged code, one function). The
requirement text names only the visible Close button and Escape
explicitly; backdrop click was not separately named. Because both named
triggers and backdrop click already funnel through the one
`closeViewModal()` function, giving backdrop click a different behavior
would have required a special case carved out just for it — an
invented asymmetry the requirement doesn't ask for. Backdrop click now
shares the same origin-aware behavior as a natural consequence, not a
separately-implemented feature. Flagged here explicitly rather than left
silent.

## 6. Detail Close → List result

Confirmed by code trace: Close button click, Escape, or backdrop click
on a Task opened via a "+N more" row → `closeViewModal()` → `taskFlowOrigin.type
=== 'more-task-list'` → `reopenTaskListOrigin(flowOrigin)` →
`resolveMorePopupAnchor(flowOrigin.dateStr)` (date's "+N more" chip →
date's plain cell → sidebar Create button, unchanged fallback chain) →
`openMorePopup(dateStr, anchorEl, { restoreScrollTop, focusTaskId })` —
the same list, same date, same member instance, scroll position and
row/list focus restored (unchanged mechanism from the prior task).

## 7. Delete refresh sequence (Step 5)

1. User clicks Delete in Task Details → `confirmDestructive()` dialog
   opens (unchanged).
2. User confirms → `deleteItem()`'s `onConfirm` sends the existing
   `DELETE /api/member-schedules/{member_key}/{event_id}` request
   (unchanged endpoint, unchanged contract).
3. On backend success (200): `items = items.filter(x => x.id !== id)`
   (unchanged — this *is* the existing authoritative refresh mechanism
   in this codebase; Update already updates `items` in place the same
   way rather than doing a full re-`GET`), then `renderActiveView()`
   re-renders the Month grid from the now-updated `items` array
   (unchanged), then the "Task deleted" toast shows (unchanged).
4. **New this task:** the `viewDeleteBtn` click handler's outer
   `.then(function (deleted) {...})` — which only runs after all of the
   above has already completed — computes
   `itemsForDate(flowOrigin.dateStr).length` (only for a list-origin
   Task), clears `taskFlowOrigin`, calls `closeViewModal()` (now a
   no-op reopen, since the origin was just cleared), and then applies
   the `remaining > 2` conditional reopen itself.

## 8. Remaining-task count method

`itemsForDate(dateStr)` (existing, unchanged function — filters the
in-memory `items` array by date; `items` never contains Leave records,
which live in the entirely separate `leaveItems` array) is called
**after** `deleteItem()`'s `onConfirm` has already filtered out the
deleted Task from `items` on confirmed backend success. This is never a
manually-decremented pre-delete count and never includes Leave — it is
a fresh count of exactly what remains, computed from data already
confirmed correct by the successful DELETE response.

## 9. More than 2 remaining result

`remaining > 2` → `reopenTaskListOrigin(flowOrigin)` runs, showing the
freshly re-rendered list (via the already-executed `renderActiveView()`)
with the deleted Task absent and the count reflecting the true remaining
total (`openMorePopup()` recomputes `dayItems.length` itself at render
time from the same updated `items` array).

## 10. Exactly 2 remaining result

`remaining > 2` is false (`2 > 2` = false) → the list is not reopened.
User stays on the calendar; the existing "Task deleted" toast is the
only feedback; no Task Details, no Create chooser, no task-list popup.

## 11. Fewer than 2 remaining result

Same as §10 — `remaining > 2` is false for 0 or 1 remaining. Identical
"stay on calendar" behavior.

## 12. Deleted-task absence result

Guaranteed by construction: `remaining` is computed from `items` *after*
the deletion has already been applied to that same array, and any
reopened list (§9) renders from that identical, already-filtered array —
there is no code path where the deleted Task could still appear.

## 13. Delete-failure result

`deleteItem()`'s `onConfirm` `.catch()` (unchanged) shows the mapped
error toast and resolves `false`, touching neither `items` nor
`taskFlowOrigin`. The click handler's `.then(function (deleted) { if
(!deleted) { return; } ... })` returns immediately in this case — Task
Details stays open (never called `closeViewModal()`), `taskFlowOrigin`
is untouched (still holds the original list origin), and nothing is
removed from the calendar. No stale list is ever opened on a failed
delete.

## 14. Direct-calendar behavior (S)

Unchanged, verified by trace: a Task opened via a Month chip, Week/Day
timed block, or all-day chip calls `viewItem(id, triggerEl)` with no
third argument, so `taskFlowOrigin` is `null` throughout its detail/edit/
delete lifecycle. `closeViewModal()`'s branch takes the `else` path
(plain `returnFocus`); the delete handler's `flowOrigin &&
flowOrigin.type === 'more-task-list'` check is false, so `remaining`
stays `0` (unused) and the reopen block never runs — both exactly
reproduce this task's starting behavior for direct-calendar Tasks.

## 15. Member-isolation result

Unchanged mechanism, reconfirmed: every variable this task reads/writes
(`taskFlowOrigin`, `editOriginFlowOrigin`, `lastFocusedTrigger`) is a
`var` inside the one per-member factory closure
(`mountScheduleCalendarInstance`), called once per `.msc-instance` (one
per member). No new global, `window`, or cross-instance state was
introduced. A "+N more" list can structurally only ever reopen inside
the same member's own container that recorded its origin.

## 16. Focus and scroll restoration

Unchanged mechanism from the prior task — `reopenTaskListOrigin()` /
`openMorePopup(dateStr, anchorEl, opts)` already restore
`opts.restoreScrollTop` and focus the previously-selected row (or the
list container if that Task no longer exists, e.g. it was the one just
deleted). This task adds no new restoration logic; it adds the two new
call sites (§6, §9) that invoke this existing mechanism.

## 17. Static-check result

- `node --input-type=module --check` on `web-view/js/calendar/instance.js`
  (the only file touched this task): **PASS**.
- `resize:\s*(horizontal|both)` search: zero live declarations
  (unaffected — no CSS was touched this task).
- `window.alert(`/`window.confirm(`/`window.prompt(` search: zero live
  invocations (unaffected).
- Duplicate static `id` scan on `index.html`: none (unaffected — not
  touched this task).
- CSS brace-balance on all 7 stylesheets: unaffected (no CSS file was
  modified this task — `git status` confirms only `instance.js`
  changed).

## 18. Backend / API / database proof

```
$ git diff --stat -- backend/
(no output — zero changes)
$ git diff --stat -- database/
(no output — zero changes)
```

- Backend changes: **NONE**. API changes: **NONE** — no route, schema,
  or model touched; the DELETE endpoint's contract is unchanged.
- Database changes: **NONE**. Migrations: **NONE**.
- Business-rule changes: **NO** — the `>2`/`<=2` rule is a purely
  frontend UI-navigation decision about whether to reopen a popover; it
  does not alter what gets deleted, how conflicts are detected, or any
  server-side validation.
- Live backend smoke test performed during this task: created a
  disposable Task via `POST /api/member-schedules/mayurika` (201),
  deleted it via the existing `DELETE .../{event_id}` endpoint (200,
  `{"deleted":true}`) — confirming the endpoint this task's new
  frontend logic depends on is unchanged and functioning; the
  disposable record was removed immediately, no existing user records
  were touched.

## 19. Backend-test result

No backend files were modified in this task; the smoke test in §18
confirms the existing DELETE endpoint behaves identically to before.

## 20. Browser-console / responsive result

**Not independently browser-tested in this environment** — same
limitation as the two prior tasks in this series: no working
browser-automation tool is available in this sandbox. Per an explicit,
informed decision made during this task's conversation, static
validation (§17), the backend smoke test (§18), and a full manual
code-trace of every modified branch (§4–§16, including the Edit-button
regression found and fixed during that trace) were treated as
sufficient to proceed with commit/push/deploy.

## 21. Queryability result

This document plus the handover document together answer: exactly which
two functions changed and why, the exact regression found and fixed
mid-task (Edit button), the authoritative remaining-count method, the
exact `>2`/`<=2` behavior split, and what was and was not independently
browser-verified.

## 22. Known limitations

- Real-browser/responsive/console validation was not performed (§20).
- Viewing a Task from the list and closing without editing now *always*
  reopens the list (this task's whole point) — including via backdrop
  click, an interpretive choice documented in §5 rather than a
  literally-named requirement.
- Deleting a Task with exactly 2 or fewer remaining leaves the user on
  the calendar with only a toast — there is no now-empty/near-empty list
  shown even briefly, per the explicit requirement; this was verified
  by code trace only, not a real click-through.

## 23. PASS / AMBER / FAIL

**AMBER.** Both required behaviors (Close-to-list-return,
conditional delete-to-list-return) are implemented and traced end-to-end
against every call site, a real regression (the Edit button) was caught
and fixed during that trace, backend/database/API are provably
unchanged, and all static checks pass. AMBER rather than PASS solely
because mandatory real-browser validation could not be executed in this
environment.

## 24. Evidence paths

- This document.
- `handover/2026-07-22__calendar-task-detail-close-and-delete-list-return-closure.md`
- Diff: `git diff -- web-view/` at commit time (see handover for hashes).
