# Calendar Empty-Slot Create + Overlap Rules Check — 2026-07-20

## Confirmed requirement

Clicking a blank calendar area (Month cell background, Week/Day empty timed
slot, Week/Day empty all-day area) opens the existing Task/Leave create
workflow (dropdown chooser → Task popup or Leave popup), reusing all
existing form/CRUD/validation infrastructure — no second Task or Leave form.
Existing task/leave/`+N more` click behavior, drag, and resize must remain
untouched. Backend: Task records may overlap other Task records (confirm,
don't break); Task records must not overlap active Leave (already existed,
confirmed); Leave records must not overlap Task records (was missing —
added); Leave-vs-Leave overlap prevention stays untouched. No database
schema/migration change.

**Month-cell click clarification (asked and confirmed mid-task):** clicking
an individual task chip or "+N more" still navigates to the filtered
Schedule Items list, exactly as before. Every other click inside a Month
cell — including the blank background of a cell that already has tasks —
now opens the create chooser, replacing the cell-background-click-to-list-
navigation shortcut that previously existed on task-bearing cells only.

## Month empty-cell behavior

Every `.msc-cal-cell` (previously only task-bearing cells) now carries
`role="button" tabindex="0"` and a single click/keydown handler that calls
the new `openCreateChoiceFromCalendar({ dateKey, allDay: true, anchorElement:
cell })`. Chip (`.msc-cal-chip`), "+N more" (`.msc-cal-chip-more`), and leave
chip (`.msc-cal-chip-leave`) handlers are unchanged and still call
`e.stopPropagation()` — since they are DOM descendants of the cell, this
correctly prevents the new cell-level handler from also firing when one of
them is clicked. Adjacent-month cells resolve their full real date via the
same `buildMonthGridCells()`-produced `c.date` object as before — no new
date math.

## Week/Day empty-slot behavior

`wireEmptyCellCreate()` (unchanged drag-tracking state machine — `isDragging`/
`dragStartHour`/`dragCurrentHour`) now calls `openCreateChoiceFromCalendar`
instead of the retired `prefillCreateForm`. Single click on an
`.msc-tg-hourcell` → 1-hour default span from that hour; a genuine multi-cell
drag → the dragged hour range. Both use a new small `timedSlotSpan(startHour,
endHour)` helper extracted verbatim from the old clamp math (`Math.min(endHour,
24)`, `>= 24` → `'23:59'`) — the existing, only-ever-supported whole-hour
increment; no new increment was invented.

## Day empty-slot behavior

Identical to Week — `wireEmptyCellCreate`/`renderTimeGrid` are the same shared
function for both views (unchanged architecture from the prior redesign
task), so Day inherits this behavior with zero Day-specific code.

## All-day behavior

`.msc-tg-allday-col` gained `role="button" tabindex="0"` and an
`aria-label`; its click handler (still gated on `e.target === colEl`, exactly
as before) and a new keydown handler both call
`openCreateChoiceFromCalendar({ dateKey, allDay: true, anchorElement: colEl })`.
`allDay: true` forces `startTime`/`endTime` to `null` regardless of any
stray caller-supplied value — Full-Day/Multi-Day leave still renders in the
all-day row (unchanged `renderTimeGrid` logic), never as a fake timed
interval.

## Item-click propagation safeguards

- Month: chip/+more/leave-chip already called `stopPropagation()` before this
  task; unchanged, and now load-bearing for the new cell-level handler too.
- Week/Day: `.msc-tg-event` (task blocks) and `.msc-tg-hourcell` (empty
  slots) are DOM siblings, not ancestor/descendant, inside `.msc-tg-daycol`
  — a click that visually lands on a task block never reaches the hourcell
  beneath (browser hit-testing resolves `e.target` to the topmost element;
  since siblings don't bubble sideways, the hourcell's own listener is never
  invoked). This was already true before this task and required no change.
