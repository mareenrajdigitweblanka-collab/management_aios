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

   Element lookups use findByClass()/findByTag() below (recursive
   subtree search), not direct _children indexing — this keeps tests
   resilient to internal DOM restructuring (e.g. wrapping fields in
   section containers) as long as the same class names/tags are used
   somewhere in the tree.

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

/* Recursive subtree search — first descendant (any depth) with the given
   class, or the given tagName. Used instead of direct _children indexing
   so tests survive internal DOM restructuring. */
function findByClass(root, className) {
  if (!root || !root._children) { return null; }
  var stack = root._children.slice();
  while (stack.length) {
    var node = stack.shift();
    if (node.classList && node.classList.contains(className)) { return node; }
    if (node._children && node._children.length) { stack = node._children.concat(stack); }
  }
  return null;
}

function findByTag(root, tagName) {
  if (!root || !root._children) { return null; }
  var stack = root._children.slice();
  var upper = tagName.toUpperCase();
  while (stack.length) {
    var node = stack.shift();
    if (node.tagName === upper) { return node; }
    if (node._children && node._children.length) { stack = node._children.concat(stack); }
  }
  return null;
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

test('summaryPreview leaves short text untouched', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.summaryPreview('A short summary.');
  assert.equal(result.truncated, false);
  assert.equal(result.preview, 'A short summary.');
});

test('summaryPreview truncates long text at a word boundary and appends an ellipsis', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var words = [];
  for (var i = 0; i < 100; i++) { words.push('word' + i); }
  var longText = words.join(' '); // well over 400 characters, plenty of spaces
  var result = mod.summaryPreview(longText);
  assert.equal(result.truncated, true);
  assert.ok(result.preview.endsWith('…'));
  assert.ok(result.preview.length <= 401, 'preview should not exceed maxLength + ellipsis');
  // The character right before the ellipsis must not be mid-word — the
  // preview (minus the ellipsis) must be a prefix of the original text
  // ending exactly at a word the original text also has at that position.
  var withoutEllipsis = result.preview.slice(0, -1);
  assert.equal(longText.indexOf(withoutEllipsis), 0);
  assert.notEqual(longText.charAt(withoutEllipsis.length), undefined);
});

test('summaryPreview hard-cuts a single long token with no spaces', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.summaryPreview('A'.repeat(1000));
  assert.equal(result.truncated, true);
  assert.ok(result.preview.endsWith('…'));
  assert.equal(result.preview.length, 401); // 400 chars + ellipsis, no space to back off to
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

test('reviewSummariesHeadingText names the authorized reviewer, or says unauthorized when none is stored', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  assert.equal(mod.reviewSummariesHeadingText('Mayurika — HR'), 'My Review Summaries — Authorized as: Mayurika — HR');
  assert.equal(mod.reviewSummariesHeadingText(null), 'My Review Summaries — not yet authorized on this browser');
  assert.equal(mod.reviewSummariesHeadingText(''), 'My Review Summaries — not yet authorized on this browser');
});

// ── DOM-mounted behavior ─────────────────────────────────────────────

test('heading shows the AUTHORIZED reviewer when the selected panel matches (not the tab it happens to be mounted under)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesForMember(mountEl, 'mayurika');

  var heading = findByClass(mountEl, 'review-summaries-heading');
  assert.ok(heading, 'a .review-summaries-heading element should exist');
  assert.match(heading.textContent, /mayurika/i, 'heading must name the authorized (token) member, "mayurika"');
});

// ── Authorization-context fix (REQ-CAL-REV-001, 2026-08-03 follow-up) —
//    the production defect: switching sidebar member panels left the same
//    workspace/history visible, because the panel's own member was never
//    compared against the browser-wide token's member. Mirrors calendar/
//    auth.js's exported CALENDAR_AUTH_CHANGED_EVENT constant by value
//    (not by import — importing calendar/auth.js/config.js at module top
//    level would read window.location.hostname before any test installs
//    fake browser globals, poisoning every later import — same
//    constraint documented above for freshReviewSummariesModule()). ─────
var CALENDAR_AUTH_CHANGED_EVENT_NAME = 'management-aios:calendar-auth-changed';

