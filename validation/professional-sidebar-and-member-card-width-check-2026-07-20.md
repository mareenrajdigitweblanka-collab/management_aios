# Professional Sidebar Polish, Arun Icon Correction, Collapse-Control
# Redesign, and Member Introduction Card Width Check — 2026-07-20

## 1. Scope

Frontend UI/UX only. No backend, database, migration, API, calendar,
Task/Leave, overlap-rule, Schedule Summary, Staff Data, member-key, or
navigation-target-panel-ID change. Protected path
`member-aios/mayurika-hr/staff-data/` untouched (confirmed still
untracked/unmodified — see §12).

## 2. User-confirmed requirements (source of truth)

1. Arun's sidebar icon (a 3-line "stacked layer" glyph) is not appropriate.
2. Replace it with an icon clearly representing **Implementation**.
3. Improve the sidebar collapse/expand icons.
4. Make the complete application sidebar more professional and attractive.
5. Member introduction cards leave a large unused empty area on the right.
6. Make member introduction text use more of the available card width.
7. Apply the width improvement consistently to Mayurika, Suman, Arun,
   Rajiv, Paraparan.
8. Paraparan's role must remain **Auditor**.
9. Preserve all existing navigation and functionality.

## 3. Files touched

Only three files changed (confirmed via `git diff --stat`):

| File | Change |
|---|---|
| `web-view/index.html` | Arun's icon SVG paths; collapse-toggle button now holds two purpose-drawn SVGs instead of one rotated chevron |
| `web-view/css/navigation.css` | Nav icon box 24px→32px (svg 14px→18px); row padding 7px→6px vertical (44-45px row height); collapse-toggle 26px→32px, rotate-transform replaced with icon show/hide; sidebar-scoped badge size reduced to reclaim label width |
| `web-view/css/components.css` | `.role-label`/`.member-header-lede`/`.member-header-note` max-width 60ch/68ch/68ch → 88ch (one shared rule) |

`base.css`, `tokens.css`, `navigation.js`, `app.js` were inspected (per
task instruction) but required no change — confirmed zero diff on all
four (`git diff --stat` empty for each).

## 4. Icon ownership and mapping (Step 3)

All sidebar icons are inline SVG inside `.app-nav-icon` in
`web-view/index.html`, styled once by `.app-nav-icon`/`.app-nav-icon svg`
in `navigation.css` — one shared family: `viewBox="0 0 20 20"`,
`stroke="currentColor"`, `stroke-width="1.8"`, `stroke-linecap="round"`,
`stroke-linejoin="round"`, `fill="none"`. Inspection confirmed 7 of 8
icons already matched the required semantic mapping and needed no
change; only Arun's was wrong.

| Nav item | Icon | Status |
|---|---|---|
| Root AIOS | House/roof outline | Unchanged — already correct |
| File Map | Folder outline | Unchanged — already correct |
| Mayurika / HR | Single person (circle + shoulders) | Unchanged — already correct |
| Suman / Recruitment | Person + plus sign | Unchanged — already correct |
| **Arun / Implementation** | **3-line stacked/layered triangle (read as a data/layer stack)** → **two connected process nodes (workflow icon)** | **Changed (this task)** |
| Rajiv / Admin | Shield outline | Unchanged — already correct |
| Paraparan / Auditor | Clipboard with checkmark | Unchanged — already correct |
| Staff Data | Database cylinder (ellipse + walls) | Unchanged — already correct |

## 5. Old vs. new Arun icon (Steps 1, 4)

**Old** — 3 stacked chevron/diamond paths (reads as a layered stack,
visually close to the Staff Data database icon — explicitly disallowed):

```html
<path d="M10 3.5l6.5 3.2-6.5 3.2-6.5-3.2z" />
<path d="M3.5 10l6.5 3.2 6.5-3.2" />
<path d="M3.5 13.3l6.5 3.2 6.5-3.2" />
```

**New** — two connected process/workflow nodes (a small rounded square,
a connecting line, a second rounded square) — reads as a process/
implementation flow, distinct from the database, layers, shield, and
clipboard icons used elsewhere in the sidebar:

```html
<rect x="2.6" y="2.6" width="6.6" height="6.6" rx="1.6" />
<path d="M5.9 9.2v2.8a1.7 1.7 0 0 0 1.7 1.7h2.8" />
<rect x="10.8" y="10.8" width="6.6" height="6.6" rx="1.6" />
```

