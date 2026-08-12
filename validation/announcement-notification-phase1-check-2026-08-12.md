# Announcement & Notification Feature — Phase-1 Closure Check (2026-08-12)

**Requirement ID:** REQ-ANN-001

## What Was Built

A Management AIOS Announcement & Notification feature: authenticated members create announcements as Drafts, edit/delete their own Drafts, and Publish them. Publishing is permanent — a Published announcement is visible to every authenticated member forever and can never be edited, deleted, re-published, or re-mentioned. The creator may `@mention` zero, one, or multiple authenticated members at Draft time; mentioned members get a bell-icon notification with independent per-member read/unread state, but only once the announcement is Published (Draft mentions are selections only, never notifications).

## Why

Replaces repeated one-to-one verbal/text management instructions with a permanent, centralized, queryable announcement history plus targeted notification. Directly supports CLAUDE.md §11.1 (LLM-Queryable Documentation Standard) and the management-file-and-decision-disorganization problem area (CLAUDE.md §1). Full business requirement: `docs/2026-08-12_management-aios-announcement-notification-requirement.md`. Full technical design: `docs/2026-08-12_management-aios-announcement-notification-technical-design.md`.

## Where Code Lives

| Layer | Path |
|---|---|
| Backend router | `backend/routers/announcements.py` |
| Backend models | `backend/models.py` (Announcement, AnnouncementMention additions) |
| Backend schemas | `backend/schemas.py` (Announcement request/response models) |
| Backend router mount | `backend/main.py` |
| Backend tests | `backend/tests/test_announcements.py` |
| DB migration | `database/migrations/2026-08-12-create-announcements.sql` |
| Frontend logic | `web-view/js/announcements.js` |
| Frontend styles | `web-view/css/announcements.css` |
| Frontend markup | `web-view/index.html` |
| Frontend tests | `web-view/js/announcements.test.mjs` |
| Frontend auth gate wiring | `web-view/js/auth-gate.js` (`'announcements'` added to `PROTECTED_TABS`) |
| Frontend app wiring | `web-view/js/app.js`, `web-view/js/config.js` |

## Database Objects

`management_aios.announcements` and `management_aios.announcement_mentions` — full column/constraint/index inventory and live verification evidence: `validation/announcement-notification-migration-execution-check-2026-08-12.md`. Migration is additive-only; no existing table (`member_schedule_events`, `member_leave_records`, `staff_dashboard_records`, `staff_review_summaries`, `knowledge_documents` + children) is dropped, altered, or rewritten — confirmed unaffected by live read-only recount.

## Member/Auth Source

Reused, not reinvented: `backend/config.py` `MEMBER_DIRECTORY` / `VALID_MEMBER_KEYS` (the 5 canonical `member_key`s) and `backend/routers/calendar_auth.py` `get_verified_member` (existing Calendar Bearer-token dependency), reused verbatim on every Announcement route. `mentioned_member_key` and `created_by` are plain `VARCHAR`, not constrained by a DB-level `CHECK` against a hard-coded member list — membership is validated at the application layer against `VALID_MEMBER_KEYS` on every write, so no schema change is needed to add/remove a member. No second member/user registry anywhere.

## Draft Lifecycle

Create → Save Draft → Reopen → Edit title/body/mentions → Delete (soft delete, creator-only, confirmation required) → Publish. Drafts are private to their creator; a non-owner request for another member's Draft returns the same non-disclosing 404 shape already established by `StaffReviewSummary`'s owner-only routes. Mentions are edited via the Draft PATCH route's `mention_member_keys` field, reconciled against `announcement_mentions` (insert added, delete removed) in the same transaction as the title/body update.

## Published Lifecycle

Publishing is a one-way transition. Once `status='Published'`, no edit route, delete route, re-publish route, or mention-change route can ever target that record — enforced structurally: `_get_owned_draft_or_404` filters `status='Draft' AND created_by=acting_member AND deleted_at IS NULL` in the query itself, so a Published (or non-owned, or already-deleted) id is invisible to mutate routes and returns a plain 404. Published is visible to every authenticated member, unconditionally, and appears permanently in Announcement History.

## Mention Semantics

`@mention` controls notification targeting only — never Published visibility. An unmentioned member sees the same Published announcement in history with no notification and no read-receipt row. `announcement_mentions` is the single table for both Draft mention selections and Published notifications (no separate "notifications" table, no copy-on-publish step). Self-mention is allowed, no suppression.

## Notification / Read-State Semantics

