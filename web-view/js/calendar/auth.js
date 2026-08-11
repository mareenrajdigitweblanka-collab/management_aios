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
import { showToast } from '../ui/toast.js';
import { CALENDAR_AUTH_API_BASE } from '../config.js';
import { MD_DISPLAY_LABEL, MD_MEMBER_KEY } from '../member-registry.js';

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

/* Calendar review summary authorization-context fix (REQ-CAL-REV-001,
   2026-08-03 follow-up). Every module that gates on "which member does
   the browser-wide token currently belong to" (currently only
   review-summaries.js) needs to know the instant that answer changes —
   a successful verify (first-time authorize OR Change Token) or a 401-
   triggered clear — so it can re-evaluate and clear any state loaded
   under the previous token owner. One shared event name (exported, not
   duplicated as a string literal in a second module) dispatched from the
   two places this module's own stored-auth state actually changes. The
   `typeof document` guard is defensive only — every real caller runs in
   a browser or a test stand-in that now provides document.dispatchEvent
   (see calendar/auth-test-dom.mjs). */
export var CALENDAR_AUTH_CHANGED_EVENT = 'management-aios:calendar-auth-changed';

function dispatchAuthChanged() {
  if (typeof document === 'undefined' || !document.dispatchEvent) { return; }
  document.dispatchEvent(new CustomEvent(CALENDAR_AUTH_CHANGED_EVENT, {
    detail: { memberKey: getStoredMemberKey() }
  }));
}

/* Resolves a member_key to its existing on-page display label by reading
   the same data-member-label attribute already present on that member's
   .msc-instance container (web-view/index.html) — avoids maintaining a
   second, parallel label map in this module that could drift from the
   backend's own MEMBER_LABELS (backend/config.py). Falls back to the raw
   key if the DOM lookup ever fails (e.g. in a test harness with no
   calendar markup mounted). Exported so instance.js can build the same
   dynamic cross-member copy (crossMemberAlertCopy below) for the backend-
   403 fallback path, using the identical label source.

   MD (REQ-CAL-REV-MD-READ-006, 2026-08-06) is special-cased FIRST, before
   the DOM lookup: MD has no .msc-instance Calendar tab at all (by design —
   MD gets no Task/Leave/Calendar mutation UI), so the DOM query would
   always miss and fall back to the raw "md" key. MD_DISPLAY_LABEL comes
   from the same member-registry.js entry review-summaries.js's own
   "Authorized as" line uses, so the topbar banner and the Review Summaries
   workspace banner can never show two different strings for MD. */
