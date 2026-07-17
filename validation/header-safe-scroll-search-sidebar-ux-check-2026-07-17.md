# Header-Safe Scroll, Search Redesign, Collapsible Sidebar, Typography — Validation Check

**Date:** 2026-07-17
**Scope:** `web-view/index.html`, `web-view/css/tokens.css`, `web-view/css/navigation.css`, `web-view/css/components.css`, `web-view/css/calendar.css`, `web-view/js/navigation.js`. `web-view/js/calendar/instance.js` has **zero diff** (the scroll fix needed no JS change — see §2). No backend, database, API, or Schedule Summary logic touched.

---

## 1. Requirement

Fix fixed-header overlap on the two existing scroll targets (Schedule Item
form, Schedule Items list); redesign the search UI professionally without
changing search logic; add a desktop sidebar collapse/expand rail that
correctly resizes the main content; adopt a professional font stack with
small, documented, targeted size increases (calendar chips excluded).
Frontend-only.

## 2. Discovery (Step 2 — before editing)

- **Fixed header selector/height:** `.topbar`, `height: var(--header-height)` = **56px** at every breakpoint (confirmed: no media query in `base.css` overrides `.topbar`'s `height`, only text-content visibility).
- **All `scrollIntoView` calls in the codebase** (exhaustive grep, `web-view/js/**/*.js`):
  1. `calendar/instance.js` — `sidebarCreateBtn` click handler ("Create task" button) → `formCardEl.scrollIntoView({behavior:'smooth', block:'start'})`, then `fieldTitle.focus()`. `formCardEl = container.querySelector('.msc-form-card')`.
  2. `calendar/instance.js` — `navigateToScheduleItemListForDate(dateStr)` → `scrollTarget.scrollIntoView({behavior:'smooth', block:'start'})` where `scrollTarget = container.querySelector('.msc-list-heading') || listEl`, then `listHeading.focus()`.
  3. `navigation.js` — member-snapshot `[data-goto]` cards use `window.scrollTo({top:0})` (scrolls to page top, not a mid-page section — no header-overlap risk, unaffected by this task).
- **No existing scroll action targets the Leave Coordination form** (confirmed by the same exhaustive grep — the leave form has no click handler anywhere that calls `scrollIntoView`). Per Step 6, no new leave-navigation action was added; this finding is simply documented.
- **No pre-existing `scroll-margin-top` anywhere in the codebase** before this task (confirmed by grep) — the header-overlap bug was real: `block:'start'` aligns the target's top edge with the *scrolling viewport's* top, which sits directly behind the 56px sticky header, hiding roughly the top 56px of whichever element scrolled into view (its heading, in both cases).

## 3. Centralized Header-Safe Scrolling (Step 3)

No JavaScript change was needed. Per the task's own preferred implementation
(CSS `scroll-margin-top`, avoid JS subtraction "unless insufficient" — it
was not), the fix is two CSS additions:

**Token** (`tokens.css`):
```css
--scroll-target-offset: calc(var(--header-height) + 16px);
```

**Applied to the two actual scroll targets** (`calendar.css`):
```css
.msc-form-card,
.msc-list-heading {
  scroll-margin-top: var(--scroll-target-offset);
}
```

`scrollIntoView({behavior:'smooth', block:'start'})` in both existing
handlers is unchanged — modern browsers automatically respect
`scroll-margin-top` on the target element when computing the "start"
alignment, so the same call now lands 72px (56 + 16) below the true
viewport top instead of flush against it. Since `--header-height` does not
vary by breakpoint (§2), one token value covers desktop, tablet, and
mobile — no per-breakpoint override was needed.

## 4. Schedule Item Form Result (Step 4)

Clicking "Create task": selects the date (unchanged — `prefillCreateForm`/
existing behavior not touched), scrolls `.msc-form-card` into view with the
new 72px clearance (its heading — "Schedule Item — …" — is the first
visible content inside the card, now fully clear of the header), then
focuses `fieldTitle` (unchanged). Zero diff on `sidebarCreateBtn`'s handler
itself — only the CSS target it scrolls to gained `scroll-margin-top`.

## 5. Schedule Items List Result (Step 5)

Month-view task-bearing date/task-chip/"+N more" clicks: `git diff` shows
**zero changes** to `renderMonthView()`, `navigateToScheduleItemListForDate()`,
or any of the Month click-rule logic added in the prior task (task-bearing
detection, leave-only/empty no-op, member isolation) — all preserved
verbatim. The only change affecting this path is `.msc-list-heading`
gaining `scroll-margin-top`, so the same `scrollIntoView`/`.focus()` calls
now land below the header instead of under it.

## 6. Leave Form Result (Step 6)

No existing action scrolls to the Leave Coordination form (§2) — nothing to
fix, no new navigation action added, per instruction.

## 7. Search — Old vs. New Structure (Step 7)

**Old:**
```html
<div class="search-tools" role="search">
  <label for="searchInput" class="visually-hidden">…</label>
  <input id="searchInput" ... placeholder="Search across all tabs…" />
  <button id="searchClear">Clear</button>
  <span id="searchResults"></span>
  <span id="searchHint" class="visually-hidden">…</span>
</div>
```

**New:**
```html
<div class="search-tools" role="search">
  <label for="searchInput" class="visually-hidden">…</label>
  <div class="workspace-search">
    <svg class="workspace-search-icon" aria-hidden="true">…magnifier…</svg>
    <input id="searchInput" ... placeholder="Search people, topics, tasks, or status…" />
  </div>
  <button id="searchClear">Clear</button>
  <span id="searchResults"></span>
  <span id="searchHint" class="visually-hidden">…</span>
</div>
```

`#searchInput`, `#searchClear`, `#searchResults`, `#searchHint` IDs
unchanged. Only the placeholder text (presentation copy, not logic) and the
new `.workspace-search` wrapper changed. Visual changes: rounded pill
container (`border-radius: var(--radius-lg)` = 14px), taller control (38px,
up from an implicit ~30px), inline decorative SVG magnifier icon, and the
focus ring now highlights the whole pill (`:focus-within`) rather than a
thin border on the bare input.

## 8. Search Behavior Result (Step 7/8)

`navigation.js`'s `doSearch()`, `normalize()`, the `input`/`click` event
listeners, and `data-searchable`/`data-tags` matching are **byte-for-byte
unchanged** (confirmed: `git diff -- web-view/js/` shows only the new
sidebar-collapse block was added; the search section of `navigation.js` has
zero diff). Accessibility: input keeps its `<label for>` (not
placeholder-only), icon is `aria-hidden="true"` (decorative), Clear is a
native `<button>` (inherently keyboard-accessible), `:focus-visible` ring
present on both the pill (`:focus-within`) and Clear button, mobile layout
(`@media max-width:480px`) puts the full-width pill on its own row with
Clear/result-count below it — neither is clipped.

## 9. Sidebar Expanded/Collapsed Widths (Step 9)

- **Expanded:** `--sidebar-width: 252px` (unchanged from the prior redesign task).
- **Collapsed:** new `--sidebar-collapsed-width: 76px` (within the requested 72–88px range) — icons/initials remain visible and centered; labels/subtitles/the Root AIOS status badge are visually hidden (not `display:none` — see §14); each item's `title` attribute (added to every `.app-nav-btn`, e.g. `title="Mayurika — HR"`) provides a native hover/focus tooltip; group labels (`.app-sidebar-title`) collapse to zero height rather than a visible divider bar (simpler, equally valid per the requirement's "may collapse to dividers **or** accessible hidden text").
- Sidebar never disappears — 76px rail always shows all icons.

