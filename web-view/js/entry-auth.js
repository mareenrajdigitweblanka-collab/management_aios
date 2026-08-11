/* entry-auth.js — global Management AIOS entry authentication gate
   (REQ-AUTH-ENTRY-009, 2026-08-11).

   Reuses the existing Calendar member-token authorization system verbatim
   (web-view/js/calendar/auth.js, via the shared web-view/js/auth-gate.js
   primitives already used by Staff Data/Issues/Knowledge Management) — no
   new login system, no new token type, no new localStorage key.

   Before this task, three individual modules (staff-data.js, issues.js,
   knowledge-management.js) each gated their own content on
   isAuthenticated(), but the application shell itself (topbar, sidebar,
   every other tab) rendered unconditionally — see
   docs/global-authentication-entry-gate-requirement-2026-08-11.md. This
   module is the single choke point that now decides whether the shell
   (#appShell, web-view/index.html) is revealed at all, and whether
   app.js's boot() — which mounts every subsystem, including the three
   already-gated modules above — is allowed to run.

   State model (three conceptual states, never a fourth competing boolean
   anywhere else in the codebase):
     AUTH_CHECKING    — initial state. #appShell stays `hidden` (set
                         directly in index.html, so there is no first-paint
                         flash — this module only ever REMOVES that
                         attribute, never relies on JS to add it).
                         #authGateScreen shows its "Checking authorization…"
                         status text (also the default in index.html).
     UNAUTHENTICATED  — #appShell stays hidden; #authGateScreen shows the
                         token entry form instead of the checking text.
     AUTHENTICATED    — #authGateScreen is hidden; #appShell is revealed;
                         boot() runs exactly once.

   Every transition after the very first page-load check funnels through
   one CALENDAR_AUTH_CHANGED_EVENT listener (subscribed via auth-gate.js's
   onAuthChange), because calendar/auth.js's verifyAndStoreToken() and
   handleUnauthorizedResponse() both already dispatch that event on every
   real change to "is this browser authenticated" — a successful saved-
   token re-verification, a successful manual submit on this gate's own
   form, a successful Change Token, or a 401-triggered clear all look
   identical to this module: one event with a truthy or falsy
   detail.memberKey. This is also how Phase 9 (auth loss during an active
   session) is satisfied without a second code path: the SAME listener
   that revealed the app the first time hides it again the moment a
   mutation's 401 clears the stored token mid-session. */

import {
  getStoredToken,
  verifyAndStoreToken,
  handleUnauthorizedResponse
} from './calendar/auth.js';
import { onAuthChange } from './auth-gate.js';
import { setButtonBusy } from './ui/loading.js';

function queryGateEls() {
  return {
    appShell: document.getElementById('appShell'),
    gateScreen: document.getElementById('authGateScreen'),
    checking: document.getElementById('authGateChecking'),
    form: document.getElementById('authGateForm'),
    input: document.getElementById('authGateTokenInput'),
    toggleVisibilityBtn: document.getElementById('authGateToggleVisibility'),
    errorEl: document.getElementById('authGateError'),
    submitBtn: document.getElementById('authGateSubmitBtn')
  };
}

/* Hiding #authGateScreen alone is visually sufficient (its children,
   including #authGateChecking, are never rendered while their ancestor
   is hidden) — but REQ-AUTH-ENTRY-011 (2026-08-11) showed that relying
   on an ancestor's hidden state as the ONLY source of truth for a
   descendant's own visibility is exactly the kind of implicit state that
   goes stale/wrong; #authGateChecking.hidden is explicitly reset here
   too so this module's own state is never inconsistent with what's
   rendered, regardless of how the gate screen's CSS/markup changes
   later. */
function revealApp(els) {
  if (els.gateScreen) { els.gateScreen.hidden = true; }
  if (els.checking) { els.checking.hidden = true; }
  if (els.appShell) { els.appShell.hidden = false; }
}

/* Shows the token-entry form (leaves #appShell hidden). Used both for the
   very first "no saved token" case and for every later "not authenticated
   (any more)" transition, including a mid-session auth loss — the form is
   reset to a clean, non-busy, non-erroring state every time it is shown,
   so a stale error from a previous attempt never reappears out of
   context. */
function showGateForm(els) {
  if (els.appShell) { els.appShell.hidden = true; }
  if (els.gateScreen) { els.gateScreen.hidden = false; }
  if (els.checking) { els.checking.hidden = true; }
  if (els.form) { els.form.hidden = false; }
  if (els.errorEl) {
    els.errorEl.textContent = '';
    els.errorEl.hidden = true;
  }
  if (els.input) {
    els.input.value = '';
    els.input.focus();
  }
  if (els.submitBtn) { setButtonBusy(els.submitBtn, false); }
}

function showError(els, message) {
  if (!els.errorEl) { return; }
  els.errorEl.textContent = message;
  els.errorEl.hidden = false;
}

