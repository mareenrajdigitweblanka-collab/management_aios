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

// NOTE: staff-data.js's exports (STAFF_MAIN_COLUMNS, formatStaffCellValue,
// etc.) are deliberately NOT statically imported here — the module's
// top-level STAFF_API_BASE IIFE reads window.location.hostname at import
// time, before installFakeBrowserGlobals() has installed the fake window,
// which throws. Every test below instead awaits loadStaffDataModule()
// (dynamic import, same pattern every other test in this file already
// uses) inside withEnv(), after the fake globals exist, and reads the
// exports off the returned module object.

// Approved 14-field Staff Data business contract (2026-08-11
// frontend/backend field-contract alignment task). This is the exhaustive
// list — any addition or removal here is a deliberate contract change,
// not something these tests should silently accommodate.
var REQUIRED_STAFF_FIELDS = [
  'staff_code', 'name', 'email', 'phone', 'roster', 'designation',
  'joined_date', 'confirmed_date', 'address', 'delete_status',
  'staff_type', 'staff_level', 'informed_leave_balance', 'urgent_leave_balance'
];

// Field names the old CSV-era/curated-mirror designs used that must never
// reappear in the Staff Data display contract.
var OBSOLETE_STAFF_FIELDS = [
  'employee_number', 'full_name', 'department_team', 'date_of_joining',
  'calling_name', 'location', 'employment_stage', 'staff_status',
  'epf_number', 'nic', 'cv_reference', 'remarks'
];

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

// ── Field-contract regression tests (2026-08-11 frontend/backend
// field-contract alignment) — the 14 approved business fields exactly. ──

test('STAFF_MAIN_COLUMNS is exactly the 14 approved fields, no more, no fewer', withEnv(async () => {
  var mod = await loadStaffDataModule();
  assert.equal(mod.STAFF_MAIN_COLUMNS.length, 14);
  var sortedActual = mod.STAFF_MAIN_COLUMNS.slice().sort();
  var sortedRequired = REQUIRED_STAFF_FIELDS.slice().sort();
  assert.deepEqual(sortedActual, sortedRequired);
}));

test('STAFF_MAIN_COLUMNS contains none of the obsolete pre-2026-08-11 field names', withEnv(async () => {
  var mod = await loadStaffDataModule();
  OBSOLETE_STAFF_FIELDS.forEach(function (field) {
    assert.ok(
      mod.STAFF_MAIN_COLUMNS.indexOf(field) === -1,
      'obsolete field "' + field + '" must not appear in STAFF_MAIN_COLUMNS'
    );
  });
}));

test('STAFF_COLUMN_LABELS has a label for every required field and nothing extra', withEnv(async () => {
  var mod = await loadStaffDataModule();
  REQUIRED_STAFF_FIELDS.forEach(function (field) {
    assert.ok(typeof mod.STAFF_COLUMN_LABELS[field] === 'string' && mod.STAFF_COLUMN_LABELS[field].length > 0,
      'missing label for "' + field + '"');
  });
  assert.equal(Object.keys(mod.STAFF_COLUMN_LABELS).length, 14);
}));

test('STAFF_DETAIL_GROUPS covers exactly the 14 required fields across the approved groups, no duplicates', withEnv(async () => {
  var mod = await loadStaffDataModule();
  var seen = [];
  var expectedHeadings = ['Identity', 'Contact', 'Employment', 'Status', 'Leave'];
  assert.deepEqual(mod.STAFF_DETAIL_GROUPS.map(function (g) { return g.heading; }), expectedHeadings);
  mod.STAFF_DETAIL_GROUPS.forEach(function (group) {
    group.fields.forEach(function (f) { seen.push(f); });
  });
  assert.equal(seen.length, 14);
  assert.deepEqual(seen.slice().sort(), REQUIRED_STAFF_FIELDS.slice().sort());
  // No field appears in more than one group.
  assert.equal(new Set(seen).size, 14);
}));

test('STAFF_DETAIL_GROUPS Status group is exactly delete_status, never reinterpreted as Resigned/Inactive/employment_stage', withEnv(async () => {
  var mod = await loadStaffDataModule();
  var statusGroup = mod.STAFF_DETAIL_GROUPS.filter(function (g) { return g.heading === 'Status'; })[0];
  assert.deepEqual(statusGroup.fields, ['delete_status']);
}));

test('STAFF_PRIMARY_COLUMNS uses only approved-contract keys plus actions, and matches the specified quick-scan set', withEnv(async () => {
  var mod = await loadStaffDataModule();
  var keys = mod.STAFF_PRIMARY_COLUMNS.map(function (c) { return c.key; });
  assert.deepEqual(keys, ['staff_code', 'name', 'designation', 'roster', 'staff_type', 'staff_level', 'delete_status', 'actions']);
  mod.STAFF_PRIMARY_COLUMNS.forEach(function (c) {
    if (c.key === 'actions') { return; }
    assert.ok(REQUIRED_STAFF_FIELDS.indexOf(c.key) !== -1, '"' + c.key + '" must be one of the 14 approved fields');
  });
}));

// ── formatStaffCellValue — null/zero/boolean/delete-status handling ─────

test('formatStaffCellValue: null, undefined, and empty string all render as "no value" (null), never the literal text', withEnv(async () => {
  var mod = await loadStaffDataModule();
  assert.equal(mod.formatStaffCellValue(null, 'confirmed_date'), null);
  assert.equal(mod.formatStaffCellValue(undefined, 'phone'), null);
  assert.equal(mod.formatStaffCellValue('', 'address'), null);
}));

