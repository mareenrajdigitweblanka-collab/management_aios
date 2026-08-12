# Management AIOS — Announcement & Notification Feature (Phase 1)

**Requirement ID:** REQ-ANN-001
**Project Name:** Management AIOS Announcement & Notification Feature
**Start Date:** 2026-08-12
**Expected Deadline:** 2026-08-12 (Phase-1 MVP, single-session target)
**User / Stakeholder:** Management AIOS authenticated members (Mayurika, Suman, Arun, Rajiv, Paraparan)
**Company Value Contribution:** Replaces repeated one-to-one verbal/text management instructions with a permanent, centralized, queryable announcement history plus targeted `@mention` notifications — directly supports CLAUDE.md §11.1 (LLM-Queryable Documentation Standard) and the management-file-and-decision-disorganization problem area (CLAUDE.md §1).
**MVP Submission Date:** 2026-08-12
**Project Owner:** Mareenraj (build), Varmen (business sponsor)
**Status:** Implemented — backend + frontend + tests complete; **live database migration EXECUTED** (2026-08-12, manually by the user/admin against `order_management_copy`; live schema verified matching this design read-only — see `validation/announcement-notification-migration-execution-check-2026-08-12.md`). Production UI acceptance surfaced corrections, addressed by **Stage A** (2026-08-12 — see §10): sidebar position, self-mention now rejected, creator excluded from read receipts/mention display/Notification History/unread badge (historical rows preserved, filtered at read time only across all four surfaces), Notification History tab, bell routing, polling visibility-refresh. Stage A is implemented and tested, no DB migration, no commit/push (pending user + GPT review). WebSocket/Web Push/Redis/Service Worker/VAPID remain explicitly deferred to a future stage.

