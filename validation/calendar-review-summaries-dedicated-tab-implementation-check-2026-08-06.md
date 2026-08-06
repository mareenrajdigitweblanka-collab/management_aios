---
name: calendar-review-summaries-dedicated-tab-implementation-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-TAB-002
status: AMBER — fully implemented and tested locally on main, zero regressions, not pushed/deployed, no real-browser walkthrough performed
---

# Implementation Check — Calendar Review Summaries Dedicated Tab (2026-08-06)

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

Verified by direct grep of `web-view/index.html`: `review-summaries-instance` → 0 matches; `id="reviewSummariesWorkspace"` → 1 match; `data-tab="review-summaries"` → 1 match; `id="tab-review-summaries"` → 1 match. All 5 `.msc-instance` (Task/Leave/Calendar) mounts confirmed still present and untouched (5 matches).

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

## State clearing

| Trigger | Behavior | Verified by |
|---|---|---|
| Employee change | History, edit state, unsaved draft all cleared | `employee change clears history, edit state, and any unsaved draft` |
| Reviewer-filter change | Stale edit state cleared, re-fetch | `reviewer-filter change clears stale edit state` |
| Date-filter change | Re-fetch with new filters | `date filters are included in the list request` |
| Genuine token change (new/different member authorizes) | Full reset — history, edit state, **and employee selection** | `token change ... clears the employee selection and recalculates ownership on every visible card` |
| 401 mid-session | History/edit cleared, employee selection **preserved** (deliberate divergence from a genuine token change, distinguished via `getStoredMemberKey()` being null vs. a real key at event time) | `a 401 mid-session clears history/edit state but keeps the employee selection` |
| Leaving the dedicated tab / switching member panels | Edit state and any pending staff-search abort cleared; employee selection and loaded history **preserved** (deliberate change from the old 5-mount model, since identity no longer depends on which panel is active) | `leaving the dedicated tab ... preserves the employee selection and loaded history`, `switching member panels does not change the authenticated reviewer identity` |
| Stale in-flight response | Discarded via `historyRequestId`, never rendered | `stale in-flight response is ignored` |

## Reviewer name/role registry

New module `web-view/js/member-registry.js` exports `MEMBER_REGISTRY` (5 entries, `{displayName, role}`) and `resolveMember(memberKey)`. Values sourced from `backend/config.py`'s `MEMBER_LABELS` (split on `" — "`) for Mayurika/Suman/Arun/Rajiv; Paraparan's role is the deliberate `"Auditor"` exception, sourced from `web-view/index.html`'s pre-existing sidebar sub-label and Paraparan's own tab header — not invented, and not present in `backend/config.py` (a documented, unresolved registry-data gap, unchanged by this session per the approved design's explicit scope limit). Unknown/unrecognized `reviewer_member_key` values resolve to `{displayName: 'Unknown', role: 'Unknown'}` — confirmed by test, never a thrown error or fabricated value. No reviewer identity field was added to `StaffReviewSummaryOut`, `backend/schemas.py`, or any database table.

## Files changed

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

## Exact test totals

| Suite | Result |
|---|---|
| `backend/tests/test_staff_review_summaries.py` (targeted) | 58/58 passed (48 baseline + 10 new `include_all_reviewers` tests) |
| Full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) | 638 total, 636 passed, 2 failed — the same 2 pre-existing, unrelated, documented baseline failures (`test_missing_variable_fails_closed`, `test_pending_task_no_outcome`), unchanged |
| `web-view/js/review-summaries.test.mjs` (targeted, rewritten) | 58/58 passed |
| Full Calendar frontend suite (`web-view/js/calendar/*.test.mjs`) | 179/179 passed — zero regression |
| Combined frontend (`review-summaries.test.mjs` + `calendar/*.test.mjs`) | 237/237 passed |
| Navigation/markup-level tests | **No automated test harness exists in this repo** for `index.html` structure (no `navigation.test.mjs` precedent either) — mount counts and sidebar structure were verified by direct static grep inspection (documented above under "Mount counts" and "Navigation result"), not by an automated test |

## Production writes

0.

## Production records changed

0. No database connection was used this session — this is a pure application-code change against the already-migrated `management_aios.staff_review_summaries` table (unchanged schema).

## Real-browser status

**Not performed.** No browser automation tool is available in this environment — the same limitation documented throughout this repository's Calendar feature history (see `handover/2026-08-03__calendar-review-summaries-implementation-closure.md` §8/§17/§21/§25). No PASS is claimed for real-browser behavior.

## Known limitations

1. No live browser walkthrough was performed (tooling limitation, not a defect).
2. No automated test harness exists in this repo for `index.html` markup structure — navigation/mount-count verification is static (grep-based), not automated-test-based; this matches the repo's existing precedent (no `navigation.js` test file exists either).
3. `backend/config.py`'s `MEMBER_LABELS["paraparan"]` still carries no role — a pre-existing, documented registry-data gap versus the frontend's `MEMBER_REGISTRY` (§6.2 of the technical design). Fixing it is out of scope for this implementation (the approved design explicitly scoped it as a follow-up, not a blocker).
4. The 2 pre-existing backend baseline failures (`test_missing_variable_fails_closed`, `test_pending_task_no_outcome`) remain unresolved — confirmed unrelated to this feature, unchanged before and after this implementation.

## Protected path exclusion

`member-aios/mayurika-hr/staff-data/` was never opened, inspected, modified, staged, or committed at any point this session.

## PASS / AMBER / FAIL

**AMBER** — implementation is complete, matches the approved design with 0 known deviations, and all automated tests pass with 0 regressions (638 backend / 237 frontend, only the 2 pre-existing documented baseline failures present). AMBER rather than PASS because: not yet pushed or deployed (per explicit instruction, pending user review of this report) and no real-browser walkthrough was performed (tooling limitation).

## One next step

Review this implementation report; if approved, push local `main` to `origin/main` (no force-push) and, separately, arrange a real-browser session to complete the walkthrough this session could not perform.
