# Handover — Member Page Layout, Calendar-Based Leave, Collapsible Sections, and Embedded PH Staff Data (2026-07-22)

## Files created

- `validation/member-page-layout-leave-popup-collapse-and-ph-staff-check-2026-07-22.md` — full validation record (see for detail on every requirement).
- `handover/2026-07-22__member-page-layout-leave-popup-collapse-and-ph-staff-closure.md` — this file.

## Files modified

- `web-view/index.html` — section reorder (all 5 members: details bar →
  Calendar → remaining tables), all testing tables/cards converted to the
  shared collapsible `<details>` pattern, Paraparan member-header
  normalized (role = Auditor), Arun/Paraparan PH Staff Data wrapped in a
  collapsed section headed "PH Staff Data".
- `web-view/js/calendar/instance.js` — new Leave-detail popup
  (view/edit/delete), leave chip/block click wiring in Month/Week/Day,
  removal of the Leave Coordination list card and its dedicated
  `renderLeaveList()`.
- `web-view/css/calendar.css` — removed CSS scoped only to the removed
  Leave Coordination list; added the `.msc-view-color-dot.leave` accent and
  clickable-cursor/focus styles for leave chips/blocks.
- `web-view/css/components.css` — new shared `.collapsible-section`/
  `.collapsible-summary-text` rules (built on the pre-existing
  `details > summary` styling).
- `web-view/css/ui.css` — `prefers-reduced-motion` rule for the collapsible
  chevron transition.
- `web-view/README.md` — (see below) documents the new Leave-detail popup
  and collapsible-section patterns for future work.

## Ownership

- **Shared member-header structure**: `.member-header > .member-header-info
  > h2 + .role-label + .member-header-lede + .member-header-note`
  (`components.css`). All 5 members now use this identical structure —
  content stays hand-authored per member in `index.html` (no JS-driven
  template), matching the existing "no invented facts" convention; only
  Paraparan's markup was normalized to match.
- **Shared collapsible-section pattern**: native `<details
  class="…-card collapsible-section">` + `<summary class="collapsible-
  summary">` + `<span class="collapsible-summary-text">`, styled in
  `components.css`. Zero JS — expand/collapse, keyboard operability, and
  reset-on-reload all come from the browser's native `<details>` behavior.
- **Leave-detail popup**: owned entirely inside
  `mountScheduleCalendarInstance()` in `web-view/js/calendar/instance.js`
  (`viewLeaveItem`, `closeLeaveViewModal`, `editLeaveItem`,
  `cancelLeaveEdit`, `setLeavePopupMode`, the `leaveUpdateBtn` handler) —
  same file/closure that already owns the Task-detail popup and the Leave
  create form; no new module was created.
- **Embedded Staff Data**: owned entirely by `initTeamScopedStaffPilot()` in
  `web-view/js/staff-data.js` (unchanged) — `index.html` only supplies the
  mount markup and the new collapsible wrapper around it.
- **API**: unchanged. `GET/POST/PUT/DELETE /api/member-leave/{member_key}
  [/{leave_id}]` and `GET /api/staff` (`backend/routers/member_leave.py`,
  `backend/routers/staff.py`) are used exactly as before — no new route.
- **State**: `editingLeaveId` (closure-scoped inside
  `mountScheduleCalendarInstance`, one per member instance, never shared
  across members) tracks whether the Leave popup is in create or edit mode.
  `currentViewLeaveId`/`lastFocusedLeaveTrigger` track the currently-open
  Leave-detail popup, mirroring the existing `currentViewItemId`/
  `lastFocusedTrigger` pattern used by the Task-detail popup.

## How to add a future member section

1. Add the section's markup inside the member's `<div class="tab-panel
   tab-panel--calendar" id="tab-<member>">`, **after** the `.msc-instance`
   calendar mount (never before it — Calendar/Schedule Summary/Priority
   Preview must stay first per the confirmed section order).
2. If it's a "remaining table"-style section, wrap it in the shared
   collapsible pattern (see "How to add a collapsible table" below) so it
   starts collapsed like every other remaining section.
