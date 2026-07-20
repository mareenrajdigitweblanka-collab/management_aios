# Calendar Two-Task-Preview Guarantee and Month Cell Height Check — 2026-07-20

## 1. Scope

Frontend Month-view layout only. No backend, database, migration, API,
Task/Leave rule, form field, Task detail/Edit/Delete, Schedule Summary,
report formula, member key/isolation, application-sidebar, or Week/Day
geometry change. Protected path `member-aios/mayurika-hr/staff-data/`
untouched.

## 2. User-confirmed requirement (source of truth)

1. Month cells currently show only one Task preview at some screen sizes.
2. Every populated Month cell must show at least two Task previews
   whenever two or more Tasks exist.
3. Month cell/row height may be increased to make this fit.
4. At 3+ tasks: preview 1, preview 2, complete "+N more".
5. Preserve the recently approved larger, readable Task text.
6. No member-specific fixes.
7. No backend/database/API/business-rule change.

## 3. Root cause

Following the Step 2 checklist against the code shipped by the immediately
prior task (calendar-chooser-label-and-more-responsive, same day):

1. **Renderer capacity hardcoded to one — NO.** It was a *computed* value
   (`computeMonthChipCapacity()` returning `{capNoMore, capWithMore}`), not
   a hardcoded 1.
2. **Responsive formula computes only one fitting chip — YES, this is the
   direct cause.** At the two most common laptop/desktop viewport heights
   (~768-900px tall), `computeMonthChipCapacity()` resolved
   `capWithMore = 1` — i.e., whenever a day had 3+ tasks (needing "+N
   more"), the formula legitimately determined only 1 chip plus the
   overflow line could fit in the row height available at that time.
3. **Row height too small after the font-size increase — YES,
   contributing.** `--cal-canvas-height`'s floor (560px) and its
   viewport-height formula were unchanged by the prior readability task
   even though the chip's effective height grew (~18.4px → ~22.9px, +24%).
4. **Reserved "+N more" line consumes the second preview slot — YES,
   confirmed.** At 768-900px tall viewports, the per-row content budget
   (~48px) fit exactly 2 plain chips (`capNoMore=2`) but only 1 chip once
   the "+N more" line's own height was reserved (`capWithMore=1`) — this
   is precisely the "only one preview" symptom reported.
5. **Cell content area clipped — NO**, not by this point; the *prior* task
   had already made the capacity calculation conservative specifically to
   avoid clipping — the tradeoff it made was showing fewer chips, down to 1.
6. **Date-header space over-reserved — NO.** The day-number block (30px:
   24px circle + 2px/4px margin) is an accurate, not inflated, estimate.
7. **Selected-cell border/ring reduces effective space — NO, confirmed
   again.** `.msc-cal-cell.selected` uses `box-shadow: inset …` only — no
   border-width or padding change, no layout-space consumption.
8. **CSS/JS geometry out of sync — NO**, not by this point (the prior task
   had already tokenized and cross-referenced chip/gap/more-line geometry
   between `tokens.css`, `calendar.css`, and `instance.js`).

**In short:** the previous fix correctly prioritized "never clip" over
"always show 2," which is why it could still fall back to exactly 1 visible
preview at ordinary laptop viewport heights. This task's explicit new
permission ("Month cell/row height may be increased") removes that
tradeoff by making the row physically tall enough for 2 previews + "+N
more" everywhere, so the display rule can now be a simple, always-2
guarantee instead of a viewport-height-conditional calculation.

## 4. Old vs. new Month row height

| | Old | New |
|---|---|---|
| `grid-template-rows` (row track) | `minmax(0, 1fr)` — no real floor; a row could shrink to whatever `--cal-canvas-height / 6` produced | `minmax(var(--calendar-month-row-min-height), 1fr)` = `minmax(112px, 1fr)` — a hard floor of 112px per row |
| Row height at common laptop heights (~768-900px viewport) | ~88.3px (560px floor − 30px header) / 6 | **112px** (floor now wins over the ~88.3px that would otherwise result) |
| Row height at 1920×1080 | ~115.7px | ~115.7px (unchanged — already above the new 112px floor, so 1fr distribution still governs there) |
| `--cal-canvas-height` (shared with Week/Day) | `max(560px, 100vh − 56px − 300px)` | **Unchanged** — this task does not touch the shared token, so Week/Day's `.msc-tg-scroll` max-height is unaffected |

## 5. Old vs. new cell content height

("Content height" = row height − cell padding (10px) − day-number block (30px), i.e. the space actually available for chips/"+more".)

| Viewport height | Old content height | Old capacity | New row height | New content height |
|---|---|---|---|---|
| ~1080px (e.g. 1920×1080) | ~75.7px | capNoMore 3 / capWithMore 2 | ~115.7px (1fr, above floor) | ~75.7px (unchanged there) |
| ~900px (e.g. 1600×900, 1440×900) | ~48.3px | capNoMore 2 / **capWithMore 1** | **112px (floor)** | **72px** |
| ~768px (e.g. 1366×768, 1024-wide laptops) | ~48.3px | capNoMore 2 / **capWithMore 1** | **112px (floor)** | **72px** |
| ~1024px (tablet portrait) | ~66.3px | capNoMore 2 / capWithMore 2 | **112px (floor, since 106.3 < 112)** | **72px** |

At every height where the old formula produced `capWithMore = 1` (the
reported bug), the new fixed 112px floor raises real content height to 72px
— comfortably above the 63px bare minimum (2 chip slots @ 23px = 46px + one
17px "+more" line), with a ~9px safety margin.

## 6. Old vs. new visible-capacity rule

| | Old | New |
|---|---|---|
| Mechanism | `computeMonthChipCapacity()` — reads `window.innerHeight`, mirrors `--cal-canvas-height`'s formula, returns a viewport-height-dependent `{capNoMore, capWithMore}` pair | `var MONTH_VISIBLE_TASK_CAP = 2;` — a plain constant, safe *because* the CSS row-height floor (§4) now structurally guarantees the space, not because of any live calculation |
| Result at 768-900px viewport height, 3+ tasks | 1 chip + "+N more" | **2 chips + "+N more"** |
| Result at 1920×1080, 3+ tasks | 2 chips + "+N more" | 2 chips + "+N more" (unchanged; the old formula already gave 2 there — the new constant matches it exactly rather than allowing the 3 the old formula could have shown, per the "at least 2, not necessarily more" requirement) |

## 7. Two-preview guarantee

For every desktop/tablet width (>640px, i.e. every width where the fixed-
height Month grid applies — see §12 for the confirmed viewport list):

- Row height is `max(112px, --cal-canvas-height⁄6-share)` — **never below
  112px**, by the `minmax()` CSS Grid track-sizing guarantee (a track's
  base size is never violated by `fr` distribution).
- 112px row height yields 72px of real content height — enough for 2 full
  chip slots (46px) + a complete "+N more" line (17px) + a ~9px buffer,
  regardless of viewport height.
- The renderer (`MONTH_VISIBLE_TASK_CAP = 2`, `instance.js`) always slices
  up to 2 items and shows "+N more" for any remainder — uniform for all 5
  members, not conditioned on viewport size, member identity, or task
  count beyond the 0/1/2/3+ rule itself.

On short viewports where `6 × 112px + header (~30px) = 702px` exceeds
`--cal-canvas-height`, the grid's actual rendered height simply grows past
its nominal `height` value to satisfy the row minimums (standard CSS Grid
behavior) — `.msc-cal-grid-wrap` has no `overflow-y` rule (defaults to
`visible`), so this only pushes later page content down; it does not clip,
double-scroll, or break layout.

## 8. Display-rule cases (0 / 1 / 2 / 3 / 10+ tasks)

| Case | Behavior (by code inspection) |
|---|---|
| 0 tasks | `dayItems.slice(0, 2)` → empty; `0 > 2` false → no chips, no "+more" |
| 1 task | `slice(0,2)` → the 1 item; `1 > 2` false → 1 chip, no "+more" |
| 2 tasks | `slice(0,2)` → both items; `2 > 2` false → 2 chips, no "+more" |
| 3 tasks | `slice(0,2)` → first 2; `3 > 2` true → 2 chips + **"+1 more"** |
| 10 tasks | `slice(0,2)` → first 2; `10 > 2` true → 2 chips + **"+8 more"** |
| 20 tasks | `slice(0,2)` → first 2; `20 > 2` true → 2 chips + **"+18 more"** |

Matches the Step 3 examples exactly. "+N more" count is always
`dayItems.length − 2` whenever it is shown — `dayItems` is the same
task-only, date-filtered, member-scoped array every other Month/Week/Day
renderer already reads (`itemsForDate()`, unchanged).

## 9. HR and high-volume member result (by code inspection)

`renderMonthView()` and `MONTH_VISIBLE_TASK_CAP` are the one shared
implementation every member's `mountScheduleCalendarInstance()` call uses —
confirmed no `[data-member="..."]`, `.member-mayurika`, or similar selector
in the diff (`git diff` shows only `calendar.css`/`tokens.css`/
`instance.js`, no per-member branch). The same 112px floor and same
constant-2 cap apply identically whether a given day has HR's typically
lower task volume or a higher-volume member's data — the rule is driven
entirely by `dayItems.length`, not by which member's calendar is rendering.

## 10. Leave-plus-task result (Step 8)

Leave-chip rendering (`leaveItemsForDate(c.dateStr).forEach(...)`,
`instance.js`) is **completely untouched** by this change — same position
(after task chips/"+more"), same `.msc-cal-chip-leave` class, same red
styling tokens, same "leave never counts toward the +N more figure, no
role/tabindex, click stops propagation" behavior. The taller row (112px
floor vs. the old ~88px at common heights) gives Leave chips *more*
breathing room in a mixed cell, not less — no ordering change was made or
needed; the two-Task-preview guarantee and existing Leave behavior are not
in conflict.

