/* navigation.js — application navigation controller. Extracted from the former
   inline tab-switching IIFE (2026-07-17 frontend modularization) and extended so
   ONE controller drives BOTH the remaining global top tabs (Root AIOS, File Map)
   and the new left application member sidebar (Mayurika, Suman, Arun, Rajiv,
   Paraparan, Staff Data) over the same single .tab-panel set. One source of truth
   for the active panel — no per-member navigation code. Search + data-goto jump
   behaviour preserved verbatim. Wired exactly once by app.js after DOMContentLoaded. */

export function initNavigation() {
  'use strict';

  /* Two button groups, one panel set. Top tabs keep role="tab"/aria-selected;
     the sidebar member buttons use aria-current="page" for their active state. */
  var tabBtns = document.querySelectorAll('.tab-btn');
  var sideNavBtns = document.querySelectorAll('.app-nav-btn');
  var tabPanels = document.querySelectorAll('.tab-panel');

  function activatePanel(targetId) {
    tabBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === targetId;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    sideNavBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === targetId;
      btn.classList.toggle('active', on);
      if (on) { btn.setAttribute('aria-current', 'page'); }
      else { btn.removeAttribute('aria-current'); }
    });
    tabPanels.forEach(function (panel) {
      panel.classList.toggle('active', panel.id === 'tab-' + targetId);
    });
  }

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activatePanel(btn.getAttribute('data-tab'));
    });
  });

  sideNavBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      activatePanel(btn.getAttribute('data-tab'));
    });
  });

  /* ── Member snapshot cards jump to a panel (UI-only, no network) ── */
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () {
      activatePanel(el.getAttribute('data-goto'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

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
