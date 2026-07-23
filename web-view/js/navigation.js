/* navigation.js — application navigation controller. Extracted from the former
   inline tab-switching IIFE (2026-07-17 frontend modularization), then extended
   for the professional dashboard redesign (2026-07-17) so ONE controller drives
   the entire sidebar (Overview: Root AIOS/File Map, Members: Mayurika/Suman/
   Arun/Rajiv/Paraparan, Data: Staff Data) over the same single .tab-panel set —
   the former separate top tab strip was removed; every nav item is now an
   .app-nav-btn. One source of truth for the active panel — no per-item
   navigation code. Search + data-goto jump behaviour preserved verbatim.
   Wired exactly once by app.js after DOMContentLoaded. */

import { returnFocus } from './ui/popup.js';

export function initNavigation() {
  'use strict';

  var sideNavBtns = document.querySelectorAll('.app-nav-btn');
  var tabPanels = document.querySelectorAll('.tab-panel');

  function activatePanel(targetId) {
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
