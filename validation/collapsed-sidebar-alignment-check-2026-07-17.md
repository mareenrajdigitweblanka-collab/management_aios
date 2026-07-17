# Collapsed Sidebar Alignment — Validation Check

**Date:** 2026-07-17
**Scope:** `web-view/css/navigation.css` only. No HTML, JavaScript, backend, database, API, calendar, or Schedule Summary changes.

---

## 1. Observed Alignment Problem

Screenshot-reported issues: expand button too close to the top-left edge;
expand button not visually aligned with the navigation icons; inconsistent
icon-row spacing; uneven active background/left border; inconsistent
vertical rhythm between groups; sidebar/workspace feeling disconnected.

## 2. Root-Cause Investigation (Step 2 — proven before editing)

Inspected `.app-sidebar`, `.app-sidebar-top-row`,
`.app-sidebar-collapse-toggle`, `body.sidebar-collapsed`,
`.app-sidebar-group`, `.app-sidebar-title`, `.app-nav-btn`,
`.app-nav-icon`, `.app-nav-btn-text`, `.app-nav-btn.active`, the ≥1024px
collapse block, and the <1024px drawer block. Three distinct, provable bugs
were found (not assumed):

**Bug 1 — phantom flex `gap` around zero-width hidden siblings.** Both
`.app-sidebar-top-row` (`gap: var(--space-2)` = 8px) and `.app-nav-btn`
(`gap: 10px`) keep their `gap` property active in collapsed mode. The
collapse technique hides the OVERVIEW title and each button's label via
`flex: 0 0 0; opacity: 0` — **not** `display:none`, so the (now invisible)
element still generates a flex item box, and CSS `gap` still reserves its
full space between it and its sibling. This silently shifted:
- the toggle ~4px right of the rail's true center (half of the 8px row gap), and
- every nav icon ~5px left of the button's true center (half of the 10px button gap, and in the exact case where the icon+gap total already filled the button's content box with zero slack, the icon was flush against the padding edge, not centered at all).

**Bug 2 — asymmetric `border-left`.** `.app-nav-btn` always reserved
`border-left: 3px solid transparent` (`.active` only changed its color, not
its width), while padding was `7px 10px 7px 9px` — an asymmetric
combination that skewed the button's effective content box left by a few
pixels regardless of active state, compounding Bug 1's visual effect.

**Bug 3 — swallowed row spacing.** `.app-sidebar-top-row`'s rendered height
is driven by the 26px toggle, not the (shorter) OVERVIEW title text — so
the title's own `padding-bottom` never contributed visible space before the
Root AIOS button, unlike MEMBERS/DATA's standalone titles, which *do* get
that space "for free" from their own padding. This produced the
inconsistent vertical rhythm between the Overview group and the other two.

## 3. Recorded Current Values (before editing)

| Property | Value |
|---|---|
| Collapsed sidebar width | 76px (`--sidebar-collapsed-width`, unchanged) |
| Sidebar horizontal padding | 12px each side (`--space-3`, already symmetric) |
| Sidebar vertical padding (old) | 16px (`--space-4`) |
| Toggle box | 26×26px |
| Nav icon box | 24×24px |
| Nav button padding (old) | `7px 10px 7px 9px` (asymmetric) |
| Row gap (top-row / nav-btn) | 8px / 10px |
| Fixed header height | 56px (`--header-height`, sidebar is `position:sticky; top:var(--header-height)`) |
| Desktop collapse breakpoint | `≥1024px` (unchanged) |
| Mobile drawer breakpoint | `<1024px` (unchanged) |

## 4. One Collapsed Rail Grid (Step 3)

Rather than resizing icons to a new shared box (which would have touched
expanded mode too), the fix restores exact centering *within the existing
sizes* by removing the two sources of asymmetry:

- Sidebar content box (collapsed): `76 − 2×12 = 52px`, symmetric.
- Toggle centers in that 52px box (row `gap:0` in collapsed mode) → **center = 38px** (exactly `76/2`).
- Each icon centers within its button's content box (button padding now symmetric `10px`/`10px`, `gap:0` in collapsed mode) → **center = 38px** (exactly `76/2`).

