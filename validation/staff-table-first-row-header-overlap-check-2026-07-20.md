# Staff Table First-Row / Header Overlap — Validation Check

**Date:** 2026-07-20
**Scope:** `web-view/css/staff-data.css` only. No backend, database, API, column-definition, filter/sort semantics, export logic, or Details-drawer behavior touched. `member-aios/mayurika-hr/staff-data/` (protected) was not read, staged, or modified.

---

## 1. Bug as reported

The first staff record row (full name, preferred/calling name, employee number — all rendered in the "Employee" column) was reported as visually hidden underneath the staff table's column header row, in the Staff Data, Arun, and Paraparan tabs.

## 2. Table structure (Step 2)

All three panels render through one shared controller, `mountStaffTableView()` in `web-view/js/staff-data.js` — one instance per `.staff-table-container` mount point (Staff Data has three, one per subtab; Arun and Paraparan each have one). Markup per instance (`renderBody()`, `staff-data.js:412-467`):

```
.staff-table-container
  .staff-table-toolbar        (density toggle, columns, export)
  .staff-table-region
    .staff-total-count
    .staff-table-scroll        overflow: auto; max-height: 70vh; (staff-data.css:514-520)
      table.member-testing-table.staff-table[.staff-table--compact]
        thead > tr > th        position: sticky; top: 0; z-index: 2  (per cell, staff-data.css:522-526)
        tbody > tr > td
  .staff-pagination-bar
```

Native `<table>` layout (not CSS grid/flex rows). Sticky is applied per `<th>` cell (not on `<thead>`, which the CSS Tables spec explicitly excludes from `position: sticky`). `border-collapse: collapse` (inherited from the shared `.member-testing-table` alias, `staff-data.css:85`). No transforms, no negative margins, no absolute positioning anywhere in the ancestor chain. Loading state (`showSkeleton()`) and error state (`staff-table-error`) both render outside `.staff-table-scroll`, so neither interacts with this bug.

## 3. Root cause (Step 3) — confirmed by rendering, not assumed

The first column (`Employee` — the exact field the bug report names) is *also* pinned horizontally for left-scroll:

```css
.staff-table td:first-child,
.staff-table th:first-child {
  position: sticky;
  left: 0;
  background: inherit;
  z-index: 1;
}
```

