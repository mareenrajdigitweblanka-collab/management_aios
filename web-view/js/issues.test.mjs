/* issues.test.mjs — coverage for the Management AIOS Issues workspace
   (REQ-ISSUES-UI-001).

   Reuses review-summaries-test-dom.mjs's hand-rolled DOM/localStorage
   stand-in as-is (installFakeBrowserGlobals) rather than duplicating it —
   its primitives (createElement/appendChild/querySelector/textContent/
   addEventListener) are generic, not review-summaries-specific, and this
   repo has no npm dependencies / no jsdom available (see that file's own
   header for the full rationale).

   Every test that imports issues.js calls installFakeBrowserGlobals()
   FIRST, even the "pure helper" tests below — issues.js transitively
   imports config.js, whose API-base constants read window.location.hostname
   at module top level (config.js:15 etc.). config.js has no per-test query
   string (unlike issues.js's own `?test-instance=N` cache-busting), so it
   is evaluated exactly once per process; if that first evaluation ever ran
   with no window defined, it throws and every later import of it — even
   from a differently-instanced issues.js — replays the same cached
   failure. Same convention already used throughout review-summaries.test.mjs.

   The FIXTURE_ISSUES array below is a TEST FIXTURE ONLY — see the module
   header of issues.js and docs/2026-08-10_management-issues-frontend-
   requirement.md for why it must never be copied into production source.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';
import { MD_MEMBER_KEY } from './member-registry.js';

var importCounter = 0;
function loadIssuesModule() {
  importCounter += 1;
  return import('./issues.js?test-instance=' + importCounter);
}

function flush() {
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

function fire(el, type) {
  el.dispatchEvent({ type: type, target: el, preventDefault: function () {} });
}

/* Wraps a test body so installFakeBrowserGlobals() is always installed
   before the body runs and always restored afterward — including for
   tests that only exercise "pure" exports, per the header note above. */
function withEnv(testFn) {
  return async function (t) {
    var env = installFakeBrowserGlobals();
    t.after(env.restore);
    await testFn(env);
  };
}

var FIXTURE_ISSUES = [
  {
    ticketId: 'ND-001', member: 'vishnusri', raisedBy: 'Nandhi', dateRaised: '2026-07-01',
    domain: 'postage', status: 'RED', priority: 'high', title: 'Return parcel issue',
    description: 'Short description.', rootCause: '', whatIsHappening: '', documentGap: '', fix: '', dataLink: ''
  },
  {
    ticketId: 'ND-002', member: 'vishnusri', raisedBy: 'Nandhi', dateRaised: '2026-07-05',
    domain: 'purchase', status: 'AMBER', priority: 'medium', title: 'Stock discrepancy',
    description: 'A'.repeat(400), rootCause: '', whatIsHappening: '', documentGap: '', fix: '',
    dataLink: 'https://example.com/data'
  },
  {
    ticketId: 'SA-001', member: 'vishnusri', raisedBy: 'Sasi', dateRaised: '2026-07-03',
    domain: 'listing', status: 'GREEN', priority: '',
    title: 'Low sales <img src=x onerror=alert(1)>',
    description: 'Contains <script>alert(1)</script> literally, never executed.',
    rootCause: '', whatIsHappening: '', documentGap: '', fix: '', dataLink: ''
  },
  {
    ticketId: 'ST-001', member: 'vishnusri', raisedBy: 'Sathis', dateRaised: '2026-06-20',
    domain: 'pricing', status: 'RED', priority: 'critical', title: 'Pricing formula gap',
    description: 'Needs a formula.', rootCause: '', whatIsHappening: '', documentGap: '', fix: '', dataLink: ''
  }
];

function ticketIdsInTable(mountEl) {
  return mountEl.querySelectorAll('.msc-issues-ticket-id').map(function (el) { return el.textContent; });
}

