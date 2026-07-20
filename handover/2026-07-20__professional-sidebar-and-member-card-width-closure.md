# Handover — Professional Sidebar Polish, Arun Icon Correction,
# Collapse-Control Redesign, Member Card Width — 2026-07-20

## Summary

Frontend-only polish pass on the application sidebar and member
introduction cards. Fixed Arun's inappropriate "stacked layer" icon,
redesigned the collapse/expand control to use two distinct purpose-drawn
icons instead of one rotated chevron, enlarged the nav icon boxes/row
height for a more professional feel, and widened the shared member
introduction text column so it uses more of the available card width.
Full detail and evidence: [validation/professional-sidebar-and-member-card-width-check-2026-07-20.md](../validation/professional-sidebar-and-member-card-width-check-2026-07-20.md).

## Files changed

| File | What changed |
|---|---|
| `web-view/index.html` | Arun icon SVG (3-line stack → two connected process nodes); collapse-toggle button markup (1 rotated SVG → 2 purpose-drawn SVGs, collapse-state and expand-state) |
| `web-view/css/navigation.css` | `.app-nav-icon`/`.app-nav-icon svg` enlarged (24px→32px / 14px→18px); `.app-nav-btn` vertical padding 7px→6px; `.app-sidebar-collapse-toggle` enlarged 26px→32px, `rotate(180deg)` removed, new `.app-sidebar-collapse-icon*` show/hide rules added; `.app-nav-btn-badge` font-size/padding reduced (sidebar-scoped only) |
| `web-view/css/components.css` | `.member-header-info .role-label`, `.member-header-lede`, `.member-header-note` — `max-width` 60ch/68ch/68ch → 88ch (one shared rule, all three) |

No other file changed — confirmed via `git diff --stat` (backend/,
database/, calendar JS/CSS, base.css, tokens.css, navigation.js, app.js
all show zero diff).

## Ownership map

- **Sidebar markup**: `web-view/index.html`, `<nav class="app-sidebar" id="appSidebar">` block.
- **Sidebar styling**: `web-view/css/navigation.css` — sole owner of `.app-sidebar*`, `.app-nav-*` selectors (confirmed via repo-wide grep before editing).
- **Sidebar behavior**: `web-view/js/navigation.js`, `initNavigation()` — not modified this task; the icon swap and badge-size fix are pure CSS/HTML, no new JS needed.
- **Collapse-control markup/styling**: same files as above — `#sidebarCollapseToggle` button, `.app-sidebar-collapse-toggle`/`.app-sidebar-collapse-icon-*` rules.
- **Member introduction cards**: `.member-header`/`.member-header-info`/`.role-label`/`.member-header-lede`/`.member-header-note` — markup per-member in `index.html`, shared styling in `components.css`. Paraparan/Staff Data use a lighter `member-header` variant (h2 + short classification badge only, no lede/note) — pre-existing, not restructured by this task.

## Shared width rule (member cards)

One rule, three selectors, applied identically regardless of which
member's tab it's in:

```css
.member-header-info .role-label { max-width: 88ch; }
.member-header-lede { max-width: 88ch; }
.member-header-note { max-width: 88ch; }
```

`max-width` (not `width`) — still collapses to 100% of the card on
narrow/mobile screens exactly as before, no separate mobile override
needed. No member-specific selector or inline style was added anywhere.

## Responsive boundaries (unchanged from before this task)

- `≥1024px`: sidebar is a static column (252px expanded / 76px
  collapsed via `body.sidebar-collapsed`); desktop collapse toggle
  visible.
- `<1024px`: sidebar becomes a fixed off-canvas drawer (`min(252px,
  82vw)`), opened via the header hamburger (`#sidebarToggle`); desktop
  collapse toggle hidden.
- `.tab-panel--calendar` (the 5 member tabs) keep their existing
  `88vw`/derived `max-width` formulas — untouched by this task; the
  member-card width change is independent of that container-width
  logic (it only affects how much of that container's width the intro
  text itself uses).

## Deployment

Deploy through the existing Vercel process (static `web-view/`
directory, no backend/build-step changes). No environment variables,
migrations, or API contract changes are involved — this is a pure
static-asset change.

## Rollback

Revert the single commit that lands these changes (or restore the three
files — `web-view/index.html`, `web-view/css/navigation.css`,
`web-view/css/components.css` — to the prior commit). No data,
migration, or backend state is affected, so rollback is a plain
file-level `git revert`.

## Commit hashes

Pre-change `HEAD`: `5a7f9f846953616370f8529a632087ee797e083f` (short
`5a7f9f8`, "Document responsive task popup validation"). This task's
implementation/evidence commit hashes are filled in at commit time (see
repo `git log`).

## Known limitations

- The Root AIOS row's "Needs Confirmation" badge still doesn't leave
  enough room for the full "Root AIOS" label at ≤1440px — this predates
  this task (confirmed against the unmodified baseline) and was
  mitigated, not fully solved, by scoping down that one badge's size.
  Full elimination needs either a wider sidebar rail or a shorter badge
  label, both out of this task's scope. See validation §7.
- Playwright's own bundled Chromium could not be downloaded in this
  sandbox (blocked npm-registry HTTPS); browser validation used the
  machine's installed Google Chrome via `executablePath` instead. Same
  rendering engine family, but noted for transparency.
- Member introduction text still leaves a visible (much-reduced) gap at
  very wide viewports (≥1600px) — intentional, per the task's own
  75-95ch readability-cap instruction, not a residual bug.

## One next step

Get sidebar-owner (whoever reviews frontend/UX changes per
CLAUDE.md §18) sign-off on the new Arun/workflow icon and the
collapse-control redesign before/at the next deploy, since icon
semantics are a visual judgment call, not something derivable purely
from the confirmed source register.