Publish stamps `notified_at = now()` on the mention rows that already exist (no new rows inserted at Publish). Every notification-facing query filters `status='Published' AND notified_at IS NOT NULL`, so Draft mentions are structurally invisible to the bell regardless of how long the Draft sits unpublished. `read_at` (nullable) is the sole per-member read/unread signal — NULL = unread, timestamp = read — mirroring `member_leave_records`' existing "nullable column is the lifecycle signal" convention. A mentioned member cannot be marked read before being notified (`read_at IS NULL OR notified_at IS NOT NULL`), and `read_at` can never predate `notified_at`. Frontend polls the unread-count endpoint every ~30s while authenticated and the tab is visible, plus refreshes on key interactions (bell open, mark-read, publish, tab activation). Creator can see mentioned-member read/unread state (read receipts).

## Tests

- Focused backend (`backend/tests/test_announcements.py`): **35/35 PASS**.
- Full backend suite: **932 passed, 2 failed** (934 collected outside subtests, +26 subtests passed). The 2 failures are pre-existing and unrelated to Announcements, confirmed by name: `test_calendar_auth.py::StartupConfigurationValidationTests::test_missing_variable_fails_closed` and `test_weekly_schedule_xlsx_export.py::TaskRowTests::test_pending_task_no_outcome`. No Announcement-related regression.
- Focused frontend (`web-view/js/announcements.test.mjs`): **21/21 PASS**.
- Full frontend suite (`node --test *.test.mjs calendar/*.test.mjs` from `web-view/js/`): **684/684 PASS**, 0 failures. (Count differs from an earlier-reported 503 because Node's test runner numbers every subtest individually; coverage is intact and no regression was introduced either way.)

Pass/Fail rule from the technical design (§ Pass/Fail Rule) — all four conditions verified by the focused suite: (a) a Published announcement cannot be edited/deleted/re-published/re-mentioned via any direct API call; (b) Draft mentions never appear in any member's notification feed before Publish; (c) one member's read action never mutates another member's read state; (d) no second member registry and no DB-level member-key allowlist are introduced.

## Migration Evidence

`database/migrations/2026-08-12-create-announcements.sql` was written as a DRAFT — NOT EXECUTED artifact and never run by Claude Code at any point. It was executed manually by the user/admin on 2026-08-12 against `order_management_copy` / `management_aios`, after explicit user authorization. Full live verification (existence, columns, constraints, indexes, row counts, unaffected pre-existing tables, `test_table` note, `temp_user` privilege state): `validation/announcement-notification-migration-execution-check-2026-08-12.md`.

## Known Limits (Phase 1)

- No priority levels, attachments, or scheduled announcements (Phase 2 candidates only, per explicit Phase-1 scope decision).
- No email/WhatsApp/push delivery — in-app bell only.
- No audit-log table for Announcements (Phase-1 simplification — `created_at`/`published_at`/`read_at` already answer who/what/when).
- Self-mention allowed, no suppression (explicit Phase-1 decision).
- **MD authorization rule (open policy question, CLAUDE.md §12):** this closure task does not introduce any new MD-authorization change. The implementation report previously flagged Announcement-creation authorization scope (currently: any authenticated Management AIOS member) as an open policy question pending MD input. No test or security-architecture evidence in this closure indicates an actual authorization defect, so this known limit does not block publication — recorded as an open decision only.
- `management_aios.test_table` (owner `temp_user`) exists live, unrelated to this feature — see migration validation asset §8. Follow-up item only, does not block closure.
- `temp_user` now holds database-level CREATE on `order_management_copy` (broader than the REQ-ANN-001 minimum, granted separately in this working session under explicit user authorization) — recorded as a known environment/privilege change, not reverted as part of this task.

## Production Acceptance

**Production UI acceptance: PENDING USER CHECK.** No production Draft, Publish, Mention, or read-state action was performed by Claude Code at any point — this was explicitly reserved for the user to verify manually in production after this push, per instruction. This is not a blocker to pushing; schema, code, and tests are otherwise PASS.

## Reviewer

Mareenraj (build). Cross-management/technical build item per CLAUDE.md §18 routing table; MD-authorization open question (see Known Limits) remains routed to a future MD review per CLAUDE.md §11/§12 — not blocking this closure.

## Next Step

Push to `main` (this closure task). User to perform production UI acceptance check post-deployment. MD-authorization open question remains for a future MD review; no action required to close REQ-ANN-001 Phase 1.

## PASS/FAIL

**PASS.** Schema verified live and matching. Focused backend and frontend suites 100% pass. Full suites show zero Announcement-related regressions (2 pre-existing unrelated backend failures confirmed by name). No production business data created. Ready for commit and push, pending user production UI acceptance as a post-push follow-up (not a blocker).

## Queryability Result

A clean LLM reading this file alone can answer: what was built and why, where the code lives, what database objects exist, where member/auth identity comes from, the Draft lifecycle, the Published lifecycle, mention semantics, notification/read-state semantics, test results, migration evidence, known limits, and that production acceptance is pending user check. **YES.**
