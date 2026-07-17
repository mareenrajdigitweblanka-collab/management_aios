# Google-Calendar-Style Calendar UI/UX Check — 2026-07-17

**Scope:** Frontend-only UI/UX polish of the shared Management AIOS testing calendar
in [web-view/index.html](../web-view/index.html), so it more closely matches the
interaction model and visual familiarity of Google Calendar — **without** copying
any Google logo, trademark, icon file, CSS, or proprietary asset, and **without**
touching any backend, database, API, business rule, or the Schedule Summary.

**Result: PASS (static + regression-safety).** Live interactive browser validation
against the running FastAPI backend is the one remaining manual step (see Known
Limitations).

---

## 1. Requirement

Transform the existing shared calendar so it feels familiar to Google Calendar users
(clean toolbar, Today/Prev/Next, active date-range title, Month/Week/Day selector,
collapsible sidebar, Create button, mini-calendar, current-day/selected-day
highlighting, event chips, all-day row, hourly time grid, current-time indicator,
event detail popover, drag/resize, responsiveness, keyboard/focus usability).

Do **not** change data behavior, APIs, schema, reporting, task classification, or
leave rules. Do **not** copy Google branding/assets. One shared implementation must
serve all five members (Mayurika, Suman, Arun, Rajiv, Paraparan).

## 2. UI-only scope confirmation

- Files changed: **`web-view/index.html` only** (`git diff --stat`: 1 file).
- `git diff -- backend/` → empty. `git diff -- database/` → empty.
- No changes to any diff line mentioning `summary`, `renderSummaryStats`,
  `loadSummaries`, `scheduled_count_percentage`, or "Schedule Summary"
  (verified by grepping the diff — zero matches).
- No JS-logic lines changed: grepping the diff for `addEventListener`,
  `querySelector`, `function `, `setInterval`, `apiRequest`, `state.`, `items.`,
  arrow functions, etc. returned **zero** changed lines. Changes are CSS rules
  plus **10** presentational markup-string lines (toolbar restructure + Create
  button label/`+` glyph + calendar-card marker class).
- No new API endpoint, no new backend dependency, no new DB column/migration.

## 3. Old UI summary (starting state)

The calendar was already a mature Google-Calendar-*inspired* build (see
`shared-calendar-google-inspired-ux-check-2026-07-13.md` and
`shared-calendar-phase-1-layout-shell-check-2026-07-14.md`): it already had a
toolbar with sidebar toggle, Prev/Today/Next, a date-range heading, a
Month/Week/Day switcher, a collapsible sidebar with Create task + mini-calendar +
legend, Month/Week/Day view panes, an all-day row, an hourly time grid, a
current-time line (with a 60s refresh), task drag/resize via the existing PUT
route, a focus-trapped detail modal with Escape-to-close, and leave chips distinct
from tasks. This task **polished the visual/interaction layer** on top of that
foundation; it did not rebuild it.

## 4. What changed (presentational)

| Area | Change | Type |
|---|---|---|
| **Toolbar** | Regrouped into a Google-style left cluster (nav controls + date-range title) with a right-aligned view switcher. `Today` is now a rounded pill; sidebar-toggle / previous / next are circular icon buttons using plain Unicode glyphs (`☰` `‹` `›`) — no Google icons. Added `title`/`aria-label` on all icon-only controls. | CSS + markup |
| **View switcher** | Now a connected **segmented control** (shared border, active segment filled with `--accent`). | CSS |
| **Buttons** | Replaced crude `opacity:.9` hover with proper hover backgrounds; primary/danger hover states; focus-visible ring already present and retained. | CSS |
| **Create button** | Prominent rounded elevated pill with a `+` glyph (plain text). Behaviour unchanged — scrolls to + focuses the Schedule Item form. | CSS + markup |
| **Month view** | Taller cells (92px desktop / 62px ≤640px), centered day headers, day number as a centered chip, today = filled `--accent` circle, selected cell keeps inset ring. Chip hover + `+N more` polish. | CSS |
| **Mini-calendar** | Circular date cells; today = ringed, selected = filled `--accent` circle. | CSS |
| **Week/Day grid** | Event blocks gained a subtle shadow + left highlight + hover brighten; today's day-number in the header is a filled pill; **current-time line gained a Google-style red dot** at its start (pure CSS `::before`). | CSS |
| **Detail modal** | Title now has a divider + larger size. Focus trap / Escape / focus-return unchanged. | CSS |
| **Surface depth** | Calendar card gained a scoped `--shadow` (marker class `.msc-calendar-card`, so no other `.hr-table-card` on the page is affected) and internal padding on `.msc-calendar-main`. | CSS + marker class |

All colors, radii, shadows, spacing, and typography reuse **existing** `:root`
tokens (`--accent`, `--surface`, `--radius`, `--shadow`, `--surface-tint-*`, etc.).
No new visual theme was invented.

## 5. Feature-by-feature verification

