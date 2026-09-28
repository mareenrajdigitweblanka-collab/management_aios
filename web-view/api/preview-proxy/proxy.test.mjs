/* proxy.test.mjs — coverage for the Preview API proxy
   (REQ-PREVIEW-PROXY-001, 2026-09-28): rejected paths, invalid-token
   pass-through, upload, download, redirect safety, and unconfigured-env
   fail-closed behavior. Uses Node's built-in fetch/Request/Response/Headers
   (Node >= 18) — no npm dependency, consistent with the rest of this repo's
   test suite. globalThis.fetch is stubbed per test to stand in for the
   Preview backend; each test restores it afterward.

   Run with: node --test *.test.mjs (from web-view/api/preview-proxy/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { isAllowedRoute } from './[...path].js';

var PROXY_ORIGIN = 'https://frontend-preview.example.vercel.app';

function withEnv(env, fn) {
  return async function () {
    var previousEnv = {};
    Object.keys(env).forEach(function (key) {
      previousEnv[key] = process.env[key];
      if (env[key] === undefined) { delete process.env[key]; } else { process.env[key] = env[key]; }
    });
    var previousFetch = globalThis.fetch;
    try {
      await fn();
    } finally {
      Object.keys(previousEnv).forEach(function (key) {
        if (previousEnv[key] === undefined) { delete process.env[key]; } else { process.env[key] = previousEnv[key]; }
      });
      globalThis.fetch = previousFetch;
    }
  };
}

function stubFetch(impl) {
  var calls = [];
  globalThis.fetch = async function (url, init) {
    calls.push({ url: url, init: init });
    return impl(url, init);
  };
  return calls;
}

var CONFIGURED_ENV = {
  PREVIEW_BACKEND_ORIGIN: 'https://backend-preview.example.vercel.app',
  PREVIEW_BACKEND_PROTECTION_BYPASS_SECRET: 'test-bypass-secret-not-real',
};

test('isAllowedRoute: allows calendar-auth verify (POST) and rejects other methods on it', function () {
  assert.equal(isAllowedRoute('/api/calendar-auth/verify', 'POST'), true);
  assert.equal(isAllowedRoute('/api/calendar-auth/verify', 'GET'), false);
  assert.equal(isAllowedRoute('/api/calendar-auth/verify', 'DELETE'), false);
});

test('isAllowedRoute: allows nested staff-review-summaries paths (attachments), rejects unlisted routers', function () {
  assert.equal(isAllowedRoute('/api/staff-review-summaries/attachments', 'POST'), true);
  assert.equal(isAllowedRoute('/api/staff-review-summaries/abc-123/attachments/def-456', 'GET'), true);
  assert.equal(isAllowedRoute('/api/knowledge-documents', 'GET'), false);
  assert.equal(isAllowedRoute('/api/announcements', 'GET'), false);
});

test('isAllowedRoute: anchored patterns reject a name that merely starts with an allowed prefix', function () {
  // "/api/member-schedulesXXXX" must NOT be treated as "/api/member-schedules"
  // with extra junk — the pattern requires either exact end-of-string or a
  // literal "/" before anything further.
  assert.equal(isAllowedRoute('/api/member-schedulesXXXX', 'GET'), false);
  assert.equal(isAllowedRoute('/api/member-schedules', 'GET'), true);
  assert.equal(isAllowedRoute('/api/member-schedules/mayurika', 'GET'), true);
});

test(
  'isAllowedRoute: WHATWG URL dot-segment/percent-encoded-dot normalization never turns a disallowed raw request into an allowed one',
  function () {
    // These mirror new URL() behavior verified directly in this repo:
    // ".." and "%2e%2e" ARE collapsed by URL parsing (before this function
    // ever sees the path); "%2f" (encoded slash) is NOT treated as a path
    // separator, so it never becomes real traversal. Every case below
    // reflects what url.pathname.slice(PROXY_MOUNT_PREFIX.length) actually
    // produces for the given raw request path once handler() parses it —
    // see the end-to-end handler tests below for the same cases exercised
    // through the real handler, including the ones that escape the
    // "/api/preview-proxy" prefix entirely and must therefore never match.
    assert.equal(isAllowedRoute('/calendar-auth/verify', 'POST'), false); // prefix popped away by ".." — never treated as the real calendar-auth route
    assert.equal(isAllowedRoute('/', 'GET'), false);
    assert.equal(isAllowedRoute('//api/calendar-auth/verify', 'POST'), false); // literal double slash, not collapsed by URL parsing — fails safe rather than being lenient
    assert.equal(isAllowedRoute('/api/member-schedules/..%2f..%2fannouncements', 'GET'), false); // %2f stays opaque, single weird segment, matches nothing
  }
);

test(
  'end-to-end: a "../" traversal attempt that pops past the proxy mount prefix entirely resolves to a 404, not the disallowed target',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called'); });
    // Resolves (verified via new URL() in this repo) to pathname "/etc/passwd" —
    // no longer even starts with "/api/preview-proxy", so the prefix-slice
    // arithmetic yields '/' and isAllowedRoute correctly rejects it.
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/../../../etc/passwd', { method: 'GET' });
    var res = await handler(req);
    assert.equal(res.status, 404);
    assert.equal(calls.length, 0);
  })
);

test(
  'end-to-end: "../" from an allowed router toward a disallowed one (e.g. into announcements) still 404s — no cross-router escape',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called'); });
    var req = new Request(
      PROXY_ORIGIN + '/api/preview-proxy/api/member-schedules/../../announcements/ws-ticket',
      { method: 'POST' }
    );
    var res = await handler(req);
    assert.equal(res.status, 404);
    assert.equal(calls.length, 0);
  })
);

test(
  'end-to-end: a query string cannot smuggle a different effective path past the allowlist',
  withEnv(CONFIGURED_ENV, async function () {
    stubFetch(async function (url) {
      // If this ever gets called, assert the query string was forwarded
      // verbatim and never interpreted as part of the path.
      assert.ok(String(url).endsWith('/api/calendar-auth/verify?x=..%2f..%2fannouncements'));
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    var req = new Request(
      PROXY_ORIGIN + '/api/preview-proxy/api/calendar-auth/verify?x=..%2f..%2fannouncements',
      { method: 'POST', headers: { authorization: 'Bearer x' } }
    );
    var res = await handler(req);
    assert.equal(res.status, 200);
  })
);

test(
  'CORRECTED: announcements are fully unavailable through the proxy, not just the WebSocket ticket path — the HTTP polling GET is also rejected',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called — announcements is not in the allowlist'); });
    var pollReq = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/announcements', { method: 'GET' });
    var pollRes = await handler(pollReq);
    assert.equal(pollRes.status, 404);
    var ticketReq = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/announcements/ws-ticket', { method: 'POST' });
    var ticketRes = await handler(ticketReq);
    assert.equal(ticketRes.status, 404);
    assert.equal(calls.length, 0);
  })
);

test(
  'rejected path (not in allowlist) returns 404 and never calls fetch — proves the proxy is not an open relay',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called for a disallowed path'); });
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/knowledge-documents', { method: 'GET' });
    var res = await handler(req);
    assert.equal(res.status, 404);
    assert.equal(calls.length, 0);
    var body = await res.json();
    assert.equal(body.error, 'not_proxied');
  })
);

test(
  'a WebSocket path gets an explicit 501, not a silent 404, and never calls fetch',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called for a websocket path'); });
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/announcements/ws?ticket=abc', { method: 'GET' });
    var res = await handler(req);
    assert.equal(res.status, 501);
    assert.equal(calls.length, 0);
    var body = await res.json();
    assert.equal(body.error, 'websocket_not_proxied');
  })
);

test(
  'missing PREVIEW_BACKEND_ORIGIN fails closed with 503 and never calls fetch',
  withEnv({ PREVIEW_BACKEND_ORIGIN: undefined, PREVIEW_BACKEND_PROTECTION_BYPASS_SECRET: undefined }, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called when unconfigured'); });
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/calendar-auth/verify', {
      method: 'POST',
      headers: { authorization: 'Bearer whatever' },
    });
    var res = await handler(req);
    assert.equal(res.status, 503);
    assert.equal(calls.length, 0);
  })
);

test(
  'an allowed path with an invalid token passes the backend\'s 401 straight through unchanged',
  withEnv(CONFIGURED_ENV, async function () {
    stubFetch(async function () {
      return new Response(JSON.stringify({ detail: 'Invalid token.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/calendar-auth/verify', {
      method: 'POST',
      headers: { authorization: 'Bearer connectivity-check-not-a-real-token' },
    });
    var res = await handler(req);
    assert.equal(res.status, 401);
    var body = await res.json();
    assert.equal(body.detail, 'Invalid token.');
  })
);

test(
  'forwards the Authorization header and the bypass secret to the backend, and never logs either',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(async function () {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    var loggedStrings = [];
    var originalLog = console.log;
    console.log = function () { loggedStrings.push(Array.prototype.join.call(arguments, ' ')); };
    try {
      var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/calendar-auth/verify', {
        method: 'POST',
        headers: { authorization: 'Bearer real-looking-secret-token-value' },
      });
      await handler(req);
    } finally {
      console.log = originalLog;
    }
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers.get('authorization'), 'Bearer real-looking-secret-token-value');
    assert.equal(calls[0].init.headers.get('x-vercel-protection-bypass'), CONFIGURED_ENV.PREVIEW_BACKEND_PROTECTION_BYPASS_SECRET);
    var everLoggedSomethingSensitive = loggedStrings.some(function (line) {
      return line.indexOf('real-looking-secret-token-value') !== -1
        || line.indexOf(CONFIGURED_ENV.PREVIEW_BACKEND_PROTECTION_BYPASS_SECRET) !== -1;
    });
    assert.equal(everLoggedSomethingSensitive, false);
    assert.equal(loggedStrings.length, 0, 'this handler should not console.log anything on a normal request');
  })
);

test(
  'a 302 from the backend (Vercel Deployment Protection) is converted to a 502 and never relayed to the caller as a redirect',
  withEnv(CONFIGURED_ENV, async function () {
    stubFetch(async function () {
      return new Response('Redirecting...', {
        status: 302,
        headers: { location: 'https://vercel.com/sso-api?url=...&nonce=super-secret-nonce-value' },
      });
    });
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/calendar-auth/verify', {
      method: 'POST',
      headers: { authorization: 'Bearer whatever' },
    });
    var res = await handler(req);
    assert.equal(res.status, 502);
    assert.equal(res.headers.get('location'), null);
    var bodyText = await res.text();
    assert.equal(bodyText.indexOf('super-secret-nonce-value'), -1, 'the upstream Location/nonce must never leak into the response body');
    assert.equal(bodyText.indexOf('vercel.com/sso-api'), -1);
  })
);

test(
  'multipart attachment upload (POST) passes status, body, and JSON response through unchanged',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(async function (url, init) {
      assert.equal(init.method, 'POST');
      assert.match(init.headers.get('content-type') || '', /multipart\/form-data/);
      return new Response(JSON.stringify({ id: 'attachment-123', original_filename: 'photo.png' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      });
    });
    var form = new FormData();
    form.append('file', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }), 'photo.png');
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy/api/staff-review-summaries/attachments', {
      method: 'POST',
      headers: { authorization: 'Bearer real-token' },
      body: form,
    });
    var res = await handler(req);
    assert.equal(calls.length, 1);
    assert.equal(res.status, 201);
    var body = await res.json();
    assert.equal(body.id, 'attachment-123');
  })
);

test(
  'binary download (GET) preserves status, Content-Type, Content-Disposition, and exact bytes',
  withEnv(CONFIGURED_ENV, async function () {
    var fileBytes = new Uint8Array([37, 80, 68, 70]); // "%PDF" — arbitrary binary stand-in
    stubFetch(async function () {
      return new Response(fileBytes, {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="review.pdf"',
          'cache-control': 'no-store',
        },
      });
    });
    var req = new Request(
      PROXY_ORIGIN + '/api/preview-proxy/api/staff-review-summaries/abc/attachments/def',
      { method: 'GET', headers: { authorization: 'Bearer real-token' } }
    );
    var res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(res.headers.get('content-disposition'), 'attachment; filename="review.pdf"');
    var returnedBytes = new Uint8Array(await res.arrayBuffer());
    assert.deepEqual(Array.from(returnedBytes), Array.from(fileBytes));
  })
);
