/* review-summaries.js — Staff Review Summaries workspace (REQ-CAL-REV-001).

   Management Team members conduct review meetings about company staff
   (who may be a non-management staff member or another Management Team
   member) and save private, reviewer-owned summaries. Only the creating
   reviewer can ever view/edit/soft-delete a given summary — mounted once
   per member tab-panel, but note the underlying data is scoped by
   whichever member's Calendar token is currently authorized in THIS
   browser (browser-wide, not per-tab — see calendar/auth.js), never by
   which tab the widget happens to be rendered under.

   Key divergence from calendar/instance.js's apiRequest/leaveApiRequest:
   those attach the Authorization header only on non-GET requests (Task/
   Leave viewing is public). Every Staff Review Summaries request —
   including GET — requires a token, since review content is private.
   reviewSummariesApiRequest() below is therefore its own fetch wrapper,
   not a reuse of apiRequest/leaveApiRequest.

   Self-contained (own fetch wrapper, own DOM building) — mirrors
   staff-data.js's "own STAFF_API_BASE, own helpers" self-containment
   note. Built via createElement/appendChild with direct element
   references (never innerHTML for user-authored text), matching
   calendar/auth.js's convention, so this module stays testable with a
   small hand-rolled DOM stand-in (see review-summaries-test-dom.mjs). */

import { STAFF_REVIEW_SUMMARIES_API_BASE } from './config.js';
import { STAFF_API_BASE } from './staff-data.js';
import { getColomboTodayStr } from './calendar/core.js';
import {
  ensureAuthorized,
  handleUnauthorizedResponse,
  getStoredMemberKey,
  labelForMemberKey,
  CALENDAR_AUTH_CHANGED_EVENT
} from './calendar/auth.js';
import { classifyHttpStatus, mapApiError } from './ui/error-mapper.js';
import { setButtonBusy, renderSkeletonRows, showInlineLoading } from './ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from './ui/form-feedback.js';
import { confirmDestructive } from './ui/dialog.js';
import { showToast } from './ui/toast.js';

var SUMMARY_MAX_LENGTH = 10000;
var STAFF_SEARCH_DEBOUNCE_MS = 300;
var SUMMARY_PREVIEW_LENGTH = 400;

// ── Pure helpers (exported for direct testing — no DOM involved) ───────

/* Builds the GET list query string. Only ever includes params that are
   actually set — an unset reviewed_staff_id/date_from/date_to is simply
   omitted, matching buildStaffQuery's (staff-data.js) existing shape. */
