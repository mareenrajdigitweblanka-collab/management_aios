---
name: leave-calendar-label-wording-closure
type: handover-closure
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: leave-calendar-label-wording-cleanup
status: PASS
---

# Handover Closure — Leave Calendar Label Wording Cleanup

**Closure date:** 2026-07-16

## Requirement

Remove workflow-status wording (`Pending` / `Approved` / `Rejected` /
`Cancelled`) from leave items displayed in normal calendar views (Month,
Week, Day, Multi-Day). Replace `"Full-Day — Approved"`-style labels with
type-only wording (`"Full-Day Leave"`). Display-only — backend records,
database columns, API responses, leave history, leave details, and
status-action controls must keep the full status workflow intact. Rejected
and Cancelled leave must remain hidden from normal calendar views; Pending
and Approved leave remain visible without status text in the chip/block.

## Implementation File

`web-view/index.html` — the only file modified. Added a shared display
formatter (`LEAVE_TYPE_DISPLAY_LABEL` map, `formatLeaveCalendarLabel(lv)`,
`leaveCalendarAccessibleLabel(lv)`) immediately after the existing
`LEAVE_STATUS_CLASS` map, and updated the three normal-calendar rendering
call sites (Month view chip, Week/Day all-day banner, Week/Day timed leave
block) to use it. No other file was touched.

## Validation Path

`validation/leave-calendar-label-wording-check-2026-07-16.md`

## Approved Display Labels

- Short Leave
- First-Half Leave
- Second-Half Leave
- Full-Day Leave
- Multi-Day Leave

## Unchanged Status Workflow

- Stored `leave_type` and `status` values are unmodified — the formatter is
  purely a read-only display mapping.
- `LEAVE_STATUS_CLASS`-driven chip/block coloring (Pending vs. Approved)
  is unchanged.
- `renderLeaveList` (leave-for-date panel with Approve/Reject/Cancel
  controls) and `renderLeaveHistoryList` (Show History panel) still render
  `lv.status` explicitly — neither function was edited.
- Server-side filtering that keeps Rejected/Cancelled out of `leaveItems`
  (normal view) is unchanged — no backend, API, or conflict/reporting logic
  was touched.
- Accessibility: the visible chip/block text is type-only, but the `title`
  attribute on each leave chip/block now reads `"<type label>, status
  <status>"` via `leaveCalendarAccessibleLabel(lv)`, so status remains
  available non-visually.

## Files Changed

| File | Action |
|---|---|
| `web-view/index.html` | Modified — added shared formatter, updated 3 rendering call sites |
| `validation/leave-calendar-label-wording-check-2026-07-16.md` | CREATED |
| `handover/2026-07-16__leave-calendar-label-wording-closure.md` | CREATED (this file) |

## Commit Hash

Recorded in `git log` as the commit with message `Simplify leave labels in
calendar views` that introduces these three files together. See the final
report delivered alongside this closure for the exact short hash captured
at commit time (not embedded here to avoid a self-referential value inside
the file whose own content determines that hash).

## Push Result

See final report for push confirmation (fast-forward to `origin/main`, no
force-push).

## Deployment Result

See final report for the post-deploy live check against
`https://management-aios.vercel.app/`.

## Queryability Result

PASS — this closure file and its paired validation file are both Markdown,
plain-English, and LLM-queryable per §11.1/§11.4 of `CLAUDE.md`. Both
reference the exact requirement, old/new wording, shared formatter name,
and per-view results so a future query can answer "why do leave chips say
type-only text now" without re-reading the diff.

## PASS / FAIL

PASS.

## One Next Step

Ask Mayurika (HR domain owner, per §18 Reviewer Routing Rule) to confirm the
five approved display labels and the accessible `title` wording
(`"<type>, status <status>"`) meet her operational expectations for the live
Mayurika/Suman/Arun/Rajiv/Paraparan calendar desks before this is treated as
final closed UI copy.
