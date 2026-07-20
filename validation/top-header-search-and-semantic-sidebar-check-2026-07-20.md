# Top-Header Search, Internal-Build Cleanup, and Semantic Sidebar Icons Check — 2026-07-20

## 1. Scope

Frontend UI/UX only. No backend, database, migration, API, calendar,
Task/Leave, overlap-rule, Schedule Summary, Staff Data, member-key, or
navigation-target-panel-ID change. Protected path
`member-aios/mayurika-hr/staff-data/` untouched.

## 2. Confirmed requirements (source of truth)

1. Move the existing search UI into the dark top header bar.
2. Remove: READ ONLY badge; Branch label/value; Commit label/value;
   top-right build/date value; the large read-only internal-build warning
   box beneath the header.
3. Remove the old separate search row after moving search into the header.
4. Replace sidebar first-letter/initial icons with meaningful icons.
5. Paraparan's role is **Auditor**.
6. Preserve all existing behavior.

## 3. Old vs. new search location

| | Old | New |
|---|---|---|
| Container | `.workspace-toolbar` → `.search-tools` (a light-themed row directly beneath the header, above the tab content) | `.topbar-search` (inside the dark `<header class="topbar">` itself) |
| Pill wrapper | `.workspace-search` | `.topbar-search-pill` (dark-header-styled) |
| Icon class | `.workspace-search-icon` | `.topbar-search-icon` |

## 4. Search IDs / handlers preserved (Step 3)

| Element | ID/behavior | Status |
|---|---|---|
| Search input | `#searchInput` | Same ID, same element attributes (`type="search"`, `placeholder`, `autocomplete="off"`, `aria-describedby="searchHint"`) — only its container/class changed |
| Clear button | `#searchClear` | Same ID, same `type="button"`, same visible "Clear" text |
| Results text | `#searchResults` | Same ID |
| Hint text | `#searchHint` | Same ID, same content, still `.visually-hidden` |
| Label | `<label for="searchInput">` | Same `for` target, same text, still `.visually-hidden` |
| Handlers | `initNavigation()` (`navigation.js`) — `document.getElementById('searchInput'/'searchClear'/'searchResults')`, `doSearch()`, `input`/`click` listeners | **Not modified** — `navigation.js` has zero diff (confirmed via `git diff --stat`); ID-based lookups work identically regardless of where the markup sits in the DOM |
| Call site/order | `app.js` → `initNavigation()` once after `DOMContentLoaded` | **Not modified** — `app.js` has zero diff |

Since `initNavigation()` finds these elements purely by ID at call time
(not by a fixed DOM path) and runs exactly once, relocating the markup
into the header requires no JavaScript change — confirmed by inspection
and by `git diff` showing no edits to `navigation.js`/`app.js`.

## 5. Old search row removal (Step 5)

The entire former `.workspace-toolbar` block (containing `.search-tools`
and `.readonly-notice`) was deleted from `index.html`. Confirmed exactly
one instance of each search ID remains in the DOM:

```
grep -c 'id="searchInput"'  → 1
grep -c 'id="searchClear"'  → 1
```

Obsolete CSS removed from `navigation.css` (proven unused — the only
markup that referenced them was the deleted row): `.workspace-toolbar`,
`.search-tools`, `.workspace-search` (+ `:focus-within` variants),
`.workspace-search-icon`, the old light-themed `#searchInput`/
`#searchClear`/`#searchResults` rules, `.readonly-notice` (+ `-icon`/
`-text`/`-text strong`), and their two responsive media-query blocks.
`.visually-hidden` (still used by the relocated label/hint) and
`.tab-badge*` (used elsewhere) were kept.

## 6. Removed internal-build metadata (Step 6)

| Element | Old markup | Result |
|---|---|---|
| READ ONLY badge | `<span class="badge badge-viewonly topbar-readonly-pill">READ ONLY</span>` | **Removed** |
| Branch label/value | `<span>Branch: <strong>individual-aios</strong></span>` (inside `.topbar-meta`) | **Removed** |
| Commit label/value | `<span>Commit:</span><span class="topbar-commit">d649652</span>` | **Removed** |
| Top-right date/build value | `<span class="topbar-date">2026-07-07</span>` | **Removed** |
| Warning panel | `.readonly-notice` — "This dashboard is a read-only internal build. Sensitive HR data…" | **Removed** (was directly beneath the header, inside the also-removed `.workspace-toolbar`) |

