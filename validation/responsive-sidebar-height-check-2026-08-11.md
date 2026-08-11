# Responsive Sidebar Height — Validation Check

**Date:** 2026-08-11
**Requirement:** REQ-SIDEBAR-RESP-008 — see `docs/responsive-sidebar-height-requirement-2026-08-11.md`
**Scope:** `web-view/css/navigation.css` only. No HTML, JavaScript, backend, database, API, calendar, or Schedule Summary changes. `member-aios/mayurika-hr/staff-data/` was not opened.

---

## 1. Git Gate (Phase 1)

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD | `89ffc9f7532b6e7463c7fd1c058b37f6d35c63db` |
| `origin/main` | `89ffc9f7532b6e7463c7fd1c058b37f6d35c63db` (identical) |
| Divergence (`git rev-list --left-right --count origin/main...main`) | `0 0` |
| Working tree | One pre-existing untracked file (`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md`), unrelated to this task, left untouched |

Gate passed — proceeded without pull/merge/rebase/reset.

## 2. Sidebar Owner (Phase 2)

See requirement doc §5. One sidebar (`#appSidebar`), one CSS owner
(`web-view/css/navigation.css`), no JavaScript dimension logic. No second
sidebar was created.

## 3. Original Overflow Cause — Measured CSS Values (Phase 3)

All values below are the CSS declarations as they existed **before** this
task's edits, read directly from `web-view/css/navigation.css`:

| Rule | Property | Value |
|---|---|---|
| `.app-sidebar` | `padding` | `var(--space-5) var(--space-3)` = `20px 12px` |
| `.app-sidebar` | `gap` (between the 4 `.app-sidebar-group` children) | `2px` |
| `.app-sidebar` | `overflow-y` | `auto` ← the scrollbar source |
| `.app-sidebar` | `height` | `calc(100vh - var(--header-height))` = `calc(100vh - 56px)` |
| `.app-sidebar-group + .app-sidebar-group` | `margin-top` | `var(--space-3)` = `12px` (×3 group boundaries) |
| `.app-sidebar-title` | `padding` | `4px 10px 8px` (×4 titles) |
| `.app-sidebar-top-row` | `margin-bottom` | `var(--space-2)` = `8px` |
| `.app-sidebar-collapse-toggle` | `width` / `height` | `32px` / `32px` |
| `.app-nav-btn` | `padding` | `6px 10px` |
| `.app-nav-icon` | `width` / `height` | `32px` / `32px` |
| `--header-height` | (token, `tokens.css`) | `56px` |

**Box-model floor** (padding/gap/icon-box values only — excludes
title/label text line-height, which cannot be measured without a real
browser rendering engine; see §9): 4 group titles × 12px padding (48px,
folded into the top-row for the first group) + 9 nav rows × 44px (6+32+6)
+ inter-group spacing (2px×3 gap + 12px×3 margin = 42px) + sidebar
padding (40px) + top-row toggle/margin (40px) ≈ **554px** of sidebar
content, + 56px sticky header ≈ **610px** viewport-height floor before the
old `overflow-y: auto` would start scrolling. The true figure is somewhat
higher once title/label text line-height is included (estimated ~640-700px
in practice) — this is exactly why the breakpoints in §5 were placed with
headroom above/below this figure rather than pinned to it.

**Cause:** a fixed, ungoverned combination of sidebar padding, inter-group
margin/gap, title padding, and 44px-tall nav rows (icon box + padding) that
never shrank — so on any viewport shorter than roughly 650-700px, the
sidebar's own `overflow-y: auto` produced a vertical scrollbar instead of
the content adapting.

## 4. Strategy (Phase 4)

Strategy A only, per requirement §3 — no alternative strategy was
substituted. Two `@media (max-height: …)` tiers added to
`web-view/css/navigation.css`, applied to the same shared selectors used at
every breakpoint (no per-item overrides):

