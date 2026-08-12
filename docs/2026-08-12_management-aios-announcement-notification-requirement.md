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

### 10.6 Real-time delivery — explicitly deferred in Stage A, WebSocket added in Stage B

WebSocket, Server-Sent Events, Redis, Web Push, Service Worker, and VAPID were all **out of scope for Stage A** per explicit user instruction, regardless of the 2026-08-12 discovery report's findings on their feasibility. The one Stage A polling change: the bell also refreshes immediately on `document.visibilitychange` becoming `'visible'` (in addition to the unchanged 30-second `setInterval`), so a backgrounded tab does not wait up to a full tick after regaining focus.

**Superseded for WebSocket specifically by Stage B (2026-08-12, same day) — see §11.** The user explicitly approved moving forward with WebSocket after re-checking current Vercel platform documentation. Server-Sent Events, Redis, Web Push, Service Worker, and VAPID remain deferred — Stage B implements WebSocket only. The 30-second polling interval itself is still unchanged even in Stage B — it remains the correctness fallback, not replaced.

## 11. Stage B — Realtime WebSocket Fast Path (2026-08-12, same day as Stage A)

Source basis: explicit user approval to proceed with WebSocket, citing current Vercel platform documentation (WebSocket support for Python/FastAPI Functions, public beta, added July 2026) that supersedes the 2026-08-12 discovery report's original "WebSocket not recommended" conclusion for this specific platform question — independently confirmed via live web search during this task (see §11.1). WebSocket only; Web Push/Service Worker/VAPID remain explicitly deferred to a future stage per direct instruction.

### 11.1 Platform fact-check

