# Handover — Calendar Chooser Label Correction and Responsive Month Overflow Fix

**Date:** 2026-07-20
**Scope:** Frontend UI/UX only — chooser visible-label correction and a
responsive fix for clipped/hidden Month "+N more". No backend, database,
migration, API, Task/Leave rule, form field, Task detail/Edit/Delete, or
Schedule Summary change.

## 1. Files changed

| File | What changed |
|---|---|
| `web-view/js/calendar/instance.js` | Create-menu item visible text reverted to "Task"/"Leave" (from "Create Task"/"Create Leave"), each with an added `aria-label="Create Task"`/`"Create Leave"`; removed the fixed `MAX_CAL_CHIPS = 2` constant, replaced with `computeMonthChipCapacity()` (viewport-height-driven, mirrors `--cal-canvas-height`'s own formula) and a per-cell `visibleCap` used in place of the old constant in `renderMonthView()` |
| `web-view/css/calendar.css` | `.msc-cal-chip`/`.msc-cal-chip-leave` `margin-bottom` and `.msc-cal-chip-more` `margin-top` now read the new `--calendar-month-chip-gap` token (unifies the stacked-line gap; `.msc-cal-chip-more`'s gap moved 1px→2px) |
| `web-view/css/tokens.css` | Added `--calendar-month-chip-height` (21px), `--calendar-month-chip-gap` (2px), `--calendar-month-more-height` (17px) |

`web-view/index.html` and `web-view/css/navigation.css` were **not**
touched by this task (no workspace-width or markup-structure change was
required).

Full derivation, old/new values, and the per-viewport capacity table:
`validation/calendar-chooser-label-and-more-responsive-check-2026-07-20.md`.

## 2. Chooser-label ownership

`web-view/js/calendar/instance.js`, `mountScheduleCalendarInstance()`, the
`msc-create-menu` markup string (~lines 85-93). Click wiring
(`createMenuItems.forEach` → `data-create-kind` dispatch), `openTaskPopup()`/
`openLeavePopup()`, `openCreateChoiceFromCalendar()`'s date/time prefill,
`positionCreateMenu()`, and Escape/click-away handling are all unchanged —
only the two buttons' inner text and one new `aria-label` attribute each.

## 3. Month capacity ownership

`web-view/js/calendar/instance.js`, `computeMonthChipCapacity()` (new
function, defined immediately before `renderMonthView()`) and its one call
site inside `renderMonthView()`. This is the single, shared implementation
every member's Month view renders through — no per-member branch exists or
was added.

## 4. CSS/JS token ownership

`--calendar-month-chip-height` / `--calendar-month-chip-gap` /
`--calendar-month-more-height` (`web-view/css/tokens.css`) are consumed
directly by `.msc-cal-chip`, `.msc-cal-chip-more`, and `.msc-cal-chip-leave`
(`web-view/css/calendar.css`) for the actual layout gap, and mirrored as
literal, comment-cross-referenced constants inside
`computeMonthChipCapacity()` (`instance.js`) — there is no
CSS-custom-property-read bridge in this vanilla-JS codebase, so the two
representations are kept in sync by comment, not automatically.

## 5. Responsive boundary

- `computeMonthChipCapacity()` depends only on `window.innerHeight`,
  independent of viewport width or which member's calendar is rendering —
  every cell in the Month grid's 6 rows shares one row height
  (`grid-template-rows: auto repeat(6, minmax(0,1fr))` against one shared
  `--cal-canvas-height`).
- `≤640px` width: the pre-existing, unchanged mobile media query switches
  the grid to `height:auto`/`overflow:visible` — structurally clipping-free
  regardless of the computed capacity (see validation doc §9 for the minor,
  non-regressive interaction between the two).
- Recalculated on every `renderMonthView()` call (view switch, date select,
  prev/next month, CRUD save/delete) — not on a live window-resize
  listener (none was added; matches the existing architecture, where no
  other Month geometry reacts to an in-place resize either).

## 6. Retained functionality (by code inspection — not re-exercised live this session)

- Task option → existing Task creation popup; Leave option → existing
  Leave creation popup — `data-create-kind` dispatch unchanged.
- Task chip / "+N more" click → `viewItem()` / `openMorePopup()` —
  unchanged; only which/how-many items feed into `dayItems.slice(0,
  visibleCap)` and the overflow count changed, not the click handlers
  themselves.
- Blank-cell click → Create chooser (`openCreateChoiceFromCalendar`) —
  unchanged.
- Leave-chip rendering/click-swallowing, Edit/Delete, drag/resize (Week/
  Day), Task/Leave conflict and overlap rules, Schedule Summary — no file
  in any of those areas was touched.
- Application sidebar — untouched.

## 7. Deployment

Deploy through the existing Vercel process — pure HTML/CSS/JS edits to
already-deployed static files, no new build step or dependency.

## 8. Rollback

Revert the implementation commit (see §10) with `git revert <hash>`, or
hand-revert the 3 files listed in §1 — no data migration or schema change
to unwind.

## 9. Limitations

- Live-browser/production validation (Step 17 of the task) was **not
  performed in this session** — the user explicitly chose to verify
  directly on `https://management-aios.vercel.app/` instead. All capacity
  numbers in the validation doc are formula-derived from the committed
  code, not measured from a rendered page.
- Leave-chip stacking is unbounded/unchanged — out of this task's scope
  (the reported bug and Step 6's reserved-space requirement are both
  specific to the task-chip/"+N more" stack).
- No live window-resize listener was added; capacity updates on the next
  calendar render, not instantaneously mid-resize (matches existing
  architecture elsewhere in this file).

## 10. Commit hashes

Recorded after commit — see the final report / `git log --oneline -5` at
the end of this closure.

## 11. One next step

After the next Vercel deployment, open Month view for Mayurika and at least
one other, higher-volume member, confirm the chooser reads "Create" /
"Task" / "Leave", locate (or create test data for) a day with 3 or more
same-day tasks, and confirm "+N more" is fully visible and clickable there
at your own screen size, with no new browser console errors.
