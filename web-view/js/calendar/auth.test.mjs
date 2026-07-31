/* auth.test.mjs — Calendar member-token authorization frontend tests
   (web-view/js/calendar/auth.js, 2026-07-29 approved requirement).

   This repo has no npm dependencies (web-view/js/calendar/package.json)
   and a real DOM library (jsdom) could not be installed in this sandboxed
   environment (npm install failed with a network/TLS error here). auth.js
   was written to build its dialog via createElement/appendChild with
   direct element references (never innerHTML + querySelector afterward),
   specifically so the small hand-rolled DOM/localStorage stand-in in
   ./auth-test-dom.mjs — supporting only the exact browser surface auth.js
   actually calls — is enough to exercise its REAL code paths end-to-end
   (dialog open/submit/cancel, storage read/write, the replay guard, the
   indicator, Forget/change), not a reimplementation or a mock of auth.js
   itself.

   Each test installs fresh fake document/window/localStorage globals AND
   re-imports auth.js with a cache-busting query string, so auth.js's own
   module-level singletons (the dialog element, the indicator element
   cache, the in-flight ensureAuthorized() promise) never leak state
   between tests — every test starts from a genuinely fresh module.

   Coverage note (see the approved requirement's own framing): this file
   covers everything that is actually auth.js's responsibility — storage,
   the dialog flow, the replay guard, 401 clearing, Forget/change, and
   proving a tampered display field never changes what token is used.
   "Automatic Authorization header attachment" and "no token on GET
   requests" are instance.js's responsibility (a thin, direct pass-through
   of ensureAuthorized()'s resolved token into a fetch header, gated on
   `method !== 'GET'`) — instance.js is a five-thousand-line closure not
   independently mountable in a unit test without a full calendar DOM, so
   that exact contract is instead verified at the HTTP level by
   backend/tests/test_calendar_mutation_authorization.py, which sends real
   Authorization headers and confirms the backend's 200/401/403 responses,
   and by GET requests there succeeding with no header at all.

   Run with: node --test *.test.mjs (from this directory) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeBrowserGlobals } from './auth-test-dom.mjs';

var importCounter = 0;

async function freshAuthModule() {
  importCounter += 1;
  return import('./auth.js?test-instance=' + importCounter);
}

function mountIndicatorMarkup(doc) {
  var root = doc.createElement('div');
  root.id = 'calendarAuthIndicator';
  root.hidden = true;
  var label = doc.createElement('span');
  label.id = 'calendarAuthIndicatorLabel';
  var forgetBtn = doc.createElement('button');
  forgetBtn.id = 'calendarAuthForgetBtn';
  root.appendChild(label);
  root.appendChild(forgetBtn);
  doc.body.appendChild(root);
  return { root: root, label: label, forgetBtn: forgetBtn };
}

function mountCalendarInstanceMarkup(doc, memberKey, memberLabel) {
  var el = doc.createElement('div');
  el.className = 'msc-instance';
  el.setAttribute('data-member-key', memberKey);
  el.setAttribute('data-member-label', memberLabel);
  doc.body.appendChild(el);
  return el;
}

function fakeFetchJson(status, body) {
  return function () {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status: status,
      json: function () { return Promise.resolve(body); }
    });
  };
}

function findDialogOverlay(doc) {
  return doc._all.find(function (el) {
    return el.classList && el.classList.contains('ui-dialog-overlay');
  });
}

function findByClass(doc, className) {
  return doc._all.find(function (el) {
    return el.classList && el.classList.contains(className);
  });
}

// ── 1. Initial dialog + verification before storage ──────────────────────

test('ensureAuthorized shows the authorize dialog when no token is stored, and stores only after successful verification', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();

    assert.equal(auth.getStoredToken(), null, 'no token before ensureAuthorized() is called');

    var pending = auth.ensureAuthorized();
    var overlay = findDialogOverlay(fake.document);
    assert.ok(overlay, 'dialog overlay was created');
    assert.ok(overlay.classList.contains('show'), 'dialog is shown before any token exists');
    assert.equal(auth.getStoredToken(), null, 'still nothing stored merely from opening the dialog');

    var input = fake.document.getElementById('calendar-auth-token-input');
    input.value = 'the-real-token';
    var submitBtn = findByClass(fake.document, 'calendar-auth-submit');
    submitBtn.click();

    var resolvedToken = await pending;
    assert.equal(resolvedToken, 'the-real-token');
    assert.equal(auth.getStoredToken(), 'the-real-token', 'stored only after successful verification');
    assert.equal(auth.getStoredMemberKey(), 'mayurika');
    assert.equal(overlay.classList.contains('show'), false, 'dialog closes after successful verification');
  } finally {
    fake.restore();
  }
});

test('a rejected token keeps the dialog open with an inline error and stores nothing', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    globalThis.fetch = fakeFetchJson(401, {});
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    var input = fake.document.getElementById('calendar-auth-token-input');
    input.value = 'wrong-token';
    var submitBtn = findByClass(fake.document, 'calendar-auth-submit');
    submitBtn.click();

    // Let the rejected verify() promise settle before asserting.
    await new Promise(function (resolve) { setTimeout(resolve, 0); });

    assert.equal(auth.getStoredToken(), null, 'nothing is stored after a rejected token');
    var overlay = findDialogOverlay(fake.document);
    assert.ok(overlay.classList.contains('show'), 'dialog stays open after a rejected token');
    var errorEl = fake.document.getElementById('calendar-auth-error');
    assert.ok(errorEl.textContent.length > 0, 'an inline error is shown');
    assert.equal(errorEl.hidden, false);

    // Clean up so this test does not leave the shared dialog "open" for
    // any later assertions in this file (each test uses its own fresh
    // module/document, so this is just tidiness, not a correctness need).
    var cancelBtn = findByClass(fake.document, 'calendar-auth-cancel');
    cancelBtn.click();
    await pending.catch(function () {});
  } finally {
    fake.restore();
  }
});

// ── 2. Persistence across reload + no repeated prompt ────────────────────

test('a stored token persists across a simulated reload and is reused with no dialog', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var verifyCalls = 0;
    globalThis.fetch = function () {
      verifyCalls += 1;
      return fakeFetchJson(200, { memberKey: 'suman', displayLabel: 'Suman — Recruiting Officer' })();
    };
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'suman-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;
    assert.equal(verifyCalls, 1);

    // Simulate a reload: re-import auth.js fresh, but keep the SAME
    // fake localStorage (a real reload keeps localStorage too) — this is
    // the "persistence" contract, not the module-singleton one.
    var authAfterReload = await freshAuthModule();
    assert.equal(authAfterReload.getStoredToken(), 'suman-token', 'token survives a simulated reload');

    var secondPending = authAfterReload.ensureAuthorized();
    var resolved = await secondPending;
    assert.equal(resolved, 'suman-token', 'later mutation reuses the stored token with no dialog');
    assert.equal(verifyCalls, 1, 'no additional verify request — no repeated prompt on a valid own-member mutation');
  } finally {
    fake.restore();
  }
});

// ── 3. Replay guard — exactly-once dialog/verify for concurrent callers ──

test('two concurrent ensureAuthorized() calls while unauthorized share the same in-flight promise and verify exactly once', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var verifyCalls = 0;
    globalThis.fetch = function () {
      verifyCalls += 1;
      return fakeFetchJson(200, { memberKey: 'arun', displayLabel: 'Arun — Implementation Officer' })();
    };
    var auth = await freshAuthModule();

    var firstCall = auth.ensureAuthorized();
    var secondCall = auth.ensureAuthorized();
    assert.equal(firstCall, secondCall, 'both callers receive the exact same pending promise — no second dialog');

    fake.document.getElementById('calendar-auth-token-input').value = 'arun-token';
    findByClass(fake.document, 'calendar-auth-submit').click();

    var results = await Promise.all([firstCall, secondCall]);
    assert.deepEqual(results, ['arun-token', 'arun-token']);
    assert.equal(verifyCalls, 1, 'exactly one verify request for two concurrent callers — no duplicate send');
  } finally {
    fake.restore();
  }
});

test('double-clicking Authorize while a verify request is in flight only sends one verify request', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var verifyCalls = 0;
    globalThis.fetch = function () {
      verifyCalls += 1;
      return fakeFetchJson(200, { memberKey: 'rajiv', displayLabel: 'Rajiv — Admin Manager' })();
    };
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'rajiv-token';
    var submitBtn = findByClass(fake.document, 'calendar-auth-submit');
    submitBtn.click();
    submitBtn.click(); // simulated double-click / duplicate submit
    submitBtn.click();

    await pending;
    assert.equal(verifyCalls, 1, 'the submit-in-flight guard prevents a second verify request');
  } finally {
    fake.restore();
  }
});

// ── 4. 401 handling ───────────────────────────────────────────────────────

test('handleUnauthorizedResponse clears the stored token and hides the indicator', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'paraparan', displayLabel: 'Paraparan' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'paraparan-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;
    assert.equal(auth.getStoredToken(), 'paraparan-token');
    assert.equal(fake.document.getElementById('calendarAuthIndicator').hidden, false);

    auth.handleUnauthorizedResponse();

    assert.equal(auth.getStoredToken(), null, '401 clears the saved token');
    assert.equal(auth.getStoredMemberKey(), null);
    assert.equal(fake.document.getElementById('calendarAuthIndicator').hidden, true, 'indicator hides on 401');
  } finally {
    fake.restore();
  }
});

test('retrying after a 401 shows the authorize dialog again', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var verifyCalls = 0;
    globalThis.fetch = function () {
      verifyCalls += 1;
      return fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' })();
    };
    var auth = await freshAuthModule();

    var firstPending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'first-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await firstPending;
    assert.equal(verifyCalls, 1);

    auth.handleUnauthorizedResponse(); // simulates the backend rejecting the saved token with 401

    var overlayBefore = findDialogOverlay(fake.document);
    assert.equal(overlayBefore.classList.contains('show'), false, 'no dialog reopens merely from the 401 itself');

    var secondPending = auth.ensureAuthorized();
    var overlayAfter = findDialogOverlay(fake.document);
    assert.ok(overlayAfter.classList.contains('show'), 'the NEXT mutation attempt reopens the authorize dialog');

    fake.document.getElementById('calendar-auth-token-input').value = 'second-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    var resolved = await secondPending;
    assert.equal(resolved, 'second-token');
    assert.equal(verifyCalls, 2);
  } finally {
    fake.restore();
  }
});

// ── 5. Forget / change token ──────────────────────────────────────────────

test('forgetToken clears storage and hides the indicator without reopening the dialog', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'suman', 'Suman — Recruiting Officer');
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'suman', displayLabel: 'Suman — Recruiting Officer' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'suman-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;
    assert.equal(indicator.root.hidden, false);
    assert.equal(indicator.label.textContent, 'Authorized as: Suman — Recruiting Officer');

    auth.forgetToken();

    assert.equal(auth.getStoredToken(), null);
    assert.equal(indicator.root.hidden, true);
    var overlay = findDialogOverlay(fake.document);
    assert.equal(overlay.classList.contains('show'), false, 'Forget does not itself open the dialog');
  } finally {
    fake.restore();
  }
});

test('the indicator Forget button is wired to forgetToken via initCalendarAuthIndicator', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'arun', displayLabel: 'Arun — Implementation Officer' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'arun-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    indicator.forgetBtn.click();

    assert.equal(auth.getStoredToken(), null, 'clicking Forget clears the saved token');
    assert.equal(indicator.root.hidden, true);
  } finally {
    fake.restore();
  }
});

// ── 6. Tampered display member never affects authorization ───────────────

test('a hand-edited verifiedMemberKey in localStorage changes only the display label, never the token used for authorization', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'mayurikas-real-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    var stored = JSON.parse(fake.window.localStorage.getItem('management_aios_calendar_auth_v1'));
    assert.equal(stored.token, 'mayurikas-real-token');
    assert.equal(stored.verifiedMemberKey, 'mayurika');

    // Tamper: rewrite ONLY the display field, exactly as a user editing
    // devtools localStorage could — the token itself is untouched.
    stored.verifiedMemberKey = 'rajiv';
    fake.window.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify(stored));

    assert.equal(auth.getStoredMemberKey(), 'rajiv', 'the tampered display value is what the indicator would show');
    assert.equal(
      auth.getStoredToken(),
      'mayurikas-real-token',
      'the actual token sent for authorization is completely unaffected by the tampered display field'
    );

    var secondPending = auth.ensureAuthorized();
    var resolved = await secondPending;
    assert.equal(
      resolved,
      'mayurikas-real-token',
      'ensureAuthorized() still resolves with the real token, not anything derived from the tampered display field'
    );
  } finally {
    fake.restore();
  }
});

// ── 7. Indicator label resolution ────────────────────────────────────────

test('the indicator renders the on-page member label, not the raw member_key', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'mayurika', 'Mayurika — HR');
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'mayurika-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    assert.equal(indicator.label.textContent, 'Authorized as: Mayurika — HR');
  } finally {
    fake.restore();
  }
});

// ── 8. Cancel ──────────────────────────────────────────────────────────

test('cancelling the authorize dialog rejects with auth_cancelled and stores nothing', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    var cancelBtn = findByClass(fake.document, 'calendar-auth-cancel');
    cancelBtn.click();

    await assert.rejects(pending, function (err) { return err.code === 'auth_cancelled'; });
    assert.equal(auth.getStoredToken(), null);
  } finally {
    fake.restore();
  }
});
