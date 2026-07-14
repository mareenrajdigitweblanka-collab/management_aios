---
name: schedule-summary-responsive-layout-check
type: validation
created: 2026-07-14
status: PASS — markup restructured and CSS-verified via source inspection, real computed widths, and JS syntax checking; live deployment confirmation appended after push (see "Deployment Confirmation")
source-boundary: web-view/index.html only. backend/, database/, database/migrations/, classify_schedule_category, reporting formulas, API schemas, existing event records, historical validation/handover files — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Schedule Summary — Responsive Layout Move — Check — 2026-07-14

**Requirement:** Move the Schedule Summary (Daily/Weekly/Monthly report cards) out of the narrow `.msc-sidebar` and place it below the active Month/Week/Day calendar view, inside `.msc-calendar-content`, so it can use the calendar content's full width instead of a fixed 220px column. Make the summary grid and cards responsive (3 columns desktop / 2 medium / 1 narrow) and more readable. No change to report calculations, API responses, classification rules, database structures, or backend code.

## Problem Description (pre-change)

`.msc-summary-grid` (holding the Daily/Weekly/Monthly cards) sat inside `.msc-sidebar`, which has `flex: 0 0 220px` — a fixed 220px column regardless of viewport width. `.msc-summary-grid`'s own rule was `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))`; inside a ~196px-wide content area (220px minus 12px×2 padding), `160×2 = 320px > 196px`, so auto-fit could never fit more than 1 column — all three cards always stacked vertically in a single narrow column, each only ~196px wide. Each card held 9 rows of label+value text (`.msc-summary-row { display:flex; justify-content:space-between }`), several with long values ("↓ 100.00% decrease", "N/A — No duration in either period"), which wrapped onto multiple lines inside that width, making the sidebar very tall and the comparison rows hard to scan. This also meant collapsing the sidebar (`.msc-sidebar.collapsed { display:none }`) hid the entire Schedule Summary along with it.

## Root Cause

Structural: the Schedule Summary was nested inside the sidebar, a layout region deliberately sized narrow (220px) for navigation/legend controls, not built to hold a 3-card report grid. The card grid's own `minmax(160px, 1fr)` couldn't reflow to more than one column at that container width no matter the viewport size, because CSS Grid `auto-fit` sizes against its own container's width, not the viewport — and its container was permanently narrow.

## Old Placement

`.msc-calendar-main` → `.msc-sidebar` → (Create button, mini-picker, category legend, **"Schedule Summary" heading + note + `.msc-summary-grid` with 3 `.msc-summary-block` cards**) as the last four children of the sidebar, confirmed at `web-view/index.html` (pre-change) inside `mountScheduleCalendarInstance`'s `container.innerHTML` template.

## New Placement

`.msc-calendar-main` → `.msc-calendar-content` → (`.msc-cal-grid-wrap` holding the three `.msc-view-pane` elements for Month/Week/Day, **then a sibling `.msc-summary-section`** holding the "Schedule Summary" heading + note + `.msc-summary-grid` with the same 3 `.msc-summary-block` cards). `.msc-sidebar` now contains only the Create task button, mini-picker, and category legend.

Exact nesting confirmed by direct read of the edited template (`web-view/index.html`):

```
.msc-calendar-main
  .msc-sidebar                      (Create button, mini-picker, legend — only)
  .msc-calendar-content
    .msc-cal-grid-wrap
      .msc-cal-grid.msc-view-pane   (Month)
      .msc-week-grid.msc-view-pane  (Week)
      .msc-day-grid.msc-view-pane   (Day)
    .msc-summary-section            (heading, note, .msc-summary-grid × 3 cards)
```

`.msc-summary-section` is a sibling of `.msc-cal-grid-wrap`, **not** nested inside any individual `.msc-view-pane` — it is common to Month/Week/Day and is never duplicated per view (there is exactly one `.msc-summary-section` per calendar instance, matching the pre-change count of exactly one `.msc-summary-grid` per instance).

## DOM Lookups Preserved

All summary-related JS element references use `container.querySelector('.msc-summary-daily')` / `.msc-summary-weekly` / `.msc-summary-monthly` / `.msc-summary-daily-title` / etc. — **container-scoped, not sidebar-scoped** — confirmed unchanged at their declaration site (`web-view/index.html`, inside `mountScheduleCalendarInstance`). Moving the markup within the same `container` element required **zero JavaScript selector changes**. `sidebarEl = container.querySelector('.msc-sidebar')` also needed no change — it still resolves to the (now report-free) sidebar element.

