/* knowledge-management.test.mjs — coverage for the Knowledge Management
   Company Documents view wired to the real persistent backend CRUD API
   (REQ-KM-UI-004, 2026-08-10).

   REPLACES the REQ-KM-001 test suite entirely — the static
   APPROVED_DOCUMENTS registry and its sample notice this file used to
   test no longer exist in the module (see knowledge-management.js's
   module docstring). Tests 1-2 below assert that absence directly.

   Two testing tiers, matching this repo's existing issues.test.mjs
   convention (production adapter vs. in-memory adapter tested
   separately):
     (A) DOM-mount tests inject a FIXTURE `api` object into
         mountKnowledgeManagementWorkspace(mountEl, {api}) — exercises all
         UI behavior (modals, validation, busy states, list refresh)
         without ever calling the real fetch-backed exports.
     (B) A handful of tests call the REAL exported API-client functions
         (createKnowledgeDocument, updateKnowledgeDocumentMetadata, etc.)
         directly, with global.fetch stubbed via
         installFakeBrowserGlobals({fetchImpl}), to verify exact request
         construction (method/path/body/Authorization header) and 401/403
         handling — the one thing fixture injection can't cover.

   Uses fastapi... no — pure frontend. Reuses
   review-summaries-test-dom.mjs's hand-rolled DOM/localStorage/fetch
   stand-in as-is (installFakeBrowserGlobals) — same convention as
   issues.test.mjs/review-summaries.test.mjs.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';
import { __resetScrollLockForTests } from './ui/scroll-lock.js';

var importCounter = 0;
function loadKmModule() {
  importCounter += 1;
  return import('./knowledge-management.js?test-instance=' + importCounter);
}

function fire(elNode, type) {
  elNode.dispatchEvent({ type: type, target: elNode, preventDefault: function () {} });
}

function flush() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

/* env.storedAuth pre-seeds an already-verified Calendar token so
   ensureAuthorized() resolves immediately without opening the real token
   dialog — every UI test below runs "as an authorized Management Team
   member" unless a test explicitly omits it. */
function withEnv(testFn, envOpts) {
  return async function (t) {
    var env = installFakeBrowserGlobals(envOpts || {
      storedAuth: { token: 'test-token', memberKey: 'mayurika' }
    });
    t.after(env.restore);
    await testFn(env);
  };
}

var FIXTURE_DOC = {
  id: 'fx-doc-1',
  title: 'KPI Review Guide',
  team: 'Management',
  document_type: 'Google Sheet',
  job_role: 'Analyst',
  document_category: 'Reporting',
  creator: 'Alex Doe',
  source_url: 'https://docs.google.com/spreadsheets/d/FIXTURE1/edit',
  current_version: '1.0',
  lifecycle_status: 'Active',
  compliance_status: 'Pending',
  google_ownership_status: 'Not Verified',
  created_by: 'mayurika',
  updated_by: 'mayurika',
  created_at: '2026-08-10T10:00:00Z',
  updated_at: '2026-08-10T10:00:00Z',
  warnings: []
};

var FIXTURE_DOC_2 = Object.assign({}, FIXTURE_DOC, {
  id: 'fx-doc-2', title: 'Onboarding Handbook', team: 'HR', document_type: 'PDF',
  source_url: 'https://example.com/handbook.pdf', current_version: '2.0'
});

var DELETED_FIXTURE_DOC = {
  id: 'fx-doc-deleted-1',
  title: 'Old Onboarding Guide',
  team: 'HR',
  document_type: 'PDF',
  creator: 'Alex Doe',
  current_version: '1.0',
  deleted_by: 'suman',
  deleted_at: '2026-08-09T09:00:00Z',
  delete_reason: 'Superseded by new guide'
};

var SUMMARY_FIXTURE = {
  total: 2, active: 1, archived: 1, pending: 1, completed: 1,
  missing_creator: 1, google_unverified: 1,
  by_team: [{ team: 'Management', count: 1 }, { team: 'HR', count: 1 }],
  recently_added: [FIXTURE_DOC],
  recently_updated: [FIXTURE_DOC],
  recent_activity: [{
    document_id: FIXTURE_DOC.id, document_title: FIXTURE_DOC.title,
    action: 'create', actor_member_key: 'mayurika', occurred_at: '2026-08-10T10:00:00Z'
  }],
  latest_version_updates: [{
    id: 'v1', document_id: FIXTURE_DOC.id, version_label: '1.0',
    source_url: FIXTURE_DOC.source_url, change_note: null,
    created_by: 'mayurika', created_at: '2026-08-10T10:00:00Z'
  }]
};

function makeFixtureApi(overrides) {
  var base = {
    list: function () { return Promise.resolve({ records: [FIXTURE_DOC, FIXTURE_DOC_2], total: 2, limit: 200, offset: 0 }); },
    summary: function () { return Promise.resolve(SUMMARY_FIXTURE); },
    detail: function () { return Promise.resolve(FIXTURE_DOC); },
    create: function () { return Promise.resolve(FIXTURE_DOC); },
    updateMetadata: function () { return Promise.resolve(FIXTURE_DOC); },
    createVersion: function () { return Promise.resolve(Object.assign({}, FIXTURE_DOC, { current_version: '2.0' })); },
    archive: function () { return Promise.resolve(Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' })); },
    unarchive: function () { return Promise.resolve(Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Active' })); },
    softDelete: function () { return Promise.resolve({ id: FIXTURE_DOC.id, deleted: true }); },
    restore: function () { return Promise.resolve(Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Active' })); },
    listVersions: function () { return Promise.resolve([{ id: 'v1', document_id: FIXTURE_DOC.id, version_label: '1.0', source_url: FIXTURE_DOC.source_url, change_note: null, created_by: 'mayurika', created_at: '2026-08-10T10:00:00Z' }]); },
    listAuditLog: function () { return Promise.resolve([{ id: 'a1', document_id: FIXTURE_DOC.id, action: 'create', actor_member_key: 'mayurika', detail: null, occurred_at: '2026-08-10T10:00:00Z' }]); },
    listDeleted: function () { return Promise.resolve([]); }
  };
  return Object.assign(base, overrides || {});
}

function mountWithFixture(apiOverrides) {
  return loadKmModule().then(function (mod) {
    var mountEl = document.createElement('div');
    var api = makeFixtureApi(apiOverrides);
    var handle = mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
    return flush().then(function () { return { mod: mod, mountEl: mountEl, api: api, handle: handle }; });
  });
}

function q(mountEl, className) { return mountEl.querySelector(className); }
function qAll(mountEl, className) { return mountEl.querySelectorAll(className); }

/* ui/dialog.js's confirmDestructive() builds its overlay once (module-level
   `dialogApi` singleton) and appends it to whichever `document` was active
   the first time any test in this file triggers it. Since ui/dialog.js is
   imported via an unversioned relative specifier, Node's ESM cache shares
   ONE instance of it across every knowledge-management.js?test-instance=N
   import — but installFakeBrowserGlobals() gives each test a brand-new
   fake `document`, so only the very first test to open the dialog can find
   its button via that test's own document.querySelector(). Every later
   test reuses the exact same real button object (same singleton), just
   unreachable via its own fresh document's bookkeeping — so this caches
   the first successful lookup and falls back to it. */
var sharedDialogConfirmBtn = null;
function getDialogConfirmBtn() {
  var btn = document.querySelector('.ui-dialog-confirm');
  if (btn) { sharedDialogConfirmBtn = btn; }
  return btn || sharedDialogConfirmBtn;
}

/* Same cross-test singleton issue as getDialogConfirmBtn() above, but for
   ui/toast.js's module-level `regionEl` (lazily created once, reused by
   every showToast() call for the life of the process). */
var sharedToastRegion = null;
function getToastRegion() {
  var region = document.querySelector('.ui-toast-region');
  if (region) { sharedToastRegion = region; }
  return region || sharedToastRegion;
}

/* Primes the toast-region singleton (see comment above) under a throwaway
   fake document, before any test() body runs — otherwise whichever test
   happens to be the first in file order to trigger showToast() "wins" the
   singleton for its own now-discarded document, and no later test could
   ever populate the cache itself. Module top-level code (and top-level
   await) runs to completion before node:test invokes any registered test
   callback, so this ordering is safe. */
var primeEnv = installFakeBrowserGlobals({ storedAuth: { token: 'prime', memberKey: 'mayurika' } });
var primeToastMod = await import('./ui/toast.js');
primeToastMod.showToast({ type: 'information', title: '', message: '' });
sharedToastRegion = document.querySelector('.ui-toast-region');
primeEnv.restore();

// ── Static HTML structure (index.html) — same line-anchored technique as
//    navigation-structure.test.mjs, duplicated locally. ─────────────────

var indexHtmlPath = fileURLToPath(new URL('../index.html', import.meta.url));
var html = readFileSync(indexHtmlPath, 'utf8');

var TOP_LEVEL_PANEL_RE = /^ {4}<div class="tab-panel[^"]*" id="([^"]+)"/gm;
function topLevelPanels(source) {
  var panels = [];
  var match;
  TOP_LEVEL_PANEL_RE.lastIndex = 0;
  while ((match = TOP_LEVEL_PANEL_RE.exec(source))) { panels.push({ id: match[1], start: match.index }); }
  return panels;
}
function panelSegments(source) {
  var panels = topLevelPanels(source);
  var segments = {};
  panels.forEach(function (panel, i) {
    var end = (i + 1 < panels.length) ? panels[i + 1].start : source.length;
    segments[panel.id] = source.slice(panel.start, end);
  });
  return segments;
}
var segments = panelSegments(html);

// ══════════════════════════════════════════════════════════════════════
// DATA SOURCE (1-7)
// ══════════════════════════════════════════════════════════════════════

test('1. static sample registry absent', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.APPROVED_DOCUMENTS, undefined);
}));

test('2. sample notice absent', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.SAMPLE_DATA_NOTICE_TEXT, undefined);
  var { mountEl } = await mountWithFixture();
  assert.equal(mountEl.querySelector('.msc-km-sample-notice'), null);
  assert.doesNotMatch(mountEl.allText(), /Sample documents/);
}));

test('3. list calls API', withEnv(async () => {
  var calls = 0;
  await mountWithFixture({ list: function (filters) { calls += 1; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); } });
  assert.equal(calls, 1);
}));

// ── Whole-panel authentication gate (REQ-AUTH-MODULES-007, 2026-08-10) ──

test('2b. unauthenticated mount shows only the shared "Authorize this browser" placeholder — no list() call, no filter bar, no table', withEnv(async () => {
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var listCalled = false;
  var api = makeFixtureApi({ list: function () { listCalled = true; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); } });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  assert.equal(listCalled, false, 'no GET /api/knowledge-documents call while unauthenticated');
  assert.match(mountEl.allText(), /Authorize this browser to access Knowledge Management\./);
  assert.equal(mountEl.querySelector('.msc-km-table-wrap'), null);
  assert.equal(mountEl.querySelector('.msc-km-add-btn'), null);
}, { storedAuth: null }));

