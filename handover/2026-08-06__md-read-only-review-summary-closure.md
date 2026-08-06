---
name: md-read-only-review-summary-handover
type: handover
scope: management_aios — MD Read-Only Review Summary Authorization (REQ-CAL-REV-MD-READ-006)
created: 2026-08-06
status: Implemented directly on local `main`, all new/targeted tests pass, zero regressions, zero schema/database changes, zero production writes — committed locally, NOT pushed (awaiting implementation report review per instruction)
owner: builder (Mareenraj)
reviewer: pending
---

# MD Read-Only Review Summary Authorization — Implementation Handover — 2026-08-06

## 1. What this task was

Implemented REQ-CAL-REV-MD-READ-006 directly on local `main`, per explicit instruction. Requirement: `docs/2026-08-06_md-read-only-review-summary-requirement.md`. Design: `docs/2026-08-06_md-read-only-review-summary-technical-design.md`. Full evidence: `validation/md-read-only-review-summary-check-2026-08-06.md`.

Gave the Managing Director (MD) a separate, read-only authenticated identity for the Review Summaries feature — able to list/read/filter/export Review Summary history exactly like any Management Team member, but structurally unable to create, edit, or delete a Review Summary, and structurally unable to gain any Calendar/Task/Leave/Staff-Data mutation capability. MD is deliberately kept OUT of the five-member `VALID_MEMBER_KEYS`/`CALENDAR_AUTH_TOKEN_ENV_VARS`/`MEMBER_DIRECTORY` registries that gate Task/Leave ownership and the Review Summary `reviewer_member_key` DB CHECK constraint — see the technical design's §2 for why Option C (adding MD to the global member-key list) was rejected outright.

## 2. Files created

| File | Purpose |
|---|---|
| `backend/tests/test_md_review_summary_authorization.py` | 32 HTTP-level tests: MD authentication (5), read access (8), write prohibition (6), unrelated-permission blocking (8), token-hash loader unit tests (5) |
| `docs/2026-08-06_md-read-only-review-summary-requirement.md` | Requirement doc |
| `docs/2026-08-06_md-read-only-review-summary-technical-design.md` | Technical design |
| `validation/md-read-only-review-summary-check-2026-08-06.md` | Full implementation evidence, exact test totals, PASS verdict |
| `handover/2026-08-06__md-read-only-review-summary-closure.md` | This file |

## 3. Files modified

| File | Change |
|---|---|
| `.env.example` | `CALENDAR_AUTH_TOKEN_HASH_MD` documented as its own OPTIONAL variable, separate paragraph explaining absent/placeholder = MD unavailable, five-member paragraph above it left unchanged |
| `backend/config.py` | Added `MD_MEMBER_KEY`, `MD_DISPLAY_LABEL`, `MD_CALENDAR_AUTH_TOKEN_ENV_VAR`, `_MD_TOKEN_PLACEHOLDER_VALUES`, `load_md_review_summary_token_hash()` (never-raises optional loader), `member_display_label()` (safe label resolver for both the 5 members and MD). `VALID_MEMBER_KEYS`/`CALENDAR_AUTH_TOKEN_ENV_VARS`/`MEMBER_DIRECTORY`/`MEMBER_LABELS` all byte-for-byte unchanged |
| `backend/routers/calendar_auth.py` | `validate_calendar_auth_token` now folds MD's hash into the same comparison dict as the five real hashes (only when configured and non-colliding); `require_matching_member` and `POST /verify` use the new `member_display_label()` instead of a raw `MEMBER_LABELS[...]` lookup (which would `KeyError` for `"md"`) |
| `backend/routers/staff_review_summaries.py` | Added `_reject_md_write(acting_member)`, called first in CREATE and UPDATE (403 `review_summary_read_only_member` before any DB access). LIST/DETAIL/PDF export/DELETE unchanged — all already worked for MD once it's a valid `get_verified_member` identity |
| `backend/tests/calendar_auth_test_support.py` | Added `MD_TEST_TOKEN`; `test_token_env`/`patched_calendar_auth_env` gained an `include_md` opt-in parameter (default `False` — every pre-existing call site unaffected); `bearer_header("md")` support |
| `backend/tests/test_review_summary_pdf_export.py` | `test_frontend_registry_consistency_where_practical` now excludes `"md"` from the 5-reviewer parity check; added `test_frontend_registry_includes_md_as_display_only_entry` |
| `web-view/js/member-registry.js` | Added `MD_MEMBER_KEY`, one display-only `md` entry in `MEMBER_REGISTRY`, derived `MD_DISPLAY_LABEL`, `isReadOnlyMember()` (UI-only convenience) |
| `web-view/js/calendar/auth.js` | `labelForMemberKey` special-cases `"md"` before its usual DOM lookup (MD has no `.msc-instance` Calendar tab to look up) |
| `web-view/js/review-summaries.js` | `REVIEWER_FILTER_ORDER` comment-only (still exactly the 5 real keys); `updateFormVisibility()` hides the Add/Edit form and shows a new read-only notice for MD; each history card gets one additional MD-only explanatory line, appended after (never replacing) the existing per-record status message |
| `web-view/css/review-summaries.css` | Added `.review-summaries-readonly-notice` and `.review-summaries-card-md-notice` styles |
| `web-view/js/review-summaries.test.mjs` | 8 new MD-specific tests |
| `web-view/js/calendar/auth.test.mjs` | 2 new MD-specific tests |

