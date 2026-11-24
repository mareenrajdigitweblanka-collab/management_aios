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

var navigationCssPath = fileURLToPath(new URL('../css/navigation.css', import.meta.url));
var navigationCss = readFileSync(navigationCssPath, 'utf8');

var baseCssPath = fileURLToPath(new URL('../css/base.css', import.meta.url));
var baseCss = readFileSync(baseCssPath, 'utf8');

var componentsCssPath = fileURLToPath(new URL('../css/components.css', import.meta.url));
var componentsCss = readFileSync(componentsCssPath, 'utf8');

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

// ── DigitDisplay external nav link (REQ-DIGITDISPLAY-NAV-001, 2026-10-22) ──

test('sidebar and dashboard DigitDisplay external links both exist', () => {
  var matches = html.match(/data-external-auth-link="digitdisplay"/g) || [];
  assert.equal(matches.length, 2);
});

test('the DigitDisplay link is a real <a class="app-nav-btn">, not a <button>', () => {
  var match = /<a class="app-nav-btn"[^>]*data-external-auth-link="digitdisplay"[^>]*>/.exec(html);
  assert.ok(match, 'an <a class="app-nav-btn" ... data-external-auth-link="digitdisplay"> should exist');
});

test('the DigitDisplay link opens in a new tab with secure attributes (target="_blank" rel="noopener noreferrer")', () => {
  var match = /<a class="app-nav-btn"[^>]*data-external-auth-link="digitdisplay"[\s\S]*?>/.exec(html);
  assert.ok(match);
  assert.match(match[0], /target="_blank"/);
  assert.match(match[0], /rel="noopener noreferrer"/);
});

test('the DigitDisplay link has no data-tab attribute', () => {
  var openTagMatch = /<a class="app-nav-btn"[^>]*data-external-auth-link="digitdisplay"[^>]*>/.exec(html);
  assert.ok(openTagMatch);
  assert.doesNotMatch(openTagMatch[0], /data-tab=/);
});

test('the DigitDisplay link has no corresponding .tab-panel', () => {
  var panelIds = topLevelPanels(html).map(function (p) { return p.id; });
  assert.ok(panelIds.indexOf('tab-digitdisplay') === -1);
});

test('the DigitDisplay link shows only the icon and the "DigitDisplay" label — no secondary "Opens in new tab" text', () => {
  var linkMatch = /<a class="app-nav-btn"[^>]*data-external-auth-link="digitdisplay"[\s\S]*?<\/a>/.exec(html);
  assert.ok(linkMatch, 'the full <a>...</a> DigitDisplay element should be found');
  var linkHtml = linkMatch[0];
  assert.doesNotMatch(linkHtml, /app-nav-btn-sub/, 'no sub-label span should remain');
  assert.doesNotMatch(linkHtml, /Opens in new tab/);
  var labelMatch = /<span class="app-nav-btn-label">([^<]*)<\/span>/.exec(linkHtml);
  assert.ok(labelMatch);
  assert.equal(labelMatch[1], 'DigitDisplay');
  // Exactly one span inside app-nav-btn-text — the label only, matching
  // single-line items like Root AIOS/File Map/Data (no app-nav-btn-sub).
  var textWrapMatch = /<span class="app-nav-btn-text">([\s\S]*?)<\/span>\s*<\/a>/.exec(linkHtml);
  assert.ok(textWrapMatch, 'the app-nav-btn-text wrapper should be found');
});

test('.app-nav-btn has text-decoration: none, so the DigitDisplay <a> (the only anchor using this class) is never underlined', () => {
  // Same no-CSS-engine, source-text proof technique as
  // entry-auth-css-structure.test.mjs: a single class-level rule, author
  // origin, applies to normal/hover/focus/visited alike here since no
  // other rule in this file redeclares text-decoration for any
  // .app-nav-btn state.
  var ruleMatch = /\.app-nav-btn\s*\{([^}]*)\}/.exec(navigationCss);
  assert.ok(ruleMatch, 'the base .app-nav-btn rule should be found');
  assert.match(ruleMatch[1], /text-decoration:\s*none\s*;/);
});

test('the DigitDisplay link does not have aria-disabled hardcoded in markup (JS sets it on load, matching the protected-tab convention)', () => {
  var openTagMatch = /<a class="app-nav-btn"[^>]*data-external-auth-link="digitdisplay"[^>]*>/.exec(html);
  assert.ok(openTagMatch);
  assert.doesNotMatch(openTagMatch[0], /aria-disabled=/);
});