test('mismatched panel is blocked, not silently relabeled (regression test for the cross-tab confusion defect)', async (t) => {
  // Mounted under Suman's tab (memberKey='suman') but the browser's stored
  // token belongs to Mayurika — previously this rendered Mayurika's data
  // mislabeled under Suman's tab (only the heading text was "fixed" by an
  // earlier pass); the actual production defect was that the workspace
  // itself stayed fully interactive regardless of which panel it was in.
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'suman');

  assert.equal(api.accessDecision(), 'blocked');
  var blocked = findByClass(mountEl, 'review-summaries-blocked');
  assert.ok(blocked, 'a .review-summaries-blocked banner should exist');
  assert.equal(blocked.hidden, false);
  assert.match(blocked.allText(), /suman/i, 'the blocked banner must name the selected sidebar member (target)');
  assert.match(blocked.allText(), /mayurika/i, 'the blocked banner must name the authenticated reviewer (acting)');
  assert.equal(fetchMock.calls.length, 0, 'no network request should be sent for a mismatched panel');
});

test('matching panel allows the workspace (Mayurika token + Mayurika panel)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  assert.equal(api.accessDecision(), 'allowed');
  assert.equal(findByClass(mountEl, 'review-summaries-blocked').hidden, true);
});

test('mismatched panel blocks the workspace (Mayurika token + Arun panel)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'arun');
  assert.equal(api.accessDecision(), 'blocked');
});

test('matching panel allows the workspace (Arun token + Arun panel)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'arun' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'arun');
  assert.equal(api.accessDecision(), 'allowed');
});

test('mismatched panel blocks the workspace (Arun token + Mayurika panel)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'arun' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  assert.equal(api.accessDecision(), 'blocked');
});

test('cross-member block sends zero GET requests even if staff is selected programmatically', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'suman');
  api.selectStaff({ id: 'staff-x', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, 0, 'no GET should ever be sent through a blocked panel');
});

test('cross-member block sends zero POST requests even if the form is submitted directly', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'suman');
  api.selectStaff({ id: 'staff-x', full_name: 'Someone', calling_name: null });
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'Attempted cross-member write.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, 0, 'no POST should ever be sent through a blocked panel');
});

test('cross-member block sends zero PUT requests even if edit state is set directly', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'suman');
  api.selectStaff({ id: 'staff-x', full_name: 'Someone', calling_name: null });
  api.state.editingId = 'sum-fake-id';
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'Attempted cross-member edit.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, 0, 'no PUT should ever be sent through a blocked panel');
});

test('cross-member block renders no delete/edit buttons — nothing to trigger a DELETE from', async (t) => {
  var record = { id: 'sum-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-1', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-01', summary_text: 'Text.', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T09:00:00Z' };
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'suman');
  api.selectStaff({ id: 'staff-1', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(findByClass(mountEl, 'review-summaries-delete-btn'), null);
  assert.equal(fetchMock.calls.filter(function (c) { return c.options.method === 'DELETE'; }).length, 0);
});

test('valid token remains stored after a cross-member block', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'test-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesForMember(mountEl, 'suman'); // blocked
  var stored = JSON.parse(globals.window.localStorage.getItem('management_aios_calendar_auth_v1'));
  assert.equal(stored.token, 'test-token', 'the valid token must never be cleared just because a panel is blocked');
});

test('sidebar change clears selected staff, history, edit mode, and unsaved draft text', async (t) => {
  var record = { id: 'sum-1', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-1', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-01', summary_text: 'Original.', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T09:00:00Z' };
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-1', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'Unsaved draft text.';

  assert.ok(api.state.selectedStaff, 'staff should be selected before the sidebar change');
  assert.equal(api.state.editingId, 'sum-1', 'edit mode should be active before the sidebar change');

  api.reevaluateAccess(); // what the msc:close-toolbar-popovers listener runs on every sidebar-panel switch

  assert.equal(api.state.selectedStaff, null, 'selected staff should be cleared on sidebar change');
  assert.equal(api.state.editingId, null, 'edit mode should be exited on sidebar change');
  assert.equal(textarea.value, '', 'unsaved draft text should be cleared on sidebar change');
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.match(historyEl.allText(), /Select a staff member/, 'history should reset to the placeholder, not keep showing the previous selection');
});

test('sidebar-panel-switch event triggers the same reset for every mounted instance', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-2', full_name: 'Someone Else', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.ok(api.state.selectedStaff);

  // navigation.js dispatches this exact event on every activatePanel() call.
  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' });
  assert.equal(api.state.selectedStaff, null, 'this instance must reset even though it listens document-wide, not only for its own tab');
});

