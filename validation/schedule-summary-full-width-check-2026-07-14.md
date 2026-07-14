---
name: schedule-summary-full-width-check
type: validation
created: 2026-07-14
status: PASS — nesting verified via a stack-based balance trace, real computed widths confirm 3/2/1 column behavior, JS syntax and CSS brace balance both pass; live deployment confirmation appended after push
source-boundary: web-view/index.html only. backend/, database/, database/migrations/, report calculations, API schemas, classification logic, existing event data, historical evidence files — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
---

# Schedule Summary — Full-Width Expansion — Check — 2026-07-14

**Requirement:** The Schedule Summary (moved below the calendar in the prior responsive-layout change) is still constrained to `.msc-calendar-content`'s width, which begins after the 220px sidebar column — so it does not use the full calendar-shell width. Move it so it starts near the shell's left edge and ends near the shell's right edge, with a small, clean horizontal padding, while remaining below the calendar and preserving the Daily/Weekly/Monthly cards and their responsive 3/2/1-column behavior.

## Problem Description (pre-change)

After the prior change, `.msc-summary-section` was a child of `.msc-calendar-content`, which is itself a `flex: 1` sibling of `.msc-sidebar` (`flex: 0 0 220px`) inside `.msc-calendar-main`. That correctly gave the summary the calendar content's own width (an improvement over the old sidebar placement), but `.msc-calendar-content`'s width is still `shell width − 220px sidebar − 16px gap`, so the summary visually began indented by ~236px from the shell's left edge and never used the leftmost fifth of the available space — leaving unused space on the left while the summary itself stayed comparatively narrow.

## Old Nesting

```
.msc-calendar-shell
  .hr-table-card
    .msc-calendar-header
    .msc-calendar-main
      .msc-sidebar
      .msc-calendar-content
        .msc-cal-grid-wrap
        .msc-summary-section        ← was here (inside .msc-calendar-content)
    .msc-form-card
    .msc-list-card × 2
    ...
```

(`.hr-table-card` was found, via a stack-based nesting trace of the live template, to wrap *everything* from `.msc-calendar-header` through the view modal in one continuous card — not just the calendar row. This was confirmed by direct inspection before making any change, per Step 2's instruction to identify the exact closing tags required.)

## New Nesting

```
.msc-calendar-shell
  .hr-table-card                     ← card #1: calendar only
    .msc-calendar-header
    .msc-calendar-main
      .msc-sidebar
      .msc-calendar-content
        .msc-cal-grid-wrap
  .msc-summary-section                ← now a direct child of .msc-calendar-shell
  .hr-table-card                     ← card #2: Schedule Item form + lists + footer + modal
    .msc-form-card
    .msc-list-card × 2
    ...
```

`.hr-table-card` was split into two separate instances of the exact same class (identical CSS applies to both — no new class, no new styling rule for the card boundary itself): the first wraps only the calendar header/main (unchanged from before), and the second wraps the Schedule Item form, list cards, footer, and view modal (unchanged content, just now a sibling of the summary section instead of its container). `.msc-summary-section` sits between them, as a genuine direct child of `.msc-calendar-shell`.

**Why splitting `.hr-table-card` was safe:** `.msc-form-card` and `.msc-list-card` already have their own independent `background`/`border`/`border-radius`/`padding`/`margin-top` (confirmed by reading their CSS rule directly: `.msc-form-card, .msc-list-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; margin-top: 16px; }`), so they do not rely on `.hr-table-card` for their own visual box — being inside one `.hr-table-card` or a second, separate one produces the same rendered appearance for those elements. `.hr-table-card` itself is never referenced by any JS `querySelector` call (confirmed by a repo-wide search) — it is a purely visual wrapper, so splitting it into two instances carries zero functional risk.

**Nesting balance verification:** a stack-based parser (not a simple open/close count, which is misleading here because the whole `container.innerHTML` fragment relies on the browser's end-of-fragment auto-close for its outermost `.msc-calendar-shell` div — a pre-existing characteristic confirmed unchanged by this edit) traced every `<div ...>`/`</div>` token from the start of the template through the end of the assignment. Result: `.msc-summary-section` opens at depth 2 (immediately after `.hr-table-card` #1 closes, dropping to depth 1 = `.msc-calendar-shell` only) and closes back to depth 1 before `.hr-table-card` #2 opens at depth 2 again — confirming `.msc-summary-section` is a true sibling of both `.hr-table-card` instances, not nested inside either.

## Full-Width Behavior

`.msc-calendar-shell` is `display: flex; flex-direction: column` with no `align-items` override — the default `align-items: stretch` means every direct flex-item child (the banner, the notes, both `.hr-table-card` instances, and now `.msc-summary-section`) stretches to the shell's full cross-axis (horizontal) width automatically. Since `.msc-summary-section` is no longer nested inside `.msc-calendar-content` (which was narrowed by the sidebar), it now receives the shell's full width directly.

## Padding Values

```css
.msc-summary-section {
  width: 100%;
  box-sizing: border-box;
  padding: 18px 16px 20px;   /* top 18px, left/right 16px, bottom 20px */
  margin-top: 16px;
  border-top: 1px solid var(--border);
}
@media (max-width: 480px) {
  .msc-summary-section { padding-left: 10px; padding-right: 10px; }
}
```

`box-sizing: border-box` is required: without it, `width: 100%` plus 16px of horizontal padding would add 32px on top of the shell's width and overflow it. With `border-box`, the 16px padding is carved out of the declared 100% width instead, so the section's outer edge still aligns exactly with the shell's edge while its inner content sits 16px in from each side — satisfying "start near the left edge... end near the right edge... keep a little left and right padding" simultaneously. At ≤480px viewport width the horizontal padding narrows to 10px (matching the task's own suggested value), keeping a still-visible but more compact inset on the narrowest supported windows.

No `margin-left` matching the sidebar width was added, no fixed `width` was set (only `100%`), no `max-width` was introduced, and no `transform` or absolute positioning was used — confirmed by direct reading of the added CSS rule (nothing beyond `width`, `box-sizing`, `min-width`, `padding`, `margin-top`, `border-top` — all additive/adjustment properties, no positioning properties at all).

## Desktop Result (computed)

Using this file's own confirmed CSS values (established in the prior task's evidence and re-verified unchanged here): `.tab-panel` max content width `1240 − 64 (padding) = 1176px`. `.msc-calendar-shell` and its children (including `.msc-summary-section`) inherit this width via `align-items: stretch`, unconstrained by the sidebar for the first time. `.msc-summary-section`'s content width (inside its own 16px×2 padding, `box-sizing: border-box`) = `1176 − 32 = 1144px`.

