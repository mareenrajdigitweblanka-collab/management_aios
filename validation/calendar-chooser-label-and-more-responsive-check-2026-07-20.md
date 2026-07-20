# Calendar Chooser Label Correction and Responsive Month Overflow Check — 2026-07-20

## 1. Scope

Frontend UI/UX only. No backend, database, migration, API, Task/Leave rule,
overlap/conflict rule, form field, Task detail/Edit/Delete behavior,
Schedule Summary, report formula, member key/isolation, or application-
sidebar-behavior change. Protected path
`member-aios/mayurika-hr/staff-data/` untouched.

## 2. User-confirmed requirements (source of truth)

1. Keep chooser heading "Create".
2. Remove the repeated "Create " prefix from the visible menu items —
   `Create Task`/`Create Leave` → `Task`/`Leave`.
3–4. Task option still opens the Task creation popup; Leave option still
   opens the Leave creation popup.
5–7. Some Month cells clip/hide "+N more" after the recent event-text
   enlargement; other members may have more events than HR (Mayurika); no
   member-specific fix; make the Month event stack responsive so "+N more"
   is always fully visible whenever hidden tasks exist.
8. Preserve readable event text as much as possible.
9. No business logic, backend, database, API, or reporting change.

## 3. Chooser wording (old → new)

| | Previous session (2026-07-20, calendar-create-chooser task) | This task |
|---|---|---|
| Heading | "Create" (visible, `aria-hidden="true"` div) | **Unchanged** — still "Create" |
| Item 1 visible text | "Create Task" | **"Task"** |
| Item 2 visible text | "Create Leave" | **"Leave"** |
| Item 1 accessible name | "Create Task" (from visible text) | **"Create Task"** (now via explicit `aria-label`, since the visible text alone is shorter) |
| Item 2 accessible name | "Create Leave" (from visible text) | **"Create Leave"** (via explicit `aria-label`) |

Ownership: `web-view/js/calendar/instance.js`, the `msc-create-menu` markup
string (~line 85-91) inside `mountScheduleCalendarInstance()`. No rebuild —
only the button inner text and one new `aria-label` attribute per item were
changed. Preserved, unchanged: `data-create-kind` click wiring (`createMenuItems.forEach(...)`,
~line 527), `openCreateChoiceFromCalendar()` date/time prefill,
`positionCreateMenu()` anchoring, `onCreateMenuKeydown()` Escape handling,
`onDocClickForCreateMenu()` click-away, both `&#128221;`/`&#128197;` icons.

## 4. Root cause of clipped "+N more" (Step 4 discovery)

Checked against the 8-point discovery checklist:

1. **Visible-event count still assumed the old smaller chip height — YES,
   this is the root cause.** `instance.js` had `var MAX_CAL_CHIPS = 2;`, a
   fixed constant untouched since before the 2026-07-20 calendar-readability
   task raised `--calendar-event-font-size` (.64rem→.867rem) and introduced
   `--calendar-event-line-height` (1.3) for `.msc-cal-chip`. The constant
   never changed to account for the taller chip.
2. **Cell has fixed height while chips became taller — contributing
   factor.** `.msc-cal-grid.active` sets `height: var(--cal-canvas-height)`
   with `grid-template-rows: auto repeat(6, minmax(0,1fr))` — a real,
   viewport-height-driven fixed height, not auto-grow.
3. **Event stack uses `overflow:hidden` — confirmed.** `.msc-cal-cell` has
   `overflow: hidden`, so anything exceeding the row's actual height is cut
   off rather than pushing the cell taller.
4. **"+N more" rendered outside the usable content height — confirmed
   consequence of #1+#2+#3 together**, specifically at ordinary desktop
   viewport heights (see §6/§8 math below).
5. **Selected-cell border/ring reduces available height — NO.** `.msc-cal-cell.selected`
   uses `box-shadow: inset …` only (no border-width, no padding change) —
   confirmed not a contributing cause; it does not consume layout space.
6. **Line-height/padding increased without recalculating capacity — YES**,
   same root cause as #1: `--calendar-event-line-height`/font-size changed,
   `MAX_CAL_CHIPS` did not.
7. **Member screens differ only by event count — confirmed.** The renderer
   and CSS are identical for all 5 members; a cell only clips once a given
   day (any member) has enough same-day tasks to exceed real available
   space — a data-volume trigger, not a per-member rendering difference.
8. **A media query changes chip height without updating capacity — NO
   existing case found** (no Month-specific font-size media query existed
   before this task); relevant going forward since any future breakpoint-
   based chip-size change must keep `computeMonthChipCapacity()` in sync.

## 5. Old vs. new chip geometry (root font-size 15px)

