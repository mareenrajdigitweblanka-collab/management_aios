/* staff-data.js — Staff Data technical pilot (synthetic sample + read-only
   Staff API). Extracted verbatim from the former inline staff-data IIFE
   (2026-07-17 frontend modularization); fully self-contained (own STAFF_API_BASE,
   own helpers). The former inline DOMContentLoaded bootstrap now lives in app.js.
   No logic changed. */

import { trapTab, returnFocus } from './ui/popup.js';
import { renderSkeletonRows } from './ui/loading.js';
import { mapApiError, classifyHttpStatus } from './ui/error-mapper.js';
import { getStoredToken, handleUnauthorizedResponse } from './calendar/auth.js';
import { isAuthenticated, onAuthChange, buildAuthRequiredNotice } from './auth-gate.js';

// DEV/FALLBACK-ONLY synthetic sample dataset. As of 2026-08-11 this
// mirrors the exact-Ledsone-mirror field shape (see STAFF_MAIN_COLUMNS
// comment below) with fully invented values — no real employee data. Real
// staff data is fetched live from the Staff API (STAFF_API_BASE, below).
// This array is retained only so this file can still be opened offline
// for markup/CSS development without a backend running; no init function
// in this script references it.
var STAFF_DATA_SAMPLE = [
  { id: 1, staff_code: "SAMPLE001", name: "Sample Staff One", role: 2, email: "sample1@example.com", phone: "0700000001", roster: "saturday", designation: "Portfolio Executive", joined_date: "2020-01-01", confirmed_date: null, address: "Sample Address One", skype: "sample.one", delete_status: false, team_id: 1, is_approved: 1, staff_type: "full-time", staff_level: "Senior", informed_leave_balance: 10, urgent_leave_balance: 2, backup_staffs: null },
  { id: 2, staff_code: "SAMPLE002", name: "Sample Staff Two", role: 2, email: "sample2@example.com", phone: null, roster: null, designation: "Portfolio Executive", joined_date: "2021-03-15", confirmed_date: null, address: null, skype: null, delete_status: true, team_id: 1, is_approved: 1, staff_type: "full-time", staff_level: "Junior", informed_leave_balance: 5, urgent_leave_balance: 0, backup_staffs: null }
];

// Columns shown in the main staff table / detail drawer.
//
// 2026-08-11: staff_dashboard_records was rebuilt as an EXACT mirror of
// employee_management.staff (Ledsone) — same columns, same field names,
// same integer primary key — per explicit, deliberate user instruction.
// This replaces the former dashboard-specific 5-field curated shape
// (employee_number/full_name/department_team/date_of_joining/designation)
// entirely. Includes PDPA-sensitive fields (email/phone/address/skype) and
// HR-sensitive fields (leave balances, is_approved) — see backend/models.py
// StaffDashboardRecord docstring and member-aios/staff-data/README.md §0.
// fcm_token is the one deliberate exclusion (a security credential, not
// staff data).
var STAFF_MAIN_COLUMNS = [
  'staff_code', 'name', 'designation', 'team_id', 'joined_date', 'confirmed_date',
  'email', 'phone', 'address', 'skype', 'role', 'staff_type', 'staff_level',
  'is_approved', 'delete_status', 'informed_leave_balance', 'urgent_leave_balance',
  'backup_staffs'
];
var STAFF_COLUMN_LABELS = {
  staff_code: 'Staff Code', name: 'Name', designation: 'Designation', team_id: 'Team ID',
  joined_date: 'Joined Date', confirmed_date: 'Confirmed Date', email: 'Email', phone: 'Phone',
  address: 'Address', skype: 'Skype', role: 'Role', staff_type: 'Staff Type',
  staff_level: 'Staff Level', is_approved: 'Approval Status', delete_status: 'Deleted',
  informed_leave_balance: 'Informed Leave Balance', urgent_leave_balance: 'Urgent Leave Balance',
  backup_staffs: 'Backup Staff IDs'
};

/* Compact/default columns shown in the primary table (UX upgrade,
   2026-07-13). `sortKey` is the sort_by value sent to GET /api/staff
   (null = not sortable); `hideable` marks columns the column-visibility
   chooser may hide (Employee and Actions are always shown). The fuller
   STAFF_MAIN_COLUMNS field set above is reused as-is for the detail
   drawer, which shows every field this compact table doesn't.

   2026-08-11: field names updated to match the exact Ledsone mirror — see
   STAFF_MAIN_COLUMNS comment above. team_id has no human-readable name
   available in this table (Ledsone's own team_id column, mostly NULL). */