- **New toolbar** — left cluster + segmented switcher; icon-only controls carry
  `aria-label` + `title`; heading element (`.msc-heading`) preserved and still
  updated by `updateHeading()`.
- **Sidebar** — collapsible (per-instance `aria-expanded` toggle) unchanged; Create
  button restyled, same scroll/focus behaviour.
- **Mini-calendar** — circular cells; today/selected/other-month states intact;
  clicking a date still routes through the single `selectDate()` source of truth.
- **Month view** — 7-column grid, day headers, today circle, selected ring, task
  chips, leave chips (distinct class/color), `+N more` overflow — all retained;
  only spacing/typography polished.
- **Week view** — day columns, all-day row, hourly gutter, timed task/leave blocks,
  current-time line + dot — retained.
- **Day view** — shares `renderTimeGrid`; same all-day row + grid + now-line + dot.
- **All-day row** — Full-Day / Multi-Day leave still render in the all-day strip
  (not as fake timed blocks); untimed tasks still chip there.
- **Current-time indicator** — unchanged logic (browser time, 60s re-render, only
  drawn when the range includes today); purely gained a CSS dot.
- **Task create / edit / delete** — form, API calls, 120-char title counter,
  category-locked-on-edit all unchanged.
- **Drag / resize** — task-only; both still commit via the existing PUT route and
  re-render from the unchanged `items` array on failure (visual revert). Leave
  remains non-draggable/non-resizable (`pointer-events:none`, no `data-id`).
- **Leave display** — simplified lifecycle (no status workflow) preserved; wording
  Short/First-Half/Second-Half/Full-Day/Multi-Day unchanged; delete action intact.
- **Leave conflict** — task-vs-leave 409 (`leave_conflict`) and leave-vs-leave 409
  (`leave_overlap`) handling untouched.
- **Selected-date synchronization** — `syncSelectedDateToForms()` unchanged; still
  the single place that pushes the selected date into the task + leave date fields.
- **Schedule Summary** — markup and `renderSummaryStats()` / `loadSummaries()`
  **byte-identical** (zero diff lines touch them).

## 6. Static validation performed

| Check | Result |
|---|---|
| `node --check` on all 3 inline `<script>` blocks | **All OK** |
| CSS brace balance in `<style>` | **BALANCED** (506 `{` / 506 `}`) |
| New selectors present | `msc-cal-toolbar-left`, `msc-tool-btn--icon`, `msc-tool-btn--today`, `msc-calendar-card`, `msc-create-btn`, `msc-tg-now-line::before` — all present |
| DOM hooks still in markup | `msc-prev/today/next`, `msc-sidebar-toggle`, `msc-heading`, `msc-view-btn`, `msc-sidebar-create`, `msc-sidebar`, `msc-mini-picker`, `msc-view-switcher` — all present |
| Toolbar markup div balance | Balanced (manually verified) |
| `git diff -- backend/` / `database/` | Empty |
| Schedule Summary diff | Empty |

## 7. Shared / five-member scope

One shared factory `mountScheduleCalendarInstance(container)` renders all five
`.msc-instance` panels (mayurika, suman, arun, rajiv, paraparan). No per-member
calendar code was added. All state (selected date, sidebar collapsed, view, modal
handlers) remains container-scoped with per-instance unique ids
(`sidebarId`, `viewTitleId`) — the polish did not introduce any shared/global id.

## 8. Accessibility

- Icon-only controls: `aria-label` + `title` retained/added.
- View switcher: `aria-pressed` per button (unchanged logic).
- Sidebar toggle: `aria-expanded` (unchanged logic).
- Detail modal: focus trap, Escape-to-close, focus-return (unchanged).
- Focus-visible rings retained.
- Status is never color-only: tasks vs leave differ by class **and** wording;
  today/selected differ by shape (circle/ring) as well as color.

## 9. Branding boundary

No Google logo, Calendar logo, trademark, downloaded icon file, copied CSS, or
proprietary asset was added. All glyphs are plain Unicode characters
(`☰ ‹ › +`) and all styling uses the repository's own tokens.

## 10. Known limitations

- **Live interactive browser validation not run in this environment.** No headless
  browser (puppeteer/playwright) is installed and the local FastAPI backend was not
  confirmed running here, so click/drag/resize/responsive checks against live data
  were not executed by the assistant. The change is CSS + presentational-markup only
  with **zero** JS-logic diff, so runtime behaviour is unaffected by construction;
  a manual pass in a real browser with the backend running is recommended before
  final sign-off (see next step in the handover).
- Segmented view switcher is a Google-*inspired* pattern, not a pixel copy of Google
  Calendar's view dropdown — intentional, to respect the branding boundary.

## 11. Verdict

**PASS** on scope, static validation, and regression safety (backend / database /
API / business rules / Schedule Summary all unchanged). One manual step — live
browser validation with the backend running — remains before operational sign-off.
