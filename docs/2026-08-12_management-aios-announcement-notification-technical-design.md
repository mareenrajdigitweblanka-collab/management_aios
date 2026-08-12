# Management AIOS — Announcement & Notification Feature — Technical Design (REQ-ANN-001)

**Status:** Implemented (backend + frontend + tests). Live migration executed (2026-08-12, manually by the user/admin) — see §9. **Stage A production UX corrections** (2026-08-12 production user acceptance) implemented and tested — see §10; §6 and §7 below are updated in place to describe current (post-Stage-A) behavior, with the superseded Phase-1 self-mention rule preserved as a historical note in §6. **Stage B realtime WebSocket fast path** (2026-08-12, same day, explicit user approval) implemented and tested, no migration/commit/push — see §11; §7 is further updated to reference it. WebSocket only — Web Push/Service Worker/VAPID remain explicitly deferred.
**Pass/Fail Rule:** PASS requires — (a) a Published announcement can never be edited/deleted/re-published/re-mentioned via any direct API call, verified by dedicated tests; (b) Draft mentions never appear in any member's notification feed before Publish; (c) one member's read action never mutates another member's read state; (d) no second member registry and no DB-level member-key allowlist are introduced. All four are covered by `backend/tests/test_announcements.py` (see validation report for results).

---

## 1. Reused Infrastructure (no duplication)

| Concern | Reused From | Notes |
|---|---|---|
| Member identity / auth | `backend/config.py` `MEMBER_DIRECTORY`, `VALID_MEMBER_KEYS`; `backend/routers/calendar_auth.py` `get_verified_member` | Verbatim reuse — no second token type, no new login system |
| Owner-only mutate / non-disclosing 404 pattern | `backend/routers/staff_review_summaries.py` `_get_owned_summary_or_404` | Adapted for Draft ownership |
| Soft-delete convention | `member_leave_records` / `member_schedule_events` (`deleted_at`/`deleted_by`, no mandatory reason) | Applied to Draft delete only |
| CRUD/router shape, JSONResponse error bodies, idempotency-guard-before-mutate | `backend/routers/knowledge_documents.py` | Structural template for `announcements.py` |
| Frontend auth gate | `web-view/js/auth-gate.js` `PROTECTED_TABS`/`isAuthenticated`/`buildAuthRequiredNotice` | `'announcements'` added to `PROTECTED_TABS` |
| Frontend member display | `web-view/js/member-registry.js` `MEMBER_REGISTRY` | No new registry |
| Frontend destructive confirm | `web-view/js/ui/dialog.js` `confirmDestructive` | Delete Draft |
| Frontend transient feedback | `web-view/js/ui/toast.js` `showToast` | Save/Publish/Delete outcomes |
| Frontend focus trap / scroll lock | `web-view/js/ui/popup.js`, `web-view/js/ui/scroll-lock.js` | Draft editor / read-receipts / notification-detail modals (Stage A removed the bell dropdown entirely — see §10.5 — so the bell itself no longer uses either) |

## 2. Data Model

### `management_aios.announcements`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| title | VARCHAR(200) NOT NULL | trimmed, non-blank |
| body | TEXT NOT NULL | trimmed, non-blank, ≤10,000 chars (mirrors `staff_review_summaries_summary_text_max_length_check`) |
| status | VARCHAR(20) NOT NULL DEFAULT 'Draft' | CHECK IN ('Draft','Published') |
| created_by | VARCHAR(80) NOT NULL | server-derived only |
| created_at / updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| published_at | TIMESTAMPTZ NULL | paired CHECK with status |
| deleted_at / deleted_by | TIMESTAMPTZ / VARCHAR(80) NULL | Draft-only soft delete; paired CHECK; CHECK `deleted_at IS NULL OR status='Draft'` |

