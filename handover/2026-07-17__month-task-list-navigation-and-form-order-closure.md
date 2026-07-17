# Handover — Month Task-List Navigation and Form Order

**Requirement:** Month-view date-cell/task-chip/"+N more" clicks navigate to
the existing Schedule Item list filtered to that date (Month only; leave-only
and empty cells do nothing; leave chips never navigate). Page order becomes
Schedule Item creation form → Leave applying form → Schedule Item list
(Schedule Summary stays above all three). Frontend-only.

**Validation:** `validation/month-task-list-navigation-and-form-order-check-2026-07-17.md`

---

## Files Changed

| File | Nature of change |
|---|---|
| `web-view/js/calendar/instance.js` | New `navigateToScheduleItemListForDate()` helper; `renderMonthView()` cell/chip/"+N more" markup and event-wiring rewritten per the click rules; `container.innerHTML` template's card wrappers split/reordered (form → leave → list); `msc-list-heading` class + `tabindex="-1"` added to the list's existing heading |
| `web-view/css/calendar.css` | `.msc-cal-cell` no longer has unconditional `cursor:pointer`/hover (moved to new `.msc-cal-cell--actionable`); `:focus-visible` rings added for actionable cells and chips; `cursor:pointer` added to `.msc-cal-chip`/`.msc-cal-chip-more` |

**Not changed:** `web-view/index.html`, `web-view/js/app.js`, `web-view/js/navigation.js`, `web-view/js/staff-data.js`, `web-view/js/calendar/core.js`, `web-view/css/components.css`, `backend/`, `database/`, `member-aios/mayurika-hr/staff-data/`.

## Helper / Function Name

`navigateToScheduleItemListForDate(dateStr)` — container-scoped closure
function inside `mountScheduleCalendarInstance()`, defined next to
`selectDate()`. Wraps `selectDate(dateStr)` (the existing selected-date
source of truth, which already syncs form dates, cancels in-progress edits,
re-renders the filtered list, and reloads summaries) and adds
`scrollIntoView` + `.focus()` on the list heading. No window-global state.

## Filter-State Ownership

There is no new filter variable. The Schedule Item list's existing filter
**is** `state.selectedDate` (per-instance closure state, already read by
`renderList()`: `items.filter(it => it.date === state.selectedDate)`).
Navigating from Month reuses this exact mechanism — one date, one source of
truth, shared by the calendar grid, the create/edit forms, and the list.

## Section Order

```
Schedule Summary (unchanged position)
  1. Schedule Item creation form   (.msc-form-card)
  2. Leave applying form           (.msc-leave-card — "New Leave Request")
  3. Schedule Item list            (.msc-list-card — "Schedule Items —")
```

Achieved by splitting the original single `hr-table-card` wrapper (which held
form+list+priority-preview+clear-button+footer+modal together) into three
separate `hr-table-card` wrappers, and relocating the existing
`hr-table-card.msc-leave-card` (head, notice, leave-request form, leave list
— moved as one atomic, internally-unmodified block) between the first and
third. No id, class, data attribute, form field, or event hook inside any of
the three blocks was rewritten — only which outer card wraps them and in
which order.

## Retained Behavior

- Task CRUD (create/edit/delete from the Schedule Item list) — untouched functions (`addBtn`/`updateBtn`/`deleteItem`/`editItem` listeners).
- Drag/resize in Week/Day (`attachDragHandlers`, `attachResizeHandler`, `wireTimeGridInteractions`) — untouched, zero diff.
- Week/Day task-detail modal (`viewItem()`) — untouched; Month chips never called it (verified: they had no click handler at all before this task).
- Leave create/delete, leave-overlap rejection, leave-deduction reporting — untouched functions.
- Schedule Summary (`renderSummaryStats`, `loadDailySummary`/`loadWeeklySummary`/`loadMonthlySummary`) — zero diff, confirmed via targeted grep of the diff.
- Member isolation — unchanged architecture (one closure per `.msc-instance` container).

## Deployment Result

Pushed to `origin/main`; live-site confirmation pending — see the final
report in this conversation for the post-push check against
`management-aios.vercel.app`.

## Commit Hash

`832abcf` — "Navigate Month tasks to filtered list; reorder leave form before task list" (combines the navigation-behavior and section-reorder changes into one commit rather than splitting via patch-hunks, since both live in the same interleaved file region and a manual hunk split risked a broken intermediate commit).

## Known Limitations

- **No real browser validation was possible in this session** (no browser/screenshot tool available) — this is why the result is AMBER, not PASS. Click-through behavior, keyboard activation, scroll/focus landing, and console-error-free operation were verified by code inspection and static/structural checks only, not by observation.
- The dynamic tag-balance check (Node-eval of the `innerHTML` template with stub values) surfaced a "1 unclosed div" artifact present identically in both the pre-edit and post-edit versions — confirmed as a pre-existing extraction-method quirk, not a real markup defect, but a genuine DOM-based render check would be more conclusive than this workaround.
- The Priority Preview card, Clear Testing Data button, footer, and view-modal now live in a third card alongside the Schedule Item list (previously they shared a card with the creation form) — a structural side-effect of splitting the wrapper to achieve the required order, not separately requested; visually this reads as one more consistently-bordered card, judged a neutral-to-positive change but not explicitly verified in a browser.

## One Next Step

Open the deployed dashboard in a real browser, and for each member run the
Month-view test matrix from the validation doc (empty cell, leave-only cell,
one-task cell, multi-task cell, task chip, "+N more", leave chip, adjacent-
month date, keyboard activation, repeated click) plus the section-order and
Week/Day-preservation checks, then update the validation doc's result from
AMBER to PASS.

## Result

**AMBER** — see validation doc §15 for the full rationale.
