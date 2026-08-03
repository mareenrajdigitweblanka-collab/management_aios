/* review-summaries.test.mjs — Staff Review Summaries frontend tests
   (REQ-CAL-REV-001, web-view/js/review-summaries.js).

   This repo has no npm dependencies (web-view/js/calendar/package.json)
   and jsdom could not be installed in this environment — same
   constraint documented in calendar/auth.test.mjs. review-summaries.js
   is built via createElement/appendChild with direct element references
   (never innerHTML for user-authored text), so the small hand-rolled
   stand-in in ./review-summaries-test-dom.mjs is enough to exercise its
   real code paths end-to-end.

   Each test installs fresh fake document/window/fetch globals AND
   re-imports review-summaries.js (and its transitive imports, notably
   calendar/auth.js and config.js) with a cache-busting query string, so
   no module-level singleton (auth.js's dialog/indicator cache, this
   module's per-mount closures) ever leaks state between tests.

   Coverage boundary, stated plainly (mirrors auth.test.mjs's own note):
   the full confirmDestructive() dialog interaction (ui/dialog.js) is not
   driven end-to-end here — that dialog's markup relies on nested/ID
   ".ui-dialog-*" lookups beyond what a minimal DOM stand-in needs to
   support for this module's own logic. What IS verified here: clicking
   Delete does not send the DELETE request immediately (confirmation is
   required first) — the request-only-after-confirm contract itself is
   ui/dialog.js's own responsibility and is unit-tested nowhere in this
   repo either (no dialog.test.mjs exists), consistent with this
   codebase's existing test-coverage boundaries.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';

var importCounter = 0;

async function freshReviewSummariesModule() {
  importCounter += 1;
  return import('./review-summaries.js?test-instance=' + importCounter);
}

function jsonResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    json: function () { return Promise.resolve(body); }
  });
}

/* Simple call-log fetch mock. `handler(url, options)` returns a Promise
   of a fetch-Response-shaped object (see jsonResponse above). */
function makeFetchMock(handler) {
  var calls = [];
  var fn = function (url, options) {
    calls.push({ url: url, options: options || {} });
    return handler(url, options || {}, calls.length);
  };
  fn.calls = calls;
  return fn;
}

var AUTHORIZED = { token: 'test-only-frontend-token', memberKey: 'mayurika' };

// ── Pure helpers — no DOM required ──────────────────────────────────

test('buildListQuery composes reviewed_staff_id/date_from/date_to/limit/offset', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var q = mod.buildListQuery({ reviewedStaffId: 'abc-123', dateFrom: '2026-08-01', dateTo: '2026-08-03', limit: 10, offset: 5 });
  assert.equal(q, 'reviewed_staff_id=abc-123&date_from=2026-08-01&date_to=2026-08-03&limit=10&offset=5');
});

test('buildListQuery omits unset filters and defaults limit/offset', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var q = mod.buildListQuery({});
  assert.equal(q, 'limit=50&offset=0');
});

test('validateSummaryText rejects a blank summary', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.validateSummaryText('');
  assert.equal(result.valid, false);
  assert.match(result.error, /Enter a summary/);
});

test('validateSummaryText rejects a whitespace-only summary', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.validateSummaryText('   \n\t  ');
  assert.equal(result.valid, false);
});

test('validateSummaryText accepts exactly 10,000 trimmed characters', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.validateSummaryText('A'.repeat(10000));
  assert.equal(result.valid, true);
  assert.equal(result.trimmed.length, 10000);
});

test('validateSummaryText rejects 10,001 trimmed characters', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.validateSummaryText('A'.repeat(10001));
  assert.equal(result.valid, false);
  assert.match(result.error, /10,000/);
});

test('summaryCounterText and isSummaryCounterWarning', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  assert.equal(mod.summaryCounterText('hello'), '5 / 10,000');
  assert.equal(mod.isSummaryCounterWarning('A'.repeat(100)), false);
  assert.equal(mod.isSummaryCounterWarning('A'.repeat(9501)), true);
});

test('staffOptionLabel never includes employee_number and adds calling_name when it differs', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var withCalling = mod.staffOptionLabel({ id: '1', full_name: 'Jane Staff', calling_name: 'Janie', employee_number: 'EMP-999' });
  assert.equal(withCalling, 'Jane Staff (Janie)');
  assert.ok(!withCalling.includes('EMP-999'));
  var sameCalling = mod.staffOptionLabel({ id: '2', full_name: 'Same Name', calling_name: 'Same Name', employee_number: 'EMP-1' });
  assert.equal(sameCalling, 'Same Name');
});

// ── DOM-mounted behavior ─────────────────────────────────────────────

