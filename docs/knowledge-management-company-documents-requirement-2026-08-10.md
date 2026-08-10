# Knowledge Management — Company Documents (First Usable Implementation)

**Requirement ID:** REQ-KM-001 (narrow first slice — Company Documents view only)
**Task Assigned By:** Arun — Implementation Officer
**Users:** Management Team members
**Date:** 2026-08-10
**Status:** Frontend-only, narrow first implementation. Not the full Knowledge Management SRD — see [docs/knowledge-management-discovery-2026-08-10.md](knowledge-management-discovery-2026-08-10.md) for the full-scope discovery and the six Phase-0 decisions still pending.

---

## 1. Business Requirement

Management Team members can use one Management AIOS page to quickly find and open important company documents by title, team, or document type instead of manually searching across different folders and links.

## 2. Scope

Implemented:

1. One new "Knowledge Management" sidebar entry.
2. One corresponding top-level Knowledge Management panel.
3. A Company Documents view.
4. A small set of approved existing company-document links (3 records — see §4).
5. Fields displayed: Document Title, Team, Document Type, Creator, Version, Status, Action.
6. Search by Document Title (case-insensitive, partial match).
7. Team filter.
8. Document Type filter.
9. Open Document button (opens the authoritative external source URL).
10. Empty state: "No documents match your search or filters."

Explicitly out of scope (not implemented, no placeholders introduced):

- File upload
- PostgreSQL document schema
- Document backend API
- Google Drive ownership verification
- Google API integration
- Object storage
- Version-history workflow
- Audit logs
- Soft-delete workflow
- OCR
- AI Smart Search
- Document summaries
- Duplicate detection
- Knowledge Graph
- LLM indexing

## 3. Approved Document Source Check (Phase 3)

Search scope: the repository's already-registered stakeholder documents (`intelligence-inbox/raw-stakeholder-documents/`), grep'd for `docs.google.com` / `drive.google.com` / `sheets.google.com` URL patterns. The protected path `member-aios/mayurika-hr/staff-data/` was excluded and never opened. No metadata was invented; every field below traces to a specific line in a specific already-registered source file. Optional fields (Creator/Version/Status) that are not proven by the source are left `null` in the registry and render as `—` in the UI — never guessed.

Exactly 3 candidates were found and used. No fabricated records were added to reach any target count.

### Candidate 1 — 996 Project Management — Follow-up Sheet

| Field | Value | Evidence |
|---|---|---|
| Title | 996 Project Management — Follow-up Sheet | Constructed from the section heading "2. 996 project Management" (line 346) and the explicit "Followup link :" caption (line 673) — not the sheet's own internal title, which was not independently verified (no live query of the Google Sheet was performed). |
| Team | HR | Source folder `mayurika-hr/`; "Prepared By: HR Officer, Digitweb" and "Review Authority: Managing Director" in the adjacent Document Information table. |
| Document Type | Google Sheet | URL path `/spreadsheets/`. |
| Creator | HR Officer, Digitweb | "Document Information" table, "Prepared By" field (line 663) — describes the same skill-file entry this follow-up link is attached to; not independently verified against the Google Sheet's own file properties. |
| Version | 1.0 | "Document Information" table, "Version" field (line 665) — same caveat as Creator. |
| Status | Active | "Document Information" table, "Status" field (line 667) — same caveat as Creator. |
| Source URL | `https://docs.google.com/spreadsheets/d/11Y1lAppEc9gfSE9vahJbjLhMA5L8Y8X1etOcBDpONJ8/edit?usp=sharing` | Verbatim from source. |
| Source file | `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/HR.Mayu.Skill.md`, lines 655–667 (Document Information table) and line 673 (Followup link). | |

### Candidate 2 — Developer Validation Checklist

| Field | Value | Evidence |
|---|---|---|
| Title | Developer Validation Checklist | Literal Markdown link text: "[Developer Validation Checklist - Google Docs]" (line 17). |
| Team | Development | Classified from the document's own title wording ("Developer Validation Checklist") — not independently verified against an org chart or team registry; a lighter-weight inference than Creator/Version/Status, which are left unset. |
| Document Type | Google Doc | URL path `/document/d/`. |
| Creator | *(unknown — renders as `—`)* | Not stated anywhere in the source. |
| Version | *(unknown — renders as `—`)* | Not stated anywhere in the source. |
| Status | *(unknown — renders as `—`)* | Not stated anywhere in the source. |
| Source URL | `https://docs.google.com/document/d/1MQWowVBPzbefapCcPZXC8FKasZyiEXd-H-avw83Fxms/edit?usp=sharing` | Verbatim from source. |
| Source file | `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & Suman Discussions Notes.md`, line 17 (21/06/2026 entry). | |

### Candidate 3 — Arun Task Schedule