- `.app-sidebar` padding
- `.app-sidebar-group + .app-sidebar-group` margin-top
- `.app-sidebar-title` padding
- `.app-sidebar-top-row` margin-bottom
- `.app-nav-btn` padding
- `.app-nav-icon`, `.app-sidebar-collapse-toggle` width/height
- `.app-nav-icon svg`, `.app-sidebar-collapse-icon` width/height
- (very-compact tier only) `.app-nav-btn-text` gap: `1px` → `0`

No section, nav item, label, subtitle, or badge was hidden, collapsed, or
removed at any tier — verified by test (§8).

## 5. Breakpoints Chosen and Why

| Tier | Media query | Box-model floor (padding/icon only) | Reasoning |
|---|---|---|---|
| Normal | (none — base rules) | ~554px content / ~610px viewport | Unchanged from before this task |
| Compact | `@media (max-height: 820px)` | ~405px content / ~461px viewport | Fires with ~120-160px of headroom above the normal tier's estimated real-world floor (~640-700px), so it engages before any real overflow risk, not exactly at the edge |
| Very compact | `@media (max-height: 620px)` | ~319px content / ~375px viewport | Fires with ~85-160px of headroom above the compact tier's floor (461px), covering short laptop viewports, small mobile-drawer heights, and browser-zoom scenarios |

820px and 620px were chosen (not the raw 610px/461px floors themselves)
specifically because exact rendered text line-height for the four group
titles and the `.app-nav-btn-sub` subtitles cannot be measured pixel-for-
pixel without a real browser engine in this environment (no Playwright,
Puppeteer, or jsdom dependency exists in this repo — confirmed by
inspecting `web-view/js/calendar/package.json`, the only `package.json` in
the repo, and the existing `*.test.mjs` files, all of which use hand-built
DOM stand-ins instead of a browser/jsdom). Each tier therefore keeps a
buffer generous enough to absorb that unmeasured text-height contribution.

## 6. Exact Dimensions Adjusted

| Property | Normal | Compact (≤820px height) | Very compact (≤620px height) |
|---|---|---|---|
| `.app-sidebar` padding | `20px 12px` | `12px 12px` | `8px 12px` |
| `.app-sidebar` gap (inter-group) | `2px` | `0` | `0` (inherited) |
| `.app-sidebar-group + .app-sidebar-group` margin-top | `12px` | `8px` | `4px` |
| `.app-sidebar-title` padding | `4px 10px 8px` | `3px 10px 4px` | `2px 10px 3px` |
| `.app-sidebar-top-row` margin-bottom | `8px` | `4px` | `2px` |
| `.app-nav-btn` padding | `6px 10px` | `4px 10px` | `3px 10px` |
| `.app-nav-icon` / `.app-sidebar-collapse-toggle` size | `32×32px` | `26×26px` | `22×22px` |
| `.app-nav-icon svg` / `.app-sidebar-collapse-icon` size | `18×18px` | `15×15px` | `13×13px` |
| `.app-nav-btn-text` gap | `1px` | `1px` (inherited) | `0` |

Sidebar **width** (`--sidebar-width: 252px`, `--sidebar-collapsed-width:
76px`) was not touched at any tier — only height-driven vertical density
changed, per requirement §6 ("Preserve existing desktop sidebar width
behavior").

## 7. No Internal Scrollbars (Phase 5)

`.app-sidebar`'s `overflow-y: auto` was changed to `overflow-y: visible`
(explicit, not left implicit). No `overflow-y`/`overflow-x`
`auto`/`scroll` remains anywhere in `.app-sidebar`'s rule (confirmed by
grep — see §8, test 9/10). `overflow-x` was never set on `.app-sidebar`
in the first place (default `visible`) and remains so — nothing in this
task narrows the sidebar's own width, so no new horizontal-overflow risk
was introduced. The fix relies on the content actually shrinking to fit
(§4-6), not on clipping — no `overflow: hidden` was introduced.

## 8. Horizontal Safety (Phase 6)

