/* navigation.js — application navigation controller. Extracted from the former
   inline tab-switching IIFE (2026-07-17 frontend modularization), then extended
   for the professional dashboard redesign (2026-07-17) so ONE controller drives
   the entire sidebar (Overview: Root AIOS/File Map, Members: Mayurika/Suman/
   Arun/Rajiv/Paraparan, Data: Staff Data) over the same single .tab-panel set —
   the former separate top tab strip was removed; every nav item is now an
   .app-nav-btn. One source of truth for the active panel — no per-item
   navigation code. Search + data-goto jump behaviour preserved verbatim.
   Wired exactly once by app.js after DOMContentLoaded.

   Authenticated-module gate (REQ-AUTH-MODULES-007, 2026-08-10) — Staff
   Data/Issues/Knowledge Management (auth-gate.js PROTECTED_TABS) may not
   be activated while this browser holds no Calendar member token.
   activatePanel() below is the ONE place every panel switch goes through
   (nav click, [data-goto] jump, and the auth-loss fallback here), so
   gating it is sufficient to reject direct/programmatic activation from
   any current caller — there is no second panel-switching code path
   anywhere else in this codebase (confirmed by inspection). */

import { returnFocus } from './ui/popup.js';
import {
  isProtectedTab,
  isAuthenticated,
  requestAuthorization,
  onAuthChange
} from './auth-gate.js';

var DEFAULT_TAB_ID = 'root-aios';