- **Fixed gap**: `.msc-tg-leave-block` (Short/Half-Day timed leave) had
  `pointer-events: none`, so a click visually landing on it fell through to
  the empty hourcell beneath and incorrectly opened the create chooser —
  the one genuine propagation bug this task's Step 7 requirement surfaced.
  Changed to `pointer-events: auto` with a no-op `stopPropagation()`
  click handler (matching Month's `.msc-cal-chip-leave` "click-is-inert"
  convention) and `cursor: default` (not `pointer`, since it has no action).
  The block remains non-draggable/non-resizable — unchanged.
- `.msc-tg-now-line` already had `pointer-events: none` (set in the prior
  redesign task) — confirmed, not changed.
- Native browser scrollbar interactions never dispatch synthetic click
  events to underlying content — no code path could be affected.

## Prefilled field behavior

`openCreateChoiceFromCalendar(opts)` — the one centralized helper (Step 4) —
calls the existing `selectDate(dateKey)` (same function the mini-picker/Today
button already use, unchanged) and then, only when a specific time was
passed (`allDay` false and `startTime` present), sets `fieldStart`/`fieldEnd`
(Task form) **and** `leaveFieldStartTime`/`leaveFieldEndTime` (Leave form) to
the same clicked time — Step 15's "these rules apply to both Task and Leave
forms through the existing shared selected-date/time state." Month and
all-day clicks pass `allDay: true`, which forces all four time fields blank.
Opens the existing create-menu dropdown (`openCreateMenu`), anchored near the
click via a new `positionCreateMenu()` (see "Chooser positioning" below), not
directly into a popup — the user still picks Task or Leave.

## Chooser positioning

