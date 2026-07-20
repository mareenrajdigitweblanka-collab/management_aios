# Google-Calendar Pixel-Close UI Check — 2026-07-20

## Requirement

Redesign the Management AIOS calendar workspace (Month/Week/Day views, inside
the existing member calendar tabs) so it looks and behaves as closely as
practical to Google Calendar, without changing the database architecture,
backend, API contracts, task logic, leave logic, reporting, or Schedule
Summary. Scope is the calendar workspace only — application header, member
navigation sidebar, member panels, and existing forms below the calendar are
retained unchanged.

## Screenshots used as reference

Six screenshots were supplied directly in the task by the requester (not
fetched from any external source): current Management AIOS Month/Week/Day
views (`management-aios.vercel.app`, commit `d649652`, branch
`individual-aios`) paired with Google Calendar's own Month/Week/Day views for
the same week (July 2026). These were used as the visual reference for this
redesign; they are not stored as files in this repository.

## UI-only boundary

Confirmed by `git diff --stat` (see §"Diff review" below): only these four
files changed —

- `web-view/css/calendar.css`
- `web-view/css/tokens.css`
- `web-view/js/calendar/core.js`
- `web-view/js/calendar/instance.js`

No changes to `backend/`, `database/`, `database/migrations/`,
`web-view/index.html`, `web-view/js/app.js`, `web-view/js/config.js`,
`web-view/js/navigation.js`, or `web-view/js/staff-data.js`. The protected
path `member-aios/mayurika-hr/staff-data/` was not touched, inspected for
modification, staged, or committed — it remains an untracked directory
exactly as found in the pre-work `git status`.

## Before/after architecture

The calendar has no static markup in `index.html` — every calendar DOM node
(toolbar, internal sidebar, mini-calendar, Month/Week/Day grids, all-day row,
time gutter, Schedule Summary, forms, modal) is built as one HTML template
string and injected via `container.innerHTML` inside
`mountScheduleCalendarInstance()` in `web-view/js/calendar/instance.js`
(lines 35-220), mounted once per member tab (5 instances: Mayurika, Suman,
Arun, Rajiv, Paraparan) via `initAllScheduleCalendars()`. `core.js` is a pure
leaf module of date/format/layout constants and helpers (no DOM, no state).

This redesign is presentation-only: the shared render functions
(`renderMonthView`, `renderTimeGrid`, `renderMiniPicker`, `renderActiveView`,
`selectDate`, `navigateToScheduleItemListForDate`, drag/resize handlers,
`renderSummaryStats` and its loaders) are unchanged in logic. Two markup-level
JS edits were made, both additive accessibility attributes (no tags added,
removed, or reordered): `aria-current="date"` on the selected Month cell and
selected mini-picker cell, and `aria-hidden="true"` on the current-time line.
One JS layout constant was raised: `TG_ROW_HEIGHT_PX` 48px → 56px in
`core.js`, within Google Calendar's own ~48-64px hour-row range; every
consumer of that constant (row rendering, event top/height positioning, drag
delta, resize delta, current-time line position) reads the same single
constant, so no other file needed a corresponding change.

## Design tokens added (`tokens.css`)