test('2c. re-mounting after authorization (the same re-mount initKnowledgeManagement performs on CALENDAR_AUTH_CHANGED_EVENT) replaces the placeholder with the real workspace', withEnv(async (env) => {
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var listCalls = 0;
  var api = makeFixtureApi({ list: function () { listCalls += 1; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); } });

  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  assert.match(mountEl.allText(), /Authorize this browser/);
  assert.equal(listCalls, 0);

  env.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify({
    version: 1, token: 'granted-token', verifiedMemberKey: 'mayurika', verifiedAt: '2026-08-10T00:00:00.000Z'
  }));
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api }); // initKnowledgeManagement's own re-mount, exercised directly

  await flush();
  assert.doesNotMatch(mountEl.allText(), /Authorize this browser/);
  assert.equal(listCalls, 1);
  assert.ok(mountEl.querySelector('.msc-km-table-wrap') || /KPI Review Guide/.test(mountEl.allText()));
}, { storedAuth: null }));

test('4. loading state', withEnv(async () => {
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var resolveList;
  var api = makeFixtureApi({ list: function () { return new Promise(function (res) { resolveList = res; }); } });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  assert.match(mountEl.allText(), /Loading documents/);
  resolveList({ records: [], total: 0, limit: 200, offset: 0 });
}));

test('5. zero-record empty state', withEnv(async () => {
  var mod = await loadKmModule();
  var { mountEl } = await mountWithFixture({ list: function () { return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); } });
  assert.match(mountEl.allText(), new RegExp(mod.EMPTY_STATE_TEXT));
}));

test('6. API error state', withEnv(async () => {
  var { mountEl } = await mountWithFixture({ list: function () { return Promise.reject(new Error('boom')); } });
  var errEl = q(mountEl, '.msc-km-error-state');
  assert.ok(errEl);
  // mapApiError() deliberately never surfaces a raw error message — an
  // unrecognized error code always renders the generic KNOWN_ERRORS.unknown
  // copy, never the literal Error('boom').message.
  assert.match(errEl.allText(), /Try again\. If the problem continues, contact your system administrator\./);
}));

test('7. retry works', withEnv(async () => {
  var attempts = 0;
  var { mountEl } = await mountWithFixture({
    list: function () {
      attempts += 1;
      if (attempts === 1) { return Promise.reject(new Error('boom')); }
      return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 });
    }
  });
  var retryBtn = Array.prototype.filter.call(qAll(mountEl, '.msc-btn'), function (b) { return b.textContent === 'Retry'; })[0];
  assert.ok(retryBtn);
  fire(retryBtn, 'click');
  await flush();
  assert.equal(attempts, 2);
  assert.match(mountEl.allText(), /KPI Review Guide/);
}));

// ══════════════════════════════════════════════════════════════════════
// LIST / FILTER (8-13)
// ══════════════════════════════════════════════════════════════════════

test('8. API records render', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var titles = qAll(mountEl, '.msc-km-title-cell').map(function (n) { return n.textContent; });
  assert.deepEqual(titles.sort(), ['KPI Review Guide', 'Onboarding Handbook']);
}));

test('9. title search sends server-side search param', withEnv(async () => {
  var mod = await loadKmModule();
  var qs = mod.buildListQueryString({ search: 'kpi' });
  assert.match(qs, /search=kpi/);
  var captured = null;
  var { mountEl } = await mountWithFixture({ list: function (filters) { captured = filters; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); } });
  var searchInput = q(mountEl, '.msc-km-search-input');
  searchInput.value = 'kpi';
  fire(searchInput, 'input');
  await new Promise(function (r) { setTimeout(r, 300); });
  assert.equal(captured.search, 'kpi');
}));

test('10. Team filter sends server-side team param', withEnv(async () => {
  var captured = null;
  var { mountEl } = await mountWithFixture({ list: function (filters) { captured = filters; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); } });
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  teamSelect.value = 'HR';
  fire(teamSelect, 'change');
  await flush();
  assert.equal(captured.team, 'HR');
}));

test('11. Document Type filter sends server-side document_type param', withEnv(async () => {
  var captured = null;
  var { mountEl } = await mountWithFixture({ list: function (filters) { captured = filters; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); } });
  var typeSelect = mountEl.querySelector('#msc-km-type-filter');
  typeSelect.value = 'PDF';
  fire(typeSelect, 'change');
  await flush();
  assert.equal(captured.documentType, 'PDF');
}));

test('12. lifecycle filter sends server-side lifecycle_status param', withEnv(async () => {
  var mod = await loadKmModule();
  var qs = mod.buildListQueryString({ lifecycleStatus: 'Archived' });
  assert.match(qs, /lifecycle_status=Archived/);
  var captured = null;
  var { mountEl } = await mountWithFixture({ list: function (filters) { captured = filters; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); } });
  var lifecycleSelect = mountEl.querySelector('#msc-km-lifecycle-filter');
  lifecycleSelect.value = 'Archived';
  fire(lifecycleSelect, 'change');
  await flush();
  assert.equal(captured.lifecycleStatus, 'Archived');
}));

test('13. combined filters (search + team + type) all present in one request — AND semantics', withEnv(async () => {
  var mod = await loadKmModule();
  var qs = mod.buildListQueryString({ search: 'kpi', team: 'Management', documentType: 'Google Sheet' });
  assert.match(qs, /search=kpi/);
  assert.match(qs, /team=Management/);
  assert.match(qs, /document_type=Google\+Sheet|document_type=Google%20Sheet/);
}));

// ══════════════════════════════════════════════════════════════════════
// CREATE (14-23)
// ══════════════════════════════════════════════════════════════════════

test('14. Add button exists', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var addBtn = q(mountEl, '.msc-km-add-btn');
  assert.ok(addBtn);
  assert.equal(addBtn.textContent, '+ Add Document');
}));

test('15. modal opens on Add click', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var addBtn = q(mountEl, '.msc-km-add-btn');
  fire(addBtn, 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.ok(overlay);
  assert.ok(overlay.classList.contains('show'));
}));

test('16. required validation blocks submit with no server call', withEnv(async () => {
  var createCalled = false;
  var { mountEl } = await mountWithFixture({ create: function () { createCalled = true; return Promise.resolve(FIXTURE_DOC); } });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  fire(form, 'submit');
  await flush();
  assert.equal(createCalled, false);
}));

test('17. server-owned fields absent from create form', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  ['id', 'created_by', 'updated_by', 'created_at', 'updated_at', 'lifecycle_status', 'compliance_status', 'google_ownership_status', 'current_version']
    .forEach(function (field) {
      assert.equal(form.querySelector('#msc-km-create-' + field), null, field + ' must not be an editable create field');
    });
}));

test('18. POST payload correct (real API-client function)', withEnv(async (env) => {
  var capturedBody = null;
  env.fetchOverride = null;
  var mod = await loadKmModule();
  var restoreFetch = globalThis.fetch;
  globalThis.fetch = function (url, opts) {
    capturedBody = JSON.parse(opts.body);
    return Promise.resolve({ ok: true, status: 201, text: function () { return Promise.resolve(JSON.stringify(FIXTURE_DOC)); } });
  };
  await mod.createKnowledgeDocument({ title: 'T', team: 'Team', document_type: 'PDF', source_url: 'https://example.com/x' });
  globalThis.fetch = restoreFetch;
  assert.deepEqual(capturedBody, { title: 'T', team: 'Team', document_type: 'PDF', source_url: 'https://example.com/x' });
}));

test('19. Authorization header attached to create request', withEnv(async () => {
  var capturedHeaders = null;
  var mod = await loadKmModule();
  var restoreFetch = globalThis.fetch;
  globalThis.fetch = function (url, opts) {
    capturedHeaders = opts.headers;
    return Promise.resolve({ ok: true, status: 201, text: function () { return Promise.resolve(JSON.stringify(FIXTURE_DOC)); } });
  };
  await mod.createKnowledgeDocument({ title: 'T', team: 'Team', document_type: 'PDF', source_url: 'https://example.com/x' });
  globalThis.fetch = restoreFetch;
  assert.equal(capturedHeaders.Authorization, 'Bearer test-token');
}));

test('20. duplicate-submit protection — Save disabled immediately on submit', withEnv(async () => {
  var resolveCreate;
  var { mountEl } = await mountWithFixture({ create: function () { return new Promise(function (res) { resolveCreate = res; }); } });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  form.querySelector('#msc-km-create-title').value = 'T';
  form.querySelector('#msc-km-create-team').value = 'Ebay Team';
  form.querySelector('#msc-km-create-url').value = 'https://example.com/x';
  fire(form, 'submit');
  await flush();
  var saveBtn = Array.prototype.filter.call(form.querySelectorAll('.msc-btn'), function (b) { return b.type === 'submit'; })[0];
  assert.equal(saveBtn.disabled, true);
  resolveCreate(FIXTURE_DOC);
}));

test('21. success updates UI (list refetched, modal closed)', withEnv(async () => {
  var listCalls = 0;
  var { mountEl } = await mountWithFixture({
    list: function () { listCalls += 1; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); },
    create: function () { return Promise.resolve(FIXTURE_DOC); }
  });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  form.querySelector('#msc-km-create-title').value = 'T';
  form.querySelector('#msc-km-create-team').value = 'Ebay Team';
  form.querySelector('#msc-km-create-url').value = 'https://example.com/x';
  fire(form, 'submit');
  await flush();
  assert.equal(listCalls, 2); // initial mount + post-create refresh
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.equal(overlay.classList.contains('show'), false);
}));

test('22. 409 duplicate URL message shown on the URL field', withEnv(async () => {
  var err = new Error('An active document already uses this source URL.');
  err.code = 'knowledge_document_duplicate_source_url';
  var { mountEl } = await mountWithFixture({ create: function () { return Promise.reject(err); } });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  form.querySelector('#msc-km-create-title').value = 'T';
  form.querySelector('#msc-km-create-team').value = 'Ebay Team';
  form.querySelector('#msc-km-create-url').value = 'https://example.com/x';
  fire(form, 'submit');
  await flush();
  // setFieldError() attaches the error <span> via insertAdjacentElement,
  // which this hand-rolled test-dom tracks outside the normal
  // parent/_children tree (see FakeElement.insertAdjacentElement) — so it
  // must be located via the flat document-wide lookup, not form.allText().
  var fieldError = document.querySelector('.ui-field-error');
  assert.ok(fieldError);
  assert.match(fieldError.allText(), /already uses this source URL/);
}));

test('23. warning response shown as a toast when create returns warnings', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    create: function () { return Promise.resolve(Object.assign({}, FIXTURE_DOC, { warnings: ['A document titled "X" with a different source URL already exists.'] })); }
  });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  form.querySelector('#msc-km-create-title').value = 'T';
  form.querySelector('#msc-km-create-team').value = 'Ebay Team';
  form.querySelector('#msc-km-create-url').value = 'https://example.com/x';
  fire(form, 'submit');
  await flush();
  var toastRegion = getToastRegion();
  assert.match(toastRegion.allText(), /different source URL already exists/);
}));

// ══════════════════════════════════════════════════════════════════════
// DETAIL (24-25)
// ══════════════════════════════════════════════════════════════════════

test('24. Preview button exists per row (renamed from "View" for clarity against "Open Document")', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var viewBtns = qAll(mountEl, '.msc-km-view-btn');
  assert.equal(viewBtns.length, 2);
  assert.equal(viewBtns[0].textContent, 'Preview');
}));

