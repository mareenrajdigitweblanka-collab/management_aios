---
name: shared-calendar-view-rendering-regression-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: shared-calendar-view-rendering-regression
status: PENDING — fix implemented and code-validated; commit/push/deploy/live verification steps follow in this same session
---

# Handover Closure — Shared Calendar View Rendering Regression Fix

**Closure date:** 2026-07-14

## Requirement

Fix two reported rendering defects in the live shared member-schedule calendar: Month view not rendering as a seven-column grid, and Week/Day views rendering underneath the still-visible Month grid instead of replacing it. Targeted correction only — no Phase 2 visual redesign included.

## Implementation Path

`web-view/index.html` — two isolated edits: one CSS rule split (`.msc-cal-grid` / new `.msc-cal-grid.active`), one small JS defensive-fallback guard prepended to `renderActiveView()`.

## Validation Path

`validation/shared-calendar-view-rendering-regression-check-2026-07-14.md`

## Root Cause

A CSS specificity/source-order tie between the shared pane-visibility rules (`.msc-view-pane { display: none; }`, `.msc-view-pane.active { display: block; }`) and the Month pane's own `.msc-cal-grid { display: grid; ... }` rule — all applying to the same DOM element, since the Month pane serves as both the view-pane wrapper and the grid container with no separate inner wrapper. When Month was active, `.msc-view-pane.active` (higher specificity) beat `.msc-cal-grid`'s `display: grid`, so Month rendered as a plain block (children stacked, no 7-column layout). When Month was inactive, `.msc-cal-grid` and `.msc-view-pane` tied on specificity, and `.msc-cal-grid` — appearing later in the stylesheet — won the tie, so Month never actually hid under Week/Day. Full cascade math in the validation file.

This conflict predates the Phase 1 layout-shell change (introduced 2026-07-13 alongside the original Month/Week/Day/Agenda views); Phase 1 did not touch `.msc-view-pane` or `.msc-cal-grid`. It went undetected by the 2026-07-13 validation because that pass used a jsdom harness, which does not implement real CSS cascade/grid layout — this is the first real-browser-equivalent (deployed-artifact) review of this rule.

## Fixed Behavior

- Month view now renders as a proper 7-column, 6-row grid when active (`.msc-cal-grid.active { display: grid; }`, specificity-correct and source-order-correct against `.msc-view-pane.active`).
- Month view correctly hides (`display: none`, inherited from `.msc-view-pane`) whenever Week or Day is the active view — no more Month-grid-plus-time-grid stacking.
- Added a defensive fallback in `renderActiveView()`: an unrecognized `state.currentView` value now safely resets to `'month'` (never Agenda, which remains removed) instead of leaving every pane inactive/blank.

## Commit

*(filled in below after commit)*

## Deployment

*(filled in below after push + deploy verification)*

## Live Verification

*(filled in below after live verification)*

## Queryability

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker

No technical blocker. Interactive human visual click-through on the live site was not performed in this sandbox (same documented tooling/egress limitation as Phase 1) — carried forward as the one open follow-up, not a blocker to this fix's correctness, which is established by CSS cascade analysis against the exact shipped rule text plus a post-deploy byte-identity check.

## Next Step

Human visual confirmation of Month/Week/Day rendering on the live site at the next opportunity; then resume Phase 2 (Month/Week/Day visual redesign) per the original discovery report's phased plan.

## PASS / FAIL

*(filled in below after deployment verification)*