function mountWithFixtures(memberKey) {
  return loadIssuesModule().then(function (mod) {
    var mountEl = document.createElement('div');
    var adapter = mod.createInMemoryIssuesAdapter(FIXTURE_ISSUES);
    var handle = mod.mountIssuesWorkspace(mountEl, {
      adapter: adapter,
      getAuthenticatedMemberKey: function () { return memberKey; }
    });
    return flush().then(function () { return { mod: mod, mountEl: mountEl, adapter: adapter, handle: handle }; });
  });
}

// ── Pure helpers — no DOM interaction, but still import issues.js ───────

test('filterIssues: raisedBy/domain/status filters combine with AND semantics', withEnv(async function () {
  var mod = await loadIssuesModule();
  var byRaisedBy = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'Nandhi', domain: 'all', status: 'all' });
  assert.deepEqual(byRaisedBy.map(function (i) { return i.ticketId; }), ['ND-001', 'ND-002']);

  var byDomain = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'all', domain: 'pricing', status: 'all' });
  assert.deepEqual(byDomain.map(function (i) { return i.ticketId; }), ['ST-001']);

  var byStatus = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'all', domain: 'all', status: 'RED' });
  assert.deepEqual(byStatus.map(function (i) { return i.ticketId; }), ['ND-001', 'ST-001']);

  var combined = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'Nandhi', domain: 'postage', status: 'RED' });
  assert.deepEqual(combined.map(function (i) { return i.ticketId; }), ['ND-001']);
}));

test('filterIssues: "all" never excludes anything', withEnv(async function () {
  var mod = await loadIssuesModule();
  var out = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'all', domain: 'all', status: 'all' });
  assert.equal(out.length, FIXTURE_ISSUES.length);
}));

test('sortIssues: ticketId ascending/descending', withEnv(async function () {
  var mod = await loadIssuesModule();
  var asc = mod.sortIssues(FIXTURE_ISSUES, 'ticketId', 'asc').map(function (i) { return i.ticketId; });
  assert.deepEqual(asc, ['ND-001', 'ND-002', 'SA-001', 'ST-001']);
  var desc = mod.sortIssues(FIXTURE_ISSUES, 'ticketId', 'desc').map(function (i) { return i.ticketId; });
  assert.deepEqual(desc, asc.slice().reverse());
}));

test('sortIssues: dateRaised ascending puts the earliest date first', withEnv(async function () {
  var mod = await loadIssuesModule();
  var asc = mod.sortIssues(FIXTURE_ISSUES, 'dateRaised', 'asc').map(function (i) { return i.ticketId; });
  assert.equal(asc[0], 'ST-001'); // 2026-06-20, earliest
}));

test('sortIssues: raisedBy sorts alphabetically', withEnv(async function () {
  var mod = await loadIssuesModule();
  var asc = mod.sortIssues(FIXTURE_ISSUES, 'raisedBy', 'asc').map(function (i) { return i.raisedBy; });
  assert.deepEqual(asc, ['Nandhi', 'Nandhi', 'Sasi', 'Sathis']);
}));

test('sortIssues: status sorts alphabetically (AMBER < GREEN < RED)', withEnv(async function () {
  var mod = await loadIssuesModule();
  var asc = mod.sortIssues(FIXTURE_ISSUES, 'status', 'asc').map(function (i) { return i.status; });
  assert.deepEqual(asc, ['AMBER', 'GREEN', 'RED', 'RED']);
}));

test('sortIssues: title sorts alphabetically', withEnv(async function () {
  var mod = await loadIssuesModule();
  var asc = mod.sortIssues(FIXTURE_ISSUES, 'title', 'asc').map(function (i) { return i.ticketId; });
  // Titles: "Low sales..." (SA-001) < "Pricing formula gap" (ST-001) <
  // "Return parcel issue" (ND-001) < "Stock discrepancy" (ND-002).
  assert.deepEqual(asc, ['SA-001', 'ST-001', 'ND-001', 'ND-002']);
}));

