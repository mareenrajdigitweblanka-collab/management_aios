---
name: schedule-summary-surface-and-label-check
type: validation
created: 2026-07-14
status: PASS — surface match and label rename verified via source diff and JS syntax check; live deployment fetch pending confirmation (see "Deployment Confirmation")
source-boundary: web-view/index.html only. backend/, database/, database/migrations/, API schemas, report calculations, classification logic, existing records, historical evidence files, member-aios/mayurika-hr/staff-data/ — all untouched.
root-truth: CLAUDE.md — canonical
---

# Schedule Summary — Surface Match and Label Rename — Check — 2026-07-14

**Requirement:** Make the Schedule Summary outer section (`.msc-summary-section`) use the same visual card surface (background, border, border-radius) as the existing Schedule Item panel below it, without inventing a new color. Also rename two visible labels — "Duration used" → "Tasks used" and "Duration ignored" → "Tasks ignored" — across the Daily, Weekly, and Monthly report cards, without changing backend field names or any calculation.

## Problem / Screenshot

No screenshot tool is available in this execution environment (same documented limitation as the prior three layout/display tasks in this session). The visual difference is unambiguous and verifiable directly from source: before this change, `.msc-summary-section` had no `background`/`border` declarations of its own (only a `border-top: 1px solid var(--border)` divider), so it rendered directly on the page background — visually distinct from the bordered white card used by the Schedule Item panel immediately below it.

## Existing Schedule Item Surface Rule / Token Reused

The Schedule Item panel is rendered as `<div class="hr-table-card"><div class="msc-form-card">...</div></div>` (`web-view/index.html`, around the `mountScheduleCalendarInstance` markup). Its outer card surface comes from `.hr-table-card`:

```css
.hr-table-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 18px;
  overflow: hidden;
}
```

Token values (declared once, no dark-theme override exists in this file):

- `--surface: #ffffff`
- `--border: #e6e1d8`
- `--radius: 10px`

No new color was invented — `.msc-summary-section` now reuses these exact three custom-property references (`var(--surface)`, `var(--border)`, `var(--radius)`), not hardcoded hex values, so it will automatically stay in sync with `.hr-table-card` if either is ever retuned centrally.

## Change Applied

`.msc-summary-section` (`web-view/index.html`):

**Before:**
```css
.msc-summary-section {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  padding: 18px 16px 20px;
  margin-top: 16px;
  border-top: 1px solid var(--border);
}
```

**After:**
```css
.msc-summary-section {
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 16px 20px;
  margin-top: 16px;
}
```