test('formatStaffCellValue: a 0 leave balance is NOT treated as empty', withEnv(async () => {
  var mod = await loadStaffDataModule();
  assert.equal(mod.formatStaffCellValue(0, 'informed_leave_balance'), '0');
  assert.equal(mod.formatStaffCellValue(0, 'urgent_leave_balance'), '0');
}));

test('formatStaffCellValue: delete_status renders Current/Deleted, never Yes/No or an HR status label', withEnv(async () => {
  var mod = await loadStaffDataModule();
  assert.equal(mod.formatStaffCellValue(false, 'delete_status'), 'Current');
  assert.equal(mod.formatStaffCellValue(true, 'delete_status'), 'Deleted');
}));

test('formatStaffCellValue: a plain string field passes through escaped', withEnv(async () => {
  var mod = await loadStaffDataModule();
  assert.equal(mod.formatStaffCellValue('DWL042', 'staff_code'), 'DWL042');
  assert.equal(mod.formatStaffCellValue('E-Commerce Executive', 'designation'), 'E-Commerce Executive');
}));

// ── buildStaffQuery — search alignment (staff_code/name), no obsolete params ──

test('buildStaffQuery sends search and team_id, never the removed staff_status/employment_stage/location/team params', withEnv(async () => {
  var mod = await loadStaffDataModule();
  var qs = mod.buildStaffQuery({ teamId: 4, search: 'DWL042' });
  assert.match(qs, /(^|&)team_id=4(&|$)/);
  assert.match(qs, /(^|&)search=DWL042(&|$)/);
  assert.doesNotMatch(qs, /staff_status/);
  assert.doesNotMatch(qs, /employment_stage/);
  assert.doesNotMatch(qs, /(^|&)team=/);
}));

// ── Integration: primary table renders the approved fields with clean
//    null/delete-status handling, no undefined/null/NaN leakage ──

var STAFF_FIXTURE_RECORD = {
  id: 42,
  staff_code: 'DWL042',
  name: 'Test Staff Member',
  role: 2,
  email: 'test.staff@example.com',
  phone: '0771234567',
  roster: 'saturday',
  designation: 'E-Commerce Executive',
  joined_date: '2023-05-10',
  confirmed_date: null,
  address: '123 Test Lane',
  skype: 'test.skype',
  delete_status: false,
  team_id: 4,
  is_approved: 1,
  staff_type: 'full-time',
  staff_level: 'Senior',
  informed_leave_balance: 0,
  urgent_leave_balance: 2.5,
  backup_staffs: '[1,2,3]'
};

test('primary table renders staff_code/name/designation/roster/staff_type/staff_level and Current for delete_status, with no undefined/null/NaN text', withEnv(async (env) => {
  var mod = await loadStaffDataModule();
  var panel = buildStaffDataTabDom(env.document);
  globalThis.fetch = function (url) {
    if (String(url).indexOf('/filter-options') !== -1) { return jsonResponse(200, { team_ids: [4] }); }
    return jsonResponse(200, { records: [STAFF_FIXTURE_RECORD], total: 1, limit: 50, offset: 0, filters: {} });
  };

  mod.initStaffDataPilot();
  await flush();
  await flush();

  var text = panel.allText ? panel.allText() : panel.textContent;
  assert.match(text, /DWL042/);
  assert.match(text, /Test Staff Member/);
  assert.match(text, /E-Commerce Executive/);
  assert.match(text, /saturday/);
  assert.match(text, /full-time/);
  assert.match(text, /Senior/);
  assert.match(text, /Current/);
  assert.doesNotMatch(text, /\bundefined\b/);
  assert.doesNotMatch(text, /\bnull\b/);
  assert.doesNotMatch(text, /\bNaN\b/);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));

// NOTE: a click-through "open Details, inspect drawer DOM" integration
// test was attempted here and removed — it fails on `btn.closest is not
// a function`, a pre-existing limitation of review-summaries-test-dom.mjs's
// hand-rolled innerHTML parser (documented at the top of this file: "that
// stand-in's narrow innerHTML tag parser is flat, does not preserve real
// nesting"), not a bug in staff-data.js's production code (btn.closest('tr')
// is correct, standard DOM usage that works in a real browser). The
// STAFF_DETAIL_GROUPS unit test above validates the exact data structure
// driving the drawer; the drawer's rendering of that structure was
// verified by direct code review, not by an automated DOM test — see the
// final report's "Real-browser result" section for the full caveat.

test('primary table renders Deleted for a soft-deleted (delete_status: true) row', withEnv(async (env) => {
  var mod = await loadStaffDataModule();
  var panel = buildStaffDataTabDom(env.document);
  var deletedRecord = Object.assign({}, STAFF_FIXTURE_RECORD, { id: 43, staff_code: 'DWL043', delete_status: true });
  globalThis.fetch = function (url) {
    if (String(url).indexOf('/filter-options') !== -1) { return jsonResponse(200, { team_ids: [4] }); }
    return jsonResponse(200, { records: [deletedRecord], total: 1, limit: 50, offset: 0, filters: {} });
  };

  mod.initStaffDataPilot();
  await flush();
  await flush();

  var text = panel.allText ? panel.allText() : panel.textContent;
  assert.match(text, /Deleted/);
  assert.doesNotMatch(text, /Resigned/);
  assert.doesNotMatch(text, /Inactive/);
}, { storedAuth: { token: 'test-token', memberKey: 'mayurika' } }));
