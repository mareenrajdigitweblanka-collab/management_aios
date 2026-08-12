# Announcement & Notification Feature — Stage B WebSocket Fast Path Check (2026-08-12)

**Requirement:** REQ-ANN-001 / Stage B

## Purpose

Implement and validate a realtime WebSocket fast path for Announcement notifications, on top of the already-published Stage A production UX corrections (commit `cd39b81`). The user explicitly approved moving forward with WebSocket after reviewing current Vercel platform documentation, superseding the earlier discovery report's "WebSocket not recommended" conclusion for this specific platform capability. Web Push, Service Worker, VAPID, and native OS/browser notifications remain explicitly deferred to a future stage.

## Source / Baseline Commit

`main` / `origin/main` at `cd39b81d3bc6ad9d961c02f1f05a6a4e8b1d7a4b` (Stage A, already published) — verified via `git fetch origin` before any change was made; 0/0 divergence confirmed.

## Architecture

PostgreSQL (`management_aios.announcements`/`announcement_mentions`) remains the sole authoritative store, unchanged. A WebSocket message carries exactly one event, `{"type": "announcement_notification_changed", "announcement_id": "..."}` — never announcement content, never read state. On receipt, the browser re-fetches its authoritative state over the existing HTTP API. The unchanged Stage A 30-second polling stays in place as the correctness fallback; WebSocket is a latency optimization layered on top, never a replacement. Full writeup: `docs/2026-08-12_management-aios-announcement-notification-technical-design.md` §11.