test('sortIssues: priority uses severity order (critical > high > medium > blank), not alphabetical', withEnv(async function () {
  var mod = await loadIssuesModule();
  var desc = mod.sortIssues(FIXTURE_ISSUES, 'priority', 'desc').map(function (i) { return i.ticketId; });
  assert.deepEqual(desc, ['ST-001', 'ND-001', 'ND-002', 'SA-001']); // critical, high, medium, blank
}));

test('previewText: leaves short text untouched, truncates long text at 320 chars with an ellipsis', withEnv(async function () {
  var mod = await loadIssuesModule();
  var short = mod.previewText('hello');
  assert.equal(short.truncated, false);
  assert.equal(short.preview, 'hello');

  var long = mod.previewText('A'.repeat(400));
  assert.equal(long.truncated, true);
  assert.equal(long.preview.length, 321); // 320 chars + ellipsis char
  assert.ok(long.preview.endsWith('…'));
}));

test('previewText: missing/null value is treated as empty, not "null"/"undefined"', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(mod.previewText(null).preview, '');
  assert.equal(mod.previewText(undefined).preview, '');
}));

test('uniqueSortedValues: dedupes and sorts alphabetically, skips falsy values', withEnv(async function () {
  var mod = await loadIssuesModule();
  var domains = mod.uniqueSortedValues(FIXTURE_ISSUES, 'domain');
  assert.deepEqual(domains, ['listing', 'postage', 'pricing', 'purchase']);
}));

// ── Admin gating — role derived from the registry, never a hardcoded name ─

test('isAdminMember: true only for the member whose registry role is "Admin Manager" (Rajiv)', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(mod.isAdminMember('rajiv'), true);
  assert.equal(mod.isAdminMember('mayurika'), false);
  assert.equal(mod.isAdminMember('suman'), false);
  assert.equal(mod.isAdminMember('arun'), false);
  assert.equal(mod.isAdminMember('paraparan'), false);
}));

test('isAdminMember: MD never receives Admin status', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(mod.isAdminMember(MD_MEMBER_KEY), false);
}));

test('isAdminMember: unknown/missing member key is never Admin', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(mod.isAdminMember('nonexistent'), false);
  assert.equal(mod.isAdminMember(null), false);
}));

test('getAssigneeOptions: authoritative registry order, excludes MD, includes Paraparan with correct spelling, no "Rajive"/"Maurika"', withEnv(async function () {
  var mod = await loadIssuesModule();
  var options = mod.getAssigneeOptions();
  assert.deepEqual(options.map(function (o) { return o.memberKey; }), ['mayurika', 'suman', 'arun', 'rajiv', 'paraparan']);
  var names = options.map(function (o) { return o.displayName; });
  assert.deepEqual(names, ['Mayurika', 'Suman', 'Arun', 'Rajiv', 'Paraparan']);
  assert.ok(names.indexOf('Paraparan') !== -1);
  assert.ok(names.indexOf('Rajive') === -1, 'misspelled "Rajive" must never appear');
  assert.ok(names.indexOf('Maurika') === -1, 'misspelled "Maurika" must never appear');
  assert.ok(options.every(function (o) { return o.memberKey !== MD_MEMBER_KEY; }));
}));

// ── Data adapters ───────────────────────────────────────────────────────

test('production adapter: fetchIssues always resolves empty — no fabricated records', withEnv(async function () {
  var mod = await loadIssuesModule();
  var adapter = mod.createProductionIssuesAdapter();
  var result = await adapter.fetchIssues();
  assert.equal(result.status, 'empty');
  assert.deepEqual(result.issues, []);
}));

test('production adapter: assignTickets/updateSolvingStatus always resolve pending_backend — never claim success', withEnv(async function () {
  var mod = await loadIssuesModule();
  var adapter = mod.createProductionIssuesAdapter();
  var assignResult = await adapter.assignTickets(['ND-001'], 'rajiv');
  assert.equal(assignResult.status, 'pending_backend');
  var updateResult = await adapter.updateSolvingStatus('ND-001', 'solved');
  assert.equal(updateResult.status, 'pending_backend');
  assert.deepEqual(adapter.listAssignments(), {});
}));

