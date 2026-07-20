# Handover — Calendar Two-Task-Preview Guarantee and Month Cell Height Increase

**Date:** 2026-07-20
**Scope:** Frontend Month-view layout only — guarantees at least two Task
previews whenever two or more Tasks exist, by increasing the Month row
height. No backend, database, migration, API, Task/Leave rule, form field,
Task detail/Edit/Delete, Schedule Summary, or Week/Day geometry change.

## 1. Files changed

| File | What changed |
|---|---|
| `web-view/js/calendar/instance.js` | Removed the viewport-height-dependent `computeMonthChipCapacity()` function; replaced with a plain `var MONTH_VISIBLE_TASK_CAP = 2;` constant and simplified its one call site in `renderMonthView()` |
| `web-view/css/calendar.css` | `.msc-cal-grid.active`'s `grid-template-rows` row-track floor raised from `minmax(0, 1fr)` to `minmax(var(--calendar-month-row-min-height), 1fr)` |
| `web-view/css/tokens.css` | Added `--calendar-month-row-min-height: 112px`, with its full derivation documented in-line |

`web-view/index.html`, `web-view/css/navigation.css`, and
`web-view/js/calendar/core.js` were **not** touched — confirmed by an empty
`git diff --stat` against all three.

Full root-cause analysis, old/new geometry, and the viewport matrix:
`validation/calendar-two-task-preview-and-cell-height-check-2026-07-20.md`.

## 2. Month geometry ownership

`web-view/css/calendar.css`, the `.msc-cal-grid.active` rule (Month-only
selector — Week/Day use `.msc-week-grid`/`.msc-day-grid` via the shared
`renderTimeGrid()`, an entirely separate render path, untouched).

## 3. CSS token ownership

`--calendar-month-row-min-height` (`web-view/css/tokens.css`) — new token,
consumed directly by `.msc-cal-grid.active`'s `grid-template-rows`. Derived
from the existing `--calendar-month-chip-height` (21px), `--calendar-month-
chip-gap` (2px), and `--calendar-month-more-height` (17px) tokens (added by
the prior calendar-chooser-label-and-more-responsive task, unchanged by
this one) plus the day-number block and cell-padding constants documented
in the token's own comment. `--cal-canvas-height` (shared with Week/Day) is
**unchanged**.

## 4. JavaScript capacity ownership

`web-view/js/calendar/instance.js`, `MONTH_VISIBLE_TASK_CAP` (module-level
constant, defined immediately before `renderMonthView()`) and its one
reference (`var visibleCap = MONTH_VISIBLE_TASK_CAP;`) inside that
function. This is the single, shared implementation every member's Month
view renders through.

## 5. Responsive boundaries

- **>640px width** (desktop/tablet, the fixed-height Month grid): every row
  is guaranteed `≥112px` via the CSS `minmax()` floor, regardless of
  viewport height — confirmed at 1920×1080 down through 1024px-wide and
  tablet-portrait heights (see validation doc §12).
- **≤640px width** (mobile): the pre-existing, unchanged mobile media query
  fully overrides `grid-template-rows` to `auto` with `.msc-cal-cell
  {min-height:62px; overflow:visible}` — 2 previews are guaranteed there by
  auto-height growth, not by the new floor (which doesn't apply at this
  width in the first place).
- On short viewports where `6 × 112px` plus the header row exceeds
  `--cal-canvas-height`, the Month grid's actual rendered height grows past
  its nominal canvas height (standard CSS Grid track-minimum behavior);
  `.msc-cal-grid-wrap` has no `overflow-y` rule, so this only extends page
  scroll — it does not clip or double-scroll.

## 6. Retained functionality (by code inspection — not re-exercised live this session)

- Task chip / "+N more" click → `viewItem()` / `openMorePopup()` —
  unchanged; only the fixed count feeding `dayItems.slice(0, visibleCap)`
  changed (from a viewport-dependent 1-or-2 to a flat 2), not the handlers.
- Blank-cell click → Create chooser — unchanged.
- Leave-chip rendering, ordering, styling, and click-swallowing — completely
  untouched (see validation doc §10).
- Edit/Delete, Cancel Edit, drag/resize (Week/Day) — no file in any of
  those areas touched.
- `renderTimeGrid()` (Week/Day shared renderer), `TG_ROW_HEIGHT_PX` (56px,
  `core.js`) — untouched; Week/Day hour-row geometry unaffected.
- Application sidebar, Schedule Summary — untouched.

## 7. Deployment

Deploy through the existing Vercel process — pure CSS/JS edits to
already-deployed static files, no new build step or dependency.

## 8. Rollback

Revert the implementation commit (see §10) with `git revert <hash>`, or
hand-revert the 3 files listed in §1 — no data migration or schema change
to unwind.

## 9. Limitations

- The 112px row-height floor is derived from the *current* chip/gap/
  more-line geometry tokens; a future change to Month chip font-size or
  padding requires recalculating this floor (derivation fully documented
  in `tokens.css`).
- Live-browser/production validation (Step 17 of the task) was **not
  performed in this session** — the user explicitly chose to verify
  directly on `https://management-aios.vercel.app/` instead.
- On very short viewports, the Month grid now renders somewhat taller than
  its nominal canvas height to guarantee the 2-preview floor, requiring a
  bit more page scroll than before — an intended tradeoff, not a defect.

## 10. Commit hashes

Recorded after commit — see the final report / `git log --oneline -5` at
the end of this closure.

## 11. One next step

After the next Vercel deployment, open Month view for Mayurika and at
least one higher-volume member at both a tall (e.g. 1920×1080) and a
common laptop (e.g. 1366×768) window size, locate or create a day with 3+
same-day tasks, and confirm both previews plus a complete "+N more" are
visible with no row overlap and no new browser console errors.
