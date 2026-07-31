/* web-view/js/calendar/auth.js — Calendar member-token authorization
   (2026-07-29 approved requirement).

   Browser-wide, not per-calendar-tab: one token authorizes one member for
   this whole browser profile, reused automatically across all five
   calendar instances' create/update/delete/outcome/bulk/clear-testing-
   data/leave requests (web-view/js/calendar/instance.js apiRequest/
   leaveApiRequest). Viewing any member's Calendar and downloading reports
   never requires a token — only mutations do.

   Persistence: one versioned localStorage key
   (management_aios_calendar_auth_v1) storing exactly
   {version, token, verifiedMemberKey, verifiedAt}. `token` is the ONLY
   field ever sent to the backend (as `Authorization: Bearer <token>` on
   every mutation, added by instance.js). verifiedMemberKey/verifiedAt are
   DISPLAY-ONLY — used solely to render the "Authorized as" indicator —
   and are NEVER treated as authorization proof: the backend re-derives
   the acting member from the token itself on every request
   (backend/routers/calendar_auth.py), so a hand-edited verifiedMemberKey
   in localStorage can change only what label this browser shows, never
   what a request is actually authorized to do.

   Same accessible-dialog foundation ui/dialog.js already uses (focus
   trap, Escape-to-cancel, backdrop-click-to-cancel, scroll lock, busy-
   button treatment) — this is a second, purpose-built dialog (token text
   input, inline verify error, shared-browser warning) rather than a reuse
   of confirmDestructive(), which has no input field. */

import { trapTab, returnFocus } from '../ui/popup.js';
import { setButtonBusy } from '../ui/loading.js';
import { lockBodyScroll, unlockBodyScroll } from '../ui/scroll-lock.js';
import { CALENDAR_AUTH_API_BASE } from '../config.js';

var STORAGE_KEY = 'management_aios_calendar_auth_v1';
var STORAGE_VERSION = 1;

// ── Storage ────────────────────────────────────────────────────────────

function readStoredAuth() {
  var raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return null; // storage disabled/unavailable — treat exactly like "no token"
  }
  if (!raw) { return null; }
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null; // corrupted value — never throw, just treat as "no token"
  }
  if (
    !parsed || parsed.version !== STORAGE_VERSION ||
    typeof parsed.token !== 'string' || !parsed.token
  ) {
    return null;
  }
  return parsed;
}

function writeStoredAuth(token, memberKey) {
  var record = {
    version: STORAGE_VERSION,
    token: token,
    verifiedMemberKey: memberKey,
    verifiedAt: new Date().toISOString()
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (e) {
    /* Storage unavailable/full — the current page's in-memory state
       (this module's closures) still lets THIS session's mutations work;
       only cross-reload persistence is lost, matching "no worse off than
       without localStorage at all". */
  }
}

export function clearStoredAuth() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* Nothing further to do — if removeItem itself is unavailable, the
       stored value (if any) is already inert for this session, since
       readStoredAuth() above would fail identically on its own read. */
  }
}

export function getStoredToken() {
  var stored = readStoredAuth();
  return stored ? stored.token : null;
}

/* Display-only. Never call this to decide whether a request is
   authorized — only getStoredToken()'s value is ever sent to the
   backend, and only the backend's own verification of that token decides
   authorization. */
export function getStoredMemberKey() {
  var stored = readStoredAuth();
  return stored ? stored.verifiedMemberKey : null;
}

/* Resolves a member_key to its existing on-page display label by reading
   the same data-member-label attribute already present on that member's
   .msc-instance container (web-view/index.html) — avoids maintaining a
   second, parallel label map in this module that could drift from the
   backend's own MEMBER_LABELS (backend/config.py). Falls back to the raw
   key if the DOM lookup ever fails (e.g. in a test harness with no
   calendar markup mounted). */
function labelForMemberKey(memberKey) {
  if (!memberKey) { return null; }
  var el = document.querySelector('.msc-instance[data-member-key="' + memberKey + '"]');
  var label = el && el.getAttribute('data-member-label');
  return label || memberKey;
}

// ── Verification request (raw fetch — deliberately never routed through
//    instance.js's apiRequest/leaveApiRequest, which themselves call
//    ensureAuthorized() below; doing so here would be a circular wait). ──