| Property | Old (pre-2026-07-20 readability task) | Current (after that task, unchanged by this one) |
|---|---|---|
| `.msc-cal-chip` font-size | .64rem (~9.6px) | .867rem (~13.0px) |
| `.msc-cal-chip` line-height | 1.5 | 1.3 |
| `.msc-cal-chip` padding | 1px 6px | 2px 6px |
| `.msc-cal-chip` margin-bottom | 2px (hardcoded) | `var(--calendar-month-chip-gap)` = 2px (tokenized, **this task**) |
| Effective old chip line height | ~9.6×1.5 + 2 + 2 ≈ **18.4px** | ~13.0×1.3 + 4 + 2 ≈ **22.9px** (rounds to the 21px+2px=23px slot used below) |
| `.msc-cal-chip-more` margin-top | 1px | `var(--calendar-month-chip-gap)` = 2px (tokenized, **this task**, unifies the gap) |

The chip grew from ~18.4px to ~22.9px effective height (+~24%) while the
visible-count constant stayed at a fixed 2 — this is the concrete
before/after that produced the bug.

## 6. Old vs. new visible-capacity rule

| | Old | New |
|---|---|---|
| Rule | `var MAX_CAL_CHIPS = 2;` — fixed, ignores viewport height and chip geometry | `computeMonthChipCapacity()` — computed once per `renderMonthView()` call from the current viewport height, mirroring `--cal-canvas-height`'s own formula, and the tokenized chip/gap/more-line geometry |
| "+N more" reservation | None — always assumed 2 chips fit with room left over, regardless of whether that was still true | Explicit: `capWithMore` is calculated by first subtracting the "+N more" line's own height, so its line is reserved whenever it will be shown |
| No-overflow case | Always sliced at 2, even if only 1 item existed (harmless there) or fewer than the real per-viewport capacity | `capNoMore` (a larger number when room allows) is used whenever all items fit without needing "+more" at all — no blank reserved line |

New tokens (`tokens.css`), consumed by `calendar.css` and mirrored (documented,
literal) in `instance.js`:

```css
--calendar-month-chip-height: 21px;   /* .867rem font × 1.3 line-height + 2px/2px padding, rounded up */
--calendar-month-chip-gap: 2px;       /* stacked-line margin, shared by chip/leave/more */
--calendar-month-more-height: 17px;   /* "+N more" line's own text+padding+margin-top, rounded up */
```

`computeMonthChipCapacity()` (`instance.js`):

```js
canvasHeight = max(560, window.innerHeight - 56 /* --header-height */ - 300 /* --cal-canvas-height reserved term */)
rowHeight    = (canvasHeight - 30 /* Month header row */) / 6
contentHeight = rowHeight - 10 /* cell padding */ - 30 /* day-number block */
capNoMore   = floor(contentHeight / (21 + 2))
capWithMore = floor((contentHeight - 17) / (21 + 2)), capped at capNoMore
```

Every fixed-overhead estimate (header row, day-number block, cell padding)
is rounded **up**; the capacity division is rounded **down** — the function
can only ever under-count available chips, never over-count, so its one
possible failure mode is "shows one fewer chip than the theoretical max,"
never "clips the more-link again."

## 7. Reserved-space behavior (Step 6)

- A day within `capNoMore` (all tasks fit without needing an overflow link)
  renders every item and **no** "+N more" line — no blank reserved gap.
- A day exceeding `capNoMore` renders exactly `capWithMore` chips, then
  "+N more" for the remainder — the more-line's height was already
  subtracted from the budget before `capWithMore` was computed, so it has
  guaranteed room.
- The link's own hover/focus treatment (`box-shadow` ring, unchanged from
  the prior readability task) adds no layout-affecting size, so it cannot
  push content past the reserved line.
- Leave chips (rendered below tasks/"+more", `leaveItemsForDate()`) are
  **unbounded and unchanged** by this task — pre-existing, orthogonal
  display behavior (leave was never counted toward the "+N more" figure;
  see the existing code comment reproduced in `instance.js`). This task's
  reserved-space guarantee covers the task-chip stack and "+N more" only,
  matching the exact bug reported (event text enlargement clipping the
  task overflow indicator) — see §14 Limitations.

## 8. Computed capacity at representative viewport heights

(`window.innerHeight` is the only input; independent of viewport width,
member, or column position — every cell in the 6-row grid shares one row
height.)

| Viewport height | `canvasHeight` | `capNoMore` (all-fit threshold) | `capWithMore` (shown when overflowing) |
|---|---|---|---|
| 1080px (e.g. 1920×1080, 1600×1080) | 724px | 3 | 2 |
| 900px (e.g. 1600×900, 1440×900) | 560px (floor) | 2 | 1 |
| 768px (e.g. 1366×768, 1024×768) | 560px (floor) | 2 | 1 |
| 1024px (tablet portrait, e.g. 768×1024) | 668px | 2 | 2 |
| ≤640px width (mobile) | n/a — see §9 | n/a | n/a |

At the two most common laptop/desktop heights (768–900px), a day with **3
tasks now shows 1 chip + "+2 more"** instead of the old fixed "2 chips +
(clipped/hidden +1 more)" — trading one visible chip for a guaranteed-
visible overflow link, exactly the priority order requested (readable text
kept; "+more" always visible; fewer chips shown only when required; never
clipped).