test('25. persisted metadata renders in detail view', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  var text = overlay.allText();
  ['KPI Review Guide', 'Management', 'Google Sheet', 'Analyst', 'Reporting', 'Alex Doe', 'mayurika', '1.0', 'Active', 'Pending', 'Not Verified']
    .forEach(function (expected) { assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); });
}));

// ══════════════════════════════════════════════════════════════════════
// UPDATE (26-30)
// ══════════════════════════════════════════════════════════════════════

test('26. edit modal opens from detail', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var editBtn = Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0];
  fire(editBtn, 'click');
  await flush();
  assert.ok(document.querySelector('#msc-km-edit-title'));
}));

test('27. correct PATCH payload', withEnv(async () => {
  var captured = null;
  var { mountEl } = await mountWithFixture({ updateMetadata: function (id, payload) { captured = { id: id, payload: payload }; return Promise.resolve(FIXTURE_DOC); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  document.querySelector('#msc-km-edit-change-description').value = 'Fixed a typo';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(captured.id, FIXTURE_DOC.id);
  assert.equal(captured.payload.change_description, 'Fixed a typo');
  assert.equal(captured.payload.title, FIXTURE_DOC.title);
  assert.equal('source_url' in captured.payload, false);
}));

test('28. change description required', withEnv(async () => {
  var called = false;
  var { mountEl } = await mountWithFixture({ updateMetadata: function () { called = true; return Promise.resolve(FIXTURE_DOC); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(called, false);
}));

test('29. source URL not editable in edit form (read-only note instead)', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  assert.equal(form.querySelector('#msc-km-edit-source-url'), null);
  var urlTypeFields = Array.prototype.filter.call(form.querySelectorAll('.msc-km-input'), function (f) { return f.type === 'url'; });
  assert.equal(urlTypeFields.length, 0);
  assert.match(form.allText(), /Create New Version/);
}));

test('30. success refreshes list after metadata update', withEnv(async () => {
  var listCalls = 0;
  var { mountEl } = await mountWithFixture({
    list: function () { listCalls += 1; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); },
    updateMetadata: function () { return Promise.resolve(FIXTURE_DOC); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  document.querySelector('#msc-km-edit-change-description').value = 'change';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(listCalls, 2);
}));

// ══════════════════════════════════════════════════════════════════════
// VERSION (31-34)
// ══════════════════════════════════════════════════════════════════════

test('31. version modal opens from detail', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var versionBtn = Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Create New Version'; })[0];
  fire(versionBtn, 'click');
  await flush();
  assert.ok(document.querySelector('#msc-km-version-label'));
}));

test('32. correct endpoint (createVersion called with document id)', withEnv(async () => {
  var capturedId = null;
  var { mountEl } = await mountWithFixture({ createVersion: function (id) { capturedId = id; return Promise.resolve(Object.assign({}, FIXTURE_DOC, { current_version: '2.0' })); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Create New Version'; })[0], 'click');
  await flush();
  document.querySelector('#msc-km-version-url').value = 'https://example.com/new';
  document.querySelector('#msc-km-version-label').value = '2.0';
  document.querySelector('#msc-km-version-change-description').value = 'revised';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(capturedId, FIXTURE_DOC.id);
}));

test('33. correct payload (source_url + version_label + change_description)', withEnv(async () => {
  var captured = null;
  var { mountEl } = await mountWithFixture({ createVersion: function (id, payload) { captured = payload; return Promise.resolve(Object.assign({}, FIXTURE_DOC, { current_version: '2.0' })); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Create New Version'; })[0], 'click');
  await flush();
  document.querySelector('#msc-km-version-url').value = 'https://example.com/new';
  document.querySelector('#msc-km-version-label').value = '2.0';
  document.querySelector('#msc-km-version-change-description').value = 'revised';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.deepEqual(captured, { source_url: 'https://example.com/new', version_label: '2.0', change_description: 'revised' });
}));

test('34. new version appears (list refreshed after version create)', withEnv(async () => {
  var listCalls = 0;
  var { mountEl } = await mountWithFixture({
    list: function () { listCalls += 1; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); },
    createVersion: function () { return Promise.resolve(Object.assign({}, FIXTURE_DOC, { current_version: '2.0' })); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Create New Version'; })[0], 'click');
  await flush();
  document.querySelector('#msc-km-version-url').value = 'https://example.com/new';
  document.querySelector('#msc-km-version-label').value = '2.0';
  document.querySelector('#msc-km-version-change-description').value = 'revised';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(listCalls, 2);
}));

// ══════════════════════════════════════════════════════════════════════
// ARCHIVE (35-37)
// ══════════════════════════════════════════════════════════════════════

test('35. archive requires confirmation before the API is called', withEnv(async () => {
  var archiveCalled = false;
  var { mountEl } = await mountWithFixture({ archive: function () { archiveCalled = true; return Promise.resolve(Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' })); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var archiveBtn = Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Archive'; })[0];
  fire(archiveBtn, 'click');
  await flush();
  // confirmDestructive opens its own dialog — the archive API must not
  // have been called yet, only after the user confirms.
  assert.equal(archiveCalled, false);
  var confirmBtn = getDialogConfirmBtn();
  assert.ok(confirmBtn, 'the shared confirmation dialog\'s confirm button should be present');
}));

test('36. correct endpoint (archive called with document id after confirm)', withEnv(async () => {
  var capturedId = null;
  var { mountEl } = await mountWithFixture({ archive: function (id) { capturedId = id; return Promise.resolve(Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' })); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Archive'; })[0], 'click');
  await flush();
  var confirmBtn = getDialogConfirmBtn();
  fire(confirmBtn, 'click');
  await flush();
  assert.equal(capturedId, FIXTURE_DOC.id);
}));

test('37. status refresh after archive', withEnv(async () => {
  var listCalls = 0;
  var { mountEl } = await mountWithFixture({
    list: function () { listCalls += 1; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); },
    archive: function () { return Promise.resolve(Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' })); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Archive'; })[0], 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  assert.equal(listCalls, 2);
}));

// ══════════════════════════════════════════════════════════════════════
// UNARCHIVE (38-39)
// ══════════════════════════════════════════════════════════════════════

test('38. correct endpoint (unarchive called with document id)', withEnv(async () => {
  var capturedId = null;
  var archivedDoc = Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' });
  var { mountEl } = await mountWithFixture({
    list: function () { return Promise.resolve({ records: [archivedDoc], total: 1, limit: 200, offset: 0 }); },
    detail: function () { return Promise.resolve(archivedDoc); },
    unarchive: function (id) { capturedId = id; return Promise.resolve(Object.assign({}, archivedDoc, { lifecycle_status: 'Active' })); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var unarchiveBtn = Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Unarchive'; })[0];
  fire(unarchiveBtn, 'click');
  await flush();
  assert.equal(capturedId, FIXTURE_DOC.id);
}));

test('39. status refresh after unarchive', withEnv(async () => {
  var listCalls = 0;
  var archivedDoc = Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' });
  var { mountEl } = await mountWithFixture({
    list: function () { listCalls += 1; return Promise.resolve({ records: [archivedDoc], total: 1, limit: 200, offset: 0 }); },
    detail: function () { return Promise.resolve(archivedDoc); },
    unarchive: function () { return Promise.resolve(Object.assign({}, archivedDoc, { lifecycle_status: 'Active' })); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Unarchive'; })[0], 'click');
  await flush();
  assert.equal(listCalls, 2);
}));

// ══════════════════════════════════════════════════════════════════════
// DELETE (40-43)
// ══════════════════════════════════════════════════════════════════════

test('40. delete confirmation states it is not permanent', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Delete'; })[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.match(overlay.allText(), /NOT permanent deletion/);
}));

test('41. delete reason required', withEnv(async () => {
  var called = false;
  var { mountEl } = await mountWithFixture({ softDelete: function () { called = true; return Promise.resolve({ id: FIXTURE_DOC.id, deleted: true }); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Delete'; })[0], 'click');
  await flush();
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(called, false);
}));

test('42. soft-delete endpoint called with id + reason', withEnv(async () => {
  var captured = null;
  var { mountEl } = await mountWithFixture({ softDelete: function (id, reason) { captured = { id: id, reason: reason }; return Promise.resolve({ id: id, deleted: true }); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Delete'; })[0], 'click');
  await flush();
  document.querySelector('#msc-km-delete-reason').value = 'Superseded by a new sheet';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(captured.id, FIXTURE_DOC.id);
  assert.equal(captured.reason, 'Superseded by a new sheet');
}));

test('43. no hard-delete UI anywhere', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-modal-overlay') || document.body;
  assert.doesNotMatch(mountEl.allText() + overlay.allText(), /permanent delete|hard delete/i);
}));

// ══════════════════════════════════════════════════════════════════════
// RESTORE (44)
// ══════════════════════════════════════════════════════════════════════

test('44. RESTORE FRONTEND BLOCKED BY API READ-VISIBILITY GAP — no restore UI entry point exists, client function exists for future use', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(typeof mod.restoreKnowledgeDocument, 'function', 'the API client function exists for future use');
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-modal-overlay');
  var restoreBtn = Array.prototype.filter.call(overlay.querySelectorAll('.msc-btn'), function (b) { return /restore/i.test(b.textContent); });
  assert.equal(restoreBtn.length, 0, 'no Restore control should be wired anywhere in the UI');
}));

// ══════════════════════════════════════════════════════════════════════
// HISTORY (45-47)
// ══════════════════════════════════════════════════════════════════════

test('45. versions viewer renders returned version rows', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'View Version History'; })[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-modal-overlay');
  assert.match(overlay.allText(), /v1\.0/);
}));

test('46. audit viewer renders returned audit rows', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'View Audit History'; })[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-modal-overlay');
  assert.match(overlay.allText(), /create/);
  assert.match(overlay.allText(), /mayurika/);
}));

test('47. no history mutation controls (edit/delete) in either viewer', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'View Version History'; })[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-modal-overlay');
  var mutButtons = Array.prototype.filter.call(overlay.querySelectorAll('.msc-btn'), function (b) { return /edit|delete/i.test(b.textContent); });
  assert.equal(mutButtons.length, 0);
}));

// ══════════════════════════════════════════════════════════════════════
// SECURITY (48-51)
// ══════════════════════════════════════════════════════════════════════

test('48. no actor-spoof field on create form', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  assert.equal(form.querySelector('#msc-km-create-created-by'), null);
  assert.equal(form.querySelector('#msc-km-create-actor'), null);
}));

test('49. unsafe source URL never opened / never rendered as a link', withEnv(async () => {
  var unsafeDoc = Object.assign({}, FIXTURE_DOC, { source_url: 'javascript:alert(1)' });
  var { mountEl } = await mountWithFixture({ list: function () { return Promise.resolve({ records: [unsafeDoc], total: 1, limit: 200, offset: 0 }); } });
  var links = qAll(mountEl, '.msc-km-open-link');
  assert.equal(links.length, 0);
}));

test('50. 401 state — expired token surfaces auth_required and clears storage', withEnv(async () => {
  var mod = await loadKmModule();
  var restoreFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.resolve({ ok: false, status: 401, text: function () { return Promise.resolve(JSON.stringify({ error: 'unauthorized' })); } });
  };
  await assert.rejects(
    mod.createKnowledgeDocument({ title: 'T', team: 'Team', document_type: 'PDF', source_url: 'https://example.com/x' }),
    function (err) { return err.code === 'auth_required'; }
  );
  globalThis.fetch = restoreFetch;
  assert.equal(globalThis.window.localStorage.getItem('management_aios_calendar_auth_v1'), null);
}));

test('51. 403 state — MD read-only rejection surfaces the backend error code', withEnv(async () => {
  var mod = await loadKmModule();
  var restoreFetch = globalThis.fetch;
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: false, status: 403,
      text: function () {
        return Promise.resolve(JSON.stringify({ error: 'knowledge_document_read_only_member', message: 'MD has read-only access and cannot create or edit Knowledge Management records.' }));
      }
    });
  };
  await assert.rejects(
    mod.createKnowledgeDocument({ title: 'T', team: 'Team', document_type: 'PDF', source_url: 'https://example.com/x' }),
    function (err) { return err.code === 'knowledge_document_read_only_member'; }
  );
  globalThis.fetch = restoreFetch;
}, { storedAuth: { token: 'md-token', memberKey: 'md' } }));

// ══════════════════════════════════════════════════════════════════════
// REGRESSION (52-55)
// ══════════════════════════════════════════════════════════════════════

test('52. Issues navigation remains functional', () => {
  assert.equal((html.match(/data-tab="issues"/g) || []).length, 1);
  assert.equal((html.match(/id="tab-issues"/g) || []).length, 1);
  assert.ok(segments['tab-issues']);
  assert.match(segments['tab-issues'], /id="issuesWorkspace"/);
});

test('53. Review Summaries navigation remains functional', () => {
  assert.equal((html.match(/data-tab="review-summaries"/g) || []).length, 1);
  assert.equal((html.match(/id="tab-review-summaries"/g) || []).length, 1);
  assert.ok(segments['tab-review-summaries']);
  assert.match(segments['tab-review-summaries'], /id="reviewSummariesWorkspace"/);
});

test('54. Calendar mounts remain untouched', () => {
  var matches = html.match(/class="msc-instance"/g) || [];
  assert.equal(matches.length, 5);
});

test('55. Knowledge Management nav exactly once', () => {
  assert.equal((html.match(/data-tab="knowledge-management"/g) || []).length, 1);
  assert.equal((html.match(/id="tab-knowledge-management"/g) || []).length, 1);
  var panelIds = topLevelPanels(html).map(function (p) { return p.id; });
  assert.equal(panelIds.filter(function (id) { return id === 'tab-knowledge-management'; }).length, 1);
});

// ══════════════════════════════════════════════════════════════════════
// REQ-KM-UI-005 — DELETED VIEW (56-64)
// ══════════════════════════════════════════════════════════════════════

test('56. Deleted Documents control exists', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var deletedTab = mountEl.querySelector('#msc-km-view-tab-deleted');
  assert.ok(deletedTab);
  assert.equal(deletedTab.textContent, 'Deleted Documents');
}));

test('57. clicking Deleted Documents loads the deleted endpoint', withEnv(async () => {
  var listDeletedCalls = 0;
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { listDeletedCalls += 1; return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  assert.equal(listDeletedCalls, 1);
}));

test('58. auth header attached to the deleted-list request', withEnv(async () => {
  var capturedHeaders = null;
  var mod = await loadKmModule();
  var restoreFetch = globalThis.fetch;
  globalThis.fetch = function (url, opts) {
    capturedHeaders = opts.headers;
    return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve('[]'); } });
  };
  await mod.listDeletedKnowledgeDocuments();
  globalThis.fetch = restoreFetch;
  assert.equal(capturedHeaders.Authorization, 'Bearer test-token');
}));

test('59. deleted records render', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  var deletedPanel = mountEl.querySelector('#msc-km-view-panel-deleted');
  assert.match(deletedPanel.allText(), /Old Onboarding Guide/);
  assert.match(deletedPanel.allText(), /suman/);
  assert.match(deletedPanel.allText(), /Superseded by new guide/);
}));

test('60. active rows are not mixed into the deleted view', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  var deletedPanel = mountEl.querySelector('#msc-km-view-panel-deleted');
  assert.doesNotMatch(deletedPanel.allText(), /KPI Review Guide/);
  assert.doesNotMatch(deletedPanel.allText(), /Onboarding Handbook/);
}));

