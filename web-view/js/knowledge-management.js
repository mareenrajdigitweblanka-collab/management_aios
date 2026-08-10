/* knowledge-management.js — Knowledge Management workspace, Company
   Documents view (REQ-KM-001, first usable implementation, 2026-08-10).

   Deliberately narrow: this is the first slice of the Knowledge Management
   SRD (docs/knowledge-management-discovery-2026-08-10.md), not the full
   module. It has NO backend, NO PostgreSQL table, NO file upload, NO
   Google ownership verification, NO version-history workflow, NO audit
   log, NO soft-delete workflow, NO AI features of any kind. See
   docs/knowledge-management-company-documents-requirement-2026-08-10.md
   for the full scope boundary.

   APPROVED_DOCUMENTS below is a small, hand-verified frontend registry —
   an interim index only, explicitly NOT the permanent Knowledge Management
   database model (that remains [VERIFY] pending the six Phase-0 decisions
   recorded in the discovery report). Every record's title/team/document
   type/creator/version/status/sourceUrl traces to real evidence found in
   this repository's already-registered stakeholder documents — nothing
   here is invented. Unproven optional fields (creator/version/status) are
   `null`, rendered as "—" (dashOrText below), never guessed. Full source
   evidence for each record is recorded in
   docs/knowledge-management-company-documents-requirement-2026-08-10.md.

   Built via createElement/appendChild with textContent for every
   document-authored field (never innerHTML for untrusted text) — same
   convention as issues.js/review-summaries.js — so a document title can
   never be interpreted as markup. sourceUrl is validated (isSafeHttpUrl)
   before ever being used as an href — only http:// or https:// URLs are
   ever rendered as an Open Document link.

   Mounted exactly once, inside the independent #tab-knowledge-management
   panel (web-view/index.html) — a sibling of #tab-issues and
   #tab-review-summaries, never nested inside any Management Team member
   panel. */

// ── Approved document registry (interim frontend index — see header) ────

export var APPROVED_DOCUMENTS = [
  {
    id: 'km-001',
    title: '996 Project Management — Follow-up Sheet',
    team: 'HR',
    documentType: 'Google Sheet',
    creator: 'HR Officer, Digitweb',
    version: '1.0',
    status: 'Active',
    sourceUrl: 'https://docs.google.com/spreadsheets/d/11Y1lAppEc9gfSE9vahJbjLhMA5L8Y8X1etOcBDpONJ8/edit?usp=sharing'
  },
  {
    id: 'km-002',
    title: 'Developer Validation Checklist',
    team: 'Development',
    documentType: 'Google Doc',
    creator: null,
    version: null,
    status: null,
    sourceUrl: 'https://docs.google.com/document/d/1MQWowVBPzbefapCcPZXC8FKasZyiEXd-H-avw83Fxms/edit?usp=sharing'
  },
  {
    id: 'km-003',
    title: 'Arun Task Schedule',
    team: 'Implementation',
    documentType: 'Google Sheet',
    creator: null,
    version: null,
    status: null,
    sourceUrl: 'https://docs.google.com/spreadsheets/d/1_tugy9CfHniIVIgqCuSmQQZ38cYJXoXVIQvQx94XRc0/edit?usp=sharing'
  }
];

export var EMPTY_STATE_TEXT = 'No documents match your search or filters.';

// ── Pure helpers (exported for direct testing — no DOM involved) ────────

/* Dedupe + alphabetical sort of a plain array of strings, dropping falsy
   values — a small self-contained copy of the same shape as issues.js's
   own uniqueSorted, not imported from it: Knowledge Management must not
   take a code dependency on the unrelated Issues feature. */
export function uniqueSorted(values) {
  var seen = {};
  var out = [];
  (values || []).forEach(function (v) {
    if (!v || seen[v]) { return; }
    seen[v] = true;
    out.push(v);
  });
  out.sort(function (a, b) { return a.localeCompare(b); });
  return out;
}

export function teamOptions(documents) {
  return uniqueSorted((documents || []).map(function (d) { return d.team; }));
}