## 9. Mobile (≤640px width)

Unchanged, pre-existing media query:

```css
@media (max-width: 640px) {
  .msc-cal-grid.active { height: auto; grid-template-rows: auto; }
  .msc-cal-cell { min-height: 62px; overflow: visible; }
}
```

At this width the cell grows to fit its content (`overflow: visible`) —
structurally, clipping is impossible here regardless of chip count. The new
`computeMonthChipCapacity()` does not special-case width, so on mobile it
still applies a (typically small, e.g. `capNoMore=2`) height-derived cap;
this is no worse than the old fixed constant (also 2) and, if anything,
slightly more conservative — a known characteristic, not a regression (see
§14).

## 10. Static checks performed

| Check | Result |
|---|---|
| `node --check web-view/js/calendar/instance.js` | PASS |
| `node --check web-view/js/calendar/core.js` | PASS |
| CSS brace balance (`calendar.css` 255/255, `tokens.css` 5/5, `navigation.css` 80/80, `components.css` 165/165) | Balanced |
| HTML `<div>` tag balance (`index.html`) | Balanced (312/312) |
| Duplicate `id` scan (`index.html`) | None (22 unique ids) |
| Local static HTTP server — `index.html`, `tokens.css`, `calendar.css`, `instance.js`, `core.js` | All HTTP 200 |
| `git diff --stat -- backend/ database/` | Empty |
| `grep MAX_CAL_CHIPS` (residual reference scan) | Only the explanatory comment remains; no code reference |

## 11. Member-agnostic validation (Step 10)

`git diff` shows **zero** new selectors of the form `[data-member="..."]`,
`.member-mayurika`, `.member-suman`, etc. `computeMonthChipCapacity()` and
`renderMonthView()` are the one shared implementation every member's
`mountScheduleCalendarInstance()` call already uses (5 calendar instances,
one shared module, confirmed unchanged mounting pattern) — the fix is
identical code for Mayurika, Suman, Arun, Rajiv, and Paraparan.

## 12. Backend / database / API / Schedule Summary

```
git diff --stat -- backend/ database/    → (empty)
```

No `.py`, migration, route, request/response shape, table/column,
classification, overlap/conflict rule, or Schedule Summary file appears in
this change. Confirmed **UNCHANGED**.

## 13. Browser / production validation

**Not performed in this session**, per explicit user direction earlier in
this conversation ("you dont need to check I check in production"). The
following are therefore **not independently browser-confirmed** this
session and are deferred to the user checking
`https://management-aios.vercel.app/` after deployment:

- Visual confirmation that the chooser reads "Create" / "Task" / "Leave".
- Visual confirmation that a high-volume day (any member) shows a complete,
  unclipped "+N more" at real browser viewport heights.
- Hover/focus behavior on "+N more" in a live browser.
- Console-error-free confirmation.

All capacity/geometry figures in this document are derived analytically
from the committed CSS values and the `computeMonthChipCapacity()` formula
actually shipped, not from a rendered page. The underlying arithmetic
mirrors `--cal-canvas-height`'s own already-shipped, already-relied-upon
formula (not a new assumption introduced by this task).

## 14. Limitations

- Leave-chip stacking (below tasks/"+more") remains unbounded and
  unchanged — this task's reserved-space fix covers the task-chip/"+N more"
  stack specifically, matching the reported bug. A day with an unusually
  high leave-record count is outside this task's scope.
- `computeMonthChipCapacity()` is recalculated on every `renderMonthView()`
  call (view switch, date select, prev/next month, CRUD save/delete) but
  not on a bare window resize with no follow-up calendar action — matching
  the existing architecture (no other Month geometry reacts live to resize
  either). A user who resizes the browser without touching the calendar
  keeps the previous capacity until the next render.
- On mobile (`≤640px` width, `overflow:visible`/auto-height), the capacity
  function is not width-aware, so it may show "+N more" slightly earlier
  than mobile's auto-growing cell strictly requires. Not a regression (the
  old fixed constant behaved identically there) and not a clipping risk
  (mobile cannot clip structurally at this breakpoint).

## 15. Result

**AMBER.**

Chooser wording, accessible labels, and the responsive Month "+N more"
capacity fix are implemented, member-agnostic (§11), static-checked clean
(§10), and diff-reviewed to contain no backend/database/API/Schedule
Summary or member-specific change (§12). The item withheld from a PASS is
live-browser/production verification (§13), which the user has chosen to
perform directly on the deployed Vercel URL.

## 16. Next step

After deployment, open a Month view for Mayurika (HR) and at least one
higher-volume member on `https://management-aios.vercel.app/`, confirm the
chooser reads "Create" / "Task" / "Leave", find or create a day with 3+
same-day tasks, and confirm "+N more" is fully visible (not clipped/hidden)
and opens the correct date's task list on click, with no new console
errors.
