/* knowledge-management.js — Knowledge Management workspace, Company
   Documents view, wired to the real persistent backend CRUD API
   (REQ-KM-UI-004, 2026-08-10; REQ-KM-UI-005, 2026-08-10 — Restore, real
   detail GET, and stable filter options closed out below).

   REPLACES the REQ-KM-001 static APPROVED_DOCUMENTS registry entirely —
   there is now exactly one document-record truth: the backend API /
   PostgreSQL (management_aios.knowledge_documents and its two history
   tables, backend/routers/knowledge_documents.py). The sample-data notice
   ("Sample documents — document records will be updated after interface
   review.") is removed along with it — real records carry no such notice.
   If the API fails, this module shows an explicit error state; it NEVER
   falls back to showing stale/sample records.

   API contract (read from backend/routers/knowledge_documents.py,
   backend/schemas.py, backend/models.py — never guessed):
     GET    /api/knowledge-documents                          auth, ?team=&document_type=&lifecycle_status=&search=&limit=&offset= -> {records, total, limit, offset}
     GET    /api/knowledge-documents/{id}                      auth -> KnowledgeDocumentOut
     POST   /api/knowledge-documents                          auth, {title, team, document_type, job_role?, document_category?, creator?, source_url} -> 201 KnowledgeDocumentOut (warnings[])
     PATCH  /api/knowledge-documents/{id}                     auth, {title?, team?, document_type?, job_role?, document_category?, creator?, lifecycle_status?, compliance_status?, change_description} -> KnowledgeDocumentOut (source_url is REJECTED here — 422)
     POST   /api/knowledge-documents/{id}/versions             auth, {source_url, version_label, change_description} -> 201 KnowledgeDocumentOut
     POST   /api/knowledge-documents/{id}/archive               auth -> KnowledgeDocumentOut (409 if already Archived)
     POST   /api/knowledge-documents/{id}/unarchive              auth -> KnowledgeDocumentOut (409 if already Active)
     DELETE /api/knowledge-documents/{id}                     auth, {delete_reason} -> {id, deleted:true} (SOFT delete only)
     POST   /api/knowledge-documents/{id}/restore               auth -> KnowledgeDocumentOut (404 if not deleted; 409 on URL collision)
     GET    /api/knowledge-documents/{id}/versions              auth -> [KnowledgeDocumentVersionOut] (append-only, no mutation route)
     GET    /api/knowledge-documents/{id}/audit                 auth -> [KnowledgeDocumentAuditLogOut] (immutable, no mutation route)
     GET    /api/knowledge-documents/deleted                  auth -> [KnowledgeDocumentDeletedOut] (REQ-KM-UI-005 — soft-deleted documents only)

   KnowledgeDocumentOut has NO "description" field — Phase 8's requested
   detail-field list named one ("description") that the actual API does
   not return; per explicit instruction ("do not invent missing fields"),
   it is simply omitted from the Detail view, not fabricated.

   RESTORE — RESOLVED (REQ-KM-UI-005): the backend now exposes GET
   /api/knowledge-documents/deleted, so the frontend can enumerate
   soft-deleted documents without any client-side deleted-record storage.
   The Deleted Documents view (an internal toggle within this same panel,
   not a new sidebar item) lists them and wires the existing
   POST .../restore route behind a confirmation step. See the DELETED
   VIEW / RESTORE section below. Every CRUD workflow this module supports
   is now fully implemented — there is no longer a blocked workflow.

   Auth model (REVISED, REQ-AUTH-MODULES-007, 2026-08-10): Knowledge
   Management is now a whole-panel-gated module, same shape as Review
   Summaries — LIST and DETAIL used to be public reads (no token), matching
   Task/Leave's own public-GET/protected-mutation split, but that no longer
   satisfies the requirement that unauthenticated users must not be able to
   view or retrieve Knowledge Management data at all. Every route in this
   file — LIST, DETAIL, every mutation, and both history-read routes — now
   requires the existing Calendar member token (web-view/js/calendar/auth.js)
   — no second auth system, no new token type. mountKnowledgeManagementWorkspace()
   itself renders auth-gate.js's shared "Authorize this browser" placeholder
   INSTEAD OF the workspace (and never calls loadDocuments()) while
   unauthenticated, so no request — not even LIST — is ever attempted
   without a stored token; kmProtectedRequest() below (used for every route
   now, including LIST/DETAIL) additionally calls ensureAuthorized() itself
   as defense-in-depth, exactly like calendar/instance.js's own
   apiRequest() mutation path.

   Built via createElement/appendChild with textContent for every
   document-authored field (never innerHTML for untrusted text) — same
   convention as issues.js/review-summaries.js. sourceUrl is validated
   (isSafeHttpUrl) before ever being used as an href. */

import { KNOWLEDGE_DOCUMENTS_API_BASE } from './config.js';
import {
  CALENDAR_AUTH_CHANGED_EVENT,
  ensureAuthorized,
  getStoredMemberKey,
  handleUnauthorizedResponse
} from './calendar/auth.js';
import { buildAuthRequiredNotice } from './auth-gate.js';
import { confirmDestructive } from './ui/dialog.js';
import { showToast } from './ui/toast.js';
import { setButtonBusy } from './ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from './ui/form-feedback.js';
import { mapApiError, classifyHttpStatus } from './ui/error-mapper.js';
import { trapTab, returnFocus } from './ui/popup.js';
import { lockBodyScroll, unlockBodyScroll } from './ui/scroll-lock.js';

export var EMPTY_STATE_TEXT = 'No company documents have been registered yet.';
export var FILTERED_EMPTY_STATE_TEXT = 'No documents match your search or filters.';
export var LOADING_TEXT = 'Loading documents...';
export var ERROR_TEXT = 'Unable to load company documents.';
export var EMPTY_DELETED_STATE_TEXT = 'No deleted documents.';
export var RESTORE_COLLISION_TEXT = 'This document cannot be restored because another active document already uses the same source link.';

var DOCUMENT_TYPE_OPTIONS = [
  'Google Sheet', 'Google Doc', 'Google Drive File', 'PDF',
  'Word Document', 'Excel File', 'ZIP File', 'Skill File',
  'Image', 'Video', 'External URL', 'Internal Documentation Link'
];
var LIFECYCLE_STATUS_OPTIONS = ['Active', 'Archived'];

/* REQ-KM-UI-006 — the ONE canonical Team source for this module, reused by
   the Team filter, the Add Document Team field, and the Edit Metadata Team
   field (never three separate hardcoded arrays). Exact approved spelling
   and order, per explicit instruction — never renamed, alphabetized, or
   extended. Scoped to Knowledge Management only: member-registry.js is a
   Management Team *identity* registry (people), not a document-Team
   registry (departments/teams like "Ebay Team"), so this constant does not
   belong there. */
export var KM_DEFAULT_TEAMS = [
  'Management Team',
  'Graphic Designing Team',
  'Digital Marketing Team',
  'Technical Team',
  'Ebay Team',
  'Postage Team',
  'Development Team',
  'Customer Service Team',
  'Amazon Team',
  'Centralized PPC Team',
  'Inventory Team',
  'Accounts Team',
  'Portfolio Holders Team',
  'US /Canada Market Rebuild Team',
  'Merchandising Team',
  'Wayfair Team',
  'IT support Team'
];

// ── Pure helpers (exported for direct testing — no DOM/fetch involved) ──