No file under `member-aios/mayurika-hr/staff-data/` (protected) was opened or touched. `backend/models.py`, everything under `database/`, and `web-view/index.html` are unmodified — confirmed by `git diff --stat`. `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` (pre-existing, unrelated) was not opened, modified, or staged.

## 4. Authoritative pattern — do not duplicate

- `validate_calendar_auth_token` (`calendar_auth.py`) is the ONE token-comparison function — MD's hash is folded into its existing loop, never a second/parallel resolver. Do not add a separate MD-only auth dependency function.
- `_reject_md_write()` (`staff_review_summaries.py`) is the ONE MD-write guard — called first in both CREATE and UPDATE. If a future write route is added to this router, call it there too.
- MD must NEVER be added to `VALID_MEMBER_KEYS`, `CALENDAR_AUTH_TOKEN_ENV_VARS`, or `MEMBER_DIRECTORY` — doing so would let an MD token own a Task/Leave record under its own key (`require_matching_member` has no bypass) or become a valid Review Summary reviewer. If MD ever needs elevated capability, model it as an explicit new check, not by joining these five-member structures.
- `member_display_label()` is the ONE display-label resolver that's safe for both the five members and MD — do not reintroduce a raw `MEMBER_LABELS[member_key]` lookup on a code path MD's token can reach.
- `member-registry.js`'s `MEMBER_REGISTRY` (display identities) and `review-summaries.js`'s `REVIEWER_FILTER_ORDER` (reviewer-selection identities) are two intentionally separate lists — MD belongs only in the former. Do not merge them.

## 5. How to extend tests

Backend: MD-specific authorization cases go in `backend/tests/test_md_review_summary_authorization.py`, reusing its `MdAuthorizationTestCase` base (mirrors `test_staff_review_summaries.py`/`test_calendar_mutation_authorization.py`'s own seed helpers). Frontend: `web-view/js/review-summaries.test.mjs` (workspace behavior) and `web-view/js/calendar/auth.test.mjs` (topbar banner), both using `storedAuth: {token, memberKey: 'md'}` via `installFakeBrowserGlobals`.

## 6. Verification summary

See `validation/md-read-only-review-summary-check-2026-08-06.md` for full detail. Headline: 809 backend tests (807 pass, 2 pre-existing/unrelated failures confirmed identical on the clean pre-task baseline via `git stash`), 320/320 frontend tests (123 review-summaries + 181 calendar incl. auth + 16 navigation). 32 new backend tests, 10 new frontend tests, all pass. Zero schema changes. Zero production writes.

## 7. Git

Starting branch/HEAD: `main` @ `0ded938`, 2 commits ahead of `origin/main` (`157a594`) — origin did not independently advance during this session.

Staged and committed **exact paths only** (never `git add -A`/`git add .`):

```text
.env.example
backend/config.py
backend/routers/calendar_auth.py
backend/routers/staff_review_summaries.py
backend/tests/calendar_auth_test_support.py
backend/tests/test_md_review_summary_authorization.py
backend/tests/test_review_summary_pdf_export.py
docs/2026-08-06_md-read-only-review-summary-requirement.md
docs/2026-08-06_md-read-only-review-summary-technical-design.md
validation/md-read-only-review-summary-check-2026-08-06.md
handover/2026-08-06__md-read-only-review-summary-closure.md
web-view/css/review-summaries.css
web-view/js/calendar/auth.js
web-view/js/calendar/auth.test.mjs
web-view/js/member-registry.js
web-view/js/review-summaries.js
web-view/js/review-summaries.test.mjs
```

Commit message: `Add MD read-only Review Summary access`. Commit hash recorded in a same-day follow-up commit to this file (matching this repo's own established convention — see `157a594 Record commit hash in Review Summary edit-lock handover`).

**Push status: NOT pushed.** Per explicit instruction, this implementation report must be reviewed before any push.

## 8. Manual verification (for a human, before/after any future deployment)

No token should ever be typed into chat, committed, or shared with the assistant. Before this can be used in production:

1. Generate a real MD token out-of-band, hash it (`python -c "import hashlib; print(hashlib.sha256(b'REPLACE_WITH_REAL_TOKEN').hexdigest())"`), and set `CALENDAR_AUTH_TOKEN_HASH_MD` in the deployment environment (never in a tracked file).
2. Give the MD token to the Managing Director through a secure, out-of-band channel.
3. Confirm in the browser: authorizing with the MD token shows "Authorized as: MD — Read-only" in the topbar, the Review Summaries tab works end-to-end (search, select, filter, expand, download PDF), and no Add/Edit/Delete control appears anywhere.
4. Confirm the MD token has no effect anywhere else in the app (no Calendar/Task/Leave mutation controls become available).

## 9. One next step

A reviewer reads this implementation report (this file plus the validation check) and, if satisfied, either approves pushing `main` to `origin` or requests changes.