test('61. deleted row has a Restore action', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  var restoreBtn = mountEl.querySelector('.msc-km-restore-btn');
  assert.ok(restoreBtn);
  assert.equal(restoreBtn.textContent, 'Restore');
}));

test('62. deleted row has no Edit Metadata control', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  var deletedPanel = mountEl.querySelector('#msc-km-view-panel-deleted');
  var editButtons = Array.prototype.filter.call(deletedPanel.querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; });
  assert.equal(editButtons.length, 0);
}));

test('63. deleted row has no Create Version control', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  var deletedPanel = mountEl.querySelector('#msc-km-view-panel-deleted');
  var versionButtons = Array.prototype.filter.call(deletedPanel.querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Create New Version'; });
  assert.equal(versionButtons.length, 0);
}));

test('64. deleted row has no Delete-again control', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  var deletedPanel = mountEl.querySelector('#msc-km-view-panel-deleted');
  var deleteButtons = Array.prototype.filter.call(deletedPanel.querySelectorAll('.msc-btn'), function (b) { return /^Delete\b/.test(b.textContent); });
  assert.equal(deleteButtons.length, 0);
}));

// ══════════════════════════════════════════════════════════════════════
// REQ-KM-UI-005 — RESTORE (65-71)
// ══════════════════════════════════════════════════════════════════════

test('65. restore requires confirmation before the API is called', withEnv(async () => {
  var restoreCalled = false;
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); },
    restore: function () { restoreCalled = true; return Promise.resolve({}); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  fire(mountEl.querySelector('.msc-km-restore-btn'), 'click');
  await flush();
  assert.equal(restoreCalled, false);
  assert.ok(getDialogConfirmBtn());
}));

test('66. correct restore endpoint (called with document id after confirm)', withEnv(async () => {
  var capturedId = null;
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); },
    restore: function (id) { capturedId = id; return Promise.resolve({}); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  fire(mountEl.querySelector('.msc-km-restore-btn'), 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  assert.equal(capturedId, DELETED_FIXTURE_DOC.id);
}));

