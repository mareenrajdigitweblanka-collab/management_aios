---
name: calendar-bulk-task-multi-date-implementation-handover
type: handover
scope: management_aios Calendar — Bulk Tasks multi-date creation (REQ-CAL-BULK-DATES-001)
created: 2026-08-03
status: AMBER — implemented directly on main per explicit direct-main authorization, zero backend/database change, all automated tests pass (628 backend with 2 pre-existing unrelated failures, 232/232 frontend including 55 new tests). Human-in-the-loop local browser validation was attempted (repo gate/diff review/local startup/pre-post production task counts all PASS) but the 15 manual browser-interaction phases were not performed — no browser-automation tool available, requires a human. User explicitly instructed to push and validate directly in production instead (§12) — pushed per that explicit authorization (§13). AMBER because no DOM-mounted or real-browser verification was performed — architectural/tooling limitations, honestly disclosed, and the push gate was explicitly overridden by the user, not met.
owner: builder (Mareenraj), per explicit direct-main implementation authorization for this session
reviewer: pending — see §7 routing
---

# Calendar Bulk Task Multi-Date Creation — Implementation Handover — 2026-08-03

## 1. What this task was

Implemented REQ-CAL-BULK-DATES-001 directly on local `main`, per explicit user instruction that no feature branch is required and that the implementation commit must not be pushed until the final report is reviewed. Full requirement/design: `docs/2026-08-03_calendar-bulk-task-multi-date-technical-design.md`. Full implementation evidence: `validation/calendar-bulk-task-multi-date-implementation-check-2026-08-03.md`.

Lets a Management Team member enter one task definition once per `.msc-bulk-row` card, then generate it across a single date, a weekday-filtered date range, or a manually picked set of dates — each generated date becomes one ordinary `MemberScheduleEvent` row via the existing, completely unmodified `POST /api/member-schedules/{member_key}/bulk` endpoint.

## 2. Files created

| File | Purpose |
|---|---|
| `web-view/js/calendar/date-range-expansion.test.mjs` | 30 tests for `expandTaskDates()`/`DEFAULT_RANGE_WEEKDAYS` |
| `web-view/js/calendar/bulk-payload-and-occurrence.test.mjs` | 25 tests for the payload/occurrence pure helpers |
| `validation/calendar-bulk-task-multi-date-implementation-check-2026-08-03.md` | Full implementation evidence |

## 3. Files modified

| File | Change |
|---|---|
| `web-view/js/calendar/core.js` | Added `expandTaskDates()`, `DEFAULT_RANGE_WEEKDAYS`, `buildBulkPayloadRowsForDates()`, `bulkCardOccurrenceCount()`, `totalBulkOccurrenceCount()`, `formatCompactDateList()` — all pure, exported, DOM-free |
| `web-view/js/calendar/instance.js` | New date-selection-mode UI per Bulk Tasks card, weekday chips, multi-date chips, live preview/occurrence summary, `positionMap`-based backend-error resolution, combined-occurrence pre-submit block |
| `web-view/css/calendar.css` | New styles reusing existing design tokens |

**Backend files modified: 0.** **Database/migration files modified: 0.** Confirmed via `git diff --quiet -- backend/ database/ database/migrations/` (empty).

## 4. Authoritative pattern — do not duplicate

- `expandTaskDates()`/`buildBulkPayloadRowsForDates()`/`bulkCardOccurrenceCount()`/`totalBulkOccurrenceCount()`/`formatCompactDateList()` live in `core.js` as pure, DOM-free functions — this is where any future date-expansion/payload/occurrence logic change belongs, never duplicated inline in `instance.js`.
- The backend contract (`BulkTaskCreateRequest`/`BulkTaskRowIn`/`TimeFrameIn`, `MAX_BULK_TASK_ROWS`, `MAX_TASK_OCCURRENCES_PER_SUBMISSION`, duplicate/leave-conflict/atomicity logic) is **completely unmodified** — do not touch `backend/routers/member_schedules.py` or `backend/schemas.py` for this feature without a separately-approved reason; the whole point of the selected architecture (Option A, frontend expansion) is that the backend never needs to know a submission came from a date range vs. manually-typed rows.
- `instance.js`'s `positionMap` (built fresh inside `performBulkSubmit()` on every call) is now the only correct way to resolve a backend-reported `row` number back to a DOM card — a card can now occupy more than one array position once it expands to multiple dates, so `getBulkRows()[rowNumber-1]` (the old assumption) is no longer valid anywhere in this file.
- `instance.js` has **no DOM-mounted test coverage anywhere in this repository** (confirmed by grep — `mountScheduleCalendarInstance`/`initAllScheduleCalendars` are never constructed by any test file) — this is a pre-existing architectural fact, not something this feature introduced or should attempt to "fix" in isolation. Any new decision logic in this area should be extracted to `core.js` as a pure function and tested there, exactly as this feature did.

## 5. How to extend tests

