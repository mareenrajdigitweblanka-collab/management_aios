# web-view/ — Frontend Notes

Plain HTML/CSS/ES-modules dashboard (`index.html` + `js/` + `css/`). No build
step, no framework — every module is loaded directly by the browser via
`<script type="module" src="./js/app.js">`.

This file documents the shared UX layer added in the Phase 1
professional-feedback-UX task (2026-07-22). See
`validation/management-aios-phase-1-professional-feedback-ux-check-2026-07-22.md`
for the full validation record and
`handover/2026-07-22__management-aios-phase-1-professional-feedback-ux-closure.md`
for the closure handover.

## Shared UI modules (`web-view/js/ui/`)

One small, framework-free UX layer shared by both the Calendar
(`js/calendar/instance.js`) and Staff Data (`js/staff-data.js`) features —
neither owns its own competing toast/dialog/loading implementation.

| Module | Owns | Public exports |
|---|---|---|
| `ui/popup.js` | Focus-trap utilities for any modal/popup/drawer | `getFocusableEls(root)`, `trapTab(root, event)`, `returnFocus(trigger)` |
| `ui/toast.js` | Non-blocking success/information/warning/error notifications | `showToast(opts)`, `dismissAllToasts()` |
| `ui/dialog.js` | The one shared destructive-confirmation dialog | `confirmDestructive(options)` → `Promise<boolean>` |
| `ui/loading.js` | Busy buttons, skeleton rows, inline loading, region-busy state | `setButtonBusy`, `setRegionBusy`, `renderSkeletonRows`, `showInlineLoading` |
| `ui/form-feedback.js` | Field-level validation messages | `setFieldError`, `clearFieldError`, `clearFormErrors`, `focusFirstInvalid` |
| `ui/error-mapper.js` | Maps a tagged request error to plain-language text | `mapApiError(error, context)`, `classifyHttpStatus(status)` |

### Dependency-direction rule

**Domain modules import from `ui/*`. `ui/*` never imports from a domain
module.** Concretely:

- `calendar/instance.js`, `staff-data.js`, and `navigation.js` may import
  any `ui/*` module.
- No `ui/*` module may import `calendar/instance.js`, `staff-data.js`, or
  `navigation.js`.
- `ui/*` modules may import each other (`dialog.js` imports `popup.js` and
  `loading.js`) as long as this stays one-directional — there is no cycle
  today, and none should be introduced.

## Toast usage

```js
import { showToast } from './ui/toast.js'; // or '../ui/toast.js' from calendar/

showToast({
  type: 'success',       // 'success' | 'information' | 'warning' | 'error'
  title: 'Task created',
  message: 'Your task was added to the calendar.', // optional
  persistent: false      // true = no auto-dismiss (use for actionable warnings/errors)
});
```

Timings: success 4s, information 5s, warning/error 6s (unless
`persistent: true`, which never auto-dismisses). Duplicate messages
(identical type+title+message) are suppressed — a repeat just restarts the
existing toast's timer instead of stacking a second copy.

## Destructive-confirmation dialog usage

```js
import { confirmDestructive } from '../ui/dialog.js';

// Simple yes/no — resolves true/false immediately on the chosen button:
var ok = await confirmDestructive({
  title: 'Delete leave?',
  message: 'This leave entry will be permanently removed from the calendar.',
  confirmLabel: 'Delete leave',
  cancelLabel: 'Cancel',
  trigger: buttonThatOpenedIt // focus returns here on close
});

// With the actual delete wired in — the dialog shows its own busy state
// and only closes once onConfirm's promise resolves to something other
// than `false` (a `false` result or a rejection restores the buttons and
// keeps the dialog open, so a failed delete never silently closes it):
var deleted = await confirmDestructive({
  title: 'Delete task?',
  message: '“' + task.title + '” will be permanently removed from Management AIOS.',
  confirmLabel: 'Delete task',
  cancelLabel: 'Cancel',
  trigger: deleteBtn,
  onConfirm: function () {
    return apiRequest('DELETE', url).then(function () { /* ...update state... */ return true; })
      .catch(function () { /* show a toast */ return false; });
  }
});
```

The dialog is a singleton (one overlay, reused for every call) built on the
existing `.msc-modal-overlay`/`.msc-modal` CSS from `calendar.css` — do not
create a second modal/dialog visual system.

## Error-mapper usage

Every domain fetch wrapper (`apiRequest`/`leaveApiRequest` in
`calendar/instance.js`, `staffApiRequest` in `staff-data.js`) tags each
thrown `Error` with a stable `.code` before it reaches a `.catch()`:

- A known business-conflict identifier the backend already returns
  (`leave_conflict`, `task_conflict`, `leave_overlap`) is tagged directly.
- Anything else uses `classifyHttpStatus(res.status)` (`not_found`,
  `validation`, `server`, `unknown`).
