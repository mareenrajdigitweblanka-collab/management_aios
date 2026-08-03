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
import { ensureAuthorized, handleUnauthorizedResponse } from './calendar/auth.js';
import { classifyHttpStatus, mapApiError } from './ui/error-mapper.js';
import { setButtonBusy, renderSkeletonRows, showInlineLoading } from './ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from './ui/form-feedback.js';
import { confirmDestructive } from './ui/dialog.js';
import { showToast } from './ui/toast.js';

var SUMMARY_MAX_LENGTH = 10000;
var STAFF_SEARCH_DEBOUNCE_MS = 300;

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
   own member — used ONLY for the heading copy fallback and DOM id
   namespacing, never as an authorization identity (the actual owning
   reviewer is always whoever's token is currently authorized in this
   browser — see the module header note). */
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

  var heading = el('h4', 'review-summaries-heading');
  heading.textContent = 'My Review Summaries';

  var subheading = el('p', 'review-summaries-subheading');
  subheading.textContent =
    'Private to the Management Team member currently authorized on this browser. ' +
    'Other reviewers and the reviewed staff member cannot see these summaries.';

  // ── Reviewed-staff selector ──────────────────────────────────────
  var staffField = el('div', 'review-summaries-field');
  var staffLabel = el('label', 'review-summaries-label');
  staffLabel.textContent = 'Reviewed staff member';
  var staffSearchInput = el('input', 'review-summaries-staff-search');
  staffSearchInput.type = 'search';
  staffSearchInput.placeholder = 'Search staff by name…';
  staffSearchInput.setAttribute('aria-label', 'Search reviewed staff member');
  var staffResultsEl = el('div', 'review-summaries-staff-results');
  staffResultsEl.hidden = true;
  var selectedStaffEl = el('div', 'review-summaries-selected-staff');
  selectedStaffEl.hidden = true;
  var includeInactiveLabel = el('label', 'review-summaries-include-inactive');
  var includeInactiveCheckbox = el('input');
  includeInactiveCheckbox.type = 'checkbox';
  includeInactiveLabel.appendChild(includeInactiveCheckbox);
  includeInactiveLabel.appendChild(document.createTextNode(' Include inactive staff'));

  staffField.appendChild(staffLabel);
  staffField.appendChild(staffSearchInput);
  staffField.appendChild(staffResultsEl);
  staffField.appendChild(selectedStaffEl);
  staffField.appendChild(includeInactiveLabel);

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
      state.selectedStaff = null;
      selectedStaffEl.hidden = true;
      staffSearchInput.hidden = false;
      staffSearchInput.focus();
      renderHistory();
    });
    selectedStaffEl.appendChild(nameEl);
    selectedStaffEl.appendChild(changeBtn);
    selectedStaffEl.hidden = false;
    staffSearchInput.hidden = true;
    renderHistory();
  }

  var doStaffSearch = debounce(function () {
    var query = staffSearchInput.value.trim();
    if (!query) { staffResultsEl.hidden = true; return; }
    if (state.staffSearchAbort) { state.staffSearchAbort.abort(); }
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    state.staffSearchAbort = controller;
    fetchStaffOptions(query, state.includeInactive, controller && controller.signal)
      .then(renderStaffResults)
      .catch(function (err) {
        if (err && err.name === 'AbortError') { return; }
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
  var form = el('form', 'review-summaries-form');
  form.setAttribute('novalidate', 'novalidate');

  var dateLabel = el('label', 'review-summaries-label');
  dateLabel.textContent = 'Meeting date';
  var dateInput = el('input', 'review-summaries-date-input');
  dateInput.type = 'date';
  dateInput.value = getColomboTodayStr();

  var summaryLabel = el('label', 'review-summaries-label');
  summaryLabel.textContent = 'Summary';
  var summaryTextarea = el('textarea', 'review-summaries-textarea');
  summaryTextarea.setAttribute('maxlength', String(SUMMARY_MAX_LENGTH));
  summaryTextarea.rows = 6;
  var counterEl = el('div', 'review-summaries-counter');
  counterEl.textContent = summaryCounterText('');

  summaryTextarea.addEventListener('input', function () {
    counterEl.textContent = summaryCounterText(summaryTextarea.value);
    counterEl.classList.toggle('review-summaries-counter--warning', isSummaryCounterWarning(summaryTextarea.value));
    if (summaryTextarea.value.trim()) { clearFieldError(summaryTextarea); }
  });

  var saveBtn = el('button', 'msc-btn msc-btn-primary review-summaries-save-btn');
  saveBtn.type = 'submit';
  saveBtn.textContent = 'Save Summary';

  var cancelEditBtn = el('button', 'msc-btn msc-btn-ghost review-summaries-cancel-edit-btn');
  cancelEditBtn.type = 'button';
  cancelEditBtn.textContent = 'Cancel edit';
  cancelEditBtn.hidden = true;
  cancelEditBtn.addEventListener('click', function () { exitEditMode(); });

  form.appendChild(dateLabel);
  form.appendChild(dateInput);
  form.appendChild(summaryLabel);
  form.appendChild(summaryTextarea);
  form.appendChild(counterEl);
  form.appendChild(saveBtn);
  form.appendChild(cancelEditBtn);

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
      request = reviewSummariesApiRequest('/' + state.editingId, {
        method: 'PUT',
        body: { meeting_date: dateInput.value, summary_text: validation.trimmed }
      });
    } else {
      request = reviewSummariesApiRequest('', {
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
  var filtersEl = el('div', 'review-summaries-filters');
  var dateFromLabel = el('label', 'review-summaries-label');
  dateFromLabel.textContent = 'From';
  var dateFromInput = el('input', 'review-summaries-date-from');
  dateFromInput.type = 'date';
  var dateToLabel = el('label', 'review-summaries-label');
  dateToLabel.textContent = 'To';
  var dateToInput = el('input', 'review-summaries-date-to');
  dateToInput.type = 'date';
  filtersEl.appendChild(dateFromLabel);
  filtersEl.appendChild(dateFromInput);
  filtersEl.appendChild(dateToLabel);
  filtersEl.appendChild(dateToInput);

  dateFromInput.addEventListener('change', function () { state.dateFrom = dateFromInput.value; renderHistory(); });
  dateToInput.addEventListener('change', function () { state.dateTo = dateToInput.value; renderHistory(); });

  var historyEl = el('div', 'review-summaries-history');

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
    card.appendChild(renderSummaryText(record.summary_text));

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
          return reviewSummariesApiRequest('/' + record.id, { method: 'DELETE' })
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
    reviewSummariesApiRequest('?' + query).then(function (body) {
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

  mountEl.appendChild(heading);
  mountEl.appendChild(subheading);
  mountEl.appendChild(staffField);
  mountEl.appendChild(form);
  mountEl.appendChild(filtersEl);
  mountEl.appendChild(historyEl);

  renderHistory();

  return {
    selectStaff: selectStaff,
    renderHistory: renderHistory,
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
