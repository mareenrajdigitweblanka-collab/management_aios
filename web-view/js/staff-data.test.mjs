/* staff-data.test.mjs — coverage for the Staff Data authenticated-module
   gate (REQ-AUTH-MODULES-007, 2026-08-10). Scope is deliberately narrow:
   the gate mechanics (no fetch while unauthenticated, placeholder shown,
   real content restored once authenticated, gate also covers the two PH
   Staff Data pilots embedded in Arun's/Paraparan's own Calendar tabs) —
   not full Staff Data table/filter feature coverage, which predates this
   requirement and has no existing test file of its own.

   Reuses review-summaries-test-dom.mjs's hand-rolled DOM/localStorage/
   fetch stand-in as-is (same convention as issues.test.mjs/
   knowledge-management.test.mjs) — staff-data.js is the one production
   module in this app that builds its widgets via containerEl.innerHTML
   strings rather than createElement/appendChild; that stand-in's narrow
   innerHTML tag parser is flat (does not preserve real nesting) but is
   suffient to make class-based querySelector lookups succeed, which is
   all mountStaffTableView()/createStaffFilterBar() need.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';

var importCounter = 0;
function loadStaffDataModule() {
  importCounter += 1;
  return import('./staff-data.js?test-instance=' + importCounter);
}

function flush() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

function withEnv(testFn, envOpts) {
  return async function (t) {
    var env = installFakeBrowserGlobals(envOpts || {});
    t.after(env.restore);
    await testFn(env);
  };
}

function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    json: function () { return Promise.resolve(body); }
  });
}

/* Mirrors web-view/index.html's real #tab-staff-data structure closely
   enough for staff-data.js's initStaffDataTab() to find every element it
   queries. 2026-08-11: the former 3-subtab (current-staff/onboarding-staff/
   resigned-staff) split was collapsed to one unified panel
   (#staff-subpanel-all-staff) when staff_status/employment_stage were
   dropped — see staff-data.js initStaffDataTab. */
function buildStaffDataTabDom(doc) {
  var panel = doc.createElement('div');
  panel.id = 'tab-staff-data';
  doc.body.appendChild(panel);

  var filterBar = doc.createElement('div');
  filterBar.id = 'staff-data-filter-bar';
  filterBar.className = 'staff-filter-bar';
  panel.appendChild(filterBar);

  var subpanel = doc.createElement('div');
  subpanel.className = 'staff-subpanel active';
  subpanel.id = 'staff-subpanel-all-staff';
  panel.appendChild(subpanel);

  var tableContainer = doc.createElement('div');
  tableContainer.className = 'staff-table-container';
  subpanel.appendChild(tableContainer);

  return panel;
}

/* Mirrors #arun-staff-pilot / #paraparan-staff-pilot. */
function buildTeamScopedPilotDom(doc, mountId) {
  var mountEl = doc.createElement('div');
  mountEl.id = mountId;
  mountEl.setAttribute('data-team-code', 'PH');
  doc.body.appendChild(mountEl);

  var filterBar = doc.createElement('div');
  filterBar.className = 'staff-filter-bar';
  mountEl.appendChild(filterBar);

  var tableContainer = doc.createElement('div');
  tableContainer.className = 'staff-table-container';
  mountEl.appendChild(tableContainer);

  var kpiMount = doc.createElement('div');
  kpiMount.className = 'kpi-pilot-mount';
  kpiMount.setAttribute('data-kpi-team', 'PH');
  mountEl.appendChild(kpiMount);

  return mountEl;
}

// ── Staff Data tab (sidebar) ─────────────────────────────────────────────

test('unauthenticated: initStaffDataPilot renders only the placeholder in the Staff Data tab, no fetch at all', withEnv(async (env) => {
  var mod = await loadStaffDataModule();
  var panel = buildStaffDataTabDom(env.document);
  var fetchCalled = false;
  env.window.fetch = function () { fetchCalled = true; return jsonResponse(200, {}); };
  globalThis.fetch = env.window.fetch;

  mod.initStaffDataPilot();
  await flush();

  assert.equal(fetchCalled, false, 'no Staff Data API request while unauthenticated');
  assert.match(panel.allText ? panel.allText() : panel.textContent, /Authorize this browser to access Staff Data\./);
  var filterBar = env.document.getElementById('staff-data-filter-bar');
  assert.equal(filterBar.hidden, true);
  panel.querySelectorAll('.staff-subpanel').forEach(function (sp) { assert.equal(sp.hidden, true); });
}));

test('authenticated: initStaffDataPilot fetches filter-options and clears the placeholder', withEnv(async (env) => {
  var mod = await loadStaffDataModule();
  var panel = buildStaffDataTabDom(env.document);
  var calls = [];
  var fetchImpl = function (url) {
    calls.push(String(url));
    if (String(url).indexOf('/filter-options') !== -1) { return jsonResponse(200, { teams: ['PH'] }); }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0, filters: {} });
  };
  globalThis.fetch = fetchImpl;

  mod.initStaffDataPilot();
  await flush();
  await flush();

  assert.ok(calls.some(function (u) { return u.indexOf('/api/staff/filter-options') !== -1; }));
  assert.doesNotMatch(panel.allText ? panel.allText() : panel.textContent, /Authorize this browser/);
  var filterBar = env.document.getElementById('staff-data-filter-bar');
  assert.equal(filterBar.hidden, false);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

test('a 401 from the Staff API clears the stored token (handleUnauthorizedResponse)', withEnv(async (env) => {
  var mod = await loadStaffDataModule();
  buildStaffDataTabDom(env.document);
  globalThis.fetch = function () { return jsonResponse(401, { detail: 'Invalid token.' }); };

  mod.initStaffDataPilot();
  await flush();
  await flush();

  assert.equal(env.localStorage.getItem('management_aios_calendar_auth_v1'), null);
}, { storedAuth: { token: 'stale-token', memberKey: 'mayurika' } }));

// ── Embedded PH Staff Data pilots (Arun's / Paraparan's Calendar tabs) ──

test('unauthenticated: the embedded PH Staff Data pilot (Arun tab) shows only the placeholder, no fetch — the rest of that Calendar tab is unaffected by this gate', withEnv(async (env) => {
  var mod = await loadStaffDataModule();
  var mountEl = buildTeamScopedPilotDom(env.document, 'arun-staff-pilot');
  var fetchCalled = false;
  globalThis.fetch = function () { fetchCalled = true; return jsonResponse(200, {}); };

  mod.initStaffDataPilot();
  await flush();

  assert.equal(fetchCalled, false);
  assert.match(mountEl.allText ? mountEl.allText() : mountEl.textContent, /Authorize this browser to access Staff Data\./);
  // KPI panel is synthetic, non-Staff-API data — unaffected, always renders.
  assert.match(mountEl.allText ? mountEl.allText() : mountEl.textContent, /Synthetic Technical Pilot/);
}));

test('authenticated: the embedded PH Staff Data pilot (Paraparan tab) fetches and renders normally', withEnv(async (env) => {
  var mod = await loadStaffDataModule();
  var mountEl = buildTeamScopedPilotDom(env.document, 'paraparan-staff-pilot');
  var calls = [];
  globalThis.fetch = function (url) {
    calls.push(String(url));
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0, filters: {} });
  };

  mod.initStaffDataPilot();
  await flush();

  assert.ok(calls.some(function (u) { return u.indexOf('/api/staff?') !== -1; }));
  assert.doesNotMatch(mountEl.allText ? mountEl.allText() : mountEl.textContent, /Authorize this browser/);
}, { storedAuth: { token: 'test-token', memberKey: 'paraparan' } }));