Confirmed via web search before implementation began: Vercel added native WebSocket support in public beta (June 2026 for Node/Bun, Python support added July 2026), working with FastAPI/ASGI applications, requiring Fluid Compute (Vercel's current default). Critically, Vercel's own documentation states a WebSocket connection is **pinned to the one Function instance that accepted it** for the connection's lifetime, and Vercel's own recommendation for cross-instance coordination (shared rooms, pub/sub, presence) is an external store — typically Redis via the Vercel Marketplace/Upstash. This repo provisions no such service (confirmed by inspecting `backend/config.py` — only `DATABASE_URL`/`LEDSONE_DATABASE_URL` exist), and the user explicitly forbade provisioning new paid infrastructure without separate approval. This is why Stage B's connection registry is explicitly single-instance/best-effort — see §11.7.

### 11.2 Architecture — WebSocket is delivery only

PostgreSQL (`management_aios.announcements`/`announcement_mentions`) remains the sole authoritative store, unchanged from Stage A. A WebSocket message carries exactly one event, `{"type": "announcement_notification_changed", "announcement_id": "..."}` — never announcement content, never read state, never a second notification ledger. On receipt, the browser does nothing but re-fetch its authoritative state over the existing HTTP API (the same `GET /api/announcements/notifications` the bell and Notification History already use). The existing 30-second HTTP polling (Stage A) is left completely unchanged and keeps running regardless of WebSocket state — realtime is a latency optimization only.

### 11.3 Authentication — short-lived signed ticket

A browser cannot attach the existing `Authorization: Bearer <token>` header to a WebSocket handshake the way it can to a normal `fetch()` request, and the long-lived member token must never appear in a URL (query strings are logged by proxies/browser history/server access logs). Design: an already-authenticated HTTP call, `POST /api/announcements/ws-ticket` (guarded by the existing `get_verified_member` dependency — the same auth every other Announcement route uses), issues a ticket scoped to the calling member only, expiring in 60 seconds. The browser passes only this ticket in the WebSocket URL's query string. The ticket is an HMAC-SHA256-signed string (`member_key.expires_at.signature`), signed with a new secret, `ANNOUNCEMENT_WS_TICKET_SECRET` (optional-but-fail-closed — see §11.4) — same `hashlib`/`hmac` primitives `backend/routers/calendar_auth.py` already uses for its own token comparisons, no new cryptographic dependency. No member_key is ever accepted from the client on the WebSocket route itself — identity comes entirely from the signed ticket.

### 11.4 New configuration requirement

`ANNOUNCEMENT_WS_TICKET_SECRET` (see `.env.example`) — a random, high-entropy string, NOT a hash of anything (unlike the five `CALENDAR_AUTH_TOKEN_HASH_*` values). Optional-but-fail-closed, deliberately **not** the same startup-crash pattern as the five mandatory Calendar tokens: missing/blank means the realtime fast path is simply unavailable (`POST /ws-ticket` returns 503; every WebSocket connection attempt fails closed) — the rest of the application, including every other Task/Leave/Announcements HTTP route and the Stage A polling fallback, is completely unaffected. This is intentional: WebSocket is additive, delivery-only infrastructure with a working fallback already in place, so an unconfigured secret must never crash the whole backend. No real secret is committed anywhere in this repository.

### 11.5 WebSocket route and connection lifecycle

`WS /api/announcements/ws?ticket=<ticket>` (`backend/routers/announcements.py` `announcements_ws`). On connection: validates the ticket (rejects via `WebSocketException` **before** `.accept()` on any failure — missing, malformed, expired, bad signature, or an unknown member_key — so an invalid ticket never becomes a live connection), derives `member_key` entirely from the ticket, accepts, registers the connection, and blocks on `receive_text()` until the client disconnects (no client→server protocol exists — one event type, server→client only). Cleanly unregisters on disconnect in a `finally` block regardless of how the connection ended.

### 11.6 When the signal is emitted

Only `publish_announcement`, only after its `db.commit()` has already succeeded, targeting exactly the announcement's own (already Stage-A-filtered, therefore never including the creator) mention set. Draft create and Draft update never emit a signal. If sending fails for any reason — including a bug in the signaling code itself — the Publish HTTP response is completely unaffected; see §11.8.

### 11.7 Scaling limitation — explicitly not concealed

**CROSS-INSTANCE GUARANTEED REALTIME: NOT YET PROVEN.** The connection registry (`_CONNECTIONS` in `backend/routers/announcements.py`) is an in-process Python dict — single-instance/best-effort only. No shared cross-instance pub/sub service (Redis or equivalent) exists in this deployment, and per §11.1, Vercel pins one WebSocket connection to one Function instance for its lifetime. A Publish request served by a different Function instance than the one holding a mentioned member's connection cannot signal it directly under the current architecture. This is not a reason to withhold the WebSocket fast path — the unchanged 30-second polling fallback (Stage A) means notification correctness never depends on the socket succeeding — but it is a known, undisguised limitation. Provisioning a shared store (e.g. Redis) was explicitly out of scope for this task per direct instruction; adding one is a candidate for a future stage, not assumed here.

### 11.8 Failure handling

A realtime delivery failure is explicitly **not** a business-data failure. `_signal_publish` wraps its own broadcast call in a `try`/`except`, and the call site inside `publish_announcement` wraps `_signal_publish` itself in a second `try`/`except` (belt-and-suspenders — even a bug inside the signaling code cannot turn an already-committed Publish into an error response). Confirmed by `test_realtime_failure_does_not_roll_back_publish`, which forces `_signal_publish` to raise and asserts Publish still returns 200 with the row actually committed.

### 11.9 Frontend lifecycle

One owner: `mountAnnouncementBell` in `web-view/js/announcements.js` (already the single owner of the Stage A polling/visibility-refresh lifecycle) — never scattered across `app.js`/`auth-gate.js`/`navigation.js`/individual tabs. Connects only after authentication succeeds; a bounded reconnect backoff (1s → 2s → 5s → 10s → 30s, reset to 1s on a stable connection) runs on every drop, never an unbounded rapid-retry loop; `stop()` (already called by the existing `CALENDAR_AUTH_CHANGED_EVENT` handler on logout/token-switch/auth-loss) closes the socket and cancels any pending reconnect, so an old member's connection can never survive a token switch. On every (re)connect, an immediate HTTP refresh runs (same as the Stage A visibility-return refresh) — the socket itself is never trusted for content, only as a hint to re-fetch.

### 11.10 Tests and local validation

Backend (`backend/tests/test_announcements.py`, `AnnouncementsWebSocketTestCase`, 17 tests): valid/expired/malformed/missing/bad-signature/unknown-member tickets, identity derived entirely from the ticket, Publish signals mentioned members, Draft create/update do not, an unmentioned member receives nothing, the creator receives no self-signal, multiple mentions each receive their own signal, and a simulated realtime failure does not roll back Publish. Frontend (`web-view/js/announcements.test.mjs`, 13 tests): no socket before auth, exactly one socket after auth, correct URL construction, the raw member token never appears in the URL, an incoming signal triggers a real HTTP refresh (never trusts the message content) and updates the badge, an unrelated/malformed message is ignored, bounded reconnect with backoff-reset-on-stable-connection, `stop()` cancels a pending reconnect and closes an open socket, and polling continues unaffected alongside an active socket. Real two/three-browser-context local validation (Mayurika/Suman/Rajiv) against a real running instance measured a 33ms Publish→bell-update latency (target ≤2000ms), confirmed target isolation (Rajiv/unmentioned and Mayurika/creator both receive nothing), confirmed the Notification History tab shows the new item at top after a bell click, and confirmed the HTTP fallback still works correctly after a full page reload. Full results in the Stage B validation asset.

### 11.11 Explicitly still deferred

Web Push, Service Worker, VAPID, native Windows/Chrome browser/OS notifications — none of this was implemented or further investigated in Stage B, per direct instruction. No `sw.js`, no push-subscription table, no `pywebpush` dependency.
