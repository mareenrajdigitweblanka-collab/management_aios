# Calendar Popup Close, Time Validation, Task-List, and Return-Flow Check (2026-07-22)

## 1. User-confirmed problems (screenshot-derived)

1. The Create chooser popup (`.msc-create-menu`) had no visible close
   button — only Escape or an outside click could dismiss it.
2. Task-time validation surfaced the generic error-mapper "validation"
   text ("Check the highlighted fields" / "Some information is missing
   or not valid. Correct the highlighted fields and try again.") for an
   invalid End time, with no indication of which field or what to fix.
3. The `+N more` Task list (`.msc-more-popup`) mixed its header and rows
   in one scrolling element, had no visible Task count, and its title
   span had no native tooltip for a truncated long title.
4. Scrolling inside the Task list could pass wheel/touch scroll through
   to the background calendar/page once the list reached its top/bottom
   edge (the whole popup — including the header — was one scrollable
   region with no `overscroll-behavior` set).
5. Editing a Task opened from the `+N more` list and then choosing
   Update or Cancel Edit did not return to that list — Update left the
   user on the bare calendar, and Cancel Edit reopened the Task-detail
   popup (the pre-existing direct-calendar behavior), not the list.

## 2. Root cause of the generic End-time validation message

No frontend Task-time-order check existed before this task. An invalid
`end <= start` pair was sent straight to the API, where
`backend/schemas.py`'s `MemberScheduleEventCreate`/`Update.end_after_start`
model validator (`@model_validator(mode="after")`, unchanged by this task)
correctly rejects it with a 422:

```json
{"detail":[{"type":"value_error","loc":["body"],
  "msg":"Value error, end must be greater than start when both are provided",
  "input":{...},"ctx":{"error":{}}}]}
```

(Confirmed live against the local backend during this task — see §16.)
The Phase 1 `ui/error-mapper.js` (built in the prior task) classifies any
422 as the generic `'validation'` code, which maps to the same
one-size-fits-all "Check the highlighted fields" text regardless of
*which* validation rule failed — accurate for the backend's response, but
unhelpful for this specific, very common case. The fix adds a client-side
check with the same rule the backend already enforces, so this exact
round-trip never has to happen for a user to find out their times are
backwards.

## 3. Old vs. new validation wording

| | Old | New |
|---|---|---|
| Trigger | End time ≤ Start time, sent to the API, rejected with a 422 | End time ≤ Start time, caught before any request is sent |
| Field message | None (generic banner/toast only, not tied to a field) | On the End time field: **"End time must be later than start time."** |
| Toast (optional, added) | N/A | Title: **"Check the end time"** / Message: **"Choose an end time later than the start time."** |
| Mechanism | `ui/error-mapper.js` `'validation'` code → generic toast/banner | `validateTaskTimeRange()` (new, `instance.js`) → `setFieldError` + toast, request never sent |

## 4. Create chooser Close result

Added `.msc-create-menu-close` (`.msc-modal-close` base class, same
visual language as every other popup's close control) inside a new
`.msc-create-menu-head` row alongside the existing "Create" heading.
`type="button"`, `aria-label="Close create menu"`. Click and Escape both
now call `closeCreateMenu(createMenuTriggerEl)` — a new
`createMenuTriggerEl` variable records whichever element actually opened
the chooser (the sidebar Create button, or a Month/Week/Day/all-day
empty-area anchor), so focus returns to the real opener instead of
always to the sidebar Create button (the pre-existing Escape behavior
had this bug for the calendar-cell-opened case). Outside-click behavior
is unchanged (`closeCreateMenu()` with no focus target, exactly as
before). No duplicate close control was added. Works identically with
either sidebar collapsed or expanded — the chooser has been a
sidebar-independent DOM sibling since the 2026-07-22
collapsed-sidebar-create-chooser fix, unaffected by this change.

## 5. Old Task-list structure vs. new structure

**Old:** `.msc-more-popup` (one element, `overflow-y:auto` on the whole
popup) → `.msc-more-popup-head` (title + Close, scrolled with the rest)
→ `.msc-more-popup-list` (rows, no count, no stable time-column width, no
native tooltip on the title span).

**New:** `.msc-more-popup` (flex column, `overflow:hidden` — does not
itself scroll) →
- `.msc-more-popup-head` (`flex-shrink:0`, always visible): a
  `.msc-more-popup-head-text` block with the date title and a new
  `.msc-more-popup-count` ("N tasks") plus the Close button.
- `.msc-more-popup-body` (`flex:1 1 auto; overflow-y:auto;
  overscroll-behavior:contain; tabindex="-1"` — the one scrolling,
  keyboard-focusable element) → `.msc-more-popup-list` (rows, unchanged
  data source — `itemsForDate`, Task records only, Leave never included).

Each row now has a `min-width: 74px` time column (stable alignment
across rows of varying time-string length) and a native `title="..."`
attribute on the title span (full text on hover, in addition to the
existing `aria-label` for assistive tech). A `:active` pressed state was
added alongside the existing `:hover`/`:focus-visible` states.

## 6. Task-list width result

Unchanged — still the automatic, viewport-derived width from the
existing `--more-popup-*` clamp()/vw tokens (`tokens.css`, 2026-07-20
task). No manual/user-driven resizing was ever reintroduced.

## 7. Horizontal-resize result

Confirmed absent both before and after this task: a repository-wide
search for `resize:\s*horizontal` / `resize:\s*both` across
`web-view/css/*.css` returns zero live declarations (only two code
comments describing the *prior*, already-removed 2026-07-20 fix). No
action was needed for this specific requirement; documented here as
explicitly verified rather than assumed.

## 8. Scroll-containment implementation

- **CSS (primary):** `.msc-more-popup-body { overflow-y:auto;
  overflow-x:hidden; overscroll-behavior:contain; }` — stops scroll
  chaining to the page in every modern browser once the list reaches its
  top/bottom edge.
- **JS (narrow backstop):** `onMorePopupBodyWheel()` — a `wheel` listener
  on `.msc-more-popup-body` (`{ passive:false }`) that calls
  `preventDefault()` **only** when the scroller is already at its exact
  top/bottom edge *and* the gesture would scroll further past it; every
  other wheel event passes through untouched. Attached in `openMorePopup()`
  and removed in `closeMorePopup()` — verified no listener leak (see §16).
- Header stays outside the scrolling element entirely (flex-column
  layout), so it is never affected by scroll position.
- `tabindex="-1"` + `aria-label="Tasks"` on `.msc-more-popup-body` makes
  it a keyboard-focusable, labelled scroll container — Page Up/Down/
  Home/End/arrow-key scrolling work natively on a focused scrollable
  element (no custom key handling was added for this, since the browser
  already provides it).
- **Not implemented:** a custom `touchmove` boundary trap. Touch-scroll
  chaining is covered by `overscroll-behavior:contain` on modern mobile
  browsers (Safari iOS 16+, Chrome Android); adding a hand-rolled
  touchmove handler risks breaking normal touch scrolling and could not
  be verified without real touch-device testing in this environment —
  flagged in §21 as a known limitation, not silently skipped.

## 9. Background-scroll result

Not independently browser-verified (see §17/§21) — the CSS/JS mechanism
in §8 is the standard, well-established pattern for this exact problem
(a "scroll boundary trap" combined with `overscroll-behavior:contain`),
and the wheel handler's logic was manually traced against the documented
`scrollTop`/`clientHeight`/`scrollHeight` boundary arithmetic.

## 10. Task-row readability result

Row height, padding, and font size are unchanged from the existing,
already-tuned values (`--calendar-more-list-font-size`, 2026-07-20 task).
Time column now has a stable `min-width`; category left-border color
(green/yellow semantic) is unchanged; hover/focus-visible/active states
all present.

## 11. Long-title result

`text-overflow:ellipsis` + `white-space:nowrap` + `min-width:0` on
`.msc-more-popup-item-title` (unchanged from before) still prevent
overlap with the time column; the new native `title="..."` attribute on
the same span now exposes the full text on mouse hover in addition to
the existing `aria-label` on the row for assistive technology.

## 12. Task-list accessibility result

- Close button: keyboard reachable (real `<button>`, Tab-focusable).
- `.msc-more-popup-body`: `tabindex="-1"`, `aria-label="Tasks"` —
  keyboard-focusable, labelled scroll container.
- Rows: unchanged `role="button" tabindex="0"`, click/keydown (Enter/
  Space) activation, `aria-label` with time + title.
- Escape closes the popup (unchanged); outside-click closes it
  (unchanged).
- Full Task title available to assistive tech via `aria-label`
  (unchanged) and now also via native `title` for sighted mouse users.

## 13. Origin-state implementation

New per-member-instance closure state (never sent to the API, never a
global shared across members — verified by construction, since it is
declared with `var` inside `mountScheduleCalendarInstance(container)`,
which runs once per `.msc-instance` mount):

- `taskFlowOrigin` — `null` (direct-calendar, default) or
  `{ type: 'more-task-list', dateStr, anchorEl, scrollTop, taskId }`,
  set by `viewItem(id, triggerEl, origin)`'s new optional third
  argument. Every direct-calendar call site (Month chip, Week/Day timed
  block, all-day chip) is an unchanged 2-argument call, so it always
  resets `taskFlowOrigin` to `null`. Only the `+N more` list's row
  handler passes the third argument.
- `editOriginFlowOrigin` — a snapshot of `taskFlowOrigin` taken at the
  exact moment the detail popup's Edit button is clicked (`editItem()` is
  only ever entered through that one path). Read by both
  `handleCancelEditClick()` and the Update-success handler, then cleared.

## 14. List → Detail result

Clicking (or Enter/Space-activating) a row in the `+N more` list records
`taskFlowOrigin` (date, a resolvable anchor, the list's current
`scrollTop`, and the clicked Task's id), closes the list, and opens the
existing shared Task-detail popup via the unchanged `viewItem()` — no new
detail-view implementation. Viewing details and closing **without**
choosing Edit does not reopen the list (only Update/Cancel Edit are
origin-aware, per the task's explicit Step 8/9/11 scope) — focus returns
to the list's anchor chip, the pre-existing behavior.

## 15. Edit → Update → List result

On a successful Update: `selectDate(updated.date)` still runs first
(unchanged "refresh calendar data" step), then — if the edit's recorded
origin was `more-task-list` — `reopenTaskListOrigin()` reopens that same
date's list. It resolves a fresh anchor
(`resolveMorePopupAnchor()`: the date's `+N more` chip → the date's plain
calendar cell → the sidebar Create button, in that order) rather than
trusting the original anchor element, since `selectDate()`'s re-render
may have replaced it. The list rebuilds from the already-updated `items`
array, so the edited Task appears in its correct new position/time
immediately. Scroll position and the previously-selected row's focus are
restored (see §17/§18).

## 16. Edit → Cancel → List result

Cancel Edit calls neither `selectDate()` nor any other view/date-changing
function (unchanged) — it only closes the edit form and, when the
origin was `more-task-list`, reopens that list via the same
`reopenTaskListOrigin()` used by Update. Because nothing was mutated,
the Month grid's DOM is still the same one rendered before Edit was
opened (the Task/Leave popups are overlays, not replacements), so the
list content is trivially correct without needing a re-render.

## 17. List scroll-position restoration

`openMorePopup(dateStr, anchorEl, opts)` accepts `opts.restoreScrollTop`;
`reopenTaskListOrigin()` passes the scroll position captured at the
moment the row was originally clicked. A fresh (non-restoring) "+N more"
click passes no `opts`, so it starts at the top — unchanged default
behavior.

## 18. Direct-calendar Task behavior (Z)

Unchanged, verified by re-reading every direct-calendar call site: Month
chip, Week/Day timed block (`attachDragHandlers`), and all-day chip all
still call `viewItem(id, triggerEl)` with exactly two arguments, so
`taskFlowOrigin` resets to `null` and both `handleCancelEditClick()` (via
`editOriginFlowOrigin` being `null`) and the Update-success handler fall
through to their pre-existing behavior: Cancel Edit reopens the detail
popup (`editOriginViewId`/`editOriginTriggerEl`, unchanged); Update
returns to the bare calendar (unchanged). No new "list origin" is ever
invented for a direct-calendar open.

## 19. Member-isolation result

All new state (`taskFlowOrigin`, `editOriginFlowOrigin`,
`createMenuTriggerEl`, `morePopupCount`/`morePopupBody` refs) is declared
with `var` inside the per-instance factory function
`mountScheduleCalendarInstance(container)`, called once per `.msc-instance`
(one per member: Mayurika, Suman, Arun, Rajiv, Paraparan) — each mount
gets its own independent closure. Nothing is stored on `window`,
`document`, or any other shared object. Switching the active application
tab/member does not touch another member's calendar instance at all
(each keeps running in the background, unaffected), so a stale
`taskFlowOrigin` in one member's closure can never leak into another's.

## 20. Popup positioning / sidebar collapse-expand result

- Horizontal and vertical clamping both hardened: `positionMorePopup()`
  now also clamps `left` to a minimum of 8px (previously only clamped
  the right-overflow case) and clamps `top` to a new
  `MORE_POPUP_TOP_CLAMP` (64px, mirroring `--header-height` + margin) so
  the popup can never render underneath the fixed application header.
- Reposition-on-change: a `window resize` listener, this calendar
  instance's own sidebar-collapse click handler, and a guarded listener
  on the global application-sidebar-collapse toggle
  (`#sidebarCollapseToggle`, from `navigation.js`) all call
  `repositionMorePopupIfOpen()` — a no-op unless this instance's own
  popup is currently open — both immediately and after a 220ms delay
  (covering the existing `.2s` CSS collapse transition).

## 21. Static-check result

- `node --input-type=module --check` on all 12 JS modules (including the
  two touched this task): **PASS**.
- CSS brace-balance on all 7 stylesheets (including `calendar.css`):
  **PASS** (open == close on every file).
- `resize:\s*(horizontal|both)` search: zero live declarations.
- `window.alert(`/`window.confirm(`/`window.prompt(` search: zero live
  invocations (unaffected by this task; re-confirmed).
- Duplicate static `id` scan on `index.html`: none (unaffected — this
  task did not touch `index.html`).
- New class-name cross-check (JS markup ↔ CSS selectors) for every
  element added this task: confirmed matching on both sides.
- Local static server (`python -m http.server`): `index.html`,
  `css/calendar.css`, `css/ui.css`, `js/calendar/instance.js`,
  `js/navigation.js`, `js/staff-data.js` all return HTTP 200.

## 22. Backend / API / database proof

```
$ git diff --stat -- backend/
(no output — zero changes)
$ git diff --stat -- database/
(no output — zero changes)
```

- Backend changes: **NONE**.
- API changes: **NONE** — no route, schema, or model file touched.
- Database changes: **NONE**. Migrations: **NONE**.
- Business-rule changes: **NO** — the frontend `validateTaskTimeRange()`
  check enforces the *same* rule the backend's existing
  `end_after_start` model validator already enforces (end must be
  greater than start when both are provided); it is a client-side
  pre-check, not a relaxation or change of the server-side rule, which
  remains the authoritative backstop.
- Live backend smoke test performed during this task (existing local
  FastAPI server against the existing database): a valid
  10:42→11:42 Task create succeeded (201); an invalid 11:42→10:42
  create was still rejected by the backend (422, confirming the
  server-side rule is untouched and is the documented root cause in
  §2); the disposable test task was deleted immediately after
  (`DELETE .../{id}` → 200) — no existing user records were touched.

## 23. Backend-test result

No backend files were modified in this task (frontend-only scope), so
the existing backend test suite was not required to be re-run per this
task's scope; the live smoke test in §22 confirms the existing API
surface behaves identically to before.

## 24. Queryability result

This document plus the handover document together answer: what changed
in the Create chooser, the exact root cause and old/new wording for
Task-time validation, the old/new Task-list structure and scroll model,
the origin-state model and exactly which two functions read/write it,
and what was and was not independently browser-verified.

## 25. Browser-console / responsive-viewport / accessibility result

**Not independently browser-tested in this environment** — this
sandbox has no working browser-automation tool (`chromium-cli` absent;
`npm`/`pip` Playwright installs both failed with SSL/network errors, as
already documented in the prior Phase 1 validation record). Per an
explicit, informed decision made during this task, static validation
(§21), a full manual code-trace of every modified function (§13–§20),
and a live backend smoke test (§22) were treated as sufficient to
proceed with commit/push/deploy — this does not substitute for an actual
browser check across the 1920×1080 → 390px viewport matrix, keyboard
navigation, or the browser console, which remain unverified pending a
human pass (see handover "One next step").

## 26. Known limitations

- Real-browser/responsive/accessibility validation was not performed
  (§25).
- A custom `touchmove` scroll-boundary trap was deliberately not added
  (§8) — relies on `overscroll-behavior:contain`'s native touch support,
  unverified on a real touch device in this environment.
- Viewing Task details from the list and closing **without** editing
  does not reopen the list (only Update/Cancel Edit do, per the task's
  explicit scope) — a user who just wants to glance at a Task's details
  returns to the anchor chip, not the list. Flagged as a possible Phase
  2 UX refinement, not implemented here since it was not requested.
- Deleting a Task opened from the list does not reopen the list either,
  for the same reason (not in the explicit Step 8/9 scope, which names
  only Update and Cancel Edit).
- The application-sidebar-collapse reposition listener is attached once
  per mounted calendar instance (5 total) on the same global button;
  each is a cheap guarded no-op when its own popup isn't open, but this
  is a minor, deliberate trade-off documented here rather than silently
  introduced.

## 27. PASS / AMBER / FAIL

**AMBER.** Every static check, backend/database/API proof, and manual
code-trace in this document is clean, and all explicitly required
behavior (Close button, field-specific time validation, redesigned
Task list, scroll-containment mechanism, origin-aware list return) is
implemented and traced end-to-end. The result is AMBER rather than PASS
strictly because mandatory real-browser validation (§25) could not be
executed in this environment — proceeding to commit/push/deploy anyway
was an explicit, informed user decision recorded in this task's
conversation, not a claim that the browser-validation gate was
satisfied.

## 28. Evidence paths

- This document.
- `handover/2026-07-22__calendar-popup-close-time-validation-task-list-return-closure.md`
- Diff: `git diff -- web-view/` at commit time (see handover for hashes).