- Sidebar width unchanged at every tier (§6).
- Icon boxes only shrink (32→26→22px), never grow — this can only free
  up more horizontal room for label text, never reduce it.
- `.app-nav-btn-label` (the element that already carries
  `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` for
  long labels like "Knowledge Management") was **not modified** by any
  height tier — confirmed by test (`compact-height media queries do not
  hide any nav item, section, or text`, which also asserts no height
  tier touches `.app-nav-btn-label` or hides `.app-nav-btn-sub`).
- Locked-item styling (`.app-nav-btn--locked`, `opacity: .55`) is
  untouched — zero diff to that rule.
- No icon/text overlap risk introduced — icon and text remain separate
  flex children of `.app-nav-btn` (`gap: 10px`, unchanged at every
  height tier) with the icon only shrinking, never overlapping.

## 9. Locked Auth Items (Phase 7)

Zero diff to `web-view/js/auth-gate.js` or `web-view/js/navigation.js` —
confirmed by `git diff --stat` (§12). The Data/Issues/Knowledge
Management nav buttons remain in the DOM unconditionally (never
hidden), their `.app-nav-btn--locked` class, `aria-disabled` toggling,
and the "Authorize this browser" dialog behavior are all driven by
`auth-gate.js`, which this task did not touch. This was a CSS/layout-only
task; no auth-logic change was needed or made.

## 10. Main Content Independence (Phase 8)

`.tab-main` / `.tab-panel` scrolling rules are zero-diff — confirmed by
`git diff --stat -- web-view/css/navigation.css` showing no hunks outside
the `.app-sidebar*`/`.app-nav-*`/`.app-sidebar-collapse-*` selectors, and
`git diff --stat` overall showing no other CSS/JS/HTML file touched. Main
content scrolling behavior is unaffected.

## 11. Responsive Validation (Phase 9)

**No real browser-automation, screenshot, or visual-rendering tool is
available in this environment** — confirmed: the only `package.json` in
the repository (`web-view/js/calendar/package.json`) declares no
dependencies at all, and every existing `*.test.mjs` file in `web-view/js/`
explicitly documents building its own hand-written DOM/localStorage
stand-in "because... no jsdom available" (see e.g.
`web-view/js/navigation.test.mjs` header comment). No Playwright,
Puppeteer, or jsdom package exists anywhere in the repo.

Per the task's own fallback instruction ("If real browser tooling is
unavailable: do not falsely claim visual verification. Record CSS/test-
level evidence only and mark live visual verification pending."), this
section records CSS/test-level evidence only:

| Viewport | Height tier that applies | CSS-level result |
|---|---|---|
| 1920×1080 | Normal (>820px) | Unchanged from pre-task baseline — no compaction needed, box-model floor (~610px) well under 1080px |
| 1366×768 | Compact (≤820px) | Compact tier applies; compact floor (~461px) well under 768px |
| 1280×720 | Compact (≤820px) | Compact tier applies; compact floor (~461px) well under 720px |
| 1024×768 | Compact (≤820px) | Compact tier applies; compact floor (~461px) well under 768px |
| Short-height (e.g. 1366×600) | Very compact (≤620px) | Very-compact tier applies; very-compact floor (~375px) well under 600px |
| 200% zoom | Effective CSS viewport height halves — whichever tier the resulting height falls into applies automatically (media queries respond to the effective CSS px viewport, not the physical one) | Same tiered rules apply; not independently re-verified beyond that mechanism |

All 20 items required by Phase 9 (no vertical/horizontal scrollbar; Root,
File Map, Mayurika, Suman, Arun, Rajiv, Paraparan, Data, Review Summaries,
Issues, Knowledge Management all visible; section headings visible; no
overlap/clipping; labels/subtitles readable; badges don't break layout;
main-content scrolling works) are supported by the CSS-level reasoning in
§3-10 and the structural test in §12, but **live visual verification in an
actual browser has not been performed and is marked PENDING** — see the
handover doc's "One Next Step".

## 12. Tests (Phase 10)