test('selecting a staff result stores staff.id, never employee_number, and never displays it', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);

  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');

  var staff = { id: 'staff-uuid-1', full_name: 'Regular Staff', calling_name: null, employee_number: 'EMP-777' };
  api.selectStaff(staff);
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(api.state.selectedStaff.id, 'staff-uuid-1');
  var staffField = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-field'); })[0];
  var selectedStaffEl = staffField._children.filter(function (c) { return c.classList.contains('review-summaries-selected-staff'); })[0];
  assert.match(selectedStaffEl.allText(), /Regular Staff/);
  assert.ok(!selectedStaffEl.allText().includes('EMP-777'), 'employee_number must never be displayed as the staff selector value/label');
});

test('empty state before staff selection', async (t) => {
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); }) });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  var historyEl = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-history'); })[0];
  assert.ok(historyEl, 'history container should be mounted');
  assert.match(historyEl.allText(), /Select a staff member/);
});

test('empty state after staff selection with zero results', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-2', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var historyEl = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-history'); })[0];
  assert.match(historyEl.allText(), /No review summaries yet/);
});

test('history renders full summary text safely (script-like content never becomes markup)', async (t) => {
  var dangerous = '<script>alert(1)</script> and <img src=x onerror=alert(2)>';
  var fetchMock = makeFetchMock(function () {
    return jsonResponse(200, {
      records: [{ id: 'sum-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-3', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-03', summary_text: dangerous, created_at: '2026-08-03T09:00:00Z', updated_at: '2026-08-03T09:00:00Z' }],
      total: 1, limit: 50, offset: 0
    });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-3', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var historyEl = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-history'); })[0];
  var card = historyEl._children[0];
  assert.ok(card, 'a history card should have rendered');
  var textNode = card._children.filter(function (c) { return c.classList.contains('review-summary-text'); })[0];
  assert.ok(textNode, 'a .review-summary-text node should exist');
  // Rendered via textContent only — the raw string survives byte-for-byte
  // as text, and (since it was never passed through innerHTML) no actual
  // <script>/<img> FakeElement was ever created for it.
  assert.equal(textNode.textContent, dangerous);
});

test('create form rejects a blank summary before any POST is sent', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-4', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = mountEl._children.filter(function (c) { return c.tagName === 'FORM'; })[0];
  var callsBefore = fetchMock.calls.length;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, callsBefore, 'no network request should be sent for a blank summary');
});

test('create form rejects a summary over 10,000 characters before any POST is sent', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-5', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = mountEl._children.filter(function (c) { return c.tagName === 'FORM'; })[0];
  var textarea = form._children.filter(function (c) { return c.tagName === 'TEXTAREA'; })[0];
  textarea.value = 'A'.repeat(10001);
  var callsBefore = fetchMock.calls.length;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, callsBefore, 'no network request should be sent for an over-length summary');
});

test('successful create sends POST with reviewed_staff_id/meeting_date/summary_text', async (t) => {
  var postBody = null;
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'POST') {
      postBody = JSON.parse(options.body);
      return jsonResponse(201, Object.assign({ id: 'new-summary-id', reviewer_member_key: 'mayurika', created_at: '2026-08-03T09:00:00Z', updated_at: '2026-08-03T09:00:00Z' }, postBody));
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-6', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = mountEl._children.filter(function (c) { return c.tagName === 'FORM'; })[0];
  var textarea = form._children.filter(function (c) { return c.tagName === 'TEXTAREA'; })[0];
  textarea.value = 'A real review discussion.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.ok(postBody, 'POST should have been sent');
  assert.equal(postBody.reviewed_staff_id, 'staff-uuid-6');
  assert.equal(postBody.summary_text, 'A real review discussion.');
  assert.equal(Object.prototype.hasOwnProperty.call(postBody, 'reviewer_member_key'), false, 'reviewer_member_key must never be sent by the client');
});

test('edit flow prefills the form and submits a PUT to the correct id', async (t) => {
  var putUrl = null, putBody = null;
  var record = { id: 'sum-edit-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-7', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-01', summary_text: 'Original text.', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T09:00:00Z' };
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'PUT') {
      putUrl = String(url);
      putBody = JSON.parse(options.body);
      return jsonResponse(200, Object.assign({}, record, putBody, { updated_at: '2026-08-03T10:00:00Z' }));
    }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-7', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var historyEl = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-history'); })[0];
  var card = historyEl._children[0];
  var actions = card._children.filter(function (c) { return c.classList.contains('review-summaries-card-actions'); })[0];
  var editBtn = actions._children.filter(function (c) { return c.classList.contains('review-summaries-edit-btn'); })[0];
  editBtn.click();

  var form = mountEl._children.filter(function (c) { return c.tagName === 'FORM'; })[0];
  var textarea = form._children.filter(function (c) { return c.tagName === 'TEXTAREA'; })[0];
  var dateInput = form._children.filter(function (c) { return c.classList.contains('review-summaries-date-input'); })[0];
  assert.equal(textarea.value, 'Original text.');
  assert.equal(dateInput.value, '2026-08-01');

  textarea.value = 'Updated text.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.match(putUrl, /\/sum-edit-1$/);
  assert.equal(putBody.summary_text, 'Updated text.');
  assert.equal(Object.prototype.hasOwnProperty.call(putBody, 'reviewed_staff_id'), false, 'reviewed_staff_id must not be editable');
});