test('in-memory fixture adapter: assignTickets records assignedTo/assignedDate/solvingStatus, updateSolvingStatus updates only solvingStatus', withEnv(async function () {
  var mod = await loadIssuesModule();
  var adapter = mod.createInMemoryIssuesAdapter(FIXTURE_ISSUES);
  await adapter.assignTickets(['ND-001', 'ND-002'], 'suman');
  var assignments = adapter.listAssignments();
  assert.equal(assignments['ND-001'].assignedTo, 'suman');
  assert.equal(assignments['ND-001'].solvingStatus, 'not-solved');
  assert.match(assignments['ND-001'].assignedDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(assignments['ND-002'].assignedTo, 'suman');

  await adapter.updateSolvingStatus('ND-001', 'solved');
  var updated = adapter.listAssignments();
  assert.equal(updated['ND-001'].solvingStatus, 'solved');
  assert.equal(updated['ND-001'].assignedTo, 'suman'); // untouched by the solving-status update
}));

// ── Data-safety (Phase 15, items 41-42) — no module import needed ───────

test('issues.js source contains no copied hardcoded ISSUES array from the reference sample', () => {
  var srcPath = fileURLToPath(new URL('./issues.js', import.meta.url));
  var src = readFileSync(srcPath, 'utf8');
  assert.ok(!/const ISSUES = \[/.test(src));
  assert.ok(!/"ND-001"/.test(src));
  assert.ok(!/vishnusri/.test(src));
});

test('issues.js never touches window.localStorage/sessionStorage — no client-side assignment persistence', () => {
  var srcPath = fileURLToPath(new URL('./issues.js', import.meta.url));
  var src = readFileSync(srcPath, 'utf8');
  assert.ok(!/localStorage/.test(src));
  assert.ok(!/sessionStorage/.test(src));
});

// ── DOM-mounted behavior ─────────────────────────────────────────────────

test('DOM: Issues is the default internal view; Assigned Tickets panel starts hidden', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var issuesTab = ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="issues"]');
  var assignedTab = ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]');
  var issuesPanel = ctx.mountEl.querySelector('#msc-issues-view-panel-issues');
  var assignedPanel = ctx.mountEl.querySelector('#msc-issues-view-panel-assigned');
  assert.equal(issuesTab.getAttribute('aria-selected'), 'true');
  assert.equal(assignedTab.getAttribute('aria-selected'), 'false');
  assert.equal(issuesPanel.hidden, false);
  assert.equal(assignedPanel.hidden, true);
}));

test('DOM: clicking Assigned Tickets switches views; clicking back to Issues restores it', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var assignedTab = ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]');
  fire(assignedTab, 'click');
  assert.equal(ctx.mountEl.querySelector('#msc-issues-view-panel-assigned').hidden, false);
  assert.equal(ctx.mountEl.querySelector('#msc-issues-view-panel-issues').hidden, true);

  var issuesTab = ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="issues"]');
  fire(issuesTab, 'click');
  assert.equal(ctx.mountEl.querySelector('#msc-issues-view-panel-issues').hidden, false);
  assert.equal(ctx.mountEl.querySelector('#msc-issues-view-panel-assigned').hidden, true);
}));

test('DOM: Raised By filter narrows the table to that person only', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var select = ctx.mountEl.querySelector('#msc-issues-raised-by-filter');
  select.value = 'Sasi';
  fire(select, 'change');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['SA-001']);
}));

test('DOM: Domain filter narrows the table to that domain only', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var select = ctx.mountEl.querySelector('#msc-issues-domain-filter');
  select.value = 'pricing';
  fire(select, 'change');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ST-001']);
}));

test('DOM: status tab "All" shows every issue', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  assert.equal(ticketIdsInTable(ctx.mountEl).length, FIXTURE_ISSUES.length);
}));

