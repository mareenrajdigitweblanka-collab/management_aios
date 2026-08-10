/* issues.js — Management AIOS Issues workspace (REQ-ISSUES-UI-001,
   2026-08-10; corrected 2026-08-10 per confirmed business rules, twice).

   Frontend-only. The Issue System remains the authoritative source of
   issue truth — this module never invents, persists, or writes issue
   records anywhere. There is no Issue-System integration API yet, so
   assignment calls always resolve { status: 'pending_backend' } and are
   never presented to the user as saved. See
   docs/2026-08-10_management-issues-frontend-requirement.md.

   Built from a supplied standalone reference HTML page (postage-daily-
   issues.html) for UX/interaction reference only — its hardcoded ISSUES
   array and in-memory `assignments` object are NOT reused as production
   truth; they may only ever appear as test/dev fixtures (see
   issues.test.mjs).

   CORRECTIONS applied 2026-08-10, after live-browser review of the
   original implementation surfaced the reference sample's own sample
   names/domains had leaked into what a reviewer would see as "the"
   Raised By / Domain option lists (because the production adapter had no
   real issue records to derive them from, the lists rendered empty —
   which is correct, but made the underlying question "where SHOULD these
   options come from" visible and worth answering properly rather than
   deferring indefinitely):

   1. Raised By is no longer derived only from whatever issue records
      happen to be loaded — it is populated from the existing, real Staff
      Data API (GET /api/staff, active staff only), reusing
      staff-data.js's own STAFF_API_BASE host-detection constant rather
      than inventing a second one (same reuse pattern review-summaries.js
      already established for its own staff search).
   2. "Domain" is renamed to "Team" (business concept correction) and its
      options come from the same Staff Data API's
      GET /api/staff/filter-options `teams` array — the live, actual set
      of department/team values recorded in the system — never a
      hardcoded Listing/PH/Postage/Pricing/Purchase list copied from the
      reference sample. The issue record's own field is renamed from
      `domain` to `team` throughout (a safe frontend-only rename — there
      is no backend Issues API yet for this to desynchronize with).
   3. Exactly 3 synthetic DEMO-ISSUE-0xx records are shown (never treated
      as real issue truth — see the mandatory demo banner) so the
      workspace is not permanently empty while the real Issue System
      integration remains a separate, unapproved future requirement. Each
      demo record's Raised By/Team values are bound to real values
      pulled from the Staff Data API above, never fabricated names.
   4. Assignment authority is an EXACT-identity allowlist —
      hasAssignmentAuthority(memberKey) — true only for member_keys in
      ISSUE_ASSIGNMENT_AUTHORITY_KEYS. This replaces a role-text check
      (member-registry.js's now-removed isAdminMemberKey(),
      role === 'Admin Manager') that a business review confirmed was the
      wrong shape: a role check would incorrectly grant assignment rights
      to any future second "Admin Manager" the registry might ever gain.
      "Assign To" itself is UNCHANGED — it still lists only the 5
      Management Team members from member-registry.js's MEMBER_REGISTRY
      (never MD, never a general staff member), since that was already
      correct and is a completely separate question from who MAY assign.
   5. SECOND correction (2026-08-10, same day): the allowlist was widened
      from {'rajiv'} to {'rajiv', 'md'} — MD may now also assign Issues,
      per a further confirmed business rule. This is an EXPLICIT allowlist
      change, not a reintroduction of role/display-name/substring
      matching — 'md' is added as its own exact literal, same as 'rajiv'.
      MD having assignment AUTHORITY is unrelated to, and does not change,
      MD's Review Summary read-only status (isReadOnlyMember/MD_MEMBER_KEY,
      member-registry.js) — that is a completely different feature's gate.
      MD also remains excluded from "Assign To" (ASSIGNEE_ORDER above) —
      MD may assign an issue to one of the 5 Management Team members, but
      MD is never itself a valid assignee.

   Built via createElement/appendChild with textContent for every
   issue-authored field (never innerHTML for untrusted text) — same
   convention as review-summaries.js — so issue content can never be
   interpreted as markup, and this module stays testable with the existing
   hand-rolled DOM stand-in (review-summaries-test-dom.mjs, reused as-is by
   issues.test.mjs rather than duplicated).

   Mounted exactly once, inside the independent #tab-issues panel
   (web-view/index.html) — a sibling of #tab-review-summaries, never
   nested inside any Management Team member panel. */

import { getStoredMemberKey, CALENDAR_AUTH_CHANGED_EVENT } from './calendar/auth.js';
import { MEMBER_REGISTRY, MD_MEMBER_KEY } from './member-registry.js';
import { STAFF_API_BASE } from './staff-data.js';

// ── Constants ────────────────────────────────────────────────────────────

var TRUNCATE_LENGTH = 320;

/* Fixed display order for the assignee dropdown — mirrors review-
   summaries.js's own REVIEWER_FILTER_ORDER convention (a stable,
   documented order rather than trusting object-key iteration order).
   MD is deliberately excluded — MD is a read-only authentication display
   identity (member-registry.js), never a Management issue assignee. This
   list is UNCHANGED by the 2026-08-10 correction — "who may be assigned
   to" was already correct; only "who may DO the assigning" changed. */
export var ASSIGNEE_ORDER = ['mayurika', 'suman', 'arun', 'rajiv', 'paraparan'];

/* REQ-ISSUES-UI-001 correction (2026-08-10, second correction) —
   assignment authority is an explicit allowlist of exact identities,
   never a role-text check, never a display-name check, never substring
   matching (see module header). Rajiv and MD may both assign Issues;
   every other Management Team member may not. Exported as a named
   constant, not inlined at each call site, so a test can assert against
   it directly instead of a duplicated literal.

   MD having assignment AUTHORITY here is a completely separate question
   from MD being an ASSIGNEE (getAssigneeOptions/ASSIGNEE_ORDER above) —
   MD may assign an issue to one of the 5 Management Team members, but MD
   itself is never a valid assignee. Also separate from, and does not
   change, MD's read-only status for Review Summaries
   (member-registry.js's isReadOnlyMember/MD_MEMBER_KEY) — that gate is
   untouched by this constant. */