**Verified by direct calculation** (not estimated):
```
sidebar_center = 76 / 2 = 38.0
toggle_center  = 12 + (52-26)/2 + 26/2 = 38.0
icon_center    = 12 + 10 + (32-24)/2 + 24/2 = 38.0
toggle_center == icon_center == sidebar_center  ->  True
```
All navigable controls (toggle, Root AIOS, File Map, Mayurika, Suman, Arun,
Rajiv, Paraparan, Staff Data icons) share the identical box model
(`.app-nav-icon`, `.app-nav-btn`), so this single proof covers every item —
no per-item alignment rule was added anywhere.

## 5. Toggle Alignment (Step 4)

- Horizontally centered in the rail: proven exact in §4.
- Vertical top spacing: sidebar's own top padding raised `--space-4` (16px) → `--space-5` (20px), a shared token-based value (not an arbitrary absolute), applied uniformly in both expanded and collapsed modes — addresses "too close to the top-left edge" without introducing mode-specific top offsets that could cause a jump during the collapse/expand transition.
- Does not touch the sidebar edge (still 12px inset via sidebar padding) or overlap the first nav group (its own `margin-bottom` — see §7 — keeps Root AIOS clear).
- `aria-expanded`, `aria-controls`, `aria-label` ("Collapse sidebar"/"Expand sidebar"), and the `:focus-visible` ring are all untouched — confirmed zero diff to those attributes/rules.
- No duplicate toggle markup was created — the same single button (`#sidebarCollapseToggle`) and its existing `navigation.js` handler (zero diff) were reused.

## 6. Navigation Row Normalization (Step 5)

