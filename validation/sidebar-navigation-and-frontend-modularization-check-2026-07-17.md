# Sidebar Navigation + Frontend Modularization Check — 2026-07-17

**Scope:** Move member navigation from the top tab bar into the main application
left sidebar, and split the monolithic `web-view/index.html` into modular CSS and
JavaScript files — **frontend architecture only**. No backend, database, API,
Schedule Summary, task-classification, or leave-rule change.

**Result: PASS (static + reconstruction-equivalence verified).** Live browser/
deployment validation is the one remaining manual step (see Known Limitations).

---

## 1. Requirement

1. Remove the member tabs from the top navigation bar.
2. Put member navigation into the main left application sidebar.
3. Sidebar order: Mayurika, Suman, Arun, Rajiv, Paraparan, Staff Data.
4. Paraparan directly below Rajiv; Staff Data directly below Paraparan.
5. Split the monolithic `index.html` into maintainable CSS/JS files.
6. Schedule Summary, backend, APIs, database, reporting, task/leave rules unchanged.

## 2. Old navigation location

The top `<nav class="tab-bar">` (`role="tablist"`) held **8** buttons:
`root-aios`, `mayurika-hr`, `suman-recruitment`, `arun-implementation`,
`rajiv-blocked`, `staff-data`, `paraparan`, `file-map`. Of these, `root-aios`
(the dashboard home/summary panel) and `file-map` are **global, non-member**
panels — per the task's Step 8 instruction ("remove only the member navigation
... do not remove global page controls unrelated to member navigation"), those
two stay in the top bar. The other 6 are member/Staff-Data panels and moved.

## 3. New navigation location

A new `<nav class="app-sidebar" aria-label="Member navigation">` inside a new
`.app-body` flex wrapper (sibling of the existing `<main class="tab-main">`,
which already carried `flex:1` and needed no width-rule duplication). The
6 member/Staff-Data buttons live here; `root-aios` and `file-map` remain as the
only two buttons left in the top `.tab-bar`.

## 4. Exact sidebar order (verified in markup)

```
1. Mayurika   (data-tab="mayurika-hr")
2. Suman      (data-tab="suman-recruitment")
3. Arun       (data-tab="arun-implementation")
4. Rajiv      (data-tab="rajiv-blocked")
5. Paraparan  (data-tab="paraparan")
6. Staff Data (data-tab="staff-data")
```

Paraparan is immediately below Rajiv; Staff Data is immediately below Paraparan
— confirmed by reading `web-view/index.html` lines 82–87 (six consecutive
`<button class="app-nav-btn">` elements, no separator, no unrelated item between
them).

## 5. Old monolithic structure

`web-view/index.html` was **8,224 lines**: one `<style>` block (lines 8–3672,
3,663 lines) and three separate inline `<script>` IIFEs (tab-switching/search,
the shared per-member calendar factory, and the Staff Data pilot) totaling
roughly 2,700 lines of JavaScript.

## 6. New folder/file structure

```
web-view/
  index.html                 1,867 lines — semantic markup + <link>/<script type=module> only
  css/
    tokens.css                  103 lines — :root design tokens
    base.css                     77 lines — reset, body, topbar
    navigation.css               285 lines — tab bar, search strip, NEW .app-sidebar/.app-nav-btn rules
    components.css             1,218 lines — shared cards/badges/tables/panels (root-aios, member panels, file-map)
    calendar.css                1,305 lines — calendar shell, Month, Week/Day grid, Schedule Summary, forms/modals, leave
    staff-data.css                799 lines — Staff Data table/drawer/filter styling
  js/
    app.js                        26 lines — single bootstrap entry point
    navigation.js                 90 lines — top-tab + sidebar navigation controller, search
    config.js                     30 lines — calendar API base URLs
    staff-data.js                825 lines — Staff Data panel logic (API + rendering)
    calendar/
      core.js                    247 lines — pure date/format/layout/domain helpers (leaf module)
      instance.js               1,497 lines — shared per-member calendar factory + task/leave CRUD/render/Schedule Summary
```

