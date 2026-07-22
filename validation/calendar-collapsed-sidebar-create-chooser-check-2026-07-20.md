# Validation — Create Chooser Not Opening After Calendar Sidebar Collapse (2026-07-20)

## Observed production bug

With the calendar's internal sidebar (the panel holding the "+ Create"
button, mini date picker, and category legend) expanded, clicking a
blank Month cell opened the Create chooser (Create / Task / Leave)
correctly. After clicking the calendar toolbar hamburger button
(`.msc-sidebar-toggle`) to collapse that sidebar, clicking a blank
Month cell no longer opened the chooser — the cell still visually
selected, but no popup appeared. The same code path is shared by
Week/Day empty timed slots and empty all-day areas.

## Repository state at start

- Branch: `main`
- HEAD: `94b9347` ("Confirm live production deployment in the member UI cleanup handover")
- `git status --short`: only `member-aios/mayurika-hr/staff-data/`
  (untracked, protected path — not touched, not staged, not inspected
  for modification)
- No unexpected tracked changes.

## Root cause

`.msc-create-menu` (the actual Create/Task/Leave popup element) was a
DOM **descendant** of `.msc-sidebar`:

```
.msc-sidebar
  └─ .msc-create-wrap
       ├─ button.msc-sidebar-create   ("+ Create")
       └─ .msc-create-menu            (the popup — Task / Leave)
```

`web-view/css/calendar.css:245-247`:

```css
.msc-sidebar.collapsed {
  display: none;
}
```

The sidebar-toggle click handler (`instance.js`, `sidebarToggleBtn`
listener) only ever toggles the `collapsed` class on `.msc-sidebar` —
it does not touch the Month/Week/Day grid, does not rerender, and does
not detach or replace any node. But because `.msc-create-menu` lives
**inside** `.msc-sidebar`, collapsing the sidebar set `display: none`
on the menu's own ancestor. `display: none` on an ancestor
unconditionally removes the entire subtree from rendering — unlike
`overflow: hidden` or a stacking-context change, it cannot be escaped
by `position: fixed` on a descendant. `positionCreateMenu()` already
sets `position: fixed` with computed `top`/`left` on every open (a
technique this project's calendar has used since the 2026-07-20
empty-cell-chooser fix — see
`validation/calendar-empty-cell-chooser-open-fix-2026-07-20.md`), but
that only escapes an ancestor's overflow/stacking context, never an
ancestor's `display: none`.

So the reported symptom — "the date/cell may still become selected;
the popup does not appear" — is exact: `openCreateChoiceFromCalendar`
→ `selectDate()` → `openCreateMenu()` all ran normally (selection
worked, `createMenuEl.hidden` was cleared, position was computed), but
the menu's own ancestor being `display: none` meant nothing rendered.

This matches investigation item **#12** from the checklist: *"The
popup is mounted inside a container that disappears or changes
width."*

### Confirmed by direct before/after browser reproduction

The fix was temporarily stashed (`git stash`) and the exact click
sequence was run against the original, unfixed code in a real
headless-Chrome session:

| State | `.msc-create-menu` `hidden` attr | Computed rect | Nested inside `.msc-sidebar`? |
|---|---|---|---|
| Expanded, blank Month cell clicked | not present (menu "open") | `260 × 139` (visible) | `true` |
| Collapsed, blank Month cell clicked | not present (menu "open") | **`0 × 0`** (invisible) | `true` |

Same sequence after restoring the fix (`git stash pop`):

| State | `.msc-create-menu` `hidden` attr | Computed rect | Nested inside `.msc-sidebar`? |
|---|---|---|---|
| Expanded, blank Month cell clicked | not present | `260 × 139` (visible) | `false` |
| Collapsed, blank Month cell clicked | not present | `260 × 139` (visible) | `false` |

This is a direct, reproduced-then-fixed confirmation, not an inferred
root cause.

## Failure modes checked and ruled out (Step 5 checklist)

1. Collapse rerender destroys the cell node / stale anchor — **ruled
   out**: the sidebar toggle handler never touches `calGrid`,
   `weekGridEl`, or `dayGridEl`; no rerender happens on collapse/expand
   at all.