/* Same masked/plain toggle behavior as calendar/auth.js's token dialog
   (calendar-auth-toggle-visibility), reimplemented at this small scale
   rather than exported from that module — the dialog's version is a
   closure-private detail of ITS input element, and this gate has its own,
   entirely separate input element on the page. The verification/storage
   logic (the part Phase 6 says must not be duplicated) is untouched;
   this is presentation-only wiring, same as any other page's show/hide
   button.

   Icon (2026-08-11 follow-up) — same eye/eye-slash glyph as calendar/
   auth.js's own token dialog toggle (byte-identical path/circle/line
   geometry), so the two token-visibility controls in this app read as
   one consistent control, not two different designs. Built via
   createElementNS/appendChild, never innerHTML, matching this whole
   codebase's no-innerHTML-for-interactive-markup convention. */
function renderToggleVisibilityIcon(button, visible) {
  while (button.firstChild) { button.removeChild(button.firstChild); }
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
    // ("click to hide"), same open-eye shape plus one diagonal line.
    var slash = document.createElementNS(svgNS, 'line');
    slash.setAttribute('x1', '2');
    slash.setAttribute('y1', '18');
    slash.setAttribute('x2', '18');
    slash.setAttribute('y2', '2');
    svg.appendChild(slash);
  }
  button.appendChild(svg);
}

function wireToggleVisibility(els) {
  if (!els.toggleVisibilityBtn || !els.input) { return; }
  var visible = false;
  function render() {
    els.input.type = visible ? 'text' : 'password';
    els.toggleVisibilityBtn.setAttribute('aria-label', visible ? 'Hide member token' : 'Show member token');
    els.toggleVisibilityBtn.setAttribute('aria-pressed', visible ? 'true' : 'false');
    renderToggleVisibilityIcon(els.toggleVisibilityBtn, visible);
  }
  render();
  els.toggleVisibilityBtn.addEventListener('click', function () {
    visible = !visible;
    render();
    els.input.focus();
  });
}

/* Manual submit — used only when no saved token already exists (or the
   saved one was rejected and cleared). On success this deliberately does
   NOT reveal the app itself; verifyAndStoreToken() already dispatches
   CALENDAR_AUTH_CHANGED_EVENT with the new memberKey, and the single
   onAuthChange listener registered in initEntryAuthGate() below is what
   actually reveals #appShell — one transition path, not two. On failure,
   nothing was stored (there was no prior token to clear), so this only
   shows an inline error and lets the user retry — same convention as the
   existing "Authorize this browser" dialog. */
function wireSubmit(els) {
  if (!els.submitBtn || !els.input) { return; }
  var submitting = false;

  function submit() {
    if (submitting) { return; } // duplicate-submit guard while a verify request is in flight
    var token = els.input.value.trim();
    if (!token) {
      showError(els, 'Enter your Member Token.');
      return;
    }
    submitting = true;
    if (els.errorEl) {
      els.errorEl.textContent = '';
      els.errorEl.hidden = true;
    }
    setButtonBusy(els.submitBtn, true, { busyLabel: 'Verifying…' });
    verifyAndStoreToken(token).then(function () {
      submitting = false;
      // onAuthChange listener reveals the app; nothing further to do here.
    }).catch(function (err) {
      submitting = false;
      setButtonBusy(els.submitBtn, false);
      showError(
        els,
        err && err.status === 401
          ? 'Token not recognized. Check the token and try again.'
          : 'Could not reach the server. Check your connection and try again.'
      );
      els.input.focus();
    });
  }

  els.submitBtn.addEventListener('click', submit);
  els.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });
}

/* The single entry point, called once from app.js. onAuthenticated is
   called exactly once, the first time this browser becomes authenticated
   (whether via an already-valid saved token or a freshly-entered one) —
   app.js uses it to run boot() (which itself is documented as safe to
   call only once) exactly once, never again on a later re-authentication
   after a mid-session auth loss (Phase 9) — at that point every subsystem
   is already mounted and each already reacts to CALENDAR_AUTH_CHANGED_EVENT
   on its own (staff-data.js/issues.js/knowledge-management.js re-fetch;
   navigation.js unlocks; this module just re-reveals the shell). */
export function initEntryAuthGate(onAuthenticated) {
  var els = queryGateEls();
  wireToggleVisibility(els);
  wireSubmit(els);

  var booted = false;
  onAuthChange(function (event) {
    var memberKey = event && event.detail && event.detail.memberKey;
    if (memberKey) {
      revealApp(els);
      if (!booted) {
        booted = true;
        onAuthenticated();
      }
    } else {
      showGateForm(els);
    }
  });

  var token = getStoredToken();
  if (!token) {
    showGateForm(els);
    return;
  }
  // A token is already stored — stay in the default AUTH_CHECKING state
  // (index.html's own initial markup) while it is re-verified against the
  // backend. Never trust the mere presence of a stored token as proof of
  // authentication (Phase 5) — only a successful verify reveals the app.
  verifyAndStoreToken(token).catch(function () {
    // Expired/rejected saved token (Phase 8) — clear it through the
    // existing unauthorized-token convention, which also dispatches
    // CALENDAR_AUTH_CHANGED_EVENT with a null memberKey, driving the
    // listener above to show the token-entry form.
    handleUnauthorizedResponse();
  });
}
