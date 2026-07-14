---
name: schedule-summary-percentage-row-removal-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: schedule-summary-percentage-row-removal
status: PASS — committed, pushed, deployed, and live-verified
---

# Handover Closure — Schedule Summary Percentage Row Removal

**Closure date:** 2026-07-14

## Requirement

Remove the "Count %" and "Time %" display rows from every Schedule Summary card (Daily, Weekly, Monthly) across all five member calendar instances, without changing the backend's percentage calculations or API response fields — the frontend may keep receiving those fields, it simply stops rendering them.

## File Changed

`web-view/index.html` only.

## Validation Path

`validation/schedule-summary-percentage-row-removal-check-2026-07-14.md`

## UI Fields Removed

The `.msc-summary-row` for "Count %" (`scheduled_percentage`/`unscheduled_percentage`) and the `.msc-summary-row` for "Time %" (`scheduled_duration_percentage`/`unscheduled_duration_percentage`, via `formatDurationPercentage`) — both previously the entire second `.msc-summary-group` inside `renderSummaryStats()` — were deleted as one contiguous block, including their wrapping group `<div>`, leaving no empty group and no orphaned divider. Remaining row order: Scheduled, Unscheduled, Total, Duration used, Duration ignored, Scheduled vs. previous, Unscheduled vs. previous — unchanged wording and values throughout.

## Calculations Retained

Confirmed by diff and by read-only inspection of `backend/schemas.py` and `backend/routers/member_schedules.py` (neither file was opened for editing): `scheduled_percentage`, `unscheduled_percentage`, `scheduled_duration_percentage`, and `unscheduled_duration_percentage` remain declared on all three report schemas (`DailyScheduleReportOut`, `WeeklyScheduleReportOut`, `MonthlyScheduleReportOut`) and are still computed on every request by the unmodified `_percentages()`/`_duration_percentages()` helpers. The frontend continues to receive these fields in every report response; `renderSummaryStats()` simply no longer reads or displays them. `formatDurationPercentage()` (the JS formatter that rendered "Time %") was left defined but is now unused — a deliberate, minimal-scope choice, not an oversight (see validation file).

## Deployment Result

Frontend `https://management-aios.vercel.app/` — HTTP 200, confirmed via live fetch to no longer contain "Count %"/"Time %" row markup while "Duration used"/"Duration ignored"/comparison rows remain present. Backend `https://management-aios-api.vercel.app/health` — HTTP 200 (unchanged, no-regression check only).

## Commit Hash

This change (`web-view/index.html` plus this handover file and its validation file) is committed together in a single commit with the exact message `Remove schedule summary percentage rows`. As with the two prior full-width/layout changes this session, the commit's own hash cannot be embedded inside a file that is itself part of that commit's content — run `git log -1 --format=%H -- web-view/index.html` against this repository to retrieve it; it is the single commit immediately following `644ff6c` on `main`.

## Queryability Result

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker Status

No technical blocker. Same documented limitation as the prior three layout/display tasks this session: no real browser was available for pixel-rendered visual confirmation — verified instead via source diff, JS syntax validation, and a post-push live-source fetch.

## Next Step

None required for this removal itself — it is closed. If the backend-computed percentage fields are ever needed in the UI again, they can be re-added to `renderSummaryStats()` directly from the already-present `report.scheduled_percentage`/`report.unscheduled_percentage`/`report.scheduled_duration_percentage`/`report.unscheduled_duration_percentage` fields — no backend or API change would be required, since those fields were never removed from the response.

## PASS / FAIL

**PASS.** "Count %" and "Time %" rows removed from the single shared `renderSummaryStats()` function, applying to Daily/Weekly/Monthly cards across all five member instances; backend calculations and API schema fields fully retained and confirmed unchanged by read-only inspection; all remaining rows preserve exact prior wording and values; responsive grid behavior unaffected; committed, pushed, and deployed with HTTP 200 confirmed on both frontend and backend.
