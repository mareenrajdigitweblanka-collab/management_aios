/* preview-proxy.test.mjs — coverage for the Preview API proxy
   (REQ-PREVIEW-PROXY-001, 2026-09-28; routing fixed 2026-09-29): rejected
   paths, invalid-token pass-through, upload, download, redirect safety,
   unconfigured-env fail-closed behavior, and (2026-09-29) the actual
   routing shape a real Vercel Preview request arrives in. Uses Node's
   built-in fetch/Request/Response/Headers/URLSearchParams (Node >= 18) —
   no npm dependency, consistent with the rest of this repo's test suite.
   globalThis.fetch is stubbed per test to stand in for the Preview
   backend; each test restores it afterward.

   Run with: node --test preview-proxy.test.mjs (from web-view/api/)

   WHY THE REQUEST URLS BELOW LOOK LIKE "?path=/api/..." INSTEAD OF
   "/api/preview-proxy/api/...": this is the actual bug this file's
   sibling code fixes (see web-view/api/preview-proxy.js's own "ROUTING"
   header section and web-view/vercel.json). Vercel's zero-config `api/`
   Function routing cannot deliver a multi-segment sub-path to this
   function's own URL pathname outside the Next.js framework — verified
   empirically with `vercel build` against this exact file layout, not
   assumed. web-view/vercel.json's `rewrites` entry is what actually
   carries the real backend-relative path here, as the `path` query
   parameter, for every real Preview request. A test that instead built
   requests against "/api/preview-proxy/api/..." (the previous version of
   this file did exactly that) would keep passing while exercising a
   shape Vercel never actually delivers — which is exactly how the
   original bug shipped unnoticed. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import handler, { isAllowedRoute } from './preview-proxy.js';

var PROXY_ORIGIN = 'https://frontend-preview.example.vercel.app';

function proxyUrl(backendPath, extraQuery) {
  var params = new URLSearchParams(extraQuery || '');
  params.set('path', backendPath);
  return PROXY_ORIGIN + '/api/preview-proxy?' + params.toString();
}

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

test('vercel.json: the Preview proxy is wired with a wildcard rewrite to this one exact function, not the old no-op identity route', function () {
  // Regression guard for the actual bug (2026-09-29): an earlier version of
  // this file used the legacy `routes` property with `dest` identical to
  // `src` (a no-op that also pre-empted Vercel's own filesystem/function
  // routing phase for every "/api/preview-proxy/*" request — confirmed via
  // `vercel build` to resolve to a platform-level 404 for any sub-path,
  // exactly matching the reported bug). This asserts the config shape that
  // replaced it stays in place: a `rewrites` entry whose `source` is a
  // multi-segment wildcard mounted under /api/preview-proxy, and whose
  // `destination` targets the flat function path with the match carried
  // as a `path` query value (not reproduced back into the pathname).
  var configPath = fileURLToPath(new URL('../vercel.json', import.meta.url));
  var config = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.equal(config.routes, undefined, 'must not reintroduce the legacy no-op "routes" identity rewrite');
  assert.ok(Array.isArray(config.rewrites) && config.rewrites.length >= 1);
  var rewrite = config.rewrites.filter(function (r) {
    return typeof r.source === 'string' && r.source.indexOf('/api/preview-proxy/') === 0;
  })[0];
  assert.ok(rewrite, 'expected a rewrite mounted under /api/preview-proxy/');
  assert.match(rewrite.source, /:\w+\*$/, 'source must use a repeated ("*") wildcard segment, not a fixed one, to cover arbitrary sub-path depth');
  assert.equal(rewrite.destination.indexOf('/api/preview-proxy?path='), 0, 'destination must target the flat function path and carry the real path via the "path" query parameter');
});

test('isAllowedRoute: allows calendar-auth verify (POST) and rejects other methods on it', function () {
  assert.equal(isAllowedRoute('/api/calendar-auth/verify', 'POST'), true);
  assert.equal(isAllowedRoute('/api/calendar-auth/verify', 'GET'), false);
  assert.equal(isAllowedRoute('/api/calendar-auth/verify', 'DELETE'), false);
});

test('isAllowedRoute: allows nested staff-review-summaries paths (attachments), rejects unlisted routers', function () {
  assert.equal(isAllowedRoute('/api/staff-review-summaries/attachments', 'POST'), true);
  assert.equal(isAllowedRoute('/api/staff-review-summaries/abc-123/attachments/def-456', 'GET'), true);
  // knowledge-documents remains intentionally excluded (out of scope — see
  // web-view/js/config.js's KNOWLEDGE_DOCUMENTS_API_BASE comment).
  // announcements is NOT listed here anymore — it moved to its own
  // dedicated test block below (2026-09-29 fix: now allowed).
  assert.equal(isAllowedRoute('/api/knowledge-documents', 'GET'), false);
});

test('isAllowedRoute: anchored patterns reject a name that merely starts with an allowed prefix', function () {
  // "/api/member-schedulesXXXX" must NOT be treated as "/api/member-schedules"
  // with extra junk — the pattern requires either exact end-of-string or a
  // literal "/" before anything further.
  assert.equal(isAllowedRoute('/api/member-schedulesXXXX', 'GET'), false);
  assert.equal(isAllowedRoute('/api/member-schedules', 'GET'), true);
  assert.equal(isAllowedRoute('/api/member-schedules/mayurika', 'GET'), true);
});

test('isAllowedRoute: Staff Data (2026-09-29 fix) — GET-only, "" and "/filter-options" allowed, never confused with staff-review-summaries', function () {
  assert.equal(isAllowedRoute('/api/staff', 'GET'), true);
  assert.equal(isAllowedRoute('/api/staff/filter-options', 'GET'), true);
  // Read-only router (backend/routers/staff.py has no POST/PUT/PATCH/DELETE
  // route at all) — mutation methods must stay rejected even though the
  // path itself is allowlisted.
  assert.equal(isAllowedRoute('/api/staff', 'POST'), false);
  assert.equal(isAllowedRoute('/api/staff', 'DELETE'), false);
  // "/api/staff-review-summaries" starts with "/api/staff" but the next
  // character is "-", not "/" or end-of-string — must not accidentally
  // match the new staff pattern (same anchoring guarantee as the test
  // above, checked against this specific new entry).
  assert.equal(isAllowedRoute('/api/staff-review-summaries', 'GET'), true); // allowed by ITS OWN pattern, not this one — see next line
  assert.equal(isAllowedRoute('/api/staffXXXX', 'GET'), false);
});

test('isAllowedRoute: Announcements (2026-09-29 fix; ws-ticket/ws excluded same-day) — every HTTP route web-view/js/announcements.js actually calls (other than ws-ticket) is permitted', function () {
  // Every path+method pair from announcements.js's own API-contract header
  // comment (announcements.js:14-23), checked individually — EXCEPT
  // POST /ws-ticket, which is deliberately excluded (see the rejected-path
  // test below and web-view/js/config.js's ANNOUNCEMENTS_WS_BASE comment
  // for why).
  assert.equal(isAllowedRoute('/api/announcements', 'GET'), true); // listPublishedAnnouncements
  assert.equal(isAllowedRoute('/api/announcements/drafts', 'GET'), true); // listOwnDrafts
  assert.equal(isAllowedRoute('/api/announcements/notifications', 'GET'), true); // getNotificationFeed (the HTTP polling loop)
  assert.equal(isAllowedRoute('/api/announcements/123', 'GET'), true); // getAnnouncement
  assert.equal(isAllowedRoute('/api/announcements/123/read-receipts', 'GET'), true); // getReadReceipts
  assert.equal(isAllowedRoute('/api/announcements', 'POST'), true); // createAnnouncementDraft
  assert.equal(isAllowedRoute('/api/announcements/notifications/456/read', 'POST'), true); // markNotificationRead
  assert.equal(isAllowedRoute('/api/announcements/123/publish', 'POST'), true); // publishAnnouncementDraft
  assert.equal(isAllowedRoute('/api/announcements/123', 'PATCH'), true); // updateAnnouncementDraft
  assert.equal(isAllowedRoute('/api/announcements/123', 'DELETE'), true); // deleteAnnouncementDraft
});

test('isAllowedRoute: Announcements — a method this router has no route for is rejected even on an otherwise-allowed path', function () {
  assert.equal(isAllowedRoute('/api/announcements', 'PUT'), false); // no PUT route exists on this router at all
  assert.equal(isAllowedRoute('/api/announcements/123', 'PUT'), false);
});

test('isAllowedRoute: Announcements — "/ws-ticket" and "/ws" are rejected on EVERY method, including the methods those two routes actually use (POST and the WebSocket upgrade respectively)', function () {
  // A ticket issued by the backend Preview deployment must never be
  // usable through this proxy at all — see web-view/js/config.js's
  // ANNOUNCEMENTS_WS_BASE comment for the full rationale. This is
  // defense in depth: web-view/js/announcements.js's connectRealtimeSocket
  // is what actually stops the request from ever being sent on a Preview
  // hostname (see announcements.test.mjs's Preview-guard tests) — this
  // allowlist entry means even a request that somehow bypassed that
  // frontend guard would still be rejected here.
  assert.equal(isAllowedRoute('/api/announcements/ws-ticket', 'POST'), false);
  assert.equal(isAllowedRoute('/api/announcements/ws-ticket', 'GET'), false);
  assert.equal(isAllowedRoute('/api/announcements/ws', 'GET'), false);
  // "/ws-ticketXXXX" and "/wsXXXX" must NOT be treated as "/ws-ticket"/"/ws"
  // with extra junk — the lookahead requires either exact end-of-string or
  // a literal "/" immediately after "ws-ticket"/"ws", same anchoring
  // guarantee this file's other patterns already have.
  assert.equal(isAllowedRoute('/api/announcements/ws-ticketXXXX', 'POST'), true);
  assert.equal(isAllowedRoute('/api/announcements/wsXXXX', 'GET'), true);
});

test('isAllowedRoute: a literal or percent-encoded dot-segment is rejected however it happens to reach this function', function () {
  assert.equal(isAllowedRoute('/api/member-schedules/../../announcements', 'GET'), false); // already-decoded literal ".." — caught by LITERAL_DOT_SEGMENT
  assert.equal(isAllowedRoute('/api/member-schedules/..%2f..%2fannouncements', 'GET'), false); // still-encoded "%2f" — caught by ENCODED_DOT_OR_SLASH
  assert.equal(isAllowedRoute('/', 'GET'), false);
});

test(
  'end-to-end: the real Vercel Preview request shape — a multi-segment backend-relative path carried via the "path" query parameter — is extracted and allowed correctly',
  withEnv(CONFIGURED_ENV, async function () {
    // This is the exact bug this task fixes: web-view/vercel.json's rewrite
    // (`/api/preview-proxy/:match*` -> `/api/preview-proxy?path=/:match*`)
    // is the only thing that ever gets a THREE-segment backend path
    // ("api/calendar-auth/verify") to this function at all, since Vercel's
    // own zero-config catch-all can't carry it in the pathname. If this
    // extraction ever regresses (e.g. back to reading url.pathname), this
    // test fails because the request below has no sub-path in its
    // pathname — only in its query string, exactly like production.
    var calls = stubFetch(async function () {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    var req = new Request(proxyUrl('/api/calendar-auth/verify'), {
      method: 'POST',
      headers: { authorization: 'Bearer x' },
    });
    var res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://backend-preview.example.vercel.app/api/calendar-auth/verify');
  })
);

test(
  'end-to-end: a deeply nested multi-segment path (staff-review-summaries attachment) resolves through the same query-carried mechanism',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(async function () {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    var req = new Request(proxyUrl('/api/staff-review-summaries/abc-123/attachments/def-456'), {
      method: 'GET',
      headers: { authorization: 'Bearer x' },
    });
    var res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(calls[0].url, 'https://backend-preview.example.vercel.app/api/staff-review-summaries/abc-123/attachments/def-456');
  })
);

test(
  'end-to-end (2026-09-29 fix): GET /api/staff and GET /api/staff/filter-options resolve through the proxy with the query string and Authorization header both forwarded',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(async function () {
      return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    var req = new Request(proxyUrl('/api/staff', 'limit=25&offset=0'), {
      method: 'GET',
      headers: { authorization: 'Bearer real-token' },
    });
    var res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://backend-preview.example.vercel.app/api/staff?limit=25&offset=0');
    assert.equal(calls[0].init.headers.get('authorization'), 'Bearer real-token');

    var filterReq = new Request(proxyUrl('/api/staff/filter-options'), {
      method: 'GET',
      headers: { authorization: 'Bearer real-token' },
    });
    var filterRes = await handler(filterReq);
    assert.equal(filterRes.status, 200);
    assert.equal(calls[1].url, 'https://backend-preview.example.vercel.app/api/staff/filter-options');
  })
);

test(
  'end-to-end: no "path" query value at all resolves to "/" and 404s (not proxied), same fail-closed default as before this fix',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called'); });
    var req = new Request(PROXY_ORIGIN + '/api/preview-proxy', { method: 'GET' });
    var res = await handler(req);
    assert.equal(res.status, 404);
    assert.equal(calls.length, 0);
  })
);

test(
  'end-to-end: a literal ".." segment already collapsed into the path value resolves to a 404, not the disallowed target',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called'); });
    var req = new Request(proxyUrl('/../../../etc/passwd'), { method: 'GET' });
    var res = await handler(req);
    assert.equal(res.status, 404);
    assert.equal(calls.length, 0);
  })
);

test(
  'end-to-end: "../" from an allowed router toward a disallowed one (e.g. into knowledge-documents) still 404s — no cross-router escape',
  withEnv(CONFIGURED_ENV, async function () {
    // knowledge-documents (2026-09-29: unlike announcements, still NOT in
    // ALLOWED_ROUTES — see web-view/js/config.js's KNOWLEDGE_DOCUMENTS_API_BASE
    // comment) is the target here specifically because it stays disallowed;
    // announcements itself is now allowed (see the isAllowedRoute tests
    // above), so it would no longer prove "escape into a disallowed router"
    // if used as the target.
    var calls = stubFetch(function () { throw new Error('fetch must not be called'); });
    var req = new Request(proxyUrl('/api/member-schedules/../../knowledge-documents'), { method: 'GET' });
    var res = await handler(req);
    assert.equal(res.status, 404);
    assert.equal(calls.length, 0);
  })
);

test(
  'end-to-end: a percent-encoded "%2f" traversal attempt still 404s even though the query value arrives already decoded once',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called'); });
    var req = new Request(proxyUrl('/api/member-schedules/..%2f..%2fknowledge-documents'), { method: 'GET' });
    var res = await handler(req);
    assert.equal(res.status, 404);
    assert.equal(calls.length, 0);
  })
);

test(
  'end-to-end: a caller-supplied query string (beyond "path"/"match") is forwarded verbatim and never interpreted as part of the path',
  withEnv(CONFIGURED_ENV, async function () {
    // Asserted on `calls` AFTER the handler returns, not inside the fetch
    // stub itself — an assertion thrown inside the stub would be caught by
    // the handler's own try/catch around fetch() and reported as a
    // misleading 502 "upstream_unreachable" instead of a real failure.
    var calls = stubFetch(async function () {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    var req = new Request(
      proxyUrl('/api/calendar-auth/verify', 'x=..%2f..%2fannouncements'),
      { method: 'POST', headers: { authorization: 'Bearer x' } }
    );
    var res = await handler(req);
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    // "/" round-trips through URLSearchParams as uppercase "%2F", not the
    // original lowercase "%2f" — the query string is forwarded byte-for-
    // byte EQUIVALENT (same decoded value), not byte-for-byte IDENTICAL;
    // this asserts on the decoded value so the test doesn't depend on
    // URLSearchParams's specific hex-case serialization choice.
    var forwardedUrl = new URL(calls[0].url);
    assert.equal(forwardedUrl.origin + forwardedUrl.pathname, 'https://backend-preview.example.vercel.app/api/calendar-auth/verify');
    assert.equal(forwardedUrl.searchParams.get('x'), '../../announcements');
    assert.equal(forwardedUrl.searchParams.has('path'), false);
  })
);

test(
  'end-to-end: this proxy\'s own internal "path" and "match" query parameters are stripped before forwarding, even if a caller also sends "match"',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(async function () {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    // "match" is what Vercel's rewrite mechanically appends for the
    // "match" named wildcard in web-view/vercel.json — this simulates that
    // exact production shape, plus a genuine extra caller query parameter.
    var req = new Request(
      proxyUrl('/api/calendar-auth/verify', 'match=api%2Fcalendar-auth%2Fverify&reviewer_member_key=mayurika'),
      { method: 'POST', headers: { authorization: 'Bearer x' } }
    );
    await handler(req);
    assert.equal(calls[0].url, 'https://backend-preview.example.vercel.app/api/calendar-auth/verify?reviewer_member_key=mayurika');
  })
);

test(
  'UPDATED 2026-09-29 (same-day follow-up): the HTTP polling GET reaches the backend with Authorization forwarded, but the ws-ticket POST is rejected by the proxy itself — defense in depth alongside the frontend guard',
  withEnv(CONFIGURED_ENV, async function () {
    // History: this test first asserted BOTH calls 404 (announcements
    // fully excluded), then briefly asserted BOTH calls 200 (announcements
    // fully allowed, including ws-ticket) — that second version is what
    // this same-day follow-up corrects: ws-ticket must stay rejected even
    // though the rest of the router is now allowed, because a ticket
    // issued by the backend Preview deployment would only ever be
    // presented to the PRODUCTION WebSocket host (see
    // web-view/js/config.js's ANNOUNCEMENTS_WS_BASE comment).
    var calls = stubFetch(async function () {
      return new Response(JSON.stringify({ records: [], total: 0, limit: 200, offset: 0 }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    });
    var pollReq = new Request(proxyUrl('/api/announcements'), {
      method: 'GET',
      headers: { authorization: 'Bearer x' },
    });
    var pollRes = await handler(pollReq);
    assert.equal(pollRes.status, 200);
    assert.equal(calls[0].url, 'https://backend-preview.example.vercel.app/api/announcements');
    assert.equal(calls[0].init.headers.get('authorization'), 'Bearer x');

    var ticketReq = new Request(proxyUrl('/api/announcements/ws-ticket'), {
      method: 'POST',
      headers: { authorization: 'Bearer x' },
    });
    var ticketRes = await handler(ticketReq);
    assert.equal(ticketRes.status, 404);
    assert.equal(calls.length, 1, 'the ws-ticket request must never reach the backend at all');
    var ticketBody = await ticketRes.json();
    assert.equal(ticketBody.error, 'not_proxied');
  })
);

test(
  'rejected path (not in allowlist) returns 404 and never calls fetch — proves the proxy is not an open relay',
  withEnv(CONFIGURED_ENV, async function () {
    var calls = stubFetch(function () { throw new Error('fetch must not be called for a disallowed path'); });
    var req = new Request(proxyUrl('/api/knowledge-documents'), { method: 'GET' });
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
    var req = new Request(proxyUrl('/api/announcements/ws', 'ticket=abc'), { method: 'GET' });
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
    var req = new Request(proxyUrl('/api/calendar-auth/verify'), {
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
    var req = new Request(proxyUrl('/api/calendar-auth/verify'), {
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
      var req = new Request(proxyUrl('/api/calendar-auth/verify'), {
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
    var req = new Request(proxyUrl('/api/calendar-auth/verify'), {
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
    var req = new Request(proxyUrl('/api/staff-review-summaries/attachments'), {
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
      proxyUrl('/api/staff-review-summaries/abc/attachments/def'),
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