var STAFF_PRIMARY_COLUMNS = [
  { key: 'employee', label: 'Employee', sortKey: 'name', hideable: false },
  { key: 'team_id', label: 'Team ID', sortKey: 'team_id', hideable: true },
  { key: 'designation', label: 'Designation', sortKey: null, hideable: true },
  { key: 'joined_date', label: 'Joined Date', sortKey: 'joined_date', hideable: true },
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
/* Exported (REQ-CAL-REV-001, 2026-08-03) so review-summaries.js's
   reviewed-staff selector can call the same GET /api/staff endpoint
   without inventing a second host-detection constant or a duplicate
   staff list — the export is additive; every existing use within this
   file is unaffected. */
export var STAFF_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/staff';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/staff';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

/* GET /api/staff* now requires the existing Calendar member token
   (REQ-AUTH-MODULES-007, 2026-08-10) — the Authorization header is added
   here, the ONE place every request in this file is issued, rather than
   at each of the three call sites below. A 401 means the previously
   stored token is no longer accepted (expired/rotated/invalidated
   elsewhere) — handleUnauthorizedResponse() (calendar/auth.js) discards it
   and fires CALENDAR_AUTH_CHANGED_EVENT immediately, the same reaction
   every other protected module in this app already has to a 401, so the
   sidebar/panel gates in this file (initStaffDataTab/
   initTeamScopedStaffPilot below) re-run and fall back to the "Authorize
   this browser" placeholder rather than leaving stale staff data on
   screen. */
function staffApiRequest(url, signal) {
  var token = getStoredToken();
  var options = { headers: token ? { 'Authorization': 'Bearer ' + token } : undefined };
  if (signal) { options.signal = signal; }
  return fetch(url, options).then(function (res) {
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function () {
        if (res.status === 401) { handleUnauthorizedResponse(); }
        /* Tagged with a stable .code (Phase 1 professional-UX-feedback
           task, 2026-07-22) so ui/error-mapper.js maps it to a plain-
           language message — never a raw HTTP status/JSON body shown to
           the user (see showError() below). */
        var err = new Error('Request failed.');
        err.code = classifyHttpStatus(res.status);
        err.status = res.status;
        throw err;
      });
    }
    return res.json();
  }).catch(function (err) {
    if (!err.code) { err.code = 'network'; }
    throw err;
  });
}

/* Builds the GET /api/staff query string. `sortBy`/`sortDir` and
   `limit`/`offset` are populated by the per-instance table controller
   (see mountStaffTableView) — omitting sortBy reproduces the API's
   original hardcoded ordering exactly.

   2026-08-11: staff_status/employment_stage/location query params
   removed along with their backing columns; `team` renamed to `teamId`
   (sent as team_id) — see STAFF_MAIN_COLUMNS comment above. */
