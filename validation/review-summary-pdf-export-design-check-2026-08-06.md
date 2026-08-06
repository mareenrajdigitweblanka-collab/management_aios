---
name: review-summary-pdf-export-design-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-PDF-003
---

# Design Consistency Check — Employee Review Summary PDF Export (2026-08-06)

## Purpose

Confirm that `docs/2026-08-06_review-summary-pdf-export-technical-design.md` contains no contradiction with any of the 32 approved decisions in `docs/2026-08-06_review-summary-pdf-export-requirement.md`, and that the design is internally consistent with the existing REQ-CAL-REV-TAB-002 backend/frontend contract it builds on.

## Business question

Is the technical design safe to hand to the relevant Management Team member(s)/domain owner(s) for review, with 0 open contradictions and 0 unplanned schema/data/dependency changes?

## Scope of this check

Design review only. No code was written, no dependency was installed, no PDF was generated, no migration was run, no database was queried, the protected path `member-aios/mayurika-hr/staff-data/` was not opened, and `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` was not opened or referenced during this check.

## Decision-to-design traceability

| # | Requirement decision | Design section | Status |
|---|---|---|---|
| 1 | One page-level Download PDF button, not per-record | Technical design §12 (files likely to change — `review-summaries.js`) | Covered |
| 2 | Selected employee required | §5.1/§5.4 (`reviewed_staff_id: UUID = Query(...)`, no default, 422 if omitted) | Covered |
| 3 | Export contains all active records matching current filters for that employee | §5.2 (shared filter function, no `.limit()`/`.offset()` on the export path) | Covered |
| 4 | No employee selected → disabled/unavailable, no request, clear instruction | §11 (empty/error states table) | Covered |
| 5 | All reviewers → all active reviewer records for that employee | §5.2, §5.5 | Covered |
| 6 | Specific reviewer → only that reviewer's active records | §5.2, §5.5 | Covered |
| 7 | Never export outside the current reviewer filter | §5.2 (shared function, same rule LIST already enforces) | Covered |
| 8 | From/To apply exactly as they apply to visible history | §5.2, §5.4 | Covered |
| 9 | Both dates empty → complete active history | §5.2 (no artificial pagination cap, explicitly documented) | Covered |
| 10 | No invented default date range | §5.2 | Covered |
| 11 | Every authenticated reader with read access may download | §7 ("Authorization = list-read access") | Covered |
| 12 | Missing token → no export | §7, §11 | Covered |
| 13 | Invalid token → no export | §7, §11 | Covered |
| 14 | Export access follows read authorization, not ownership | §7 | Covered |
| 15 | PDF content list (heading, title, employee, scope, dates, generated time, per-record fields) | §6, §9 | Covered |
| 16 | Paragraphs/line breaks preserved | §6 (`\n` → `<br/>` before each Paragraph) | Covered |
| 17 | Never export truncated preview text | §6 (`summary_text` read directly, not `summaryPreview()`) | Covered |
| 18 | Soft-deleted summaries excluded | §5.2, §7 | Covered |
| 19 | Simple Management AIOS heading | §9 | Covered |
| 20 | No logo/elaborate branding required | §9 | Covered |
| 21 | No Tamil-specific/multilingual font guarantee required | §14 (not re-litigated; requirement decision carried through with no added font-guarantee claim) | Covered |
| 22 | Filename pattern `review-summaries_<sanitized-employee-name>_<YYYY-MM-DD>.pdf` | §5.4, §16 test 25 | Covered |
| 23 | Unsafe filename characters removed/replaced | §16 test 26 | Covered |
| 24 | Filename excludes token/summary/reviewer names/NIC/contact/UUIDs | §7, §16 test 27 | Covered |
| 25 | Trigger browser download/save interaction | §8 | Covered |
| 26 | Browser controls Save As vs. Downloads folder | §8 | Covered |
| 27 | No download tracking | §7 ("No audit/download-history table") | Covered |
| 28 | No audit record | §7 | Covered |
| 29 | No save to PostgreSQL | §7 | Covered |
| 30 | No permanent server-side PDF file | §5.3, §7 | Covered |
| 31 | No PDF content in localStorage/sessionStorage | §7 | Covered |
| 32 | No committed generated PDFs | Out of scope of runtime design — no PDF is ever written to the repository by this design; confirmed by §5.3's in-memory-only generation | Covered |

**Result: 32/32 decisions traced to a design section with no contradiction found.**

## Consistency check against the existing REQ-CAL-REV-TAB-002 contract

| Existing rule (2026-08-06) | Preserved by this design? | Evidence |
|---|---|---|
| LIST reviewer scope (`include_all_reviewers`/`reviewer_member_key` mutual exclusivity) | Yes — reused via one shared filter function, not reimplemented | Technical design §5.2, §5.5 |
| Soft-delete exclusion (`deleted_at IS NULL`) | Yes — inside the shared function, cannot be bypassed | Technical design §5.2, §7 |
| Ordering `meeting_date DESC, created_at DESC` | Yes — applied identically on the export path | Technical design §5.4, §9 |
| Any authenticated member may read another reviewer's active summaries | Yes — unchanged; export follows the same rule | Technical design §7 |
| Owner-only UPDATE/DELETE | Yes — untouched; this design adds a GET-only route | Technical design §10, §13 |
| `Cache-Control: no-store` convention | Yes — reused (`_set_no_store`) | Technical design §5.4, §7 |
| Reviewer display name/role resolved client-side via `member-registry.js`, Paraparan="Auditor" exception | Yes on the frontend card display (unchanged); the PDF's server-side resolution mirrors the same approved decision rather than reinventing it | Technical design §6 |
| No reviewer identity field added to `StaffReviewSummaryOut`/database | Yes — untouched | Technical design §13 |

