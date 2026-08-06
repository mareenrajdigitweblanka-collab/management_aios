---
name: review-summary-pdf-export-requirement
type: requirement-document
created: 2026-08-06
created-by: Mareenraj (builder)
status: READY FOR TECHNICAL DESIGN — no open business parameters
requirement-id: REQ-CAL-REV-PDF-003
---

# Requirement — Management AIOS Employee Review Summary PDF Export (2026-08-06)

> **Correction (2026-08-06, same-day, round 1):** Two corrections to the original approved decisions, both documentation-only — no application code was implemented, no dependency was installed. (1) Decision 24's filename-exclusion list did not classify the employee display name itself, which the approved filename pattern (decision 22) explicitly includes — the filename is not PII-free; it contains one identifiable field (the employee's display name) by deliberate, approved design. §5.8 below is corrected to state this plainly and to itemize every field that must never appear in the filename. (2) No approved decision previously stated what happens when a filtered export matches zero active records — the companion technical design had independently proposed "still generate a PDF saying no records match," which is corrected here: **no PDF is generated for an empty result.** New §5.10 records the approved empty-result decisions. See the companion technical design's own correction note for the implementation-level detail (route status code, frontend handling).

## Metadata (per CLAUDE.md §11.3 — Requirement Documentation Governance)

| Field | Value |
|---|---|
| Project Name | Management AIOS — Employee Review Summary PDF Export |
| Start Date | 2026-08-06 |
| Expected Deadline | Not yet set |
| User / Stakeholder | All authenticated Management Team members who can read Review Summary records (Mayurika, Suman, Arun, Rajiv, Paraparan) |
| Company Value Contribution | Lets a Management Team member export the currently filtered Review Summary history for one employee as a portable, offline-readable record — addressing the management file/decision disorganization domain named in CLAUDE.md §1/§4, and reusing the dedicated Review Summaries workspace (REQ-CAL-REV-TAB-002) rather than duplicating its filter/read logic |
| MVP Submission Date | Not yet set |
| Project Owner | Mareenraj (builder) |
| Status | READY FOR TECHNICAL DESIGN — no open business parameters remain; all 38 decisions below are approved as stated (corrected, round 1, 2026-08-06 — see correction note above) |

## 1. Purpose

REQ-CAL-REV-TAB-002 (2026-08-06) built one dedicated Review Summaries workspace with employee selection, an "All reviewers"/specific-reviewer filter, and From/To meeting-date filters, reading from `GET /api/staff-review-summaries`. This requirement adds a single **Download PDF** action to that workspace, letting the currently authenticated reader export the exact set of active Review Summary records their current employee selection and filters resolve to, as a PDF file the browser downloads — with no permanent server copy, no audit trail, and no database write of any kind.

## 2. Business question

Should a Management Team member be able to take a Review Summary history off-platform (for an offline record, printing, or sharing outside the app) without giving up the existing read-authorization or ownership rules? **Decision: yes, via one page-level PDF export button that mirrors the currently visible, currently authorized filtered history exactly — read-only, no new data, no new authority.**

## 3. Source evidence

This is a UI/technical requirement, not an HR/business-domain claim under CLAUDE.md §2's SRC-register discipline — the CLAUDE.md source-of-truth register governs Management AIOS business facts (org structure, KPI rules, policy), not this repository's own application-development artifacts, consistent with `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md` §3. Evidence for this requirement is:

- Direct instruction from the project builder (Mareenraj) in this session, requirement ID REQ-CAL-REV-PDF-003.
- Prior approved requirement/design/validation/handover this feature builds on unchanged: `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md`, `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md`, `validation/calendar-review-summaries-dedicated-tab-design-check-2026-08-06.md`, `validation/calendar-review-summaries-dedicated-tab-implementation-check-2026-08-06.md`, `handover/2026-08-06__calendar-review-summaries-dedicated-tab-implementation-closure.md` (REQ-CAL-REV-TAB-002).
- Live repository discovery performed this session (file:line citations in the companion technical design document), including the existing weekly-schedule `.xlsx` export precedent (`backend/xlsx_export.py`, `backend/routers/member_schedules.py:2078-2163`, `web-view/js/calendar/instance.js:1831-1922`) as the closest existing binary-download pattern in this codebase.
- Repository state verified clean at `origin/main` = local `main` = `b17b012` before this work began (no divergence).

## 4. Existing authoritative table/API — reused unchanged

- `management_aios.staff_review_summaries` — no new table, no migration, no schema change.
- `GET /api/staff-review-summaries` (list) — the sole data source for the export; same `reviewed_staff_id`, `reviewer_member_key`, `include_all_reviewers`, `date_from`, `date_to`, soft-delete exclusion, and `meeting_date DESC, created_at DESC` ordering rules established by REQ-CAL-REV-TAB-002 (`backend/routers/staff_review_summaries.py:225-312`).
- `Depends(get_verified_member)` — the same Calendar-token authentication/authorization gate already applied to every Staff Review Summaries route; this export introduces no new authorization concept.
- `web-view/js/member-registry.js`'s `MEMBER_REGISTRY`/`resolveMember()` — reused unchanged for reviewer display name/role text in the PDF.

## 5. Approved decisions

### 5.1 Button placement

1. Add exactly one page-level **Download PDF** button near the Review History filters (§3 "3. Review history" panel, `web-view/js/review-summaries.js`), not one button per record.

### 5.2 Employee scope

2. A selected employee is required before export is possible.
3. The export contains all active Review Summary records matching the current filters for that selected employee.
4. With no employee selected: the button is disabled/unavailable, no export request is made, and the UI gives a clear instruction to select an employee first.

### 5.3 Reviewer scope

