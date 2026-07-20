# Handover — Calendar Empty-Slot Create + Overlap Rules (2026-07-20)

## Files changed

Frontend:
- `web-view/js/calendar/instance.js` — new `openCreateChoiceFromCalendar()`
  helper, generalized `openCreateMenu(anchorEl)`/`positionCreateMenu()`,
  rewired Month cell / Week-Day empty timed slot / all-day area click
  handlers, retired `prefillCreateForm()`, added a `.msc-tg-leave-block`
  click-inert handler.
- `web-view/css/calendar.css` — `.msc-tg-leave-block` pointer-events fix,
  `.msc-tg-allday-col` focus ring, removed a now-redundant mobile
  `.msc-create-menu` position override, updated comments.

Backend:
- `backend/routers/leave_logic.py` — new `find_conflicting_active_tasks()`
  and `task_conflict_response_body()` (the missing Leave-vs-Task direction).
- `backend/routers/member_leave.py` — wired the new check into
  `create_member_leave_record` and `update_member_leave_record`.
- `backend/schemas.py` — new `TaskConflictItemOut`/`TaskConflictResponseOut`
  documented (unused-as-response_model) schema pair, matching the existing
  `LeaveConflictResponseOut`/`LeaveOverlapResponseOut` convention.

Tests:
- `backend/tests/test_task_leave_overlap.py` (new) — 15 tests covering the
  new Leave-vs-Task direction and confirming Task-vs-Task remains allowed.

Not modified: `backend/routers/member_schedules.py`, `backend/models.py`,
`database/`, `database/migrations/`, `web-view/index.html`,
`web-view/js/calendar/core.js`, Schedule Summary markup/logic anywhere.
Protected path `member-aios/mayurika-hr/staff-data/` untouched.

## Helper names

`openCreateChoiceFromCalendar({ dateKey, allDay, startTime, endTime,
anchorElement })` — the one centralized calendar-origin creation entry
point (Step 4's requested signature, matching this repo's naming
convention). `positionCreateMenu(anchorEl)` and `timedSlotSpan(startHour,
endHour)` are its two small supporting helpers (menu positioning; the
existing whole-hour clamp math extracted so the single-click and drag-
release paths don't duplicate it).

## Click-state ownership

All click/drag/keyboard state (`createMenuOpen`, `dragStartHour`/
`dragCurrentHour`/`isDragging` inside `wireEmptyCellCreate`, the popup
open/close booleans from the prior task) remains closure-scoped inside
`mountScheduleCalendarInstance` — no module-level or global mutable state
was introduced. Each of the 5 member calendar instances keeps fully
independent state, unchanged pattern from every prior calendar task.

## Overlap-rule ownership

`backend/routers/leave_logic.py` remains the single shared module for all
three conflict directions: `find_conflicting_active_leave` (task-vs-leave,
pre-existing, untouched), `find_conflicting_active_tasks` (leave-vs-task,
new), `find_overlapping_leave_records`/`assert_no_leave_overlap`
(leave-vs-leave, pre-existing, untouched). Task-vs-task has no owning
function anywhere — confirmed by inspection that no such check exists in
`member_schedules.py`, which is the intended, already-correct state.

## Backend validation path

Leave create/update (`member_leave.py`): validate shape → acquire member
advisory lock → leave-vs-leave overlap check (409 `leave_overlap`) → **new**
leave-vs-task check (409 `task_conflict`) → Short Leave monthly-cap check →
persist. Task create/update (`member_schedules.py`, unchanged): classify
category → task-vs-leave check (409 `leave_conflict`) → persist. No
ordering among the three conflict directions was mandated by the task spec;
the new check was placed immediately after the existing leave-vs-leave
check to keep all overlap validation grouped before the cap check, matching
this router's existing structural convention.

## Unchanged API/schema boundary

No existing endpoint's URL, HTTP method, request payload shape, or success-
response shape changed. The two pre-existing 409 contracts
(`leave_conflict`, `leave_overlap`) are byte-identical. The one new surface
area is an ADDITIONAL possible 409 body (`task_conflict`) on the two
existing leave endpoints (`POST`/`PUT /api/member-leave/{member_key}[/...])
— additive, not a breaking change to any existing success or error path.
No table, column, index, or constraint changed; `database/` and
`database/migrations/` have empty diffs.

## Deployment

Not deployed and not live-verified in this session — no browser-automation
tool available here (same documented gap as every prior calendar task in
this project). Backend correctness is verified by 182/182 passing unit
tests (`python -m unittest discover -s backend/tests -p "test_*.py"`);
frontend correctness is verified structurally (generated-template HTML
balance, static asset checks) but not by driving a real browser.

## Commit hashes

See the companion staging/commit/push report for this turn.

## Known limitations

- Real-browser interaction validation was not performed (see validation
  doc's AMBER verdict) — this is the same class of gap every prior UI task
  in this project has disclosed, not new to this task.
- The Leave-vs-Task race window described in `find_conflicting_active_tasks`'s
  own docstring is real and intentionally left open, matching Step 14's
  explicit "document, don't redesign" instruction — a task could still be
  committed in the narrow window between a leave request's conflict SELECT
  and its own commit. Pre-existing on the task-vs-leave side too; not a
  regression introduced by this task.
- Individual `.msc-tg-hourcell` timed slots (up to 24 per day column) were
  deliberately not made separately keyboard-tabbable — that would be an
  accessibility regression (24+ tab stops per day), not an improvement.
  The all-day area (one tab stop per day) and the popups themselves (fully
  keyboard-operable once open) satisfy Step 19's "where practical"
  qualifier; a keyboard user reaches the timed-slot create flow via the
  sidebar "+ Create" button or the all-day area instead of a specific hour.
- The Month-cell background click behavior described in this handover was
  confirmed via an explicit clarifying question mid-task (the original
  spec didn't address how the new blank-cell-create behavior should
  interact with the pre-existing, separately-validated
  cell-background-click-navigates-to-list feature) — see the validation
  document's "Confirmed requirement" section for the exact resolution.

## One next step

Requester exercises the full Step-20 regression matrix in a real browser
(Month/Week/Day empty-area clicks, item-click safeguards, drag/resize,
overlapping-Task save, Task/Leave and Leave/Task conflict rejection,
console errors) and reports back to close the validation document's AMBER
to PASS, or to scope a targeted follow-up fix.
