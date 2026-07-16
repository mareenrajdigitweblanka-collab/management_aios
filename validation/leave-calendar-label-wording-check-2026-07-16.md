---
name: leave-calendar-label-wording-check-2026-07-16
type: validation-check
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: leave-calendar-label-wording-cleanup
status: PASS
---

# Validation Check — Leave Calendar Label Wording Cleanup

**Check date:** 2026-07-16

## Requirement

Remove workflow-status wording from leave items displayed in normal calendar
views (Month, Week, Day, Multi-Day). Normal calendar chips/blocks must show
leave-type-only wording. Status must remain fully intact everywhere else:
backend records, database columns, API responses, leave history, leave
details, and status-action controls. Rejected/Cancelled leave must remain
hidden from normal calendar views; Pending/Approved leave remain visible.

Display-only change. File scope: `web-view/index.html` only.

## Old Wording (before this change)

Normal calendar chips and blocks concatenated leave type and status with an
em dash, e.g.:

```
Full-Day — Approved
Short Leave — Pending
```

Found in three rendering paths in `web-view/index.html`:

- Month view leave chip (`renderMonthView` → `leaveItemsForDate(...).forEach`)
- Week/Day all-day banner for Full-Day/Multi-Day leave (`renderTimeGrid` →
  all-day row)
- Week/Day timed leave block for Short Leave/Half-Day leave (`renderTimeGrid`
  → timed area) — visible text was already type-only (`lv.leave_type`), but
  the `title` tooltip and the raw stored type wording (`Half-Day First` /
  `Half-Day Second`) did not match the approved user-facing labels.

## New Wording (after this change)

Visible calendar text now uses type-only, user-facing wording with no status
appended:

```
Full-Day Leave
Short Leave
First-Half Leave
Second-Half Leave
Multi-Day Leave
```

## Shared Formatter

Added once, reused by every normal-calendar rendering path (no per-view or
per-member duplication):

- `LEAVE_TYPE_DISPLAY_LABEL` — maps stored `leave_type` values to the
  approved display labels (`Short Leave`, `Half-Day First` → `First-Half
  Leave`, `Half-Day Second` → `Second-Half Leave`, `Full-Day` → `Full-Day
  Leave`, `Multi-Day` → `Multi-Day Leave`).
- `formatLeaveCalendarLabel(lv)` — returns the type-only display label for
  a leave record. Used for all visible chip/block text.
- `leaveCalendarAccessibleLabel(lv)` — returns `"<type label>, status
  <status>"`, used only in the `title` attribute (tooltip / accessible
  description), never in visible chip/block text.

Defined once immediately after `LEAVE_STATUS_CLASS` in `web-view/index.html`
and called from all three normal-calendar rendering sites. No stored
`leave_type` or `status` value is modified — the formatter is read-only
display logic.

## Month Result

PASS. `renderMonthView` leave chip now renders
`escapeHtml(formatLeaveCalendarLabel(lv))` as visible text and
`escapeHtml(leaveCalendarAccessibleLabel(lv))` as the `title` tooltip.
Status-based CSS class (`LEAVE_STATUS_CLASS`) is unchanged, so
Pending/Approved styling distinction is preserved.

## Week Result

PASS. Both the all-day banner (Full-Day/Multi-Day) and the timed leave block
(Short Leave/Half-Day) in `renderTimeGrid` use the same shared formatter.
Time placement, block height, and overlap/conflict layout logic
(`layoutOverlappingItems`, `leaveDisplayTimeRange`) are untouched.

## Day Result

PASS. Day view reuses the identical `renderTimeGrid` function as Week view
(same code path, single `days` array), so wording is guaranteed consistent
with no separate Day-view logic to update.

## Multi-Day Result

PASS. Multi-Day leave renders in the all-day banner (`lv.leave_type ===
'Multi-Day'` filter) and now always displays `Multi-Day Leave` regardless of
status. Weekend exclusion (`expandWeekdaysClientSide`) and date-expansion
logic (`leaveDatesForItem`) are unchanged — only the label text was touched.

## Normal-Calendar Status Text Removed

PASS. Confirmed via static search: the previous concatenation pattern
(`lv.leave_type + ' — ' + lv.status`) no longer exists anywhere in the file.
No normal-calendar chip or block renders `Pending`, `Approved`, `Rejected`,
or `Cancelled` as visible text.

## History Status Retained

PASS. `renderLeaveList` (leave-for-selected-date panel with status-action
controls) and `renderLeaveHistoryList` (Show History panel) both still
render `escapeHtml(lv.status)` explicitly in a status badge alongside the
leave type. Neither function was modified by this change — they are outside
the approved file-scope boundary for status display and were confirmed
untouched.

## All-Five-Member Result

PASS. The shared formatter functions (`formatLeaveCalendarLabel`,
`leaveCalendarAccessibleLabel`) and the three rendering call sites are
member-agnostic — they operate on whichever `leaveItems` array is loaded for
the active member desk (Mayurika, Suman, Arun, Rajiv, Paraparan all load
through the same `web-view/index.html` page and the same rendering
functions). No per-member copies exist or were created.

## Backend/Database Unchanged

PASS. Confirmed via `git status --short` and `git diff --stat`: only
`web-view/index.html` was modified. No files under `backend/`, `database/`,
`database/migrations/`, or any API route file were touched.

## Static Validation Performed

- JavaScript syntax: all 3 `<script>` blocks in `web-view/index.html` parsed
  successfully with `new Function(...)` (Node.js), before and after the
  edit.
- HTML tag balance: a tag-balance scan was run against both the original
  (`git show HEAD:web-view/index.html`) and edited file. Both report the
  identical 4 false-positive mismatches, caused by `<`/`>` used as JS
  comparison operators and an SVG tag name inside a string literal, not by
  real unclosed HTML. No new imbalance was introduced by this change.
- Confirmed the old wording pattern (`leave_type + ' — ' + status`) is gone
  from the file.
- Confirmed all five approved display labels
  (`Short Leave`, `First-Half Leave`, `Second-Half Leave`, `Full-Day Leave`,
  `Multi-Day Leave`) exist in `LEAVE_TYPE_DISPLAY_LABEL`.
- Confirmed `escapeHtml(lv.status)` still appears in `renderLeaveList` and
  `renderLeaveHistoryList` (history/details status retained).
- Confirmed no `backend/` or `database/` files appear in `git status --short`
  or `git diff --stat`.

## Protected Path

`member-aios/mayurika-hr/staff-data/` was not read, staged, or modified.
Confirmed via `git status --short` before and after the change — it remains
an untracked, unstaged directory outside the scope of this task.

## Overall Result

**PASS.**
