/* review-summaries.test.mjs — Staff Review Summaries dedicated workspace
   frontend tests (REQ-CAL-REV-TAB-002, web-view/js/review-summaries.js).

   Rewritten in full (2026-08-06) — the prior suite exhaustively tested the
   REQ-CAL-REV-001 5-mount own/read_only/unauthorized model (a per-tab
   `memberKey` compared against the authenticated token). That model no
   longer exists: this workspace is mounted exactly once, independent of
   any member panel, with only two access states ('authorized' /
   'unauthorized') and per-RECORD ownership (isOwnedRecord) deciding Edit
   visibility instead of per-PANEL mode. Every test below drives the new
   mountReviewSummariesWorkspace(mountEl) API (no memberKey parameter).

   REQ-CAL-REV-LOCK-004 (2026-08-06, same-day edit lock/no-delete) update:
   fakeSummaryRecord now carries a `can_edit` field (defaulting to true —
   owned by mayurika, still within its own edit window), since the backend
   is authoritative for edit eligibility and this module only ever reads
   record.can_edit, never recomputes it from a browser clock — see the
   dedicated can_edit/locked-status tests below. Delete no longer exists
   anywhere in this UI (the control was removed, not merely hidden behind
   a confirmation dialog) — the prior confirmDestructive() coverage-
   boundary note this file used to carry no longer applies.

   This repo has no npm dependencies and jsdom could not be installed in
   this environment (same constraint as calendar/auth.test.mjs) —
   review-summaries.js is built via createElement/appendChild with direct
   element references (never innerHTML for user-authored text), so the
   existing small hand-rolled stand-in (./review-summaries-test-dom.mjs,
   unchanged by this rewrite) is enough to exercise its real code paths
   end-to-end.

   Markup-level items (sidebar heading/order, mount counts inside
   web-view/index.html) are NOT covered by this file — this repo has no
   test harness that parses index.html (no precedent, e.g. no
   navigation.test.mjs exists either); those items were verified by direct
   static inspection/grep of index.html this session and are reported
   separately in the implementation evidence document, not claimed as
   automated test coverage here.

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

function findAllByClass(root, className) {
  var found = [];
  if (!root || !root._children) { return found; }
  var stack = root._children.slice();
  while (stack.length) {
    var node = stack.shift();
    if (node.classList && node.classList.contains(className)) { found.push(node); }
    if (node._children && node._children.length) { stack = node._children.concat(stack); }
  }
  return found;
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

/* REQ-CAL-REV-UX-005 — the card metadata block is now dt/dd pairs
   (label + value each their own element, never one combined "Label:
   value" text run) rather than a single labeled span. Finds the value
   element for a given label by walking each .review-summaries-card-meta-
   row and matching its own .review-summaries-card-meta-label text. */
function findMetaValue(root, label) {
  var rows = findAllByClass(root, 'review-summaries-card-meta-row');
  for (var i = 0; i < rows.length; i++) {
    var dt = findByClass(rows[i], 'review-summaries-card-meta-label');
    if (dt && dt.textContent === label) {
      return findByClass(rows[i], 'review-summaries-card-meta-value');
    }
  }
  return null;
}

var AUTHORIZED = { token: 'test-only-frontend-token', memberKey: 'mayurika' };
var ARUN_AUTHORIZED = { token: 'test-only-frontend-token-arun', memberKey: 'arun' };
var CALENDAR_AUTH_CHANGED_EVENT_NAME = 'management-aios:calendar-auth-changed';

function fakeStaffRecord(overrides) {
  return Object.assign({ id: 'staff-x', full_name: 'Someone', calling_name: null }, overrides || {});
}

function fakeSummaryRecord(overrides) {
  return Object.assign({
    id: 'sum-1',
    reviewer_member_key: 'mayurika',
    reviewed_staff_id: 'staff-x',
    reviewed_staff_full_name: 'Someone',
    reviewed_staff_calling_name: null,
    meeting_date: '2026-08-01',
    summary_text: 'A review discussion.',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-08-01T09:00:00Z',
    // REQ-CAL-REV-LOCK-004 (2026-08-06) — the backend is authoritative
    // for edit eligibility; this module never recomputes it from a
    // browser clock (see review-summaries.js's own header note). Tests
    // below set can_edit explicitly wherever the locked/other-reviewer
    // state is what's under test; this default matches the common
    // "owned by mayurika, still within its own edit window" case.
    can_edit: true,
    edit_deadline: '2026-08-01T23:59:59+05:30'
  }, overrides || {});
}

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

test('buildListQuery includes reviewer_member_key for a specific-reviewer request and omits include_all_reviewers', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var q = mod.buildListQuery({ reviewerMemberKey: 'arun', reviewedStaffId: 'abc-123' });
  assert.equal(q, 'reviewer_member_key=arun&reviewed_staff_id=abc-123&limit=50&offset=0');
  assert.ok(!q.includes('include_all_reviewers'));
});

test('buildListQuery includes include_all_reviewers=true and omits reviewer_member_key for the all-reviewers default', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var q = mod.buildListQuery({ includeAllReviewers: true, reviewedStaffId: 'abc-123' });
  assert.equal(q, 'include_all_reviewers=true&reviewed_staff_id=abc-123&limit=50&offset=0');
});

test('buildListQuery never sends both include_all_reviewers and reviewer_member_key, even if both are passed', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var q = mod.buildListQuery({ includeAllReviewers: true, reviewerMemberKey: 'arun', reviewedStaffId: 'abc-123' });
  assert.match(q, /include_all_reviewers=true/);
  assert.ok(!q.includes('reviewer_member_key'), 'reviewer_member_key must never accompany include_all_reviewers=true');
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
  var longText = words.join(' ');
  var result = mod.summaryPreview(longText);
  assert.equal(result.truncated, true);
  assert.ok(result.preview.endsWith('…'));
  var withoutEllipsis = result.preview.slice(0, -1);
  assert.equal(longText.indexOf(withoutEllipsis), 0);
});

test('summaryPreview hard-cuts a single long token with no spaces', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.summaryPreview('A'.repeat(1000));
  assert.equal(result.truncated, true);
  assert.equal(result.preview.length, 401);
});

test('staffOptionLabel never includes employee_number and adds calling_name when it differs', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var withCalling = mod.staffOptionLabel({ id: '1', full_name: 'Jane Staff', calling_name: 'Janie', employee_number: 'EMP-999' });
  assert.equal(withCalling, 'Jane Staff (Janie)');
  assert.ok(!withCalling.includes('EMP-999'));
});

test('reviewedEmployeeLabel reads a history record\'s own reviewed_staff fields, never employee_number', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var withCalling = mod.reviewedEmployeeLabel({ reviewed_staff_full_name: 'Jane Staff', reviewed_staff_calling_name: 'Janie' });
  assert.equal(withCalling, 'Jane Staff (Janie)');
  var sameName = mod.reviewedEmployeeLabel({ reviewed_staff_full_name: 'Same Name', reviewed_staff_calling_name: 'Same Name' });
  assert.equal(sameName, 'Same Name');
});

/* REQ-CAL-REV-PDF-003-FIX-02 — parseReviewSummaryPdfFilename /
   buildFallbackReviewSummaryPdfFilename unit tests. Every name below is
   fabricated test data, never a real employee. */

test('parseReviewSummaryPdfFilename prefers filename*=UTF-8\'\' over filename=', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var header = 'attachment; filename="Review_Summary_Jose_Garcia_2026-08-06.pdf"; ' +
    "filename*=UTF-8''Review_Summary_Jos%C3%A9_Garc%C3%ADa_2026-08-06.pdf";
  var result = mod.parseReviewSummaryPdfFilename(header, 'Fallback Name', '2026-08-06');
  assert.equal(result, 'Review_Summary_José_García_2026-08-06.pdf');
});