function verifyToken(token) {
  return fetch(CALENDAR_AUTH_API_BASE + '/verify', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(function (res) {
    if (!res.ok) {
      var err = new Error(res.status === 401 ? 'Token not recognized.' : 'Verification failed.');
      err.status = res.status;
      throw err;
    }
    return res.json();
  });
}

// ── Authorize-this-browser dialog (lazy singleton, same pattern as
//    ui/dialog.js's ensureDialog()) ──────────────────────────────────────

var dialogApi = null;

function ensureAuthorizeDialog() {
  if (dialogApi) { return dialogApi; }

  var overlay = document.createElement('div');
  overlay.className = 'msc-modal-overlay ui-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'calendar-auth-title');
  overlay.setAttribute(
    'aria-describedby',
    'calendar-auth-message calendar-auth-warning calendar-auth-error'
  );

  /* Built via createElement/appendChild (not one innerHTML string +
     querySelector afterward, unlike ui/dialog.js's static, never-changing
     confirmation dialog) — every element this module needs to read or
     write later is already a direct reference here, which also keeps
     this module testable with a plain createElement-based DOM stand-in
     that never needs to parse HTML (see auth.test.mjs). */
  var modalEl = document.createElement('div');
  modalEl.className = 'msc-modal ui-dialog calendar-auth-dialog';

  var headEl = document.createElement('div');
  headEl.className = 'msc-modal-form-head ui-dialog-head';
  var titleEl = document.createElement('h4');
  titleEl.id = 'calendar-auth-title';
  titleEl.textContent = 'Authorize this browser';
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'msc-modal-close calendar-auth-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '×';
  headEl.appendChild(titleEl);
  headEl.appendChild(closeBtn);

  var bodyEl = document.createElement('div');
  bodyEl.className = 'ui-dialog-body';

  var messageEl = document.createElement('p');
  messageEl.id = 'calendar-auth-message';
  messageEl.className = 'ui-dialog-message';
  messageEl.textContent =
    'Enter your Calendar member token to create, update, or delete Tasks and Leave. ' +
    'You normally only need to do this once on this browser.';

  var labelEl = document.createElement('label');
  labelEl.setAttribute('for', 'calendar-auth-token-input');
  labelEl.className = 'calendar-auth-label';
  labelEl.textContent = 'Member token';

  var inputEl = document.createElement('input');
  inputEl.id = 'calendar-auth-token-input';
  inputEl.name = 'calendar-auth-token';
  inputEl.type = 'password';
  inputEl.autocomplete = 'off';
  inputEl.setAttribute('autocapitalize', 'off');
  inputEl.setAttribute('spellcheck', 'false');
  inputEl.className = 'calendar-auth-input';

  var errorEl = document.createElement('p');
  errorEl.id = 'calendar-auth-error';
  errorEl.className = 'calendar-auth-error';
  errorEl.setAttribute('role', 'alert');
  errorEl.hidden = true;

  var warningEl = document.createElement('p');
  warningEl.id = 'calendar-auth-warning';
  warningEl.className = 'calendar-auth-warning';
  warningEl.textContent =
    'Authorize only on your own company browser profile. Anyone using this browser profile ' +
    'may be able to use the saved Calendar authority.';

  bodyEl.appendChild(messageEl);
  bodyEl.appendChild(labelEl);
  bodyEl.appendChild(inputEl);
  bodyEl.appendChild(errorEl);
  bodyEl.appendChild(warningEl);

  var actionsEl = document.createElement('div');
  actionsEl.className = 'msc-form-actions ui-dialog-actions';
  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'msc-btn msc-btn-ghost calendar-auth-cancel';
  cancelBtn.textContent = 'Cancel';
  var submitBtn = document.createElement('button');
  submitBtn.type = 'button';
  submitBtn.className = 'msc-btn msc-btn-primary calendar-auth-submit';
  submitBtn.textContent = 'Authorize';
  actionsEl.appendChild(cancelBtn);
  actionsEl.appendChild(submitBtn);

  modalEl.appendChild(headEl);
  modalEl.appendChild(bodyEl);
  modalEl.appendChild(actionsEl);
  overlay.appendChild(modalEl);
  document.body.appendChild(overlay);

  var activeResolve = null;
  var activeReject = null;
  var triggerEl = null;
  var submitting = false;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function close() {
    overlay.classList.remove('show');
    overlay.removeEventListener('keydown', onKeydown);
    unlockBodyScroll();
    returnFocus(triggerEl);
    triggerEl = null;
    inputEl.value = '';
    clearError();
    setButtonBusy(submitBtn, false);
    submitting = false;
  }

  function settleResolve(token) {
    var resolve = activeResolve;
    activeResolve = null;
    activeReject = null;
    close();
    if (resolve) { resolve(token); }
  }

  function settleReject() {
    var reject = activeReject;
    activeResolve = null;
    activeReject = null;
    close();
    if (reject) {
      var err = new Error('Calendar authorization was cancelled.');
      err.code = 'auth_cancelled';
      reject(err);
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      if (!submitting) { settleReject(); }
    } else if (e.key === 'Tab') {
      trapTab(modalEl, e);
    } else if (e.key === 'Enter' && document.activeElement === inputEl) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    if (submitting) { return; } // replay guard — ignore a second Enter/click while a verify request is in flight
    var token = inputEl.value.trim();
    if (!token) {
      showError('Enter your Calendar member token.');
      return;
    }
    submitting = true;
    clearError();
    setButtonBusy(submitBtn, true, { busyLabel: 'Verifying…' });
    cancelBtn.disabled = true;
    verifyToken(token).then(function (body) {
      writeStoredAuth(token, body.memberKey);
      renderIndicator();
      submitting = false;
      settleResolve(token);
    }).catch(function (err) {
      submitting = false;
      setButtonBusy(submitBtn, false);
      cancelBtn.disabled = false;
      showError(
        err && err.status === 401
          ? 'Token not recognized. Check the token and try again.'
          : 'Could not reach the server. Check your connection and try again.'
      );
      inputEl.focus();
    });
  }

  cancelBtn.addEventListener('click', function () { if (!submitting) { settleReject(); } });
  closeBtn.addEventListener('click', function () { if (!submitting) { settleReject(); } });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay && !submitting) { settleReject(); }
  });
  submitBtn.addEventListener('click', submit);

  dialogApi = {
    open: function () {
      return new Promise(function (resolve, reject) {
        activeResolve = resolve;
        activeReject = reject;
        triggerEl = document.activeElement;
        overlay.classList.add('show');
        lockBodyScroll();
        overlay.addEventListener('keydown', onKeydown);
        inputEl.focus();
      });
    }
  };
  return dialogApi;
}

