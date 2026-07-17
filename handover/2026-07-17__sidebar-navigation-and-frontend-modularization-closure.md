# Handover — Sidebar Navigation + Frontend Modularization Closure (2026-07-17)

## Requirement ID

Frontend navigation restructure + modular architecture refactor, as specified in
the 2026-07-17 task brief (see conversation record). Full detail:
`validation/sidebar-navigation-and-frontend-modularization-check-2026-07-17.md`.

## Files created

```
web-view/css/tokens.css
web-view/css/base.css
web-view/css/navigation.css
web-view/css/components.css
web-view/css/calendar.css
web-view/css/staff-data.css
web-view/js/app.js
web-view/js/navigation.js
web-view/js/config.js
web-view/js/staff-data.js
web-view/js/calendar/core.js
web-view/js/calendar/instance.js
validation/sidebar-navigation-and-frontend-modularization-check-2026-07-17.md
handover/2026-07-17__sidebar-navigation-and-frontend-modularization-closure.md (this file)
```

## Files modified

```
web-view/index.html   (8,224 -> 1,867 lines: inline CSS/JS replaced by
                        <link>/<script type="module"> references; top member
                        tabs removed; new .app-sidebar member navigation added)
```

## Architecture tree

```
web-view/
  index.html
  css/
    tokens.css          design tokens
    base.css             reset + topbar
    navigation.css       top tab bar + search strip + NEW application sidebar
    components.css       shared cards/badges/tables (Root AIOS, member panels, File Map)
    calendar.css         calendar shell, Month/Week/Day, Schedule Summary, forms, leave
    staff-data.css       Staff Data table/drawer/KPI-pilot styling
  js/
    app.js                single bootstrap entry point
    navigation.js          top-tab + sidebar controller, cross-panel search
    config.js               calendar API base URLs
    staff-data.js           Staff Data panel (API + rendering)
    calendar/
      core.js                pure date/format/layout/domain helpers
      instance.js             shared per-member calendar factory (render/CRUD/reports)
```

## Entry point

`web-view/index.html` loads exactly one script:
`<script type="module" src="./js/app.js"></script>`. `app.js` imports and calls
`initNavigation()`, `initAllScheduleCalendars()`, `initStaffDataPilot()` once,
after `DOMContentLoaded` — the same order the original three inline `<script>`
blocks ran in.

## Module ownership

| Concern | Owning file |
|---|---|
| Design tokens | `css/tokens.css` |
| Top nav + application sidebar chrome | `css/navigation.css`, `js/navigation.js` |
| Calendar presentation (all views) | `css/calendar.css` |
| Calendar behavior (all views, CRUD, reports) | `js/calendar/instance.js` |
| Calendar pure helpers | `js/calendar/core.js` |
| Calendar API endpoints | `js/config.js` |
| Staff Data | `css/staff-data.css`, `js/staff-data.js` (self-contained, own API base) |
| Shared non-calendar UI components | `css/components.css` |

## How to add a new member safely

1. Add the member's `.msc-instance` container + panel markup to `index.html`
   (copy an existing member panel's structure — do not create per-member JS/CSS).
2. Add one `<button class="app-nav-btn" data-tab="...">` to `.app-sidebar` in
   `index.html`, in the desired position (order is purely markup order — no
   config list to update elsewhere).
3. `js/navigation.js`, `js/calendar/instance.js`, and `js/staff-data.js` need
   **no changes** — `initAllScheduleCalendars()` already mounts every
   `.msc-instance` on the page, and `navigation.js` already wires every
   `.app-nav-btn` it finds via `querySelectorAll`.

## How to modify calendar UI safely

- Visual/CSS changes: edit `web-view/css/calendar.css` only.
- Behavior changes (render/CRUD/drag/resize): edit
  `web-view/js/calendar/instance.js`. It is one closure-based module by design
  (see validation §7) — do not split a function out into another file unless
  you also thread its shared state (`items`, `leaveItems`, `state`) through
  explicitly; do not expose that state on `window`.
- New pure helpers (date math, formatters, domain transforms with no DOM/API
  access): add to `js/calendar/core.js` and `export` them; import by name in
  `instance.js`.

## How to modify Schedule Summary safely

Schedule Summary lives entirely inside `js/calendar/instance.js`
(`renderSummaryStats`, `loadDailySummary`, `loadWeeklySummary`,
`loadMonthlySummary`, `loadSummaries`) and its markup is inside that same
file's HTML template string (search for `Schedule Summary` / `msc-summary-`).
This refactor proved that block byte-equivalent to the pre-refactor source
(validation §10) — treat it as frozen: any future change to labels, row
order, formulas, percentage formatting, N/A behavior, leave-deduction fields,
comparison behavior, or API fields requires the same before/after equivalence
discipline this closure used (git-show the prior commit, diff the relevant
function bodies line-by-line, not just eyeball it).

## Deployment path

Existing Vercel static-frontend process (see
`handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md`).
No new build step, framework, or bundler was introduced — `web-view/` remains a
plain static asset directory; the only change relevant to hosting is that it
now serves `css/*.css` and `js/**/*.js` alongside `index.html`, all referenced
by relative `./` paths (verified to resolve correctly via a local static
server — see validation §13).

## Rollback

Single-commit-pair rollback: `git revert <modularization-commit>` (or
`git checkout <pre-refactor-hash> -- web-view/`) restores the monolithic
`index.html` and removes the new `css/`/`js/` directories in one step — the
index references and the modular files are changed together, so a partial
rollback (reverting `index.html` but leaving `css/`/`js/` behind, or vice
versa) is never correct and was avoided by keeping this as one implementation
commit. No backend/database rollback is needed — nothing there changed.

## Commit hashes

- `434f6b4` — "Move member navigation to sidebar and modularize frontend
  assets" (index.html + css/ + js/)
- Evidence commit lands immediately after this file (see `git log --oneline -3`).

## Blockers

None. The task's navigation-move and modularization steps were interdependent
(the sidebar markup only makes sense alongside the module-script rewrite of
`index.html`'s `<head>`/`<body>` boundaries), so — per the task's own fallback
instruction — they landed as one implementation commit rather than two.

## Queryability result

This handover plus
`validation/sidebar-navigation-and-frontend-modularization-check-2026-07-17.md`
document the requirement, exact sidebar order, old/new structure, module
responsibility map, CSS load order, JS dependency graph, Schedule Summary
equivalence proof, and static checks — LLM-queryable per §11.1.

## PASS/FAIL

**PASS** (static + structural + byte-equivalence verified). Live browser and
Vercel deployment validation were not run in this environment — see the
validation file's Known Limitations.

## One next step

Deploy via the existing Vercel process and, in a real browser: verify all 6
sidebar entries switch panels correctly with no console errors (no 404s, no
MIME errors, no uncaught promise rejections), spot-check one full member's
calendar (task CRUD, drag/resize, leave display) plus Staff Data, and confirm
the Schedule Summary section renders identically to the pre-refactor build.