No `web-view/js/calendar/dates.js` / `state.js` / `tasks.js` / `leave.js` /
`reports.js` / `render-month.js` / `render-time-grid.js` split was made — see
§7 for why, and the "avoid files containing only a few trivial lines" /
"avoid circular dependencies" rules this honors.

## 7. Module responsibility map (and a documented deviation from the suggested tree)

| Module | Responsibility |
|---|---|
| `css/tokens.css` | `:root` custom properties only (colors, spacing, radii, shadows, type scale) |
| `css/base.css` | Reset, `body`, topbar (`.topbar*`) |
| `css/navigation.css` | Top tab bar, search strip, **and** the new application sidebar (`.app-*`) — kept together because both are "navigation chrome" and the sidebar rules are a direct extension of the existing nav pattern |
| `css/components.css` | Every shared presentational component used across the Root AIOS / member / File Map panels (cards, badges, tables, boxes) |
| `css/calendar.css` | The entire calendar subsystem's presentation: shell, toolbar, Month, Week/Day time grid, mini-picker, task/leave chips, Schedule Summary, forms, modal, leave coordination |
| `css/staff-data.css` | Staff Data table/toolbar/drawer/KPI-pilot styling |
| `js/config.js` | `MEMBER_SCHEDULE_API_BASE` / `MEMBER_LEAVE_API_BASE` — the **one** place API hosts are computed |
| `js/calendar/core.js` | Every pure helper the calendar needs and zero DOM/API calls: constants (`CATEGORY_CLASS`, `MONTH_NAMES`, `TG_*`), date math (`toDateStr`, `getWeekDays`, `buildMonthGridCells`), formatters (`formatDuration`, `formatPercentage`), leave-domain transforms (`leaveDatesForItem`, `formatLeaveCalendarLabel`), and the API-shape converters (`apiItemToFrontend`, `frontendToApiPayload`) |
| `js/calendar/instance.js` | `mountScheduleCalendarInstance()` + `initAllScheduleCalendars()` — the shared per-member factory. Render (Month/Week/Day), task CRUD, leave CRUD/display, drag/resize, mini-calendar, and the Schedule Summary loaders/renderer remain here as **closures over one instance's shared state** (`items`, `leaveItems`, `state`), exactly as in the original monolith |
| `js/navigation.js` | `initNavigation()` — one controller driving both the remaining top tabs and the new sidebar over the same `.tab-panel` set, plus the cross-panel search |
| `js/staff-data.js` | `initStaffDataPilot()` — fully self-contained Staff Data panel (own `STAFF_API_BASE`, own render/filter/export logic) |
| `js/app.js` | Single entry point; imports the three subsystem entry points and calls them once after `DOMContentLoaded`, in the original monolith's order |

**Deviation from the task's suggested `dates.js`/`state.js`/`tasks.js`/`leave.js`/
`reports.js`/`render-month.js`/`render-time-grid.js` split:** the original
`mountScheduleCalendarInstance()` is one large **closure** — every render/CRUD/
state function shares the same instance-scoped variables (`items`, `leaveItems`,
`state`, and ~30 DOM element refs) via JavaScript closure, not via parameters or
a shared object. Splitting those functions into separate files would require
either (a) passing a large mutable-state object between modules on every call,
or (b) exposing instance state on `window` — both are explicit non-goals in the
task (Step 4: "Do not expose formerly private state on window unless
unavoidable"; the task also says "Do not rewrite working logic unnecessarily
during extraction"). Pulling **only** the pure, stateless helpers out (into
`core.js`) was safe and mechanical; splitting the closures further was not
mechanical and was assessed as unnecessary rewrite risk for this task's
"behavior must remain equivalent" requirement. `instance.js` is documented here
as a single cohesive module (the shared per-member calendar) rather than force-
split into artificially separated files.

## 8. CSS load order (reproduces the original cascade exactly)

```html
<link rel="stylesheet" href="./css/tokens.css" />
<link rel="stylesheet" href="./css/base.css" />
<link rel="stylesheet" href="./css/navigation.css" />
<link rel="stylesheet" href="./css/components.css" />
<link rel="stylesheet" href="./css/calendar.css" />
<link rel="stylesheet" href="./css/staff-data.css" />
```