- A genuine fetch-level failure (offline, DNS, CORS) is tagged `network`
  by a trailing `.catch` in the same wrapper.

Callers then do:

```js
import { mapApiError } from '../ui/error-mapper.js';

.catch(function (err) {
  var mapped = mapApiError(err); // { type, title, message, field, persistent }
  showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
});
```

**Never** show `err.message`, `JSON.stringify(errBody)`, an HTTP status
code/reason phrase, or any backend-internal wording directly to the user —
always go through `mapApiError` first.

### Inline vs. toast — the responsibility rule

- **Inline field error** (`ui/form-feedback.js`) — a single invalid form
  field (empty required date/title/time).
- **Inline persistent form status** (`showApiStatus`/`showLeaveFormStatus`,
  still owned by `calendar/instance.js`) — a conflict tied directly to the
  currently open form (`leave_conflict`, `task_conflict`, `leave_overlap`).
- **Toast** — operation success, and any failure NOT tied to a specific
  open field/form (network/server/unknown).
- **Confirmation dialog** — destructive decisions only.

The same message is never shown in more than one of these places at once.

## Adding a new form/action safely

1. Validate required fields with `setFieldError`/`focusFirstInvalid`
   (`ui/form-feedback.js`) — do not add a new `window.alert()`.
2. Wrap the submit button with `setButtonBusy(btn, true/false, { busyLabel })`
   (`ui/loading.js`) around the request.