export function labelForMemberKey(memberKey) {
  if (!memberKey) { return null; }
  if (memberKey === MD_MEMBER_KEY) { return MD_DISPLAY_LABEL; }
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

/* REQ-AUTH-ENTRY-009 (2026-08-11) — the single place a token is verified
   against the backend AND, only on success, stored/announced. Extracted
   from the token dialog's own submit() below (which now calls this
   instead of duplicating the fetch/writeStoredAuth/renderIndicator/
   dispatchAuthChanged sequence) so the new global entry auth gate
   (web-view/js/entry-auth.js) can reuse the exact same verify-and-store
   path — for both a freshly-typed token and an already-stored one being
   re-verified on page load — without a second implementation of "what
   does a successful verification do." Rejects (never resolves false) on
   an invalid/unreachable token; storage is untouched on rejection, same
   as verifyToken() alone always was — callers decide whether a failure
   should also clear any previously-stored token (entry-auth.js's saved-
   token boot check does; a first-time or Change Token dialog attempt,
   with nothing new stored yet, does not). */
export function verifyAndStoreToken(token) {
  return verifyToken(token).then(function (body) {
    writeStoredAuth(token, body.memberKey);
    renderIndicator();
    dispatchAuthChanged();
    return body.memberKey;
  });
}

// ── Token dialog — "Authorize this browser" (first use) and "Change
//    Calendar token" (topbar control) share ONE lazy-singleton dialog
//    (same pattern as ui/dialog.js's ensureDialog()), parameterized per
//    open() call — both are structurally "enter a token, verify it,
//    store it only on success"; only title/message/submit-label/post-
//    success behavior differ. ─────────────────────────────────────────

var DEFAULT_AUTHORIZE_MESSAGE =
  'Enter your Calendar member token to create, update, or delete Tasks and Leave. ' +
  'You normally only need to do this once on this browser.';

var CHANGE_TOKEN_MESSAGE =
  'Enter a different member token for this browser. Your current authorization ' +
  'will remain active until the new token is verified.';

var dialogApi = null;

function ensureTokenDialog() {
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
  titleEl.textContent = 'Authorize this browser'; // default; overwritten per open() call
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
  messageEl.textContent = DEFAULT_AUTHORIZE_MESSAGE; // default; overwritten per open() call

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
  inputEl.className = 'calendar-auth-input calendar-auth-input--with-toggle';

  /* Show/hide toggle (2026-07-31 usability addition) — reveals only
     whatever is currently typed into THIS open input, by flipping
     inputEl.type between 'password' and 'text'. Never reads
     getStoredToken()/readStoredAuth() and never writes inputEl.value
     itself — it has no access to, and no effect on, the saved
     localStorage token at all. Built via createElementNS (real SVG),
     same as the rest of this dialog: no innerHTML. */
  var inputWrapEl = document.createElement('div');
  inputWrapEl.className = 'calendar-auth-input-wrap';

  var toggleVisibilityBtn = document.createElement('button');
  toggleVisibilityBtn.type = 'button';
  toggleVisibilityBtn.className = 'calendar-auth-toggle-visibility';

  var tokenVisible = false;

  function renderVisibilityIcon(visible) {
    while (toggleVisibilityBtn.firstChild) { toggleVisibilityBtn.removeChild(toggleVisibilityBtn.firstChild); }
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.6');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var eyeOutline = document.createElementNS(svgNS, 'path');
    eyeOutline.setAttribute('d', 'M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z');
    var pupil = document.createElementNS(svgNS, 'circle');
    pupil.setAttribute('cx', '10');
    pupil.setAttribute('cy', '10');
    pupil.setAttribute('r', '2.4');
    svg.appendChild(eyeOutline);
    svg.appendChild(pupil);
    if (visible) {
      // Token currently shown as plain text — icon becomes a slashed eye
      // ("click to hide"), the same open-eye shape plus one diagonal line.
      var slash = document.createElementNS(svgNS, 'line');
      slash.setAttribute('x1', '2');
      slash.setAttribute('y1', '18');
      slash.setAttribute('x2', '18');
      slash.setAttribute('y2', '2');
      svg.appendChild(slash);
    }
    toggleVisibilityBtn.appendChild(svg);
  }

  function setTokenVisible(visible) {
    tokenVisible = visible;
    inputEl.type = visible ? 'text' : 'password';
    toggleVisibilityBtn.setAttribute('aria-label', visible ? 'Hide token' : 'Show token');
    toggleVisibilityBtn.setAttribute('aria-pressed', visible ? 'true' : 'false');
    renderVisibilityIcon(visible);
  }

  setTokenVisible(false); // masked by default

  toggleVisibilityBtn.addEventListener('click', function () {
    setTokenVisible(!tokenVisible);
    inputEl.focus(); // toggling never steals focus away from the field itself
  });

  inputWrapEl.appendChild(inputEl);
  inputWrapEl.appendChild(toggleVisibilityBtn);

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
  bodyEl.appendChild(inputWrapEl);
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
  submitBtn.textContent = 'Authorize'; // default; overwritten per open() call
  actionsEl.appendChild(cancelBtn);
  actionsEl.appendChild(submitBtn);

  modalEl.appendChild(headEl);
  modalEl.appendChild(bodyEl);
  modalEl.appendChild(actionsEl);
  overlay.appendChild(modalEl);
  document.body.appendChild(overlay);

  var activeResolve = null;
  var activeReject = null;
  var activeOptions = null;
  var triggerEl = null;
  var submitting = false;
  var openPromise = null;

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
    activeOptions = null;
    openPromise = null;
    inputEl.value = ''; // never prefilled, on open or on close — no saved token is ever reflected here
    setTokenVisible(false); // always resets to masked — never carries a "revealed" state into the next open
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
    var announceSuccess = !!(activeOptions && activeOptions.announceSuccess);
    verifyAndStoreToken(token).then(function (memberKey) {
      if (announceSuccess) {
        showToast({
          type: 'success',
          title: 'Authorization updated',
          message: 'Calendar authorization changed to ' + labelForMemberKey(memberKey) + '.'
        });
      }
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
    /* options: { title, message, submitLabel, announceSuccess, trigger }
       — all optional; omitted options fall back to the original
       "Authorize this browser" wording/behavior (ensureAuthorized() below
       calls open() with no options at all, so that flow is byte-for-byte
       unchanged). A second open() call while this dialog is already open
       returns the SAME pending promise rather than starting a second,
       conflicting one — this dialog is a single shared singleton, and in
       practice a second trigger is already unreachable while the first
       is showing (full-screen modal + focus trap), but this guard makes
       that explicit rather than relying only on that. */
    open: function (options) {
      if (openPromise) { return openPromise; }
      options = options || {};
      activeOptions = options;
      titleEl.textContent = options.title || 'Authorize this browser';
      messageEl.textContent = options.message || DEFAULT_AUTHORIZE_MESSAGE;
      submitBtn.textContent = options.submitLabel || 'Authorize';
      openPromise = new Promise(function (resolve, reject) {
        activeResolve = resolve;
        activeReject = reject;
        triggerEl = options.trigger || document.activeElement;
        overlay.classList.add('show');
        lockBodyScroll();
        overlay.addEventListener('keydown', onKeydown);
        // Opening the dialog (either mode) moves focus to the token
        // input — never prefilled (inputEl.value is always '' here,
        // untouched from the last close()).
        inputEl.focus();
      });
      return openPromise;
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
  pendingAuthorization = ensureTokenDialog().open().then(
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

// ── openChangeTokenDialog() — the topbar "Change token" control. Opens
//    the SAME dialog in "change" mode: current localStorage is left
//    completely untouched until the replacement token verifies
//    successfully (never cleared just for opening the dialog, and never
//    cleared on Cancel/Escape/close or an invalid replacement — the
//    existing authorization keeps working throughout). Always resolves
//    (never rejects) with a boolean — true only on a confirmed,
//    successful replacement — so callers never need a .catch(). ──

export function openChangeTokenDialog() {
  var els = getIndicatorEls();
  var trigger = els && els.changeTokenBtn;
  return ensureTokenDialog().open({
    title: 'Change Calendar token',
    message: CHANGE_TOKEN_MESSAGE,
    submitLabel: 'Change token',
    announceSuccess: true,
    trigger: trigger
  }).then(
    function () { return true; },
    function () { return false; }
  );
}

// ── Cross-member pre-block ────────────────────────────────────────────
//
// Approved copy (CROSS-MEMBER FLOW) — kept as one pure function so both
// the client-side pre-block below and instance.js's backend-403 fallback
// (apiRequest/leaveApiRequest, using the backend's own actingMember/
// targetMember facts) render the exact same wording. actingLabel/
// targetLabel are already-resolved display labels (never raw member
// keys) — this function does no DOM lookup itself, so it stays testable
// with plain strings and safely callable from instance.js too.

export function crossMemberAlertCopy(actingLabel, targetLabel) {
  return {
    title: "You can't manage " + targetLabel + "'s Calendar",
    message: 'You are authorized as ' + actingLabel + '. You can only create or change ' +
      actingLabel + "'s Tasks and Leave."
  };
}

function showCrossMemberAlert(actingMemberKey, targetMemberKey) {
  var copy = crossMemberAlertCopy(labelForMemberKey(actingMemberKey), labelForMemberKey(targetMemberKey));
  showToast({ type: 'error', title: copy.title, message: copy.message, persistent: true });
}

// ── guardMutationAccess() — the single pre-flight gate every mutation-
//    initiating UI action (Create/Bulk-Create/Leave-Create, Task/Leave
//    Edit-open, Task/Leave Delete, Task Outcome) calls BEFORE opening its
//    own modal/confirmation/form, and before sending any request:
//
//    - No token stored: runs the first-time authorization flow (opens
//      "Authorize this browser" — this IS "stop before opening the final
//      mutation action"). Once verified, compares the now-current
//      verified member against targetMemberKey.
//    - Token already stored: compares its (display-only) member against
//      targetMemberKey immediately — no dialog, no delay.
//    - Match: resolves true — the caller proceeds to open its modal/form.
//    - Mismatch: shows the cross-member alert and resolves false — the
//      caller must not open anything or send anything. The saved token
//      is never touched (still valid, just for a different member).
//    - Cancelled/failed authorization: resolves false (the dialog itself
//      already showed its own inline error/cancel state; no separate
//      alert here, and the token dialog is never reopened automatically
//      afterward — matches "do not reopen the token dialog after a valid
//      403" for the equivalent already-authorized-elsewhere case).
//
//    Always resolves (never rejects) — every caller can use one plain
//    .then(function (allowed) {...}) with no .catch(). ──

export function guardMutationAccess(targetMemberKey) {
  var token = getStoredToken();
  if (token) {
    var currentMemberKey = getStoredMemberKey();
    if (currentMemberKey && currentMemberKey !== targetMemberKey) {
      showCrossMemberAlert(currentMemberKey, targetMemberKey);
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  }
  return ensureAuthorized().then(function () {
    var verifiedMemberKey = getStoredMemberKey();
    if (verifiedMemberKey && verifiedMemberKey !== targetMemberKey) {
      showCrossMemberAlert(verifiedMemberKey, targetMemberKey);
      return false;
    }
    return true;
  }, function () {
    return false; // cancelled or failed — caller does not proceed
  });
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
  dispatchAuthChanged();
}

// ── "Authorized as" indicator + Change-token control (topbar, browser-
//    wide — one instance for the whole page, not per calendar tab) ──────

var indicatorEls = null;

function getIndicatorEls() {
  if (indicatorEls) { return indicatorEls; }
  var root = document.getElementById('calendarAuthIndicator');
  if (!root) { return null; }
  indicatorEls = {
    root: root,
    label: document.getElementById('calendarAuthIndicatorLabel'),
    changeTokenBtn: document.getElementById('calendarAuthChangeTokenBtn')
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

/* Called once at app boot (web-view/js/app.js). Renders the indicator's
   initial state from whatever is already in localStorage (e.g. a reload
   in an already-authorized browser) and wires the "Change token" control
   to openChangeTokenDialog() — idempotent, safe to call once. */
export function initCalendarAuthIndicator() {
  var els = getIndicatorEls();
  if (els && els.changeTokenBtn) {
    els.changeTokenBtn.addEventListener('click', function () { openChangeTokenDialog(); });
  }
  renderIndicator();
}