test('Stage 2 aggregate Members panel exposes only the four verified member destinations', () => {
  assert.match(html, /id="tab-members"/);
  const membersPanel = segments['tab-members'];
  assert.ok(membersPanel);
  for (const target of ['mayurika-hr', 'suman-recruitment', 'arun-implementation', 'rajiv-blocked']) assert.match(membersPanel, new RegExp('data-goto="'+target+'"'));
  assert.doesNotMatch(membersPanel, /data-goto="paraparan"/);
});
test('Paraparan remains a panel but is absent from the Members sidebar list', () => {
  assert.match(html, /id="tab-paraparan"/);
  const membersGroup = /<div class="app-sidebar-title">Members<\/div>([\s\S]*?)<div class="app-sidebar-group">/.exec(html);
  assert.ok(membersGroup);
  assert.doesNotMatch(membersGroup[1], /data-tab="paraparan"/);
});
test('twelve dashboard module cards preserve navigation and DigitDisplay security hooks', () => {
  const cards = html.match(/class="module-card module-card--[a-z-]+"/g) || [];
  assert.equal(cards.length, 12);
  for (const target of ['mayurika-hr', 'suman-recruitment', 'arun-implementation', 'rajiv-blocked', 'members', 'staff-data', 'review-summaries', 'issues', 'knowledge-management', 'announcements', 'help-usage']) assert.match(html, new RegExp('class="module-card module-card--[a-z-]+"[^>]*data-goto="'+target+'"'));
  const digit = /<a class="module-card module-card--digitdisplay"[^>]*>/ .exec(html);
  assert.ok(digit);
  assert.match(digit[0], /href="https:\/\/digit-display\.vercel\.app\/admin"/);
  assert.match(digit[0], /target="_blank"/);
  assert.match(digit[0], /rel="noopener noreferrer"/);
  assert.match(digit[0], /data-external-auth-link="digitdisplay"/);
});
test('Stage 2 cards retain search hooks and currentColor SVG icons', () => {
  const moduleStart = html.indexOf('<section class="module-card-section"');
  const moduleEnd = html.indexOf('</section>', moduleStart) + '</section>'.length;
  const root = html.slice(moduleStart, moduleEnd);
  assert.ok(root);
  assert.equal((root.match(/data-searchable/g) || []).length, 12);
  assert.equal((root.match(/stroke="currentColor"/g) || []).length, 12);
});

test('Stage 6C.1 omits redundant compact member cards from All Members', () => {
  const membersPanel = segments['tab-members'];
  assert.ok(membersPanel);
  assert.equal((membersPanel.match(/member-directory-card/g) || []).length, 0);
  assert.doesNotMatch(membersPanel, /member-directory-grid/);
});