3. Do not create a parallel member-header structure — reuse
   `.member-header > .member-header-info > h2 + .role-label +
   .member-header-lede + .member-header-note` for any new member-level
   introduction content.

## How to add a collapsible table

```html
<details class="member-testing-table-card collapsible-section" data-searchable data-tags="…">
  <summary class="collapsible-summary">
    <span class="collapsible-summary-text">
      <span class="member-testing-table-title">Table N — Title</span>
      <span class="member-testing-table-sub">Short one-line description.</span>
    </span>
  </summary>
  <div class="member-testing-table-scroll">
    <table class="member-testing-table">…unchanged…</table>
  </div>
</details>
```

No `open` attribute → starts collapsed. No JS required — do not add a
per-table click handler; the native `<details>` element already does this.
Use `hr-testing-table-*` classes instead of `member-testing-table-*` only if
matching Mayurika's existing HR-prefixed table family (the CSS already
merges both class families, see `staff-data.css`).

## How to reuse embedded Staff Data on a future member page

```html
<details class="member-testing-table-card collapsible-section" data-searchable data-tags="…">
  <summary class="collapsible-summary">
    <span class="collapsible-summary-text">
      <span class="member-testing-table-title">PH Staff Data</span>
      <span class="member-testing-table-sub">Short description.</span>
    </span>
  </summary>
  <div class="staff-team-scoped-pilot" id="<new-id>-staff-pilot" data-team-code="PH">
    <div class="staff-filter-bar"></div>
    <div class="staff-table-container"></div>
    <div class="kpi-pilot-mount" data-kpi-team="PH" data-kpi-actor="<new-actor-key>"></div>
  </div>
</details>
```

Then add one line to `initStaffDataPilot()` in `web-view/js/staff-data.js`:
`initTeamScopedStaffPilot(document.getElementById('<new-id>-staff-pilot'));`
Do not write a new fetch/render function — `initTeamScopedStaffPilot()` is
shared and team-locked via `data-team-code`.

## Deployment

Static site — no build step. Deploy through the existing Vercel process
(per `index.html`'s own deployment notes) by pushing to `main`; verify
`https://management-aios.vercel.app/` after deploy. Backend is unchanged, so
no backend redeploy is required by this task.

## Rollback

Revert the single commit (or the small set of reviewable commits) covering
`web-view/index.html`, `web-view/js/calendar/instance.js`,
`web-view/css/calendar.css`, `web-view/css/components.css`, and
`web-view/css/ui.css`. No backend/database change exists to roll back.

## Commits

See the final report for actual commit hashes (recorded after the commit
step of this task, per the repository's own "record actual commit hashes"
convention).

## Known limitations

1. **No real-browser validation was performed in this session** — no
   browser-automation tool was available. All Month/Week/Day Leave-click,
   keyboard/focus-trap, responsive-breakpoint, zoom, and reduced-motion
   checks are pending a human (or browser-tool-equipped session) pass. See
   the validation doc §16 for the exact list to walk.
2. `.msc-item-title`/`.msc-item-meta`/`.msc-item-actions` in `calendar.css`
   are now fully unused CSS (only ever shared between the already-removed
   Schedule Item list and the Leave Coordination list this task removed) —
   left in place to avoid touching unrelated CSS; zero user-facing effect.
3. Rajiv has no literal "tables" on his tab — his 4 reference cards were
   wrapped as one collapsible section ("Useful for Day-to-Day Work") rather
   than 4 separate ones, since they read as one cohesive reference panel;
   flagged here in case a future requirement wants finer-grained collapse
   for that block specifically.
4. Backend regression suite was not executed (no installed Python deps / no
   live DB in this sandboxed session) — but zero backend files were
   touched, so its pass/fail state is unchanged by this work.

## One next step

Open the app in a real browser (or hand this to a session with a
browser-automation tool) and walk the STEP 19 regression matrix in the
validation doc — in particular, click a red Leave item in Month, Week, and
Day view for at least one member, and confirm Edit → Cancel returns to
Leave details (not a blank Create form) before treating this as fully
production-verified.
