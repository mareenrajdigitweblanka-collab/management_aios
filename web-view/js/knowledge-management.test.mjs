/* knowledge-management.test.mjs — coverage for the Knowledge Management
   Company Documents view (REQ-KM-001, first usable implementation,
   2026-08-10).

   Reuses review-summaries-test-dom.mjs's hand-rolled DOM stand-in as-is
   (installFakeBrowserGlobals) — same convention as issues.test.mjs.
   knowledge-management.js has no fetch/network calls, but the stand-in is
   still used for every DOM-mount test for consistency with the rest of
   this repo's test suite and because document.createElement must exist.

   FIXTURE_DOCS below are TEST FIXTURES ONLY — never the real
   APPROVED_DOCUMENTS production registry (except in the one test that
   explicitly proves the production registry itself is well-formed and
   wires up correctly).

   Run with: node --test *.test.mjs (from web-view/js/) */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installFakeBrowserGlobals } from './review-summaries-test-dom.mjs';

var importCounter = 0;
function loadKmModule() {
  importCounter += 1;
  return import('./knowledge-management.js?test-instance=' + importCounter);
}

function fire(elNode, type) {
  elNode.dispatchEvent({ type: type, target: elNode, preventDefault: function () {} });
}

function withEnv(testFn) {
  return async function (t) {
    var env = installFakeBrowserGlobals();
    t.after(env.restore);
    await testFn(env);
  };
}

var FIXTURE_DOCS = [
  {
    id: 'fx-1', title: 'KPI Review Guide', team: 'Management', documentType: 'Google Sheet',
    creator: 'Alex Doe', version: '1.0', status: 'Active',
    sourceUrl: 'https://docs.google.com/spreadsheets/d/FIXTURE1/edit'
  },
  {
    id: 'fx-2', title: 'Onboarding Handbook', team: 'HR', documentType: 'Google Doc',
    creator: null, version: null, status: null,
    sourceUrl: 'https://docs.google.com/document/d/FIXTURE2/edit'
  },
  {
    id: 'fx-3', title: 'Website SOP Checklist', team: 'Website', documentType: 'PDF',
    creator: 'Bee Cee', version: '2.1', status: 'Active',
    sourceUrl: 'https://example.com/website-sop.pdf'
  },
  {
    id: 'fx-4', title: '<img src=x onerror=alert(1)> Malicious Title', team: 'Management', documentType: 'Google Sheet',
    creator: null, version: null, status: null,
    sourceUrl: 'javascript:alert(1)'
  }
];

function mountWithFixtures() {
  return loadKmModule().then(function (mod) {
    var mountEl = document.createElement('div');
    var handle = mod.mountKnowledgeManagementWorkspace(mountEl, { documents: FIXTURE_DOCS });
    return { mod: mod, mountEl: mountEl, handle: handle };
  });
}

function tableTexts(mountEl, className) {
  return mountEl.querySelectorAll(className).map(function (n) { return n.textContent; });
}

// ── Static HTML structure (index.html) — same line-anchored technique as
//    navigation-structure.test.mjs, duplicated locally (not imported —
//    importing another *.test.mjs file would re-run its own tests). ──────

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

// ── NAVIGATION (1-5) ─────────────────────────────────────────────────────

test('1. exactly one Knowledge Management sidebar item exists', () => {
  var matches = html.match(/data-tab="knowledge-management"/g) || [];
  assert.equal(matches.length, 1, 'data-tab="knowledge-management" should appear exactly once, on the nav button');
  var navMatches = html.match(/<button[^>]*data-tab="knowledge-management"/g) || [];
  assert.equal(navMatches.length, 1);
});

test('2. exactly one Knowledge Management top-level panel exists', () => {
  var matches = html.match(/id="tab-knowledge-management"/g) || [];
  assert.equal(matches.length, 1);
  var panelIds = topLevelPanels(html).map(function (p) { return p.id; });
  assert.ok(panelIds.indexOf('tab-knowledge-management') !== -1, 'must be a top-level sibling panel');
});

test('3. generic navigation opens it — real .app-nav-btn wired to the matching tab-panel id', () => {
  var btnMatch = /<button type="button" class="app-nav-btn" data-tab="knowledge-management" title="[^"]*">/.exec(html);
  assert.ok(btnMatch, 'a .app-nav-btn with data-tab="knowledge-management" should exist — the same generic mechanism navigation.js already drives every other tab through');
  var panelMatch = /<div class="tab-panel" id="tab-knowledge-management" role="tabpanel">/.exec(html);
  assert.ok(panelMatch, 'the panel id must be "tab-" + the button\'s data-tab value, matching navigation.js\'s activatePanel() convention');
});

test('4. existing Issues navigation remains functional', () => {
  assert.equal((html.match(/data-tab="issues"/g) || []).length, 1);
  assert.equal((html.match(/id="tab-issues"/g) || []).length, 1);
  assert.ok(segments['tab-issues']);
  assert.match(segments['tab-issues'], /id="issuesWorkspace"/);
});

