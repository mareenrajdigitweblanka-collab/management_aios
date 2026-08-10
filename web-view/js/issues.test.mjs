/* issues.test.mjs — coverage for the Management AIOS Issues workspace
   (REQ-ISSUES-UI-001, corrected 2026-08-10).

   Reuses review-summaries-test-dom.mjs's hand-rolled DOM/localStorage/
   fetch stand-in as-is (installFakeBrowserGlobals) rather than
   duplicating it — its primitives are generic, not review-summaries-
   specific, and this repo has no npm dependencies / no jsdom available.

   Every test that imports issues.js calls installFakeBrowserGlobals()
   FIRST, even "pure helper" tests — issues.js transitively imports
   config.js, whose API-base constants read window.location.hostname at
   module top level exactly once per process; see the withEnv() comment
   below for the full rationale (same convention as review-summaries.test.mjs).

   FIXTURE_ISSUES / FIXTURE_STAFF_NAMES / FIXTURE_TEAMS below are TEST
   FIXTURES ONLY — see the module header of issues.js and
   docs/2026-08-10_management-issues-frontend-requirement.md for why real
   staff/team/issue data must never be hardcoded into production source.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';
import { MD_MEMBER_KEY, MEMBER_REGISTRY } from './member-registry.js';

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
   tests that only exercise "pure" exports (issues.js transitively
   imports config.js, whose per-process-once top-level window.location
   read would otherwise throw on the very first import in this file). */
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
    team: 'postage', status: 'RED', priority: 'high', title: 'Return parcel issue',
    description: 'Short description.', rootCause: '', whatIsHappening: '', documentGap: '', fix: '', dataLink: ''
  },
  {
    ticketId: 'ND-002', member: 'vishnusri', raisedBy: 'Nandhi', dateRaised: '2026-07-05',
    team: 'purchase', status: 'AMBER', priority: 'medium', title: 'Stock discrepancy',
    description: 'A'.repeat(400), rootCause: '', whatIsHappening: '', documentGap: '', fix: '',
    dataLink: 'https://example.com/data'
  },
  {
    ticketId: 'SA-001', member: 'vishnusri', raisedBy: 'Sasi', dateRaised: '2026-07-03',
    team: 'listing', status: 'GREEN', priority: '',
    title: 'Low sales <img src=x onerror=alert(1)>',
    description: 'Contains <script>alert(1)</script> literally, never executed.',
    rootCause: '', whatIsHappening: '', documentGap: '', fix: '', dataLink: ''
  },
  {
    ticketId: 'ST-001', member: 'vishnusri', raisedBy: 'Sathis', dateRaised: '2026-06-20',
    team: 'pricing', status: 'RED', priority: 'critical', title: 'Pricing formula gap',
    description: 'Needs a formula.', rootCause: '', whatIsHappening: '', documentGap: '', fix: '', dataLink: ''
  }
];

/* Real-shaped but entirely fictitious names/teams for the demo-data /
   staff-team-source tests below — deliberately NOT the reference sample's
   Nandhi/Nivarnan/Sasi/Sathis or Listing/PH/Postage/Pricing/Purchase
   values, so a test accidentally matching those strings can never read as
   "passing because the sample data leaked back in". */
var FIXTURE_STAFF_NAMES = ['Amara Fernando', 'Bhanu Silva', 'Chamath Perera'];
var FIXTURE_TEAMS = ['Amazon Team', 'Ledger Team', 'Zenith Team'];

function ticketIdsInTable(mountEl) {
  return mountEl.querySelectorAll('.msc-issues-ticket-id').map(function (el) { return el.textContent; });
}

function createFixtureStaffTeamSource(names, teams, opts) {
  opts = opts || {};
  return {
    fetchOptions: function () {
      if (opts.reject) {
        var err = new Error('boom');
        if (opts.taggedUnavailable) { err.staffTeamUnavailable = true; }
        return Promise.reject(err);
      }
      return Promise.resolve({ raisedByOptions: names, teamOptions: teams });
    }
  };
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

function mountWithProductionDemoAdapter(memberKey, names, teams) {
  return loadIssuesModule().then(function (mod) {
    var mountEl = document.createElement('div');
    var staffTeamSource = createFixtureStaffTeamSource(names || FIXTURE_STAFF_NAMES, teams || FIXTURE_TEAMS);
    var adapter = mod.createProductionIssuesAdapter(staffTeamSource);
    var handle = mod.mountIssuesWorkspace(mountEl, {
      adapter: adapter,
      getAuthenticatedMemberKey: function () { return memberKey; }
    });
    return flush().then(function () { return { mod: mod, mountEl: mountEl, adapter: adapter, handle: handle }; });
  });
}

// ── Pure helpers ─────────────────────────────────────────────────────────

test('uniqueSorted: dedupes, sorts alphabetically, drops falsy values', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.deepEqual(mod.uniqueSorted(['Bob', 'Amara', 'Bob', '', null, undefined, 'Amara']), ['Amara', 'Bob']);
}));

