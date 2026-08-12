/* app.js — single frontend entry point (2026-07-17 frontend modularization).
   Loaded once as <script type="module">. It imports the three subsystem entry
   points and runs them once after DOMContentLoaded, in the original monolith's
   order (navigation, then calendars, then Staff Data). The three subsystems are
   independent (different DOM regions), so order only mirrors prior behaviour.
   config.js / calendar/core.js are evaluated before their consumers by the ES
   module loader's static import graph — no consumer runs before its config.
   No formerly-private state is exposed on window.

   REQ-AUTH-ENTRY-009 (2026-08-11) — boot() (which mounts every subsystem,
   including data-bearing fetches like the Calendar's initAllScheduleCalendars())
   no longer runs unconditionally on DOMContentLoaded. It is now the
   onAuthenticated callback entry-auth.js's global entry gate calls exactly
   once the first time this browser is confirmed authenticated (either an
   already-valid saved token or a freshly-entered one) — see entry-auth.js
   for the full state model and web-view/index.html for the
   #authGateScreen/#appShell markup that gate controls. */

import { initNavigation } from './navigation.js';
import { initAllScheduleCalendars } from './calendar/instance.js';
import { initCalendarAuthIndicator } from './calendar/auth.js';
import { initStaffDataPilot } from './staff-data.js';
import { initPlanningWarning } from './planning-warning.js';
import { initReviewSummaries } from './review-summaries.js';
import { initIssues } from './issues.js';
import { initKnowledgeManagement } from './knowledge-management.js';
import { initAnnouncements } from './announcements.js';
import { initEntryAuthGate } from './entry-auth.js';

function boot() {
  /* Each subsystem is idempotent to a single call and mounts its listeners /
     calendar instances exactly once — boot() itself runs only once. */
  initNavigation();
  initAllScheduleCalendars();
  initCalendarAuthIndicator();
  initStaffDataPilot();
  initPlanningWarning();
  // REQ-CAL-REV-001 (2026-08-03) — Staff Review Summaries workspace, one
  // instance per member tab-panel (web-view/index.html).
  initReviewSummaries();
  // REQ-ISSUES-UI-001 (2026-08-10) — Management Issues workspace,
  // frontend-only (no Issue-System backend integration yet).
  initIssues();
  // REQ-KM-001 (2026-08-10) — Knowledge Management, Company Documents view
  // only. Frontend-only, narrow first implementation — see
  // docs/knowledge-management-company-documents-requirement-2026-08-10.md.
  initKnowledgeManagement();
  // REQ-ANN-001 (2026-08-12) — Announcement & Notification workspace +
  // topbar bell. Backend-integrated from day one (unlike KM's initial
  // frontend-only slice) — see backend/routers/announcements.py.
  initAnnouncements();
}

function start() {
  initEntryAuthGate(boot);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
