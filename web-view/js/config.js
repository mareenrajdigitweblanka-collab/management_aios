/* config.js — centralized calendar API endpoints (member schedules + member leave).
   Extracted verbatim from the former inline calendar IIFE (2026-07-17 frontend
   modularization). Local dev (127.0.0.1/localhost) -> local FastAPI; any other
   host -> hosted backend. No logic changed. */

/* Single centralized schedule-API base for all four calendar instances.
   Local dev (opened from 127.0.0.1/localhost, e.g. `python -m http.server`)
   talks to the local FastAPI server. Any other host (e.g. the deployed
   production dashboard at https://management-aios.vercel.app) talks to
   the hosted backend at https://management-aios-api.vercel.app (see
   backend/README.md, "Vercel backend project setup"). */
export var MEMBER_SCHEDULE_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/member-schedules';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/member-schedules';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

/* Leave coordination-copy API base (REQ-LEAVE-COPY-001) — same
   local-vs-production host detection as MEMBER_SCHEDULE_API_BASE,
   just a different route prefix. No leave-deduction minute value
   (270/270/540) is ever hardcoded here or anywhere else in this
   file — every effective_leave_minutes/summary figure this page
   displays comes from the backend response. */
export var MEMBER_LEAVE_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/member-leave';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/member-leave';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

/* Calendar member-token authorization (2026-07-29) — same local-vs-
   production host detection as the two bases above, just a different
   route prefix (backend/routers/calendar_auth.py). Used only by
   calendar/auth.js's verify request. */
export var CALENDAR_AUTH_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/calendar-auth';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/calendar-auth';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

/* Staff Review Summaries (REQ-CAL-REV-001, 2026-08-03) — same local-vs-
   production host detection as the three bases above, just a different
   route prefix (backend/routers/staff_review_summaries.py). Unlike
   MEMBER_SCHEDULE_API_BASE/MEMBER_LEAVE_API_BASE, every request against
   this base requires a token — including GET — since review-summary
   content is private to the authenticated reviewer (see
   web-view/js/review-summaries.js). */
export var STAFF_REVIEW_SUMMARIES_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/staff-review-summaries';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/staff-review-summaries';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

/* Knowledge Management (REQ-KM-CRUD-003 backend, REQ-KM-UI-004 frontend
   integration) — same local-vs-production host detection as the four
   bases above, just a different route prefix
   (backend/routers/knowledge_documents.py). LIST/DETAIL are public
   (no token); every other route requires a Calendar member token, exactly
   like Task/Leave's own public-GET/protected-mutation split — unlike
   STAFF_REVIEW_SUMMARIES_API_BASE, where even GET requires a token. */
export var KNOWLEDGE_DOCUMENTS_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/knowledge-documents';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/knowledge-documents';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

/* Announcements & Notifications (REQ-ANN-001, 2026-08-12) — same
   local-vs-production host detection as the five bases above, just a
   different route prefix (backend/routers/announcements.py). Every route
   requires a Calendar member token, same as STAFF_REVIEW_SUMMARIES_API_BASE
   and the (revised) KNOWLEDGE_DOCUMENTS_API_BASE — there is no public GET
   here, matching REQ-AUTH-MODULES-007's whole-module-gated convention. */
export var ANNOUNCEMENTS_API_BASE = (function () {
  var LOCAL_BASE = 'http://127.0.0.1:8000/api/announcements';
  var PRODUCTION_BASE = 'https://management-aios-api.vercel.app/api/announcements';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());

/* Announcements realtime WebSocket (REQ-ANN-001 Stage B, 2026-08-12) — same
   local-vs-production host detection as every base above, ws/wss instead of
   http/https, same /api/announcements route prefix (backend/routers/
   announcements.py's /ws route). Only ever used with a short-lived signed
   ticket in the query string (web-view/js/announcements.js) — never the
   long-lived Calendar member bearer token, which cannot safely travel in a
   WebSocket URL. */
export var ANNOUNCEMENTS_WS_BASE = (function () {
  var LOCAL_BASE = 'ws://127.0.0.1:8000/api/announcements';
  var PRODUCTION_BASE = 'wss://management-aios-api.vercel.app/api/announcements';
  var isLocalHost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  return isLocalHost ? LOCAL_BASE : PRODUCTION_BASE;
}());