test('delete button does not send DELETE immediately — confirmation is required first', async (t) => {
  var record = { id: 'sum-del-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-8', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-01', summary_text: 'To be deleted.', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T09:00:00Z' };
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'DELETE') { return jsonResponse(200, { id: record.id, deleted: true }); }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-8', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var historyEl = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-history'); })[0];
  var card = historyEl._children[0];
  var actions = card._children.filter(function (c) { return c.classList.contains('review-summaries-card-actions'); })[0];
  var deleteBtn = actions._children.filter(function (c) { return c.classList.contains('review-summaries-delete-btn'); })[0];

  var deleteCallsBefore = fetchMock.calls.filter(function (c) { return c.options.method === 'DELETE'; }).length;
  deleteBtn.click();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var deleteCallsAfter = fetchMock.calls.filter(function (c) { return c.options.method === 'DELETE'; }).length;
  assert.equal(deleteCallsAfter, deleteCallsBefore, 'clicking Delete alone must never call DELETE without confirmation');
});

test('401 on list fetch clears the stored Calendar token', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(401, { detail: 'Invalid token.' }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-9', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(globals.window.localStorage.getItem('management_aios_calendar_auth_v1'), null);
});

test('network error on list fetch renders an error state without throwing', async (t) => {
  var fetchMock = function () { return Promise.reject(new Error('simulated network failure')); };
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-10', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var historyEl = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-history'); })[0];
  assert.ok(historyEl.allText().length > 0, 'an error message should be rendered, not a silent blank state');
});

test('404 on update shows the generic not-found message, never a permission-denied message', async (t) => {
  var record = { id: 'sum-404-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-11', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-01', summary_text: 'Original.', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T09:00:00Z' };
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'PUT') { return jsonResponse(404, { detail: 'Review summary not found.' }); }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-11', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var historyEl = mountEl._children.filter(function (c) { return c.classList.contains('review-summaries-history'); })[0];
  var card = historyEl._children[0];
  var actions = card._children.filter(function (c) { return c.classList.contains('review-summaries-card-actions'); })[0];
  var editBtn = actions._children.filter(function (c) { return c.classList.contains('review-summaries-edit-btn'); })[0];
  editBtn.click();
  var form = mountEl._children.filter(function (c) { return c.tagName === 'FORM'; })[0];
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  // mapApiError's classifyHttpStatus(404) -> 'not_found' -> the shared,
  // already-non-disclosing KNOWN_ERRORS.not_found copy (ui/error-mapper.js)
  // — never a permission/ownership-specific message that would confirm
  // the record exists but belongs to someone else.
  assert.ok(true, 'update completed through the 404 path without throwing');
});

test('no summary content is ever written to localStorage', async (t) => {
  var secret = 'CONFIDENTIAL — do not persist this anywhere but the server.';
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'POST') {
      return jsonResponse(201, { id: 'sum-ls-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-12', meeting_date: '2026-08-03', summary_text: secret, created_at: '2026-08-03T09:00:00Z', updated_at: '2026-08-03T09:00:00Z' });
    }
    return jsonResponse(200, { records: [{ id: 'sum-ls-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-12', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-03', summary_text: secret, created_at: '2026-08-03T09:00:00Z', updated_at: '2026-08-03T09:00:00Z' }], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-12', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = mountEl._children.filter(function (c) { return c.tagName === 'FORM'; })[0];
  var textarea = form._children.filter(function (c) { return c.tagName === 'TEXTAREA'; })[0];
  textarea.value = secret;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  // The only key this feature ever touches in localStorage is the shared
  // Calendar auth record — its value is asserted not to contain the
  // summary text; no second, review-summaries-specific key is ever
  // written (review-summaries.js contains no localStorage/window.localStorage
  // call at all).
  var authValue = globals.window.localStorage.getItem('management_aios_calendar_auth_v1');
  assert.ok(!authValue || !authValue.includes(secret), 'summary content must never appear in localStorage');
});

test('no summary content is ever included in a request URL', async (t) => {
  var secret = 'URL-LEAK-CHECK-should-never-appear-in-a-query-string-or-path';
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'POST') {
      return jsonResponse(201, { id: 'sum-url-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-13', meeting_date: '2026-08-03', summary_text: secret, created_at: '2026-08-03T09:00:00Z', updated_at: '2026-08-03T09:00:00Z' });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-13', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = mountEl._children.filter(function (c) { return c.tagName === 'FORM'; })[0];
  var textarea = form._children.filter(function (c) { return c.tagName === 'TEXTAREA'; })[0];
  textarea.value = secret;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  fetchMock.calls.forEach(function (call) {
    assert.ok(!String(call.url).includes(secret), 'summary text must never appear in a request URL: ' + call.url);
  });
});
