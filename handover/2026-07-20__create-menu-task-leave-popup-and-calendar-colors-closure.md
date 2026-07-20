# Handover — Create Menu, Task/Leave Popups, and Calendar Color Mapping (2026-07-20)

## Files changed

- `web-view/js/calendar/instance.js` — sidebar dropdown markup + logic, Task
  popup, Leave popup, moved (not duplicated) form markup, popup open/close/
  focus-trap functions, `showApiStatus` targetEl parameter, success-path
  wiring (`closeTaskPopup()`/`closeLeavePopup()`, leave-create summary
  refresh), `editItem()` now opens the Task popup.
- `web-view/css/calendar.css` — dropdown menu CSS, popup-form CSS (width/
  scroll/responsive), semantic-color application across `.msc-chip-cat`,
  `.msc-cal-chip`, `.msc-tg-event`, `.msc-tg-allday-chip`,
  `.msc-cal-chip-leave`, `.msc-tg-allday-chip-leave`, `.msc-tg-leave-block`.
- `web-view/css/tokens.css` — nine new semantic color tokens
  (`--calendar-scheduled-*`, `--calendar-unscheduled-*`, `--calendar-leave-*`).

Not modified: `web-view/index.html` (calendar has no static markup — the
mount divs are untouched), `web-view/js/calendar/core.js` (zero diff —
classification/category-mapping logic untouched), `web-view/css/
components.css`, `backend/`, `database/`. Protected path
`member-aios/mayurika-hr/staff-data/` was not touched, inspected, staged, or
committed.

## Form ownership

Exactly one Task creation form and one Leave creation form exist in the DOM
per member instance (verified by extracting the actual generated HTML and
counting selector occurrences — `.msc-form-card`×1, `.msc-leave-form-
panel`×1). Both were *moved* (cut from their former lower-page location,
pasted into a popup) — no field, class, id, validation condition, or submit
handler was rewritten; every existing `container.querySelector('.msc-field-
*')`/`.msc-leave-field-*` reference resolves to the same moved element by
class, unchanged.

## Dropdown ownership

`.msc-create-wrap` → `.msc-sidebar-create` (button, `aria-haspopup`/
`aria-expanded`/`aria-controls`) → `.msc-create-menu` (`role="menu"`, two
`role="menuitem"` buttons: Task, Leave). State (`createMenuOpen`) and all
event listeners are closure-scoped inside `mountScheduleCalendarInstance`,
so each of the 5 member calendars owns an independent dropdown with no
shared state or id collisions.

## Popup ownership

`.msc-task-popup` and `.msc-leave-popup` reuse the pre-existing
`.msc-modal-overlay`/`.msc-modal` dialog pattern (same backdrop-click-to-
close idiom as the pre-existing task-detail view modal) with a new
`.msc-modal-form` width/scroll variant. Each popup has its own open/close/
Escape/focus-trap function pair (`openTaskPopup`/`closeTaskPopup`/
`onTaskPopupKeydown`, and the Leave equivalents), sharing one small
`trapPopupTab()`/`getFocusableEls()` helper pair rather than duplicating
the trap logic twice.

## Color tokens

`tokens.css`: `--calendar-scheduled-bg/-text/-border` (green, `#dcfce7`/
`#14532d`/`#86efac`), `--calendar-unscheduled-bg/-text/-border` (yellow,
`#fef3c7`/`#78350f`/`#fcd34d`), `--calendar-leave-bg/-text/-border` (red,
`#fee2e2`/`#7f1d1d`/`#fca5a5`). Each background/text pair exceeds WCAG AA's
4.5:1 contrast requirement (≈7.3:1, ≈8.25:1, ≈8.8:1 respectively). Applied
uniformly across Month, Week, and Day via the same class selectors
(`.task`/`.followup`/`-leave` suffixes already used by `CATEGORY_CLASS` in
`core.js`, which was not touched) — one shared semantic source, as required.

## API reuse

`apiRequest()`, `leaveApiRequest()`, `frontendToApiPayload()`,
`apiItemToFrontend()` — all byte-identical (confirmed via diff inspection).
The only new call site added anywhere is one extra `loadSummaries()`
invocation after a successful Leave save (mirroring the exact guarded call
`deleteLeaveRecord()` already used), and `showApiStatus()` gained one
optional third parameter (default preserves all 5 pre-existing 2-argument
call sites' behavior exactly). No payload shape, endpoint, or HTTP method
changed anywhere.

## Deployment

**Not deployed.** Consistent with the prior calendar-redesign task's
established pattern in this project: no browser-automation tool is
available in this session to perform Step 26's real-browser interaction
validation (click the dropdown, open each popup, trigger and observe a
validation error, complete a successful save, confirm zero console errors)
or Step 31's live-production check. Implementation, static/structural
validation, and documentation are complete; staging, commit, and push follow
this document per the task's explicit instructions, but production
deployment verification is the requester's to perform.

## Rollback

Uncommitted-scope rollback: `git checkout -- web-view/css/calendar.css
web-view/css/tokens.css web-view/js/calendar/instance.js` reverts fully,
with no schema/data/dependency residue (this is a presentation/interaction-
only change). Once committed, a single `git revert` of the commit(s) below
fully restores the prior "+Create task" scroll-to-form behavior and the
prior amber/green/purple color scheme.

## Commit hashes

See the companion staging/commit/push report for this turn — commit
hash(es) are recorded there once created; not yet committed as of this
document's authoring.

## Known limitations

- Real-browser interaction and visual validation (Step 26) were not
  performed — see the paired validation document's AMBER verdict.
- The general-purpose `.msc-api-status` banner (used by `loadItems`,
  drag/resize-revert, `deleteItem`, and `clearTestingData` — five call
  sites, all left as 2-argument `showApiStatus()` calls, fully unchanged)
  is visually distinct from the new `taskPopupStatusEl` used by Add/Update.
  This was a deliberate choice, not an oversight: physically relocating the
  original shared banner into the Task popup would have made those five
  unrelated operations' error messages invisible whenever the popup happens
  to be closed (which is most of the time) — a real regression the task's
  own regression matrix doesn't test for, but one this session chose not to
  introduce. The trade-off is documented here for transparency.
- Day view's larger popups (`.msc-modal-form`) were not given a Day-
  specific narrower variant — desktop/tablet/mobile breakpoints are shared
  across both popups uniformly, matching how the task described only one
  popup width behavior, not per-view variants.

## One next step

Requester opens the deployed calendar, exercises the full regression matrix
(Steps 23's 37 items — dropdown, both popups, all three views' colors,
validation-failure and success paths, responsive breakpoints, console) in a
real browser, and reports back so the paired validation document's AMBER
can close to PASS or a targeted fix can be scoped.
