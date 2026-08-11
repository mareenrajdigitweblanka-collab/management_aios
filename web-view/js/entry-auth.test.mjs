/* entry-auth.test.mjs — global Management AIOS entry authentication gate
   tests (REQ-AUTH-ENTRY-009, 2026-08-11).

   Same hand-rolled DOM/localStorage/fetch stand-in every other frontend
   test file in this repo uses (no npm dependencies, no jsdom available —
   see review-summaries-test-dom.mjs's own header comment for the full
   rationale). entry-auth.js is built via getElementById lookups against a
   handful of static ids (mirroring web-view/index.html's real
   #authGateScreen/#appShell markup), so mountGateMarkup() below only
   needs to reproduce that exact surface.

   Run with: node --test *.test.mjs (from this directory) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';

var importCounter = 0;
function loadModule() {
  importCounter += 1;
  return import('./entry-auth.js?test-instance=' + importCounter);
}

function mountGateMarkup(doc) {
  var appShell = doc.createElement('div');
  appShell.id = 'appShell';
  appShell.hidden = true;
  doc.body.appendChild(appShell);

  var gateScreen = doc.createElement('div');
  gateScreen.id = 'authGateScreen';
  gateScreen.hidden = false;
  doc.body.appendChild(gateScreen);

  var checking = doc.createElement('div');
  checking.id = 'authGateChecking';
  checking.hidden = false;
  doc.body.appendChild(checking);

  var form = doc.createElement('div');
  form.id = 'authGateForm';
  form.hidden = true;
  doc.body.appendChild(form);

  var input = doc.createElement('input');
  input.id = 'authGateTokenInput';
  input.type = 'password';
  input.value = '';
  doc.body.appendChild(input);

  var toggleBtn = doc.createElement('button');
  toggleBtn.id = 'authGateToggleVisibility';
  doc.body.appendChild(toggleBtn);

  var errorEl = doc.createElement('p');
  errorEl.id = 'authGateError';
  errorEl.hidden = true;
  doc.body.appendChild(errorEl);

  var submitBtn = doc.createElement('button');
  submitBtn.id = 'authGateSubmitBtn';
  submitBtn.textContent = 'Authorize';
  doc.body.appendChild(submitBtn);

  return { appShell, gateScreen, checking, form, input, toggleBtn, errorEl, submitBtn };
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

/* A controllable fetch stand-in for the duplicate-submit test — the
   returned promise never resolves until the test explicitly calls
   resolveNext(), so a second click while the first request is still "in
   flight" can be asserted against without a real network round-trip. */
function makeControllableFetch() {
  var pendingResolvers = [];
  var callCount = 0;
  var fetchImpl = function () {
    callCount += 1;
    return new Promise(function (resolve) { pendingResolvers.push(resolve); });
  };
  return {
    fetchImpl: fetchImpl,
    callCount: function () { return callCount; },
    resolveNext: function (status, body) {
      var resolve = pendingResolvers.shift();
      resolve({
        ok: status >= 200 && status < 300,
        status: status,
        json: function () { return Promise.resolve(body); }
      });
    }
  };
}

function withEnv(testFn, envOpts) {
  return async function (t) {
    var env = installFakeBrowserGlobals(envOpts || {});
    t.after(env.restore);
    await testFn(env);
  };
}

function flush() {
  // Lets any number of already-queued microtask .then() chains settle
  // before assertions run (verifyAndStoreToken chains several .then()s).
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

// ── No saved token ──────────────────────────────────────────────────────

test('no saved token: shows the token-entry form directly, app shell stays hidden, no fetch', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = function () { throw new Error('must not fetch when there is no stored token'); };
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });

  assert.equal(els.appShell.hidden, true);
  assert.equal(els.gateScreen.hidden, false);
  assert.equal(els.checking.hidden, true);
  assert.equal(els.form.hidden, false);
  assert.equal(authenticatedCalls, 0);
}));

// ── Saved token — auto-verify on boot ───────────────────────────────────

test('saved valid token: verifies, reveals app shell, calls onAuthenticated once', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika' });
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });

  // Synchronously right after initEntryAuthGate: still checking (fetch pending).
  assert.equal(els.appShell.hidden, true);

  await flush();

  assert.equal(els.appShell.hidden, false, 'app shell revealed after successful verify');
  assert.equal(els.gateScreen.hidden, true);
  assert.equal(authenticatedCalls, 1);
}, { storedAuth: { token: 'saved-token', memberKey: 'mayurika' } }));

