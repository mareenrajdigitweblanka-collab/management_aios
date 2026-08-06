/* review-summaries.js — Staff Review Summaries dedicated workspace
   (REQ-CAL-REV-TAB-002, 2026-08-06 — replaces REQ-CAL-REV-001's 5
   per-member-panel mounts with one independent workspace).

   Mounted exactly once, inside the new independent #tab-review-summaries
   panel (web-view/index.html) — never inside any Management Team member
   panel. There is no per-tab `memberKey` any more: the current reviewer is
   derived ONLY from the browser-wide Calendar token
   (calendar/auth.js's getStoredMemberKey()) — never from a reviewer
   filter selection, the selected reviewed employee, or the request body.

   Two access states (replacing the old 5-mount own/read_only/unauthorized
   trio, which existed to compare "this panel's member" against the
   authenticated member — a comparison that no longer applies once there is
   only one, member-independent panel):
     - 'unauthorized' — no token stored in this browser. Nothing is
       readable or writable until authorized.
     - 'authorized'   — a valid token is stored. Every authenticated
       Management Team member may search staff, read every reviewer's
       active summaries for a selected employee, and create their own
       summaries. Edit is decided PER RECORD (isOwnedRecord + the
       backend-derived record.can_edit below), not per panel — only the
       record's own reviewer_member_key/can_edit controls whether Edit
       renders for that one card. Delete does not exist anywhere in this
       UI any more (REQ-CAL-REV-LOCK-004, 2026-08-06 — no user may delete
       a Review Summary; see renderHistoryCard below).

   REQ-CAL-REV-LOCK-004 (2026-08-06) same-day edit lock: the backend is
   authoritative — every record returned by list/detail already carries a
   server-derived `can_edit` boolean (true only for the record's own
   creator, and only through 23:59:59 Asia/Colombo on its own created_at
   date). This module never recomputes that decision from a browser clock;
   it only reads record.can_edit to decide whether to show the Edit
   button, and every PUT still relies on the backend's own 409
   review_summary_edit_locked rejection as the real enforcement (see
   exitEditModeOnLockedResponse in the form submit handler below).

   Reviewer display name/role are resolved client-side via
   member-registry.js's MEMBER_REGISTRY, from each record's own
   reviewer_member_key — the API returns that key unchanged and nothing
   else; no reviewer_display_label field exists on the response (see
   backend/routers/staff_review_summaries.py/schemas.py, deliberately
   unmodified — REQ-CAL-REV-TAB-002 technical design §4/§6.3).

   Same fetch-wrapper rationale as REQ-CAL-REV-001: every Staff Review
   Summaries request — including GET — requires a token, so
   reviewSummariesApiRequest() below is its own wrapper, never a reuse of
   calendar/instance.js's apiRequest/leaveApiRequest (which attach the
   Authorization header only on non-GET requests).

   Built via createElement/appendChild with direct element references
   (never innerHTML for user-authored text) — same convention as
   calendar/auth.js — so this module stays testable with the existing
   hand-rolled DOM stand-in (review-summaries-test-dom.mjs). */

import { STAFF_REVIEW_SUMMARIES_API_BASE } from './config.js';
import { STAFF_API_BASE } from './staff-data.js';
import { getColomboTodayStr } from './calendar/core.js';
import {
  ensureAuthorized,
  handleUnauthorizedResponse,
  getStoredMemberKey,
  CALENDAR_AUTH_CHANGED_EVENT
} from './calendar/auth.js';
import { resolveMember } from './member-registry.js';
import { classifyHttpStatus, mapApiError } from './ui/error-mapper.js';
import { setButtonBusy, showInlineLoading } from './ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from './ui/form-feedback.js';
import { showToast } from './ui/toast.js';

var SUMMARY_MAX_LENGTH = 10000;
var STAFF_SEARCH_DEBOUNCE_MS = 300;
var SUMMARY_PREVIEW_LENGTH = 400;

/* Fixed display order for the reviewer filter dropdown — matches
   backend/config.py's VALID_MEMBER_KEYS order (the canonical Management
   Team member ordering used throughout this repo's sidebar/config). */
var REVIEWER_FILTER_ORDER = ['mayurika', 'suman', 'arun', 'rajiv', 'paraparan'];

// ── Pure helpers (exported for direct testing — no DOM involved) ───────

/* Builds the GET list query string. reviewerMemberKey and
   includeAllReviewers are mutually exclusive by construction here — if
   includeAllReviewers is truthy, reviewer_member_key is never appended,
   regardless of what reviewerMemberKey was also passed (callers below
   never pass both together, but this function enforces the rule itself
   rather than trusting every call site). */
export function buildListQuery(filters) {
  filters = filters || {};
  var params = [];
  if (filters.includeAllReviewers) {
    params.push('include_all_reviewers=true');
  } else if (filters.reviewerMemberKey) {
    params.push('reviewer_member_key=' + encodeURIComponent(filters.reviewerMemberKey));
  }
  if (filters.reviewedStaffId) { params.push('reviewed_staff_id=' + encodeURIComponent(filters.reviewedStaffId)); }
  if (filters.dateFrom) { params.push('date_from=' + encodeURIComponent(filters.dateFrom)); }
  if (filters.dateTo) { params.push('date_to=' + encodeURIComponent(filters.dateTo)); }
  params.push('limit=' + (filters.limit || 50));
  params.push('offset=' + (filters.offset || 0));
  return params.join('&');
}

/* PDF export query string (REQ-CAL-REV-PDF-003) — same reviewer-scope
   mutual-exclusivity rule as buildListQuery, but never appends limit/offset
   (the export is deliberately unpaginated — "the complete active Review
   Summary history," never one page of it). Never includes a token,
   reviewer display name, employee display name, or summary text — only
   reviewed_staff_id (a UUID), an optional reviewer_member_key, and two
   optional dates. */
export function buildExportQuery(filters) {
  filters = filters || {};
  var params = [];
  if (filters.includeAllReviewers) {
    params.push('include_all_reviewers=true');
  } else if (filters.reviewerMemberKey) {
    params.push('reviewer_member_key=' + encodeURIComponent(filters.reviewerMemberKey));
  }
  if (filters.reviewedStaffId) { params.push('reviewed_staff_id=' + encodeURIComponent(filters.reviewedStaffId)); }
  if (filters.dateFrom) { params.push('date_from=' + encodeURIComponent(filters.dateFrom)); }
  if (filters.dateTo) { params.push('date_to=' + encodeURIComponent(filters.dateTo)); }
  return params.join('&');
}

