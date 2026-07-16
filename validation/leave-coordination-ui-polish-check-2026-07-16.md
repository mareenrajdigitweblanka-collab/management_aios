---
name: leave-coordination-ui-polish-check
type: validation
created: 2026-07-16
requirement-id: REQ-LEAVE-COPY-001
status: PASS — UI-only polish of the existing Leave Coordination section; no business logic, backend, or database change
source-boundary: web-view/index.html only. backend/, database/, .env — all confirmed unchanged (git diff --stat shows a single file). member-aios/mayurika-hr/staff-data/ not accessed.
root-truth: CLAUDE.md — canonical
---

# Leave Coordination Calendar UI Polish — Validation Check — 2026-07-16

## Scope

**UI-only.** This pass restyles and restructures the presentation of the existing, already-functional "Leave Coordination (Calendar Copy)" section inside the shared `mountScheduleCalendarInstance` factory in `web-view/index.html`. No leave business logic, validation rule, conflict rule, reporting calculation, API route, or data model was touched. This is a visual/markup-only change confirmed by `git diff --stat`, which shows exactly one file changed (`web-view/index.html`, +213/-24 lines) — no `backend/` or `database/` file appears in the diff.

## Files Changed

- `web-view/index.html` — CSS additions/restyling for the leave status badges, a new `.msc-leave-card`/`.msc-leave-card-head`/`.msc-leave-title`/`.msc-leave-subtitle` section-container treatment, a restyled `.msc-leave-notice` info banner, `.msc-leave-section`/`.msc-leave-section-title` subsection grouping, a `.msc-leave-form-panel` wrapper around the existing create-leave form, `.msc-leave-empty` and `.msc-leave-item-card` presentational classes for the list/history areas, a `.msc-leave-history-panel` wrapper, and a `.msc-btn:focus-visible` accessibility rule. Corresponding markup in the `container.innerHTML` template and the `renderLeaveList()`/`renderLeaveHistoryList()` render functions was updated to use the new classes. No element ID, data attribute used by JS logic (`.msc-leave-field-*`, `.msc-leave-list-date-label`, `.msc-leave-history-wrap`, `.msc-leave-create-btn`, `.msc-leave-history-toggle`, `data-leave-id`, `data-leave-action`), event handler, fetch call, or API endpoint was renamed, removed, or altered.

## No Backend/Database Change Confirmation

Confirmed via `git diff --stat` and `git status --short`: the only modified file is `web-view/index.html`. No file under `backend/` or `database/` appears as changed, added, or deleted. `member-aios/mayurika-hr/staff-data/` remains untracked and was not accessed.

## Heading / Header Improvement

The bare `hr-table-title` text line ("Leave Coordination (Calendar Copy)") is replaced with a `.msc-leave-card-head` block containing a `.msc-leave-title` heading (calendar icon + bold title + de-emphasized "(Calendar Copy)" qualifier) and a `.msc-leave-subtitle` supporting line ("Create, track, and coordinate leave for {member} directly on this calendar."), giving the section an intentional header area consistent with how Schedule Summary and the Schedule Item form present their own headings.

## Notice/Banner Improvement

`.msc-leave-notice` now reuses this page's existing `--status-info-bg`/`--status-info-border`/`--status-info-text` tokens (the same tokens already driving `.msc-api-status--info` elsewhere on this page) plus a left accent border and an information icon — calm and informational, not alarming, and visually consistent with the rest of the page's established color language rather than inventing a new one. The exact required wording ("Calendar coordination copy only. The separate HR leave system remains official...") is preserved verbatim.

## Form Layout Improvement

The create-leave form is now wrapped in a `.msc-leave-form-panel` (tinted `--surface-tint-2` background, bordered, padded) under a `.msc-leave-section-title` ("New Leave Request") label, giving it clear visual separation from the notice and the list below. The form itself still uses the existing `.msc-form-grid` two-column-on-desktop/one-column-under-768px layout (unchanged responsive behavior, already used identically by the Schedule Item form), with slightly increased row/column gap (12px/16px) for better breathing room, and the action-button row now sits below a divider with extra top spacing.

## Button Improvement