test('saved invalid token: cleared, token-entry form shown, app shell stays hidden, onAuthenticated never called', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(401, {});
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });

  await flush();

  assert.equal(els.appShell.hidden, true);
  assert.equal(els.gateScreen.hidden, false);
  assert.equal(els.form.hidden, false, 'token-entry form shown after a rejected saved token');
  assert.equal(authenticatedCalls, 0);
  assert.equal(env.localStorage.getItem('management_aios_calendar_auth_v1'), null, 'invalid saved token cleared');
}, { storedAuth: { token: 'stale-token', memberKey: 'mayurika' } }));

// ── Manual submit (no saved token) ──────────────────────────────────────

test('manual submit: empty token shows a validation error and never fetches', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  var fetchCalls = 0;
  globalThis.fetch = function () { fetchCalls += 1; return fakeFetchJson(200, {})(); };
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  els.input.value = '';
  els.submitBtn.click();

  assert.equal(fetchCalls, 0);
  assert.equal(els.errorEl.hidden, false);
  assert.match(els.errorEl.textContent, /Enter your Member Token/);
  assert.equal(els.appShell.hidden, true);
}));

test('manual submit: valid token reveals the app shell and calls onAuthenticated', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(200, { memberKey: 'suman' });
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });

  els.input.value = 'a-real-token';
  els.submitBtn.click();
  await flush();

  assert.equal(els.appShell.hidden, false);
  assert.equal(els.gateScreen.hidden, true);
  assert.equal(authenticatedCalls, 1);
}));

test('manual submit: invalid token shows inline error, app never reveals, retry works', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(401, {});
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });

  els.input.value = 'wrong-token';
  els.submitBtn.click();
  await flush();

  assert.equal(els.appShell.hidden, true);
  assert.equal(els.errorEl.hidden, false);
  assert.match(els.errorEl.textContent, /Token not recognized/);
  assert.equal(authenticatedCalls, 0);
  assert.equal(els.submitBtn.disabled, false, 'button re-enabled after a failed attempt so the user can retry');
}));

test('manual submit: Enter key in the token input submits, same as clicking Authorize', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(200, { memberKey: 'arun' });
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });

  els.input.value = 'a-real-token';
  els.input.dispatchEvent({ type: 'keydown', key: 'Enter', target: els.input, preventDefault: function () {} });
  await flush();

  assert.equal(authenticatedCalls, 1);
  assert.equal(els.appShell.hidden, false);
}));

test('manual submit: duplicate-submit guard — a second click while a verify is in flight fires no second fetch', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  var controllable = makeControllableFetch();
  globalThis.fetch = controllable.fetchImpl;
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  els.input.value = 'a-real-token';
  els.submitBtn.click();
  els.submitBtn.click(); // second click while the first request is still pending
  els.submitBtn.click();

  assert.equal(controllable.callCount(), 1, 'only one verify request in flight');

  controllable.resolveNext(200, { memberKey: 'rajiv' });
  await flush();

  assert.equal(els.appShell.hidden, false);
}));

test('Show/Hide toggle flips the token input between password and text', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  assert.equal(els.input.type, 'password');
  els.toggleBtn.click();
  assert.equal(els.input.type, 'text');
  els.toggleBtn.click();
  assert.equal(els.input.type, 'password');
}));

// ── Auth loss mid-session (Phase 9) ─────────────────────────────────────

test('auth loss after a successful session: app shell hides again and the gate form reappears, onAuthenticated not called twice', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika' });
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });
  await flush();
  assert.equal(els.appShell.hidden, false, 'sanity: app is revealed before the loss');
  assert.equal(authenticatedCalls, 1);

  // Simulate any protected module's 401 -> handleUnauthorizedResponse()
  // clearing the token and dispatching CALENDAR_AUTH_CHANGED_EVENT with a
  // null memberKey — entry-auth.js never calls this itself here; this
  // reproduces what calendar/auth.js's real handleUnauthorizedResponse()
  // does from any mutation call site.
  env.document.dispatchEvent(new CustomEvent('management-aios:calendar-auth-changed', {
    detail: { memberKey: null }
  }));

  assert.equal(els.appShell.hidden, true, 'app shell hidden again after auth loss');
  assert.equal(els.gateScreen.hidden, false);
  assert.equal(els.form.hidden, false);
  assert.equal(authenticatedCalls, 1, 'onAuthenticated (boot) never re-fires after the initial authentication');
}, { storedAuth: { token: 'saved-token', memberKey: 'mayurika' } }));