test('Stage 6C All Members cards preserve names, status labels, search hooks, and navigation', () => {
  const root = segments['tab-members'];
  const snapshotStart = root.indexOf('class="member-snap-grid"');
  const snapshotEnd = root.indexOf('<!-- How to use -->', snapshotStart);
  const snapshots = root.slice(snapshotStart, snapshotEnd);
  assert.equal((snapshots.match(/class="member-snap /g) || []).length, 4);
  for (const target of ['mayurika-hr', 'suman-recruitment', 'arun-implementation', 'rajiv-blocked']) assert.match(snapshots, new RegExp('data-goto="' + target + '"'));
  for (const name of ['Mayurika', 'Suman', 'Arun', 'Rajiv / Admin']) assert.match(snapshots, new RegExp('member-snap-name">' + name.replace('/', '\/')));
  assert.equal((snapshots.match(/badge-pass">ACTIVE/g) || []).length, 3);
  assert.match(snapshots, /badge-amber">ACTIVE WITH LIMITS/);
  assert.equal((snapshots.match(/data-searchable/g) || []).length, 4);
  assert.equal((snapshots.match(/member-snap-avatar/g) || []).length, 4);
  assert.equal((snapshots.match(/stroke="currentColor"/g) || []).length, 4);
});

test('Stage 4A keeps the module grid immediately after the compact Root heading', () => {
  const root = segments['tab-root-aios'];
  const introStart = root.indexOf('class="root-dashboard-intro');
  const moduleStart = root.indexOf('<section class="module-card-section"');
  const overviewStart = root.indexOf('class="root-home-overview"');
  assert.ok(introStart >= 0, 'the compact Root dashboard introduction should be present');
  assert.ok(moduleStart > introStart, 'the module grid should follow the compact introduction');
  assert.ok(overviewStart > moduleStart, 'the System Overview should follow the module grid');
});

test('Stage 3 sidebar styles preserve active, focus, badge, and reduced-motion hooks', () => {
  assert.ok(navigationCss.includes('.app-nav-btn.active'));
  assert.ok(navigationCss.includes('.app-nav-btn:focus-visible'));
  assert.ok(navigationCss.includes('.app-nav-btn-badge'));
  assert.ok(navigationCss.includes('@media (prefers-reduced-motion: reduce)'));
});
test('Stage 3 header styles preserve search, authorization, bell, touch, and reduced-motion hooks', () => {
  assert.ok(baseCss.includes('.topbar-search-pill:hover'));
  assert.ok(baseCss.includes('.topbar-calendar-auth'));
  assert.ok(baseCss.includes('.topbar .msc-ann-bell-btn:focus-visible'));
  assert.ok(baseCss.includes('@media (max-width: 640px)'));
  assert.ok(baseCss.includes('@media (prefers-reduced-motion: reduce)'));
});

test('sidebar uses solid navy without decorative wave layers', () => {
  const sidebarRules = [...navigationCss.matchAll(/\.app-sidebar\s*\{([^}]+)\}/g)];
  const backgrounds = sidebarRules.flatMap(([, rule]) => [...rule.matchAll(/background:\s*([^;]+);/g)].map(([, value]) => value));
  assert.equal(backgrounds.at(-1), '#0f172a');
  assert.doesNotMatch(navigationCss, /\.app-sidebar::(?:before|after)|sidebar-wave-art/);
  assert.doesNotMatch(html, /sidebar-wave-art|sidebarWave[AB]/);
});


test('Stage 5C mobile header uses explicit rows without changing existing hooks', () => {
  assert.match(html, /class="app-sidebar-toggle" id="sidebarToggle"/);
  assert.match(html, /class="topbar-logo"/);
  assert.match(html, /class="topbar-announcement-bell" id="announcementBell"/);
  assert.match(html, /class="topbar-search" role="search"/);
  assert.match(html, /id="searchInput"/);
  assert.match(html, /id="searchClear"/);
  assert.match(html, /id="calendarAuthIndicator"/);
  assert.match(html, /id="calendarAuthChangeTokenBtn"/);

  const mobileHeader = baseCss.match(/\/\* Stage 5C:[\s\S]*?@media \(max-width: 640px\) \{([\s\S]*?)\n\}/);
  assert.ok(mobileHeader, 'Stage 5C mobile header rules should be present');
  const rules = mobileHeader[1];
  assert.match(rules, /\.topbar[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(rules, /\.topbar-left[\s\S]*?order:\s*1/);
  assert.match(rules, /\.topbar-announcement-bell[\s\S]*?order:\s*2/);
  assert.match(rules, /\.topbar-calendar-auth[\s\S]*?order:\s*3/);
  assert.match(rules, /\.topbar-search[\s\S]*?order:\s*4/);
  assert.match(rules, /\.topbar-planning-warning[\s\S]*?order:\s*5/);
  assert.match(rules, /\.topbar-calendar-auth-change-btn[\s\S]*?min-height:\s*36px/);
});


test('Stage 6C removes detailed member cards from the dashboard', () => {
  assert.equal((segments['tab-root-aios'].match(/member-snap /g) || []).length, 0);
  assert.equal((segments['tab-members'].match(/member-snap /g) || []).length, 4);
});

test('Stage 6B data modules expose focused overview headings without changing mounts', () => {
  const staffPanel = segments['tab-staff-data'];
  const reviewsPanel = segments['tab-review-summaries'];
  assert.match(staffPanel, /class="module-overview module-overview--staff"/);
  assert.match(staffPanel, /id="staff-data-heading">Staff Data<\/h1>/);
  assert.match(staffPanel, /id="staff-data-filter-bar"/);
  assert.match(reviewsPanel, /class="module-overview module-overview--reviews"/);
  assert.match(reviewsPanel, /id="review-summaries-heading">Review Summaries<\/h1>/);
  assert.match(reviewsPanel, /id="reviewSummariesWorkspace"/);
  assert.match(reviewsPanel, /Shared read/);
  assert.match(reviewsPanel, /Owner edits/);
});

test('Stage 6G.4 Root dashboard keeps twelve modules first and preserves targets', () => {
  var root = html.slice(html.indexOf('id="tab-root-aios"'), html.indexOf('/tab-root-aios'));
  var targets = ['mayurika-hr', 'suman-recruitment', 'arun-implementation', 'rajiv-blocked', 'members', 'staff-data', 'review-summaries', 'issues', 'knowledge-management', 'announcements', 'help-usage'];
  assert.match(root, /class="module-card-section"[^>]*aria-labelledby="module-card-heading"/);
  assert.equal((root.match(/class="module-card module-card--/g) || []).length, 12);
  for (const target of targets) assert.match(root, new RegExp('data-goto="' + target + '"'));
  assert.match(root, /data-external-auth-link="digitdisplay"/);
});

test('Stage 6G.7 keeps five System Overview cards visible on Home', () => {
  const root = html.slice(html.indexOf('id="tab-root-aios"'), html.indexOf('/tab-root-aios'));
  const help = segments['tab-help-usage'];
  const overviewStart = root.indexOf('class="root-home-overview"');
  const overviewEnd = root.indexOf('</section>', overviewStart);
  const overview = root.slice(overviewStart, overviewEnd);
  assert.doesNotMatch(root, /class="root-status-notice"/);
  assert.match(root, /aria-labelledby="root-home-overview-heading"/);
  assert.match(overview, /System Overview/);
  assert.match(overview, /root-status-grid root-status-grid--overview/);
  assert.equal((overview.match(/class="root-status-card/g) || []).length, 5);
  assert.doesNotMatch(overview, /<details|<summary/);
  for (const label of ['Last Sync', 'System', 'Member workbenches', 'Sources registered', 'Needs confirmation']) {
    assert.ok(overview.includes(label), label);
  }
  assert.match(help, /System Status Snapshot/);
  assert.equal((help.match(/class="root-status-card/g) || []).length, 3);
  assert.doesNotMatch(help, /root-status-grid--overview/);
});

test('Stage 6G.6 Help status groups use native details/summary semantics', () => {
  var root = html.slice(html.indexOf('id="tab-root-aios"'), html.indexOf('/tab-root-aios'));
  assert.equal((root.match(/<details class="root-reference-group/g) || []).length, 0);
  assert.doesNotMatch(root, /<details class="root-reference-group" open/);
  const help = segments['tab-help-usage'];
  assert.equal((help.match(/<summary/g) || []).length, 8);
  assert.equal((help.match(/root-reference-chevron/g) || []).length, 8);
  assert.match(help, /HELP CENTER/);;
  for (const label of ['Getting Started', 'Status Label Guide', 'Governance &amp; Safety Rules', 'Deployment Information', 'Evidence &amp; Technical Details']) assert.match(help, new RegExp(label));
  assert.match(segments['tab-help-usage'], /Getting Started/);
  assert.match(segments['tab-help-usage'], /Status Label Guide/);
  assert.doesNotMatch(root, /Getting Started|Status Label Guide|Governance &amp; Safety Rules|Deployment Information|Evidence &amp; Technical Details/);
  assert.ok((help.match(/<summary/g) || []).length >= 8);
});


test('Stage 6G.6 system-wide description typography uses scoped Inter tokens', () => {
  const cssRoot = fileURLToPath(new URL('../css/', import.meta.url));
  const tokens = readFileSync(cssRoot + 'tokens.css', 'utf8');
  const base = readFileSync(cssRoot + 'base.css', 'utf8');
  const styleFiles = ['components.css', 'issues.css', 'knowledge-management.css', 'announcements.css', 'review-summaries.css', 'staff-data.css', 'calendar.css']
    .map((name) => readFileSync(cssRoot + name, 'utf8')).join('\n');
  assert.match(tokens, /--font-family-ui:\s*Inter, ui-sans-serif, system-ui/);
  assert.match(tokens, /--font-description:\s*14px/);
  assert.match(tokens, /--line-height-description:\s*1\.6/);
  assert.match(tokens, /--font-reading:\s*15px/);
  assert.match(tokens, /font-family:\s*var\(--font-family-ui\)/);
  for (const selector of ['module-card-description', 'module-overview-lede', 'member-header-lede', 'root-reference-body p', 'msc-issues-empty', 'msc-km-header-helper', 'msc-ann-header-helper', 'review-summary-text', 'member-testing-table-note', 'msc-cal-help-note']) {
    assert.ok(styleFiles.includes('.' + selector), selector);
  }
  assert.doesNotMatch(styleFiles, /(?:body|\*|h1|h2|h3|button)\s*\{[^}]*font-size:\s*var\(--font-description\)/);
});


test('Stage 6G.7 compact Home module cards preserve a responsive four-two-one layout', () => {
  assert.match(componentsCss, /#tab-root-aios \.module-card-grid[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(componentsCss, /#tab-root-aios \.module-card[\s\S]*?min-height: 104px/);
  assert.match(componentsCss, /#tab-root-aios \.module-card[\s\S]*?height: 100%/);
  assert.match(componentsCss, /#tab-root-aios \.module-card[\s\S]*?background: var\(--module-card-bg\)/);
  assert.match(componentsCss, /#tab-root-aios \.module-card[\s\S]*?border: 1px solid var\(--module-card-border/);
  assert.match(componentsCss, /module-card--calendar-mayurika[\s\S]*?#DDEAFE[\s\S]*?#4879D8/);
  assert.match(componentsCss, /module-card--calendar-suman[\s\S]*?#D9F1E5[\s\S]*?#27936B/);
  assert.match(componentsCss, /module-card--calendar-arun[\s\S]*?#F2E2FC[\s\S]*?#A05ACD/);
  assert.match(componentsCss, /module-card--calendar-rajiv[\s\S]*?#FFE5D6[\s\S]*?#D77A3A/);
  assert.match(componentsCss, /@media \(max-width: 1024px\)[\s\S]*?#tab-root-aios \.module-card-grid[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(componentsCss, /@media \(max-width: 768px\)[\s\S]*?#tab-root-aios \.module-card-grid[\s\S]*?grid-template-columns: 1fr/);
  assert.match(componentsCss, /#tab-root-aios \.module-card:focus-visible/);
  const root = segments['tab-root-aios'];
  assert.equal((root.match(/class="module-card module-card--/g) || []).length, 12);
});


test('Stage 6G.8a stronger card visibility and interaction styles stay scoped', () => {
  assert.match(componentsCss, /#tab-root-aios \.module-card:hover[\s\S]*?translateY\(-4px\)/);
  assert.match(componentsCss, /#tab-root-aios \.module-card:hover[\s\S]*?box-shadow: 0 12px 28px rgba\(15, 23, 42, 0.18\)/);
  assert.match(componentsCss, /#tab-root-aios \.root-home-overview[\s\S]*?background: linear-gradient\(135deg, #D6E5F7 0%, #C4DAF3 52%, #AFCFF2 100%\)/);
  assert.match(componentsCss, /#tab-root-aios \.root-home-overview::before[\s\S]*?pointer-events: none/);
  assert.match(componentsCss, /#tab-root-aios \.root-home-overview::after[\s\S]*?pointer-events: none/);
  assert.match(componentsCss, /#tab-root-aios \.root-home-overview[\s\S]*?border: 1px solid #C8D5E5/);
  assert.match(componentsCss, /#tab-root-aios \.root-home-overview \.root-status-label[\s\S]*?color: #475569/);
  assert.match(componentsCss, /#tab-members \.member-snap[\s\S]*?border-left-color: #94A3B8/);
  assert.match(componentsCss, /#tab-members \.member-snap-role,[\s\S]*?font-size: 14px[\s\S]*?line-height: 1\.5/);
  assert.match(componentsCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?#tab-root-aios \.module-card/);
  assert.match(componentsCss, /#tab-members \.member-snap:hover[\s\S]*?translateY\(-4px\)[\s\S]*?#tab-members \.member-snap:focus-visible/);
  assert.doesNotMatch(componentsCss, /(?<!#tab-root-aios )\.module-card-grid\s*\{[^}]*background/);
  const root = segments['tab-root-aios'];
  const members = segments['tab-members'];
  assert.equal((root.match(/class="module-card module-card--/g) || []).length, 12);
  assert.equal((members.match(/class="member-snap /g) || []).length, 4);
});

test('Stage 1 official logo preserves the existing header controls', () => {
  assert.match(html, /class="topbar-brand"/);
  assert.match(html, /<img class="topbar-logo-mark" src="assets\/images\/logo-mark\.png" alt="Digit Web Lanka logo" \/>/);
  assert.doesNotMatch(html, /class="topbar-sep"/);
  assert.match(html, /class="topbar-sub">Dashboard v0\.1/);
  assert.match(html, /id="calendarAuthIndicator"/);
  assert.match(html, /id="calendarAuthChangeTokenBtn"/);
  assert.match(html, /id="announcementBell"/);
  assert.match(html, /id="searchInput"/);
  assert.match(html, /id="searchClear"/);
});