test('67. success removes the row from the Deleted Documents view', withEnv(async () => {
  var deletedCallCount = 0;
  var { mountEl } = await mountWithFixture({
    listDeleted: function () {
      deletedCallCount += 1;
      return Promise.resolve(deletedCallCount === 1 ? [DELETED_FIXTURE_DOC] : []);
    },
    restore: function () { return Promise.resolve({}); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  fire(mountEl.querySelector('.msc-km-restore-btn'), 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  var deletedPanel = mountEl.querySelector('#msc-km-view-panel-deleted');
  assert.doesNotMatch(deletedPanel.allText(), /Old Onboarding Guide/);
}));

test('68. success refreshes the active document list', withEnv(async () => {
  var listCalls = 0;
  var { mountEl } = await mountWithFixture({
    list: function () { listCalls += 1; return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); },
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); },
    restore: function () { return Promise.resolve({}); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  fire(mountEl.querySelector('.msc-km-restore-btn'), 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  assert.equal(listCalls, 2); // initial mount + post-restore refresh
}));

test('69. success shows a success toast', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); },
    restore: function () { return Promise.resolve({}); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  fire(mountEl.querySelector('.msc-km-restore-btn'), 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  assert.match(getToastRegion().allText(), /restored/i);
}));

test('70. restore 409 URL collision gets a clear, restore-specific message', withEnv(async () => {
  var mod = await loadKmModule();
  var err = new Error('An active document already uses this source URL.');
  err.code = 'knowledge_document_duplicate_source_url';
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); },
    restore: function () { return Promise.reject(err); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  fire(mountEl.querySelector('.msc-km-restore-btn'), 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  assert.match(getToastRegion().allText(), new RegExp(mod.RESTORE_COLLISION_TEXT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}));

test('71. no client-side restore workaround — deleted view always reflects the latest server response, not a locally cached list', withEnv(async () => {
  var deletedCallCount = 0;
  var { mountEl } = await mountWithFixture({
    listDeleted: function () {
      deletedCallCount += 1;
      // Second call (triggered by re-clicking the tab) returns a DIFFERENT
      // set than the first — if the view were caching client-side instead
      // of always trusting the latest response, this second render would
      // still show the first response's row.
      return Promise.resolve(deletedCallCount === 1 ? [DELETED_FIXTURE_DOC] : []);
    }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  assert.match(mountEl.querySelector('#msc-km-view-panel-deleted').allText(), /Old Onboarding Guide/);
  fire(mountEl.querySelector('#msc-km-view-tab-active'), 'click');
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  assert.doesNotMatch(mountEl.querySelector('#msc-km-view-panel-deleted').allText(), /Old Onboarding Guide/);
  assert.equal(deletedCallCount, 2);
}));

// ══════════════════════════════════════════════════════════════════════
// REQ-KM-UI-005 — DETAIL (72-76)
// ══════════════════════════════════════════════════════════════════════

test('72. View Details calls the real GET /{id} detail endpoint', withEnv(async () => {
  var detailCalls = [];
  var { mountEl } = await mountWithFixture({
    detail: function (id) { detailCalls.push(id); return Promise.resolve(FIXTURE_DOC); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  assert.deepEqual(detailCalls, [FIXTURE_DOC.id]);
}));

test('73. detail loading state renders while the GET is in flight, list row title kept visible', withEnv(async () => {
  var resolveDetail;
  var { mountEl } = await mountWithFixture({
    detail: function () { return new Promise(function (res) { resolveDetail = res; }); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.match(overlay.allText(), /Loading/);
  // The triggering list row's title is not discarded while loading.
  assert.match(overlay.allText(), /KPI Review Guide/);
  resolveDetail(FIXTURE_DOC);
}));

test('74. canonical detail response renders (not the stale list row)', withEnv(async () => {
  var canonicalRecord = Object.assign({}, FIXTURE_DOC, { creator: 'Canonical Creator From API' });
  var { mountEl } = await mountWithFixture({
    detail: function () { return Promise.resolve(canonicalRecord); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.match(overlay.allText(), /Canonical Creator From API/);
}));

test('75. detail error state renders on GET failure', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    detail: function () { return Promise.reject(new Error('boom')); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.ok(overlay.querySelector('.msc-km-error-state'));
  // List row context (title) survives into the error state too.
  assert.match(overlay.allText(), /KPI Review Guide/);
}));

test('76. detail retry works after a failed GET', withEnv(async () => {
  var attempts = 0;
  var { mountEl } = await mountWithFixture({
    detail: function () {
      attempts += 1;
      if (attempts === 1) { return Promise.reject(new Error('boom')); }
      return Promise.resolve(FIXTURE_DOC);
    }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  var retryBtn = Array.prototype.filter.call(overlay.querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Retry'; })[0];
  assert.ok(retryBtn);
  fire(retryBtn, 'click');
  await flush();
  assert.equal(attempts, 2);
  assert.match(overlay.allText(), /Edit Metadata/);
}));

// ══════════════════════════════════════════════════════════════════════
// REQ-KM-UI-005 — FILTER STABILITY (77-83)
// ══════════════════════════════════════════════════════════════════════

test('77. initial Team options are the fixed KM_DEFAULT_TEAMS list (REQ-KM-UI-006 superseded the data-derived baseline)', withEnv(async () => {
  var mod = await loadKmModule();
  var { mountEl } = await mountWithFixture();
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.deepEqual(optionTexts, ['All'].concat(mod.KM_DEFAULT_TEAMS));
}));

test('78. Team filtering does not collapse Team options', withEnv(async () => {
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var api = makeFixtureApi({
    list: function (filters) {
      var records = filters.team && filters.team !== 'all'
        ? [FIXTURE_DOC, FIXTURE_DOC_2].filter(function (d) { return d.team === filters.team; })
        : [FIXTURE_DOC, FIXTURE_DOC_2];
      return Promise.resolve({ records: records, total: records.length, limit: 200, offset: 0 });
    }
  });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  teamSelect.value = 'Ebay Team';
  fire(teamSelect, 'change');
  await flush();
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.deepEqual(optionTexts, ['All'].concat(mod.KM_DEFAULT_TEAMS), 'every approved Team must still be selectable after filtering to one of them');
}));

test('79. search does not collapse Team options', withEnv(async () => {
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var api = makeFixtureApi({
    list: function (filters) {
      var records = filters.search ? [FIXTURE_DOC_2] : [FIXTURE_DOC, FIXTURE_DOC_2];
      return Promise.resolve({ records: records, total: records.length, limit: 200, offset: 0 });
    }
  });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  var searchInput = mountEl.querySelector('.msc-km-search-input');
  searchInput.value = 'handbook';
  fire(searchInput, 'input');
  await new Promise(function (r) { setTimeout(r, 300); });
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.deepEqual(optionTexts, ['All'].concat(mod.KM_DEFAULT_TEAMS));
}));

test('80. Document Type filtering does not collapse Type options', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    list: function (filters) {
      var records = filters.documentType && filters.documentType !== 'all'
        ? [FIXTURE_DOC, FIXTURE_DOC_2].filter(function (d) { return d.document_type === filters.documentType; })
        : [FIXTURE_DOC, FIXTURE_DOC_2];
      return Promise.resolve({ records: records, total: records.length, limit: 200, offset: 0 });
    }
  });
  var typeSelect = mountEl.querySelector('#msc-km-type-filter');
  typeSelect.value = 'PDF';
  fire(typeSelect, 'change');
  await flush();
  var optionTexts = typeSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.ok(optionTexts.indexOf('Google Sheet') !== -1, 'Google Sheet must remain selectable after filtering to PDF');
  assert.ok(optionTexts.indexOf('PDF') !== -1);
}));

test('81. search does not collapse Document Type options', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    list: function (filters) {
      var records = filters.search ? [FIXTURE_DOC_2] : [FIXTURE_DOC, FIXTURE_DOC_2];
      return Promise.resolve({ records: records, total: records.length, limit: 200, offset: 0 });
    }
  });
  var searchInput = mountEl.querySelector('.msc-km-search-input');
  searchInput.value = 'handbook';
  fire(searchInput, 'input');
  await new Promise(function (r) { setTimeout(r, 300); });
  var typeSelect = mountEl.querySelector('#msc-km-type-filter');
  var optionTexts = typeSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.ok(optionTexts.indexOf('Google Sheet') !== -1);
}));

test('82. switching directly between Team values works without reselecting All first', withEnv(async () => {
  var capturedTeams = [];
  var { mountEl } = await mountWithFixture({
    list: function (filters) { capturedTeams.push(filters.team); return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); }
  });
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  teamSelect.value = 'Ebay Team';
  fire(teamSelect, 'change');
  await flush();
  teamSelect.value = 'Postage Team';
  fire(teamSelect, 'change');
  await flush();
  assert.deepEqual(capturedTeams.slice(-2), ['Ebay Team', 'Postage Team']);
}));

test('83. switching directly between Document Type values works without reselecting All first', withEnv(async () => {
  var capturedTypes = [];
  var { mountEl } = await mountWithFixture({
    list: function (filters) { capturedTypes.push(filters.documentType); return Promise.resolve({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 }); }
  });
  var typeSelect = mountEl.querySelector('#msc-km-type-filter');
  typeSelect.value = 'PDF';
  fire(typeSelect, 'change');
  await flush();
  typeSelect.value = 'Google Sheet';
  fire(typeSelect, 'change');
  await flush();
  assert.deepEqual(capturedTypes.slice(-2), ['PDF', 'Google Sheet']);
}));

// ══════════════════════════════════════════════════════════════════════
// REQ-KM-UI-005 — SAFETY (84-87)
// ══════════════════════════════════════════════════════════════════════

test('84. no hard-delete UI anywhere, including the Deleted Documents view', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  assert.doesNotMatch(mountEl.allText().toLowerCase(), /permanent/);
  assert.doesNotMatch(mountEl.allText().toLowerCase(), /hard delete/);
}));

test('85. no actor-spoof fields anywhere (created_by/deleted_by/restored_by/actor_member_key never user-enterable)', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    listDeleted: function () { return Promise.resolve([DELETED_FIXTURE_DOC]); }
  });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var createForm = document.querySelector('.msc-km-form');
  ['created_by', 'deleted_by', 'restored_by', 'actor_member_key'].forEach(function (field) {
    assert.equal(createForm.querySelector('#msc-km-create-' + field), null);
  });
  fire(document.querySelector('.msc-modal-close'), 'click');
  fire(mountEl.querySelector('#msc-km-view-tab-deleted'), 'click');
  await flush();
  var deletedPanel = mountEl.querySelector('#msc-km-view-panel-deleted');
  // Restore is a single confirm-and-click action (Phase 5/8) — there is no
  // input field of any kind in the Deleted Documents view for a user to
  // type an actor-identity value into.
  assert.equal(deletedPanel.querySelector('.msc-km-input'), null);
}));

test('86. static sample registry remains absent', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.APPROVED_DOCUMENTS, undefined);
}));

test('87. sample-data notice remains absent', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  assert.equal(mountEl.querySelector('.msc-km-sample-notice'), null);
  assert.doesNotMatch(mountEl.allText(), /Sample documents/);
}));

// ══════════════════════════════════════════════════════════════════════
// REQ-KM-UI-006 — STANDARD TEAM DROPDOWN (88-110)
// ══════════════════════════════════════════════════════════════════════

var APPROVED_TEAM_LIST = [
  'Management Team', 'Graphic Designing Team', 'Digital Marketing Team', 'Technical Team',
  'Ebay Team', 'Postage Team', 'Development Team', 'Customer Service Team', 'Amazon Team',
  'Centralized PPC Team', 'Inventory Team', 'Accounts Team', 'Portfolio Holders Team',
  'US /Canada Market Rebuild Team', 'Merchandising Team', 'Wayfair Team', 'IT support Team'
];

test('88. KM_DEFAULT_TEAMS exists once as a single exported constant', withEnv(async () => {
  var mod = await loadKmModule();
  assert.ok(Array.isArray(mod.KM_DEFAULT_TEAMS));
}));

test('89. KM_DEFAULT_TEAMS has exactly 17 Team values', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.KM_DEFAULT_TEAMS.length, 17);
}));

test('90. KM_DEFAULT_TEAMS matches the exact approved spelling and order', withEnv(async () => {
  var mod = await loadKmModule();
  assert.deepEqual(mod.KM_DEFAULT_TEAMS, APPROVED_TEAM_LIST);
}));

test('91. Team filter includes "All"', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.equal(optionTexts[0], 'All');
}));

test('92. Team filter includes all 17 approved values', withEnv(async () => {
  var mod = await loadKmModule();
  var { mountEl } = await mountWithFixture();
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  mod.KM_DEFAULT_TEAMS.forEach(function (team) { assert.ok(optionTexts.indexOf(team) !== -1, team + ' must be a filter option'); });
}));

test('93. Team filter does not derive its option list from API records', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    // A record with a Team value that is NOT one of the 17 approved
    // values (legacy/test data) must never appear as a filter option.
    list: function () { return Promise.resolve({ records: [Object.assign({}, FIXTURE_DOC, { team: 'test team' })], total: 1, limit: 200, offset: 0 }); }
  });
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.equal(optionTexts.indexOf('test team'), -1);
}));

test('94. filtering does not collapse Team options', withEnv(async () => {
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var api = makeFixtureApi({
    list: function (filters) {
      var records = filters.team && filters.team !== 'all' ? [FIXTURE_DOC] : [FIXTURE_DOC, FIXTURE_DOC_2];
      return Promise.resolve({ records: records, total: records.length, limit: 200, offset: 0 });
    }
  });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  teamSelect.value = 'Amazon Team';
  fire(teamSelect, 'change');
  await flush();
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.equal(optionTexts.length, 18); // All + 17
}));

test('95. searching does not collapse Team options', withEnv(async () => {
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var api = makeFixtureApi({
    list: function (filters) {
      var records = filters.search ? [FIXTURE_DOC] : [FIXTURE_DOC, FIXTURE_DOC_2];
      return Promise.resolve({ records: records, total: records.length, limit: 200, offset: 0 });
    }
  });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  var searchInput = mountEl.querySelector('.msc-km-search-input');
  searchInput.value = 'kpi';
  fire(searchInput, 'input');
  await new Promise(function (r) { setTimeout(r, 300); });
  var teamSelect = mountEl.querySelector('#msc-km-team-filter');
  var optionTexts = teamSelect.querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.equal(optionTexts.length, 18);
}));

test('96. Add Document Team uses a select element', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var teamField = document.querySelector('#msc-km-create-team');
  assert.equal(teamField.tagName, 'SELECT');
}));

test('97. no free-text Team input on Add Document (superseded by the select)', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var teamField = document.querySelector('#msc-km-create-team');
  assert.notEqual(teamField.tagName, 'INPUT');
}));

test('98. Add requires a Team selection before submit reaches the API', withEnv(async () => {
  var createCalled = false;
  var { mountEl } = await mountWithFixture({ create: function () { createCalled = true; return Promise.resolve(FIXTURE_DOC); } });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  form.querySelector('#msc-km-create-title').value = 'T';
  form.querySelector('#msc-km-create-url').value = 'https://example.com/x';
  // Team select deliberately left on the "Select Team" placeholder.
  fire(form, 'submit');
  await flush();
  assert.equal(createCalled, false);
}));

test('99. selected Team is sent unchanged in the POST payload', withEnv(async () => {
  var capturedPayload = null;
  var { mountEl } = await mountWithFixture({ create: function (payload) { capturedPayload = payload; return Promise.resolve(FIXTURE_DOC); } });
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var form = document.querySelector('.msc-km-form');
  form.querySelector('#msc-km-create-title').value = 'T';
  form.querySelector('#msc-km-create-team').value = 'Wayfair Team';
  form.querySelector('#msc-km-create-url').value = 'https://example.com/x';
  fire(form, 'submit');
  await flush();
  assert.equal(capturedPayload.team, 'Wayfair Team');
}));

test('100. Edit Metadata Team uses a select element', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  var teamField = document.querySelector('#msc-km-edit-team');
  assert.equal(teamField.tagName, 'SELECT');
}));

