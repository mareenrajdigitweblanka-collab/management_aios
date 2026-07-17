# Collapsed-Sidebar Workspace Width and Toggle Alignment — Validation Check

**Date:** 2026-07-17
**Scope:** `web-view/css/navigation.css`, `web-view/index.html`. No JS, backend, database, API, calendar-instance, or Schedule Summary logic touched (both `web-view/js/navigation.js` and `web-view/js/calendar/instance.js` have zero diff).

---

## 1. Requirement

When the desktop sidebar is collapsed (76px rail), reclaim 50% of the
currently-unused horizontal gap on each side of the main content so content
expands accordingly, and move the collapse/expand toggle down so it aligns
horizontally with the OVERVIEW heading.

## 2. Gap-Source Investigation (Step 2 — proven, not assumed)

Inspected `.app-body`, `.app-sidebar`, `body.sidebar-collapsed`, `.tab-main`,
`.tab-panel` in `navigation.css`. Relevant rules (unchanged before this task):

```css
.app-body { display:flex; gap:0; }
.app-sidebar { flex: 0 0 var(--sidebar-width); }        /* 252px expanded */
body.sidebar-collapsed .app-sidebar { flex-basis: var(--sidebar-collapsed-width); } /* 76px */
.tab-main { flex:1; min-width:0; }
.tab-panel {
  padding: var(--space-7) calc(var(--space-7)/2) var(--space-8) calc(var(--space-7)/2); /* 32px 16px 40px 16px */
  max-width: var(--content-max-width);   /* 1240px */
  margin: 0 auto;
}
```

`.tab-main`'s width = `viewport width − sidebar width` (flex row, sidebar
pinned left with a fixed `flex-basis`, `.tab-main` fills the rest). Because
`.tab-panel` has both `max-width:1240px` **and** `margin:0 auto`, whenever
`.tab-main`'s width exceeds 1240px, the auto margins split the excess evenly
on each side — this is the source. `padding-inline` (16px/side, fixed) is a
**separate**, deliberate reading-edge spacing component, unrelated to
viewport width, already reduced to its current value in the prior
side-gap-reduction task in this session — it does not scale and is not
"unused" space in the same sense.

**In expanded mode (252px sidebar)** the prior task proved `max-width` never
engages at 1440/1366/1024px (sidebar + max-width = 1492px, wider than those
viewports), so the only gap was the 16px padding. **In collapsed mode
(76px sidebar)**, that threshold drops to `76 + 1240 = 1316px` — meaning
`max-width` now *does* engage at 1920/1600/1440/1366px (only 1024px stays
below it), producing a large excess auto-margin that did not exist in
expanded mode at those same widths. **This auto-margin — not padding — is
the "currently unused horizontal gap" this task targets.**

## 3. Measured Current Values (Step 3 — calculated from CSS; no browser available, see §14)

`.tab-main` available width = `viewport − 76px`. Auto-margin per side (when
available > 1240px) = `(available − 1240) / 2`. Total visible gap per side =
auto-margin + 16px padding.

