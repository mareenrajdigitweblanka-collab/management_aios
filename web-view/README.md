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
  Multi-Day Leave — opens the Create chooser directly
  (`openCreateChoiceFromCalendar()` → `openCreateMenu()`), exactly like
  keyboard Enter/Space already did. No double-click, no delay timer, no
  toast.
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
  backend-authoritative** — choosing "Task" from the Create chooser on
  a Full-Day/Multi-Day Leave date is never blocked in the frontend;
  submitting the Task still gets the existing `leave_conflict` 409
  rejection and its existing inline error message (`apiRequest()`'s
  `err.code === 'leave_conflict'` handling, unchanged, `calendar/
  instance.js`). The frontend pre-emptive toast that used to fire on a
  Task-free Full-Day-Leave date's blank click is gone along with the
  rest of the click coordinator — there is no frontend-side Full-Day-
  Leave special case left to maintain.
- **To add a new "opens the Create chooser" call site** in Month view,
  call `openCreateChoiceFromCalendar()` directly (same as the cell's own
  `go()` closure) — there is no timer/coordinator layer to route
  through anymore.

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

## Larger frontend modularization (not done in this task)

`web-view/js/calendar/instance.js` (~2,140 lines) and `web-view/js/
staff-data.js` (~830 lines) both mix several responsibilities and were
flagged as SPLIT candidates during discovery, but that structural split is
a separately approved, higher-risk future phase — this task only extracted
the already-generic `ui/*` utilities (see the validation doc's discovery
baseline for the full analysis).
