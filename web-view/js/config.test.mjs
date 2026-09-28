/* config.test.mjs — URL-selection coverage for REQ-PREVIEW-PROXY-001
   (2026-09-28).

   config.js's *_API_BASE constants read window.location.hostname exactly
   once, at module top level, on import (same convention/reason documented
   in issues.test.mjs and review-summaries.test.mjs — this repo has no
   npm deps / no jsdom, so `window` is whatever this file assigns to
   globalThis.window before each dynamic import). Each test below sets a
   hostname, imports a FRESH module instance via a cache-busting query
   string, asserts, then moves on — a shared/cached import would just keep
   returning the first hostname's already-computed constants.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';

var importCounter = 0;

async function loadConfigFor(hostname) {
  importCounter += 1;
  globalThis.window = { location: { hostname: hostname } };
  var mod = await import('./config.js?test-instance=' + importCounter);
  delete globalThis.window;
  return mod;
}

test('localhost resolves every HTTP base to the local backend port', async function () {
  var mod = await loadConfigFor('localhost');
  assert.equal(mod.MEMBER_SCHEDULE_API_BASE, 'http://127.0.0.1:' + mod.LOCAL_API_PORT + '/api/member-schedules');
  assert.equal(mod.CALENDAR_AUTH_API_BASE, 'http://127.0.0.1:' + mod.LOCAL_API_PORT + '/api/calendar-auth');
  assert.equal(mod.STAFF_REVIEW_SUMMARIES_API_BASE, 'http://127.0.0.1:' + mod.LOCAL_API_PORT + '/api/staff-review-summaries');
  assert.equal(mod.ANNOUNCEMENTS_WS_BASE, 'ws://127.0.0.1:' + mod.LOCAL_API_PORT + '/api/announcements');
});

test('127.0.0.1 resolves the same as localhost', async function () {
  var mod = await loadConfigFor('127.0.0.1');
  assert.equal(mod.MEMBER_LEAVE_API_BASE, 'http://127.0.0.1:' + mod.LOCAL_API_PORT + '/api/member-leave');
});

test('production hostname resolves every HTTP base to the production backend, unchanged', async function () {
  var mod = await loadConfigFor('management-aios.vercel.app');
  assert.equal(mod.MEMBER_SCHEDULE_API_BASE, 'https://management-aios-api.vercel.app/api/member-schedules');
  assert.equal(mod.MEMBER_LEAVE_API_BASE, 'https://management-aios-api.vercel.app/api/member-leave');
  assert.equal(mod.CALENDAR_AUTH_API_BASE, 'https://management-aios-api.vercel.app/api/calendar-auth');
  assert.equal(mod.STAFF_REVIEW_SUMMARIES_API_BASE, 'https://management-aios-api.vercel.app/api/staff-review-summaries');
  assert.equal(mod.KNOWLEDGE_DOCUMENTS_API_BASE, 'https://management-aios-api.vercel.app/api/knowledge-documents');
  assert.equal(mod.ANNOUNCEMENTS_API_BASE, 'https://management-aios-api.vercel.app/api/announcements');
  assert.equal(mod.ANNOUNCEMENTS_WS_BASE, 'wss://management-aios-api.vercel.app/api/announcements');
});

test('a Preview hostname routes every HTTP base through the same-origin proxy, not the production literal', async function () {
  var mod = await loadConfigFor('management-aios-clo5dpuzl-digitweb1.vercel.app');
  assert.equal(mod.MEMBER_SCHEDULE_API_BASE, '/api/preview-proxy/api/member-schedules');
  assert.equal(mod.MEMBER_LEAVE_API_BASE, '/api/preview-proxy/api/member-leave');
  assert.equal(mod.CALENDAR_AUTH_API_BASE, '/api/preview-proxy/api/calendar-auth');
  assert.equal(mod.STAFF_REVIEW_SUMMARIES_API_BASE, '/api/preview-proxy/api/staff-review-summaries');
  assert.equal(mod.KNOWLEDGE_DOCUMENTS_API_BASE, '/api/preview-proxy/api/knowledge-documents');
  assert.equal(mod.ANNOUNCEMENTS_API_BASE, '/api/preview-proxy/api/announcements');
});

test('a DIFFERENT Preview hostname (different deployment hash) resolves the identical relative proxy path — proves this is pattern-based, not tied to one exact hash', async function () {
  var a = await loadConfigFor('management-aios-clo5dpuzl-digitweb1.vercel.app');
  var b = await loadConfigFor('management-aios-9zzz1abcd-digitweb1.vercel.app');
  assert.equal(a.CALENDAR_AUTH_API_BASE, b.CALENDAR_AUTH_API_BASE);
  assert.equal(b.CALENDAR_AUTH_API_BASE, '/api/preview-proxy/api/calendar-auth');
});

test('ANNOUNCEMENTS_WS_BASE is intentionally left pointed at production for a Preview hostname (no WebSocket proxy exists)', async function () {
  var mod = await loadConfigFor('management-aios-clo5dpuzl-digitweb1.vercel.app');
  assert.equal(mod.ANNOUNCEMENTS_WS_BASE, 'wss://management-aios-api.vercel.app/api/announcements');
});
