# Handover — Google-Calendar Pixel-Close Calendar Redesign (2026-07-20)

## Requirement ID

Google-Calendar-style calendar workspace redesign, requested 2026-07-20
(in-conversation task spec, not a registered CLAUDE.md source — this is a
UI/UX implementation task, not a management-intelligence claim, so no
Source ID applies).

## Files changed

- `web-view/css/calendar.css` — toolbar, sidebar, mini-calendar, Month grid,
  Week/Day time-grid, event/chip, and current-time styling.
- `web-view/css/tokens.css` — new calendar-scoped design tokens (see below).
- `web-view/js/calendar/core.js` — one constant change (`TG_ROW_HEIGHT_PX`
  48px → 56px) plus its explanatory comment.
- `web-view/js/calendar/instance.js` — three additive accessibility
  attributes (`aria-current="date"` ×2, `aria-hidden="true"` ×1); no
  render-logic, state, or API-call changes.

No other file was modified. `web-view/index.html`,
`web-view/js/app.js`, `web-view/js/config.js`, `web-view/js/navigation.js`,
`web-view/js/staff-data.js`, `backend/`, and `database/` are untouched. The
protected path `member-aios/mayurika-hr/staff-data/` was not touched,
inspected, staged, or committed.

Full detail (per-region reasoning, exact before/after values) is in
`validation/google-calendar-pixel-close-ui-check-2026-07-20.md`.

## CSS tokens added

`tokens.css` — `--cal-toolbar-height` (60px), `--cal-toolbar-control-size`
(40px), `--cal-sidebar-width` (248px), `--cal-event-radius` (4px),
`--cal-now-red` (#ea4335), `--cal-canvas-height` (`max(560px, calc(100vh -
var(--header-height) - 300px))`, derivation documented inline). All are
scoped for calendar use only; no existing global token's value changed.

## Renderer changes

Two functions in `instance.js` gained additive attributes only (no tags
added/removed/reordered): `renderMonthView()` (selected-cell
`aria-current`, current-time-line `aria-hidden`) and `renderMiniPicker()`
(selected-cell `aria-current`). `renderTimeGrid()`'s hour-row height now
comes from a raised shared constant in `core.js` rather than a code change
in `instance.js` itself. All render/CRUD/state functions — `renderMonthView`
markup structure, `renderTimeGrid` markup structure, `selectDate`,
`navigateToScheduleItemListForDate`, drag/resize handlers,
`renderSummaryStats` and its loaders — are otherwise byte-identical to
before this task.

## Retained business behavior

Everything the task listed as strictly unchanged was verified unchanged by
direct diff inspection: task/leave CRUD and API payloads, task-vs-leave and
leave-vs-leave conflict rules, leave lifecycle, Schedule Summary markup/
logic/formulas, member isolation (`data-member-key`/`apiBase` per instance),
task-list filtering, Sunday-start calendar-grid week math vs. Monday-start
report week math (kept separate, per an existing 2026-07-14 code comment),
and all existing accessible labels/ARIA state that predates this task.

## Deliberately excluded Google features

Per the task's branding boundary: no Google logo, Google Calendar logo,
Google account/avatar control, Google proprietary icons, or Meet/Tasks/Keep/
Maps/Contacts side-panel branding. Also excluded because they were not
previously supported and adding them would be new functionality beyond a
visual redesign: half-hour timeline subdivisions, a live timezone/GMT label
in the time-gutter header, and an animated (vs. instant `display:none`)
sidebar-collapse transition.

## Deployment

**Not deployed.** Per an explicit scoping decision made with the requester
before implementation began (no browser-automation tool was available in
this session to produce Step 28-30's required screenshot evidence), this
session's output stops at implementation + static validation. The requester
will personally verify the redesign visually (locally or via a preview
deploy they trigger) before this is pushed to `origin/main` or deployed
through the existing Vercel process. **No commit, push, or deploy has been
made in this session.**

## Rollback

Trivial — this is an uncommitted working-tree change touching exactly four
files, all listed above. `git checkout -- web-view/css/calendar.css
web-view/css/tokens.css web-view/js/calendar/core.js
web-view/js/calendar/instance.js` fully reverts it with no residual state
(no new files, no schema/data changes, no dependency changes). Once/if
committed, reverting is a single `git revert` of that commit.

## Commit hashes

None — not yet committed. Working tree was at `2f06d4a` (main, verified
clean apart from the pre-existing untracked protected folder) when this
task began.

## Queryability

This handover document and the paired validation document are both
Markdown, plain-English, and reference exact file paths / line ranges /
before-after values throughout — answerable by a fresh reader without
needing this conversation's context, satisfying the LLM-queryable
documentation standard (CLAUDE.md §11.1) for this piece of work.

## Limitations

- No real-browser pixel-comparison screenshots were captured (see
  validation doc's AMBER verdict) — this is a code-level, not
  visually-verified, redesign as of this handover.
- The `--cal-canvas-height` formula's ~300px reserved-space estimate is a
  documented approximation (banner/notes text height varies slightly by
  member tab's Rajiv-note flag), not a pixel-exact measurement — flagged as
  a candidate to double-check once real screenshots are available.
- Day view's larger header (`.msc-day-grid .msc-tg-daycol-head`) is a CSS
  descendant-selector override on top of markup shared with Week view; if a
  future change ever renders Week and Day through anything other than their
  current separate `.msc-week-grid`/`.msc-day-grid` mount containers, this
  override would silently stop applying.

## One next step

Requester captures screenshots at the six required viewports (1920×1080,
1600×900, 1440×900, 1366×768, tablet, mobile) comparing this redesign
against Google Calendar and against the six reference screenshots supplied
with the original task, and reports back — either confirming AMBER → PASS,
or flagging specific regions (toolbar height, sidebar width, Month cell
sizing, Week/Day hour height, all-day row, current-time line) for a
follow-up pass.

## PASS / FAIL

**PASS** for implementation, scope-boundary compliance, and static
validation. See the paired validation document's AMBER verdict for the
outstanding visual-verification item, which is explicitly deferred to the
requester per their own choice earlier in this task, not a defect in the
implementation work itself.