### `management_aios.announcement_mentions`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| announcement_id | UUID NOT NULL FK → announcements(id) | |
| mentioned_member_key | VARCHAR(80) NOT NULL | **no DB CHECK against a hard-coded member list** — see §6 |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | mention-selection time (Draft or Publish-time addition) |
| notified_at | TIMESTAMPTZ NULL | set only at Publish; NULL = not yet a notification |
| read_at | TIMESTAMPTZ NULL | NULL = unread; sole read/unread signal |

`UNIQUE (announcement_id, mentioned_member_key)`.

## 3. How Draft Mentions Persist Before Publish (mandatory architecture correction applied)

`announcement_mentions` is the single table for both Draft mention selections and Published notifications — there is no separate "notifications" table and no "convert Draft mentions into notifications by copying rows" step. A Draft's mention set is edited by reconciling `announcement_mentions` rows for that `announcement_id` (insert newly-added `member_key`s, delete removed ones) inside the same transaction as the title/body update — `notified_at`/`read_at` stay NULL throughout. Publish does not insert new mention rows; it only stamps `notified_at = now()` on the rows that already exist. Every notification-facing query (`unread-count`, `mentions` feed) filters `announcements.status = 'Published' AND announcement_mentions.notified_at IS NOT NULL`, so a Draft's mention rows are structurally invisible to the bell regardless of how long the Draft sits unpublished.

No audit-log table is introduced for Announcements (Phase-1 simplification, unlike `knowledge_document_audit_log`) — Announcements are append-only from a business-content perspective (Draft edits are never externally visible; Published is immutable), so `created_at`/`updated_at`/`published_at`/`read_at` already answer every "who/what/when" question in §35 of the discovery report without a second log table.

## 4. Member-Truth Reuse (no duplication — mandatory correction applied)

- `announcement_mentions.mentioned_member_key` and `announcements.created_by` are plain `VARCHAR`, **not** constrained by a database `CHECK (... IN ('mayurika', ...))`.
- All membership validation happens in `backend/routers/announcements.py` against `backend.config.VALID_MEMBER_KEYS` at request time — the single source of truth already used by every other module.
- Frontend display labels come from `member-registry.js` `MEMBER_REGISTRY` only.
- No new users/members table, no second registry, anywhere.

## 5. Published Immutability Enforcement

`_get_owned_draft_or_404(db, id, acting_member)` — the only lookup helper backing PATCH/DELETE/mentions-edit/publish — filters `status = 'Draft' AND created_by = acting_member AND deleted_at IS NULL` **in the query itself**. A Published (or non-owned, or already-deleted) id is invisible to these routes and returns a plain 404, never a 409 that would confirm existence to a non-owner. This makes mutating a Published record structurally impossible through the API, not merely conditionally rejected. Covered directly by `test_published_cannot_be_edited_deleted_or_republished` and related tests in `backend/tests/test_announcements.py`.

## 6. Self-Mention

