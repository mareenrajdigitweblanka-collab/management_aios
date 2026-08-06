---
name: calendar-review-summaries-dedicated-tab-implementation-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-TAB-002
status: AMBER — fully implemented and tested locally on main, zero regressions, not pushed/deployed, no real-browser walkthrough performed. State-clearing deviations (401/tab-leave) corrected same-day — see "Correction — 2026-08-06 (state-clearing round 2)".
---

# Implementation Check — Calendar Review Summaries Dedicated Tab (2026-08-06)

> **Correction note:** This report was originally written describing a 401 and a tab-leave event as preserving the selected employee/history. That matched `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` §7 as it read at the time, but was identified as a deviation from the intended approved behavior and corrected same-day. See "Correction — 2026-08-06 (state-clearing round 2)" below for the full before/after. The "State clearing" table and "Exact test totals" section further down have been updated in place to describe the corrected, current behavior.

## Requirement ID

REQ-CAL-REV-TAB-002.

## Design source files (implementation truth for this session)

- `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md`
- `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md`
- `validation/calendar-review-summaries-dedicated-tab-design-check-2026-08-06.md`
- Approved design commit: `eaba628` — "Clarify Review Summary reviewer role display."

## Implementation purpose

Consolidate the 5 embedded per-member Review Summaries mounts (REQ-CAL-REV-001) into 1 new, independent dedicated sidebar tab, with reviewer identity always derived from the authenticated Calendar token, an additive backend read parameter for the "All reviewers" default, and a client-side member registry resolving each card's reviewer display name and role (never a combined string, never a backend field, never stored in the database).

## Navigation result

Sidebar heading `DATA` → `STAFF` (confirmed: `web-view/index.html:207`, `<div class="app-sidebar-title">Staff</div>`). Nav item `Staff Data` → `Data` label, `data-tab="staff-data"` unchanged. New `Review Summaries` nav button (`data-tab="review-summaries"`) added immediately after Data, inside the same `.app-sidebar-group`. Final order: STAFF › Data › Review Summaries.

## Mount counts

| Location | Count |
|---|---|
| Mayurika panel (`#tab-mayurika-hr`) | 0 |
| Suman panel (`#tab-suman-recruitment`) | 0 |
| Arun panel (`#tab-arun-implementation`) | 0 |
| Rajiv panel (`#tab-rajiv-blocked`) | 0 |
| Paraparan panel (`#tab-paraparan`) | 0 |
| Dedicated panel (`#tab-review-summaries` → `#reviewSummariesWorkspace`) | 1 |
| **Total** | **1** |

Originally verified by direct grep of `web-view/index.html` only. **Now also verified by an automated test**: `web-view/js/navigation-structure.test.mjs` (new, 16 tests) — parses the real `index.html` source (line-anchored top-level `.tab-panel` extraction, not a synthetic DOM stand-in) and asserts, as committed, repeatable coverage: 0 `.review-summaries-instance` matches; exactly 1 `#reviewSummariesWorkspace`; exactly 1 `data-tab="review-summaries"`; exactly 1 `#tab-review-summaries`; the dedicated panel is a true top-level sibling of, not nested inside, each of the 5 member panels; all 5 `.msc-instance` mounts still present.

## Token/reviewer identity

`web-view/js/review-summaries.js`'s `workspaceAccessDecision()`/`currentAccess()` derive the reviewer solely from `calendar/auth.js`'s `getStoredMemberKey()` — never from a member panel, the reviewer filter, the selected employee, or the request body. `POST` body still contains only `reviewed_staff_id`/`meeting_date`/`summary_text` — `reviewer_member_key` has no field on `StaffReviewSummaryCreate` (backend unchanged) and is confirmed absent from every request body in tests.

## Employee selection

Staff-search selection sets `state.selectedStaff`; `reviewed_staff_id = state.selectedStaff.id` at every request (unchanged pattern from REQ-CAL-REV-001, reused verbatim). No history/list request fires until an employee is selected (confirmed by test: zero `staff-review-summaries` fetch calls before selection).