export var ISSUE_ASSIGNMENT_AUTHORITY_KEYS = new Set(['rajiv', 'md']);

export function hasAssignmentAuthority(memberKey) {
  return ISSUE_ASSIGNMENT_AUTHORITY_KEYS.has(memberKey);
}

export var STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'RED', label: 'Red' },
  { value: 'AMBER', label: 'Amber' },
  { value: 'GREEN', label: 'Green' }
];

function statusBadgeClass(status) {
  var s = (status || '').toUpperCase();
  if (s === 'RED') { return 'msc-issues-badge-red'; }
  if (s === 'AMBER') { return 'msc-issues-badge-amber'; }
  if (s === 'GREEN') { return 'msc-issues-badge-green'; }
  return 'msc-issues-badge-gray';
}

/* Solving status is a SEPARATE, assignment-only concept from the issue's
   own RED/AMBER/GREEN triage status (issue.status) — changing one never
   writes the other. Kept only in the adapter's in-memory assignment
   record, never on the issue object itself. */
export var SOLVING_STATUS_OPTIONS = [
  { value: 'not-solved', label: 'Not Solved', badgeClass: 'msc-issues-badge-red' },
  { value: 'partially-solved', label: 'Partially Solved', badgeClass: 'msc-issues-badge-amber' },
  { value: 'solved', label: 'Solved Completely', badgeClass: 'msc-issues-badge-green' }
];

export function solvingStatusOption(value) {
  return SOLVING_STATUS_OPTIONS.filter(function (s) { return s.value === value; })[0] || SOLVING_STATUS_OPTIONS[0];
}

/* Every column except Data is sortable. "Domain" renamed to "Team"
   (2026-08-10 correction) — both the visible label and the underlying
   issue-record field key (team, not domain). */
var TABLE_COLUMNS = [
  { key: 'ticketId', label: 'Ticket ID', sortable: true },
  { key: 'member', label: 'Member', sortable: true },
  { key: 'raisedBy', label: 'Raised By', sortable: true },
  { key: 'dateRaised', label: 'Date Raised', sortable: true },
  { key: 'team', label: 'Team', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'priority', label: 'Priority Score', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'description', label: 'Description', sortable: true },
  { key: 'rootCause', label: 'Root Cause', sortable: true },
  { key: 'whatIsHappening', label: 'What Is Happening', sortable: true },
  { key: 'documentGap', label: 'Document Gap', sortable: true },
  { key: 'fix', label: 'Fix & Action Required', sortable: true },
  { key: 'dataLink', label: 'Data', sortable: false }
];

export var DEMO_BANNER_TEXT = 'Demo data — 3 temporary issues are shown while the Issue System connection is pending.';

// ── Pure helpers (exported for direct testing — no DOM involved) ──────────

export function getAssigneeOptions() {
  return ASSIGNEE_ORDER
    .filter(function (key) { return key !== MD_MEMBER_KEY && !!MEMBER_REGISTRY[key]; })
    .map(function (key) { return { memberKey: key, displayName: MEMBER_REGISTRY[key].displayName }; });
}

/* Dedupes + alphabetically sorts a plain array of strings, dropping any
   falsy value — the one place this logic lives, reused for both the
   Raised By (staff full_name) and Team (department_team) option lists,
   whether they come from real issue records (uniqueSortedValues below)
   or directly from the Staff Data API (createProductionStaffTeamSource). */
export function uniqueSorted(values) {
  var seen = {};
  var out = [];
  (values || []).forEach(function (v) {
    if (!v || seen[v]) { return; }
    seen[v] = true;
    out.push(v);
  });
  out.sort(function (a, b) { return a.localeCompare(b); });
  return out;
}

export function uniqueSortedValues(issues, field) {
  return uniqueSorted(issues.map(function (issue) { return issue[field]; }));
}

export function filterIssues(issues, filters) {
  filters = filters || {};
  return issues.filter(function (issue) {
    if (filters.raisedBy && filters.raisedBy !== 'all' && issue.raisedBy !== filters.raisedBy) { return false; }
    if (filters.team && filters.team !== 'all' && issue.team !== filters.team) { return false; }
    if (filters.status && filters.status !== 'all' && (issue.status || '').toUpperCase() !== filters.status) { return false; }
    return true;
  });
}

var PRIORITY_ORDER = { critical: 3, high: 2, medium: 1, '': -1 };

function compareIssues(a, b, sortKey) {
  var av = a[sortKey];
  var bv = b[sortKey];
  if (sortKey === 'priority') {
    var an = PRIORITY_ORDER[(av || '').toLowerCase()];
    var bn = PRIORITY_ORDER[(bv || '').toLowerCase()];
    an = an === undefined ? 0 : an;
    bn = bn === undefined ? 0 : bn;
    return an - bn;
  }
  av = (av || '').toString().toLowerCase();
  bv = (bv || '').toString().toLowerCase();
  return av.localeCompare(bv);
}