test('re-authenticating after a mid-session loss reveals the app shell again without a second onAuthenticated call', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika' });
  var mod = await loadModule();
  var authenticatedCalls = 0;
  mod.initEntryAuthGate(function () { authenticatedCalls += 1; });
  await flush();

  env.document.dispatchEvent(new CustomEvent('management-aios:calendar-auth-changed', { detail: { memberKey: null } }));
  assert.equal(els.appShell.hidden, true);

  els.input.value = 'a-fresh-token';
  els.submitBtn.click();
  await flush();

  assert.equal(els.appShell.hidden, false);
  assert.equal(authenticatedCalls, 1, 'boot() runs exactly once for the whole page lifetime');
}, { storedAuth: { token: 'saved-token', memberKey: 'mayurika' } }));

// ── REQ-AUTH-ENTRY-011 (2026-08-11) — stuck "Checking authorization…" for
//    unauthenticated users. Root cause was a CSS [hidden]-specificity bug
//    (see entry-auth-css-structure.test.mjs), not a JS/network bug — these
//    tests pin down the exact /verify request counts and the checking-
//    indicator's hidden STATE (this file has no CSS engine; the visual
//    fix itself is verified separately, by reading the actual rendered
//    `display` value is not possible here — entry-auth-css-structure.test.mjs
//    asserts the fixed stylesheet text directly) so a future change can
//    never silently reintroduce an actual duplicate-request regression
//    even if the CSS side stays correct. ──────────────────────────────────

test('no saved token: form is enabled and ready for input (not busy/disabled)', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = function () { throw new Error('must not fetch when there is no stored token'); };
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  assert.equal(els.submitBtn.disabled, false);
  assert.equal(els.input.value, '', 'input ready/empty, not left in a stale state');
}));

test('no saved token: exactly zero /verify requests are ever made', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  var fetchCalls = 0;
  globalThis.fetch = function () { fetchCalls += 1; return fakeFetchJson(200, {})(); };
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  assert.equal(fetchCalls, 0);
}));

test('no saved token, left idle: no background /verify polling ever starts', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  var fetchCalls = 0;
  globalThis.fetch = function () { fetchCalls += 1; return fakeFetchJson(200, {})(); };
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  // Several idle event-loop turns, simulating a user leaving the token
  // screen open — no timer/interval/retry exists anywhere in entry-auth.js
  // (confirmed by code reading: no setInterval/setTimeout call at all), so
  // this must stay at 0 no matter how long the wait.
  for (var i = 0; i < 5; i++) { await flush(); }

  assert.equal(fetchCalls, 0, 'idle unauthenticated browser must never auto-poll /verify');
  assert.equal(els.form.hidden, false, 'form remains available the whole time');
}));

test('saved token: checking indicator stays hidden=false (visible) while the verify request is pending', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  var controllable = makeControllableFetch();
  globalThis.fetch = controllable.fetchImpl;
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  assert.equal(els.checking.hidden, false, 'checking indicator state remains visible while genuinely verifying');
  assert.equal(els.form.hidden, true, 'form not shown while a saved-token check is still pending');
  assert.equal(els.appShell.hidden, true);

  controllable.resolveNext(200, { memberKey: 'mayurika' });
  await flush();
}, { storedAuth: { token: 'saved-token', memberKey: 'mayurika' } }));

test('saved token: exactly one /verify request is made for the whole startup check', withEnv(async (env) => {
  var callCount = 0;
  globalThis.fetch = function () { callCount += 1; return fakeFetchJson(200, { memberKey: 'mayurika' })(); };
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});
  await flush();

  assert.equal(callCount, 1);
}, { storedAuth: { token: 'saved-token', memberKey: 'mayurika' } }));

test('valid saved token: checking indicator is hidden once AUTHENTICATED', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(200, { memberKey: 'mayurika' });
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});
  await flush();

  assert.equal(els.checking.hidden, true);
  assert.equal(els.gateScreen.hidden, true);
}, { storedAuth: { token: 'saved-token', memberKey: 'mayurika' } }));

test('invalid saved token: checking indicator is hidden once UNAUTHENTICATED', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  globalThis.fetch = fakeFetchJson(401, {});
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});
  await flush();

  assert.equal(els.checking.hidden, true, 'checking indicator state cleared, not left stuck visible');
  assert.equal(els.form.hidden, false);
}, { storedAuth: { token: 'stale-token', memberKey: 'mayurika' } }));

test('manual submit: exactly one /verify request per explicit submission', withEnv(async (env) => {
  var els = mountGateMarkup(env.document);
  var callCount = 0;
  globalThis.fetch = function () { callCount += 1; return fakeFetchJson(200, { memberKey: 'suman' })(); };
  var mod = await loadModule();
  mod.initEntryAuthGate(function () {});

  els.input.value = 'a-real-token';
  els.submitBtn.click();
  await flush();

  assert.equal(callCount, 1);
}));