A new block inside the existing `:root` (Section "Calendar workspace
tokens"), scoped for use by `calendar.css` only:

| Token | Value | Purpose |
|---|---|---|
| `--cal-toolbar-height` | `60px` | Toolbar min-height (Step 6: 56-64px range) |
| `--cal-toolbar-control-size` | `40px` | Circular icon-button diameter |
| `--cal-sidebar-width` | `248px` | Internal calendar sidebar width (Step 7: 220-256px range) |
| `--cal-event-radius` | `4px` | Shared radius for timed event blocks |
| `--cal-now-red` | `#ea4335` | Current-time line/dot color |
| `--cal-canvas-height` | `max(560px, calc(100vh - var(--header-height) - 300px))` | Month/Week/Day canvas height — see derivation below |

**`--cal-canvas-height` derivation** (Step 5 requires this be documented, not
hardcoded blind): `--header-height` is a fixed, sticky 56px at every
breakpoint (confirmed unchanged by the existing 2026-07-17
`--scroll-target-offset` token comment). Add `--cal-toolbar-height` (60px) +
~120px for the banner/instructional paragraphs and API-status line that sit
above the calendar card (`.msc-banner`/`.msc-note` in `calendar.css`) + ~64px
for `.tab-panel`'s own top+bottom padding (`navigation.css`) ≈ 300px total
reserved. The `max(560px, …)` floor prevents the canvas from collapsing to an
unusably thin strip on short viewports; it is overridden back to natural
content height under the existing `max-width: 640px` mobile breakpoint (see
below), where a vh-locked canvas would be too cramped for stacked chips.

No existing global color/spacing token was changed — task/leave semantic
colors (`--amber`, `--draft`, `--pass`, category chip colors) are untouched,
preserving their business meaning per Step 10.

## Toolbar result

- `.msc-cal-toolbar` given `min-height: var(--cal-toolbar-height)` (60px,
  within the requested 56-64px range) and slightly increased padding.
- Circular icon buttons (sidebar toggle, prev, next) enlarged 34px → 40px via
  `--cal-toolbar-control-size`.
- "Today" pill: padding increased, already rounded (999px) from the prior
  2026-07-17 pass — unchanged shape, larger touch target.
- Date-range heading: font-size raised from a raw `1.15rem` to the existing
  `--font-2xl` token (1.35rem), weight reduced from 700 to 500 (Google's
  toolbar title is medium-weight, not bold) — more prominent per Step 6.
- View switcher (Month/Week/Day) was already right-aligned, compact, and
  segmented from the 2026-07-13/2026-07-17 passes — unchanged.
- All existing accessible labels (`aria-label`, `title`, `aria-pressed`,
  `aria-expanded`) retained verbatim; no navigation event handler changed.

## Calendar sidebar expanded result

- Width increased 220px → `var(--cal-sidebar-width)` (248px), within the
  requested 220-256px range.
- Mini-calendar's own border removed (`border: none`) so it no longer reads
  as a second nested card inside the sidebar card — matches Google's
  borderless mini-calendar.
- "Create task" button: padding and font-size increased slightly for a more
  prominent primary action; same scroll/focus behavior as before (Phase-1
  shortcut to the persistent form, not a popup — unchanged).
- Legend (Scheduled Task / Unscheduled Task) unchanged — no leave legend was
  present before this task and none was added (Step 7: "leave legend only if
  already required" — it was not).

## Calendar sidebar collapsed result

Unchanged mechanism: `sidebarToggleBtn` click toggles `sidebarCollapsed`,
which toggles `.msc-sidebar.collapsed` → `display: none`. This already
satisfies "internal calendar sidebar fully hidden" (Step 7's first target).
Because `.msc-calendar-main` is a flex row with the sidebar at `flex: 0 0
var(--cal-sidebar-width)` and the content area at `flex: 1`, removing the
sidebar from layout via `display: none` already lets `.msc-calendar-content`
expand into the freed space with no additional CSS — verified by reading the
flex layout, not by a visual screenshot (see "Known differences" below for
what remains unverified). The toolbar's sidebar-toggle button is unaffected
by the sidebar's own collapsed state (it lives in the toolbar, not the
sidebar) and remains reachable. `aria-expanded` on the toggle button was
already wired (2026-07-14) and is untouched.

## Main canvas width result

No max-width or fixed width was ever applied to `.msc-calendar-shell` /
`.msc-calendar-card` — the calendar already expands to fill
`.tab-panel`'s available width (1240px `max-width`, centered only when the
viewport exceeds `sidebar-width + content-max-width`, per the existing
2026-07-17 documented math in `navigation.css`). This redesign does not
change `.tab-panel`'s width formula, `--sidebar-width`, or
`--sidebar-collapsed-width` — the previously-approved shared width
calculations are untouched.

## Month grid result

- `.msc-cal-grid.active` now uses `grid-template-rows: auto repeat(6,
  minmax(0, 1fr))` with `height: var(--cal-canvas-height)`, so the six week
  rows share the available canvas height evenly instead of each being a
  fixed 92px regardless of viewport (Step 5/9).
- `.msc-cal-cell` min-height changed from a fixed `92px` to `0` (rows are now
  sized by the grid, not the cell), with `overflow: hidden` added as a
  safety net — the existing `MAX_CAL_CHIPS = 2` cap in `instance.js` already
  bounds how many chips render per cell, so this is a defensive limit, not
  the primary truncation mechanism.
- `.msc-cal-daynum` repositioned from horizontally-centered
  (`margin: 2px auto 4px`) to top-left (`margin: 2px 0 4px`), matching
  Google's top-left date-number placement; the circular "today" background
  treatment is unchanged.
- Sun-Sat headings, thin hairline borders, `other-month` muting, and the
  `selected` cell's accent outline are all unchanged from the existing
  implementation, which already matched most of this step.
- Under the existing `max-width: 640px` breakpoint, `.msc-cal-grid.active`
  reverts to `height: auto; grid-template-rows: auto` and `.msc-cal-cell`
  keeps its prior fixed `62px` min-height (with `overflow: visible`
  restored) — the vh-based canvas is deliberately desktop/tablet-only so
  mobile Month cells are not squeezed by a floor computed for a much larger
  viewport.
- Date-cell click behavior (`navigateToScheduleItemListForDate`,
  actionable-only cells, keyboard activation) is byte-for-byte unchanged.

## Month event result

The existing Month task chips (`.msc-cal-chip`) already matched most of
Step 10's target before this task: `display: block`, 4px radius, compact
padding, single-line with ellipsis overflow, hover brightness filter, and a
`focus-visible` ring. No chip color was changed — Scheduled Task
(amber-tinted), Unscheduled Task (pass/green-tinted), and Leave (purple/
`--draft`) retain their existing category-driven colors per Step 10's
explicit instruction not to recolor semantic categories to a single Google
blue.

## Month overflow result

`.msc-cal-chip-more` ("+N more") already read as a plain text link (no
button background) before this task; a `:hover` rule was added
(`text-decoration: underline`, darker text) since none previously existed.
Its existing `focus-visible` ring (shared selector with `.msc-cal-chip`) and
its unchanged click handler (`navigateToScheduleItemListForDate`, task-only
count — leave never contributes) are preserved.

## Week header result

- `.msc-tg-daycol-head` font-size raised .72rem → .78rem; the "today" date
  badge (`.msc-tg-daycol-head.today .msc-tg-daynum`) enlarged 20px → 22px.
- The header row and all-day row are rendered as siblings *before*
  `.msc-tg-scroll` (which wraps only the hour-grid body) — they were already
  outside the scrolling container prior to this task, so they are already
  effectively "sticky" (always visible while the timeline scrolls) without
  needing `position: sticky`. This existing structural fact satisfies Step
  12's sticky-header requirement.
- Week boundary calculation (`getWeekStart`, Sunday-start for the calendar
  grid; `getReportWeekStart`, Monday-start for reports — deliberately kept
  separate per an existing 2026-07-14 code comment) was not touched.

## Week timeline result

- Shared `renderTimeGrid()` hour-row height raised 48px → 56px via the single
  `TG_ROW_HEIGHT_PX` constant (see "Before/after architecture" above) — no
  duplicated Week-only or Day-only layout code was introduced.
- Hairline hour lines, fixed 56px gutter column, `formatHourLabel()` labels
  ("7 AM" etc.), full 24-hour scroll range, and the existing
  `TG_DEFAULT_SCROLL_HOUR = 7` initial-scroll behavior are all unchanged.
- Half-hour subdivisions were **not** added — they were not present before
  this task ("where currently supported" in the task's own wording; adding
  them would be new rendering logic, out of this redesign's scope).
- `.msc-tg-scroll`'s `max-height` changed from a fixed `480px` to
  `var(--cal-canvas-height)`, and a subtle themed scrollbar
  (`scrollbar-width: thin` + WebKit scrollbar rules) was added so scrolling
  stays discoverable rather than auto-hidden.

## Day header result

Day view reuses the identical `renderTimeGrid()` markup as Week (single-item
`days` array) — per Step 15's explicit instruction not to duplicate Week/Day
logic, no JS branch was added for Day. Instead, `.msc-day-grid
.msc-tg-daycol-head` (a pure CSS descendant-selector override scoped to the
Day view's own mount container) enlarges the date header to `1.05rem` and its
"today" circle to 40px — visually distinct from Week's more compact header
without touching the shared JS renderer.

## Day timeline result

Identical hour-height token, gridline style, event positioning math, and
current-time calculation as Week (enforced structurally, since both call the
same `renderTimeGrid()` function) — satisfies Step 15's "one shared hour-
height token" / "same event positioning calculations" / "same current-time
calculation" requirements by construction, not by parallel maintenance.

## All-day row

`.msc-tg-allday-row` min-height increased 28px → 32px for readability; label
gutter, row separation border, and horizontal alignment with the timeline's
column grid are unchanged. Full-Day and Multi-Day leave continue to render
here (not as fake timed 08:30-18:00 blocks) — this logic lives in
`renderTimeGrid()`'s leave-filtering code, which was not touched.

## Current-time indicator

Red line + red dot (`::before` pseudo-element) presentation is unchanged in
structure; both now reference the new `--cal-now-red` token
(`#ea4335`, closer to Google's own current-time red) instead of the prior
hardcoded `#ef4444` — a color-only substitution. `aria-hidden="true"` was
added to the line element (previously missing) per Step 26. Position
calculation, the 60-second `setInterval` → `renderActiveView()` refresh, and
`pointer-events: none` are all unchanged.

## Timed events

`.msc-tg-event` radius now reads `var(--cal-event-radius)` (4px, was a
hardcoded 5px) for consistency with Month's chip radius; padding, title/time
sub-elements, hover brightness+shadow, and the drag/pending/dragging state
classes are unchanged. A `focus-visible` ring was added for `.msc-tg-event`
and `.msc-tg-allday-chip` (previously missing — only Month chips had one).

## Drag / resize / leave behavior

Not touched. `attachDragHandlers`, `attachResizeHandler`,
`wireTimeGridInteractions`, `commitItemTimeChange` (the PUT-then-render
commit path), and the leave blocks' `pointer-events: none` /
non-interactive rendering are byte-identical to before this task. Because
both derive their pixel math from the same `TG_ROW_HEIGHT_PX` constant that
was raised, drag/resize continue to convert pixels↔minutes correctly at the
new 56px row height without any handler code change.

## Internal scrolling

`.msc-tg-scroll` remains the sole scroll container for the Week/Day hour
grid; the header row and all-day row remain outside it (see "Week header
result"). The page itself does not need to scroll through all 24 hours —
only the taller, viewport-relative `.msc-tg-scroll` box does.

## Typography

`.msc-calendar-shell` now sets `font-family: Roboto, Arial, ui-sans-serif,
system-ui, sans-serif` — scoped to the calendar workspace only via a class
selector, so `base.css`'s global `body { font-family: Inter, … }` rule (used
by the rest of the Management AIOS) is untouched. No remote font is loaded;
browsers without Roboto installed fall back to the system sans-serif stack,
the same fallback pattern `base.css` already uses for Inter. `html { font-
size: 15px }` (the root em basis) was not changed.

## Responsive result

- **Desktop**: internal sidebar + full canvas, as described above.
- **Tablet/Mobile**: the pre-existing `max-width: 640px` breakpoint (sidebar
  stacks above content, view switcher becomes full-width) is unchanged
  except for the Month-canvas-height revert described in "Month grid
  result." The pre-existing `.msc-cal-grid-wrap { overflow-x: auto; }`
  container (shared by all three view panes — Month, Week, and Day are all
  mounted inside it) already contains any horizontal overflow to itself
  rather than the page, satisfying "Week view may scroll horizontally
  inside its container" / "no page-level horizontal overflow" without
  further change.
- The Management AIOS application-level sidebar/drawer (`.app-sidebar`,
  `navigation.css`) was not touched.

## Accessibility

- Added: `focus-visible` rings for `.msc-mini-picker-cell`, `.msc-tg-event`,
  and `.msc-tg-allday-chip` (previously only Month chips had this).
- Added: `aria-current="date"` on the selected Month cell and selected
  mini-picker cell.
- Added: `aria-hidden="true"` on the current-time line (decorative, per
  Step 26).
- Already present and unchanged: `aria-label`/`title` on toolbar icon
  buttons, `aria-pressed` on the view switcher (kept in sync by the existing
  `syncViewSwitcherButtons()`), `aria-expanded` on the sidebar toggle,
  `role="button"`/`tabindex="0"` + keyboard-activation handling on task
  chips, "+N more", and time-grid events/all-day chips.
- Today is not identified by color alone in Month view — it uses a filled
  circular background (shape + color), not a text-color change alone.

## Schedule Summary unchanged

Confirmed via `git diff` grep: zero lines touched in either
`.msc-summary-*` CSS selectors or in the Schedule Summary markup block
(`instance.js` lines 88-106) or its render functions (`renderSummaryStats`,
`loadDailySummary`/`loadWeeklySummary`/`loadMonthlySummary`/`loadSummaries`).
No markup, labels, row order, values, percentage formulas, N/A behavior,
leave deductions, report API calls, or loader logic were touched.

## Backend / database / API unchanged

`git diff --stat -- backend/ database/` returns empty. No route, payload,
model field, table, column, or constraint was touched. This was a
frontend-only (CSS + presentational JS) change.

## Screenshot paths

None captured in this session — no browser-automation or screenshot tool was
available. This was flagged to the requester before implementation began, who
confirmed (in-conversation) that they will personally capture and compare
screenshots at the six required viewports (1920×1080, 1600×900, 1440×900,
1366×768, tablet, mobile) against Google Calendar, and report findings back.
This document's "PASS/AMBER/FAIL" verdict below is therefore based on static
code inspection and the reasoning documented above, not on visual pixel
comparison.

## Browser-console result

Not captured — no browser session was run. Static checks (below) are the
substitute evidence for this session.

## Known visual differences from Google Calendar (expected, by design)

- No Google logo, account avatar, search bar, or settings gear — explicitly
  excluded per the task's branding boundary.
- Category chip colors reflect Management AIOS's existing task/leave
  taxonomy (amber/green/purple), not Google's uniform blue-event convention
  — preserved deliberately per Step 10.
- Half-hour gridlines are not rendered in the Week/Day timeline (not
  previously supported; out of scope per the task's own "where currently
  supported" qualifier).
- No visible timezone label in the time-gutter header cell (Google shows a
  live GMT offset there) — adding this would require new logic beyond a
  static label and was left out to avoid inventing unrequested functionality.
- The internal sidebar's collapse transition is an instant `display: none`
  toggle, not an animated width collapse.

## PASS / AMBER / FAIL

**AMBER.** All CSS/JS implementation work, static validation (below), and
scope-boundary checks pass. The verdict is AMBER rather than PASS strictly
because Steps 28-30 (real-browser pixel screenshots at six viewports,
before/after image comparison) could not be executed in this session — no
browser-automation tool was available, and the requester opted to capture and
compare screenshots themselves rather than have this session skip that
evidence entirely. This AMBER resolves to PASS once the requester's visual
comparison confirms no regressions; resolves to a follow-up task if it
surfaces a layout issue this document's code-level reasoning missed.

## Static validation performed

1. `node --check` (Node v22.23.1) on `web-view/js/calendar/core.js` and
   `web-view/js/calendar/instance.js` — both pass with no output (valid
   ES module syntax).
2. `node --check` swept across every `.js` file under `web-view/js/` — no
   failures.
3. CSS brace-balance check (Python) across `tokens.css`, `calendar.css`,
   `base.css`, `navigation.css`, `components.css` — all end at depth 0
   (balanced).
4. HTML tag-balance check (Python `html.parser`, void-tag-aware) on
   `index.html` — no unclosed tags, no mismatched close tags.
5. Duplicate-ID scan on `index.html` — 22 total `id` attributes, 22 unique,
   zero duplicates.
6. Local static HTTP server (`python3 -m http.server`) serving
   `web-view/` — `index.html`, all five CSS files, and all six JS modules
   (`app.js`, `config.js`, `navigation.js`, `staff-data.js`,
   `calendar/core.js`, `calendar/instance.js`) each returned HTTP 200.
7. `git diff --stat -- backend/ database/` — empty (confirms backend/
   database freeze).
8. `git diff` grep for `msc-summary` in both changed files — no matches
   (confirms Schedule Summary freeze).
9. Full `git diff` of both changed JS files read line-by-line to confirm
   every change is either a CSS-token reference, an added attribute, or the
   single documented constant change (`TG_ROW_HEIGHT_PX`).
