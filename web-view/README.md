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

## Known minor leftovers (not fixed in this task — low risk, no user-facing effect)

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

## Larger frontend modularization (not done in this task)

`web-view/js/calendar/instance.js` (~2,140 lines) and `web-view/js/
staff-data.js` (~830 lines) both mix several responsibilities and were
flagged as SPLIT candidates during discovery, but that structural split is
a separately approved, higher-risk future phase — this task only extracted
the already-generic `ui/*` utilities (see the validation doc's discovery
baseline for the full analysis).