export function sortIssues(issues, sortKey, sortDir) {
  var copy = issues.slice();
  copy.sort(function (a, b) {
    var cmp = compareIssues(a, b, sortKey);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  return copy;
}

/* Returns { truncated, preview } — preview is the full text unchanged
   when it's already within TRUNCATE_LENGTH. Pure/testable independent of
   any DOM. */
export function previewText(text) {
  var safe = text == null ? '' : String(text);
  if (safe.length <= TRUNCATE_LENGTH) { return { truncated: false, preview: safe }; }
  return { truncated: true, preview: safe.slice(0, TRUNCATE_LENGTH) + '…' };
}

// ── Demo issue records (2026-08-10 correction) ─────────────────────────
//
// Exactly 3 synthetic records, per confirmed business rule — never real
// issue truth (see DEMO_BANNER_TEXT above, always shown alongside them).
// Ticket IDs, titles, and descriptions are entirely synthetic; only
// Raised By and Team are bound to genuine values already loaded from the
// Staff Data API (never fabricated names) — see
// createProductionIssuesAdapter below, which is the only caller.

var DEMO_TITLES = [
  'Demo issue 1 — sample record for Issues workspace preview',
  'Demo issue 2 — sample record for Issues workspace preview',
  'Demo issue 3 — sample record for Issues workspace preview'
];
var DEMO_STATUSES = ['RED', 'AMBER', 'GREEN'];
var DEMO_DESCRIPTION =
  'This is a synthetic demonstration record, not a real reported issue. It exists only to preview ' +
  'the Issues workspace layout while the Issue System backend connection is pending.';

function pick(list, i) {
  return list && list.length ? list[i % list.length] : '';
}

function padDemoNumber(n) {
  return ('00' + n).slice(-3);
}

/* raisedByOptions/teamOptions are the real, already-loaded Staff Data
   API values — never invented here. If either is empty, callers must not
   reach this function at all (createProductionStaffTeamSource rejects
   first — see below) rather than binding a demo record to a blank name. */
export function buildDemoIssues(raisedByOptions, teamOptions) {
  var todayStr = new Date().toISOString().slice(0, 10);
  return [0, 1, 2].map(function (i) {
    return {
      ticketId: 'DEMO-ISSUE-' + padDemoNumber(i + 1),
      member: '',
      raisedBy: pick(raisedByOptions, i),
      dateRaised: todayStr,
      team: pick(teamOptions, i),
      status: DEMO_STATUSES[i],
      priority: '',
      title: DEMO_TITLES[i],
      description: DEMO_DESCRIPTION,
      rootCause: '',
      whatIsHappening: '',
      documentGap: '',
      fix: '',
      dataLink: ''
    };
  });
}

// ── Staff/Team source (2026-08-10 correction) ──────────────────────────
//
// Reuses the existing, real, read-only Staff Data API — the same
// STAFF_API_BASE host-detection constant staff-data.js already exports
// and review-summaries.js already reuses for its own staff search — never
// a second host-detection constant, never a hardcoded name/team list.

function fetchActiveStaffNames() {
  var params = ['limit=500', 'staff_status=Active'];
  return fetch(STAFF_API_BASE + '?' + params.join('&')).then(function (res) {
    if (!res.ok) { throw new Error('Staff lookup failed.'); }
    return res.json();
  }).then(function (body) {
    var names = (body.records || []).map(function (r) { return r.full_name; });
    return uniqueSorted(names);
  });
}

function fetchTeamNames() {
  return fetch(STAFF_API_BASE + '/filter-options').then(function (res) {
    if (!res.ok) { throw new Error('Team lookup failed.'); }
    return res.json();
  }).then(function (body) {
    return uniqueSorted(body.teams || []);
  });
}

/* fetchOptions() resolves { raisedByOptions, teamOptions } — both real,
   deduped, alphabetically sorted arrays of strings — or rejects with an
   Error carrying `.staffTeamUnavailable = true` (network/HTTP failure, OR
   a successful-but-empty response from either endpoint, which is treated
   identically: safer to show "could not be loaded" than to ever bind a
   demo record to an empty/fabricated value). */
export function createProductionStaffTeamSource() {
  return {
    fetchOptions: function () {
      return Promise.all([fetchActiveStaffNames(), fetchTeamNames()]).then(
        function (results) {
          var raisedByOptions = results[0];
          var teamOptions = results[1];
          if (!raisedByOptions.length || !teamOptions.length) {
            var emptyErr = new Error('Staff/team options unavailable.');
            emptyErr.staffTeamUnavailable = true;
            throw emptyErr;
          }
          return { raisedByOptions: raisedByOptions, teamOptions: teamOptions };
        },
        function (err) {
          var tagged = (err instanceof Error) ? err : new Error('Staff/team options unavailable.');
          tagged.staffTeamUnavailable = true;
          throw tagged;
        }
      );
    }
  };
}

// ── Data adapter ────────────────────────────────────────────────────────
//
// Replaceable by design — mountIssuesWorkspace() takes an adapter via
// opts.adapter; only the shape below matters to the rest of this module.
// createProductionIssuesAdapter() is the default, wired into app.js's
// production boot path (initIssues). createInMemoryIssuesAdapter() is for
// tests/dev fixtures only.

/* staffTeamSourceOverride is test-only (avoids a real network call in
   issues.test.mjs) — production wiring (initIssues) always omits it,
   defaulting to createProductionStaffTeamSource() above. */
export function createProductionIssuesAdapter(staffTeamSourceOverride) {
  var staffTeamSource = staffTeamSourceOverride || createProductionStaffTeamSource();
  return {
    fetchIssues: function () {
      return staffTeamSource.fetchOptions().then(function (opts) {
        return {
          status: 'data',
          issues: buildDemoIssues(opts.raisedByOptions, opts.teamOptions),
          isDemo: true,
          raisedByOptions: opts.raisedByOptions,
          teamOptions: opts.teamOptions
        };
      });
    },
    /* Backend assignment persistence remains explicitly out of scope
       (per instruction) — always 'pending_backend', never a false
       "saved" state, regardless of how many demo records are selected. */
    assignTickets: function () {
      return Promise.resolve({ status: 'pending_backend' });
    },
    updateSolvingStatus: function () {
      return Promise.resolve({ status: 'pending_backend' });
    },
    listAssignments: function () {
      return {};
    }
  };
}

export function createInMemoryIssuesAdapter(seedIssues) {
  var issues = (seedIssues || []).slice();
  var assignments = {};
  return {
    fetchIssues: function () {
      return Promise.resolve({ status: issues.length ? 'data' : 'empty', issues: issues.slice() });
    },
    assignTickets: function (ticketIds, assigneeKey) {
      var today = new Date().toISOString().slice(0, 10);
      ticketIds.forEach(function (id) {
        assignments[id] = { assignedTo: assigneeKey, assignedDate: today, solvingStatus: 'not-solved' };
      });
      return Promise.resolve({ status: 'assigned' });
    },
    updateSolvingStatus: function (ticketId, solvingStatus) {
      if (assignments[ticketId]) { assignments[ticketId].solvingStatus = solvingStatus; }
      return Promise.resolve({ status: 'updated' });
    },
    listAssignments: function () {
      var copy = {};
      Object.keys(assignments).forEach(function (id) { copy[id] = Object.assign({}, assignments[id]); });
      return copy;
    }
  };
}

// ── DOM helpers ─────────────────────────────────────────────────────────

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  return node;
}

function textEl(tag, className, text) {
  var node = el(tag, className);
  node.textContent = text;
  return node;
}

function dashOrText(container, value) {
  if (!value) {
    container.appendChild(textEl('span', 'msc-issues-dash', '—'));
    return;
  }
  container.appendChild(document.createTextNode(String(value)));
}

/* Builds a truncate/expand field — same "Show more"/"Show less" pattern
   as review-summaries.css's .review-summaries-toggle-text-btn. Appends
   directly to `container`. Empty/missing values render as "—", never as
   an empty cell. */
function appendTruncatedField(container, value) {
  if (!value) {
    container.appendChild(textEl('span', 'msc-issues-dash', '—'));
    return;
  }
  var text = String(value);
  var info = previewText(text);
  var textNode = textEl('span', 'msc-issues-cell-text', info.truncated ? info.preview : text);
  container.appendChild(textNode);
  if (info.truncated) {
    var expanded = false;
    var toggleBtn = el('button', 'msc-btn msc-btn-ghost msc-issues-toggle-text-btn');
    toggleBtn.type = 'button';
    toggleBtn.textContent = 'more';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.addEventListener('click', function () {
      expanded = !expanded;
      textNode.textContent = expanded ? text : info.preview;
      toggleBtn.textContent = expanded ? 'less' : 'more';
      toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    container.appendChild(toggleBtn);
  }
}

function buildStatusBadge(status) {
  var badge = textEl('span', 'msc-issues-badge ' + statusBadgeClass(status), (status || '').toUpperCase() || '—');
  return badge;
}

// ── Workspace ───────────────────────────────────────────────────────────

/* Mounted exactly once (initIssues below), inside the independent
   #tab-issues panel. opts:
     - adapter: data adapter (see above) — defaults to the production
       (demo-data) adapter.
     - getAuthenticatedMemberKey: () => memberKey|null — defaults to
       calendar/auth.js's getStoredMemberKey(), the same browser-wide
       token identity Review Summaries already uses. Overridable for
       tests so assignment-authority/non-authority/MD gating can be
       exercised deterministically.
     - loadingMessage: initial loading-state text — defaults to
       'Loading issues…'; initIssues() passes 'Loading staff and team
       options…' for the real production wiring, since that path's
       loading state really is waiting on the Staff Data API, not an
       Issue System fetch. */
export function mountIssuesWorkspace(mountEl, opts) {
  if (!mountEl) { return null; }
  opts = opts || {};
  var adapter = opts.adapter || createProductionIssuesAdapter();
  var getAuthenticatedMemberKey = opts.getAuthenticatedMemberKey || getStoredMemberKey;
  var loadingMessage = opts.loadingMessage || 'Loading issues…';

  var state = {
    status: 'loading', // 'loading' | 'data' | 'empty' | 'error'
    issues: [],
    filters: { raisedBy: 'all', team: 'all', status: 'all' },
    sortKey: 'dateRaised',
    sortDir: 'desc',
    view: 'issues', // 'issues' | 'assigned'
    selectedTicketIds: {},
    assigneeFilter: 'all',
    assignments: {},
    lastFilteredIds: [],
    isDemo: false,
    raisedByOptions: null,
    teamOptions: null,
    errorMessage: null
  };

  function canAssign() { return hasAssignmentAuthority(getAuthenticatedMemberKey()); }

  // ── Static shell (built once) ──────────────────────────────────────

  mountEl.textContent = '';

  var viewTabs = el('div', 'msc-issues-view-tabs');
  viewTabs.setAttribute('role', 'tablist');
  viewTabs.setAttribute('aria-label', 'Issues views');

  var issuesTabBtn = el('button', 'msc-issues-view-tab');
  issuesTabBtn.type = 'button';
  issuesTabBtn.id = 'msc-issues-view-tab-issues';
  issuesTabBtn.setAttribute('role', 'tab');
  issuesTabBtn.setAttribute('data-view', 'issues');
  issuesTabBtn.setAttribute('aria-controls', 'msc-issues-view-panel-issues');
  issuesTabBtn.textContent = 'Issues';

  var assignedTabBtn = el('button', 'msc-issues-view-tab');
  assignedTabBtn.type = 'button';
  assignedTabBtn.id = 'msc-issues-view-tab-assigned';
  assignedTabBtn.setAttribute('role', 'tab');
  assignedTabBtn.setAttribute('data-view', 'assigned');
  assignedTabBtn.setAttribute('aria-controls', 'msc-issues-view-panel-assigned');
  assignedTabBtn.textContent = 'Assigned Tickets';

  viewTabs.appendChild(issuesTabBtn);
  viewTabs.appendChild(assignedTabBtn);
  mountEl.appendChild(viewTabs);

  // ── Issues view panel ────────────────────────────────────────────

  var issuesPanel = el('div', 'msc-issues-view-panel');
  issuesPanel.id = 'msc-issues-view-panel-issues';
  issuesPanel.setAttribute('role', 'tabpanel');
  issuesPanel.setAttribute('aria-labelledby', 'msc-issues-view-tab-issues');

  var toolbar = el('div', 'msc-issues-toolbar');

  // Raised By — options come from state.raisedByOptions (real Staff Data
  // API values) when available, else derived from the loaded issues
  // (fallback for test/dev fixture adapters — see populateFilterOptions).
  var raisedByField = el('div', 'msc-issues-filter-field');
  var raisedByLabel = textEl('label', 'msc-issues-filter-label', 'Raised By');
  raisedByLabel.setAttribute('for', 'msc-issues-raised-by-filter');
  var raisedBySelect = el('select', 'msc-issues-select');
  raisedBySelect.id = 'msc-issues-raised-by-filter';
  raisedByField.appendChild(raisedByLabel);
  raisedByField.appendChild(raisedBySelect);

  // Team (renamed from Domain, 2026-08-10 correction)
  var teamField = el('div', 'msc-issues-filter-field');
  var teamLabel = textEl('label', 'msc-issues-filter-label', 'Team');
  teamLabel.setAttribute('for', 'msc-issues-team-filter');
  var teamSelect = el('select', 'msc-issues-select');
  teamSelect.id = 'msc-issues-team-filter';
  teamField.appendChild(teamLabel);
  teamField.appendChild(teamSelect);

  // Status
  var statusField = el('div', 'msc-issues-filter-field');
  var statusLabel = textEl('span', 'msc-issues-filter-label', 'Status');
  var statusTabs = el('div', 'msc-issues-status-tabs');
  statusTabs.setAttribute('role', 'group');
  statusTabs.setAttribute('aria-label', 'Filter by status');
  var statusButtons = {};
  STATUS_FILTERS.forEach(function (opt) {
    var btn = el('button', 'msc-issues-status-tab');
    btn.type = 'button';
    btn.setAttribute('data-status', opt.value);
    btn.setAttribute('aria-pressed', opt.value === 'all' ? 'true' : 'false');
    btn.textContent = opt.label;
    statusButtons[opt.value] = btn;
    statusTabs.appendChild(btn);
  });
  statusField.appendChild(statusLabel);
  statusField.appendChild(statusTabs);

  toolbar.appendChild(raisedByField);
  toolbar.appendChild(teamField);
  toolbar.appendChild(statusField);

  // Assignment controls — rendered only for the exact identities in
  // ISSUE_ASSIGNMENT_AUTHORITY_KEYS (Rajiv, MD), never for any other
  // authenticated member (including any future second "Admin Manager"),
  // never when unauthenticated. MD seeing these controls is unrelated to,
  // and does not change, MD's separate read-only status for Review
  // Summaries (member-registry.js's isReadOnlyMember).
  var assignToolbar = null;
  var selectAllCheckbox = null;
  var assignToSelect = null;
  var assignBtn = null;
  var selectedCountEl = null;
  var assignNoticeEl = null;

  if (canAssign()) {
    assignToolbar = el('div', 'msc-issues-assign-toolbar');

    var selectAllField = el('div', 'msc-issues-filter-field');
    var selectAllLabel = el('label', 'msc-issues-select-all-label');
    selectAllCheckbox = el('input', 'msc-issues-checkbox');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = 'msc-issues-select-all';
    var selectAllText = textEl('span', '', 'Select All');
    selectAllLabel.setAttribute('for', 'msc-issues-select-all');
    selectAllLabel.appendChild(selectAllText);
    selectAllLabel.appendChild(selectAllCheckbox);
    selectAllField.appendChild(selectAllLabel);

    var assignField = el('div', 'msc-issues-filter-field');
    var assignLabel = textEl('label', 'msc-issues-filter-label', 'Assign To');
    assignLabel.setAttribute('for', 'msc-issues-assign-to-select');
    assignToSelect = el('select', 'msc-issues-select');
    assignToSelect.id = 'msc-issues-assign-to-select';
    var chooseOpt = el('option', '');
    chooseOpt.value = '';
    chooseOpt.textContent = 'Choose…';
    assignToSelect.appendChild(chooseOpt);
    getAssigneeOptions().forEach(function (a) {
      var opt = el('option', '');
      opt.value = a.memberKey;
      opt.textContent = a.displayName;
      assignToSelect.appendChild(opt);
    });
    assignBtn = el('button', 'msc-btn msc-btn-primary msc-issues-assign-btn');
    assignBtn.type = 'button';
    assignBtn.textContent = 'Assign';
    assignBtn.disabled = true;
    selectedCountEl = textEl('span', 'msc-issues-selected-count', '0 selected');

    assignField.appendChild(assignLabel);
    assignField.appendChild(assignToSelect);
    assignField.appendChild(assignBtn);
    assignField.appendChild(selectedCountEl);

    assignToolbar.appendChild(selectAllField);
    assignToolbar.appendChild(assignField);
    toolbar.appendChild(assignToolbar);

    assignNoticeEl = el('p', 'msc-issues-assign-notice');
    assignNoticeEl.setAttribute('role', 'status');
    assignNoticeEl.setAttribute('aria-live', 'polite');
    assignNoticeEl.hidden = true;
  }

  var countPill = el('span', 'msc-issues-count-pill');
  toolbar.appendChild(countPill);

  issuesPanel.appendChild(toolbar);
  if (assignNoticeEl) { issuesPanel.appendChild(assignNoticeEl); }

  // Demo-data banner (Phase 5) — visible, accessibly-styled, never small
  // footer text. Shown only when the active adapter's result is flagged
  // isDemo (the production adapter always sets this; test/dev fixture
  // adapters never do).
  var demoBannerEl = el('div', 'msc-issues-demo-banner');
  demoBannerEl.setAttribute('role', 'note');
  demoBannerEl.hidden = true;
  issuesPanel.appendChild(demoBannerEl);

  var tableRegion = el('div', 'msc-issues-table-region');
  issuesPanel.appendChild(tableRegion);

  mountEl.appendChild(issuesPanel);

  // ── Assigned Tickets view panel ─────────────────────────────────────

  var assignedPanel = el('div', 'msc-issues-view-panel');
  assignedPanel.id = 'msc-issues-view-panel-assigned';
  assignedPanel.setAttribute('role', 'tabpanel');
  assignedPanel.setAttribute('aria-labelledby', 'msc-issues-view-tab-assigned');
  assignedPanel.hidden = true;

  var assignedToolbar = el('div', 'msc-issues-toolbar');
  var assigneeField = el('div', 'msc-issues-filter-field');
  var assigneeLabel = textEl('label', 'msc-issues-filter-label', 'Assignee');
  assigneeLabel.setAttribute('for', 'msc-issues-assignee-filter');
  var assigneeSelect = el('select', 'msc-issues-select');
  assigneeSelect.id = 'msc-issues-assignee-filter';
  var allAssigneesOpt = el('option', '');
  allAssigneesOpt.value = 'all';
  allAssigneesOpt.textContent = 'All Assignees';
  assigneeSelect.appendChild(allAssigneesOpt);
  getAssigneeOptions().forEach(function (a) {
    var opt = el('option', '');
    opt.value = a.memberKey;
    opt.textContent = a.displayName;
    assigneeSelect.appendChild(opt);
  });
  assigneeField.appendChild(assigneeLabel);
  assigneeField.appendChild(assigneeSelect);
  assignedToolbar.appendChild(assigneeField);
  var assignedCountPill = el('span', 'msc-issues-count-pill');
  assignedToolbar.appendChild(assignedCountPill);
  assignedPanel.appendChild(assignedToolbar);

  var cardsRegion = el('div', 'msc-issues-cards-region');
  assignedPanel.appendChild(cardsRegion);

  mountEl.appendChild(assignedPanel);

  // ── View switching ──────────────────────────────────────────────────

  function setActiveView(view) {
    state.view = view;
    issuesTabBtn.classList.toggle('active', view === 'issues');
    issuesTabBtn.setAttribute('aria-selected', view === 'issues' ? 'true' : 'false');
    assignedTabBtn.classList.toggle('active', view === 'assigned');
    assignedTabBtn.setAttribute('aria-selected', view === 'assigned' ? 'true' : 'false');
    issuesPanel.hidden = view !== 'issues';
    assignedPanel.hidden = view !== 'assigned';
    render();
  }

  issuesTabBtn.addEventListener('click', function () { setActiveView('issues'); });
  assignedTabBtn.addEventListener('click', function () { setActiveView('assigned'); });
  setActiveView('issues'); // sets initial aria state without a redundant render() before data loads

  // ── Filter population + wiring ───────────────────────────────────────

  function populateFilterOptions() {
    var currentRaisedBy = raisedBySelect.value;
    raisedBySelect.textContent = '';
    var allOpt = el('option', '');
    allOpt.value = 'all';
    allOpt.textContent = 'All';
    raisedBySelect.appendChild(allOpt);
    var raisedByValues = state.raisedByOptions || uniqueSortedValues(state.issues, 'raisedBy');
    raisedByValues.forEach(function (name) {
      var opt = el('option', '');
      opt.value = name;
      opt.textContent = name;
      raisedBySelect.appendChild(opt);
    });
    raisedBySelect.value = currentRaisedBy || 'all';

    var currentTeam = teamSelect.value;
    teamSelect.textContent = '';
    var allTeamOpt = el('option', '');
    allTeamOpt.value = 'all';
    allTeamOpt.textContent = 'All';
    teamSelect.appendChild(allTeamOpt);
    var teamValues = state.teamOptions || uniqueSortedValues(state.issues, 'team');
    teamValues.forEach(function (t) {
      var opt = el('option', '');
      opt.value = t;
      opt.textContent = t; // shown verbatim — real system team values, never re-cased/guessed
      teamSelect.appendChild(opt);
    });
    teamSelect.value = currentTeam || 'all';
  }

  raisedBySelect.addEventListener('change', function () {
    state.filters.raisedBy = raisedBySelect.value;
    render();
  });
  teamSelect.addEventListener('change', function () {
    state.filters.team = teamSelect.value;
    render();
  });
  STATUS_FILTERS.forEach(function (opt) {
    statusButtons[opt.value].addEventListener('click', function () {
      state.filters.status = opt.value;
      STATUS_FILTERS.forEach(function (o) {
        statusButtons[o.value].classList.toggle('active', o.value === opt.value);
        statusButtons[o.value].setAttribute('aria-pressed', o.value === opt.value ? 'true' : 'false');
      });
      render();
    });
  });
  statusButtons.all.classList.add('active');

  assigneeSelect.addEventListener('change', function () {
    state.assigneeFilter = assigneeSelect.value;
    renderAssignedCards();
  });

  // ── Assignment wiring (assignment-authority member only) ─────────────

  function selectedCount() { return Object.keys(state.selectedTicketIds).length; }

  function updateAssignBar() {
    if (!assignToolbar) { return; }
    selectedCountEl.textContent = selectedCount() + ' selected';
    assignBtn.disabled = !(selectedCount() > 0 && assignToSelect.value !== '');
    var toggleable = state.lastFilteredIds.filter(function (id) { return !state.assignments[id]; });
    var visibleSelected = toggleable.filter(function (id) { return state.selectedTicketIds[id]; }).length;
    selectAllCheckbox.checked = toggleable.length > 0 && visibleSelected === toggleable.length;
    selectAllCheckbox.indeterminate = visibleSelected > 0 && visibleSelected < toggleable.length;
  }

  if (assignToolbar) {
    selectAllCheckbox.addEventListener('change', function () {
      var toggleable = state.lastFilteredIds.filter(function (id) { return !state.assignments[id]; });
      if (selectAllCheckbox.checked) {
        toggleable.forEach(function (id) { state.selectedTicketIds[id] = true; });
      } else {
        toggleable.forEach(function (id) { delete state.selectedTicketIds[id]; });
      }
      render();
    });

    assignToSelect.addEventListener('change', updateAssignBar);

    assignBtn.addEventListener('click', function () {
      var ticketIds = Object.keys(state.selectedTicketIds);
      var assignee = assignToSelect.value;
      if (!assignee || !ticketIds.length) { return; }
      assignBtn.disabled = true;
      adapter.assignTickets(ticketIds, assignee).then(function (result) {
        if (result && result.status === 'pending_backend') {
          assignNoticeEl.hidden = false;
          assignNoticeEl.textContent =
            'Assignment connection pending — there is no Issue-System backend connected yet, so this selection was not saved.';
        } else {
          assignNoticeEl.hidden = true;
          assignNoticeEl.textContent = '';
        }
        state.assignments = adapter.listAssignments();
        state.selectedTicketIds = {};
        assignToSelect.value = '';
        render();
      });
    });
  }

  // ── Table rendering (Issues view) ────────────────────────────────────

  function visibleIssues() {
    var filtered = filterIssues(state.issues, state.filters);
    return sortIssues(filtered, state.sortKey, state.sortDir);
  }

  function sortIndicatorText(col) {
    if (state.sortKey !== col.key) { return '↕'; }
    return state.sortDir === 'asc' ? '↑' : '↓';
  }

  function ariaSortValue(col) {
    if (state.sortKey !== col.key) { return 'none'; }
    return state.sortDir === 'asc' ? 'ascending' : 'descending';
  }

  function buildHeaderRow() {
    var tr = el('tr', '');
    if (assignToolbar) {
      var selTh = el('th', 'msc-issues-select-col');
      tr.appendChild(selTh);
    }
    TABLE_COLUMNS.forEach(function (col) {
      var th = el('th', '');
      if (col.sortable) {
        th.setAttribute('aria-sort', ariaSortValue(col));
        var btn = el('button', 'msc-issues-sort-th');
        btn.type = 'button';
        btn.setAttribute('data-sort-key', col.key);
        btn.appendChild(document.createTextNode(col.label + ' '));
        btn.appendChild(textEl('span', 'msc-issues-sort-ind' + (state.sortKey === col.key ? ' active' : ''), sortIndicatorText(col)));
        btn.addEventListener('click', function () {
          if (state.sortKey === col.key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = col.key;
            state.sortDir = 'asc';
          }
          renderIssuesTable();
        });
        th.appendChild(btn);
      } else {
        th.textContent = col.label;
      }
      tr.appendChild(th);
    });
    return tr;
  }

  function buildDataCell(dataLink) {
    var td = el('td', '');
    if (!dataLink) {
      td.appendChild(textEl('span', 'msc-issues-dash', '—'));
      return td;
    }
    var a = el('a', 'msc-issues-data-link');
    a.setAttribute('href', dataLink);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.textContent = 'View Data';
    td.appendChild(a);
    return td;
  }

  function buildRow(issue) {
    var tr = el('tr', '');
    if (assignToolbar) {
      var selTd = el('td', '');
      var isAssigned = !!state.assignments[issue.ticketId];
      var cb = el('input', 'msc-issues-checkbox');
      cb.type = 'checkbox';
      cb.setAttribute('data-ticket-id', issue.ticketId);
      cb.checked = isAssigned || !!state.selectedTicketIds[issue.ticketId];
      cb.disabled = isAssigned;
      cb.addEventListener('change', function () {
        if (cb.checked) { state.selectedTicketIds[issue.ticketId] = true; }
        else { delete state.selectedTicketIds[issue.ticketId]; }
        updateAssignBar();
      });
      selTd.appendChild(cb);
      tr.appendChild(selTd);
    }

    TABLE_COLUMNS.forEach(function (col) {
      if (col.key === 'dataLink') { tr.appendChild(buildDataCell(issue.dataLink)); return; }
      var td = el('td', '');
      if (col.key === 'ticketId') { td.className = 'msc-issues-ticket-id'; td.textContent = issue.ticketId || ''; tr.appendChild(td); return; }
      if (col.key === 'status') { td.appendChild(buildStatusBadge(issue.status)); tr.appendChild(td); return; }
      if (col.key === 'priority') {
        td.className = 'msc-issues-priority';
        dashOrText(td, issue.priority);
        tr.appendChild(td);
        return;
      }
      if (col.key === 'team' || col.key === 'dateRaised') {
        dashOrText(td, issue[col.key]);
        tr.appendChild(td);
        return;
      }
      appendTruncatedField(td, issue[col.key]);
      tr.appendChild(td);
    });

    return tr;
  }

  function renderIssuesTable() {
    demoBannerEl.hidden = !state.isDemo;
    demoBannerEl.textContent = state.isDemo ? DEMO_BANNER_TEXT : '';

    tableRegion.textContent = '';

    if (state.status === 'loading') {
      tableRegion.appendChild(textEl('div', 'msc-issues-loading', loadingMessage));
      countPill.textContent = '';
      state.lastFilteredIds = [];
      updateAssignBar();
      return;
    }

    if (state.status === 'error') {
      var errWrap = el('div', 'msc-issues-error');
      errWrap.setAttribute('role', 'alert');
      errWrap.appendChild(textEl('p', '', state.errorMessage || 'Issues could not be loaded. Please try again.'));
      var retryBtn = el('button', 'msc-btn msc-btn-ghost msc-issues-retry-btn');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', function () { loadIssues(); });
      errWrap.appendChild(retryBtn);
      tableRegion.appendChild(errWrap);
      countPill.textContent = '';
      state.lastFilteredIds = [];
      updateAssignBar();
      return;
    }

    if (state.status === 'empty' || !state.issues.length) {
      tableRegion.appendChild(textEl('div', 'msc-issues-empty', 'No issues are available yet.'));
      countPill.textContent = '0 issues';
      state.lastFilteredIds = [];
      updateAssignBar();
      return;
    }

    var filtered = visibleIssues();
    countPill.textContent = filtered.length + (filtered.length === 1 ? ' issue' : ' issues');
    state.lastFilteredIds = filtered.map(function (i) { return i.ticketId; });

    if (!filtered.length) {
      tableRegion.appendChild(textEl('div', 'msc-issues-empty', 'No issues match this filter.'));
      updateAssignBar();
      return;
    }

    var wrap = el('div', 'msc-issues-table-wrap');
    var table = el('table', 'msc-issues-table');
    var thead = el('thead', '');
    thead.appendChild(buildHeaderRow());
    var tbody = el('tbody', '');
    filtered.forEach(function (issue) { tbody.appendChild(buildRow(issue)); });
    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    tableRegion.appendChild(wrap);

    updateAssignBar();
  }

  // ── Assigned Tickets cards ───────────────────────────────────────────

  function metaRow(label, value) {
    var span = textEl('span', 'msc-issues-card-meta', (label ? label + ': ' : '') + (value || '—'));
    return span;
  }

  function buildCardField(label, value) {
    if (!value) { return null; }
    var wrap = el('div', 'msc-issues-card-field');
    wrap.appendChild(textEl('span', 'msc-issues-field-label', label));
    var valueWrap = el('div', 'msc-issues-field-value');
    appendTruncatedField(valueWrap, value);
    wrap.appendChild(valueWrap);
    return wrap;
  }

  function buildAssignedCard(issue, assignment) {
    var card = el('div', 'msc-issues-card');

    var top = el('div', 'msc-issues-card-top');
    top.appendChild(textEl('span', 'msc-issues-ticket-id', issue.ticketId));
    top.appendChild(metaRow('Raised by', issue.raisedBy));
    top.appendChild(metaRow('Date raised', issue.dateRaised));
    top.appendChild(metaRow('Team', issue.team));
    card.appendChild(top);

    card.appendChild(textEl('h3', 'msc-issues-card-title', issue.title || ''));

    var descField = buildCardField('Description', issue.description);
    if (descField) { card.appendChild(descField); }
    var rootField = buildCardField('Root Cause', issue.rootCause);
    if (rootField) { card.appendChild(rootField); }
    var whatField = buildCardField('What Is Happening', issue.whatIsHappening);
    if (whatField) { card.appendChild(whatField); }
    var fixField = buildCardField('Fix & Action Required', issue.fix);
    if (fixField) { card.appendChild(fixField); }

    var assignWrap = el('div', 'msc-issues-card-field');
    assignWrap.appendChild(textEl('span', 'msc-issues-field-label', 'Assign To'));
    var assignRow = el('div', 'msc-issues-assign-to-row');
    var assigneeEntry = MEMBER_REGISTRY[assignment.assignedTo];
    assignRow.appendChild(metaRow('Assigned to', assigneeEntry ? assigneeEntry.displayName : assignment.assignedTo));
    assignRow.appendChild(metaRow('Assigned date', assignment.assignedDate));

    var currentSolvingOpt = solvingStatusOption(assignment.solvingStatus);
    var statusSelect = el('select', 'msc-issues-select msc-issues-solving-status-select ' + currentSolvingOpt.badgeClass);
    statusSelect.setAttribute('data-ticket-id', issue.ticketId);
    SOLVING_STATUS_OPTIONS.forEach(function (s) {
      var opt = el('option', '');
      opt.value = s.value;
      opt.textContent = s.label;
      if (s.value === assignment.solvingStatus) { opt.selected = true; }
      statusSelect.appendChild(opt);
    });
    // Explicit, not left to option.selected propagation — real browsers
    // derive <select>.value from the selected <option> automatically, but
    // this keeps the value correct and immediately testable regardless.
    statusSelect.value = currentSolvingOpt.value;
    statusSelect.addEventListener('change', function () {
      adapter.updateSolvingStatus(issue.ticketId, statusSelect.value).then(function () {
        state.assignments = adapter.listAssignments();
        renderAssignedCards();
      });
    });
    assignRow.appendChild(statusSelect);
    assignWrap.appendChild(assignRow);
    card.appendChild(assignWrap);

    return card;
  }

  function renderAssignedCards() {
    cardsRegion.textContent = '';
    var assignments = state.assignments;
    var assignedIssues = state.issues.filter(function (issue) {
      var a = assignments[issue.ticketId];
      if (!a) { return false; }
      return state.assigneeFilter === 'all' || a.assignedTo === state.assigneeFilter;
    });

    assignedCountPill.textContent = assignedIssues.length + (assignedIssues.length === 1 ? ' issue' : ' issues');

    if (!assignedIssues.length) {
      cardsRegion.appendChild(textEl('div', 'msc-issues-empty', 'No tickets are currently assigned.'));
      return;
    }

    var list = el('div', 'msc-issues-cards-list');
    assignedIssues.forEach(function (issue) {
      list.appendChild(buildAssignedCard(issue, assignments[issue.ticketId]));
    });
    cardsRegion.appendChild(list);
  }

  // ── Orchestration ───────────────────────────────────────────────────

  function render() {
    populateFilterOptions();
    renderIssuesTable();
    renderAssignedCards();
  }

  function loadIssues() {
    state.status = 'loading';
    state.errorMessage = null;
    renderIssuesTable();
    adapter.fetchIssues().then(function (result) {
      state.status = result.status;
      state.issues = result.issues || [];
      state.isDemo = !!result.isDemo;
      state.raisedByOptions = result.raisedByOptions || null;
      state.teamOptions = result.teamOptions || null;
      state.assignments = adapter.listAssignments();
      render();
    }, function (err) {
      state.status = 'error';
      state.issues = [];
      state.isDemo = false;
      state.errorMessage = (err && err.staffTeamUnavailable)
        ? 'Staff/team options could not be loaded.'
        : 'Issues could not be loaded. Please try again.';
      render();
    });
  }

  loadIssues();

  return {
    // Exposed for tests only — not used by production wiring.
    getState: function () { return state; },
    reload: loadIssues
  };
}

/* Mounted once at app boot (web-view/js/app.js). Re-mounts from scratch on
   CALENDAR_AUTH_CHANGED_EVENT (calendar/auth.js) — the same browser-wide
   token change Review Summaries already reacts to — so assignment-
   authority gating stays live if the Calendar token is changed while this
   tab is open, instead of freezing whichever identity was authenticated
   at first mount. loadingMessage matches this path's real behavior — it
   is genuinely waiting on the Staff Data API before it can show anything. */
export function initIssues() {
  var mountEl = document.getElementById('issuesWorkspace');
  if (!mountEl) { return null; }
  var current = mountIssuesWorkspace(mountEl, { loadingMessage: 'Loading staff and team options…' });
  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, function () {
    current = mountIssuesWorkspace(mountEl, { loadingMessage: 'Loading staff and team options…' });
  });
  return current;
}