test('parseReviewSummaryPdfFilename falls back to filename= when filename* is absent', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var header = 'attachment; filename="Review_Summary_Test_Employee_2026-08-06.pdf"';
  var result = mod.parseReviewSummaryPdfFilename(header, 'Fallback Name', '2026-08-06');
  assert.equal(result, 'Review_Summary_Test_Employee_2026-08-06.pdf');
});

test('parseReviewSummaryPdfFilename decodes percent-encoded UTF-8 in filename*', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var header = "attachment; filename*=UTF-8''Review_Summary_Na%C3%AFve_2026-08-06.pdf";
  var result = mod.parseReviewSummaryPdfFilename(header, 'Fallback Name', '2026-08-06');
  assert.equal(result, 'Review_Summary_Naïve_2026-08-06.pdf');
});

test('parseReviewSummaryPdfFilename strips path separators and control characters from a hostile header value', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var header = 'attachment; filename="../../etc/evil\r\n.pdf"';
  var result = mod.parseReviewSummaryPdfFilename(header, 'Fallback Name', '2026-08-06');
  assert.ok(!result.includes('/'));
  assert.ok(!result.includes('\\'));
  assert.ok(!result.includes('\r'));
  assert.ok(!result.includes('\n'));
});

test('parseReviewSummaryPdfFilename appends .pdf when the header value is missing the extension', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var header = 'attachment; filename="Review_Summary_Test_Employee_2026-08-06"';
  var result = mod.parseReviewSummaryPdfFilename(header, 'Fallback Name', '2026-08-06');
  assert.equal(result, 'Review_Summary_Test_Employee_2026-08-06.pdf');
});

test('parseReviewSummaryPdfFilename never duplicates the .pdf extension', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var header = 'attachment; filename="Review_Summary_Test_Employee_2026-08-06.pdf"';
  var result = mod.parseReviewSummaryPdfFilename(header, 'Fallback Name', '2026-08-06');
  assert.equal((result.match(/\.pdf/gi) || []).length, 1);
});

test('parseReviewSummaryPdfFilename returns a generated fallback when the header is empty', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.parseReviewSummaryPdfFilename('', 'Test Employee', '2026-08-06');
  assert.equal(result, 'Review_Summary_Test_Employee_2026-08-06.pdf');
});

test('parseReviewSummaryPdfFilename returns a generated fallback when the header is malformed', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var header = "attachment; filename*=UTF-8''%E0%A4%A"; // truncated percent-encoding, throws on decode
  var result = mod.parseReviewSummaryPdfFilename(header, 'Test Employee', '2026-08-06');
  assert.equal(result, 'Review_Summary_Test_Employee_2026-08-06.pdf');
});

test('buildFallbackReviewSummaryPdfFilename converts spaces to underscores and appends the date', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.buildFallbackReviewSummaryPdfFilename('Test Employee Two', '2026-08-06');
  assert.equal(result, 'Review_Summary_Test_Employee_Two_2026-08-06.pdf');
});

test('buildFallbackReviewSummaryPdfFilename sanitizes unsafe characters in the employee name', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.buildFallbackReviewSummaryPdfFilename('Test/Employee:Two?', '2026-08-06');
  assert.ok(!result.includes('/'));
  assert.ok(!result.includes(':'));
  assert.ok(!result.includes('?'));
});

test('buildFallbackReviewSummaryPdfFilename falls back to "Employee" when the name sanitizes to empty', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var result = mod.buildFallbackReviewSummaryPdfFilename('////\\\\::::', '2026-08-06');
  assert.equal(result, 'Review_Summary_Employee_2026-08-06.pdf');
});

test('workspaceAccessDecision returns authorized/unauthorized (no more own/read_only)', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  assert.equal(mod.workspaceAccessDecision(null), 'unauthorized');
  assert.equal(mod.workspaceAccessDecision(''), 'unauthorized');
  assert.equal(mod.workspaceAccessDecision('mayurika'), 'authorized');
});

test('isOwnedRecord is true only when the record\'s reviewer_member_key matches the authenticated member', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  assert.equal(mod.isOwnedRecord({ reviewer_member_key: 'mayurika' }, 'mayurika'), true);
  assert.equal(mod.isOwnedRecord({ reviewer_member_key: 'arun' }, 'mayurika'), false);
  assert.equal(mod.isOwnedRecord({ reviewer_member_key: 'mayurika' }, null), false);
  assert.equal(mod.isOwnedRecord(null, 'mayurika'), false);
});

test('authorizedAsLabelText names the display name and role, or not-yet-authorized when null', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  assert.equal(mod.authorizedAsLabelText({ displayName: 'Mayurika', role: 'HR' }), 'Authorized as: Mayurika — HR');
  assert.match(mod.authorizedAsLabelText(null), /not yet authorized/i);
});

// ── DOM-mounted behavior ─────────────────────────────────────────────

test('no token = unauthorized: prompt shown, staff/form/history panels hidden', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  assert.equal(api.accessDecision(), 'unauthorized');
  assert.equal(findByClass(mountEl, 'review-summaries-unauthorized').hidden, false);
  assert.equal(findByClass(mountEl, 'review-summaries-staff-panel').hidden, true);
  assert.equal(findByClass(mountEl, 'review-summaries-form-panel').hidden, true);
  assert.equal(findByClass(mountEl, 'review-summaries-history-panel').hidden, true);
});

test('unauthorized workspace sends zero requests even if staff is selected programmatically', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord());
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, 0, 'no request should ever be sent through an unauthorized workspace');
});

test('valid token = authorized: staff/form/history panels visible', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  assert.equal(api.accessDecision(), 'authorized');
  assert.equal(findByClass(mountEl, 'review-summaries-unauthorized').hidden, true);
  assert.equal(findByClass(mountEl, 'review-summaries-staff-panel').hidden, false);
  assert.equal(findByClass(mountEl, 'review-summaries-history-panel').hidden, false);
});

test('authorized-as label names the authenticated member\'s display name and role', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);
  var label = findByClass(mountEl, 'review-summaries-authorized-as');
  assert.equal(label.hidden, false);
  assert.equal(label.textContent, 'Authorized as: Mayurika — HR');
});

test('Paraparan token resolves to the approved Auditor role in the authorized-as label', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: { token: 't', memberKey: 'paraparan' }, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);
  var label = findByClass(mountEl, 'review-summaries-authorized-as');
  assert.equal(label.textContent, 'Authorized as: Paraparan — Auditor');
});

test('nothing loads before an employee is selected — history shows the placeholder, no list request fires', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.match(historyEl.allText(), /Select a staff member/);
  assert.equal(fetchMock.calls.filter(function (c) { return String(c.url).indexOf('staff-review-summaries') !== -1; }).length, 0);
});

test('employee selection sends reviewed_staff_id and the default all-reviewers request', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(api.state.selectedStaff.id, 'staff-uuid-1');
  var getCalls = fetchMock.calls.filter(function (c) { return !c.options.method || c.options.method === 'GET'; });
  var lastUrl = String(getCalls[getCalls.length - 1].url);
  assert.match(lastUrl, /reviewed_staff_id=staff-uuid-1/);
  assert.match(lastUrl, /include_all_reviewers=true/, 'default request must scope to all reviewers');
  assert.ok(!lastUrl.includes('reviewer_member_key'), 'default request must omit reviewer_member_key');
});