Row height, icon size, border radius, and hover/focus target size were
**already uniform** across all 8 items (all share one `.app-nav-btn` /
`.app-nav-icon` rule set) — the *appearance* of "inconsistent spacing" was
entirely explained by Bug 1/2 (icon off-center by a few px, varying
slightly by label-text width because the phantom gap's effect interacted
with each button's specific content), not by any actual per-row size
difference. No text-label width can affect collapsed alignment now — the
label is `flex:0 0 0` (zero basis, doesn't grow) regardless of its text
length, and with the phantom gap removed, the icon's centering math no
longer references the label at all.

## 7. Active-Item Alignment (Step 6)

Implemented Step 6's **Option B** (absolutely positioned pseudo-element):
`.app-nav-btn` gained `position:relative` and a `::before` inset accent bar
(`position:absolute; left:0; top:6px; bottom:6px; width:3px`), transparent
by default, colored `var(--accent)` only via `.app-nav-btn.active::before`.
The old `border-left:3px` (Bug 2) was removed entirely and padding
normalized to symmetric `7px 10px`. The accent now **never** affects layout
width in either active or inactive state, in either expanded or collapsed
mode — icon centering is identical regardless of which item is active.

## 8. Group Spacing (Step 7)

- `.app-sidebar-top-row` gained `margin-bottom: var(--space-2)` (8px) — restores the space Bug 3 was swallowing, matching what MEMBERS/DATA's titles already provide.
- Between-group spacing (`.app-sidebar-group + .app-sidebar-group { margin-top: var(--space-3) }`, 12px) was left unchanged — already consistent and "clear but compact"; the inconsistency was in the *first* group only (Bug 3), not between groups.
- Collapsed-mode group-label collapse (`height:0; opacity:0`) was not modified — titles still occupy zero visual height, so no oversized blank rows are introduced.
- No extra margin exists before Staff Data beyond the same standard between-group spacing every group gets.
- Semantic group structure (3 `<div class="app-sidebar-group">` blocks) is untouched.

## 9. Fixed-Header Spacing (Step 8)

`.app-sidebar`'s `position: sticky; top: var(--header-height)` (56px,
unchanged) already begins the sidebar immediately below the fixed header —
confirmed zero diff to this rule. Only the sidebar's own internal top
padding changed (§5), which is itself token-based (`--space-5`), not an
arbitrary value unrelated to the header token.

## 10. Main Workspace Balance (Step 9)

Not reworked — confirmed zero diff to the `body.sidebar-collapsed
.tab-panel { max-width: calc(...) }` rule from the prior approved task. The
sidebar's own horizontal padding (12px, unchanged) was never part of that
calculation (only `--sidebar-collapsed-width`, 76px, is — also unchanged),
so this alignment fix cannot have altered the content-width math.

## 11. Expanded-Mode Safety (Step 10)

- Sidebar width: unchanged (`--sidebar-width`, 252px, zero diff).
- Labels/subtitles: unchanged (`.app-nav-btn-text`/`.app-nav-btn-sub` rules untouched).
- Toggle/OVERVIEW alignment: unchanged mechanism (same row, same `justify-content:space-between`), only the shared vertical-padding and accent-bar improvements apply (harmless per Step 10 — the border-left removal and padding symmetry fix improve expanded mode too, e.g. label text gains a couple of extra px of room since the always-reserved 3px border is gone).
- Active item: still shows via `::before` accent + `background:var(--accent-light)` + `color:var(--accent)` — same visual language, now width-stable.
- Group spacing: same between-group margin; Overview row now gets its intended 8px gap before Root AIOS (a genuine improvement, not a regression).
- No first-load layout shift: `body` carries no `sidebar-collapsed` class by default (session-only state, unchanged), so expanded mode's rendering path on load is unaffected by anything in this task.

## 12. Responsive Safety (Step 11)

Every new/changed rule scoped to collapsed mode lives inside the
pre-existing `@media (min-width: 1024px)` block (confirmed via `git diff`
hunk locations — none fall inside or near the `@media (max-width: 1023px)`
drawer block, which starts at a later, untouched line). Below 1024px,
`body.sidebar-collapsed` has no visual effect (the toggle stays
`display:none` there, unchanged from a prior task) — the drawer and its
single `#sidebarToggle` control are completely unaffected; no competing
control is introduced.

## 13. Visual Validation — Reasoned From Source (see §15 for the limitation)

At 1440px/1600px (and in fact at every width, since the collapsed rail's
own internal geometry is independent of viewport width — only the
`.tab-panel` content area, untouched in this task, varies with viewport):
toggle and every icon share the algebraically-proven 38px center line
(§4); no horizontal overflow is possible (nothing in this change alters
any element's total width, only internal centering); row heights and group
gaps are uniform per §6/§8. Expanded mode at the same widths: width/labels
unchanged, only the shared padding/accent improvements apply.

## 14. Schedule Summary / Calendar Unchanged

Confirmed — `git diff --stat -- web-view/css/calendar.css
web-view/js/calendar/instance.js` returns empty. Neither file was touched.

## 15. Real Browser Validation — NOT PERFORMED

As in every task this session, **no browser-automation or screenshot tool
is available in this environment.** All centering math in §4 is derived
algebraically from the actual CSS box model (padding, border, gap, flex
sizing) as confirmed by direct file inspection and a precise Python
re-computation using the exact shipped values — not measured from a
rendered page or browser computed styles, per the task's own fallback
instruction. Rendered pixel alignment, hover/focus states, and the
transition between expanded/collapsed could not be visually observed. Per
the task's own instruction ("Do not claim live success until the collapsed
rail is inspected in a real browser"), this is called out explicitly.

## 16. Static Checks (executed)

- CSS brace balance — `navigation.css` 77/77 (only file changed; all others zero diff).
- HTML tag-balance scan on `index.html` — 0 unclosed, 0 mismatches (file itself has zero diff this task).
- Duplicate-id scan — 22 ids, 22 unique, 0 duplicates.
- Local static HTTP server — all 8 checked assets return HTTP 200.
- `git diff --stat -- backend/ database/` — empty.
- `git diff --stat -- web-view/js/` — empty (no JavaScript changed).
- `git diff --stat -- web-view/index.html` — empty.
- `git diff --stat -- web-view/css/calendar.css` — empty (Schedule Summary/calendar logic untouched).
- `git diff --stat` overall — exactly 1 file: `web-view/css/navigation.css` (72 lines).

## 17. Result

**AMBER.** Three distinct misalignment root causes were proven (not
assumed) by direct CSS inspection, fixed with a single shared mechanism
(remove the phantom gap; replace the width-consuming border with an
absolutely-positioned accent; restore the swallowed row margin) rather than
per-item patches, and the resulting toggle/icon centering is verified exact
by calculation using the actual shipped CSS values. Expanded mode, the
mobile drawer, content-width math, calendar, and Schedule Summary all show
zero diff. Withheld from PASS solely because real-browser inspection of the
rendered collapsed rail (Step 12/16 mandatory) could not be performed in
this environment.