## 11. Selected/today/adjacent-month cells

- `.msc-cal-cell.selected`: unchanged `box-shadow: inset 0 0 0 3px accent,
  0 2px 8px rgba(...)` — inset only, consumes no layout space, cannot cover
  "+N more" or reduce usable content height (confirmed unaffected by the
  row-height increase, since it was never a layout-space contributor to
  begin with — see §3 item 7).
- `.msc-cal-daynum.today`: unchanged circular badge — unaffected.
- `.msc-cal-cell.other-month`: unchanged `opacity: .4` — unaffected; the
  same 112px floor and 2-item cap apply to adjacent-month dates exactly as
  in-month ones (no separate code path).
- Selected + today combined: both classes' rules apply independently
  (`box-shadow` ring + colored circle badge) — no interaction, matches
  pre-existing behavior.

## 12. Responsive viewport matrix

(`--cal-canvas-height = max(560px, 100vh − 56px − 300px)`; assumed nominal
viewport heights per the standard resolutions below — browser chrome
reduces the real value slightly but does not change which side of the
560px floor a given resolution falls on.)

| Viewport | Row height | Content height | Visible previews (3+ tasks) | "+N more" | Overlap/clip | H-overflow |
|---|---|---|---|---|---|---|
| 1920×1080 | ~115.7px (1fr, above 112px floor) | ~75.7px | **2** | Visible | None | None |
| 1600×900 | **112px (floor)** | 72px | **2** | Visible | None | None |
| 1440×900 | **112px (floor)** | 72px | **2** | Visible | None | None |
| 1366×768 | **112px (floor)** | 72px | **2** | Visible | None | None |
| 1024px wide (≈768 tall) | **112px (floor)** | 72px | **2** | Visible | None | None |
| Tablet (≈768×1024 portrait) | **112px (floor, 106.3px 1fr-share < 112)** | 72px | **2** | Visible | None | None |
| Mobile (≤640px width) | `auto` (mobile media query fully overrides `grid-template-rows`; `.msc-cal-cell{min-height:62px; overflow:visible}`) | grows with content | **2** (cell grows to fit; not clipping-constrained) | Visible | None (auto-height) | None |