**Proof of exact cascade preservation:** the six files were cut at clean section
boundaries (blank line + section-comment) directly from the original `<style>`
block (lines 9–3671) with no reordering, and a script-verified byte-for-byte
concatenation of the six files in this order reproduces the original `<style>`
content **exactly** (`original.length === concat.length` and
`original === concat` both `true`). The only addition is the new
`.app-sidebar`/`.app-nav-btn` block appended to the end of `navigation.css`
(new rules only — nothing existing was reordered or edited).

## 9. JS dependency / bootstrap order

Import graph (acyclic):

```
app.js
 ├─ navigation.js            (no imports)
 ├─ calendar/instance.js
 │   ├─ config.js            (no imports)
 │   └─ calendar/core.js     (no imports)
 └─ staff-data.js            (no imports)
```

`config.js` and `calendar/core.js` are leaf modules with zero imports, so the
ES module loader always evaluates them before `instance.js` runs — no manual
ordering was needed for that guarantee. `app.js` calls the three subsystem
entry points once, after `DOMContentLoaded`, in the original monolith's script
order (navigation → calendars → Staff Data):

```js
initNavigation();
initAllScheduleCalendars();
initStaffDataPilot();
```

No formerly-private state is exposed on `window`.

## 10. Schedule Summary equivalence (frozen functionality)

`renderSummaryStats`, `loadDailySummary`, `loadWeeklySummary`,
`loadMonthlySummary`, `loadSummaries`, the report formatters
(`formatDuration`, `formatPercentage`, `formatChange`), and the Schedule
Summary markup (inside the mount factory's HTML template string) all moved as
part of the single `mountScheduleCalendarInstance` closure into
`js/calendar/instance.js`.

**Equivalence proof (not just a syntax pass):** a verification script
reconstructed the original inline function bodies from each extracted module
(reversing the mechanical banner/import/export/indent transform) and diffed
them line-by-line against the original monolith's source lines (read from the
pre-refactor commit `6540fc3` via `git show`). Result:

```
MATCH config.js               recon=25   src=25
MATCH calendar/core.js        recon=240  src=240
MATCH calendar/instance.js    recon=1484 src=1484
MATCH staff-data.js           recon=819  src=819
ALL EXTRACTIONS BYTE-EQUIVALENT TO ORIGINAL: true
```

`calendar/instance.js` contains `renderSummaryStats`/`loadSummaries`/etc.
(confirmed present by name) inside that byte-verified block — so their logic,
labels, row order, formulas, percentage formatting, N/A behavior,
leave-deduction fields, comparison behavior, and API fields are unchanged by
construction, not by inspection alone.