export function initNavigation() {
  'use strict';

  /* [data-tab] guard (2026-10-22, DigitDisplay external nav link) — this
     selector used to be plain '.app-nav-btn', which also swept up any
     future non-tab item sharing that class for styling (e.g. an external
     link with no data-tab and no .tab-panel). setPanelActive() below
     compares every matched button's data-tab to the target id; a button
     with no data-tab at all (getAttribute returns null) would match
     targetId===null, and EVERY .tab-panel's 'tab-'+null id check would
     then fail, clearing .active off every panel. Scoping to [data-tab]
     keeps this NodeList — and the click-wiring loop below that reuses it
     — exactly to real tab buttons; non-tab .app-nav-btn-styled items
     (like the DigitDisplay link) get their own, separate wiring below. */
  var sideNavBtns = document.querySelectorAll('.app-nav-btn[data-tab]');
  var tabPanels = document.querySelectorAll('.tab-panel');

  function setPanelActive(targetId) {
    sideNavBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === targetId;
      btn.classList.toggle('active', on);
      if (on) { btn.setAttribute('aria-current', 'page'); }
      else { btn.removeAttribute('aria-current'); }
    });
    tabPanels.forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'tab-' + targetId);
    });
    /* Every mounted calendar instance (calendar/instance.js) listens for
       this and closes its own Search/Help/Settings popover — switching
       member tab or app section must never leave a toolbar popover open
       behind the newly shown panel (professional-calendar-toolbar-
       redesign task, 2026-07-23, Step 12). */
    document.dispatchEvent(new CustomEvent('msc:close-toolbar-popovers'));
  }

  /* A protected target requested while unauthenticated never activates —
     it opens the existing "Authorize this browser" dialog (same
     ensureAuthorized() primitive every Calendar mutation already uses)
     and only switches panels once that resolves to a confirmed,
     successful authorization. A cancelled/failed dialog leaves the
     current panel exactly as it was. */
  function activatePanel(targetId) {
    if (isProtectedTab(targetId) && !isAuthenticated()) {
      requestAuthorization().then(function (granted) {
        if (granted) { setPanelActive(targetId); }
      });
      return;
    }
    setPanelActive(targetId);
  }

  function currentActiveTabId() {
    var found = null;
    sideNavBtns.forEach(function (btn) {
      if (btn.classList.contains('active')) { found = btn.getAttribute('data-tab'); }
    });
    return found;
  }

  /* Sidebar lock state — protected nav items stay visible and focusable
     (never hidden entirely: an unauthenticated user still needs a
     discoverable way to start authorization) but are visually muted and
     carry aria-disabled="true" until a Calendar member token is stored;
     "become available" the moment one is (Phase 11's preferred UX).
     Re-run on every authentication transition (authorize, change token,
     401-triggered clear) and once at boot. If the panel currently showing
     is itself protected and authorization is lost while viewing it
     (logout / invalid token — Phase 12), falls back to the default public
     tab rather than leaving a gated panel "active" with no accessible
     content behind it. */
  function applyProtectedNavState() {
    var authed = isAuthenticated();
    sideNavBtns.forEach(function (btn) {
      if (!isProtectedTab(btn.getAttribute('data-tab'))) { return; }
      btn.classList.toggle('app-nav-btn--locked', !authed);
      if (authed) { btn.removeAttribute('aria-disabled'); }
      else { btn.setAttribute('aria-disabled', 'true'); }
    });
    if (!authed && isProtectedTab(currentActiveTabId())) {
      setPanelActive(DEFAULT_TAB_ID);
    }
  }

  applyProtectedNavState();
  onAuthChange(applyProtectedNavState);

  /* ── External navigation links gated by AIOS member-token authorization
     (DigitDisplay, REQ-DIGITDISPLAY-NAV-001, 2026-10-22) ── Marked with
     [data-external-auth-link] rather than data-tab (see the [data-tab]
     guard comment above) — it has no .tab-panel and is not part of
     sideNavBtns, so it never goes through setPanelActive/activatePanel
     at all. Reuses the exact same isAuthenticated()/requestAuthorization()
     /onAuthChange() primitives as the protected-tab lock above — same
     lock visuals (app-nav-btn--locked, aria-disabled), same "Authorize
     this browser" dialog. This is a convenience/consistency gate on THIS
     app's sidebar only: DigitDisplay opens in a separate tab using its
     own independent login, and enforces its own server-side
     authorization entirely on its own — nothing here grants, bypasses,
     or weakens that. Guards both 'click' (mouse/keyboard activation) and
     'auxclick' (e.g. a middle-click new-tab open, which never fires
     'click') so an unauthorized visitor cannot reach the link's href by
     either path — the lock is enforced in script, not by CSS/aria alone. */
  var externalAuthLinks = document.querySelectorAll('[data-external-auth-link]');

  function applyExternalAuthLinkState() {
    var authed = isAuthenticated();
    externalAuthLinks.forEach(function (link) {
      link.classList.toggle('app-nav-btn--locked', !authed);
      if (authed) { link.removeAttribute('aria-disabled'); }
      else { link.setAttribute('aria-disabled', 'true'); }
    });
  }

  externalAuthLinks.forEach(function (link) {
    function handleExternalLinkActivation(evt) {
      /* Same unconditional drawer-close as every other nav item below
         (sideNavBtns' own click listener, [data-goto] jump) — on mobile,
         activating ANY nav item closes the drawer immediately, whether
         or not this particular activation is itself gated. closeDrawer
         is a hoisted function declaration (defined further down this
         same initNavigation() body), so calling it here is safe — the
         existing [data-goto] wiring above already relies on the same
         hoisting. */
      closeDrawer();
      if (isAuthenticated()) { return; }
      evt.preventDefault();
      /* Deliberately does NOT auto-open DigitDisplay once requestAuthorization()
         resolves to granted. window.open() called from inside a Promise
         .then() callback has no user-gesture context left by then — the
         dialog's own async token-verification request already broke the
         chain back to this click — so most browsers' popup blockers would
         silently swallow it, leaving the user with no visible result and
         no error. Instead, this only opens the existing "Authorize this
         browser" dialog; applyExternalAuthLinkState() (re-run by the same
         onAuthChange event the dialog raises on success) unlocks the link
         once authorized, and the user's NEXT click is a fresh, direct,
         user-gesture click on a real <a target="_blank"> — which every
         browser allows, popup blocker or not. */
      requestAuthorization();
    }
    link.addEventListener('click', handleExternalLinkActivation);
    link.addEventListener('auxclick', handleExternalLinkActivation);
  });

  applyExternalAuthLinkState();
  onAuthChange(applyExternalAuthLinkState);

  sideNavBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activatePanel(btn.getAttribute('data-tab'));
      closeDrawer();
    });
  });

  /* ── Member snapshot cards jump to a panel (UI-only, no network) ── */
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () {
      activatePanel(el.getAttribute('data-goto'));
      closeDrawer();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ── Responsive sidebar drawer (<1024px) ──
     Desktop keeps the sidebar as a static column (no toggle shown, see
     base.css); below 1024px it becomes a fixed drawer opened via the
     header toggle, closed by Escape, backdrop click, or selecting a nav
     item (handled above). Focus returns to the toggle button on close so
     keyboard users are never dropped into an invisible panel. */
  var sidebarToggle = document.getElementById('sidebarToggle');
  var sidebar = document.getElementById('appSidebar');
  var backdrop = document.getElementById('sidebarBackdrop');

  function openDrawer() {
    document.body.classList.add('sidebar-open');
    if (sidebarToggle) { sidebarToggle.setAttribute('aria-expanded', 'true'); }
  }

  /* Focus always returns to the toggle button once the drawer actually
     closes (Phase 1 professional-UX-feedback task, 2026-07-22) —
     previously only the Escape path did this; backdrop click and
     selecting a nav item left focus wherever it happened to land,
     dropping keyboard users into content that had just been hidden.
     The early return above (drawer already closed) means this never
     steals focus on a no-op call. */
  function closeDrawer() {
    if (!document.body.classList.contains('sidebar-open')) { return; }
    document.body.classList.remove('sidebar-open');
    if (sidebarToggle) {
      sidebarToggle.setAttribute('aria-expanded', 'false');
      returnFocus(sidebarToggle);
    }
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      var isOpen = document.body.classList.contains('sidebar-open');
      if (isOpen) { closeDrawer(); } else { openDrawer(); }
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', function () { closeDrawer(); });
  }

  document.addEventListener('keydown', function (evt) {
    if (evt.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      closeDrawer();
    }
  });

  /* ── Desktop sidebar collapse/expand (2026-07-17 header-safe-scroll/
     search/sidebar/typography task) ── One application-level state
     (body.sidebar-collapsed), one toggle button. Session-only — this
     project has no existing localStorage usage for UI preferences
     (confirmed by inspection: calendar/staff-data explicitly avoid it),
     so no new persistence key is introduced here; the sidebar simply
     starts expanded on every page load. Desktop-only control — at
     <1024px this button is hidden (see navigation.css) and the existing
     drawer toggle above remains the sole sidebar control, so the two
     never compete. */
  var collapseToggle = document.getElementById('sidebarCollapseToggle');
  if (collapseToggle) {
    collapseToggle.addEventListener('click', function () {
      var collapsed = !document.body.classList.contains('sidebar-collapsed');
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      collapseToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      collapseToggle.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
      collapseToggle.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
  }

  /* ── Search (across all panels) ── */
  var searchInput = document.getElementById('searchInput');
  var searchClear = document.getElementById('searchClear');
  var searchResults = document.getElementById('searchResults');

  function normalize(str) {
    return str.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function doSearch(query) {
    query = normalize(query);
    var items = document.querySelectorAll('[data-searchable]');
    var shown = 0;
    items.forEach(function (el) {
      var tags = normalize(el.getAttribute('data-tags') || '');
      var text = normalize(el.textContent || '');
      var match = !query || tags.indexOf(query) !== -1 || text.indexOf(query) !== -1;
      if (match) { el.classList.remove('hidden'); shown++; }
      else { el.classList.add('hidden'); }
    });
    if (query) {
      searchResults.textContent = shown + ' result' + (shown === 1 ? '' : 's') + ' across all tabs';
    } else {
      searchResults.textContent = '';
    }
  }

  if (searchInput) { searchInput.addEventListener('input', function () { doSearch(searchInput.value); }); }
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      searchInput.value = '';
      doSearch('');
      searchInput.focus();
    });
  }
}