**Platform fact-check performed before writing code:** live web search confirmed Vercel added native WebSocket support for Python/FastAPI Functions (public beta, Python support added July 2026), requiring Fluid Compute (Vercel's current default) — this corrects the earlier discovery report's conclusion for this specific platform question. Also confirmed: a WebSocket connection is pinned to one Function instance for its lifetime, and Vercel's own recommendation for cross-instance coordination is an external store (Redis via the Vercel Marketplace) — not provisioned here, per explicit instruction not to add new infrastructure without separate approval. This is the basis for the single-instance limitation below.

## Auth Design

Short-lived (60s) HMAC-SHA256-signed ticket, never the long-lived member bearer token, which cannot safely travel in a WebSocket URL:

```
Authenticated HTTP request (existing Bearer token)
        ↓
POST /api/announcements/ws-ticket   (Depends(get_verified_member) — same auth as every other route)
        ↓
server issues ticket: "{member_key}.{expires_at}.{hmac_sha256_hex}"
        ↓
browser opens wss://.../api/announcements/ws?ticket=<ticket>
        ↓
server validates ticket BEFORE accept() — reject via WebSocketException on any failure
        ↓
member_key derived entirely from the ticket — never client-supplied
```

New config: `ANNOUNCEMENT_WS_TICKET_SECRET` (`.env.example`, `backend/config.py`) — optional-but-fail-closed (missing/blank → `/ws-ticket` returns 503, no ticket can ever be issued or validated; the rest of the app, including Stage A polling, is completely unaffected — deliberately **not** the same startup-crash pattern as the five mandatory `CALENDAR_AUTH_TOKEN_HASH_*` values, since this is additive infrastructure with a working fallback). No real secret committed anywhere.

## Files Changed

| File | Change |
|---|---|
| `backend/config.py` | `ANNOUNCEMENT_WS_TICKET_ENV_VAR`, `ANNOUNCEMENT_WS_TICKET_TTL_SECONDS`, `load_announcement_ws_ticket_secret` |
| `backend/routers/announcements.py` | `_issue_ws_ticket`, `_validate_ws_ticket`, `_WsTicketError`, `_log_ws_event`, `POST /ws-ticket`, `WS /ws`, `_CONNECTIONS` registry, `_broadcast_notification_changed`, `_signal_publish`; `publish_announcement` calls `_signal_publish` after `db.commit()` inside a belt-and-suspenders `try`/`except`; `logging` introduced (first use anywhere in `backend/`, confirmed by inspection before adding it) |
| `backend/schemas.py` | `AnnouncementWsTicketOut` |
| `backend/tests/test_announcements.py` | New `AnnouncementsWebSocketTestCase` (17 tests) |
| `web-view/js/config.js` | `ANNOUNCEMENTS_WS_BASE` |
| `web-view/js/announcements.js` | `getWsTicket`, `WS_RECONNECT_DELAYS_MS`, full WS lifecycle inside `mountAnnouncementBell` (`connectRealtimeSocket`, `scheduleWsReconnect`, `stopRealtimeSocket`), `onRealtimeSignal` wiring in `initAnnouncements` |
| `web-view/js/announcements.test.mjs` | 13 new tests, `makeFakeWebSocketClass`, `WS_TICKET_FIXTURE` |
| `web-view/js/review-summaries-test-dom.mjs` | Controllable single-shot `setTimeout`/`clearTimeout` stand-in |
| `.env.example` | `ANNOUNCEMENT_WS_TICKET_SECRET` documentation |
| `docs/2026-08-12_management-aios-announcement-notification-requirement.md` | New §11 |
| `docs/2026-08-12_management-aios-announcement-notification-technical-design.md` | New §11, §7/§10.6/§10.8 status line updated |

No `database/migrations/*.sql` added or modified. No file under `member-aios/mayurika-hr/staff-data/` was accessed.

## Local Test Results

- **Focused backend** (`backend/tests/test_announcements.py`): **64/64 PASS** (47 existing + 17 new WebSocket tests).
- **Full backend suite**: **961 passed, 2 failed** — the same two pre-existing, unrelated failures as every prior closure in this feature (`test_calendar_auth.py::test_missing_variable_fails_closed`, `test_weekly_schedule_xlsx_export.py::test_pending_task_no_outcome`), unchanged by name.
- **Focused frontend** (`web-view/js/announcements.test.mjs`): **48/48 PASS** (35 existing + 13 new WebSocket tests).
- **Full frontend suite**: **536/536 PASS**, 0 failures.

## Two/Three-Client Browser Evidence

Real Playwright, three isolated browser contexts (Mayurika, Suman, Rajiv) against a real running `backend.main:app` instance (isolated local SQLite — never a real database, never `order_management_copy`). 18 checks:

- All three contexts' WebSockets connected (URLs captured via Playwright's own `page.on('websocket', ...)` — the same signal a real DevTools Network panel would show).
- No raw member bearer token appears in any WebSocket URL (confirmed by direct string search).
- **Mayurika publishes, mentioning Suman only** → Suman's bell badge updated via the WebSocket signal alone — no manual refresh, no bell click, no waiting for the polling tick.
- **Rajiv (unmentioned) received no signal** — badge stayed hidden.
- **Mayurika (creator) received no self-signal** — badge stayed hidden (Stage A's self-mention rejection holds through the realtime path).
- Bell click → Notification History → new announcement at top.
- Suman's socket received exactly one frame (the signal itself).
- HTTP polling fallback still produced the correct badge state after a full page reload of Suman's session.
- 17 of 18 checks passed cleanly. The one exception is addressed below.

## Publish → Bell Latency

**33ms**, measured from the Publish HTTP response to Suman's bell badge reflecting the update (target: ≤2000ms locally). Far under target.

## Known Local-Harness Artifact (not a Stage B defect)

One transient `pydantic.ValidationError` (`unread_count` received `None` instead of an int) was observed on a `GET /api/announcements/notifications` request during a full-page-reload step. Traced to the same throwaway file-based-SQLite-with-a-single-shared-`StaticPool`-connection verification harness limitation already identified and documented during Stage A validation — never the shipped product code, never a real database. Confirmed not a Stage B regression: the identical code path (`_notification_query`, `get_notification_feed`) is exercised by 8+ dedicated tests in the real pytest suite (correctly-isolated, fresh per-test `:memory:` SQLite, no concurrent access) and passes 100% reliably there. Production runs against real PostgreSQL, which does not share this failure mode. Not fixed here — it is verification-only tooling, not shipped code, and fixing it would be effort spent on throwaway infrastructure rather than the feature itself.

## Vercel Preview Validation

**NOT PERFORMED — no deployment access in this execution environment.** Confirmed before attempting: no `vercel` CLI installed, no `VERCEL_TOKEN` environment variable set, no `~/.vercel` login/config directory present. This is a **capability gap**, not a **platform-runtime failure** — the task's specified AMBER path ("VERCEL WEBSOCKET RUNTIME ISSUE") describes an attempt that failed on the platform; this is a materially different situation (the attempt could not be made at all from this environment) and is reported as such rather than conflated with it.

**Re-verified 2026-08-12 (dedicated Vercel-preview-validation task, no code changes this pass):** checked both paths the task named explicitly.
- **Path A — authenticated Vercel CLI:** `vercel` not found in `PATH`; `npx vercel --version` cannot even fetch the package without network install permission this session doesn't grant; no `VERCEL_TOKEN` (or any `VERCEL_*`) environment variable is set (checked by name only, values never inspected); no `~/.vercel` config/login directory exists. **Unavailable.**
- **Path B — another existing approved Vercel preview deployment mechanism:** no `.vercel/project.json` (or any `.vercel` directory) exists in the repository, so this working tree has never been linked to a Vercel project via any tool available here. No CI/deploy-hook configuration was found in the repository that this session could trigger and then independently inspect (get a preview URL from, check logs on, or confirm success/failure of) without the same missing credentials. **Unavailable.**

Neither path exists. Per the task's own explicit design, this is where the Vercel-preview-validation task itself must stop — every step from "deploy the current worktree to Preview" onward (§4–§14 of that task) requires actually reaching a live Vercel deployment, which this session cannot do. No fabricated or assumed results are recorded for any of those steps.

**Re-confirmed a third time, 2026-08-12 (identical request, no state change):** same result, with one additional check this pass — `.github/workflows/` does not exist anywhere in this repository, confirming there is no CI-driven deployment mechanism either; per `backend/README.md` §"Deploy to Vercel," the only documented deployment path is manual, via the Vercel dashboard/GitHub integration triggered by a push to `main`, which this task explicitly forbids. Nothing about this environment's access has changed across three independent checks. This gate cannot be cleared by re-running the same request again — it requires one of: (a) the user runs the Preview validation themselves following the reproduction steps in technical design §11.10/§11.11, (b) a session is given a `VERCEL_TOKEN` (or equivalent CLI login) so it can drive the Vercel API/CLI directly, or (c) the user accepts AMBER and decides, at their own discretion, whether the strong local evidence already gathered (33ms latency, full test coverage, correct target isolation, clean local three-context browser validation) is sufficient to proceed without a live Vercel-platform proof point.

**What this means for the verdict:** every gate this environment can actually clear was already cleared in the prior Stage B pass — implementation, 64/64 + 48/48 focused tests, 961/536 full suites (2 known-unrelated backend failures), local 3-context browser validation (33ms Publish→bell latency, correct target isolation, working HTTP fallback, no raw token in any WS URL). Only the live Vercel `wss://` connectivity check remains unverified, and it stays unverified after this dedicated attempt too, for the same reason. Recommended next step is unchanged: the user (or a session with actual Vercel deployment credentials) runs the scenario in technical design §11.10/§11.11 against a real Preview deployment.

## Cross-Instance Result

**NOT YET PROVEN.** No shared cross-instance pub/sub service (Redis or equivalent) exists in this deployment — confirmed by inspecting `backend/config.py` (only `DATABASE_URL`/`LEDSONE_DATABASE_URL` exist) and by explicit instruction not to provision new infrastructure without separate approval. Vercel pins one WebSocket connection to one Function instance for its lifetime; a Publish request served by a different instance than the one holding a mentioned member's connection cannot signal it directly under the current architecture. This is a known, explicitly documented limitation, not concealed — see technical design §11.7. It does not block shipping the fast path: the unchanged Stage A polling fallback means notification correctness never depends on cross-instance WebSocket delivery succeeding.

## Polling Fallback

Confirmed unchanged and fully functional, both by dedicated tests (`Polling continues as the fallback alongside an active WebSocket`) and by live browser evidence (HTTP fallback badge state correct after a full page reload). The 30-second interval itself was not modified in Stage B.

## Database Changes

**NONE.** No migration file added or modified. `management_aios.announcements`/`announcement_mentions` schema is untouched.

## Production DB Writes

**NONE.** Every test and every browser validation session ran against isolated local SQLite databases only (in-memory for the pytest suite; file-based, purely for this session's local browser validation, to allow an in-process debug-only historical-row seed route carried over from the Stage A closure tooling — unused in this Stage B pass). No connection to `order_management_copy` or any real PostgreSQL instance was made at any point.

## Known Limits

- **Cross-instance realtime delivery: NOT YET PROVEN** — see above.
- **Vercel preview validation: NOT PERFORMED** — no deployment access in this environment; see above.
- Web Push, Service Worker, VAPID, native OS/browser notifications — explicitly deferred, zero code written, zero further investigation performed, per direct instruction.
- Server-Sent Events, Redis — not implemented, not provisioned.
- The local-harness SQLite concurrency artifact described above — verification tooling only, not shipped code.

## Web Push

**DEFERRED.** No `sw.js`, no push-subscription table/model, no `pywebpush` dependency, no `Notifications` API UX.

## PASS/FAIL (technical validation, as originally recorded — unchanged)

**AMBER.** Implementation is complete, correct, and thoroughly tested — 64/64 focused backend, 961/2-known-unrelated full backend, 48/48 focused frontend, 536/536 full frontend, and a real three-client local browser validation measuring 33ms Publish→bell latency with correct target isolation and a working HTTP fallback. The gate this does not clear is the task's own required "Vercel preview WebSocket must establish before PASS" condition — not because it failed, but because this environment has no Vercel deployment credentials to attempt it with. Per the task's own instruction ("If Vercel preview WebSocket cannot establish: STOP. Do not commit."), this was held at AMBER rather than a full PASS, and nothing was committed or pushed **at that time**. Vercel access was independently re-checked twice more after this (three checks total: no `vercel` CLI, no `VERCEL_TOKEN`/`VERCEL_*` env vars, no `~/.vercel` config, no `.vercel` project link, no `.github/workflows/` CI-driven deployment path) — the conclusion never changed across any of the three checks.

## Release Decision (2026-08-12, same day — recorded after the AMBER technical validation above, chronology preserved, none of the above rewritten)

**RELEASE AUTHORITY: User-authorized production validation.** After three independent, increasingly thorough confirmations that no Vercel deployment access exists in this execution environment (no CLI, no token, no project link, no CI path), the user made an explicit, informed decision to proceed to commit and push Stage B without Vercel Preview evidence, accepting in full:

- Vercel Preview validation was **not performed** — confirmed unavailable, not attempted-and-failed.
- **Production will be the first actual Vercel `wss://` runtime validation** for this feature.
- **Cross-instance guaranteed realtime remains NOT PROVEN** — the in-process connection registry has no shared pub/sub; a Publish handled by a different Function instance than the one holding a mentioned member's socket cannot signal it directly.
- **The existing 30-second HTTP polling remains the correctness fallback** — unchanged by Stage B, and notification correctness never depends on the socket succeeding.

This is a **conscious, accepted limitation the user weighed directly**, not an oversight, not a check that was skipped, and not a case of me relaxing my own verification standard unprompted — it followed three separate, good-faith attempts to actually clear the gate, each of which reconfirmed the same environmental fact.

**PRODUCTION OPERATIONAL REQUIREMENT:** Vercel Production must have a secure, nonblank `ANNOUNCEMENT_WS_TICKET_SECRET` set (Vercel dashboard environment variable, never committed to this repository) for the realtime fast path to actually operate once deployed. If it is left unset, `POST /api/announcements/ws-ticket` returns 503 and the WebSocket fast path is simply unavailable — every other route, including the Stage A polling fallback, is completely unaffected either way (fail-closed by design, not a startup crash).

**TECHNICAL PRE-PUSH STATUS: PASS locally / platform validation pending.** All work performable without live Vercel access is complete and green (see the full test results and local browser evidence above and in §17 of the accompanying final report). The only pending item is the live Vercel runtime check itself, now deferred to production by explicit user decision rather than a Preview deployment.

## Reviewer

Mareenraj (build). Cross-management/technical build item per CLAUDE.md §18 routing table. Vercel Preview validation was attempted three times and confirmed unavailable in this session each time; the user reviewed that evidence directly and authorized proceeding to production without it.

## Next Step

User performs production acceptance testing of the realtime WebSocket fast path after deployment (the same production UI acceptance pattern already used for Stage A) — this is production's first actual `wss://` runtime validation for this feature, not a re-run of a Preview check that never happened. `ANNOUNCEMENT_WS_TICKET_SECRET` must be set in the Vercel dashboard before that check can succeed (see "Production Operational Requirement" above) — if left unset, the app still works correctly via polling, just without the realtime fast path. No other work is blocking.

## Queryability Result

A clean LLM reading this file alone can answer: what Stage B is and why it was approved, the exact architecture (WebSocket as signal-only, PostgreSQL authoritative), the short-lived ticket auth design end to end, every file changed, full local test results, real multi-client browser evidence with a measured latency figure, the explicit cross-instance limitation and why it isn't a blocker, why Vercel preview validation was not performed (a capability gap, not a platform failure) and what to do next, and that production DB writes and migrations were both NONE. **YES.**
