/* app.js — single frontend entry point (2026-07-17 frontend modularization).
   Loaded once as <script type="module">. It imports the three subsystem entry
   points and runs them once after DOMContentLoaded, in the original monolith's
   order (navigation, then calendars, then Staff Data). The three subsystems are
   independent (different DOM regions), so order only mirrors prior behaviour.
   config.js / calendar/core.js are evaluated before their consumers by the ES
   module loader's static import graph — no consumer runs before its config.
   No formerly-private state is exposed on window. */

import { initNavigation } from './navigation.js';
import { initAllScheduleCalendars } from './calendar/instance.js';
import { initStaffDataPilot } from './staff-data.js';

function boot() {
  /* Each subsystem is idempotent to a single call and mounts its listeners /
     calendar instances exactly once — boot() itself runs only once. */
  initNavigation();
  initAllScheduleCalendars();
  initStaffDataPilot();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
