---
name: calendar-review-summaries-dedicated-tab-implementation-handover
type: handover
scope: management_aios Calendar — Staff Review Summaries dedicated tab (REQ-CAL-REV-TAB-002)
created: 2026-08-06
status: AMBER — implemented directly on local main per explicit user authorization, all automated tests pass with zero regressions (638 backend/636 passed with 2 pre-existing unrelated failures; 260/260 frontend), not pushed/deployed pending review, no real-browser walkthrough performed (no browser automation tool available). State-clearing deviations (401/tab-leave preserving employee selection) reported and corrected same-day — see §13. Automated navigation-structure test coverage added — see §13.
owner: builder (Mareenraj), per explicit direct-main implementation authorization for this session
reviewer: pending — see §7 routing
---

# Calendar Review Summaries Dedicated Tab — Implementation Handover — 2026-08-06

## 1. What this task was

Implemented REQ-CAL-REV-TAB-002 directly on local `main`, per explicit user instruction that no feature branch was required and that push/deployment should wait for review of the final implementation report. Requirement: `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md`. Technical design: `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` (both corrected in two prior same-day sessions — see their own correction notes). Full implementation evidence: `validation/calendar-review-summaries-dedicated-tab-implementation-check-2026-08-06.md`.

Consolidates REQ-CAL-REV-001's 5 embedded per-member-panel Review Summaries mounts into 1 new, independent dedicated sidebar tab (`STAFF › Data › Review Summaries`). Reviewer identity is now derived solely from the authenticated Calendar token — never from which panel is active, a reviewer filter selection, or the reviewed employee. History defaults to showing every reviewer's active summaries for the selected employee (`include_all_reviewers=true`); a specific-reviewer filter narrows to one reviewer. Edit/Delete are gated per record (`isOwnedRecord`), not per panel. Reviewer display name and role are resolved client-side via a new `member-registry.js` module — no backend or database change for that concern.

## 2. Files created

| File | Purpose |
|---|---|
| `web-view/js/member-registry.js` | `MEMBER_REGISTRY`/`resolveMember()` — client-side reviewer name+role resolution, including the deliberate Paraparan="Auditor" exception |
| `validation/calendar-review-summaries-dedicated-tab-implementation-check-2026-08-06.md` | Full implementation evidence report |
| `handover/2026-08-06__calendar-review-summaries-dedicated-tab-implementation-closure.md` | This file |

## 3. Files modified

| File | Change |
|---|---|
| `web-view/index.html` | Sidebar heading `Data`→`Staff`, nav label `Staff Data`→`Data`, new `Review Summaries` nav button + independent `#tab-review-summaries` panel; removed all 5 embedded `.review-summaries-instance` mounts (Mayurika, Suman, Arun, Rajiv, Paraparan) — 0 remaining, 1 dedicated mount added |
| `web-view/js/review-summaries.js` | Full rewrite: single `mountReviewSummariesWorkspace(mountEl)` (no `memberKey` param), two access states (`authorized`/`unauthorized`) replacing the old three (`own`/`read_only`/`unauthorized`), per-record ownership (`isOwnedRecord`), reviewer-filter `<select>`, `include_all_reviewers` default wiring, `member-registry.js`-based card fields, revised state-clearing (token-change-vs-401 distinction; panel-switch no longer clears employee selection) |
| `web-view/js/review-summaries.test.mjs` | Full rewrite — 58 tests (was 53), covering the new model end-to-end |
| `web-view/css/review-summaries.css` | `.review-summaries-instance` → `.review-summaries-workspace`; new `.review-summaries-card-employee`/`-card-reviewer`/`-card-reviewed-by`/`-card-reviewer-role`/`-reviewer-select` rules; removed the now-unused `.review-summaries-readonly-note` rule |
| `backend/routers/staff_review_summaries.py` | Added `include_all_reviewers: bool = Query(default=False)` to `list_staff_review_summaries` only — additive branch, existing single-reviewer branch byte-for-byte unchanged |
| `backend/tests/test_staff_review_summaries.py` | 10 new tests for `include_all_reviewers` (48 → 58) |