The single `border-top` divider was replaced with a full `border` (matching `.hr-table-card`'s all-side border) plus `background`/`border-radius` additions. `width: 100%`, `box-sizing: border-box`, `min-width: 0`, `padding: 18px 16px 20px`, and `margin-top: 16px` are all unchanged — full-width behavior, internal padding, and outside spacing from the calendar card above are preserved exactly as before.

## Background Result

`.msc-summary-section` now renders with `background: var(--surface)` (`#ffffff`) — the identical surface color used by `.hr-table-card` (the Schedule Item panel's outer wrapper). The overall page background (outside both cards) is unchanged.

## Border / Radius Result

`border: 1px solid var(--border)` and `border-radius: var(--radius)` are the same token references used by `.hr-table-card`, so the Schedule Summary card's border color/width and corner rounding are visually identical to the Schedule Item panel's.

## Padding Result

Internal padding remains `18px 16px 20px` (unchanged from before this task) — modest, balanced padding retained on all sides; the `@media (max-width: 480px)` rule reducing left/right padding to `10px` is also unchanged.

## Full-Width Result

`.msc-summary-section` remains a direct child of `.msc-calendar-shell` (unchanged DOM position — confirmed by diff showing zero markup/structure changes, only CSS declarations). `width: 100%` and `box-sizing: border-box` are unchanged, so it continues to span the shell's full width without overflow, exactly as established in the prior full-width task (`644ff6c`).

## Nested-Card Clutter Check

`.msc-summary-block` (the individual Daily/Weekly/Monthly cards inside `.msc-summary-grid`) uses `background: var(--surface-tint-2)` (`#faf8f4`) — a distinct, slightly-tinted shade from `.msc-summary-section`'s new `var(--surface)` (`#ffffff`) background. This means the three inner report cards remain visually distinguishable as nested blocks against the new outer card surface rather than blending into one flat undifferentiated area — confirmed by reading both rules; `.msc-summary-block` was not modified in this task.

## Display Label Changes

`renderSummaryStats(el, report)` (`web-view/index.html`) — the single shared renderer called by `loadDailySummary()`, `loadWeeklySummary()`, and `loadMonthlySummary()`:

**Before:**
```html
<div class="msc-summary-row"><span>Duration used</span><strong>{total_duration_used_task_count}</strong></div>
<div class="msc-summary-row"><span>Duration ignored</span><strong>{total_duration_ignored_task_count}</strong></div>
```

**After:**
```html
<div class="msc-summary-row"><span>Tasks used</span><strong>{total_duration_used_task_count}</strong></div>
<div class="msc-summary-row"><span>Tasks ignored</span><strong>{total_duration_ignored_task_count}</strong></div>
```

Only the visible `<span>` text changed. The field references (`report.total_duration_used_task_count`, `report.total_duration_ignored_task_count`) are byte-for-byte unchanged.

## Backend Field Names Unchanged

Confirmed by diff (only `web-view/index.html` changed) and by the fact that no backend file was opened for editing in this task: `scheduled_duration_used_task_count`, `unscheduled_duration_used_task_count`, `total_duration_used_task_count`, `scheduled_duration_ignored_task_count`, `unscheduled_duration_ignored_task_count`, and `total_duration_ignored_task_count` remain exactly as returned by the (untouched) backend report endpoints. The frontend continues reading the same fields under the same names — only the human-facing label text changed.

## Daily / Weekly / Monthly Card Result

`renderSummaryStats()` is the one function invoked by all three loaders (`loadDailySummary`, `loadWeeklySummary`, `loadMonthlySummary`) — confirmed unchanged call sites by diff. Because the label change lives inside this single shared function, "Tasks used" / "Tasks ignored" appear identically on the Daily card, the Weekly card, and the Monthly card with no per-card branch or duplication.

## Percentage-Row Current Status

Inspected per instruction (Step 8). The "Count %" and "Time %" rows were already removed from display in the immediately preceding commit (`dfd7509`, "Remove schedule summary percentage rows"), confirmed prior to this task by `git log --oneline -8` and by `grep -n "Count %\|Time %" web-view/index.html` returning only a match inside an explanatory code comment (not inside any rendered `.msc-summary-row`). This task did not need to perform, and did not perform, any additional removal of those rows — they were already absent from the repository at the start of this task. No backend percentage field was altered.

## Static Search Confirmation

- `grep -n "Duration used\|Duration ignored" web-view/index.html` — zero matches after this change (confirmed no leftover references anywhere in the file).
- `grep -n "Tasks used\|Tasks ignored" web-view/index.html` — exactly one match each, both inside the single `renderSummaryStats()` template.
- `node -e "new Function(scriptBody)"` against all 3 extracted `<script>` blocks — passed, zero syntax errors.
- `git diff --stat -- web-view/index.html` — 1 file changed, 12 insertions(+), 5 deletions(-); confirmed the diff touches only the `.msc-summary-section` CSS rule (plus its explanatory comment) and the two label strings inside `renderSummaryStats()` — no other lines modified.

## All Five Members

The surface change is a single CSS rule (`.msc-summary-section`) and the label change lives inside the one shared `renderSummaryStats()` function, both used by the single `mountScheduleCalendarInstance(container)` factory that is instantiated once per member instance (`mayurika`, `suman`, `arun`, `rajiv`, `paraparan`) — confirmed by reading the factory's structure; no per-member CSS or markup copy exists or was created.

## Responsive Result

No grid/column-count logic was touched (`.msc-summary-grid`'s `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` and its `max-width: 480px` one-column fallback are unchanged). The outer surface change is purely a background/border/radius addition on an existing full-width, `box-sizing: border-box` container, so:

- **Wide desktop:** three `.msc-summary-block` cards remain side by side inside the now-bordered/backgrounded outer surface, visually aligned with the Schedule Item panel below.
- **Medium width:** cards reflow per the existing `auto-fit`/`minmax(240px, 1fr)` grid behavior (unchanged); outer padding remains the same `18px 16px 20px`.
- **Narrow width (≤480px):** one card per row (existing `max-width: 480px` grid override, unchanged); outer surface padding reduces to `10px` left/right (existing rule, unchanged) with no horizontal overflow, since `box-sizing: border-box` + `width: 100%` are both preserved.

## Known Limits

- As in prior layout/display tasks this session, no real browser was available for pixel-rendered visual confirmation. This validation relies on direct source-diff inspection, token/value tracing, and JS syntax validation rather than a rendered screenshot.
- Live deployment propagation timing (Vercel CDN edge cache) is confirmed separately in the accompanying handover file at the time of writing; any residual propagation delay is a CDN-timing matter, not a code defect, consistent with the prior percentage-row-removal task's documented experience.

## PASS / FAIL

**PASS.** `.msc-summary-section` now reuses the exact `var(--surface)` / `var(--border)` / `var(--radius)` tokens already used by `.hr-table-card` (the Schedule Item panel's outer wrapper) — no new color invented, full-width and padding behavior preserved, no nested-card clutter (inner `.msc-summary-block` cards keep their distinct tinted background). "Duration used"/"Duration ignored" were renamed to "Tasks used"/"Tasks ignored" in the single shared `renderSummaryStats()` renderer, applying identically to Daily, Weekly, and Monthly cards across all five member instances. Backend field names, report calculations, classification logic, and all JavaScript loader/formatter functions are confirmed unchanged by diff.
