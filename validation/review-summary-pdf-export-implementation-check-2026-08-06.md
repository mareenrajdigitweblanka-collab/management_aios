---
name: review-summary-pdf-export-implementation-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-PDF-003
---

# Gate B — Implementation Check — Employee Review Summary PDF Export (2026-08-06)

> **Correction (2026-08-06, same-day, Gate B final verification):** Four corrections to this document. (1) A prior version of `backend/review_summary_pdf_export.py` contained an isolated hardcoded special case (`if member_key == "paraparan": role = "Auditor"`) instead of reading from one structured backend registry — a technical defect. Corrected: `backend/config.py` gained a new `MEMBER_DIRECTORY` structured registry (`{displayName, role}` per member key); `MEMBER_LABELS` is now derived from it but remains byte-for-byte identical to its pre-correction values for every existing consumer (`calendar_auth.py`, `member_schedules.py`, `member_leave.py`, and their test suites — confirmed by the full backend suite, 6 new tests, and zero regressions). See "Reviewer identity source," corrected below. (2) §"Visual fabricated-PDF result" originally described `pypdf` text extraction as the visual-inspection method; this is corrected to state plainly that `pypdf` extraction is **structural** validation only, and a separate, genuine graphical/rendered inspection was subsequently performed (below). (3) The deployment-path question ("does pushing `main` trigger production deployment?") is now answered from confirmed in-repo evidence (`backend/README.md`), not left unresolved. (4) A safe Gate C preview method is now defined. Underlying Gate B facts (dependency pins, shared query, route behavior, filename, headers, empty-result behavior) are unchanged by this correction.

## Requirement ID

REQ-CAL-REV-PDF-003.

## Design commits (approved implementation truth for this session)

- `727c381` — Design Review Summary PDF export
- `1c10bb6` — Clarify Review Summary PDF export safety
- `40aa68c` — Correct Review Summary PDF validation gates
- `69cda5e` — Validate ReportLab PDF preflight (Gate A)
- `4837535` — Align PDF dependency source and preflight evidence

All pushed to `origin/main` prior to this Gate B implementation session (confirmed local main == origin/main == `4837535` before work began).

## Gate A evidence

`validation/review-summary-pdf-reportlab-preflight-2026-08-06.md` / `handover/2026-08-06__review-summary-pdf-reportlab-preflight-closure.md` — PASS. Local preflight (Windows 10, Python 3.14.4) verified `reportlab==5.0.0` installs cleanly and generates valid single-/multi-page synthetic PDFs. Vercel runtime compatibility was explicitly **not** proven by Gate A and remains Gate C's job.

## Exact ReportLab version

`reportlab==5.0.0` — the Gate-A-verified version, now pinned identically in both dependency files (below). No other version was installed or considered this session.

## Dependency-source changes

| File | Change |
|---|---|
| `pyproject.toml` | Added `"reportlab==5.0.0"` to the existing `[project.dependencies]` array, in the array's own established quoted-string style — the confirmed canonical production/Vercel dependency source (§5.6 "Production dependency-source evidence," `validation/member-schedule-vercel-function-crash-check-2026-07-10.md`) |
| `backend/requirements.txt` | Added `reportlab==5.0.0` on its own line — evidenced as actively required for local dev/test parity, kept in sync with `pyproject.toml`. Also added `pypdf==6.14.2` under a new "Test-only" comment (mirrors the existing `httpx` test-only precedent) — required only by `backend/tests/test_review_summary_pdf_export.py` to parse generated PDF bytes for content assertions; never imported by any production code path |
| `backend/tests/test_dependency_pin_consistency.py` (**new**, 7 tests) | Automated drift detection: both files declare `reportlab` exactly once, both pin exactly `==5.0.0`, both match each other |

## Shared authoritative filter/query result

`_build_review_summary_query()` extracted from `list_staff_review_summaries`'s previously-inline filter logic (`backend/routers/staff_review_summaries.py`) — a behavior-preserving refactor confirmed by the full pre-existing 58-test suite passing unmodified after the extraction. Both `GET /api/staff-review-summaries` (LIST, paginated) and `GET /api/staff-review-summaries/export/pdf` (export, unpaginated — the complete matching set) now call this one function, so the two routes can never silently disagree about which rows a given (acting member, filter) combination returns. All required behaviors preserved and confirmed by test: authentication, `reviewed_staff_id` filter, All-reviewers mode (`include_all_reviewers=true`, `reviewed_staff_id` required, `reviewer_member_key` omitted), specific-reviewer mode (`reviewer_member_key=<key>`, `include_all_reviewers` false/omitted), the invalid-combination 422, `date_from`/`date_to`, `deleted_at IS NULL`, `meeting_date DESC, created_at DESC` ordering, LIST's existing pagination (unchanged), and export's deliberate lack of pagination.

## Authorization

Identical to every existing Staff Review Summaries route — `Depends(get_verified_member)`. Missing/invalid token → 401 (tests confirm). Any authenticated Management Team member may export any employee's matching active records regardless of who authored them (shared-read, not ownership) — confirmed by test (`test_export_authenticated_shared_reader_can_export`, `test_export_does_not_require_ownership_of_any_returned_record`). Existing owner-only CREATE/UPDATE/DELETE rules are completely untouched — confirmed by 4 dedicated regression tests plus the full pre-existing 58-test suite passing unmodified.

## Employee / reviewer / date scopes

