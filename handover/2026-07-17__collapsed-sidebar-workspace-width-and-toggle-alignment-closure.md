# Handover — Collapsed-Sidebar Workspace Width and Toggle Alignment

**Requirement:** When the desktop sidebar is collapsed, reclaim 50% of the
unused horizontal gap on each side of the main content (content expands
accordingly), and move the collapse/expand toggle to align horizontally
with the OVERVIEW heading.

**Validation:** `validation/collapsed-sidebar-workspace-width-and-toggle-alignment-check-2026-07-17.md`

---

## Files Changed

| File | Nature of change |
|---|---|
| `web-view/css/navigation.css` | New `.app-sidebar-top-row` layout (toggle + OVERVIEW title share one row); new `body.sidebar-collapsed .tab-panel { max-width: calc(...) }` width-recovery formula; collapsed-state centering/width-collapse rules for the moved toggle/title |
| `web-view/index.html` | Moved `#sidebarCollapseToggle` from being `.app-sidebar`'s first child into the new `.app-sidebar-top-row`, alongside the "Overview" title — all attributes (`aria-expanded`, `aria-controls`, `aria-label`, `title`, the SVG) unchanged |

**Not changed (zero diff):** `web-view/js/navigation.js`,
`web-view/js/calendar/instance.js`, `web-view/css/calendar.css`,
`web-view/css/components.css`, `web-view/css/tokens.css`,
`web-view/css/base.css`, `web-view/css/staff-data.css`, `backend/`,
`database/`, `member-aios/mayurika-hr/staff-data/`.

## Layout Ownership

The width fix lives entirely in `.tab-panel` — the one shared wrapper every
panel (Root AIOS, File Map, all 5 members, Staff Data) renders inside. No
panel-specific width override exists anywhere; every panel, including each
member's mounted calendar, inherits the change automatically.

## Collapsed-State Class

`body.sidebar-collapsed` — unchanged from the prior task (this task adds
new rules scoped under it, doesn't introduce a new class). Toggled by the
same `#sidebarCollapseToggle` click handler in `navigation.js`, which has
zero diff this task — only the button's HTML position and its own CSS
moved.

## Toggle Placement

**Before:** first child of `.app-sidebar`, its own row above the OVERVIEW
group, right-aligned.
**After:** inside `.app-sidebar-top-row`, sharing that row with the
"Overview" heading text — `justify-content:space-between` in expanded mode
(title left, toggle right), `justify-content:center` in collapsed mode
(title's width collapses to 0, so the toggle alone centers in the 76px
rail). Vertical alignment with OVERVIEW is now structural (same flex row),
not an estimated offset.

## Responsive Behavior

Both new CSS rules are scoped inside the pre-existing
`@media (min-width: 1024px)` collapse block. Below 1024px, `body.
sidebar-collapsed` has no effect (the toggle itself stays `display:none`
there, unchanged from the prior task) — the existing drawer
(`@media (max-width:1023px)`, zero diff) and its single `#sidebarToggle`
control are entirely untouched, so there is never more than one sidebar
control visible at any width.

## Retained Functionality

- Expanded-mode `.tab-panel` max-width (1240px) — zero diff, unaffected by the new collapsed-only override.
- Sidebar expanded width (252px) — unchanged.
- Collapsed sidebar width (76px) — unchanged.
- Nav icon centering, active-state styling, accessible tooltips — all pre-existing, zero diff.
- Calendar rendering, Schedule Summary logic/labels/values, task/leave logic — zero diff to `calendar.css`/`calendar/instance.js`.
- Mobile drawer open/close/backdrop/Escape — zero diff.

## Deployment Result

Pushed to `origin/main`; live-site confirmation pending — see the final
report in this conversation for the post-push check against
`management-aios.vercel.app`.

## Commit Hashes

- `07591ff` — "Expand workspace in collapsed sidebar mode; align sidebar toggle with Overview heading" (both changes combined into one commit — the width-formula and toggle-alignment CSS rules share the same diff hunks in `navigation.css`, so a clean per-feature split risked a broken intermediate commit; same judgment call made consistently in prior tasks this session).
- Documentation commit hash: recorded in the final report (this doc is written and committed before that commit exists).

## Known Limitations

- **No real browser validation was possible in this session** — no browser/screenshot tool available. This is why the result is AMBER, not PASS. All gap/width/alignment figures in the validation doc are derived algebraically from the actual CSS rules, not measured from a rendered page.
- The "50% reclaim" target was interpreted as the auto-margin component specifically (the actual proven "unused" source), not the total visible gap including the fixed 16px padding — the validation doc's §4 shows both the exact-50% auto-margin table and the resulting (lower, width-dependent, 30–48%) total-visible-gap percentage for full transparency. If the stricter "halve the total visible gap including padding" reading was intended, that would require also touching the collapsed-mode padding, which was deliberately left alone as out-of-scope, separately-optimized spacing.
- The new `max-width` `calc()` expression depends on `100vw`, which does not account for a vertical scrollbar's width (typically ~15–17px on Windows/Chrome) — a very minor (a few-pixel) imprecision at the far right edge on platforms with an always-visible scrollbar, not expected to be visually significant but not verified in a real browser.

## One Next Step

Open the deployed dashboard in a real browser at 1920/1600/1440/1366/1024px
widths with the sidebar collapsed, measure the actual left/right gaps via
DevTools computed styles, confirm each is 50% of its expanded-mode-collapsed
counterpart per the validation doc's table, confirm the toggle's vertical
center visually lines up with "OVERVIEW," and check the console for errors
— then update the validation doc's result from AMBER to PASS.

## Result

**AMBER** — see validation doc §17 for the full rationale.
