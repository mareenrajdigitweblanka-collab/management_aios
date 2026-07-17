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