test('DOM: status tab RED shows only RED issues, with visible text (not color alone)', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var redTab = ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="RED"]');
  fire(redTab, 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ND-001', 'ST-001']);
  var badges = ctx.mountEl.querySelectorAll('.msc-issues-badge');
  badges.forEach(function (b) { assert.equal(b.textContent, 'RED'); });
  assert.equal(redTab.getAttribute('aria-pressed'), 'true');
}));

test('DOM: status tab AMBER shows only AMBER issues', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var amberTab = ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="AMBER"]');
  fire(amberTab, 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ND-002']);
}));

test('DOM: status tab GREEN shows only GREEN issues', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var greenTab = ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="GREEN"]');
  fire(greenTab, 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['SA-001']);
}));

test('DOM: clicking the Ticket ID header sorts ascending then descending', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var th = ctx.mountEl.querySelector('.msc-issues-sort-th[data-sort-key="ticketId"]');
  fire(th, 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ND-001', 'ND-002', 'SA-001', 'ST-001']);
  fire(th, 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ST-001', 'SA-001', 'ND-002', 'ND-001']);
}));

test('DOM: sorting by Raised By orders rows alphabetically by that column', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var th = ctx.mountEl.querySelector('.msc-issues-sort-th[data-sort-key="raisedBy"]');
  fire(th, 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ND-001', 'ND-002', 'SA-001', 'ST-001']);
}));

test('DOM: sorting by Priority Score uses severity order, not alphabetical', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var th = ctx.mountEl.querySelector('.msc-issues-sort-th[data-sort-key="priority"]');
  fire(th, 'click'); // ascending: blank, medium, high, critical
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['SA-001', 'ND-002', 'ND-001', 'ST-001']);
}));

test('DOM: long text truncates with a "more" button; clicking expands to "less" and back', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var toggleBtn = ctx.mountEl.querySelector('.msc-issues-toggle-text-btn');
  assert.ok(toggleBtn, 'a truncated field (the 400-char description) should render a toggle button');
  assert.equal(toggleBtn.textContent, 'more');
  assert.equal(toggleBtn.getAttribute('aria-expanded'), 'false');
  fire(toggleBtn, 'click');
  assert.equal(toggleBtn.textContent, 'less');
  assert.equal(toggleBtn.getAttribute('aria-expanded'), 'true');
  fire(toggleBtn, 'click');
  assert.equal(toggleBtn.textContent, 'more');
  assert.equal(toggleBtn.getAttribute('aria-expanded'), 'false');
}));

test('DOM: a Data link renders target=_blank rel=noopener noreferrer; missing dataLink renders a dash', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var link = ctx.mountEl.querySelector('.msc-issues-data-link');
  assert.ok(link);
  assert.equal(link.getAttribute('target'), '_blank');
  assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  var dashes = ctx.mountEl.querySelectorAll('.msc-issues-dash');
  assert.ok(dashes.length > 0, 'issues with no dataLink should render a dash, not an empty cell');
}));

test('DOM: HTML-like issue content renders as literal text, never executable markup', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var allTitles = ctx.mountEl.allText();
  assert.ok(allTitles.indexOf('Low sales <img src=x onerror=alert(1)>') !== -1);
  // No element created anywhere in the workspace was ever tagged <img> or
  // <script> — this module builds every issue-authored field via
  // textContent, never innerHTML, so markup-looking text can never be
  // parsed into a real element.
  var walk = function (node) {
    if (!node || !node._children) { return true; }
    if (node.tagName === 'IMG' || node.tagName === 'SCRIPT') { return false; }
    return node._children.every(walk);
  };
  assert.ok(walk(ctx.mountEl), 'no <img>/<script> element should exist anywhere in the rendered workspace');
}));

test('DOM: Admin (Rajiv) sees Select All / Assign To / Assign controls', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  assert.ok(ctx.mountEl.querySelector('#msc-issues-select-all'));
  assert.ok(ctx.mountEl.querySelector('#msc-issues-assign-to-select'));
  assert.ok(ctx.mountEl.querySelector('.msc-issues-assign-btn'));
}));

