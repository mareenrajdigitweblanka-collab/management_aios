---
Project Name: MD Read-Only Review Summary Authorization
Start Date: 2026-08-06
Expected Deadline: 2026-08-06
User / Stakeholder: Mareenraj (builder), Managing Director (MD), Management Team
Company Value Contribution: Verifies MD's read-only access was implemented with zero write/Calendar/Task/Leave/Staff-Data capability and zero regression to the existing five-member Review Summary model.
MVP Submission Date: 2026-08-06
Project Owner: Mareenraj
Status: PASS
---

# MD Read-Only Review Summary Authorization — Implementation Check — 2026-08-06

**Requirement ID:** REQ-CAL-REV-MD-READ-006. Requirement: `docs/2026-08-06_md-read-only-review-summary-requirement.md`. Design: `docs/2026-08-06_md-read-only-review-summary-technical-design.md`.

## 1. Repository gate (Phase 1)

- Starting branch: `main`. Starting local HEAD: `0ded938`. `origin/main`: `157a594`.
- Divergence: local **0 behind, 2 ahead** of `origin/main` (commits `0ded938`, `989b1b4`) — safe to continue per instruction.
- Pre-existing relevant working-tree state found before this task began: `.env.example` already had an uncommitted `CALENDAR_AUTH_TOKEN_HASH_MD=set_a_real_token_hash_here` line (inert breadcrumb from an earlier session, not wired into `backend/config.py` at the time) — reused, not overwritten.
- Pre-existing unrelated untracked file: `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` — never opened or modified by this task.
- Protected path `member-aios/mayurika-hr/staff-data/` — confirmed present, never opened or modified.

## 2. No real secret committed