`.badge-viewonly` (the CSS class, not the specific header instance) was
**kept** — it is still used by 3 other, unrelated badges elsewhere in the
page body (`READ-ONLY`/`VIEW ONLY` labels inside Root AIOS/other tab
content, confirmed by `grep` before removal) — only the one header
instance carrying `.topbar-readonly-pill` was deleted, along with that
now-unused modifier class itself.

No empty header space, orphan separators, or blank right-side containers
were left: `.topbar-right`/`.topbar-meta`/`.topbar-readonly-pill`/
`.topbar-commit`/`.topbar-date` CSS rules were deleted outright (proven
unused — grep confirmed no remaining markup references them), and the
stale narrow-viewport rules that used to hide `.topbar-date`/`.topbar-meta
.topbar-sep` were removed rather than left dangling. A stale comment in
`components.css` claiming "the header's READ ONLY pill (.topbar-right)
must never be hidden" was also corrected (that pill no longer exists).

**Not touched (out of this task's explicit scope):** other, unrelated
"Internal Build"/"Branch: individual-aios" mentions found deeper in the
Root AIOS landing hero and the page's own `.dashboard-footer` content
(e.g. the "Build status: Internal Build v0.1 · PASS" pill, footer text at
the bottom of the page). These are pre-existing page **content** — not
part of the top header or the one warning box "beneath the header" the
confirmed requirements specifically named — and were left untouched to
avoid an unrelated redesign of that page's own copy.

## 7. Header subtitle decision (Step 7)

The visible subtitle was `Dashboard v0.1 — Internal Build`. Since this
task's explicit goal is removing internal-build signaling from the header
area, keeping "Internal Build" wording in the adjacent subtitle would
directly contradict that cleanup. **Decision:** kept the short, useful
product subtitle (`Dashboard v0.1` — the existing version number,
unchanged/not invented) and removed only the "— Internal Build" wording.
For consistency, the `<title>` tag (previously identical text,
`Management AIOS — Dashboard v0.1 | Internal Build`) was updated the same
way, to `Management AIOS — Dashboard v0.1` — a directly analogous
extension of the same explicit decision, not a separate assumption.

## 8. Semantic sidebar icon mapping (Step 8)

All icons are hand-authored inline SVG, one consistent family: `viewBox="0
0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"
stroke-linecap="round" stroke-linejoin="round"` — matching the exact style
already used by the existing sidebar-toggle/collapse-toggle icons in this
file (no new icon system or CDN dependency introduced). No emoji used.

| Item | Old | New icon |
|---|---|---|
| Root AIOS | `RA` (text) | House/home outline |
| File Map | `FM` (text) | Folder outline |
| Mayurika (HR) | `M` (text) | Person/user outline |
| Suman (Recruitment) | `S` (text) | Person-plus outline |
| Arun (Implementation) | `A` (text) | Stacked layers outline |
| Rajiv (Admin) | `R` (text) | Shield outline |
| Paraparan (Auditor) | `P` (text) | Clipboard-check outline |
| Staff Data | `SD` (text) | Database/cylinder outline |

Each icon is `stroke="currentColor"`, so it automatically inherits
`.app-nav-icon`'s existing `color` — including the existing
`.app-nav-btn.active .app-nav-icon { color: var(--accent) }` rule — with
**no new active-state CSS needed**; icon color already follows the active
state exactly as the old text initials did. `.app-nav-icon svg { width:
14px; height: 14px; }` was added to size the icons consistently inside
the existing 24×24 icon box.

## 9. Paraparan role correction (Step 9)

- Sidebar nav button: previously had **no** role subtitle at all (only
  `<span class="app-nav-btn-label">Paraparan</span>`, unlike every other
  member row, which all show a `.app-nav-btn-sub`). Added
  `<span class="app-nav-btn-sub">Auditor</span>` — matching the exact
  visible pattern already used for Mayurika/HR, Suman/Recruitment, Arun/
  Implementation, Rajiv/Admin.
- Button `title` attribute: `"Paraparan"` → `"Paraparan — Auditor"`,
  matching the other members' tooltip pattern (e.g. `"Mayurika — HR"`).
- **Searched for an incorrect "Pilot" role label** per the task's explicit
  instruction: no sidebar or panel text was found labeling Paraparan's
  *role* as "Pilot" — every "pilot" occurrence found in the repository
  refers to the unrelated **"technical pilot" data-classification**
  concept (e.g. `TECHNICAL PILOT CLASSIFICATION`, `kpi-pilot-mount`,
  `initStaffDataPilot()`), not a job-role label.
- **Not changed:** the `tab-paraparan` panel's own body text, which
  already carries a deliberately hedged, source-cross-referenced
  [VERIFY] note: *"Paraparan's designation is currently unresolved between
  sources — External Auditor (SRC-ARUN-CONF-001) vs. Accountant
  (HR-provided PDF)"*, linking to
  `member-aios/staff-data/evidence/paraparan-designation-review-2026-07-13.md`.
  This is a separate, already-governed content item outside this task's
  explicit scope ("Update only the user-facing role label unless
  repository truth confirms another approved documentation location
  should also be corrected" — no such confirmation was given this
  session). Only the sidebar UI label was corrected, per the explicit
  user-confirmed requirement.
- **Unchanged, confirmed by diff:** member key (`data-member-key="paraparan"`),
  panel ID (`id="tab-paraparan"`), API member identifier, calendar data
  routing, `data-tab="paraparan"` navigation target.

## 10. Sidebar expanded/collapsed/mobile results (by code inspection)

- **Expanded:** every member row shows icon + name + role subtitle
  (Mayurika/HR, Suman/Recruitment, Arun/Implementation, Rajiv/Admin,
  Paraparan/Auditor) — unchanged structure/CSS, only Paraparan's subtitle
  was newly added.
- **Collapsed:** `body.sidebar-collapsed .app-nav-btn-text { flex:0 0 0;
  opacity:0 }` and `body.sidebar-collapsed .app-nav-btn { justify-content:
  center; gap:0 }` (`navigation.css`, unchanged by this task) already
  center every icon box on the same vertical rail and hide text via
  opacity (not `display:none`, so it remains the button's accessible name
  source) — this logic is identical whether the icon box contains text or
  an SVG, so collapsed mode required **no CSS change**. The `title`
  attribute (updated for Paraparan) still serves as the hover/focus
  tooltip.
- **Mobile drawer:** `navigation.js`'s `closeDrawer()`/`openDrawer()`
  logic (unchanged, zero diff) already closes the drawer on nav-item
  selection; the icon swap is purely visual inside `.app-nav-icon`, which
  the drawer's own CSS does not restyle differently — no duplicate
  sidebar controls were added.

## 11. Search regression (by code inspection — see §16 for what requires a live browser)

| # | Check | Result |
|---|---|---|
| 1-3 | Typing a name/topic/task/status | `doSearch()` logic unchanged — same `data-searchable`/`data-tags` matching |
| 4 | Clear resets query | `searchClear` click handler unchanged |
| 5 | Enter behavior | Unchanged — `doSearch()` was never wired to a `keydown`/`submit` handler before or after this change (input-event driven only) |
| 6 | Search after changing panels | `data-searchable` elements exist across all tabs regardless of which is active — unaffected by the header move |
| 7 | Search after collapsing/expanding sidebar | Search lives in `.topbar`, entirely outside `.app-sidebar` — sidebar collapse/expand cannot affect it |
| 8 | One input listener only | `initNavigation()` still runs exactly once (`app.js`, unchanged); `document.getElementById('searchInput')` resolves to the single remaining `#searchInput` (confirmed unique, §5) |
| 9 | No duplicate result rendering | Same single `#searchResults` element; `doSearch()` unchanged |
| 10 | No console errors | Not verified live this session — see §16 |

## 12. Navigation regression (by code inspection)

`git diff` confirms **zero** changes to `navigation.js`. All 8
`data-tab`/`id="tab-*"` pairs still resolve (verified via script — see
§14). No `data-tab`, member key, or panel ID was altered — only the
`.app-nav-icon` inner content (text → SVG) and Paraparan's `title`/added
`.app-nav-btn-sub` changed within the button markup.

## 13. Responsive viewport matrix (analytical — see §16 for live-browser confirmation)

| Viewport | Header height | Title visible | Search max-width | Clear visible | Icon alignment | H-overflow |
|---|---|---|---|---|---|---|
| 1920×1080 | 56px (unchanged `--header-height`) | Yes | 460px (cap) | Yes | 24×24 boxes, unchanged | None expected |
| 1600×900 | 56px | Yes | 460px (cap) | Yes | Unchanged | None expected |
| 1440×900 | 56px | Yes | 460px (cap) | Yes | Unchanged | None expected |
| 1366×768 | 56px | Yes | 460px (cap) | Yes | Unchanged | None expected |
| 1024px wide | 56px | Yes | 460px (cap, ≥901px still applies down to 1024) | Yes | Unchanged | None expected |
| Tablet (≤900px) | 56px | Subtitle hidden (`.topbar-sub{display:none}`, pre-existing rule, unchanged trigger width) | 320px | Yes | Unchanged | None expected |
| Mobile (≤640px) | 56px | Subtitle hidden | Unconstrained (`max-width:none`), shrinks via flex | Yes (Clear padding trimmed to 10px; `#searchResults` hidden as the least-essential element) | Unchanged | None expected — no element gained a fixed/unshrinkable width |

`--header-height` (56px) itself was **not** changed — the single-row
layout was deliberately preserved at every width specifically so the
existing `--scroll-target-offset` and `--cal-canvas-height` formulas
(both derived from `--header-height`, tokens.css, untouched) remain
accurate; a second-row mobile layout was considered (Step 4 offers it as
an alternative) and rejected for this reason (documented in `base.css`).

## 14. Static checks performed

| Check | Result |
|---|---|
| `node --check` on all 5 JS modules (`navigation.js`, `app.js`, `staff-data.js`, `calendar/instance.js`, `calendar/core.js`) | PASS |
| CSS brace balance (`tokens.css` 5/5, `base.css` 34/34, `navigation.css` 57/57, `components.css` 165/165, `calendar.css` 255/255) | Balanced |
| HTML tag balance (`div` 306/306, `span` 429/429, `button` 18/18, `header` 1/1, `nav` 1/1, `main` 1/1, `svg` 11/11) | Balanced |
| Duplicate `id` scan | None (22 unique ids) |
| `#searchInput`/`#searchClear` uniqueness | Exactly 1 each |
| All 8 `data-tab` values resolve to an existing `id="tab-*"` panel | Confirmed (script-verified) |
| Local static HTTP server — `index.html`, `tokens.css`, `base.css`, `navigation.css`, `components.css`, `navigation.js`, `app.js` | All HTTP 200 |
| Repo-wide scan for leftover functional references to removed classes (`.topbar-right`, `.topbar-readonly-pill`, `.topbar-meta`, `.topbar-commit`, `.topbar-date`, `.workspace-toolbar`, `.search-tools`, `.workspace-search`, `.readonly-notice`) | None found — only explanatory comments describing the removal remain |
| `git diff --stat -- backend/ database/` | Empty |
| `git diff --stat -- web-view/js/navigation.js web-view/js/app.js web-view/css/tokens.css web-view/css/calendar.css` | Empty (none of these files touched) |

## 15. Backend / database / API / Schedule Summary / Staff Data

```
git diff --stat -- backend/ database/    → (empty)
```

No `.py`, migration, route, request/response shape, table/column,
calendar, Task/Leave, overlap-rule, Schedule Summary, or Staff Data file
appears in this change. Confirmed **UNCHANGED**.

## 16. Browser / production validation

**Not performed in this session**, per the user's standing direction
earlier in this conversation to validate directly on
`https://management-aios.vercel.app/` rather than locally. The following
are therefore not independently browser-confirmed this session:

- Visual appearance of the header (search integration, spacing, no
  overlap at 1366px).
- Live keyboard/mouse interaction with search in its new location.
- Live rendering of the 8 semantic sidebar icons (shape/proportion as
  actually rasterized by a browser).
- Mobile-drawer visual confirmation.
- Browser console error check.

All structural/geometric claims in this document (IDs, selector diffs,
balance checks, data-tab resolution) are code- and script-verified, not
visually rendered.

## 17. Result

**AMBER.**

Search relocation, old-row removal, internal-build metadata/warning
removal, semantic sidebar icons, and the Paraparan role correction are all
implemented, diff-reviewed to touch only the 4 intended frontend files,
and static-checked clean, with zero backend/database/API/calendar/
Schedule Summary/Staff Data change and zero navigation-target/member-key
change. The item withheld from a PASS is live-browser/production
verification (§16), which the user has chosen to perform directly on the
deployed Vercel URL.

## 18. Next step

After deployment, open `https://management-aios.vercel.app/` and confirm:
the header shows the logo, a working search box, and Clear — with no READ
ONLY badge, branch/commit/date, or warning panel visible; the sidebar
shows meaningful icons (not letters) in both expanded and collapsed mode;
Paraparan's row reads "Auditor"; all 8 nav items still open their correct
panel; and the browser console shows no new errors.