**Current rule (Stage A, 2026-08-12 production user acceptance): rejected.** A member may not mention themselves. Enforced at create and Draft-update time by `backend/routers/announcements.py` `_reject_self_mention` (422 if `acting_member` appears in `mention_member_keys`), with the frontend mention picker (`web-view/js/announcements.js`) never offering the option in the first place. Historical self-mention rows (created under the rule below, before Stage A) are preserved — never deleted or mutated — and are excluded only at read time from `_mention_keys` (Published History's mention display, Draft edit prefill) and from `GET /{id}/read-receipts`. See requirement doc §10.2/§10.3 for full rationale.

> **Historical note (Phase 1, superseded by Stage A):** the original Phase-1 design allowed self-mention with no suppression — a self-mention behaved exactly like any other mention (created a `notified_at`-stamped row at Publish, appeared in the creator's own bell feed). This is preserved here as a record of the original decision; it is no longer the current rule.

## 7. Notification Refresh

Frontend polls `GET /api/announcements/notifications` every 30 seconds while `isAuthenticated()` is true and the document is visible (`document.visibilityState === 'visible'`), using a single `setInterval` guarded against duplicate timers, cleared on `CALENDAR_AUTH_CHANGED_EVENT` (auth loss). Also refreshed immediately on: initial authenticated app load, bell click, `document.visibilitychange` firing while visible (Stage A addition, 2026-08-12 — see §10.5), after a successful mark-read, after a successful publish by the current member, on Notification-History-tab activation, and — as of Stage B (2026-08-12, same day, §11) — on every incoming WebSocket `announcement_notification_changed` signal and on every (re)connect of that socket. **Polling itself is unchanged by Stage B** — it remains the correctness fallback; WebSocket only shortens common-case latency.

As of Stage A, the bell itself owns no dropdown and no item rendering — it is a plain navigation trigger to the Announcements workspace's Notification History tab (§10.4 below), which is the single implementation of notification-item rendering, read-marking, and detail display. This removed the original Phase-1 bell dropdown rather than maintaining it as a second, parallel implementation that could drift from the tab.

## 8. API Surface

See the Final Report (§G) delivered with this implementation for the exact route table as built — it matches the discovery report's §L contract with the Draft-mentions correction from §3 above folded in (mentions are edited via the Draft PATCH route's `mention_member_keys` field, reconciled against `announcement_mentions`, not a separate endpoint).

## 9. Migration

`database/migrations/2026-08-12-create-announcements.sql` — **written and executed**. Per explicit instruction, live PostgreSQL migration execution was reserved for the user, and was carried out manually by the user/admin on 2026-08-12 against `order_management_copy` / `management_aios` (Claude Code never executed this file). Live read-only verification after execution confirmed both tables, all columns, all constraints, and all indexes match this design exactly, with 0 rows in either table. See `validation/announcement-notification-migration-execution-check-2026-08-12.md` for full evidence.

## 10. Stage A — Production UX Corrections (2026-08-12 production user acceptance)

No schema change. Every item below operates on the existing `announcements`/`announcement_mentions` tables from §2 — no migration, no new table, no new column. Full business rationale in requirement doc §10; this section covers the technical shape.

### 10.1 Sidebar

`web-view/index.html` — the Announcements `.app-sidebar-group` block moved between the Overview group's closing `</div>` and the Members group's opening `<div class="app-sidebar-group">`. No other file changed (see requirement doc §10.1).

### 10.2 Self-mention enforcement

- `backend/schemas.py` `_validate_mention_keys` — unchanged behavior (dedup + `VALID_MEMBER_KEYS` membership only); docstring updated to explain why self-mention can't be rejected at this layer (no `acting_member` in scope).
- `backend/routers/announcements.py` — new `_reject_self_mention(acting_member, mention_member_keys)`, called from `create_announcement` (before any row is written) and `update_announcement_draft` (before `_reconcile_mentions` runs, only when `mention_member_keys` is supplied). Raises 422 with a fixed detail message.
- `web-view/js/announcements.js` `buildMentionPicker` — filters `MENTION_TARGET_ORDER` against `getStoredMemberKey()` before rendering checkboxes.

### 10.3 Read-time exclusion of the creator (self-mention display/counts)

- `backend/routers/announcements.py` `_mention_keys(db, announcement_id, exclude_member=None)` — new optional param; `_to_out` always calls it with `exclude_member=record.created_by`. Feeds every `AnnouncementOut.mention_member_keys` (Published History display, Draft edit prefill, list/detail responses).
- `GET /{id}/read-receipts` — the mentions query gained `AnnouncementMention.mentioned_member_key != announcement.created_by`; `mentioned_count`/`read_count`/`unread_count` are derived from that already-filtered set, so no separate count adjustment was needed.
- **Also applied to `_notification_query`** (the bell/Notification-History feed — added 2026-08-12 as a Stage A consistency follow-up, closing a gap the first Stage A pass deliberately left open pending confirmation). `_notification_query` gained `Announcement.created_by != acting_member` alongside its existing `mentioned_member_key == acting_member` filter — a member's own notification feed and unread count now exclude their own historical self-mention, exactly like read receipts and mention display already did. Scoped narrowly: only `Announcement.created_by == acting_member` rows are excluded, never a mention on someone else's announcement — proved by `test_mentions_from_other_creators_unaffected_by_own_self_mention_feed_filter`. Same read-time-only discipline as every other Stage A filter: the historical row is never modified or deleted (`test_historical_self_mention_excluded_from_notification_feed_and_unread_count` asserts the row is still present and unread after the API call).

### 10.4 Notification History tab

New third view in `mountAnnouncementsWorkspace` (`web-view/js/announcements.js`), same `role="tablist"`/`role="tabpanel"` pattern as the existing two. Backed by `GET /api/announcements/notifications` at `limit=100` — the endpoint's own maximum (`Query(default=20, ge=1, le=100)`), unlike `listPublished`/`listDrafts`, which allow up to 500; caught by browser-driven verification against the real backend (a fixture-only test would not have surfaced this) and fixed as `NOTIFICATION_HISTORY_LIMIT` — same endpoint the bell already used at `limit=20`, now also mirrored in the workspace's own `api.notifications` slot. Item click → `openNotificationItem`: if `read_at` is already set, opens the announcement detail modal directly (no network call, idempotent); otherwise calls `POST /notifications/{mention_id}/read`, mutates the in-memory item, re-renders, invokes `onChanged()` (refreshes the bell badge), then opens the detail modal via `GET /{announcement_id}`.

### 10.5 Bell → primary destination

`mountAnnouncementBell` no longer builds a dropdown, `state.items`, or any `markRead` call — its only UI is the icon + unread badge. `opts.onOpenHistory` (wired in `initAnnouncements`) runs on click: `document.querySelector('.app-nav-btn[data-tab="announcements"]').click()` (reuses `navigation.js`'s existing `activatePanel` gating verbatim) followed by `currentWorkspace.showNotificationHistory()` (a thin wrapper around the workspace's own `setView('notifications')`).

### 10.6 Body preview

`AnnouncementMentionNotificationOut` gained `body_preview: Optional[str]`. Populated by new helper `_body_preview(body)` (140-char truncation with a trailing `…`) in both `get_notification_feed` and `mark_notification_read` — the announcement row is already joined/loaded in both queries, so this is a free in-memory computation, no extra query or column.

### 10.7 Visibility-triggered refresh

`mountAnnouncementBell` adds a `document.addEventListener('visibilitychange', onVisibilityChange)` alongside the unchanged 30s `setInterval`; `onVisibilityChange` calls the same `refresh()` when `document.visibilityState === 'visible'`. Removed in `stop()` so a remounted bell (on `CALENDAR_AUTH_CHANGED_EVENT`) never accumulates a second listener.

### 10.8 Explicitly out of scope (as of Stage A)

WebSocket, SSE, Redis, Web Push, Service Worker, VAPID — not implemented, not further investigated in Stage A, per explicit user instruction. **WebSocket specifically superseded the same day by Stage B (§11) once the user reviewed current Vercel platform documentation and explicitly approved it.** SSE, Redis, Web Push, Service Worker, and VAPID remain deferred. See requirement doc §10.6/§11.

### 10.9 Tests

`backend/tests/test_announcements.py` — old `test_self_mention_allowed_and_notifies_creator` replaced; added rejection tests (create + Draft update, self-alongside-others, other-members-still-mentionable), historical-row tests (`insert_mention_row` ORM helper bypasses the new API guard to simulate a pre-Stage-A row), and a `body_preview` test. `web-view/js/announcements.test.mjs` — added mention-picker self-exclusion tests, a Published-card "Mentioned line trusts the API" test, replaced the dropdown test block with bell-routing/visibility tests, and added a full Notification History tab test block. New `web-view/js/announcements-sidebar-position.test.mjs` for the sidebar order. `web-view/js/review-summaries-test-dom.mjs` (shared fixture) gained a `document.visibilityState` default so the visibility-refresh behavior is testable.

**2026-08-12 same-day follow-up (notification-feed consistency fix):** three more tests added to `backend/tests/test_announcements.py` — `test_historical_self_mention_excluded_from_notification_feed_and_unread_count` (properties A–E: historical row present, creator's feed/unread count exclude it, another legitimate mentioned member is unaffected, no mutation), `test_mentions_from_other_creators_unaffected_by_own_self_mention_feed_filter` (the exclusion is scoped to `Announcement.created_by == acting_member`, not a blanket name-based filter), and `test_self_mention_rejection_still_enforced_after_notification_feed_fix` (the create/update-time rejection was not loosened). No frontend change was needed — the Notification History tab and bell already render the backend response verbatim, so the fix flows through automatically; confirmed by re-running the existing frontend suite unchanged. Full results in the Stage A final report.

## 11. Stage B — Realtime WebSocket Fast Path (2026-08-12, same day)

No schema change, no migration, no new table. Full business rationale in requirement doc §11; this section covers the implementation shape.

### 11.1 Platform verification (before writing any code)

Web search confirmed, independently of the earlier discovery report: Vercel added native WebSocket support for Python/FastAPI Functions (public beta, Python support July 2026), requiring Fluid Compute (Vercel's current default). Also confirmed: a WebSocket connection is pinned to the one Function instance that accepted it, and Vercel's own recommended pattern for cross-instance coordination is an external store (Redis via the Vercel Marketplace) — this repo provisions none, and provisioning one was explicitly out of scope for this task. This is the basis for §11.7's explicit single-instance limitation.

### 11.2 Configuration

`backend/config.py`:
- `ANNOUNCEMENT_WS_TICKET_ENV_VAR = "ANNOUNCEMENT_WS_TICKET_SECRET"`
- `ANNOUNCEMENT_WS_TICKET_TTL_SECONDS = 60`
- `load_announcement_ws_ticket_secret(environ=None)` — returns the raw secret or `None`; never a placeholder/default. Same optional-but-fail-closed shape as `load_md_review_summary_token_hash` (never crashes app startup), deliberately **not** the same shape as `load_calendar_auth_token_hashes` (which does crash startup) — see requirement doc §11.4 for why. Documented in `.env.example`.

### 11.3 Ticket issuance and validation

`backend/routers/announcements.py`:
- `_issue_ws_ticket(member_key)` — `f"{member_key}.{expires_at}.{hmac_sha256_hex(payload)}"`, `expires_at = now + 60s`. Exposed via `POST /ws-ticket` (`issue_ws_ticket`, `Depends(get_verified_member)` — the exact same auth dependency every other Announcement route uses). 503 if the secret is unconfigured.
- `_validate_ws_ticket(ticket)` — splits into 3 parts, checks `member_key in VALID_MEMBER_KEYS`, recomputes and `hmac.compare_digest`s the signature, checks expiry. Raises `_WsTicketError(reason)` on any failure (`unavailable`/`missing`/`malformed`/`unknown_member`/`bad_signature`/`expired`) — the reason is logged (`ws_auth_rejected`) but the ticket value itself never is.

### 11.4 WebSocket route

`@router.websocket("/ws")` → `/api/announcements/ws` (matches the router's existing `/api/announcements` prefix). `announcements_ws(websocket, ticket)`: validates the ticket **before** `websocket.accept()` — an invalid ticket raises `WebSocketException(code=status.WS_1008_POLICY_VIOLATION)`, so the connection never becomes live. On success: accepts, appends to `_CONNECTIONS[member_key]` (a plain `dict[str, list[WebSocket]]`, module-level, in-process only), then blocks on `await websocket.receive_text()` until `WebSocketDisconnect` (no client→server protocol — §11.5 of the requirement doc). A `finally` block always removes the connection from the registry, logging `ws_connect`/`ws_disconnect`.

### 11.5 Sync-route-to-async-broadcast bridge

`publish_announcement` is a plain `def` (sync), consistent with every other route in this file — SQLAlchemy calls block, and FastAPI runs sync routes in a worker thread via `anyio.to_thread`/`run_in_threadpool`, exactly like the rest of this codebase. Sending over a live `WebSocket` object requires `await`, which a sync function running in a worker thread cannot do directly. `_signal_publish` bridges back onto the same event loop that owns `_CONNECTIONS`/the live `WebSocket` objects via `anyio.from_thread.run(_broadcast_notification_changed, ...)` — the same anyio primitive Starlette's own `run_in_threadpool` uses in reverse. Verified empirically (not just reasoned about) against a real running `TestClient` before writing the test suite: a WebSocket connection opened via `client.websocket_connect(...)` correctly received the broadcast triggered by a concurrent `client.post(.../publish)` call on the same client.

### 11.6 Publish call site — belt-and-suspenders failure isolation

```python
db.commit()
db.refresh(announcement)
try:
    mentioned_keys = _mention_keys(db, announcement.id)
    _signal_publish(mentioned_keys, announcement.id)
except Exception:
    logger.warning("announcement_realtime_signal_failed announcement_id=%s", announcement.id)
return _to_out(db, announcement)
```

Two layers of failure isolation: `_signal_publish` itself catches broadcast failures internally (logs `announcement_realtime_signal_failed`, never raises), AND the call site above catches anything that somehow escapes that (including a hypothetical bug inside the signaling code itself). Either way, the transaction has already committed by this point — nothing downstream of `db.commit()` can roll it back, and the HTTP response is unaffected regardless of what the realtime path does. `_mention_keys(db, announcement.id)` (no `exclude_member` argument here, unlike its Stage-A read-time-filter call sites) is correct as-is: `_reject_self_mention` already guarantees the creator can never be among a *new* announcement's own mentions, so there is nothing to additionally exclude for a freshly-published row.

### 11.7 Scaling — explicit limitation, not concealed

`_CONNECTIONS` is single-instance/best-effort by design — see §11.1. **CROSS-INSTANCE GUARANTEED REALTIME: NOT YET PROVEN.** No shared pub/sub was provisioned (explicitly out of scope this task); the existing Stage A 30-second polling fallback is what makes this an acceptable production posture without that guarantee — WebSocket is a latency optimization layered on top of an already-correct polling architecture, never the sole path to correct state.

### 11.8 Frontend — one lifecycle owner

`web-view/js/config.js` gained `ANNOUNCEMENTS_WS_BASE` (same local-vs-production host-detection pattern as the five existing bases, `ws://`/`wss://` instead of `http://`/`https://`). `web-view/js/announcements.js` `mountAnnouncementBell` — already the sole owner of the Stage A polling/visibility-refresh lifecycle — gained:
- `getWsTicket()` — `POST /ws-ticket` through the existing `annProtectedRequest` (same auth plumbing as every other call in this file; the long-lived member token never leaves that one function).
- `connectRealtimeSocket()` — guarded against duplicate connections by both `wsSocket` (already open) and `wsConnecting` (a ticket request already in flight, closing the race window between those two states); guarded against missing `WebSocketImpl`/`api.wsTicket` (safe no-op, not an error — lets every pre-Stage-B test keep passing unmodified, and gives production the same safe fallback if the browser lacks `WebSocket` for any reason).
- `scheduleWsReconnect()` — bounded backoff table `WS_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000]`, reset to the first entry in `onopen` (a stable connection is never penalized by prior outages), guarded against a duplicate pending timer.
- `stopRealtimeSocket()` — called from the bell's existing `stop()` (already invoked by the `CALENDAR_AUTH_CHANGED_EVENT` handler on logout/token-switch), cancels any pending reconnect and closes an open socket, nulling every handler first so a late-firing event on the old socket can never do anything.
- `onmessage` — parses JSON defensively (a parse failure or any `type` other than `announcement_notification_changed` is silently ignored, never a crash); on the one recognized event, calls the same `refresh()` the poll already uses plus `opts.onRealtimeSignal()`.

`initAnnouncements()` wires `onRealtimeSignal` to `currentWorkspace.reload()` — reusing the workspace's existing `reload()` (History + Drafts + Notification History) verbatim rather than adding a second, narrower reload path.

### 11.9 Tests

`backend/tests/test_announcements.py` — new `AnnouncementsWebSocketTestCase` (17 tests): ticket issuance (requires auth, scoped to the calling member, 503 when unconfigured), connection auth (valid/missing/malformed/expired/bad-signature/unknown-member, identity derived entirely from the ticket), publish signal targeting (mentioned member receives it, Draft create/update do not, an unmentioned member receives nothing, the creator receives no self-signal, multiple mentions each receive their own signal), and realtime-failure-does-not-roll-back-publish (via `mock.patch.object` forcing `_signal_publish` to raise, asserting Publish still returns 200 with the row actually committed). Uses a dedicated `_receive_or_none(ws, timeout=0.5)` helper (a daemon-threaded receive with a timeout) since Starlette's `TestClient` WebSocket session has no built-in receive timeout and would otherwise hang forever proving an absence. `_CONNECTIONS.clear()` added to `tearDown` since that registry is module-level and would otherwise leak across test methods within one test run, unlike the already-fresh-per-test SQLite database.

`web-view/js/announcements.test.mjs` — 13 new tests using an injectable `WebSocketImpl` (mirroring the existing `opts.api` injection pattern) and a `makeFakeWebSocketClass` fixture. `web-view/js/review-summaries-test-dom.mjs` (shared fixture) gained a controllable `setTimeout`/`clearTimeout` stand-in (`_timeouts`, keyed by id, single-shot — a fired callback removes its own entry, matching real timer semantics) so reconnect-backoff tests can inspect and manually fire pending timers without a real 30-second wait.

### 11.10 Local validation

Real Playwright, three isolated browser contexts (Mayurika/Suman/Rajiv) against a real running `backend.main:app` instance (isolated local SQLite — never a real database). Measured: 33ms from the Publish HTTP response to Suman's bell badge updating via the WebSocket signal alone (no manual refresh, no bell click, no polling-tick wait) — well under the 2000ms target. Confirmed: Rajiv (unmentioned) and Mayurika (creator) both receive no signal; the Notification History tab shows the new item at top after a bell click; the HTTP polling fallback still produces correct state after a full page reload. One transient SQLite-concurrency artifact was observed on a `/notifications` request during that reload step — traced to the same throwaway file-based-SQLite-with-a-single-shared-connection verification harness limitation already documented during Stage A validation (never a real database, never production code), not a Stage B defect; the identical code path passes 100% reliably in the real pytest suite, which uses correctly-isolated per-test SQLite with no concurrent access. Full evidence in the Stage B validation asset.

### 11.11 Vercel preview validation — not performed

No Vercel CLI, no `VERCEL_TOKEN`, no `~/.vercel` login state exist in this execution environment (confirmed by direct inspection before claiming otherwise). This task's required Vercel-preview validation step (real `wss://` connection against an actual Vercel deployment) could not be attempted, not merely "attempted and failed" — a materially different, and more honest, status than a platform-runtime failure. See the Stage B validation asset and final report for the precise verdict this produces.

### 11.12 Explicitly still deferred

Web Push, Service Worker, VAPID, native Windows/Chrome notifications — no `sw.js`, no push-subscription table/model, no `pywebpush` dependency, no `Notifications` API UX. Not implemented, not further investigated, per direct instruction.
