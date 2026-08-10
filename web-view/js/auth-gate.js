/* auth-gate.js — the ONE shared authenticated-module guard for Staff Data,
   Issues, and Knowledge Management (REQ-AUTH-MODULES-007, 2026-08-10).

   Reuses the existing Calendar member-token authorization system
   (web-view/js/calendar/auth.js) verbatim — no new login system, no new
   token type, no module-specific password. "Authenticated" here means
   exactly what it already means for a Calendar mutation: a verified
   member token is stored in this browser (getStoredMemberKey() returns a
   non-null value).

   Deliberately narrow: this module owns only the shared vocabulary
   (which tabs are protected, what "authenticated" means, the shared
   in-panel placeholder) — navigation.js owns sidebar/tab-activation
   wiring, and each protected module (staff-data.js, issues.js,
   knowledge-management.js) owns its own mount/fetch/clear behavior using
   these primitives. This avoids three unrelated, drifting token-check
   implementations (the explicit instruction this task was built under). */

import {
  getStoredMemberKey,
  ensureAuthorized,
  CALENDAR_AUTH_CHANGED_EVENT
} from './calendar/auth.js';

export { CALENDAR_AUTH_CHANGED_EVENT };

/* The exact three modules REQ-AUTH-MODULES-007 protects — data-tab values
   from web-view/index.html. Staff Data content embedded elsewhere (the PH
   Staff Data pilots inside Arun's and Paraparan's own Calendar tabs) is
   NOT a fourth entry here — those tabs stay public; only the embedded
   staff-data sub-panel within them is gated, directly by staff-data.js
   using isAuthenticated()/onAuthChange() below, not by hiding the whole
   Arun/Paraparan tab. */
export var PROTECTED_TABS = ['staff-data', 'issues', 'knowledge-management'];

export function isProtectedTab(tabId) {
  return PROTECTED_TABS.indexOf(tabId) !== -1;
}

/* Display-only labels for the shared placeholder message — never used for
   authorization, matching member-registry.js's own "display only" note. */
var MODULE_LABELS = {
  'staff-data': 'Staff Data',
  'issues': 'Issues',
  'knowledge-management': 'Knowledge Management'
};

export function moduleLabelForTab(tabId) {
  return MODULE_LABELS[tabId] || 'this Management AIOS module';
}

/* The single source of truth for "is this browser currently authenticated"
   — never re-derived by any of the three protected modules with a second
   localStorage read of its own. Display-only in the same sense
   calendar/auth.js documents: the backend independently re-verifies the
   token on every request regardless of what this returns. */
export function isAuthenticated() {
  return !!getStoredMemberKey();
}

/* Opens the existing "Authorize this browser" dialog. Resolves true on a
   confirmed successful authorization, false if the dialog was cancelled or
   failed — never rejects, so callers never need a .catch(). */
export function requestAuthorization() {
  return ensureAuthorized().then(
    function () { return true; },
    function () { return false; }
  );
}

/* Subscribes to every future authentication transition (authorize, change
   token, 401-triggered clear) via calendar/auth.js's own event — the same
   event knowledge-management.js already uses to re-mount itself. Returns
   an unsubscribe function; none of the three protected modules currently
   need one (they are mounted exactly once for the page's lifetime), but
   exposing it avoids ever needing a second, ad hoc removeEventListener
   callsite if that changes later. */
export function onAuthChange(handler) {
  document.addEventListener(CALENDAR_AUTH_CHANGED_EVENT, handler);
  return function unsubscribe() {
    document.removeEventListener(CALENDAR_AUTH_CHANGED_EVENT, handler);
  };
}

/* The ONE shared "Authorize this browser to access this Management AIOS
   module." placeholder (Phase 11's suggested copy, verbatim) — built via
   createElement/appendChild with textContent only (same no-innerHTML
   convention as issues.js/knowledge-management.js/review-summaries.js).
   Every protected module renders this INSTEAD OF fetching or showing any
   data while isAuthenticated() is false; clicking the button opens the
   same token dialog the sidebar lock and the topbar "Change token"
   control already use. */
export function buildAuthRequiredNotice(tabId) {
  var wrap = document.createElement('div');
  wrap.className = 'msc-auth-required';
  wrap.setAttribute('role', 'status');

  var message = document.createElement('p');
  message.className = 'msc-auth-required-message';
  message.textContent = 'Authorize this browser to access ' + moduleLabelForTab(tabId) + '.';

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'msc-btn msc-btn-primary msc-auth-required-btn';
  button.textContent = 'Authorize this browser';
  button.addEventListener('click', function () {
    requestAuthorization();
  });

  wrap.appendChild(message);
  wrap.appendChild(button);
  return wrap;
}