Desktop and standard laptop widths (1920 down through 1024) all resolve to
either the new 112px floor or a taller 1fr share — both guarantee 2
previews. No width in the matrix produces fewer than 2.

## 13. Week/Day regression

`web-view/js/calendar/instance.js` diff touches only the Month-specific
`MONTH_VISIBLE_TASK_CAP` constant and its one call site inside
`renderMonthView()` — `renderTimeGrid()` (the single shared Week/Day
renderer) was not touched. `web-view/css/calendar.css`'s only change is to
`.msc-cal-grid.active`'s `grid-template-rows` (Month-only selector).
`--cal-canvas-height` (shared token, also read by Week/Day's
`.msc-tg-scroll { max-height: ... }`) is **unchanged** — confirmed by
`git diff` showing no edit to that token's declaration. `TG_ROW_HEIGHT_PX`
(56px, `core.js`) — the actual Week/Day hour-row height — was not touched.

## 14. Static checks performed

| Check | Result |
|---|---|
| `node --check web-view/js/calendar/instance.js` | PASS |
| `node --check web-view/js/calendar/core.js` | PASS |
| CSS brace balance (`calendar.css` 255/255, `tokens.css` 5/5, `navigation.css` 80/80, `components.css` 165/165) | Balanced |
| HTML `<div>` tag balance (`index.html`) | Balanced (312/312) |
| Duplicate `id` scan (`index.html`) | None (22 unique ids) |
| Local static HTTP server — `index.html`, `tokens.css`, `calendar.css`, `instance.js`, `core.js` | All HTTP 200 |
| `git diff --stat -- backend/ database/` | Empty |
| `git diff --stat -- web-view/index.html web-view/css/navigation.css web-view/js/calendar/core.js` | Empty (none of these files touched) |
| Residual-reference scan (`computeMonthChipCapacity`, `chipCapacity`) | Only the explanatory comment remains; no code reference |