// ── ensureAuthorized() — the single entry point every mutation request
//    calls before it is ever sent. Resolves immediately (no dialog) once
//    a token is already stored; concurrent callers while the dialog is
//    open share the SAME in-flight promise (replay guard — never opens a
//    second dialog, never issues a second verify request, and therefore
//    never lets a caller's original mutation fire more than once from a
//    duplicated authorization step). ──

var pendingAuthorization = null;

export function ensureAuthorized() {
  var stored = readStoredAuth();
  if (stored && stored.token) {
    return Promise.resolve(stored.token);
  }
  if (pendingAuthorization) {
    return pendingAuthorization;
  }
  pendingAuthorization = ensureAuthorizeDialog().open().then(
    function (token) {
      pendingAuthorization = null;
      return token;
    },
    function (err) {
      pendingAuthorization = null;
      throw err;
    }
  );
  return pendingAuthorization;
}

// ── 401 handling ─────────────────────────────────────────────────────────

/* Called by instance.js's apiRequest/leaveApiRequest the moment a
   mutation response comes back 401 — the token that was attached (valid
   at storage-time, no longer accepted now) is discarded immediately so a
   later retry starts the first-use flow over, never silently reusing a
   rejected token. */
export function handleUnauthorizedResponse() {
  clearStoredAuth();
  renderIndicator();
}

// ── "Authorized as" indicator + Forget/change control (topbar, browser-
//    wide — one instance for the whole page, not per calendar tab) ──────

var indicatorEls = null;

function getIndicatorEls() {
  if (indicatorEls) { return indicatorEls; }
  var root = document.getElementById('calendarAuthIndicator');
  if (!root) { return null; }
  indicatorEls = {
    root: root,
    label: document.getElementById('calendarAuthIndicatorLabel'),
    forgetBtn: document.getElementById('calendarAuthForgetBtn')
  };
  return indicatorEls;
}

function renderIndicator() {
  var els = getIndicatorEls();
  if (!els) { return; }
  var memberKey = getStoredMemberKey();
  if (memberKey) {
    els.root.hidden = false;
    els.label.textContent = 'Authorized as: ' + labelForMemberKey(memberKey);
  } else {
    els.root.hidden = true;
    els.label.textContent = '';
  }
}

export function forgetToken() {
  clearStoredAuth();
  renderIndicator();
}

/* Called once at app boot (web-view/js/app.js). Renders the indicator's
   initial state from whatever is already in localStorage (e.g. a reload
   in an already-authorized browser) and wires the Forget/change control —
   idempotent, safe to call once. */
export function initCalendarAuthIndicator() {
  var els = getIndicatorEls();
  if (els && els.forgetBtn) {
    els.forgetBtn.addEventListener('click', forgetToken);
  }
  renderIndicator();
}