3. On success, call `showToast({ type: 'success', title, message })`.
4. On failure, run the error through `mapApiError` and either show it
   inline (if it's tied to the open form) or as a toast (everything else)
   — never both.
5. For a destructive action, gate it with `confirmDestructive(...)` instead
   of `window.confirm()`.

## Adding a new error mapping safely

Add one entry to `KNOWN_ERRORS` in `ui/error-mapper.js` keyed by the new
`.code`, with `{ type, title, message, persistent }` — plain language only,
no backend wording. Tag the new code in whichever domain fetch wrapper
throws it (mirroring the existing `leave_conflict`/`task_conflict`/
`leave_overlap` special-casing), then read `mapApiError(err).code` at the
call site to decide inline-vs-toast per the rule above.

## Member page layout, calendar-based Leave, and collapsible sections (2026-07-22)

See
`validation/member-page-layout-leave-popup-collapse-and-ph-staff-check-2026-07-22.md`
and
`handover/2026-07-22__member-page-layout-leave-popup-collapse-and-ph-staff-closure.md`
for the full record. Summary for future edits:

- **Section order** (all 5 members, enforced in `index.html`): member
  details bar → `.msc-instance` Calendar (which itself renders Schedule
  Summary then Priority Preview) → remaining collapsed sections. Never put
  a "remaining table" section before the Calendar mount.
- **Leave is view/edit/delete-able by clicking a red Leave item** on the
  Calendar (Month chip, Week/Day all-day chip, Week/Day timed block) — this
  opens `viewLeaveItem()`'s shared `.msc-leave-view-modal` popup
  (`calendar/instance.js`), mirroring the existing Task-detail popup. Edit
  reuses the existing Leave create form/popup in an "edit mode" toggled by
  `setLeavePopupMode(isEdit)`; Delete reuses the existing
  `deleteLeaveRecord()`. There is no separate Leave Coordination list
  anymore — do not re-add one; Leave Create still lives only in the
  Calendar's "+ Create" menu.
- **Shared collapsible-section pattern**: native `<details
  class="…-card collapsible-section">` + `<summary class="collapsible-
  summary"><span class="collapsible-summary-text">…</span></summary>`
  (styled in `components.css`, reusing the pre-existing `details > summary`
  rules). No JS toggle — do not add a per-table click handler. Every
  "remaining table" section on every member tab uses this and starts
  collapsed (no `open` attribute).
- **Embedded PH Staff Data** (Arun, Paraparan): same
  `initTeamScopedStaffPilot()` (`staff-data.js`) as before, just wrapped in
  the collapsible pattern above with heading "PH Staff Data". Reuse this
  exact pattern (see the handover doc's "How to reuse embedded Staff Data"
  section) for any future member that needs the same view — never fork the
  Staff Data fetch/render logic per member.

## Known minor leftovers (not fixed in this task — low risk, no user-facing effect)

- `web-view/css/calendar.css`'s `.msc-item-title`/`.msc-item-meta`/
  `.msc-item-actions` rules are no longer referenced by any generated
  markup (they were shared between the already-removed Schedule Item list
  and the Leave Coordination list removed in the 2026-07-22 task above) —
  left in place rather than risk touching unrelated CSS.
- `web-view/css/staff-data.css`'s `.staff-table-skeleton-row`/
  `@keyframes staff-skeleton-pulse` rules are no longer referenced by JS
  (superseded by `ui.css`'s `.ui-skeleton-row`/`@keyframes
  ui-skeleton-pulse`) but were left in place rather than risk touching
  unrelated CSS during this task.
- The Calendar's `getFocusableEls`/`trapTab` import and the Staff Data
  drawer's own focus handling now share one implementation
  (`ui/popup.js`); the Staff Data drawer's `.staff-drawer` visual pattern
  (a slide-in panel) and the Calendar's `.msc-view-modal` (a centered
  modal) remain two different visual patterns for a conceptually similar
  "view details" action — noted as a Phase 2 modularization/consistency
  candidate, not changed here.

## Schedule Summary MD-priority percentage dashboard (2026-07-22)

See `validation/schedule-summary-md-percentage-dashboard-check-2026-07-22.md` and
`handover/2026-07-22__schedule-summary-md-percentage-dashboard-closure.md` for the full record.
Summary for future edits:

- **MD-priority helpers live in `calendar/core.js`, not `instance.js`** —
  `getSplitWarningState`, `getMetricStatusCopy`, `combineSummaryStatus`, `getPeriodStatusCopy`,
  `getSplitBarSegments`. They only classify percentages the backend already computed
  (`scheduled_count_percentage`/`unscheduled_count_percentage`/`scheduled_duration_percentage`/
  `unscheduled_duration_percentage`) against the MD-confirmed 60%/40% thresholds — none of them
  calculate a percentage. Unit-tested in `calendar/summary-helpers.test.mjs` (run with
  `node --test web-view/js/calendar/summary-helpers.test.mjs`); a scoped
  `calendar/package.json` (`{"type":"module"}`) marks that folder as ES-module-resolvable for
  Node only — it has no effect on the browser, which never reads `package.json`.
- **`renderSummaryStats(el, report)`** (`calendar/instance.js`) now builds, in order: a period
  status badge → two priority metric blocks ("By task count", "By task duration" — bar + two
  percentage values + plain-language status) → a collapsed-by-default `<details
  class="collapsible-section msc-summary-details">` holding every pre-existing detail row
  unchanged (raw counts/durations, tasks used/ignored, previous-period comparison,
  leave-coordination figures). To change which figures are "primary" vs. "secondary," edit this
  function's assembly order — do not touch `_aggregate_schedule_period`/`_count_percentages`/
  `_duration_percentages` in `backend/routers/member_schedules.py`; those are formula-owning and
  are frozen by this task.
- **To change only presentation** (colors, spacing, bar style, badge wording) without touching a
  single formula: edit `calendar.css`'s `.msc-priority-*`/`.msc-split-*`/`.msc-metric-status-*`
  rules, or `core.js`'s `getMetricStatusCopy`/`getPeriodStatusCopy` copy strings. Never move
  threshold numbers (60/40) anywhere except `getSplitWarningState` — it is the one place they are
  checked.
- **Colors reuse existing semantic tokens** (`--success`/`--warning`/`--error`,
  `--calendar-scheduled-border`/`--calendar-unscheduled-border`, `tokens.css`) — no new hardcoded
  hex value was introduced.

## Month-cell click model: direct blank-click Create, no double-click (2026-07-22)

**Supersedes** the "single-click Task list / double-click Create"
section this replaced (originally added 2026-07-22 earlier the same
day, see `validation/month-cell-single-click-task-list-double-click-create-check-2026-07-22.md`
for that superseded design). The Google-Calendar-inspired redesign task
(`validation/google-calendar-inspired-management-calendar-ux-check-2026-07-22.md`,
`handover/2026-07-22__google-calendar-inspired-management-calendar-ux-closure.md`)
replaced the single/double-click coordinator entirely with a single
rule:

- **Any click on a Month date cell's blank background** — whether the
  date has zero, one, two, or more than two Tasks, Leave, or Full-Day/
  Multi-Day Leave — opens the Create dialog directly
  (`openCreateChoiceFromCalendar()` → `openCreatePopup('task')`; see
  "Unified Google-Calendar-inspired Task/Leave Create dialog" below —
  `openCreateMenu()`, referenced here originally, no longer exists),
  exactly like keyboard Enter/Space already did. No double-click, no
  delay timer, no toast.
- **Individual Task chip / Leave chip / "+N more" clicks are unchanged**
  and still take priority: each calls `e.stopPropagation()` in its own
  `click` handler (`.msc-cal-chip` → `viewItem()`, `.msc-cal-chip-leave`
  → `viewLeaveItem()`, `.msc-cal-chip-more` → `openMorePopup()`), so a
  click landing on one of those never also reaches the cell-level
  handler. Their `dblclick` no-op stopPropagation listeners (kept from
  the superseded design solely as defense-in-depth) were removed along
  with the cell's own `dblclick` listener — there is no more `dblclick`
  handler anywhere in Month view to guard against.
- **Removed entirely** (all previously defined just above
  `renderMonthView()` in `calendar/instance.js`): the
  `CELL_CLICK_DELAY_MS`/`pendingCellClick` timer coordinator,
  `clearPendingCellClick()`, `scheduleCellSingleClick()`,
  `handleCellSingleClick()`, `showEmptyDayToast()` (the old "No tasks
  scheduled for this day" toast), `showFullDayLeaveToast()`, and
  `hasFullDayBlockingLeave()`. None of their call sites survive —
  `renderMonthView()`, `openCreateMenu()`, `openMorePopup()`, and the
  view-switcher click handler no longer call a timer-clear function at
  all, since there is no timer left to clear.
- **Full-Day/Multi-Day Leave conflict handling is unchanged and still
  backend-authoritative** — choosing the Task tab in the Create dialog on
  a Full-Day/Multi-Day Leave date is never blocked in the frontend;
  submitting the Task still gets the existing `leave_conflict` 409
  rejection and its existing inline error message (`apiRequest()`'s
  `err.code === 'leave_conflict'` handling, unchanged, `calendar/
  instance.js`). The frontend pre-emptive toast that used to fire on a
  Task-free Full-Day-Leave date's blank click is gone along with the
  rest of the click coordinator — there is no frontend-side Full-Day-
  Leave special case left to maintain.
- **To add a new "opens the Create dialog" call site** in Month view,
  call `openCreateChoiceFromCalendar()` directly (same as the cell's own
  `go()` closure) — there is no timer/coordinator layer to route
  through anymore.

## Unified Google-Calendar-inspired Task/Leave Create dialog, Detail icon actions, and side-by-side List+Detail (2026-07-23)

See `validation/google-inspired-task-leave-popup-ui-check-2026-07-23.md`
and `handover/2026-07-23__google-inspired-task-leave-popup-ui-closure.md`
for the full record. **Supersedes** every reference above to the
"Create chooser menu" (`.msc-create-menu`/`openCreateMenu()`/
`closeCreateMenu()`/`positionCreateMenu()`) — that intermediate Task/
Leave picker no longer exists. Summary for future edits:

- **One Create dialog, not a chooser + two popups**: `.msc-task-popup`
  and `.msc-leave-popup` (each its own `.msc-modal-overlay`) and the
  `.msc-create-menu` chooser were merged into one
  `.msc-modal-overlay.msc-create-popup`, containing a header (dynamic
  heading + round Close), a `.msc-create-tabs` Task/Leave tab pair, the
  exact pre-existing Task fields (`.msc-create-task-fields` wrapping the
  unchanged `.msc-form-card`) and Leave fields
  (`.msc-create-leave-fields` wrapping the unchanged
  `.msc-leave-form-panel`) toggled by the `hidden` attribute, and the
  exact pre-existing footer button groups
  (`.msc-create-task-footer`/`.msc-create-leave-footer`) toggled by
  `display:none`. No Task or Leave field, id, class, validation rule, or
  API payload changed — only the surrounding shell.
- **New/changed functions** (`calendar/instance.js`):
  `openCreatePopup(kind)`, `closeCreatePopup()`, `setCreateDialogTab(kind)`.
  `openTaskPopup()`/`closeTaskPopup()`/`openLeavePopup()`/
  `closeLeavePopup()` are now thin aliases of these, so `editItem()`,
  `editLeaveItem()`, `cancelEdit()`-driven flows, and the Tasks-workspace
  "Add a task" button needed no changes. `sidebarCreateBtn` and
  `openCreateChoiceFromCalendar()` now call `openCreatePopup('task')` /
  `openTaskPopup()` directly — no intermediate chooser step. Switching
  tabs carries the selected date across (Task's `.msc-field-date` ⇄
  Leave's `.msc-leave-field-start-date`) without submitting or clearing
  the other tab's fields. Tabs are hidden whenever `state.editingId` or
  `editingLeaveId` is set at open time (editing an existing record's
  type was never switchable, before or after this task).
- **Removed** (previously defined around the old "+ Create" dropdown):
  `openCreateMenu()`, `closeCreateMenu()`, `positionCreateMenu()`,
  `onDocClickForCreateMenu()`, `onCreateMenuKeydown()`, the
  `createMenuItems.forEach(...)` wiring, and the `.msc-create-menu*` CSS
  rules (`calendar.css`). None of their call sites survive.
- **Task/Leave Detail popups** (`.msc-view-modal`/`.msc-leave-view-modal`,
  still two separate popups — not merged, since Task alone carries "+N
  more" list-origin tracking `taskFlowOrigin` that Leave has no
  equivalent of): Edit/Delete moved from a bottom `.msc-view-actions`
  button row into round icon buttons in the header
  (`.msc-view-modal-head-actions`) next to Close, reusing the existing
  `.msc-modal-close` circular-button CSS. Same click handlers
  (`editItem`/`deleteItem`/`closeViewModal` and their Leave equivalents),
  same fields — only the buttons' position and visual treatment changed.
- **"+N more" list + side-by-side Detail** (Image D/E in the task's
  reference screenshots): `openMorePopup()`'s row-click handler now
  branches on `window.innerWidth >= 1024`. Below that width, behavior is
  byte-for-byte the pre-existing flow (close the list, open Task Detail
  as a centered modal, Close reopens the list). At or above it, the list
  stays open, the clicked row gets a `.selected` class, and
  `viewItem(id, anchor, origin, besideList=true)` adds a
  `msc-view-modal--beside-list` modifier class and calls the new
  `positionViewModalBesideList()` (same viewport-clamping technique as
  the pre-existing `positionMorePopup()`) instead of centering the modal.
  The modifier class removes the dimmed backdrop and sets
  `pointer-events:none` on the overlay (with `pointer-events:auto` on the
  `.msc-modal` card itself), so clicks pass through to the still-visible,
  still-scrollable list. `onDocClickForMorePopup()` was updated to treat
  clicks inside a beside-list `viewModal` as "not outside" so interacting
  with the open Detail card never closes the list out from under it.
  Closing Task Detail already called the pre-existing
  `reopenTaskListOrigin()` rebuild whenever it was opened from the list
  — that rebuild is idempotent, so it already restores scroll position
  and refocuses the row whether or not the list was ever actually closed;
  no new close-path logic was needed.
- **Static-reference cleanup found during this task**: one leftover call
  to the removed `closeCreateMenu()` inside `setMode()` (corrected to
  `closeCreatePopup()`), and one fully duplicated dead
  `openLeavePopup()`/`closeLeavePopup()`/`onLeavePopupKeydown()`
  definition that predated this task's edits (removed) — both found by a
  post-edit grep sweep for every removed identifier, documented in the
  validation doc's AL section.

## Google-Calendar-inspired wider layout and larger Month boxes (2026-07-22)

See `validation/google-calendar-inspired-management-calendar-ux-check-2026-07-22.md`
and `handover/2026-07-22__google-calendar-inspired-management-calendar-ux-closure.md`
for the full record. Summary for future edits:

- **Calendar width**: `.tab-panel.tab-panel--calendar` (`css/
  navigation.css`) is now `max-width: 100%` at every breakpoint —
  simply fills `.tab-main` (viewport minus whichever application
  sidebar width is in effect), replacing the previous `88vw` / `88% of
  available width` figure from the 2026-07-20 calendar-create-chooser-
  readability-and-width task (which produced a 100px+ gap on each side
  at common desktop widths). The plain `.tab-panel` rule's own 16px
  left/right padding is now the only gutter, on every desktop
  breakpoint, expanded or collapsed application sidebar alike — no
  separate `calc()`/vw formula or collapsed-sidebar override is needed
  any more. A higher-specificity `body.sidebar-collapsed
  .tab-panel.tab-panel--calendar` override is still required (and
  present) to beat `body.sidebar-collapsed .tab-panel`'s own,
  higher-specificity rule — see the comment at that rule.
- **Month row height**: `--calendar-month-row-min-height` (`css/
  tokens.css`) raised 112px → 140px, and `.msc-cal-cell` padding
  raised `4px 6px 6px` → `6px 8px 8px` (`css/calendar.css`) — a less
  cramped box, closer to Google Calendar's own Month-cell proportions.
  The mobile (`max-width:640px`) `.msc-cal-cell` min-height was raised
  62px → 72px, a smaller bump to keep mobile Month rows compact. The
  visible-item cap (`MONTH_VISIBLE_TASK_CAP = 2`, `calendar/
  instance.js`) and "+N more" counting logic are unchanged — only the
  box's own size grew, not how many items it shows.
- **Mini-sidebar legend**: now shows all three calendar categories —
  `Scheduled Task` / `Unscheduled Task` / `Leave` (`.msc-category-legend`,
  `calendar/instance.js`) — previously only the two Task categories.
  The new `.msc-chip-cat.leave` CSS rule (`css/calendar.css`) reuses the
  existing `--calendar-leave-bg`/`--calendar-leave-text` tokens the
  Month/Week/Day Leave chips already use, so the legend swatch matches
  every Leave item on the calendar exactly.
- **Toolbar focus states**: `.msc-tool-btn`/`.msc-view-btn` gained
  explicit `:focus-visible` box-shadow rings (`css/calendar.css`),
  matching the ring pattern already used elsewhere in the calendar
  (`.msc-cal-cell--actionable`, `.msc-btn`, `.msc-cal-chip`) instead of
  relying on the browser's inconsistent default outline.
- **No FullCalendar, no new library**: this calendar has always been a
  hand-rolled Month/Week/Day grid (raw HTML strings + manual event
  delegation, `calendar/instance.js`) — there is no `dateClick`/
  `dayMaxEvents`/`eventClick` FullCalendar API anywhere in this
  codebase to reconcile with. Every change in this section is plain
  CSS/JS against that existing hand-rolled structure.

## Calendar toolbar (identity/search/help/settings) and Tasks workspace (2026-07-23)

See `validation/calendar-toolbar-and-tasks-workspace-check-2026-07-23.md` and
`handover/2026-07-23__calendar-toolbar-and-tasks-workspace-closure.md` for the full
record. Summary for future edits:

- **Toolbar additions** — `.msc-cal-identity` (decorative icon + "Calendar" label,
  hidden below 900px), `.msc-cal-search-wrap`/`.msc-cal-search-panel` (anchored
  popover, same `position:fixed` technique as the Create chooser — filters this
  instance's own `items`/`leaveItems` closures client-side, no new request), and the
  `.msc-cal-help-trigger`/`.msc-cal-settings-trigger` buttons opening the new
  `.msc-cal-help-popup`/`.msc-cal-settings-popup` (same `.msc-modal-overlay`/`.msc-modal`
  centered-popup convention as the Task/Leave detail popups). All markup lives inside
  `mountScheduleCalendarInstance()`'s template string in `calendar/instance.js`.
- **Calendar/Tasks mode switch** — `setMode(mode)` in `calendar/instance.js` toggles
  `.msc-calendar-main` vs. `.msc-tasks-main`. Both `.msc-calendar-main` and
  `.msc-view-dropdown` (see the icon/order polish note below — this was
  `.msc-view-switcher` until that follow-up) already carry an unconditional `display`
  value in `calendar.css`, which a same-specificity native `[hidden]` attribute cannot
  reliably beat (author-cascade order lets the existing rule win) — visibility is
  driven by a dedicated `.msc-mode-hidden` class instead. `.msc-tasks-main` follows
  the existing `.msc-view-pane`/`.active` idiom (default `display:none`, shown via
  `.msc-mode-active`). `.msc-summary-section`/`.msc-list-card` (Schedule Summary,
  Today's Priorities — both date-scoped, hidden in Tasks mode) safely use the native
  `hidden` attribute since neither carries its own conflicting `display` rule.
- **Tasks workspace** — `renderTasksWorkspace()` reads the SAME `items` array
  Month/Week/Day already read (no second fetch, no second Task truth), sorted by
  date/time. Rows are native `<button>`s wired to the existing `viewItem()` (Task
  Details/Edit/Delete — unchanged). "+ Add a task" opens the existing
  `openTaskPopup()` with the Date field cleared (not prefilled from whatever the
  Calendar side last had selected) so the user must explicitly choose a date, per
  the "no silent stale-date default" requirement. `renderTasksWorkspace()` is called
  from the same post-mutation hooks (`selectDate()`, `deleteItem()`) that already
  refresh the Month/Week/Day view and Today's Priorities after a successful
  Create/Update/Delete, guarded by `if (currentMode === 'tasks')` so it's a no-op
  while Tasks mode is off-screen.
- **Completion, Starred, and Lists are NOT implemented** — confirmed via
  `backend/models.py`/`backend/schemas.py` that no `completed`/`completed_at`,
  `starred`, or list/group column or table exists anywhere in the schema. Adding any
  of them requires a migration and, for Completion specifically, an explicit
  business decision on how a completed Task should count in Schedule Summary — both
  outside this task's scope. Starred/Lists are omitted from the Tasks-workspace UI
  entirely (not shown disabled); a short note in the workspace's own left nav
  explains why. **Do not fake these client-side** (e.g. a browser-only
  completed/starred flag) — that would create a second, non-authoritative Task
  truth this file's own dependency-direction rules elsewhere explicitly warn
  against.
- **Toolbar icon/order polish (same day, 2026-07-23)** — user feedback against the
  Google Calendar reference screenshot led to three follow-up fixes, all in
  `calendar/instance.js`'s toolbar template and `calendar.css`: (1) the sidebar
  toggle now comes *before* the identity block in source order (`.msc-cal-toolbar-left`
  children: toggle → identity → Today/prev/next → heading), matching the reference
  exactly — it was identity-first originally; (2) the settings icon was redrawn as a
  hex-nut silhouette (hexagon outline + center circle) — the original 8-spoke
  "sunburst" read as unclear at 18px; (3) the 3-button Month/Week/Day segmented
  control (`.msc-view-switcher`) was replaced by a single `.msc-view-dropdown`
  trigger ("Month ⌄") opening an anchored `.msc-view-dropdown-menu` listbox — same
  anchored-popover technique as the Create chooser/search panel, same underlying
  `.msc-view-btn`/`viewSwitcherBtns`/`syncViewSwitcherButtons()` elements and
  view-switch logic, only the container/ARIA role changed (`role="group"`/
  `aria-pressed` → `role="listbox"`/`role="option"`/`aria-selected`).
  `syncViewSwitcherButtons()` now also updates the trigger's visible label
  (`VIEW_LABEL` lookup) to match `state.currentView`.

## Professional Calendar toolbar redesign (2026-07-23, later same day)

See `validation/calendar-toolbar-professional-ui-check-2026-07-23.md` and
`handover/2026-07-23__calendar-toolbar-professional-ui-closure.md` for the full
record. This follow-up reverses one part of the icon/order polish above (the
Month/Week/Day dropdown) and restructures toolbar layout/typography — read this
section, not the "icon/order polish" bullet above, for the current state:

- **Left cluster is identity-only** — Today/Previous/Next/Month-Year moved out
  of `.msc-cal-toolbar-left` into the right cluster's `.msc-cal-toolbar-btns`
  nav group (first sub-group in `.msc-cal-toolbar-right`, ahead of the new
  `.msc-cal-utility-group` wrapping Search/Help/Settings, ahead of
  `.msc-view-switcher`, ahead of the unchanged `.msc-cal-mode-switch`).
  `.msc-cal-identity-label` raised from `.84rem`/700 to `var(--font-2xl)`/600
  (≈20px at ≤1024px) and is now always visible (the former hide-below-900px
  rule was removed — there is no more crowding pressure on this cluster once
  Today/prev/next/heading moved out).
- **Month/Week/Day is a segmented control again** — `.msc-view-dropdown` (see
  above) is gone entirely: no trigger, no anchored menu, no `viewDropdownId`/
  `viewDropdownTrigger`/`viewDropdownMenu`/`viewDropdownLabel` refs, no
  `openViewDropdown`/`closeViewDropdown`/`positionViewDropdown` functions. Back
  to three plain `.msc-view-btn` buttons in `.msc-view-switcher`
  (`role="group"`, `aria-pressed`) — same `viewSwitcherBtns`/
  `syncViewSwitcherButtons()`/`renderActiveView()` logic as always, only the
  container changed back. Reason: the dropdown had no coordination with
  Search/Help/Settings, making "only one toolbar popover open at a time"
  unenforceable and reported as hard to close reliably.
- **One-active-popover rule, added for the first time** —
  `openSearchPanel()`/`openHelpPopup()`/`openSettingsPopup()` each now close
  the other two first; `closeAllOwnPopovers()` (closes all three) runs on
  every Month/Week/Day and Calendar/Tasks change, and on a new
  `document`-level `msc:close-toolbar-popovers` event that `navigation.js`
  dispatches on every member-tab/app-section switch (each of the 5 mounted
  calendar instances listens independently, so switching member/tab can never
  leave a popover open behind the newly shown panel).
- **Icon system** — Settings redrawn from a hex-nut silhouette (see the
  icon/order polish bullet above — now superseded) to a conventional gear
  (ring + 8 radial teeth + center hole); Previous/Next changed from Unicode
  `&#8249;`/`&#8250;` to inline SVG chevrons, matching the stroke
  weight/style of every other toolbar icon (`.msc-tool-btn--icon svg`, 20px).
  Search/Help icons unchanged (already matched the required style).
- **Arrow-key roving** — `wireSegmentedArrowKeys()` (new, shared helper) gives
  both `.msc-view-switcher` and `.msc-cal-mode-switch` Left/Right (and
  Up/Down) roving focus between their buttons.
- **Tokens** — `--cal-toolbar-height` raised 60px→66px (fits the larger
  identity title); new `--cal-toolbar-height-compact: 58px` for ≤900px.

## Dynamic today-date Calendar icon and toolbar alignment (2026-07-23, later still)

See `validation/dynamic-today-date-calendar-icon-and-toolbar-alignment-check-2026-07-23.md`
and `handover/2026-07-23__dynamic-today-date-calendar-icon-and-toolbar-alignment-closure.md`
for the full record. This supersedes the nav-group *position* described in the
"Left cluster is identity-only" bullet two sections above (an intermediate
state the README was not updated for at the time) — Today/Previous/Next/
Month-Year had, by the time this task started, already moved into their own
`.msc-cal-toolbar-center` zone, genuinely centered across the whole toolbar
via CSS grid `justify-self: center` (added by a later, undocumented
`toolbar-alignment-and-close-control` follow-up — see the code comment
history in `calendar/instance.js`/`calendar.css`), which left a large empty
gap between "Calendar" and "Today". This task fixes that:

- **`.msc-cal-toolbar` is a flex row, not a grid, at every width** —
  `.msc-cal-toolbar-left` (identity) and `.msc-cal-toolbar-center` (the
  `.msc-cal-toolbar-btns` nav group) are adjacent flex children spaced by the
  toolbar's own `column-gap: 28px`, instead of the nav group being centered
  independently of the identity. `.msc-cal-toolbar-right` (utility group)
  uses `margin-left: auto` to claim the remaining space and stay pinned to
  the far right — replacing the grid's `justify-self: end`. The now-redundant
  ≤1024px grid→flex override was removed; the ≤900px compact-height override
  is unchanged.
- **New dynamic Calendar-date icon** — `.msc-cal-identity`'s former inline
  decorative SVG (a plain calendar-grid glyph) is replaced by
  `.msc-cal-date-icon` (blue header strip + numeral body, built from plain
  HTML/CSS, not SVG or a raster asset), showing **today's** Asia/Colombo
  day-of-month — never the selected date, the viewed month/week/day, or any
  Task/Leave data. Owned by the new shared module
  `calendar/date-icon.js` (`registerDateIcon(el)`/`unregisterDateIcon(el)`):
  one `Set` of registered icon elements, one shared midnight `setTimeout`
  (recomputed from a live `Intl.DateTimeFormat` Asia/Colombo clock reading
  after every paint), and one shared `document.visibilitychange` +
  `window.focus` listener pair — attached once regardless of how many of the
  five member calendars call `registerDateIcon()`. `.msc-cal-identity` is no
  longer `aria-hidden` (the icon now carries live information); the icon
  itself carries `role="img"` and an `aria-label` such as
  `"Calendar — today is July 23, 2026"`, maintained by the same module.

## Calendar/Tasks icon-only mode switch (2026-07-23, later still)

See `validation/calendar-tasks-icon-only-mode-switch-check-2026-07-23.md` and
`handover/2026-07-23__calendar-tasks-icon-only-mode-switch-closure.md` for the full
record. Direct user feedback against a Google Calendar reference screenshot asked
for the `.msc-cal-mode-switch` (Calendar/Tasks toggle, unchanged since the
"Professional Calendar toolbar redesign" section above) to lose its visible
`[ Calendar ] [ Tasks ]` icon+text presentation in favor of a compact icon-only
segmented control:

- **Markup (`calendar/instance.js`)** — the `<span class="msc-cal-mode-btn-label">`
  text nodes were removed from both buttons; `aria-label="Open Calendar"`/
  `aria-label="Open Tasks"` and `title="Calendar"`/`title="Tasks"` were added so
  the accessible name and tooltip no longer depend on visible text. The Calendar
  (rect + header-line) and Tasks (circle + checkmark) SVG icons themselves are
  unchanged — same paths as before this task, only rendered larger via CSS.
- **Sizing/shape (`calendar.css`)** — buttons are now fixed 46×46px squares (was
  variable-width icon+text with `6px 12px` padding); icon rendered size raised
  15px→19px; container radius raised to 23px (pill). `overflow: hidden` was
  removed from the container (it would have clipped the new tooltip below) —
  the pill shape is now produced by `border-radius` directly on the first/last
  button's outer corners instead.
- **Active state** — changed from solid `var(--accent)` background with white
  icon color to the same soft-fill pairing already used by `.msc-view-btn.active`
  and `.msc-tasks-nav-btn.active` elsewhere in this file: `var(--accent-light)`
  background + `var(--accent)` icon color. Still exposed programmatically via
  `aria-pressed`, not color alone.
- **Tooltip** — a new CSS-only `.msc-cal-mode-btn::after { content: attr(title); }`
  rule, shown on `:hover` **and** `:focus-visible`. This codebase's existing
  icon-button convention (native `title` + `aria-label`, e.g. Search/Help/
  Settings) does not reliably show a tooltip on keyboard focus in Chromium —
  this addition covers that gap for the mode switch specifically, reading the
  same `title` value already on the button rather than a second hardcoded
  string. Scoped to `.msc-cal-mode-btn` only; Search/Help/Settings/Prev/Next
  tooltips are unchanged.
- **Responsive** — the old `@media (max-width: 640px) { .msc-cal-mode-btn-label
  { display: none; } }` rule (previously the only place icon-only was the
  default) was removed as dead CSS — the label span it targeted no longer
  exists anywhere in markup, so icon-only is now the presentation at every
  width, not a narrow-viewport fallback.
- **Unchanged** — `setMode()`'s logic, `wireSegmentedArrowKeys()` roving focus,
  the left-side Calendar identity (dynamic today-date icon, "Calendar" title),
  Today/Previous/Next/current-period, Search/Help/Settings, Month/Week/Day, all
  five members' selected-state handling, and every backend/API/database call —
  this task changed only the mode switch's own markup attributes and CSS.

## Larger frontend modularization (not done in this task)

`web-view/js/calendar/instance.js` (~2,140 lines) and `web-view/js/
staff-data.js` (~830 lines) both mix several responsibilities and were
flagged as SPLIT candidates during discovery, but that structural split is
a separately approved, higher-risk future phase — this task only extracted
the already-generic `ui/*` utilities (see the validation doc's discovery
baseline for the full analysis).