Verified via a cropped browser screenshot
(`zoom-arun-icon-expanded.png`) — renders as two connected boxes, clearly
distinct from a stack/database/clipboard/shield. Visible label
"Implementation" (role subtitle) unchanged — not touched, per Step 4.
`data-tab="arun-implementation"`, member key, panel ID, and calendar data
unchanged (confirmed by diff — only the two `<path>`/`<rect>` children
inside the icon `<span>` changed).

## 6. Collapse/expand control redesign (Step 5)

**Old**: one 14px chevron path (`M12.5 4l-6 6 6 6`) inside a 26×26px
button, rotated 180deg via CSS transition when collapsed — same glyph
spun to face the other way, not two distinct purpose-drawn icons.

**New**: a 32×32px button (matching the enlarged 32px nav-icon boxes so
it reads as part of the same rail, not a detached small arrow) holding
two separate 18px SVGs — a "panel-left-close" icon (rectangle + divider
+ left-pointing chevron) shown when expanded, and a "panel-left-open"
icon (same rectangle + divider, right-pointing chevron) shown when
collapsed:

```html
<!-- shown expanded, action = collapse -->
<rect x="3" y="4" width="14" height="12" rx="2" /><path d="M8 4v12" /><path d="M13 8l-2.3 2 2.3 2" />
<!-- shown collapsed, action = expand -->
<rect x="3" y="4" width="14" height="12" rx="2" /><path d="M8 4v12" /><path d="M10.7 8l2.3 2-2.3 2" />
```

Which SVG is visible is driven by `body.sidebar-collapsed` in CSS
(`.app-sidebar-collapse-icon-expand { display:none; }` by default,
swapped in the existing collapsed-mode media-query block) — **no
JavaScript change**. `navigation.js`'s existing
`aria-expanded`/`aria-label`/`title` toggle logic (already correct —
flips to `"Expand sidebar"` / `"Collapse sidebar"`) is untouched and
still drives the correct accessible name; confirmed via
`git diff --stat -- web-view/js/navigation.js` (empty).

Verified in-browser: `zoom-collapse-toggle-expanded.png` shows the
left-pointing panel icon; `zoom-collapse-toggle-collapsed.png` shows the
right-pointing panel icon after clicking. `results.json` confirms
`expandVisible:true`/`collapseIconVisible:false` when collapsed, and the
reverse when expanded, at every desktop breakpoint tested.

## 7. Sidebar visual-system polish (Steps 6-9)

| Property | Old | New | Target (task) |
|---|---|---|---|
| Icon box | 24×24px | 32×32px | 30-34px ✓ |
| Icon glyph | 14×14px | 18×18px | 18-20px ✓ |
| Row height | ~38px (7px pad + 24px icon) | 44-45px (6px pad + 32px icon) | 42-48px ✓ |
| Collapse-toggle box | 26×26px | 32×32px | matches nav-icon box |
| Expanded sidebar width | 252px | 252px (unchanged) | — |
| Collapsed sidebar width | 76px | 76px (unchanged) | — |

Nav item order (Step 6) is **unchanged** — confirmed by diff: Root AIOS,
File Map, Mayurika, Suman, Arun, Rajiv, Paraparan, Staff Data, in the
same OVERVIEW/MEMBERS/DATA groups, same `data-tab` values.

Active/hover/focus (already implemented pre-task, left untouched except
for the icon-box size they render inside): active row = soft blue
background (`--accent-light`) + blue icon/text + a narrow left inset
accent bar (`::before`); hover = neutral tint (`--surface-tint-3`);
`:focus-visible` = `--focus-ring` box-shadow. Confirmed unchanged and
still rendering correctly in every screenshot.

**One pre-existing item observed (not part of this task's scope, not
newly introduced):** the Root AIOS row's "Needs Confirmation" badge
already consumed most of the 227px available row width before this
task — the label was already truncating (`Root AIOS` → ellipsis) on the
unmodified baseline at 1440px (measured: `labelScrollWidth 65px >
labelClientWidth 46px`, confirmed against `git show HEAD:...`). The
32px icon box (was 24px) leaves 8px less room and would have made this
marginally worse (46px → 38px); to avoid regressing it, this task also
scoped down the sidebar-only `.app-nav-btn-badge` (not the shared
`.tab-badge` used elsewhere) to reclaim space — net result is an
**improvement over the baseline** (46px → 52px available for the
label), though the label still doesn't fit in full at 1440px (shows
"Root ..."). Full elimination would require widening the 252px sidebar
rail itself, which is out of scope for this task (many other completed
tasks' width math is derived from that exact token — see
`navigation.css` comments). The full label remains available via the
button's `title="Root AIOS"` attribute and is not a functional
regression.

