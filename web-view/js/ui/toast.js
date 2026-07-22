/* ui/toast.js — one shared, non-blocking notification system for the whole
   app (Calendar and Staff Data both use this; neither owns a separate
   toast implementation). Replaces every user-facing window.alert() call
   and provides operation success/failure feedback everywhere else.

   Leaf module: no imports, and must never import a calendar/staff/
   navigation module (dependency direction is domain -> ui, never the
   reverse). */

/* Timings (Phase 1 professional-UX-feedback task, 2026-07-22) — success
   and information follow the requested 4s/5s exactly; warning/error use a
   slightly longer 6s default for a non-actionable toast (there is no
   confirmed timing value for that case in the source requirement, which
   only specifies "warning/error requiring action: persistent" — this is
   the small, documented adjustment the requirement allows). A toast
   opened with `persistent: true` never auto-dismisses regardless of type,
   which is how every actionable warning/error in this app is shown. */
var TOAST_DURATIONS_MS = {
  success: 4000,
  information: 5000,
  warning: 6000,
  error: 6000
};

var TOAST_ICONS = {
  success: '✓',
  information: 'ℹ',
  warning: '⚠',
  error: '✕'
};

var regionEl = null;
var activeToasts = [];
var toastIdCounter = 0;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Lazily created once per page — every showToast() call after the first
   reuses the same region rather than mounting a second one. */
function ensureRegion() {
  if (regionEl) { return regionEl; }
  regionEl = document.createElement('div');
  regionEl.className = 'ui-toast-region';
  regionEl.setAttribute('aria-live', 'polite');
  regionEl.setAttribute('aria-atomic', 'false');
  regionEl.setAttribute('role', 'region');
  regionEl.setAttribute('aria-label', 'Notifications');
  document.body.appendChild(regionEl);
  return regionEl;
}

function removeEntry(entry) {
  var idx = activeToasts.indexOf(entry);
  if (idx !== -1) { activeToasts.splice(idx, 1); }
}

function dismissToast(entry) {
  if (!entry || entry.dismissed) { return; }
  entry.dismissed = true;
  if (entry.timer) { clearTimeout(entry.timer); entry.timer = null; }
  entry.el.classList.remove('show');
  entry.el.classList.add('ui-toast--leaving');
  setTimeout(function () {
    if (entry.el.parentNode) { entry.el.parentNode.removeChild(entry.el); }
    removeEntry(entry);
  }, 220);
}

/* Shows one toast. opts: { type: 'success'|'information'|'warning'|'error',
   title, message, persistent }. Duplicate-message suppression: a toast
   with the identical type+title+message that is still visible is not
   duplicated — its auto-dismiss timer is simply restarted, so a repeated
   identical failure doesn't stack a second, third, fourth copy or get
   re-announced to assistive tech. Returns the toast entry (has a
   `dismiss()` method) in case a caller wants to dismiss it early — no
   caller is required to keep this reference. */
export function showToast(opts) {
  opts = opts || {};
  var type = (opts.type && TOAST_DURATIONS_MS.hasOwnProperty(opts.type)) ? opts.type : 'information';
  var title = opts.title || '';
  var message = opts.message || '';
  var persistent = !!opts.persistent;
  var key = type + '|' + title + '|' + message;

  var existing = null;
  for (var i = 0; i < activeToasts.length; i++) {
    if (activeToasts[i].key === key && !activeToasts[i].dismissed) { existing = activeToasts[i]; break; }
  }
  if (existing) {
    if (existing.timer) { clearTimeout(existing.timer); existing.timer = null; }
    if (!persistent) {
      existing.timer = setTimeout(function () { dismissToast(existing); }, TOAST_DURATIONS_MS[type]);
    }
    return { dismiss: function () { dismissToast(existing); } };
  }

  var region = ensureRegion();
  var el = document.createElement('div');
  el.className = 'ui-toast ui-toast--' + type;
  el.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');
  toastIdCounter += 1;
  var titleId = 'ui-toast-title-' + toastIdCounter;
  el.innerHTML =
    '<span class="ui-toast-icon" aria-hidden="true">' + TOAST_ICONS[type] + '</span>' +
    '<div class="ui-toast-body">' +
    '<p class="ui-toast-title" id="' + titleId + '">' + escapeHtml(title) + '</p>' +
    (message ? '<p class="ui-toast-message">' + escapeHtml(message) + '</p>' : '') +
    '</div>' +
    '<button type="button" class="ui-toast-dismiss" aria-label="Dismiss notification">&times;</button>';
  el.setAttribute('aria-labelledby', titleId);
  region.appendChild(el);

  var entry = { key: key, el: el, timer: null, dismissed: false };
  el.querySelector('.ui-toast-dismiss').addEventListener('click', function () { dismissToast(entry); });

  /* Two-step add so the CSS transition (opacity/transform) actually
     animates in, rather than starting already in its end state. */
  window.requestAnimationFrame(function () { el.classList.add('show'); });

  if (!persistent) {
    entry.timer = setTimeout(function () { dismissToast(entry); }, TOAST_DURATIONS_MS[type]);
  }
  activeToasts.push(entry);
  return { dismiss: function () { dismissToast(entry); } };
}

/* Not used by any current call site — provided so a future "clear all
   notifications" action (or a test harness) doesn't need to reach into
   this module's private state. */
export function dismissAllToasts() {
  activeToasts.slice().forEach(dismissToast);
}