test('DOM: non-Admin (Mayurika) receives no assignment controls at all', withEnv(async function () {
  var ctx = await mountWithFixtures('mayurika');
  assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
  assert.equal(ctx.mountEl.querySelector('#msc-issues-assign-to-select'), null);
  assert.equal(ctx.mountEl.querySelector('.msc-issues-assign-btn'), null);
}));

test('DOM: MD receives no assignment controls (MD role is "Read-only", never "Admin Manager")', withEnv(async function () {
  var ctx = await mountWithFixtures(MD_MEMBER_KEY);
  assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
  assert.equal(ctx.mountEl.querySelector('#msc-issues-assign-to-select'), null);
  assert.equal(ctx.mountEl.querySelector('.msc-issues-assign-btn'), null);
}));

test('DOM: no authenticated member (null) also receives no assignment controls', withEnv(async function () {
  var ctx = await mountWithFixtures(null);
  assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
}));

test('DOM: Select All only selects currently-visible (filtered) tickets, and only unassigned ones', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var redTab = ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="RED"]');
  fire(redTab, 'click'); // narrows to ND-001, ST-001
  var selectAll = ctx.mountEl.querySelector('#msc-issues-select-all');
  selectAll.checked = true;
  fire(selectAll, 'change');
  var rowCheckboxes = ctx.mountEl.querySelectorAll('.msc-issues-checkbox').filter(function (cb) { return cb.getAttribute('data-ticket-id'); });
  var checked = rowCheckboxes.filter(function (cb) { return cb.checked; });
  assert.deepEqual(checked.map(function (cb) { return cb.getAttribute('data-ticket-id'); }).sort(), ['ND-001', 'ST-001']);
  assert.equal(ctx.mountEl.querySelector('.msc-issues-selected-count').textContent, '2 selected');
}));

test('DOM: Assign (in-memory adapter) assigns the selected tickets, clears selection, and populates Assigned Tickets', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var cb = ctx.mountEl.querySelector('.msc-issues-checkbox[data-ticket-id="ND-001"]');
  cb.checked = true;
  fire(cb, 'change');

  var assignToSelect = ctx.mountEl.querySelector('#msc-issues-assign-to-select');
  assignToSelect.value = 'suman';
  fire(assignToSelect, 'change');

  var assignBtn = ctx.mountEl.querySelector('.msc-issues-assign-btn');
  assert.equal(assignBtn.disabled, false);
  fire(assignBtn, 'click');
  await flush();

  // Selection + assignee dropdown reset after a successful (fixture) assign.
  assert.equal(ctx.mountEl.querySelector('.msc-issues-selected-count').textContent, '0 selected');
  assert.equal(assignToSelect.value, '');

  // Now assigned — its row checkbox is checked+disabled (locked), and it
  // must not be selectable again via Select All.
  var lockedCb = ctx.mountEl.querySelector('.msc-issues-checkbox[data-ticket-id="ND-001"]');
  assert.equal(lockedCb.checked, true);
  assert.equal(lockedCb.disabled, true);

  // Switch to Assigned Tickets and confirm the card is there with the
  // right assignee and default "Not Solved" solving status — separate
  // from the issue's own RED triage status, which must be untouched.
  fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');
  var card = ctx.mountEl.querySelector('.msc-issues-card');
  assert.ok(card);
  var cardText = card.allText();
  assert.ok(cardText.indexOf('ND-001') !== -1);
  assert.ok(cardText.indexOf('Suman') !== -1);
  var solvingSelect = ctx.mountEl.querySelector('.msc-issues-solving-status-select');
  assert.equal(solvingSelect.value, 'not-solved');
  assert.ok(solvingSelect.className.indexOf('msc-issues-badge-red') !== -1);

  var originalFixture = FIXTURE_ISSUES.filter(function (i) { return i.ticketId === 'ND-001'; })[0];
  assert.equal(originalFixture.status, 'RED', 'the original fixture object must never be mutated');
}));