## 8. Expanded-sidebar result (Step 8)

Confirmed via `results.json` (Playwright, all desktop breakpoints):
every icon box's horizontal center (`cx`) is identical across all 8 nav
items within a viewport (e.g. `38` at 1440px) — one shared vertical
axis. Labels/subtitles align under their own icon (flex row, no
absolute positioning) with no collision (row height 44-45px comfortably
fits label + subtitle stack). **PASS.**

## 9. Collapsed-sidebar result (Step 9)

Confirmed via `results.json`: at every desktop breakpoint, all 8 icon
centers **and** the collapse toggle's center are the same pixel value
(e.g. all `38` at 1440/1920px) — icons and the collapse control share
one vertical axis exactly, matching Step 9's requirement. No clipped
label fragments (`.app-nav-btn-text` collapses to `flex:0 0 0;
opacity:0`, no visible text). No initials (removed in a prior task, not
reintroduced). `aria-expanded`/`aria-label` verified correct
(`"false"`/`"Expand sidebar"` when collapsed). Active-row width
unaffected by the accent bar (`position:absolute`, doesn't add to flow
width — unchanged from before). Each item still has its native `title`
attribute (unchanged in the diff). **PASS.**

## 10. Mobile drawer result (Step 10)

Verified via Playwright at 390×844 and 834×1112 (`mobile-390-drawer.png`,
`tablet-834` in `results.json`): opening `#sidebarToggle` sets
`body.sidebar-open`, all 8 labels/subtitles visible and readable
(`"Root AIOS","File Map","Mayurika","Suman","Arun","Rajiv","Paraparan",
"Staff Data"`), semantic icons visible (including the new Arun icon),
backdrop dims the page, closing via backdrop click removes
`sidebar-open`. No horizontal overflow (`bodyOverflowX:false` at every
viewport, both drawer and rail). No desktop collapsed-rail rule leaked
in — `collapseVisible:false` below 1024px (the collapse toggle is
`display:none` there per the existing `@media (min-width:1024px)`
gate, untouched). **PASS.**

## 11. Member introduction card ownership (Step 11)

Shared structure (`web-view/index.html` + `components.css`), used
identically by Mayurika/Suman/Arun (all with `role-label` +
`member-header-lede` + `member-header-note`) and Rajiv (`role-label` +
`member-header-lede`, no note — pre-existing, wording untouched).
**Paraparan and Staff Data use a different, lighter `member-header`**
(just an `<h2>` + a short `.staff-pilot-classification-label` badge, no
`role-label`/`lede`/`note`) — this predates this task and was confirmed
by inspection, not assumed. Paraparan's longer descriptive text lives
in `.member-testing-table-note` instead (a separate, pre-existing
banner component in `staff-data.css` that is **already** full-card-width
flex layout with no `max-width` cap — it does not have the "narrow
column, big right-side gap" problem the other four members' cards had,
so there was nothing to widen there). No member-specific CSS was added
for any of the five members — one shared rule
(`.role-label`/`.member-header-lede`/`.member-header-note` in
`components.css`) covers all applicable cases.

## 12. Old vs. new member-text width (Steps 12-13)

| Element | Old max-width | New max-width |
|---|---|---|
| `.member-header-info .role-label` | 60ch | 88ch |
| `.member-header-lede` | 68ch | 88ch |
| `.member-header-note` | 68ch | 88ch |

88ch sits inside the requested 75-95ch band and is a `max-width` (not a
fixed `width`), so on narrow/mobile screens it still shrinks to 100% of
the available card width exactly as before — no new mobile-specific
rule was needed. No wording changed anywhere (confirmed — diff touches
only the `max-width` numeric values, zero text content edits).

Measured via Playwright (`results.json`, Arun's card, representative of
the shared rule):

