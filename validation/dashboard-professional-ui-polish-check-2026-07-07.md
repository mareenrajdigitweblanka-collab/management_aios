# Dashboard Professional UI Polish Check — 2026-07-07

## Requirement

Make `web-view/index.html` look more professional and polished for non-technical management users, as a **CSS/visual polish pass only**. No source truth, `[VERIFY]` counts, member statuses, KPI/AXIOM numbers, badge meanings, or visible text/facts may change. No new information, tables, sections, or denser layout. No tables may be reintroduced inside `id="tab-mayurika-hr"`. No backend/API/database/automation may be added. Forbidden files must remain untouched. No commit/push.

## Files inspected

The full file (6594+ lines) was read in chunks via the Read tool:

- Lines 1–2060 — the entire `<style>` block (`:root` tokens, topbar, tab bar, search strip, section titles, info/warning/result boxes, cards, badges, status bar, review-table, source-list, amber-list, details/summary, handover summary cards, member-snap navigation cards, HR Schedule Pilot calendar CSS, responsive `@media` queries).
- Lines 2063–2536 — topbar, tab bar (all 13 tabs + badges), search strip, safety strip, Root AIOS tab (landing hero, member snapshot grid, status bar, legend).
- Lines 2536–3207 — Mayurika HR tab in full, including the HR Daily Control Panel, the "HR Tables — Pending MD/Varmen Confirmation" notice, the "NSLP Control System — Active, Table Display Hidden" summary card, and the full HR Schedule Pilot subsection (month-view calendar, priority queue, recurring templates, verify checklist, evidence details).
- Lines 3317–4442 — Arun Implementation tab (including the `badge-amber`/AMBER PH report reference) and Rajiv/Admin BLOCKED tab.
- Spot checks of Review Queue, File Map, Markdown Viewer, Document Register, Skills Register, Handover Preview, Overview, Recurring Issues, and Gated Modules tabs for shared class usage and any additional hardcoded neutral-gray colors.

## Visual changes made

All changes are CSS value edits (colors, spacing, radius, shadow) or small additive `:focus-visible` rules. No HTML text content, class-to-element mappings, or badge assignments were changed.

