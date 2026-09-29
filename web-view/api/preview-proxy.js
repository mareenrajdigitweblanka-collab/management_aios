/* web-view/api/preview-proxy.js — Vercel Preview API proxy
   (REQ-PREVIEW-PROXY-001, 2026-09-28; routing fixed 2026-09-29).

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

   ROUTING — why the real backend-relative path arrives as a `path` QUERY
   PARAMETER, not as this function's own URL pathname (root-caused
   2026-09-29, REQ-PREVIEW-PROXY-001 follow-up — see git history on this
   file for the two broken attempts that predated this one):
     Vercel's zero-config `api/` Function routing does NOT support a true
     multi-segment catch-all route (`[...path].js`) outside of the Next.js
     framework — verified empirically with `vercel build` against this
     exact file layout: the platform only ever generates a route matching
     ONE path segment (regex `[^/]+`, no slash) for a bracket file placed
     in a subdirectory, no matter how it is named. A real caller path like
     "/api/preview-proxy/api/calendar-auth/verify" has THREE segments after
     the mount point and can never match that auto-generated route, so the
     platform's own router returns a genuine NOT_FOUND before this function
     (or any function) is ever invoked — this is exactly the bug this
     rewrite fixes, and exactly why an earlier version of this file, and a
     sibling web-view/api/preview-proxy/[...path].js (now removed), never
     actually received a request for anything but the bare mount path.
     web-view/vercel.json's `rewrites` entry (`"/api/preview-proxy/:match*"`
     -> `"/api/preview-proxy?path=/:match*"`) is the documented Vercel
     pattern for a fixed-handler reverse proxy of arbitrary path depth: it
     always routes to this ONE exact function (whose own route Vercel DOES
     generate correctly, since it has no bracket segment), carrying the
     full backend-relative path as the `path` query parameter instead of
     as this function's pathname. See that file for the routing side; see
     `isAllowedRoute`/`hasSuspiciousPathEncoding` below for why reading the
     path from a query value (which — unlike a URL pathname — arrives
     already percent-decoded once by `URLSearchParams.get`) does not weaken
     the traversal defense: both the still-encoded form and the
     already-decoded literal-dot-segment form are checked independently,
     so whichever form a given payload happens to be in when this function
     inspects it, one of the two checks still rejects it.

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

export const config = { runtime: 'edge' };

var WS_PATH_PATTERN = /\/ws(\/|$|\?)/;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'content-type': 'application/json' },
  });
}

/* Explicit path+method allowlist. `pattern` matches the backend-relative
   path carried in the `path` query parameter (see the ROUTING section
   above) — so a request that arrived as
   "/api/preview-proxy?path=/api/calendar-auth/verify" is checked against
   "/api/calendar-auth/verify". Scoped, as of this task, to exactly what
   Preview testing of the review-summary-attachments feature and the
   Calendar it lives inside needs. Exported so the test suite can assert
   coverage/behavior without duplicating this list. */
export var ALLOWED_ROUTES = [
  { pattern: /^\/api\/calendar-auth\/verify$/, methods: ['POST', 'OPTIONS'] },
  { pattern: /^\/api\/member-schedules(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
  { pattern: /^\/api\/member-leave(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
  { pattern: /^\/api\/staff-review-summaries(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
  // Staff Data (backend/routers/staff.py, prefix /api/staff — GET "" and
  // GET "/filter-options" only, no other routes exist on that router).
  // GET-only here too, on purpose: staff-data.js/review-summaries.js/
  // issues.js only ever issue GET against this base (2026-09-29 fix —
  // see web-view/js/staff-data.js's STAFF_API_BASE).
  { pattern: /^\/api\/staff(\/.*)?$/, methods: ['GET', 'OPTIONS'] },
];

/* Defense-in-depth against allowlist escape via an ENCODED path segment
   (found during review, 2026-09-28 — a real gap, not a hypothetical one:
   "/api/member-schedules/..%2f..%2fannouncements" matched the
   member-schedules pattern above, because its "(\/.*)?$" tail is
   deliberately permissive about what comes after the router name — it has
   to be, to allow real sub-paths like "/mayurika" or "/<id>". Kept as two
   INDEPENDENT checks on purpose (2026-09-29 routing fix): the `path` value
   now comes from `URLSearchParams.get`, which percent-decodes its value
   once, so a payload that arrived still-encoded (e.g. a literal "%2f" that
   survived Vercel's own path-to-regex capture) is caught by
   ENCODED_DOT_OR_SLASH, while one that arrived already decoded into a
   literal ".."/"." segment is caught by LITERAL_DOT_SEGMENT — whichever
   form this function actually sees for a given payload, one of the two
   still rejects it. Rejecting either form outright closes the escape: no
   legitimate request this proxy is meant to carry (UUIDs, ISO dates,
   member keys — see VALID_MEMBER_KEYS/UUID-shaped ids in
   backend/config.py) ever needs a literal "%2e"/"%2f" or a literal ".."/"."
   segment in its path. */
var ENCODED_DOT_OR_SLASH = /%2e|%2f/i;
var LITERAL_DOT_SEGMENT = /(^|\/)\.\.?(\/|$)/;

function hasSuspiciousPathEncoding(backendPath) {
  return ENCODED_DOT_OR_SLASH.test(backendPath) || LITERAL_DOT_SEGMENT.test(backendPath);
}

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

/* Query parameters this function itself adds meaning to (or that Vercel's
   rewrite mechanically appends — see web-view/vercel.json: any named
   wildcard segment in a `rewrites` `source`, here `:match*`, is ALWAYS
   also appended as its own query parameter on the compiled route,
   regardless of whether `destination` already references it). Neither is
   a real backend query parameter for any of the four proxied routers
   (verified against backend/routers/*.py) — both are stripped before
   forwarding so the backend only ever sees query parameters the caller
   actually sent. */
var PROXY_INTERNAL_QUERY_PARAMS = ['path', 'match'];

var FORWARD_TO_BACKEND_HEADERS = ['content-type', 'authorization', 'accept'];
var FORWARD_TO_CALLER_HEADERS = ['content-type', 'content-disposition', 'content-length', 'cache-control'];

export default async function handler(request) {
  var url = new URL(request.url);
  var backendPath = url.searchParams.get('path') || '/';

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

  // Rebuild the query string the CALLER actually sent, dropping only this
  // proxy's own internal routing parameters (see PROXY_INTERNAL_QUERY_PARAMS
  // above) — a real caller-supplied query string (e.g. list filters) is
  // forwarded to the backend exactly as sent, same as before this routing
  // fix, when it lived in url.search untouched.
  var forwardParams = new URLSearchParams(url.search);
  PROXY_INTERNAL_QUERY_PARAMS.forEach(function (name) { forwardParams.delete(name); });
  var forwardQuery = forwardParams.toString();
  var upstreamUrl = backendOrigin + backendPath + (forwardQuery ? '?' + forwardQuery : '');

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
