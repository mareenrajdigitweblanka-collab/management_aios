/* staff-data.js — Staff Data technical pilot (synthetic sample + read-only
   Staff API). Extracted verbatim from the former inline staff-data IIFE
   (2026-07-17 frontend modularization); fully self-contained (own STAFF_API_BASE,
   own helpers). The former inline DOMContentLoaded bootstrap now lives in app.js.
   No logic changed. */

// DEV/FALLBACK-ONLY synthetic sample dataset — generated verbatim from
// member-aios/staff-data/source/sample/hr-staff-dashboard-sample.csv.
// No real employee name, NIC, or employee number appears here.
// As of 2026-07-13 this is NOT the operational data source — real
// staff data is fetched live from the Staff API (STAFF_API_BASE,
// below). This array is retained only so this file can still be
// opened offline for markup/CSS development without a backend
// running; no init function in this script references it.
var STAFF_DATA_SAMPLE = [
  { employee_number: "SAMPLE001", epf_number: "[VERIFY]", date_of_joining: "01/01/2020", full_name: "Sample Staff One", calling_name: "Staff One", location: "Jaffna", staff_status: "Active", department_team: "PH", designation: "Portfolio Executive", cv_reference: "SAMPLE-CV-001.pdf", nic: "SAMPLE-NIC-001", remarks: "synthetic sample row", employment_stage: "Permanent", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-001" },
  { employee_number: "SAMPLE002", epf_number: "[VERIFY]", date_of_joining: "15/03/2021", full_name: "Sample Staff Two", calling_name: "Staff Two", location: "Nelliyadi", staff_status: "Inactive", department_team: "PH", designation: "Portfolio Executive", cv_reference: "", nic: "SAMPLE-NIC-002", remarks: "synthetic sample row", employment_stage: "[VERIFY]", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-002" },
  { employee_number: "SAMPLE003", epf_number: "[VERIFY]", date_of_joining: "10/06/2022", full_name: "Sample Staff Three", calling_name: "Staff Three", location: "Chankanai", staff_status: "Active", department_team: "Digital Marketing", designation: "Digital Marketing Executive", cv_reference: "SAMPLE-CV-003.pdf", nic: "", remarks: "synthetic sample row", employment_stage: "Probation", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-003" },
  { employee_number: "SAMPLE004", epf_number: "[VERIFY]", date_of_joining: "05/09/2023", full_name: "Sample Staff Four", calling_name: "Staff Four", location: "WFH", staff_status: "Active", department_team: "Technical Team", designation: "Automation Engineer", cv_reference: "", nic: "SAMPLE-NIC-004", remarks: "synthetic sample row", employment_stage: "training_7_day", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-004" },
  { employee_number: "SAMPLE005", epf_number: "[VERIFY]", date_of_joining: "20/11/2019", full_name: "Sample Staff Five", calling_name: "Staff Five", location: "Jaffna", staff_status: "Inactive", department_team: "eBay", designation: "E-Commerce Executive", cv_reference: "SAMPLE-CV-005.pdf", nic: "SAMPLE-NIC-005", remarks: "synthetic sample row", employment_stage: "[VERIFY]", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-005" },
  { employee_number: "SAMPLE006", epf_number: "[VERIFY]", date_of_joining: "12/02/2024", full_name: "Sample Staff Six", calling_name: "Staff Six", location: "Nelliyadi", staff_status: "Active", department_team: "PH", designation: "E-Commerce Executive", cv_reference: "", nic: "", remarks: "synthetic sample row", employment_stage: "Permanent", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-006" },
  { employee_number: "SAMPLE007", epf_number: "[VERIFY]", date_of_joining: "28/04/2025", full_name: "Sample Staff Seven", calling_name: "Staff Seven", location: "Chankanai", staff_status: "Active", department_team: "Accounts", designation: "Accounts Assistant", cv_reference: "SAMPLE-CV-007.pdf", nic: "SAMPLE-NIC-007", remarks: "synthetic sample row", employment_stage: "Probation", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-007" },
  { employee_number: "SAMPLE008", epf_number: "[VERIFY]", date_of_joining: "30/07/2018", full_name: "Sample Staff Eight", calling_name: "Staff Eight", location: "Jaffna", staff_status: "Inactive", department_team: "Customer Service", designation: "Customer Service Executive", cv_reference: "", nic: "", remarks: "synthetic sample row", employment_stage: "[VERIFY]", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-008" },
  { employee_number: "SAMPLE009", epf_number: "[VERIFY]", date_of_joining: "03/05/2026", full_name: "Sample Staff Nine", calling_name: "Staff Nine", location: "WFH", staff_status: "Active", department_team: "Technical Team", designation: "Software Engineer", cv_reference: "SAMPLE-CV-009.pdf", nic: "SAMPLE-NIC-009", remarks: "synthetic sample row", employment_stage: "training_7_day", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-009" },
  { employee_number: "SAMPLE010", epf_number: "[VERIFY]", date_of_joining: "17/10/2020", full_name: "Sample Staff Ten", calling_name: "Staff Ten", location: "Nelliyadi", staff_status: "Active", department_team: "PH", designation: "Portfolio Executive", cv_reference: "", nic: "", remarks: "synthetic sample row", employment_stage: "Permanent", source_file: "SAMPLE-SOURCE.csv", source_page: "0", source_row_reference: "sample-row-010" }
];

// Columns shown in the main staff table. source_file/source_page/
// source_row_reference are intentionally excluded from display but
// remain on each row object for internal traceability.
var STAFF_MAIN_COLUMNS = [
  'employee_number', 'epf_number', 'date_of_joining', 'full_name', 'calling_name',
  'location', 'staff_status', 'department_team', 'designation', 'cv_reference',
  'nic', 'remarks', 'employment_stage'
];
var STAFF_COLUMN_LABELS = {
  employee_number: 'Employee Number', epf_number: 'EPF Number', date_of_joining: 'Date of Joining',
  full_name: 'Full Name', calling_name: 'Calling Name', location: 'Location',
  staff_status: 'Staff Status', department_team: 'Team', designation: 'Designation',
  cv_reference: 'CV Reference', nic: 'NIC', remarks: 'Remarks', employment_stage: 'Employment Stage'
};
var STAGE_DISPLAY_LABELS = {
  'training_7_day': '7-Day Training',
  '[VERIFY]': '[VERIFY]',
  'Permanent': 'Permanent',
  'Probation': 'Probation'
};
var ONBOARDING_STAGES = { 'Probation': true, 'training_7_day': true, '[VERIFY]': true };

/* Compact/default columns shown in the primary table (UX upgrade,
   2026-07-13). `sortKey` is the sort_by value sent to GET /api/staff
   (null = not sortable); `hideable` marks columns the column-visibility
   chooser may hide (Employee and Actions are always shown). The fuller
   STAFF_MAIN_COLUMNS field set above is unchanged and is reused as-is
   for the detail drawer. */
var STAFF_PRIMARY_COLUMNS = [
  { key: 'employee', label: 'Employee', sortKey: 'full_name', hideable: false },
  { key: 'department_team', label: 'Team', sortKey: 'department_team', hideable: true },
  { key: 'designation', label: 'Designation', sortKey: null, hideable: true },
  { key: 'staff_status', label: 'Staff Status', sortKey: 'staff_status', hideable: true },
  { key: 'employment_stage', label: 'Employment Stage', sortKey: 'employment_stage', hideable: true },
  { key: 'location', label: 'Location', sortKey: 'location', hideable: true },
  { key: 'date_of_joining', label: 'Date of Joining', sortKey: 'date_of_joining', hideable: true },
  { key: 'actions', label: 'Actions', sortKey: null, hideable: false }
];
var STAFF_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
var STAFF_DEFAULT_PAGE_SIZE = 25;

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function debounce(fn, waitMs) {
  var timer = null;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, waitMs);
  };
}

/* CSV field escaping — quotes any value containing a comma, quote, or
   newline, doubling internal quotes per RFC 4180. First CSV/Blob code
   in this file — kept as one small, deliberately explicit helper
   rather than a naive join so free-text fields (remarks, etc.) can't
   corrupt the export. */
function csvEscape(value) {
  var s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function uniqueValues(rows, field) {
  var seen = {};
  var out = [];
  rows.forEach(function (r) {
    var v = r[field];
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  });
  out.sort();
  return out;
}

/* Single centralized Staff API base — same host-detection pattern as
   MEMBER_SCHEDULE_API_BASE above (local dev talks to the local
   FastAPI server; any other host talks to the hosted backend, once
   that hosted endpoint is explicitly authorized for real staff data —
   see the access/deployment-boundary note in the Staff Data tab and
   validation/staff-data-api-check-2026-07-13.md). Read-only: this
   script only ever issues GET requests to /api/staff*. */
var STAFF_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/staff';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/staff';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

function staffApiRequest(url, signal) {
  return fetch(url, signal ? { signal: signal } : undefined).then(function (res) {
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function (errBody) {
        var detail = errBody && errBody.detail ? JSON.stringify(errBody.detail) : (res.status + ' ' + res.statusText);
        throw new Error(detail);
      });
    }
    return res.json();
  });
}

/* Builds the GET /api/staff query string. `stage` may be a single
   string (user-selected, from the shared filter dropdown) or an
   array (a tab's base pilot classification, e.g. Onboarding's
   Probation/training_7_day/[VERIFY] set) — the API accepts repeated
   employment_stage params for exactly this reason. `sortBy`/`sortDir`
   and `limit`/`offset` are populated by the per-instance table
   controller (see mountStaffTableView) — omitting sortBy reproduces
   the API's original hardcoded ordering exactly. */
function buildStaffQuery(filters) {
  filters = filters || {};
  var params = [];
  if (filters.team) params.push('team=' + encodeURIComponent(filters.team));
  if (filters.status) params.push('staff_status=' + encodeURIComponent(filters.status));
  if (filters.stage) {
    var stages = Array.isArray(filters.stage) ? filters.stage : [filters.stage];
    stages.forEach(function (s) { params.push('employment_stage=' + encodeURIComponent(s)); });
  }
  if (filters.search) params.push('search=' + encodeURIComponent(filters.search));
  if (filters.location) params.push('location=' + encodeURIComponent(filters.location));
  if (filters.sortBy) {
    params.push('sort_by=' + encodeURIComponent(filters.sortBy));
    params.push('sort_direction=' + encodeURIComponent(filters.sortDir || 'asc'));
  }
  params.push('limit=' + (filters.limit || 500));
  params.push('offset=' + (filters.offset || 0));
  return params.join('&');
}

/* Fetches real staff records from the read-only Staff API. Returns a
   promise resolving to the full StaffListResponse shape
   ({records, total, limit, offset, filters}) so callers can display
   an accurate total count, not just the current page's row count.
   `signal` (optional AbortSignal) lets a per-instance controller
   cancel a stale in-flight request when a newer one supersedes it. */
function fetchStaffRecords(filters, signal) {
  return staffApiRequest(STAFF_API_BASE + '?' + buildStaffQuery(filters), signal);
}

// ── Shared filter-merge helper — reused by Current Staff, Onboarding
// Staff Process, Resigned Staff, the Arun PH view, and the Paraparan
// view. Combines a view's fixed base classification (e.g. "Active
// only" for Current Staff) with whatever the user has additionally
// selected in the shared filter bar — the user's selection narrows
// within the base, it does not need to be re-specified per view. ──
function mergeStaffFilters(baseFilters, userFilters) {
  userFilters = userFilters || {};
  return {
    team: userFilters.team || (baseFilters && baseFilters.team) || '',
    status: userFilters.status || (baseFilters && baseFilters.status) || '',
    stage: userFilters.stage ? userFilters.stage : (baseFilters && baseFilters.stage) || '',
    search: userFilters.search || '',
    location: userFilters.location || (baseFilters && baseFilters.location) || ''
  };
}

// ── Technical pilot classification base filters — NOT approved HR
// policy (see member-aios/staff-data/evidence/
// employment-stage-rule-review-2026-07-13.md). These only decide
// which real staff rows appear under which subtab; they do not alter
// any stored data. ──
var STAFF_SUBTAB_BASE_FILTERS = {
  'current-staff': { status: 'Active' },
  'resigned-staff': { status: 'Inactive' },
  'onboarding-staff': { stage: ['Probation', 'training_7_day', '[VERIFY]'] }
};

// ── Shared cell renderers — used by the primary table, the detail
// drawer, and (for the fuller field set) never by CSV export directly
// (export reads raw values so the file stays plain text). Employment
// stage and staff status get a text label *plus* a color chip — never
// color alone (Staff Table UX upgrade, 2026-07-13 — see "STATUS
// DISPLAY" requirement). ──
function renderStaffPrimaryCell(r, colKey) {
  if (colKey === 'employee') {
    return '<div class="staff-employee-cell">' +
      '<div class="staff-employee-name">' + escapeHtml(r.full_name || '—') + '</div>' +
      (r.calling_name ? '<div class="staff-employee-calling">' + escapeHtml(r.calling_name) + '</div>' : '') +
      (r.employee_number ? '<div class="staff-employee-number">' + escapeHtml(r.employee_number) + '</div>' : '') +
      '</div>';
  }
  if (colKey === 'actions') {
    return '<button type="button" class="staff-details-btn">Details</button>';
  }
  if (colKey === 'staff_status') {
    var s = r.staff_status;
    if (!s) return '';
    if (s === '[VERIFY]') return '<span class="badge badge-verify">[VERIFY]</span>';
    var cls = s === 'Active' ? 'badge-pass' : (s === 'Inactive' ? 'badge-blocked' : 'badge-verify');
    return '<span class="badge ' + cls + '">' + escapeHtml(s) + '</span>';
  }
  if (colKey === 'employment_stage') {
    var v = r.employment_stage;
    if (!v) return '';
    if (v === '[VERIFY]') return '<span class="badge badge-verify">[VERIFY]</span>';
    return escapeHtml(STAGE_DISPLAY_LABELS[v] || v);
  }
  var raw = r[colKey];
  if (raw === '[VERIFY]') return '<span class="badge badge-verify">[VERIFY]</span>';
  return escapeHtml(raw || '');
}

function renderStaffDrawerFieldValue(r, colKey) {
  var raw = r[colKey];
  if (raw === '[VERIFY]') return '<span class="badge badge-verify">[VERIFY]</span>';
  var display = (colKey === 'employment_stage' && STAGE_DISPLAY_LABELS[raw]) ? STAGE_DISPLAY_LABELS[raw] : raw;
  return escapeHtml(display || '—');
}

/* Single centralized detail drawer, lazily created and reused by every
   staff table instance (Current/Onboarding/Resigned/Arun/Paraparan) —
   only one row can be inspected at a time, so one shared drawer avoids
   mounting 5 near-identical overlay/focus-trap instances. Renders
   exactly the STAFF_MAIN_COLUMNS field set (already the approved,
   PII-free 13-field list) — never salary/address/personal-contact
   fields, which do not exist on the row objects at all. */
var staffDrawerApi = null;
function ensureStaffDrawer() {
  if (staffDrawerApi) return staffDrawerApi;
  var overlay = document.createElement('div');
  overlay.className = 'staff-drawer-overlay';
  overlay.innerHTML =
    '<div class="staff-drawer" role="dialog" aria-modal="true" aria-labelledby="staff-drawer-title">' +
    '<div class="staff-drawer-header"><h4 id="staff-drawer-title">Staff Record</h4>' +
    '<button type="button" class="staff-drawer-close" aria-label="Close details">&times;</button></div>' +
    '<div class="staff-drawer-body"></div></div>';
  document.body.appendChild(overlay);

  var closeBtn = overlay.querySelector('.staff-drawer-close');
  var bodyEl = overlay.querySelector('.staff-drawer-body');
  var lastTrigger = null;

  function close() {
    overlay.classList.remove('show');
    document.removeEventListener('keydown', onKeydown);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      // Single focusable control in the drawer body today (the close
      // button) — keep focus trapped there rather than escaping to
      // the page behind the scrim.
      e.preventDefault();
      closeBtn.focus();
    }
  }
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

  staffDrawerApi = {
    open: function (row, triggerEl) {
      lastTrigger = triggerEl || null;
      bodyEl.innerHTML = STAFF_MAIN_COLUMNS.map(function (c) {
        return '<div class="staff-drawer-field"><div class="staff-drawer-field-label">' +
          escapeHtml(STAFF_COLUMN_LABELS[c]) + '</div><div class="staff-drawer-field-value">' +
          renderStaffDrawerFieldValue(row, c) + '</div></div>';
      }).join('');
      overlay.classList.add('show');
      document.addEventListener('keydown', onKeydown);
      closeBtn.focus();
    },
    close: close
  };
  return staffDrawerApi;
}

/* Exports exactly the currently-loaded/rendered page of rows — never a
   new fetch, and never anything beyond the approved STAFF_MAIN_COLUMNS
   field list (so excluded PII fields, which don't exist on these row
   objects at all, can never appear in the file). First Blob/CSV code
   in this file (no prior pattern to reuse). */
function exportStaffCsvFromRows(rows, viewLabel) {
  if (!rows || !rows.length) return;
  var header = STAFF_MAIN_COLUMNS.map(function (c) { return csvEscape(STAFF_COLUMN_LABELS[c]); }).join(',');
  var lines = rows.map(function (r) {
    return STAFF_MAIN_COLUMNS.map(function (c) { return csvEscape(r[c]); }).join(',');
  });
  var csv = [header].concat(lines).join('\r\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'staff-export-' + (viewLabel || 'staff').replace(/[^a-z0-9_-]+/gi, '-') + '-' +
    new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Shared, reusable staff-table view controller. One instance per
// mounted table container (Current/Onboarding/Resigned each get their
// own inside the Staff Data tab; Arun and Paraparan each get their
// own) — every instance gains sort/pagination/density/column-visibility
// /export identically since they all run through this one function.
// `load(baseEffectiveFilters)` is called by the owning init function
// whenever the shared filter bar changes; sort/page/pageSize/density/
// column changes are handled entirely inside this controller and
// re-fetch using the last-given base filters. ──
function mountStaffTableView(containerEl, viewLabel) {
  if (!containerEl) return { load: function () {} };

  var state = {
    sortBy: null,
    sortDir: 'asc',
    page: 0,
    pageSize: STAFF_DEFAULT_PAGE_SIZE,
    density: 'comfortable',
    hiddenCols: {},
    baseFilters: {},
    rows: [],
    total: 0,
    abortController: null,
    lastSignature: null
  };

  containerEl.innerHTML =
    '<div class="staff-table-toolbar">' +
    '<div class="staff-toolbar-group staff-density-toggle" role="group" aria-label="Table density">' +
    '<button type="button" class="staff-density-btn active" data-density="comfortable">Comfortable</button>' +
    '<button type="button" class="staff-density-btn" data-density="compact">Compact</button>' +
    '</div>' +
    '<div class="staff-toolbar-group">' +
    '<div class="staff-col-chooser-wrap">' +
    '<button type="button" class="staff-toolbar-btn staff-col-chooser-btn" aria-haspopup="true" aria-expanded="false">Columns</button>' +
    '<div class="staff-col-chooser-popover"></div>' +
    '</div>' +
    '<button type="button" class="staff-toolbar-btn staff-export-btn">Export CSV</button>' +
    '</div>' +
    '</div>' +
    '<div class="staff-table-region"></div>' +
    '<div class="staff-pagination-bar">' +
    '<div class="staff-page-info"></div>' +
    '<div class="staff-toolbar-group">' +
    '<label style="font-size:12px;color:var(--muted);">Rows per page ' +
    '<select class="staff-page-size-select"></select></label>' +
    '<button type="button" class="staff-page-btn staff-page-prev">&larr; Prev</button>' +
    '<button type="button" class="staff-page-btn staff-page-next">Next &rarr;</button>' +
    '</div>' +
    '</div>';

  var regionEl = containerEl.querySelector('.staff-table-region');
  var pageInfoEl = containerEl.querySelector('.staff-page-info');
  var pageSizeSel = containerEl.querySelector('.staff-page-size-select');
  var prevBtn = containerEl.querySelector('.staff-page-prev');
  var nextBtn = containerEl.querySelector('.staff-page-next');
  var colChooserBtn = containerEl.querySelector('.staff-col-chooser-btn');
  var colChooserPopover = containerEl.querySelector('.staff-col-chooser-popover');
  var exportBtn = containerEl.querySelector('.staff-export-btn');
  var densityBtns = containerEl.querySelectorAll('.staff-density-btn');

  pageSizeSel.innerHTML = STAFF_ROWS_PER_PAGE_OPTIONS.map(function (n) {
    return '<option value="' + n + '"' + (n === state.pageSize ? ' selected' : '') + '>' + n + '</option>';
  }).join('');

  colChooserPopover.innerHTML = STAFF_PRIMARY_COLUMNS.filter(function (c) { return c.hideable; }).map(function (c) {
    return '<label><input type="checkbox" class="staff-col-toggle" data-col="' + c.key + '" checked /> ' +
      escapeHtml(c.label) + '</label>';
  }).join('');

  function visibleColumns() {
    return STAFF_PRIMARY_COLUMNS.filter(function (c) { return !state.hiddenCols[c.key]; });
  }

  function sortIndicator(col) {
    if (state.sortBy !== col.sortKey) return '<span class="staff-sort-ind">↕</span>';
    return '<span class="staff-sort-ind active">' + (state.sortDir === 'asc' ? '↑' : '↓') + '</span>';
  }

  function updatePaginationControls() {
    var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    var currentPage = state.page + 1;
    pageInfoEl.textContent = 'Page ' + currentPage + ' of ' + totalPages;
    prevBtn.disabled = state.page <= 0;
    nextBtn.disabled = currentPage >= totalPages;
  }

  function renderBody() {
    var cols = visibleColumns();
    var countLine = '<div class="staff-total-count">Showing ' + state.rows.length + ' of ' + state.total +
      ' record' + (state.total === 1 ? '' : 's') + '</div>';

    if (!state.rows.length) {
      regionEl.innerHTML = countLine + '<div class="staff-table-empty">No staff records match the current filters.</div>';
      updatePaginationControls();
      return;
    }

    var html = countLine + '<div class="staff-table-scroll"><table class="member-testing-table staff-table' +
      (state.density === 'compact' ? ' staff-table--compact' : '') + '"><thead><tr>';
    cols.forEach(function (c) {
      if (c.sortKey) {
        html += '<th><button type="button" class="staff-sort-th" data-sort-key="' + c.sortKey + '">' +
          escapeHtml(c.label) + ' ' + sortIndicator(c) + '</button></th>';
      } else {
        html += '<th>' + escapeHtml(c.label) + '</th>';
      }
    });
    html += '</tr></thead><tbody>';
    state.rows.forEach(function (r, idx) {
      html += '<tr data-row-index="' + idx + '">';
      cols.forEach(function (c) {
        html += '<td data-label="' + escapeHtml(c.label) + '">' + renderStaffPrimaryCell(r, c.key) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    regionEl.innerHTML = html;

    regionEl.querySelectorAll('.staff-sort-th').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sort-key');
        if (state.sortBy === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortBy = key;
          state.sortDir = 'asc';
        }
        state.page = 0;
        doFetch();
      });
    });
    regionEl.querySelectorAll('.staff-details-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tr = btn.closest('tr');
        var idx = tr ? parseInt(tr.getAttribute('data-row-index'), 10) : -1;
        var row = state.rows[idx];
        if (row) ensureStaffDrawer().open(row, btn);
      });
    });

    updatePaginationControls();
  }

  function showSkeleton() {
    var rowsHtml = '';
    for (var i = 0; i < 6; i++) rowsHtml += '<div class="staff-table-skeleton-row"></div>';
    regionEl.innerHTML = '<div class="staff-table-loading">Loading staff records…</div>' + rowsHtml;
    pageInfoEl.textContent = '';
  }

  function showError(message) {
    regionEl.innerHTML = '<div class="staff-table-error" role="alert">Could not load staff records from the ' +
      'Staff API (' + escapeHtml(STAFF_API_BASE) + '). Is the backend running? Start it with ' +
      '"uvicorn backend.main:app --port 8000" — see backend/README.md. Detail: ' + escapeHtml(message) +
      '<br /><button type="button" class="staff-table-retry-btn">Retry</button></div>';
    var retryBtn = regionEl.querySelector('.staff-table-retry-btn');
    if (retryBtn) retryBtn.addEventListener('click', function () { state.lastSignature = null; doFetch(); });
  }

  function doFetch() {
    var signature = JSON.stringify({
      f: state.baseFilters, sortBy: state.sortBy, sortDir: state.sortDir,
      page: state.page, pageSize: state.pageSize
    });
    if (signature === state.lastSignature) return;
    state.lastSignature = signature;
    if (state.abortController) state.abortController.abort();
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    state.abortController = controller;
    showSkeleton();
    var effective = {};
    for (var k in state.baseFilters) { effective[k] = state.baseFilters[k]; }
    effective.sortBy = state.sortBy;
    effective.sortDir = state.sortDir;
    effective.limit = state.pageSize;
    effective.offset = state.page * state.pageSize;
    fetchStaffRecords(effective, controller && controller.signal).then(function (resp) {
      state.rows = resp.records;
      state.total = resp.total;
      renderBody();
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      showError(err.message);
    });
  }

  densityBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.density = btn.getAttribute('data-density');
      densityBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      renderBody();
    });
  });

  colChooserBtn.addEventListener('click', function () {
    var showing = colChooserPopover.classList.toggle('show');
    colChooserBtn.setAttribute('aria-expanded', showing ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) {
    if (!containerEl.contains(e.target)) return;
    if (colChooserBtn.contains(e.target) || colChooserPopover.contains(e.target)) return;
    colChooserPopover.classList.remove('show');
    colChooserBtn.setAttribute('aria-expanded', 'false');
  });
  colChooserPopover.querySelectorAll('.staff-col-toggle').forEach(function (cb) {
    cb.addEventListener('change', function () {
      var col = cb.getAttribute('data-col');
      if (cb.checked) delete state.hiddenCols[col]; else state.hiddenCols[col] = true;
      renderBody();
    });
  });

  pageSizeSel.addEventListener('change', function () {
    state.pageSize = parseInt(pageSizeSel.value, 10) || STAFF_DEFAULT_PAGE_SIZE;
    state.page = 0;
    doFetch();
  });
  prevBtn.addEventListener('click', function () { if (state.page > 0) { state.page -= 1; doFetch(); } });
  nextBtn.addEventListener('click', function () {
    var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page + 1 < totalPages) { state.page += 1; doFetch(); }
  });
  exportBtn.addEventListener('click', function () { exportStaffCsvFromRows(state.rows, viewLabel); });

  return {
    load: function (baseEffectiveFilters) {
      state.baseFilters = baseEffectiveFilters || {};
      state.page = 0;
      doFetch();
    }
  };
}

