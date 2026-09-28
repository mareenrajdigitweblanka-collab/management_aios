/* Single-file Preview proxy function placed directly under `api/` so
   Vercel detects it regardless of subfolder/function discovery quirks.
   Behaviour is identical to the previous [...path].js implementation. */

export const config = { runtime: 'edge' };

var PROXY_MOUNT_PREFIX = '/api/preview-proxy';
var WS_PATH_PATTERN = /\/ws(\/|$|\?)/;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { 'content-type': 'application/json' },
  });
}

var ENCODED_DOT_OR_SLASH = /%2e|%2f/i;
var LITERAL_DOT_SEGMENT = /(^|\/)\.\.?(\/|$)/;
function hasSuspiciousPathEncoding(backendPath) {
  return ENCODED_DOT_OR_SLASH.test(backendPath) || LITERAL_DOT_SEGMENT.test(backendPath);
}

var ALLOWED_ROUTES = [
  { pattern: /^\/api\/calendar-auth\/verify$/, methods: ['POST', 'OPTIONS'] },
  { pattern: /^\/api\/member-schedules(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
  { pattern: /^\/api\/member-leave(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
  { pattern: /^\/api\/staff-review-summaries(\/.*)?$/, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] },
];

function isAllowedRoute(backendPath, method) {
  if (hasSuspiciousPathEncoding(backendPath)) { return false; }
  for (var i = 0; i < ALLOWED_ROUTES.length; i += 1) {
    var route = ALLOWED_ROUTES[i];
    if (route.pattern.test(backendPath) && route.methods.indexOf(method) !== -1) { return true; }
  }
  return false;
}

var FORWARD_TO_BACKEND_HEADERS = ['content-type', 'authorization', 'accept'];
var FORWARD_TO_CALLER_HEADERS = ['content-type', 'content-disposition', 'content-length', 'cache-control'];

export default async function handler(request) {
  var url = new URL(request.url);
  var backendPath = url.pathname.slice(PROXY_MOUNT_PREFIX.length) || '/';

  if (WS_PATH_PATTERN.test(backendPath)) {
    return jsonResponse(501, {
      error: 'websocket_not_proxied',
      message: 'This is an HTTP-only Preview proxy; it cannot proxy a WebSocket connection.'
    });
  }

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
      duplex: hasBody ? 'half' : undefined,
      redirect: 'manual',
    });
  } catch (err) {
    return jsonResponse(502, { error: 'upstream_unreachable', message: 'Could not reach the Preview backend.' });
  }

  if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
    return jsonResponse(502, {
      error: 'upstream_protection_blocked',
      message: 'The Preview backend rejected this request before it reached the application (Vercel Deployment Protection).',
    });
  }

  var responseHeaders = new Headers();
  FORWARD_TO_CALLER_HEADERS.forEach(function (name) {
    var value = upstreamResponse.headers.get(name);
    if (value) { responseHeaders.set(name, value); }
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