## All-reviewer API behavior

`GET /api/staff-review-summaries` gained one additive, opt-in `include_all_reviewers: bool = Query(default=False)` parameter (`backend/routers/staff_review_summaries.py`). When `true`: requires `reviewed_staff_id` (422 otherwise), forbids combining with `reviewer_member_key` (422 otherwise), drops the `reviewer_member_key` filter entirely, still excludes `deleted_at IS NOT NULL`, still applies `date_from`/`date_to`, still orders `meeting_date DESC, created_at DESC`. When omitted or `false` (default): the existing single-reviewer branch is byte-for-byte unchanged, including the omitted-`reviewer_member_key`-defaults-to-self case (`test_reviewer_member_key_omitted_defaults_to_authenticated_reviewer` still passes unmodified). Frontend default request (employee selected, no reviewer filter): `reviewed_staff_id=<uuid>&include_all_reviewers=true`, `reviewer_member_key` omitted.

## Reviewer-filter behavior

Selecting a specific reviewer sends `reviewer_member_key=<key>` and omits `include_all_reviewers` entirely (`buildListQuery()` enforces this mutual exclusivity itself, not just at each call site). Confirmed via both the exported `setReviewerFilter()` test helper and a real `<select>` `change` event test.

## Ownership rules

Unchanged at the backend: `CREATE` — server-derived only; `DETAIL` — shared read, any authenticated member; `UPDATE`/`DELETE` — owner-only via `_get_owned_summary_or_404`, cross-reviewer returns non-disclosing 404. Frontend: `isOwnedRecord(record, authenticatedMemberKey)` is evaluated **per rendered card**, not once per panel — Edit/Delete render only on cards where `record.reviewer_member_key === getStoredMemberKey()`; non-owned cards render fully (read-only) with no mutation controls.

## State clearing (corrected — see round-2 correction section below)

All triggers now route through one central `resetWorkspaceState()` (`web-view/js/review-summaries.js`) — no partial/duplicated reset paths remain.

| Trigger | Behavior | Verified by |
|---|---|---|
| Employee change (including a fresh selection) | Full reset — history, edit/draft state, reviewer filter (back to "All reviewers"), and date filters all cleared before the new employee is set | `employee change clears history, edit state, and any unsaved draft` |
| Reviewer-filter change | Stale edit state cleared, re-fetch | `reviewer-filter change clears stale edit state` |
| Date-filter change | Re-fetch with new filters | `date filters are included in the list request` |
| Genuine token change (new/different member authorizes) | Full reset — history, edit state, employee selection, reviewer/date filters; does **not** auto-reload the old employee under the new identity | `token change (a different member authorizes) clears the previous employee/history and does not auto-reload it under the new identity` |
| 401 mid-session | **Full reset** — employee selection, history, edit state, and any unsaved draft are all cleared, identical to a genuine token change (corrected 2026-08-06 — previously preserved the employee selection) | `a 401 mid-session fully resets the workspace...`, `a 401 while a draft is unsaved clears that draft`, `a 401 invalidates a stale in-flight history response...` |
| Leaving the dedicated tab | **Full reset** — employee selection, history, edit state, draft, and reviewer/date filters all cleared; returning later sends zero history requests until a new employee is selected; the stored token is untouched (corrected 2026-08-06 — previously only cleared edit state) | `leaving the dedicated tab (panel-switch event) fully resets the workspace...`, `returning to the tab after leaving sends zero history requests...`, `a valid token remains stored after ordinary tab navigation...` |
| 404 / owner-only mutation denial | Never clears the stored token — only a real 401 does | `a 404 (cross-reviewer/nonexistent record) does not clear the valid token`, `an owner-only mutation denial ... does not clear the valid token`, `clicking Delete alone (before confirmation) never touches the stored token` |
| Stale in-flight response | Discarded via `historyRequestId`, never rendered, including one arriving after a 401 reset | `stale in-flight response is ignored`, `a 401 invalidates a stale in-flight history response` |

