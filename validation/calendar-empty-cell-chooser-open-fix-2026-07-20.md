# Validation — Empty Calendar Cell Chooser-Open Fix (2026-07-20)

## Observed symptom

In Month view, clicking a blank date cell: (1) selected/highlighted the
date, (2) updated the mini-calendar's selected date, but (3) the Task/Leave
create chooser did not visibly appear. The same underlying code path is
shared by Week/Day empty timed slots and empty all-day areas.

## Repository state at start

- Branch: `main`
- HEAD: `8d22985` ("Document calendar creation and overlap validation")
- `git status --short`: only `member-aios/mayurika-hr/staff-data/`
  (untracked, protected path — not touched)
- No unexpected tracked changes.

## Root cause

`openCreateChoiceFromCalendar(opts)` in `web-view/js/calendar/instance.js`
received `opts.anchorElement` — the actual DOM node the user clicked (a
Month cell, a Week/Day hour cell, or an all-day column) — and called, in
this order:

1. `selectDate(dateKey)` — which calls `renderActiveView()`, which calls
   `renderMonthView()` (Month) or `renderTimeGrid()` (Week/Day). Both of
   these fully replace their pane's `innerHTML` (`calGrid.innerHTML = html`
   at instance.js:737 pre-fix / `gridRootEl.innerHTML = ...` at
   instance.js:884), destroying and recreating every cell/column element.
2. `openCreateMenu(anchorElement)` — using the *same* `anchorElement`
   variable captured **before** step 1 ran.

By the time `openCreateMenu` → `positionCreateMenu` called
`anchorElement.getBoundingClientRect()`, that node had already been
detached from the document by the rerender in step 1. A detached element's
`getBoundingClientRect()` always returns an all-zero rect
(`top/left/right/bottom = 0`). `positionCreateMenu` then computed
`top: 6px; left: 0px` and set `createMenuEl.hidden = false` — the chooser
technically opened, but pinned to the extreme top-left corner of the
viewport rather than near the clicked cell, effectively indistinguishable
from "did not open" to a user looking at the cell they just clicked.

This matches failure mode **#3** from the investigation checklist: *"The
helper opens the old detached DOM node after rerender."*

Confirmed the same pattern existed in all three call sites:
- Month cell click handler (instance.js, inside `renderMonthView`)
- Week/Day empty timed-slot click + drag-release handler
  (`wireEmptyCellCreate`)
- Week/Day empty all-day column click handler (`wireTimeGridInteractions`)

All three passed a raw, about-to-be-detached DOM node as `anchorElement`
into the same `openCreateChoiceFromCalendar` helper, so all three views
shared the identical bug.

## Failure modes checked and ruled out

1. `selectDate()` rerenders before chooser opening — **confirmed, but not
   itself the bug**; the bug is *what* was opened against afterward.
2. Click-away handler closing the chooser on the same click — **ruled
   out**. `openCreateMenu` adds `onDocClickForCreateMenu` via
   `document.addEventListener('click', ..., true)` (capture phase) *during*
   the target-phase execution of the originating click. Per the DOM event
   dispatch algorithm, the capturing phase for `document` (an ancestor of
   the click target) has already completed by the time a target-phase
   listener runs, and capture-registered listeners are never invoked during
   the bubbling phase. A listener added at this point cannot fire for the
   *same* click event in any spec-compliant browser — confirmed by tracing
   the dispatch algorithm, not just by reading the existing code comment
   that asserts this.
3. Helper opens the old detached DOM node after rerender — **confirmed
   root cause** (see above).
4. Menu state reset during rerender — ruled out; `createMenuOpen` /
   `createMenuEl` live in the sidebar markup, outside the grid panes that
   get rerendered, and were never touched by `renderMonthView`/
   `renderTimeGrid`.
5. Missing `stopPropagation()` on blank-cell activation — not applicable;
   chip/+more/leave-chip handlers already call `stopPropagation()` so they
   never reach the cell-level handler, and the cell-level handler itself
   has nothing above it in the same pane to stop propagating to.
6. Chooser anchor/button reference null or wrong instance — ruled out;
   each of the 5 calendar instances resolves elements via its own
   `container.querySelector`, no shared/global references.
7. Menu positioned outside viewport / behind another layer — this **was**
   an observable symptom of the root cause (pinned at 0,0), not a separate
   bug in `positionCreateMenu`'s viewport-clamping logic itself.
8. Helper only populates fields but never opens the menu — ruled out;
   `openCreateMenu(anchorElement)` was always called, just with a stale
   anchor.
9. Code rejects programmatic (non-Create-button) opens — ruled out;
   `openCreateMenu` has no origin check.