test('uniqueSortedValues: dedupes and sorts alphabetically by field, skips falsy values', withEnv(async function () {
  var mod = await loadIssuesModule();
  var teams = mod.uniqueSortedValues(FIXTURE_ISSUES, 'team');
  assert.deepEqual(teams, ['listing', 'postage', 'pricing', 'purchase']);
}));

test('filterIssues: raisedBy/team/status filters combine with AND semantics', withEnv(async function () {
  var mod = await loadIssuesModule();
  var byRaisedBy = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'Nandhi', team: 'all', status: 'all' });
  assert.deepEqual(byRaisedBy.map(function (i) { return i.ticketId; }), ['ND-001', 'ND-002']);

  var byTeam = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'all', team: 'pricing', status: 'all' });
  assert.deepEqual(byTeam.map(function (i) { return i.ticketId; }), ['ST-001']);

  var byStatus = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'all', team: 'all', status: 'RED' });
  assert.deepEqual(byStatus.map(function (i) { return i.ticketId; }), ['ND-001', 'ST-001']);

  var combined = mod.filterIssues(FIXTURE_ISSUES, { raisedBy: 'Nandhi', team: 'postage', status: 'RED' });
  assert.deepEqual(combined.map(function (i) { return i.ticketId; }), ['ND-001']);
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
  assert.equal(asc[0], 'ST-001');
}));

test('sortIssues: raisedBy sorts alphabetically', withEnv(async function () {
  var mod = await loadIssuesModule();
  var asc = mod.sortIssues(FIXTURE_ISSUES, 'raisedBy', 'asc').map(function (i) { return i.raisedBy; });
  assert.deepEqual(asc, ['Nandhi', 'Nandhi', 'Sasi', 'Sathis']);
}));

test('sortIssues: team sorts alphabetically', withEnv(async function () {
  var mod = await loadIssuesModule();
  var asc = mod.sortIssues(FIXTURE_ISSUES, 'team', 'asc').map(function (i) { return i.team; });
  assert.deepEqual(asc, ['listing', 'postage', 'pricing', 'purchase']);
}));

test('sortIssues: priority uses severity order (critical > high > medium > blank), not alphabetical', withEnv(async function () {
  var mod = await loadIssuesModule();
  var desc = mod.sortIssues(FIXTURE_ISSUES, 'priority', 'desc').map(function (i) { return i.ticketId; });
  assert.deepEqual(desc, ['ST-001', 'ND-001', 'ND-002', 'SA-001']);
}));

test('previewText: truncates long text at 320 chars with an ellipsis; short text/nullish untouched', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(mod.previewText('hello').truncated, false);
  var long = mod.previewText('A'.repeat(400));
  assert.equal(long.truncated, true);
  assert.ok(long.preview.endsWith('…'));
  assert.equal(mod.previewText(null).preview, '');
}));

test('getAssigneeOptions: authoritative registry order, excludes MD, includes Paraparan with correct spelling, no "Rajive"/"Maurika"', withEnv(async function () {
  var mod = await loadIssuesModule();
  var options = mod.getAssigneeOptions();
  assert.deepEqual(options.map(function (o) { return o.memberKey; }), ['mayurika', 'suman', 'arun', 'rajiv', 'paraparan']);
  var names = options.map(function (o) { return o.displayName; });
  assert.deepEqual(names, ['Mayurika', 'Suman', 'Arun', 'Rajiv', 'Paraparan']);
  assert.ok(names.indexOf('Rajive') === -1, 'misspelled "Rajive" must never appear');
  assert.ok(names.indexOf('Maurika') === -1, 'misspelled "Maurika" must never appear');
  assert.ok(options.every(function (o) { return o.memberKey !== MD_MEMBER_KEY; }));
}));

// ── Assignment authority — exact identity allowlist, not role, not name ──

test('hasAssignmentAuthority: true for the literal member_keys "rajiv" and "md"', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(mod.hasAssignmentAuthority('rajiv'), true);
  assert.equal(mod.hasAssignmentAuthority('md'), true);
  assert.equal(mod.hasAssignmentAuthority(MD_MEMBER_KEY), true);
  assert.deepEqual(Array.from(mod.ISSUE_ASSIGNMENT_AUTHORITY_KEYS).sort(), ['md', 'rajiv']);
}));

test('hasAssignmentAuthority: false for every other registered member, unknown, and null/undefined', withEnv(async function () {
  var mod = await loadIssuesModule();
  ['mayurika', 'suman', 'arun', 'paraparan', 'nonexistent', null, undefined].forEach(function (key) {
    assert.equal(mod.hasAssignmentAuthority(key), false, 'expected false for ' + key);
  });
}));