"Create leave" (`.msc-btn-primary`) and "Show history" (`.msc-btn-ghost`) retain their existing primary/secondary visual distinction (unchanged classes); a new `.msc-btn:focus-visible` rule adds a clear two-layer focus ring (matches the page's existing `:focus-visible` convention used elsewhere, e.g. `.tab-btn:focus-visible`) so keyboard focus is visibly indicated on both buttons, which was previously relying only on the browser default outline.

## Leave List / Empty-State Improvement

- Empty states (no date selected / no leave that day / no history) now use `.msc-leave-empty` — a centered, dashed-border, tinted-background box — instead of a bare line of muted text sitting directly on the page background.
- Individual leave entries in both the active list and history now render as `.msc-leave-item-card` — a bordered, rounded, padded card per entry (mirrors the existing `.msc-summary-block` card treatment used in Schedule Summary) — replacing the plain divided-list (`.msc-item`) look. Status badges (`.msc-leave-status-badge`) gained a small colored dot indicator alongside the existing colored background + text label, so status is never conveyed by color alone (Pending = blue, Approved = purple, Rejected = red, Cancelled = neutral gray — unchanged color choices from the prior pass, only the badge shape/border refined).
- Rejected/Cancelled leave continues to be excluded from the normal list (unchanged `NORMAL_VISIBLE_STATUSES`/backend filtering — not touched by this pass) and remains visible only in History, per existing behavior.

## History Section Improvement

The History panel is now a distinct `.msc-leave-section` (top border + spacing separates it from the active list above when toggled visible) wrapped in a `.msc-leave-history-panel` (tinted background, bordered) containing the same `.msc-leave-item-card` entries, so History reads as a clearly separate, still-consistent sub-area rather than a plain list appended below.

## Responsive Behavior Confirmation

- The existing `.msc-form-grid` single-column collapse at `max-width: 768px` is unchanged and still applies to the leave form.
- A new `max-width: 560px` rule stacks each `.msc-leave-item-card` into a column layout (badge/title/meta above, then full-width action buttons below) so Approve/Reject/Cancel buttons don't crowd or overflow on narrow screens.
- `.msc-leave-card` padding reduces slightly below 560px to match the page's general narrow-width spacing reduction pattern.
- No fixed pixel widths were introduced; all new containers use the same relative/`minmax`/`auto`-based sizing conventions already used elsewhere on this page. Manually reviewed for any new horizontal-overflow risk — none of the new rules set a `width`/`min-width` wider than `100%` of their container, and `.msc-form-grid` already guards this pattern.
- **Not verified in a real browser** — no browser-automation tool is available in this environment (same limitation recorded in the prior implementation validation file). Verified instead by: (a) reviewing every new CSS rule against the page's existing token/breakpoint conventions, (b) the JS-syntax and HTML-tag-balance checks below, and (c) confirming no new fixed-width or overflow-prone rule was introduced.

## All-Five-Members Shared-Implementation Confirmation

All changes live inside the single shared `mountScheduleCalendarInstance` factory function and its one `container.innerHTML` template plus the shared `renderLeaveList()`/`renderLeaveHistoryList()` functions — there is no per-member branch or duplicated markup anywhere in this diff. Since this factory is called once per `.msc-instance` container (mayurika, suman, arun, rajiv, paraparan — confirmed unchanged in `initAllScheduleCalendars`), the polish applies identically and automatically to all five member instances with zero additional code.

## Static Checks

- `node --check` on the extracted schedule-calendar `<script>` block (92,020 characters after this change) — **passed, no syntax errors**.
- Python `html.parser` full-file tag-balance check — **0 errors, 0 unclosed tags**.

## Known Limits

1. No live browser rendering/visual QA was performed (no browser-automation tool available in this environment) — verification is static (syntax/tag-balance) and code-review-based (design-token/convention consistency), consistent with the prior implementation validation's documented limitation.
2. This pass did not re-run the backend test suite, since no backend file was touched — re-running `backend/tests/` would provide no additional signal for a frontend-only diff. `python -m unittest discover -s backend/tests` was previously confirmed at 128/128 passing (2026-07-16 implementation pass) and remains valid since no backend file changed here.
3. No new frontend automated test exists for this page (the pre-existing project convention has none) — this is unchanged by this pass, not introduced by it.

## PASS / FAIL

**PASS.** The Leave Coordination section is restructured and restyled per every required item (section container, header, notice banner, form layout, buttons, list/empty-state, history area, responsiveness, visual consistency, accessibility) using only `web-view/index.html`, with zero change to leave business logic, backend, or database, confirmed by `git diff --stat` and by preserving every JS selector/handler the existing leave feature depends on. Static syntax and structural checks both pass.