- **Employee**: `reviewed_staff_id` is a required query parameter (422 if omitted) — the export can never be unscoped to "every employee." Employee display name is resolved server-side from the authoritative `StaffDashboardRecord` row (`full_name`/`calling_name`), never accepted from the browser as authoritative.
- **Reviewer**: All-reviewers and specific-reviewer modes both confirmed by test to include/exclude exactly the expected records; the mutually-exclusive-combination 422 is confirmed.
- **Date**: `date_from`/`date_to` confirmed independently and together; omitting both returns the complete active history (confirmed by test with a 200-day-old and a current-day record both present).
- Soft-deleted records confirmed excluded from every filter combination.

## PDF content

`backend/review_summary_pdf_export.py` — A4, `reportlab.platypus.SimpleDocTemplate`, entirely in-memory (`BytesIO`, no disk file — confirmed by a dedicated test that monkeypatches `builtins.open` to raise if ever called). Header ("Management AIOS" / "Employee Review Summary"), filter-summary block (reviewed employee, reviewer scope, From/To when supplied, generated timestamp, total record count), and per-record fields (meeting date, reviewed by, reviewer role, created/updated timestamps, complete summary text) all confirmed present by text-extraction test. Paragraphs and explicit line breaks are converted to `<br/>` markup (with `&`/`<`/`>` escaped first, so untrusted summary text can never inject markup) — confirmed accepted by generation without error and present in extracted text; a dedicated test confirms `<script>`/`<b>` content is never interpreted as markup. Records ordered `meeting_date DESC, created_at DESC`, matching the UI and LIST exactly. No raw UUIDs, no Edit/Delete controls, no token — confirmed by a dedicated regex-based test finding no UUID-shaped string anywhere in extracted text. PDF metadata `Title` is the fixed generic string `"Management AIOS Employee Review Summary"` — confirmed never to contain the actual employee name, even when that name is deliberately "confidential-sounding" fabricated test input.

## Reviewer identity source (corrected, Gate B final verification)

**Prior defect, now corrected.** The version of `backend/review_summary_pdf_export.py` committed in `d018dc7` contained an isolated hardcoded special case — `if member_key == "paraparan": return {"displayName": label, "role": _PARAPARAN_ROLE_OVERRIDE}` — instead of reading Paraparan's role from one authoritative structured backend source. This is exactly the prohibited pattern this verification pass checked for, and it was found. It has been removed.

**Corrected data flow, per reviewer:**

```
record.reviewer_member_key (DB column, e.g. "mayurika")
  → backend/config.py: MEMBER_DIRECTORY[key] = {"displayName": ..., "role": ...}
    → backend/review_summary_pdf_export.py: resolve_reviewer(key) reads MEMBER_DIRECTORY[key] directly, no split/parse/special-case
      → {"displayName": ..., "role": ...}
        → PDF body: "Reviewed by: <displayName>" / "Reviewer role: <role>" (two separate fields)
```

For Paraparan specifically: `MEMBER_DIRECTORY["paraparan"] = {"displayName": "Paraparan", "role": "Auditor"}` — a plain dict entry in `backend/config.py`, read by `resolve_reviewer()` exactly like every other key, with **no per-key conditional anywhere in `review_summary_pdf_export.py`**.