Frontend pure-function tests: add cases to `web-view/js/calendar/date-range-expansion.test.mjs` (date-expansion algorithm) or `bulk-payload-and-occurrence.test.mjs` (payload/occurrence formulas) — both are plain `node --test` files with zero DOM dependency, run directly with `node --test web-view/js/calendar/<file>.test.mjs`. Backend tests are unaffected by this feature and need no new cases unless the backend contract itself is later changed (which this feature deliberately avoids).

## 6. Verified this session

- Baseline (before any code change): full backend 628/626+2 known failures; full frontend suite 177/177.
- Full suite (after implementation): full backend unchanged (628/626+2 known failures — confirmed byte-identical failure set); full frontend 232/232 (+55 new, zero regressions); task-related backend suites (bulk creation, cross-member auth, multi-time-frames, occurrence limit, same-task rule, frame-level errors, advisory confirmation) 289/289 unchanged.
- `node --check` clean on every modified/new `.js` file (`core.js`, `instance.js`, both new test files).
- CSS brace-balance check clean on `calendar.css`.
- `git diff --quiet -- backend/ database/ database/migrations/` confirms zero backend/database change.

## 7. Reviewer routing

Per CLAUDE.md §18: shared Calendar/Task UX/API work with no single domain owner mandated by that table — route to whichever Management Team member next exercises the Bulk Tasks feature live, consistent with the routing already used for the 2026-07-27 multiple-time-frames feature and this feature's own design document.

## 8. Why AMBER, not a clean pass

- No DOM-mounted test file exists for `instance.js`'s new UI wiring — this repository has zero DOM-level test coverage for this file at all (a pre-existing architectural fact, not a shortcut taken for this feature); the actual decision logic is instead fully covered by 55 new pure-function tests in `core.js`.
- No real-browser or screen-reader verification was performed — no browser automation tool is available in this environment, the same limitation documented throughout this feature's own design document (§20 "Known limits") and every prior Calendar feature's evidence trail in this repository.
- Committed locally on `main` but **not pushed** — explicit instruction: the implementation commit must not be pushed until the final report is reviewed.

## 9. Baseline failures (pre-existing, unrelated, unchanged)

1. `test_pending_task_no_outcome` (`test_weekly_schedule_xlsx_export.py`) — pre-existing, date-sensitive "Pending" vs. "No response" outcome-label mismatch.
2. `test_missing_variable_fails_closed` (`test_calendar_auth.py`) — environment-specific, a local `.env` file already provides a value the test expects absent.

Both reproduce identically before and after this session's changes; neither is touched by this feature.

## 10. Rollback

Nothing has been pushed, so rollback is simply: do not push this commit. `origin/main` is completely unaffected by this implementation work — it remains at the design-only commit `ec4baab`. If these commits are later pushed and need to be reverted, `git revert` the implementation commit; no database schema exists for this feature to begin with, so no schema-level rollback step is ever needed.

## 11. One next step

~~Review this evidence and the local `main` diff...~~ **Superseded — see §12.**

## 12. Human-in-the-loop local browser validation — attempted, not completed; user-authorized push (2026-08-03, same-day follow-up)

Full detail: `validation/calendar-bulk-task-multi-date-implementation-check-2026-08-03.md`, "Human-in-the-loop local browser validation" section.

**Attempted**: repository gate (PASS), implementation diff review (PASS — exactly the 7 expected files, no backend/database/secret file), local startup via the existing documented method (`backend/README.md`), production task count before validation (`total_tasks=860`, `active_tasks=726`, aggregate-only).

**Discovered during setup**: the local `.env` (present, never opened) connects the local backend to the **same production database** as the deployed app — no separate local/dev database exists in this environment. This was disclosed to the user before any further step.

**Not performed**: the 15 manual browser-interaction phases (network-request blocking, Single/Range/Weekend/Multiple-date/multi-time-frame/limit-boundary/invalid-state/add-another-task/authorization/keyboard/ARIA/responsive/console checks) — no browser-automation tool is available in this environment; this requires a human directly driving a real browser. Local dev servers were started, offered to the user, then stopped again (confirmed both ports refuse connections) once the user's decision below was given.

**User decision**: the user explicitly instructed *"Just commit and push I will check in production"* — an explicit, informed override of this sub-task's own push gate, with the user taking personal responsibility for validating the feature live in production after deployment.

**Production task count after**: re-queried following that decision — `total_tasks=860`, `active_tasks=726`, unchanged from before. **Production writes this sub-session: 0.**

**Status**: AMBER, unchanged from §8 above — this sub-session does not add a browser-validation PASS of any kind; the push that follows (§13) is user-authorized despite the unmet browser-validation gate, not a claim that the gate was met.

## 13. One next step

The user validates the feature directly against the production deployment after push/deploy. If a defect is found, triage and fix it as its own follow-up task, the same way this repository has handled every prior real-browser-found defect for this Calendar feature area.