Source basis: Phase-1 discovery report (2026-08-12, this session) plus the corrected architecture and confirmed business rules supplied directly by the user in the Phase-1 build prompt (2026-08-12) — treated as an explicit, task-scoped stakeholder instruction (equivalent evidentiary weight to a registered source for this feature's own internal decisions; does not itself register a new Source ID in `evidence/source-register.md`).

---

## 1. Business Requirement

Any authenticated Management AIOS member can create an announcement, save it as a Draft, edit/delete their own Draft, and publish it. Once published, an announcement is permanently visible to every authenticated member and can never be edited or deleted by anyone. The creator may optionally `@mention` one or more authenticated members at Draft time; mentioned members receive a persistent, per-user notification (bell icon + unread badge, routing to the Notification History tab — see §10.5; a bell dropdown was the original Phase-1 design, removed by Stage A) only once the announcement is published, with independent read/unread state per mentioned member.

## 2. Scope — Phase 1 (MUST HAVE)

- Draft lifecycle: create, reopen, edit (title/body/mentions), delete (soft delete, own Drafts only), publish.
- Published lifecycle: permanent, immutable, visible to all authenticated members, appears in Announcement History.
- `@mention`: zero, one, or multiple members selected from the existing authenticated-member registry; controls notification targeting only, never visibility.
- Notification: bell + unread badge in the topbar, routing to the Notification History tab (Stage A — see §10.5; the original Phase-1 design used a bell dropdown instead, since removed); lightweight polling (~30s) while authenticated, plus refresh on key interactions and on regaining tab visibility (Stage A — see §10.6).
- Read receipts: creator-only view of which mentioned members have read a published announcement.
- No priority levels, no attachments, no scheduling (explicitly deferred).

## 3. Existing Auth / Member Source (reused, not reinvented)

- `backend/config.py` `MEMBER_DIRECTORY` / `VALID_MEMBER_KEYS` — the 5 canonical `member_key`s.
- `backend/routers/calendar_auth.py` `get_verified_member` — the existing Calendar Bearer-token dependency, reused verbatim on every Announcement route.
- Frontend: `web-view/js/member-registry.js` (display), `web-view/js/auth-gate.js` (protected-tab gate).
- No second member/user registry and no DB-level hard-coded member-key `CHECK` constraint are introduced — see §6 of the technical design.

## 4. Draft Lifecycle

Create → Save Draft → Reopen → Edit title/body/mentions → Delete (soft, creator-only, confirmation required) → Publish. Drafts are private to their creator; a non-owner request for another member's Draft receives the same non-disclosing 404 shape already established by `StaffReviewSummary`'s owner-only routes.

## 5. Publish Permanence

Publishing is a one-way transition. Once `status='Published'`: no edit route, no delete route, no re-publish route, and no mention-change route can ever target that record — enforced structurally at the database-query layer, not by hiding frontend buttons (see technical design §5).

## 6. Visibility vs. Mention Distinction

`Published visibility = all authenticated members`, unconditionally. `@mention = notification target only`. An unmentioned member sees the same Published announcement in history with no notification and no read-receipt row.

## 7. Notification / Read-State Model

Draft mention rows exist before Publish (so mention selections persist across Draft edits) but are never notifications. Publish stamps `notified_at` on the Draft's existing mention rows, which is what makes them eligible for the bell feed. `read_at` (nullable) is the per-member read/unread signal, mirroring `member_leave_records`' existing "nullable column is the lifecycle signal" convention.

## 8. Known Limits (Phase 1 / as amended by Stage A — see §10)

- No priority, attachments, or scheduled announcements (Phase 2 candidates only).
- No email/WhatsApp/push delivery — in-app only (Notification History tab as of Stage A; bell + dropdown in the original Phase 1 design). Browser/OS push notifications (Web Push + Service Worker + VAPID) were scoped in the 2026-08-12 discovery report but are explicitly **deferred** — see §10.6.
- No audit-log table for Announcements (Phase 1 simplification — `created_at`/`published_at`/`read_at` already answer who/what/when; see technical design §3 for the rationale).
- ~~Self-mention is allowed and generates a notification like any other mention (explicit Phase-1 decision — no suppression).~~ **Superseded by Stage A (2026-08-12) — see §10.2.** Preserved here as a historical record of the original Phase-1 decision; it is no longer the current rule.
- No WebSocket/SSE/real-time push — the topbar bell polls (30s interval, unchanged by Stage A). Confirmed low-risk given the current Vercel serverless deployment (per the 2026-08-12 discovery report §J); real-time delivery beyond a visibility-triggered immediate refresh is explicitly deferred.

## 9. Next Step (Phase 1)

`database/migrations/2026-08-12-create-announcements.sql` has been applied manually by the user/admin against the live Management AIOS PostgreSQL database (`order_management_copy` / `management_aios` schema); the migration file itself was never executed by Claude Code (see `validation/announcement-notification-migration-execution-check-2026-08-12.md` for the read-only live-verification evidence). Remaining next step: user production UI acceptance check post-push (see `validation/announcement-notification-phase1-check-2026-08-12.md`).

## 10. Stage A — Production UX Corrections (2026-08-12 production user acceptance)

Source basis: the user's production acceptance testing of the Phase 1 build (screenshots + explicit written correction list, 2026-08-12, same day as Phase 1). Scope explicitly excludes WebSocket, Web Push, Redis, Service Worker, and VAPID — all deferred to a future stage (see §10.6). No DB migration, no commit, no push in Stage A; implementation delivered for GPT/user review first.

### 10.1 Sidebar position

Announcements moved from last in the sidebar to immediately after Overview and before Members (`Overview → Announcements → Members → Staff → Knowledge`). Pure markup reorder in `web-view/index.html` — sidebar order has no config list or CSS `order` property (see the 2026-07-17 frontend-modularization handover); `web-view/js/navigation.js` needed no change.

### 10.2 Self-mention — reversed

**The original Phase-1 decision (§8, historical, superseded) allowed self-mention with no suppression.** Production user acceptance on 2026-08-12 reversed this: a member can no longer mention themselves.

- Frontend: `web-view/js/announcements.js`'s mention picker filters the one existing target list (`MENTION_TARGET_ORDER`) against the currently authenticated member (`getStoredMemberKey()`) — no second member list introduced.
- Backend (defense-in-depth, since the API is directly callable outside the UI): `backend/routers/announcements.py` `_reject_self_mention` runs in `create_announcement` and `update_announcement_draft`, before any row is written — 422 if `acting_member` appears in `mention_member_keys`. The Pydantic schema layer (`backend/schemas.py` `_validate_mention_keys`) still only checks dedup + membership, since a `field_validator` has no access to the authenticated identity.

### 10.3 Historical self-mention rows — preserved, filtered at read time only

Self-mention rows created before this reversal (Phase 1 / early production testing) are **never deleted or mutated**. Historical self-mention records are retained in the database but excluded, at read time only, from every surface a member can see their own mentions through:

- Published mention display (`_mention_keys`, feeding `AnnouncementOut.mention_member_keys` — Published History's "Mentioned: ..." line and Draft edit prefill)
- Creator Read Receipts list and Mentioned/Read/Unread counts (`GET /{id}/read-receipts`)
- Creator Notification History and unread badge (`_notification_query`, the shared query behind `GET /api/announcements/notifications` — added 2026-08-12 as a same-day consistency follow-up to close the one gap the first Stage A pass had left open)

Each of the four exclusions above filters at query time only — the underlying `announcement_mentions` row, if any, is never touched. All four are exercised by dedicated tests in `backend/tests/test_announcements.py` (see §10.4 below for the notification-feed ones specifically), each confirming both the exclusion and that the row remains present and unmodified afterward.

### 10.4 Read receipts and notification feed — creator excluded from list, counts, and badge

The creator no longer appears in their own Read Receipts list, and no longer counts toward Mentioned/Read/Unread (`GET /{id}/read-receipts`) — confirmed by `test_other_member_read_receipts_unaffected_by_historical_self_mention`. The same exclusion now applies to the creator's own Notification History and unread bell badge (`_notification_query`, `AnnouncementMention.mentioned_member_key == acting_member` combined with `Announcement.created_by != acting_member`) — confirmed by `test_historical_self_mention_excluded_from_notification_feed_and_unread_count`. In every case, other mentioned members' receipts, feeds, and counts are completely unaffected — the exclusion is scoped to `Announcement.created_by == acting_member` specifically, never a blanket "hide this member's name everywhere" rule; `test_mentions_from_other_creators_unaffected_by_own_self_mention_feed_filter` proves a legitimate mention on someone *else's* announcement still reaches the mentioned member normally, even while they separately have an unrelated historical self-mention of their own.

### 10.5 Notification History tab + bell routing

Added a third tab, **Notification History**, alongside Published History and My Drafts in the Announcements workspace (`web-view/js/announcements.js` `mountAnnouncementsWorkspace`) — reuses the existing tab component and the existing `GET /api/announcements/notifications` endpoint (already newest-notified-first via `notified_at DESC`, unchanged). The topbar bell (`mountAnnouncementBell`) is now a plain navigation trigger, not a popover — its dropdown was removed entirely (not retained as a preview) to avoid two parallel, independently-drifting notification-item renderers; clicking it activates the Announcements sidebar tab (via the real nav button, reusing `navigation.js`'s existing `activatePanel` gating — no new panel-switching code path) and switches the workspace to the Notification History view. Opening the tab never bulk-marks-read; only the existing per-item `POST /notifications/{mention_id}/read` route (unchanged, already idempotent) does, triggered solely by clicking that one item, which also opens the related Published announcement in a read-only modal (via the existing `GET /{id}` detail route) and refreshes the bell's unread badge via the existing `onChanged` callback. Each feed item now also carries a `body_preview` (new field on `AnnouncementMentionNotificationOut`, ≤140 chars of the announcement body) so a history row can be identified without a second request.

### 10.6 Real-time delivery — explicitly deferred

WebSocket, Server-Sent Events, Redis, Web Push, Service Worker, and VAPID are all **out of scope for Stage A** per explicit user instruction, regardless of the 2026-08-12 discovery report's findings on their feasibility. The one polling change made: the bell now also refreshes immediately on `document.visibilitychange` becoming `'visible'` (in addition to the unchanged 30-second `setInterval`), so a backgrounded tab does not wait up to a full tick after regaining focus. The interval itself remains 30 seconds.
