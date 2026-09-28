/* web-view/api/preview-proxy/[...path].js — Vercel Preview API proxy
   (REQ-PREVIEW-PROXY-001, 2026-09-28).

   WHY THIS EXISTS: a Vercel Preview deployment of this static frontend
   cannot safely call the backend's Preview deployment directly from the
   browser. Two separate problems, both explained in web-view/js/config.js's
   own header comment:
     1. Backend Preview CORS may or may not yet allow this exact Preview
        frontend origin (depends on which commit is actually deployed).
     2. The backend Preview sits behind Vercel Deployment Protection
        (Vercel Authentication), which intercepts EVERY request — including
        the CORS preflight itself — with a 302 to vercel.com/sso-api,
        before FastAPI ever runs. Getting past that requires a Protection
        Bypass secret, and that secret must NEVER be embedded in browser
        JavaScript or sent as a header the browser itself attaches (DevTools
        Network tab, and the page's own source, are both fully visible to
        anyone who can open the page).

   THE FIX: this file is a same-origin Vercel Edge Function. The browser
   only ever calls its own origin's "/api/preview-proxy/..." — no CORS
   needed for that hop. This function, running server-side, is the ONLY
   thing that ever holds the backend Preview origin and the bypass secret
   (read from environment variables below — see the two names). It attaches
   the bypass header on the OUTBOUND request it makes to the backend; the
   browser never sees that header or its value.

   ACCESS CONTROL — why "someone has the frontend Preview URL" does not
   become "someone has unrestricted backend access":
     a. This whole deployment (every path, including this one) is itself
        behind Vercel Authentication (confirmed empirically — see the
        investigation this task references). A browser can only reach this
        function at all after its OWN Vercel SSO session cookie for THIS
        project has been established, i.e. only for a Vercel team member
        who has logged in. That protection is Vercel's, not this file's —
        it is not something this file can weaken and it is not relied upon
        as the only control (defense in depth, not the whole defense).
     b. ALLOWED_ROUTES below is an explicit path-pattern + HTTP-method
        allowlist, checked BEFORE reading any environment variable or
        making any outbound request. Any path/method not listed here gets
        a plain 404 from this function and never reaches the backend at
        all — this is not an open reverse proxy.
     c. The Authorization bearer header a caller sends is forwarded
        UNCHANGED to the backend. This function adds no privilege of its
        own: backend/routers/calendar_auth.py's own per-member token check
        still runs exactly as it does for every other caller, so a mutating
        request through this proxy needs a genuinely valid member token,
        exactly as it would calling the backend directly. The proxy only
        ever widens WHICH HOST can be reached for an allowlisted path — it
        never widens WHO is allowed to act once there.
     d. The bypass secret is added ONLY to the server-to-server request
        this function makes to the backend — never returned to, or made
        available to, the browser in any response.

   Server-side-only Vercel environment variables this function reads
   (names only — set real values only in the Vercel dashboard, scoped to
   the Preview environment, never committed to this repository, never
   duplicated into web-view/js/config.js or any other browser-shipped
   file):
     - PREVIEW_BACKEND_ORIGIN
         The backend Preview deployment's origin, e.g.
         "https://management-aios-4157vc2ec-digitweb1.vercel.app" — no
         trailing slash. Changes every time the backend Preview redeploys;
         update this one dashboard value, no code/redeploy of THIS project
         required for Vercel to pick up a fresh value on next invocation
         once the platform's normal env-var-change/redeploy behavior is
         satisfied for this project.
     - PREVIEW_BACKEND_PROTECTION_BYPASS_SECRET
         The backend project's Vercel Authentication "Protection Bypass for
         Automation" secret (generated on the BACKEND project's own
         Deployment Protection settings, then copied into THIS project's
         env vars under this name — Vercel does not share it across
         projects automatically). Optional: if unset, requests proceed
         without the bypass header and will get whatever Deployment
         Protection returns (see the 3xx handling below) — this function
         never invents a value or silently disables protection.

   NOT SUPPORTED, ON PURPOSE — WebSocket: Vercel Edge/Serverless Functions
   cannot accept or proxy an inbound WebSocket upgrade. Any request whose
   path targets the Announcements WebSocket route gets an explicit 501
   with a clear message (see WS_PATH_PATTERN below) — this file never
   silently 404s a WebSocket attempt in a way that could be mistaken for
   "not allowlisted yet." Realtime Announcements has an existing
   HTTP-polling fallback (REQ-ANN-001 Stage A) for exactly this situation;
   see web-view/js/config.js's ANNOUNCEMENTS_WS_BASE comment. */