test('DOM: Assign (production adapter) shows "Assignment connection pending" and does not fabricate a saved assignment', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  var prodAdapter = mod.createProductionIssuesAdapter();
  // fetchIssues still needs real records to select from — swap in the
  // fixtures for fetch only, keep assignTickets/updateSolvingStatus as the
  // real "no backend yet" production behavior.
  var adapter = Object.assign({}, prodAdapter, {
    fetchIssues: function () { return Promise.resolve({ status: 'data', issues: FIXTURE_ISSUES.slice() }); }
  });
  mod.mountIssuesWorkspace(mountEl, { adapter: adapter, getAuthenticatedMemberKey: function () { return 'rajiv'; } });
  await flush();

  var cb = mountEl.querySelector('.msc-issues-checkbox[data-ticket-id="ND-001"]');
  cb.checked = true;
  fire(cb, 'change');
  var assignToSelect = mountEl.querySelector('#msc-issues-assign-to-select');
  assignToSelect.value = 'suman';
  fire(assignToSelect, 'change');
  fire(mountEl.querySelector('.msc-issues-assign-btn'), 'click');
  await flush();

  var notice = mountEl.querySelector('.msc-issues-assign-notice');
  assert.equal(notice.hidden, false);
  assert.match(notice.textContent, /Assignment connection pending/);

  fire(mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');
  assert.equal(mountEl.querySelector('.msc-issues-card'), null, 'nothing should appear as "assigned" when no backend persisted it');
  assert.match(mountEl.querySelector('.msc-issues-empty').textContent, /No tickets are currently assigned/);
}));

test('DOM: Assigned Tickets — Assignee filter narrows cards to that assignee', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  await ctx.adapter.assignTickets(['ND-001'], 'suman');
  await ctx.adapter.assignTickets(['ND-002'], 'arun');
  ctx.handle.reload();
  await flush();

  fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');
  assert.equal(ctx.mountEl.querySelectorAll('.msc-issues-card').length, 2);

  var assigneeFilter = ctx.mountEl.querySelector('#msc-issues-assignee-filter');
  assigneeFilter.value = 'suman';
  fire(assigneeFilter, 'change');
  var cards = ctx.mountEl.querySelectorAll('.msc-issues-card');
  assert.equal(cards.length, 1);
  assert.ok(cards[0].allText().indexOf('ND-001') !== -1);
}));

test('DOM: changing solving status updates the card badge but never the issue\'s own triage status', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  await ctx.adapter.assignTickets(['ND-001'], 'suman');
  ctx.handle.reload();
  await flush();
  fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');

  var solvingSelect = ctx.mountEl.querySelector('.msc-issues-solving-status-select');
  solvingSelect.value = 'partially-solved';
  fire(solvingSelect, 'change');
  await flush();

  var refreshedSelect = ctx.mountEl.querySelector('.msc-issues-solving-status-select');
  assert.equal(refreshedSelect.value, 'partially-solved');
  assert.ok(refreshedSelect.className.indexOf('msc-issues-badge-amber') !== -1);

  var assignments = ctx.adapter.listAssignments();
  assert.equal(assignments['ND-001'].solvingStatus, 'partially-solved');
  assert.equal(assignments['ND-001'].assignedTo, 'suman'); // untouched

  var fetchResult = await ctx.adapter.fetchIssues();
  var stillRed = fetchResult.issues.filter(function (i) { return i.ticketId === 'ND-001'; })[0];
  assert.equal(stillRed.status, 'RED', 'triage status must be completely separate from solving status');
}));

test('DOM: solving status option set is exactly Not Solved / Partially Solved / Solved Completely, mapped to red/amber/green', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  await ctx.adapter.assignTickets(['ND-001'], 'suman');
  ctx.handle.reload();
  await flush();
  fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');

  var select = ctx.mountEl.querySelector('.msc-issues-solving-status-select');
  var optionLabels = select._children.map(function (o) { return o.textContent; });
  assert.deepEqual(optionLabels, ['Not Solved', 'Partially Solved', 'Solved Completely']);
}));