test('hasAssignmentAuthority: role text alone cannot grant authority ("Admin Manager" is not a member_key)', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(MEMBER_REGISTRY.rajiv.role, 'Admin Manager'); // sanity: this really is Rajiv's role string
  assert.equal(mod.hasAssignmentAuthority('Admin Manager'), false);
  assert.equal(mod.hasAssignmentAuthority(MEMBER_REGISTRY.rajiv.role), false);
}));

test('hasAssignmentAuthority: MD\'s role/read-only text alone cannot grant authority ("Read-only" is not the member_key "md")', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(MEMBER_REGISTRY.md.role, 'Read-only'); // sanity: this really is MD's role string
  assert.equal(mod.hasAssignmentAuthority('Read-only'), false);
  assert.equal(mod.hasAssignmentAuthority(MEMBER_REGISTRY.md.role), false);
  assert.equal(mod.hasAssignmentAuthority(MEMBER_REGISTRY.md.displayName), false); // "MD" (display) is not "md" (key) — same string here only by coincidence of case; assert the exact-match rule directly below
  assert.equal(mod.hasAssignmentAuthority('MD'), false);
}));

test('hasAssignmentAuthority: display name alone cannot grant authority ("Rajiv" is not the member_key "rajiv")', withEnv(async function () {
  var mod = await loadIssuesModule();
  assert.equal(MEMBER_REGISTRY.rajiv.displayName, 'Rajiv');
  assert.equal(mod.hasAssignmentAuthority('Rajiv'), false);
  assert.equal(mod.hasAssignmentAuthority(MEMBER_REGISTRY.rajiv.displayName), false);
}));

test('member-registry.js no longer exports a role-based admin check', () => {
  var srcPath = fileURLToPath(new URL('./member-registry.js', import.meta.url));
  var src = readFileSync(srcPath, 'utf8');
  assert.ok(!/export function isAdminMemberKey/.test(src));
});

// ── Staff/Team source (createProductionStaffTeamSource) ─────────────────

test('createProductionStaffTeamSource: fetches active staff from STAFF_API_BASE and teams from its /filter-options, deduped+sorted', withEnv(async function () {
  var calls = [];
  globalThis.fetch = function (url) {
    calls.push(url);
    if (String(url).indexOf('/filter-options') !== -1) {
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ teams: ['Zenith Team', 'Amazon Team', 'Amazon Team'] }); } });
    }
    return Promise.resolve({
      ok: true,
      json: function () { return Promise.resolve({ records: [{ full_name: 'Bhanu Silva' }, { full_name: 'Amara Fernando' }, { full_name: 'Bhanu Silva' }] }); }
    });
  };
  var mod = await loadIssuesModule();
  var source = mod.createProductionStaffTeamSource();
  var result = await source.fetchOptions();
  assert.deepEqual(result.raisedByOptions, ['Amara Fernando', 'Bhanu Silva']);
  assert.deepEqual(result.teamOptions, ['Amazon Team', 'Zenith Team']);
  assert.ok(calls.some(function (u) { return u.indexOf('/api/staff?') !== -1 && u.indexOf('staff_status=Active') !== -1; }));
  assert.ok(calls.some(function (u) { return u.indexOf('/api/staff/filter-options') !== -1; }));
}));

test('createProductionStaffTeamSource: HTTP/network failure rejects with staffTeamUnavailable', withEnv(async function () {
  globalThis.fetch = function () { return Promise.resolve({ ok: false }); };
  var mod = await loadIssuesModule();
  await assert.rejects(mod.createProductionStaffTeamSource().fetchOptions(), function (err) {
    return err.staffTeamUnavailable === true;
  });
}));

test('createProductionStaffTeamSource: a successful-but-empty response is also treated as unavailable, never a fabricated empty list', withEnv(async function () {
  globalThis.fetch = function (url) {
    if (String(url).indexOf('/filter-options') !== -1) {
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ teams: [] }); } });
    }
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ records: [{ full_name: 'Amara Fernando' }] }); } });
  };
  var mod = await loadIssuesModule();
  await assert.rejects(mod.createProductionStaffTeamSource().fetchOptions(), function (err) {
    return err.staffTeamUnavailable === true;
  });
}));

// ── Demo data (buildDemoIssues + production adapter) ─────────────────────