New file: `web-view/js/sidebar-height-responsive.test.mjs` — 21 tests,
covering (per the Phase 10 checklist):

1. Exactly one `<nav class="app-sidebar">` remains.
2. All 11 expected sidebar nav items remain, each exactly once.
3. Exactly 11 `.app-nav-btn` buttons exist (none removed).
4-7. OVERVIEW / MEMBERS / STAFF / KNOWLEDGE headings all remain.
8. Locked items (Data, Issues, Knowledge Management) remain represented in the sidebar markup.
9. No `overflow-y: auto`/`scroll` on `.app-sidebar`.
10. No `overflow-x: auto`/`scroll` on `.app-sidebar`.
11. At least two `@media (max-height: …)` compact-density rules exist.
12. Existing navigation selectors (`.app-sidebar`, `.app-sidebar-group`, `.app-sidebar-title`, `.app-nav-btn`, `.app-nav-icon`, `.app-nav-btn-label`, `.app-nav-btn-sub`) remain defined.

Plus two additional structural tests: the compact tiers actually reduce
`.app-sidebar` padding / inter-group margin / `.app-nav-btn` padding /
icon size, and no height tier introduces `display:none`,
`visibility:hidden`, or touches `.app-nav-btn-label`/hides
`.app-nav-btn-sub`.

Items 13-16 (Issues / Review Summaries / Knowledge Management / Calendar
regression) are covered by the pre-existing, unmodified test files for
those features — this task changed no JavaScript or HTML, so those tests
serve as regression coverage without needing duplication.

### Full frontend test run — literal totals

```
web-view/js/*.test.mjs           : 381 pass / 381 total (0 fail)
web-view/js/calendar/*.test.mjs  : 181 pass / 181 total (0 fail)
--------------------------------------------------------------
Combined                         : 562 pass / 562 total (0 fail)
```

## 13. Git Safety (Phase 12)

`git diff --name-status`:

```
M  web-view/css/navigation.css
A  web-view/js/sidebar-height-responsive.test.mjs
A  docs/responsive-sidebar-height-requirement-2026-08-11.md
A  validation/responsive-sidebar-height-check-2026-08-11.md
A  handover/2026-08-11__responsive-sidebar-height-closure.md
```

No backend, database, migration, or auth-logic file changed. No
`git add .` / `git add -A` was used — files staged individually by path.

## 14. Known Limits

- Live visual/browser verification is **pending** — no browser-automation
  tool is available in this environment (§11). All fit/overlap/scrollbar
  claims are reasoned from the actual shipped CSS box-model values, not
  observed on a rendered page.
- Title/label text line-height (a rendering-engine fact, not a CSS
  declaration) could not be measured precisely; breakpoints were chosen
  with deliberate headroom to absorb this uncertainty (§5) rather than
  computed to an exact pixel edge.
- The pre-existing untracked file
  `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md`
  was left untouched and unrelated to this task.

## 15. Backend / DB / Schema

- Backend files changed: **0**.
- Database/schema changes: **0**.

## 16. Result

**PASS-AMBER.** All CSS-level requirements are met and verified by 562/562
passing tests plus the box-model reasoning in §3-10: no
`overflow-y`/`overflow-x` auto/scroll on the sidebar, all 11 nav items and
4 section headings remain unconditionally present at every height tier,
no section/item/label is hidden or collapsed, auth-lock behavior has zero
diff, and only `web-view/css/navigation.css` plus new test/doc files were
touched. Held at AMBER, not PASS, solely because this environment has no
browser-automation tool to visually confirm the rendered result — see
§11/§14 and the handover doc's next step.

## 17. One Next Step

Open the deployed dashboard in a real browser, resize to (or use dev-tools
device emulation for) 1920×1080, 1366×768, 1280×720, 1024×768, a
short-height laptop viewport, and 200% zoom; confirm no sidebar scrollbar
appears at any size and all 11 nav items/4 headings stay visible and
readable — then update this doc's result from PASS-AMBER to PASS.
