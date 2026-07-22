# Management AIOS — Phase 1 Professional Feedback UX Check (2026-07-22)

## 1. Confirmed discovery baseline (carried in from the discovery run)

- Branch: `main`. Discovery HEAD: `14df61d`. This task's starting HEAD:
  `14df61d` (verified identical before implementation began — no drift).
- Protected path `member-aios/mayurika-hr/staff-data/` — untracked at the
  start of this task and untouched throughout; still untracked, not staged,
  not committed.
- Native `window.alert()` calls before this task: **8**, all in
  `web-view/js/calendar/instance.js`.
- Native `window.confirm()` calls before this task: **2**, both in
  `web-view/js/calendar/instance.js`.
- Native `window.prompt()` calls before this task: **0**.
- No reusable toast system existed. A generic modal/status-line/focus-trap
  pattern already existed in `calendar/instance.js` and a skeleton-loader
  pattern existed in `staff-data.js`.
- Raw HTTP status text / `JSON.stringify(detail)` could reach the user via
  three independent fetch wrappers.
- Staff Data's error box exposed a literal `uvicorn backend.main:app --port
  8000` developer instruction to end users.
- Only three backend errors carried a stable machine-readable identifier:
  `leave_conflict`, `task_conflict`, `leave_overlap`.
- Existing APIs were confirmed sufficient for every approved Phase 1
  journey — no new endpoint needed; no database/schema/migration/business-
  rule change needed.

## 2. Files created

- `web-view/js/ui/popup.js` — shared focus-trap utilities
- `web-view/js/ui/toast.js` — shared toast/notification system
- `web-view/js/ui/dialog.js` — shared destructive-confirmation dialog
- `web-view/js/ui/loading.js` — shared busy/loading/skeleton helpers
- `web-view/js/ui/form-feedback.js` — shared inline field-validation helpers
- `web-view/js/ui/error-mapper.js` — shared error-to-plain-language mapper
- `web-view/css/ui.css` — styles for the six modules above
- `web-view/README.md` — shared UX layer usage guide (module ownership,
  dependency direction, toast/dialog/error-mapper usage, how to add a new
  form/action or error mapping safely)
- This validation document
- `handover/2026-07-22__management-aios-phase-1-professional-feedback-ux-closure.md`

## 3. Files modified

| File | Before | After | Change |
|---|---|---|---|
| `web-view/index.html` | 1,949 lines | 1,950 lines | +1 (`<link>` to `css/ui.css`, placed after `components.css` and before `calendar.css`) |
| `web-view/js/calendar/instance.js` | 2,094 lines | 2,207 lines | +113 (see §4–§9 below) |
| `web-view/js/staff-data.js` | 825 lines | 844 lines | +19 (drawer focus-trap, error-mapper wiring, skeleton migration, `uvicorn` message removed) |
| `web-view/js/navigation.js` | 142 lines | 151 lines | +9 (mobile-drawer focus-return consistency) |

No other file was modified. `backend/`, `database/`, and
`member-aios/mayurika-hr/staff-data/` are untouched (see §16).

## 4. Alert / confirm / prompt counts

| | Before | After |
|---|---|---|
| `window.alert()` (user-facing) | 8 | **0** |
| `window.confirm()` (user-facing) | 2 | **0** |
| `window.prompt()` (user-facing) | 0 | **0** |

Verified by `grep -rnE "window\.(alert|confirm|prompt)\("` across
`web-view/js/**/*.js` after implementation — the only remaining matches are
inside code comments describing the change (e.g. "Replaces every
user-facing `window.alert()` call"), not live invocations.

## 5. Toast architecture (`web-view/js/ui/toast.js`)

- One lazily-created `<div class="ui-toast-region">` (created on first
  `showToast()` call), `role="region" aria-label="Notifications"
  aria-live="polite"`.
- Each toast: `role="alert"` for warning/error, `role="status"` for
  success/information — matches the existing `showApiStatus()` convention
  already used elsewhere in the app.
- Variants: `success`, `information`, `warning`, `error` — icon + left
  border color per type, using existing `--success`/`--accent`/`--warning`/
  `--error` tokens.
- Timings: success 4,000ms, information 5,000ms, warning/error 6,000ms
  (documented, small adjustment beyond the literal 4s/5s spec — the source
  requirement only specified persistence for the "requiring action" case,
  not a default for a non-actionable warning/error); `persistent: true`
  disables auto-dismiss entirely regardless of type.
- Duplicate-message suppression: an identical `type+title+message` toast
  that is still visible is not duplicated — its timer restarts instead.
- Dismiss button on every toast; does not block page interaction
  (`pointer-events: none` on the region, `auto` on each toast card).
- Responsive: fixed bottom-right on desktop/tablet, full-width bottom strip
  under 640px.
- `z-index: 900` — above normal content, below `.msc-modal-overlay` (999)
  and the confirmation dialog (1000).
- `prefers-reduced-motion: reduce` shortens the transition to near-zero.

## 6. Confirmation-dialog architecture (`web-view/js/ui/dialog.js`)

- One singleton overlay (`.msc-modal-overlay.ui-dialog-overlay` +
  `.msc-modal.ui-dialog`), reusing the existing calendar modal CSS
  foundation rather than a second modal system.
- `role="dialog" aria-modal="true"`, `aria-labelledby`/`aria-describedby`
  wired to the title/message.
- Cancel, destructive Confirm, and a `×` Close control; Escape and
  backdrop-click both behave as Cancel (safe — nothing is deleted yet).
- Full Tab focus-trap via `ui/popup.js`'s shared `trapTab()`.
- Initial focus on Cancel (the safer action).
- Focus returns to the element that opened it (`trigger` option) on close.
- `confirmDestructive({..., onConfirm})` — when `onConfirm` is supplied,
  clicking the destructive button calls it and shows a busy state
  (`ui/loading.js`'s `setButtonBusy`) on that button while its promise is
  pending; the dialog closes only once `onConfirm` resolves to something
  other than `false` (a confirmed, successful delete). A `false` result or
  a rejection restores both buttons and leaves the dialog open with its
  message intact — a failed delete never silently closes the confirmation.
- Replaces both native `confirm()` calls: task delete (`deleteItem`) and
  leave delete (`deleteLeaveRecord`).

## 7. Loading architecture (`web-view/js/ui/loading.js`)

- `setButtonBusy(button, isBusy, options)` — disables the button, shows a
  spinner + optional busy label, preserves and restores the original label,
  idempotent (safe to call `true` twice or `false` on a never-busied
  button). Applied to: Create Task, Update Task, Create Leave (button-level
  busy). Task/Leave delete busy state now lives on the confirmation
  dialog's own Confirm button (see §6) rather than the row/detail-popup
  button, since the actual request now runs inside the dialog's
  `onConfirm`.
- `showInlineLoading(element, text)` + `aria-busy` — applied to the Daily/
  Weekly/Monthly Schedule Summary blocks, which previously had no loading
  indicator at all. `renderSummaryStats()` clears `aria-busy` before
  replacing the element's content.
- `renderSkeletonRows(container, count)` — generalizes the Staff Data
  table's skeleton-row loader; Staff Data's `showSkeleton()` now calls this
  shared helper instead of building its own row markup (same visual output,
  `.ui-skeleton-row` styled identically to the former
  `.staff-table-skeleton-row`).
- `setRegionBusy(region, isBusy)` — exported per the required contract;
  not currently consumed by any call site (no region in this app needed a
  dim-while-content-stays-visible treatment beyond what `showInlineLoading`/
  skeleton rows already cover).

## 8. Form-feedback architecture (`web-view/js/ui/form-feedback.js`)

- `setFieldError`/`clearFieldError`/`clearFormErrors`/`focusFirstInvalid`.
- Each field gets a stable generated id (`ui-field-N`) and a sibling
  `<span class="ui-field-error" role="alert">`, linked via
  `aria-describedby`; `aria-invalid="true"` is set/cleared alongside.
- No duplicate error nodes — re-calling `setFieldError` on the same field
  reuses the existing error element.
- Applied to: Task form (date, title), Leave form (start date, Multi-Day
  end date, Short Leave start time, Short Leave end time — two separate
  fields/messages, matching the Phase 1 requirement's explicit field list).
- Popups stay open, entered values are preserved, first invalid field is
  focused — no native `alert()` remains for any of these six validation
  cases. No new validation rule was added; the three former combined
  alert messages were only split into per-field messages where the
  requirement explicitly listed the fields separately (Short Leave
  start/end time).
- Errors clear automatically when the user edits the field (`input`
  listener on title/date) or changes leave type/resubmits (`clearFormErrors`
  on the leave-type `change` handler and at the top of each submit
  handler).

## 9. Error-mapping architecture (`web-view/js/ui/error-mapper.js`)

`mapApiError(error, context)` reads a stable `.code` tagged onto the error
by the throwing fetch wrapper and returns `{ type, title, message, field,
persistent }` — never `error.message`, `error.status`, or any raw backend
text.

| Code | Title | Message | Persistent |
|---|---|---|---|
| `leave_conflict` | This time is unavailable | A leave entry already covers this time. Choose a different time. | Yes |
| `task_conflict` | This leave cannot be added | One or more tasks already use this time. Choose a different date or time. | Yes |
| `leave_overlap` | This leave overlaps another leave | Choose a different date or time. | Yes |
| `validation` | Check the highlighted fields | Some information is missing or not valid. Correct the highlighted fields and try again. | No |
| `not_found` | This record is no longer available | It may have already been removed or changed. Refresh and try again. | No |
| `network` | We couldn't connect | Check your connection and try again. | Yes |
| `server` / `unknown` | Something went wrong | Try again. If the problem continues, contact your system administrator. | Yes |

`classifyHttpStatus(status)` (404→`not_found`, 400/422→`validation`,
5xx→`server`, else `unknown`) is shared by all three domain fetch wrappers
(`apiRequest`, `leaveApiRequest`, `staffApiRequest`) so an unrecognized
failure is classified identically everywhere, instead of three independent
guesses. A genuine fetch-level failure (offline/DNS/CORS) is tagged
`network` by a trailing `.catch` in each wrapper. Request URLs, methods,
request bodies, and response contracts are unchanged — only what the user
is shown for an already-failed request changed.

## 10. Raw technical wording removed

| Site | Before | After |
|---|---|---|
| `calendar/instance.js` `loadItems()` | "Loading schedule from local API…" / "Could not reach the local schedule API (…). Is the backend running? Start it with \"uvicorn backend.main:app --port 8000\"…Detail: …" | "Loading your calendar…" / mapped title + message (no API/uvicorn/Detail wording) |
| Task Add/Update save failure | "…the local API may be unavailable. Detail: …" | Conflict → mapped inline message in the popup; other failures → toast |
| Task/Leave delete failure | "…the local API may be unavailable. Detail: …" / `window.alert('…Detail: '+err.message)` | Toast with mapped title/message |
| Drag/resize revert failure | "…reverted. Detail: …" | Toast: "Could not move/resize this task" + mapped message |
| Leave create failure (non-conflict) | `window.alert('Could not create this leave request. Detail: '+err.message)` | Conflict → inline leave-form status; other → toast |
| `staff-data.js` `showError()` | "…Staff API (`STAFF_API_BASE`)…Start it with \"uvicorn backend.main:app --port 8000\"…Detail: …" | Mapped title + message, no API base/uvicorn/Detail wording |

Confirmed by a repository-wide search for `uvicorn`, `Detail:`, `local
API`, `JSON.stringify(errBody`, and `status + ' ' + statusText` across
`web-view/js/` after implementation — zero live matches remain (only this
document and code comments describing the removal reference these terms).

## 11. Task journey results (code-trace verified — see §15 for the browser-testing caveat)

- **Create Scheduled/Unscheduled Task**: missing date/title now shows a
  field-level error and focuses the field (no alert); success shows
  "Task created" toast; save failure shows mapped inline (conflict) or
  toast (other) message; Save button shows a busy/"Saving…" state and is
  re-enabled in all outcomes.
- **Edit/Save**: same validation/busy/toast pattern; success shows "Task
  updated" toast.
- **Cancel Edit**: unchanged (`handleCancelEditClick` untouched).
- **Delete, Cancel**: `confirmDestructive()` opens; Cancel/Escape/backdrop
  click resolves `false`, nothing is requested, focus returns to the
  Delete button.
- **Delete, Confirm**: dialog's Confirm button shows a busy state while
  the DELETE request runs; on success the dialog closes, the detail popup
  closes, and a "Task deleted" toast appears; on failure the dialog
  restores its buttons, stays open, and a toast reports the mapped error.
- **Task/Leave conflict** (creating/updating a Task where Leave already
  exists): mapped inline message ("This time is unavailable…") shown in
  the Task popup's own status line — not a toast, not an alert.

## 12. Leave journey results

- **Create Leave**: missing start date / Multi-Day end date / Short Leave
  start or end time each show a field-level error (four distinct
  messages, matching the four fields the requirement listed); success
  shows "Leave added" toast; Create button shows a busy/"Saving…" state.
- **Leave/Leave overlap** and **Leave/Task conflict**: both now route
  through the same inline leave-form-status path (previously only
  overlap was specially handled — a leave blocked by an existing Task
  fell through to a blocking `alert()` before this task); form values are
  preserved, focus moves to the start-date field for the overlap case.
- **Delete Leave**: same `confirmDestructive()`-with-`onConfirm` pattern
  as Task delete; success shows "Leave deleted" toast.

## 13. Staff Data result

- Table loading uses the same skeleton-row visual as before, now rendered
  via the shared `renderSkeletonRows()` helper.
- Load failure no longer shows the Staff API base URL or the `uvicorn`
  start command — shows a mapped plain-language title/message with the
  existing Retry button.
- Record-detail drawer's Tab handling now goes through the shared
  `trapTab()`/`returnFocus()` helpers instead of its own single-control
  pin (same effective behavior today, since the drawer body's only
  focusable element is still the Close button).

## 14. Schedule Summary result

Daily/Weekly/Monthly blocks now show a "Loading … summary…" inline
spinner (previously no loading indicator existed at all) and, on failure,
a `role="alert"` mapped message instead of a plain, non-announced "Could
not load … summary." No calculation, formula, or API request changed.

## 15. Responsive / accessibility / static-check results

- **Static checks — PASS**: `node --input-type=module --check` on all 12
  touched/new JS modules; CSS brace-balance on `ui.css` and every existing
  CSS file (all matched open/close); no duplicate static `id` in
  `index.html`; every new/modified file served HTTP 200 from a local
  static server; every `ui/*` import in `instance.js`/`staff-data.js`/
  `navigation.js` is actually used (no unused imports); no circular
  imports (`ui/*` modules stay leaves except `dialog.js → popup.js`/
  `loading.js`, both one-directional).
- **Manual code-trace verification — PASS**: every modified function was
  re-read end-to-end after editing to confirm control flow, event wiring,
  and preserved business behavior (conflict detection, delete-confirm
  order, focus-restoration chains, drag/resize revert-on-failure).
- **Real-browser validation (desktop/laptop/tablet/mobile viewports,
  keyboard/Tab-trap/focus-return, 200% zoom, reduced-motion, browser
  console) — NOT PERFORMED.** This execution environment has no working
  browser-automation tool: `chromium-cli` is not installed, and both
  `npm install playwright` and `pip install playwright` failed with
  SSL/network errors (outbound package installation appears blocked in
  this sandbox). Per explicit user decision (this task's continuation
  message, 2026-07-22), static validation and manual code-trace
  verification were accepted as sufficient to proceed with commit/push/
  deploy for this change set, given it is a presentation-layer-only
  change with no altered business rules, API contracts, or database
  access. **A human should still open the deployed app and spot-check the
  journeys in §11–§14 before relying on this in daily use** — see the
  handover document's "known limitations" and "one next step."

## 16. Backend / database / API proof

```
$ git diff --stat -- backend/
(no output — zero changes)
$ git diff --stat -- database/
(no output — zero changes)
```

- Backend changes: **NONE**.
- API changes: **NONE** (no route, schema, or model file touched; request/
  response contracts unchanged — verified by re-reading every modified
  fetch-wrapper call site to confirm identical URL/method/body).
- Database changes: **NONE**.
- Migration changes: **NONE**.
- Business-rule changes: **NO** (conflict detection, overlap detection,
  leave-deduction math, and Schedule Summary formulas are untouched;
  only presentation of their outcomes changed).
- Protected path `member-aios/mayurika-hr/staff-data/`: untouched,
  remains untracked, not staged, not committed.
- Local backend smoke test performed during this task (existing FastAPI
  server started locally against the existing database): `GET /health` →
  200; `GET /api/member-schedules/mayurika`, `GET /api/member-leave/
  mayurika`, `GET /api/staff?limit=1` all returned normally with existing
  production-like records intact — no test data was written or deleted
  during this check.

## 17. Backend test result

No backend files were modified in this task, so the existing backend test
suite was not required to be re-run per this task's scope (Phase 1 is
frontend-only); the local smoke test in §16 confirms the existing API
surface responds normally against the current database.

## 18. Queryability result

This document, the handover document, and `web-view/README.md` together
answer: what shared UX modules exist, what each owns, the dependency
direction rule, how to add a new form/action or error mapping safely, the
before/after alert/confirm/prompt counts, and the exact wording changes —
answerable by a clean reader without needing to inspect the diff directly.

## 19. Known limitations

- Real-browser validation was not performed in this environment (§15) —
  pending a human spot-check post-deploy.
- `ui/loading.js`'s `setRegionBusy` export has no current consumer.
- Staff Data's now-unused `.staff-table-skeleton-row` CSS was left in
  place rather than removed (see `web-view/README.md`'s "known minor
  leftovers").
- The Calendar's centered task-detail modal and Staff Data's slide-in
  detail drawer remain two different visual patterns for a similar "view
  details" action — a Phase 2 consistency candidate, not addressed here.
- The larger structural split of `calendar/instance.js`/`staff-data.js`
  into smaller feature modules remains a separately approved future phase
  (per this task's explicit phase boundary) — not attempted here.

## 20. PASS / AMBER / FAIL

**AMBER.** Every static, structural, and manual code-trace check in this
document passes cleanly, all 8 native alerts and 2 native confirms are
removed, raw technical wording is removed, and no backend/database/API/
business-rule change occurred. The result is AMBER rather than PASS
strictly because mandatory real-browser validation (§15) could not be
executed in this environment — proceeding to commit/push/deploy anyway
was an explicit, informed user decision recorded above, not a claim that
the browser-validation gate was satisfied.

## 21. Evidence paths

- This document.
- `handover/2026-07-22__management-aios-phase-1-professional-feedback-ux-closure.md`
- `web-view/README.md`
- Diff: `git diff -- web-view/` at commit time (see handover for hashes).
