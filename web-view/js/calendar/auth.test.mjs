/* auth.test.mjs — Calendar member-token authorization frontend tests
   (web-view/js/calendar/auth.js).

   Covers the original 2026-07-29 authorization feature (dialog flow,
   storage, replay guard, 401 handling, tampered-display-field guarantee)
   AND the 2026-07-31 UX correction (Change-token control, cross-member
   pre-block gate, dynamic cross-member copy).

   This repo has no npm dependencies (web-view/js/calendar/package.json)
   and a real DOM library (jsdom) could not be installed in this sandboxed
   environment (npm install failed with a network/TLS error here). auth.js
   was written to build its dialog via createElement/appendChild with
   direct element references (never innerHTML + querySelector afterward),
   specifically so the small hand-rolled DOM/localStorage stand-in in
   ./auth-test-dom.mjs — supporting only the exact browser surface auth.js
   actually calls — is enough to exercise its REAL code paths end-to-end.
   ui/toast.js (used by the cross-member alert and the Change-token
   success confirmation) DOES rely on innerHTML+querySelector for its own
   fixed template; auth-test-dom.mjs's FakeElement therefore includes a
   small, deliberately narrow innerHTML parser scoped to that one template
   shape — not a general HTML parser.

   Each test installs fresh fake document/window/localStorage globals AND
   re-imports auth.js with a cache-busting query string, so auth.js's own
   module-level singletons (the dialog element, the indicator element
   cache, the in-flight ensureAuthorized() promise) never leak state
   between tests — every test starts from a genuinely fresh module.

   Coverage note: "automatic Authorization header attachment" and "no
   token on GET requests" are instance.js's responsibility (a thin, direct
   pass-through of ensureAuthorized()/guardMutationAccess()'s resolved
   token/boolean into a fetch header or an early return) — instance.js is
   a single ~6,000-line closure factory not independently mountable in a
   unit test without reproducing the entire calendar's DOM, so that exact
   contract is instead verified at the HTTP level by
   backend/tests/test_calendar_mutation_authorization.py (real Authorization
   headers, real 401/403 responses) and by code-reading (instance.js's
   apiRequest/leaveApiRequest, deleteItem, deleteLeaveRecord, and the
   Outcome click handlers all call guardMutationAccess()/ensureAuthorized()
   before any modal opens or any request is sent — see instance.js itself
   for the exact call sites, each commented "Calendar member-token
   authorization").

   Run with: node --test *.test.mjs (from this directory) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
  var changeTokenBtn = doc.createElement('button');
  changeTokenBtn.id = 'calendarAuthChangeTokenBtn';
  root.appendChild(label);
  root.appendChild(changeTokenBtn);
  doc.body.appendChild(root);
  return { root: root, label: label, changeTokenBtn: changeTokenBtn };
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

function findByClassAll(doc, className) {
  return doc._all.filter(function (el) {
    return el.classList && el.classList.contains(className);
  });
}

function storedAuthRecord(fake) {
  var raw = fake.window.localStorage.getItem('management_aios_calendar_auth_v1');
  return raw ? JSON.parse(raw) : null;
}

// ── 0. Top-bar wording (regression guard against the real markup file) ──

test('the topbar control reads "Change token", never "Forget or change token"', () => {
  var indexHtmlPath = fileURLToPath(new URL('../../index.html', import.meta.url));
  var html = readFileSync(indexHtmlPath, 'utf8');
  assert.match(html, /id="calendarAuthChangeTokenBtn"[^>]*>Change token</);
  assert.doesNotMatch(html, /Forget or change/);
});

// ── 1. Initial dialog + verification before storage (Authorize mode,
//    unchanged from the original 2026-07-29 feature) ─────────────────────

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
    var titleEl = fake.document.getElementById('calendar-auth-title');
    assert.equal(titleEl.textContent, 'Authorize this browser');
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

    await new Promise(function (resolve) { setTimeout(resolve, 0); });

    assert.equal(auth.getStoredToken(), null, 'nothing is stored after a rejected token');
    var overlay = findDialogOverlay(fake.document);
    assert.ok(overlay.classList.contains('show'), 'dialog stays open after a rejected token');
    var errorEl = fake.document.getElementById('calendar-auth-error');
    assert.ok(errorEl.textContent.length > 0, 'an inline error is shown');
    assert.equal(errorEl.hidden, false);
    assert.equal(submitBtn.disabled, false, 'busy state is reset so the input remains available for correction');

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
    submitBtn.click();
    submitBtn.click();

    await pending;
    assert.equal(verifyCalls, 1, 'the submit-in-flight guard prevents a second verify request');
  } finally {
    fake.restore();
  }
});

test('a second open() call while the dialog is already open (e.g. Change token clicked twice) returns the same pending promise', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var firstOpen = auth.openChangeTokenDialog();
    var secondOpen = auth.openChangeTokenDialog();

    fake.document.getElementById('calendar-auth-token-input').value = 'mayurika-token';
    findByClass(fake.document, 'calendar-auth-submit').click();

    var results = await Promise.all([firstOpen, secondOpen]);
    assert.deepEqual(results, [true, true]);
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

    auth.handleUnauthorizedResponse();

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

// ── 5. Change-token control ───────────────────────────────────────────────

test('clicking Change token opens the dialog immediately, with the approved title/message/button wording', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var overlayBefore = findDialogOverlay(fake.document);
    assert.equal(overlayBefore, undefined, 'no dialog exists before Change token is clicked');

    indicator.changeTokenBtn.click();

    var overlay = findDialogOverlay(fake.document);
    assert.ok(overlay, 'dialog opened immediately on click');
    assert.ok(overlay.classList.contains('show'));
    assert.equal(fake.document.getElementById('calendar-auth-title').textContent, 'Change Calendar token');
    assert.equal(
      fake.document.getElementById('calendar-auth-message').textContent,
      'Enter a different member token for this browser. Your current authorization ' +
        'will remain active until the new token is verified.'
    );
    assert.equal(findByClass(fake.document, 'calendar-auth-submit').textContent, 'Change token');
    assert.equal(findByClass(fake.document, 'calendar-auth-cancel').textContent, 'Cancel', 'Cancel label is unchanged');
  } finally {
    fake.restore();
  }
});

test('opening Change token does not clear the currently saved token', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'original-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;
    assert.equal(auth.getStoredToken(), 'original-token');

    indicator.changeTokenBtn.click();

    assert.equal(auth.getStoredToken(), 'original-token', 'still the original token — opening the dialog changes nothing');
    assert.equal(fake.document.getElementById('calendarAuthIndicator').hidden, false, 'indicator keeps showing the current authorization');
  } finally {
    fake.restore();
  }
});

test('the saved token is never prefilled into the Change-token input', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'secret-existing-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    indicator.changeTokenBtn.click();

    var input = fake.document.getElementById('calendar-auth-token-input');
    assert.equal(input.value, '', 'the input starts empty even though a token is already stored');
    assert.equal(input.type, 'password', 'masked even if something were typed');
  } finally {
    fake.restore();
  }
});

test('Cancel on the Change-token dialog retains the saved token and changes nothing', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'original-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    var changeResult = auth.openChangeTokenDialog();
    fake.document.getElementById('calendar-auth-token-input').value = 'attempted-new-token';
    findByClass(fake.document, 'calendar-auth-cancel').click();

    var resolved = await changeResult;
    assert.equal(resolved, false, 'openChangeTokenDialog resolves false on Cancel — never rejects');
    assert.equal(auth.getStoredToken(), 'original-token', 'the original token is completely unchanged');
    assert.equal(auth.getStoredMemberKey(), 'mayurika');
  } finally {
    fake.restore();
  }
});

test('Escape on the Change-token dialog retains the saved token and changes nothing', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'original-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    var changeResult = auth.openChangeTokenDialog();
    var overlay = findDialogOverlay(fake.document);
    overlay.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault: function () {} });

    var resolved = await changeResult;
    assert.equal(resolved, false);
    assert.equal(auth.getStoredToken(), 'original-token');
  } finally {
    fake.restore();
  }
});

test('an invalid replacement token on the Change-token dialog retains the saved token', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    var verifyMode = 'accept-original';
    globalThis.fetch = function (url, opts) {
      var token = opts.headers.Authorization.replace('Bearer ', '');
      if (token === 'original-token') {
        return fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' })();
      }
      return fakeFetchJson(401, {})();
    };
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'original-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    indicator.changeTokenBtn.click();
    fake.document.getElementById('calendar-auth-token-input').value = 'wrong-replacement-token';
    findByClass(fake.document, 'calendar-auth-submit').click();

    await new Promise(function (resolve) { setTimeout(resolve, 0); });

    assert.equal(auth.getStoredToken(), 'original-token', 'the invalid replacement never overwrites the working token');
    var errorEl = fake.document.getElementById('calendar-auth-error');
    assert.equal(errorEl.hidden, false, 'an inline error is shown');
    var overlay = findDialogOverlay(fake.document);
    assert.ok(overlay.classList.contains('show'), 'dialog stays open for correction');
  } finally {
    fake.restore();
  }
});

test('a successful Change-token replacement updates storage, the indicator, and shows a confirmation toast', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'mayurika', 'Mayurika — HR');
    mountCalendarInstanceMarkup(fake.document, 'arun', 'Arun — Implementation Officer');
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = function (url, opts) {
      var token = opts.headers.Authorization.replace('Bearer ', '');
      var memberKey = token === 'mayurika-token' ? 'mayurika' : 'arun';
      var displayLabel = token === 'mayurika-token' ? 'Mayurika — HR' : 'Arun — Implementation Officer';
      return fakeFetchJson(200, { memberKey: memberKey, displayLabel: displayLabel })();
    };
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'mayurika-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;
    assert.equal(indicator.label.textContent, 'Authorized as: Mayurika — HR');

    var changeResult = auth.openChangeTokenDialog();
    fake.document.getElementById('calendar-auth-token-input').value = 'arun-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    var resolved = await changeResult;

    assert.equal(resolved, true);
    assert.equal(auth.getStoredToken(), 'arun-token', 'storage replaced only after successful verification');
    assert.equal(auth.getStoredMemberKey(), 'arun');
    assert.equal(indicator.label.textContent, 'Authorized as: Arun — Implementation Officer', '"Authorized as" updates immediately');
    var overlay = findDialogOverlay(fake.document);
    assert.equal(overlay.classList.contains('show'), false, 'dialog closes after success');

    var toastTitles = findByClassAll(fake.document, 'ui-toast-title').map(function (el) { return el.textContent; });
    var toastMessages = findByClassAll(fake.document, 'ui-toast-message').map(function (el) { return el.textContent; });
    assert.ok(toastMessages.indexOf('Calendar authorization changed to Arun — Implementation Officer.') !== -1,
      'the approved confirmation text is shown: ' + JSON.stringify(toastMessages));
    assert.ok(toastTitles.length > 0);
  } finally {
    fake.restore();
  }
});

test('the Change-token control is wired via initCalendarAuthIndicator', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'suman', displayLabel: 'Suman — Recruiting Officer' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    indicator.changeTokenBtn.click();
    var overlay = findDialogOverlay(fake.document);
    assert.ok(overlay && overlay.classList.contains('show'));

    fake.document.getElementById('calendar-auth-token-input').value = 'suman-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await new Promise(function (resolve) { setTimeout(resolve, 0); });
    assert.equal(auth.getStoredToken(), 'suman-token');
  } finally {
    fake.restore();
  }
});

// ── 6. Cross-member pre-block gate (guardMutationAccess) ─────────────────

test('crossMemberAlertCopy renders the approved dynamic wording', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    globalThis.fetch = fakeFetchJson(200, {});
    var auth = await freshAuthModule();
    var copy = auth.crossMemberAlertCopy('Mayurika — HR', 'Suman — Recruiting Officer');
    assert.equal(copy.title, "You can't manage Suman — Recruiting Officer's Calendar");
    assert.equal(
      copy.message,
      'You are authorized as Mayurika — HR. You can only create or change Mayurika — HR\'s Tasks and Leave.'
    );
  } finally {
    fake.restore();
  }
});

test('guardMutationAccess blocks a cross-member action, retains the saved token, and shows the dynamic alert — before anything else opens', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'mayurika', 'Mayurika — HR');
    mountCalendarInstanceMarkup(fake.document, 'suman', 'Suman — Recruiting Officer');
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'mayurika-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    var allowed = await auth.guardMutationAccess('suman');

    assert.equal(allowed, false, 'blocked — the caller must not open its modal or send any request');
    assert.equal(auth.getStoredToken(), 'mayurika-token', 'the valid token is retained, not cleared, on cross-member denial');
    assert.equal(auth.getStoredMemberKey(), 'mayurika');

    var overlay = findDialogOverlay(fake.document);
    assert.equal(
      overlay && overlay.classList.contains('show'), false,
      'no authorize dialog is opened for an already-authorized cross-member attempt (the singleton element ' +
        'persists hidden in the DOM from the earlier ensureAuthorized() call above — it must not be showing)'
    );

    var toastTitles = findByClassAll(fake.document, 'ui-toast-title').map(function (el) { return el.textContent; });
    var toastMessages = findByClassAll(fake.document, 'ui-toast-message').map(function (el) { return el.textContent; });
    assert.ok(toastTitles.indexOf("You can't manage Suman — Recruiting Officer's Calendar") !== -1);
    assert.ok(toastMessages.indexOf(
      "You are authorized as Mayurika — HR. You can only create or change Mayurika — HR's Tasks and Leave."
    ) !== -1);
  } finally {
    fake.restore();
  }
});

test('guardMutationAccess allows an own-member action with no dialog and no alert', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'mayurika', 'Mayurika — HR');
    var verifyCalls = 0;
    globalThis.fetch = function () {
      verifyCalls += 1;
      return fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' })();
    };
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'mayurika-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;
    assert.equal(verifyCalls, 1);

    var allowed = await auth.guardMutationAccess('mayurika');
    assert.equal(allowed, true);
    assert.equal(verifyCalls, 1, 'no additional dialog/verify for an own-member check');
  } finally {
    fake.restore();
  }
});

test('guardMutationAccess with no stored token runs the first-time flow, then resumes exactly once for a matching member', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'mayurika', 'Mayurika — HR');
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();

    var pending = auth.guardMutationAccess('mayurika');
    var overlay = findDialogOverlay(fake.document);
    assert.ok(overlay && overlay.classList.contains('show'), 'first mutation attempt with no token opens the authorize dialog');

    fake.document.getElementById('calendar-auth-token-input').value = 'mayurika-token';
    findByClass(fake.document, 'calendar-auth-submit').click();

    var allowed = await pending;
    assert.equal(allowed, true, 'matching member — the caller resumes its original action exactly once');
  } finally {
    fake.restore();
  }
});

test('guardMutationAccess with no stored token, verified for a different member, blocks and shows the cross-member alert without reopening the dialog', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'mayurika', 'Mayurika — HR');
    mountCalendarInstanceMarkup(fake.document, 'rajiv', 'Rajiv — Admin Manager');
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'rajiv', displayLabel: 'Rajiv — Admin Manager' });
    var auth = await freshAuthModule();

    var pending = auth.guardMutationAccess('mayurika');
    fake.document.getElementById('calendar-auth-token-input').value = 'rajivs-token';
    findByClass(fake.document, 'calendar-auth-submit').click();

    var allowed = await pending;
    assert.equal(allowed, false, "token verifies for rajiv, not mayurika's calendar — blocked");
    assert.equal(auth.getStoredToken(), 'rajivs-token', 'the newly verified token is still saved (it is valid, just for another member)');

    var overlay = findDialogOverlay(fake.document);
    assert.equal(overlay.classList.contains('show'), false, 'the token dialog is not reopened after this valid-but-mismatched result');

    var toastTitles = findByClassAll(fake.document, 'ui-toast-title').map(function (el) { return el.textContent; });
    assert.ok(toastTitles.indexOf("You can't manage Mayurika — HR's Calendar") !== -1);
  } finally {
    fake.restore();
  }
});

test('cancelling the first-time dialog inside guardMutationAccess blocks with no cross-member alert', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    mountCalendarInstanceMarkup(fake.document, 'mayurika', 'Mayurika — HR');
    globalThis.fetch = fakeFetchJson(200, {});
    var auth = await freshAuthModule();

    var pending = auth.guardMutationAccess('mayurika');
    findByClass(fake.document, 'calendar-auth-cancel').click();

    var allowed = await pending;
    assert.equal(allowed, false);
    assert.equal(auth.getStoredToken(), null);
    var toastTitles = findByClassAll(fake.document, 'ui-toast-title');
    assert.equal(toastTitles.length, 0, 'a plain cancel is not a cross-member event — no alert toast');
  } finally {
    fake.restore();
  }
});

// ── 7. Cancel (Authorize mode) ────────────────────────────────────────────

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

// ── 8. Tampered display member never affects authorization ───────────────

test('a hand-edited verifiedMemberKey in localStorage changes only the display label, never the token used for authorization', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'mayurikas-real-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    var stored = storedAuthRecord(fake);
    assert.equal(stored.token, 'mayurikas-real-token');
    assert.equal(stored.verifiedMemberKey, 'mayurika');

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
    assert.equal(resolved, 'mayurikas-real-token');
  } finally {
    fake.restore();
  }
});

// ── 9. Indicator label resolution ────────────────────────────────────────

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

// ── 10. Keyboard / focus behavior ─────────────────────────────────────────

test('opening the dialog (either mode) moves focus to the token input', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, {});
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    indicator.changeTokenBtn.click();
    var input = fake.document.getElementById('calendar-auth-token-input');
    assert.equal(fake.document.activeElement, input);
  } finally {
    fake.restore();
  }
});

test('focus returns to the Change-token control after the dialog closes (Cancel)', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'original-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    indicator.changeTokenBtn.focus();
    var changeResult = auth.openChangeTokenDialog();
    findByClass(fake.document, 'calendar-auth-cancel').click();
    await changeResult;

    assert.equal(fake.document.activeElement, indicator.changeTokenBtn, 'focus returns to the control that opened the dialog');
  } finally {
    fake.restore();
  }
});

test('focus returns to the Change-token control after a successful replacement', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    var indicator = mountIndicatorMarkup(fake.document);
    globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika', displayLabel: 'Mayurika — HR' });
    var auth = await freshAuthModule();
    auth.initCalendarAuthIndicator();

    var pending = auth.ensureAuthorized();
    fake.document.getElementById('calendar-auth-token-input').value = 'original-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await pending;

    var changeResult = auth.openChangeTokenDialog();
    fake.document.getElementById('calendar-auth-token-input').value = 'new-token';
    findByClass(fake.document, 'calendar-auth-submit').click();
    await changeResult;

    assert.equal(fake.document.activeElement, indicator.changeTokenBtn, 'a reasonable, consistent confirmation location — next to the just-updated indicator');
  } finally {
    fake.restore();
  }
});

test('the input remains available and focused for correction after an inline verification error', async () => {
  var fake = installFakeBrowserGlobals();
  try {
    globalThis.fetch = fakeFetchJson(401, {});
    var auth = await freshAuthModule();

    var pending = auth.ensureAuthorized();
    var input = fake.document.getElementById('calendar-auth-token-input');
    input.value = 'wrong-token';
    findByClass(fake.document, 'calendar-auth-submit').click();

    await new Promise(function (resolve) { setTimeout(resolve, 0); });

    assert.equal(fake.document.activeElement, input, 'focus moves back to the input so the user can correct it immediately');
    assert.equal(input.disabled, false);

    findByClass(fake.document, 'calendar-auth-cancel').click();
    await pending.catch(function () {});
  } finally {
    fake.restore();
  }
});