10. A selected-cell handler returns before the chooser-open line — ruled
    out; nothing returns early in `openCreateChoiceFromCalendar`.

## Fix

`openCreateChoiceFromCalendar` now accepts `opts.resolveAnchor` (a
zero-arg function) instead of `opts.anchorElement` (a raw node). The
resolver is invoked **after** `selectDate()` (and therefore after the
rerender) completes, so it always queries a currently-attached element:

```js
var anchorElement = (resolveAnchor && resolveAnchor()) || sidebarCreateBtn;
openCreateMenu(anchorElement);
```

Each call site's resolver re-queries by the cell's stable `data-date` (and
`data-hour` for timed slots) against a **render-stable container
reference** — `calGrid` (Month), or `gridRootEl` i.e. `weekGridEl`/
`dayGridEl` (Week/Day) — none of which are themselves replaced by a
rerender; only their `innerHTML` is. If the resolver finds nothing (e.g.
some future edge case), the sidebar "+ Create" button is used as a safe
fallback anchor, satisfying the "minimum requirement: visible and usable"
bar from the task brief without inventing a second layout.

For the Week/Day drag-to-create path, the anchor hour is now taken from
`dragCurrentHour` (the hour cell under the pointer at release, already
tracked by the existing drag-tracking state) instead of re-deriving it from
`e.target.closest(...)`, since `e.target` also becomes a detached
reference once the grid rerenders.

## Files changed

- `web-view/js/calendar/instance.js` only.

Not touched: `backend/`, `database/`, `database/migrations/`, API
contracts, task/leave overlap rules, Schedule Summary, `web-view/css/calendar.css`,
`web-view/index.html`, `member-aios/mayurika-hr/staff-data/`.

## Static checks

- `node --check web-view/js/calendar/instance.js` → OK
- `node --check web-view/js/calendar/core.js` → OK
- CSS brace balance (`web-view/css/calendar.css`, unmodified) → OK (0)
- `git diff --stat -- backend/ database/` → empty
- `git diff --stat -- web-view/index.html web-view/js/calendar/core.js` →
  empty
- Local static server (`python -m http.server`) — all 6 sampled frontend
  assets (`index.html`, `js/app.js`, `js/calendar/instance.js`,
  `js/calendar/core.js`, `js/config.js`, `css/calendar.css`) returned
  HTTP 200.

## Browser validation

**Not captured in this session — no browser-automation tool is available
here**, consistent with every prior calendar task in this project
(see e.g. `validation/calendar-empty-slot-create-and-overlap-rules-check-2026-07-20.md`,
"Browser result" section). What was verified instead: the exact DOM
lifecycle was traced by reading the actual `renderMonthView`/
`renderTimeGrid`/`openCreateChoiceFromCalendar`/`openCreateMenu`/
`positionCreateMenu` source (confirming the `innerHTML` replacement timing
relative to the anchor resolution timing, before and after the fix), and
the DOM event dispatch algorithm was traced by specification to rule out
the click-away failure mode, rather than by clicking in a real browser.
This is a genuine gap, not a claimed PASS by static reasoning alone — see
PASS/AMBER/FAIL below.

## Regression reasoning (matrix items not physically clicked)

- Task chip / Leave chip / +N more: unchanged — their handlers still call
  `e.stopPropagation()` before this fix's code runs, so the fix cannot
  affect them (confirmed by diff: none of those handlers were touched).
- Drag / resize: unchanged — `attachDragHandlers`/`attachResizeHandler`
  are untouched by this diff; the drag-to-create path's anchor resolution
  now uses `dragCurrentHour` instead of `e.target.closest(...)`, but the
  drag/resize *detection* logic (`isDragging`, `suppressNextClick`,
  pointerdown/up wiring) is unchanged.
- Repeated empty-cell clicks → one chooser only: unchanged —
  `openCreateMenu` still early-returns via `if (createMenuOpen) { return; }`
  before this fix's code runs.
- Escape / click-away close: unchanged — `closeCreateMenu`,
  `onDocClickForCreateMenu`, `onCreateMenuKeydown` were not modified.

## PASS / AMBER / FAIL

**AMBER.** Root cause identified with high confidence from direct source
reading (not guessed), fix applied narrowly (one file, four call sites, no
new chooser/component), all static checks pass, backend/database/API
diff is empty. AMBER rather than PASS strictly because Step 13's mandatory
real-browser click-through (Month/Week/Day empty areas, Task/Leave popup
opens, no console errors) could not be performed in this session — no
browser-automation tool is available, matching the same documented tooling
gap as every prior calendar UI task in this project.