test('buildDemoIssues: exactly 3 synthetic records with DEMO-ISSUE-0xx ticket IDs, bound to real supplied names/teams', withEnv(async function () {
  var mod = await loadIssuesModule();
  var demo = mod.buildDemoIssues(FIXTURE_STAFF_NAMES, FIXTURE_TEAMS);
  assert.equal(demo.length, 3);
  assert.deepEqual(demo.map(function (i) { return i.ticketId; }), ['DEMO-ISSUE-001', 'DEMO-ISSUE-002', 'DEMO-ISSUE-003']);
  demo.forEach(function (issue, i) {
    assert.equal(issue.raisedBy, FIXTURE_STAFF_NAMES[i % FIXTURE_STAFF_NAMES.length]);
    assert.equal(issue.team, FIXTURE_TEAMS[i % FIXTURE_TEAMS.length]);
  });
  assert.deepEqual(demo.map(function (i) { return i.status; }), ['RED', 'AMBER', 'GREEN']);
}));

test('createProductionIssuesAdapter: resolves 3 demo issues with isDemo=true when the staff/team source succeeds', withEnv(async function () {
  var mod = await loadIssuesModule();
  var adapter = mod.createProductionIssuesAdapter(createFixtureStaffTeamSource(FIXTURE_STAFF_NAMES, FIXTURE_TEAMS));
  var result = await adapter.fetchIssues();
  assert.equal(result.status, 'data');
  assert.equal(result.isDemo, true);
  assert.equal(result.issues.length, 3);
  assert.deepEqual(result.raisedByOptions, FIXTURE_STAFF_NAMES);
  assert.deepEqual(result.teamOptions, FIXTURE_TEAMS);
}));

test('createProductionIssuesAdapter: propagates staff/team source rejection (no fabricated demo issues on failure)', withEnv(async function () {
  var mod = await loadIssuesModule();
  var adapter = mod.createProductionIssuesAdapter(createFixtureStaffTeamSource(null, null, { reject: true, taggedUnavailable: true }));
  await assert.rejects(adapter.fetchIssues(), function (err) { return err.staffTeamUnavailable === true; });
}));

test('createProductionIssuesAdapter: assignTickets/updateSolvingStatus always resolve pending_backend — never claim success', withEnv(async function () {
  var mod = await loadIssuesModule();
  var adapter = mod.createProductionIssuesAdapter(createFixtureStaffTeamSource(FIXTURE_STAFF_NAMES, FIXTURE_TEAMS));
  assert.equal((await adapter.assignTickets(['DEMO-ISSUE-001'], 'rajiv')).status, 'pending_backend');
  assert.equal((await adapter.updateSolvingStatus('DEMO-ISSUE-001', 'solved')).status, 'pending_backend');
  assert.deepEqual(adapter.listAssignments(), {});
}));

// ── Data-safety (source-text) ────────────────────────────────────────────

test('issues.js source contains no copied hardcoded ISSUES array or reference-sample fixture values', () => {
  var srcPath = fileURLToPath(new URL('./issues.js', import.meta.url));
  var src = readFileSync(srcPath, 'utf8');
  assert.ok(!/const ISSUES = \[/.test(src));
  assert.ok(!/"ND-001"/.test(src));
  assert.ok(!/vishnusri/.test(src));
});

test('issues.js contains none of the reference sample\'s hardcoded staff names (Nandhi/Nivarnan/Sasi/Sathis)', () => {
  var srcPath = fileURLToPath(new URL('./issues.js', import.meta.url));
  var src = readFileSync(srcPath, 'utf8');
  ['Nandhi', 'Nivarnan', 'Sasi', 'Sathis'].forEach(function (name) {
    assert.ok(src.indexOf(name) === -1, name + ' must not be hardcoded in production JS');
  });
});

test('issues.js contains none of the reference sample\'s hardcoded domain/team list (Listing/PH/Postage/Pricing/Purchase)', () => {
  var srcPath = fileURLToPath(new URL('./issues.js', import.meta.url));
  var src = readFileSync(srcPath, 'utf8');
  ['Listing', 'Postage', 'Pricing', 'Purchase'].forEach(function (name) {
    assert.ok(src.indexOf("'" + name + "'") === -1 && src.indexOf('"' + name + '"') === -1, name + ' must not be a hardcoded team option');
  });
});

test('issues.js never touches window.localStorage/sessionStorage/indexedDB — no client-side assignment persistence', () => {
  var srcPath = fileURLToPath(new URL('./issues.js', import.meta.url));
  var src = readFileSync(srcPath, 'utf8');
  assert.ok(!/localStorage/.test(src));
  assert.ok(!/sessionStorage/.test(src));
  assert.ok(!/indexedDB/i.test(src));
});

// ── DOM: demo-data workspace (production adapter + fixture staff/team) ──

test('DOM: exactly 3 demo issues render, with synthetic DEMO-ISSUE ticket IDs', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('rajiv');
  var ids = ticketIdsInTable(ctx.mountEl);
  assert.equal(ids.length, 3);
  ids.forEach(function (id) { assert.match(id, /^DEMO-ISSUE-\d{3}$/); });
}));