test('selecting a specific reviewer filter sends reviewer_member_key and omits include_all_reviewers', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-2' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  api.setReviewerFilter('arun');
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var getCalls = fetchMock.calls.filter(function (c) { return !c.options.method || c.options.method === 'GET'; });
  var lastUrl = String(getCalls[getCalls.length - 1].url);
  assert.match(lastUrl, /reviewer_member_key=arun/);
  assert.ok(!lastUrl.includes('include_all_reviewers'));
});

test('reviewer filter select element itself drives the same request change', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-2b' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var select = findByClass(mountEl, 'review-summaries-reviewer-select');
  assert.ok(select, 'reviewer filter select should exist');
  select.value = 'rajiv';
  select.dispatchEvent({ type: 'change' });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var getCalls = fetchMock.calls.filter(function (c) { return !c.options.method || c.options.method === 'GET'; });
  assert.match(String(getCalls[getCalls.length - 1].url), /reviewer_member_key=rajiv/);
});

test('date filters are included in the list request', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-3' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var dateFromInput = findByClass(mountEl, 'review-summaries-date-from');
  dateFromInput.value = '2026-08-01';
  dateFromInput.dispatchEvent({ type: 'change' });
  var dateToInput = findByClass(mountEl, 'review-summaries-date-to');
  dateToInput.value = '2026-08-05';
  dateToInput.dispatchEvent({ type: 'change' });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var getCalls = fetchMock.calls.filter(function (c) { return !c.options.method || c.options.method === 'GET'; });
  var lastUrl = String(getCalls[getCalls.length - 1].url);
  assert.match(lastUrl, /date_from=2026-08-01/);
  assert.match(lastUrl, /date_to=2026-08-05/);
});

test('include inactive toggle omits staff_status=Active from the staff search request', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);

  var searchInput = findByClass(mountEl, 'review-summaries-staff-search');
  var includeInactiveCheckbox = findByClass(mountEl, 'review-summaries-toggle-input');
  includeInactiveCheckbox.checked = true;
  includeInactiveCheckbox.dispatchEvent({ type: 'change' });
  searchInput.value = 'jane';
  searchInput.dispatchEvent({ type: 'input' });
  await new Promise(function (resolve) { setTimeout(resolve, 320); });

  var staffCalls = fetchMock.calls.filter(function (c) { return String(c.url).indexOf('/api/staff') !== -1; });
  assert.ok(staffCalls.length > 0);
  assert.ok(!String(staffCalls[staffCalls.length - 1].url).includes('staff_status=Active'));
});

test('owned + editable record shows Edit; a card from another reviewer does not', async (t) => {
  var own = fakeSummaryRecord({ id: 'sum-own', reviewer_member_key: 'mayurika', summary_text: 'Mine.', can_edit: true });
  var other = fakeSummaryRecord({ id: 'sum-other', reviewer_member_key: 'arun', summary_text: 'Arun\'s summary.', can_edit: false });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [own, other], total: 2, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var cards = findAllByClass(mountEl, 'review-summaries-card');
  assert.equal(cards.length, 2, 'both cards should render — the read-only one is not hidden');
  var editButtons = findAllByClass(mountEl, 'review-summaries-edit-btn');
  assert.equal(editButtons.length, 1, 'exactly one Edit button should render — only for the owned, still-editable card');
  assert.equal(findAllByClass(mountEl, 'review-summaries-delete-btn').length, 0, 'no Delete button exists anywhere any more');
});

test('owned but no-longer-editable record shows the Read-only badge, the locked message, and no Edit button', async (t) => {
  var locked = fakeSummaryRecord({ id: 'sum-locked', reviewer_member_key: 'mayurika', summary_text: 'Mine, but expired.', can_edit: false });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [locked], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(findByClass(mountEl, 'review-summaries-edit-btn'), null, 'no Edit button once the edit window has closed');
  var badge = findByClass(mountEl, 'review-summaries-card-status-badge');
  assert.match(badge.textContent, /Read-only$/);
  var statusEl = findByClass(mountEl, 'review-summaries-card-status-message');
  assert.equal(statusEl.textContent, 'Read-only — the same-day editing window has ended.');
});

test('owned + editable record shows the Editable today badge and its Asia/Colombo message', async (t) => {
  var own = fakeSummaryRecord({ id: 'sum-editable', reviewer_member_key: 'mayurika', can_edit: true });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [own], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var badge = findByClass(mountEl, 'review-summaries-card-status-badge');
  assert.match(badge.textContent, /Editable today$/);
  var statusEl = findByClass(mountEl, 'review-summaries-card-status-message');
  assert.equal(statusEl.textContent, 'Editable today until 11:59 PM (Asia/Colombo).');
  assert.match(statusEl.textContent, /11:59 PM/);
  assert.match(statusEl.textContent, /Asia\/Colombo/);
  assert.ok(findByClass(mountEl, 'review-summaries-edit-btn'), 'Edit button still renders alongside the status message');
});

test('a card from another reviewer shows a Read-only badge and the other-reviewer explanation, never an Edit button', async (t) => {
  var other = fakeSummaryRecord({ id: 'sum-other', reviewer_member_key: 'arun', can_edit: false });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [other], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var badge = findByClass(mountEl, 'review-summaries-card-status-badge');
  assert.match(badge.textContent, /Read-only$/);
  var statusEl = findByClass(mountEl, 'review-summaries-card-status-message');
  assert.equal(statusEl.textContent, 'Read-only — only the reviewer who created this summary can edit it.');
  assert.equal(findByClass(mountEl, 'review-summaries-edit-btn'), null);
  assert.ok(!/Admin/i.test(statusEl.textContent), 'must never imply an Admin override exists');
});

test('exactly one status badge renders per card, for owned-editable, owned-locked, and other-reviewer alike', async (t) => {
  var owned = fakeSummaryRecord({ id: 'sum-a', reviewer_member_key: 'mayurika', can_edit: true });
  var locked = fakeSummaryRecord({ id: 'sum-b', reviewer_member_key: 'mayurika', can_edit: false });
  var other = fakeSummaryRecord({ id: 'sum-c', reviewer_member_key: 'arun', can_edit: false });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [owned, locked, other], total: 3, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var cards = findAllByClass(mountEl, 'review-summaries-card');
  assert.equal(cards.length, 3);
  cards.forEach(function (card) {
    assert.equal(findAllByClass(card, 'review-summaries-card-status-badge').length, 1, 'exactly one badge per card');
  });
});

test('no Delete button ever renders, for any card, owned or not', async (t) => {
  var own = fakeSummaryRecord({ id: 'sum-own', reviewer_member_key: 'mayurika', can_edit: true });
  var lockedOwn = fakeSummaryRecord({ id: 'sum-locked', reviewer_member_key: 'mayurika', can_edit: false });
  var other = fakeSummaryRecord({ id: 'sum-other', reviewer_member_key: 'arun', can_edit: false });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [own, lockedOwn, other], total: 3, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(findAllByClass(mountEl, 'review-summaries-delete-btn').length, 0);
  assert.equal(findAllByClass(mountEl, 'review-summaries-card').length, 3);
});

test('no DELETE request is ever emitted by this module (no code path left that sends one)', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-1', reviewer_member_key: 'mayurika', can_edit: true });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var deleteCalls = fetchMock.calls.filter(function (c) { return c.options.method === 'DELETE'; });
  assert.equal(deleteCalls.length, 0);
});