`git diff`/`grep` confirmed every `CALENDAR_AUTH_TOKEN_HASH_MD` occurrence in tracked files is the placeholder `set_a_real_token_hash_here` (`.env.example`) or the literal string `<set-in-deployment-environment>` inside a code comment/doc (never assigned as a real value). Test-only tokens (`backend/tests/calendar_auth_test_support.py`'s `MD_TEST_TOKEN`) are fixed, clearly-labeled fake strings, used nowhere outside the test suite, exactly matching the existing convention for the five real members' own `TEST_TOKENS`.

## 3. Backend — automated tests

New file: `backend/tests/test_md_review_summary_authorization.py` — 32 tests, all pass:

| Class | Tests | Covers |
|---|---|---|
| `MdAuthenticationTests` | 5 | configured-token authenticates, invalid token fails, missing env var fails closed, placeholder value rejected, existing 5 tokens unaffected by MD's presence |
| `MdReadAccessTests` | 8 | LIST, DETAIL, all-reviewers mode, specific-reviewer filter, From/To filters, PDF export, soft-deleted rows stay hidden, minimal employee lookup |
| `MdWriteProhibitionTests` | 6 | CREATE rejected, UPDATE rejected, no reviewer_member_key spoof possible, cross-reviewer update still rejected, DELETE unchanged (409 for everyone), zero row changes after all three prohibited requests |
| `MdUnrelatedPermissionsTests` | 8 | Task create (own key 404, real-member key 403), Task update/delete (403), Task bulk create (403), Leave create/update/delete (403), no-Admin-override-exists confirmation, zero additional Staff Data scope vs. an anonymous request |
| `MdTokenHashLoaderTests` | 5 | direct unit coverage of `load_md_review_summary_token_hash`'s absent/blank/placeholder/malformed/valid-uppercase-normalized cases |

Modified: `backend/tests/test_review_summary_pdf_export.py` — `test_frontend_registry_consistency_where_practical` updated to exclude `"md"` from the 5-reviewer parity check (it is a display-only identity, never a reviewer); one new test added, `test_frontend_registry_includes_md_as_display_only_entry`, confirming MD's frontend registry entry exists and is absent from the backend's `MEMBER_DIRECTORY`.

Modified: `backend/tests/calendar_auth_test_support.py` — added `MD_TEST_TOKEN`, `include_md` opt-in parameter on `test_token_env`/`patched_calendar_auth_env` (default `False`, so every pre-existing call site is byte-for-byte unaffected), and `bearer_header("md")` support.

### Full backend suite

```text
Ran 809 tests in 9.2s
FAILED (failures=2)
```

Both failures are **pre-existing and unrelated**, confirmed identical on the clean pre-task baseline via `git stash`:
- `test_calendar_auth.StartupConfigurationValidationTests.test_missing_variable_fails_closed` — fails on this machine because a real `.env` file (not tracked, not `.env.example`) has `CALENDAR_AUTH_TOKEN_HASH_PARAPARAN` set in the ambient OS environment, and the test's `mock.patch.dict(..., clear=False)` cannot delete a key already present outside the patched dict. Reproduced identically before any of this session's changes.
- `test_weekly_schedule_xlsx_export.TaskRowTests.test_pending_task_no_outcome` — an unrelated pre-existing assertion mismatch (`'No response' != 'Pending'`), also reproduced identically on the clean baseline.

Net: **807/809 pass, 0 regressions.**

## 4. Frontend — automated tests

New/extended:
- `web-view/js/review-summaries.test.mjs` — 8 new MD-specific tests (banner text, authorized-access reached, MD absent from reviewer-filter options, form hidden + read-only notice shown before/after staff selection, no Edit button + per-card MD notice text, PDF download still works with the existing authorized fetch pattern and `Authorization` header, token-swap normal-member→MD switches the form to the notice, token-swap MD→normal-member restores the form).
- `web-view/js/calendar/auth.test.mjs` — 2 new tests (topbar banner reads "Authorized as: MD — Read-only" with **no** `.msc-instance` markup mounted for `md`; `labelForMemberKey("md")` returns the special-cased label directly rather than falling back to the raw key).

```text
review-summaries.test.mjs : 123 tests, 123 pass
calendar/auth.test.mjs    :  39 tests,  39 pass
calendar/*.test.mjs (all) : 181 tests, 181 pass
navigation-structure.test.mjs: 16 tests, 16 pass
Combined (*.test.mjs + calendar/*.test.mjs): 320 tests, 320 pass, 0 fail
```

Navigation tests pass unmodified — `web-view/index.html` was not touched by this task (no new tab, no new markup; the read-only notice is built entirely in JS via `el()`/`appendChild`, same convention as every other element in this module).

## 5. Manual/structural verification

- `VALID_MEMBER_KEYS` still exactly `("mayurika", "suman", "arun", "rajiv", "paraparan")` — confirmed by the existing `test_member_directory_has_exactly_five_known_entries` (unmodified, still passes) plus the new `test_md_cannot_gain_admin_only_authority` (`assertNotIn(MD_MEMBER_KEY, VALID_MEMBER_KEYS)`).
- `MEMBER_DIRECTORY`/`MEMBER_LABELS` unmodified — same test, plus `test_frontend_registry_includes_md_as_display_only_entry`'s `assertNotIn("md", MEMBER_DIRECTORY)`.
- `database/staff_review_summaries_schema.sql` and `backend/models.py` — confirmed unmodified via `git diff --stat` (absent from the changed-files list).
- No `Delete` control exists anywhere in the Review Summaries UI for any identity, MD included (REQ-CAL-REV-LOCK-004, pre-existing, unchanged).

## 6. Database/production safety

- Database/schema changes: **0**.
- Migrations: **0**.
- Production writes performed by this implementation: **0** (every test ran against isolated in-memory SQLite; no `DATABASE_URL`/production connection was used at any point).
- Production records changed: **0**.
- No MD database user, staff record, reviewer row, capability column, permission table, or token table was added anywhere.

## 7. Git

`git status --short` / `git diff --stat` / `git diff --check` all confirmed clean scope — see `handover/2026-08-06__md-read-only-review-summary-closure.md` for the exact file list and commit hash. **Not pushed** — awaiting review per instruction.

## 8. Verdict

**PASS.** All new MD-specific tests pass (32 backend + 10 frontend = 42 new tests); zero regressions to the existing five-member model (807/809 backend, both remaining failures pre-existing and unrelated; 320/320 frontend); zero database/schema/production changes; no real token or hash present anywhere in tracked files.