No file under `member-aios/mayurika-hr/staff-data/` (protected) was opened or touched. No database connection was used this session — no schema or migration file changed. `backend/schemas.py`, `backend/models.py`, `backend/main.py`, `backend/config.py`, `web-view/js/app.js`, `web-view/js/navigation.js`, and `web-view/js/config.js` were all confirmed to require zero changes (the boot-time export name `initReviewSummaries` was kept identical, so `app.js`'s call site needed no edit).

## 4. Authoritative pattern — do not duplicate

- Reviewer identity is derived **only** from `calendar/auth.js`'s `getStoredMemberKey()` — never from a panel, a reviewer filter, the selected employee, or the request body. There is no more per-panel `memberKey` concept.
- `isOwnedRecord(record, authenticatedMemberKey)` is the ONLY ownership check — evaluated per rendered card. Do not reintroduce a panel-level "mode" comparison.
- `include_all_reviewers` and `reviewer_member_key` are mutually exclusive by construction in both `buildListQuery()` (frontend) and the backend route (422 if both supplied) — do not relax this.
- Reviewer display name/role come from `member-registry.js`'s `MEMBER_REGISTRY`, resolved client-side from `record.reviewer_member_key`. Do not add a `reviewer_display_label`/`reviewer_display_name`/`reviewer_role` field to the backend response or database — this was deliberately reassessed and dropped during design (technical design §4/§6.3).
- Paraparan's role is `"Auditor"` in `MEMBER_REGISTRY` — this is a frontend-only display decision, not a resolution of the `backend/config.py` `MEMBER_LABELS["paraparan"]` registry-data gap. Do not silently "fix" `config.py` to match without a separate, explicit task — CLAUDE.md's source-discipline rules apply to that HR/business-fact question.
- **Corrected §13**: a 401 and a genuine token change are now treated IDENTICALLY — both call the same central `resetWorkspaceState()` unconditionally via `reactToAuthChange()`. Do not reintroduce a null-vs-real-key branch that preserves employee selection on a 401.
- **Corrected §13**: `msc:close-toolbar-popovers` (fired by `navigation.js` on every panel activation, including leaving `#tab-review-summaries`) now calls the same central `resetWorkspaceState()` — full reset, including the employee selection, loaded history, and both filters. Do not reintroduce a partial reset (edit-state-only) for this event.
- `resetWorkspaceState()` (`web-view/js/review-summaries.js`) is the ONE reusable reset function — used by employee selection, token change, 401, and leaving the tab. Do not add a second, parallel reset path for any future trigger; extend this one function instead.

## 5. How to extend tests

Backend: add cases to `backend/tests/test_staff_review_summaries.py`, reusing `seed_staff`/`seed_summary` and `backend/tests/calendar_auth_test_support.py`'s shared harness — same convention as before, unchanged.

Frontend: add cases to `web-view/js/review-summaries.test.mjs` using `review-summaries-test-dom.mjs` (unchanged by this rewrite) + `installFakeBrowserGlobals({storedAuth, fetchImpl})` + a fresh cache-busted `import('./review-summaries.js?...')` per test — same convention as before. New helpers available: `fakeStaffRecord()`/`fakeSummaryRecord()` factory functions at the top of the test file, and the mounted API's `setReviewerFilter(value)` helper for driving the reviewer filter without simulating a raw `<select>` change event (a direct-DOM-event test is also included as a sanity check that the wiring itself works).

## 6. Verified this session (updated after §13's correction round)

- Baseline (before any code change): full backend suite → 628 total, 626 passed, 2 pre-existing failures (see §9); `review-summaries.test.mjs` → 53/53; full Calendar frontend suite → 179/179.
- Full suite (after the original implementation): `test_staff_review_summaries.py` targeted → 58/58; full backend suite → 638 total, 636 passed, same 2 pre-existing failures unchanged; `review-summaries.test.mjs` (rewritten) → 58/58; full Calendar frontend suite → 179/179 (zero regression); combined frontend run → 237/237.
- Full suite (after the §13 state-clearing correction round): `test_staff_review_summaries.py` targeted → 58/58 (unchanged, no backend file touched); full backend suite → 638 total, 636 passed, same 2 pre-existing failures unchanged; `review-summaries.test.mjs` (extended again) → 65/65; `navigation-structure.test.mjs` (new) → 16/16; full Calendar frontend suite → 179/179 (zero regression); combined frontend run → 260/260.
- Navigation/mount structure is now verified by a committed automated test (`web-view/js/navigation-structure.test.mjs`, 16 tests), superseding the original session's grep-only verification.

## 7. Reviewer routing

Per CLAUDE.md §18 and the approved design's §14 review-gate correction: business requirement approval is already complete (repository owner, this session and its two correction rounds); technical review is required for the API/navigation change; queryability review is required for the reviewer/reviewed-employee display design (including the Paraparan terminology decision); additional domain-member consultation (Mayurika, Suman, Arun, Rajiv, Paraparan individually) remains optional unless separately requested — not a mandatory gate.

## 8. Why AMBER, not a clean PASS

- Committed locally on `main` but **not pushed** to `origin/main` this session — explicit instruction: do not push until the user reviews the final implementation report.
- No live browser walkthrough was performed (no browser automation tool available in this environment) — coverage is HTTP-level (backend `TestClient`) and DOM-stand-in-level (frontend), matching this repo's established pattern for every prior Calendar feature.
- ~~No automated test harness exists in this repo for `index.html` markup structure~~ — **resolved in §13**: `navigation-structure.test.mjs` now provides real automated coverage.
- `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` §7's state-clearing table still describes the pre-correction behavior (401/tab-leave preserving employee selection) — out of scope to edit this round (only the two evidence files and the implementation were in scope); this handover and its companion validation report are the authoritative record of the current, corrected behavior.

## 9. Baseline failures (pre-existing, unrelated, unchanged)

1. `test_pending_task_no_outcome` (`test_weekly_schedule_xlsx_export.py`) — pre-existing, date-sensitive label mismatch, documented since 2026-07-29.
2. `test_missing_variable_fails_closed` (`test_calendar_auth.py`) — environment-specific (`.env` provides a value the test expects deleted), reproduces identically in isolation, unrelated to this feature.

## 10. Rollback

Nothing has been pushed, merged, or deployed — rollback is simply: do not push this state of local `main`. `origin/main` (`eaba628`) is completely unaffected. If these commits are later pushed and need reverting, `git revert` the relevant commit(s) — no schema/migration change accompanies this implementation, so no database-level rollback step is needed.

## 11. Commits (local `main`, not pushed)

See `git log` on `main` for this session's exact commit hash(es) — reported in the final report's commit-hash field.

## 12. One next step

~~Review this handover and the implementation evidence report; if approved, push local `main`...~~ **Superseded — see §13.** Two reported state-clearing deviations were corrected same-day, and automated navigation-structure test coverage was added.

## 13. State-clearing correction round — 2026-08-06 (same-day follow-up)

Full detail: `validation/calendar-review-summaries-dedicated-tab-implementation-check-2026-08-06.md`, "Correction — 2026-08-06 (state-clearing round 2)" section.

**Reported deviations**: the original implementation report stated a 401 preserves the selected employee, and leaving the dedicated tab preserves the selected employee and loaded history.

**Root cause**: both behaviors were deliberate implementation choices matching `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` §7 exactly as it read at the time (that table explicitly specified this "keep the selection" behavior) — not a coding defect against that document. This session's instruction established that the intended approved behavior is stricter: full clearing on all three triggers (authorization failure, token invalidation, leaving the tab).

**Fix**: replaced the prior three-way split (`clearWorkspaceState()`/`clearEmployeeDependentState()`/`onLeaveOrPanelSwitch()`'s partial logic) with one reusable `resetWorkspaceState()` in `web-view/js/review-summaries.js`, used by every trigger — employee selection, token change, 401, and leaving the tab. A 401 and a genuine token change are now handled identically. Leaving the tab now fully resets the workspace instead of only clearing edit state. The stored Calendar token is never touched by this function — only `handleUnauthorizedResponse()` clears it, only on a real 401 (confirmed by test: a 404 and an owner-only mutation denial never clear the token).

**New test file**: `web-view/js/navigation-structure.test.mjs` (16 tests) — parses the real `index.html` source (line-anchored top-level `.tab-panel` extraction) to prove sidebar heading/order, mount counts, and non-nesting as committed, repeatable coverage, replacing the original session's grep-only verification.

**Files changed this round**: `web-view/js/review-summaries.js`, `web-view/js/review-summaries.test.mjs` (65 tests, was 58), `web-view/js/navigation-structure.test.mjs` (new, 16 tests), plus this handover and its companion validation report. No backend file, schema, model, or migration was touched.

**Tests**: `test_staff_review_summaries.py` unchanged 58/58; full backend suite unchanged 638 total/636 passed (same 2 pre-existing failures); `review-summaries.test.mjs` 58 → 65; `navigation-structure.test.mjs` 0 → 16 (new); full Calendar frontend suite unchanged 179/179; combined frontend 237 → 260.

**Production data safety**: 0 database writes, 0 records changed — no database connection was used this round.

**Status**: AMBER — committed locally on `main`, not pushed, not deployed. All automated coverage passes; no real-browser walkthrough was performed this round (same tooling limitation documented throughout this feature's evidence trail).

## 14. One next step

Review this handover and the corrected implementation evidence report; if approved, push local `main` to `origin/main` (no force-push) and, separately, arrange a real-browser session to complete the walkthrough this session's tooling could not perform.
