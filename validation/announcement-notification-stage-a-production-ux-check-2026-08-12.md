# Announcement & Notification Feature — Stage A Production UX Corrections Closure Check (2026-08-12)

**Requirement ID:** REQ-ANN-001 / Stage A

## Purpose

Record production-user-feedback corrections made to REQ-ANN-001 after its initial Phase 1 release, published at commit `6ab8da488e3d3370f435f406b8b34334c9083b67`. The user tested the Phase 1 build in production the same day and supplied screenshots plus an explicit written correction list; this closure implements and verifies every item on that list. Full business requirement: `docs/2026-08-12_management-aios-announcement-notification-requirement.md` §10. Full technical design: `docs/2026-08-12_management-aios-announcement-notification-technical-design.md` §10.

## Original Published Baseline

`main` at commit `6ab8da4` — "Add Management AIOS announcements and mention notifications" (REQ-ANN-001 Phase 1). This closure builds directly on top of that commit; no other change is bundled in.

## User Production Feedback

Observed in production and reported directly by the user:

- Announcements sat at the bottom of the sidebar.
- The currently authenticated member appeared in their own mention picker (self-mention was possible).
- A self-mentioned creator could appear in their own Read Receipts.
- The bell/dropdown worked but felt too slow, and was not the primary destination for reviewing notification history.

## Sidebar Correction

Moved from last to `Overview → Announcements → Members → Staff → Knowledge`. Pure markup reorder in `web-view/index.html` — sidebar order is purely markup order (no config list, no CSS `order` property; see the 2026-07-17 frontend-modularization handover), so `web-view/js/navigation.js` needed no change. Regression-tested by new `web-view/js/announcements-sidebar-position.test.mjs`.

## Self-Mention Requirement Reversal

**The original Phase 1 design allowed self-mention with no suppression** (requirement doc, historical §8 note; technical design, historical §6 note — both explicitly preserved, not deleted). Production user acceptance on 2026-08-12 reversed this decision: a member can no longer mention themselves.

### Frontend Enforcement

`web-view/js/announcements.js` `buildMentionPicker()` filters the existing `MENTION_TARGET_ORDER` list against `getStoredMemberKey()` before rendering checkboxes — the currently authenticated member is never offered as an option. No second member list was introduced; the one existing target list is filtered dynamically per authenticated identity.

### Backend Enforcement

`backend/routers/announcements.py` — new `_reject_self_mention(acting_member, mention_member_keys)`, called from `create_announcement` (before any row is written) and `update_announcement_draft` (before `_reconcile_mentions` runs, only when `mention_member_keys` is supplied) — raises 422 if the acting member appears in their own mention list. This is defense-in-depth: the API is directly callable outside the UI, so the backend guard is the actual enforcement point, not just the frontend hide. The Pydantic validator layer (`backend/schemas.py` `_validate_mention_keys`) still only checks dedup + membership, since a `field_validator` has no access to the authenticated identity — docstring updated to explain the layering.

## Historical-Data Preservation Approach

Self-mention rows created before this reversal (Phase 1 / early production testing) are **retained in the database — never `UPDATE`d or `DELETE`d**. The exclusion is applied as a query-time filter, consistently across all four surfaces where a member could otherwise see their own historical self-mention:

