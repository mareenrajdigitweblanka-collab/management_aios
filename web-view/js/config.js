/* config.js — centralized calendar API endpoints (member schedules + member leave).
   Extracted verbatim from the former inline calendar IIFE (2026-07-17 frontend
   modularization). Local dev (127.0.0.1/localhost) -> local FastAPI; any other
   host -> hosted backend. No logic changed. */

/* Single source of truth for the local backend's port (2026-09-23 —
   previously each of the 7 *_API_BASE constants below repeated the literal
   "8000" independently; a developer running the backend on a different
   local port had no single place to update, and every local API call
   would silently keep hitting whatever was still listening on that port
   instead. One constant, one edit, updates every local base at once.

   backend/README.md documents 8000 as the default local port
   (`python -m uvicorn backend.main:app --reload --port 8000`), but this
   value has already caused two real regressions this same day precisely
   BECAUSE it was pinned here to whichever port happened to be "the"
   backend at the time, while a DIFFERENT local process — sometimes
   stale/pre-dating a new route, sometimes just a different port — kept
   actually answering requests instead:
     - 2026-09-23 #1: committed as 8001 to match one background debugging
       session's backend, silently redirecting every local call (including
       calendar-auth /verify) away from a developer's already-running
       port-8000 backend ("Token not recognized").
     - 2026-09-23 #2 (this change): committed as 8000, but that port-8000
       process had gone stale (started before the "Download all reviews as
       one PDF" route existed) while a freshly started, up-to-date backend
       was actually running on 8001 — "Download all reviews as one PDF"
       404'd even though the route existed in every source file, because
       the LIVE process answering port 8000 simply didn't have it yet.

   There is no way to encode "whichever port your CURRENT backend process
   actually is" as a static committed constant — only a human (or an
   agent acting on their explicit, current-moment instruction) can know
   that. Before changing this value, verify which port's live process
   actually registers the routes you need (e.g. GET
   http://127.0.0.1:<port>/openapi.json and check its "paths"), not just
   which port matches the README default or a comment left by an earlier
   session. If YOUR local backend genuinely runs on a different port than
   whatever is committed here right now, prefer restarting/using the
   backend on the committed port over re-editing this file, since this
   file is shared, not a personal scratch value. */
export var LOCAL_API_PORT = 8001;

/* ── Vercel Preview API routing (REQ-PREVIEW-PROXY-001, 2026-09-28) ───────
   Preview testing problem: a Vercel Preview deployment of this static site
   (hostname like "management-aios-<hash>-<team>.vercel.app") was calling
   the hardcoded PRODUCTION backend literal below, which rejects its origin
   (backend CORS on `main` predates the Preview-origin regex fix that only
   exists on this feature branch) — and even once CORS is fixed, the
   backend's OWN Preview deployment sits behind Vercel Deployment
   Protection (Vercel Authentication), which 302-redirects every
   unauthenticated request, including the CORS preflight itself, before it
   ever reaches FastAPI. A browser cannot safely hold the bypass credential
   for that protection (anything shipped in this file is visible to
   anyone who opens DevTools), so the fix is NOT "point the browser
   directly at a backend Preview URL."

   Two earlier attempts at a code fix were both rejected on investigation
   and are intentionally NOT used here — do not reintroduce either:
     1. An exact match on the CURRENT frontend Preview hostname. Pushing
        this file creates a NEW frontend Preview deployment with a
        DIFFERENT hash-based hostname, so the exact-match branch would
        never be true in the very deployment that ships it.
     2. Deriving the backend Preview hostname by string-replacing
        "management-aios" -> "management-aios-api" in the frontend's own
        hostname. Frontend and backend are separate Vercel projects; each
        deployment gets its own independent, unrelated hash. There is no
        string transform of one project's hostname that can ever compute
        the other project's current hash — confirmed wrong empirically
        (produces a hostname that has never resolved).

   The actual fix: any Preview hostname (detected by PATTERN, not an exact
   hash, so it matches every current and future Preview deployment of this
   project) routes through a same-origin serverless proxy function
   (web-view/api/preview-proxy.js) instead of any cross-origin
   backend URL. Same-origin means no CORS preflight is needed for this hop
   at all. The proxy — not this file — holds the actual backend Preview
   origin and the Deployment Protection bypass secret, both as server-side-
   only Vercel environment variables (see that file's own header for the
   two variable names; neither value is ever present in any file shipped
   to the browser). The proxy also enforces its own path+method allowlist
   — see that file for why "reachable via this proxy" is not the same
   thing as "unrestricted backend access." */
var PREVIEW_HOSTNAME_PATTERN = /^management-aios-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/;
var PREVIEW_PROXY_PREFIX = '/api/preview-proxy';