// ── Shared filter-bar component — one function, instantiated once per
// view (Staff Data tab, Arun PH pilot, Paraparan tab). `teamOptions`
// is a plain array of team name strings (from GET
// /api/staff/filter-options for the unlocked Staff Data tab; ignored
// when opts.lockTeam is set for the Arun/Paraparan team-locked
// views). Extended (2026-07-13) with a debounced search input, a
// Clear-all button, and active-filter chips. ──
function createStaffFilterBar(containerEl, teamOptions, onChange, opts) {
  if (!containerEl) return { getFilters: function () { return {}; } };
  opts = opts || {};
  var teams = opts.lockTeam ? [opts.lockTeam] : (teamOptions || []);
  var statuses = ['Active', 'Inactive'];
  var stages = ['Permanent', 'Probation', 'training_7_day', '[VERIFY]'];
  var locations = ['Jaffna', 'Nelliyadi', 'Chankanai', 'WFH'];

  var html = '<div class="staff-filter-field"><label>Team</label><select class="staff-filter-team"' +
    (opts.lockTeam ? ' disabled' : '') + '>' +
    (opts.lockTeam ? '' : '<option value="">All Teams</option>') +
    teams.map(function (t) {
      return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) +
        (opts.lockTeam ? ' (pilot-locked)' : '') + '</option>';
    }).join('') + '</select></div>';

  html += '<div class="staff-filter-field"><label>Staff Status</label><select class="staff-filter-status">' +
    '<option value="">All Statuses</option>' +
    statuses.map(function (s) { return '<option value="' + s + '">' + s + '</option>'; }).join('') +
    '</select></div>';

  html += '<div class="staff-filter-field"><label>Employment Stage</label><select class="staff-filter-stage">' +
    '<option value="">All Stages</option>' +
    stages.map(function (s) {
      return '<option value="' + escapeHtml(s) + '">' + escapeHtml(STAGE_DISPLAY_LABELS[s] || s) + '</option>';
    }).join('') + '</select></div>';

  html += '<div class="staff-filter-field"><label>Location</label><select class="staff-filter-location">' +
    '<option value="">All Locations</option>' +
    locations.map(function (l) { return '<option value="' + escapeHtml(l) + '">' + escapeHtml(l) + '</option>'; }).join('') +
    '</select></div>';

  html += '<div class="staff-filter-field staff-filter-search-field"><label for="staff-filter-search-' +
    escapeHtml(opts.instanceId || '') + '">Search</label>' +
    '<input type="search" id="staff-filter-search-' + escapeHtml(opts.instanceId || '') + '" ' +
    'class="staff-filter-search" placeholder="Name, employee #, designation…" ' +
    'aria-label="Search staff records" /></div>';

  html += '<div class="staff-filter-field staff-filter-clear-field"><label>&nbsp;</label>' +
    '<button type="button" class="staff-filter-clear-btn">Clear all</button></div>';

  html += '<div class="staff-filter-chips" aria-live="polite"></div>';

  containerEl.innerHTML = html;

  var teamSel = containerEl.querySelector('.staff-filter-team');
  var statusSel = containerEl.querySelector('.staff-filter-status');
  var stageSel = containerEl.querySelector('.staff-filter-stage');
  var locationSel = containerEl.querySelector('.staff-filter-location');
  var searchInput = containerEl.querySelector('.staff-filter-search');
  var clearBtn = containerEl.querySelector('.staff-filter-clear-btn');
  var chipsEl = containerEl.querySelector('.staff-filter-chips');
  if (opts.lockTeam) { teamSel.value = opts.lockTeam; }

  function currentFilters() {
    return {
      team: teamSel.value, status: statusSel.value, stage: stageSel.value,
      search: searchInput.value.trim(), location: locationSel.value
    };
  }

  function renderChips() {
    var f = currentFilters();
    var chips = [];
    if (f.team && !opts.lockTeam) chips.push({ key: 'team', label: 'Team: ' + f.team });
    if (f.status) chips.push({ key: 'status', label: 'Status: ' + f.status });
    if (f.stage) chips.push({ key: 'stage', label: 'Stage: ' + (STAGE_DISPLAY_LABELS[f.stage] || f.stage) });
    if (f.location) chips.push({ key: 'location', label: 'Location: ' + f.location });
    if (f.search) chips.push({ key: 'search', label: 'Search: "' + f.search + '"' });
    if (!chips.length) { chipsEl.innerHTML = ''; return; }
    chipsEl.innerHTML = chips.map(function (c) {
      return '<span class="staff-filter-chip">' + escapeHtml(c.label) +
        ' <button type="button" class="staff-filter-chip-remove" data-chip-key="' + c.key +
        '" aria-label="Remove filter: ' + escapeHtml(c.label) + '">&times;</button></span>';
    }).join('');
    chipsEl.querySelectorAll('.staff-filter-chip-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-chip-key');
        if (key === 'team' && !opts.lockTeam) teamSel.value = '';
        if (key === 'status') statusSel.value = '';
        if (key === 'stage') stageSel.value = '';
        if (key === 'location') locationSel.value = '';
        if (key === 'search') searchInput.value = '';
        fireChange();
      });
    });
  }

  function fireChange() {
    renderChips();
    onChange(currentFilters());
  }

  var debouncedFireChange = debounce(fireChange, 300);

  [teamSel, statusSel, stageSel, locationSel].forEach(function (sel) {
    sel.addEventListener('change', fireChange);
  });
  searchInput.addEventListener('input', debouncedFireChange);
  clearBtn.addEventListener('click', function () {
    if (!opts.lockTeam) teamSel.value = '';
    statusSel.value = '';
    stageSel.value = '';
    locationSel.value = '';
    searchInput.value = '';
    fireChange();
  });

  renderChips();
  return { getFilters: currentFilters };
}

