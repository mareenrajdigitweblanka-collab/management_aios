---
name: review-summary-pdf-export-design-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-PDF-003
---

# Design Consistency Check — Employee Review Summary PDF Export (2026-08-06)

> **Correction (2026-08-06, same-day, round 1):** Both companion documents were corrected this round — no code, dependency, or database object was touched producing this correction. The requirement gained 6 new decisions (33-38, was 32) correcting the filename-privacy claim and adding an explicit empty-result decision. The technical design corrected its empty-result behavior (no PDF for zero matching records, was "still generate a PDF"), strengthened the routing-collision fix with an explicit source-order safeguard, added a mandatory ReportLab deployment-validation gate (§5.6), and expanded its test plan from 42 to 56 tests. This validation report is updated accordingly — see each section below for the specific traceability changes.
>
> **Correction (2026-08-06, same-day, round 2):** The technical design only — no code, dependency, or database object was touched, and `backend/requirements.txt` was not modified, producing this correction. Round 1's §5.6 stated the `reportlab` pin as its first gate step, using illustrative version strings (`reportlab==4.x.y`, `reportlab~=4.x`) that read as an already-selected version, and its "One next step"/PASS wording implied preview validation would run "before implementation begins" — mis-sequencing preview testing ahead of the implementation it depends on. Both are corrected: §5.6 is restructured into three explicit sequential gates (Gate A pre-implementation preflight → Gate B implementation, which applies the Gate-A-verified exact pin for the first time → Gate C Vercel preview, only once Gate B's endpoint exists), with no version pinned, named, or implied anywhere in the document. §16's test plan is reorganized into PREFLIGHT CHECKS/IMPLEMENTATION TESTS/PREVIEW TESTS (57 numbered checks, plus a 12-item non-numbered Gate C checklist). The requirement document required no change this round — it contains no dependency-pin or gate-sequencing content. This validation report is updated accordingly.
>
> **Update (2026-08-06, same-day, round 3 — not a correction, an execution record):** Gate A has now actually run and **PASSED** — full evidence in `validation/review-summary-pdf-reportlab-preflight-2026-08-06.md`, handover in `handover/2026-08-06__review-summary-pdf-reportlab-preflight-closure.md`. Verified exact version: **`reportlab==5.0.0`**. The technical design's §5.6/§12/test 54 are updated to record this result; `backend/requirements.txt` remains unmodified. The "ReportLab deployment-gate assessment" section below is updated accordingly. Gate B is now authorized; Gate C remains fully unrun.
>
> **Correction (2026-08-06, same-day, round 4):** Documentation-only — `pyproject.toml` and `backend/requirements.txt` were not modified, no dependency was installed, producing this correction. Round 3 (and the rounds before it) referred to `backend/requirements.txt` as the Gate B pin target without confirming which file Vercel actually reads. Confirmed by inspection: `pyproject.toml` is the canonical production/Vercel dependency source (a prior production crash, `validation/member-schedule-vercel-function-crash-check-2026-07-10.md`, proved Vercel does not install via `backend/requirements.txt`'s root `-r` reference; the deployed fix added `[project.dependencies]` directly to `pyproject.toml`); `backend/requirements.txt` remains actively required for local dev/test parity (it supplies test-only `httpx`, not present in `pyproject.toml`), so both files must receive the pin in Gate B, kept in sync. The technical design's §5.6/§12 are updated accordingly. The 4/53/12/69 validation-plan count is unchanged. See `validation/review-summary-pdf-reportlab-preflight-2026-08-06.md`'s own round-4 wording correction (unsupported "no clipping"/production-compatibility claims replaced with precise, evidenced statements) for the companion evidence-file update.

## Purpose

Confirm that `docs/2026-08-06_review-summary-pdf-export-technical-design.md` contains no contradiction with any of the 38 approved decisions in `docs/2026-08-06_review-summary-pdf-export-requirement.md`, and that the design is internally consistent with the existing REQ-CAL-REV-TAB-002 backend/frontend contract it builds on.

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
| 24 (corrected, round 1) | Filename privacy classification: employee name is identifiable, explicitly approved; itemized forbidden-field list (NIC, token, summary text, reviewer name, reviewer role, personal email, phone number, staff UUID, summary UUID, database ID) | §7 ("Filename privacy classification" row), §16 tests 27, 52, 53 | Covered |
| 25 (new, round 1) | Practical limitation documented: downloaded filename may remain visible in Downloads folder/OS recent-file history; not solved by adding tracking or server storage | Technical design §7 (unchanged controls — no tracking/audit/storage added), §14 | Covered |
| 26 | Trigger browser download/save interaction | §8 | Covered |
| 27 | Browser controls Save As vs. Downloads folder | §8 | Covered |
| 28 | No download tracking | §7 ("No audit/download-history table") | Covered |
| 29 | No audit record | §7 | Covered |
| 30 | No save to PostgreSQL | §7 | Covered |
| 31 | No permanent server-side PDF file | §5.3, §7 | Covered |
| 32 | No PDF content in localStorage/sessionStorage | §7 | Covered |
| 33 | No committed generated PDFs | Out of scope of runtime design — no PDF is ever written to the repository by this design; confirmed by §5.3's in-memory-only generation | Covered |
| 34 (new, round 1) | No PDF generated for zero matching records | Technical design §5.4 (404 branch), §8 (frontend response-status branch), §11 | Covered |
| 35 (new, round 1) | No Blob/download triggered for an empty result | Technical design §8, §16 test 50 | Covered |
| 36 (new, round 1) | UI shows "No review summaries match the selected filters." for an empty result | Technical design §5.4 (404 detail text), §8, §11, §16 test 49 | Covered |
| 37 (new, round 1) | Selected employee and filters retained (not cleared) on an empty result | Technical design §8 ("no call to `resetWorkspaceState()`"), §16 test 51 | Covered |
| 38 (new, round 1) | Exact status code is a technical (not business) decision, reasoned against existing router conventions | Technical design §5.4 ("Empty-result status code — 404, not 422" reasoning block) | Covered |

**Result: 38/38 decisions traced to a design section with no contradiction found.**

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

## Routing-safety assessment (corrected, round 1 — source-order safeguard added)

- The existing router already registers `GET /{summary_id}` (`backend/routers/staff_review_summaries.py:315`), a single-path-segment route. A new single-segment literal path (e.g. `/export.pdf`) would be shape-ambiguous with it, risking the export request being captured by the detail-by-id handler and rejected with a UUID-parse 422 instead of reaching the export handler.
- The design resolves this structurally by choosing `/export/pdf` (two path segments) instead of the single-segment form named in the task's own "potential contract" example — a path shape that cannot collide with `/{summary_id}` under any registration order (technical design §5.1).
- **Round 1 addition**: on top of the structural fix, the design now also requires the export route be declared in source **before** `GET /{summary_id}` in `staff_review_summaries.py` — an explicit, zero-cost, defense-in-depth convention protecting any future single-segment route this file might gain (technical design §5.1, "Route-declaration-order safeguard").
- This is flagged as a deliberate design correction, not an oversight — tests 41, 43-47 (technical design §16) exist specifically to confirm both the structural and the source-order fix hold, including OpenAPI schema uniqueness (test 47) and that existing detail-route behavior is unaffected (tests 45-46).

**Result: the routing-collision risk is identified and resolved before implementation with two independent safeguards, not one, and not discovered during it.**

## Empty-result correction assessment (new, round 1)

- The original design proposed generating a valid PDF stating "No review summaries match the selected filters." for a zero-record match. This is corrected: **no PDF is generated at all** for that case (technical design §5.4, §8, §11).
- The route returns `404` with that exact detail text — reasoned explicitly against this router's own existing 404 (well-formed request, nothing matches) vs. 422 (malformed request) convention, not an arbitrary choice (technical design §5.4's "Empty-result status code" reasoning block).
- The frontend inspects the response status **before** calling `res.blob()` — no Blob is created and no download anchor is clicked for this specific 404, mirroring the discipline the existing weekly-schedule export already applies to its own `Content-Type`-based empty/non-empty branch (technical design §8).
- The selected employee and both filters are retained (not cleared) on this 404 — no `resetWorkspaceState()` call — so the requirement's decision 37 (allow the user to adjust filters and retry without re-selecting the employee) is satisfied exactly.