| Viewport | Card width | Lede width — old (68ch, computed) | Lede width — new (88ch, measured) |
|---|---|---|---|
| 1024px (laptop) | 647px | ~484px | 597px (near-full, container-capped) |
| 1366-1920px (desktop) | 948-1436px | ~484px | 626px (ch-capped) |
| Tablet 834px | 702px | ~484px | 626px (near-full) |
| Mobile 390px | 311px | 100% of card | 261px (100% of card, unchanged behavior) |

The gap is **substantially reduced, not eliminated**, by design — Step
13 explicitly forbids forcing full-width text without a readability
cap, so at very wide viewports (1920px) some right-side space remains
intentionally (a ~90ch-wide paragraph is standard reading-width
practice regardless of container width).

## 13. Per-member result (Step 14)

| Member | Result |
|---|---|
| Mayurika | `role-label`/`lede`/`note` all present, all now capped at 88ch, verified rendering with no overflow/clipping at 1600px screenshot |
| Suman | Same shared rule applied, verified rendering correctly |
| Arun | Same shared rule applied, verified rendering correctly (see `1920x1080-arun.png`) |
| Rajiv | `role-label`/`lede` present (no `note`, pre-existing), same shared rule applied, verified rendering correctly |
| Paraparan | No `role-label`/`lede`/`note` in its `member-header` (different, lighter structure — see §11); its descriptive text already renders at full card width via the pre-existing `.member-testing-table-note` banner; confirmed no gap regression and no wording change; sidebar/nav label still reads "Paraparan — Auditor" |

No horizontal overflow at any tested viewport for any of the five
(`bodyOverflowX:false` throughout).

## 14. Responsive matrix (Step 18)

| Viewport | Sidebar (expanded/collapsed) | Icon alignment | Collapse-control alignment | Label/subtitle clipping | Member-card gap | Overflow-x |
|---|---|---|---|---|---|---|
| 1920×1080 | 252px / 76px | Single axis, cx=38 | Same axis as icons | None beyond pre-existing Root AIOS badge note (§7) | Reduced substantially, capped at 88ch by design | No |
| 1600×900 | 252px / 76px | Single axis | Aligned | None (beyond §7) | Reduced substantially | No |
| 1440×900 | 252px / 76px | Single axis | Aligned | None (beyond §7) | Reduced substantially | No |
| 1366×768 | 252px / 76px | Single axis | Aligned | None (beyond §7) | Reduced substantially | No |
| 1024px | 252px / 76px | Single axis | Aligned | None (beyond §7) | Near-full width (container-capped) | No |
| Tablet 834px | Drawer (252px, off-canvas by default) | N/A (drawer, not rail) | Toggle hidden (mobile hamburger only, correct) | Full labels visible in drawer | Near-full width | No |
| Mobile 390px | Drawer (min(252px,82vw)) | N/A | Toggle hidden (correct) | Full labels visible in drawer | Full width (100%, unchanged mobile behavior) | No |

## 15. Accessibility (Step 19)

- Decorative SVG icons: `aria-hidden="true"` on both the wrapping
  `.app-nav-icon` span and every inner `<svg>`, including the two new
  Arun-icon shapes and both new collapse-toggle SVGs — confirmed in the
  diff.
- Nav buttons retain accessible names via visible text (`.app-nav-btn-text`,
  still in the DOM even when visually collapsed to width 0 — unchanged).
- Collapsed items retain their native `title` attribute (unchanged).
- Active state: `aria-current="page"` toggled by `navigation.js`
  (unchanged) plus a non-color accent bar + background + bold text —
  not color-only.
- Collapse control: `aria-expanded` correctly flips `"true"`/`"false"`;
  `aria-label`/`title` correctly flip `"Collapse sidebar"`/`"Expand
  sidebar"` (existing `navigation.js` logic, unchanged, verified live).
- `:focus-visible` box-shadow ring present on both nav buttons and the
  collapse toggle (unchanged rule, still applies to the enlarged boxes).
- Text/icon sizes were only increased (18-20px icons, 88ch text cap),
  never decreased — no new 200%-zoom regression risk introduced.

## 16. Calendar / Schedule Summary / backend / database / API (Steps 15, 20)

Confirmed via targeted `git diff --stat`, all empty:

```
backend/                    — no changes
database/                   — no changes
web-view/js/calendar/       — no changes
web-view/css/calendar.css   — no changes
web-view/css/base.css       — no changes
web-view/css/tokens.css     — no changes
web-view/js/navigation.js   — no changes
web-view/js/app.js          — no changes
```