/* True when both dates are set and dateFrom is after dateTo — the same
   invalid-range condition the backend itself rejects with 422 (date_from
   must not be after date_to). ISO YYYY-MM-DD strings compare correctly
   with a plain string comparison. */
export function isInvalidDateRange(dateFrom, dateTo) {
  return !!(dateFrom && dateTo && dateFrom > dateTo);
}

/* Trims and validates summary_text client-side, mirroring the backend's
   exact rule (StaffReviewSummaryCreate/Update in backend/schemas.py) so
   an invalid submission never reaches the network. Returns
   {valid, trimmed, error} — error is a plain-language message, or null. */
export function validateSummaryText(raw) {
  var trimmed = String(raw == null ? '' : raw).trim();
  if (!trimmed) {
    return { valid: false, trimmed: trimmed, error: 'Enter a summary before saving.' };
  }
  if (trimmed.length > SUMMARY_MAX_LENGTH) {
    return {
      valid: false, trimmed: trimmed,
      error: 'Summary must be ' + SUMMARY_MAX_LENGTH.toLocaleString() + ' characters or fewer.'
    };
  }
  return { valid: true, trimmed: trimmed, error: null };
}

/* "N / 10,000" character counter text, plus a boolean the caller uses to
   apply a warning style as the limit approaches. */
export function summaryCounterText(raw) {
  var length = String(raw == null ? '' : raw).length;
  return length.toLocaleString() + ' / ' + SUMMARY_MAX_LENGTH.toLocaleString();
}

export function isSummaryCounterWarning(raw) {
  var length = String(raw == null ? '' : raw).length;
  return length > SUMMARY_MAX_LENGTH * 0.95;
}

/* History-card long-summary truncation — word-boundary-aware so a preview
   never cuts a word in half — only backs off to the last space when doing
   so doesn't throw away more than 40% of the preview. Pure/exported for
   direct testing; the DOM-facing expand/collapse toggle lives in
   renderHistoryCard. */
export function summaryPreview(text, maxLength) {
  maxLength = maxLength || SUMMARY_PREVIEW_LENGTH;
  var full = String(text == null ? '' : text);
  if (full.length <= maxLength) {
    return { truncated: false, preview: full };
  }
  var cut = full.slice(0, maxLength);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.6) { cut = cut.slice(0, lastSpace); }
  return { truncated: true, preview: cut + '…' };
}

/* Reviewed-staff option label — full_name primary, calling_name as a
   parenthetical secondary label when it differs. Never employee_number. */
export function staffOptionLabel(staff) {
  if (!staff) { return ''; }
  var name = staff.full_name || staff.calling_name || 'Unnamed staff record';
  if (staff.calling_name && staff.calling_name !== staff.full_name) {
    return name + ' (' + staff.calling_name + ')';
  }
  return name;
}

/* REQ-CAL-REV-PDF-003-FIX-02 — PDF export filename handling. The server
   (backend/review_summary_pdf_export.py) sends an already-sanitized
   filename in Content-Disposition; this client-side sanitization is a
   defense-in-depth basename/control-character guard, not a duplicate of
   the server's transliteration rules. */