| Viewport | Available (collapsed) | Auto-margin (old) | Padding (fixed) | Total old gap/side |
|---|---|---|---|---|
| 1920px | 1844px | 302.0px | 16px | 318.0px |
| 1600px | 1524px | 142.0px | 16px | 158.0px |
| 1440px | 1364px | 62.0px | 16px | 78.0px |
| 1366px | 1290px | 25.0px | 16px | 41.0px |
| 1024px | 948px | 0px (max-width doesn't engage) | 16px | 16.0px |

Left and right gaps are symmetric (auto-centered), so "old left gap" =
"old right gap" = the "Total old gap/side" column above, at every width.

## 4. The 50% Rule, Applied Precisely (Step 4)

**Scope decision (documented, not hidden):** "unused gap" was scoped to the
auto-margin component specifically — the part of the gap that grows purely
because `max-width` under-uses the width freed by collapsing the sidebar.
The 16px padding was left untouched: it is fixed, deliberate, non-viewport-
scaling reading-edge spacing (already the target of a dedicated, completed
task earlier this session), not "unused" space in the sense this task
describes. This mirrors how the prior "workspace side-gap reduction" task
treated padding and max-width as two independent, separately-diagnosed
sources — here, max-width/auto-margin is proven (§2) to be the actual
collapsed-mode-specific source, so it is the one adjusted.

**Exact formula** (derived algebraically, not guessed):

```
available = 100vw − sidebar-collapsed-width
new-max-width = (content-max-width + available) / 2
              = 50vw + (content-max-width − sidebar-collapsed-width) / 2
```

This is the exact midpoint between "cap at 1240px" and "use 100% of
available width" — i.e., precisely converts half of the excess auto-margin
into usable content width, at *every* viewport, via one CSS `calc()`
expression (no JS, no per-breakpoint hardcoded overrides):

```css
body.sidebar-collapsed .tab-panel {
  max-width: calc(50vw + (var(--content-max-width) - var(--sidebar-collapsed-width)) / 2);
}
```

**Verified exact-50% result** (computed, not estimated):

| Viewport | Old auto-margin | New max-width | New auto-margin | Reduction |
|---|---|---|---|---|
| 1920px | 302.00px | 1542.0px | 151.00px | **exactly 50.0%** |
| 1600px | 142.00px | 1382.0px | 71.00px | **exactly 50.0%** |
| 1440px | 62.00px | 1302.0px | 31.00px | **exactly 50.0%** |
| 1366px | 25.00px | 1265.0px | 12.50px | **exactly 50.0%** |
| 1024px | 0px | 1094.0px | 0px | unchanged (nothing to reclaim) |

**Total visible gap (auto-margin + fixed 16px padding), for full transparency:**

| Viewport | Old total gap/side | New total gap/side | % reduction of *total* gap |
|---|---|---|---|
| 1920px | 318.0px | 167.0px | 47.5% |
| 1600px | 158.0px | 87.0px | 44.9% |
| 1440px | 78.0px | 47.0px | 39.7% |
| 1366px | 41.0px | 28.5px | 30.5% |
| 1024px | 16.0px | 16.0px | 0% (no auto-margin existed to reclaim) |

The auto-margin component (§4 first table) — the actual "unused gap"
identified in §2 — is reduced by **exactly 50% at every viewport where it
exists**. The total-visible-gap percentage is lower only because the fixed
16px padding component (deliberately left untouched) doesn't shrink; it
makes up a proportionally larger share of the total at narrower viewports,
which is why the total-gap percentage varies by width even though the
underlying auto-margin math is exact everywhere.

## 5. Shared Content-Wrapper Fix (Step 5)

Applied to `.tab-panel` — the single shared wrapper every panel (Root AIOS,
File Map, all 5 members, Staff Data) already renders inside. No
calendar-specific, Schedule-Summary-specific, HR-table-specific, or
Staff-Data-specific width rule was added anywhere — every panel inherits
this change automatically because they all share this one wrapper class.
`margin: 0 auto` (auto-centering) is untouched.

## 6. Expanded-Sidebar Safety (Step 6)

The base (non-collapsed) `.tab-panel` rule — `max-width: var(--content-max-width)` —
was **not modified**; only a new, separate `body.sidebar-collapsed .tab-panel`
override was added. `--sidebar-width` (252px) is untouched. Confirmed via
`git diff`: the base `.tab-panel` rule shows zero changes; only new rules
were added inside the existing `@media (min-width:1024px)` collapse block.
No layout shift on first load: pages load with `body` carrying no
`sidebar-collapsed` class by default (session-only state, unchanged from
the prior task), so expanded mode's already-existing rendering path is
completely unaffected.

## 7. Collapsed-Sidebar Result (Step 7)

- Sidebar width: 76px (`--sidebar-collapsed-width`, unchanged from the prior task).
- Nav icons: unchanged (`.app-nav-icon`, 24×24px, `justify-content:center` on `.app-nav-btn` when collapsed — pre-existing, untouched this task).
- Active-state indication: unchanged (`.app-nav-btn.active` styling untouched).
- Accessible labels/tooltips: unchanged (`title` attributes from the prior task, plus the visually-hidden-but-DOM-present label text).
- No overlap: `.tab-panel`'s new `max-width` formula only ever grows content into space `.tab-main` (sidebar-adjacent, non-overlapping by flex construction) already owns — it cannot extend under or past the sidebar.

## 8. Toggle Repositioning (Step 8)

**Old position:** first child of `.app-sidebar` (i.e., its own row, above the entire OVERVIEW group), right-aligned via `align-self:flex-end`.

**New position:** moved into a new `.app-sidebar-top-row` wrapper, placed as the first child of the OVERVIEW group, sharing that row with the "Overview" title text (`display:flex; align-items:center; justify-content:space-between;` — title left, toggle right). Its vertical center now *is* the OVERVIEW heading's line by construction (same flex row, `align-items:center`), not an approximated/arbitrary offset. No separate collapsed-mode markup was created — the same button/row is reused; in collapsed mode the row's `justify-content` switches to `center` and the title's own width collapses to 0 (a new, more-specific selector scoped to `.app-sidebar-top-row .app-sidebar-title`, distinct from the general title-collapse rule that still applies unchanged to the MEMBERS/DATA group titles), so the toggle alone ends up centered in the 76px rail. `aria-expanded`, `aria-controls`, `aria-label` ("Collapse sidebar"/"Expand sidebar", swapped by the existing unmodified `navigation.js` handler), and keyboard focus-visible styling are all unchanged — only the button's DOM position and its own CSS positioning properties moved.

## 9. Collapsed OVERVIEW Presentation (Step 9)

OVERVIEW's text is visually hidden using the same technique the prior task
established for MEMBERS/DATA (opacity + width/height collapse, never
`display:none`, so it stays in the accessibility tree) — no new hiding
mechanism was invented. The toggle remains in its aligned top-row position;
no large blank vertical area is introduced because the row's own height is
governed by the toggle (26px), which does not change between states.

## 10. Responsive Boundary (Step 10)

Both new rules (`body.sidebar-collapsed .tab-panel` max-width override, and
`body.sidebar-collapsed .app-sidebar-top-row` centering) are inside the
pre-existing `@media (min-width: 1024px)` block — confirmed via diff. Below
1024px, `body.sidebar-collapsed` has no effect at all (the collapse toggle
itself is `display:none` there, per the prior task, unchanged), so the
`<1024px` drawer block (`@media (max-width:1023px)`, zero diff this task)
and its single existing `#sidebarToggle` control are entirely unaffected —
no competing controls, no collapsed-desktop max-width override reaches
mobile/tablet.

## 11–13. Width / Calendar / Other-Panel Validation

Computed, not browser-measured (§14). Because the fix lives in the single
shared `.tab-panel` wrapper (§5), every panel — Root AIOS, File Map, all 5
members (including their mounted `.msc-instance` calendars, which are
DOM descendants of `.tab-panel` and were not touched directly), Staff Data,
HR tables, Schedule Summary, Schedule Item form, Leave form, Schedule Items
list — inherits the identical width-recovery behavior with zero
panel-specific rules added. `git diff` confirms zero changes to
`calendar.css` or `calendar/instance.js`, so Month/Week/Day rendering,
event-chip sizing/positioning, and the calendar's own internal
`.msc-sidebar` (Create/mini-calendar/legend) are provably unaffected — only
the width of the containing `.tab-panel` around them changes, which they
already responsively fill (existing calendar CSS uses percentage/flex
widths throughout, confirmed in the prior redesign tasks' inspection).

## 14. Real Browser Validation — NOT PERFORMED

As in every task this session, **no browser-automation or screenshot tool
is available in this environment.** All widths, gaps, and the exact-50%
calculation in §4 are derived algebraically from the actual CSS rules
(confirmed via `git diff` and direct file inspection), not measured from a
rendered page or computed styles, per the task's own fallback instruction
("otherwise calculate from the current CSS rules and document the
limitation"). Rendered alignment of the toggle with OVERVIEW, absence of
horizontal overflow, and calendar/card visual alignment could not be
observed. Per the task's own instruction ("Do not claim full PASS without
rendered browser validation"), this is called out explicitly.

## 15. Schedule Summary Unchanged

Confirmed — `git diff --stat -- web-view/js/calendar/instance.js` and
`git diff --stat -- web-view/css/calendar.css` are both empty. No Schedule
Summary label, row order, value, percentage, or API call was touched.

## 16. Static Checks (executed)

- CSS brace balance — all 6 files balanced (`navigation.css` 75/75 after edit).
- HTML tag-balance scan on `index.html` — 0 unclosed, 0 mismatches.
- Duplicate-id scan — 22 ids, 22 unique, 0 duplicates.
- `node --check` on all 6 JS files — all pass (no JS was changed this task; run for completeness).
- Local static HTTP server — all 9 checked assets return HTTP 200.
- `git diff --stat -- backend/ database/` — empty.
- `git diff --stat -- web-view/js/` — empty (zero JS changes this task).
- `git diff --stat` overall — exactly 2 files: `web-view/css/navigation.css` (83 lines), `web-view/index.html` (18 lines).

## 17. Result

**AMBER.** The gap source was proven (not assumed), the 50% reclaim target
is met with algebraic exactness for the auto-margin component identified as
the actual "unused gap," the toggle is now structurally (not arbitrarily)
aligned with OVERVIEW, expanded mode and every other panel/mobile drawer
show zero diff, and Schedule Summary/calendar logic are provably untouched.
Withheld from PASS solely because Step 16's mandatory real-browser
validation could not be performed in this environment.