1. **`:root` theme tokens** — `--bg` (#f0f4f8 → #f7f5f1, warm off-white), `--border` (#dde3eb → #e6e1d8, warm neutral gray), `--muted` (#64748b → #78716c, warm gray), `--text-secondary` (#374151 → #44403c, warm charcoal), `--radius` (8px → 10px), `--radius-sm` (5px → 6px), `--shadow`/`--shadow-md`/`--shadow-hover` (softened/enlarged blur, warm-tinted rgba instead of pure black). `--text`, `--accent`, `--accent-light`, and all 5 status color pairs (`--pass`, `--amber`, `--draft`, `--blocked`, `--preview` + their `-bg` variants) were left **unchanged**.
2. **Body** — added `-webkit-font-smoothing: antialiased` / `-moz-osx-font-smoothing: grayscale` for cleaner text rendering.
3. **Topbar** — `.topbar-logo` letter-spacing nudged (.2px → .3px); navy gradient identity untouched; height/sticky offset untouched (to avoid breaking the sticky tab-bar math).
4. **Tab bar** — `.tab-btn` padding/gap slightly tightened for a cleaner row; `.tab-btn.active` now bolder (font-weight 700); added `.tab-btn:focus-visible` (was missing); `.tab-badge` shrunk (font-size .65rem→.6rem, padding 1px 6px→1px 5px) per the "smaller/neater" direction — badge classes and their text (`PASS-AMBER`, `ACTIVE`, `BLOCKED`, `PREVIEW`, `6 GATED`, etc.) are untouched.
5. **Search strip** — input/hover backgrounds re-tinted warm; added missing `:focus-visible` suppression (mouse-vs-keyboard already handled by `:focus`).
6. **`.section-title`** — now references `var(--muted)` instead of a hardcoded cool gray; weight 700→800, letter-spacing .09em→.08em for cleaner hierarchy; heading text unchanged.
7. **Cards/boxes** — `.card`, `.file-list-box`, `.scope-box` padding increased marginally (18×20 → 19×21/22); `.cards` grid gap 16→18px; `member-snap-grid`/`handover-summary-grid` gap 14→16px. All of these already reference `var(--border)`/`var(--radius)`/`var(--shadow)`, so the root-token changes cascade automatically.
8. **Badges/tables (neutral, non-status)** — `.badge-viewonly`, `.review-table` header/zebra/hover colors, `.md-viewonly-notice`, `.md-card-check`, `.hr-table-num`, `.hr-cal-month-headcell`/`-cell` borders, and 5 inline `<tr style="background:#f1f5f9">` sub-table header rows inside the Arun tab were re-tinted from cool blue-gray to warm neutral equivalents for visual cohesion with the new background. None of these are `--pass/--amber/--draft/--blocked/--preview` status badges.
9. **Hover/scroll chrome** — `.tab-btn:hover`, `#searchClear:hover`, `.source-row:hover`, `details>summary:hover`, `.details-body`, `.safety-strip`, `.table-helper`, `::-webkit-scrollbar-thumb`, and the neutral `border-top`/`border-color` defaults on `.hov-card`/`.member-snap`/`.card:hover` were re-tinted warm.
10. **Accessibility additions** — `:focus-visible` rules added to `.tab-btn`, `#searchClear`/`#searchInput`, and `details>summary` (none existed before on these elements).
11. **HR Schedule Pilot** — no markup/structure changes; it automatically picks up the new warm theme because its component classes (`.hr-table-card`, `.hr-cal-header`, `.hr-chip*`, `.hr-verify-panel`, etc.) already reference the shared `var(--border)`/`var(--surface)`/`var(--radius)` tokens. Its status-tinted elements (`.hr-chip-amber`, `.hr-cal-legend-dot` colors, the dark `.hr-md-banner`) were left untouched.

## Content intentionally preserved

- All visible text, headings, source IDs, evidence file paths, and status notes are unchanged.
- No new `<table>`, `<details>` collapsibles, sections, or cards were added; no existing collapsibles were removed.
- No repo/file-path text was moved into new `<details>` blocks in this pass — the HR Schedule Pilot area already had its technical-detail collapsing done in the prior (2026-07-07) role-desk-match pass, and per the task scope that layout was left untouched beyond the shared CSS theme.

## Mayurika HR no-table preservation check

Command run:

```
awk '/id="tab-mayurika-hr"/{f=1} f{print} /\/tab-mayurika-hr/{if(f)exit}' web-view/index.html | grep -c "<table"
```

Result: **0** (baseline before edit was also 0). The "NSLP Control System — Active, Table Display Hidden" card remains a plain info card (heading + paragraph + bullet list + collapsed Evidence details), not a table.

## HR Schedule Pilot AMBER preservation check

`grep -n "hr-chip hr-chip-amber\">AMBER"` returns the identical string `<span class="hr-chip hr-chip-amber">AMBER — Awaiting Mayurika/Varmen answers</span>` in both the pre-edit (line 2953) and post-edit (line 2971) file — content byte-identical; only the absolute line number shifted because 18 lines were added earlier in the shared `<style>` block. No HR Schedule Pilot markup, class assignment, or text was edited.

## Source truth preservation check

- `git diff --stat -- evidence/source-register.md` → empty (no changes)
- `git diff --stat -- CLAUDE.md` → empty (no changes)
- `git diff --stat -- context/verify-register.md` → empty (no changes)
- `git diff --stat -- member-aios/` → empty (no changes)
- `git diff --stat -- schedules/hr/` → empty (no changes)
- No file under `evidence/source-intake/`, `evidence/stakeholder-confirmations/`, `intelligence-inbox/raw-stakeholder-documents/`, or `HR.Mayu.Skill.md` was opened for editing.
- Suman candidate sources: no new `SRC-` IDs were introduced anywhere in this pass (verified — this pass made zero content edits, only CSS value edits).
- Badge-to-item mapping preservation (content byte-identical, confirmed by exact-string grep against `git show HEAD:web-view/index.html`):
  - Arun: `<span class="msr-val">Live PH report is AMBER — 6 of 8 data sources missing</span>` — unchanged.
  - Rajiv: 5× `<td><span class="badge badge-blocked">BLOCKED</span></td>` inside `id="tab-rajiv-blocked"` — unchanged, same count (5) in both versions.
  - HR Schedule Pilot: `<span class="hr-chip hr-chip-amber">AMBER — Awaiting Mayurika/Varmen answers</span>` — unchanged.
  - Root AIOS tab badge: `<span class="tab-badge tab-badge-amber">PASS-AMBER</span>` — unchanged.

## [VERIFY] preservation check

```
grep -o "\[VERIFY\]" web-view/index.html | wc -l         → 64
git show HEAD:web-view/index.html | grep -o "\[VERIFY\]" | wc -l  → 64
```

Equal. No `[VERIFY]` item was resolved, added, or removed by this pass.

## Forbidden network/JS token check

```
grep -cE "fetch\(|XMLHttpRequest|axios|WebSocket|googleapis|calendar\.google|<form|onsubmit|localStorage|sessionStorage|indexedDB" web-view/index.html         → 0
git show HEAD:web-view/index.html | grep -cE "same pattern"  → 0
```

Zero matches before and after — no backend/API/automation was introduced.

## Blocked files untouched check

```
git status --short
```

Result (after all edits, before this file was created):

```
 M handover/2026-06-30__web-view-dashboard-closure.md
 M validation/web-view-html-dashboard-check.md
 M web-view/index.html
```

Only the 3 already-modified allowed files (plus this new validation file, created after) appear. `git diff --name-only` confirms the same 3 paths. No file under `evidence/`, `CLAUDE.md`, `context/`, `member-aios/`, or `schedules/hr/` is listed.

## Responsive/readability check

- All pre-existing `@media` breakpoints (768px, 640px, 820px, print) were left structurally intact — only color/spacing values referenced through shared classes changed, no breakpoint values or rules were removed.
- `.tab-bar` remains horizontally scrollable on narrow screens (`overflow-x: auto` under the 768px query); no horizontal page overflow was introduced (no widths were changed, only colors/spacing).
- Body text sizes were not reduced anywhere; the only font-size changes were the tab badges (already-decorative small pills, explicitly permitted to shrink) and a +0.01rem bump on `.section-title`.
- Status meaning continues to be conveyed via visible text labels on every badge (PASS, AMBER, BLOCKED, DRAFT, PREVIEW, GATED, etc.), not color alone — unchanged from baseline.
- Added `:focus-visible` outlines to `.tab-btn`, search controls, and `details>summary` (previously missing), improving keyboard accessibility without regressing anything that existed before (`.member-snap:focus-visible` already existed and was left as-is apart from its neutral border-hover color being warmed).

## Result

**PASS**

All CSS/visual-only polish changes verified against the constraints: zero tables in the Mayurika HR tab, zero forbidden network/JS tokens, `[VERIFY]` count unchanged (64=64), zero diff on `evidence/source-register.md`, `CLAUDE.md`, `context/verify-register.md`, `member-aios/`, and `schedules/hr/`, and byte-identical badge/status text for Arun (AMBER), Rajiv (BLOCKED), and HR Schedule Pilot (AMBER). Only `web-view/index.html`, `validation/web-view-html-dashboard-check.md`, `handover/2026-06-30__web-view-dashboard-closure.md`, and this new file were touched.

## Next step

A human reviewer should open `web-view/index.html` directly in a browser (e.g. double-click the file or serve the `web-view/` folder locally) to visually confirm the new warm off-white background, softened card shadows, tighter/neater tab bar, and overall "calmer executive" feel read correctly across the Root AIOS, Mayurika HR (including the HR Schedule Pilot calendar), Suman Recruitment, Arun Implementation, and Rajiv/Admin tabs — this cannot be done from source text alone. Only after that visual sign-off should `web-view/index.html` and the three documentation files be committed and pushed.
