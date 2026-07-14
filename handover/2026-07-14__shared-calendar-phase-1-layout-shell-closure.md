---
name: shared-calendar-phase-1-layout-shell-closure
type: handover-closure
created: 2026-07-14
created-by: Mareenraj (builder)
requirement-id: shared-calendar-phase-1-layout-shell
status: PENDING — implementation code-complete and validated at code/structural level; commit, push, deployment, and live verification not yet performed (awaiting explicit user confirmation before pushing to origin/main, per the change's production blast radius)
---

# Handover Closure — Shared Calendar Phase 1: Layout Shell

**Closure date:** Not yet closed — this record will be updated after commit/push/deploy/live verification are confirmed (Step 24 evidence-only update, or a fresh closure entry).

## Requirement

Begin the approved Google-Calendar-inspired UI/UX redesign of the shared member-schedule calendar (Mayurika, Suman, Arun, Rajiv, Paraparan) without changing backend behavior, database structure, access rules, classification logic, or event ownership. Phase 1 scope: shared layout shell (header + collapsible left sidebar + content), relocate the existing mini-calendar and daily/weekly report summary into the sidebar, add a sidebar "Create task" shortcut to the existing form, remove the Agenda view, and change the narrow-screen fallback view from Agenda to Day.

## Implementation Path

- `web-view/index.html` — the only file changed. All edits are inside the single shared `mountScheduleCalendarInstance(container)` factory (markup, CSS, and its supporting JS), which remains mounted identically for all five `.msc-instance` containers.

## Validation Path

`validation/shared-calendar-phase-1-layout-shell-check-2026-07-14.md`

## Features Completed

- Shared layout shell: `.msc-calendar-shell` → `.msc-calendar-header` (toolbar) + `.msc-calendar-main` (`.msc-sidebar` + `.msc-calendar-content`), built per-instance inside the one shared factory.
- Header toolbar refined: sidebar-toggle button added (keyboard-accessible, `aria-expanded`/`aria-controls`), Today/Previous/Next and heading unchanged, view switcher reduced from Month/Week/Day/Agenda to Month/Week/Day.
- New collapsible left sidebar, independent per member instance (toggling one member's sidebar does not affect another's).
- Mini-calendar relocated into the sidebar; `renderMiniPicker`/`buildMonthGridCells`/`selectDate` reused unchanged; one regression (a `flex: 0 0 200px` sizing rule that would have forced a fixed 200px height in the new column layout) was caught and fixed during the edit.
- Daily/weekly report summary relocated into the sidebar; `renderSummaryStats`/`loadDailySummary`/`loadWeeklySummary`/`loadSummaries` reused unchanged; the duplicate copy previously in the main content column was removed.
- Sidebar "Create task" button — Phase 1 behavior only: scrolls to and focuses the existing persistent create/edit form; no popup built yet (by design, deferred).
- Category legend added to the sidebar, reusing the existing `.msc-chip-cat.task`/`.followup` styling — no new colors introduced.
- Agenda view fully removed: switcher button, view pane, `renderAgendaView()`, Agenda-only CSS, and every Agenda branch in `updateHeading()`/`renderActiveView()`/Prev/Next handlers.
- Narrow-screen (`<= 640px`) fallback changed from `currentView = 'agenda'` to `currentView = 'day'`, since Agenda no longer exists.

## Features Intentionally Deferred (per approved Phase 1 scope)

Quick-create popup, new full-editor modal, combined calendar, cross-member calendar list, member filters, any shared-access/authentication/authorization change, notifications, reminders, recurring events, Google sync/branding, mobile-specific navigation, backend changes, database changes, migrations. None of these were touched, added, or implied by this phase.

## Regression Evidence

Full diff-review confirms zero changes to: `renderMonthView`, `renderTimeGrid`, `attachDragHandlers`, `attachResizeHandler`, `commitItemTimeChange`, `wireTimeGridInteractions`, `TG_ROW_HEIGHT_PX`/`TG_HOURS`, the Add/Edit/Delete handlers, the category-lock logic, and all API call sites (`apiRequest`, `loadItems`, `frontendToApiPayload`, `apiItemToFrontend`). JS syntax of the full calendar script block passed `node --check`. Whole-file and template-local `<div>` tag balance confirmed even. All 5 `.msc-instance` mount points and the Rajiv-only note are intact. Full detail in the validation file above.

**Known gap carried forward:** live browser/functional verification (drag/drop, resize, create/edit/delete, on-screen rendering) was not performed in this sandbox — live Postgres egress is blocked from this shell (same documented constraint as the prior `2026-07-13` calendar UX validation), and reproducing that prior pass's jsdom-harness approach here would have required installing a new dependency, which this task's instructions explicitly prohibited. This is carried as an open item to be closed by live verification after deployment (Step 23), not silently marked complete.

## Next Phase

Phase 2 (Month/Week/Day visual redesign, event-card redesign, resolving the pre-existing task/followup color inconsistency between the time-grid and chip/pill color systems) per the discovery report's phased recommendation. Phase 4 (shared-access model) remains explicitly blocked on a business/owner decision documented in the discovery report — not started, not implied by this work.

## Commit Hash

**PENDING** — changes are staged locally only; not yet committed. Per this session's risk assessment (a push to `origin/main` triggers Vercel auto-deploy to the live production frontend used by all 5 members), commit/push is paused for explicit user confirmation before proceeding, consistent with this project's git safety practice of confirming before actions that affect shared/production state.

## Deployment Result

**PENDING** — not yet pushed or deployed.

## Queryability Result

**PENDING** — will be confirmed once deployed (this record itself, plus the validation file, are LLM-queryable Markdown per SRC-MD-HR-001 §11.1 regardless of deployment status).

## Blocker Status

No technical blocker. One process gate: explicit user go-ahead to stage, commit, push, and deploy (Steps 20–24 of the original task instructions were intentionally paused here rather than executed automatically).

## PASS / FAIL

**Code-complete: PASS.** **Deployment closure: PENDING** user confirmation.