test('101. an existing approved Team is preselected in Edit Metadata', withEnv(async () => {
  var approvedDoc = Object.assign({}, FIXTURE_DOC, { team: 'Technical Team' });
  var { mountEl } = await mountWithFixture({ detail: function () { return Promise.resolve(approvedDoc); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  var teamField = document.querySelector('#msc-km-edit-team');
  assert.equal(teamField.value, 'Technical Team');
}));

test('102. a selected edited Team is sent unchanged in the PATCH payload', withEnv(async () => {
  var approvedDoc = Object.assign({}, FIXTURE_DOC, { team: 'Technical Team' });
  var capturedPayload = null;
  var { mountEl } = await mountWithFixture({
    detail: function () { return Promise.resolve(approvedDoc); },
    updateMetadata: function (id, payload) { capturedPayload = payload; return Promise.resolve(approvedDoc); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  document.querySelector('#msc-km-edit-team').value = 'Merchandising Team';
  document.querySelector('#msc-km-edit-change-description').value = 'Reassigned to Merchandising';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(capturedPayload.team, 'Merchandising Team');
}));

test('103. a legacy/non-default existing Team is never silently rewritten by an unrelated metadata edit', withEnv(async () => {
  // FIXTURE_DOC.team is "Management" — not one of the 17 approved values,
  // so it exercises the legacy-Team code path directly.
  var capturedPayload = null;
  var { mountEl } = await mountWithFixture({
    updateMetadata: function (id, payload) { capturedPayload = payload; return Promise.resolve(FIXTURE_DOC); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  // Team select is left untouched (still "Select Team") — only an
  // unrelated field is edited.
  document.querySelector('#msc-km-edit-change-description').value = 'Fixed a typo in the title only';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal('team' in capturedPayload, false, 'team must be omitted from the PATCH payload, never silently rewritten');
}));

test('104. legacy Team value is clearly shown in Edit Metadata', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.match(overlay.allText(), /Management/); // FIXTURE_DOC.team, shown as the current legacy value
  var teamField = document.querySelector('#msc-km-edit-team');
  assert.equal(teamField.value, ''); // left on the "Select Team" placeholder, never silently coerced
}));

test('105. no "Other" arbitrary Team input exists anywhere', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  var createOptionTexts = document.querySelector('#msc-km-create-team').querySelectorAll('.msc-km-select-option').map(function (o) { return o.textContent; });
  assert.equal(createOptionTexts.indexOf('Other'), -1);
}));

test('106. static sample registry remains absent (REQ-KM-UI-006 regression)', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.APPROVED_DOCUMENTS, undefined);
}));

test('107. no hard-delete UI regression', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  assert.doesNotMatch(mountEl.allText().toLowerCase(), /permanent/);
  assert.doesNotMatch(mountEl.allText().toLowerCase(), /hard delete/);
}));

test('108. Knowledge Management navigation regression', () => {
  assert.equal((html.match(/data-tab="knowledge-management"/g) || []).length, 1);
  var panelIds = topLevelPanels(html).map(function (p) { return p.id; });
  assert.equal(panelIds.filter(function (id) { return id === 'tab-knowledge-management'; }).length, 1);
});

test('109. Issues regression', () => {
  assert.equal((html.match(/data-tab="issues"/g) || []).length, 1);
  assert.ok(segments['tab-issues']);
});

test('110. Review Summaries and Calendar regression', () => {
  assert.equal((html.match(/data-tab="review-summaries"/g) || []).length, 1);
  assert.ok(segments['tab-review-summaries']);
  var calendarMatches = html.match(/class="msc-instance"/g) || [];
  assert.equal(calendarMatches.length, 5);
});

// ══════════════════════════════════════════════════════════════════════
// SRD "Centralized Document Repository & Knowledge Management Module"
// §9 Search & Filter completion — ADVANCED FILTERS (111-121)
// ══════════════════════════════════════════════════════════════════════

test('111. More Filters toggle is collapsed by default', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var panel = q(mountEl, '.msc-km-advanced-panel');
  assert.ok(panel);
  assert.equal(panel.hidden, true);
  var toggle = q(mountEl, '.msc-km-advanced-toggle');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
}));

test('112. More Filters toggle reveals the advanced panel', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(q(mountEl, '.msc-km-advanced-toggle'), 'click');
  var panel = q(mountEl, '.msc-km-advanced-panel');
  assert.equal(panel.hidden, false);
  assert.equal(q(mountEl, '.msc-km-advanced-toggle').getAttribute('aria-expanded'), 'true');
}));

test('113. Uploaded By filter options come from MEMBER_REGISTRY, MD excluded', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var select = document.querySelector('#msc-km-uploaded-by-filter');
  var values = select.querySelectorAll('.msc-km-select-option').map(function (o) { return o.value; });
  assert.deepEqual(values, ['all', 'mayurika', 'suman', 'arun', 'rajiv', 'paraparan']);
}));

test('114. creator filter is debounced and sent as ?creator=', withEnv(async () => {
  var capturedFilters = null;
  var { mountEl } = await mountWithFixture({
    list: function (filters) { capturedFilters = filters; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  var input = document.querySelector('#msc-km-creator-filter');
  input.value = 'Arun';
  fire(input, 'input');
  await new Promise(function (resolve) { setTimeout(resolve, 300); });
  assert.equal(capturedFilters.creator, 'Arun');
}));

test('115. job role filter updates state and reloads', withEnv(async () => {
  var callCount = 0;
  var { mountEl } = await mountWithFixture({
    list: function () { callCount += 1; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  var before = callCount;
  var input = document.querySelector('#msc-km-job-role-filter');
  input.value = 'Officer';
  fire(input, 'input');
  await new Promise(function (resolve) { setTimeout(resolve, 300); });
  assert.ok(callCount > before);
}));

test('116. Uploaded By select change reloads immediately (no debounce)', withEnv(async () => {
  var capturedFilters = null;
  var { mountEl } = await mountWithFixture({
    list: function (filters) { capturedFilters = filters; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  var select = document.querySelector('#msc-km-uploaded-by-filter');
  select.value = 'arun';
  fire(select, 'change');
  await flush();
  assert.equal(capturedFilters.uploadedBy, 'arun');
}));

test('117. Compliance Status select change reloads with the selected value', withEnv(async () => {
  var capturedFilters = null;
  var { mountEl } = await mountWithFixture({
    list: function (filters) { capturedFilters = filters; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  var select = document.querySelector('#msc-km-compliance-filter');
  select.value = 'Completed';
  fire(select, 'change');
  await flush();
  assert.equal(capturedFilters.complianceStatus, 'Completed');
}));

test('118. Version filter reaches the query string builder', withEnv(async () => {
  var mod = await loadKmModule();
  var qs = mod.buildListQueryString({ version: '2.0' });
  assert.match(qs, /version=2\.0/);
}));

test('119. Created/Updated date range filters reach the query string builder', withEnv(async () => {
  var mod = await loadKmModule();
  var qs = mod.buildListQueryString({
    createdFrom: '2026-07-01', createdTo: '2026-08-01', updatedFrom: '2026-07-15', updatedTo: '2026-08-15'
  });
  assert.match(qs, /created_from=2026-07-01/);
  assert.match(qs, /created_to=2026-08-01/);
  assert.match(qs, /updated_from=2026-07-15/);
  assert.match(qs, /updated_to=2026-08-15/);
}));

test('120. Clear Advanced Filters resets every advanced field and reloads', withEnv(async () => {
  var capturedFilters = null;
  var { mountEl } = await mountWithFixture({
    list: function (filters) { capturedFilters = filters; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  document.querySelector('#msc-km-creator-filter').value = 'Arun';
  fire(document.querySelector('#msc-km-creator-filter'), 'input');
  await new Promise(function (resolve) { setTimeout(resolve, 300); });
  assert.equal(capturedFilters.creator, 'Arun');

  fire(q(mountEl, '.msc-km-clear-advanced'), 'click');
  await flush();
  assert.equal(capturedFilters.creator, '');
  assert.equal(capturedFilters.uploadedBy, 'all');
  assert.equal(capturedFilters.complianceStatus, 'all');
}));

test('121. hasActiveKnowledgeDocumentFilters recognizes every advanced filter', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.hasActiveKnowledgeDocumentFilters({}), false);
  assert.equal(mod.hasActiveKnowledgeDocumentFilters({ creator: 'Arun' }), true);
  assert.equal(mod.hasActiveKnowledgeDocumentFilters({ uploadedBy: 'arun' }), true);
  assert.equal(mod.hasActiveKnowledgeDocumentFilters({ complianceStatus: 'Completed' }), true);
  assert.equal(mod.hasActiveKnowledgeDocumentFilters({ createdFrom: '2026-01-01' }), true);
}));

// ══════════════════════════════════════════════════════════════════════
// SRD §13 Dashboard Widgets — GET /api/knowledge-documents/summary (122-133)
// ══════════════════════════════════════════════════════════════════════

test('122. dashboard loads on mount', withEnv(async () => {
  var summaryCalls = 0;
  var { mountEl } = await mountWithFixture({
    summary: function () { summaryCalls += 1; return Promise.resolve(SUMMARY_FIXTURE); }
  });
  assert.equal(summaryCalls, 1);
  assert.match(mountEl.allText(), /Total Documents/);
}));

test('123. stat tiles render the summary counts', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var text = mountEl.allText();
  assert.match(text, /Total Documents/);
  assert.match(text, /Archived Documents/);
  assert.match(text, /Pending Documents/);
  assert.match(text, /Documents Missing Creator/);
  assert.match(text, /Google Sheets Without Verified Owner Access/);
}));

test('124. Documents by Team card renders team counts', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var text = mountEl.allText();
  assert.match(text, /Documents by Team/);
  assert.match(text, /Management/);
  assert.match(text, /HR/);
}));

test('125. Recently Added Documents card renders titles', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  assert.match(mountEl.allText(), /Recently Added Documents/);
  assert.match(mountEl.allText(), new RegExp(FIXTURE_DOC.title));
}));

test('126. Recent Updates card renders an activity row with actor and action', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var text = mountEl.allText();
  assert.match(text, /Recent Updates/);
  assert.match(text, /Mayurika/);
  assert.match(text, /create/);
}));

test('127. Latest Version Updates card renders version labels', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var text = mountEl.allText();
  assert.match(text, /Latest Version Updates/);
  assert.match(text, /v1\.0/);
}));

test('128. empty summary shows empty-state text per card, not fabricated data', withEnv(async () => {
  var { mountEl } = await mountWithFixture({
    summary: function () {
      return Promise.resolve({
        total: 0, active: 0, archived: 0, pending: 0, completed: 0,
        missing_creator: 0, google_unverified: 0, by_team: [],
        recently_added: [], recently_updated: [], recent_activity: [], latest_version_updates: []
      });
    }
  });
  var text = mountEl.allText();
  assert.match(text, /No documents registered yet\./);
  assert.match(text, /No activity recorded yet\./);
  assert.match(text, /No version history yet\./);
}));

test('129. dashboard error state shows Retry and recovers on click', withEnv(async () => {
  var attempt = 0;
  var { mountEl } = await mountWithFixture({
    summary: function () {
      attempt += 1;
      if (attempt === 1) { return Promise.reject(new Error('boom')); }
      return Promise.resolve(SUMMARY_FIXTURE);
    }
  });
  assert.doesNotMatch(mountEl.allText(), /Total Documents/);
  var summaryRegion = q(mountEl, '.msc-km-summary-region');
  var retryBtn = Array.from(summaryRegion.querySelectorAll('.msc-btn')).find(function (b) { return b.textContent === 'Retry'; });
  assert.ok(retryBtn);
  fire(retryBtn, 'click');
  await flush();
  assert.match(mountEl.allText(), /Total Documents/);
}));

test('130. dashboard refreshes after Create Document succeeds', withEnv(async () => {
  var summaryCalls = 0;
  var { mountEl } = await mountWithFixture({
    summary: function () { summaryCalls += 1; return Promise.resolve(SUMMARY_FIXTURE); }
  });
  var callsAfterMount = summaryCalls;
  fire(q(mountEl, '.msc-km-add-btn'), 'click');
  await flush();
  document.querySelector('#msc-km-create-title').value = 'New Doc';
  document.querySelector('#msc-km-create-team').value = 'HR';
  document.querySelector('#msc-km-create-type').value = 'PDF';
  document.querySelector('#msc-km-create-url').value = 'https://example.com/new';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.ok(summaryCalls > callsAfterMount);
}));

test('131. dashboard refreshes after Archive succeeds', withEnv(async () => {
  var summaryCalls = 0;
  var { mountEl } = await mountWithFixture({
    summary: function () { summaryCalls += 1; return Promise.resolve(SUMMARY_FIXTURE); }
  });
  var callsAfterMount = summaryCalls;
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Archive'; })[0], 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  assert.ok(summaryCalls > callsAfterMount);
}));

test('132. reloadSummary handle is exposed for external refresh', withEnv(async () => {
  var summaryCalls = 0;
  var { handle } = await mountWithFixture({
    summary: function () { summaryCalls += 1; return Promise.resolve(SUMMARY_FIXTURE); }
  });
  var before = summaryCalls;
  handle.reloadSummary();
  await flush();
  assert.ok(summaryCalls > before);
}));

test('133. unauthenticated mount never calls the summary endpoint', withEnv(async () => {
  var summaryCalls = 0;
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var api = makeFixtureApi({ summary: function () { summaryCalls += 1; return Promise.resolve(SUMMARY_FIXTURE); } });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  assert.equal(summaryCalls, 0);
}, { storedAuth: null }));

// ══════════════════════════════════════════════════════════════════════
// SRD §10 Browser Preview — REQUIRED NOW (134-153)
// ══════════════════════════════════════════════════════════════════════

test('134. buildDocumentPreviewSpec: Google Sheet with a recognized URL builds a preview iframe', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({
    document_type: 'Google Sheet', source_url: 'https://docs.google.com/spreadsheets/d/ABC123/edit?usp=sharing'
  });
  assert.equal(spec.kind, 'iframe');
  assert.equal(spec.url, 'https://docs.google.com/spreadsheets/d/ABC123/preview');
}));