The single existing `.msc-create-menu` element is reused for every trigger
(sidebar button and every calendar-origin click) — no second dropdown was
created. `openCreateMenu(anchorEl)` now accepts the triggering element and
calls `positionCreateMenu()`, which sets `position: fixed` plus computed
`top`/`left` (from `anchorEl.getBoundingClientRect()`) directly as inline
styles, clamped to stay within the viewport both horizontally and
vertically. `position: fixed` was chosen over the prior `position: absolute`
specifically because `.hr-table-card` (the calendar's outer card) has
`overflow: hidden` — an absolutely-positioned menu anchored to a calendar
cell far from the sidebar could otherwise be visually clipped; fixed
positioning resolves against the viewport and is unaffected by that
ancestor's overflow. The now-redundant mobile-only CSS override (`left:
auto; right: 0`) was removed since the JS clamp supersedes it at every
width — the only CSS change made purely for cleanliness rather than new
behavior.

## Task/Task result

**No backend code changed** — reading
`backend/routers/member_schedules.py`'s `create_member_schedule_event` and
`update_member_schedule_event` in full confirms the only conflict gate
either handler calls is `find_conflicting_active_leave` (task-vs-leave);
neither queries other `MemberScheduleEvent` rows, so two (or more) tasks
with identical or overlapping start/end times for the same member were
already, and remain, allowed. Regression-locked by
`backend/tests/test_task_leave_overlap.py::TaskVsTaskAllowedTests` (2 tests):
confirms the gate function returns no conflicts against an empty-leave fake
session regardless of how many other tasks conceptually exist, since the
function's signature never receives or considers another task.

## Task/Leave result

**Unchanged, pre-existing, confirmed correct.** `find_conflicting_active_leave`
in `leave_logic.py` is untouched — still called from both POST and PUT in
`member_schedules.py`, still returns the same `409 {"error":"leave_conflict",
"message":..., "conflicts":[...]}` shape. Previously had no router-level
test; the required example cases (Task inside Short Leave, partial overlap,
Half-Day, Full-Day date, active Multi-Day weekday, adjacent non-overlapping
Task) are the same Full-Day-dominance/partial-interval logic now
additionally exercised from the reverse direction by the new tests below.

## Leave/Task result

**Newly implemented — this direction did not exist at all before this task.**
New `find_conflicting_active_tasks()` in `leave_logic.py` mirrors
`find_conflicting_active_leave`'s Full-Day-dominance/partial-interval logic
with roles reversed; new `task_conflict_response_body()` returns `409
{"error":"task_conflict", "message":"This leave request conflicts with one
or more active tasks.", "conflicts":[{task_id, category, event_date,
start_time, end_time}]}` — deliberately omits `title`/`notes` (Step 12's
"must not expose sensitive Task notes"). Wired into both
`create_member_leave_record` and `update_member_leave_record` in
`member_leave.py`, immediately after the existing leave-vs-leave overlap
check, same `db.rollback()` + `409 JSONResponse` pattern. 10 new tests in
`FindConflictingActiveTasksTests` cover: Short Leave over one task (reject),
Short Leave over multiple overlapping tasks (reject, both conflicts
returned), Short Leave adjacent/touching task (allow), Short Leave vs.
untimed task (allow — same asymmetry as the task-vs-leave direction),
Half-Day Leave covering a task (reject), Full-Day Leave on a date with a
task, timed or untimed (reject), Multi-Day Leave active-weekday task
(reject), Multi-Day Leave weekend-only task (allow — the weekend date is
never occupied), adjacent non-overlapping dates (allow), and no candidates
(empty result). All 10 pass.

## Leave/Leave result

**Untouched.** `find_overlapping_leave_records`, `_leave_pair_overlaps_on_shared_date`,
`assert_no_leave_overlap`, `acquire_member_leave_lock`,
`leave_overlap_response_body` — zero lines changed (confirmed by reading the
full diff of `leave_logic.py`; every insertion is additive, appended after
the existing `leave_conflict_response_body` and before the "Leave-versus-
leave" section comment). All 20+ existing leave-vs-leave tests in
`backend/tests/test_member_leave.py` still pass (full suite: 182/182).

## Concurrency

Documented, not redesigned, per Step 14. `find_conflicting_active_tasks`'s
own docstring states the residual race explicitly: `acquire_member_leave_lock`
(already called by every leave create/update path before this) only
serializes concurrent LEAVE writes for the same member — it takes no lock on
`member_schedule_events` rows, and task creation takes no lock of its own.
A task could theoretically be committed in the narrow window between this
new check's SELECT and the leave write's commit. This is the same
pre-existing, undocumented-until-now class of gap `find_conflicting_active_leave`
(the task-vs-leave direction) already has on the task side — not introduced
by this change, and closing it would require locking `member_schedule_events`
rows or a cross-table constraint, both outside this task's approved
no-schema-change scope. No new database constraint, index, or migration was
added.

## Tests

`backend/tests/test_task_leave_overlap.py` (new, 15 tests) — all pass.
Full backend suite: `python -m unittest discover -s backend/tests -p
"test_*.py"` → **182/182 pass**, zero regressions (up from 167 before this
task's 15 new tests).

## Browser result

**Not captured in this session** — no browser-automation tool is available
here, consistent with every prior calendar task in this project. What was
verified instead: `node --check` on every JS module, the generated template
HTML (extracted and evaluated) is tag-balanced with zero duplicate ids, all
12 frontend assets return HTTP 200 from a local static server, and the
click-propagation reasoning above was verified by reading the actual DOM
structure `renderTimeGrid`/`renderMonthView` produce (sibling vs.
ancestor/descendant relationships), not by clicking in a real browser.

## Database architecture unchanged

Confirmed via `git diff --stat -- database/ database/migrations/
backend/models.py` — all three empty. No table, column, constraint, or
migration was added or changed. The new `find_conflicting_active_tasks`
query reads the existing `member_schedule_events` table through the
existing `MemberScheduleEvent` ORM model, unmodified.

## PASS / AMBER / FAIL

**AMBER.** Backend implementation, backend tests (182/182), and frontend
static/structural validation all PASS. AMBER rather than PASS strictly
because real-browser interaction validation (Step 23 — actually clicking
each empty area, confirming both popups open with the right prefilled
values, confirming a real overlapping-Task save succeeds and a real
Task/Leave or Leave/Task conflict is rejected end-to-end through a live
API) could not be performed in this session, matching the same documented
tooling gap as every prior calendar UI task in this project.