/* Exported (2026-09-29, Announcements realtime-socket fix) so any module
   that needs to know "is this a Vercel Preview deployment" for a reason
   OTHER THAN picking an HTTP API base — currently only
   announcements.js's connectRealtimeSocket, which must never request a
   ws-ticket or open the WebSocket on Preview at all (see
   ANNOUNCEMENTS_WS_BASE's comment below for why: a ticket issued by the
   backend Preview deployment must never be sent to the production
   WebSocket host this constant still points at on Preview). Reads
   window.location.hostname itself rather than taking it as a parameter,
   same convention as _resolveApiBase below, so every caller shares one
   source of truth instead of each re-reading window.location.hostname. */
export function isPreviewDeploymentHostname() {
  var hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
  return PREVIEW_HOSTNAME_PATTERN.test(hostname);
}

/* Exported (2026-09-29, staff-list Preview-routing fix) so staff-data.js's
   STAFF_API_BASE can reuse this exact host-detection logic instead of
   maintaining its own separate copy — that separate copy (a plain local-
   vs-production IIFE, never updated for Preview hosts) is exactly why
   GET /api/staff kept calling the production backend directly from a
   Preview hostname and got blocked by CORS: it never had a Preview branch
   to begin with, unlike every *_API_BASE constant in this file. See
   staff-data.js's STAFF_API_BASE for the fix and web-view/api/preview-
   proxy.js's ALLOWED_ROUTES for the matching proxy-side allowlist entry
   this also required. */
export function _resolveApiBase(pathPrefix) {
  var hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(hostname);
  if (isLocalHost) {
    return 'http://127.0.0.1:' + LOCAL_API_PORT + '/api/' + pathPrefix;
  }
  if (isPreviewDeploymentHostname()) {
    // Same-origin — routed through web-view/api/preview-proxy.js.
    // Whether this specific pathPrefix is actually served (vs. a clean 404)
    // is decided solely by that function's own ALLOWED_ROUTES allowlist,
    // never by this file.
    return PREVIEW_PROXY_PREFIX + '/api/' + pathPrefix;
  }
  // Production (management-aios.vercel.app) — unchanged from before this
  // task; PREVIEW_HOSTNAME_PATTERN never matches the production hostname
  // (it has no trailing "-<hash>-<team>" segment).
  return 'https://management-aios-api.vercel.app/api/' + pathPrefix;
}

/* Single centralized schedule-API base for all four calendar instances.
   Local dev (opened from 127.0.0.1/localhost, e.g. `python -m http.server`)
   talks to the local FastAPI server. Production (the deployed dashboard at
   https://management-aios.vercel.app) talks to the hosted backend at
   https://management-aios-api.vercel.app (see backend/README.md, "Vercel
   backend project setup"). A Vercel Preview deployment talks to the
   same-origin Preview proxy instead — see the block above. */
export var MEMBER_SCHEDULE_API_BASE = (function () {
  return _resolveApiBase('member-schedules');
}());

/* Leave coordination-copy API base (REQ-LEAVE-COPY-001) — same
   local/production/preview host detection as MEMBER_SCHEDULE_API_BASE,
   just a different route prefix. No leave-deduction minute value
   (270/270/540) is ever hardcoded here or anywhere else in this
   file — every effective_leave_minutes/summary figure this page
   displays comes from the backend response. */
export var MEMBER_LEAVE_API_BASE = (function () {
  return _resolveApiBase('member-leave');
}());

/* Calendar member-token authorization (2026-07-29) — same local/
   production/preview host detection as the two bases above, just a
   different route prefix (backend/routers/calendar_auth.py). Used only by
   calendar/auth.js's verify request. */
export var CALENDAR_AUTH_API_BASE = (function () {
  return _resolveApiBase('calendar-auth');
}());

/* Staff Review Summaries (REQ-CAL-REV-001, 2026-08-03) — same local/
   production/preview host detection as the three bases above, just a
   different route prefix (backend/routers/staff_review_summaries.py).
   Unlike MEMBER_SCHEDULE_API_BASE/MEMBER_LEAVE_API_BASE, every request
   against this base requires a token — including GET — since review-
   summary content is private to the authenticated reviewer (see
   web-view/js/review-summaries.js). Attachments (REQ-CAL-REV-ATTACH-001)
   live under this same base/prefix, so Preview testing of the attachment
   feature is covered by the same proxy allowlist entry as the rest of
   this router — see web-view/api/preview-proxy.js. */
export var STAFF_REVIEW_SUMMARIES_API_BASE = (function () {
  return _resolveApiBase('staff-review-summaries');
}());

/* Knowledge Management (REQ-KM-CRUD-003 backend, REQ-KM-UI-004 frontend
   integration) — same local/production/preview host detection as the four
   bases above, just a different route prefix
   (backend/routers/knowledge_documents.py). LIST/DETAIL are public
   (no token); every other route requires a Calendar member token, exactly
   like Task/Leave's own public-GET/protected-mutation split — unlike
   STAFF_REVIEW_SUMMARIES_API_BASE, where even GET requires a token.
   NOTE: knowledge-documents is intentionally NOT in the Preview proxy's
   allowlist as of REQ-PREVIEW-PROXY-001 (out of scope — not one of the
   paths this Preview testing effort needs); a Preview host will reach the
   proxy and get a clean 404 from it, not a CORS error. Add one line to
   that file's ALLOWED_ROUTES if Knowledge Management Preview testing is
   needed later — no change required here. */