**Result: 0 contradictions with the existing REQ-CAL-REV-TAB-002 contract.**

## Routing-safety assessment

- The existing router already registers `GET /{summary_id}` (`backend/routers/staff_review_summaries.py:315`), a single-path-segment route. A new single-segment literal path (e.g. `/export.pdf`) would be shape-ambiguous with it, risking the export request being captured by the detail-by-id handler and rejected with a UUID-parse 422 instead of reaching the export handler.
- The design resolves this by choosing `/export/pdf` (two path segments) instead of the single-segment form named in the task's own "potential contract" example — a path shape that cannot collide with `/{summary_id}` under any registration order (technical design §5.1).
- This is flagged as a deliberate design correction, not an oversight — test 41 (technical design §16) exists specifically to confirm the fix holds.

**Result: the routing-collision risk is identified and resolved before implementation, not discovered during it.**

## Dependency and runtime assessment

- No PDF generation library exists anywhere in this repository today, backend or frontend (technical design §3, confirmed by direct search of `backend/requirements.txt`, `requirements.txt`, and `web-view/js/calendar/package.json`).
- `reportlab` is recommended on the same "pure Python, no system binary dependency" basis already established by this repository's one existing binary-export library, `openpyxl` — not installed this session, per this task's explicit instruction.
- **Genuine evidence gap, not silently resolved**: no `vercel.json` or other deployment/runtime configuration file exists in this repository to confirm `reportlab`'s compatibility against the actual hosting runtime. This is recorded as the design's one open technical follow-up (technical design §14 item 2, §17), not treated as a blocking contradiction of the requirement (the requirement does not mandate a specific library or hosting platform).

**Result: 0 dependencies installed; the one open runtime-compatibility question is explicitly flagged, not hidden.**

## Files-touched assessment

- 0 files were created or modified other than this validation report and its two companion documents (requirement, technical design).
- No migration file was created. No dependency was installed. No PDF was generated.
- No `member-aios/mayurika-hr/staff-data/` access occurred.
- No access to `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` occurred.

## Test plan assessment

- 42 proposed tests (technical design §16), covering all 6 required categories from the task's own Phase 11 enumeration (authorization, filters, content, file safety, layout, regression) — meeting the task's own 42-item minimum list and exceeding the 30-test floor referenced in this task.
- Includes an explicit regression test (test 40) confirming the `_build_review_summary_query` extraction from the existing LIST route is behavior-preserving, and an explicit routing test (test 41) confirming the collision-avoidance fix above holds.

## PASS / AMBER / FAIL rule

This check PASSES if and only if:
- 0 of the 32 requirement decisions are uncovered or contradicted by the design (32/32 confirmed);
- 0 contradictions exist against the existing REQ-CAL-REV-TAB-002 contract;
- the export route reuses (not duplicates) the existing LIST route's filter/soft-delete/authorization logic;
- 0 application/database/dependency files were touched producing the requirement, design, or this check;
- the protected path was never opened, and the unrelated staff-roster validation file was never opened or referenced;
- 0 production writes, permanent files, or audit/database records are introduced by the proposed export;
- the routing-collision risk against the existing `/{summary_id}` route is explicitly identified and resolved;
- the proposed test count is ≥ 30 (42 confirmed).

All eight conditions are met.

**Result: PASS.**

## Owner / reviewer

- Prepared by: Mareenraj (builder).
- **Business requirement approval**: completed — by the repository owner/user.
- **Technical review**: required for the new route, the `_build_review_summary_query` extraction, and the `reportlab` dependency choice — specifically the runtime-compatibility confirmation flagged as this design's one open follow-up.
- **Additional domain-member consultation** (Mayurika, Suman, Arun, Rajiv, Paraparan individually): optional, unless separately requested — not a mandatory implementation gate, consistent with CLAUDE.md §18.

## Status

READY FOR TECHNICAL REVIEW — not yet implemented, not yet deployed, no dependency installed, no PDF generated, no production data touched.

## Limitations

Same as `docs/2026-08-06_review-summary-pdf-export-technical-design.md` §14 — no live browser walkthrough, no live database query (none needed, no schema change proposed), no code executed and no dependency installed this session, plus the open `reportlab`-vs-actual-runtime compatibility follow-up documented there (item 2).

## One next step

Technical review of the corrected design (PASS rule above, all eight conditions met) — specifically confirming `reportlab`'s compatibility against the actual hosting/deployment runtime — before implementation begins. Additional domain-member consultation remains available on request but is not a precondition.

**Branch-strategy note:** implementation branch strategy is not defined by this design and must follow the repository owner's explicit instruction at implementation start.