5. Reviewer filter = All reviewers: export all active reviewer records for that employee.
6. Reviewer filter = a specific reviewer: export only that reviewer's active records.
7. The export must never include records outside the currently applied reviewer filter.

### 5.4 Date scope

8. From/To date filters apply to the export exactly as they apply to the currently visible history.
9. Both date filters empty: export the complete active Review Summary history for the employee.
10. No default date range may be invented when both are empty (decision 9 governs that case exactly).

### 5.5 Access

11. Every authenticated Management Team member who can read the matching records (the existing shared-read rule) may download the PDF.
12. Missing token: no export.
13. Invalid token: no export.
14. Export access follows read authorization exactly — never record ownership.

### 5.6 Content

15. The PDF must include: Management AIOS heading; "Employee Review Summary" title; reviewed employee; applied reviewer scope; applied From/To date scope (when present); generated date/time; and, per record: reviewer display name, reviewer role, meeting date, complete summary text, created timestamp, updated timestamp.
16. Paragraphs and line breaks in the summary text are preserved.
17. The export never uses the UI's truncated preview text — always the full `summary_text`.
18. Soft-deleted summaries remain excluded from the export, identically to every other view.

### 5.7 Branding

19. Use a simple Management AIOS heading only.
20. No logo or elaborate company branding is required.
21. No Tamil-specific or general multilingual font guarantee is required.

### 5.8 Filename (corrected, round 1 — filename privacy classification)

22. Filename pattern: `review-summaries_<sanitized-employee-name>_<YYYY-MM-DD>.pdf`.
23. Unsafe filename characters are removed or replaced.
24. **Filename privacy classification**: the employee display name embedded in the filename (decision 22) is identifiable information — the filename is not, and is not claimed to be, free of all personally identifying content. Its inclusion is a deliberate, explicit decision by the requirement owner, made for the practical benefit of a human-readable downloaded file, not an oversight. Filename sanitization (decision 23) is still required so that identifiable name never introduces an unsafe character into the filesystem path.

    The following must never enter the filename, under any circumstance:
    - NIC
    - authentication token
    - summary text
    - reviewer name
    - reviewer role
    - personal email address
    - phone number
    - staff UUID
    - summary record UUID
    - any other raw database ID

25. **Practical limitation (documented, not solved by new tracking)**: once downloaded, the filename — including the identifiable employee name — may remain visible in the user's operating-system Downloads folder listing, browser download history, or OS recent-file history, for as long as that user's own device retains it. This is a property of every file a browser downloads to a local device and is not specific to this export. **This limitation is not addressed by adding download tracking, an audit trail, or any server-side retention of the exported file** — decisions 28-33 below (no tracking, no audit record, no permanent server copy) remain in force exactly as approved; the responsibility for what happens to a file after it reaches the user's own device is outside this application's control and outside the scope of this requirement.

### 5.9 Save and retention

26. Clicking Download PDF triggers a browser download/save interaction.
27. Whether the browser shows a Save As location prompt or uses its configured Downloads folder is entirely the browser's own decision — the application must never claim it can force a destination picker in every browser.
28. No download is tracked.
29. No audit record of any export is created.
30. The PDF is never saved to PostgreSQL.
31. No permanent server-side PDF file is retained.
32. PDF content is never saved in `localStorage` or `sessionStorage`.
33. Generated PDFs are never committed to Git.

### 5.10 Empty-result behavior (new, round 1 correction — 2026-08-06)

34. When the current employee selection and filters match zero active Review Summary records, **no PDF is generated** — the export must never produce a blank or misleading PDF document for an empty result.
35. No Blob is created and no browser download is triggered for an empty result.
36. The UI shows: **"No review summaries match the selected filters."**
37. The selected employee and the currently applied filters are retained (not cleared) when an export resolves to zero matching records, so the user can adjust the filters and try again without re-selecting the employee.
38. The exact backend response used to signal this case is a technical design decision, not a business decision — the companion technical design must choose one status code consistent with this router's own existing conventions and document the reasoning; the requirement's only binding rule is decisions 34-37 above.

## 6. Out of scope / explicitly not changed this session

- No application code, migration, API route, UI, or test was implemented in this session — this is a requirement/design-only session, matching the companion technical design and validation report.
- No database read or write was performed.
- The protected path `member-aios/mayurika-hr/staff-data/` was not opened or modified.
- `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` (a separate staff-roster/Mayurika-review workflow artifact) was not opened, read, or referenced while producing this requirement.
- Existing Review Summary CREATE/DETAIL/UPDATE/DELETE ownership rules, filters, soft-delete behavior, and state-clearing rules (REQ-CAL-REV-TAB-002) are not changed.
- No database schema or migration is introduced.

## 7. Related evidence

- `docs/2026-08-06_review-summary-pdf-export-technical-design.md` — companion technical design.
- `validation/review-summary-pdf-export-design-check-2026-08-06.md` — consistency check between this requirement and the technical design.
- `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md`, `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md`, `validation/calendar-review-summaries-dedicated-tab-design-check-2026-08-06.md`, `validation/calendar-review-summaries-dedicated-tab-implementation-check-2026-08-06.md`, `handover/2026-08-06__calendar-review-summaries-dedicated-tab-implementation-closure.md` — REQ-CAL-REV-TAB-002, the dedicated workspace this export is added to, referenced not duplicated.

## 8. Protected path confirmation

`member-aios/mayurika-hr/staff-data/` was not opened, listed, or read at any point while producing this requirement.

## 9. Unrelated-file confirmation

`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` was not opened, read, or referenced while producing this requirement — it belongs to a separate staff-roster/Mayurika-review workflow.
