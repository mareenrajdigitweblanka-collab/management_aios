/* sidebar-height-responsive.test.mjs — structural coverage for the sidebar
   height-responsive density fix (REQ-SIDEBAR-RESP-008, 2026-08-11):
   navigation.css must compact vertical spacing/icon size at shorter
   viewport heights instead of ever letting the sidebar scroll internally,
   and no nav item, section, or heading may be hidden/collapsed/removed to
   achieve that. Individual Issues/Review Summaries/Knowledge Management/
   Calendar regressions are already covered by their own existing test
   files (issues-navigation-structure.test.mjs, navigation-structure.test.mjs,
   navigation.test.mjs, knowledge-management.test.mjs, calendar/*.test.mjs)
   — this file only adds the sidebar-CSS-specific checks those don't cover.

   Same no-npm-dependency, line/regex-anchored approach as
   navigation-structure.test.mjs (no HTML/CSS parser available in this repo).

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

var indexHtmlPath = fileURLToPath(new URL('../index.html', import.meta.url));
var html = readFileSync(indexHtmlPath, 'utf8');

var navCssPath = fileURLToPath(new URL('../css/navigation.css', import.meta.url));
var navCss = readFileSync(navCssPath, 'utf8');

var EXPECTED_NAV_TABS = [
  'root-aios', 'file-map',
  'mayurika-hr', 'suman-recruitment', 'arun-implementation', 'rajiv-blocked', 'paraparan',
  'staff-data', 'review-summaries', 'issues',
  'knowledge-management', 'announcements'
];

var AUTH_LOCKED_TABS = ['staff-data', 'issues', 'knowledge-management', 'announcements'];

// ── 1. One sidebar remains ──────────────────────────────────────────────

test('exactly one application sidebar <nav> remains in index.html', () => {
  var matches = html.match(/<nav class="app-sidebar" id="appSidebar"/g) || [];
  assert.equal(matches.length, 1);
});

// ── 2/3. All expected sidebar entries remain, none removed ─────────────

test('all 12 expected sidebar nav items remain, each exactly once', () => {
  EXPECTED_NAV_TABS.forEach(function (tab) {
    var matches = html.match(new RegExp('data-tab="' + tab + '"', 'g')) || [];
    assert.equal(matches.length, 1, tab + ' nav item should appear exactly once');
  });
});

test('exactly 12 .app-nav-btn sidebar buttons exist (no item removed)', () => {
  var matches = html.match(/<button type="button" class="app-nav-btn[^"]*" data-tab="/g) || [];
  assert.equal(matches.length, EXPECTED_NAV_TABS.length);
});

// ── 4-7. Section headings remain ────────────────────────────────────────

['Overview', 'Members', 'Staff', 'Knowledge', 'Announcements'].forEach(function (heading) {
  test('"' + heading + '" sidebar section heading remains', () => {
    var re = new RegExp('<div class="app-sidebar-title">' + heading + '</div>');
    assert.match(html, re);
  });
});

// ── 8. Authenticated-only locked items remain represented ──────────────

test('authenticated-only locked nav items (Data, Issues, Knowledge Management, Announcements) remain in the sidebar markup', () => {
  AUTH_LOCKED_TABS.forEach(function (tab) {
    assert.match(html, new RegExp('data-tab="' + tab + '"'), tab + ' should remain in the sidebar');
  });
});

// ── 9/10. No overflow-y/overflow-x auto/scroll introduced for the sidebar ─

function appSidebarBlock(source) {
  var match = /\.app-sidebar\s*\{([\s\S]*?)\n\s*\}/.exec(source);
  assert.ok(match, '.app-sidebar rule block should be found in navigation.css');
  return match[1];
}

test('no overflow-y:auto/scroll on .app-sidebar', () => {
  var block = appSidebarBlock(navCss);
  assert.doesNotMatch(block, /overflow-y\s*:\s*(auto|scroll)\s*;/);
});

test('no overflow-x:auto/scroll on .app-sidebar', () => {
  var block = appSidebarBlock(navCss);
  assert.doesNotMatch(block, /overflow-x\s*:\s*(auto|scroll)\s*;/);
});

test('.app-sidebar overflow-y is explicitly visible, not left as the old auto', () => {
  var block = appSidebarBlock(navCss);
  assert.match(block, /overflow-y\s*:\s*visible\s*;/);
});

// ── 11. Compact height media rules exist ────────────────────────────────

test('at least two max-height compact-density media queries exist in navigation.css', () => {
  var matches = navCss.match(/@media \(max-height:\s*\d+px\)/g) || [];
  assert.ok(matches.length >= 2, 'expected two height tiers (compact + very-compact), found ' + matches.length);
});

test('the compact-height media queries reduce .app-sidebar padding, group spacing, nav-btn padding, and icon size', () => {
  var blocks = navCss.split(/@media \(max-height:\s*\d+px\)/).slice(1);
  assert.ok(blocks.length >= 2);
  blocks.forEach(function (block) {
    assert.match(block, /\.app-sidebar\s*\{[^}]*padding\s*:/, 'sidebar padding should be reduced');
    assert.match(block, /\.app-sidebar-group \+ \.app-sidebar-group\s*\{[^}]*margin-top\s*:/, 'inter-group spacing should be reduced');
    assert.match(block, /\.app-nav-btn\s*\{[^}]*padding\s*:/, 'nav-btn padding should be reduced');
    assert.match(block, /\.app-nav-icon,?\s*\n?\s*\.app-sidebar-collapse-toggle\s*\{[^}]*width\s*:/, 'icon/button container size should be reduced');
  });
});

test('compact-height media queries do not hide any nav item, section, or text', () => {
  var blocks = navCss.split(/@media \(max-height:\s*\d+px\)/).slice(1);
  blocks.forEach(function (block) {
    assert.doesNotMatch(block, /display\s*:\s*none/, 'no element should be display:none inside a height tier');
    assert.doesNotMatch(block, /visibility\s*:\s*hidden/);
    assert.doesNotMatch(block, /\.app-nav-btn-label/, 'labels themselves must not be touched by height tiers');
    assert.doesNotMatch(block, /\.app-nav-btn-sub\s*\{[^}]*display/, 'subtitles must not be hidden by height tiers');
  });
});

// ── 12. Existing navigation selectors remain intact ─────────────────────

['.app-sidebar', '.app-sidebar-group', '.app-sidebar-title', '.app-nav-btn', '.app-nav-icon', '.app-nav-btn-label', '.app-nav-btn-sub'].forEach(function (selector) {
  test('selector ' + selector + ' is still defined in navigation.css', () => {
    assert.match(navCss, new RegExp(selector.replace(/[.]/g, '\\.') + '\\s*[,{]'));
  });
});