test('5. existing Review Summaries navigation remains functional', () => {
  assert.equal((html.match(/data-tab="review-summaries"/g) || []).length, 1);
  assert.equal((html.match(/id="tab-review-summaries"/g) || []).length, 1);
  assert.ok(segments['tab-review-summaries']);
  assert.match(segments['tab-review-summaries'], /id="reviewSummariesWorkspace"/);
});

// ── DOCUMENT DISPLAY (6-13) ──────────────────────────────────────────────

test('6. approved records render — production registry is well-formed and renders in full', withEnv(async () => {
  var mod = await loadKmModule();
  assert.ok(mod.APPROVED_DOCUMENTS.length >= 3, 'at least 3 approved documents should exist per Phase 3');
  mod.APPROVED_DOCUMENTS.forEach(function (d) {
    assert.ok(d.title && d.team && d.documentType && d.sourceUrl, 'every record must have title/team/documentType/sourceUrl evidence');
  });
  var mountEl = document.createElement('div');
  mod.mountKnowledgeManagementWorkspace(mountEl);
  var rows = tableTexts(mountEl, '.msc-km-title-cell');
  assert.equal(rows.length, mod.APPROVED_DOCUMENTS.length);
}));

test('7. title renders', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var titles = tableTexts(mountEl, '.msc-km-title-cell');
  assert.ok(titles.indexOf('KPI Review Guide') !== -1);
}));

test('8. team renders', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  assert.match(mountEl.allText(), /Management/);
  assert.match(mountEl.allText(), /Website/);
}));

test('9. document type renders', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  assert.match(mountEl.allText(), /Google Sheet/);
  assert.match(mountEl.allText(), /PDF/);
}));

test('10. creator renders', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  assert.match(mountEl.allText(), /Alex Doe/);
}));

test('11. version renders', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  assert.match(mountEl.allText(), /2\.1/);
}));

test('12. status renders', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  assert.match(mountEl.allText(), /Active/);
}));

test('13. unknown optional metadata safely renders as —', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var dashes = tableTexts(mountEl, '.msc-km-dash');
  assert.ok(dashes.length > 0, 'fixture fx-2 has null creator/version/status — each must render as a dash, never blank');
  dashes.forEach(function (d) { assert.equal(d, '—'); });
}));

// ── SEARCH (14-18) ───────────────────────────────────────────────────────

test('14. empty search returns all documents', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.searchByTitle(FIXTURE_DOCS, '').length, FIXTURE_DOCS.length);
  assert.equal(mod.searchByTitle(FIXTURE_DOCS, '   ').length, FIXTURE_DOCS.length);
}));

test('15. exact title search', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.searchByTitle(FIXTURE_DOCS, 'KPI Review Guide');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-1');
}));

test('16. partial title search', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.searchByTitle(FIXTURE_DOCS, 'onboard');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-2');
}));

test('17. case-insensitive search', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.searchByTitle(FIXTURE_DOCS, 'KPI REVIEW guide');
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-1');
}));

test('18. no-match search produces empty state', withEnv(async () => {
  var mod = await loadKmModule();
  var { mountEl } = await mountWithFixtures();
  var searchInput = mountEl.querySelector('.msc-km-search-input');
  searchInput.value = 'no such document anywhere';
  fire(searchInput, 'input');
  var empty = mountEl.querySelector('.msc-km-empty');
  assert.ok(empty, 'empty-state element should be rendered');
  assert.equal(empty.textContent, mod.EMPTY_STATE_TEXT);
  assert.equal(empty.textContent, 'No documents match your search or filters.');
  assert.equal(tableTexts(mountEl, '.msc-km-title-cell').length, 0);
}));

// ── TEAM FILTER (19-20) ──────────────────────────────────────────────────

test('19. team filter — All works', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.filterDocuments(FIXTURE_DOCS, { team: 'all' });
  assert.equal(result.length, FIXTURE_DOCS.length);
}));

test('20. team filter — specific Team works', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.filterDocuments(FIXTURE_DOCS, { team: 'HR' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-2');
}));

// ── DOCUMENT TYPE FILTER (21-22) ─────────────────────────────────────────

test('21. document type filter — All works', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.filterDocuments(FIXTURE_DOCS, { documentType: 'all' });
  assert.equal(result.length, FIXTURE_DOCS.length);
}));

test('22. document type filter — specific Document Type works', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.filterDocuments(FIXTURE_DOCS, { documentType: 'PDF' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-3');
}));

// ── COMBINED FILTERING (23-26) ───────────────────────────────────────────

test('23. search + team works', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.filterDocuments(FIXTURE_DOCS, { search: 'kpi', team: 'Management' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-1');
}));

test('24. search + type works', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.filterDocuments(FIXTURE_DOCS, { search: 'onboarding', documentType: 'Google Doc' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-2');
}));

