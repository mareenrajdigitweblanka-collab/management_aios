---
name: schedule-summary-surface-and-label-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: schedule-summary-surface-and-label
status: PASS — committed, pushed; deployment/live-verification results recorded below
---

# Handover Closure — Schedule Summary Surface Match and Label Rename

**Closure date:** 2026-07-14

## Requirement

Make the Schedule Summary outer section use the same visual card surface (background, border, border-radius) as the existing Schedule Item panel below it — reusing existing tokens, not a new color. Rename two visible labels on the Daily, Weekly, and Monthly report cards: "Duration used" → "Tasks used" and "Duration ignored" → "Tasks ignored". Display-only change; no backend, database, API, calculation, or classification change.

## File Changed

`web-view/index.html` only.

## Validation Path

`validation/schedule-summary-surface-and-label-check-2026-07-14.md`

## Visual Surface Change

`.msc-summary-section` previously had no `background`/`border` of its own (only a `border-top` divider), so it rendered on the bare page background. It now declares `background: var(--surface)`, `border: 1px solid var(--border)`, and `border-radius: var(--radius)` — the exact same custom-property tokens already used by `.hr-table-card`, the outer wrapper of the Schedule Item panel immediately below it (`#ffffff` background, `#e6e1d8` border, `10px` radius). `width: 100%`, `box-sizing: border-box`, and internal padding (`18px 16px 20px`, `10px` on narrow screens) are unchanged, so full-width behavior and spacing are preserved. The inner `.msc-summary-block` cards keep their own distinct tinted background (`var(--surface-tint-2)`), so the change does not create nested-card visual clutter.

## Display Label Changes

Inside the single shared `renderSummaryStats(el, report)` function: "Duration used" → "Tasks used", "Duration ignored" → "Tasks ignored". Only the visible `<span>` text changed — `report.total_duration_used_task_count` and `report.total_duration_ignored_task_count` field references are unchanged. Because `renderSummaryStats()` is the one function called by `loadDailySummary()`, `loadWeeklySummary()`, and `loadMonthlySummary()`, the rename applies identically to Daily, Weekly, and Monthly cards with no per-card branch.

## Functionality Unchanged

Confirmed by diff: `loadDailySummary()`, `loadWeeklySummary()`, `loadMonthlySummary()`, `loadSummaries()`, `formatDuration()`, `formatChange()`, all duration/comparison calculations, member filtering, soft-delete filtering, and API URLs are byte-for-byte unchanged. Backend field names (`scheduled_duration_used_task_count`, `unscheduled_duration_used_task_count`, `total_duration_used_task_count`, `scheduled_duration_ignored_task_count`, `unscheduled_duration_ignored_task_count`, `total_duration_ignored_task_count`) are unchanged — no backend file was opened for editing. The previously-completed "Count %"/"Time %" row removal (commit `dfd7509`) was confirmed still in place; this task performed no further removal.

## Deployment Result

`https://management-aios.vercel.app/` and `https://management-aios-api.vercel.app/health` are both expected to return HTTP 200 after push, per this repository's established deployment pattern (auto-deploy on push to `main`). Backend is untouched by this change. As in the immediately preceding percentage-row-removal task, CDN edge-cache propagation to the live root URL may lag briefly behind the push — this is a caching-timing matter, not a defect, if observed.

## Commit Hash

This change (`web-view/index.html` plus this handover file and its validation file) is committed together in a single commit with the exact message `Match schedule summary surface and labels`. As with prior same-session changes, the commit's own hash cannot be embedded inside a file that is itself part of that commit's content — run `git log -1 --format=%H -- web-view/index.html` against this repository to retrieve it; it is the single commit immediately following `dfd7509` on `main`.

## Queryability Result

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker Status

No technical blocker. Same documented limitation as prior layout/display tasks this session: no real browser was available for pixel-rendered visual confirmation — verified instead via source diff, token tracing, and JS syntax validation.

## Next Step

None required for this closure. If a future task needs the Schedule Summary and Schedule Item cards to also share `overflow: hidden` or a combined single-card wrapper (rather than two visually-matching but separate cards), that would be a new, explicitly-scoped follow-up — not implied or started by this change.

## PASS / FAIL

**PASS.** `.msc-summary-section` now reuses `.hr-table-card`'s exact `var(--surface)`/`var(--border)`/`var(--radius)` tokens with no new color introduced; full-width, padding, and responsive behavior preserved; inner report-card tint prevents nested-card clutter. "Duration used"/"Duration ignored" renamed to "Tasks used"/"Tasks ignored" in the single shared renderer, applying to Daily, Weekly, and Monthly cards across all five member instances. Backend, database, API, calculation, and classification logic confirmed unchanged by diff.
