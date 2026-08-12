/* auth-gate.test.mjs — coverage for the shared authenticated-module guard
   primitives (REQ-AUTH-MODULES-007, 2026-08-10). Sidebar/tab wiring is
   covered end-to-end in navigation.test.mjs; this file covers auth-gate.js's
   own exported pure functions and DOM builder in isolation.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';

var importCounter = 0;
function loadModule() {
  importCounter += 1;
  return import('./auth-gate.js?test-instance=' + importCounter);
}

function withEnv(testFn, envOpts) {
  return async function (t) {
    var env = installFakeBrowserGlobals(envOpts || {});
    t.after(env.restore);
    await testFn(env);
  };
}

test('PROTECTED_TABS is exactly Staff Data, Issues, Knowledge Management, Announcements', withEnv(async () => {
  var mod = await loadModule();
  assert.deepEqual(mod.PROTECTED_TABS, ['staff-data', 'issues', 'knowledge-management', 'announcements']);
}));

test('isProtectedTab: true only for the four protected tabs', withEnv(async () => {
  var mod = await loadModule();
  ['staff-data', 'issues', 'knowledge-management', 'announcements'].forEach(function (id) {
    assert.equal(mod.isProtectedTab(id), true, id);
  });
  ['root-aios', 'file-map', 'review-summaries', 'mayurika-hr', null, undefined].forEach(function (id) {
    assert.equal(mod.isProtectedTab(id), false, String(id));
  });
}));

test('isAuthenticated: false with no stored token', withEnv(async () => {
  var mod = await loadModule();
  assert.equal(mod.isAuthenticated(), false);
}, { storedAuth: null }));

test('isAuthenticated: true with a stored token/memberKey', withEnv(async () => {
  var mod = await loadModule();
  assert.equal(mod.isAuthenticated(), true);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

test('moduleLabelForTab: returns the exact approved display label per protected tab', withEnv(async () => {
  var mod = await loadModule();
  assert.equal(mod.moduleLabelForTab('staff-data'), 'Staff Data');
  assert.equal(mod.moduleLabelForTab('issues'), 'Issues');
  assert.equal(mod.moduleLabelForTab('knowledge-management'), 'Knowledge Management');
  assert.equal(mod.moduleLabelForTab('unknown-tab'), 'this Management AIOS module');
}));

test('buildAuthRequiredNotice: exact Phase 11 copy and a working Authorize button', withEnv(async () => {
  var mod = await loadModule();
  var notice = mod.buildAuthRequiredNotice('issues');
  assert.equal(notice.className, 'msc-auth-required');
  var text = notice._children.map(function (c) { return c.textContent; }).join(' ');
  assert.match(text, /Authorize this browser to access Issues\./);
  var button = notice._children[1];
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.textContent, 'Authorize this browser');
}));

test('onAuthChange: fires the handler when CALENDAR_AUTH_CHANGED_EVENT is dispatched, and unsubscribe stops it', withEnv(async (env) => {
  var mod = await loadModule();
  var calls = 0;
  var unsubscribe = mod.onAuthChange(function () { calls += 1; });

  env.document.dispatchEvent(new CustomEvent(mod.CALENDAR_AUTH_CHANGED_EVENT));
  assert.equal(calls, 1);

  unsubscribe();
  env.document.dispatchEvent(new CustomEvent(mod.CALENDAR_AUTH_CHANGED_EVENT));
  assert.equal(calls, 1, 'no further calls after unsubscribe');
}));