`loadDailySummary()`, `loadWeeklySummary()`, `loadMonthlySummary()`, and `loadSummaries()` are **byte-for-byte unchanged** — confirmed by diff (no lines inside these four functions appear in the change). `renderSummaryStats()` was changed **only** to wrap its existing rows in four `.msc-summary-group` `<div>` sections (counts / percentages / coverage / comparison) for visual grouping — every label string, every field read from `report`, and every formatter call (`formatDuration`, `formatDurationPercentage`, `formatChange`) is identical to before; nothing was added, removed, or recalculated.

## Responsive Grid Rules

```css
.msc-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  width: 100%;
}
@media (max-width: 480px) {
  .msc-summary-grid { grid-template-columns: minmax(0, 1fr); }
}
```

`auto-fit` with `minmax(240px, 1fr)` sizes columns against `.msc-summary-grid`'s **own rendered width** (which now equals `.msc-calendar-content`'s width, itself `flex: 1` inside `.msc-calendar-main`) — not the viewport. This means the grid reflows correctly both when the *browser window* narrows and when the *sidebar is expanded vs. collapsed* (which changes `.msc-calendar-content`'s available width without changing the viewport at all) — satisfying "use actual available container width rather than assuming full viewport width." Below 480px viewport width, an explicit single-`1fr`-column override removes `minmax`'s 240px floor entirely, guaranteeing the grid can never be wider than its container regardless of how narrow the window gets (a genuine floor-driven overflow is otherwise possible with `minmax(240px, 1fr)` alone if the container drops under 240px).

## Desktop Result (computed, not assumed)

Traced from the actual CSS values in `web-view/index.html`: `.tab-panel { max-width: 1240px; padding: 28px 32px 40px; }` → max content width `1240 − 64 = 1176px`. `.hr-table-card` (wrapping `.msc-calendar-main`) adds no horizontal padding of its own (confirmed: `background/border/border-radius/margin-bottom/overflow:hidden` only). `.msc-calendar-main { gap: 16px }` splits into `.msc-sidebar { flex: 0 0 220px }` (fixed) and `.msc-calendar-content { flex: 1 }` (remainder): `1176 − 220 − 16 = 940px` available to `.msc-calendar-content`, and therefore to `.msc-summary-grid`.

Column count at 940px: `floor((940 + 12) / (240 + 12)) = floor(952 / 252) = 3` — **three columns**, matching the desktop target, derived from real numbers in the file rather than assumed.

## Medium-Width Result

At a narrower browser window (e.g. ~700px available to `.msc-calendar-content`, before the 640px stacking breakpoint triggers — the sidebar is still 220px + 16px gap alongside it, so this corresponds to a ~936px viewport): `floor((700 + 12) / 252) = floor(2.83) = 2` columns. Between roughly 480px and the point where a third column would fit, the grid naturally shows 2 columns; below 480px viewport width the explicit override forces 1 column outright (see "Responsive Grid Rules").

## Narrow-Width Result

Below the pre-existing `@media (max-width: 640px)` breakpoint, `.msc-calendar-main` switches to `flex-direction: column` and `.msc-sidebar` becomes full-width, stacking above `.msc-calendar-content`. A hardening rule was added in this same breakpoint (`.msc-calendar-content { width: 100%; align-self: stretch; }`) because `.msc-calendar-main`'s pre-existing `align-items: flex-start` governs the *cross* axis — vertical in row layout (harmless), but horizontal once the axis rotates to column layout, where `flex-start` alone would let `.msc-calendar-content` (and therefore the summary section inside it) shrink to a fit-content width instead of the full stacked-column width. `align-self: stretch` overrides that for this one flex item only, so the calendar and summary both reliably span the full available width when stacked. Below 480px viewport width, `.msc-summary-grid` is forced to a single `1fr` column with no `minmax` floor, and every `.msc-summary-row` becomes `grid-template-columns: minmax(0,1fr)` (label stacked above value) rather than side-by-side, via:

```css
@media (max-width: 420px) {
  .msc-summary-row { grid-template-columns: minmax(0, 1fr); text-align: left; }
  .msc-summary-row strong { text-align: left; }
}
```

`min-width: 0` is set on `.msc-summary-section`, `.msc-summary-block`, `.msc-summary-row span`, and `.msc-summary-row strong`, and `overflow-wrap: break-word` is set on the block title and row label/value — together these prevent any long unbroken string (e.g. `N/A — No duration in either period`) from forcing the card, grid, or page wider than its container. No child element in this feature declares a fixed pixel width or a `min-width` greater than what its parent can supply.

## Sidebar Result

Confirmed by direct read of the edited markup: `.msc-sidebar` now contains exactly three children — the Create task button, the mini-picker container, and the category legend. No Schedule Summary markup remains inside it. The sidebar-toggle handler (`sidebarToggleBtn.addEventListener('click', ...)`) only ever reads/writes `sidebarEl.classList` and `sidebarToggleBtn`'s `aria-expanded` attribute — it has no reference to any summary element, confirmed unchanged at its declaration site — so collapsing the sidebar (`display: none` via `.msc-sidebar.collapsed`) no longer hides the Schedule Summary, since the summary is not a descendant of `.msc-sidebar` anymore. This is a direct, confirmed fix to the "collapsed sidebar hides reports" issue that existed under the old placement.

## Month / Week / Day Result

`.msc-summary-section` is a sibling of `.msc-cal-grid-wrap` inside `.msc-calendar-content`, and `.msc-cal-grid-wrap` is the sole container that holds and toggles the three `.msc-view-pane` elements (`display:none` / `.active{display:block}`, unchanged view-switching logic — confirmed no lines inside `renderActiveView()`/`syncViewSwitcherButtons()` were touched by this change). Because `.msc-summary-section` sits outside `.msc-cal-grid-wrap` entirely, switching between Month/Week/Day never moves, duplicates, re-creates, or hides the summary section — it stays in the same DOM position, visible directly below whichever view pane is currently active, for all three views identically. Confirmed by diff: `renderActiveView`, `syncViewSwitcherButtons`, and the `.msc-view-pane`/`.msc-cal-grid.active` CSS rules are byte-for-byte unchanged.

## Report-Function Preservation

Confirmed by diff — zero lines changed inside `loadDailySummary()`, `loadWeeklySummary()`, `loadMonthlySummary()`, `loadSummaries()`, `formatDuration()`, `formatDurationPercentage()`, `formatChange()`, `getReportWeekStart()`, or any backend file. `renderSummaryStats()` changed only its wrapping `<div>` structure (four `.msc-summary-group` sections replacing one flat list) — every data field read from the API response object, every label string, and every formatter call is identical. No metric is calculated in this change; all values displayed still originate from the backend's already-existing report endpoints (`GET /reports/daily`, `/reports/weekly`, `/reports/monthly`), unmodified by this work.

## All Five Members

The restructured markup lives inside the single shared `mountScheduleCalendarInstance(container)` factory function (unchanged call pattern — still instantiated once per member via the existing member-loop, not touched by this change), so the new sidebar/summary structure and responsive CSS apply identically to all five member calendar instances (`mayurika`, `suman`, `arun`, `rajiv`, `paraparan`) without any per-member markup or CSS. No new global `id` was introduced — the sidebar's existing per-instance `id="msc-sidebar-{memberKey}"` pattern (used only for the toggle button's `aria-controls`) is unchanged, and every other lookup used in this change remains `container.querySelector(...)`-scoped. `rajiv`'s existing "does not confirm Admin Manager approval..." note (`.msc-rajiv-note`, rendered above `.hr-table-card`) is outside the region touched by this change and confirmed present in the edited template, unedited.

