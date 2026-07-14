---
name: schedule-summary-percentage-row-removal-check
type: validation
created: 2026-07-14
status: PASS — surgical removal verified via source diff, JS syntax and CSS brace balance both pass, and GitHub-source confirmation; live root-URL CDN propagation was still converging as of this file's writing (see "Deployment Confirmation")
source-boundary: web-view/index.html only. backend/, database/, database/migrations/, API schemas, report calculations, classification logic, existing records, historical evidence files — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Schedule Summary — Percentage Row Removal — Check — 2026-07-14

**Requirement:** Remove the "Count %" and "Time %" rows from every Schedule Summary card (Daily, Weekly, Monthly), on all five member instances, without touching the backend's percentage calculations or API fields. The frontend may keep receiving `scheduled_percentage`/`unscheduled_percentage`/`scheduled_duration_percentage`/`unscheduled_duration_percentage` in the report response — it simply no longer displays them.

## Problem / Change Description (no screenshot available)

No screenshot tool is available in this execution environment (consistent with the "no real browser" limitation documented in the three prior layout tasks this session). The requirement itself is unambiguous and verifiable directly from source: two specific rendered rows (labeled exactly "Count %" and "Time %") needed to be removed from `renderSummaryStats()`'s output, and confirmed absent from the deployed page's HTML/JS source after the change — which this validation does via direct source and live-fetch inspection rather than a rendered screenshot.

## Fields Removed (display only)

Two `.msc-summary-row` elements, previously the entire second `.msc-summary-group` in `renderSummaryStats()` (`web-view/index.html`):

```html
<div class="msc-summary-row"><span>Count %</span><strong>{scheduled_percentage}% / {unscheduled_percentage}%</strong></div>
<div class="msc-summary-row"><span>Time %</span><strong>{formatDurationPercentage(scheduled_duration_percentage)} / {formatDurationPercentage(unscheduled_duration_percentage)}</strong></div>
```

Both rows, and the `.msc-summary-group` wrapper that held only these two rows, were deleted in full — not hidden via CSS (`display:none`), not commented out. Confirmed by diff: the entire group (2 rows + its opening/closing `<div class="msc-summary-group">` tags) was removed as one contiguous block, with no leftover empty `<div class="msc-summary-group"></div>`.

## Remaining Fields (unchanged wording and values)

`renderSummaryStats()` now renders exactly three `.msc-summary-group` sections, in this order:

1. **Counts group:** Scheduled (`scheduled_count` + `formatDuration(scheduled_duration_minutes)`), Unscheduled, Total
2. **Coverage group:** Duration used (`total_duration_used_task_count`), Duration ignored (`total_duration_ignored_task_count`)
3. **Comparison group:** Scheduled vs. previous (`formatChange(scheduled_duration_change)`), Unscheduled vs. previous (`formatChange(unscheduled_duration_change)`)

Every remaining label string, field reference, and formatter call (`formatDuration`, `formatChange`) is byte-for-byte identical to before this change — confirmed by diff, which shows only the percentage group's lines removed and zero modification to any surviving line.

## Shared Renderer Confirmation

`renderSummaryStats(el, report)` is called by `loadDailySummary()`, `loadWeeklySummary()`, and `loadMonthlySummary()` — the same three call sites as before this change (confirmed unchanged: no lines inside any of those three loader functions appear in the diff). Because all three report types funnel through this one function, and because the whole `mountScheduleCalendarInstance(container)` factory is instantiated once per member (unchanged pattern), removing the two rows from this single function removes them from Daily, Weekly, and Monthly cards on all five member tabs (`mayurika`, `suman`, `arun`, `rajiv`, `paraparan`) simultaneously — no per-member branch was created or needed.

## Grouping and Spacing

The `.msc-summary-group + .msc-summary-group` CSS rule (adjacent-sibling divider — border-top plus margin/padding, added in the prior responsive-layout task) is a generic selector, not tied to specific group content. With the percentage group removed, the divider now applies between the (now-adjacent) counts group and the coverage group exactly as it previously applied between any two neighboring groups — no CSS change was needed to avoid a doubled or missing divider, and no orphaned "empty group" divider remains, confirmed by the diff showing the entire group (including its own opening/closing tags) removed as a unit rather than leaving an empty shell behind.

## Data Loaders Preserved

Confirmed by diff: `loadDailySummary()`, `loadWeeklySummary()`, `loadMonthlySummary()`, `loadSummaries()`, the report API URLs, `formatDuration()`, and `formatChange()` are **byte-for-byte unchanged**. No replacement calculation was added in JavaScript — the removal is purely a rendering omission; `report.scheduled_percentage`, `report.unscheduled_percentage`, `report.scheduled_duration_percentage`, and `report.unscheduled_duration_percentage` are still present on every `report` object returned by the (unmodified) backend, simply no longer read or referenced by `renderSummaryStats()`.

## `formatDurationPercentage()` — Left In Place, Now Unused

`formatDurationPercentage(value)` (declared at module scope, `web-view/index.html`) has no remaining call site after this change (confirmed by a full-file search — its only prior use was the removed "Time %" row). It was **deliberately left defined** rather than deleted: the approved instruction was to remove "only the two display rows," and removing an unrelated function definition would be a small scope expansion beyond that. This is dead code with zero functional impact (an unused function declaration), not a defect.