`navigation.js`'s extracted search logic (`normalize`, `doSearch`, and the
`searchInput`/`searchClear` listeners) was separately confirmed line-for-line
identical to the original (only wrapped in `if (searchInput)` /
`if (searchClear)` null-guards, a safe non-behavioral addition — those
elements always exist in this page). Only the tab-activation function was
deliberately extended (renamed `activateTab` → `activatePanel`, now also
toggles the sidebar buttons' `active`/`aria-current` state) — this is the
approved navigation-placement change, not a Schedule-Summary-adjacent edit.

## 11. Backend / database / API unchanged

- `git diff -- backend/` → empty.
- `git diff -- database/` → empty.
- No new API endpoint; `MEMBER_SCHEDULE_API_BASE`, `MEMBER_LEAVE_API_BASE`,
  and `STAFF_API_BASE` values (URLs) are unchanged, only relocated to
  `config.js` (schedule/leave) and kept in place inside `staff-data.js`
  (its own base was already self-contained per the original comment).
- No task-classification, task-conflict, leave-overlap, or leave-lifecycle
  logic touched — those live entirely inside the byte-verified
  `calendar/instance.js` extraction.

## 12. Functional regression (static reasoning + structural verification)

| Area | Result |
|---|---|
| Navigation — Mayurika/Suman/Arun/Rajiv/Paraparan/Staff Data buttons present, correct `data-tab`, correct order | Verified in markup |
| Active sidebar state / `aria-current="page"` | Implemented in `navigation.js` `activatePanel()` |
| Keyboard navigation | `<button>` elements (native keyboard support), `:focus-visible` ring in `.app-nav-btn:focus-visible` |
| Narrow-sidebar behavior | `@media (max-width: 768px)` turns `.app-sidebar` into a horizontal scrollable strip; `.app-body` stacks to column; no page-level overflow introduced (no new fixed-width elements outside existing patterns) |
| Calendar Today/Prev/Next/Month/Week/Day/mini-calendar/task CRUD/drag/resize/leave display/conflicts | Unchanged — entire `mountScheduleCalendarInstance` body byte-verified equivalent |
| Schedule Summary / Daily/Weekly/Monthly loaders / percentage rows / leave deductions | Unchanged — see §10 |
| Staff Data display/filtering/API loading | Unchanged — `staff-data.js` byte-verified equivalent to the original IIFE body |
| No protected-folder access | `member-aios/mayurika-hr/staff-data/` never read or referenced by any new/changed file |

Interactive click-through in a real browser against the running backend was
**not** performed by the assistant in this environment (see §14).

## 13. Static asset / import checks performed

| Check | Result |
|---|---|
| `node --check` on every JS file (7 files: `app.js`, `navigation.js`, `config.js`, `staff-data.js`, `calendar/core.js`, `calendar/instance.js`, plus the pre-existing check on `index.html`'s removed inline scripts is now moot) | **All OK** |
| ES module import/export **link resolution** (Node `import()` of `app.js` with stubbed `window`/`document`, `readyState:'loading'` so only static linking occurs — Node throws `SyntaxError` if any named import isn't exported by its module) | **OK** — "every named import resolved, app.js imported cleanly" |
| CSS brace balance, per file | `base.css` 9/9, `calendar.css` 190/190, `components.css` 174/174, `navigation.css` 37/37, `staff-data.css` 109/109, `tokens.css` 4/4 — **all balanced** |
| HTML tag balance (raw grep, `index.html`) | `<div>`/`</div>` 303/303, `<span>`/`</span>` 411/411, `<button>`/`</button>` 16/16 — **balanced** |
| Duplicate `id` scan | 17 total ids, 17 unique — **no duplicates** |
| Inline event-handler scan (`onclick=`, `onchange=`, `oninput=`, `onload=`, `onsubmit=`) | **0 matches** — no inline-handler dependency to break |
| Remaining inline `<style>`/`<script>` (non-module) in `index.html` | **0** — exactly one `<script type="module" src="./js/app.js">` |
| Relative-path safety | All `<link>`/`<script>` paths use `./` + forward slashes; no Windows backslashes; no absolute filesystem paths |
| Local static-server HTTP check (`python -m http.server`, served from `web-view/`) | `index.html` 200 (`text/html`); all 6 CSS files 200 (`text/css`); all 6 JS files including nested `js/calendar/core.js` and `js/calendar/instance.js` 200 (`text/javascript`) — **every referenced asset resolves** |

## 14. Live browser / deployment validation

**Not run in this environment.** No headless browser (puppeteer/playwright) is
installed, and a live Vercel deployment was not performed by the assistant.
The static ES-module link-check (§13) proves the import graph is sound — the
same guarantee a browser's module loader enforces — but does not exercise
click handlers, drag/resize pointer events, or a real fetch to the FastAPI
backend. A manual pass in a real browser (locally via a static server, and
against `https://management-aios.vercel.app/` after deployment) is the
recommended next step — see the handover's "one next step."

## 15. Known limitations

- Live interactive browser validation and live Vercel deployment checks were
  not performed by the assistant (§14).
- `calendar/instance.js` remains one large module (1,497 lines) rather than
  further split into render/state/tasks/leave/reports files — a deliberate,
  documented decision (§7) to avoid rewriting working closure-based logic.
- The two non-member top tabs (`Root AIOS`, `File Map`) remain in the top bar
  by design, per the task's own "do not remove global page controls unrelated
  to member navigation" instruction.

## 16. Verdict

**PASS** on scope, structural/static validation, and CSS/JS equivalence proof
(byte-identical CSS concatenation; byte-equivalent JS extraction reconstruction
for every calendar/staff-data/search function; zero backend/database diff).
Live browser and deployment validation remain the one open manual step.