**Result: 0 remaining statements in the technical design claim a PDF is generated for a zero-record match.**

## ReportLab deployment-gate assessment (updated, round 4 — production dependency source confirmed)

- Round 1's §5.6 stated an eight-step mandatory gate but sequenced the version pin as *step 1*, using illustrative version strings (`reportlab==4.x.y`, `reportlab~=4.x`) — read literally, this implied a version had already been selected before any installation was verified, and implied the full gate (including Vercel preview steps) could be described as running "before implementation begins," which is not possible for the preview steps specifically, since they require an endpoint that does not exist until implementation happens.
- **Round 2 correction**: §5.6 was restructured into three explicit sequential stages. **Gate A** (pre-implementation dependency preflight, run in a throwaway environment outside tracked repository assets, before any application code for this feature exists) verifies a candidate version installs and generates valid synthetic single-/multi-page PDFs, and is the sole source of the version Gate B will pin. **Gate B** (implementation) applies that exact verified version to the repository's dependency file(s), builds the module/route, and runs the full automated test suite. **Gate C** (Vercel preview validation) runs only once Gate B has produced a working endpoint to preview.
- **Round 3 — Gate A executed**: run this session in a throwaway environment (Windows 10, Python 3.14.4) outside all tracked repository content, per §5.6's Gate A procedure exactly. Candidate selection used a live PyPI JSON-API query (not memory or the design's own illustrative examples), filtered to non-prerelease, non-yanked releases.
  - **Gate A exact version: `reportlab==5.0.0`.**
  - **Local Python: 3.14.4** (Windows 10 Pro, AMD64).
  - **Local installation: PASS.**
  - **Local PDF generation: PASS.** Single-page synthetic PDF: 2,207 bytes, valid `%PDF-` signature, 1 page. Multi-page synthetic PDF: 3,966 bytes, valid `%PDF-` signature, 2 pages. All data fabricated ("Test Employee," "Test Reviewer," invented text) — 0 production data used, 0 PostgreSQL access.
  - **Exact production Python: unknown.** No `runtime.txt`, `.python-version`, or `vercel.json` `pythonVersion` field exists in this repository.
  - **Vercel compatibility: unverified.** Gate A validates the local environment only; full Vercel runtime compatibility (interpreter version, and specifically the `pillow` transitive dependency's wheel availability on that target) remains unconfirmed until Gate C.
  - Full evidence: `validation/review-summary-pdf-reportlab-preflight-2026-08-06.md`.
- **Round 4 — production dependency-source confirmed**: rounds 1-3 referred to `backend/requirements.txt` as *the* Gate B pin target without first confirming, from repository evidence, which file Vercel actually reads. Corrected by direct inspection:
  - **Production dependency source: `pyproject.toml`, based on repository evidence.** `validation/member-schedule-vercel-function-crash-check-2026-07-10.md` documents a prior production crash (`ModuleNotFoundError: No module named 'fastapi'`) caused by Vercel not installing packages via root `requirements.txt`'s `-r backend/requirements.txt` reference; the deployed fix added `[project.dependencies]` directly to `pyproject.toml`, which is the file Vercel has actually read since that fix.
  - **`backend/requirements.txt` must not be treated as the production source** — repository evidence (the crash postmortem above) proves the opposite — **unless a future change to repository evidence proves otherwise.** It nonetheless remains actively required for local dev/test parity: it supplies `httpx` (test-only, required by `fastapi.testclient.TestClient` for two existing test modules) which `pyproject.toml` deliberately omits, and it is the file root `requirements.txt`'s `-r` reference points local `pip install` at.
  - **Gate B must modify the canonical dependency source (`pyproject.toml`)** with the exact pin `reportlab==5.0.0`, using its existing `[project.dependencies]` array's declaration style, and must make the identical addition to `backend/requirements.txt` in the same change, since evidence proves that file is actively required, not stale.
  - **Gate C remains mandatory** regardless of which file the pin lives in — pinning the correct file proves nothing about whether Vercel's Python runtime actually selects a compatible interpreter, installs the package, starts the function, or serves the endpoint correctly.
  - Test plan tests 54-57 (technical design §16, "PREFLIGHT CHECKS — Gate A") cover the automatable portion of Gate A (candidate-version install, synthetic single-page PDF, synthetic multi-page PDF, valid PDF signature) — **all four confirmed passing**, not merely proposed. Gate C's checks (12 items) remain a documented, non-numbered release-process checklist, since they require an actual Vercel preview deployment this repository's own test suite cannot perform. **Validation-plan count preserved: Gate A 4, Gate B 53, Gate C 12, Overall 69** — the dual-file version-drift assertion is folded into Gate B's existing 53-check category, not counted as an additional test.
  - The fallback rule (§5.6) was not triggered — Gate A passed on the first candidate version tried, so no "stop and return to technical review" branch was exercised this session.

**Result: `reportlab==5.0.0` is the Gate-A-verified exact version; `pyproject.toml` is the confirmed canonical Gate B pin target, with `backend/requirements.txt` updated in the same change; 0 claim of production compatibility is made pending Gate C; neither dependency file was modified by this correction.**

## Files-touched assessment

- 0 application files were created or modified. Round 3 additionally created two new evidence files (`validation/review-summary-pdf-reportlab-preflight-2026-08-06.md`, `handover/2026-08-06__review-summary-pdf-reportlab-preflight-closure.md`) recording Gate A's actual execution, alongside the pre-existing requirement/technical-design/design-check trio.
- No migration file was created. `reportlab`/`pillow`/`charset-normalizer`/`pypdf` were installed **only inside a throwaway virtual environment outside tracked repository content, deleted after evidence capture** — 0 dependencies were installed into this repository's own environment. Generated synthetic PDFs were deleted before this task ended — 0 PDFs remain in the repository. Neither `pyproject.toml` nor `backend/requirements.txt` was modified.
- No `member-aios/mayurika-hr/staff-data/` access occurred.
- No access to `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` occurred.

## Test plan assessment (corrected, round 2 — 57 numbered checks, was 56; three-gate categorization applied)

- 57 numbered checks (technical design §16, was 56 after round 1), covering all 6 original required categories (authorization, filters, content, file safety, layout, regression) plus the round-1 categories (route ordering, empty-result frontend handling, filename privacy) and a restated 4-item Gate A preflight category (was 3 items in round 1, now matching §5.6 Gate A's own four-item bulleted list one-to-one) — exceeding the 30-test floor referenced in this task by a wide margin.
- A separate, non-numbered 12-item Gate C preview checklist (expanded this round from round 1's 3 bullets) is documented but intentionally excluded from the numbered total, since it requires an actual Vercel preview deployment.
- Includes an explicit regression test (test 40) confirming the `_build_review_summary_query` extraction from the existing LIST route is behavior-preserving, an explicit routing test (test 41) confirming the structural collision-avoidance fix, and 4 source-order tests (43-46) confirming the defense-in-depth safeguard.
- Test 38 is corrected in place to reflect the new no-PDF-on-empty-result behavior, cross-referencing the 3 new frontend-handling tests (49-51) that verify the toast, the absence of a Blob/download, and state retention.

## PASS / AMBER / FAIL rule (updated, round 4 — production dependency-source condition added)

This check PASSES if and only if:
- 0 of the 38 requirement decisions are uncovered or contradicted by the design (38/38 confirmed);
- 0 contradictions exist against the existing REQ-CAL-REV-TAB-002 contract;
- the export route reuses (not duplicates) the existing LIST route's filter/soft-delete/authorization logic;
- 0 application/database/dependency files were touched producing the requirement, design, or this check, and neither `pyproject.toml` nor `backend/requirements.txt` was modified;
- the confirmed canonical production dependency source (`pyproject.toml`) is identified from repository evidence, not assumed, and `backend/requirements.txt`'s continued, evidenced role (local dev/test parity) is stated rather than left unexplained;
- the protected path was never opened, and the unrelated staff-roster validation file was never opened or referenced;
- 0 production writes, permanent files, or audit/database records are introduced by the proposed export;
- the routing-collision risk against the existing `/{summary_id}` route is explicitly identified and resolved, with an explicit source-order safeguard beyond the structural path-shape fix;
- the filename privacy classification states plainly that the embedded employee name is identifiable information, explicitly approved for inclusion, not claimed to be PII-free;
- no PDF is generated for a zero-record match — the route returns 404 and the frontend triggers no Blob/download for that response, retaining the selected employee and filters;
- **0 `reportlab` version is pinned, named, or implied as selected anywhere in either document — the exact version is Gate A's verified output only;**
- **the deployment-validation gate is sequenced as three explicit stages (Gate A pre-implementation preflight → Gate B implementation → Gate C Vercel preview), with 0 statement implying preview validation occurs before the endpoint is implemented;**
- `reportlab` production compatibility is stated as unverified until Gate C passes, with an explicit fallback rule (no silent library/architecture substitution) anchored to both Gate A and Gate C by name;
- the proposed test count is ≥ 30 (57 numbered checks confirmed, plus a 12-item non-numbered Gate C checklist).

All fourteen conditions are met.

**Result: PASS.**

## Owner / reviewer

- Prepared by: Mareenraj (builder).
- **Business requirement approval**: completed — by the repository owner/user, including this round's correction.
- **Technical review**: required for the new route, the `_build_review_summary_query` extraction, the route-declaration-order safeguard, the empty-result 404 design, and the `reportlab` dependency choice — **specifically gated on Gate A passing before implementation begins, and Gate C passing before any production-compatibility claim, formalized this round as three explicit sequential stages rather than one undifferentiated gate.**
- **Additional domain-member consultation** (Mayurika, Suman, Arun, Rajiv, Paraparan individually): optional, unless separately requested — not a mandatory implementation gate, consistent with CLAUDE.md §18.

## Status

Gate A PASSED (2026-08-06); production dependency source confirmed as `pyproject.toml` (2026-08-06, round 4); Gate B AUTHORIZED, not yet started — not yet implemented, not yet deployed, no application dependency installed, no PDF remains in the repository, neither `pyproject.toml` nor `backend/requirements.txt` modified, no production data touched.

## Limitations

Same as `docs/2026-08-06_review-summary-pdf-export-technical-design.md` §14, plus: Gate A of the `reportlab` deployment-validation gate (§5.6) has now run and passed (`validation/review-summary-pdf-reportlab-preflight-2026-08-06.md`) — no live browser walkthrough, no live database query (none needed, no schema change proposed), no application code executed and no dependency installed into this repository's own environment this session. Gate C (Vercel preview) necessarily remains unrun, since it depends on Gate B's not-yet-built endpoint. The `pillow` transitive-dependency wheel-availability question on the actual Vercel runtime target remains an open Gate C watch item. The confirmed production dependency source (`pyproject.toml`) has not itself been touched by any Gate A or correction-round activity — this is a documentation finding, not a code change.

## One next step

Begin Gate B: pin `reportlab==5.0.0` (the Gate-A-verified exact version) in `pyproject.toml`'s `[project.dependencies]` array (the confirmed canonical production/Vercel dependency source) and in `backend/requirements.txt` (evidenced as required for local dev/test parity, kept in sync), implement `backend/review_summary_pdf_export.py` and the `/export/pdf` route per the approved technical design, and run the full Gate B test suite (53 tests, including the dual-file version-drift check) plus existing regression suites. Gate C (Vercel preview validation) follows only once Gate B produces a working endpoint — only Gate C's PASS authorizes a production-compatibility claim or production deployment. Additional domain-member consultation remains available on request but is not a precondition.

**Branch-strategy note:** implementation branch strategy is not defined by this design and must follow the repository owner's explicit instruction at implementation start.
