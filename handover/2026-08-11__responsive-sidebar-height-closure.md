# Handover — Responsive Sidebar Height (No Internal Scrollbars)

**Requirement:** REQ-SIDEBAR-RESP-008 — the Management AIOS left sidebar
must adapt to shorter viewport heights (reduced vertical gaps/padding/
icon size) instead of ever producing an internal vertical or horizontal
scrollbar, while keeping every nav item (including locked, unauthenticated
ones), every section, and all text visible.

**Requirement doc:** `docs/responsive-sidebar-height-requirement-2026-08-11.md`
**Validation:** `validation/responsive-sidebar-height-check-2026-08-11.md`

---

## Files Changed

| File | Nature of change |
|---|---|
| `web-view/css/navigation.css` | `.app-sidebar` `overflow-y: auto` → `overflow-y: visible`; two new `@media (max-height: …)` tiers (820px, 620px) that progressively shrink sidebar padding, inter-group margin, title padding, top-row margin, nav-btn padding, and icon/toggle box size |
| `web-view/js/sidebar-height-responsive.test.mjs` (new) | 21 structural tests covering scrollbar absence, nav-item/section-heading presence, compact-tier existence, and that no tier hides any item/label |

**Not changed (zero diff):** `web-view/index.html`, `web-view/js/navigation.js`, `web-view/js/auth-gate.js`, all other CSS files, backend, database, `member-aios/mayurika-hr/staff-data/`.

## Strategy

Strategy A only (user-approved, requirement §3) — no alternative
substituted, no blocker hit. Sidebar **width** is untouched at every
tier; only vertical density (padding/margin/gap/icon size) shrinks as
viewport height shrinks, via two `max-height` media query tiers layered
on top of the existing `≥1024px` collapse / `<1024px` drawer width
breakpoints (an independent axis — both can apply simultaneously).

## Root Cause (see validation doc §3 for full measured values)

The sidebar's fixed padding (20px), inter-group spacing (2px gap + 12px
margin ×3), title padding (12px ×4), and 44px-tall nav rows (32px icon +
12px padding, ×9 rows) never shrank on any viewport — so below roughly
650-700px tall, `.app-sidebar`'s own `overflow-y: auto` produced a
scrollbar instead of the content adapting.

## Breakpoints

`@media (max-height: 820px)` (compact) and `@media (max-height: 620px)`
(very compact), chosen with deliberate headroom above/below the sidebar's
computed box-model floors (~610px / ~461px / ~375px respectively) rather
than pinned to the exact edge, since exact title/label text line-height
cannot be measured without a real browser rendering engine in this
environment (no Playwright/Puppeteer/jsdom dependency exists in this
repo). Full before/after value table in the validation doc §6.

## Scrollbar Removal

`overflow-y: auto` → `overflow-y: visible` on `.app-sidebar`. No
`overflow-y`/`overflow-x` `auto`/`scroll` remains anywhere on the sidebar
— confirmed by grep and by test. The fix relies on the compact tiers
making content actually fit, not on clipping (`overflow: hidden` was
never introduced).

## Auth / Lock Behavior

Zero diff to `web-view/js/auth-gate.js` or `web-view/js/navigation.js` —
this was a CSS-only task. Data/Issues/Knowledge Management remain
unconditionally present in the DOM at every height tier (never hidden),
with their locked styling and dialog behavior fully unaffected.

## Tests

New file `web-view/js/sidebar-height-responsive.test.mjs`: 21/21 pass.
Full frontend suite: **562/562 pass** (`web-view/js/*.test.mjs`: 381/381;
`web-view/js/calendar/*.test.mjs`: 181/181) — zero regressions.

## Deployment Result

**Not pushed** — committed locally only, per instruction. `git push` was
not run.

## Commit Hash

Recorded in the final report in this conversation (this doc is written
and staged before that commit exists, per the repository's established
handover convention).

## Known Limitations

- **No real browser/visual validation was possible in this session** — no
  browser-automation, screenshot, or jsdom tool is available in this
  environment (confirmed: the only `package.json` in the repo declares no
  dependencies; every existing test file in `web-view/js/` hand-builds its
  own DOM stand-in for the same stated reason). This is why the validation
  doc's result is PASS-AMBER, not PASS. Every fit/breakpoint claim is
  reasoned from the actual shipped CSS box-model values (padding, margin,
  gap, explicit icon/toggle sizes), not observed on a rendered page.
- Title and subtitle text line-height (a font-rendering fact, not a CSS
  declaration) could not be measured pixel-for-pixel — breakpoints were
  chosen with headroom to absorb this rather than computed to an exact
  edge; see validation doc §5/§14.
- 200% browser zoom was reasoned about (media queries respond to the
  effective CSS viewport, which zoom changes) but not independently
  re-verified beyond that mechanism, for the same tooling-availability
  reason.

## One Next Step

Open the deployed dashboard in a real browser, check 1920×1080, 1366×768,
1280×720, 1024×768, a short-height laptop viewport, and 200% zoom;
confirm no sidebar scrollbar appears and all 11 nav items / 4 section
headings stay visible and readable at every size — then update the
validation doc's result from PASS-AMBER to PASS.

## Result

**PASS-AMBER** — see validation doc §16 for the full rationale.