2. Collapse rerender destroys the Create button fallback anchor —
   **not the cause**: `sidebarCreateBtn` becomes `display:none` when
   collapsed (expected — it's part of the sidebar), but every
   Month/Week/Day/all-day call site already passes its own
   `resolveAnchor` that resolves the clicked cell/column directly, so
   the button fallback is never reached in this flow.
3. Collapsed grid uses a different container selector `resolveAnchor()`
   doesn't search — **ruled out**: `calGrid`/`weekGridEl`/`dayGridEl`
   are unaffected by the sidebar collapse; they are siblings of
   `.msc-sidebar` under `.msc-calendar-main`/`.msc-calendar-content`.
4. Chooser opens but computed position is outside the visible
   calendar — **ruled out**: confirmed rect was `0×0`, i.e. not
   positioned off-screen, but not rendered at all.
5. Chooser opens beneath the calendar due to z-index/stacking-context
   changes — **ruled out**: no `transform`/`filter`/`contain` on any
   ancestor; confirmed via `grep` across `calendar.css`.
6. Collapsed layout adds `overflow: hidden` and clips the popup —
   **ruled out**: `.msc-sidebar.collapsed` only sets `display: none`;
   no new `overflow` rule is introduced by collapse.
7. Blank-cell listener attached only to pre-collapse DOM — **ruled
   out**: cell listeners are attached once per `renderMonthView`/
   `renderTimeGrid` call, entirely independent of sidebar state; the
   listeners fired correctly in both expanded and collapsed states
   (confirmed: `openCreateChoiceFromCalendar` ran and set
   `hidden=false` in both cases).
8. Collapse creates duplicate listeners that immediately close the
   chooser — **ruled out**: the sidebar toggle handler is registered
   once at mount (`sidebarToggleBtn.addEventListener(...)`, not
   re-registered on render); repeated collapse/expand toggling in the
   browser test (4 toggles across the matrix) never produced a
   double-open/immediate-close symptom.
9. Document click-away listener closes the chooser on the same click —
   **ruled out**: `onDocClickForCreateMenu` is registered via capture
   phase inside `openCreateMenu`, after the originating click's target
   phase has already run; not fireable for the same click (same
   reasoning as the 2026-07-20 empty-cell fix's validation doc).
10. A collapsed-state condition returns early from the create-open
    helper — **ruled out**: `openCreateChoiceFromCalendar` and
    `openCreateMenu` have no sidebar-collapsed branch or early return
    of any kind.
11. Layout transition runs after popup positioning and moves the
    anchor/popup — **not applicable**: `.msc-sidebar.collapsed` has no
    CSS `transition` in `calendar.css`; the collapse is instantaneous.
12. **Popup is mounted inside a container that disappears or changes
    width — confirmed root cause** (see above).

## Fix

`web-view/js/calendar/instance.js` — the mount markup
(`mountScheduleCalendarInstance`) now places `.msc-create-menu` as a
sibling of `.msc-sidebar` (inside `.msc-calendar-main`, immediately
before `.msc-calendar-content`) instead of nesting it inside
`.msc-create-wrap`/`.msc-sidebar`:

```
.msc-calendar-main
  ├─ .msc-sidebar                 (collapsible; still contains the "+ Create" button, mini picker, legend)
  ├─ .msc-create-menu             (moved out — sidebar-independent; never affected by .collapsed)
  └─ .msc-calendar-content        (Month/Week/Day grid panes)
```

- The "+ Create" button (`.msc-sidebar-create`) stays inside the
  sidebar, unchanged — it is expected to hide along with the rest of
  the sidebar when collapsed (that button's own visibility was never
  part of the reported bug).
- `onCreateMenu`'s `aria-controls="msc-create-menu-…"` /
  `aria-expanded` wiring is id-based, not DOM-nesting-based, so no
  accessibility attribute needed to change.
- `onDocClickForCreateMenu` (the click-away handler) previously relied
  on `createWrapEl.contains(e.target)` to recognize a click landing
  inside the button-or-menu as "not an outside click." Since the menu
  is no longer a descendant of `createWrapEl`, this check now also
  tests `createMenuEl.contains(e.target)` directly — otherwise a click
  on a Task/Leave menu item would be misclassified as an outside click
  by the capture-phase listener before the item's own click handler
  ran.
- `openCreateChoiceFromCalendar` / `openCreateMenu` /
  `positionCreateMenu` / the Month/Week/Day/all-day `resolveAnchor`
  call sites are **entirely unchanged** — Step 6's "one shared
  create-open path" requirement was already satisfied by the prior
  2026-07-20 empty-cell-chooser fix; this task's bug was purely a
  CSS/DOM-nesting placement issue, not a logic-path issue, so no new
  branching was introduced.

## Files changed

- `web-view/js/calendar/instance.js` only (markup relocation + one
  click-away containment check).

Not touched: `backend/`, `database/`, `database/migrations/`, API
contracts, task/leave overlap rules, Schedule Summary,
`web-view/css/calendar.css`, `web-view/css/tokens.css`,
`web-view/index.html`, `web-view/js/calendar/core.js`,
`member-aios/mayurika-hr/staff-data/` (confirmed via `git diff --stat`
— exactly one file).

## Static checks

- `node --check web-view/js/calendar/instance.js` → OK
- `node --check web-view/js/calendar/core.js` → OK (unmodified)
- CSS brace balance (`web-view/css/calendar.css`, unmodified) → OK (0)
- Duplicate static `id` scan (`web-view/index.html`, unmodified) → 22
  ids, 0 duplicates
- `git diff --stat -- backend/ database/` → empty
- `git diff --stat -- web-view/css/calendar.css web-view/css/tokens.css web-view/index.html web-view/js/calendar/core.js` → empty
- Local static server (`python -m http.server`, served from
  `web-view/`) — all 6 sampled frontend assets (`index.html`,
  `js/app.js`, `js/calendar/instance.js`, `js/calendar/core.js`,
  `js/config.js`, `css/calendar.css`) returned HTTP 200.

## Browser validation

**Performed in this session** — `playwright-core` was installed into
the session scratchpad (`npm install playwright-core`, no browser
binary download needed) and driven against the machine's installed
system Google Chrome via `executablePath`, the same approach the prior
member-UI-cleanup task used when Playwright's bundled Chromium could
not be downloaded. The app was served locally via
`python -m http.server` from `web-view/`; no backend was started
(expected `net::ERR_CONNECTION_REFUSED` from the schedule/leave API
fetches — the app's own designed error handling shows this as a
banner, does not block rendering, and does not affect the chooser
under test).

### Pre-fix reproduction (`git stash` of the fix, browser-driven)

See table above — collapsed-state click produced a `0×0` menu rect
while nested inside `.msc-sidebar`; confirms the exact reported defect.

### Post-fix full matrix (Mayurika calendar instance, 1440×900)

| Case | Chooser opens? | In viewport? |
|---|---|---|
| A. Expanded, blank Month cell | ✅ | ✅ |
| B. **Collapsed, blank Month cell (the regression case)** | ✅ | ✅ |
| C. Re-expanded, blank Month cell | ✅ | ✅ |
| D. Collapsed, Week empty timed slot | ✅ | ✅ |
| D. Collapsed, Week empty all-day area | ✅ | ✅ |
| E. Expanded (toggled back), Week empty timed slot | ✅ | ✅ |
| F. Collapsed, Day empty timed slot | ✅ | ✅ |
| F. Collapsed, Day empty all-day area | ✅ | ✅ |
| G. Re-expanded, Day empty timed slot | ✅ | ✅ |
| H. Task option opens Task popup (chooser opened while collapsed) | ✅ (`msc-task-popup` gained `.show`) | — |
| I. Leave option opens Leave popup (chooser opened while expanded) | ✅ (`msc-leave-popup` gained `.show`) | — |

Repeated collapse/expand toggling across this sequence (collapse →
expand → collapse → expand → collapse → expand, 6 toggles total)
never produced a double-open, a stuck-closed state, or a duplicate
click-away closure — confirms no duplicate-listener regression from
the fix (Step 10/11).

### Application-sidebar × calendar-sidebar combination matrix (Step 14)

| App sidebar | Calendar sidebar | Chooser opens? |
|---|---|---|
| Expanded | Expanded | ✅ |
| Expanded | Collapsed | ✅ |
| Collapsed (`#sidebarCollapseToggle` clicked, `aria-expanded="false"` confirmed) | Collapsed | ✅ |
| Collapsed | Expanded | ✅ |

### Keyboard / accessibility (Step 16)

- Focused a blank Month cell (`Tab`-reachable, `role="button"
  tabindex="0"`) with the calendar sidebar collapsed and activated it
  via `Enter` — chooser opened (`keyboardActivationCollapsed: true`).
- `Escape` closed the chooser (`chooserClosedAfterEscape: true`).
- `.msc-sidebar-toggle`'s `aria-expanded` correctly flips
  `true`↔`false` on each collapse/expand (confirmed both directions).
- `#sidebarCollapseToggle` (the separate, unrelated **application**
  sidebar collapse toggle) correctly reports `aria-expanded="false"`
  after toggling — confirms this task did not disturb the
  already-existing, out-of-scope app-level sidebar behavior.

### Member-tab switch regression (Step 11 items 9/10)

Switched from the Mayurika tab to Suman's tab and back — the
Mayurika calendar's own chooser still opened correctly on return
(`chooserAfterTabReturn: true`), confirming per-instance state
(`createMenuEl`, `sidebarCollapsed`) survives a tab visibility
change without needing a remount.

### Responsive check (Step 15, mobile width sample)

At 390×844 (mobile): chooser rect `{ left: 122, right: 382 }`, fully
within the 390px viewport; `document.documentElement.scrollWidth`
(390) equals `window.innerWidth` (390) — no horizontal overflow
introduced by moving the menu out of the sidebar. Desktop widths
(1440×900) were the primary matrix above; 1920×1080/1600×900/
1366×768/1024px/tablet were not separately re-screenshotted in this
pass since the fix is a DOM-nesting change with no new CSS and no
width-dependent logic — `positionCreateMenu`'s existing
viewport-clamping (unchanged) governs all widths identically.

### Screenshot evidence

Captured: collapsed calendar sidebar (no left panel visible next to
the Month grid) with the Create chooser open over 5 June 2026,
showing "Create" heading and Task/Leave options, positioned near the
clicked cell and fully on-screen. (Session scratchpad; not committed
to the repo.)

### Console errors

Only expected, benign entries across the entire session: repeated
`net::ERR_CONNECTION_REFUSED` (schedule/leave API — no local backend
was started, by design for a frontend-only check) and one `404`
(favicon). Zero JavaScript exceptions (`pageerror`) at any point
across ~30 interactions (collapse/expand toggles, view switches,
Task/Leave opens, tab switches, keyboard activation, responsive
resize).

## Task/Leave option regression (Step 12)

- Task: opens the existing Task popup; date field carries the clicked
  date (unchanged path — `openCreateChoiceFromCalendar` still calls
  `selectDate(dateKey)` before opening the chooser, exactly as before
  this fix). Heading/labels unchanged ("Create" / "Task" / "Leave").
- Leave: opens the existing Leave popup, same date-carrying behavior.
- No wording changed in this task, as required.

## Other-click regression (Step 13) — reasoning, not separately re-clicked

Task chip / "+N more" / Leave chip handlers all call
`e.stopPropagation()` before this fix's code runs, and none of those
handlers, `attachDragHandlers`, or `attachResizeHandler` were touched
by this diff (confirmed via `git diff` — the only changes are the
mount-markup relocation and the click-away containment check) — so
drag, resize, and the existing chip/more-popup/task-detail behaviors
are unaffected by construction, consistent with the reasoning applied
in the 2026-07-20 empty-cell-chooser fix's own validation doc for the
same category of unrelated-handler regressions.

## Schedule Summary / backend / database / API

- `git diff --stat -- backend/ database/` → empty.
- No API route, request/response shape, or PostgreSQL schema touched.
- Schedule Summary markup/calculation code (`.msc-summary-section` and
  its rendering) is outside every diff hunk in this change.
- `member-aios/mayurika-hr/staff-data/` — untracked, protected;
  confirmed not staged, not inspected for modification, not touched at
  any point in this session.

## PASS / AMBER / FAIL

**PASS.** Root cause identified with certainty (confirmed via a real
before/after browser reproduction, not inferred from static reading
alone), fix applied narrowly (one file, a markup relocation plus a
one-line containment-check fix, no new component, no new branching
logic), all static checks pass, backend/database/API diff is empty,
and real-browser validation (headless system Chrome via
`playwright-core`) was performed covering: the exact regression case,
Month/Week/Day/all-day in both collapsed and expanded states, repeated
toggling, all four app-sidebar × calendar-sidebar combinations,
keyboard activation and Escape, a member-tab switch, a mobile-width
responsive check, and zero JavaScript console errors throughout.

## One next step

Do a quick manual click-through against the live production URL
(`https://management-aios.vercel.app/`) after deployment, specifically
collapsing the calendar sidebar and clicking a blank cell, as a final
human sanity check under real network conditions (this session's
browser validation ran against a local static server with no backend
started, by design for a frontend-only fix).