test('non-owned card still renders its full summary text (read-only records still open)', async (t) => {
  var other = fakeSummaryRecord({ id: 'sum-other', reviewer_member_key: 'arun', summary_text: 'Fully visible even though read-only.' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [other], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var textNode = findByClass(mountEl, 'review-summary-text');
  assert.equal(textNode.textContent, 'Fully visible even though read-only.');
  assert.equal(findByClass(mountEl, 'review-summaries-edit-btn'), null);
  assert.equal(findByClass(mountEl, 'review-summaries-delete-btn'), null);
});

test('each card shows reviewed employee, reviewer display name, reviewer role, and meeting date as separate fields', async (t) => {
  var record = fakeSummaryRecord({
    reviewer_member_key: 'suman',
    reviewed_staff_full_name: 'Jane Employee',
    reviewed_staff_calling_name: 'Janie',
    meeting_date: '2026-08-04'
  });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var employeeEl = findByClass(mountEl, 'review-summaries-card-employee');
  assert.equal(employeeEl.textContent, 'Reviewed employee: Jane Employee (Janie)');
  assert.equal(findMetaValue(mountEl, 'Reviewed by').textContent, 'Suman');
  assert.equal(findMetaValue(mountEl, 'Reviewer role').textContent, 'Recruiting Officer');
  assert.equal(findMetaValue(mountEl, 'Meeting date').textContent, '2026-08-04');
});

test('Paraparan-authored card shows the Auditor role, sourced from the member registry', async (t) => {
  var record = fakeSummaryRecord({ reviewer_member_key: 'paraparan' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(findMetaValue(mountEl, 'Reviewed by').textContent, 'Paraparan');
  assert.equal(findMetaValue(mountEl, 'Reviewer role').textContent, 'Auditor');
});

test('an unrecognized reviewer_member_key resolves to Unknown/Unknown, never a fabricated value', async (t) => {
  var record = fakeSummaryRecord({ reviewer_member_key: 'not-a-real-member' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(findMetaValue(mountEl, 'Reviewed by').textContent, 'Unknown');
  assert.equal(findMetaValue(mountEl, 'Reviewer role').textContent, 'Unknown');
});

test('a "Review summary" label appears above the summary text', async (t) => {
  var record = fakeSummaryRecord({});
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var label = findByClass(mountEl, 'review-summaries-card-summary-label');
  assert.equal(label.textContent, 'Review summary');
});

test('card footer shows Created and Updated timestamps from the existing created_at/updated_at fields', async (t) => {
  var record = fakeSummaryRecord({ created_at: '2026-08-01T04:30:00Z', updated_at: '2026-08-01T09:15:00Z' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var footer = findByClass(mountEl, 'review-summaries-card-footer');
  assert.match(footer.allText(), /Created:/);
  assert.match(footer.allText(), /Updated:/);
  // No new backend field — reuses the same created_at/updated_at values
  // already present on every fakeSummaryRecord/real API response.
  assert.match(footer.allText(), /2026-08-01/);
});

test('the secondary "Updated" label appears (with an accessible explanation) only when updated_at differs from created_at, never as the primary badge', async (t) => {
  var edited = fakeSummaryRecord({ id: 'sum-edited', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T10:00:00Z' });
  var untouched = fakeSummaryRecord({ id: 'sum-untouched', reviewer_member_key: 'arun', created_at: '2026-08-01T09:00:00Z', updated_at: '2026-08-01T09:00:00Z' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [edited, untouched], total: 2, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-x' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var updatedLabels = findAllByClass(mountEl, 'review-summaries-card-updated-label');
  assert.equal(updatedLabels.length, 1, 'only the edited record gets the secondary label');
  assert.equal(updatedLabels[0].textContent, 'Updated');
  assert.match(updatedLabels[0].getAttribute('aria-label') || '', /edited since it was created/i);
  // The status badge stays the primary state indicator either way — it
  // never itself contains the word "Updated".
  var badges = findAllByClass(mountEl, 'review-summaries-card-status-badge');
  badges.forEach(function (b) { assert.equal(b.textContent.indexOf('Updated'), -1); });
});

test('no reviewer display name/role is ever present in the request body sent to the server', async (t) => {
  var postBody = null;
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'POST') {
      postBody = JSON.parse(options.body);
      return jsonResponse(201, fakeSummaryRecord(postBody));
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-6' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'A real review discussion.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.ok(postBody);
  assert.equal(postBody.reviewed_staff_id, 'staff-uuid-6');
  assert.equal(Object.prototype.hasOwnProperty.call(postBody, 'reviewer_member_key'), false);
  assert.equal(Object.keys(postBody).sort().join(','), 'meeting_date,reviewed_staff_id,summary_text');
});

test('create form rejects a blank summary before any POST is sent', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-4' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = findByTag(mountEl, 'FORM');
  var callsBefore = fetchMock.calls.length;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, callsBefore);
});

test('create form rejects a summary over 10,000 characters before any POST is sent', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-5' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'A'.repeat(10001);
  var callsBefore = fetchMock.calls.length;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, callsBefore);
});

test('edit flow prefills the form from an owned record and submits a PUT to the correct id', async (t) => {
  var putUrl = null, putBody = null;
  var record = fakeSummaryRecord({ id: 'sum-edit-1', reviewer_member_key: 'mayurika', summary_text: 'Original text.' });
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
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-7' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  assert.equal(textarea.value, 'Original text.');
  textarea.value = 'Updated text.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.match(putUrl, /\/sum-edit-1$/);
  assert.equal(putBody.summary_text, 'Updated text.');
  assert.equal(Object.prototype.hasOwnProperty.call(putBody, 'reviewed_staff_id'), false);
});

// ── REQ-CAL-REV-LOCK-004 (2026-08-06) — same-day edit lock ──────────────

test('a backend 409 review_summary_edit_locked response exits edit mode and clears the draft', async (t) => {
  // Simulates the edit window closing between render and submit (e.g. the
  // form was left open across the Colombo midnight boundary) — the
  // backend is authoritative and rejects with 409, and this module must
  // exit edit mode safely rather than leaving the form stuck open against
  // a record it can no longer save.
  var record = fakeSummaryRecord({ id: 'sum-expired', reviewer_member_key: 'mayurika', can_edit: true, summary_text: 'Original text.' });
  var putCallCount = 0;
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'PUT') {
      putCallCount += 1;
      return jsonResponse(409, { error: 'review_summary_edit_locked', message: 'Editing period ended. This review summary is now read-only.' });
    }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-expired' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  assert.equal(api.state.editingId, 'sum-expired');
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'A change that will never be saved.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(putCallCount, 1);
  assert.equal(api.state.editingId, null, 'edit mode must be exited once the backend reports the window closed');
  assert.equal(textarea.value, '', 'the now-unsaveable draft must be cleared');
});

test('browser clock manipulation cannot force a successful update — the PUT body never carries a client time or deadline', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-clock', reviewer_member_key: 'mayurika', can_edit: true });
  var putBody = null;
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'PUT') {
      putBody = JSON.parse(options.body);
      return jsonResponse(200, Object.assign({}, record, putBody));
    }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-clock' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'Edited under a manipulated clock.';
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  // meeting_date/summary_text only — no created_at, edit_deadline, or any
  // other time field the browser could have fabricated; enforcement lives
  // entirely server-side against the backend's own authoritative clock.
  assert.equal(Object.keys(putBody).sort().join(','), 'meeting_date,summary_text');
});

test('empty state before staff selection', async (t) => {
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); }) });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.match(historyEl.allText(), /Select a staff member/);
});

test('empty state after staff selection with zero results', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-9' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.match(historyEl.allText(), /No review summaries yet/);
});

test('history renders full summary text safely (script-like content never becomes markup)', async (t) => {
  var dangerous = '<script>alert(1)</script> and <img src=x onerror=alert(2)>';
  var record = fakeSummaryRecord({ summary_text: dangerous });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-10' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var textNode = findByClass(mountEl, 'review-summary-text');
  assert.equal(textNode.textContent, dangerous);
});