var UNSAFE_FALLBACK_CHARS_RE = /[\\/:*?"<>|\r\n\t\x00-\x1f]/g;
var REPEATED_UNDERSCORE_RE = /_{2,}/g;
var PDF_SUFFIX_RE = /\.pdf$/i;

function sanitizeFallbackNameComponent(raw) {
  var text = String(raw == null ? '' : raw);
  text = text.replace(/\.\./g, '');
  text = text.replace(/\\/g, '_').replace(/\//g, '_');
  text = text.replace(UNSAFE_FALLBACK_CHARS_RE, '_');
  text = text.replace(/['"]/g, '');
  text = text.replace(/ /g, '_');
  text = text.replace(PDF_SUFFIX_RE, '');
  text = text.replace(REPEATED_UNDERSCORE_RE, '_');
  text = text.replace(/^[_.]+|[_.]+$/g, '');
  return text || 'Employee';
}

export function buildFallbackReviewSummaryPdfFilename(employeeDisplayName, dateStr) {
  return 'Review_Summary_' + sanitizeFallbackNameComponent(employeeDisplayName) + '_' + dateStr + '.pdf';
}

function sanitizeDispositionFilenameValue(value) {
  if (!value) { return ''; }
  // Defends against a path-separator-bearing header value by taking only
  // the basename, then strips control characters and stray quotes.
  var text = String(value).split(/[\\/]/).pop();
  text = text.replace(/[\r\n\t\x00-\x1f"]/g, '');
  return text.trim();
}

function ensurePdfExtension(name) {
  return PDF_SUFFIX_RE.test(name) ? name : name + '.pdf';
}

/* Prefers the RFC 5987/6266 filename*=UTF-8''<percent-encoded> form (set
   by build_content_disposition_header in backend/review_summary_pdf_
   export.py), falls back to the legacy filename="..." form, then to a
   generated fallback only when the header is genuinely unusable. */
export function parseReviewSummaryPdfFilename(dispositionHeader, fallbackEmployeeName, fallbackDateStr) {
  var fallback = buildFallbackReviewSummaryPdfFilename(fallbackEmployeeName, fallbackDateStr);
  var header = dispositionHeader || '';

  var starMatch = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (starMatch) {
    var rawStar = starMatch[1].trim().replace(/^["']|["']$/g, '');
    try {
      var decoded = decodeURIComponent(rawStar);
      var cleanedStar = sanitizeDispositionFilenameValue(decoded);
      if (cleanedStar) { return ensurePdfExtension(cleanedStar); }
    } catch (e) {
      // Malformed percent-encoding — fall through to filename= or fallback.
    }
  }

  var quotedMatch = /filename\s*=\s*"([^"]*)"/i.exec(header);
  if (quotedMatch) {
    var cleanedQuoted = sanitizeDispositionFilenameValue(quotedMatch[1]);
    if (cleanedQuoted) { return ensurePdfExtension(cleanedQuoted); }
  }

  var bareMatch = /filename\s*=\s*([^;]+)/i.exec(header);
  if (bareMatch) {
    var cleanedBare = sanitizeDispositionFilenameValue(bareMatch[1].trim());
    if (cleanedBare) { return ensurePdfExtension(cleanedBare); }
  }

  return fallback;
}

/* Same shape as staffOptionLabel, but reading a history record's own
   reviewed_staff_full_name/reviewed_staff_calling_name (live-joined by the
   backend at read time, backend/routers/staff_review_summaries.py
   _to_out()) rather than a staff-search result object — used for each
   card's "Reviewed employee" field. */
export function reviewedEmployeeLabel(record) {
  if (!record) { return ''; }
  var name = record.reviewed_staff_full_name || record.reviewed_staff_calling_name || 'Unknown staff record';
  if (
    record.reviewed_staff_calling_name &&
    record.reviewed_staff_calling_name !== record.reviewed_staff_full_name
  ) {
    return name + ' (' + record.reviewed_staff_calling_name + ')';
  }
  return name;
}

/* Two access states only (corrects the old 5-mount own/read_only/
   unauthorized model — there is no more "selected reviewer panel" to
   compare against, since this workspace is not mounted per member). A
   valid token is either present ('authorized') or it is not
   ('unauthorized'); per-record ownership (isOwnedRecord below) decides
   Edit/Delete visibility separately, on every rendered card. */
export function workspaceAccessDecision(authenticatedMemberKey) {
  return authenticatedMemberKey ? 'authorized' : 'unauthorized';
}

/* Per-record ownership check — the reviewer identity source of truth
   (technical design §5.0): compares ONLY the record's own
   reviewer_member_key against the currently authenticated token's member
   key. Never derived from a reviewer filter selection, the selected
   employee, or any other signal. */
export function isOwnedRecord(record, authenticatedMemberKey) {
  return !!(record && authenticatedMemberKey && record.reviewer_member_key === authenticatedMemberKey);
}

/* "Authorized as: Mayurika — HR" — entry is a resolveMember() result
   ({displayName, role}); null/undefined renders the not-yet-authorized
   copy so this function is always safe to call. */
export function authorizedAsLabelText(entry) {
  if (!entry) { return 'Not yet authorized on this browser.'; }
  return 'Authorized as: ' + entry.displayName + ' — ' + entry.role;
}

// ── Fetch wrapper — every request (including GET) is authenticated ─────

function reviewSummariesApiRequest(pathAndQuery, options) {
  options = options || {};
  return ensureAuthorized().then(function (token) {
    var headers = { 'Authorization': 'Bearer ' + token };
    if (options.body) { headers['Content-Type'] = 'application/json'; }
    return fetch(STAFF_REVIEW_SUMMARIES_API_BASE + pathAndQuery, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    });
  }, function () {
    // ensureAuthorized() rejected (dialog cancelled) — surface as
    // auth_cancelled, never send the request at all.
    var e = new Error('Authorization required.');
    e.code = 'auth_cancelled';
    throw e;
  }).then(function (res) {
    if (res.status === 401) {
      handleUnauthorizedResponse();
      var err = new Error('Authorization expired.');
      err.code = 'auth_required';
      throw err;
    }
    if (!res.ok) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        var err;
        // REQ-CAL-REV-LOCK-004 (2026-08-06) — same convention
        // calendar/instance.js's apiRequest already uses for
        // outcome_locked/outcome_recorded_immutable: read the backend's
        // own typed `error` field when present, rather than only ever
        // falling back to a generic status-code classification.
        if (body && (body.error === 'review_summary_edit_locked' || body.error === 'review_summary_delete_disabled')) {
          err = new Error(body.message || 'Request failed.');
          err.code = body.error;
        } else {
          err = new Error('Request failed.');
          err.code = classifyHttpStatus(res.status);
        }
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

function fetchStaffOptions(search, includeInactive, signal) {
  var params = ['limit=20', 'search=' + encodeURIComponent(search || '')];
  if (!includeInactive) { params.push('staff_status=Active'); }
  return fetch(STAFF_API_BASE + '?' + params.join('&'), signal ? { signal: signal } : undefined)
    .then(function (res) {
      if (!res.ok) { throw new Error('Staff lookup failed.'); }
      return res.json();
    })
    .then(function (body) { return body.records || []; });
}

// ── DOM building ─────────────────────────────────────────────────────

function debounce(fn, waitMs) {
  var timer = null;
  return function () {
    var args = arguments;
    var ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () { fn.apply(ctx, args); }, waitMs);
  };
}

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  return node;
}

/* Renders summary text as safe plain text — textContent only, never
   innerHTML, with white-space: pre-wrap (review-summaries.css) so real
   newline/paragraph characters are visually preserved without ever
   inserting <br> or any other markup. HTML/script-like text therefore
   always displays literally and can never execute. */
function renderSummaryText(text) {
  var node = el('div', 'review-summary-text');
  node.textContent = text;
  return node;
}

/* Mounted exactly once (initReviewSummaries below), inside the new
   independent #tab-review-summaries panel — never per member. */
export function mountReviewSummariesWorkspace(mountEl) {
  if (!mountEl) { return null; }

  var state = {
    selectedStaff: null,
    includeInactive: false,
    reviewerFilter: '', // '' = All reviewers (include_all_reviewers=true)
    dateFrom: '',
    dateTo: '',
    editingId: null,
    staffSearchAbort: null,
    // Stale-request guard — bumped on every new history fetch AND on
    // every reset, so a slow in-flight request that resolves after a
    // newer one has superseded it never overwrites the current view.
    historyRequestId: 0,
    // PDF export in-flight guard (REQ-CAL-REV-PDF-003) — a plain-boolean
    // duplicate-click guard, same pattern as calendar/instance.js's own
    // exportInFlight for the weekly-schedule .xlsx download.
    exportInFlight: false
  };

  mountEl.textContent = '';

  function currentAccess() {
    return workspaceAccessDecision(getStoredMemberKey());
  }

  /* The ONLY path any request (read or write) may travel — every fetch
     call site below goes through this wrapper, so nothing is ever sent
     while unauthorized, regardless of which code path triggers it.
     Per-record write ownership (Edit/Delete) is enforced by button
     visibility (renderHistoryCard) plus the backend's own non-disclosing
     404 (technical design §5.0/§8) — this wrapper only gates on "is a
     token present at all," matching the two-state access model above. */
  function guardedRequest(pathAndQuery, options) {
    if (currentAccess() === 'unauthorized') {
      var err = new Error('Authorization required.');
      err.code = 'unauthorized_blocked';
      return Promise.reject(err);
    }
    return reviewSummariesApiRequest(pathAndQuery, options);
  }

  // ── Header ─────────────────────────────────────────────────────
  var headerEl = el('div', 'review-summaries-header');

  var authorizedAsEl = el('p', 'review-summaries-authorized-as');
  authorizedAsEl.hidden = true;

  function updateAuthorizedAsLabel() {
    var memberKey = getStoredMemberKey();
    if (!memberKey) { authorizedAsEl.hidden = true; return; }
    authorizedAsEl.textContent = authorizedAsLabelText(resolveMember(memberKey));
    authorizedAsEl.hidden = false;
  }
  updateAuthorizedAsLabel();

  var subheading = el('p', 'review-summaries-subheading');
  subheading.textContent =
    'Readable by every authenticated Management Team member. Only the reviewer who ' +
    'created a summary can edit or delete it. The reviewed staff member has no access.';
  headerEl.appendChild(authorizedAsEl);
  headerEl.appendChild(subheading);

  // ── Unauthorized prompt — shown INSTEAD of the staff/form/history
  //    panels whenever currentAccess() returns 'unauthorized'. The nav
  //    item itself always stays visible/clickable (index.html); this is
  //    the in-panel gate. ──────────────────────────────────────────────
  var unauthorizedEl = el('div', 'review-summaries-unauthorized');
  unauthorizedEl.setAttribute('role', 'alert');
  unauthorizedEl.hidden = true;
  var unauthorizedMessageEl = el('p', 'review-summaries-unauthorized-message');
  unauthorizedMessageEl.textContent =
    'Authorization required to view Review Summaries. Enter a Management Team member token to continue.';
  var authorizeBtn = el('button', 'msc-btn msc-btn-primary review-summaries-authorize-btn');
  authorizeBtn.type = 'button';
  authorizeBtn.textContent = 'Authorize this browser';
  authorizeBtn.addEventListener('click', function () {
    ensureAuthorized().catch(function () { /* dialog cancelled — stays unauthorized */ });
  });
  unauthorizedEl.appendChild(unauthorizedMessageEl);
  unauthorizedEl.appendChild(authorizeBtn);
  headerEl.appendChild(unauthorizedEl);

  // ── Reviewed-staff selector ──────────────────────────────────────
  var staffPanel = el('div', 'review-summaries-panel review-summaries-staff-panel');
  var staffPanelTitle = el('h5', 'review-summaries-step-title');
  staffPanelTitle.textContent = '1. Select staff member';
  var staffField = el('div', 'review-summaries-field');
  var staffSearchWrap = el('div', 'review-summaries-search-wrap');
  var staffSearchInput = el('input', 'review-summaries-staff-search');
  staffSearchInput.type = 'search';
  staffSearchInput.placeholder = 'Search staff by name…';
  staffSearchInput.setAttribute('aria-label', 'Search reviewed staff member');
  var staffResultsEl = el('div', 'review-summaries-staff-results');
  staffResultsEl.hidden = true;
  staffSearchWrap.appendChild(staffSearchInput);
  staffSearchWrap.appendChild(staffResultsEl);
  var selectedStaffEl = el('div', 'review-summaries-selected-staff');
  selectedStaffEl.hidden = true;

  var includeInactiveLabel = el('label', 'review-summaries-toggle');
  var includeInactiveCheckbox = el('input', 'review-summaries-toggle-input');
  includeInactiveCheckbox.type = 'checkbox';
  var includeInactiveTrack = el('span', 'review-summaries-toggle-track');
  var includeInactiveText = el('span', 'review-summaries-toggle-text');
  includeInactiveText.textContent = 'Include inactive staff';
  includeInactiveLabel.appendChild(includeInactiveCheckbox);
  includeInactiveLabel.appendChild(includeInactiveTrack);
  includeInactiveLabel.appendChild(includeInactiveText);

  staffField.appendChild(staffSearchWrap);
  staffField.appendChild(selectedStaffEl);
  staffField.appendChild(includeInactiveLabel);
  staffPanel.appendChild(staffPanelTitle);
  staffPanel.appendChild(staffField);

  function renderStaffResults(records) {
    staffResultsEl.textContent = '';
    if (!records.length) {
      var empty = el('div', 'review-summaries-staff-result-empty');
      empty.textContent = 'No matching staff found.';
      staffResultsEl.appendChild(empty);
      staffResultsEl.hidden = false;
      return;
    }
    records.forEach(function (staff) {
      var btn = el('button', 'review-summaries-staff-result');
      btn.type = 'button';
      btn.textContent = staffOptionLabel(staff);
      btn.addEventListener('click', function () {
        selectStaff(staff);
      });
      staffResultsEl.appendChild(btn);
    });
    staffResultsEl.hidden = false;
  }

  /* Shared by resetWorkspaceState() (the single central reset, defined
     below) — resets the staff-selector UI back to its pre-selection
     state. Never called on its own to "partially" clear state; every
     caller that needs to deselect goes through resetWorkspaceState(). */
  function deselectStaff() {
    state.selectedStaff = null;
    selectedStaffEl.hidden = true;
    selectedStaffEl.textContent = '';
    staffSearchInput.value = '';
    staffSearchInput.hidden = false;
    staffResultsEl.hidden = true;
    staffResultsEl.textContent = '';
  }

  function selectStaff(staff) {
    // A fresh employee always starts from the exact same clean baseline —
    // reviewer filter back to "All reviewers", date filters cleared, no
    // inherited history/edit/draft state from whichever employee (if any)
    // was previously selected (Phase 3 correction, 2026-08-06).
    resetWorkspaceState();
    state.selectedStaff = staff;
    staffResultsEl.hidden = true;
    staffSearchInput.value = '';
    selectedStaffEl.textContent = '';
    var nameEl = document.createTextNode(staffOptionLabel(staff) + ' ');
    var changeBtn = el('button', 'review-summaries-change-staff');
    changeBtn.type = 'button';
    changeBtn.textContent = 'Change';
    changeBtn.addEventListener('click', function () {
      resetWorkspaceState();
      staffSearchInput.focus();
      renderHistory();
    });
    selectedStaffEl.appendChild(nameEl);
    selectedStaffEl.appendChild(changeBtn);
    selectedStaffEl.hidden = false;
    staffSearchInput.hidden = true;
    updateFormVisibility();
    updateExportButtonState();
    renderHistory();
  }

  var doStaffSearch = debounce(function () {
    var query = staffSearchInput.value.trim();
    if (!query) { staffResultsEl.hidden = true; return; }
    if (state.staffSearchAbort) { state.staffSearchAbort.abort(); }
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    state.staffSearchAbort = controller;
    showInlineLoading(staffResultsEl, 'Searching…');
    staffResultsEl.hidden = false;
    var requestToken = controller;
    fetchStaffOptions(query, state.includeInactive, controller && controller.signal)
      .then(function (records) {
        if (requestToken !== state.staffSearchAbort) { return; } // a newer search superseded this one
        renderStaffResults(records);
      })
      .catch(function (err) {
        if (err && err.name === 'AbortError') { return; }
        if (requestToken !== state.staffSearchAbort) { return; }
        staffResultsEl.textContent = '';
        var e = el('div', 'review-summaries-staff-result-empty');
        e.textContent = 'Could not load staff records. Check your connection.';
        staffResultsEl.appendChild(e);
        staffResultsEl.hidden = false;
      });
  }, STAFF_SEARCH_DEBOUNCE_MS);

  staffSearchInput.addEventListener('input', doStaffSearch);
  includeInactiveCheckbox.addEventListener('change', function () {
    state.includeInactive = includeInactiveCheckbox.checked;
    if (staffSearchInput.value.trim()) { doStaffSearch(); }
  });

  // ── Create / edit form ───────────────────────────────────────────
  var formPanel = el('div', 'review-summaries-panel review-summaries-form-panel');
  var formPanelTitle = el('h5', 'review-summaries-step-title');
  formPanelTitle.textContent = '2. Write summary';
  var formPlaceholder = el('p', 'review-summaries-form-placeholder');
  formPlaceholder.textContent = 'Select a staff member above to write a summary.';

  var form = el('form', 'review-summaries-form');
  form.setAttribute('novalidate', 'novalidate');
  form.hidden = true;

  var dateFieldGroup = el('div', 'review-summaries-field-group');
  var dateLabel = el('label', 'review-summaries-label');
  dateLabel.textContent = 'Meeting date';
  var dateInput = el('input', 'review-summaries-date-input');
  dateInput.type = 'date';
  dateInput.value = getColomboTodayStr();
  dateFieldGroup.appendChild(dateLabel);
  dateFieldGroup.appendChild(dateInput);

  var summaryFieldGroup = el('div', 'review-summaries-field-group');
  var summaryLabelRow = el('div', 'review-summaries-summary-label-row');
  var summaryLabel = el('label', 'review-summaries-label');
  summaryLabel.textContent = 'Summary';
  var counterEl = el('span', 'review-summaries-counter');
  counterEl.textContent = summaryCounterText('');
  summaryLabelRow.appendChild(summaryLabel);
  summaryLabelRow.appendChild(counterEl);
  var summaryTextarea = el('textarea', 'review-summaries-textarea');
  summaryTextarea.setAttribute('maxlength', String(SUMMARY_MAX_LENGTH));
  summaryTextarea.setAttribute('placeholder', 'What was discussed? Preserve paragraphs and line breaks as needed.');
  summaryTextarea.rows = 6;
  summaryFieldGroup.appendChild(summaryLabelRow);
  summaryFieldGroup.appendChild(summaryTextarea);

  summaryTextarea.addEventListener('input', function () {
    counterEl.textContent = summaryCounterText(summaryTextarea.value);
    counterEl.classList.toggle('review-summaries-counter--warning', isSummaryCounterWarning(summaryTextarea.value));
    if (summaryTextarea.value.trim()) { clearFieldError(summaryTextarea); }
  });

  var formActions = el('div', 'review-summaries-form-actions');
  var saveBtn = el('button', 'msc-btn msc-btn-primary review-summaries-save-btn');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save Summary';

  var cancelEditBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-cancel-edit-btn');
  cancelEditBtn.type = 'button';
  cancelEditBtn.textContent = 'Cancel edit';
  cancelEditBtn.hidden = true;
  cancelEditBtn.addEventListener('click', function () { exitEditMode(); });
  formActions.appendChild(saveBtn);
  formActions.appendChild(cancelEditBtn);

  form.appendChild(dateFieldGroup);
  form.appendChild(summaryFieldGroup);
  form.appendChild(formActions);

  formPanel.appendChild(formPanelTitle);
  formPanel.appendChild(formPlaceholder);
  formPanel.appendChild(form);

  /* The form is only shown once a staff member is chosen. */
  function updateFormVisibility() {
    var hasStaff = !!state.selectedStaff;
    form.hidden = !hasStaff;
    formPlaceholder.hidden = hasStaff;
  }
  updateFormVisibility();

  /* Edit mode / unsaved-draft clearing — called on: Cancel edit, employee
     change, reviewer-filter change, date-filter change, token change, and
     leaving the dedicated tab (technical design §7). Never silently
     merges a stale draft into a new context. */
  function exitEditMode() {
    state.editingId = null;
    saveBtn.textContent = 'Save Summary';
    cancelEditBtn.hidden = true;
    summaryTextarea.value = '';
    dateInput.value = getColomboTodayStr();
    counterEl.textContent = summaryCounterText('');
    clearFormErrors(form);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearFormErrors(form);

    if (!state.selectedStaff) {
      showToast({ type: 'error', title: 'Select a staff member', message: 'Choose a reviewed staff member before saving.', persistent: false });
      return;
    }
    if (!dateInput.value) {
      setFieldError(dateInput, 'Choose a meeting date.');
      focusFirstInvalid(form);
      return;
    }
    var validation = validateSummaryText(summaryTextarea.value);
    if (!validation.valid) {
      setFieldError(summaryTextarea, validation.error);
      focusFirstInvalid(form);
      return;
    }

    setButtonBusy(saveBtn, true, { busyLabel: 'Saving…' });

    var request;
    if (state.editingId) {
      request = guardedRequest('/' + state.editingId, {
        method: 'PUT',
        body: { meeting_date: dateInput.value, summary_text: validation.trimmed }
      });
    } else {
      // reviewed_staff_id, meeting_date, summary_text only — the browser
      // never sends reviewer_member_key (technical design §5.3/§2.9); the
      // create schema has no such field, so ownership is always
      // server-derived from the token regardless of request contents.
      request = guardedRequest('', {
        method: 'POST',
        body: {
          reviewed_staff_id: state.selectedStaff.id,
          meeting_date: dateInput.value,
          summary_text: validation.trimmed
        }
      });
    }

    request.then(function () {
      setButtonBusy(saveBtn, false);
      showToast({
        type: 'success',
        title: state.editingId ? 'Summary updated' : 'Summary saved',
        message: staffOptionLabel(state.selectedStaff) + ' — ' + dateInput.value
      });
      exitEditMode();
      renderHistory();
    }).catch(function (err) {
      setButtonBusy(saveBtn, false);
      // REQ-CAL-REV-LOCK-004 (2026-08-06) — the creation-day edit window
      // can close between when this card was last rendered and when the
      // user actually submits (e.g. the popup was left open across the
      // Colombo midnight boundary, same class of case
      // calendar/instance.js's Task Outcome flow already documents for
      // outcome_locked). Exit edit mode and re-fetch so the card
      // re-renders with its now-current, backend-authoritative can_edit
      // state — never leaves the form stuck open against a record that
      // can no longer be saved.
      if (err && err.code === 'review_summary_edit_locked') {
        exitEditMode();
        renderHistory();
      }
      var mapped = mapApiError(err);
      showToast({ type: 'error', title: mapped.title, message: mapped.message, persistent: mapped.persistent });
    });
  });

  // ── Filters + history ────────────────────────────────────────────
  var historyPanel = el('div', 'review-summaries-panel review-summaries-history-panel');
  var historyPanelTitle = el('h5', 'review-summaries-step-title');
  historyPanelTitle.textContent = '3. Review history';

  var filtersEl = el('div', 'review-summaries-filters');

  var reviewerFilterGroup = el('div', 'review-summaries-filter-field');
  var reviewerFilterLabel = el('label', 'review-summaries-label');
  reviewerFilterLabel.textContent = 'Reviewer';
  var reviewerFilterSelect = el('select', 'review-summaries-reviewer-select');
  var allReviewersOption = el('option');
  allReviewersOption.value = '';
  allReviewersOption.textContent = 'All reviewers';
  reviewerFilterSelect.appendChild(allReviewersOption);
  REVIEWER_FILTER_ORDER.forEach(function (memberKey) {
    var entry = resolveMember(memberKey);
    var option = el('option');
    option.value = memberKey;
    option.textContent = entry.displayName;
    reviewerFilterSelect.appendChild(option);
  });
  reviewerFilterGroup.appendChild(reviewerFilterLabel);
  reviewerFilterGroup.appendChild(reviewerFilterSelect);

  var dateFromGroup = el('div', 'review-summaries-filter-field');
  var dateFromLabel = el('label', 'review-summaries-label');
  dateFromLabel.textContent = 'From';
  var dateFromInput = el('input', 'review-summaries-date-from');
  dateFromInput.type = 'date';
  dateFromGroup.appendChild(dateFromLabel);
  dateFromGroup.appendChild(dateFromInput);

  var dateToGroup = el('div', 'review-summaries-filter-field');
  var dateToLabel = el('label', 'review-summaries-label');
  dateToLabel.textContent = 'To';
  var dateToInput = el('input', 'review-summaries-date-to');
  dateToInput.type = 'date';
  dateToGroup.appendChild(dateToLabel);
  dateToGroup.appendChild(dateToInput);

  filtersEl.appendChild(reviewerFilterGroup);
  filtersEl.appendChild(dateFromGroup);
  filtersEl.appendChild(dateToGroup);

  /* Reviewer-filter / date-filter change (technical design §7) — clears
     stale detail/edit state (a card being edited under the old filter set
     may no longer even be in view) and re-fetches. */
  reviewerFilterSelect.addEventListener('change', function () {
    state.reviewerFilter = reviewerFilterSelect.value;
    exitEditMode();
    updateExportButtonState();
    renderHistory();
  });
  dateFromInput.addEventListener('change', function () {
    state.dateFrom = dateFromInput.value;
    exitEditMode();
    updateExportButtonState();
    renderHistory();
  });
  dateToInput.addEventListener('change', function () {
    state.dateTo = dateToInput.value;
    exitEditMode();
    updateExportButtonState();
    renderHistory();
  });

  // ── PDF export (REQ-CAL-REV-PDF-003) — one page-level button near the
  //    Review History filters, never one button per record. ──────────────
  var exportActionsEl = el('div', 'review-summaries-export-actions');
  var exportBtn = el('button', 'msc-btn msc-btn-secondary review-summaries-export-btn');
  exportBtn.type = 'button';
  exportBtn.textContent = 'Download PDF';

  function updateExportButtonState() {
    var hasStaff = !!state.selectedStaff;
    var hasToken = currentAccess() !== 'unauthorized';
    var invalidRange = isInvalidDateRange(state.dateFrom, state.dateTo);
    exportBtn.disabled = !hasStaff || !hasToken || invalidRange || state.exportInFlight;
  }

  /* PDF Blob download — deliberately its own fetch, not
     reviewSummariesApiRequest() (which unconditionally calls res.json(),
     wrong for a binary PDF body). Reuses the same ensureAuthorized()/
     handleUnauthorizedResponse() authentication primitives so a missing/
     invalid/expired token behaves identically to every other request this
     workspace makes. Never sends the token, reviewer display name,
     employee display name, or summary text in the URL — only
     reviewed_staff_id, the current reviewer scope, and the current dates
     (buildExportQuery). */
  function downloadReviewSummariesPdf() {
    if (state.exportInFlight || !state.selectedStaff) { return; }
    if (currentAccess() === 'unauthorized') { return; }
    if (isInvalidDateRange(state.dateFrom, state.dateTo)) { return; }

    state.exportInFlight = true;
    updateExportButtonState();

    var query = buildExportQuery({
      includeAllReviewers: !state.reviewerFilter,
      reviewerMemberKey: state.reviewerFilter || null,
      reviewedStaffId: state.selectedStaff.id,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo
    });

    return ensureAuthorized().then(function (token) {
      return fetch(STAFF_REVIEW_SUMMARIES_API_BASE + '/export/pdf?' + query, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token },
        cache: 'no-store'
      });
    }, function () {
      var e = new Error('Authorization required.');
      e.code = 'auth_cancelled';
      throw e;
    }).then(function (res) {
      if (res.status === 401) {
        handleUnauthorizedResponse();
        var authErr = new Error('Authorization expired.');
        authErr.code = 'auth_required';
        throw authErr;
      }
      if (res.status === 404) {
        // Empty-result 404 (requirement §5.10) — never a Blob/download for
        // this response; selected employee and filters are left exactly
        // as they were, so the user can adjust and retry.
        var emptyErr = new Error('No review summaries match the selected filters.');
        emptyErr.code = 'export_empty';
        throw emptyErr;
      }
      if (!res.ok) {
        var failErr = new Error('Export failed.');
        failErr.code = classifyHttpStatus(res.status);
        failErr.status = res.status;
        throw failErr;
      }
      var disposition = res.headers.get('Content-Disposition') || '';
      var filename = parseReviewSummaryPdfFilename(
        disposition,
        staffOptionLabel(state.selectedStaff),
        getColomboTodayStr()
      );
      return res.blob().then(function (blob) { return { blob: blob, filename: filename }; });
    }).then(function (result) {
      var blobUrl = URL.createObjectURL(result.blob);
      var link = document.createElement('a');
      link.href = blobUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast({ type: 'success', title: 'PDF downloaded', message: result.filename });
    }).catch(function (err) {
      if (err && err.code === 'auth_cancelled') { return; }
      if (err && err.code === 'auth_required') { return; } // reactToAuthChange() already handles the gate
      if (err && err.code === 'export_empty') {
        showToast({ type: 'error', title: 'No matching records', message: 'No review summaries match the selected filters.', persistent: false });
        return;
      }
      var mapped = mapApiError(err);
      showToast({ type: 'error', title: mapped.title, message: mapped.message, persistent: mapped.persistent });
    }).then(function () {
      state.exportInFlight = false;
      updateExportButtonState();
    });
  }

  exportBtn.addEventListener('click', downloadReviewSummariesPdf);
  exportActionsEl.appendChild(exportBtn);
  updateExportButtonState();

  var historyEl = el('div', 'review-summaries-history');
  historyPanel.appendChild(historyPanelTitle);
  historyPanel.appendChild(filtersEl);
  historyPanel.appendChild(exportActionsEl);
  historyPanel.appendChild(historyEl);

  function renderHistoryCard(record) {
    var authenticatedMemberKey = getStoredMemberKey();
    var reviewerEntry = resolveMember(record.reviewer_member_key);
    var card = el('div', 'review-summaries-card');

    var employeeEl = el('div', 'review-summaries-card-employee');
    employeeEl.textContent = 'Reviewed employee: ' + reviewedEmployeeLabel(record);
    card.appendChild(employeeEl);

    var reviewerRow = el('div', 'review-summaries-card-reviewer');
    var reviewedByEl = el('span', 'review-summaries-card-reviewed-by');
    reviewedByEl.textContent = 'Reviewed by: ' + reviewerEntry.displayName;
    var reviewerRoleEl = el('span', 'review-summaries-card-reviewer-role');
    reviewerRoleEl.textContent = 'Reviewer role: ' + reviewerEntry.role;
    reviewerRow.appendChild(reviewedByEl);
    reviewerRow.appendChild(reviewerRoleEl);
    card.appendChild(reviewerRow);

    var head = el('div', 'review-summaries-card-head');
    var dateEl = el('span', 'review-summaries-card-date');
    dateEl.textContent = 'Meeting date: ' + record.meeting_date;
    head.appendChild(dateEl);
    if (record.updated_at && record.created_at && record.updated_at !== record.created_at) {
      var editedEl = el('span', 'review-summaries-card-edited');
      editedEl.textContent = 'Edited';
      head.appendChild(editedEl);
    }
    card.appendChild(head);

    var preview = summaryPreview(record.summary_text);
    var textNode = renderSummaryText(preview.truncated ? preview.preview : record.summary_text);
    card.appendChild(textNode);

    if (preview.truncated) {
      var expanded = false;
      var toggleTextBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-toggle-text-btn');
      toggleTextBtn.type = 'button';
      toggleTextBtn.textContent = 'Show more';
      toggleTextBtn.setAttribute('aria-expanded', 'false');
      toggleTextBtn.addEventListener('click', function () {
        expanded = !expanded;
        // textContent only — never innerHTML — matching the module-wide
        // safe-text rule (renderSummaryText's own header note).
        textNode.textContent = expanded ? record.summary_text : preview.preview;
        toggleTextBtn.textContent = expanded ? 'Show less' : 'Show more';
        toggleTextBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
      card.appendChild(toggleTextBtn);
    }

    /* Edit-window status + Edit button render ONLY for a card owned by
       the currently authenticated reviewer (isOwnedRecord) — evaluated
       per card, on every render, never once per panel (technical design
       §5.3/§2.8). A non-owned card still renders fully (read-only) — it
       simply gets no status line and no mutation controls, exactly as
       before (REQ-CAL-REV-LOCK-004's "OTHER REVIEWER: no Edit control;
       read-only card" — unchanged from the prior shared-read behavior).

       There is no Delete control anywhere in this workspace any more
       (REQ-CAL-REV-LOCK-004, 2026-08-06) — no user may delete a Review
       Summary; the backend's DELETE route only ever rejects with 409
       now, so no frontend code path is left that could still call it. */
    if (isOwnedRecord(record, authenticatedMemberKey)) {
      var statusEl = el('p', 'review-summaries-card-edit-status');
      if (record.can_edit) {
        statusEl.textContent = 'Editable until 11:59 PM today.';
        card.appendChild(statusEl);

        var actions = el('div', 'review-summaries-card-actions');
        var editBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-edit-btn');
        editBtn.type = 'button';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', function () {
          state.editingId = record.id;
          dateInput.value = record.meeting_date;
          summaryTextarea.value = record.summary_text;
          counterEl.textContent = summaryCounterText(record.summary_text);
          saveBtn.textContent = 'Save Changes';
          cancelEditBtn.hidden = false;
          summaryTextarea.focus();
        });
        actions.appendChild(editBtn);
        card.appendChild(actions);
      } else {
        statusEl.textContent = 'Editing period ended. This review summary is now read-only.';
        statusEl.classList.add('review-summaries-card-edit-locked');
        card.appendChild(statusEl);
      }
    }
    return card;
  }

  function renderHistory() {
    updateAuthorizedAsLabel();
    // 'unauthorized' never fetches — nothing is readable until authorized
    // (decision #16/#18-19). Returning here also avoids showing a stale
    // "Loading…" state that would never resolve into real data.
    if (currentAccess() === 'unauthorized') { return; }
    historyEl.textContent = '';
    if (!state.selectedStaff) {
      var promptEl = el('div', 'review-summaries-empty');
      promptEl.textContent = 'Select a staff member to see their review history.';
      historyEl.appendChild(promptEl);
      return;
    }
    showInlineLoading(historyEl, 'Loading review history…');
    var query = buildListQuery({
      includeAllReviewers: !state.reviewerFilter,
      reviewerMemberKey: state.reviewerFilter || null,
      reviewedStaffId: state.selectedStaff.id,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo
    });
    // Stale-request guard — this request's own id is captured now; if a
    // newer renderHistory() call has bumped state.historyRequestId by the
    // time this resolves, the result is discarded rather than rendered.
    state.historyRequestId += 1;
    var requestId = state.historyRequestId;
    guardedRequest('?' + query).then(function (body) {
      if (requestId !== state.historyRequestId) { return; }
      updateAuthorizedAsLabel(); // the ensureAuthorized() call inside the request above may have just resolved a first-time authorization — refresh the label now that it's current.
      historyEl.textContent = '';
      if (!body.records.length) {
        var empty = el('div', 'review-summaries-empty');
        empty.textContent = 'No review summaries yet for this staff member.';
        historyEl.appendChild(empty);
        return;
      }
      body.records.forEach(function (record) {
        historyEl.appendChild(renderHistoryCard(record));
      });
    }).catch(function (err) {
      if (requestId !== state.historyRequestId) { return; }
      // auth_required (401): handleUnauthorizedResponse() already fired
      // CALENDAR_AUTH_CHANGED_EVENT synchronously, which this module's own
      // listener (below) already used to update the access gate —
      // rendering the generic error box here on top of that would stomp
      // the just-recovered UI with a stale "Request failed" message.
      if (err && err.code === 'auth_required') { return; }
      historyEl.textContent = '';
      var mapped = mapApiError(err);
      var errorEl = el('div', 'review-summaries-error');
      errorEl.setAttribute('role', 'alert');
      errorEl.textContent = mapped.title + ' — ' + mapped.message;
      var retryBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-retry-btn');
      retryBtn.type = 'button';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', renderHistory);
      errorEl.appendChild(document.createElement('br'));
      errorEl.appendChild(retryBtn);
      historyEl.appendChild(errorEl);
    });
  }

  /* Shows/hides the unauthorized prompt vs. the staff/form/history panels
     per currentAccess(). Returns the resolved mode so callers can decide
     whether to fetch. Does not itself clear state. */
  function renderAccessGate() {
    var mode = currentAccess();
    if (mode === 'unauthorized') {
      unauthorizedEl.hidden = false;
      staffPanel.hidden = true;
      formPanel.hidden = true;
      historyPanel.hidden = true;
      return mode;
    }
    unauthorizedEl.hidden = true;
    staffPanel.hidden = false;
    formPanel.hidden = false;
    historyPanel.hidden = false;
    return mode;
  }

  /* THE single, reusable state reset (Phase 3 correction, 2026-08-06 —
     replaces the prior clearWorkspaceState()/clearEmployeeDependentState()/
     onLeaveOrPanelSwitch() split, which left two paths — a 401 and
     leaving the tab — only partially clearing state). Every trigger that
     must reset this workspace goes through this ONE function: a fresh
     employee selection, a genuine token change, a 401/authorization
     failure, and leaving the dedicated tab. Clears:
       - the selected employee (deselectStaff — UUID + display state);
       - loaded history (historyEl content);
       - edit/draft/delete-related state (exitEditMode — editingId, draft
         summary/date text, field errors; any card DOM holding expanded-
         summary/delete-confirmation state is itself destroyed the next
         time history re-renders, since cards are always rebuilt from
         scratch, never patched in place);
       - the reviewer filter, reset to '' ("All reviewers");
       - both date filters;
       - any pending staff-search request (aborted, not just abandoned);
       - the stale-response guard (historyRequestId bumped), so a
         slower, already-in-flight request from before this reset can
         never repopulate the just-cleared state once it resolves.
     Deliberately never touches the stored Calendar token itself — token
     clearing is always handleUnauthorizedResponse()'s job (calendar/
     auth.js), invoked only by reviewSummariesApiRequest() on a real 401
     (never by this function, and never for a 404 or an owner-only
     mutation denial, which are unrelated error classes entirely). Does
     not itself decide what to render next — every call site below still
     calls renderHistory()/renderAccessGate() explicitly afterward, since
     that decision differs by context (e.g. an auth-change call site also
     needs to re-run the access gate; a plain employee-selection call site
     does not). */
  function resetWorkspaceState() {
    if (state.staffSearchAbort) { state.staffSearchAbort.abort(); state.staffSearchAbort = null; }
    state.historyRequestId += 1;
    deselectStaff();
    state.reviewerFilter = '';
    reviewerFilterSelect.value = '';
    state.dateFrom = '';
    state.dateTo = '';
    dateFromInput.value = '';
    dateToInput.value = '';
    exitEditMode();
    updateFormVisibility();
    updateExportButtonState();
    historyEl.textContent = '';
  }

  /* CALENDAR_AUTH_CHANGED_EVENT fires for two situations — a 401 mid-
     session (handleUnauthorizedResponse clears the stored token to null
     BEFORE dispatching) and a successful first-time authorize/Change
     Token (a NEW valid token is stored BEFORE dispatching). Both are now
     treated identically (Phase 4/6 correction, 2026-08-06): a full
     resetWorkspaceState() every time, regardless of which situation this
     is — an authorization failure must clear the workspace exactly like a
     genuine identity change, not preserve the previous employee selection
     for later. */
  function reactToAuthChange() {
    resetWorkspaceState();
    updateAuthorizedAsLabel();
    var mode = renderAccessGate();
    if (mode !== 'unauthorized') { renderHistory(); }
  }

  /* navigation.js's 'msc:close-toolbar-popovers' fires on every panel
     activation (including activating this one) — the "leaving the
     dedicated tab" signal (technical design §7, as corrected 2026-08-06).
     A full resetWorkspaceState() so returning to this tab later always
     starts from a clean baseline: no employee selected, no history
     visible, reviewer filter back to "All reviewers", date filters
     cleared — never the previous visit's stale selection. Does not touch
     the stored Calendar token — ordinary navigation is not an
     authorization event. */
  function onLeaveOrPanelSwitch() {
    resetWorkspaceState();
    renderHistory();
  }

  document.addEventListener('msc:close-toolbar-popovers', onLeaveOrPanelSwitch);
  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, reactToAuthChange);

  mountEl.appendChild(headerEl);
  mountEl.appendChild(staffPanel);
  mountEl.appendChild(formPanel);
  mountEl.appendChild(historyPanel);

  renderAccessGate();
  renderHistory();

  return {
    selectStaff: selectStaff,
    renderHistory: renderHistory,
    updateAuthorizedAsLabel: updateAuthorizedAsLabel,
    reactToAuthChange: reactToAuthChange,
    onLeaveOrPanelSwitch: onLeaveOrPanelSwitch,
    resetWorkspaceState: resetWorkspaceState,
    accessDecision: currentAccess,
    setReviewerFilter: function (value) {
      state.reviewerFilter = value;
      reviewerFilterSelect.value = value;
      exitEditMode();
      updateExportButtonState();
      renderHistory();
    },
    downloadReviewSummariesPdf: downloadReviewSummariesPdf,
    exportButtonEl: exportBtn,
    updateExportButtonState: updateExportButtonState,
    state: state
  };
}

/* Called once at app boot (web-view/js/app.js). Mounts exactly one
   instance into #reviewSummariesWorkspace (web-view/index.html, inside
   the independent #tab-review-summaries panel) — idempotent, safe to call
   once. Not itself unit tested (same documented coverage boundary as
   calendar/instance.js/initAllScheduleCalendars — see calendar/
   auth.test.mjs's header note); mountReviewSummariesWorkspace above is
   the exported, directly-testable unit. */
export function initReviewSummaries() {
  var mountEl = document.getElementById('reviewSummariesWorkspace');
  mountReviewSummariesWorkspace(mountEl);
}
