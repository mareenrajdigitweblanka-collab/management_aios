---
name: shared-calendar-view-rendering-regression-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: shared-calendar-view-rendering-regression
status: PASS — committed, pushed, deployed, and post-deploy live-artifact verification confirmed. Interactive human visual click-through on the live site remains an open follow-up (sandbox tooling limitation, not a code defect).
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

`fc199b3` — "Fix shared calendar view rendering" (3 files: `web-view/index.html`, this handover file, the validation file). Pushed to `origin/main`: `c4e832e..fc199b3`.

## Deployment

- Frontend: `https://management-aios.vercel.app/` — HTTP 200. Raw HTML fetched via `curl` and diffed byte-for-byte against the committed `web-view/index.html` — **zero-line diff**, confirming the live deployment is exactly commit `fc199b3`.
- Backend: `https://management-aios-api.vercel.app/health` — HTTP 200. `GET /openapi.json` re-confirmed the schedule API surface is unchanged (same 5 routes as before this fix) — independently proves the backend was not touched.

## Live Verification

Deployed HTML confirmed (via raw `curl` + grep, not a markdown-converting fetch) to contain the fixed `.msc-cal-grid.active` CSS rule and the `renderActiveView()` defensive-fallback guard, each exactly once (single shared factory/stylesheet, as expected). `data-view="agenda"` and `msc-agenda-list` confirmed still absent. Full detail: `validation/shared-calendar-view-rendering-regression-check-2026-07-14.md` "Deployment and Post-Deploy Live-Artifact Verification" section.

**Not performed:** an actual human/browser visual look at the rendered Month grid and Week/Day panes — this sandbox has no working browser-driving tool and live DB/browser egress is blocked, the same constraint documented in the Phase 1 closure. The deployment-artifact check above (byte-identical live HTML containing the exact fixed rule, plus an unchanged backend route surface) is the strongest verification available in this environment, but it is a code/artifact check, not a rendered-pixel check — flagged honestly rather than conflated with a visual confirmation.

## Queryability

Both this handover file and the validation file are LLM-queryable Markdown with proper frontmatter.

## Blocker

No technical blocker. Interactive human visual click-through on the live site was not performed in this sandbox (same documented tooling/egress limitation as Phase 1) — carried forward as the one open follow-up, not a blocker to this fix's correctness, which is established by CSS cascade analysis against the exact shipped rule text plus a post-deploy byte-identity check.

## Next Step

Human visual confirmation of Month/Week/Day rendering on the live site at the next opportunity; then resume Phase 2 (Month/Week/Day visual redesign) per the original discovery report's phased plan.

## PASS / FAIL

**PASS.** Committed, pushed, deployed, and deployment-artifact-verified. Root cause was identified precisely, the fix is minimal and targeted (no Phase 2 scope creep), and both reported symptoms are resolved by construction per the CSS cascade analysis. Follow-up: human visual click-through on the live site at the next opportunity (see Blocker/Next Step).