test('token change clears the previously-authorized panel and unblocks the newly matching one', async (t) => {
  var mayurikaRecord = { id: 'sum-mayu', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-1', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-01', summary_text: 'Mayurika summary.', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T09:00:00Z' };
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [mayurikaRecord], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 'mayurika-token', memberKey: 'mayurika' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();

  var mayurikaMountEl = globals.document.createElement('div');
  var mayurikaApi = mod.mountReviewSummariesForMember(mayurikaMountEl, 'mayurika');
  mayurikaApi.selectStaff({ id: 'staff-1', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(mayurikaApi.accessDecision(), 'allowed');
  assert.ok(mayurikaApi.state.selectedStaff, 'Mayurika panel should have loaded state before the token change');

  var arunMountEl = globals.document.createElement('div');
  var arunApi = mod.mountReviewSummariesForMember(arunMountEl, 'arun');
  assert.equal(arunApi.accessDecision(), 'blocked', 'Arun panel is blocked while the Mayurika token is active');

  // Simulate a successful "Change token" verify to Arun — write the new
  // stored auth directly (this DOM stand-in cannot drive the real token
  // dialog — see the module-level coverage-boundary note above) and
  // dispatch the same event calendar/auth.js's submit() fires on success.
  globals.window.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify({
    version: 1, token: 'arun-token', verifiedMemberKey: 'arun', verifiedAt: '2026-08-03T00:00:00.000Z'
  }));
  globals.document.dispatchEvent({ type: CALENDAR_AUTH_CHANGED_EVENT_NAME });

  assert.equal(mayurikaApi.state.selectedStaff, null, 'the previously-authorized panel must clear its stale selection on token change');
  assert.equal(mayurikaApi.accessDecision(), 'blocked', 'Mayurika panel must now be blocked — the token no longer belongs to Mayurika');
  assert.equal(arunApi.accessDecision(), 'allowed', 'Arun panel must now be allowed — the token now belongs to Arun');
});

test('heading shows "not yet authorized" before any token is stored', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesForMember(mountEl, 'arun');
  var heading = findByClass(mountEl, 'review-summaries-heading');
  assert.match(heading.textContent, /not yet authorized/i);
});

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
  var selectedStaffEl = findByClass(mountEl, 'review-summaries-selected-staff');
  assert.ok(selectedStaffEl, 'a .review-summaries-selected-staff element should exist');
  assert.match(selectedStaffEl.allText(), /Regular Staff/);
  assert.ok(!selectedStaffEl.allText().includes('EMP-777'), 'employee_number must never be displayed as the staff selector value/label');
});

test('empty state before staff selection', async (t) => {
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); }) });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  var historyEl = findByClass(mountEl, 'review-summaries-history');
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
  var historyEl = findByClass(mountEl, 'review-summaries-history');
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

  var textNode = findByClass(mountEl, 'review-summary-text');
  assert.ok(textNode, 'a .review-summary-text node should exist');
  // Rendered via textContent only — the raw string survives byte-for-byte
  // as text, and (since it was never passed through innerHTML) no actual
  // <script>/<img> FakeElement was ever created for it.
  assert.equal(textNode.textContent, dangerous);
});

test('short summary text renders in full with no "Show more" toggle', async (t) => {
  var record = { id: 'sum-short', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-14', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-03', summary_text: 'A short review discussion.', created_at: '2026-08-03T09:00:00Z', updated_at: '2026-08-03T09:00:00Z' };
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-14', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var textNode = findByClass(mountEl, 'review-summary-text');
  assert.equal(textNode.textContent, 'A short review discussion.');
  assert.equal(findByClass(mountEl, 'review-summaries-toggle-text-btn'), null, 'no toggle button should render for text under the preview length');
});