`.msc-summary-grid`'s rule is unchanged from the prior task: `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;`. At 1144px, the maximum column-track count `auto-fit` would allocate is `floor((1144 + 12) / (240 + 12)) = floor(1156 / 252) = 4` — but there are only 3 `.msc-summary-block` items in the grid, and CSS Grid's `auto-fit` (unlike `auto-fill`) collapses any track with no content to zero width, redistributing that space to the tracks that do have content. Result: **exactly 3 columns**, each rendering at roughly `(1144 − 2×12) / 3 ≈ 373px` — noticeably wider than the previous ~940px-container result (~300px/card), matching the requirement that "the wider parent should allow the three cards to use the newly available space evenly."

## Medium Result

At a narrower browser window (e.g. ~700px of shell width): `floor((700 + 12) / 252) = 2` — two columns, same unmodified `auto-fit` rule, no separate breakpoint needed (identical reasoning to the prior task, now operating against the wider shell-level container instead of the narrower content-level one). No horizontal overflow: `box-sizing: border-box` and `min-width: 0` on the section and its children (unchanged from the prior task) still apply.

## Narrow Result

Below the pre-existing `640px` breakpoint (unmodified — the sidebar-stacking and `.msc-calendar-content` `align-self: stretch` hardening from the prior task are untouched and no longer even relevant to the summary section specifically, since it's not inside `.msc-calendar-content` anymore). Below `480px`, `.msc-summary-grid` still forces a single `1fr` column (unchanged rule from the prior task) and `.msc-summary-section`'s own horizontal padding narrows to 10px (new in this change, per Step 8's suggested rule) rather than being removed entirely — "do not use zero padding" is honored at every width. Below `420px`, `.msc-summary-row` still stacks label above value (unchanged rule). No horizontal page scroll is introduced: every width-affecting rule on this element uses `100%`/`1fr`/`auto-fit`, never a fixed pixel width larger than its container.

## Report Logic Unchanged

Confirmed by diff: `loadDailySummary()`, `loadWeeklySummary()`, `loadMonthlySummary()`, `loadSummaries()`, `renderSummaryStats()`, `formatDuration()`, `formatDurationPercentage()`, and `formatChange()` are **byte-for-byte unchanged** — the diff touches only the `.msc-summary-section` CSS rule (plus one new media query) and the markup region moving `.msc-summary-section`'s opening tag and adjusting the surrounding `.hr-table-card`/`.msc-calendar-*` closing tags. `dailySummaryEl`, `weeklySummaryEl`, `monthlySummaryEl`, `dailySummaryTitleEl`, `weeklySummaryTitleEl`, and `monthlySummaryTitleEl` are all declared via `container.querySelector('.msc-summary-daily')` etc. (container-scoped, not ancestor-path-dependent) — confirmed unchanged at their declaration site, and confirmed no JS anywhere references `.msc-calendar-content` directly (repo-wide search returned zero matches), so moving the summary's parent required zero JavaScript changes of any kind.

## All Five Members

The moved markup and updated CSS live inside the single shared `mountScheduleCalendarInstance(container)` factory function (unchanged call pattern, still one instantiation per member), so the change applies identically to `mayurika`, `suman`, `arun`, `rajiv`, and `paraparan` without any per-member markup or CSS. No new global `id` was introduced (confirmed — the diff adds zero `id="..."` attributes). Rajiv's existing "does not confirm Admin Manager approval..." note (`.msc-rajiv-note`) is rendered before `.hr-table-card` #1 opens, entirely outside the region touched by this change, and remains unedited.

## Structural Validation

- Exactly one `.msc-summary-section` per calendar instance (unchanged count from the prior task — still a single occurrence in the template).
- Exactly three `.msc-summary-block` cards inside it (unchanged).
- `.msc-summary-section` is a direct child of `.msc-calendar-shell` (confirmed via the stack-based depth trace above) — outside `.msc-calendar-main`, `.msc-sidebar`, `.msc-calendar-content`, and every `.msc-view-pane`.
- HTML div nesting confirmed balanced via a full stack-based trace of the entire template region (not just a raw open/close count, which is misleading for this file due to the pre-existing implicit-close pattern on the outermost `.msc-calendar-shell` — the same characteristic exists identically before and after this change, so this change introduces no new imbalance).
- `node --check` against all three extracted `<script>` blocks: **passed, zero syntax errors.**
- `<style>` block brace balance: **461 open / 461 close** (equal).
- No new global `id` attribute added.
- No duplicated summary markup — `.msc-summary-daily`/`.msc-summary-weekly`/`.msc-summary-monthly` and their title elements each still appear exactly once per instance.

## Known Limits

- As in the prior two layout changes this session, no real browser was available in this execution environment for pixel-measured, rendered-viewport verification. This validation relies on the same evidence categories used successfully in the prior task: exact nesting confirmation via a stack-based source trace, real computed-width arithmetic using this file's own CSS values (not estimated numbers), JS syntax validation, and CSS brace-balance confirmation. Live deployment confirmation (below) additionally confirms the deployed page's raw HTML/CSS source matches what was verified locally, since this is a build-free static file served verbatim by Vercel (confirmed in the prior two tasks this session).
- Deployment/live-URL confirmation for this specific commit is appended below, performed immediately after push (see the accompanying handover file for the exact commit hash).

## Deployment Confirmation

Performed immediately after this commit was pushed to `origin/main` (see the accompanying handover file for the exact hash):

- Frontend `https://management-aios.vercel.app/` — HTTP 200; response body fetched and confirmed the `.msc-summary-section` markup fragment sits directly between the two `.hr-table-card` occurrences (i.e., `</div></div></div></div><div class="msc-summary-section">...</div><div class="hr-table-card"><div class="msc-form-card">`), matching the intended structure exactly.
- Backend `https://management-aios-api.vercel.app/health` — HTTP 200 (unchanged; included only to confirm no unrelated regression, since this change never touches the backend).

## PASS / FAIL

**PASS.** `.msc-summary-section` was moved from inside `.msc-calendar-content` to a genuine direct child of `.msc-calendar-shell`, achieved by splitting the pre-existing `.hr-table-card` wrapper (confirmed via source trace to previously wrap the entire calendar-through-modal region) into two visually-identical instances with the summary section between them — a change confirmed safe because `.msc-form-card`/`.msc-list-card` already carry their own complete visual styling and `.hr-table-card` is never referenced by JavaScript. The section now spans the shell's full width (verified via real computed widths: ~1144px content width at desktop, up from ~908px previously) with `box-sizing: border-box` and 16px (10px on narrow screens) horizontal padding, retaining the 3/2/1-column responsive grid behavior through the same unmodified `auto-fit` rule. All report-loading, formatting, and calendar-rendering logic is confirmed byte-for-byte unchanged. All five member instances share this one implementation. Live deployment confirmation is recorded above.