| Field | Value | Evidence |
|---|---|---|
| Title | Arun Task Schedule | Derived from the literal CSV row label "Arun task" (line 1) and the source filename ("my day check list-arun - shedule.csv"). |
| Team | Implementation | Source folder `arun-implementation/`; matches Arun's confirmed role (Implementation Officer, CLAUDE.md §5). |
| Document Type | Google Sheet | URL path `/spreadsheets/`. |
| Creator | *(unknown — renders as `—`)* | Not stated anywhere in the source. |
| Version | *(unknown — renders as `—`)* | Not stated anywhere in the source. |
| Status | *(unknown — renders as `—`)* | Not stated anywhere in the source. |
| Source URL | `https://docs.google.com/spreadsheets/d/1_tugy9CfHniIVIgqCuSmQQZ38cYJXoXVIQvQx94XRc0/edit?usp=sharing` | Verbatim from source. |
| Source file | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/my day check list-arun - shedule.csv`, line 1. | |

**Known gap:** only 3 candidates were found by this search method (grepping already-registered stakeholder documents for Google URL patterns). This is not an exhaustive survey of every company document — it is the narrow, evidence-only set this first implementation was scoped to use. No additional candidate was excluded for being "not enough" — every candidate found with usable evidence was included.

## 4. Document Registry (Interim Frontend Index)

`web-view/js/knowledge-management.js` exports `APPROVED_DOCUMENTS` — a static, hand-verified array of exactly the 3 records above, each shaped `{ id, title, team, documentType, creator, version, status, sourceUrl }`. This is explicitly **not** the permanent Knowledge Management database model — it is a frontend-only interim index, matching the discovery report's Option C (hybrid, metadata + external link) architecture direction, pending the six Phase-0 decisions.

## 5. Frontend Files Changed

**Created:**
- `web-view/js/knowledge-management.js` — registry + pure filter/search functions + DOM mount logic.
- `web-view/js/knowledge-management.test.mjs` — 40 tests (38 required + 2 additional safety checks).
- `web-view/css/knowledge-management.css` — `.msc-km-*` namespaced styles, reusing existing design tokens and `.member-header`/`.member-header-lede` primitives.

**Modified:**
- `web-view/index.html` — one `<link>` for the new stylesheet; one new sidebar group ("Knowledge") with one nav button (`data-tab="knowledge-management"`); one new top-level `.tab-panel` (`id="tab-knowledge-management"`), sibling to `#tab-issues`/`#tab-review-summaries`, using the existing generic navigation mechanism (`navigation.js`'s `.app-nav-btn`/`.tab-panel` convention) — no new navigation framework was introduced.
- `web-view/js/app.js` — imports and calls `initKnowledgeManagement()` alongside the other subsystem boot calls.

**Not touched:** any backend file, any database/migration file, `web-view/css/issues.css`/`web-view/js/issues.js` (Issues), `web-view/css/review-summaries.css`/`web-view/js/review-summaries.js` (Review Summaries), any calendar file, and `member-aios/mayurika-hr/staff-data/` (protected path).

## 6. Search Behavior

Search matches Document Title only (per Phase 7), case-insensitive, partial substring match. An empty or whitespace-only query returns every document unfiltered. Implemented in the pure, independently-tested `searchByTitle(documents, query)` function.

## 7. Filters

- **Team** — populated from the distinct `team` values actually present in `APPROVED_DOCUMENTS` (deduplicated, alphabetically sorted), plus an "All" option. No company-wide team source was created for this frontend slice, per instruction.
- **Document Type** — same pattern, populated from distinct `documentType` values in the registry.
- **Combined filtering** — Search, Team, and Document Type all apply together (AND logic) via `filterDocuments(documents, filters)`.

## 8. Open Document Behavior

The Action column's "Open Document" link opens `doc.sourceUrl` directly, with `target="_blank"` and `rel="noopener noreferrer"`. No proxying, downloading, duplication, or copying of the underlying document occurs, and no UI text claims Management AIOS owns the file. Before rendering as a clickable link, every `sourceUrl` is validated by `isSafeHttpUrl()` — only `http://`/`https://` URLs are ever rendered as a link; anything else renders as `—`.

## 9. Known Metadata Gaps

- Candidate 2 (Developer Validation Checklist) and Candidate 3 (Arun Task Schedule) have no proven Creator, Version, or Status — all three render as `—` for those records.
- Candidate 1's Creator/Version/Status are attributed to the skill-file entry the "Followup link" is attached to, not independently verified against the linked Google Sheet's own file properties (no live query of Google Drive/Sheets was performed or is possible — see the discovery report's §7, Google ownership feasibility: BLOCKED).
- Team values ("HR", "Development", "Implementation") are derived from source-folder naming and role context, not from a canonical, structured team taxonomy (the discovery report flags this exact gap — see [docs/knowledge-management-discovery-2026-08-10.md](knowledge-management-discovery-2026-08-10.md) §9).

## 10. Explicitly Not Implemented

- **Backend changes:** 0 — no FastAPI route, no SQLAlchemy model, no dependency added.
- **Database changes:** 0 — no migration, no table, no live query executed.
- **Uploads:** not implemented — no `<input type="file">` or upload control exists anywhere in this feature.
- **Google ownership verification:** not implemented — no Google API call, no OAuth/service-account code. The Status/ownership fields shown are static registry values, never live-checked.
- **Audit/version history:** not implemented — no history table, no change log, no version-bump workflow. The `version` field is a static display value only.

## 11. Known Limits

- Only 3 documents exist in the registry — this is intentionally the full narrow-scope set, not a partial rollout of a larger set.
- No responsive visual/browser verification was possible in this session (no browser automation tool was available) — see [validation/knowledge-management-company-documents-check-2026-08-10.md](../validation/knowledge-management-company-documents-check-2026-08-10.md) §Responsive for what was checked instead (CSS breakpoint logic, static code review).
- Adding a 4th document requires a manual code edit to `APPROVED_DOCUMENTS` — there is no registration UI, per explicit out-of-scope instruction.

## 12. PASS / AMBER / FAIL

**PASS.** All in-scope Phase 4–13 requirements are implemented and covered by passing tests (40/40); all explicitly out-of-scope items were confirmed absent, not stubbed; no protected path, backend, database, or unrelated Issues/Review Summaries/Calendar file was touched.

## 13. One Next Step

Arun (requester) reviews the 3 approved document candidates in §3 for business accuracy (title/team/creator wording) before this view is shown to the wider Management Team, and confirms whether additional company documents should be added to the registry in a follow-up task.