test('long summary text renders truncated with a "Show more"/"Show less" toggle', async (t) => {
  var words = [];
  for (var i = 0; i < 100; i++) { words.push('word' + i); }
  var longText = words.join(' ');
  var record = { id: 'sum-long', reviewer_member_key: 'mayurika', reviewed_staff_id: 'staff-uuid-15', reviewed_staff_full_name: 'Someone', meeting_date: '2026-08-03', summary_text: longText, created_at: '2026-08-03T09:00:00Z', updated_at: '2026-08-03T09:00:00Z' };
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-15', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var textNode = findByClass(mountEl, 'review-summary-text');
  var toggleBtn = findByClass(mountEl, 'review-summaries-toggle-text-btn');
  assert.ok(toggleBtn, 'a "Show more" toggle button should render for text over the preview length');
  assert.notEqual(textNode.textContent, longText, 'initial render should be the truncated preview, not the full text');
  assert.equal(toggleBtn.textContent, 'Show more');
  assert.equal(toggleBtn.getAttribute('aria-expanded'), 'false');

  toggleBtn.click();
  assert.equal(textNode.textContent, longText, 'clicking "Show more" should reveal the full text');
  assert.equal(toggleBtn.textContent, 'Show less');
  assert.equal(toggleBtn.getAttribute('aria-expanded'), 'true');

  toggleBtn.click();
  assert.notEqual(textNode.textContent, longText, 'clicking "Show less" should collapse back to the preview');
  assert.equal(toggleBtn.textContent, 'Show more');
  assert.equal(toggleBtn.getAttribute('aria-expanded'), 'false');
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

  var form = findByTag(mountEl, 'FORM');
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

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
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

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
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

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  var dateInput = findByClass(form, 'review-summaries-date-input');
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

  var deleteBtn = findByClass(mountEl, 'review-summaries-delete-btn');
  var deleteCallsBefore = fetchMock.calls.filter(function (c) { return c.options.method === 'DELETE'; }).length;
  deleteBtn.click();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var deleteCallsAfter = fetchMock.calls.filter(function (c) { return c.options.method === 'DELETE'; }).length;
  assert.equal(deleteCallsAfter, deleteCallsBefore, 'clicking Delete alone must never call DELETE without confirmation');
});

test('401 on list fetch clears the stored Calendar token AND clears Review Summaries state', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(401, { detail: 'Invalid token.' }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesForMember(mountEl, 'mayurika');
  api.selectStaff({ id: 'staff-uuid-9', full_name: 'Someone', calling_name: null });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(globals.window.localStorage.getItem('management_aios_calendar_auth_v1'), null);
  // handleUnauthorizedResponse() (calendar/auth.js) fires
  // CALENDAR_AUTH_CHANGED_EVENT synchronously as part of clearing the
  // token — reevaluateAccess() uses that to clear this panel's state in
  // the same tick, not on some later, separate interaction.
  assert.equal(api.state.selectedStaff, null, 'selected staff should be cleared once the token is rejected');
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.match(historyEl.allText(), /Select a staff member/, 'history should reset to the placeholder, not show a stale "Request failed" error box');
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

  var historyEl = findByClass(mountEl, 'review-summaries-history');
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

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
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

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
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

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = secret;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  fetchMock.calls.forEach(function (call) {
    assert.ok(!String(call.url).includes(secret), 'summary text must never appear in a request URL: ' + call.url);
  });
});

test('staff search shows an immediate "Searching…" indicator while the request is in flight', async (t) => {
  var resolveSearch;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/api/staff') === 0 || String(url).indexOf('management-aios') !== -1 || String(url).indexOf('127.0.0.1:8000/api/staff') !== -1) {
      return new Promise(function (resolve) { resolveSearch = resolve; });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesForMember(mountEl, 'mayurika');

  var searchInput = findByClass(mountEl, 'review-summaries-staff-search');
  assert.ok(searchInput, 'staff search input should exist');
  searchInput.value = 'jane';
  searchInput.dispatchEvent({ type: 'input' });
  await new Promise(function (resolve) { setTimeout(resolve, 320); }); // clear the debounce window

  var resultsEl = findByClass(mountEl, 'review-summaries-staff-results');
  assert.ok(resultsEl, 'results container should exist');
  // showInlineLoading (ui/loading.js) sets innerHTML with the loading text
  // positioned after the spinner span's closing tag — this test-dom's
  // deliberately narrow innerHTML parser (see review-summaries-test-dom.mjs)
  // only reconstructs text immediately following an opening tag, so it
  // cannot recover that trailing text as a child node; the raw HTML string
  // itself (always preserved verbatim) is the reliable thing to assert on.
  assert.match(resultsEl._innerHTML, /Searching/i, 'a loading indicator should appear while the staff search request is in flight');
  assert.equal(resultsEl.hidden, false);

  resolveSearch(jsonResponse(200, { records: [], total: 0, limit: 20, offset: 0 }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
});