## 10. Collapse/Expand State (Step 10)

One application-level class: `body.sidebar-collapsed`, toggled by one button
(`#sidebarCollapseToggle`, in the sidebar's own top area, above the OVERVIEW
group). `aria-expanded` flips `true`/`false`; `aria-label`/`title` flip
between "Collapse sidebar" / "Expand sidebar". **No localStorage
persistence was added** — confirmed by grep that this project has zero
existing `localStorage` usage anywhere (both `calendar/instance.js` and
`staff-data.js` carry explicit comments stating they deliberately avoid it);
per the task's own instruction ("persist... only if the current project
already stores harmless UI preferences"), introducing a new persistence
mechanism here would have been out of scope. The sidebar starts expanded on
every page load. No backend field, no database field.

## 11. Content-Width Response (Step 11)

Pure CSS flexbox, no JavaScript width calculation. `.app-sidebar` uses
`flex: 0 0 var(--sidebar-width)`; the collapsed rule overrides only
`flex-basis: var(--sidebar-collapsed-width)`. `.tab-main` already has
`flex: 1; min-width: 0;` (unchanged) — it automatically grows into the
freed ~176px when the sidebar collapses, and returns to its prior width
when it expands, with no stale inline widths anywhere (no JS ever sets a
`style.width`). `.tab-panel`'s `max-width: var(--content-max-width)`
(1240px) is untouched, so very wide viewports still cap content sensibly;
narrower/laptop viewports (where content was already narrower than
1240px — see the prior side-gap-reduction task's math) get the full benefit
of the freed space immediately.

## 12. Sidebar Transition (Step 12)

`.app-sidebar { transition: flex-basis .2s ease; }`; nav-item text and
group-title labels fade via `opacity` in sync with the same duration
(`.15s`/`.2s`) rather than lingering — avoiding the "text briefly
overlapping content" failure mode by keeping the fade tightly coupled to
the width change instead of choreographed separately. `transform:
rotate(180deg)` on the toggle icon only (restrained, single property).
`@media (prefers-reduced-motion: reduce)` disables all of the above
transitions. No JS-driven animation, no page-level horizontal scroll
introduced (collapsing only ever shrinks a flex item).

## 13. Responsive Boundary (Step 13)

Breakpoint: **1024px** — the repository's existing drawer breakpoint
(`@media (max-width: 1023px)` for the drawer, reused directly; the new
collapse rail lives in `@media (min-width: 1024px)`). `#sidebarCollapseToggle`
is `display:none` below 1024px and `display:flex` at/above it — the
existing `#sidebarToggle` (drawer open/close, in the header) is the *only*
sidebar control below 1024px, so the two never compete. The mobile drawer's
open/close mechanics, backdrop, and Escape-close (from the prior redesign
task) are entirely untouched — confirmed via diff: the `@media (max-width:
1023px)` drawer block has zero changes.

## 14. Navigation Usability When Collapsed (Step 14)

No collapsed-only markup was created — the same 8 `.app-nav-btn` elements
(Root AIOS, File Map, Mayurika, Suman, Arun, Rajiv, Paraparan, Staff Data)
serve both states. When collapsed: `.app-nav-btn-text` (label+sub) and
`.app-nav-btn-badge` (Root AIOS's status pill) transition to
`flex-basis:0; opacity:0` — visually hidden but **not** `display:none`, so
they remain in the DOM and the accessibility tree; the visible icon-initial
span (`.app-nav-icon`, already `aria-hidden`) plus the new `title` attribute
on the button (native tooltip) carry the collapsed-state identification,
while the still-present (just visually collapsed) label text remains each
button's accessible name — a screen reader announces "Mayurika, HR" whether
expanded or collapsed. Click/keyboard behavior, `aria-current="page"` active
state, and `:focus-visible` styling are entirely unchanged (zero diff to
`navigation.js`'s `activatePanel()`).

## 15. Font Stack (Step 15)

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```
Set on `body` (`tokens.css`); no `@font-face`, no external font URL, no
font files added. A new `input, select, textarea, button { font-family:
inherit; }` reset was added — form controls do not inherit `body`'s font in
most browsers' UA stylesheets by default, so without this reset the new
stack (and the size increases below) would not have reached the search
input, calendar form fields, or buttons at all. If "Inter" isn't installed
locally, every browser falls back to the listed system stack automatically.

## 16. Old/New Font Sizes (Step 16)

Root `html { font-size: 15px; }` was **deliberately left unchanged** — it is
the base for every `rem` value in the codebase, including calendar chip
sizes (`.msc-cal-chip` etc., all hardcoded rem, never tokenized); changing
it would have silently grown the chips, violating "preserve compact size."
Instead, specific tokens/classes were raised (all computed against the
unchanged 15px root):

| Token/class | Old | Old px | New | New px | Δpx | Used by |
|---|---|---|---|---|---|---|
| `--font-2xs` | .68rem | 10.2 | .70rem | 10.5 | +0.3 | small badges, metadata |
| `--font-xs` | .76rem | 11.4 | .79rem | 11.85 | +0.45 | helper text |
| `--font-sm` | .82rem | 12.3 | .88rem | 13.2 | +0.9 | body copy, search input |
| `--font-base` | .86rem | 12.9 | .92rem | 13.8 | +0.9 | **nav labels** (`.app-nav-btn`), body text |
| `--font-md` | .95rem | 14.25 | .99rem | 14.85 | +0.6 | card/list sub-headings |
| `.section-title` | .73rem | 10.95 | .76rem | 11.4 | +0.45 | page section headings |
| `.card-title` | .93rem | 13.95 | .97rem | 14.55 | +0.6 | card headings |
| `.hr-table-title` | .95rem | 14.25 | .99rem | 14.85 | +0.6 | **section heading** (incl. the Schedule Item/Schedule Items headings) |
| `.msc-form-grid label` | .74rem | 11.1 | .77rem | 11.55 | +0.45 | **form control labels** |
| `.msc-form-grid input/select/textarea` | .82rem | 12.3 | .88rem | 13.2 | +0.9 | **form controls** |
| `.msc-api-status` | (`--font-xs`) 11.4 | | (`--font-xs`) 11.85 | | +0.45 | helper/metadata (kept secondary) |

**Untouched (calendar event chips, "preserve compact size"):** `.msc-cal-chip`
(.64rem), `.msc-cal-chip-more` (.62rem), `.msc-cal-chip-leave` (.62rem),
`.msc-tg-event-title`/`.msc-tg-event-time`, and every other calendar-grid
chip/label class — confirmed via `git diff` that no line inside any
`.msc-cal-*`/`.msc-tg-*` chip rule changed.

## 17. Visual Consistency (Step 17)

Reasoned from source (no browser available — see §21): header height token
untouched (still 56px, still compact); `.app-nav-btn-label` already had
`overflow:hidden;text-overflow:ellipsis;white-space:nowrap` before this
task, so the +0.9px `--font-base` bump cannot cause label overflow at the
unchanged 252px expanded width; collapsed icons (`.app-nav-icon`, 24×24px,
untouched) stay centered via the new `justify-content:center` rule scoped
to `body.sidebar-collapsed .app-nav-btn`; `.workspace-search` and
`.readonly-notice` both sit in the same `.workspace-toolbar` flex row with
unchanged `gap`/gap gap, `align-items:center` — increasing the search
control's height to 38px does not affect the read-only notice's own height
(they're independent flex items); `.card`/table/form CSS box models
(padding, border, radius) were not touched, only font-size values inside
them, so overflow risk from the small increases is low but not verified
visually.

## 18. Schedule Summary Freeze (Step 18)

**Zero diff.** `git diff --stat -- web-view/js/calendar/instance.js`
returns empty — the file that contains `renderSummaryStats()`,
`loadDailySummary()`, `loadWeeklySummary()`, `loadMonthlySummary()`,
`loadSummaries()`, and all Schedule Summary markup/labels/row order/API
calls was not touched at all in this task. It inherits the new font stack
and the small `--font-*` token increases automatically (typography cascade
only) — no rendering logic, label text, row order, value, or API call was
edited. Confirmed additionally: `git diff | grep -i "msc-summary"` across
every changed file returns no matches.

## 19. Static Validation (executed)

- `node --check` on all 6 files under `web-view/js/` — **all pass**.
- CSS brace balance on all 6 files under `web-view/css/` — **all balanced** (`navigation.css` 70/70, `calendar.css` 194/194, `tokens.css` 5/5 after edits).
- HTML tag-balance scan on `index.html` — **0 unclosed, 0 mismatches**.
- Duplicate-id scan — **22 ids, 22 unique, 0 duplicates** (one new id, `sidebarCollapseToggle`, added).
- Functional-hook scan — `searchInput`, `searchClear`, `searchResults`, `sidebarToggle`, `appSidebar`, `sidebarBackdrop`, `sidebarCollapseToggle` — **all present**.
- Local static HTTP server — all 13 checked assets return HTTP 200.
- `git diff --stat -- backend/ database/` — **empty**.
- `git diff --stat -- web-view/js/calendar/instance.js` — **empty** (proves Schedule Summary logic diff is zero, and proves the scroll fix required no JS change).
- `git diff --stat -- web-view/js/` overall — only `navigation.js` changed (21 insertions: the sidebar-collapse toggle wiring; the search-logic section has zero diff).

## 20. Real Browser Validation — NOT PERFORMED

As in every prior task in this session, **this environment has no
browser-automation or screenshot tool available** (confirmed via tool
search). Header-overlap clearance, the search pill's visual polish, the
collapse/expand transition, content-width reflow, tooltip-on-hover, and
console-error-free operation could not be observed. Per the task's own
instruction ("Do not claim full PASS without browser validation"), this is
called out explicitly. All findings above are from direct code inspection,
`git diff`, and the static checks in §19.

## 21. Result

**AMBER.** Every requirement is implemented via CSS/HTML/one small JS
addition, with the scroll fix requiring zero JavaScript changes (pure
`scroll-margin-top`), the search/typography changes preserving all IDs and
logic, and the sidebar collapse using pure-CSS flexbox width response with
no persistence and no competing mobile control. Schedule Summary,
backend/database/API, and Week/Day/task/leave logic all show zero diff.
Withheld from PASS solely because Step 21's mandatory real-browser
validation could not be performed in this environment.
