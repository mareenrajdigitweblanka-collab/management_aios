# Knowledge Management Scroll/Layout Fix Validation

## Requirement / Defect

User could become permanently stuck in the middle of Knowledge Management and could not scroll back to the top.

## Reproduction

Verified sequence (real Chrome via Playwright, isolated throwaway backend — in-memory SQLite, never production data):

```
Knowledge Management
→ scroll down
→ Preview (opens the Detail modal)
→ Delete (secondary action inside the Detail modal)
→ confirm
→ modal closes
→ body remained fixed / scroll locked
```

Measured before-fix evidence (`validation/screenshots/knowledge-management-scroll-audit-2026-08-11/before-fix-05-stuck-state.png`):

- `document.body` computed `position: fixed`
- `body.style.top` ≈ `-249px`
- `.msc-scroll-locked` class still present (scroll lock remained active)
- `canScroll: false` — mouse wheel / scrollbar did nothing; page header and stats permanently unreachable

## Root Cause

1. Knowledge Management uses one singleton modal overlay (`ensureModal()`) for the Detail / Edit Metadata / Create Version / Version History / Audit History / Delete screens.
2. `ensureModal().open()` previously called `lockBodyScroll()` on every content transition, unconditionally.
3. Detail → Delete/Edit/etc. therefore incremented the shared reference-counted lock multiple times despite only one actual overlay ever being open on screen.
4. The one real `close()` decremented the counter only once, leaving it stuck above 0 — `document.body` never returned to `position: static`.

Secondary findings from the same investigation (also fixed):

- `returnFocus()` (`ui/popup.js`) called `.focus()` without `preventScroll`, letting the browser's default focus-into-view behavior override a scroll position that had just been deliberately restored.
- A background list refresh (`loadDocuments()`) blanked an already-rendered table to a one-line loading message on every refetch, momentarily collapsing content height and causing the browser to clamp the restored scroll position toward 0.
- Activity/summary cards (`.msc-km-summary-grid`) were stretched by CSS Grid's default `align-items: normal` (stretch) to match the tallest card in their row, leaving large empty regions in shorter cards.

## Fix

- `ensureModal()` now owns a `holdsLock` boolean; `lockBodyScroll()`/`unlockBodyScroll()` fire only once per real open/close cycle, regardless of how many in-place content transitions happen in between.
- `returnFocus()` uses `{ preventScroll: true }`.
- `loadDocuments()` now sets `state.status = 'refreshing'` (not `'loading'`) when a table is already rendered; `renderTable()` leaves existing rows on screen untouched during a `'refreshing'` refetch instead of blanking to a loading message.
- `.msc-km-summary-grid` now uses `align-items: start` so each card sizes to its own content.

## Scroll Architecture Finding

The intended architecture was already correct — no redesign was required:

- window/body is the primary (and only) vertical scroll owner
- the app-wide topbar is `position: sticky`
- the sidebar is `position: sticky`, full-height, no internal scrollbar
- the Knowledge Management workspace participates in normal document flow

The defect was entirely stateful (an unbalanced JavaScript lock counter), not a CSS/layout trap. This was confirmed by an initial 10-step scripted wheel-scroll pass (scroll down → up, expand/collapse Activity, expand Advanced Filters, switch Active/Deleted) that found zero issues before any Delete/Edit-modal transition was exercised.

## Browser Validation

All PASS (real Chrome, isolated throwaway backend, 10 seeded documents):

- scroll top → bottom → top
- Activity expand/collapse (no refetch on toggle, cards keep real data)
- Advanced Filters expand/collapse
- Active/Deleted tab switching
- Delete
- Restore
- Preview open/close (Escape), Open Document remains a separate action
- one-document state (via search filter)
- empty state (via search filter, correct message, no fabricated content)

Viewports tested: 1440×900, 1440×760, 1366×768, 1280×720, 1024×768.

- can reach top = YES (all 5 viewports)
- can reach bottom = YES (all 5 viewports)
- page horizontal overflow = NO (all 5 viewports)
- header overlap = NO (all 5 viewports)
- sidebar internal unwanted scrolling = NO (all 5 viewports; sidebar stayed sticky, full-height, no internal scrollbar throughout)

## Cross-Module Safety

`web-view/js/ui/popup.js` is a shared leaf module (also used by Calendar, Staff Data, Navigation, the shared confirmation dialog), so:

- full frontend suite = 468/468 PASS
- Staff Data ("Data" tab — the safe, non-protected `GET /api/staff` read-only projection) spot-check PASS, zero console errors
- Issues spot-check PASS, zero console errors
- protected HR repo path (`member-aios/mayurika-hr/staff-data/`) not accessed at any point — the sidebar's separate `mayurika-hr` tab was deliberately not navigated during this check

## Tests

- KM frontend = 174/174 PASS (168 existing + 6 new regression tests covering the scroll-lock fix across three modal transition paths and the refreshing-state fix)
- full frontend = 468/468 PASS

## Backend / DB / Business Rules

NONE changed. Confirmed via `git diff --stat` — zero `.py`/`.sql` files touched. Delete/restore/audit/version semantics, authentication, and Team rules are unchanged.

## Evidence

`validation/screenshots/knowledge-management-scroll-audit-2026-08-11/` — including before-fix stuck-state screenshots (`before-fix-03/04/05`) and after-fix screenshots covering the top of the page, bottom of the page, Activity expanded, Advanced Filters expanded, after Delete, Deleted Documents, after Restore, one-document and empty states, and all 5 responsive viewports.

## Status

**PASS** — reported stuck-scroll defect reproduced, root-caused, fixed, and no longer reproducible across the full interaction and responsive matrices.

## Known Limits

Normal browser scroll clamping may slightly change the exact pixel position after content becomes genuinely shorter (e.g. after a delete). This is acceptable provided the KM workspace remains reachable and scrolling remains fully functional — confirmed in every test.

## Next Step

Commit and publish after review.