// ── Shared, in-memory-only PH Team KPI pilot state. Arun and Paraparan
// read and write the SAME array — there is no per-actor copy. All
// business values are [VERIFY]; nothing is invented. Resets on
// page refresh (no localStorage, no API, no database). ──
var PILOT_KPI_STATE = [
  { kpi_id: 'SAMPLE-PH-KPI-001', team_code: 'PH', kpi_name: 'Sample PH KPI — YOY Growth', description: '[VERIFY]', target: '[VERIFY]', formula: '[VERIFY]', threshold: '[VERIFY]', evidence_required: '[VERIFY]', status: '[VERIFY]', updated_by: '[VERIFY]' },
  { kpi_id: 'SAMPLE-PH-KPI-002', team_code: 'PH', kpi_name: 'Sample PH KPI — Individual Staff Net Sales', description: '[VERIFY]', target: '[VERIFY]', formula: '[VERIFY]', threshold: '[VERIFY]', evidence_required: '[VERIFY]', status: '[VERIFY]', updated_by: '[VERIFY]' },
  { kpi_id: 'SAMPLE-PH-KPI-003', team_code: 'PH', kpi_name: 'Sample PH KPI — Category Profitability', description: '[VERIFY]', target: '[VERIFY]', formula: '[VERIFY]', threshold: '[VERIFY]', evidence_required: '[VERIFY]', status: '[VERIFY]', updated_by: '[VERIFY]' }
];
var KPI_FIELDS = ['kpi_id', 'team_code', 'kpi_name', 'description', 'target', 'formula', 'threshold', 'evidence_required', 'status'];
var KPI_FIELD_LABELS = {
  kpi_id: 'KPI ID', team_code: 'Team', kpi_name: 'KPI Name', description: 'Description',
  target: 'Target', formula: 'Formula', threshold: 'Threshold',
  evidence_required: 'Evidence Required', status: 'Status'
};
var KPI_ACTORS = ['arun', 'paraparan'];