## Accessibility

- `.msc-summary-row` uses a two-column grid (label / value) at normal widths and stacks to one column under 420px — text always wraps within its own box (`overflow-wrap: break-word`, `min-width: 0`) rather than clipping or overflowing, satisfying "readable under zoom" and "no clipping."
- `formatChange()` (unchanged) always renders the words "increase"/"decrease"/"no change" alongside the arrow glyph — direction is never conveyed by color or arrow alone.
- `N/A` and `N/A — No duration in either period` (unchanged text, from `formatDurationPercentage`/`formatChange`) remain explicit, human-readable strings, not blank cells or icons.
- The sidebar toggle is an existing native `<button>` element with `aria-expanded`/`aria-controls`, unmodified by this change — remains keyboard-operable via native button semantics (Enter/Space), with no new interactive element added by this work.
- Section/card titles (`.hr-table-title`, `.msc-summary-block-title`) remain `<div>`-based, consistent with every other section title already in this same calendar instance ("Schedule Item", "Schedule Items", "Priority Preview") — this is the codebase's existing, established title convention throughout `web-view/index.html`; changing it to a semantic heading tag here alone would create a one-off inconsistency with the rest of the page's own pattern, so it was deliberately left as-is rather than introduced as an unrelated, page-wide semantic-heading redesign.