`.staff-table th:first-child` (specificity 0,0,2,1) is **more specific** than the shared header-background rule `.member-testing-table thead th { background: var(--surface-tint-4); ... }` (specificity 0,0,1,2), so it wins regardless of source order. `background: inherit` was written for the **data** cells (`td:first-child`), so a pinned first column blends with each row's own stripe/hover background as it scrolls. Applied to the **header** cell as a side effect, it resolves to the `<tr>`'s (and `<thead>`'s) background — both unset, i.e. transparent. The existing `.staff-table thead th:first-child` override only bumped `z-index` to 3; it never restored an opaque background.

Net effect: the "Employee" header cell is the *only* header cell with no paint behind it. Sitting above the scrolling body via `z-index`, it lets whatever row is currently scrolled underneath show through — visually reading as row text overlapping the header. Every other header cell (`Team`, `Designation`, `Staff Status`, …) keeps the correct opaque `--surface-tint-4` background and never showed this symptom, which matches the report (only Employee-column fields were described as overlapping).

Two other hypotheses were tested and ruled out before this one was confirmed:

- **`border-collapse: collapse` + sticky `th`** — a real, documented cross-browser risk category, initially suspected and fixed speculatively. Isolated fixture testing (Playwright + the actual shipped CSS, `border-collapse` forced to `collapse` vs. `separate`) showed **identical, correctly-pinned geometry in both states** in the available browser (Chrome 149/Chromium via Playwright) — this was not the cause here, and the speculative fix was reverted in favor of the confirmed one below.
- **Sticky positioning not engaging at all** — an artifact of an early test measuring `<thead>` (excluded from sticky by spec) instead of the `<th>` cells that actually carry `position: sticky`. Corrected once identified; not a real defect.

The transparent-background defect was confirmed both in an isolated CSS fixture (synthetic rows, unmodified production stylesheets) and by driving the real app (`web-view/index.html`) with a mocked `GET /api/staff` response — the "Placeholder 4 / EMP-0004" row visibly bled through the "EMPLOYEE" header text at mid-scroll before the fix, and disappeared after it, in both cases.

## 4. Fix (Step 4 — smallest correct change)

One rule, one file:

```css
.staff-table thead th:first-child {
  background: var(--surface-tint-4);
  z-index: 3;
}
```

`--surface-tint-4` is the exact value every other header cell already uses (`tokens.css` — no new/magic value introduced). No JS change, no markup change, no change to any other selector. `.staff-table td:first-child`'s `background: inherit` is untouched — the sticky-left **data** column still blends with row striping as intended.

## 5. Header positioning / sticky result (Steps 6, 8)

- Header stays visible and pinned while scrolling (`position: sticky; top: 0`) — unchanged, was already correct.
- Header background is now opaque on **every** column, including Employee — z-index (2 for the row, 3 for the corner cell) keeps it above scrolling body content with nothing showing through.
- Header columns remain aligned with body columns — no width/column changes made.

## 6. Comfortable / Compact result (Step 7)

Both densities tested at rest and mid-scroll, real app + mocked API:

| Mode | Result |
|---|---|
| Comfortable | First row fully visible below header; no overlap at rest or mid-scroll |
| Compact | First row fully visible below header; no overlap at rest or mid-scroll (reduced padding preserved, `staff-table--compact` unaffected by this fix) |

Rapid toggle stress (comfortable → compact → comfortable → compact, 4 clicks in immediate succession): table ends in the correct class state each time (`member-testing-table staff-table staff-table--compact` after an odd number of toggles), no stale classes, no duplicated spacing.

## 7. Per-panel result (Step 9 — one shared selector, no panel-specific CSS added)

| Panel | Result |
|---|---|
| Staff Data (Current Staff subtab, default) | PASS — header opaque, first row visible, mid-scroll clean |
| Arun | PASS — same shared `.staff-table` markup/CSS, no separate rule needed |
| Paraparan | PASS — same shared `.staff-table` markup/CSS, no separate rule needed |

Only one shared selector (`.staff-table thead th:first-child`) was touched; no `#tab-*`- or panel-scoped override was added, per the "no panel-specific selectors unless markup genuinely differs" instruction — it doesn't here.

## 8. Filtering / sorting / rerender result (Step 8)

Tested against the real controller (`mountStaffTableView`) with a mocked `/api/staff` response: changing the Team filter triggers `doFetch()` → `showSkeleton()` → `renderBody()`, which rebuilds `.staff-table-scroll` (and therefore the header) from scratch. Header background and first-row visibility were re-checked immediately after a filter change — both correct (opaque header, row 1 flush below it). Since `.staff-table-scroll` is a fresh element on every render, scroll position is always 0 after a rerender by construction — no separate scroll-reset logic was needed or added.

## 9. Backend / database / API (Steps 13, 16)

No backend, database, migration, or API file was touched. `git diff --stat` shows exactly one file changed (`web-view/css/staff-data.css`, CSS-only). `git diff -- backend/` and `git diff -- database/` are empty. `member-aios/mayurika-hr/staff-data/` was not opened, staged, or modified.

## 10. Static checks (Step 13)

- CSS brace balance: verified programmatically, balanced (depth 0 at EOF).
- Local static server (`python -m http.server` in `web-view/`): `index.html`, `css/staff-data.css`, `js/staff-data.js` all return HTTP 200.
- No JS file changed — no JS syntax check needed.
- No duplicate-ID or missing-selector issue introduced (single existing selector, one property added).

## 11. Browser validation (Step 14)

No system browser-automation tool (`chromium-cli`) was preinstalled, and `playwright install`'s CDN download failed in this sandbox (TLS/network restriction). Validation was instead done with `playwright-core` driving the machine's existing installed Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`), headless, at 1280×800 and 1440×900:

1. **Isolated fixture** (`fixture.html`, synthetic rows only, loading the real unmodified `tokens.css`/`base.css`/`navigation.css`/`components.css`/`staff-data.css`) — confirmed the transparent-header-background bug pre-fix (screenshot: row text visibly bleeding through the "EMPLOYEE" header at mid-scroll) and its absence post-fix, in both Comfortable and Compact density.
2. **Real app** (`web-view/index.html` served locally, `GET /api/staff` and `GET /api/staff/filter-options` intercepted via Playwright route mocking with clearly-labeled synthetic `VALTEST-####` / "Validation Placeholder N" records — no real HR data, no live backend or database connection was made) — Staff Data, Arun, and Paraparan tabs each independently verified: header `background-color` computed as `rgb(245, 242, 234)` (`--surface-tint-4`) on the first header cell in all three; first row fully visible below the header at rest and mid-scroll; zero console errors.

Live production browser check at `https://management-aios.vercel.app/` was **not** performed as part of this validation — this environment has no verified path to reach that URL with a real browser, and doing so would require the live Staff API and, indirectly, production HR data, which is out of scope per CLAUDE.md §6 and §13 (no connection to live HR systems). **This is a known limitation of this validation pass** (see §13 below) — the fix should be spot-checked in the deployed app after this change ships.

Tablet-width (per Step 14's 1600/1440/1366/tablet matrix) was not separately screenshotted; the fix is a `background-color` value only (no layout/width/breakpoint logic), and the mobile breakpoint (`max-width: 640px`) hides `<thead>` entirely (`staff-data.css` mobile block), so there is no header to overlap below 640px regardless of viewport.

## 12. Accessibility (Step 11)

No markup change. Semantic `<table>`/`<thead>`/`<th>` structure, sort buttons (`.staff-sort-th`), and `Details` buttons are untouched. No content was hidden or clipped to fix this — the fix restores paint (an opaque background), it does not hide anything.

## 13. Known limitation

This pass validated against a **local static server with a mocked Staff API**, not the deployed Vercel app with the real backend/database, per the confidentiality and "no live HR system" constraints in CLAUDE.md §6/§13. The synthetic record set used real HR-shaped field names but placeholder values throughout (`VALTEST-####`, "Validation Placeholder N") — no real staff record was read or displayed. A follow-up spot-check against the real deployed app (real data, real backend) is recommended after deploy — see handover "Next step."

## 14. Result

**PASS.** Root cause confirmed (not assumed) via rendering evidence in an isolated fixture and in the real app with mocked data; fix is a single CSS rule addition reusing an existing token; verified across both densities, all three panels, at rest, mid-scroll, and after a filter-driven rerender; zero backend/database/API diff; zero console errors.
