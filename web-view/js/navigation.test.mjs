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
import { installFakeBrowserGlobals, buildNavButtonAndPanel, buildExternalAuthLink } from './navigation-test-dom.mjs';

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

// ── DigitDisplay external nav link (REQ-DIGITDISPLAY-NAV-001, 2026-10-22) ──
// Gated by the same AIOS member-token authorization as the protected tabs
// above, but it is NOT a tab: no data-tab, no .tab-panel. These tests cover
// the lock/unlock lifecycle and — critically — that it never interacts with
// setPanelActive's data-tab/'tab-'+targetId matching (the exact bug the
// '.app-nav-btn[data-tab]' selector guard in navigation.js exists to avoid).

var DIGITDISPLAY_HREF = 'https://digit-display.vercel.app/admin';

function buildNavWithExternalLink(doc) {
  var nodes = buildStandardNav(doc);
  nodes['digitdisplay'] = buildExternalAuthLink(doc, 'digitdisplay', DIGITDISPLAY_HREF);
  return nodes;
}

test('unauthenticated: the DigitDisplay link is locked (aria-disabled + locked class), never hidden', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  assert.equal(nodes['digitdisplay'].getAttribute('aria-disabled'), 'true');
  assert.ok(nodes['digitdisplay'].classList.contains('app-nav-btn--locked'));
  assert.equal(nodes['digitdisplay'].hidden, false);
}));

test('authenticated: the DigitDisplay link is unlocked (accessible)', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  assert.equal(nodes['digitdisplay'].getAttribute('aria-disabled'), null);
  assert.equal(nodes['digitdisplay'].classList.contains('app-nav-btn--locked'), false);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

test('authorizing mid-session unlocks the DigitDisplay link without a page refresh', withEnv(async (env) => {
  var { navigation, authGate } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  assert.ok(nodes['digitdisplay'].classList.contains('app-nav-btn--locked'));

  env.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify({
    version: 1, token: 'granted-token', verifiedMemberKey: 'suman', verifiedAt: '2026-08-10T00:00:00.000Z'
  }));
  env.document.dispatchEvent(new CustomEvent(authGate.CALENDAR_AUTH_CHANGED_EVENT));

  assert.equal(nodes['digitdisplay'].classList.contains('app-nav-btn--locked'), false);
  assert.equal(nodes['digitdisplay'].getAttribute('aria-disabled'), null);
}));

test('logging out (removing the token) re-locks the DigitDisplay link', withEnv(async (env) => {
  var { navigation, authGate } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  assert.equal(nodes['digitdisplay'].classList.contains('app-nav-btn--locked'), false);

  env.localStorage.removeItem('management_aios_calendar_auth_v1');
  env.document.dispatchEvent(new CustomEvent(authGate.CALENDAR_AUTH_CHANGED_EVENT));

  assert.ok(nodes['digitdisplay'].classList.contains('app-nav-btn--locked'));
  assert.equal(nodes['digitdisplay'].getAttribute('aria-disabled'), 'true');
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

test('unauthenticated: clicking the DigitDisplay link does not navigate and does not change the active panel', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  nodes['digitdisplay'].click();
  await flush();

  // No panel/button anywhere was blanked or switched by this click — the
  // exact regression the [data-tab] selector guard prevents.
  assert.equal(nodes['root-aios'].panel.classList.contains('active'), true);
  assert.equal(nodes['root-aios'].btn.classList.contains('active'), true);
  assert.equal(env.window.open.calls.length, 0);
}));

test('authenticated: clicking the DigitDisplay link does not change the active panel (native navigation is left to the browser)', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  nodes['file-map'].btn.click();
  await flush();
  assert.equal(nodes['file-map'].panel.classList.contains('active'), true);

  nodes['digitdisplay'].click();
  await flush();

  assert.equal(nodes['file-map'].panel.classList.contains('active'), true);
  assert.equal(nodes['digitdisplay'].classList.contains('active'), false);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

test('unauthenticated: middle-click (auxclick) on the DigitDisplay link is also intercepted', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  var prevented = false;
  nodes['digitdisplay'].dispatchEvent({
    type: 'auxclick',
    target: nodes['digitdisplay'],
    preventDefault: function () { prevented = true; }
  });
  await flush();

  assert.equal(prevented, true);
  assert.equal(env.window.open.calls.length, 0);
}));

test('authorizing in the background after an unauthenticated click never auto-opens DigitDisplay (popup-blocker safety) — the user must click again', withEnv(async (env) => {
  var { navigation, authGate } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  nodes['digitdisplay'].click();
  await flush();
  assert.equal(env.window.open.calls.length, 0, 'the original click must not have opened anything yet');

  // Simulate the "Authorize this browser" dialog completing successfully
  // some time after the original click's user-gesture context has already
  // expired — exactly the scenario a window.open() inside the
  // requestAuthorization().then() callback would hit a popup blocker for.
  env.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify({
    version: 1, token: 'granted-token', verifiedMemberKey: 'suman', verifiedAt: '2026-08-10T00:00:00.000Z'
  }));
  env.document.dispatchEvent(new CustomEvent(authGate.CALENDAR_AUTH_CHANGED_EVENT));
  await flush();

  // No automatic popup — still zero calls. The link is simply unlocked now;
  // reaching DigitDisplay requires a second, direct, user-gesture click.
  assert.equal(env.window.open.calls.length, 0);
  assert.equal(nodes['digitdisplay'].classList.contains('app-nav-btn--locked'), false);
}));

test('an unauthenticated click on the DigitDisplay link still closes the mobile drawer (existing drawer convention applies to every nav item)', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  env.document.body.classList.add('sidebar-open');
  nodes['digitdisplay'].click();
  await flush();

  assert.equal(env.document.body.classList.contains('sidebar-open'), false);
}));

test('an authorized click on the DigitDisplay link closes the mobile drawer', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  env.document.body.classList.add('sidebar-open');
  nodes['digitdisplay'].click();
  await flush();

  assert.equal(env.document.body.classList.contains('sidebar-open'), false);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

test('existing internal navigation (click-through across several tabs) still works with the DigitDisplay link present', withEnv(async (env) => {
  var { navigation } = await loadModules();
  var nodes = buildNavWithExternalLink(env.document);
  navigation.initNavigation();

  nodes['file-map'].btn.click();
  await flush();
  assert.equal(nodes['file-map'].panel.classList.contains('active'), true);
  assert.equal(nodes['root-aios'].panel.classList.contains('active'), false);

  nodes['staff-data'].btn.click();
  await flush();
  assert.equal(nodes['staff-data'].panel.classList.contains('active'), true);
  assert.equal(nodes['file-map'].panel.classList.contains('active'), false);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));
