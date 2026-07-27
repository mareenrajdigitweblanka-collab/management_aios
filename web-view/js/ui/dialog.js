/* ui/dialog.js — one shared, accessible destructive-confirmation dialog,
   replacing every user-facing window.confirm() call. Built on the exact
   same .msc-modal-overlay/.msc-modal visual foundation the calendar's
   Task/Leave/detail popups already use (see web-view/css/calendar.css) —
   this is a generalization of that existing pattern, not a second,
   competing modal system. web-view/css/ui.css only adds the small
   number of new classes this dialog needs on top of those existing ones.

   Imports popup.js (focus trap) and loading.js (busy-button treatment) —
   both are themselves leaf ui/* modules, so this stays a one-directional
   ui-internal dependency, never reaching into a calendar/staff/navigation
   module (dependency direction is domain -> ui, never the reverse). */

import { trapTab, returnFocus } from './popup.js';
import { setButtonBusy } from './loading.js';
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock.js';

var dialogApi = null;

function ensureDialog() {
  if (dialogApi) { return dialogApi; }

  var overlay = document.createElement('div');
  overlay.className = 'msc-modal-overlay ui-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'ui-dialog-title');
  /* All three ids are always listed — aria-describedby happily skips a
     hidden (display:none via the `hidden` attribute) referenced element
     when computing the accessible description in every evergreen
     browser, so .ui-dialog-list/.ui-dialog-footer contribute nothing
     when empty (every pre-existing caller: delete confirmation, Bulk's
     duplicate-warning popup) and contribute their text, in this listed
     order, only when a caller populates them (the schedule-confirmation
     popup's conflict list / closing question — see instance.js
     showScheduleConfirmation). This keeps read order correct (list, then
     closing question) even though .ui-dialog-footer sits after
     .ui-dialog-list in the DOM for a reason unrelated to reading order
     (see the .ui-dialog-body wrapper below). */
  overlay.setAttribute('aria-describedby', 'ui-dialog-message ui-dialog-list ui-dialog-footer');
  overlay.innerHTML =
    '<div class="msc-modal ui-dialog">' +
    '<div class="msc-modal-form-head ui-dialog-head">' +
    '<h4 id="ui-dialog-title"></h4>' +
    '<button type="button" class="msc-modal-close ui-dialog-close" aria-label="Close">&times;</button>' +
    '</div>' +
    /* .ui-dialog-body is the ONLY scrollable region (ui.css) — a long
       conflict list scrolls inside it while the title and action buttons
       (Go back / the primary action) always stay visible, matching the
       established .msc-view-modal-inner pattern used by the Task/Leave
       detail popup for its own long-content case (calendar.css). Every
       pre-existing caller leaves .ui-dialog-list/.ui-dialog-footer empty
       and hidden, so this wrapper is a no-op layout change for them. */
    '<div class="ui-dialog-body">' +
    '<p id="ui-dialog-message" class="ui-dialog-message"></p>' +
    '<ul id="ui-dialog-list" class="ui-dialog-list" hidden></ul>' +
    '<p id="ui-dialog-footer" class="ui-dialog-footer" hidden></p>' +
    '</div>' +
    '<div class="msc-form-actions ui-dialog-actions">' +
    '<button type="button" class="msc-btn msc-btn-ghost ui-dialog-cancel"></button>' +
    '<button type="button" class="msc-btn msc-btn-danger ui-dialog-confirm"></button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var modalEl = overlay.querySelector('.ui-dialog');
  var titleEl = overlay.querySelector('#ui-dialog-title');
  var messageEl = overlay.querySelector('#ui-dialog-message');
  var listEl = overlay.querySelector('#ui-dialog-list');
  var footerEl = overlay.querySelector('#ui-dialog-footer');
  var cancelBtn = overlay.querySelector('.ui-dialog-cancel');
  var confirmBtn = overlay.querySelector('.ui-dialog-confirm');
  var closeBtn = overlay.querySelector('.ui-dialog-close');

  var activeResolve = null;
  var triggerEl = null;
  var onConfirmHandler = null;

  function settle(result) {
    if (!activeResolve) { return; }
    var resolve = activeResolve;
    activeResolve = null;
    overlay.classList.remove('show');
    overlay.removeEventListener('keydown', onKeydown);
    setButtonBusy(confirmBtn, false);
    cancelBtn.disabled = false;
    unlockBodyScroll();
    returnFocus(triggerEl);
    triggerEl = null;
    onConfirmHandler = null;
    resolve(result);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      settle(false);
    } else if (e.key === 'Tab') {
      trapTab(modalEl, e);
    }
  }

  cancelBtn.addEventListener('click', function () { settle(false); });
  closeBtn.addEventListener('click', function () { settle(false); });
  /* Backdrop click behaves the same as Cancel/Escape (safe: it can never
     lose data — nothing has been deleted yet at this point) rather than
     silently doing nothing, matching the existing calendar popups'
     backdrop-click-to-close convention. */
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) { settle(false); }
  });

  confirmBtn.addEventListener('click', function () {
    if (!onConfirmHandler) { settle(true); return; }
    setButtonBusy(confirmBtn, true, { busyLabel: 'Working…' });
    cancelBtn.disabled = true;
    Promise.resolve(onConfirmHandler()).then(function (ok) {
      if (ok === false) {
        setButtonBusy(confirmBtn, false);
        cancelBtn.disabled = false;
        return;
      }
      settle(true);
    }).catch(function () {
      setButtonBusy(confirmBtn, false);
      cancelBtn.disabled = false;
    });
  });

  dialogApi = {
    open: function (options) {
      return new Promise(function (resolve) {
        activeResolve = resolve;
        triggerEl = options.trigger || document.activeElement;
        onConfirmHandler = typeof options.onConfirm === 'function' ? options.onConfirm : null;
        titleEl.textContent = options.title || 'Are you sure?';
        messageEl.textContent = options.message || '';
        /* Conflicting-Task list (2026-07-27 plain-language confirmation
           copy task) — real <li> elements via textContent (never
           innerHTML), so a Task title can never inject markup; always
           rebuilt from scratch on every open() so a dialog reused for an
           unrelated later call (e.g. delete confirmation, right after a
           schedule-confirmation popup) never inherits stale list/footer
           content — "Do not repeatedly announce the same warning after
           harmless re-renders" only applies within one still-open dialog
           instance, which this single open()-per-Promise design already
           guarantees (there is no re-render loop that calls open() again
           for the same still-visible dialog). */
        listEl.textContent = '';
        var listItems = options.listItems || [];
        listItems.forEach(function (text) {
          var li = document.createElement('li');
          li.textContent = text;
          listEl.appendChild(li);
        });
        listEl.hidden = listItems.length === 0;
        footerEl.textContent = options.footer || '';
        footerEl.hidden = !options.footer;
        cancelBtn.textContent = options.cancelLabel || 'Cancel';
        confirmBtn.textContent = options.confirmLabel || 'Confirm';
        /* Same-day Bulk Tasks duplicate-confirmation flow (2026-07-23) is
           the first non-destructive use of this shared dialog ("Create
           tasks anyway" creates data, it does not delete anything) — the
           default red msc-btn-danger confirm styling would misleadingly
           suggest a destructive action for that case. options.confirmVariant
           ('danger' | 'primary') lets a caller opt into the primary
           (non-destructive) button style; every existing caller omits this
           option and keeps the exact prior danger-red styling unchanged. */
        var confirmVariant = options.confirmVariant === 'primary' ? 'primary' : 'danger';
        confirmBtn.classList.toggle('msc-btn-danger', confirmVariant === 'danger');
        confirmBtn.classList.toggle('msc-btn-primary', confirmVariant === 'primary');
        overlay.classList.add('show');
        lockBodyScroll();
        overlay.addEventListener('keydown', onKeydown);
        /* Initial focus on Cancel (the safer action) — repository
           evidence (calendar.css .msc-btn-danger styling, the existing
           Task/Leave popups' own conservative defaults) supports treating
           the destructive action as the one that should require a
           deliberate extra Tab/click, not the one focus lands on. */
        cancelBtn.focus();
      });
    }
  };
  return dialogApi;
}

/* confirmDestructive({ title, message, confirmLabel, cancelLabel, trigger,
   onConfirm }) -> Promise<boolean>. If onConfirm is provided, clicking the
   destructive button calls it and keeps the dialog open (with the button
   busy) until the returned promise settles: resolving anything other than
   `false` closes the dialog and resolves true (a confirmed, successful
   delete); resolving `false` or rejecting restores the buttons and leaves
   the dialog open with its message intact, so a failed delete never
   silently closes the confirmation. If onConfirm is omitted, the dialog
   is a plain yes/no confirmation and resolves immediately on either
   button. */
export function confirmDestructive(options) {
  return ensureDialog().open(options || {});
}
