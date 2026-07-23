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
  overlay.setAttribute('aria-describedby', 'ui-dialog-message');
  overlay.innerHTML =
    '<div class="msc-modal ui-dialog">' +
    '<div class="msc-modal-form-head ui-dialog-head">' +
    '<h4 id="ui-dialog-title"></h4>' +
    '<button type="button" class="msc-modal-close ui-dialog-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<p id="ui-dialog-message" class="ui-dialog-message"></p>' +
    '<div class="msc-form-actions ui-dialog-actions">' +
    '<button type="button" class="msc-btn msc-btn-ghost ui-dialog-cancel"></button>' +
    '<button type="button" class="msc-btn msc-btn-danger ui-dialog-confirm"></button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  var modalEl = overlay.querySelector('.ui-dialog');
  var titleEl = overlay.querySelector('#ui-dialog-title');
  var messageEl = overlay.querySelector('#ui-dialog-message');
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
        cancelBtn.textContent = options.cancelLabel || 'Cancel';
        confirmBtn.textContent = options.confirmLabel || 'Confirm';
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
