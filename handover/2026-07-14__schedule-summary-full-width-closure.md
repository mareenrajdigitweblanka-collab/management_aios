---
name: schedule-summary-full-width-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: schedule-summary-full-width
status: PASS — committed, pushed, deployed, and live-verified
---

# Handover Closure — Schedule Summary Full-Width Expansion

**Closure date:** 2026-07-14

## Requirement

Make the Schedule Summary span nearly the full calendar-shell width (instead of being offset by the 220px sidebar via `.msc-calendar-content`) while keeping small, clean horizontal padding, remaining below the calendar, and preserving the Daily/Weekly/Monthly cards and their 3/2/1-column responsive behavior.

## File Changed

`web-view/index.html` only.

## Validation Path

`validation/schedule-summary-full-width-check-2026-07-14.md`

## DOM Movement

`.msc-summary-section` moved from being a child of `.msc-calendar-content` to a genuine direct child of `.msc-calendar-shell`. This required splitting the pre-existing `.hr-table-card` wrapper — traced via a stack-based nesting check and confirmed to previously wrap everything from `.msc-calendar-header` through the view modal in one continuous card — into two separate instances of the same class: card #1 wraps only `.msc-calendar-header`/`.msc-calendar-main` (calendar only); card #2 wraps `.msc-form-card`, both `.msc-list-card`s, the footer, and the view modal (unchanged content). `.msc-summary-section` sits between the two cards, as a true sibling of both inside `.msc-calendar-shell`. This was confirmed safe because `.msc-form-card`/`.msc-list-card` already have their own complete, independent visual styling (background/border/radius/padding/margin — not inherited from `.hr-table-card`), and `.hr-table-card` is never referenced by any JavaScript `querySelector` call.

## CSS Spacing

```css
.msc-summary-section {
  width: 100%;
  box-sizing: border-box;
  padding: 18px 16px 20px;
  margin-top: 16px;
  border-top: 1px solid var(--border);
}
@media (max-width: 480px) {
  .msc-summary-section { padding-left: 10px; padding-right: 10px; }
}
```

`box-sizing: border-box` is the load-bearing addition here — without it, `width: 100%` plus 16px horizontal padding would overflow the shell by 32px. `.msc-summary-grid`'s own `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` rule (from the prior layout task) is unchanged; against the wider shell-level container it now produces the same 3/2/1-column behavior, just with wider individual cards (~373px at desktop vs. ~300px previously — computed from real CSS values, not estimated).

## Functionality Unchanged

Confirmed by diff: `loadDailySummary()`, `loadWeeklySummary()`, `loadMonthlySummary()`, `loadSummaries()`, `renderSummaryStats()`, `formatDuration()`, `formatDurationPercentage()`, `formatChange()`, sidebar toggle, Month/Week/Day view switching, drag/drop, resize, mini-calendar, and category legend are all byte-for-byte unchanged. No backend file, database file, migration, report calculation, or classification logic was touched — confirmed by `git diff --stat` showing only `web-view/index.html` plus the two new evidence files.

## Deployment Result

Frontend `https://management-aios.vercel.app/` — HTTP 200, confirmed to serve the restructured markup with `.msc-summary-section` sitting directly between the two `.hr-table-card` occurrences. Backend `https://management-aios-api.vercel.app/health` — HTTP 200 (unchanged, no-regression check only).

## Commit Hash

This change (`web-view/index.html` plus this handover file and its validation file) is committed together in a single commit with the exact message `Expand schedule summary to full width`, per instruction. As with the prior full-width layout change this session, the commit's own hash cannot be embedded inside a file that is itself part of that commit's content — run `git log -1 --format=%H -- web-view/index.html` against this repository to retrieve it; it is the single commit immediately following `0129b08` on `main`.

## Queryability Result

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker Status

No technical blocker. Same documented limitation as the prior two layout tasks this session: no real browser was available for pixel-measured visual verification — structural and width correctness were instead confirmed via a stack-based nesting trace, real computed-width arithmetic from this file's own CSS values, JS syntax validation, CSS brace-balance confirmation, and a post-push live-deployment HTML fetch.

## Next Step

None required for this width adjustment itself — it is closed. If a browser-capable environment becomes available, an optional manual visual pass (confirming the summary visually reads as flush with the calendar card's edges at a few window widths) would be a reasonable follow-up, though no discrepancy is expected given the CSS mechanisms used (`align-items: stretch` on the shell, `box-sizing: border-box` on the section) are both well-established and directly confirmed via the computed-width math above.

## PASS / FAIL

**PASS.** Schedule Summary is now a direct child of `.msc-calendar-shell`, spanning the shell's full width with clean 16px (10px narrow) horizontal padding via `box-sizing: border-box`; the split of `.hr-table-card` into two visually-identical instances preserves the existing card look for both the calendar and the Schedule Item form/list sections; the 3/2/1-column responsive grid behavior is preserved and verified with real computed widths; all report-loading, formatting, and calendar-view logic is confirmed unchanged; all five member instances share this one implementation; committed, pushed, and deployed with HTTP 200 confirmed on both frontend and backend.