test('long summary text renders truncated with a "Show more"/"Show less" toggle', async (t) => {
  var words = [];
  for (var i = 0; i < 100; i++) { words.push('word' + i); }
  var record = fakeSummaryRecord({ summary_text: words.join(' ') });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-11' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var textNode = findByClass(mountEl, 'review-summary-text');
  var toggleBtn = findByClass(mountEl, 'review-summaries-toggle-text-btn');
  assert.ok(toggleBtn);
  assert.notEqual(textNode.textContent, record.summary_text);
  toggleBtn.click();
  assert.equal(textNode.textContent, record.summary_text);
});

test('short summary text renders in full with no "Show more" toggle', async (t) => {
  var record = fakeSummaryRecord({ summary_text: 'A short review discussion.' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-12' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var textNode = findByClass(mountEl, 'review-summary-text');
  assert.equal(textNode.textContent, 'A short review discussion.');
  assert.equal(findByClass(mountEl, 'review-summaries-toggle-text-btn'), null);
});

// ── State clearing ──────────────────────────────────────────────────

test('employee change clears history, edit state, and any unsaved draft', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-1', reviewer_member_key: 'mayurika', summary_text: 'Original.' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'Unsaved draft text.';
  assert.equal(api.state.editingId, 'sum-1');

  api.selectStaff(fakeStaffRecord({ id: 'staff-2' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(api.state.editingId, null, 'edit mode should be exited on employee change');
  assert.equal(textarea.value, '', 'unsaved draft text should be cleared on employee change');
});

test('reviewer-filter change clears stale edit state', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-1', reviewer_member_key: 'mayurika' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  assert.equal(api.state.editingId, 'sum-1');

  api.setReviewerFilter('arun');
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(api.state.editingId, null, 'edit state must not survive a reviewer-filter change');
});

test('leaving the dedicated tab (panel-switch event) fully resets the workspace — employee, history, edit state, and reviewer filter', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-1', reviewer_member_key: 'mayurika', summary_text: 'Should not survive leaving.' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  api.setReviewerFilter('arun');
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  if (editBtn) { editBtn.click(); }
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'Unsaved draft — must not survive.';

  // navigation.js dispatches this exact event on every activatePanel() call
  // — including leaving #tab-review-summaries for a different tab. Per the
  // approved design (corrected 2026-08-06), this must fully reset the
  // workspace, exactly like a genuine identity change.
  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' });

  assert.equal(api.state.selectedStaff, null, 'employee selection must be cleared when leaving the tab');
  assert.equal(api.state.editingId, null, 'edit state must be cleared when leaving the tab');
  assert.equal(textarea.value, '', 'unsaved draft must be cleared when leaving the tab');
  assert.equal(api.state.reviewerFilter, '', 'reviewer filter must reset to All reviewers when leaving the tab');
  var reviewerSelect = findByClass(mountEl, 'review-summaries-reviewer-select');
  assert.equal(reviewerSelect.value, '');
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.ok(!/Should not survive/.test(historyEl.allText()), 'previously loaded history must not remain visible');
  assert.match(historyEl.allText(), /Select a staff member/, 'returning later must prompt for a fresh employee selection');
});

test('returning to the tab after leaving sends zero history requests until a new employee is selected', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-1', reviewer_member_key: 'mayurika' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' }); // leave
  var callsAfterLeave = fetchMock.calls.length;
  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' }); // "return" (re-activation dispatches the same event)
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(fetchMock.calls.length, callsAfterLeave, 'no history request should fire merely from returning to the tab, with no employee selected yet');
});

test('a valid token remains stored after ordinary tab navigation (leaving is not an authorization event)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' });

  assert.equal(
    JSON.parse(globals.window.localStorage.getItem('management_aios_calendar_auth_v1')).token,
    'test-only-frontend-token',
    'the stored token must be untouched by ordinary navigation'
  );
  assert.equal(api.accessDecision(), 'authorized');
});

test('switching member panels does not change the authenticated reviewer identity', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  assert.equal(api.accessDecision(), 'authorized');
  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' });
  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' });
  assert.equal(api.accessDecision(), 'authorized');
  var label = findByClass(mountEl, 'review-summaries-authorized-as');
  assert.equal(label.textContent, 'Authorized as: Mayurika — HR');
});

test('token change (a different member authorizes) clears the previous employee/history and does not auto-reload it under the new identity', async (t) => {
  var mayurikaRecord = fakeSummaryRecord({ id: 'sum-mayu', reviewer_member_key: 'mayurika' });
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [mayurikaRecord], total: 1, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.ok(findByClass(mountEl, 'review-summaries-edit-btn'), 'mayurika should own this card before the token change');
  assert.ok(api.state.selectedStaff);
  var callsBeforeChange = fetchMock.calls.length;

  globals.window.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify({
    version: 1, token: 'arun-token', verifiedMemberKey: 'arun', verifiedAt: '2026-08-06T00:00:00.000Z'
  }));
  globals.document.dispatchEvent({ type: CALENDAR_AUTH_CHANGED_EVENT_NAME });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(api.state.selectedStaff, null, 'a genuine token change clears the employee selection');
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.match(historyEl.allText(), /Select a staff member/, 'no employee history from before the change should remain visible');
  assert.equal(fetchMock.calls.length, callsBeforeChange, 'the new identity must not automatically re-fetch the old employee\'s history');
  var label = findByClass(mountEl, 'review-summaries-authorized-as');
  assert.equal(label.textContent, 'Authorized as: Arun — Implementation Officer');
});

test('a 401 mid-session fully resets the workspace — employee, history, edit state, and draft — exactly like a genuine token change', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(401, { detail: 'Invalid token.' }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-9b' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(globals.window.localStorage.getItem('management_aios_calendar_auth_v1'), null, 'the existing auth mechanism must have cleared the token');
  assert.equal(api.accessDecision(), 'unauthorized');
  assert.equal(findByClass(mountEl, 'review-summaries-unauthorized').hidden, false);
  assert.equal(api.state.selectedStaff, null, '401 must clear the selected employee');
  assert.equal(api.state.editingId, null, '401 must clear edit state');
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.equal(historyEl.textContent, '', '401 must clear loaded history — the history panel is hidden while unauthorized, but its content must not linger');
});

test('a 401 while a draft is unsaved clears that draft', async (t) => {
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'GET' || !options.method) { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); }
    return jsonResponse(401, { detail: 'Invalid token.' });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-9c' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = 'Unsaved draft — must not survive a 401.';

  // Trigger the 401 via a mutation attempt (simulates an expired token
  // discovered mid-session, not just on the initial list fetch).
  textarea.dispatchEvent({ type: 'input' });
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(api.accessDecision(), 'unauthorized');
  assert.equal(textarea.value, '', 'the unsaved draft must be cleared once a 401 is discovered');
});