## Backend / API Unchanged

Confirmed by `git status --short` / `git diff --stat` for this change: only `web-view/index.html` is modified. A read-only grep of `backend/schemas.py` confirms `scheduled_percentage`/`unscheduled_percentage` (whole-number, count-based) and `scheduled_duration_percentage`/`unscheduled_duration_percentage` (two-decimal, duration-based, nullable) are still declared on `DailyScheduleReportOut`, `WeeklyScheduleReportOut`, and `MonthlyScheduleReportOut`. A read-only grep of `backend/routers/member_schedules.py` confirms `_percentages()` and `_duration_percentages()` are unchanged and still compute these values on every report request. No backend file was opened for editing at any point in this task — these were read-only confirmations, per instruction ("Do not edit backend files merely to confirm this").

## Responsive Result

No layout-affecting CSS was changed in this task (the `.msc-summary-grid`/`.msc-summary-section`/`.msc-summary-row`/`.msc-summary-group` rules from the prior two layout tasks are untouched). Removing two rows only shortens each card's content — it does not affect the grid's column-count logic (`grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`, unchanged), so the existing 3-column desktop / 2-column medium / 1-column narrow behavior is unaffected by this change. Cards remain shorter (less vertical content) but otherwise structurally identical.

## Static Search Confirmation

- `grep -n "Count %\|Time %" web-view/index.html` — the only remaining match is inside this change's own explanatory code comment (documenting *why* these fields were removed from display), not inside the `el.innerHTML` template that produces rendered output. Zero occurrences remain in any `<div class="msc-summary-row">` markup.
- `node --check` against all three extracted `<script>` blocks: **passed, zero syntax errors.**
- `<style>` block brace balance: **461 open / 461 close** (equal — unchanged from before this task, since no CSS was touched).

## All Five Members

The change lives inside the single shared `mountScheduleCalendarInstance(container)` factory (unchanged call pattern, one instantiation per member), so it applies identically to `mayurika`, `suman`, `arun`, `rajiv`, and `paraparan` with no per-member markup, CSS, or branch.

## Deployment Confirmation

Performed after this commit was pushed to `origin/main` (see the accompanying handover file for the exact hash). Unlike the three prior layout tasks this session, propagation was **not instantaneous** this time — documented honestly below rather than assumed:

- `git log origin/main --oneline` confirms the commit is present on the remote immediately after push.
- `https://raw.githubusercontent.com/.../main/web-view/index.html` (bypassing Vercel entirely) was fetched and confirmed the correct source — zero rendered `Count %`/`Time %` rows — proving the pushed code itself is correct.
- The first several fetches of `https://management-aios.vercel.app/` (both the bare URL and cache-busted query-string variants) returned HTTP 200 but **still served the previous deployment's HTML** (`X-Vercel-Cache: HIT`, with `Age` climbing past 1400 seconds without resetting — i.e. the CDN edge was serving a cached response rather than revalidating against the new deployment, despite `Cache-Control: public, max-age=0, must-revalidate`).
- One cache-busted request (`?v2=...`) did return the corrected content (`old-row-count=0`) partway through polling, confirming at least one edge node had picked up the new deployment — but the plain root URL (`/`, no query string) was still returning stale content after roughly 6 minutes of polling at the time this file was finalized.
- Backend `https://management-aios-api.vercel.app/health` — HTTP 200 throughout (unchanged; this change never touches the backend).

**This is treated as a CDN/edge-cache propagation delay, not a deployment failure or a code defect** — the commit is correctly on `origin/main`, the source is correct (confirmed via GitHub directly), and at least one edge already serves the correct page. No tool available in this session can force-purge Vercel's edge cache (no Vercel dashboard/API access was configured for this session). The correct page is expected to become universally available once Vercel's CDN cache naturally expires/revalidates; no code change is needed or was made in response to this.

## Known Limits

- As in the prior three layout/display tasks this session, no real browser was available for pixel-rendered visual confirmation (e.g. a screenshot showing the shortened card). This validation relies on direct source-diff inspection, JS syntax validation, GitHub-source confirmation, and live-fetch polling.
- **Live root-URL propagation was not confirmed as fully converged at the time this file was written** — see "Deployment Confirmation" above for the exact evidence and reasoning. This is flagged explicitly rather than silently assumed, consistent with this repository's source-discipline requirements (CLAUDE.md §2): a claim without direct confirming evidence is not treated as operational truth.

## PASS / FAIL

**PASS.** The "Count %" and "Time %" rows, and the now-empty group wrapper that held only them, were removed as a single contiguous block from the one shared `renderSummaryStats()` function — applying to Daily, Weekly, and Monthly cards across all five member instances. No backend file, API schema, report calculation, or classification logic was touched (confirmed both by diff and by direct read-only inspection of the backend source). All remaining rows keep their exact prior wording, field references, and formatting. Responsive column behavior is unaffected. The code change itself is fully verified correct (diff, syntax, and direct GitHub-source confirmation); live CDN propagation to the root URL was still catching up at the time of writing — see "Deployment Confirmation" for the exact, honestly-documented evidence rather than an assumed result.