function renderKpiCell(v) {
  return v === '[VERIFY]' ? '<span class="badge badge-verify">[VERIFY]</span>' : escapeHtml(v);
}

// ── Shared KPI panel component — one function, mounted once for Arun
// and once for Paraparan. Both mounts read the same PILOT_KPI_STATE
// array, so an "Updated By" change made in either tab is immediately
// visible in both — there is no separate Arun-KPI vs Paraparan-KPI data. ──
function renderKpiPanel(containerEl, teamCode) {
  if (!containerEl) return;
  var rows = PILOT_KPI_STATE.filter(function (k) { return k.team_code === teamCode; });
  var html = '<div class="member-testing-table-note" data-searchable' +
    ' data-tags="kpi pilot synthetic verify shared arun paraparan ph team">' +
    '<span class="member-pill member-pill-sample">Synthetic Technical Pilot — Shared KPI Records</span>' +
    '<span>Arun and Paraparan share these exact KPI rows — this is the same in-memory data, not a copy. ' +
    'All formula/target/threshold/evidence values are <span class="badge badge-verify">[VERIFY]</span> — no ' +
    'real KPI rule has been invented. "Updated By" is audit metadata only and does not create a separate ' +
    'record. Synthetic technical pilot — changes are not persistent.</span></div>';
  html += '<div class="member-testing-table-scroll"><table class="member-testing-table kpi-pilot-table"><thead><tr>';
  KPI_FIELDS.forEach(function (f) { html += '<th>' + KPI_FIELD_LABELS[f] + '</th>'; });
  html += '<th>Updated By</th></tr></thead><tbody>';
  rows.forEach(function (k) {
    html += '<tr data-kpi-id="' + escapeHtml(k.kpi_id) + '">';
    KPI_FIELDS.forEach(function (f) { html += '<td>' + renderKpiCell(k[f]) + '</td>'; });
    html += '<td><select class="kpi-actor-select" data-kpi-id="' + escapeHtml(k.kpi_id) + '">' +
      '<option value="[VERIFY]"' + (k.updated_by === '[VERIFY]' ? ' selected' : '') + '>[VERIFY]</option>' +
      KPI_ACTORS.map(function (a) {
        return '<option value="' + a + '"' + (k.updated_by === a ? ' selected' : '') + '>' + a + '</option>';
      }).join('') + '</select></td></tr>';
  });
  html += '</tbody></table></div>';
  containerEl.innerHTML = html;

  containerEl.querySelectorAll('.kpi-actor-select').forEach(function (sel) {
    sel.addEventListener('change', function () {
      var id = sel.getAttribute('data-kpi-id');
      for (var i = 0; i < PILOT_KPI_STATE.length; i++) {
        if (PILOT_KPI_STATE[i].kpi_id === id) { PILOT_KPI_STATE[i].updated_by = sel.value; break; }
      }
      // Re-render every mounted KPI panel (Arun's and Paraparan's) so
      // both immediately reflect the shared, updated state.
      document.querySelectorAll('.kpi-pilot-mount').forEach(function (mount) {
        renderKpiPanel(mount, mount.getAttribute('data-kpi-team'));
      });
    });
  });
}