test('DOM: issue count initially shows "3 issues"', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('rajiv');
  var issuesPanel = ctx.mountEl.querySelector('#msc-issues-view-panel-issues');
  assert.equal(issuesPanel.querySelector('.msc-issues-count-pill').textContent, '3 issues');
}));

test('DOM: demo banner renders with the exact required copy', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('rajiv');
  var banner = ctx.mountEl.querySelector('.msc-issues-demo-banner');
  assert.ok(banner);
  assert.equal(banner.hidden, false);
  assert.equal(banner.textContent, 'Demo data — 3 temporary issues are shown while the Issue System connection is pending.');
}));

test('DOM: demo banner is absent for a non-demo (test fixture) adapter', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var banner = ctx.mountEl.querySelector('.msc-issues-demo-banner');
  assert.ok(banner); // element always exists, just hidden
  assert.equal(banner.hidden, true);
}));

test('DOM: Raised By filter options come from the real staff source (order + "All" first), not a static sample list', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('rajiv');
  var select = ctx.mountEl.querySelector('#msc-issues-raised-by-filter');
  var labels = select._children.map(function (o) { return o.textContent; });
  assert.deepEqual(labels, ['All'].concat(FIXTURE_STAFF_NAMES));
}));

/* Dedup itself is unit-tested precisely at the source
   (createProductionStaffTeamSource, "fetches active staff... deduped+
   sorted" above, and "createProductionStaffTeamSource: a successful-but-
   empty response...") — by the time fetchOptions() resolves, the arrays
   are already deduped by contract, so a DOM-level fixture source (which
   stands in for that already-resolved contract) has nothing further to
   dedupe. These DOM tests instead confirm the workspace renders whatever
   the source returns verbatim, in order, with "All" first. */
test('DOM: Team filter label is "Team" and options come from the real team source verbatim (order + "All" first)', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('rajiv');
  var teamLabel = ctx.mountEl.querySelectorAll('.msc-issues-filter-label')
    .filter(function (l) { return l.getAttribute('for') === 'msc-issues-team-filter'; })[0];
  assert.ok(teamLabel);
  assert.equal(teamLabel.textContent, 'Team');
  var select = ctx.mountEl.querySelector('#msc-issues-team-filter');
  var labels = select._children.map(function (o) { return o.textContent; });
  assert.deepEqual(labels, ['All'].concat(FIXTURE_TEAMS));
}));

test('DOM: Team filter narrows the 3 demo issues correctly', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('rajiv');
  var select = ctx.mountEl.querySelector('#msc-issues-team-filter');
  select.value = FIXTURE_TEAMS[1];
  fire(select, 'change');
  var ids = ticketIdsInTable(ctx.mountEl);
  assert.equal(ids.length, 1);
  assert.equal(ids[0], 'DEMO-ISSUE-002');
  var issuesPanel = ctx.mountEl.querySelector('#msc-issues-view-panel-issues');
  assert.equal(issuesPanel.querySelector('.msc-issues-count-pill').textContent, '1 issue');
}));

test('DOM: Raised By filter narrows the 3 demo issues correctly', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('rajiv');
  var select = ctx.mountEl.querySelector('#msc-issues-raised-by-filter');
  select.value = FIXTURE_STAFF_NAMES[2];
  fire(select, 'change');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['DEMO-ISSUE-003']);
}));

test('DOM: staff/team source failure shows "Staff/team options could not be loaded." with a working Retry', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  var attempt = 0;
  var flakySource = {
    fetchOptions: function () {
      attempt += 1;
      if (attempt === 1) {
        var err = new Error('boom');
        err.staffTeamUnavailable = true;
        return Promise.reject(err);
      }
      return Promise.resolve({ raisedByOptions: FIXTURE_STAFF_NAMES, teamOptions: FIXTURE_TEAMS });
    }
  };
  mod.mountIssuesWorkspace(mountEl, {
    adapter: mod.createProductionIssuesAdapter(flakySource),
    getAuthenticatedMemberKey: function () { return 'rajiv'; }
  });
  await flush();
  var errorBox = mountEl.querySelector('.msc-issues-error');
  assert.ok(errorBox);
  assert.match(errorBox.textContent, /Staff\/team options could not be loaded\./);
  assert.equal(mountEl.querySelector('.msc-issues-demo-banner').hidden, true);

  fire(mountEl.querySelector('.msc-issues-retry-btn'), 'click');
  await flush();
  assert.equal(mountEl.querySelector('.msc-issues-error'), null);
  assert.equal(ticketIdsInTable(mountEl).length, 3);
}));