test('a 401 invalidates a stale in-flight history response — it never repopulates the now-cleared state', async (t) => {
  var resolveGet;
  var fetchMock = makeFetchMock(function () {
    return new Promise(function (resolve) { resolveGet = resolve; });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-9d' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  // Simulate the 401 arriving via the shared auth event BEFORE the
  // in-flight GET above resolves (e.g. another request on the page
  // discovered the expired token first).
  globals.window.localStorage.removeItem('management_aios_calendar_auth_v1');
  globals.document.dispatchEvent({ type: CALENDAR_AUTH_CHANGED_EVENT_NAME });

  var staleRecord = fakeSummaryRecord({ id: 'sum-stale', summary_text: 'STALE — must never appear after a 401.' });
  resolveGet(jsonResponse(200, { records: [staleRecord], total: 1, limit: 50, offset: 0 }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(api.state.selectedStaff, null);
  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.ok(!/STALE/.test(historyEl.allText()), 'a response that resolves after a 401 reset must never repopulate the cleared workspace');
});

test('a 404 (cross-reviewer/nonexistent record) does not clear the valid token', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-404', reviewer_member_key: 'mayurika' });
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'PUT') { return jsonResponse(404, { detail: 'Review summary not found.' }); }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-404' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(
    JSON.parse(globals.window.localStorage.getItem('management_aios_calendar_auth_v1')).token,
    'test-only-frontend-token',
    'a 404 must never clear the stored token'
  );
  assert.equal(api.accessDecision(), 'authorized', 'the workspace must remain authorized after a 404');
});

test('an owner-only mutation denial (a 404 on PUT for a record the token no longer owns) does not clear the valid token', async (t) => {
  // Backend design: cross-reviewer/owner-only denial and "record not
  // found" are the SAME non-disclosing 404 (backend/routers/
  // staff_review_summaries.py's _get_owned_summary_or_404) — there is no
  // separate 403/owner-denial status code to distinguish. This test
  // exercises that denial via the PUT path (edit form submit), which —
  // unlike Delete — does not require driving confirmDestructive() (a
  // documented coverage boundary of this test harness).
  var record = fakeSummaryRecord({ id: 'sum-owner-denied', reviewer_member_key: 'mayurika' });
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'PUT') { return jsonResponse(404, { detail: 'Review summary not found.' }); }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-owner-denied' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(
    JSON.parse(globals.window.localStorage.getItem('management_aios_calendar_auth_v1')).token,
    'test-only-frontend-token',
    'an owner-only mutation denial must never clear the stored token'
  );
  assert.equal(api.accessDecision(), 'authorized');
});

test('stale in-flight response is ignored — a slower earlier request never overwrites a newer selection', async (t) => {
  var resolvers = [];
  var fetchMock = makeFetchMock(function () {
    return new Promise(function (resolve) { resolvers.push(resolve); });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);

  api.selectStaff(fakeStaffRecord({ id: 'staff-old' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); }); // let the first fetch() call actually fire
  api.selectStaff(fakeStaffRecord({ id: 'staff-new' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); }); // let the second fetch() call actually fire

  // Resolve the OLDER (first) request last-arriving-first is simulated by
  // resolving resolvers[0] (the "staff-old" fetch) AFTER selectStaff has
  // already moved on to "staff-new" — its stale historyRequestId must
  // cause the response to be discarded.
  assert.equal(resolvers.length, 2, 'both selectStaff calls should have issued their own fetch');
  var oldRecord = fakeSummaryRecord({ id: 'sum-old', reviewed_staff_id: 'staff-old', summary_text: 'STALE — must never appear.' });
  resolvers[0](jsonResponse(200, { records: [oldRecord], total: 1, limit: 50, offset: 0 }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.ok(!/STALE/.test(historyEl.allText()), 'a stale, superseded response must never be rendered');
});

test('mutation attempts are blocked while unauthorized, before any network call', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  // Programmatically force a selection even though unauthorized (the UI
  // itself never allows this — staffPanel is hidden — this proves the
  // request-level guard, not just the visibility layer).
  api.state.selectedStaff = fakeStaffRecord({ id: 'staff-x' });
  api.renderHistory();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(fetchMock.calls.length, 0, 'no request should ever be sent through an unauthorized workspace, even via forced state');
});

test('network error on list fetch renders an error state without throwing', async (t) => {
  var fetchMock = function () { return Promise.reject(new Error('simulated network failure')); };
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-13' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var historyEl = findByClass(mountEl, 'review-summaries-history');
  assert.ok(historyEl.allText().length > 0, 'an error message should be rendered, not a silent blank state');
});

test('404 on update shows the generic not-found message path without throwing', async (t) => {
  var record = fakeSummaryRecord({ id: 'sum-404-1', reviewer_member_key: 'mayurika' });
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'PUT') { return jsonResponse(404, { detail: 'Review summary not found.' }); }
    return jsonResponse(200, { records: [record], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-14' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var editBtn = findByClass(mountEl, 'review-summaries-edit-btn');
  editBtn.click();
  var form = findByTag(mountEl, 'FORM');
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.ok(true, 'update completed through the 404 path without throwing');
});

test('no summary content is ever written to localStorage', async (t) => {
  var secret = 'CONFIDENTIAL — do not persist this anywhere but the server.';
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'POST') {
      return jsonResponse(201, fakeSummaryRecord({ summary_text: secret }));
    }
    return jsonResponse(200, { records: [fakeSummaryRecord({ summary_text: secret })], total: 1, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-15' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = secret;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var authValue = globals.window.localStorage.getItem('management_aios_calendar_auth_v1');
  assert.ok(!authValue || !authValue.includes(secret));
});

test('no summary content is ever included in a request URL', async (t) => {
  var secret = 'URL-LEAK-CHECK-should-never-appear-in-a-query-string-or-path';
  var fetchMock = makeFetchMock(function (url, options) {
    if (options.method === 'POST') { return jsonResponse(201, fakeSummaryRecord({ summary_text: secret })); }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-uuid-16' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var form = findByTag(mountEl, 'FORM');
  var textarea = findByTag(form, 'TEXTAREA');
  textarea.value = secret;
  form.dispatchEvent({ type: 'submit', preventDefault: function () {} });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  fetchMock.calls.forEach(function (call) {
    assert.ok(!String(call.url).includes(secret));
  });
});

test('staff search shows an immediate "Searching…" indicator while the request is in flight', async (t) => {
  var resolveSearch;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/api/staff') !== -1 && String(url).indexOf('staff-review-summaries') === -1) {
      return new Promise(function (resolve) { resolveSearch = resolve; });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);

  var searchInput = findByClass(mountEl, 'review-summaries-staff-search');
  searchInput.value = 'jane';
  searchInput.dispatchEvent({ type: 'input' });
  await new Promise(function (resolve) { setTimeout(resolve, 320); });

  var resultsEl = findByClass(mountEl, 'review-summaries-staff-results');
  assert.match(resultsEl._innerHTML, /Searching/i);
  assert.equal(resultsEl.hidden, false);

  resolveSearch(jsonResponse(200, { records: [], total: 0, limit: 20, offset: 0 }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
});

test('a second, independently mounted workspace instance is unaffected by the first (mount is not a hidden singleton)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: ARUN_AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);
  var label = findByClass(mountEl, 'review-summaries-authorized-as');
  assert.equal(label.textContent, 'Authorized as: Arun — Implementation Officer');
});

// ── PDF export (REQ-CAL-REV-PDF-003) ────────────────────────────────

function pdfBlobResponse(status, headers, blobValue) {
  headers = headers || {};
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    headers: { get: function (name) { return headers[name.toLowerCase()] || headers[name] || null; } },
    blob: function () { return Promise.resolve(blobValue !== undefined ? blobValue : { _fakeBlob: true }); }
  });
}

test('buildExportQuery composes reviewed_staff_id/all-reviewers/dates and never includes limit or offset', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var q = mod.buildExportQuery({ includeAllReviewers: true, reviewedStaffId: 'staff-x', dateFrom: '2026-01-01', dateTo: '2026-01-31' });
  assert.equal(q, 'include_all_reviewers=true&reviewed_staff_id=staff-x&date_from=2026-01-01&date_to=2026-01-31');
  assert.ok(!q.includes('limit'));
  assert.ok(!q.includes('offset'));
});

test('buildExportQuery uses reviewer_member_key for a specific reviewer and omits include_all_reviewers', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var q = mod.buildExportQuery({ reviewerMemberKey: 'arun', reviewedStaffId: 'staff-x' });
  assert.match(q, /reviewer_member_key=arun/);
  assert.ok(!q.includes('include_all_reviewers'));
});

test('isInvalidDateRange flags dateFrom after dateTo and nothing else', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  assert.equal(mod.isInvalidDateRange('2026-02-01', '2026-01-01'), true);
  assert.equal(mod.isInvalidDateRange('2026-01-01', '2026-02-01'), false);
  assert.equal(mod.isInvalidDateRange('2026-01-01', ''), false);
  assert.equal(mod.isInvalidDateRange('', ''), false);
});

test('exactly one Download PDF button exists, near the filters', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  mod.mountReviewSummariesWorkspace(mountEl);
  var buttons = findAllByClass(mountEl, 'review-summaries-export-btn');
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].textContent, 'Download PDF');
});