test('135. buildDocumentPreviewSpec: Google Doc with a recognized URL builds a preview iframe', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({
    document_type: 'Google Doc', source_url: 'https://docs.google.com/document/d/XYZ789/edit'
  });
  assert.equal(spec.kind, 'iframe');
  assert.equal(spec.url, 'https://docs.google.com/document/d/XYZ789/preview');
}));

test('136. buildDocumentPreviewSpec: Google Drive File (file/d/ form) builds a preview iframe', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({
    document_type: 'Google Drive File', source_url: 'https://drive.google.com/file/d/DEF456/view?usp=sharing'
  });
  assert.equal(spec.kind, 'iframe');
  assert.equal(spec.url, 'https://drive.google.com/file/d/DEF456/preview');
}));

test('137. buildDocumentPreviewSpec: Google Drive File (open?id= form) builds a preview iframe', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({
    document_type: 'Google Drive File', source_url: 'https://drive.google.com/open?id=GHI999'
  });
  assert.equal(spec.kind, 'iframe');
  assert.equal(spec.url, 'https://drive.google.com/file/d/GHI999/preview');
}));

test('138. buildDocumentPreviewSpec: unrecognized Google URL is reported unavailable, not guessed', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'Google Sheet', source_url: 'https://example.com/not-a-real-sheet' });
  assert.equal(spec.kind, 'unavailable');
  assert.equal(spec.message, mod.PREVIEW_MESSAGE_UNRECOGNIZED_GOOGLE_URL);
}));

test('139. buildDocumentPreviewSpec: PDF previews via the document\'s own source URL', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'PDF', source_url: 'https://example.com/handbook.pdf' });
  assert.equal(spec.kind, 'iframe');
  assert.equal(spec.url, 'https://example.com/handbook.pdf');
}));

test('140. buildDocumentPreviewSpec: Image previews as an image', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'Image', source_url: 'https://example.com/photo.png' });
  assert.equal(spec.kind, 'image');
  assert.equal(spec.url, 'https://example.com/photo.png');
}));

test('141. buildDocumentPreviewSpec: Video previews as a video', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'Video', source_url: 'https://example.com/clip.mp4' });
  assert.equal(spec.kind, 'video');
  assert.equal(spec.url, 'https://example.com/clip.mp4');
}));

test('142. buildDocumentPreviewSpec: Word Document is explicitly BLOCKED, not faked', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'Word Document', source_url: 'https://example.com/doc.docx' });
  assert.equal(spec.kind, 'unavailable');
  assert.equal(spec.reason, 'blocked');
  assert.equal(spec.message, mod.PREVIEW_MESSAGE_OFFICE_BLOCKED);
}));

test('143. buildDocumentPreviewSpec: Excel File is explicitly BLOCKED, not faked', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'Excel File', source_url: 'https://example.com/sheet.xlsx' });
  assert.equal(spec.kind, 'unavailable');
  assert.equal(spec.reason, 'blocked');
}));

test('144. buildDocumentPreviewSpec: ZIP File is not-applicable per SRD spec', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'ZIP File', source_url: 'https://example.com/archive.zip' });
  assert.equal(spec.kind, 'unavailable');
  assert.equal(spec.reason, 'not-applicable');
  assert.equal(spec.message, mod.PREVIEW_MESSAGE_ZIP);
}));

test('145. buildDocumentPreviewSpec: Skill File is not-applicable (format undefined by SRD)', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'Skill File', source_url: 'https://example.com/skill.md' });
  assert.equal(spec.kind, 'unavailable');
  assert.equal(spec.reason, 'not-applicable');
}));

test('146. buildDocumentPreviewSpec: External URL is not-applicable (not in the SRD preview list)', withEnv(async () => {
  var mod = await loadKmModule();
  var spec = mod.buildDocumentPreviewSpec({ document_type: 'External URL', source_url: 'https://example.com/page' });
  assert.equal(spec.kind, 'unavailable');
  assert.equal(spec.reason, 'not-applicable');
}));

test('147. buildDocumentPreviewSpec: an unsafe/missing source URL never produces an embeddable spec', withEnv(async () => {
  var mod = await loadKmModule();
  var spec1 = mod.buildDocumentPreviewSpec({ document_type: 'PDF', source_url: 'javascript:alert(1)' });
  assert.equal(spec1.kind, 'unavailable');
  var spec2 = mod.buildDocumentPreviewSpec({ document_type: 'Image', source_url: null });
  assert.equal(spec2.kind, 'unavailable');
}));

test('148. Detail modal renders a Google Sheet preview iframe with a sandboxed, safe URL', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  var iframe = overlay.querySelector('.msc-km-preview-iframe');
  assert.ok(iframe);
  assert.equal(iframe.src, 'https://docs.google.com/spreadsheets/d/FIXTURE1/preview');
  assert.equal(iframe.getAttribute('sandbox'), 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
}));