test('DOM: the real production wiring (initIssues\'s loadingMessage) shows "Loading staff and team options…" before resolving', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  var resolveFetch;
  var neverSettledSource = { fetchOptions: function () { return new Promise(function (resolve) { resolveFetch = resolve; }); } };
  mod.mountIssuesWorkspace(mountEl, {
    adapter: mod.createProductionIssuesAdapter(neverSettledSource),
    getAuthenticatedMemberKey: function () { return 'rajiv'; },
    loadingMessage: 'Loading staff and team options…'
  });
  assert.match(mountEl.querySelector('.msc-issues-loading').textContent, /Loading staff and team options…/);
  resolveFetch({ raisedByOptions: FIXTURE_STAFF_NAMES, teamOptions: FIXTURE_TEAMS });
  await flush();
  assert.equal(mountEl.querySelector('.msc-issues-loading'), null);
}));

// ── DOM: whole-panel authentication gate (REQ-AUTH-MODULES-007, 2026-08-10) ──
//
// A separate question from assignment AUTHORITY (canAssign()) above: these
// tests cover whether the workspace may be ENTERED/READ at all.

test('DOM: unauthenticated mount shows only the shared "Authorize this browser" placeholder — no table, no filters, no fetch', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  var fetchCalled = false;
  var neverCalledSource = { fetchOptions: function () { fetchCalled = true; return Promise.resolve({ raisedByOptions: [], teamOptions: [] }); } };
  mod.mountIssuesWorkspace(mountEl, {
    adapter: mod.createProductionIssuesAdapter(neverCalledSource),
    getAuthenticatedMemberKey: function () { return null; }
  });
  await flush();
  assert.equal(fetchCalled, false, 'no Staff Data API call while unauthenticated');
  assert.match(mountEl.textContent, /Authorize this browser to access Issues\./);
  assert.equal(mountEl.querySelector('.msc-issues-view-tabs'), null);
  assert.equal(mountEl.querySelector('.msc-issues-count-pill'), null);
}));

test('DOM: the real production default (no getAuthenticatedMemberKey override, no stored token) shows the placeholder', withEnv(async function () {
  var mod = await loadIssuesModule();
  var mountEl = document.createElement('div');
  mod.mountIssuesWorkspace(mountEl, { adapter: mod.createInMemoryIssuesAdapter(FIXTURE_ISSUES) });
  await flush();
  assert.match(mountEl.textContent, /Authorize this browser to access Issues\./);
}));

test('DOM: authenticated mount shows the real workspace, not the placeholder', withEnv(async function () {
  var ctx = await mountWithFixtures('mayurika');
  assert.equal(ctx.mountEl.querySelector('.msc-issues-view-tabs') === null, false);
  assert.doesNotMatch(ctx.mountEl.textContent, /Authorize this browser/);
}));

// ── DOM: assignment authority gating (rajiv, md) ─────────────────────────

['rajiv', 'md'].forEach(function (key) {
  test('DOM: ' + key + ' (assignment authority) sees Select All / Assign To / Assign controls', withEnv(async function () {
    var ctx = await mountWithFixtures(key);
    assert.ok(ctx.mountEl.querySelector('#msc-issues-select-all'));
    assert.ok(ctx.mountEl.querySelector('#msc-issues-assign-to-select'));
    assert.ok(ctx.mountEl.querySelector('.msc-issues-assign-btn'));
  }));
});

['mayurika', 'suman', 'arun', 'paraparan', null].forEach(function (key) {
  test('DOM: ' + String(key) + ' receives no assignment controls', withEnv(async function () {
    var ctx = await mountWithFixtures(key);
    assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
    assert.equal(ctx.mountEl.querySelector('#msc-issues-assign-to-select'), null);
    assert.equal(ctx.mountEl.querySelector('.msc-issues-assign-btn'), null);
  }));
});

test('DOM: a memberKey equal to the role text "Admin Manager" gets no assignment controls (role alone cannot grant)', withEnv(async function () {
  var ctx = await mountWithFixtures('Admin Manager');
  assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
}));

test('DOM: a memberKey equal to MD\'s role text "Read-only" gets no assignment controls (role/read-only text alone cannot grant)', withEnv(async function () {
  var ctx = await mountWithFixtures('Read-only');
  assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
}));

test('DOM: a memberKey equal to the display name "Rajiv" gets no assignment controls (display name alone cannot grant)', withEnv(async function () {
  var ctx = await mountWithFixtures('Rajiv');
  assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
}));

test('DOM: a memberKey equal to MD\'s display label "MD" (uppercase, matching displayName) gets no assignment controls', withEnv(async function () {
  var ctx = await mountWithFixtures('MD');
  assert.equal(ctx.mountEl.querySelector('#msc-issues-select-all'), null);
}));