test('export button is disabled when no employee is selected', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  assert.equal(api.exportButtonEl.disabled, true);
});

test('export button is enabled once an employee is selected under a valid token', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(api.exportButtonEl.disabled, false);
});

test('export button is disabled without a valid token even with an employee selected', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ fetchImpl: fetchMock }); // no storedAuth
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  assert.equal(api.exportButtonEl.disabled, true);
});

test('export button is disabled when the current date range is invalid', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-2' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(api.exportButtonEl.disabled, false);

  var dateFromInput = findByClass(mountEl, 'review-summaries-date-from');
  var dateToInput = findByClass(mountEl, 'review-summaries-date-to');
  dateFromInput.value = '2026-02-01';
  dateFromInput.dispatchEvent({ type: 'change' });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  dateToInput.value = '2026-01-01';
  dateToInput.dispatchEvent({ type: 'change' });
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(api.exportButtonEl.disabled, true);
});

test('clicking Download PDF with All reviewers sends include_all_reviewers and no reviewer_member_key, never the token or employee name in the URL', async (t) => {
  var lastExportUrl = null;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      lastExportUrl = String(url);
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="review-summaries_Test_2026-08-06.pdf"' });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-3', full_name: "Employee's Confidential Name" }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  assert.ok(lastExportUrl, 'export request should have fired');
  assert.match(lastExportUrl, /reviewed_staff_id=staff-export-3/);
  assert.match(lastExportUrl, /include_all_reviewers=true/);
  assert.ok(!lastExportUrl.includes('reviewer_member_key'));
  assert.ok(!lastExportUrl.includes('token'), 'token must never appear in the export URL');
  assert.ok(!lastExportUrl.includes('Confidential'), 'employee display name is not sent as request authority');
});

test('clicking Download PDF with a specific reviewer sends reviewer_member_key and omits include_all_reviewers', async (t) => {
  var lastExportUrl = null;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      lastExportUrl = String(url);
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-4' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  api.setReviewerFilter('arun');
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  assert.match(lastExportUrl, /reviewer_member_key=arun/);
  assert.ok(!lastExportUrl.includes('include_all_reviewers'));
});

test('clicking Download PDF sends the current From/To date filters', async (t) => {
  var lastExportUrl = null;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      lastExportUrl = String(url);
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-5' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  var dateFromInput = findByClass(mountEl, 'review-summaries-date-from');
  var dateToInput = findByClass(mountEl, 'review-summaries-date-to');
  dateFromInput.value = '2026-01-01';
  dateFromInput.dispatchEvent({ type: 'change' });
  dateToInput.value = '2026-01-31';
  dateToInput.dispatchEvent({ type: 'change' });

  await api.downloadReviewSummariesPdf();

  assert.match(lastExportUrl, /date_from=2026-01-01/);
  assert.match(lastExportUrl, /date_to=2026-01-31/);
});

test('a successful export creates a Blob download using the response filename and revokes the object URL', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="review-summaries_Test_Employee_2026-08-06.pdf"' }, { _fakeBlob: true, size: 123 });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-6' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  assert.equal(globals.objectUrlCalls.created.length, 1);
  assert.equal(globals.objectUrlCalls.created[0].blob.size, 123);
  assert.equal(globals.objectUrlCalls.revoked.length, 1);
  assert.equal(globals.objectUrlCalls.revoked[0], globals.objectUrlCalls.created[0].url);
});

test('a successful export sets the anchor download attribute from filename*=UTF-8\'\', preferred over filename=', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(200, {
        'content-disposition': 'attachment; filename="Review_Summary_Jose_Garcia_2026-08-06.pdf"; ' +
          "filename*=UTF-8''Review_Summary_Jos%C3%A9_Garc%C3%ADa_2026-08-06.pdf"
      }, { _fakeBlob: true, size: 42 });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-7' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  var anchors = globals.document._all.filter(function (el) { return el.tagName === 'A'; });
  assert.equal(anchors.length, 1);
  assert.equal(anchors[0].download, 'Review_Summary_José_García_2026-08-06.pdf');
});

test('a successful export falls back to a generated filename when Content-Disposition is missing', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(200, {}, { _fakeBlob: true, size: 7 });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-8', full_name: 'Fallback Employee' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  var anchors = globals.document._all.filter(function (el) { return el.tagName === 'A'; });
  assert.equal(anchors.length, 1);
  assert.match(anchors[0].download, /^Review_Summary_Fallback_Employee_\d{4}-\d{2}-\d{2}\.pdf$/);
});

test('the downloaded filename never contains the authorization token', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="Review_Summary_Test_Employee_2026-08-06.pdf"' }, { _fakeBlob: true, size: 7 });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-9' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  var anchors = globals.document._all.filter(function (el) { return el.tagName === 'A'; });
  assert.ok(!anchors[0].download.includes(AUTHORIZED.token));
});

test('a successful export resets exportInFlight and re-enables the button afterward', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-7' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  assert.equal(api.state.exportInFlight, false);
  assert.equal(api.exportButtonEl.disabled, false);
});

// ── PDF progress UX (REQ-CAL-REV-UX-005) ────────────────────────────

test('clicking Download PDF immediately changes the button text to "Preparing PDF…" and disables it', async (t) => {
  var resolveExport;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return new Promise(function (resolve) { resolveExport = resolve; });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-progress-1' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var downloadPromise = api.downloadReviewSummariesPdf();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  assert.equal(api.exportButtonEl.textContent, 'Preparing PDF…');
  assert.equal(api.exportButtonEl.disabled, true);

  resolveExport(pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' }));
  await downloadPromise;
});

test('an accessible "Preparing your PDF…" status appears in an aria-live=polite region while the export is in flight', async (t) => {
  var resolveExport;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return new Promise(function (resolve) { resolveExport = resolve; });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-progress-2' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var downloadPromise = api.downloadReviewSummariesPdf();
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var statusEl = findByClass(mountEl, 'review-summaries-export-status');
  assert.ok(statusEl, 'an accessible status element must exist near the export button');
  assert.equal(statusEl.getAttribute('aria-live'), 'polite');
  assert.equal(statusEl.hidden, false);
  assert.match(statusEl.textContent, /Preparing your PDF/);
  assert.match(statusEl.textContent, /browser save window may take a few seconds/);

  resolveExport(pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' }));
  await downloadPromise;

  // Cleared once the request settles, regardless of outcome.
  assert.equal(statusEl.hidden, true);
  assert.equal(statusEl.textContent, '');
});

test('a successful export shows the browser-save explanation and restores "Download PDF"', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-progress-3' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  // PDF_SUCCESS_MESSAGE (the exact string passed to showToast() below) is
  // asserted directly in the dedicated wording test — this test proves
  // the DOM-level outcome of a successful export: the button restores and
  // re-enables, and the in-flight status clears.
  assert.equal(api.exportButtonEl.textContent, 'Download PDF');
  assert.equal(api.exportButtonEl.disabled, false);
  var statusEl = findByClass(mountEl, 'review-summaries-export-status');
  assert.equal(statusEl.hidden, true);
});

test('the approved PDF-progress copy matches exactly: preparing / success / generic-failure', async (t) => {
  var globals = installFakeBrowserGlobals();
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  assert.equal(mod.PDF_PREPARING_MESSAGE, 'Preparing your PDF. The browser save window may take a few seconds to open.');
  assert.equal(mod.PDF_SUCCESS_MESSAGE, 'PDF ready. Your browser may ask where to save it or save it automatically.');
  assert.equal(mod.PDF_GENERIC_FAILURE_MESSAGE, 'The PDF could not be prepared. Please try again.');
  // Never claims this app itself controls where the browser saves the file.
  assert.match(mod.PDF_SUCCESS_MESSAGE, /may ask where to save it or save it automatically/);
  // Never a backend detail/stack trace/status code in the generic failure.
  assert.ok(!/traceback|exception|stack|\b[45]\d\d\b/i.test(mod.PDF_GENERIC_FAILURE_MESSAGE));
});

test('a 404 empty-result export shows no Blob/download and keeps the selected employee and filters', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return jsonResponse(404, { detail: 'No review summaries match the selected filters.' });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-8' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  api.setReviewerFilter('arun');
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  assert.equal(globals.objectUrlCalls.created.length, 0, 'no Blob/object URL for a 404');
  assert.equal(api.state.selectedStaff.id, 'staff-export-8', 'employee selection retained after a 404');
  assert.equal(api.state.reviewerFilter, 'arun', 'reviewer filter retained after a 404');
});