test('149. Detail modal renders an image preview for an Image document', withEnv(async () => {
  var imageDoc = Object.assign({}, FIXTURE_DOC, { document_type: 'Image', source_url: 'https://example.com/photo.png' });
  var { mountEl } = await mountWithFixture({ detail: function () { return Promise.resolve(imageDoc); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  var img = overlay.querySelector('.msc-km-preview-image');
  assert.ok(img);
  assert.equal(img.src, 'https://example.com/photo.png');
}));

test('150. Detail modal renders a video preview with controls for a Video document', withEnv(async () => {
  var videoDoc = Object.assign({}, FIXTURE_DOC, { document_type: 'Video', source_url: 'https://example.com/clip.mp4' });
  var { mountEl } = await mountWithFixture({ detail: function () { return Promise.resolve(videoDoc); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  var video = overlay.querySelector('.msc-km-preview-video');
  assert.ok(video);
  assert.equal(video.src, 'https://example.com/clip.mp4');
  assert.equal(video.controls, true);
}));

test('151. Detail modal shows a clear BLOCKED message for Word Document preview, not a fake viewer', withEnv(async () => {
  var wordDoc = Object.assign({}, FIXTURE_DOC, { document_type: 'Word Document', source_url: 'https://example.com/doc.docx' });
  var { mountEl } = await mountWithFixture({ detail: function () { return Promise.resolve(wordDoc); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.equal(overlay.querySelector('.msc-km-preview-iframe'), null);
  assert.match(overlay.allText(), /No approved document viewer is configured/);
}));

test('152. Detail modal shows the ZIP-specific no-preview message', withEnv(async () => {
  var zipDoc = Object.assign({}, FIXTURE_DOC, { document_type: 'ZIP File', source_url: 'https://example.com/archive.zip' });
  var { mountEl } = await mountWithFixture({ detail: function () { return Promise.resolve(zipDoc); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.match(overlay.allText(), /ZIP files are not previewed/);
}));

test('153. Preview section never uses innerHTML for a document-authored value (title)', withEnv(async () => {
  var xssDoc = Object.assign({}, FIXTURE_DOC, {
    document_type: 'Image', source_url: 'https://example.com/photo.png',
    title: '<img src=x onerror=alert(1)>'
  });
  var { mountEl } = await mountWithFixture({ detail: function () { return Promise.resolve(xssDoc); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  var img = overlay.querySelector('.msc-km-preview-image');
  assert.equal(img.alt, '<img src=x onerror=alert(1)> preview');
}));

// ══════════════════════════════════════════════════════════════════════
// UI/UX visual-hierarchy refactor (154-166) — header helper text,
// primary/secondary dashboard tiers, collapsible activity details,
// Advanced Filters relabel/reposition, table status badges. Pure
// presentation/DOM-structure changes only — every assertion below
// confirms the SAME underlying data (search/filter behavior, dashboard
// calculations, actions) is unchanged; only how it's grouped/labeled
// changed. No business logic, no new network calls.
// ══════════════════════════════════════════════════════════════════════

test('154. header shows a short helper description under the title', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var helper = q(mountEl, '.msc-km-header-helper');
  assert.ok(helper);
  assert.match(helper.textContent, /find, manage, and open/i);
}));

test('155. primary stat row shows exactly Total/Pending/Archived, in that order', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var primaryGrid = q(mountEl, '.msc-km-stats-grid-primary');
  assert.ok(primaryGrid);
  var labels = primaryGrid.querySelectorAll('.msc-km-stat-label').map(function (n) { return n.textContent; });
  assert.deepEqual(labels, ['Total Documents', 'Pending Documents', 'Archived Documents']);
}));

test('156. secondary stats (Missing Creator / Google Unverified) render as lighter-weight pills, not primary tiles', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var secondaryRow = q(mountEl, '.msc-km-stats-secondary');
  assert.ok(secondaryRow);
  var text = secondaryRow.allText();
  assert.match(text, /Documents Missing Creator/);
  assert.match(text, /Google Sheets Without Verified Owner Access/);
  // Confirms they are NOT duplicated into the primary tile row.
  var primaryGrid = q(mountEl, '.msc-km-stats-grid-primary');
  assert.doesNotMatch(primaryGrid.allText(), /Missing Creator/);
}));

test('157. document activity detail cards are collapsed by default', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var toggle = q(mountEl, '.msc-km-details-toggle');
  assert.ok(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.textContent, 'Show Document Activity');
  var cardsGrid = q(mountEl, '.msc-km-summary-grid');
  assert.equal(cardsGrid.hidden, true);
}));

test('158. Show Document Activity toggle reveals the detail cards without refetching', withEnv(async () => {
  var summaryCalls = 0;
  var { mountEl } = await mountWithFixture({
    summary: function () { summaryCalls += 1; return Promise.resolve(SUMMARY_FIXTURE); }
  });
  var callsAfterMount = summaryCalls;
  fire(q(mountEl, '.msc-km-details-toggle'), 'click');
  var cardsGrid = q(mountEl, '.msc-km-summary-grid');
  assert.equal(cardsGrid.hidden, false);
  assert.equal(q(mountEl, '.msc-km-details-toggle').getAttribute('aria-expanded'), 'true');
  assert.equal(q(mountEl, '.msc-km-details-toggle').textContent, 'Hide Document Activity');
  assert.equal(summaryCalls, callsAfterMount, 'toggling visibility must not re-fetch the summary');
}));

test('159. Advanced Filters toggle button label changes with state and panel carries its own heading', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var toggle = q(mountEl, '.msc-km-advanced-toggle');
  assert.equal(toggle.textContent, 'Filters ▾');
  fire(toggle, 'click');
  assert.equal(toggle.textContent, 'Filters ▴');
  var heading = q(mountEl, '.msc-km-advanced-heading');
  assert.equal(heading.textContent, 'Advanced Filters');
}));

test('160. Clear Advanced Filters button still works after relabel/reposition ("Clear")', withEnv(async () => {
  var capturedFilters = null;
  var { mountEl } = await mountWithFixture({
    list: function (filters) { capturedFilters = filters; return Promise.resolve({ records: [], total: 0, limit: 200, offset: 0 }); }
  });
  var clearBtn = q(mountEl, '.msc-km-clear-advanced');
  assert.equal(clearBtn.textContent, 'Clear');
  document.querySelector('#msc-km-creator-filter').value = 'Arun';
  fire(document.querySelector('#msc-km-creator-filter'), 'input');
  await new Promise(function (resolve) { setTimeout(resolve, 300); });
  assert.equal(capturedFilters.creator, 'Arun');
  fire(clearBtn, 'click');
  await flush();
  assert.equal(capturedFilters.creator, '');
}));

test('161. table rows render lifecycle status as a badge, not plain text', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var badge = q(mountEl, '.msc-km-status-badge');
  assert.ok(badge);
  assert.equal(badge.textContent, 'Active');
  assert.ok(badge.classList.contains('msc-km-status-badge-active'));
}));

test('162. an Archived document renders the archived (neutral) badge variant', withEnv(async () => {
  var archivedDoc = Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' });
  var { mountEl } = await mountWithFixture({
    list: function () { return Promise.resolve({ records: [archivedDoc], total: 1, limit: 200, offset: 0 }); }
  });
  var badge = q(mountEl, '.msc-km-status-badge-archived');
  assert.ok(badge);
  assert.equal(badge.textContent, 'Archived');
}));

test('163. Team/Type/Creator/Version cells are visually de-emphasized (muted class), Title is not', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  assert.ok(q(mountEl, '.msc-km-title-cell'));
  var mutedCells = qAll(mountEl, '.msc-km-cell-muted');
  assert.ok(mutedCells.length >= 4);
}));

test('164. row actions still open the Detail modal and the external link, functionally unchanged by the rename', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  var overlay = document.querySelector('.msc-km-modal-overlay');
  assert.match(overlay.allText(), /Document Details|KPI Review Guide/);
  var openLink = q(mountEl, '.msc-km-open-link');
  assert.equal(openLink.getAttribute('href'), FIXTURE_DOC.source_url);
}));

test('165. search/filter/dashboard regression: filters still build the same query string after the layout refactor', withEnv(async () => {
  var mod = await loadKmModule();
  var qs = mod.buildListQueryString({ search: 'kpi', team: 'HR', documentType: 'PDF', lifecycleStatus: 'Active' });
  assert.match(qs, /search=kpi/);
  assert.match(qs, /team=HR/);
  assert.match(qs, /document_type=PDF/);
  assert.match(qs, /lifecycle_status=Active/);
}));

test('166. dashboard widget calculations are unchanged — same summary fixture numbers render after the layout refactor', withEnv(async () => {
  var { mountEl } = await mountWithFixture();
  var text = mountEl.allText();
  assert.match(text, new RegExp(String(SUMMARY_FIXTURE.total)));
  assert.match(text, new RegExp(String(SUMMARY_FIXTURE.pending)));
  assert.match(text, new RegExp(String(SUMMARY_FIXTURE.archived)));
}));

// ══════════════════════════════════════════════════════════════════════
// Scroll/layout audit (167-172) — regression coverage for the real
// production defect found and fixed via real-browser validation
// (2026-08-11): the shared body-scroll lock (ui/scroll-lock.js) was
// permanently stranding document.body at `position: fixed` after any
// Detail-modal transition (Delete/Edit Metadata/Create Version/Version
// History/Audit History) that reopens the same singleton modal without
// an intervening close(). These tests assert the OBSERVABLE fix —
// document.body.classList no longer carries 'msc-scroll-locked' once the
// modal is genuinely closed — through the exact nested-transition paths
// that were broken. The CSS-only scroll/overflow architecture itself
// (single scroll owner = window/body, no competing overflow:hidden
// ancestor) has no equivalent fake-DOM representation and is instead
// covered by real-browser evidence — see
// validation/screenshots/knowledge-management-scroll-audit-2026-08-11/
// and its accompanying report for that evidence. ══════════════════════

test('167. Delete-from-Detail-modal releases the shared scroll lock once fully closed (regression for the stuck-scroll production defect)', withEnv(async () => {
  __resetScrollLockForTests(); // see its own doc comment — ui/scroll-lock.js is a shared leaf module across this whole test file's run
  var { mountEl } = await mountWithFixture({ softDelete: function () { return Promise.resolve({ id: FIXTURE_DOC.id, deleted: true }); } });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  assert.equal(document.body.classList.contains('msc-scroll-locked'), true, 'Detail modal should lock scroll while open');
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Delete'; })[0], 'click');
  await flush();
  // Still locked — this is a content swap within the SAME open overlay,
  // not a second independent modal opening.
  assert.equal(document.body.classList.contains('msc-scroll-locked'), true, 'still one open overlay while showing the Delete form');
  document.querySelector('#msc-km-delete-reason').value = 'Regression test';
  fire(document.querySelector('.msc-km-form'), 'submit');
  await flush();
  assert.equal(document.body.classList.contains('msc-scroll-locked'), false, 'scroll lock must be fully released once the overlay is actually closed');
  assert.equal(document.body.style.position, '', 'body position must be cleared, not left at position: fixed');
}));

test('168. Detail -> Edit Metadata -> Cancel releases the shared scroll lock (same class of bug, different transition path)', withEnv(async () => {
  __resetScrollLockForTests();
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Edit Metadata'; })[0], 'click');
  await flush();
  assert.equal(document.body.classList.contains('msc-scroll-locked'), true);
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Cancel'; })[0], 'click');
  await flush();
  assert.equal(document.body.classList.contains('msc-scroll-locked'), false, 'scroll lock must be released after Edit Metadata Cancel, not stranded');
}));

test('169. Detail -> Create New Version -> Cancel releases the shared scroll lock (same class of bug, third transition path)', withEnv(async () => {
  __resetScrollLockForTests();
  var { mountEl } = await mountWithFixture();
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Create New Version'; })[0], 'click');
  await flush();
  assert.equal(document.body.classList.contains('msc-scroll-locked'), true);
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Cancel'; })[0], 'click');
  await flush();
  assert.equal(document.body.classList.contains('msc-scroll-locked'), false, 'scroll lock must be released after Create Version Cancel, not stranded');
}));

test('170. a background refresh after archive keeps the existing table visible instead of blanking to a loading message', withEnv(async () => {
  var resolveArchive;
  var { mountEl } = await mountWithFixture({
    archive: function () { return new Promise(function (resolve) { resolveArchive = resolve; }); }
  });
  fire(qAll(mountEl, '.msc-km-view-btn')[0], 'click');
  await flush();
  fire(Array.prototype.filter.call(document.querySelector('.msc-km-modal-overlay').querySelectorAll('.msc-btn'), function (b) { return b.textContent === 'Archive'; })[0], 'click');
  await flush();
  fire(getDialogConfirmBtn(), 'click');
  await flush();
  // archive() promise not resolved yet -> loadDocuments() is mid-flight;
  // the previously-rendered table must still be showing, not a loading
  // spinner (which would have blanked/shrunk the page, per the scroll
  // audit's root-cause finding).
  assert.equal(q(mountEl, '.msc-km-loading'), null, 'must not blank an already-rendered table to a loading message during a background refresh');
  assert.ok(q(mountEl, '.msc-km-table'), 'previously-rendered table must remain visible while the refresh is in flight');
  resolveArchive(Object.assign({}, FIXTURE_DOC, { lifecycle_status: 'Archived' }));
  await flush();
  assert.ok(q(mountEl, '.msc-km-table'), 'table renders normally once the refresh resolves');
}));

test('171. a genuinely first load still shows the loading state (regression against accidentally removing it)', withEnv(async () => {
  var resolveList;
  var mod = await loadKmModule();
  var mountEl = document.createElement('div');
  var api = makeFixtureApi({ list: function () { return new Promise(function (resolve) { resolveList = resolve; }); } });
  mod.mountKnowledgeManagementWorkspace(mountEl, { api: api });
  await flush();
  assert.ok(q(mountEl, '.msc-km-loading'), 'first load with nothing on screen yet must still show the loading state');
  resolveList({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 });
  await flush();
  assert.equal(q(mountEl, '.msc-km-loading'), null);
}));

test('172. clearing a search filter with existing results keeps the table visible during the refetch, not a loading blank', withEnv(async () => {
  var resolveList;
  var listCalls = 0;
  var { mountEl } = await mountWithFixture({
    list: function (filters) {
      listCalls += 1;
      if (listCalls === 1) { return Promise.resolve({ records: [FIXTURE_DOC, FIXTURE_DOC_2], total: 2, limit: 200, offset: 0 }); }
      return new Promise(function (resolve) { resolveList = resolve; });
    }
  });
  document.querySelector('#msc-km-search-input').value = 'kpi';
  fire(document.querySelector('#msc-km-search-input'), 'input');
  await new Promise(function (resolve) { setTimeout(resolve, 300); });
  assert.equal(q(mountEl, '.msc-km-loading'), null, 'filter refetch with prior data on screen must not blank to a loading message');
  assert.ok(q(mountEl, '.msc-km-table'));
  resolveList({ records: [FIXTURE_DOC], total: 1, limit: 200, offset: 0 });
  await flush();
}));