**Backward compatibility preserved.** `MEMBER_LABELS` (used by `calendar_auth.py`'s `/verify` endpoint, `member_schedules.py`, `member_leave.py`, and ~10 existing test modules) is now *derived* from `MEMBER_DIRECTORY`, not a second independently-maintained map — but every value remains byte-for-byte identical to its pre-correction literal form, confirmed by a dedicated test and by the full backend suite (723 total, only the same 2 pre-existing unrelated failures). Paraparan's `MEMBER_LABELS` entry deliberately still does **not** include "Auditor" (`MEMBER_LABELS["paraparan"] == "Paraparan"`, unchanged) — appending it there would silently imply the still-open External Auditor vs. Accountant designation dispute (SRC-ARUN-CONF-001 vs. the HR-provided PDF) had been resolved, which it has not. Only `MEMBER_DIRECTORY`'s per-field `role` carries the approved "Auditor" **display** decision, for the PDF export (and any future per-field consumer).

**Prohibited-approach checklist, verified clean:**
1. Hardcoded `if key == "paraparan"` logic — **removed** (was present, now gone; confirmed by a dedicated regression test that greps the module's own source).
2. A second independent role dictionary outside the authoritative backend config — **not present**; `MEMBER_DIRECTORY` is the one new structure, and `MEMBER_LABELS` is derived from it, not maintained separately.
3. Reading/parsing `web-view/js/member-registry.js` at application runtime — **not present**; the backend never imports or opens that file. The only place it is read is a test (`test_frontend_registry_consistency_where_practical`), confirmed test-only.
4. Accepting display name or role from the browser request — **not present**; the export route's query parameters are `reviewed_staff_id`, `reviewer_member_key`, `include_all_reviewers`, `date_from`, `date_to` only — no display-name/role parameter exists on the route at all.
5. Parsing arbitrary UI text at export time — **not present**.

Unknown/unrecognized keys resolve safely to `{displayName: "Unknown", role: "Unknown"}`, never a fabricated value or a thrown exception — confirmed by test for `None`, an empty string, and an arbitrary unknown key. The browser never supplies reviewer display name or role for this export; only `reviewer_member_key` (an internal join key already present on every record, never itself a display value) ever reaches the PDF module, and only via already-queried database rows — never a request parameter.

**Identity files changed in this correction:** `backend/config.py` (new `MEMBER_DIRECTORY`; `MEMBER_LABELS` re-expressed as a derivation, same values), `backend/review_summary_pdf_export.py` (`resolve_reviewer()`/`_resolve_member_label()` now read `MEMBER_DIRECTORY`, special case removed), `backend/tests/test_review_summary_pdf_export.py` (6 new tests: `MEMBER_DIRECTORY` shape, Paraparan's role, `MEMBER_LABELS` backward-compatibility incl. Paraparan's role-less string, confirmation `resolve_reviewer` reads `MEMBER_DIRECTORY` not `MEMBER_LABELS`, confirmation no hardcoded special case remains in source).

## Filename

`review-summaries_<sanitized-employee-name>_<YYYY-MM-DD>.pdf`, built server-side by `build_review_summary_pdf_filename()`. Confirmed by test: spaces preserved (not unsafe), apostrophes/slashes/backslashes/colons/control characters removed or replaced, repeated punctuation collapsed, non-ASCII transliterated to a safe subset, path-traversal sequences (`..`) neutralized, header-injection sequences (`"`, CR, LF) neutralized, an all-unsafe input falls back to the safe literal `"employee"` rather than producing an empty/malformed filename, and NIC/token/summary-text/reviewer-name/UUID-shaped strings never appear in the generated filename. The filename is **not** claimed to be free of identifiable information — the employee display name is intentionally included, per the approved requirement.

## Cache behavior

`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`, `Cache-Control: no-store` all confirmed present on a successful export response by direct header assertion. Set explicitly on the `Response` object the route returns (not solely via the injected `response` parameter's `_set_no_store()` call), since FastAPI does not merge injected-dependency headers into a directly-returned `Response` instance — this nuance was discovered and corrected during implementation via an empirical smoke test before the formal test suite was written.

## Empty-result behavior

Zero matching active records → `404` with the exact detail text `"No review summaries match the selected filters."`, **no PDF bytes, no `application/pdf` content type** — confirmed by test. The frontend inspects the response status before ever calling `.blob()`; on this specific 404 it shows the message and leaves the selected employee and both filters exactly as they were (no `resetWorkspaceState()` call) — confirmed by a dedicated frontend test asserting `state.selectedStaff`/`state.reviewerFilter` are unchanged after a 404.

## Browser-download behavior

`web-view/js/review-summaries.js`'s `downloadReviewSummariesPdf()` — its own dedicated `fetch` call (not `reviewSummariesApiRequest()`, which unconditionally calls `.json()`, wrong for a binary body), reusing `ensureAuthorized()`/`handleUnauthorizedResponse()` for identical authentication behavior to every other request this workspace makes. On success: `res.blob()` → `URL.createObjectURL()` → a temporary `<a download>` → `.click()` → `document.body.removeChild()` → `URL.revokeObjectURL()` — confirmed by test that exactly one object URL is created and the same one is later revoked. The filename used for the download comes from the response's own `Content-Disposition` header, not re-derived client-side. On a missing/invalid/expired token: identical behavior to every other request (`handleUnauthorizedResponse()` → `CALENDAR_AUTH_CHANGED_EVENT` → full workspace reset) — confirmed by test. On any other failure: a generic, safe error toast, never summary content or a stack trace. The application never claims it can force a browser save-location picker — the browser's own settings control whether a Save As prompt appears or its configured Downloads folder is used silently, exactly as the approved design specifies. No PDF bytes or Blob are ever written to `localStorage`/`sessionStorage`/IndexedDB/the application database — confirmed by test that the only key present in localStorage after a successful export is the pre-existing Calendar auth token.

Two state-management behaviors were extended to the export button/state to match this workspace's existing invariants: leaving the dedicated tab (`msc:close-toolbar-popovers`) and a token change (`CALENDAR_AUTH_CHANGED_EVENT`) both already fully reset the workspace via the existing `resetWorkspaceState()` — the export button's own disabled state (and `state.exportInFlight`) now participate in that same single reset path, confirmed by two dedicated tests, rather than needing a second, parallel reset mechanism.

## Visual fabricated-PDF result (corrected — structural vs. graphical inspection now separated)

**Structural validation (Phase 14, original pass)**: `pypdf` text extraction and page-count assertions confirmed content presence, ordering, and page count for 3 fabricated PDFs (single record, 3-reviewer, forced-multi-page). **Corrected wording**: this is structural validation only — it does not itself confirm visual/pixel-level correctness and is not described as visual inspection in this document.

**Graphical rendering inspection (this verification pass, genuine)**: headless Microsoft Edge and Google Chrome were both installed on this machine, but their built-in PDF-viewer plugin did not render inside the `--headless=new --screenshot=` capture path attempted (output was a uniform blank/dark image — the PDF plugin does not paint in that specific headless screenshot mode in this environment). Rather than report that non-result as a visual check, the actual PDF bytes were rendered to PNG images at 150 DPI using **PyMuPDF (fitz) 1.28.0** — a genuine PDF rendering engine (built on MuPDF), already present in this environment (not newly installed for this task) — and each page image was then visually inspected directly (viewed as an image, not read as extracted text). This is real pixel-level rendering, not a text-extraction proxy, though it is not literally "opened in Edge/Chrome/Acrobat" as originally requested — that deviation and its reason are stated here plainly rather than left implicit.

Three fabricated PDFs generated, rendered, visually inspected, then deleted along with all PNG renders and the isolated Chrome profile directory:

| Fabricated PDF | Bytes | Pages | Visual observation |
|---|---|---|---|
| Single record | 2,087 | 1 | Heading ("Management AIOS" / "Employee Review Summary") clearly visible; reviewed employee and reviewer scope ("Mayurika") readable; Reviewed by / Reviewer role render as two separate lines; no clipping, no overlap, usable margins; page number "Page 1" correct |
| Multiple reviewers (3 records) | 2,339 | 1 | All 3 records visually separated by a clear horizontal rule; each shows its own meeting date, reviewer name, and role on distinct lines; Paraparan's card visually confirmed showing "Reviewer role: Auditor"; no clipping, no overlap |
| Forced multi-page (long summary, 3 paragraphs) | 4,969 | 5 | Page 1 fills to the bottom margin cleanly and stops before it (no clipped line); page 2 continues the filler text correctly at the top with no repeated or dropped text at the page boundary; final page (5) ends naturally where the fabricated content ends; page numbers "Page 1" through "Page 5" all correct and readable; no overlapping text on any inspected page |

No raw UUID-shaped string or internal ID was visible on any inspected page. Margins were usable on every page inspected (1, 2, and 5 of the 5-page document, plus both single-page documents in full).

**Corrected limitation, stated precisely**: this inspection is genuine rendered-pixel visual verification (not text extraction), covering the specific pages inspected (all pages of documents 1 and 2; pages 1, 2, and 5 of document 3 — not pages 3-4, which were generated but not individually screenshotted, though they consist of the same repeating filler content as pages 1-2 and 5 and were confirmed present via the earlier structural `pypdf` page-count check). It does not substitute for opening the file in an actual end-user-facing PDF viewer (Edge/Chrome's native plugin, or Acrobat) — that specific method was attempted and did not produce a usable capture in this headless environment, a genuine tooling limitation of this environment, not a skipped step.

## Exact test totals (updated — identity correction adds 6 tests)

| Suite | Result |
|---|---|
| Targeted dependency-pin (`test_dependency_pin_consistency.py`) | 7/7 |
| Targeted PDF backend (`test_review_summary_pdf_export.py`) | 48/48 (was 42 at initial implementation; +6 new identity-correction tests: `MEMBER_DIRECTORY` shape, Paraparan's role, `MEMBER_LABELS` backward-compatibility incl. Paraparan's role-less string, `resolve_reviewer` reads `MEMBER_DIRECTORY`, no hardcoded special case remains) |
| Targeted Review Summary backend (`test_staff_review_summaries.py`) | 88/88 (unaffected by the identity correction) |
| Full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) | 723 total, 721 passed, 2 failed — the same 2 pre-existing, unrelated, documented baseline failures (`test_missing_variable_fails_closed`, `test_pending_task_no_outcome`), unchanged; includes `test_calendar_auth.py` and `test_calendar_mutation_authorization.py` re-run in full to confirm the `MEMBER_LABELS`-consuming auth/token behavior is unaffected by the `backend/config.py` restructuring |
| Review Summary frontend (`review-summaries.test.mjs`, includes PDF export tests) | 84/84 (unaffected — backend-only correction) |
| Navigation structure (`navigation-structure.test.mjs`) | 16/16 (unchanged) |
| Full Calendar frontend suite (`calendar/*.test.mjs`) | 179/179 (unchanged, zero regression) |
| Combined frontend | 279/279 (unchanged) |

All new tests pass, including the 6 identity-correction tests. Zero frontend regression. Zero new backend failure. Only the 2 pre-existing, documented, unrelated baseline failures remain.

## Deployment-path discovery (new)

**Confirmed from in-repo evidence** (`backend/README.md`, "Deploy to Vercel (connected to Neon)" section): `**Production branch:** main`, and step 7 of the setup instructions states deployment happens either from the Vercel dashboard "or let the GitHub integration deploy on push to `main`." **Answer: A — `main` is the production branch, and pushing to `main` triggers production deployment.** No Vercel project ID, token, or credential was read or exposed to reach this conclusion — it is stated in plain, already-committed repository documentation. This confirms why `d018dc7` (and every other pending Gate A/B commit) must not be pushed until Gate C passes.

## Safe Gate C method (new)

No deployment was performed. The defined, not-yet-executed safe sequence:

1. **Local Gate B commit** — done (`d018dc7`, plus this verification's identity-correction commit), held on local `main`, not pushed.
2. **Preview deployment** — requires one of: (a) the repository owner explicitly authorizing creation of a temporary branch from `d018dc7` (e.g. `preview/req-cal-rev-pdf-003-gate-c`), pushing **only** that branch (never `main`) to `origin`, and relying on Vercel's GitHub integration to build a preview deployment from it; or (b) the repository owner (or an explicitly credentialed session) running the Vercel CLI **without** `--prod` from the local `d018dc7` working tree. **Neither was performed** — (a) requires explicit branch-creation approval not given in this task, and (b) requires Vercel CLI authentication not available in this environment. This is reported as unresolved/pending, not silently skipped.
3. **Gate C validation** — once a preview URL exists, run the full Gate C checklist (§5.6 of the technical design): pinned-dependency install, function startup, OpenAPI presence, missing/invalid-token rejection, `application/pdf` response on success, correct headers, empty-result 404 with no PDF bytes, bundle-size/execution-time within the active Vercel project's real limits, and a browser download walkthrough.
4. **Evidence commit** — record Gate C's actual results in new validation/handover files, committed locally.
5. **Production/`main` deployment approval** — only after the repository owner reviews and approves the Gate C evidence does `main` get updated — and, per the confirmed production-branch/GitHub-integration setup above, that push will itself trigger the production deployment; no separate manual "deploy to prod" step exists or is needed once that push happens.

**Gate C branch/action approval needed: YES** — before this repository can move past step 1, the repository owner must either approve creation of a temporary preview branch, or provide/perform Vercel CLI authentication for a local preview deployment.

## Database/schema changes

**0.** No migration, model, or schema file was touched. `backend/schemas.py`/`backend/models.py` are unmodified — `StaffReviewSummaryOut` and the ORM `StaffReviewSummary` model are reused unchanged; the PDF route builds plain Python dicts from already-queried ORM rows, never a new schema class.

## Production writes

**0.** Every test in this session ran against an isolated in-memory SQLite database via `TestClient`'s `get_db` override (`backend/tests/calendar_auth_test_support.py`) — no PostgreSQL connection was opened at any point.

## Production records changed

**0.**

## Gate C still pending

Unchanged and fully unrun. Gate B's completion (this report) authorizes only local implementation and testing — Vercel preview validation (pinned-dependency install in the real preview build, function startup, OpenAPI presence, token rejection, `application/pdf` response, headers, empty-result 404, bundle-size/execution-time against the active Vercel project's real limits, a browser download walkthrough) has not been performed and cannot be performed until this implementation is deployed to a preview environment, which this task explicitly did not authorize.

## Protected path excluded

`member-aios/mayurika-hr/staff-data/` was not opened, read, or modified at any point in this session.

## Unrelated roster file excluded

`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` was not opened, modified, deleted, or staged at any point in this session.

## PASS / AMBER / FAIL (superseded by REQ-CAL-REV-PDF-003-FIX-01 below)

**AMBER**, as of this Gate B verification round. Implementation was complete, fully tested locally with zero regressions (723 backend / 279 frontend, only the 2 pre-existing documented baseline failures present), and committed directly to local `main`, but not pushed pending a Gate C preview-deployment method. **This status is superseded by the REQ-CAL-REV-PDF-003-FIX-01 section below**, in which the repository owner explicitly authorized direct production deployment via push to `main` — see that section for the final outcome.

## One next step (superseded by REQ-CAL-REV-PDF-003-FIX-01 below)

Superseded — see REQ-CAL-REV-PDF-003-FIX-01's own "One next step."

---

# REQ-CAL-REV-PDF-003-FIX-01 — Missing production Download PDF button

## Screenshot-observed defect

A production screenshot showed the Management AIOS production frontend (`https://management-aios.vercel.app`), authorized as "Suman — Recruiting Officer," Review Summaries tab active, one employee selected, Review History visible with Reviewer/From/To filters and two review records — but **no Download PDF button visible anywhere near the filters**, contrary to the approved requirement (one page-level button in that exact location).

## Root cause

**#1 — Implementation commits never pushed.** `git branch -r --contains d018dc7` and `git branch -r --contains 4d49a1b` both returned empty — neither Gate B commit had ever reached `origin/main`. This is Case A of the diagnosis protocol (implementation commits present locally, absent from origin), not a code defect.

**Evidence chain, each step independently confirmed:**
1. `git diff --name-status origin/main...main` before this fix contained exactly the approved PDF implementation files — no unrelated or unexpected changes.
2. Production frontend asset check: fetched `https://management-aios.vercel.app/index.html` → `./js/app.js` → `./js/review-summaries.js` (994 lines). Contains **zero** occurrences of `Download PDF`, `export/pdf`, or any export-related identifier. Byte-for-byte diff against `origin/main`'s current `web-view/js/review-summaries.js` (also 994 lines) returned **no differences** — production is running exactly what is on `origin/main` today, which simply predates the PDF feature.
3. Production backend asset check: fetched `https://management-aios-api.vercel.app/openapi.json` — contains only `/api/staff-review-summaries` and `/api/staff-review-summaries/{summary_id}`; **no** `/export/pdf` path. A request to the export path with no token returned `404 {"detail":"Not Found"}` — FastAPI's generic route-not-found response, not this feature's own empty-result 404 (`"No review summaries match the selected filters."`), confirming the route itself does not exist in the deployed backend. `/health` returned `{"status":"ok",...}` — the backend is running fine, just on an older commit.

**Conclusion: no code defect exists anywhere in the PDF export implementation.** The button, its click handler, the export query construction, the Blob download, and the object-URL cleanup are all present, correct, and already covered by the local automated test suite — they were simply never deployed.

## Were implementation commits previously pushed?

**No.** Confirmed by `git branch -r --contains` returning empty for both `d018dc7` and `4d49a1b`, and independently reconfirmed by the byte-identical production-vs-`origin/main` JS diff above.

## Production frontend asset result

**A — production asset does not contain the PDF implementation** (per Phase 5's classification). Fully explained by "commits never pushed," not a caching or stale-reference issue — the deployed asset matches `origin/main` exactly, with no drift.

## Production backend route result

- Export route deployed: **NO**.
- Missing-token result: `404 {"detail":"Not Found"}` (generic FastAPI route-not-found — confirms the route does not exist, not an auth rejection).
- Backend startup result: healthy (`/health` returns `200 {"status":"ok"}`) — the running backend is simply on an older, pre-PDF-feature commit.

## Files changed in this fix

| File | Change |
|---|---|
| `web-view/js/review-summaries.test.mjs` | 4 new production-hardening tests: duplicate-click guard sends exactly one request, button survives a history rerender as one node, switching employees keeps exactly one button, leaving/returning to the tab recreates exactly one valid button |

**No application code changed** — `web-view/js/review-summaries.js`, `web-view/css/review-summaries.css`, `web-view/index.html`, and every backend file were inspected and confirmed already correct; none required a code change. This is a push-only fix for the underlying defect, plus additional test coverage given the production stakes.

## Exact button placement (confirmed, local DOM dump)

Verified by serving the actual repository frontend locally (`python -m http.server`) and capturing a real headless-Chrome DOM dump (no authentication, no production/test token used) — this is the literal DOM this application produces:

```html
<div class="review-summaries-filters"> ... Reviewer / From / To ... </div>
<div class="review-summaries-export-actions">
  <button class="msc-btn msc-btn-secondary review-summaries-export-btn" type="button" disabled="">Download PDF</button>
</div>
<div class="review-summaries-history"></div>
```

One button, immediately after the Reviewer/From/To filters and before the history list, inside the Review History panel — exactly the required placement. No console errors occurred during page load/module initialization.

## Selected/no-selection behavior (confirmed by test, unchanged)

- **Authorized + employee selected**: button visible, enabled (when the date range is valid).
- **Authorized + no employee**: button remains visible, disabled (never `hidden`/`display:none` — toggled via the `disabled` attribute only).
- **Unauthorized**: the entire Review History panel (including the button) is inside the existing authorization gate — no export request can be sent.
- **Invalid date range**: disabled, no request.
- **Export in progress**: disabled immediately on click; a second click while in flight is a synchronous no-op (confirmed by new test: exactly one fetch call despite two calls); returns to enabled once the export settles, regardless of success or failure.

## Tests (updated totals)

| Suite | Result |
|---|---|
| Dependency-pin (`test_dependency_pin_consistency.py`) | 7/7 (unchanged) |
| PDF backend (`test_review_summary_pdf_export.py`) | 48/48 (unchanged) |
| Review Summary backend (`test_staff_review_summaries.py`) | 88/88 (unchanged) |
| Full backend suite | 723 total, 721 passed, 2 failed — same 2 pre-existing documented baseline failures only |
| Review Summary frontend (`review-summaries.test.mjs`) | **88/88 (was 84; +4 new production-hardening tests)** |
| Navigation structure | 16/16 (unchanged) |
| Full Calendar frontend suite | 179/179 (unchanged, zero regression) |

## Local browser result

Authenticated local browser verification is **unavailable** in this environment (no safe non-production test token and no interactive browser tool for a full authenticated walkthrough) — per this task's own explicit fallback instruction, a production token was not used to work around this. In its place: (1) the full DOM-stand-in automated test suite (88/88) exercises the real rendering path end-to-end, including button creation, placement, enable/disable transitions, click handling, Blob download, and state-reset behavior; (2) a genuine local static-server + headless-Chrome DOM dump (no auth) independently confirmed the button's exact markup and placement in the real, unmodified `index.html`/`review-summaries.js`, with zero console errors.

## Mobile/zoom result

Not independently re-verified visually this round (no new CSS was written — `web-view/css/review-summaries.css`'s existing `.review-summaries-export-actions`/`.review-summaries-export-btn:disabled` rules, added and reasoned through during the original Gate B implementation, are unchanged). No global CSS regression risk, since no CSS file was touched in this fix.

## Database/schema changes

**0.**

## Production writes

**0.** No PostgreSQL connection was made. No production Review Summary record was created, read for content, updated, or deleted.

## Production records changed

**0.**

## Protected path excluded

`member-aios/mayurika-hr/staff-data/` was not opened or modified.

## Unrelated roster file excluded

`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` was not opened, modified, deleted, staged, or committed.

## PASS / AMBER / FAIL

**PASS**, contingent on a clean push and a successful, verified Vercel production deployment (recorded in the companion handover's post-push section). No code defect was found or needed; the root cause (commits never pushed) is fully resolved by pushing the already-correct, already-tested implementation.

## One next step (superseded by REQ-CAL-REV-PDF-003-FIX-02 below)

Superseded — see REQ-CAL-REV-PDF-003-FIX-02's own "One next step."

---

# REQ-CAL-REV-PDF-003-FIX-02 — Filename defect and management-friendly layout redesign

## Screenshot-observed defects

**Defect 1 — filename.** The production Save As dialog showed the literal fallback string `review-summaries.pdf` — no employee name, no export date. Required format: `Review_Summary_<Sanitized_Employee_Name>_<YYYY-MM-DD>.pdf`.

**Defect 2 — layout.** The generated PDF was structurally valid but visually plain: weak heading hierarchy, employee/filter details as unstructured text, review content not presented as clear record sections, timestamps at the same visual weight as content, no management-report styling, no confidentiality footer, no visible page numbering.

## Proven filename root cause (exactly one, selected from the task's own 7-item list)

**Cause #3 — CORS `expose_headers` missing `Content-Disposition`.** Proven by direct code inspection, not speculation:

1. Frontend's exact header-read code (`web-view/js/review-summaries.js`, pre-fix): `var disposition = res.headers.get('Content-Disposition') || ''; ... var filename = match ? match[1] : 'review-summaries.pdf';` — this exact fallback string is the exact string seen in the production screenshot, which is only reachable when `res.headers.get('Content-Disposition')` returns `null`.
2. A repository-wide search for `expose_headers`/`allow_headers` in `backend/` found `expose_headers` nowhere — confirming Starlette's `CORSMiddleware` default (`expose_headers=[]`) was in effect.
3. `Content-Disposition` is not in the browser's small CORS-safelisted response-header set (`Cache-Control`, `Content-Language`, `Content-Length`, `Content-Type`, `Expires`, `Last-Modified`, `Pragma`) exposed to `fetch()` JavaScript by default on a cross-origin response — and this app's frontend (`management-aios.vercel.app`) and backend (`management-aios-api.vercel.app`) are genuinely different origins.
4. Conclusion: the header was present on the wire the entire time; the browser's `fetch()` `Response.headers` object simply never exposed it to JavaScript. The backend's filename-generation logic itself was never the defect.

No other candidate cause from the task's 7-item list was implemented — only this one, proven cause.

## Filename fix

`backend/main.py`'s `CORSMiddleware` now sets `expose_headers=["Content-Disposition"]` (previously absent — Starlette default `[]`). No other CORS setting (origins, methods, allow_headers, credentials) changed. Confirmed with a new HTTP-level test (`test_calendar_auth.py::CorsExposeHeadersTests`) that issues a real `GET /health` with an `Origin` header (not an `OPTIONS` preflight, since `Access-Control-Expose-Headers` is only set by Starlette on the actual response) and asserts `Content-Disposition` is present in `Access-Control-Expose-Headers`.

## Final filename format

`Review_Summary_<Sanitized_Employee_Name>_<YYYY-MM-DD>.pdf`, built server-side by the rewritten `build_review_summary_pdf_filename()` (`backend/review_summary_pdf_export.py`). Example, confirmed by test: `Review_Summary_Mareenraj_Robinsan_Selvarajah_2026-08-06.pdf`. Sanitization rules confirmed by test: spaces become underscores (changed from the prior "spaces preserved" rule); reserved/unsafe characters (`\ / : * ? " < > |`, CR, LF, tab, other control characters) removed or replaced; apostrophes/quotes stripped; repeated underscores collapsed to one; path-traversal (`..`) and header-injection (`"`, CR, LF) sequences neutralized; non-ASCII transliterated to a safe ASCII subset for this filename form; an input that sanitizes to nothing falls back to the literal `Employee` (capitalized, changed from the prior lowercase `employee`); exactly one `.pdf` extension is guaranteed even if the input itself contains `.pdf`/`.PDF`; NIC/token/role/UUID-shaped strings never appear in the sanitized employee-name component.

## Content-Disposition result

`build_content_disposition_header()` (new) returns both forms in one header value: `attachment; filename="<ASCII-transliterated>"; filename*=UTF-8''<percent-encoded-UTF-8>`, per RFC 5987/6266. Confirmed by test for a non-ASCII fabricated name ("José García"): the `filename=` form transliterates to `Review_Summary_Jose_Garcia_2026-08-06.pdf`, while `filename*=UTF-8''` preserves the accents via percent-encoding (`%C3%A9`, `%C3%AD`). CR/LF can never appear literally in the header value (confirmed by test) — `urllib.parse.quote(..., safe="")` percent-encodes control characters inherently, and the same sanitizer feeds the `filename=` form.

## CORS exposure result

`Access-Control-Expose-Headers: Content-Disposition` confirmed present on a real (non-preflight) `GET` response carrying an `Origin` header — see "Filename fix" above.

## Frontend parsing result

`web-view/js/review-summaries.js` gained `parseReviewSummaryPdfFilename(dispositionHeader, fallbackEmployeeName, fallbackDateStr)`: prefers `filename*=UTF-8''<percent-encoded>` (URL-decoded, with a `try`/`catch` around malformed percent-encoding), falls back to the legacy quoted `filename="..."` form, then to a bare unquoted `filename=...` token, and only falls back to a generated filename (`buildFallbackReviewSummaryPdfFilename()`, mirroring the server's `Review_Summary_<Name>_<Date>.pdf` shape from `state.selectedStaff`'s display label and `getColomboTodayStr()`) when the header is genuinely unusable. Every parsed/generated value passes through a basename-only + control-character strip (defense-in-depth, not a duplicate of the server's own sanitization) and an `.pdf`-extension guarantee that never duplicates the extension if already present. `downloadReviewSummariesPdf()`'s prior 2-line inline regex-and-literal-fallback was replaced with a call to this function; no other behavior in that function (auth, 401/404/error handling, Blob creation, object-URL cleanup, toast messages) changed.

## New PDF structure

`backend/review_summary_pdf_export.py`'s `build_review_summary_pdf()` was redesigned (filename/CORS logic above is unrelated to this section): title "Management AIOS" + subtitle "Employee Review Summary"; a boxed employee-details section (Reviewed employee / Total review records / Generated); a boxed export-scope section (Reviewer scope — now "Name — Role", e.g. "Mayurika — HR", via new `reviewer_scope_label_for()`, was previously the bare name only; Date scope, below); each record rendered as a shaded "Review N" banner (numbered sequentially, confirmed by test) followed by Meeting date, "Reviewed by: X · Reviewer role: Y", a "Review Summary:" label, the full summary body, and a smaller/muted "Record information: Created ... · Updated ..." line — timestamps deliberately styled smaller/muted relative to the summary content itself, addressing the "timestamps have the same emphasis as content" defect. Only the record's heading block (banner + meeting date + reviewer line + summary label) is wrapped in `KeepTogether` so it can never be stranded alone at the bottom of a page; the summary body itself is a plain `Paragraph` (not `KeepTogether`/`Table`) so one record's content can still split safely across a page boundary without a `LayoutError` — this exact split was hit and fixed once during smoke-testing before the formal suite was written (see "Errors and fixes" precedent in this session).

## Date-scope phrasing (4 exact forms, confirmed by test)

| Inputs | Rendered text |
|---|---|
| Both `date_from` and `date_to` | `From <date_from> to <date_to>` |
| `date_from` only | `From <date_from> onward` |
| `date_to` only | `Up to <date_to>` |
| Neither | `All available dates` |

## Footer/numbering

Every page's footer shows `Confidential — Management Team Use` (left) and `Page X of Y` (right), via a `_NumberedCanvas(reportlab.pdfgen.canvas.Canvas)` subclass using the standard deferred-page-state recipe (`showPage()` saves state instead of flushing; `save()` iterates all saved states — now the true total page count is known — and draws the footer before flushing each page for real). A running header (`Management AIOS — Employee Review Summary`) appears on every page after the first. Confirmed by test for both a single-page document (`Page 1 of 1`) and a forced multi-page document (`Page 1 of N` through `Page N of N`, exact `N` computed from the actual `PdfReader` page count, not hardcoded).

## Fabricated visual validation (Phase 11)

9 fabricated-data scenarios generated with `backend.review_summary_pdf_export.build_review_summary_pdf` (never real staff/review data), rendered to PNG at 150 DPI via PyMuPDF (fitz) 1.28.0 — the same genuine rendering engine used in the original Gate B verification pass — and visually inspected as images (not text extraction) before every generated PDF and PNG was deleted:

| # | Scenario | Pages | Visual observation |
|---|---|---|---|
| 1 | Single short record | 1 | Clear title/subtitle hierarchy; boxed employee-details and export-scope sections render as distinct shaded panels; "Review 1" banner; muted "Record information" line; footer shows "Confidential — Management Team Use" and "Page 1 of 1" |
| 2 | Three records, three different reviewers | 1 | "Review 1"/"Review 2"/"Review 3" banners numbered sequentially; each separated by a horizontal rule; each shows its own meeting date and "Reviewed by: X · Reviewer role: Y" line |
| 3 | One record, very long summary | 6 | Page 1 confirms "Page 1 of 6" computed correctly up front; page 2 continues the summary body seamlessly with a running header, no repeated "Review 1" banner, no clipped/overlapping text; page 6 ends cleanly at the true end of the fabricated content with "Page 6 of 6" and the "Record information" line immediately following |
| 4 | All reviewers, no date filters | 1 | Export-scope section reads "All reviewers" / "All available dates" |
| 5 | Specific reviewer, both dates | 1 | Export-scope section reads "Arun — Implementation Officer" / "From 2026-01-01 to 2026-06-30" — the new combined Name — Role format confirmed visually, not just by text-extraction test |
| 6 | `date_from` only | 1 | Export-scope section reads "From 2026-02-01 onward" |
| 7 | `date_to` only | 1 | Export-scope section reads "Up to 2026-12-31" |
| 8 | Non-ASCII employee name ("José García") | 1 | Full accented characters render correctly in the PDF body (employee-details box shows "José García (Fabricated)") — confirming the body text is never ASCII-transliterated, only the filename is |
| 9 | Eight records, long body text each | 5 | Confirms the `KeepTogether` heading-block design under real multi-record pressure: "Review 2"'s banner appears near the bottom of page 1, its full body correctly continues at the top of page 2 with no repeated banner and no orphaned/stranded heading; final page ends at "Page 5 of 5" with record 8's content terminating cleanly |

No clipping, overlap, raw IDs, or excessive whitespace observed on any inspected page. All 9 fabricated PDFs and all rendered PNGs were deleted immediately after inspection (confirmed by a subsequent empty-directory listing of the scratch location used).

## Exact test totals

| Suite | Result |
|---|---|
| Targeted PDF backend (`test_review_summary_pdf_export.py`) | **67/67 (was 48; +19: filename-format rewrite, new `ContentDispositionHeaderTestCase` (5), new `reviewer_scope_label_for` test, new `PdfLayoutRedesignTestCase` (10) covering numbering/footer/page-numbers/date-scope phrasings)** |
| Targeted Review Summary backend (`test_staff_review_summaries.py`) | 88/88 (unchanged — route refactor is behavior-preserving) |
| Targeted Calendar auth / CORS (`test_calendar_auth.py`) | **19/19 declared, 18/19 pass (was 18/18 pass); +1 new `CorsExposeHeadersTests` test, passing; the 1 failure is the same pre-existing `test_missing_variable_fails_closed`, confirmed unrelated and reproduced identically on the unmodified tree via `git stash`** |
| Full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) | **743 total, 741 passed, 2 failed — the same 2 pre-existing, unrelated, documented baseline failures (`test_missing_variable_fails_closed`, `test_pending_task_no_outcome`), both independently reconfirmed present on the unmodified tree via `git stash`; zero new failures** |
| Review Summary frontend (`review-summaries.test.mjs`) | **102/102 (was 88; +14: filename-parser unit tests, end-to-end anchor-`download` tests, fallback-filename test, token-never-in-filename test)** |
| Navigation structure (`navigation-structure.test.mjs`) | 16/16 (unchanged) |
| Full Calendar frontend suite (`calendar/*.test.mjs`) | 179/179 (unchanged, zero regression) |
| Combined frontend (`web-view/js/*.test.mjs` + `web-view/js/calendar/*.test.mjs`) | **297/297 (was 283; +14)** |

All new tests pass. Zero frontend regression. Zero new backend failure. Only the 2 pre-existing, documented, unrelated baseline failures remain, each independently reconfirmed present on the unmodified tree before this session's changes.

## Database/schema changes

**0.** No migration, model, or schema file was touched.

## Production writes

**0.** Every test ran against an isolated in-memory SQLite database (`TestClient`'s `get_db` override) or pure in-process function calls — no PostgreSQL connection was opened at any point. PDF generation remains entirely in-memory (`BytesIO`), confirmed unchanged by the pre-existing `test_no_disk_file_is_created_by_generation` test (still passing).

## Production records changed

**0.**

## Protected path excluded

`member-aios/mayurika-hr/staff-data/` was not opened, read, or modified at any point in this session.

## Unrelated roster file excluded

`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` was not opened, modified, deleted, staged, or committed at any point in this session.

## PASS / AMBER / FAIL

**PASS**, contingent on a clean push and a successful, verified Vercel production deployment (recorded in the companion handover's post-push section). Both defects are root-caused (not guessed), fixed with the single proven cause for the filename defect, fully covered by new automated tests (backend and frontend), and visually confirmed via genuine PDF rendering — with zero regression against the full pre-existing suite.

## One next step

Push local `main` to `origin/main`, then verify the Vercel production deployment completes successfully, the export response exposes `Content-Disposition` in production, and the production frontend downloads a correctly-named, correctly-laid-out PDF — full detail in the companion handover's post-push verification section.