Only `web-view/index.html`, `web-view/css/navigation.css`, and
`web-view/css/components.css` changed (see §3).

## 17. Static checks (Step 20)

- `node --check` on all 6 files under `web-view/js/` (including
  `navigation.js`, `app.js`, and the 4 calendar modules) — all pass.
- CSS brace balance (`{`/`}` count) on `navigation.css`, `components.css`,
  `base.css`, `tokens.css` — all balanced.
- HTML tag-balance walk (custom Node script) over `index.html` — 0
  mismatches, 0 unclosed tags.
- Duplicate-`id` scan over `index.html` — 0 duplicates.
- `data-tab` → panel-id resolution — all 8 nav items resolve to an
  existing `tab-*` panel (unchanged set: `root-aios`, `file-map`,
  `mayurika-hr`, `suman-recruitment`, `arun-implementation`,
  `rajiv-blocked`, `paraparan`, `staff-data`).
- Local static server (`python -m http.server`) — every asset requested
  by the page (`tokens.css`, `base.css`, `navigation.css`,
  `components.css`, `calendar.css`, `staff-data.css`, `navigation.js`,
  `app.js`, and `/`) returns **HTTP 200**.

## 18. Browser validation (Step 21)

Performed with Playwright driving the machine's installed Google Chrome
(the sandboxed npm registry blocked Playwright's own bundled-browser
download over HTTPS — system Chrome was used instead as an equivalent
substitute; noted for transparency). Verified, with numeric assertions
captured in `results.json` (not just visual inspection):

- Expanded sidebar at 1920/1600/1440/1366/1024px — icon single-axis
  alignment, row height, collapse-toggle visibility.
- Collapsed sidebar at the same 5 desktop breakpoints — width (76px),
  icon/toggle shared center line, `aria-expanded`/`aria-label` flip,
  icon swap (`collapseIconVisible`/`expandVisible`).
- Repeated expand → collapse → expand cycling (desktop collapse test
  runs inside the same page session per viewport).
- Arun icon rendering (cropped screenshot, confirmed distinct from
  stack/database/clipboard/shield).
- Every semantic icon visible in full-page screenshots.
- Active/hover/focus states visually confirmed in screenshots (blue
  active row + accent bar).
- Paraparan "Auditor" label confirmed unchanged in the sidebar and in
  the drawer label list.
- Mayurika/Suman/Arun/Rajiv/Paraparan card text width measured (see §12-13).
- Mobile drawer opened/closed at 390px and 834px.
- 1440px and 1366px layouts screenshotted.
- Browser console captured across all 7 viewports — only pre-existing,
  unrelated errors seen (see below); zero errors referencing
  `navigation.js`, `app.js`, the sidebar, or the member cards.

**Console errors observed (pre-existing, not caused by this task):**
repeated `net::ERR_CONNECTION_REFUSED` on every viewport — this is the
Staff Data tab's live `GET /api/staff` client attempting to reach a
backend that isn't running in this local static-file test (expected;
the app has no backend in this environment, and this task did not touch
that fetch logic). One `404` (browser's automatic `/favicon.ico`
request — the page has no `<link rel="icon">`, pre-existing, unrelated).

## 19. Overall result

**PASS**, with one transparently-documented pre-existing observation
(§7 — Root AIOS badge/label crowding, improved but not fully resolved,
out of this task's scope, not a regression this task introduced).

All 9 user-confirmed requirements (§2) met:
1-2. Arun icon replaced with a workflow/implementation icon — done.
3. Collapse/expand icons redesigned with two distinct purpose-drawn
   icons instead of one rotated chevron — done.
4. Sidebar professional polish (icon size, row height, spacing) — done.
5-7. Member-card text width widened via one shared rule across all
   five members (Paraparan confirmed to have no applicable gap) — done.
8. Paraparan's role remains "Auditor" (sidebar + note text unchanged,
   confirmed by diff) — done.
9. Navigation and functionality fully preserved (zero diff on
   `navigation.js`/`app.js`; all 8 panels resolve; static + browser
   checks pass) — done.

## 20. Protected folder

`member-aios/mayurika-hr/staff-data/` remains untracked/untouched
throughout — confirmed via `git status --short` before and after all
edits (only the pre-existing untracked entry, never staged, never
read for modification).
