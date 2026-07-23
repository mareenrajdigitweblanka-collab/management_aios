/* ui/scroll-lock.js — one shared, reference-counted body-scroll lock for
   true modal dialogs (Task/Leave Create-Edit, Help, Settings, centered
   Task/Leave Detail, the destructive-confirmation dialog). A module is a
   singleton across the whole page even though calendar/instance.js mounts
   five separate per-member instances, so the counter here is shared
   correctly app-wide: only the LAST close (count reaches 0) actually
   unlocks the page, which is what "do not unlock while another modal is
   still open" requires for nested dialog flows (e.g. a confirmation
   dialog opened on top of an already-open Task Detail).

   Anchored, non-modal popovers (the "+N more" list, the Calendar search
   panel, Task Detail shown beside that list) do NOT use this — they only
   need their own internal overscroll-behavior: contain (calendar.css),
   since the background page is meant to stay usable around them. Toasts
   never call this either (ui/toast.js is unaffected). */

var lockCount = 0;
var savedScrollY = 0;

export function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + savedScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.classList.add('msc-scroll-locked');
  }
  lockCount++;
}

export function unlockBodyScroll() {
  if (lockCount === 0) { return; }
  lockCount--;
  if (lockCount === 0) {
    document.body.classList.remove('msc-scroll-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, savedScrollY);
  }
}