export var KNOWLEDGE_DOCUMENTS_API_BASE = (function () {
  return _resolveApiBase('knowledge-documents');
}());

/* Announcements & Notifications (REQ-ANN-001, 2026-08-12) — same
   local/production/preview host detection as the five bases above, just a
   different route prefix (backend/routers/announcements.py). Every route
   requires a Calendar member token, same as STAFF_REVIEW_SUMMARIES_API_BASE
   and the (revised) KNOWLEDGE_DOCUMENTS_API_BASE — there is no public GET
   here, matching REQ-AUTH-MODULES-007's whole-module-gated convention.
   UPDATED (2026-09-29): Announcements are now AVAILABLE during Preview
   testing over HTTP — web-view/api/preview-proxy.js's ALLOWED_ROUTES now
   includes `/^\/api\/announcements(\/.*)?$/` (GET/POST/PATCH/DELETE),
   covering every HTTP route this base is used for EXCEPT /ws-ticket (see
   ANNOUNCEMENTS_WS_BASE below for why that one specific route is
   deliberately excluded again as of the same-day follow-up fix), including
   the HTTP polling loop itself (web-view/js/announcements.js:97, the
   single shared fetch wrapper `pollTimer`'s interval uses). The realtime
   WebSocket push is a SEPARATE, still-unavailable concern — see
   ANNOUNCEMENTS_WS_BASE below; it does not use this base at all. */
export var ANNOUNCEMENTS_API_BASE = (function () {
  return _resolveApiBase('announcements');
}());

/* Announcements realtime WebSocket (REQ-ANN-001 Stage B, 2026-08-12) —
   deliberately UNCHANGED by REQ-PREVIEW-PROXY-001 or the 2026-09-29
   Announcements-allowlist fix above — still resolves to the literal
   production wss:// host for every non-local hostname, Preview included.
   This is NOT an oversight: Vercel Serverless/Edge Functions (what
   web-view/api/preview-proxy.js is built on) cannot accept or proxy an
   inbound WebSocket upgrade at all — there is no way to make this
   same-origin proxy "support" a live socket, and this file does not
   pretend otherwise.

   SAME-DAY FOLLOW-UP (2026-09-29): the first version of the Announcements
   allowlist fix above also proxied POST /ws-ticket, on the reasoning that
   the HTTP call itself is harmless. It is NOT harmless once you account
   for what happens with the ticket it returns: a ticket issued by the
   BACKEND PREVIEW deployment would still get presented to THIS constant's
   PRODUCTION wss:// host, since no WebSocket proxy exists to make the
   actual socket connection same-origin, and production almost certainly
   does not recognize a ticket issued by a different deployment. Sending a
   Preview-issued credential to production is the wrong direction to fail
   in, even though the practical result (a rejected connection) is the
   same shape as any other socket failure — so this is now prevented at
   the source instead of tolerated: web-view/js/announcements.js's
   connectRealtimeSocket() checks config.js's isPreviewDeploymentHostname()
   FIRST and returns immediately on a Preview hostname, before ever
   calling getWsTicket() or constructing a WebSocket — no ws-ticket
   request, no socket, no reconnect-backoff loop, ever, on Preview. Kept
   out of preview-proxy.js's ALLOWED_ROUTES too, as defense in depth (see
   that file) — the frontend guard above is what actually stops the
   request from ever being sent, but the proxy itself should not accept
   this one path/method even if it were ever called some other way.

   None of this is a regression: every OTHER Announcements feature
   (history, drafts, create/edit/delete/publish, notifications, unread
   count) still works correctly on Preview through the 30s HTTP poll
   (web-view/js/announcements.js mountAnnouncementBell's `pollTimer`),
   which is the documented fallback for exactly this "no realtime socket"
   situation (REQ-ANN-001 Stage A) — only the sub-30s instant push is
   unavailable, exactly as it always was before today's Announcements fix,
   just for a cleaner reason now (deliberately not attempted, rather than
   attempted-and-silently-failing-forever). Making the realtime socket
   itself work on Preview would need a genuinely separate WebSocket-capable
   relay (not a Vercel Function) or a Preview-aware branch here pointed at
   the backend Preview's own wss:// origin AND a ticket-validation change
   on that backend to accept it — out of scope for this fix. */
export var ANNOUNCEMENTS_WS_BASE = (function () {
  var LOCAL_BASE = 'ws://127.0.0.1:' + LOCAL_API_PORT + '/api/announcements';
  var PRODUCTION_BASE = 'wss://management-aios-api.vercel.app/api/announcements';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());
