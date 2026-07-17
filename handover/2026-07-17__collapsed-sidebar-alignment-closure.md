# Handover — Collapsed Sidebar Alignment Polish

**Requirement:** The collapsed desktop sidebar rail looked visually
misaligned (toggle too close to the top-left edge and not aligned with the
nav icons; inconsistent icon spacing; uneven active-item accent;
inconsistent group rhythm). Fix alignment only — CSS/markup, no behavior
change.

**Validation:** `validation/collapsed-sidebar-alignment-check-2026-07-17.md`

---

## Files Changed

| File | Nature of change |
|---|---|
| `web-view/css/navigation.css` | Sidebar top/bottom padding `--space-4`→`--space-5`; `.app-nav-btn` border-left removed, replaced with a `position:absolute` `::before` active-accent bar, padding made symmetric; `.app-sidebar-top-row` gained `margin-bottom`; collapsed-mode `gap:0` added to both `.app-sidebar-top-row` and `.app-nav-btn` to eliminate a phantom flex-gap reservation |

**Not changed (zero diff):** `web-view/index.html`, `web-view/js/navigation.js`, `web-view/js/calendar/instance.js`, `web-view/css/calendar.css`, `web-view/css/components.css`, `web-view/css/tokens.css`, `web-view/css/base.css`, `web-view/css/staff-data.css`, `backend/`, `database/`, `member-aios/mayurika-hr/staff-data/`.

## Selectors Changed

`.app-sidebar` (padding), `.app-nav-btn` (border removed, padding
symmetric, `position:relative` added, new `::before`), `.app-nav-btn.active`
(border-color rule removed — accent now lives entirely in `::before`),
`.app-sidebar-top-row` (`margin-bottom` added; collapsed `gap:0`),
`body.sidebar-collapsed .app-nav-btn` (collapsed `gap:0` replaces the old
`padding-left`/`padding-right` override, now redundant since base padding
is already symmetric).

## Alignment Ownership

Single shared mechanism, no per-item rules: every navigable control (the
toggle and all 8 sidebar items) uses the same `.app-nav-icon`/`.app-nav-btn`
(or, for the toggle, `.app-sidebar-collapse-toggle`/`.app-sidebar-top-row`)
box model. Fixing the two shared bugs (phantom gap, asymmetric border) in
those shared rules corrected every item's alignment simultaneously — no
selector targets an individual member/panel icon.

## Root Causes (see validation doc §2 for full detail)

1. Flex `gap` still reserved space for the OVERVIEW title / nav-btn labels after they collapsed to `width:0` (they use `opacity:0`, not `display:none`, to stay accessible) — this pushed the toggle and every icon off-center by roughly half the relevant gap value.
2. `.app-nav-btn`'s always-present `border-left:3px` (only its color changed on `.active`) combined with asymmetric padding to skew the content box regardless of active state.
3. `.app-sidebar-top-row`'s height was driven by the 26px toggle, not the OVERVIEW title, so the title's own padding-bottom never produced visible spacing before Root AIOS.

## Responsive Boundary

Unchanged: `≥1024px` collapse rail, `<1024px` drawer (its own existing
`#sidebarToggle`, zero diff). All collapsed-specific rules in this task are
scoped inside the pre-existing `@media (min-width:1024px)` block; the
`@media (max-width:1023px)` drawer block has zero diff.

## Deployment Result

Pushed to `origin/main`; live-site confirmation pending — see the final
report in this conversation for the post-push check against
`management-aios.vercel.app`.

## Commit Hashes

- `2b5d67b` — "Polish collapsed sidebar alignment" (single commit — the fix is one cohesive change to one file; no interleaving-risk split was needed this time).
- Documentation commit hash: recorded in the final report (this doc is written and committed before that commit exists).

## Known Limitations

- **No real browser validation was possible in this session** — no browser/screenshot tool available. This is why the result is AMBER, not PASS. Every alignment claim in the validation doc is an algebraic proof against the actual shipped CSS values (independently re-verified with a Python script), not a rendered/measured observation.
- Icon and toggle sizes (24px / 26px) were deliberately left as-is rather than unified to the task's suggested "36×36px or current equivalent" — resizing icons would have touched expanded mode too (icons are shared between both states), and the actual requirement (a shared center x-position) is fully satisfied without a size change, per the algebraic proof in the validation doc §4.
- The `::before` active-accent bar's `top:6px; bottom:6px` inset values were chosen for a clean "pill" look consistent with the existing rounded button (`border-radius: var(--radius-sm)`) but were not visually confirmed in a browser.

## One Next Step

Open the deployed dashboard in a real browser at 1440px/1600px, collapse the
sidebar, and visually confirm the toggle and every icon sit on the same
vertical center line, the active item's accent bar looks even in both
states, and there is no layout shift or flicker during the collapse/expand
transition — then update the validation doc's result from AMBER to PASS.

## Result

**AMBER** — see validation doc §17 for the full rationale.