test('25. team + type works', withEnv(async () => {
  var mod = await loadKmModule();
  // Both fx-1 and fx-4 are team=Management/documentType=Google Sheet.
  var result = mod.filterDocuments(FIXTURE_DOCS, { team: 'Management', documentType: 'Google Sheet' });
  assert.equal(result.length, 2);
}));

test('26. search + team + type works (all three conditions narrow to one)', withEnv(async () => {
  var mod = await loadKmModule();
  var result = mod.filterDocuments(FIXTURE_DOCS, { search: 'KPI', team: 'Management', documentType: 'Google Sheet' });
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'fx-1');
}));

// ── OPEN DOCUMENT (27-30) ────────────────────────────────────────────────

test('27. Open Document link uses the correct URL', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var link = mountEl.querySelector('.msc-km-open-link');
  assert.ok(link);
  assert.equal(link.getAttribute('href'), 'https://docs.google.com/spreadsheets/d/FIXTURE1/edit');
}));

test('28. Open Document link uses target=_blank', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var link = mountEl.querySelector('.msc-km-open-link');
  assert.equal(link.getAttribute('target'), '_blank');
}));

test('29. Open Document link rel contains noopener', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var link = mountEl.querySelector('.msc-km-open-link');
  assert.match(link.getAttribute('rel'), /noopener/);
}));

test('30. Open Document link rel contains noreferrer', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var link = mountEl.querySelector('.msc-km-open-link');
  assert.match(link.getAttribute('rel'), /noreferrer/);
}));

// ── SAFETY (31-35) ───────────────────────────────────────────────────────

test('31. HTML-like document title renders as text, never interpreted as markup', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var titles = tableTexts(mountEl, '.msc-km-title-cell');
  assert.ok(titles.indexOf('<img src=x onerror=alert(1)> Malicious Title') !== -1, 'the raw literal string must appear as text content');
}));

test('32. no upload control exists', withEnv(async (env) => {
  await mountWithFixtures();
  var hasFileInput = env.document._all.some(function (n) { return n.tagName === 'INPUT' && n.type === 'file'; });
  assert.equal(hasFileInput, false);
}));

test('33. no document edit control exists', withEnv(async (env) => {
  await mountWithFixtures();
  var hasEditControl = env.document._all.some(function (n) {
    return (n.tagName === 'BUTTON' || n.tagName === 'A') && /\bedit\b/i.test(n.textContent || '');
  });
  assert.equal(hasEditControl, false);
}));

test('34. no delete control exists', withEnv(async (env) => {
  await mountWithFixtures();
  var hasDeleteControl = env.document._all.some(function (n) {
    return (n.tagName === 'BUTTON' || n.tagName === 'A') && /\bdelete\b/i.test(n.textContent || '');
  });
  assert.equal(hasDeleteControl, false);
}));

test('35. no fake ownership-verification control exists', withEnv(async (env) => {
  await mountWithFixtures();
  var hasOwnershipControl = env.document._all.some(function (n) {
    return /owner access|ownership/i.test(n.textContent || '');
  });
  assert.equal(hasOwnershipControl, false);
}));

test('35b. isSafeHttpUrl rejects javascript: and only accepts http/https', withEnv(async () => {
  var mod = await loadKmModule();
  assert.equal(mod.isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(mod.isSafeHttpUrl('https://example.com'), true);
  assert.equal(mod.isSafeHttpUrl('http://example.com'), true);
  assert.equal(mod.isSafeHttpUrl(''), false);
  assert.equal(mod.isSafeHttpUrl(null), false);
}));

test('35c. an unsafe sourceUrl renders as a dash, never as a clickable Open Document link', withEnv(async () => {
  var { mountEl } = await mountWithFixtures();
  var rows = mountEl.querySelectorAll('.msc-km-open-link');
  // Only 3 of the 4 fixtures have a safe http(s) URL — fx-4 uses javascript:.
  assert.equal(rows.length, 3);
}));

// ── REGRESSION (36-38) ───────────────────────────────────────────────────

test('36. Issues remains unaffected by this change', () => {
  assert.ok(segments['tab-issues'], 'the Issues panel segment should still be found');
  assert.match(segments['tab-issues'], /msc-issues-workspace/);
  assert.ok(!/knowledgeManagementWorkspace/.test(segments['tab-issues']), 'Knowledge Management must not be nested inside Issues');
});

test('37. Review Summaries remains unaffected by this change', () => {
  assert.ok(segments['tab-review-summaries'], 'the Review Summaries panel segment should still be found');
  assert.equal((html.match(/id="reviewSummariesWorkspace"/g) || []).length, 1);
  assert.ok(!/knowledgeManagementWorkspace/.test(segments['tab-review-summaries']));
});

test('38. Calendar remains unaffected by this change', () => {
  var matches = html.match(/class="msc-instance"/g) || [];
  assert.equal(matches.length, 5, 'all 5 Task/Leave/Calendar member mounts must remain untouched');
});