## 15. Backend / database / API / Schedule Summary

```
git diff --stat -- backend/ database/    → (empty)
```

No `.py`, migration, route, request/response shape, table/column,
classification, overlap/conflict rule, or Schedule Summary file appears in
this change. Confirmed **UNCHANGED**.

## 16. Browser / production validation

**Not performed in this session**, per the user's standing direction
earlier in this conversation to validate directly on
`https://management-aios.vercel.app/` rather than locally. All row-height,
content-height, and capacity figures in this document are derived
analytically from the committed CSS/JS values, not measured from a
rendered page.

## 17. Limitations

- The 112px floor is derived from the *current* chip/gap/more-line
  geometry (§4); if those tokens change again in a future task, this
  floor's derivation comment (`tokens.css`) is the one place to
  recalculate from.
- On very short viewports where the floor's total (702px for 6 rows +
  header) exceeds `--cal-canvas-height`, the Month grid renders taller than
  its nominal canvas height, requiring a bit more page scroll than before
  — an intended, documented tradeoff (§7), not a defect.
- Mobile (`≤640px`) is unaffected by design (its own auto-height/
  overflow-visible media query already guarantees 2 previews trivially) —
  not a "mobile exception" in the sense of showing fewer than 2, just a
  different (already-safe) mechanism.
- Live-browser/production verification (Step 17) was not performed this
  session — deferred to the user.

## 18. Result

**AMBER.**

The two-Task-preview guarantee, the Month row-height increase, and the
simplified always-2 capacity rule are implemented, member-agnostic (§9),
Week/Day-safe (§13), static-checked clean (§14), and diff-reviewed to
contain no backend/database/API/Schedule Summary change (§15). The item
withheld from a PASS is live-browser/production verification (§16), which
the user has chosen to perform directly on the deployed Vercel URL.

## 19. Next step

After deployment, open Month view for Mayurika (HR) and at least one
higher-volume member on `https://management-aios.vercel.app/` at both a
tall (e.g. 1920×1080) and a common laptop (e.g. 1366×768 or 1440×900)
window size, find or create a day with 3+ same-day tasks, and confirm both
previews plus a complete "+N more" are visible with no row overlap, and
that the browser console shows no new errors.