// ── Staff Data tab: 3 subtabs + 1 shared filter bar. Each subtab owns
// its own mountStaffTableView instance (independent sort/page/density/
// column-visibility state), while all three share the one filter bar's
// team/status/stage/search selection — exactly the existing base-filter
// + user-filter merge behavior, just re-triggering three controllers
// instead of three direct fetch calls. ──
function initStaffDataTab() {
  var panel = document.getElementById('tab-staff-data');
  if (!panel) return;
  var filterBarEl = document.getElementById('staff-data-filter-bar');
  var subtabBtns = panel.querySelectorAll('.staff-subtab-btn');
  var subpanels = panel.querySelectorAll('.staff-subpanel');

  var controllers = {};
  subpanels.forEach(function (sp) {
    var key = sp.id.replace('staff-subpanel-', '');
    controllers[key] = mountStaffTableView(sp.querySelector('.staff-table-container'), key);
  });

  function loadAll(userFilters) {
    subpanels.forEach(function (sp) {
      var key = sp.id.replace('staff-subpanel-', '');
      var effective = mergeStaffFilters(STAFF_SUBTAB_BASE_FILTERS[key], userFilters);
      controllers[key].load(effective);
    });
  }

  // Team dropdown options come from the live API (real department/team
  // values currently in the table), not a hardcoded or client-side list.
  staffApiRequest(STAFF_API_BASE + '/filter-options').then(function (opts) {
    var filterApi = createStaffFilterBar(filterBarEl, opts.teams || [], loadAll, { instanceId: 'staff-data' });
    subtabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        subtabBtns.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        subpanels.forEach(function (sp) {
          sp.classList.toggle('active', sp.id === 'staff-subpanel-' + btn.getAttribute('data-staff-subtab'));
        });
      });
    });
    loadAll(filterApi.getFilters());
  }).catch(function () {
    // Filter-options fetch failed (e.g. backend not running) — still
    // let each subtab's controller show its own error+Retry state, and
    // fall back to an empty (unlocked, no options) filter bar rather
    // than leaving the page half-built.
    var filterApi = createStaffFilterBar(filterBarEl, [], loadAll, { instanceId: 'staff-data' });
    loadAll(filterApi.getFilters());
  });
}

