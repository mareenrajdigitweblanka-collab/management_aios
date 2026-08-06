/* navigation-structure.test.mjs — automated coverage for the dedicated
   Review Summaries tab's navigation structure (REQ-CAL-REV-TAB-002,
   web-view/index.html).

   This repo has no npm dependencies and no HTML-parsing library is
   available (same constraint documented throughout review-summaries.test.mjs
   and calendar/auth.test.mjs), and no prior test file parses index.html at
   all — the mount/heading/order facts for this feature were previously
   verified only by ad hoc shell grep, which is not committed, repeatable
   test coverage. This file closes that gap with a small, purpose-built,
   line-anchored structural extraction of the real index.html source (not
   a synthetic DOM stand-in) — precise enough to prove genuine sibling
   structure (not just substring presence), without needing a full HTML
   parser.

   Key technique: every top-level `.tab-panel` element in index.html is
   consistently indented with exactly 4 spaces
   (`    <div class="tab-panel...`); every nested element inside one is
   indented 6+ spaces. Matching that exact indentation, anchored to the
   start of a line, reliably extracts ONLY the 9 top-level panel open tags
   in document order — never a nested `.tab-panel`-adjacent string
   elsewhere in a comment or attribute. The byte range between one
   top-level panel's open tag and the next (or end of file, for the last)
   is that panel's own content — used to prove per-panel mount absence and
   that the dedicated panel is a true sibling, not descendant, of any
   member panel.

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

/* Returns {id -> substring} — each panel's own content, bounded by the
   next top-level panel's start (or end of file for the last one). Two
   top-level panels can never overlap by construction (regex matches are
   non-overlapping and ordered), so this boundary is exact. */
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

test('sidebar section heading is Staff', () => {
  var match = /<div class="app-sidebar-group">\s*<div class="app-sidebar-title">([^<]*)<\/div>\s*<button[^>]*data-tab="staff-data"/.exec(html);
  assert.ok(match, 'the sidebar group containing the Data nav button should be found');
  assert.equal(match[1], 'Staff');
});

test('Staff Data label has become Data', () => {
  var buttonMatch = /<button[^>]*data-tab="staff-data"[\s\S]*?<\/button>/.exec(html);
  assert.ok(buttonMatch, 'the staff-data nav button should be found');
  var labelMatch = /<span class="app-nav-btn-label">([^<]*)<\/span>/.exec(buttonMatch[0]);
  assert.ok(labelMatch);
  assert.equal(labelMatch[1], 'Data');
});

test('Review Summaries immediately follows Data in the STAFF sidebar section', () => {
  var groupMatch = /<div class="app-sidebar-group">\s*<div class="app-sidebar-title">Staff<\/div>([\s\S]*?)<\/div>\s*<\/nav>/.exec(html);
  assert.ok(groupMatch, 'the Staff sidebar group markup should be found');
  var groupBody = groupMatch[1];
  var dataIndex = groupBody.indexOf('data-tab="staff-data"');
  var reviewIndex = groupBody.indexOf('data-tab="review-summaries"');
  assert.notEqual(dataIndex, -1, 'the Data button should be inside the Staff group');
  assert.notEqual(reviewIndex, -1, 'the Review Summaries button should be inside the Staff group');
  assert.ok(reviewIndex > dataIndex, 'Review Summaries must come after Data');
  // "Immediately follows" — no other nav button between them.
  var between = groupBody.slice(dataIndex, reviewIndex);
  assert.equal((between.match(/<button/g) || []).length, 1, 'exactly one button (Data\'s own opening tag) should appear before Review Summaries — nothing else in between');
});

test('Data precedes Review Summaries in document order', () => {
  var dataIndex = html.indexOf('data-tab="staff-data"');
  var reviewIndex = html.indexOf('data-tab="review-summaries"');
  assert.ok(dataIndex !== -1 && reviewIndex !== -1);
  assert.ok(dataIndex < reviewIndex);
});

test('exactly one Review Summaries navigation item exists', () => {
  var matches = html.match(/data-tab="review-summaries"/g) || [];
  assert.equal(matches.length, 1);
});

test('the navigation item targets review-summaries via a real .app-nav-btn', () => {
  var match = /<button type="button" class="app-nav-btn" data-tab="review-summaries" title="[^"]*">/.exec(html);
  assert.ok(match, 'a .app-nav-btn with data-tab="review-summaries" should exist');
});

test('exactly one #tab-review-summaries panel exists', () => {
  var matches = html.match(/id="tab-review-summaries"/g) || [];
  assert.equal(matches.length, 1);
});

test('exactly one #reviewSummariesWorkspace mount exists', () => {
  var matches = html.match(/id="reviewSummariesWorkspace"/g) || [];
  assert.equal(matches.length, 1);
});

test('zero .review-summaries-instance mounts exist anywhere in the document', () => {
  var matches = html.match(/review-summaries-instance/g) || [];
  assert.equal(matches.length, 0);
});

test('Mayurika panel contains no Review Summary mount', () => {
  assert.ok(segments['tab-mayurika-hr'], 'the Mayurika panel segment should be found');
  assert.ok(!/reviewSummariesWorkspace|review-summaries-instance/.test(segments['tab-mayurika-hr']));
});

test('Suman panel contains no Review Summary mount', () => {
  assert.ok(segments['tab-suman-recruitment']);
  assert.ok(!/reviewSummariesWorkspace|review-summaries-instance/.test(segments['tab-suman-recruitment']));
});

test('Arun panel contains no Review Summary mount', () => {
  assert.ok(segments['tab-arun-implementation']);
  assert.ok(!/reviewSummariesWorkspace|review-summaries-instance/.test(segments['tab-arun-implementation']));
});

test('Rajiv panel contains no Review Summary mount', () => {
  assert.ok(segments['tab-rajiv-blocked']);
  assert.ok(!/reviewSummariesWorkspace|review-summaries-instance/.test(segments['tab-rajiv-blocked']));
});

test('Paraparan panel contains no Review Summary mount', () => {
  assert.ok(segments['tab-paraparan']);
  assert.ok(!/reviewSummariesWorkspace|review-summaries-instance/.test(segments['tab-paraparan']));
});

test('the dedicated panel is a top-level sibling tab-panel, not nested inside any member panel', () => {
  // Proven two ways: (1) #tab-review-summaries itself is one of the
  // top-level (4-space-indented) panel matches, i.e. a sibling of the 5
  // member panels and Data/Root AIOS/File Map — not a descendant found
  // only via a nested/deeper-indented match; (2) the mount id
  // (reviewSummariesWorkspace) appears inside the tab-review-summaries
  // segment and inside NO other panel's segment (already individually
  // confirmed by the five "contains no Review Summary mount" tests above
  // — this test additionally confirms the positive case, that it DOES
  // appear inside its own segment, so the absence checks above are not
  // vacuously true from a parsing failure).
  var panelIds = topLevelPanels(html).map(function (p) { return p.id; });
  assert.ok(panelIds.indexOf('tab-review-summaries') !== -1, 'tab-review-summaries must be a top-level panel');
  assert.ok(segments['tab-review-summaries'], 'the dedicated panel segment should be found');
  assert.match(segments['tab-review-summaries'], /id="reviewSummariesWorkspace"/);
});

test('all 5 Task/Leave/Calendar (.msc-instance) member mounts remain present and untouched', () => {
  var matches = html.match(/class="msc-instance"/g) || [];
  assert.equal(matches.length, 5, 'removing the Review Summary mounts must not have touched the unrelated Calendar mounts');
});
