/* planning-warning.js — shared header "Next-week planning deadline" warning
   (2026-07-24 weekend-planning-warning task). Informational only: it never
   reads, computes, or writes Task category — it only decides whether to
   show/hide a static header notice based on the current Asia/Colombo time
   and which tab panel is active. One instance for the whole app (the
   header markup lives once in index.html, outside every tab panel), so
   switching member tabs or Calendar/Tasks mode never creates a duplicate
   banner or a duplicate timer.

   Scope: visible only while a member-schedule tab panel (.tab-panel--
   calendar — Mayurika/Suman/Arun/Rajiv/Paraparan) is active, matching the
   class the calendar redesign already uses to distinguish those five pages
   from Root AIOS / File Map / Staff Data. Calendar vs Tasks mode is
   per-instance state inside each .msc-instance and never touches this
   header element, so the banner persists across that switch with no
   extra wiring. */

import { getColomboWeekSeconds, isWithinPlanningWarningWindow } from './calendar/core.js';

export function initPlanningWarning() {
  var el = document.getElementById('topbarPlanningWarning');
  if (!el) { return; }

  var tabPanels = document.querySelectorAll('.tab-panel');
  var visible = null; // tri-state so the very first evaluate() always paints
  var boundaryTimer = null;

  function isMemberSchedulePageActive() {
    for (var i = 0; i < tabPanels.length; i++) {
      if (tabPanels[i].classList.contains('active')) {
        return tabPanels[i].classList.contains('tab-panel--calendar');
      }
    }
    return false;
  }

  function applyVisibility(next) {
    if (next === visible) { return; }
    visible = next;
    el.classList.toggle('topbar-planning-warning--visible', visible);
    // Mirrors the element's own visibility state onto <body> so the
    // tablet/mobile media query (base.css) can relax .topbar's fixed
    // height only while the banner is actually shown — see that query
    // for why .topbar's height can't just always be "auto".
    document.body.classList.toggle('planning-warning-visible', visible);
    if (visible) { el.removeAttribute('aria-hidden'); }
    else { el.setAttribute('aria-hidden', 'true'); }
  }

  function scheduleNextBoundary(weekSeconds) {
    if (boundaryTimer) { clearTimeout(boundaryTimer); }
    // Only two states exist (weekSeconds is always < Monday 00:00:00 of the
    // following week): inside the window, next boundary is Monday 00:00:00;
    // otherwise (always before Friday 07:00:00) it's Friday 07:00:00.
    var target = isWithinPlanningWarningWindow(weekSeconds)
      ? 7 * 86400 /* Monday 00:00:00 */
      : 4 * 86400 + 7 * 3600; /* Friday 07:00:00 */
    var deltaSeconds = target - weekSeconds;
    var msToNextSecond = 1000 - (Date.now() % 1000);
    boundaryTimer = setTimeout(evaluate, deltaSeconds * 1000 + msToNextSecond);
  }

  function evaluate() {
    var weekSeconds = getColomboWeekSeconds();
    applyVisibility(isWithinPlanningWarningWindow(weekSeconds) && isMemberSchedulePageActive());
    scheduleNextBoundary(weekSeconds);
  }

  /* Tab switching toggles the 'active' class on these same static panel
     elements (navigation.js activatePanel()) — observing that directly
     means no change to navigation.js is needed and this stays correct
     even if navigation.js changes later. */
  var panelObserver = new MutationObserver(evaluate);
  tabPanels.forEach(function (panel) {
    panelObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
  });

  window.addEventListener('focus', evaluate);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { evaluate(); }
  });

  evaluate();
}
