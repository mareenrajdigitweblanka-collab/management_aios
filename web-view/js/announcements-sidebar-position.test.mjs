/* announcements-sidebar-position.test.mjs — automated coverage for the
   REQ-ANN-001 Stage A sidebar reorder (web-view/index.html): the
   Announcements sidebar group must sit immediately after the Overview
   group and immediately before the Members group.

   Sidebar order is purely markup order (see
   handover/2026-07-17__sidebar-navigation-and-frontend-modularization-closure.md)
   — no config list, no CSS `order` property. This file locks that order in
   as committed, repeatable test coverage rather than ad hoc verification.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

var indexHtmlPath = fileURLToPath(new URL('../index.html', import.meta.url));
var html = readFileSync(indexHtmlPath, 'utf8');

var SIDEBAR_GROUP_TITLE_RE = /<div class="app-sidebar-group">[\s\S]*?<div class="app-sidebar-title">([^<]*)<\/div>/g;

function sidebarGroupTitlesInOrder(source) {
  var navMatch = /<nav class="app-sidebar"[\s\S]*?<\/nav>/.exec(source);
  assert.ok(navMatch, 'the .app-sidebar nav element should be found');
  var nav = navMatch[0];
  var titles = [];
  var match;
  SIDEBAR_GROUP_TITLE_RE.lastIndex = 0;
  while ((match = SIDEBAR_GROUP_TITLE_RE.exec(nav))) {
    titles.push(match[1]);
  }
  return titles;
}

test('sidebar groups render in the order Overview, Announcements, Members, Staff, Knowledge', () => {
  var titles = sidebarGroupTitlesInOrder(html);
  assert.deepEqual(titles, ['Overview', 'Announcements', 'Members', 'Staff', 'Knowledge']);
});

test('Announcements immediately follows Overview with no other group between them', () => {
  var titles = sidebarGroupTitlesInOrder(html);
  var overviewIndex = titles.indexOf('Overview');
  var announcementsIndex = titles.indexOf('Announcements');
  assert.notEqual(overviewIndex, -1);
  assert.notEqual(announcementsIndex, -1);
  assert.equal(announcementsIndex, overviewIndex + 1, 'Announcements must be the very next sidebar group after Overview');
});

test('Announcements immediately precedes Members with no other group between them', () => {
  var titles = sidebarGroupTitlesInOrder(html);
  var announcementsIndex = titles.indexOf('Announcements');
  var membersIndex = titles.indexOf('Members');
  assert.notEqual(announcementsIndex, -1);
  assert.notEqual(membersIndex, -1);
  assert.equal(membersIndex, announcementsIndex + 1, 'Members must be the very next sidebar group after Announcements');
});

test('exactly one Announcements nav button exists, inside the Announcements group', () => {
  var groupMatch = /<div class="app-sidebar-group">\s*<div class="app-sidebar-title">Announcements<\/div>([\s\S]*?)<\/div>\s*<div class="app-sidebar-group">/.exec(html);
  assert.ok(groupMatch, 'the Announcements sidebar group markup should be found');
  var buttonMatches = groupMatch[1].match(/data-tab="announcements"/g) || [];
  assert.equal(buttonMatches.length, 1);
});

test('the announcements nav item is unchanged apart from position — still a real .app-nav-btn', () => {
  var match = /<button type="button" class="app-nav-btn" data-tab="announcements" title="Announcements">/.exec(html);
  assert.ok(match, 'the Announcements .app-nav-btn should still exist with its original attributes');
});

test('exactly one #tab-announcements panel still exists (panel content untouched by the sidebar move)', () => {
  var matches = html.match(/id="tab-announcements"/g) || [];
  assert.equal(matches.length, 1);
});