## Reviewer name/role registry

New module `web-view/js/member-registry.js` exports `MEMBER_REGISTRY` (5 entries, `{displayName, role}`) and `resolveMember(memberKey)`. Values sourced from `backend/config.py`'s `MEMBER_LABELS` (split on `" — "`) for Mayurika/Suman/Arun/Rajiv; Paraparan's role is the deliberate `"Auditor"` exception, sourced from `web-view/index.html`'s pre-existing sidebar sub-label and Paraparan's own tab header — not invented, and not present in `backend/config.py` (a documented, unresolved registry-data gap, unchanged by this session per the approved design's explicit scope limit). Unknown/unrecognized `reviewer_member_key` values resolve to `{displayName: 'Unknown', role: 'Unknown'}` — confirmed by test, never a thrown error or fabricated value. No reviewer identity field was added to `StaffReviewSummaryOut`, `backend/schemas.py`, or any database table.

## Correction — 2026-08-06 (state-clearing round 2)

### Reported deviations

The original implementation report stated: a 401 preserves the selected employee; leaving the dedicated tab preserves the selected employee and loaded history.

### Approved design behavior (as directed for this correction)

Review Summary workspace state must clear on: authorization failure; token invalidation; leaving the dedicated Review Summaries tab.

### Root cause

Both behaviors were **deliberate implementation choices that matched `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` §7 exactly as it read at the time** (the table there explicitly said "keeps employee selection" for a 401 and "employee selection and loaded history remain valid" for leaving the tab) — not a coding defect against that document. Specifically:
- `reactToAuthChange()` branched on whether `getStoredMemberKey()` was `null` (a 401 clear, since `handleUnauthorizedResponse()` clears the token before dispatching `CALENDAR_AUTH_CHANGED_EVENT`) vs. a real key (a genuine token change) — the `null` branch deliberately skipped `deselectStaff()`.
- `onLeaveOrPanelSwitch()` (bound to `navigation.js`'s `msc:close-toolbar-popovers` event) deliberately called only `exitEditMode()`, never touching `state.selectedStaff`, the reviewer filter, or date filters.

This session's explicit instruction established that the intended approved behavior is stricter than what that design table stated — full clearing on all three triggers. The technical design document itself was left unmodified per this correction task's explicit file scope (only the two evidence files and the implementation were in scope); this evidence report is the authoritative record of the corrected, current behavior.

### Central reset implementation

Replaced the prior three-way split (`clearWorkspaceState()` / `clearEmployeeDependentState()` / `onLeaveOrPanelSwitch()`'s partial logic) with **one** reusable `resetWorkspaceState()` function (`web-view/js/review-summaries.js`), used by every trigger: a fresh employee selection, a genuine token change, a 401, and leaving the tab. It clears: the selected employee (`deselectStaff()`); loaded history; edit/draft state (`exitEditMode()` — editing id, draft summary/date text, field errors); the reviewer filter (reset to `''`/"All reviewers"); both date filters; aborts any pending staff-search request; and bumps `historyRequestId` so an already-in-flight response from before the reset can never repopulate the just-cleared state. It never touches the stored Calendar token — that remains exclusively `handleUnauthorizedResponse()`'s job, invoked only on a genuine 401 inside `reviewSummariesApiRequest()`.

### 401 result

A 401 now calls `resetWorkspaceState()` (via `reactToAuthChange()`, unconditionally — the `null`/real-key branch was removed) before rendering the unauthorized gate. Confirmed by test: employee selection cleared, history cleared, edit state cleared, unsaved draft cleared, and a response that resolves after the 401 fired is discarded rather than repopulating state. Invalid-token startup behaves identically, since the same `reviewSummariesApiRequest()` 401 path handles a 401 regardless of when it occurs (initial mount-time fetch or a later request) — no special-casing exists or is needed. A 404 and an owner-only mutation denial (the same non-disclosing 404 the backend has always returned for a cross-reviewer PUT/DELETE) are confirmed, by test, to never clear the token — only `res.status === 401` does.

### Tab-leave result

Leaving `#tab-review-summaries` (any `msc:close-toolbar-popovers` dispatch) now calls `resetWorkspaceState()` and re-renders the history panel's placeholder. Confirmed by test: no employee selected, no history visible, no edit/draft state, reviewer filter back to "All reviewers", date filters cleared, the "select a staff member" instruction shows, and returning to the tab afterward sends zero history requests until a new employee is selected. The stored Calendar token is confirmed untouched by this event — ordinary navigation is not an authorization event.

### Token-change result

A genuine token change (a new/different member successfully authorizes) also now goes through the same `resetWorkspaceState()` — behavior unchanged from the original implementation in substance (full clear, including employee selection), but now implemented via the single shared function instead of a separate `clearWorkspaceState()`. Additionally confirmed by a new test: the newly-authorized identity does not automatically re-fetch or reload the previous employee's history — no new list request fires until a fresh employee is selected.

### Stale-response result

Every reset (401, tab-leave, token change, employee change) bumps `state.historyRequestId`, so any response already in flight from before the reset — including one that resolves only after a 401 has fired — is discarded on arrival and never rendered. Confirmed by two tests: the pre-existing generic stale-response test, and a new test specific to the 401 case.

### Navigation automated-test result

New `web-view/js/navigation-structure.test.mjs` (16 tests) — parses the real `web-view/index.html` source via a line-anchored top-level `.tab-panel` extraction (not a synthetic DOM stand-in, not ad hoc shell grep) and proves, as committed test coverage: sidebar heading is "Staff"; the Data label; Review Summaries immediately follows Data with nothing between them; Data precedes Review Summaries; exactly one Review Summaries nav item targeting `review-summaries`; exactly one `#tab-review-summaries` panel; exactly one `#reviewSummariesWorkspace` mount; zero `.review-summaries-instance` mounts anywhere; zero Review Summary mounts inside each of the 5 member panels individually; the dedicated panel is a genuine top-level sibling, not a descendant, of any member panel; all 5 `.msc-instance` Calendar mounts remain present. This replaces the prior "grep only" verification with real, repeatable automated coverage.

## Files changed (as of the original 2026-08-06 implementation)

### Created (3)
- `web-view/js/member-registry.js`
- `validation/calendar-review-summaries-dedicated-tab-implementation-check-2026-08-06.md` (this file)
- `handover/2026-08-06__calendar-review-summaries-dedicated-tab-implementation-closure.md`

### Modified (6)
- `web-view/index.html` — sidebar heading/label, new nav button + panel, 5 mount removals
- `web-view/js/review-summaries.js` — full rewrite for the single dedicated workspace model
- `web-view/js/review-summaries.test.mjs` — full rewrite (58 tests, up from 53)
- `web-view/css/review-summaries.css` — `.review-summaries-instance` → `.review-summaries-workspace`, new card/reviewer-select rules, removed now-unused read-only-note rule
- `backend/routers/staff_review_summaries.py` — additive `include_all_reviewers` branch on LIST only
- `backend/tests/test_staff_review_summaries.py` — 10 new tests (48 → 58)

### Confirmed unchanged (per approved design)
`web-view/js/app.js` (export name `initReviewSummaries` unchanged — no call-site edit needed), `web-view/js/navigation.js`, `web-view/js/config.js`, `backend/schemas.py`, `backend/models.py`, `backend/main.py`, `backend/config.py`, any database/migration file, `member-aios/mayurika-hr/staff-data/`.

### Additional files changed in the same-day state-clearing correction round — see full detail below
- `web-view/js/review-summaries.js` — modified again (central `resetWorkspaceState()`)
- `web-view/js/review-summaries.test.mjs` — modified again (65 tests, up from 58)
- `web-view/js/navigation-structure.test.mjs` — **new** (16 tests)

## Exact test totals (current, after the state-clearing correction round)

| Suite | Result |
|---|---|
| `backend/tests/test_staff_review_summaries.py` (targeted) | 58/58 passed (unchanged — no backend file touched in the correction round) |
| Full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) | 638 total, 636 passed, 2 failed — the same 2 pre-existing, unrelated, documented baseline failures (`test_missing_variable_fails_closed`, `test_pending_task_no_outcome`), unchanged |
| `web-view/js/review-summaries.test.mjs` (targeted, rewritten again) | 65/65 passed (was 58; +7 net: 2 rewritten + 11 new − 6 superseded, see correction section) |
| `web-view/js/navigation-structure.test.mjs` (new) | 16/16 passed |
| Full Calendar frontend suite (`web-view/js/calendar/*.test.mjs`) | 179/179 passed — zero regression |
| Combined frontend (`review-summaries.test.mjs` + `navigation-structure.test.mjs` + `calendar/*.test.mjs`) | 260/260 passed |

## Database/schema changes

0. No migration, model, or schema file was touched in either the original implementation or this correction round.

## Production writes

0.

## Production records changed

0. No database connection was used this session — this is a pure application-code change against the already-migrated `management_aios.staff_review_summaries` table (unchanged schema).

## Real-browser status

**Not performed.** No browser automation tool is available in this environment — the same limitation documented throughout this repository's Calendar feature history (see `handover/2026-08-03__calendar-review-summaries-implementation-closure.md` §8/§17/§21/§25). No PASS is claimed for real-browser behavior.

## Known limitations

1. No live browser walkthrough was performed (tooling limitation, not a defect).
2. ~~No automated test harness exists in this repo for `index.html` markup structure~~ — **resolved this correction round**: `web-view/js/navigation-structure.test.mjs` (16 tests) now provides real, committed automated coverage for the navigation/mount-count facts, superseding the prior grep-only verification.
3. `backend/config.py`'s `MEMBER_LABELS["paraparan"]` still carries no role — a pre-existing, documented registry-data gap versus the frontend's `MEMBER_REGISTRY` (§6.2 of the technical design). Fixing it is out of scope for this implementation (the approved design explicitly scoped it as a follow-up, not a blocker).
4. The 2 pre-existing backend baseline failures (`test_missing_variable_fails_closed`, `test_pending_task_no_outcome`) remain unresolved — confirmed unrelated to this feature, unchanged before and after this implementation.
5. `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` §7's state-clearing table was not updated to match the corrected behavior (out of scope for this correction round — only the two evidence files and the implementation were in scope). This evidence report is the authoritative record of the current, corrected behavior; the design document's §7 table is stale on this one point.
6. `ui/dialog.js`'s `confirmDestructive()` delete-confirmation dialog is not driven end-to-end by this test harness (a pre-existing, documented coverage boundary carried forward from REQ-CAL-REV-001) — a concurrent auth event while that dialog happens to be open is not exercised by an automated test, though `resetWorkspaceState()`'s complete rebuild of the history list on every render means any such dialog would reference DOM/state that no longer exists by the time it could act.

## Protected path exclusion

`member-aios/mayurika-hr/staff-data/` was never opened, inspected, modified, staged, or committed at any point this session.

## PASS / AMBER / FAIL

**AMBER** — the reported state-clearing deviations (401 and tab-leave preserving the employee selection/history) are corrected: all three required triggers (authorization failure, token invalidation, leaving the dedicated tab) now fully reset the workspace through one central `resetWorkspaceState()`, and navigation structure now has real automated test coverage (16 tests) rather than grep-only verification. All automated tests pass with 0 regressions (638 backend / 260 frontend, only the 2 pre-existing documented baseline failures present). AMBER rather than PASS because: not yet pushed or deployed (per explicit instruction, pending user review of this report) and no real-browser walkthrough was performed (tooling limitation).

## One next step

Review this corrected implementation report; if approved, push local `main` to `origin/main` (no force-push) and, separately, arrange a real-browser session to complete the walkthrough this session could not perform.