export function buildListQuery(filters) {
  filters = filters || {};
  var params = [];
  if (filters.reviewedStaffId) { params.push('reviewed_staff_id=' + encodeURIComponent(filters.reviewedStaffId)); }
  if (filters.dateFrom) { params.push('date_from=' + encodeURIComponent(filters.dateFrom)); }
  if (filters.dateTo) { params.push('date_to=' + encodeURIComponent(filters.dateTo)); }
  params.push('limit=' + (filters.limit || 50));
  params.push('offset=' + (filters.offset || 0));
  return params.join('&');
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

/* History-card long-summary truncation (2026-08-03 UX fix — production
   feedback: a long summary rendered as one unbroken wall of text with no
   way to collapse it). Word-boundary-aware so a preview never cuts a
   word in half — only backs off to the last space when doing so doesn't
   throw away more than 40% of the preview (a summary with no spaces
   before maxLength, e.g. one extremely long token, still gets a hard cut
   rather than no truncation at all). Pure/exported for direct testing;
   the DOM-facing expand/collapse toggle lives in renderHistoryCard. */
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

/* The single most important piece of this widget's copy: Calendar auth is
   browser-wide, not per-tab (calendar/auth.js), so a Review Summaries block
   mounted under "Suman's" tab does NOT mean the summaries shown there
   belong to Suman — they belong to whichever member's token is currently
   authorized in this browser. This heading is the only on-screen signal of
   that fact, so it must never read as a static "My Review Summaries" with
   no reviewer named — a user sitting on one member's tab while a different
   member's token is stored must be able to see, at a glance, whose data
   they are about to view or edit. `authorizedLabel` is the already-resolved
   display label (labelForMemberKey(getStoredMemberKey())) or null/empty
   when no token is stored yet. */
export function reviewSummariesHeadingText(authorizedLabel) {
  if (!authorizedLabel) { return 'My Review Summaries — not yet authorized on this browser'; }
  return 'My Review Summaries — Authorized as: ' + authorizedLabel;
}

/* Authorization-context fix (2026-08-03 production defect — the observed
   bug: switching sidebar member panels left the same Review Summaries
   workspace/history visible, because nothing ever compared the panel's
   own member against the browser-wide token's member). One pure decision
   function reused by every mounted instance (guardReviewSummaryAccess
   below is the impure wrapper that supplies the two arguments from real
   DOM/storage state):

   - authorizedMemberKey is null (no token stored yet in this browser at
     all) -> 'unauthorized'. Not a cross-member conflict — there is no
     other member's data at risk, since nothing can be fetched without a
     token anyway (reviewSummariesApiRequest's own ensureAuthorized()
     call already gates that). The workspace stays interactive so a
     first-time user can still trigger the normal authorize flow from it.
   - authorizedMemberKey matches this panel's own selectedMemberKey ->
     'allowed'.
   - Any other authorizedMemberKey -> 'blocked'. This is the actual gate:
     a token already verified for a DIFFERENT member than the panel the
     user is currently looking at must never list, create, view, edit, or
     delete anything through that panel. */
export function reviewSummaryAccessDecision(selectedMemberKey, authorizedMemberKey) {
  if (!authorizedMemberKey) { return 'unauthorized'; }
  return authorizedMemberKey === selectedMemberKey ? 'allowed' : 'blocked';
}

/* Approved copy (PHASE 6, REQ-CAL-REV-001 authorization-context fix) —
   kept as one pure function, mirroring calendar/auth.js's
   crossMemberAlertCopy, so the inline blocked-workspace banner and any
   toast reinforcement render identical, approved wording. actingLabel/
   targetLabel are already-resolved display labels (never raw member
   keys). */
export function reviewSummariesCrossMemberCopy(actingLabel, targetLabel) {
  return {
    title: "You can't manage " + targetLabel + "'s Review Summaries.",
    message: 'You are authorized as ' + actingLabel + '. You can only create, view or change ' +
      actingLabel + "'s review summaries."
  };
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
  }, function (err) {
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
      return res.json().catch(function () { return {}; }).then(function () {
        var err = new Error('Request failed.');
        err.code = classifyHttpStatus(res.status);
        err.status = res.status;
        throw err;
      });
    }
    if (res.status === 200 && options.method === 'DELETE') { return res.json(); }
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

/* One mounted instance per member tab-panel. `memberKey` is the tab's
   own member — the "selected sidebar member" in the approved
   authorization-context fix (REQ-CAL-REV-001, 2026-08-03 follow-up).
   The owning reviewer is still always whoever's token is currently
   authorized in this browser (see the module header note) — `memberKey`
   is never treated as authorization proof by itself — but this panel's
   workspace (list/create/view/edit/delete) is now gated on the two
   matching: see reviewSummaryAccessDecision()/guardReviewSummaryAccess()
   below. Previously `memberKey` was captured but never compared against
   anything, which was the defect: every one of the 5 mounted instances
   rendered and fetched identically regardless of which tab it lived in,
   so switching sidebar panels never changed what was visible. */
export function mountReviewSummariesForMember(mountEl, memberKey) {
  if (!mountEl) { return null; }

  var state = {
    selectedStaff: null,
    includeInactive: false,
    dateFrom: '',
    dateTo: '',
    editingId: null,
    staffSearchAbort: null
  };

  mountEl.textContent = '';

  // ── Authorization gate (selected sidebar member vs. authenticated
  //    reviewer) — required before this panel's workspace may list,
  //    create, view, edit, or delete anything. ──────────────────────
  function guardReviewSummaryAccess() {
    return reviewSummaryAccessDecision(memberKey, getStoredMemberKey());
  }

  /* The ONLY path any list/create/view/edit/delete request may travel —
     every call site below (renderHistory, form submit, delete) goes
     through this wrapper instead of calling reviewSummariesApiRequest
     directly, so a blocked panel can never send a request no matter which
     code path triggers it (a real click, a test calling the returned API
     object directly, a stale in-flight retry, etc.). Rejects synchronously
     before ensureAuthorized() or fetch() is ever reached — the stored
     token is never touched. */
  function guardedApiRequest(pathAndQuery, options) {
    if (guardReviewSummaryAccess() === 'blocked') {
      var err = new Error('Cross-member review summary access blocked.');
      err.code = 'cross_member_blocked';
      return Promise.reject(err);
    }
    return reviewSummariesApiRequest(pathAndQuery, options);
  }

  // ── Header ─────────────────────────────────────────────────────
  var headerEl = el('div', 'review-summaries-header');
  var heading = el('h4', 'review-summaries-heading');

  function updateHeading() {
    var authorizedLabel = labelForMemberKey(getStoredMemberKey());
    heading.textContent = reviewSummariesHeadingText(authorizedLabel);
  }
  updateHeading();

  var subheading = el('p', 'review-summaries-subheading');
  subheading.textContent =
    'Private to the Management Team member currently authorized on this browser — ' +
    'not necessarily the member this tab is named after. ' +
    'Other reviewers and the reviewed staff member cannot see these summaries.';
  headerEl.appendChild(heading);
  headerEl.appendChild(subheading);

  // ── Cross-member blocked banner — shown INSTEAD of the staff/form/
  //    history panels whenever guardReviewSummaryAccess() returns
  //    'blocked'. Mirrors the existing cross-member red alert wording
  //    (calendar/auth.js crossMemberAlertCopy) but Review-Summaries-
  //    specific text (reviewSummariesCrossMemberCopy above). ──────────
  var blockedEl = el('div', 'review-summaries-blocked');
  blockedEl.setAttribute('role', 'alert');
  blockedEl.hidden = true;
  var blockedTitleEl = el('p', 'review-summaries-blocked-title');
  var blockedMessageEl = el('p', 'review-summaries-blocked-message');
  blockedEl.appendChild(blockedTitleEl);
  blockedEl.appendChild(blockedMessageEl);
  headerEl.appendChild(blockedEl);

  // ── Reviewed-staff selector ──────────────────────────────────────
  var staffPanel = el('div', 'review-summaries-panel');
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

  /* Shared by the "Change" button below and clearWorkspaceState() (state
     isolation, PHASE 7) — resets the staff-selector UI back to its
     pre-selection state without touching anything else (date filters,
     edit mode). */
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
    state.selectedStaff = staff;
    staffResultsEl.hidden = true;
    staffSearchInput.value = '';
    selectedStaffEl.textContent = '';
    var nameEl = document.createTextNode(staffOptionLabel(staff) + ' ');
    var changeBtn = el('button', 'review-summaries-change-staff');
    changeBtn.type = 'button';
    changeBtn.textContent = 'Change';
    changeBtn.addEventListener('click', function () {
      deselectStaff();
      staffSearchInput.focus();
      updateFormVisibility();
      renderHistory();
    });
    selectedStaffEl.appendChild(nameEl);
    selectedStaffEl.appendChild(changeBtn);
    selectedStaffEl.hidden = false;
    staffSearchInput.hidden = true;
    updateFormVisibility();
    renderHistory();
  }

  var doStaffSearch = debounce(function () {
    var query = staffSearchInput.value.trim();
    if (!query) { staffResultsEl.hidden = true; return; }
    if (state.staffSearchAbort) { state.staffSearchAbort.abort(); }
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    state.staffSearchAbort = controller;
    // Immediate feedback the moment the request is sent — the actual
    // network round-trip can take a couple of seconds, and with nothing
    // shown in that window the search reads as broken/unresponsive
    // rather than "working." showInlineLoading matches the same visual
    // language already used for the history list's own loading state.
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
  var formPanel = el('div', 'review-summaries-panel');
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

  /* The form is only shown once a staff member is chosen — an editable-
     looking form with no context for what it's editing reads as
     confusing/half-finished; a clear placeholder instead makes the
     required order of operations (pick staff, then write) obvious. */
  function updateFormVisibility() {
    var hasStaff = !!state.selectedStaff;
    form.hidden = !hasStaff;
    formPlaceholder.hidden = hasStaff;
  }
  updateFormVisibility();

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

    setButtonBusy(saveBtn, true, { busyLabel: state.editingId ? 'Saving…' : 'Saving…' });

    var request;
    if (state.editingId) {
      request = guardedApiRequest('/' + state.editingId, {
        method: 'PUT',
        body: { meeting_date: dateInput.value, summary_text: validation.trimmed }
      });
    } else {
      request = guardedApiRequest('', {
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
      var mapped = mapApiError(err);
      showToast({ type: 'error', title: mapped.title, message: mapped.message, persistent: mapped.persistent });
    });
  });

  // ── History (datewise) ───────────────────────────────────────────
  var historyPanel = el('div', 'review-summaries-panel');
  var historyPanelTitle = el('h5', 'review-summaries-step-title');
  historyPanelTitle.textContent = '3. Review history';

  var filtersEl = el('div', 'review-summaries-filters');
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

  filtersEl.appendChild(dateFromGroup);
  filtersEl.appendChild(dateToGroup);

  dateFromInput.addEventListener('change', function () { state.dateFrom = dateFromInput.value; renderHistory(); });
  dateToInput.addEventListener('change', function () { state.dateTo = dateToInput.value; renderHistory(); });

  var historyEl = el('div', 'review-summaries-history');
  historyPanel.appendChild(historyPanelTitle);
  historyPanel.appendChild(filtersEl);
  historyPanel.appendChild(historyEl);

  function renderHistoryCard(record) {
    var card = el('div', 'review-summaries-card');
    var head = el('div', 'review-summaries-card-head');
    var dateEl = el('span', 'review-summaries-card-date');
    dateEl.textContent = record.meeting_date;
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

    var deleteBtn = el('button', 'msc-btn msc-btn-danger review-summaries-delete-btn');
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', function () {
      confirmDestructive({
        title: 'Delete this review summary?',
        message: 'This cannot be undone from this workspace. The summary for ' +
          staffOptionLabel(state.selectedStaff) + ' on ' + record.meeting_date + ' will be removed.',
        confirmLabel: 'Delete summary',
        trigger: deleteBtn,
        onConfirm: function () {
          return guardedApiRequest('/' + record.id, { method: 'DELETE' })
            .then(function () {
              showToast({ type: 'success', title: 'Summary deleted', message: '' });
              renderHistory();
              return true;
            })
            .catch(function (err) {
              var mapped = mapApiError(err);
              showToast({ type: 'error', title: mapped.title, message: mapped.message, persistent: mapped.persistent });
              return false;
            });
        }
      });
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    return card;
  }

  function renderHistory() {
    updateHeading();
    // Gate re-checked on every render (not just at mount) — a staff
    // selection or filter change could otherwise slip past a mismatch
    // introduced since mount (e.g. a token change mid-session). Blocked
    // panels never reach the fetch below; guardedApiRequest would refuse
    // it anyway, but returning here also avoids showing a stale
    // "Loading…" state that would never resolve into real data.
    if (guardReviewSummaryAccess() === 'blocked') { return; }
    historyEl.textContent = '';
    if (!state.selectedStaff) {
      var promptEl = el('div', 'review-summaries-empty');
      promptEl.textContent = 'Select a staff member to see their review history.';
      historyEl.appendChild(promptEl);
      return;
    }
    showInlineLoading(historyEl, 'Loading review history…');
    var query = buildListQuery({
      reviewedStaffId: state.selectedStaff.id,
      dateFrom: state.dateFrom,
      dateTo: state.dateTo
    });
    guardedApiRequest('?' + query).then(function (body) {
      updateHeading(); // the ensureAuthorized() call inside the request above may have just resolved a first-time authorization or a token change — refresh the label now that it's current.
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
      // auth_required (401): handleUnauthorizedResponse() already fired
      // CALENDAR_AUTH_CHANGED_EVENT synchronously (calendar/auth.js),
      // which reevaluateAccess()'s listener (below) already used to
      // clear this panel's state and re-render the correct
      // authorized/blocked/unauthorized view — rendering the generic
      // error box here on top of that would stomp the just-recovered UI
      // with a stale "Request failed" message.
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

  // ── State isolation (PHASE 7, REQ-CAL-REV-001 authorization-context
  //    fix) — every field a stale selection/edit/filter could leak
  //    through, reset in one place so both a sidebar-panel switch and a
  //    token change clear the same complete set. ─────────────────────
  function clearWorkspaceState() {
    if (state.staffSearchAbort) { state.staffSearchAbort.abort(); state.staffSearchAbort = null; }
    deselectStaff();
    state.dateFrom = '';
    state.dateTo = '';
    dateFromInput.value = '';
    dateToInput.value = '';
    exitEditMode();
    updateFormVisibility();
    historyEl.textContent = '';
  }

  /* Shows/hides the blocked banner vs. the staff/form/history panels per
     guardReviewSummaryAccess(). Returns true when blocked (callers use
     this to skip renderHistory()'s fetch). Does not itself clear state —
     callers that need a full reset call clearWorkspaceState() first (see
     reevaluateAccess() below); renderHistory()'s own per-render check
     deliberately leaves already-loaded state alone (re-rendering mid-
     session should not wipe what's on screen only to redraw it). */
  function renderAccessGate() {
    var decision = guardReviewSummaryAccess();
    if (decision === 'blocked') {
      var copy = reviewSummariesCrossMemberCopy(
        labelForMemberKey(getStoredMemberKey()), labelForMemberKey(memberKey)
      );
      blockedTitleEl.textContent = copy.title;
      blockedMessageEl.textContent = copy.message;
      blockedEl.hidden = false;
      staffPanel.hidden = true;
      formPanel.hidden = true;
      historyPanel.hidden = true;
      return true;
    }
    blockedEl.hidden = true;
    staffPanel.hidden = false;
    formPanel.hidden = false;
    historyPanel.hidden = false;
    return false;
  }

  /* The single reactive entry point for anything that can change WHICH
     reviewer/panel-pairing is now in effect — a sidebar-panel switch
     (navigation.js's 'msc:close-toolbar-popovers', fired on every
     activatePanel() call) or a token change (calendar/auth.js's
     CALENDAR_AUTH_CHANGED_EVENT, fired on a successful authorize/change-
     token verify AND on a 401-triggered clear). Always clears state
     first (PHASE 7 — "on sidebar-member change"/"on token change" both
     require a full clear), then re-renders the gate, then — only when
     now allowed — reloads history for whatever's left selected (nothing,
     immediately after a clear, so this never re-fetches stale data; it
     simply leaves the "select a staff member" placeholder showing). */
  function reevaluateAccess() {
    clearWorkspaceState();
    updateHeading();
    var blocked = renderAccessGate();
    if (!blocked) { renderHistory(); }
  }

  document.addEventListener('msc:close-toolbar-popovers', reevaluateAccess);
  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, reevaluateAccess);

  mountEl.appendChild(headerEl);
  mountEl.appendChild(staffPanel);
  mountEl.appendChild(formPanel);
  mountEl.appendChild(historyPanel);

  renderAccessGate();
  renderHistory();

  return {
    selectStaff: selectStaff,
    renderHistory: renderHistory,
    updateHeading: updateHeading,
    reevaluateAccess: reevaluateAccess,
    accessDecision: guardReviewSummaryAccess,
    state: state
  };
}

/* Called once at app boot (web-view/js/app.js). Mounts one instance per
   .review-summaries-instance element (one per member tab-panel, added in
   web-view/index.html) — idempotent, safe to call once. Not itself unit
   tested (same documented coverage boundary as
   calendar/instance.js/initAllScheduleCalendars — see calendar/
   auth.test.mjs's header note); mountReviewSummariesForMember above is
   the exported, directly-testable unit. */
export function initReviewSummaries() {
  var mounts = document.querySelectorAll('.review-summaries-instance');
  mounts.forEach(function (mountEl) {
    mountReviewSummariesForMember(mountEl, mountEl.getAttribute('data-member-key'));
  });
}
