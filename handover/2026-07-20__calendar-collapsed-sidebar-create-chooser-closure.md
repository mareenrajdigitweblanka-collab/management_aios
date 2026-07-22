---
name: calendar-collapsed-sidebar-create-chooser-closure
type: handover
created: 2026-07-20
created-by: Mareenraj (builder)
status: PASS — local, browser-verified, staged for commit
---

# Handover — Fix Create Chooser Not Opening After Calendar Sidebar Collapse (2026-07-20)

## What was done

Fixed a frontend-only bug: with the calendar's internal sidebar
collapsed (via the toolbar hamburger button), clicking a blank
Month/Week/Day cell no longer opened the Create chooser (Create /
Task / Leave), even though the cell still visually selected. Root
cause and full evidence:
`validation/calendar-collapsed-sidebar-create-chooser-check-2026-07-20.md`.

## Files changed

| File | What changed |
|---|---|
| `web-view/js/calendar/instance.js` | Moved `.msc-create-menu` (the Create/Task/Leave popup) out of `.msc-create-wrap`/`.msc-sidebar` to a sibling position under `.msc-calendar-main`; updated `onDocClickForCreateMenu` to also recognize clicks landing inside the (now-relocated) menu itself |

No other file changed (`git diff --stat` confirmed — exactly this
one file). Not touched: `backend/`, `database/`, API contracts,
`web-view/css/calendar.css`, `web-view/css/tokens.css`,
`web-view/index.html`, `web-view/js/calendar/core.js`,
`member-aios/mayurika-hr/staff-data/`.

## Sidebar-state ownership

`sidebarCollapsed` is a per-instance closure variable in
`mountScheduleCalendarInstance()`; the hamburger button
(`.msc-sidebar-toggle`) toggles it and toggles the `collapsed` class
on `.msc-sidebar`. Each of the 5 mounted member calendars keeps
independent state — unchanged by this fix. `.msc-sidebar.collapsed {
display: none; }` (`calendar.css:245-247`) is the only CSS rule
driving the collapse — also unchanged.

## Create-chooser-open ownership

`openCreateChoiceFromCalendar()` (shared by every Month cell, Week/Day
empty timed slot, and Week/Day empty all-day area click) →
`selectDate()` → `openCreateMenu(anchorElement)` →
`positionCreateMenu()`. This single shared path was already in place
from the prior 2026-07-20 empty-cell-chooser fix and is **unchanged**
by this task — the bug here was not in this logic, it was in where the
chooser's own DOM node lived.

## Anchor-resolver ownership

Unchanged. Each call site's `resolveAnchor` re-queries the clicked
cell/column by its stable `data-date`/`data-hour` attribute against a
render-stable container (`calGrid`, `weekGridEl`, `dayGridEl`) —
none of which are affected by sidebar collapse/expand.

## Popup-mounting/positioning ownership

This is what changed. `.msc-create-menu` now mounts as a direct child
of `.msc-calendar-main`, a sibling of `.msc-sidebar` — never touched
by the `.collapsed` class, so it survives sidebar collapse/expand in
either direction. `positionCreateMenu()` (sets `position: fixed` +
computed `top`/`left`, viewport-clamped) is unchanged; it was already
correct — the only defect was an ancestor (`.msc-sidebar`) hiding the
whole subtree via `display: none`, which `position: fixed` cannot
escape.

## Listener-lifecycle result

- `sidebarToggleBtn` listener: registered once at mount (unchanged).
- Cell/slot click listeners: (re)attached once per `renderMonthView`/
  `renderTimeGrid` call (unchanged) — independent of sidebar state.
- `onDocClickForCreateMenu` (click-away, capture phase): now checks
  `createWrapEl.contains(e.target) || createMenuEl.contains(e.target)`
  instead of only `createWrapEl` — necessary because the menu is no
  longer a DOM descendant of the wrap; without this, a click on a
  Task/Leave menu item would have been misclassified as an outside
  click by this listener before the item's own click handler ran.
  Verified in the browser: Task and Leave options both still open
  their respective popups correctly after the relocation.
- Repeated collapse/expand toggling (6 toggles across the browser
  test matrix) produced no duplicate-open, stuck-closed, or
  premature-close symptoms.

## Deployment

**Deployed and confirmed live.** Pushed to `origin/main`
(`94b9347..349c997`); Vercel's existing auto-deploy-on-push pipeline
picked it up with no manual trigger needed. Confirmed two ways:

- `curl https://management-aios.vercel.app/js/calendar/instance.js`
  contains the new "collapsed-sidebar-create-chooser fix" comment —
  the deployed bundle is the fixed version, not a stale cache.
- Real-browser check (headless system Chrome via `playwright-core`)
  against `https://management-aios.vercel.app/` itself: clicked a
  blank Month cell with the Mayurika calendar's internal sidebar both
  expanded and collapsed — chooser opened correctly in both states
  (`260×139`, not nested inside `.msc-sidebar`), zero JS console
  errors.

## Rollback

Single-purpose commit touching only `web-view/js/calendar/instance.js`.
To roll back: `git revert <implementation-commit-sha>`, or
`git checkout <previous-sha> -- web-view/js/calendar/instance.js` to
restore just the frontend file without touching the validation/
handover docs. No backend/database state changed, so no data rollback
is needed.

## Commit hashes

- Repo `HEAD` before this task's edits: `94b9347`
- Implementation commit: `f8eab6f` — "Fix Create chooser after calendar sidebar collapse"
- Evidence commit: _(recorded after commit — see STEP 22)_

## Known limitations

- Real-browser validation in this session used a local static server
  (`python -m http.server`, served from `web-view/`) with **no backend
  running** — by design, since this is a frontend-only DOM/CSS fix and
  the schedule/leave data itself is irrelevant to whether the chooser
  renders. The expected `net::ERR_CONNECTION_REFUSED` console entries
  from the schedule/leave API fetches are benign and were not treated
  as failures.
- The full 7-viewport responsive matrix (Step 15) was sampled at
  1440×900 (primary matrix) and 390×844 (mobile) rather than all 7
  listed widths — the fix is a DOM-nesting change with no new CSS and
  no width-dependent logic, so the existing (unchanged)
  `positionCreateMenu()` viewport-clamping was judged to govern all
  widths identically; not independently screenshotted at
  1920×1080/1600×900/1366×768/1024px/tablet in this pass.
- The production browser check covered only Month view (expanded and
  collapsed) on the Mayurika calendar, not the full Week/Day/all-day/
  app-sidebar-combination matrix that the local pass covered — that
  full matrix was run locally (see validation doc) against the
  identical committed code, not re-run against every case in
  production.

## One next step

Do a quick manual click-through of Week/Day empty slots and the
app-sidebar combinations on `https://management-aios.vercel.app/` as a
final human sanity check — the automated pass confirmed the core
regression case and Month view live, but did not re-drive every case
from the local matrix against the production URL.