1. **Published mention display** — `_mention_keys(db, announcement_id, exclude_member=record.created_by)`, feeding `AnnouncementOut.mention_member_keys` (Published History's "Mentioned: ..." line and Draft edit prefill).
2. **Read Receipts** — `GET /{id}/read-receipts` query gained `AnnouncementMention.mentioned_member_key != announcement.created_by`; `mentioned_count`/`read_count`/`unread_count` are derived from that already-filtered set.
3. **Notification History** — `_notification_query` (the single query shared by the feed and the unread count) gained `Announcement.created_by != acting_member`, alongside its existing `mentioned_member_key == acting_member` filter.
4. **Unread badge** — the same `_notification_query` base as (3), so the feed and badge can never disagree.

The exclusion in every case is scoped to `Announcement.created_by == acting_member` specifically — a legitimate mention on someone else's announcement is never affected, even for a member who separately has an unrelated historical self-mention of their own (proven by `test_mentions_from_other_creators_unaffected_by_own_self_mention_feed_filter`).

## Read Receipt Correction

The creator no longer appears in their own Read Receipts list, and no longer counts toward Mentioned/Read/Unread. Other mentioned members' receipts and counts are unaffected — confirmed by `test_other_member_read_receipts_unaffected_by_historical_self_mention` and `test_individual_read_isolation_holds_alongside_historical_self_mention`.

## Notification History

New third tab, **Notification History**, alongside Published History and My Drafts in the Announcements workspace (`mountAnnouncementsWorkspace`) — reuses the existing `role="tablist"` component and the existing `GET /api/announcements/notifications` endpoint (not a new route). Each feed item now also carries a `body_preview` (new field on `AnnouncementMentionNotificationOut`, ≤140 chars of the announcement body, populated from the already-joined `Announcement.body` — no extra query) so a history row can be identified without a second request.

Opening the tab never bulk-marks-read — it is a pure `GET`. Only the existing per-item `POST /notifications/{mention_id}/read` route (unchanged, already idempotent) marks anything read, triggered solely by clicking that one item, which also opens the related Published announcement in a read-only modal (via the existing `GET /{id}` detail route) and refreshes the bell's unread badge via the existing `onChanged` callback.

## Bell Routing

The bell dropdown was **removed entirely** (not retained as a preview) — a deliberate choice to avoid two parallel, independently-drifting notification-item renderers now that the Notification History tab is the persistent, canonical implementation. The bell (`mountAnnouncementBell`) is now a plain navigation trigger: click → `refresh()` the unread count → activate the real Announcements sidebar nav button (reuses `navigation.js`'s existing `activatePanel` gating verbatim, zero edits to that file — same technique the member-snapshot-card `[data-goto]` jump already uses) → switch the workspace to the Notification History view.

## Ordering

Unchanged — already correct at Phase 1: `notified_at DESC`, `id ASC` tiebreak. The Notification History tab renders that order verbatim; no client-side re-sort was added.

## Polling Behavior

Interval left at exactly 30 seconds, per explicit instruction — not reduced. One UX fix added: `mountAnnouncementBell` now also listens for `document.visibilitychange` and fires an immediate `refresh()` when the tab becomes visible again (`document.visibilityState === 'visible'`), so a backgrounded tab does not wait up to a full 30-second tick after regaining focus. The listener is removed in `stop()` so a remounted bell (on Calendar auth change) never accumulates a second listener.

## WebSocket / Web Push — Deferred

No WebSocket, Server-Sent Events, Redis, Web Push, Service Worker, or VAPID code was written, and none was further investigated in this closure, per explicit user instruction — confirmed by a targeted diff scan for each term (matches were documentation text stating the deferral, never code). All real-time work stayed within the existing polling architecture plus the one visibility-triggered refresh above.

## Files Changed

| File | Change |
|---|---|
| `web-view/index.html` | Sidebar group reorder only |
| `web-view/js/announcements.js` | Self-mention picker filter, Notification History tab, bell routing, visibility-triggered refresh, `NOTIFICATION_HISTORY_LIMIT` |
| `web-view/js/announcements.test.mjs` | Self-mention picker tests, Notification History tab tests, bell-routing/visibility tests (replaced the old dropdown test block) |
| `web-view/js/announcements-sidebar-position.test.mjs` | New — sidebar order regression coverage |
| `web-view/js/review-summaries-test-dom.mjs` | Shared test fixture gained a `document.visibilityState` default |
| `backend/routers/announcements.py` | `_reject_self_mention`, `_mention_keys(exclude_member=...)`, read-receipts creator exclusion, `_notification_query` creator exclusion, `_body_preview`/`body_preview` field population; stale migration-status docstring corrected |
| `backend/schemas.py` | `AnnouncementMentionNotificationOut.body_preview`; `_validate_mention_keys` docstring updated to explain the self-mention enforcement layering |
| `backend/models.py` | Stale migration-status docstring corrected (`Announcement` model) |
| `backend/tests/test_announcements.py` | Old `test_self_mention_allowed_and_notifies_creator` replaced; rejection tests, historical-row tests (`insert_mention_row` ORM helper), notification-feed consistency tests, `body_preview` test added |
| `docs/2026-08-12_management-aios-announcement-notification-requirement.md` | New §10 Stage A section; §1/§2/§8 updated to describe current (post-Stage-A) behavior with the Phase-1 rule preserved as an explicit historical note |
| `docs/2026-08-12_management-aios-announcement-notification-technical-design.md` | §6/§7 rewritten to describe current behavior (Phase-1 rule preserved as a historical note); new §10 Stage A appendix; Reused Infrastructure table row corrected |

No `database/migrations/*.sql` file was added or modified. No file under `member-aios/mayurika-hr/staff-data/` was accessed.

## Tests

- Focused backend (`backend/tests/test_announcements.py`): **47/47 PASS**.
- Full backend suite: **944 passed, 2 failed**. The 2 failures are pre-existing and unrelated to Announcements, confirmed by name and by diffing against the unmodified `6ab8da4` baseline via `git stash`: `test_calendar_auth.py::StartupConfigurationValidationTests::test_missing_variable_fails_closed` and `test_weekly_schedule_xlsx_export.py::TaskRowTests::test_pending_task_no_outcome`. No Announcement-related regression.
- Focused frontend (`web-view/js/announcements.test.mjs` + `web-view/js/announcements-sidebar-position.test.mjs`): **41/41 PASS**.
- Full frontend suite (`node --test *.test.mjs` from `web-view/js/`): **523/523 PASS**, 0 failures.

## Browser Evidence

Real Playwright/Chromium session against a real running `backend.main:app` instance (isolated local SQLite, never a real database) and a real static server serving the actual `web-view/index.html`. Two real identities (Mayurika, Suman) via the real Calendar-token auth flow (whole-app entry gate + per-module dialog). Confirmed live: sidebar order; self-mention excluded from the picker (`mayurika` absent from her own list, `suman`/`arun`/`rajiv`/`paraparan` present); self excluded from published mention display; bell has no dropdown; bell click activates Announcements + Notification History; opening History alone marks nothing read; a historical self-mention row (seeded directly via an in-process debug route, bypassing the now-guarded API — the only way to reproduce pre-Stage-A data) is absent from the creator's own bell badge and Notification History while a legitimate mention to another member on the same announcement remains fully intact, including click-to-mark-read and badge-clear; no horizontal overflow; no uncaught page exceptions; zero console errors traced to Announcements/Stage-A code (all observed console noise traced by exact URL to unrelated dashboard widgets — `member-schedules`/`member-leave`/`knowledge-documents` — that this isolated local verification instance does not seed data for).

One real bug was found and fixed during this process: the Notification History tab initially requested `limit=200`, but `GET /api/announcements/notifications` caps `limit` at 100 (`Query(..., le=100)`) — a 422 no fixture-based unit test could catch, since fixtures don't enforce real backend query constraints. Fixed as `NOTIFICATION_HISTORY_LIMIT = 100`; re-verified clean by both suites and a fresh browser run.

## Production DB Writes

**NONE.** Every step — automated tests and every live browser session — ran against isolated local SQLite databases only (in-memory for the automated suite; file-based for one browser-validation pass, to allow an in-process debug-only seed route). No connection to `order_management_copy` or any real PostgreSQL instance was made at any point in Stage A.

## Historical Production Mutation

**NONE.** No `UPDATE`/`DELETE` was issued against `announcement_mentions`/`announcements` anywhere in Stage A, against any database, real or isolated. All "historical self-mention" testing used dedicated ORM-insert test helpers operating exclusively against isolated per-test/per-session databases.

## Known Limits

- No priority levels, attachments, or scheduled announcements (Phase 2 candidates only — unchanged from Phase 1).
- No email/WhatsApp/push delivery — in-app only (Notification History tab, as of Stage A). Browser/OS push notifications (Web Push + Service Worker + VAPID) were scoped in the 2026-08-12 discovery report but are explicitly deferred to a future stage.
- No WebSocket/SSE/real-time push — the bell polls (30s interval, unchanged; visibility-triggered immediate refresh added). Real-time delivery beyond that remains explicitly deferred.
- No audit-log table for Announcements (Phase-1 simplification, unchanged).
- `WEB-APP-OVERVIEW.md` — an untracked file discovered in the working tree during this closure, not created by any Stage A action, never referenced by any Stage A file, containing zero mentions of REQ-ANN-001/Stage A. Classified UNRELATED PRE-EXISTING/EXTERNAL FILE; left untouched, not staged, not committed.
- MD-authorization scope (Announcement creation currently open to any authenticated Management AIOS member, including MD) — unchanged open policy question from Phase 1, not touched by Stage A, still pending future MD review per CLAUDE.md §11/§12.

## Reviewer / Status

Mareenraj (build). Cross-management/technical build item per CLAUDE.md §18 routing table. Stage A implemented directly from the user's own production acceptance testing and explicit written correction list (2026-08-12), treated as task-scoped stakeholder instruction for this feature's own internal decisions, same evidentiary convention as the original Phase 1 requirement doc's Source Basis note. MD-authorization open question (unchanged from Phase 1) remains routed to a future MD review — not blocking this closure.

## Next Step

Commit and push (this closure task). User to perform production UI acceptance re-check post-deployment, same as Phase 1. MD-authorization open question remains for a future MD review; no action required to close REQ-ANN-001 Stage A.

## PASS/FAIL

**PASS.** Every corrected requirement (sidebar, self-mention reversal front+back, historical-data read-time-only filtering across all four surfaces, Read Receipts, Notification History, bell routing, ordering, polling) is implemented and verified. Focused backend and frontend suites 100% pass. Full suites show zero Announcement-related regressions (2 pre-existing unrelated backend failures confirmed by name, unchanged from Phase 1). Real browser validation against a real running instance confirms every behavior end-to-end and caught one genuine bug (notification-feed limit cap) that is now fixed and re-verified. No production DB writes, no historical row mutation, no commit/push performed by this validation asset itself. Ready for commit and push.

## Queryability Result

A clean LLM reading this file alone can answer: what production feedback triggered Stage A, what changed and why, the exact frontend and backend enforcement points for the self-mention reversal, how historical data is preserved and where it is filtered, the Notification History and bell-routing architecture, what remains deferred and why, every file touched, full test results, browser evidence, and that production DB writes and historical mutations were both NONE. **YES.**