## Static Structural Validation

- Exactly one `.msc-summary-section` per calendar instance (confirmed: appears once in the `container.innerHTML` template, generated once per `mountScheduleCalendarInstance` call).
- Exactly three `.msc-summary-block` cards inside it (Daily/Weekly/Monthly — unchanged count from before).
- `.msc-sidebar` contains zero `.msc-summary-*` elements (confirmed by direct read of the edited sidebar markup).
- `loadMonthlySummary()` present and unchanged; all three `*SummaryEl`/`*SummaryTitleEl` targets remain queryable via `container.querySelector`.
- No new global `id` attribute was introduced anywhere in this change.
- HTML nesting manually traced and confirmed balanced (see "New Placement" above — every opening tag in the changed region has a matching close at the correct depth).
- `node --check` against the file's three extracted `<script>` blocks: **passed, zero syntax errors**.
- `<style>` block brace balance: **459 open / 459 close** (equal) — confirmed via direct character count of the full style block after this change.
- No external dependency, script, stylesheet, font, or CDN reference was added — every rule uses this file's existing CSS custom properties (`var(--border)`, `var(--surface-tint-2)`, `var(--text)`, `var(--muted)`, `var(--muted-2)`, `var(--radius-sm)`), no new colors introduced.

## Local Verification

`python -m http.server 8099 --directory web-view` (the documented preview path from `backend/README.md`) served `index.html` with HTTP 200. Because this static file has no build/transform step, the local server serves the exact same bytes production (Vercel) serves — confirmed in the prior duration-reporting change this session, where the deployed production page was fetched and found to contain the newly-added functions verbatim. This gives high confidence that the structural verification above (nesting, selectors, CSS) applies identically to the deployed page.

## Known Limits

- **No real browser was available in this execution environment**, so pixel-measured, rendered-viewport verification (actually resizing a browser window and visually confirming reflow at wide/medium/narrow widths) could not be performed directly — this is the same documented limitation noted in `validation/schedule-duration-reporting-check-2026-07-14.md`'s "Frontend Verification" section for this session. In its place, this validation relies on: (a) exact nesting/selector confirmation via direct source reads, (b) real computed-width arithmetic using the file's own CSS values (not assumed numbers) to predict column counts at desktop/medium/narrow widths, (c) `node --check` JS syntax validation, and (d) a local static-file-server smoke test confirming the page serves without error. A manual pass in an actual browser (resizing the window across the three target widths) is recommended as a follow-up if a browser-capable environment becomes available, but is not expected to reveal a discrepancy given the CSS Grid `auto-fit` behavior used here is well-established and the computed widths above are derived from the file's real values, not estimates.
- Deployment/live-URL confirmation for **this specific commit** is appended below in "Deployment Confirmation," performed immediately after pushing (see handover file for the exact commit hash).

## Deployment Confirmation

Performed immediately after this commit was pushed to `origin/main` (see the accompanying handover file for the exact hash):

- Frontend `https://management-aios.vercel.app/` — HTTP 200; response body confirmed to contain `msc-summary-section`, and confirmed the sidebar markup fragment (`msc-sidebar-create`, `msc-mini-picker`, `msc-category-legend`) no longer has `msc-summary-grid` positioned between the legend and the sidebar's closing tag in the source.
- Backend `https://management-aios-api.vercel.app/health` — HTTP 200 (unchanged; this change does not touch the backend, included only to confirm no unrelated regression).

## PASS / FAIL

**PASS.** The Schedule Summary was moved from `.msc-sidebar` to a new `.msc-summary-section` inside `.msc-calendar-content`, positioned as a sibling of `.msc-cal-grid-wrap` so it is common to and unduplicated across Month/Week/Day. The sidebar now holds only the Create button, mini-picker, and category legend. The summary grid is genuinely container-width-responsive (3/2/1 columns via CSS Grid `auto-fit`, verified with real computed widths from the file's own CSS, plus an explicit narrow-width overflow safety net). Card readability was improved via a two-column label/value row grid with wrap-safe text and logical grouping, without changing any label, field, or value. All report-loading functions, formatters, classification logic, and backend files are confirmed byte-for-byte unchanged. All five member instances share this one implementation. JS syntax and CSS brace balance both check out. Live deployment confirmation is recorded above.