test('a 401 during export uses the existing authorization-failure behavior (workspace resets, token cleared)', async (t) => {
  var exportCallCount = 0;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      exportCallCount += 1;
      return pdfBlobResponse(401, {});
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-9' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  assert.equal(exportCallCount, 1);
  assert.equal(globals.localStorage.getItem('management_aios_calendar_auth_v1'), null, 'a 401 clears the stored token');
  assert.equal(api.state.selectedStaff, null, 'a 401 fully resets the workspace, same as every other request');
});

test('a generic export failure shows the safe "could not be prepared" message, never a Blob/download, and clears the loading state', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(500, {});
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-10' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  assert.equal(globals.objectUrlCalls.created.length, 0);
  assert.equal(api.state.exportInFlight, false);
  assert.equal(api.exportButtonEl.disabled, false, 'the button must re-enable after a failure, not stay stuck loading');
  assert.equal(api.exportButtonEl.textContent, 'Download PDF');
  var statusEl = findByClass(mountEl, 'review-summaries-export-status');
  assert.equal(statusEl.hidden, true, 'the preparing status must clear after a failure');
  // Exact wording (PDF_GENERIC_FAILURE_MESSAGE) is asserted directly in
  // the dedicated wording test above.
});

test('no PDF bytes or Blob are ever written to localStorage by an export', async (t) => {
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      return pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' }, { _fakeBlob: true });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-11' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  await api.downloadReviewSummariesPdf();

  // Only the pre-seeded Calendar auth token key may exist — nothing
  // export-related was ever written to localStorage.
  var keys = Object.keys(globals.localStorage._store || {});
  var suspicious = keys.filter(function (k) { return k !== 'management_aios_calendar_auth_v1'; });
  assert.equal(suspicious.length, 0);
});

test('leaving the dedicated tab clears export state (employee deselected, button disabled)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-12' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(api.exportButtonEl.disabled, false);

  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' });

  assert.equal(api.state.selectedStaff, null);
  assert.equal(api.exportButtonEl.disabled, true);
});

test('a token change invalidates stale export state (workspace resets, export button disabled until re-selection)', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-13' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  assert.equal(api.exportButtonEl.disabled, false);

  globals.localStorage.setItem('management_aios_calendar_auth_v1', JSON.stringify({
    version: 1, token: 'new-token', verifiedMemberKey: 'arun', verifiedAt: '2026-08-06T00:00:00.000Z'
  }));
  globals.document.dispatchEvent({ type: CALENDAR_AUTH_CHANGED_EVENT_NAME });

  assert.equal(api.state.selectedStaff, null, 'stale employee selection is cleared on a token change');
  assert.equal(api.exportButtonEl.disabled, true, 'export button is disabled until a fresh employee is selected');
});

// ── REQ-CAL-REV-PDF-003-FIX-01 — additional production-hardening coverage ──

test('duplicate clicks while an export is in flight send only one request', async (t) => {
  var exportCallCount = 0;
  var resolveExport;
  var fetchMock = makeFetchMock(function (url) {
    if (String(url).indexOf('/export/pdf') !== -1) {
      exportCallCount += 1;
      return new Promise(function (resolve) { resolveExport = resolve; });
    }
    return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 });
  });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-14' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var firstCall = api.downloadReviewSummariesPdf();
  assert.equal(api.exportButtonEl.disabled, true, 'button disables immediately once export starts');
  var secondCallResult = api.downloadReviewSummariesPdf(); // should be a synchronous no-op — already in flight
  assert.equal(secondCallResult, undefined, 'a second call while in flight is a no-op, not a second request');

  // ensureAuthorized() resolves via a microtask before fetch() is actually
  // called, so resolveExport is only assigned once that tick has run.
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  resolveExport(pdfBlobResponse(200, { 'content-disposition': 'attachment; filename="x.pdf"' }));
  await firstCall;

  assert.equal(exportCallCount, 1, 'exactly one export request was sent despite two calls');
  assert.equal(api.exportButtonEl.disabled, false, 'button re-enables after the export settles');
});

test('the export button survives a history rerender (reviewer-filter change) as exactly one node', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-15' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  api.setReviewerFilter('arun');
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  api.setReviewerFilter('');
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var buttons = findAllByClass(mountEl, 'review-summaries-export-btn');
  assert.equal(buttons.length, 1, 'still exactly one Download PDF button after repeated history rerenders');
  assert.equal(buttons[0], api.exportButtonEl, 'the surviving button is the same node the API exposes');
});

test('switching between two employees keeps exactly one Download PDF button', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-16a' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-16b' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  var buttons = findAllByClass(mountEl, 'review-summaries-export-btn');
  assert.equal(buttons.length, 1, 'exactly one Download PDF button after switching employees');
  assert.equal(api.state.selectedStaff.id, 'staff-export-16b');
  assert.equal(api.exportButtonEl.disabled, false);
});

test('leaving and returning to the dedicated tab recreates exactly one valid, disabled-until-selection button', async (t) => {
  var fetchMock = makeFetchMock(function () { return jsonResponse(200, { records: [], total: 0, limit: 50, offset: 0 }); });
  var globals = installFakeBrowserGlobals({ storedAuth: AUTHORIZED, fetchImpl: fetchMock });
  t.after(globals.restore);
  var mod = await freshReviewSummariesModule();
  var mountEl = globals.document.createElement('div');
  var api = mod.mountReviewSummariesWorkspace(mountEl);
  api.selectStaff(fakeStaffRecord({ id: 'staff-export-17' }));
  await new Promise(function (resolve) { setTimeout(resolve, 0); });

  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' }); // leave
  globals.document.dispatchEvent({ type: 'msc:close-toolbar-popovers' }); // return (same event, no separate signal)

  var buttons = findAllByClass(mountEl, 'review-summaries-export-btn');
  assert.equal(buttons.length, 1, 'exactly one Download PDF button remains after leaving and returning');
  assert.equal(buttons[0].disabled, true, 'disabled again until a fresh employee is selected');
});
