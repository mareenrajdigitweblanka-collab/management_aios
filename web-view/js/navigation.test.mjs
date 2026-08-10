/* navigation.test.mjs — coverage for the authenticated-module sidebar/tab
   gate (REQ-AUTH-MODULES-007, 2026-08-10): Staff Data, Issues, and
   Knowledge Management nav items must be locked (visible, aria-disabled,
   never silently hidden — see auth-gate.js) and their panels must not
   activate while this browser holds no Calendar member token; both must
   become available the moment one is stored, and a panel must fall back
   to the default public tab if authorization is lost while it is active.

   Uses a small purpose-built DOM/localStorage stand-in
   (navigation-test-dom.mjs) — same rationale as calendar/auth-test-dom.mjs
   and review-summaries-test-dom.mjs (no npm dependencies, no jsdom
   available) — because navigation.js needs a real
   document.querySelectorAll('.app-nav-btn' / '.tab-panel' / '[data-goto]')
   to find the sidebar/panel elements a test builds, which neither existing
   stand-in supports.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeBrowserGlobals, buildNavButtonAndPanel } from './navigation-test-dom.mjs';

var importCounter = 0;
function loadModules() {
  importCounter += 1;
  return Promise.all([
    import('./navigation.js?test-instance=' + importCounter),
    import('./auth-gate.js?test-instance=' + importCounter)
  ]).then(function (mods) { return { navigation: mods[0], authGate: mods[1] }; });
}

function flush() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

var PROTECTED = ['staff-data', 'issues', 'knowledge-management'];
var PUBLIC_TABS = ['root-aios', 'file-map'];

function buildStandardNav(doc) {
  var nodes = {};
  buildNavButtonAndPanel(doc, 'root-aios', true);
  PUBLIC_TABS.slice(1).forEach(function (id) { nodes[id] = buildNavButtonAndPanel(doc, id, false); });
  PROTECTED.forEach(function (id) { nodes[id] = buildNavButtonAndPanel(doc, id, false); });
  nodes['root-aios'] = { btn: doc.querySelector('.app-nav-btn[data-tab="root-aios"]'), panel: doc.getElementById('tab-root-aios') };
  return nodes;
}

function withEnv(testFn, envOpts) {
  return async function (t) {
    var env = installFakeBrowserGlobals(envOpts || {});
    t.after(env.restore);
    await testFn(env);
  };
}

// ── Sidebar lock state (Phase 6 / 13 items 1-6) ─────────────────────────

test('unauthenticated: every protected nav item is locked (aria-disabled + locked class), never hidden', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildStandardNav(env.document);
  navigation.initNavigation();

  PROTECTED.forEach(function (id) {
    assert.equal(nodes[id].btn.getAttribute('aria-disabled'), 'true', id);
    assert.ok(nodes[id].btn.classList.contains('app-nav-btn--locked'), id);
    // Never hidden — an unauthenticated user still needs a discoverable
    // way to start authorization (Phase 11).
    assert.equal(nodes[id].btn.hidden, false, id);
  });
}));

test('unauthenticated: public nav items are never locked', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildStandardNav(env.document);
  navigation.initNavigation();

  PUBLIC_TABS.forEach(function (id) {
    assert.equal(nodes[id].btn.getAttribute('aria-disabled'), null, id);
    assert.equal(nodes[id].btn.classList.contains('app-nav-btn--locked'), false, id);
  });
}));

test('authenticated: every protected nav item is unlocked (accessible)', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildStandardNav(env.document);
  navigation.initNavigation();

  PROTECTED.forEach(function (id) {
    assert.equal(nodes[id].btn.getAttribute('aria-disabled'), null, id);
    assert.equal(nodes[id].btn.classList.contains('app-nav-btn--locked'), false, id);
  });
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

// ── Direct tab activation (Phase 13 items 7-9, 12) ──────────────────────

PROTECTED.forEach(function (id) {
  test('unauthenticated: clicking the ' + id + ' nav item does not activate its panel', withEnv(async (env) => {
    var { navigation } = await loadModules();
    var nodes = buildStandardNav(env.document);
    navigation.initNavigation();

    nodes[id].btn.click();
    await flush();

    assert.equal(nodes[id].panel.classList.contains('active'), false);
    assert.equal(nodes[id].btn.classList.contains('active'), false);
    // The default public tab is left untouched — no accidental switch away.
    assert.equal(nodes['root-aios'].panel.classList.contains('active'), true);
  }));
});

PROTECTED.forEach(function (id) {
  test('authenticated: clicking the ' + id + ' nav item activates its panel', withEnv(async (env) => {
    var { navigation } = await loadModules();
    var nodes = buildStandardNav(env.document);
    navigation.initNavigation();

    nodes[id].btn.click();
    await flush();

    assert.equal(nodes[id].panel.classList.contains('active'), true);
    assert.equal(nodes[id].btn.classList.contains('active'), true);
  }, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));
});

test('unrelated public nav (File Map) activates normally regardless of auth state', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildStandardNav(env.document);
  navigation.initNavigation();

  nodes['file-map'].btn.click();
  await flush();

  assert.equal(nodes['file-map'].panel.classList.contains('active'), true);
}));

// ── Live authorization transitions (Phase 6 / 12) ───────────────────────

test('authorizing mid-session unlocks protected nav items without a page refresh', withEnv(async (env) => {
  var { navigation, authGate } = await loadModules();
  var nodes = buildStandardNav(env.document);
  navigation.initNavigation();

  assert.ok(nodes['issues'].btn.classList.contains('app-nav-btn--locked'));

  env.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify({
    version: 1, token: 'granted-token', verifiedMemberKey: 'suman', verifiedAt: '2026-08-10T00:00:00.000Z'
  }));
  env.document.dispatchEvent(new CustomEvent(authGate.CALENDAR_AUTH_CHANGED_EVENT));

  PROTECTED.forEach(function (id) {
    assert.equal(nodes[id].btn.classList.contains('app-nav-btn--locked'), false, id);
    assert.equal(nodes[id].btn.getAttribute('aria-disabled'), null, id);
  });
}));

test('losing authorization while a protected panel is active falls back to the default public tab', withEnv(async (env) => {
  var { navigation, authGate } = await loadModules();
  var nodes = buildStandardNav(env.document);
  navigation.initNavigation();

  nodes['staff-data'].btn.click();
  await flush();
  assert.equal(nodes['staff-data'].panel.classList.contains('active'), true);

  env.localStorage.removeItem('management_aios_calendar_auth_v1');
  env.document.dispatchEvent(new CustomEvent(authGate.CALENDAR_AUTH_CHANGED_EVENT));

  assert.equal(nodes['staff-data'].panel.classList.contains('active'), false);
  assert.equal(nodes['staff-data'].btn.classList.contains('active'), false);
  assert.equal(nodes['root-aios'].panel.classList.contains('active'), true);
  assert.ok(nodes['staff-data'].btn.classList.contains('app-nav-btn--locked'));
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

test('losing authorization while a PUBLIC panel is active does not force any navigation', withEnv(async (env) => {
  var { navigation, authGate } = await loadModules();
  var nodes = buildStandardNav(env.document);
  navigation.initNavigation();

  nodes['file-map'].btn.click();
  await flush();
  assert.equal(nodes['file-map'].panel.classList.contains('active'), true);

  env.localStorage.removeItem('management_aios_calendar_auth_v1');
  env.document.dispatchEvent(new CustomEvent(authGate.CALENDAR_AUTH_CHANGED_EVENT));

  assert.equal(nodes['file-map'].panel.classList.contains('active'), true);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));
