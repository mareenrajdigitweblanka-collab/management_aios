/* issues-navigation-structure.test.mjs — automated coverage for the
   Issues tab's navigation structure (REQ-ISSUES-UI-001, web-view/index.html).

   Same technique as navigation-structure.test.mjs (written for the Review
   Summaries tab): this repo has no HTML-parsing library, so this is a
   small, purpose-built, line-anchored structural extraction of the real
   index.html source — precise enough to prove genuine sibling structure,
   without needing a full HTML parser. See that file's own header comment
   for the exact indentation convention this relies on.

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

var indexHtmlPath = fileURLToPath(new URL('../index.html', import.meta.url));
var html = readFileSync(indexHtmlPath, 'utf8');

var TOP_LEVEL_PANEL_RE = /^ {4}<div class="tab-panel[^"]*" id="([^"]+)"/gm;

function topLevelPanels(source) {
  var panels = [];
  var match;
  TOP_LEVEL_PANEL_RE.lastIndex = 0;
  while ((match = TOP_LEVEL_PANEL_RE.exec(source))) {
    panels.push({ id: match[1], start: match.index });
  }
  return panels;
}

function panelSegments(source) {
  var panels = topLevelPanels(source);
  var segments = {};
  panels.forEach(function (panel, i) {
    var end = (i + 1 < panels.length) ? panels[i + 1].start : source.length;
    segments[panel.id] = source.slice(panel.start, end);
  });
  return segments;
}

var segments = panelSegments(html);

// ── Navigation (Phase 15, items 1-5) ──────────────────────────────────

test('exactly one Issues sidebar item exists', () => {
  var matches = html.match(/data-tab="issues"/g) || [];
  assert.equal(matches.length, 1);
});

test('the sidebar item is a real .app-nav-btn targeting "issues"', () => {
  var match = /<button type="button" class="app-nav-btn" data-tab="issues" title="[^"]*">/.exec(html);
  assert.ok(match, 'a .app-nav-btn with data-tab="issues" should exist');
});

test('exactly one #tab-issues top-level panel exists', () => {
  var matches = html.match(/id="tab-issues"/g) || [];
  assert.equal(matches.length, 1);
});

test('#tab-issues is a top-level sibling tab-panel, not nested inside any member panel', () => {
  var panelIds = topLevelPanels(html).map(function (p) { return p.id; });
  assert.ok(panelIds.indexOf('tab-issues') !== -1, 'tab-issues must be a top-level panel');
});

test('exactly one #issuesWorkspace mount exists, inside the Issues panel only', () => {
  var matches = html.match(/id="issuesWorkspace"/g) || [];
  assert.equal(matches.length, 1);
  assert.ok(segments['tab-issues'], 'the Issues panel segment should be found');
  assert.match(segments['tab-issues'], /id="issuesWorkspace"/);
});

test('the Issues sidebar item lives in the Staff sidebar group, immediately after Review Summaries', () => {
  var groupMatch = /<div class="app-sidebar-group">\s*<div class="app-sidebar-title">Staff<\/div>([\s\S]*?)<\/div>\s*<\/nav>/.exec(html);
  assert.ok(groupMatch, 'the Staff sidebar group markup should be found');
  var groupBody = groupMatch[1];
  var reviewIndex = groupBody.indexOf('data-tab="review-summaries"');
  var issuesIndex = groupBody.indexOf('data-tab="issues"');
  assert.notEqual(reviewIndex, -1);
  assert.notEqual(issuesIndex, -1);
  assert.ok(issuesIndex > reviewIndex, 'Issues must come after Review Summaries');
  var between = groupBody.slice(reviewIndex, issuesIndex);
  assert.equal((between.match(/<button/g) || []).length, 1, 'exactly one button (Review Summaries\' own opening tag) before Issues');
});

test('existing Review Summaries navigation item is unaffected (regression)', () => {
  var matches = html.match(/data-tab="review-summaries"/g) || [];
  assert.equal(matches.length, 1);
  assert.ok(segments['tab-review-summaries']);
});

test('existing Data (staff-data) navigation item is unaffected (regression)', () => {
  var matches = html.match(/data-tab="staff-data"/g) || [];
  assert.equal(matches.length, 1);
  assert.ok(segments['tab-staff-data']);
});

test('Mayurika/Suman/Arun/Rajiv/Paraparan member panels contain no Issues workspace mount', () => {
  ['tab-mayurika-hr', 'tab-suman-recruitment', 'tab-arun-implementation', 'tab-rajiv-blocked', 'tab-paraparan'].forEach(function (id) {
    assert.ok(segments[id], id + ' panel segment should be found');
    assert.ok(!/issuesWorkspace/.test(segments[id]), id + ' must not contain the Issues mount');
  });
});

test('the protected staff-data source path is never referenced from index.html', () => {
  assert.ok(!/member-aios\/mayurika-hr\/staff-data/.test(html));
});

// ── Stylesheet wiring ───────────────────────────────────────────────

test('css/issues.css is linked exactly once', () => {
  var matches = html.match(/href="\.\/css\/issues\.css"/g) || [];
  assert.equal(matches.length, 1);
});

// ── Data safety (Phase 15, items 41-42) ─────────────────────────────

test('index.html contains no copied reference ISSUES fixture array', () => {
  assert.ok(!/const ISSUES = \[/.test(html));
  assert.ok(!/"ticketId":\s*"ND-001"/.test(html));
});