// ── Team-scoped staff + KPI pilot section — used identically by the
// Arun PH view and the Paraparan tab. One function, two call sites,
// no parallel implementations. ──
function initTeamScopedStaffPilot(mountEl) {
  if (!mountEl) return;
  var teamCode = mountEl.getAttribute('data-team-code') || 'PH';
  var mountId = mountEl.id || teamCode;
  var filterBarEl = mountEl.querySelector('.staff-filter-bar');
  var tableEl = mountEl.querySelector('.staff-table-container');
  var kpiMountEl = mountEl.querySelector('.kpi-pilot-mount');
  var baseFilters = { team: teamCode };
  var controller = mountStaffTableView(tableEl, mountId);

  function loadTable(userFilters) {
    var effective = mergeStaffFilters(baseFilters, userFilters);
    effective.team = teamCode; // locked — never overridden by the user
    controller.load(effective);
  }

  var filterApi = createStaffFilterBar(filterBarEl, [teamCode], loadTable, { lockTeam: teamCode, instanceId: mountId });
  loadTable(filterApi.getFilters());
  renderKpiPanel(kpiMountEl, teamCode);
}

export function initStaffDataPilot() {
  initStaffDataTab();
  initTeamScopedStaffPilot(document.getElementById('arun-staff-pilot'));
  initTeamScopedStaffPilot(document.getElementById('paraparan-staff-pilot'));
}