export var config = { runtime: 'edge' };

/* Explicit path+method allowlist. `pattern` matches the backend-relative
   path (i.e. AFTER stripping the "/api/preview-proxy" prefix this
   function is mounted under) — so a request to
   "/api/preview-proxy/api/calendar-auth/verify" is checked against
   "/api/calendar-auth/verify". Scoped, as of this task, to exactly what
   Preview testing of the review-summary-attachments feature and the
   Calendar it lives inside needs. Exported so the test suite can assert
   coverage/behavior without duplicating this list. */
export var ALLOWED_ROUTES = [
  { pattern: /^\/api\/calendar-auth\/verify$/, methods: ['POST', 'OPTIONS'] },
  { pattern: /^\/api\/member-schedules(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
  { pattern: /^\/api\/member-leave(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
  { pattern: /^\/api\/staff-review-summaries(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
];

var PROXY_MOUNT_PREFIX = '/api/preview-proxy';
var WS_PATH_PATTERN = /\/ws(\/|$|\?)/;

/* Defense-in-depth against allowlist escape via an ENCODED path segment
   (found during review, 2026-09-28 — a real gap, not a hypothetical one:
   "/api/member-schedules/..%2f..%2fannouncements" matched the
   member-schedules pattern above, because its "(\/.*)?$" tail is
   deliberately permissive about what comes after the router name — it has
   to be, to allow real sub-paths like "/mayurika" or "/<id>". "new URL()"
   parsing does NOT decode "%2f"/"%2e" for routing purposes (verified in
   this repo — see proxy.test.mjs), so a literal "..%2f..%2f" segment
   survives untouched all the way into backendPath and would have been
   FORWARDED to the real backend as-is. The backend's own ASGI server
   performs its own percent-decoding when building its request path, which
   could then interpret that segment as real ".." traversal and route to a
   DIFFERENT, non-allowlisted router (e.g. announcements) — exactly the
   "escape the allowlist" scenario this proxy exists to prevent. Rejecting
   any encoded dot/slash outright closes this: no legitimate request this
   proxy is meant to carry (UUIDs, ISO dates, member keys — see
   VALID_MEMBER_KEYS/UUID-shaped ids in backend/config.py) ever needs a
   literal "%2e" or "%2f" in its path. A literal ".."/"." segment is also
   rejected as a second, independent check — new URL() should already
   collapse those during parsing, but this does not rely on that being
   true in every runtime forever. */
var ENCODED_DOT_OR_SLASH = /%2e|%2f/i;
var LITERAL_DOT_SEGMENT = /(^|\/)\.\.?(\/|$)/;

function hasSuspiciousPathEncoding(backendPath) {
  return ENCODED_DOT_OR_SLASH.test(backendPath) || LITERAL_DOT_SEGMENT.test(backendPath);
}

/* Response headers copied from the caller's request onto the OUTBOUND
   request to the backend. Deliberately short and explicit — never a
   blanket "copy every header" (that would also forward this project's own
   Vercel-internal headers, Host, etc. to a different origin). */
var FORWARD_TO_BACKEND_HEADERS = ['content-type', 'authorization', 'accept'];

/* Response headers copied from the backend's response back to the caller.
   Deliberately short and explicit for the same reason — never a blanket
   copy, which could leak backend-internal headers (Set-Cookie, Server,
   X-Vercel-Id, etc.) into a browser response. */
var FORWARD_TO_CALLER_HEADERS = ['content-type', 'content-disposition', 'content-length', 'cache-control'];

export function isAllowedRoute(backendPath, method) {
  if (hasSuspiciousPathEncoding(backendPath)) { return false; }
  for (var i = 0; i < ALLOWED_ROUTES.length; i += 1) {
    var route = ALLOWED_ROUTES[i];
    if (route.pattern.test(backendPath) && route.methods.indexOf(method) !== -1) {
      return true;
    }
  }
  return false;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'content-type': 'application/json' },
  });
}

export default async function handler(request) {
  var url = new URL(request.url);
  var backendPath = url.pathname.slice(PROXY_MOUNT_PREFIX.length) || '/';

  // WebSocket — explicit, not a fallthrough 404 (see module header).
  if (WS_PATH_PATTERN.test(backendPath)) {
    return jsonResponse(501, {
      error: 'websocket_not_proxied',
      message: 'This is an HTTP-only Preview proxy; it cannot proxy a WebSocket connection. ' +
        'Realtime Announcements falls back to HTTP polling automatically when no socket is available.',
    });
  }

  // Path+method allowlist — checked BEFORE any env var is read or any
  // outbound request is made (see ACCESS CONTROL §b above).
  if (!isAllowedRoute(backendPath, request.method)) {
    return jsonResponse(404, { error: 'not_proxied', message: 'This path/method is not proxied for Preview testing.' });
  }

  var backendOrigin = process.env.PREVIEW_BACKEND_ORIGIN;
  if (!backendOrigin) {
    return jsonResponse(503, {
      error: 'preview_backend_not_configured',
      message: 'PREVIEW_BACKEND_ORIGIN is not set for this deployment.',
    });
  }

  var forwardHeaders = new Headers();
  FORWARD_TO_BACKEND_HEADERS.forEach(function (name) {
    var value = request.headers.get(name);
    // Never logged, never inspected beyond this direct pass-through — see
    // ACCESS CONTROL §d and the "Preserve authorization headers without
    // logging them" requirement this task was built against.
    if (value) { forwardHeaders.set(name, value); }
  });
  var bypassSecret = process.env.PREVIEW_BACKEND_PROTECTION_BYPASS_SECRET;
  if (bypassSecret) { forwardHeaders.set('x-vercel-protection-bypass', bypassSecret); }

  var hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  var upstreamUrl = backendOrigin + backendPath + url.search;

  var upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: hasBody ? request.body : undefined,
      // Node/Edge fetch requires this when streaming a request body.
      duplex: hasBody ? 'half' : undefined,
      // NEVER auto-follow — see the 3xx handling immediately below.
      redirect: 'manual',
    });
  } catch (err) {
    return jsonResponse(502, { error: 'upstream_unreachable', message: 'Could not reach the Preview backend.' });
  }

  // A 3xx here — from either Vercel Deployment Protection (a redirect to
  // vercel.com/sso-api) or any other unexpected redirect — must NEVER be
  // relayed to the browser as if it were the API's own response: a
  // fetch()-based caller would either silently follow it to a login page
  // (and try to parse HTML as JSON) or the browser would surface a
  // confusing opaque-redirect error. Convert it into one clear, bounded
  // error instead. The upstream Location value (which contains a
  // single-use nonce) is deliberately not included in this response body.
  if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
    return jsonResponse(502, {
      error: 'upstream_protection_blocked',
      message: 'The Preview backend rejected this request before it reached the application ' +
        '(Vercel Deployment Protection). Check PREVIEW_BACKEND_PROTECTION_BYPASS_SECRET.',
    });
  }

  var responseHeaders = new Headers();
  FORWARD_TO_CALLER_HEADERS.forEach(function (name) {
    var value = upstreamResponse.headers.get(name);
    if (value) { responseHeaders.set(name, value); }
  });

  // Body is streamed through unchanged — this is what makes JSON,
  // multipart attachment uploads, and binary attachment/PDF/ZIP downloads
  // all work identically through this proxy: nothing here ever parses,
  // buffers-and-reserializes, or otherwise inspects the body.
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