['rajiv', 'md'].forEach(function (key) {
  test('DOM (' + key + '): Assign To lists only the 5 Management Team members, in registry order, no MD, no ordinary staff, no misspellings', withEnv(async function () {
    var ctx = await mountWithFixtures(key);
    var select = ctx.mountEl.querySelector('#msc-issues-assign-to-select');
    var labels = select._children.slice(1).map(function (o) { return o.textContent; }); // skip "Choose…"
    assert.deepEqual(labels, ['Mayurika', 'Suman', 'Arun', 'Rajiv', 'Paraparan']);
    assert.ok(labels.indexOf('MD') === -1, 'MD must never appear as an assignee — assignment authority is a separate question from being an assignee');
    assert.ok(labels.indexOf('Rajive') === -1);
    assert.ok(labels.indexOf('Maurika') === -1);
  }));
});

// ── DOM: general table/interaction regression (unchanged behavior) ──────

test('DOM: status tab RED shows only RED issues, with visible text (not color alone)', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var redTab = ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="RED"]');
  fire(redTab, 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ND-001', 'ST-001']);
  ctx.mountEl.querySelectorAll('.msc-issues-badge').forEach(function (b) { assert.equal(b.textContent, 'RED'); });
}));

test('DOM: status tab AMBER shows only AMBER issues', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  fire(ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="AMBER"]'), 'click');
  assert.deepEqual(ticketIdsInTable(ctx.mountEl), ['ND-002']);
}));

test('DOM: status tab GREEN shows only GREEN issues', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  fire(ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="GREEN"]'), 'click');
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

test('DOM: long text truncates with a "more" button; clicking expands to "less" and back', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var toggleBtn = ctx.mountEl.querySelector('.msc-issues-toggle-text-btn');
  assert.ok(toggleBtn);
  assert.equal(toggleBtn.textContent, 'more');
  fire(toggleBtn, 'click');
  assert.equal(toggleBtn.textContent, 'less');
  fire(toggleBtn, 'click');
  assert.equal(toggleBtn.textContent, 'more');
}));

test('DOM: a Data link renders target=_blank rel=noopener noreferrer; missing dataLink renders a dash', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var link = ctx.mountEl.querySelector('.msc-issues-data-link');
  assert.equal(link.getAttribute('target'), '_blank');
  assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  assert.ok(ctx.mountEl.querySelectorAll('.msc-issues-dash').length > 0);
}));

test('DOM: HTML-like issue content renders as literal text, never executable markup', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  assert.ok(ctx.mountEl.allText().indexOf('Low sales <img src=x onerror=alert(1)>') !== -1);
  var walk = function (node) {
    if (!node || !node._children) { return true; }
    if (node.tagName === 'IMG' || node.tagName === 'SCRIPT') { return false; }
    return node._children.every(walk);
  };
  assert.ok(walk(ctx.mountEl));
}));

test('DOM: a missing Priority Score renders a dash, not an empty cell', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  fire(ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="GREEN"]'), 'click');
  var priorityCells = ctx.mountEl.querySelectorAll('.msc-issues-priority');
  assert.equal(priorityCells.length, 1);
  assert.equal(priorityCells[0].textContent.trim(), '—');
}));

// ── DOM: assignment flow / safety ────────────────────────────────────────

test('DOM: Select All only selects currently-visible (filtered) and currently-unassigned tickets', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  fire(ctx.mountEl.querySelector('.msc-issues-status-tab[data-status="RED"]'), 'click');
  var selectAll = ctx.mountEl.querySelector('#msc-issues-select-all');
  selectAll.checked = true;
  fire(selectAll, 'change');
  var rowCheckboxes = ctx.mountEl.querySelectorAll('.msc-issues-checkbox').filter(function (cb) { return cb.getAttribute('data-ticket-id'); });
  var checked = rowCheckboxes.filter(function (cb) { return cb.checked; });
  assert.deepEqual(checked.map(function (cb) { return cb.getAttribute('data-ticket-id'); }).sort(), ['ND-001', 'ST-001']);
  assert.equal(ctx.mountEl.querySelector('.msc-issues-selected-count').textContent, '2 selected');
}));

test('DOM: Assign (in-memory fixture adapter) assigns, clears selection, populates Assigned Tickets, never mutates triage status', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var cb = ctx.mountEl.querySelector('.msc-issues-checkbox[data-ticket-id="ND-001"]');
  cb.checked = true;
  fire(cb, 'change');
  var assignToSelect = ctx.mountEl.querySelector('#msc-issues-assign-to-select');
  assignToSelect.value = 'suman';
  fire(assignToSelect, 'change');
  fire(ctx.mountEl.querySelector('.msc-issues-assign-btn'), 'click');
  await flush();

  assert.equal(ctx.mountEl.querySelector('.msc-issues-selected-count').textContent, '0 selected');
  var lockedCb = ctx.mountEl.querySelector('.msc-issues-checkbox[data-ticket-id="ND-001"]');
  assert.equal(lockedCb.checked, true);
  assert.equal(lockedCb.disabled, true);

  fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');
  var card = ctx.mountEl.querySelector('.msc-issues-card');
  assert.ok(card);
  assert.ok(card.allText().indexOf('Suman') !== -1);
  var solvingSelect = ctx.mountEl.querySelector('.msc-issues-solving-status-select');
  assert.equal(solvingSelect.value, 'not-solved');

  var originalFixture = FIXTURE_ISSUES.filter(function (i) { return i.ticketId === 'ND-001'; })[0];
  assert.equal(originalFixture.status, 'RED', 'the original fixture object must never be mutated');
}));

