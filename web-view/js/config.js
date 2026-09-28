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
   (web-view/api/preview-proxy/[...path].js) instead of any cross-origin
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

function _resolveApiBase(pathPrefix) {
  var hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) || '';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(hostname);
  if (isLocalHost) {
    return 'http://127.0.0.1:' + LOCAL_API_PORT + '/api/' + pathPrefix;
  }
  if (PREVIEW_HOSTNAME_PATTERN.test(hostname)) {
    // Same-origin — routed through web-view/api/preview-proxy/[...path].js.
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
   this router — see web-view/api/preview-proxy/[...path].js. */
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
   NOTE — Announcements are UNAVAILABLE during Preview testing, in full,
   by explicit scope decision (not a graceful degradation): every
   Announcements call, INCLUDING THE HTTP POLLING LOOP ITSELF (not just
   the realtime-WebSocket ticket fetch), goes through this one base
   (web-view/js/announcements.js:97, the single shared fetch wrapper both
   `pollTimer`'s interval and the ws-ticket call use) — and this base is
   NOT in the Preview proxy's allowlist as of REQ-PREVIEW-PROXY-001, so
   every Announcements request gets a clean 404 from the proxy. There is
   no working fallback path left once this base is blocked: the "HTTP
   polling is the fallback for a missing realtime socket" design
   (REQ-ANN-001 Stage A/Stage B) assumes polling itself can still reach
   the backend, which is exactly the assumption this scope decision
   breaks. If Announcements needs to work during Preview testing, add
   `{ pattern: /^\/api\/announcements(\/.*)?$/, methods: [...] }` (GET/POST
   as needed, excluding /ws — see ANNOUNCEMENTS_WS_BASE below for why) to
   web-view/api/preview-proxy/[...path].js's ALLOWED_ROUTES — no change
   needed here. */
export var ANNOUNCEMENTS_API_BASE = (function () {
  return _resolveApiBase('announcements');
}());

/* Announcements realtime WebSocket (REQ-ANN-001 Stage B, 2026-08-12) —
   deliberately UNCHANGED by REQ-PREVIEW-PROXY-001 — still resolves to the
   literal production wss:// host for every non-local hostname, Preview
   included. This is NOT an oversight: Vercel Serverless/Edge Functions
   (what web-view/api/preview-proxy/[...path].js is built on) cannot accept
   or proxy an inbound WebSocket upgrade at all — there is no way to make
   this same-origin proxy "support" a live socket, and this file does not
   pretend otherwise. Even if ANNOUNCEMENTS_API_BASE's ws-ticket call were
   added to the proxy allowlist per the note above, a ticket obtained
   through the backend PREVIEW would still need to be presented to this
   constant's PRODUCTION wss:// host to be usable at all (no WebSocket
   proxy exists) — production is very unlikely to recognize/validate a
   ticket issued by a different deployment, so this is not a viable manual
   workaround either, only a genuinely separate WebSocket-capable relay
   would be. As things stand today (announcements excluded from the
   allowlist, see above), this constant's value is moot: the ws-ticket
   fetch 404s before any WebSocket connect is ever attempted. */
export var ANNOUNCEMENTS_WS_BASE = (function () {
  var LOCAL_BASE = 'ws://127.0.0.1:' + LOCAL_API_PORT + '/api/announcements';
  var PRODUCTION_BASE = 'wss://management-aios-api.vercel.app/api/announcements';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());