// ── Empty / loading / error states ──────────────────────────────────────

test('DOM: empty state renders "No issues are available yet." when the adapter has no records', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  mod.mountIssuesWorkspace(mountEl, {
    adapter: mod.createInMemoryIssuesAdapter([]),
    getAuthenticatedMemberKey: function () { return 'rajiv'; }
  });
  await flush();
  var issuesPanel = mountEl.querySelector('#msc-issues-view-panel-issues');
  assert.match(issuesPanel.querySelector('.msc-issues-empty').textContent, /No issues are available yet\./);
}));

test('DOM: production adapter (default, no backend) renders the same empty state, not fabricated rows', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  mod.mountIssuesWorkspace(mountEl, { getAuthenticatedMemberKey: function () { return 'rajiv'; } });
  await flush();
  var issuesPanel = mountEl.querySelector('#msc-issues-view-panel-issues');
  assert.match(issuesPanel.querySelector('.msc-issues-empty').textContent, /No issues are available yet\./);
  assert.equal(mountEl.querySelectorAll('.msc-issues-ticket-id').length, 0);
}));

test('DOM: loading state renders before the adapter promise resolves', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  var resolveFetch;
  var neverSettledAdapter = {
    fetchIssues: function () { return new Promise(function (resolve) { resolveFetch = resolve; }); },
    assignTickets: function () { return Promise.resolve({ status: 'pending_backend' }); },
    updateSolvingStatus: function () { return Promise.resolve({ status: 'pending_backend' }); },
    listAssignments: function () { return {}; }
  };
  mod.mountIssuesWorkspace(mountEl, { adapter: neverSettledAdapter, getAuthenticatedMemberKey: function () { return 'rajiv'; } });
  assert.match(mountEl.querySelector('.msc-issues-loading').textContent, /Loading issues…/);
  resolveFetch({ status: 'empty', issues: [] });
  await flush();
  assert.equal(mountEl.querySelector('.msc-issues-loading'), null);
}));

test('DOM: error state renders "Issues could not be loaded. Please try again." with a working Retry button', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  var attempt = 0;
  var flakyAdapter = {
    fetchIssues: function () {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('network down')) : Promise.resolve({ status: 'data', issues: FIXTURE_ISSUES.slice() });
    },
    assignTickets: function () { return Promise.resolve({ status: 'pending_backend' }); },
    updateSolvingStatus: function () { return Promise.resolve({ status: 'pending_backend' }); },
    listAssignments: function () { return {}; }
  };
  mod.mountIssuesWorkspace(mountEl, { adapter: flakyAdapter, getAuthenticatedMemberKey: function () { return 'rajiv'; } });
  await flush();
  var errorBox = mountEl.querySelector('.msc-issues-error');
  assert.ok(errorBox);
  assert.match(errorBox.textContent, /Issues could not be loaded\. Please try again\./);

  var retryBtn = mountEl.querySelector('.msc-issues-retry-btn');
  assert.ok(retryBtn, 'a Retry button should exist inside the error state');
  fire(retryBtn, 'click');
  await flush();
  assert.equal(mountEl.querySelector('.msc-issues-error'), null);
  assert.equal(ticketIdsInTable(mountEl).length, FIXTURE_ISSUES.length);
}));

// ── Missing values (Phase 6) ────────────────────────────────────────────

test('DOM: a missing Priority Score renders a dash, not an empty cell', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var greenTab = ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="GREEN"]');
  fire(greenTab, 'click'); // SA-001 has priority: ''
  var priorityCells = ctx.mountEl.querySelectorAll('.msc-issues-priority');
  assert.equal(priorityCells.length, 1);
  assert.equal(priorityCells[0].textContent.trim(), '—');
}));
