/* ui/popup.js — shared focus-management utilities for modals, popups, and
   drawers. Promoted verbatim (same matching rule, same trap logic) from the
   focus-trap helpers that used to live only inside calendar/instance.js, so
   every overlay in the app (calendar Task/Leave/detail popups, the Staff
   Data record drawer, the shared confirmation dialog) shares one
   implementation instead of three independent, slightly different ones.

   Leaf module: no imports, and must never import a calendar/staff/navigation
   module (dependency direction is domain -> ui, never the reverse). */

/* Same focusable-selector list and offsetParent visibility check the former
   calendar-only getFocusableEls() used — unchanged so existing popups keep
   exactly the same Tab order they had before this extraction. */
export function getFocusableEls(root) {
  if (!root) { return []; }
  return Array.prototype.slice.call(root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(function (el) { return el.offsetParent !== null; });
}

/* Cycles Tab/Shift+Tab within `root`'s focusable descendants. `root` should
   be the popup/dialog content element itself (e.g. the ".msc-modal" card),
   not the full-screen overlay backdrop — callers that trapped Tab against
   an overlay previously (calendar/instance.js) resolve their own content
   element and pass that in, preserving identical behavior. */
export function trapTab(root, event) {
  var focusables = getFocusableEls(root);
  if (!focusables.length) { return; }
  var first = focusables[0];
  var last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/* Restores focus to whatever triggered a popup/dialog/drawer open, once it
   closes — a no-op if the trigger is missing or no longer focusable. */
export function returnFocus(trigger) {
  if (trigger && typeof trigger.focus === 'function') {
    trigger.focus();
  }
}