function buildStaffQuery(filters) {
  filters = filters || {};
  var params = [];
  if (filters.teamId != null && filters.teamId !== '') params.push('team_id=' + encodeURIComponent(filters.teamId));
  if (filters.search) params.push('search=' + encodeURIComponent(filters.search));
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

// ── Shared filter-merge helper — reused by the unified Staff Data
// panel, the Arun PH view, and the Paraparan view. Combines a view's
// fixed base filter (e.g. { teamId: 1 } for the team-locked pilots) with
// whatever the user has additionally selected in the shared filter bar.
//
// 2026-08-11: status/stage/location dropped along with their backing
// columns — the former Current/Onboarding/Resigned subtab split relied
// on exactly these fields and no longer exists (see
// member-aios/staff-data/README.md). `team` renamed to `teamId` (Ledsone's
// raw team_id integer — no human-readable team/department name is
// available in this table). ──
function mergeStaffFilters(baseFilters, userFilters) {
  userFilters = userFilters || {};
  var teamId = userFilters.teamId != null && userFilters.teamId !== ''
    ? userFilters.teamId
    : (baseFilters && baseFilters.teamId);
  return {
    teamId: teamId != null ? teamId : '',
    search: userFilters.search || ''
  };
}

/* Renders a raw cell value, correctly distinguishing "no value" (null/
   undefined/empty string -> em dash) from legitimate falsy values like
   `false` or `0` (Boolean/Number.leave-balance fields on this row shape,
   2026-08-11 exact-Ledsone-mirror) — a plain `raw || fallback` pattern
   would incorrectly blank out delete_status: false or a 0 leave balance. */
function formatStaffCellValue(raw) {
  if (raw === '[VERIFY]') return '<span class="badge badge-verify">[VERIFY]</span>';
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  return escapeHtml(raw);
}

// ── Shared cell renderers — used by the primary table and the detail
// drawer (fuller field set); never by CSV export directly (export reads
// raw values so the file stays plain text). ──
function renderStaffPrimaryCell(r, colKey) {
  if (colKey === 'employee') {
    return '<div class="staff-employee-cell">' +
      '<div class="staff-employee-name">' + escapeHtml(r.name || '—') + '</div>' +
      (r.staff_code ? '<div class="staff-employee-number">' + escapeHtml(r.staff_code) + '</div>' : '') +
      '</div>';
  }
  if (colKey === 'actions') {
    return '<button type="button" class="staff-details-btn">Details</button>';
  }
  var formatted = formatStaffCellValue(r[colKey]);
  return formatted == null ? '' : formatted;
}

function renderStaffDrawerFieldValue(r, colKey) {
  var formatted = formatStaffCellValue(r[colKey]);
  return formatted == null ? '—' : formatted;
}

/* Single centralized detail drawer, lazily created and reused by every
   mounted staff table instance — only one row can be inspected at a time,
   so one shared drawer avoids mounting several near-identical overlay/
   focus-trap instances. Renders exactly the STAFF_MAIN_COLUMNS field set
   — as of 2026-08-11 this includes PDPA-sensitive fields (email/phone/
   address/skype) and HR-sensitive fields (leave balances, is_approved),
   per explicit user instruction (exact Ledsone mirror) — see
   STAFF_MAIN_COLUMNS comment above. Still never salary, which does not
   exist on the row objects at all. */
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

  var drawerEl = overlay.querySelector('.staff-drawer');

  function close() {
    overlay.classList.remove('show');
    document.removeEventListener('keydown', onKeydown);
    returnFocus(lastTrigger);
    lastTrigger = null;
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      /* Shared trap (Phase 1 professional-UX-feedback task, 2026-07-22)
         — replaces the drawer's own single-control-only Tab pin with the
         same generic multi-control trap the calendar popups use. The
         drawer body today only ever contains the close button as a
         focusable element, so this cycles to the same place the old
         implementation pinned to; it also now supports any additional
         focusable field the drawer body might gain in the future
         without another rewrite. */
      trapTab(drawerEl, e);
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
    regionEl.innerHTML = '<div class="staff-table-loading">Loading staff records…</div>' +
      '<div class="staff-table-skeleton-wrap"></div>';
    renderSkeletonRows(regionEl.querySelector('.staff-table-skeleton-wrap'), 6);
    pageInfoEl.textContent = '';
  }

  function showError(err) {
    var mapped = mapApiError(err);
    regionEl.innerHTML = '<div class="staff-table-error" role="alert">' + escapeHtml(mapped.title) +
      ' — ' + escapeHtml(mapped.message) +
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
      showError(err);
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
// view (Staff Data tab, Arun PH pilot, Paraparan tab). `teamIdOptions` is
// a plain array of distinct team_id integers (from GET
// /api/staff/filter-options). Extended (2026-07-13) with a debounced
// search input, a Clear-all button, and active-filter chips.
//
// 2026-08-11: Staff Status/Employment Stage/Location dropdowns removed
// along with their backing columns — Ledsone's employee_management.staff
// has no equivalent (see member-aios/staff-data/README.md). Team filter
// renamed team -> teamId (Ledsone's raw team_id integer, no
// human-readable name available). The lockTeam mechanism (used by the
// former Arun/Paraparan team-scoped pilots) is removed — a "PH" text lock
// has no meaning against a numeric team_id; see
// initTeamScopedStaffPilot. ──
function createStaffFilterBar(containerEl, teamIdOptions, onChange, opts) {
  if (!containerEl) return { getFilters: function () { return {}; } };
  opts = opts || {};
  var teamIds = teamIdOptions || [];

  var html = '<div class="staff-filter-field"><label>Team ID</label><select class="staff-filter-team">' +
    '<option value="">All Teams</option>' +
    teamIds.map(function (t) {
      return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
    }).join('') + '</select></div>';

  html += '<div class="staff-filter-field staff-filter-search-field"><label for="staff-filter-search-' +
    escapeHtml(opts.instanceId || '') + '">Search</label>' +
    '<input type="search" id="staff-filter-search-' + escapeHtml(opts.instanceId || '') + '" ' +
    'class="staff-filter-search" placeholder="Name, staff code, designation…" ' +
    'aria-label="Search staff records" /></div>';

  html += '<div class="staff-filter-field staff-filter-clear-field"><label>&nbsp;</label>' +
    '<button type="button" class="staff-filter-clear-btn">Clear all</button></div>';

  html += '<div class="staff-filter-chips" aria-live="polite"></div>';

  containerEl.innerHTML = html;

  var teamSel = containerEl.querySelector('.staff-filter-team');
  var searchInput = containerEl.querySelector('.staff-filter-search');
  var clearBtn = containerEl.querySelector('.staff-filter-clear-btn');
  var chipsEl = containerEl.querySelector('.staff-filter-chips');

  function currentFilters() {
    return { teamId: teamSel.value, search: searchInput.value.trim() };
  }

  function renderChips() {
    var f = currentFilters();
    var chips = [];
    if (f.teamId) chips.push({ key: 'teamId', label: 'Team ID: ' + f.teamId });
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
        if (key === 'teamId') teamSel.value = '';
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

  teamSel.addEventListener('change', fireChange);
  searchInput.addEventListener('input', debouncedFireChange);
  clearBtn.addEventListener('click', function () {
    teamSel.value = '';
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

/* Shared authenticated-module gate for every Staff Data data-bearing
   widget in this file (REQ-AUTH-MODULES-007, 2026-08-10) — the Staff Data
   tab itself AND the two PH Staff Data pilots embedded inside Arun's and
   Paraparan's own Calendar tabs (initTeamScopedStaffPilot below). Those
   two embedded pilots are real Staff Data — same GET /api/staff, same
   fields — so they are gated exactly like the Staff Data tab, even though
   the Calendar tabs that host them otherwise remain fully public; only
   this one sub-panel within each of those tabs is affected.

   `contentEls` are toggled via the native `hidden` attribute (never
   removed from the DOM — nothing about their own state/listeners is
   disturbed, so re-authenticating needs no rebuild of anything static);
   the shared "Authorize this browser" notice (auth-gate.js) is
   inserted/removed as ONE marked sibling so repeated calls never leave a
   duplicate behind. */
function setStaffDataAuthGateVisibility(hostEl, contentEls, authed) {
  contentEls.forEach(function (el) { if (el) { el.hidden = !authed; } });
  var existingNotice = hostEl.querySelector('.msc-staff-data-auth-notice');
  if (authed) {
    if (existingNotice) { hostEl.removeChild(existingNotice); }
    return;
  }
  if (!existingNotice) {
    var notice = buildAuthRequiredNotice('staff-data');
    notice.classList.add('msc-staff-data-auth-notice');
    hostEl.insertBefore(notice, contentEls[0] || hostEl.firstChild);
  }
}

// ── Staff Data tab: one unified staff table + 1 shared filter bar.
//
// 2026-08-11: the former Current Staff / Onboarding Staff Process /
// Resigned Staff 3-subtab split relied entirely on
// staff_status/employment_stage, which no longer exist on
// staff_dashboard_records (re-sourced from employee_management.staff on
// Ledsone — see member-aios/staff-data/README.md). There is no
// replacement classification, so this is now a single unmodified list —
// the subtab bar and its wiring were removed, not reworked into
// something that fakes a distinction the data no longer carries. ──
function initStaffDataTab() {
  var panel = document.getElementById('tab-staff-data');
  if (!panel) return;
  var filterBarEl = document.getElementById('staff-data-filter-bar');
  var subpanel = panel.querySelector('.staff-subpanel');
  if (!subpanel) return;

  /* Re-run on mount and on every authentication transition
     (CALENDAR_AUTH_CHANGED_EVENT, via onAuthChange). While unauthenticated
     this renders ONLY the shared placeholder — no mountStaffTableView()
     call, no filter bar, and critically no staffApiRequest() call at all
     (not even for filter-options), so no Staff Data request of any kind
     ever leaves the browser without a stored token. */
  function mountData() {
    var authed = isAuthenticated();
    setStaffDataAuthGateVisibility(panel, [filterBarEl, subpanel], authed);
    if (!authed) { return; }

    var controller = mountStaffTableView(subpanel.querySelector('.staff-table-container'), 'all-staff');

    function load(userFilters) {
      controller.load(mergeStaffFilters(null, userFilters));
    }

    // Team ID dropdown options come from the live API (distinct team_id
    // values currently in the table — Ledsone's raw integer, no
    // human-readable name available), not a hardcoded or client-side list.
    staffApiRequest(STAFF_API_BASE + '/filter-options').then(function (opts) {
      var filterApi = createStaffFilterBar(filterBarEl, opts.team_ids || [], load, { instanceId: 'staff-data' });
      load(filterApi.getFilters());
    }).catch(function () {
      // Filter-options fetch failed (e.g. backend not running) — still
      // let the table controller show its own error+Retry state, and
      // fall back to an empty (unlocked, no options) filter bar rather
      // than leaving the page half-built.
      var filterApi = createStaffFilterBar(filterBarEl, [], load, { instanceId: 'staff-data' });
      load(filterApi.getFilters());
    });
  }

  mountData();
  onAuthChange(mountData);
}

// ── Team-scoped staff + KPI pilot section — used identically by the
// Arun PH view and the Paraparan tab. One function, two call sites,
// no parallel implementations.
//
// 2026-08-11: the `lockTeam` behavior (locking the staff table to
// data-team-code="PH") is removed. That lock depended on `department_team`
// being a human-readable name string match — staff_dashboard_records now
// mirrors Ledsone's raw `team_id` integer instead (mostly NULL in the
// source, and "PH" has no known numeric team_id), so a text-based lock
// would silently filter every row out rather than scope to PH staff. The
// staff table here is now unlocked (same unscoped filter bar as the main
// Staff Data tab) rather than showing a broken, permanently-empty table —
// see member-aios/staff-data/README.md §0. The KPI panel below is
// unaffected (synthetic, in-memory, keyed by its own team_code — never
// touches the Staff API). ──
function initTeamScopedStaffPilot(mountEl) {
  if (!mountEl) return;
  var teamCode = mountEl.getAttribute('data-team-code') || 'PH';
  var mountId = mountEl.id || teamCode;
  var filterBarEl = mountEl.querySelector('.staff-filter-bar');
  var tableEl = mountEl.querySelector('.staff-table-container');
  var kpiMountEl = mountEl.querySelector('.kpi-pilot-mount');

  /* renderKpiPanel is synthetic, in-memory, non-Staff-API data (see its
     own comment above) — unaffected by REQ-AUTH-MODULES-007 and rendered
     unconditionally, exactly as before; only the live staff table+filter
     bar below is gated. */
  renderKpiPanel(kpiMountEl, teamCode);

  function mountData() {
    var authed = isAuthenticated();
    setStaffDataAuthGateVisibility(mountEl, [filterBarEl, tableEl], authed);
    if (!authed) { return; }

    var controller = mountStaffTableView(tableEl, mountId);

    function loadTable(userFilters) {
      controller.load(mergeStaffFilters(null, userFilters));
    }

    staffApiRequest(STAFF_API_BASE + '/filter-options').then(function (opts) {
      var filterApi = createStaffFilterBar(filterBarEl, opts.team_ids || [], loadTable, { instanceId: mountId });
      loadTable(filterApi.getFilters());
    }).catch(function () {
      var filterApi = createStaffFilterBar(filterBarEl, [], loadTable, { instanceId: mountId });
      loadTable(filterApi.getFilters());
    });
  }

  mountData();
  onAuthChange(mountData);
}

export function initStaffDataPilot() {
  initStaffDataTab();
  initTeamScopedStaffPilot(document.getElementById('arun-staff-pilot'));
  initTeamScopedStaffPilot(document.getElementById('paraparan-staff-pilot'));
}