export function isSafeHttpUrl(url) {
  if (!url || typeof url !== 'string') { return false; }
  try {
    var parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

/* Server-side filtering (Phase 6) — builds the exact query string the
   already-existing GET /api/knowledge-documents route supports
   (team/document_type/lifecycle_status/search), never an invented
   parameter. Combined filters are AND because the backend's own
   _apply_filters chains .filter() calls — this function just mirrors
   that contract, it doesn't implement AND logic itself. */
export function buildListQueryString(filters) {
  filters = filters || {};
  var params = [];
  if (filters.search) { params.push('search=' + encodeURIComponent(filters.search)); }
  if (filters.team && filters.team !== 'all') { params.push('team=' + encodeURIComponent(filters.team)); }
  if (filters.documentType && filters.documentType !== 'all') {
    params.push('document_type=' + encodeURIComponent(filters.documentType));
  }
  if (filters.lifecycleStatus && filters.lifecycleStatus !== 'all') {
    params.push('lifecycle_status=' + encodeURIComponent(filters.lifecycleStatus));
  }
  params.push('limit=200');
  return params.join('&');
}

function formatTimestamp(iso) {
  if (!iso) { return '—'; }
  var parsed = new Date(iso);
  if (isNaN(parsed.getTime())) { return iso; }
  return parsed.toLocaleString();
}

// ── API client (Phase 4) — the ONE place every request is built ─────────
//
// Centralizes request construction, Authorization header attachment, JSON
// parsing, and error tagging — no fetch() call is repeated inline in any
// click handler below.

function parseJsonSafely(res) {
  return res.text().then(function (text) {
    if (!text) { return null; }
    try { return JSON.parse(text); } catch (e) { return null; }
  });
}

/* Every route in this file (LIST/DETAIL included, REQ-AUTH-MODULES-007,
   2026-08-10) goes through this one function. ensureAuthorized() opens the
   existing "Authorize this browser" dialog if no token is stored yet — the
   same primitive calendar/instance.js's own apiRequest() mutation path
   already uses; no second auth system. In normal operation this dialog is
   never seen for LIST/DETAIL because mountKnowledgeManagementWorkspace()
   never calls them while unauthenticated (see module docstring) — this is
   defense-in-depth for the mid-session token-loss case, not the primary
   gate. */
function kmProtectedRequest(pathAndQuery, options) {
  options = options || {};
  return ensureAuthorized().then(function (token) {
    var headers = { 'Authorization': 'Bearer ' + token };
    if (options.body !== undefined) { headers['Content-Type'] = 'application/json'; }
    return fetch(KNOWLEDGE_DOCUMENTS_API_BASE + pathAndQuery, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    }).then(function (res) {
      return parseJsonSafely(res).then(function (body) {
        if (res.status === 401) {
          handleUnauthorizedResponse();
          var authErr = new Error('Authorization expired.');
          authErr.code = 'auth_required';
          authErr.status = 401;
          throw authErr;
        }
        if (!res.ok) {
          var err = new Error((body && body.message) || 'Request failed.');
          err.status = res.status;
          // Known, backend-declared codes (body.error) are passed through
          // to mapApiError verbatim; every other 4xx/5xx falls back to the
          // shared, generic status classifier — same two-tier convention
          // apiRequest()/leaveApiRequest() already use.
          err.code = (body && body.error) || classifyHttpStatus(res.status);
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }, function (err) {
    var tagged = (err instanceof Error) ? err : new Error('Authorization cancelled.');
    tagged.code = tagged.code || 'auth_cancelled';
    throw tagged;
  });
}

export function listKnowledgeDocuments(filters) {
  return kmProtectedRequest('?' + buildListQueryString(filters));
}

export function getKnowledgeDocument(id) {
  return kmProtectedRequest('/' + id);
}

export function createKnowledgeDocument(payload) {
  return kmProtectedRequest('', { method: 'POST', body: payload });
}

export function updateKnowledgeDocumentMetadata(id, payload) {
  return kmProtectedRequest('/' + id, { method: 'PATCH', body: payload });
}

export function createKnowledgeDocumentVersion(id, payload) {
  return kmProtectedRequest('/' + id + '/versions', { method: 'POST', body: payload });
}

export function archiveKnowledgeDocument(id) {
  return kmProtectedRequest('/' + id + '/archive', { method: 'POST' });
}

export function unarchiveKnowledgeDocument(id) {
  return kmProtectedRequest('/' + id + '/unarchive', { method: 'POST' });
}

export function softDeleteKnowledgeDocument(id, deleteReason) {
  return kmProtectedRequest('/' + id, { method: 'DELETE', body: { delete_reason: deleteReason } });
}

/* Wired into the Deleted Documents view's Restore action (REQ-KM-UI-005
   Phase 5) — no request body; actor identity is server-derived from the
   Bearer token, never client-supplied. */
export function restoreKnowledgeDocument(id) {
  return kmProtectedRequest('/' + id + '/restore', { method: 'POST' });
}

export function listKnowledgeDocumentVersions(id) {
  return kmProtectedRequest('/' + id + '/versions');
}

export function listKnowledgeDocumentAuditLog(id) {
  return kmProtectedRequest('/' + id + '/audit');
}

/* REQ-KM-UI-005 Phase 3 — the mirror image of listKnowledgeDocuments:
   returns ONLY soft-deleted documents. Auth-required (unlike public LIST/
   DETAIL), matching the backend route's own Depends(get_verified_member). */
export function listDeletedKnowledgeDocuments() {
  return kmProtectedRequest('/deleted');
}

// ── DOM helpers ───────────────────────────────────────────────────────

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
    container.appendChild(textEl('span', 'msc-km-dash', '—'));
    return;
  }
  container.appendChild(document.createTextNode(String(value)));
}

function labelledField(labelText, forId) {
  var wrap = el('div', 'msc-km-field');
  var label = textEl('label', 'msc-km-field-label', labelText);
  if (forId) { label.setAttribute('for', forId); }
  wrap.appendChild(label);
  return wrap;
}

// ── Workspace ─────────────────────────────────────────────────────────

/* Mounted exactly once (initKnowledgeManagement below), inside the
   independent #tab-knowledge-management panel. opts.api lets tests inject
   fixture request functions instead of the real fetch-backed exports
   above — production wiring (initKnowledgeManagement) always omits it. */
export function mountKnowledgeManagementWorkspace(mountEl, opts) {
  if (!mountEl) { return null; }
  opts = opts || {};
  var api = opts.api || {
    list: listKnowledgeDocuments,
    detail: getKnowledgeDocument,
    create: createKnowledgeDocument,
    updateMetadata: updateKnowledgeDocumentMetadata,
    createVersion: createKnowledgeDocumentVersion,
    archive: archiveKnowledgeDocument,
    unarchive: unarchiveKnowledgeDocument,
    softDelete: softDeleteKnowledgeDocument,
    restore: restoreKnowledgeDocument,
    listVersions: listKnowledgeDocumentVersions,
    listAuditLog: listKnowledgeDocumentAuditLog,
    listDeleted: listDeletedKnowledgeDocuments
  };

  var state = {
    status: 'loading', // 'loading' | 'data' | 'empty' | 'error'
    documents: [],
    filters: { search: '', team: 'all', documentType: 'all', lifecycleStatus: 'all' },
    requestId: 0,
    errorMessage: null,
    // REQ-KM-UI-005 Phase 4 — internal view toggle, not a second sidebar item.
    view: 'active', // 'active' | 'deleted'
    deletedStatus: 'idle', // 'idle' | 'loading' | 'data' | 'empty' | 'error'
    deletedDocuments: [],
    deletedErrorMessage: null,
    deletedRequestId: 0
    // REQ-KM-UI-005's Phase 7 data-derived filterOptionsBaseline is gone —
    // REQ-KM-UI-006 replaced the Team filter with the fixed KM_DEFAULT_TEAMS
    // enum (same "populated once at mount, never rebuilt from
    // state.documents" approach DOCUMENT_TYPE_OPTIONS already used), so
    // there is no longer any data-derived Team option list to keep stable.
  };

  function currentAccess() {
    return getStoredMemberKey() ? 'authorized' : 'unauthorized';
  }

  mountEl.textContent = '';

  /* Whole-panel gate (REQ-AUTH-MODULES-007, 2026-08-10) — while
     unauthenticated, this is the ENTIRE mount: no filter bar, no table, no
     Add button, and critically no api.list() call at all (the only thing
     GET /api/knowledge-documents ever sees from this module is a request
     already carrying a valid Authorization header). initKnowledgeManagement()
     re-mounts from scratch on CALENDAR_AUTH_CHANGED_EVENT, so authorizing
     (via this notice's own button, the sidebar lock, or any other trigger)
     replaces this placeholder with the real workspace automatically — no
     page refresh needed. */
  if (currentAccess() === 'unauthorized') {
    mountEl.appendChild(buildAuthRequiredNotice('knowledge-management'));
    return {
      getState: function () { return state; },
      reload: function () {},
      reloadDeleted: function () {}
    };
  }

  var headerRow = el('div', 'msc-km-header-row');
  var heading = textEl('h3', 'msc-km-section-heading', 'Company Documents');
  headerRow.appendChild(heading);
  var addBtn = el('button', 'msc-btn msc-btn-primary msc-km-add-btn');
  addBtn.type = 'button';
  addBtn.textContent = '+ Add Document';
  headerRow.appendChild(addBtn);
  mountEl.appendChild(headerRow);

  // ── Internal view toggle (Active / Deleted) — REQ-KM-UI-005 Phase 4.
  //    NOT a new sidebar item: this is entirely within the existing
  //    Knowledge Management panel, same tablist/tab/tabpanel pattern
  //    issues.js already uses for its own Issues/Assigned Tickets toggle. ──
  var viewTabs = el('div', 'msc-km-view-tabs');
  viewTabs.setAttribute('role', 'tablist');
  viewTabs.setAttribute('aria-label', 'Knowledge Management views');

  var activeTabBtn = el('button', 'msc-km-view-tab');
  activeTabBtn.type = 'button';
  activeTabBtn.id = 'msc-km-view-tab-active';
  activeTabBtn.setAttribute('role', 'tab');
  activeTabBtn.setAttribute('aria-controls', 'msc-km-view-panel-active');
  activeTabBtn.textContent = 'Active Documents';

  var deletedTabBtn = el('button', 'msc-km-view-tab');
  deletedTabBtn.type = 'button';
  deletedTabBtn.id = 'msc-km-view-tab-deleted';
  deletedTabBtn.setAttribute('role', 'tab');
  deletedTabBtn.setAttribute('aria-controls', 'msc-km-view-panel-deleted');
  deletedTabBtn.textContent = 'Deleted Documents';

  viewTabs.appendChild(activeTabBtn);
  viewTabs.appendChild(deletedTabBtn);
  mountEl.appendChild(viewTabs);

  var activeViewPanel = el('div', 'msc-km-view-panel');
  activeViewPanel.id = 'msc-km-view-panel-active';
  activeViewPanel.setAttribute('role', 'tabpanel');
  activeViewPanel.setAttribute('aria-labelledby', 'msc-km-view-tab-active');

  // ── Toolbar: search + Team + Document Type + Lifecycle Status ───────
  var toolbar = el('div', 'msc-km-toolbar');

  var searchField = el('div', 'msc-km-filter-field');
  var searchLabel = textEl('label', 'msc-km-filter-label', 'Search');
  searchLabel.setAttribute('for', 'msc-km-search-input');
  var searchInput = el('input', 'msc-km-search-input');
  searchInput.type = 'search';
  searchInput.id = 'msc-km-search-input';
  searchInput.setAttribute('placeholder', 'Search documents...');
  searchField.appendChild(searchLabel);
  searchField.appendChild(searchInput);

  var teamField = el('div', 'msc-km-filter-field');
  var teamLabel = textEl('label', 'msc-km-filter-label', 'Team:');
  teamLabel.setAttribute('for', 'msc-km-team-filter');
  var teamSelect = el('select', 'msc-km-select');
  teamSelect.id = 'msc-km-team-filter';
  teamField.appendChild(teamLabel);
  teamField.appendChild(teamSelect);

  var typeField = el('div', 'msc-km-filter-field');
  var typeLabel = textEl('label', 'msc-km-filter-label', 'Document Type:');
  typeLabel.setAttribute('for', 'msc-km-type-filter');
  var typeSelect = el('select', 'msc-km-select');
  typeSelect.id = 'msc-km-type-filter';
  typeField.appendChild(typeLabel);
  typeField.appendChild(typeSelect);

  var lifecycleField = el('div', 'msc-km-filter-field');
  var lifecycleLabel = textEl('label', 'msc-km-filter-label', 'Status:');
  lifecycleLabel.setAttribute('for', 'msc-km-lifecycle-filter');
  var lifecycleSelect = el('select', 'msc-km-select');
  lifecycleSelect.id = 'msc-km-lifecycle-filter';
  var allLifecycleOpt = el('option', 'msc-km-select-option');
  allLifecycleOpt.value = 'all';
  allLifecycleOpt.textContent = 'All';
  lifecycleSelect.appendChild(allLifecycleOpt);
  LIFECYCLE_STATUS_OPTIONS.forEach(function (v) {
    var opt = el('option', 'msc-km-select-option');
    opt.value = v;
    opt.textContent = v;
    lifecycleSelect.appendChild(opt);
  });
  lifecycleField.appendChild(lifecycleLabel);
  lifecycleField.appendChild(lifecycleSelect);

  toolbar.appendChild(searchField);
  toolbar.appendChild(teamField);
  toolbar.appendChild(typeField);
  toolbar.appendChild(lifecycleField);

  var countPill = el('span', 'msc-km-count-pill');
  toolbar.appendChild(countPill);

  activeViewPanel.appendChild(toolbar);

  var tableRegion = el('div', 'msc-km-table-region');
  activeViewPanel.appendChild(tableRegion);
  mountEl.appendChild(activeViewPanel);

  // ── Deleted Documents view panel (REQ-KM-UI-005 Phase 4) — a separate,
  //    read-mostly table fed by GET /api/knowledge-documents/deleted.
  //    No Add/search/filter controls here — Restore is the only action. ──
  var deletedViewPanel = el('div', 'msc-km-view-panel');
  deletedViewPanel.id = 'msc-km-view-panel-deleted';
  deletedViewPanel.setAttribute('role', 'tabpanel');
  deletedViewPanel.setAttribute('aria-labelledby', 'msc-km-view-tab-deleted');
  deletedViewPanel.hidden = true;

  var deletedTableRegion = el('div', 'msc-km-table-region');
  deletedViewPanel.appendChild(deletedTableRegion);
  mountEl.appendChild(deletedViewPanel);

  // ── Team filter options (REQ-KM-UI-006) — the fixed KM_DEFAULT_TEAMS
  //    enum, populated once at mount, exactly like Document Type's own
  //    DOCUMENT_TYPE_OPTIONS block right below. Never derived from
  //    state.documents / API records / search results — REQ-KM-UI-005's
  //    data-derived baseline approach (which this replaces) is why the
  //    filter used to show stray values like "test team" in the first
  //    place; a fixed enum has no such failure mode by construction. ──
  var teamAllOpt = el('option', 'msc-km-select-option');
  teamAllOpt.value = 'all';
  teamAllOpt.textContent = 'All';
  teamSelect.appendChild(teamAllOpt);
  KM_DEFAULT_TEAMS.forEach(function (v) {
    var opt = el('option', 'msc-km-select-option');
    opt.value = v;
    opt.textContent = v;
    teamSelect.appendChild(opt);
  });
  teamSelect.value = 'all';

  var typeAllOpt = el('option', 'msc-km-select-option');
  typeAllOpt.value = 'all';
  typeAllOpt.textContent = 'All';
  typeSelect.appendChild(typeAllOpt);
  DOCUMENT_TYPE_OPTIONS.forEach(function (v) {
    var opt = el('option', 'msc-km-select-option');
    opt.value = v;
    opt.textContent = v;
    typeSelect.appendChild(opt);
  });
  typeSelect.value = 'all';

  // ── Modal shell (Phase 7-10/14-15) — one lazy singleton, reconfigured
  //    per open() call, same pattern as calendar/auth.js's
  //    ensureTokenDialog() ────────────────────────────────────────────
  var modal = null;
  function ensureModal() {
    if (modal) { return modal; }
    var overlay = el('div', 'msc-modal-overlay msc-km-modal-overlay');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    var box = el('div', 'msc-modal msc-modal-form msc-km-modal');
    var head = el('div', 'msc-modal-form-head');
    var titleEl = textEl('h4', '', '');
    titleEl.id = 'msc-km-modal-title';
    overlay.setAttribute('aria-labelledby', 'msc-km-modal-title');
    var closeBtn = el('button', 'msc-modal-close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    head.appendChild(titleEl);
    head.appendChild(closeBtn);
    var bodyEl = el('div', 'msc-km-modal-body');
    box.appendChild(head);
    box.appendChild(bodyEl);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var triggerEl = null;

    function close() {
      overlay.classList.remove('show');
      unlockBodyScroll();
      overlay.removeEventListener('keydown', onKeydown);
      bodyEl.textContent = '';
      if (triggerEl) { returnFocus(triggerEl); }
    }

    function onKeydown(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') { trapTab(box, e); }
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) { close(); } });

    function open(title, buildBody, trigger) {
      triggerEl = trigger || document.activeElement;
      titleEl.textContent = title;
      bodyEl.textContent = '';
      buildBody(bodyEl, close);
      overlay.classList.add('show');
      lockBodyScroll();
      overlay.addEventListener('keydown', onKeydown);
      window.requestAnimationFrame(function () {
        var focusable = box.querySelector('.msc-km-modal-first-focus') || box.querySelector('.msc-km-modal-primary-focus');
        (focusable || closeBtn).focus();
      });
    }

    modal = { open: open, close: close };
    return modal;
  }

  // ── Shared field-building for Create / Edit forms ────────────────────

  function buildTextField(container, opts) {
    var field = labelledField(opts.label, opts.id);
    var input = el(opts.multiline ? 'textarea' : 'input', 'msc-km-input');
    input.id = opts.id;
    if (!opts.multiline) { input.type = opts.type || 'text'; }
    if (opts.required) { input.required = true; }
    if (opts.value) { input.value = opts.value; }
    if (opts.placeholder) { input.setAttribute('placeholder', opts.placeholder); }
    input.addEventListener('input', function () { clearFieldError(input); });
    field.appendChild(input);
    container.appendChild(field);
    return input;
  }

  /* opts.placeholder (REQ-KM-UI-006) — when given, prepends a disabled-
     looking value="" option with that label as the unselected default, so
     the user must make a deliberate choice rather than silently inheriting
     whatever option happens to be first (typeSelect/lifecycleSelectEl/
     complianceSelectEl below all omit it — unaffected, same behavior as
     before this option existed). */
  function buildSelectField(container, opts) {
    var field = labelledField(opts.label, opts.id);
    var select = el('select', 'msc-km-input');
    select.id = opts.id;
    if (opts.placeholder) {
      var placeholderOpt = el('option', 'msc-km-select-option');
      placeholderOpt.value = '';
      placeholderOpt.textContent = opts.placeholder;
      select.appendChild(placeholderOpt);
    }
    (opts.options || []).forEach(function (v) {
      var o = el('option', 'msc-km-select-option');
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
    if (opts.value) { select.value = opts.value; }
    field.appendChild(select);
    container.appendChild(field);
    return select;
  }

  // ── CREATE (Phase 7) ─────────────────────────────────────────────────

  function openCreateModal() {
    ensureModal().open('Add Document', function (body, close) {
      var form = el('form', 'msc-km-form');

      var titleInput = buildTextField(form, { id: 'msc-km-create-title', label: 'Document Title (required)', required: true });
      titleInput.classList.add('msc-km-modal-first-focus');
      // REQ-KM-UI-006 — fixed-list select, never free text. No "Other"
      // escape hatch: the user must pick one of the 17 approved values.
      var teamSelect = buildSelectField(form, {
        id: 'msc-km-create-team', label: 'Team *', options: KM_DEFAULT_TEAMS, placeholder: 'Select Team'
      });
      var typeSelect = buildSelectField(form, { id: 'msc-km-create-type', label: 'Document Type (required)', options: DOCUMENT_TYPE_OPTIONS });
      var jobRoleInput = buildTextField(form, { id: 'msc-km-create-job-role', label: 'Job Role (optional)' });
      var categoryInput = buildTextField(form, { id: 'msc-km-create-category', label: 'Document Category (optional)' });
      var creatorInput = buildTextField(form, { id: 'msc-km-create-creator', label: 'Creator (optional)' });
      var urlInput = buildTextField(form, {
        id: 'msc-km-create-url', label: 'Source URL (required)', type: 'url', required: true,
        placeholder: 'https://...'
      });

      var actions = el('div', 'msc-km-form-actions');
      var cancelBtn = el('button', 'msc-btn msc-btn-ghost');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', close);
      var saveBtn = el('button', 'msc-btn msc-btn-primary msc-km-modal-primary-focus');
      saveBtn.type = 'submit';
      saveBtn.textContent = 'Save';
      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);
      form.appendChild(actions);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearFormErrors(form);
        var hasError = false;
        if (!titleInput.value.trim()) { setFieldError(titleInput, 'Enter a document title.'); hasError = true; }
        if (!teamSelect.value) { setFieldError(teamSelect, 'Select a team.'); hasError = true; }
        if (!urlInput.value.trim()) {
          setFieldError(urlInput, 'Enter a source URL.'); hasError = true;
        } else if (!isSafeHttpUrl(urlInput.value.trim())) {
          setFieldError(urlInput, 'Enter a valid http:// or https:// URL.'); hasError = true;
        }
        if (hasError) { focusFirstInvalid(form); return; }

        setButtonBusy(saveBtn, true, { busyLabel: 'Saving…' });
        saveBtn.disabled = true;
        cancelBtn.disabled = true;

        api.create({
          title: titleInput.value.trim(),
          team: teamSelect.value,
          document_type: typeSelect.value,
          job_role: jobRoleInput.value.trim() || null,
          document_category: categoryInput.value.trim() || null,
          creator: creatorInput.value.trim() || null,
          source_url: urlInput.value.trim()
        }).then(function (record) {
          setButtonBusy(saveBtn, false);
          close();
          showToast({ type: 'success', title: 'Document added', message: '"' + record.title + '" was registered.' });
          if (record.warnings && record.warnings.length) {
            showToast({ type: 'warning', title: 'Possible duplicate title', message: record.warnings[0], persistent: true });
          }
          loadDocuments();
        }, function (err) {
          setButtonBusy(saveBtn, false);
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
          if (err.code === 'knowledge_document_duplicate_source_url') {
            setFieldError(urlInput, mapApiError(err).message);
            return;
          }
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
        });
      });

      body.appendChild(form);
    });
  }

  // ── DETAIL (Phase 8) ─────────────────────────────────────────────────

  function detailRow(container, label, value) {
    var row = el('div', 'msc-km-detail-row');
    row.appendChild(textEl('span', 'msc-km-detail-label', label));
    var valueEl = el('span', 'msc-km-detail-value');
    dashOrText(valueEl, value);
    row.appendChild(valueEl);
    container.appendChild(row);
  }

  /* REQ-KM-UI-005 Phase 6 — calls the real GET /api/knowledge-documents/
     {id} detail endpoint instead of reusing the already-fetched list row.
     listRowDoc (the row from the table) is kept in closure scope for the
     entire lifetime of this modal — "do not discard the existing list row
     while loading" — and its title is shown as context throughout the
     loading and error states, so the modal never goes contextless even if
     the detail request is slow or fails. The success state renders ONLY
     fields the canonical GET response actually returned (never anything
     invented), and every action button below (Edit/Version/Archive/
     Delete) is wired to that fresh canonical `record`, not the stale list
     row — e.g. so the Archive/Unarchive label reflects the true current
     lifecycle_status even if it changed since the list was last loaded. */
  function openDetailModal(listRowDoc, trigger) {
    ensureModal().open('Document Details', function (body, close) {
      var contextNote = textEl('p', 'msc-km-detail-context', listRowDoc.title);
      body.appendChild(contextNote);

      var statusWrap = el('div', 'msc-km-detail-status-wrap');
      body.appendChild(statusWrap);

      function renderLoadingState() {
        contextNote.hidden = false;
        statusWrap.textContent = '';
        statusWrap.appendChild(textEl('div', 'msc-km-loading', LOADING_TEXT));
      }

      function renderErrorState(err) {
        contextNote.hidden = false;
        statusWrap.textContent = '';
        var errWrap = el('div', 'msc-km-error-state');
        errWrap.setAttribute('role', 'alert');
        var mapped = mapApiError(err);
        errWrap.appendChild(textEl('p', '', mapped.message || ERROR_TEXT));
        var retryBtn = el('button', 'msc-btn msc-btn-ghost');
        retryBtn.type = 'button';
        retryBtn.textContent = 'Retry';
        retryBtn.addEventListener('click', load);
        errWrap.appendChild(retryBtn);
        statusWrap.appendChild(errWrap);
      }

      function renderDetailState(record) {
        // The grid below already shows Title as its own row — no need to
        // keep the context line duplicating it once real detail loads.
        contextNote.hidden = true;
        statusWrap.textContent = '';

        var grid = el('div', 'msc-km-detail-grid');
        detailRow(grid, 'Title', record.title);
        detailRow(grid, 'Team', record.team);
        detailRow(grid, 'Document Type', record.document_type);
        detailRow(grid, 'Job Role', record.job_role);
        detailRow(grid, 'Document Category', record.document_category);
        detailRow(grid, 'Creator', record.creator);
        detailRow(grid, 'Created By', record.created_by);
        detailRow(grid, 'Current Version', record.current_version);
        detailRow(grid, 'Lifecycle', record.lifecycle_status);
        detailRow(grid, 'Compliance', record.compliance_status);
        detailRow(grid, 'Google Ownership', record.google_ownership_status);
        detailRow(grid, 'Created', formatTimestamp(record.created_at));
        detailRow(grid, 'Updated', formatTimestamp(record.updated_at));
        statusWrap.appendChild(grid);

        var linkRow = el('div', 'msc-km-detail-row');
        linkRow.appendChild(textEl('span', 'msc-km-detail-label', 'Source'));
        var linkValue = el('span', 'msc-km-detail-value');
        if (isSafeHttpUrl(record.source_url)) {
          var a = el('a', 'msc-km-open-link');
          a.setAttribute('href', record.source_url);
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          a.textContent = 'Open Document';
          linkValue.appendChild(a);
        } else {
          dashOrText(linkValue, null);
        }
        linkRow.appendChild(linkValue);
        statusWrap.appendChild(linkRow);

        var actions = el('div', 'msc-km-detail-actions');

        var editBtn = el('button', 'msc-btn msc-btn-ghost');
        editBtn.type = 'button';
        editBtn.textContent = 'Edit Metadata';
        editBtn.addEventListener('click', function () { openEditModal(record, trigger); });
        actions.appendChild(editBtn);

        var versionBtn = el('button', 'msc-btn msc-btn-ghost');
        versionBtn.type = 'button';
        versionBtn.textContent = 'Create New Version';
        versionBtn.addEventListener('click', function () { openVersionModal(record, trigger); });
        actions.appendChild(versionBtn);

        var lifecycleBtn = el('button', 'msc-btn msc-btn-ghost');
        lifecycleBtn.type = 'button';
        if (record.lifecycle_status === 'Archived') {
          lifecycleBtn.textContent = 'Unarchive';
          lifecycleBtn.addEventListener('click', function () { handleUnarchive(record, trigger); });
        } else {
          lifecycleBtn.textContent = 'Archive';
          lifecycleBtn.addEventListener('click', function () { handleArchive(record, trigger); });
        }
        actions.appendChild(lifecycleBtn);

        var versionsBtn = el('button', 'msc-btn msc-btn-ghost');
        versionsBtn.type = 'button';
        versionsBtn.textContent = 'View Version History';
        versionsBtn.addEventListener('click', function () { openVersionHistoryModal(record, trigger); });
        actions.appendChild(versionsBtn);

        var auditBtn = el('button', 'msc-btn msc-btn-ghost');
        auditBtn.type = 'button';
        auditBtn.textContent = 'View Audit History';
        auditBtn.addEventListener('click', function () { openAuditHistoryModal(record, trigger); });
        actions.appendChild(auditBtn);

        statusWrap.appendChild(actions);

        // Secondary/more action area (Phase 12) — visually separated Delete.
        var moreArea = el('div', 'msc-km-more-actions');
        var deleteBtn = el('button', 'msc-btn msc-btn-danger msc-km-delete-btn');
        deleteBtn.type = 'button';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', function () { handleDelete(record, trigger); });
        moreArea.appendChild(deleteBtn);
        statusWrap.appendChild(moreArea);
      }

      function load() {
        renderLoadingState();
        api.detail(listRowDoc.id).then(renderDetailState, renderErrorState);
      }

      load();
    }, trigger);
  }

  // ── EDIT METADATA (Phase 9) ──────────────────────────────────────────

  function openEditModal(document, trigger) {
    ensureModal().open('Edit Metadata', function (body, close) {
      var form = el('form', 'msc-km-form');

      var titleInput = buildTextField(form, { id: 'msc-km-edit-title', label: 'Document Title (required)', required: true, value: document.title });
      titleInput.classList.add('msc-km-modal-first-focus');

      // REQ-KM-UI-006 Phase 6 — LEGACY TEAM SAFETY. A record created before
      // this task (or via direct API/DB access) may carry a Team value that
      // is not one of the 17 approved values (e.g. "test team"). Opening or
      // saving this form must NEVER silently rewrite that value:
      //   - if document.team IS one of the 17: preselect it normally, and
      //     (matching this form's pre-existing behavior for every other
      //     field) it is resent unchanged on every save, whether or not the
      //     user touches it — never a behavior change for a normal record.
      //   - if document.team is NOT one of the 17 (legacy): the select is
      //     left on the "Select Team" placeholder (not silently coerced to
      //     one of the 17, and not added as a fake extra option either — an
      //     invented 18th dropdown entry would look like an approved value
      //     it isn't), a read-only note states the current legacy value
      //     explicitly, and — critically — if the user leaves the select on
      //     the placeholder and saves (e.g. only fixing a typo in Job
      //     Role), `team` is omitted from the PATCH payload entirely below,
      //     so the backend's exclude_unset semantics leave the legacy value
      //     on the record completely untouched. Only an INTENTIONAL
      //     selection of one of the 17 values changes it.
      var isLegacyTeam = KM_DEFAULT_TEAMS.indexOf(document.team) === -1;
      var teamSelect = buildSelectField(form, {
        id: 'msc-km-edit-team', label: 'Team *', options: KM_DEFAULT_TEAMS, placeholder: 'Select Team',
        value: isLegacyTeam ? '' : document.team
      });
      if (isLegacyTeam) {
        var teamLegacyNote = textEl(
          'p', 'msc-km-readonly-note msc-km-team-legacy-note',
          'Current Team on record: "' + document.team + '" (not a standard Team). ' +
          'Select one of the standard Teams above only if you want to change it — ' +
          'leaving "Select Team" chosen keeps the current value unchanged.'
        );
        form.appendChild(teamLegacyNote);
      }

      var typeSelect = buildSelectField(form, { id: 'msc-km-edit-type', label: 'Document Type (required)', options: DOCUMENT_TYPE_OPTIONS, value: document.document_type });
      var jobRoleInput = buildTextField(form, { id: 'msc-km-edit-job-role', label: 'Job Role (optional)', value: document.job_role });
      var categoryInput = buildTextField(form, { id: 'msc-km-edit-category', label: 'Document Category (optional)', value: document.document_category });
      var creatorInput = buildTextField(form, { id: 'msc-km-edit-creator', label: 'Creator (optional)', value: document.creator });
      var lifecycleSelectEl = buildSelectField(form, { id: 'msc-km-edit-lifecycle', label: 'Lifecycle', options: LIFECYCLE_STATUS_OPTIONS, value: document.lifecycle_status });
      var complianceSelectEl = buildSelectField(form, { id: 'msc-km-edit-compliance', label: 'Compliance', options: ['Pending', 'Completed'], value: document.compliance_status });

      // Source URL is NOT editable here — the backend explicitly rejects
      // it on this route (Phase 9). Shown as read-only, with the required
      // redirect explanation, never as an editable control.
      var urlNote = el('div', 'msc-km-field');
      urlNote.appendChild(textEl('span', 'msc-km-field-label', 'Source URL'));
      var urlReadonly = textEl('p', 'msc-km-readonly-note', document.source_url + ' — use Create New Version to change the document source.');
      urlNote.appendChild(urlReadonly);
      form.appendChild(urlNote);

      var changeDescInput = buildTextField(form, {
        id: 'msc-km-edit-change-description', label: 'Change Description (required)', required: true, multiline: true
      });

      var actions = el('div', 'msc-km-form-actions');
      var cancelBtn = el('button', 'msc-btn msc-btn-ghost');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', close);
      var saveBtn = el('button', 'msc-btn msc-btn-primary msc-km-modal-primary-focus');
      saveBtn.type = 'submit';
      saveBtn.textContent = 'Save';
      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);
      form.appendChild(actions);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearFormErrors(form);
        var hasError = false;
        if (!titleInput.value.trim()) { setFieldError(titleInput, 'Enter a document title.'); hasError = true; }
        // A legacy Team is allowed to stay unselected (that means "leave
        // unchanged") — only a NORMAL record's Team select is required,
        // since it always starts preselected to a real value already.
        if (!isLegacyTeam && !teamSelect.value) { setFieldError(teamSelect, 'Select a team.'); hasError = true; }
        if (!changeDescInput.value.trim()) { setFieldError(changeDescInput, 'Describe what changed.'); hasError = true; }
        if (hasError) { focusFirstInvalid(form); return; }

        setButtonBusy(saveBtn, true, { busyLabel: 'Saving…' });
        saveBtn.disabled = true;
        cancelBtn.disabled = true;

        var payload = {
          title: titleInput.value.trim(),
          document_type: typeSelect.value,
          job_role: jobRoleInput.value.trim() || null,
          document_category: categoryInput.value.trim() || null,
          creator: creatorInput.value.trim() || null,
          lifecycle_status: lifecycleSelectEl.value,
          compliance_status: complianceSelectEl.value,
          change_description: changeDescInput.value.trim()
        };
        // team is included only when the select actually holds a real
        // value — for a normal record that's always true (preselected);
        // for an untouched legacy record it's deliberately omitted so the
        // PATCH never overwrites the legacy value (see the note above).
        if (teamSelect.value) { payload.team = teamSelect.value; }

        api.updateMetadata(document.id, payload).then(function (record) {
          setButtonBusy(saveBtn, false);
          close();
          showToast({ type: 'success', title: 'Document updated', message: '"' + record.title + '" was saved.' });
          loadDocuments();
        }, function (err) {
          setButtonBusy(saveBtn, false);
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
        });
      });

      body.appendChild(form);
    }, trigger);
  }

  // ── CREATE VERSION (Phase 10) ────────────────────────────────────────

  function openVersionModal(document, trigger) {
    ensureModal().open('Create New Version', function (body, close) {
      var form = el('form', 'msc-km-form');

      var urlInput = buildTextField(form, {
        id: 'msc-km-version-url', label: 'New Source URL (required)', type: 'url', required: true,
        value: document.source_url
      });
      urlInput.classList.add('msc-km-modal-first-focus');
      var versionInput = buildTextField(form, { id: 'msc-km-version-label', label: 'Version Label (required)', required: true });
      var changeDescInput = buildTextField(form, {
        id: 'msc-km-version-change-description', label: 'Change Description (required)', required: true, multiline: true
      });

      var actions = el('div', 'msc-km-form-actions');
      var cancelBtn = el('button', 'msc-btn msc-btn-ghost');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', close);
      var saveBtn = el('button', 'msc-btn msc-btn-primary msc-km-modal-primary-focus');
      saveBtn.type = 'submit';
      saveBtn.textContent = 'Save';
      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);
      form.appendChild(actions);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearFormErrors(form);
        var hasError = false;
        if (!urlInput.value.trim()) {
          setFieldError(urlInput, 'Enter the new source URL.'); hasError = true;
        } else if (!isSafeHttpUrl(urlInput.value.trim())) {
          setFieldError(urlInput, 'Enter a valid http:// or https:// URL.'); hasError = true;
        }
        if (!versionInput.value.trim()) { setFieldError(versionInput, 'Enter a version label.'); hasError = true; }
        if (!changeDescInput.value.trim()) { setFieldError(changeDescInput, 'Describe what changed.'); hasError = true; }
        if (hasError) { focusFirstInvalid(form); return; }

        setButtonBusy(saveBtn, true, { busyLabel: 'Saving…' });
        saveBtn.disabled = true;
        cancelBtn.disabled = true;

        api.createVersion(document.id, {
          source_url: urlInput.value.trim(),
          version_label: versionInput.value.trim(),
          change_description: changeDescInput.value.trim()
        }).then(function (record) {
          setButtonBusy(saveBtn, false);
          close();
          showToast({ type: 'success', title: 'Version created', message: 'Now on version ' + record.current_version + '.' });
          loadDocuments();
        }, function (err) {
          setButtonBusy(saveBtn, false);
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
          if (err.code === 'knowledge_document_duplicate_source_url') {
            setFieldError(urlInput, mapApiError(err).message);
            return;
          }
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
        });
      });

      body.appendChild(form);
    }, trigger);
  }

  // ── ARCHIVE / UNARCHIVE (Phase 11) ───────────────────────────────────

  function handleArchive(document, trigger) {
    confirmDestructive({
      title: 'Archive this document?',
      message: '"' + document.title + '" will be marked Archived. This does not delete it — it remains visible and can be unarchived at any time.',
      confirmLabel: 'Archive',
      confirmVariant: 'primary',
      trigger: trigger,
      onConfirm: function () {
        return api.archive(document.id).then(function () {
          showToast({ type: 'success', title: 'Document archived', message: '"' + document.title + '" is now Archived.' });
          loadDocuments();
          return true;
        }, function (err) {
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
          return false;
        });
      }
    });
  }

  function handleUnarchive(document, trigger) {
    api.unarchive(document.id).then(function () {
      showToast({ type: 'success', title: 'Document unarchived', message: '"' + document.title + '" is now Active.' });
      loadDocuments();
    }, function (err) {
      var mapped = mapApiError(err);
      showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
    });
  }

  // ── SOFT DELETE (Phase 12) ───────────────────────────────────────────

  function handleDelete(document, trigger) {
    ensureModal().open('Delete Document', function (body, close) {
      var notice = textEl('p', 'msc-km-delete-notice',
        'This removes "' + document.title + '" from the active list. This is NOT permanent deletion — ' +
        'the record and its history are kept and can be restored later.');
      body.appendChild(notice);

      var form = el('form', 'msc-km-form');
      var reasonInput = buildTextField(form, {
        id: 'msc-km-delete-reason', label: 'Reason for deletion (required)', required: true, multiline: true
      });
      reasonInput.classList.add('msc-km-modal-first-focus');

      var actions = el('div', 'msc-km-form-actions');
      var cancelBtn = el('button', 'msc-btn msc-btn-ghost');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', close);
      var deleteBtn = el('button', 'msc-btn msc-btn-danger msc-km-modal-primary-focus');
      deleteBtn.type = 'submit';
      deleteBtn.textContent = 'Delete (not permanent)';
      actions.appendChild(cancelBtn);
      actions.appendChild(deleteBtn);
      form.appendChild(actions);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        clearFormErrors(form);
        if (!reasonInput.value.trim()) {
          setFieldError(reasonInput, 'Enter a reason for deletion.');
          focusFirstInvalid(form);
          return;
        }
        setButtonBusy(deleteBtn, true, { busyLabel: 'Deleting…' });
        deleteBtn.disabled = true;
        cancelBtn.disabled = true;

        api.softDelete(document.id, reasonInput.value.trim()).then(function () {
          setButtonBusy(deleteBtn, false);
          close();
          showToast({ type: 'success', title: 'Document deleted', message: '"' + document.title + '" was removed from the active list.' });
          loadDocuments();
        }, function (err) {
          setButtonBusy(deleteBtn, false);
          deleteBtn.disabled = false;
          cancelBtn.disabled = false;
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
        });
      });

      body.appendChild(form);
    }, trigger);
  }

  // ── VERSION HISTORY (Phase 14, read-only) ────────────────────────────

  function openVersionHistoryModal(document, trigger) {
    ensureModal().open('Version History', function (body, close) {
      var listEl = el('div', 'msc-km-history-list');
      listEl.textContent = 'Loading…';
      body.appendChild(listEl);

      api.listVersions(document.id).then(function (versions) {
        listEl.textContent = '';
        if (!versions.length) {
          listEl.appendChild(textEl('p', 'msc-km-empty', 'No version history yet.'));
          return;
        }
        versions.forEach(function (v) {
          var item = el('div', 'msc-km-history-item');
          item.appendChild(textEl('span', 'msc-km-history-version', 'v' + v.version_label));
          item.appendChild(textEl('span', 'msc-km-history-meta', v.created_by + ' — ' + formatTimestamp(v.created_at)));
          if (isSafeHttpUrl(v.source_url)) {
            var a = el('a', 'msc-km-open-link');
            a.setAttribute('href', v.source_url);
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
            a.textContent = 'Open';
            item.appendChild(a);
          }
          if (v.change_note) { item.appendChild(textEl('p', 'msc-km-history-note', v.change_note)); }
          listEl.appendChild(item);
        });
      }, function (err) {
        listEl.textContent = '';
        var mapped = mapApiError(err);
        listEl.appendChild(textEl('p', 'msc-km-error', mapped.message));
      });
    }, trigger);
  }

  // ── AUDIT HISTORY (Phase 15, read-only) ──────────────────────────────

  function openAuditHistoryModal(document, trigger) {
    ensureModal().open('Audit History', function (body, close) {
      var listEl = el('div', 'msc-km-history-list');
      listEl.textContent = 'Loading…';
      body.appendChild(listEl);

      api.listAuditLog(document.id).then(function (rows) {
        listEl.textContent = '';
        if (!rows.length) {
          listEl.appendChild(textEl('p', 'msc-km-empty', 'No audit history yet.'));
          return;
        }
        rows.forEach(function (r) {
          var item = el('div', 'msc-km-history-item');
          item.appendChild(textEl('span', 'msc-km-history-version', r.action));
          item.appendChild(textEl('span', 'msc-km-history-meta', r.actor_member_key + ' — ' + formatTimestamp(r.occurred_at)));
          listEl.appendChild(item);
        });
      }, function (err) {
        listEl.textContent = '';
        var mapped = mapApiError(err);
        listEl.appendChild(textEl('p', 'msc-km-error', mapped.message));
      });
    }, trigger);
  }

  // ── Table rendering ───────────────────────────────────────────────

  function buildOpenDocumentCell(doc) {
    var td = el('td', '');
    if (!isSafeHttpUrl(doc.source_url)) {
      td.appendChild(textEl('span', 'msc-km-dash', '—'));
      return td;
    }
    var a = el('a', 'msc-km-open-link');
    a.setAttribute('href', doc.source_url);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.textContent = 'Open Document';
    td.appendChild(a);
    return td;
  }

  function buildRow(doc) {
    var tr = el('tr', '');

    var titleTd = el('td', 'msc-km-title-cell');
    titleTd.textContent = doc.title || '';
    tr.appendChild(titleTd);

    var teamTd = el('td', '');
    dashOrText(teamTd, doc.team);
    tr.appendChild(teamTd);

    var typeTd = el('td', '');
    dashOrText(typeTd, doc.document_type);
    tr.appendChild(typeTd);

    var creatorTd = el('td', '');
    dashOrText(creatorTd, doc.creator);
    tr.appendChild(creatorTd);

    var versionTd = el('td', '');
    dashOrText(versionTd, doc.current_version);
    tr.appendChild(versionTd);

    var statusTd = el('td', '');
    dashOrText(statusTd, doc.lifecycle_status);
    tr.appendChild(statusTd);

    var actionTd = el('td', 'msc-km-actions-cell');
    var viewBtn = el('button', 'msc-btn msc-btn-ghost msc-km-view-btn');
    viewBtn.type = 'button';
    viewBtn.textContent = 'View';
    viewBtn.addEventListener('click', function () { openDetailModal(doc, viewBtn); });
    actionTd.appendChild(viewBtn);
    tr.appendChild(actionTd);

    tr.appendChild(buildOpenDocumentCell(doc));

    return tr;
  }

  function renderTable() {
    countPill.textContent = state.status === 'data'
      ? state.documents.length + (state.documents.length === 1 ? ' document' : ' documents')
      : '';

    tableRegion.textContent = '';

    if (state.status === 'loading') {
      tableRegion.appendChild(textEl('div', 'msc-km-loading', LOADING_TEXT));
      return;
    }

    if (state.status === 'error') {
      var errWrap = el('div', 'msc-km-error-state');
      errWrap.setAttribute('role', 'alert');
      errWrap.appendChild(textEl('p', '', state.errorMessage || ERROR_TEXT));
      var retryBtn = el('button', 'msc-btn msc-btn-ghost');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', loadDocuments);
      errWrap.appendChild(retryBtn);
      tableRegion.appendChild(errWrap);
      return;
    }

    if (!state.documents.length) {
      var hasActiveFilter = !!(state.filters.search || state.filters.team !== 'all' ||
        state.filters.documentType !== 'all' || state.filters.lifecycleStatus !== 'all');
      tableRegion.appendChild(
        textEl('div', 'msc-km-empty', hasActiveFilter ? FILTERED_EMPTY_STATE_TEXT : EMPTY_STATE_TEXT)
      );
      return;
    }

    var wrap = el('div', 'msc-km-table-wrap');
    var table = el('table', 'msc-km-table');
    var thead = el('thead', '');
    var headerRowEl = el('tr', '');
    ['Document Title', 'Team', 'Document Type', 'Creator', 'Version', 'Status', 'Action', ''].forEach(function (label) {
      headerRowEl.appendChild(textEl('th', '', label));
    });
    thead.appendChild(headerRowEl);
    var tbody = el('tbody', '');
    state.documents.forEach(function (doc) { tbody.appendChild(buildRow(doc)); });
    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    tableRegion.appendChild(wrap);
  }

  // ── Orchestration ───────────────────────────────────────────────────

  function loadDocuments() {
    state.status = 'loading';
    state.errorMessage = null;
    renderTable();
    var requestId = ++state.requestId;
    api.list(state.filters).then(function (result) {
      if (requestId !== state.requestId) { return; } // superseded by a newer request
      state.documents = result.records || [];
      state.status = state.documents.length ? 'data' : 'empty';
      renderTable();
    }, function (err) {
      if (requestId !== state.requestId) { return; }
      state.status = 'error';
      state.documents = [];
      state.errorMessage = mapApiError(err).message || ERROR_TEXT;
      renderTable();
    });
  }

  // ── DELETED DOCUMENTS (REQ-KM-UI-005 Phase 4-5) ──────────────────────

  function buildDeletedRow(doc) {
    var tr = el('tr', '');

    var titleTd = el('td', 'msc-km-title-cell');
    titleTd.textContent = doc.title || '';
    tr.appendChild(titleTd);

    var teamTd = el('td', ''); dashOrText(teamTd, doc.team); tr.appendChild(teamTd);
    var typeTd = el('td', ''); dashOrText(typeTd, doc.document_type); tr.appendChild(typeTd);
    var creatorTd = el('td', ''); dashOrText(creatorTd, doc.creator); tr.appendChild(creatorTd);
    var versionTd = el('td', ''); dashOrText(versionTd, doc.current_version); tr.appendChild(versionTd);
    var deletedByTd = el('td', ''); dashOrText(deletedByTd, doc.deleted_by); tr.appendChild(deletedByTd);
    var deletedAtTd = el('td', ''); dashOrText(deletedAtTd, formatTimestamp(doc.deleted_at)); tr.appendChild(deletedAtTd);
    var reasonTd = el('td', ''); dashOrText(reasonTd, doc.delete_reason); tr.appendChild(reasonTd);

    // Deliberately NO Edit Metadata / Create Version / Archive / Unarchive
    // / Delete-again controls anywhere in this row (Phase 4 explicit
    // instruction) — Restore is the only action a soft-deleted document
    // ever exposes.
    var actionTd = el('td', 'msc-km-actions-cell');
    var restoreBtn = el('button', 'msc-btn msc-btn-primary msc-km-restore-btn');
    restoreBtn.type = 'button';
    restoreBtn.textContent = 'Restore';
    restoreBtn.addEventListener('click', function () { handleRestore(doc, restoreBtn); });
    actionTd.appendChild(restoreBtn);
    tr.appendChild(actionTd);

    return tr;
  }

  function renderDeletedTable() {
    deletedTableRegion.textContent = '';

    if (state.deletedStatus === 'loading') {
      deletedTableRegion.appendChild(textEl('div', 'msc-km-loading', LOADING_TEXT));
      return;
    }

    if (state.deletedStatus === 'error') {
      var errWrap = el('div', 'msc-km-error-state');
      errWrap.setAttribute('role', 'alert');
      errWrap.appendChild(textEl('p', '', state.deletedErrorMessage || ERROR_TEXT));
      var retryBtn = el('button', 'msc-btn msc-btn-ghost');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', loadDeletedDocuments);
      errWrap.appendChild(retryBtn);
      deletedTableRegion.appendChild(errWrap);
      return;
    }

    if (!state.deletedDocuments.length) {
      deletedTableRegion.appendChild(textEl('div', 'msc-km-empty', EMPTY_DELETED_STATE_TEXT));
      return;
    }

    var wrap = el('div', 'msc-km-table-wrap');
    var table = el('table', 'msc-km-table');
    var thead = el('thead', '');
    var headerRowEl = el('tr', '');
    ['Document Title', 'Team', 'Document Type', 'Creator', 'Version', 'Deleted By', 'Deleted At', 'Delete Reason', '']
      .forEach(function (label) { headerRowEl.appendChild(textEl('th', '', label)); });
    thead.appendChild(headerRowEl);
    var tbody = el('tbody', '');
    state.deletedDocuments.forEach(function (doc) { tbody.appendChild(buildDeletedRow(doc)); });
    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    deletedTableRegion.appendChild(wrap);
  }

  /* api.listDeleted (kmProtectedRequest) calls ensureAuthorized() itself —
     no separate auth gate needed here, same convention already used by
     openVersionHistoryModal/openAuditHistoryModal's own protected calls. */
  function loadDeletedDocuments() {
    state.deletedStatus = 'loading';
    state.deletedErrorMessage = null;
    renderDeletedTable();
    var requestId = ++state.deletedRequestId;
    api.listDeleted().then(function (rows) {
      if (requestId !== state.deletedRequestId) { return; }
      state.deletedDocuments = rows || [];
      state.deletedStatus = state.deletedDocuments.length ? 'data' : 'empty';
      renderDeletedTable();
    }, function (err) {
      if (requestId !== state.deletedRequestId) { return; }
      state.deletedStatus = 'error';
      state.deletedDocuments = [];
      state.deletedErrorMessage = mapApiError(err).message || ERROR_TEXT;
      renderDeletedTable();
    });
  }

  /* No client-side restore workaround of any kind — every render of the
     Deleted Documents list, and every post-restore refresh, comes straight
     from GET .../deleted; nothing about which documents are deleted is
     ever cached, inferred, or reconstructed locally. */
  function handleRestore(deletedDoc, trigger) {
    confirmDestructive({
      title: 'Restore this document?',
      message: 'Restore this document to the active Knowledge Management library?',
      confirmLabel: 'Restore',
      confirmVariant: 'primary',
      trigger: trigger,
      onConfirm: function () {
        return api.restore(deletedDoc.id).then(function () {
          showToast({ type: 'success', title: 'Document restored', message: '"' + deletedDoc.title + '" is now active again.' });
          loadDeletedDocuments();
          loadDocuments();
          return true;
        }, function (err) {
          if (err.code === 'knowledge_document_duplicate_source_url') {
            // Restore-specific wording (Phase 5) — deliberately NOT the
            // shared KNOWN_ERRORS message for this same error code (used
            // by Create/Create Version, where "already uses this source
            // URL" is the correct framing); here the actionable fact is
            // that RESTORE specifically is blocked, not creation.
            showToast({ type: 'error', title: 'Restore blocked', message: RESTORE_COLLISION_TEXT, persistent: true });
            return false;
          }
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
          return false;
        });
      }
    });
  }

  function setActiveView(view) {
    state.view = view;
    activeTabBtn.classList.toggle('active', view === 'active');
    activeTabBtn.setAttribute('aria-selected', view === 'active' ? 'true' : 'false');
    deletedTabBtn.classList.toggle('active', view === 'deleted');
    deletedTabBtn.setAttribute('aria-selected', view === 'deleted' ? 'true' : 'false');
    activeViewPanel.hidden = view !== 'active';
    deletedViewPanel.hidden = view !== 'deleted';
    if (view === 'deleted') { loadDeletedDocuments(); }
  }

  activeTabBtn.addEventListener('click', function () { setActiveView('active'); });
  deletedTabBtn.addEventListener('click', function () { setActiveView('deleted'); });

  var searchDebounceHandle = null;
  searchInput.addEventListener('input', function () {
    if (searchDebounceHandle) { clearTimeout(searchDebounceHandle); }
    searchDebounceHandle = setTimeout(function () {
      state.filters.search = searchInput.value;
      loadDocuments();
    }, 250);
  });
  teamSelect.addEventListener('change', function () {
    state.filters.team = teamSelect.value;
    loadDocuments();
  });
  typeSelect.addEventListener('change', function () {
    state.filters.documentType = typeSelect.value;
    loadDocuments();
  });
  lifecycleSelect.addEventListener('change', function () {
    state.filters.lifecycleStatus = lifecycleSelect.value;
    loadDocuments();
  });

  addBtn.addEventListener('click', function () {
    ensureAuthorized().then(function () { openCreateModal(); }, function () { /* dialog cancelled */ });
  });

  setActiveView('active'); // sets initial aria state without a redundant deleted-view fetch
  loadDocuments();

  return {
    // Exposed for tests only — not used by production wiring.
    getState: function () { return state; },
    reload: loadDocuments,
    reloadDeleted: loadDeletedDocuments
  };
}

/* Mounted once at app boot (web-view/js/app.js). Re-mounts from scratch on
   CALENDAR_AUTH_CHANGED_EVENT (same pattern issues.js already uses) so
   that if a user authorizes/changes token mid-session, any modal state
   tied to the previous identity is discarded rather than left stale. */
export function initKnowledgeManagement() {
  var mountEl = document.getElementById('knowledgeManagementWorkspace');
  if (!mountEl) { return null; }
  var current = mountKnowledgeManagementWorkspace(mountEl);
  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, function () {
    current = mountKnowledgeManagementWorkspace(mountEl);
  });
  return current;
}