['rajiv', 'md'].forEach(function (key) {
  test('DOM (' + key + '): Assign (production/demo adapter) shows "Assignment connection pending" and never fabricates a saved assignment', withEnv(async function () {
    var ctx = await mountWithProductionDemoAdapter(key);
    var cb = ctx.mountEl.querySelector('.msc-issues-checkbox[data-ticket-id="DEMO-ISSUE-001"]');
    cb.checked = true;
    fire(cb, 'change');
    var assignToSelect = ctx.mountEl.querySelector('#msc-issues-assign-to-select');
    assignToSelect.value = 'suman';
    fire(assignToSelect, 'change');
    fire(ctx.mountEl.querySelector('.msc-issues-assign-btn'), 'click');
    await flush();

    var notice = ctx.mountEl.querySelector('.msc-issues-assign-notice');
    assert.equal(notice.hidden, false);
    assert.match(notice.textContent, /Assignment connection pending/);
    assert.ok(!/saved/.test(notice.textContent) || /not saved/.test(notice.textContent), 'must never claim success');

    fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');
    assert.equal(ctx.mountEl.querySelector('.msc-issues-card'), null);
    assert.match(ctx.mountEl.querySelector('.msc-issues-empty').textContent, /No tickets are currently assigned/);
  }));
});

test('DOM: no assignment persistence occurs anywhere (localStorage/sessionStorage untouched) after an MD-initiated Assign', withEnv(async function () {
  var ctx = await mountWithProductionDemoAdapter('md');
  var before = Object.assign({}, window.localStorage._store);
  var cb = ctx.mountEl.querySelector('.msc-issues-checkbox[data-ticket-id="DEMO-ISSUE-002"]');
  cb.checked = true;
  fire(cb, 'change');
  var assignToSelect = ctx.mountEl.querySelector('#msc-issues-assign-to-select');
  assignToSelect.value = 'arun';
  fire(assignToSelect, 'change');
  fire(ctx.mountEl.querySelector('.msc-issues-assign-btn'), 'click');
  await flush();
  assert.deepEqual(window.localStorage._store, before, 'no localStorage key should be added/changed by an Assign click');
}));

test('DOM: solving status changes the card badge but never the issue\'s own triage status', withEnv(async function () {
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

  var fetchResult = await ctx.adapter.fetchIssues();
  var stillRed = fetchResult.issues.filter(function (i) { return i.ticketId === 'ND-001'; })[0];
  assert.equal(stillRed.status, 'RED');
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

// ── Empty / loading / error states (generic adapter path) ───────────────

test('DOM: empty state renders "No issues are available yet." for a genuinely empty in-memory adapter', withEnv(async function () {
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

test('DOM: default loading text ("Loading issues…") applies when no loadingMessage is specified', withEnv(async function () {
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
}));

test('DOM: generic error state renders "Issues could not be loaded. Please try again." with a working Retry button', withEnv(async function () {
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
  assert.match(mountEl.querySelector('.msc-issues-error').textContent, /Issues could not be loaded\. Please try again\./);
  fire(mountEl.querySelector('.msc-issues-retry-btn'), 'click');
  await flush();
  assert.equal(mountEl.querySelector('.msc-issues-error'), null);
  assert.equal(ticketIdsInTable(mountEl).length, FIXTURE_ISSUES.length);
}));

// ── View switching (regression) ──────────────────────────────────────────

test('DOM: Issues is the default internal view; switching to Assigned Tickets and back works, panels never both visible', withEnv(async function () {
  var ctx = await mountWithFixtures('rajiv');
  var issuesPanel = ctx.mountEl.querySelector('#msc-issues-view-panel-issues');
  var assignedPanel = ctx.mountEl.querySelector('#msc-issues-view-panel-assigned');
  assert.equal(issuesPanel.hidden, false);
  assert.equal(assignedPanel.hidden, true);

  fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="assigned"]'), 'click');
  assert.equal(issuesPanel.hidden, true);
  assert.equal(assignedPanel.hidden, false);

  fire(ctx.mountEl.querySelector('.msc-issues-view-tab[data-view="issues"]'), 'click');
  assert.equal(issuesPanel.hidden, false);
  assert.equal(assignedPanel.hidden, true);
}));