export function documentTypeOptions(documents) {
  return uniqueSorted((documents || []).map(function (d) { return d.documentType; }));
}

/* Case-insensitive, partial, title-only match (Phase 7). A blank/whitespace
   query returns every document unchanged. */
export function searchByTitle(documents, query) {
  var q = (query || '').trim().toLowerCase();
  if (!q) { return documents.slice(); }
  return documents.filter(function (d) {
    return (d.title || '').toLowerCase().indexOf(q) !== -1;
  });
}

export function filterDocuments(documents, filters) {
  filters = filters || {};
  var result = searchByTitle(documents, filters.search);
  if (filters.team && filters.team !== 'all') {
    result = result.filter(function (d) { return d.team === filters.team; });
  }
  if (filters.documentType && filters.documentType !== 'all') {
    result = result.filter(function (d) { return d.documentType === filters.documentType; });
  }
  return result;
}

/* Defense-in-depth (Phase 13) — only http:// and https:// URLs are ever
   treated as safe to render as an href, even though every APPROVED_DOCUMENTS
   entry above is hand-verified. Rejects javascript:, data:, and any other
   scheme, and anything that fails URL parsing entirely. */
export function isSafeHttpUrl(url) {
  if (!url || typeof url !== 'string') { return false; }
  try {
    var parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────

function el(tag, className) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  return node;
}

function textEl(tag, className, text) {
  var node = el(tag, className);
  node.textContent = text;
  return node;
}

/* Renders a value as plain text, or "—" when missing — never an empty
   cell, and never innerHTML. Used for every document-authored field. */
function dashOrText(container, value) {
  if (!value) {
    container.appendChild(textEl('span', 'msc-km-dash', '—'));
    return;
  }
  container.appendChild(document.createTextNode(String(value)));
}

// ── Workspace ─────────────────────────────────────────────────────────

/* Mounted exactly once (initKnowledgeManagement below), inside the
   independent #tab-knowledge-management panel. opts.documents defaults to
   the production APPROVED_DOCUMENTS registry; tests may override it with a
   fixture array so real production records never need to appear in test
   assertions. */
export function mountKnowledgeManagementWorkspace(mountEl, opts) {
  if (!mountEl) { return null; }
  opts = opts || {};
  var documents = opts.documents || APPROVED_DOCUMENTS;

  var state = {
    filters: { search: '', team: 'all', documentType: 'all' }
  };

  mountEl.textContent = '';

  var heading = textEl('h3', 'msc-km-section-heading', 'Company Documents');
  mountEl.appendChild(heading);

  // ── Toolbar: search + Team filter + Document Type filter ────────────
  var toolbar = el('div', 'msc-km-toolbar');

  var searchField = el('div', 'msc-km-filter-field');
  var searchLabel = textEl('label', 'msc-km-filter-label', 'Search');
  searchLabel.setAttribute('for', 'msc-km-search-input');
  var searchInput = el('input', 'msc-km-search-input');
  searchInput.type = 'search';
  searchInput.id = 'msc-km-search-input';
  searchInput.setAttribute('placeholder', 'Search documents...');
  searchField.appendChild(searchLabel);
  searchField.appendChild(searchInput);

  var teamField = el('div', 'msc-km-filter-field');
  var teamLabel = textEl('label', 'msc-km-filter-label', 'Team:');
  teamLabel.setAttribute('for', 'msc-km-team-filter');
  var teamSelect = el('select', 'msc-km-select');
  teamSelect.id = 'msc-km-team-filter';
  teamField.appendChild(teamLabel);
  teamField.appendChild(teamSelect);

  var typeField = el('div', 'msc-km-filter-field');
  var typeLabel = textEl('label', 'msc-km-filter-label', 'Document Type:');
  typeLabel.setAttribute('for', 'msc-km-type-filter');
  var typeSelect = el('select', 'msc-km-select');
  typeSelect.id = 'msc-km-type-filter';
  typeField.appendChild(typeLabel);
  typeField.appendChild(typeSelect);

  toolbar.appendChild(searchField);
  toolbar.appendChild(teamField);
  toolbar.appendChild(typeField);

  var countPill = el('span', 'msc-km-count-pill');
  toolbar.appendChild(countPill);

  mountEl.appendChild(toolbar);

  var tableRegion = el('div', 'msc-km-table-region');
  mountEl.appendChild(tableRegion);

  // ── Filter option population (built once — the registry is static) ──
  function populateSelect(selectEl, values) {
    selectEl.textContent = '';
    var allOpt = el('option', '');
    allOpt.value = 'all';
    allOpt.textContent = 'All';
    selectEl.appendChild(allOpt);
    values.forEach(function (v) {
      var opt = el('option', '');
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
    selectEl.value = 'all';
  }

  populateSelect(teamSelect, teamOptions(documents));
  populateSelect(typeSelect, documentTypeOptions(documents));

  // ── Table rendering ───────────────────────────────────────────────

  function buildOpenDocumentCell(doc) {
    var td = el('td', '');
    if (!isSafeHttpUrl(doc.sourceUrl)) {
      td.appendChild(textEl('span', 'msc-km-dash', '—'));
      return td;
    }
    var a = el('a', 'msc-km-open-link');
    a.setAttribute('href', doc.sourceUrl);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.textContent = 'Open Document';
    td.appendChild(a);
    return td;
  }

  function buildRow(doc) {
    var tr = el('tr', '');

    var titleTd = el('td', 'msc-km-title-cell');
    titleTd.textContent = doc.title || '';
    tr.appendChild(titleTd);

    var teamTd = el('td', '');
    dashOrText(teamTd, doc.team);
    tr.appendChild(teamTd);

    var typeTd = el('td', '');
    dashOrText(typeTd, doc.documentType);
    tr.appendChild(typeTd);

    var creatorTd = el('td', '');
    dashOrText(creatorTd, doc.creator);
    tr.appendChild(creatorTd);

    var versionTd = el('td', '');
    dashOrText(versionTd, doc.version);
    tr.appendChild(versionTd);

    var statusTd = el('td', '');
    dashOrText(statusTd, doc.status);
    tr.appendChild(statusTd);

    tr.appendChild(buildOpenDocumentCell(doc));

    return tr;
  }

  function renderTable() {
    var filtered = filterDocuments(documents, state.filters);
    countPill.textContent = filtered.length + (filtered.length === 1 ? ' document' : ' documents');

    tableRegion.textContent = '';

    if (!filtered.length) {
      tableRegion.appendChild(textEl('div', 'msc-km-empty', EMPTY_STATE_TEXT));
      return;
    }

    var wrap = el('div', 'msc-km-table-wrap');
    var table = el('table', 'msc-km-table');
    var thead = el('thead', '');
    var headerRow = el('tr', '');
    ['Document Title', 'Team', 'Document Type', 'Creator', 'Version', 'Status', 'Action'].forEach(function (label) {
      headerRow.appendChild(textEl('th', '', label));
    });
    thead.appendChild(headerRow);
    var tbody = el('tbody', '');
    filtered.forEach(function (doc) { tbody.appendChild(buildRow(doc)); });
    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    tableRegion.appendChild(wrap);
  }

  searchInput.addEventListener('input', function () {
    state.filters.search = searchInput.value;
    renderTable();
  });
  teamSelect.addEventListener('change', function () {
    state.filters.team = teamSelect.value;
    renderTable();
  });
  typeSelect.addEventListener('change', function () {
    state.filters.documentType = typeSelect.value;
    renderTable();
  });

  renderTable();

  return {
    // Exposed for tests only — not used by production wiring.
    getState: function () { return state; }
  };
}

/* Mounted once at app boot (web-view/js/app.js). No auth/identity gating —
   Company Documents is read-only and visible to every Management Team
   member, matching the SRD's stated user group. */
export function initKnowledgeManagement() {
  var mountEl = document.getElementById('knowledgeManagementWorkspace');
  if (!mountEl) { return null; }
  return mountKnowledgeManagementWorkspace(mountEl);
}
