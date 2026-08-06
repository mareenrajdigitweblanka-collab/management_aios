---
name: review-summary-pdf-export-implementation-check
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-PDF-003
---

# Gate B — Implementation Check — Employee Review Summary PDF Export (2026-08-06)

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

## Reviewer identity source (Phase 5 gate)

`resolve_reviewer(member_key)` in `backend/review_summary_pdf_export.py` is built **from** `backend/config.py`'s one existing `MEMBER_LABELS` registry (split on `" — "`) — not a third, independently invented registry. `config.py` itself was **not modified**. Paraparan's role resolves to the deliberate `"Auditor"` exception (mirroring `web-view/js/member-registry.js`'s own documented decision, never independently re-derived). Unknown/unrecognized keys resolve safely to `{displayName: "Unknown", role: "Unknown"}`, never a fabricated value or a thrown exception — confirmed by test for `None`, an empty string, and an arbitrary unknown key. A dedicated consistency test (`test_frontend_registry_consistency_where_practical`) parses `web-view/js/member-registry.js`'s own `MEMBER_REGISTRY` object textually and asserts every one of its 5 entries matches this backend resolver's output exactly, so the two cannot silently drift apart — the "consistency test against the frontend registry where practical" this task's Phase 5 asked for. The browser never supplies reviewer display name or role for this export; only `reviewer_member_key` (an internal join key already present on every record, never itself a display value) ever reaches the PDF module, and only via already-queried database rows — never a request parameter.

## Filename

`review-summaries_<sanitized-employee-name>_<YYYY-MM-DD>.pdf`, built server-side by `build_review_summary_pdf_filename()`. Confirmed by test: spaces preserved (not unsafe), apostrophes/slashes/backslashes/colons/control characters removed or replaced, repeated punctuation collapsed, non-ASCII transliterated to a safe subset, path-traversal sequences (`..`) neutralized, header-injection sequences (`"`, CR, LF) neutralized, an all-unsafe input falls back to the safe literal `"employee"` rather than producing an empty/malformed filename, and NIC/token/summary-text/reviewer-name/UUID-shaped strings never appear in the generated filename. The filename is **not** claimed to be free of identifiable information — the employee display name is intentionally included, per the approved requirement.

## Cache behavior

`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="..."`, `Cache-Control: no-store` all confirmed present on a successful export response by direct header assertion. Set explicitly on the `Response` object the route returns (not solely via the injected `response` parameter's `_set_no_store()` call), since FastAPI does not merge injected-dependency headers into a directly-returned `Response` instance — this nuance was discovered and corrected during implementation via an empirical smoke test before the formal test suite was written.

## Empty-result behavior

Zero matching active records → `404` with the exact detail text `"No review summaries match the selected filters."`, **no PDF bytes, no `application/pdf` content type** — confirmed by test. The frontend inspects the response status before ever calling `.blob()`; on this specific 404 it shows the message and leaves the selected employee and both filters exactly as they were (no `resetWorkspaceState()` call) — confirmed by a dedicated frontend test asserting `state.selectedStaff`/`state.reviewerFilter` are unchanged after a 404.

## Browser-download behavior

`web-view/js/review-summaries.js`'s `downloadReviewSummariesPdf()` — its own dedicated `fetch` call (not `reviewSummariesApiRequest()`, which unconditionally calls `.json()`, wrong for a binary body), reusing `ensureAuthorized()`/`handleUnauthorizedResponse()` for identical authentication behavior to every other request this workspace makes. On success: `res.blob()` → `URL.createObjectURL()` → a temporary `<a download>` → `.click()` → `document.body.removeChild()` → `URL.revokeObjectURL()` — confirmed by test that exactly one object URL is created and the same one is later revoked. The filename used for the download comes from the response's own `Content-Disposition` header, not re-derived client-side. On a missing/invalid/expired token: identical behavior to every other request (`handleUnauthorizedResponse()` → `CALENDAR_AUTH_CHANGED_EVENT` → full workspace reset) — confirmed by test. On any other failure: a generic, safe error toast, never summary content or a stack trace. The application never claims it can force a browser save-location picker — the browser's own settings control whether a Save As prompt appears or its configured Downloads folder is used silently, exactly as the approved design specifies. No PDF bytes or Blob are ever written to `localStorage`/`sessionStorage`/IndexedDB/the application database — confirmed by test that the only key present in localStorage after a successful export is the pre-existing Calendar auth token.

Two state-management behaviors were extended to the export button/state to match this workspace's existing invariants: leaving the dedicated tab (`msc:close-toolbar-popovers`) and a token change (`CALENDAR_AUTH_CHANGED_EVENT`) both already fully reset the workspace via the existing `resetWorkspaceState()` — the export button's own disabled state (and `state.exportInFlight`) now participate in that same single reset path, confirmed by two dedicated tests, rather than needing a second, parallel reset mechanism.

## Visual fabricated-PDF result (Phase 14)

No PDF viewer application is available in this headless environment (same limitation this repository has documented throughout its Calendar-feature history) — inspection was performed via `pypdf` text extraction and page-count assertions, the same method Gate A itself used. Generated and inspected, then deleted:

| Fabricated PDF | Bytes | Pages | Observation |
|---|---|---|---|
| Single record | 2,060 | 1 | Heading, filter scope ("Mayurika"), and the one record's fields all present in extracted text |
| Multiple records (3 reviewers) | 2,340 | 1 | All 3 meeting dates, all 3 reviewer names, and Paraparan's "Auditor" role all present; "Meeting date:" appears exactly 3 times, confirming clean record separation with no merged/duplicated cards |
| Long summary (forced multi-page) | 2,861 | 2 | Both fabricated paragraphs present in extracted text across the 2-page span; From/To date scope present in the header block |

No raw UUID-shaped string was found anywhere in the multi-record PDF's extracted text. Filename sanitization re-confirmed against a fabricated `"Fabricated O'Brien/Employee"` input, producing `review-summaries_Fabricated OBrien-Employee_2026-08-06.pdf`.

**Known limitation, stated plainly (matches Gate A's own limitation)**: text-extraction-based inspection confirms content presence, ordering, and page count, but does **not** constitute a rendered-pixel visual check — clipped or overlapping text at the pixel level, exact margin/spacing correctness, and font-rendering fidelity were not and cannot be assessed without a real PDF viewer or browser automation tool, neither of which is available in this environment. This is the same coverage boundary this repository has documented for every prior Calendar feature requiring a live-browser walkthrough.

## Exact test totals

| Suite | Result |
|---|---|
| Targeted PDF backend (`test_review_summary_pdf_export.py`, new) | 42/42 |
| Targeted dependency-pin (`test_dependency_pin_consistency.py`, new) | 7/7 |
| Targeted Review Summary backend (`test_staff_review_summaries.py`) | 88/88 (was 58; +30 new export-route tests) |
| Full backend suite (`python -m unittest discover -s backend/tests -p "test_*.py"`) | 717 total, 715 passed, 2 failed — the same 2 pre-existing, unrelated, documented baseline failures (`test_missing_variable_fails_closed`, `test_pending_task_no_outcome`), unchanged |
| Review Summary frontend (`review-summaries.test.mjs`, includes PDF export tests) | 84/84 (was 65; +19 new PDF export tests) |
| Navigation structure (`navigation-structure.test.mjs`) | 16/16 (unchanged) |
| Full Calendar frontend suite (`calendar/*.test.mjs`) | 179/179 (unchanged, zero regression) |
| Combined frontend | 279/279 (was 260; +19) |

All new tests pass. Zero frontend regression. Zero new backend failure. Only the 2 pre-existing, documented, unrelated baseline failures remain.

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

## PASS / AMBER / FAIL

**AMBER.** Implementation is complete, fully tested locally with zero regressions (717 backend / 279 frontend, only the 2 pre-existing documented baseline failures present), and committed directly to local `main` per explicit user authorization for this session. Not PASS because: not yet pushed (explicit instruction — do not push the Gate B implementation), and Gate C (Vercel preview validation) has not run, so no production-compatibility claim is made. Consistent with this feature's own established AMBER convention from REQ-CAL-REV-TAB-002's implementation closure.

## One next step

Review this implementation report and its companion handover; if approved, push local `main` to `origin/main` (no force-push), then run Gate C (Vercel preview validation) before any production-compatibility claim or production deployment.
