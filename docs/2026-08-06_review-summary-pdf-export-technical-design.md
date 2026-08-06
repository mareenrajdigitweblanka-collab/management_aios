---
name: review-summary-pdf-export-technical-design
type: technical-design-document
created: 2026-08-06
created-by: Mareenraj (builder)
status: READY FOR TECHNICAL AND QUERYABILITY REVIEW — not yet implemented
requirement-id: REQ-CAL-REV-PDF-003
---

# Technical Design — Management AIOS Employee Review Summary PDF Export (2026-08-06)

> **Correction (2026-08-06, same-day, round 1):** Four corrections to this document, all documentation-only — no application code, dependency, or database object was created, executed, installed, or queried producing this correction. (1) §9's original "empty result still produces a PDF" behavior is corrected: **no PDF is generated for zero matching records** — the route now returns 404 (§5.4, §11, reasoning below), matching the requirement's new §5.10 decisions. (2) §5.1's routing-collision avoidance is strengthened with an explicit, additional source-order safeguard (declare the export route before `/{summary_id}` in the router file) on top of the existing two-segment-path structural fix — defense in depth, not a replacement. (3) New §5.6 records a mandatory ReportLab deployment-validation gate — `reportlab` remains the selected candidate library, but its production compatibility is explicitly unverified until a Vercel preview deployment proves it, with a documented fallback (stop and return to technical review — never silently substitute frontend generation or another library). (4) §7's filename-privacy control is corrected to state plainly that the filename is not free of identifiable information — see the requirement's own §5.8 correction. §16's test plan is expanded from 42 to 56 tests and §15's PASS rule gains three new conditions. See the companion validation report's own correction note for the full traceability update.

## 0. Requirement metadata / source

| Field | Value |
|---|---|
| Requirement ID | REQ-CAL-REV-PDF-003 |
| Requirement file | `docs/2026-08-06_review-summary-pdf-export-requirement.md` |
| Companion validation | `validation/review-summary-pdf-export-design-check-2026-08-06.md` |
| Builds on (unchanged) | `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md`, `docs/2026-08-06_calendar-review-summaries-dedicated-tab-technical-design.md` (REQ-CAL-REV-TAB-002) |
| Repository state at design time | `main` = `origin/main` = `b17b012`, working tree has only the known unrelated untracked file, 0/0 divergence (verified this session) |

This is a design document only. No application code, migration, dependency, or database object was created, executed, installed, or queried while producing it. The protected path `member-aios/mayurika-hr/staff-data/` was never opened. `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` was never opened or referenced.

## 1. Architecture overview

REQ-CAL-REV-TAB-002 built one dedicated Review Summaries workspace (`web-view/js/review-summaries.js`, mounted in `#tab-review-summaries`) reading `GET /api/staff-review-summaries` with `reviewed_staff_id`, an `include_all_reviewers`/`reviewer_member_key` mutually-exclusive reviewer scope, and optional `date_from`/`date_to`. This design adds one authoritative, backend-generated PDF export of exactly that same filtered, already-authorized record set — no new table, no new authorization concept, no frontend-side merging of multiple requests. The frontend reuses the exact same fetch-with-Bearer-token wrapper (`reviewSummariesApiRequest`) and the exact same Blob-download mechanics already proven in this codebase by the weekly-schedule `.xlsx` export (`web-view/js/calendar/instance.js:1859-1922`, `backend/xlsx_export.py`, `backend/routers/member_schedules.py:2078-2163`).

## 2. Current-state discovery (Phase 2)

Confirmed by direct inspection of `web-view/js/review-summaries.js`, `web-view/js/member-registry.js`, `backend/routers/staff_review_summaries.py`, `backend/schemas.py`, and `backend/models.py`:

- **Reviewed employee selection**: `selectStaff(staff)` sets `state.selectedStaff`; `reviewed_staff_id = state.selectedStaff.id` (`review-summaries.js:426-451`). No history/list request fires before selection (`renderHistory()` returns early at `:806-810`).
- **All reviewers**: default scope on employee selection (`state.reviewerFilter = ''`) sends `include_all_reviewers=true` with `reviewer_member_key` omitted (`buildListQuery`, `:77-91`; `renderHistory`, `:813-819`).
- **Specific reviewer**: selecting a value in the reviewer `<select>` sends `reviewer_member_key=<key>` with `include_all_reviewers` omitted — `buildListQuery` enforces the two are never sent together (`:80-84`).
- **From/To date behavior**: `state.dateFrom`/`state.dateTo` map straight to `date_from`/`date_to` query params (`:85-87`), identical filters the backend already validates (`date_from > date_to` → 422, `staff_review_summaries.py:263-264`).
- **Shared-read authorization**: any authenticated member may read any reviewer's active summaries — LIST has no owner filter when `include_all_reviewers=true`, and when a specific `reviewer_member_key` is supplied it is validated against `VALID_MEMBER_KEYS`, not against the acting member (`staff_review_summaries.py:266-287`). A valid Calendar token is required for every request, including GET (`Depends(get_verified_member)`).
- **Owner-only update/delete**: unchanged, `_get_owned_summary_or_404` (`:113-134`) — this design touches LIST-family reads only, never CREATE/UPDATE/DELETE.
- **Soft-delete exclusion**: `deleted_at.is_(None)` applied in both LIST branches (`:277-287`) — this design's export reuses the identical filter, never a separate query.
- **Full summary availability**: `StaffReviewSummaryOut.summary_text` (`schemas.py:886-910`) always returns the complete text — the UI's `summaryPreview()` truncation (`review-summaries.js:128-138`) is a rendering-only concern, never applied server-side.
- **Reviewer name/role resolution**: client-side only, via `member-registry.js`'s `resolveMember(memberKey)` (`MEMBER_REGISTRY`, 5 entries, `{displayName, role}`) — the API returns `reviewer_member_key` only, never a combined display field (`staff_review_summaries.py` `_to_out()`, `:172-192`).
- **Current request/response structures**: `StaffReviewSummaryListResponse { records: StaffReviewSummaryOut[], total, limit, offset }`; `StaffReviewSummaryOut` carries `id, reviewer_member_key, reviewed_staff_id, reviewed_staff_full_name, reviewed_staff_calling_name, meeting_date, summary_text, created_at, updated_at` (`schemas.py:886-910`) — no `deleted_at` field exists on the response at all.

## 3. Existing PDF/export capability discovery (Phase 4)

Repository-wide search (this session) for `PDF`, `export`, `print`, `download`, `Blob`, `object URL`, `application/pdf`, `Content-Disposition`, `StreamingResponse`, `FileResponse`, `jsPDF`, `pdfmake`, `pdf-lib`, `ReportLab`, `WeasyPrint`, `wkhtmltopdf`, `browser print`, `showSaveFilePicker`, plus `backend/requirements.txt`, `requirements.txt`, `web-view/js/calendar/package.json`, and a repo-wide search for a `vercel.json`/deployment config file:

| Item | Finding |
|---|---|
| Existing PDF libraries (backend) | **None.** `backend/requirements.txt` lists `fastapi`, `uvicorn`, `sqlalchemy`, `psycopg`, `pydantic`, `python-dotenv`, `openpyxl`, `httpx` (test-only) — no `reportlab`, `weasyprint`, `pdfkit`, `fpdf`, or any PDF-capable package. |
| Existing PDF libraries (frontend) | **None.** `web-view/js/calendar/package.json` is `{"private": true, "type": "module"}` — no dependencies at all (this repo's frontend has no build/bundle step or npm dependency tree; `web-view/js/**` is hand-written ES modules loaded directly by the browser). No `jsPDF`/`pdfmake`/`pdf-lib` reference anywhere. |
| Reusable download helper | **Yes.** `downloadWeeklySchedule()` (`web-view/js/calendar/instance.js:1859-1922`): `fetch()` → check `Content-Type` → `res.blob()` → `URL.createObjectURL(blob)` → temporary `<a download>` → `.click()` → `URL.revokeObjectURL()`. Directly reusable pattern, not a shared function — no other module imports it (self-contained per call site, matching this codebase's existing convention). |
| Backend binary-response support | **Yes, established.** `backend/routers/member_schedules.py:2159-2163` returns `Response(content=<bytes>, media_type=..., headers={"Content-Disposition": "attachment; filename=..."})` built from an in-memory `BytesIO` workbook (`backend/xlsx_export.py:327-329`) — no temp file, no disk write. This is the direct precedent for a PDF endpoint. |
| Frontend PDF capability | None built-in; `showSaveFilePicker` is not referenced anywhere in this repo. Browser-native (Chromium-family only, requires a secure context and direct user-gesture invocation) — not a dependency, but not usable as the sole path since Firefox/Safari do not implement it. |
| Vercel/runtime compatibility | **No `vercel.json` or other deployment/runtime config file exists in this repository** (repo-wide glob found none). No documented hosting-runtime constraint (e.g. serverless function size/timeout limits) could be found to check a PDF library against. This is a genuine evidence gap — see §12 Known limitations — and is the deciding factor in the library recommendation below. |
| Package-size/timeout considerations | Given the runtime-compatibility gap above, the safest library choice is one with **no native/system binary dependency** — `reportlab` is pure Python (like the already-adopted `openpyxl`); `weasyprint` requires system Cairo/Pango libraries and `wkhtmltopdf` requires a separate system binary, neither of which this repository's `requirements.txt`-only dependency model can install. This design recommends `reportlab` for that reason alone — final confirmation against the actual hosting runtime is listed as the one open technical follow-up (§14). |

**No PDF generation capability of any kind currently exists in this repository, backend or frontend.**

## 4. Architecture comparison (Phase 5)

### Option A — Backend PDF endpoint (chosen)

| Criterion | Assessment |
|---|---|
| Authoritative database query | Yes — one backend query, reusing the exact filter-building logic already proven by `list_staff_review_summaries` (§5 below), not re-derived. |
| Server-side authentication | Yes — `Depends(get_verified_member)`, identical to every other Staff Review Summaries route; no new authorization path. |
| Exact filter reuse | Yes — the export route and the existing LIST route share one extracted filter-building function (§5.2) so the two can never silently diverge. |
| Soft-delete exclusion | Yes — same `deleted_at.is_(None)` filter, applied once in the shared function. |
| Complete summary retrieval | Yes — `summary_text` is read directly from the ORM row, never a truncated field. |
| In-memory PDF generation | Yes — `BytesIO`, no temp file, mirroring `xlsx_export.py`. |
| Binary response | Yes — `Response(content=bytes, media_type="application/pdf", headers={...})`, mirroring `member_schedules.py:2159-2163`. |
| No permanent storage | Yes — nothing is written to disk or the database. |
| `Cache-Control: no-store` | Yes — reuses `_set_no_store()` (`staff_review_summaries.py:84-89`), already applied to every route on this router. |
| `Content-Disposition` filename | Yes — built server-side from the resolved employee name, sanitized (§8). |
| Runtime/library compatibility | Open — see §3's runtime-compatibility gap; `reportlab` recommended, pure-Python, no system dependency. |
| Long-document pagination | Yes — a PDF flowable/paragraph library (`reportlab`'s Platypus layer) paginates automatically; no manual page-break arithmetic needed. |
| Testability | Yes — a pure `records → bytes` builder function (mirroring `xlsx_export.build_weekly_schedule_workbook`) is directly unit-testable without a browser. |
| Logging exposure | Controlled — no employee name or summary content is ever placed in a log line calling this route (§7). |

### Option B — Frontend PDF generation

| Criterion | Assessment |
|---|---|
| Generating from already-authorized complete list data | Possible in principle, but only if the frontend first fetches the *complete* unpaginated record set itself — today's `GET /api/staff-review-summaries` still defaults to `limit=50`; the frontend would need to either raise the limit or loop pages and merge them client-side. |
| No new backend route | True, but at the cost of moving filter-consistency risk to the client. |
| Browser memory | A large history (many records, long summaries) held and rendered entirely in-browser is a real but modest cost — acceptable, not the deciding factor. |
| Pagination consistency | **Risk.** Any client-side merge of multiple paginated fetches is exactly the pattern the task's Phase 5 instruction says to avoid ("prefer one authoritative export operation rather than multiple detail requests or browser-side merging"). |
| Dependency availability | Would require adding a frontend PDF library (`jsPDF`/`pdfmake`) — this repo currently has **zero** frontend npm dependencies (§3); introducing one is a materially larger footprint than any backend addition, and this task forbids installing dependencies regardless. |
| Stale-data risk | The exported PDF could silently reflect state older than what a concurrent backend-side change would produce, since the browser already fetched and cached the list before export. |
| Filter consistency | Same filter logic (reviewer scope, date range) would need to be duplicated in JS from the Python 422/mutual-exclusivity rules, a second place those rules could drift out of sync. |
| Risk of exporting incomplete/truncated content | **Real risk if not carefully avoided** — the existing UI already truncates long summaries for card display (`summaryPreview()`); a frontend PDF path must be built from the untruncated `record.summary_text`, not the rendered DOM, adding an easy-to-miss correctness trap this design would rather not introduce. |

**Rejected**: introduces a new frontend dependency (forbidden this session and a first-of-its-kind footprint for this codebase), and either paginates unsafely or risks silent drift from the backend's own filter/soft-delete rules — Option A achieves the same outcome with zero new frontend dependency and one authoritative query.

### Option C — Browser print

| Criterion | Assessment |
|---|---|
| Deterministic output | No — `window.print()`/"Save as PDF" output depends on the browser's own print-to-PDF implementation, print CSS support, and user-selected print settings (margins, headers/footers, scale) that this application does not control. |
| Filename control | No — the browser supplies its own default filename (typically the page title/URL), not `review-summaries_<employee>_<date>.pdf` (decision 22). |
| Content scoping | Harder — would require print-only CSS to hide every other panel (staff search, create form, filters, nav) and is fragile against future UI changes to those panels. |
| Metadata control | No — cannot set the PDF's internal title metadata (decision required: "Management AIOS Employee Review Summary", §7). |
| Save destination behavior | Overlaps with decision 26-28 by accident (the browser already decides), but only because the whole mechanism is browser-controlled, not because this design chose it. |

**Rejected**: does not reliably satisfy the approved filename, content-scoping, or metadata requirements — a print dialog is not a substitute for a deterministic, application-controlled PDF export, per the task's explicit instruction not to treat the two as equivalent.

### Decision

**Option A — one backend PDF endpoint, generated in-memory from an authoritative database query that reuses the existing LIST route's filter logic, downloaded via the frontend's already-proven Blob pattern.** Smallest secure architecture supported by repository evidence; zero new frontend dependency; one authoritative export operation, no browser-side merge.

## 5. Backend PDF endpoint design

### 5.1 Route and routing-collision avoidance

```
GET /api/staff-review-summaries/export/pdf
    ?reviewed_staff_id=<uuid>            (required)
    &include_all_reviewers=true          (mutually exclusive with reviewer_member_key)
    &reviewer_member_key=<key>           (mutually exclusive with include_all_reviewers)
    &date_from=<date>                    (optional)
    &date_to=<date>                      (optional)
```

**Deliberately `/export/pdf` (two path segments), not `/export.pdf` (one segment).** The existing router already registers `GET /{summary_id}` (`staff_review_summaries.py:315`), a single-path-segment route with `summary_id: UUID`. A new single-segment literal route (`/export.pdf`) would be shape-ambiguous with `/{summary_id}` — depending on registration order, a request to `/export.pdf` could be captured by the `{summary_id}` route first and rejected with a 422 UUID-parse error before ever reaching the export handler, a routing hazard that is easy to introduce and easy to miss in review. `/export/pdf` has a different path shape (two segments) than `/{summary_id}` (one segment) and cannot collide with it under any registration order — no route-ordering discipline is required to keep this safe, on its own.

**Route-declaration-order safeguard (corrected, round 1 — defense in depth).** Even though the two-segment path shape is structurally sufficient on its own (FastAPI/Starlette match by path shape, not solely by registration order, for genuinely disjoint shapes), the export route **must still be declared in `backend/routers/staff_review_summaries.py`'s source file before** the existing `@router.get("/{summary_id}")` route (`:315`). This is required for two independent reasons, not one:
1. It establishes an explicit, auditable convention for this router — any *future* single-segment literal route added to this file (a real, plausible mistake, since `/export.pdf` was the task's own original "potential contract" example) is protected by source order the moment it is added, rather than depending on every future author re-deriving the two-segment-shape reasoning from scratch.
2. It costs nothing — the handler functions have no execution-order dependency on each other, so placing `export_staff_review_summaries_pdf` immediately above `get_staff_review_summary` (`:315`) in the file is a pure, zero-risk reordering.

This does not change the final route path (`/export/pdf` remains correct and is not altered by this correction) — it adds one additional, explicit safeguard on top of the structural one, per this task's own instruction not to change the path "unless repository inspection proves a non-conflicting alternative is safer" (no such alternative was found or needed; the existing choice already avoids the collision, and this correction only hardens the surrounding practice).

### 5.2 Shared filter-building function (Phase 5's "exact filter reuse" requirement)

`list_staff_review_summaries` (`staff_review_summaries.py:225-312`) currently builds its filtered `query` inline (`:266-294`). This design extracts that filter-building logic (validation + `query` construction, excluding `limit`/`offset`/pagination) into one shared function, e.g.:

```python
def _build_review_summary_query(
    db: Session,
    acting_member: str,
    reviewed_staff_id: Optional[UUID],
    reviewer_member_key: Optional[str],
    include_all_reviewers: bool,
    date_from: Optional[date_type],
    date_to: Optional[date_type],
) -> Query:
    # identical validation + filter logic currently inline at :263-294 —
    # moved, not duplicated
    ...
```

- `list_staff_review_summaries` calls this function, then applies `.order_by(...)`, `.offset()`, `.limit()`, `total = ...count()` exactly as it does today — **zero behavior change to the existing LIST route** (its own tests, `test_reviewer_member_key_omitted_defaults_to_authenticated_reviewer` included, are unaffected — this is a pure extraction, not a rewrite).
- The new export route calls the same function, then applies `.order_by(StaffReviewSummary.meeting_date.desc(), StaffReviewSummary.created_at.desc())` and **`.all()` — no `.limit()`/`.offset()` at all.** The export must return every matching active record (decision 3/9 — "the complete active Review Summary history," not one page of it); introducing a hidden page-size cap on the export would silently under-report records and contradicts decision 3. This is a deliberate, explicit design choice, not an oversight — flagged here so it is not "discovered" as a gap during implementation.
- `reviewed_staff_id` is **required** on the export route (422 if missing) — enforced explicitly by the route signature (`reviewed_staff_id: UUID = Query(...)`, no default), independent of the `include_all_reviewers`-requires-`reviewed_staff_id` rule the shared function already enforces for the all-reviewers branch — this closes the gap where a specific-reviewer export (`reviewer_member_key` set, `include_all_reviewers` false) could otherwise omit `reviewed_staff_id` under the existing LIST route's rules and produce a not-employee-scoped export, which decision 2 forbids.
- `date_from > date_to` → 422, identical existing rule (`:263-264`), reused via the shared function.
- Soft-delete exclusion (`deleted_at.is_(None)`) is inside the shared function — cannot be bypassed by the export route.
- A valid Calendar token is still required (`Depends(get_verified_member)`) — export widens nothing about *who* may call the route; it only ever returns what that caller could already read via LIST (decision 11/14).

### 5.3 PDF generation module

New module `backend/review_summary_pdf_export.py`, mirroring `backend/xlsx_export.py`'s existing convention exactly: a pure, DB-session-free, bytes-in/bytes-out builder, never itself queried against or given a `Session`.

```python
def build_review_summary_pdf(
    reviewed_staff_label: str,           # employee display name for the PDF body
    reviewer_scope_label: str,           # "All reviewers" or a resolved reviewer display name
    date_from: Optional[date_type],
    date_to: Optional[date_type],
    generated_at_utc: datetime,
    records: List[StaffReviewSummaryOut],  # already-queried, already-ordered
) -> bytes:
    ...
```

- Uses `reportlab.platypus` (`SimpleDocTemplate`, `Paragraph`, `Spacer`, `PageBreak`) on an A4 page — the same "pure Python, no system binary" profile as the already-adopted `openpyxl`, chosen for the reason documented in §3.
- Builds a `BytesIO` buffer, calls `doc.build(story)`, returns `buffer.getvalue()` — identical shape to `xlsx_export.build_weekly_schedule_workbook`'s own `BytesIO`/`.getvalue()` pattern (`xlsx_export.py:327-329`).
- Sets the PDF document's internal `Title` metadata to the generic string `"Management AIOS Employee Review Summary"` (decision requirement, §7) — never the actual employee's name, so a PDF viewer's own "Properties" panel never surfaces PII beyond what the visible body already shows.
- Never queries the database, never accepts a `Session` — the route (§5.4) does 100% of the querying and passes already-resolved Python values in.

### 5.4 Route handler

```python
@router.get("/export/pdf")
def export_staff_review_summaries_pdf(
    response: Response,
    reviewed_staff_id: UUID = Query(...),
    reviewer_member_key: Optional[str] = Query(default=None),
    include_all_reviewers: bool = Query(default=False),
    date_from: Optional[date_type] = Query(default=None),
    date_to: Optional[date_type] = Query(default=None),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    _set_no_store(response)
    staff = _reviewed_staff_or_422(db, reviewed_staff_id)   # reused unchanged
    query = _build_review_summary_query(
        db, acting_member, reviewed_staff_id, reviewer_member_key,
        include_all_reviewers, date_from, date_to,
    )
    rows = query.order_by(
        StaffReviewSummary.meeting_date.desc(), StaffReviewSummary.created_at.desc()
    ).all()
    if not rows:
        # Corrected, round 1 (2026-08-06) — requirement §5.10 decisions 34-37:
        # no PDF for a zero-record match. See the reasoning note below this
        # code block for why 404, not 422, was chosen.
        raise HTTPException(
            status_code=404,
            detail="No review summaries match the selected filters.",
        )
    records = [_to_out(record, db) for record in rows]      # reused unchanged

    reviewer_scope_label = (
        "All reviewers" if include_all_reviewers
        else resolve_reviewer_label(reviewer_member_key)     # backend-side MEMBER_LABELS lookup
    )
    employee_label = staff.full_name or staff.calling_name or "Unknown staff record"

    pdf_bytes = build_review_summary_pdf(
        reviewed_staff_label=employee_label,
        reviewer_scope_label=reviewer_scope_label,
        date_from=date_from, date_to=date_to,
        generated_at_utc=datetime.now(timezone.utc),
        records=records,
    )
    filename = build_review_summary_pdf_filename(employee_label, date_type.today())
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=" + filename},
    )
```

**Empty-result status code — 404, not 422 (corrected, round 1 — reasoning).** This router already uses both codes for distinct, well-established meanings that this design deliberately does not blur:
- **422** is used exclusively for a malformed/invalid *request* on this router — an unknown `reviewer_member_key` (`_valid_reviewer_member_key_or_422`), `date_from > date_to`, a `reviewed_staff_id` that does not resolve to an existing staff row (`_reviewed_staff_or_422`), and the `include_all_reviewers`/`reviewer_member_key` mutual-exclusivity violation. In every one of these cases, the request itself is wrong.
- **404** is used for "authenticated, well-formed request, but nothing here for you" — `_get_active_summary_or_404`, `_get_owned_summary_or_404`. The request is valid; there is simply no matching record to return.

A zero-record export (valid employee, valid filters, zero active rows happen to match) is a well-formed request that legitimately resolves to nothing — the same shape of case 404 already covers elsewhere on this exact router, not a client input error. Using 422 here would misrepresent a syntactically and semantically valid query as a bad request, which is not true. **Note on the closest existing runtime precedent in this codebase**: the weekly-schedule `.xlsx` export (`member_schedules.py:2135-2141`) instead returns `200` with a JSON `{"empty": true, ...}` body when no rows match, distinguished by the frontend on `Content-Type`. That is a real, different, and reasonable convention already in this repository — but it was not chosen here, per this task's explicit instruction to select between 404 and 422 specifically; 404 was picked as the closer semantic fit to *this specific router's* own existing 404 usage (non-disclosing "nothing matches" pattern), not by claiming the 200+JSON convention doesn't exist elsewhere in the codebase.

The response body is a standard `HTTPException(404, detail=...)` — identical shape to every other 404 on this router — so the frontend's existing generic-error-mapping infrastructure requires no new response-parsing branch, only a route-specific interpretation of a 404 it already knows how to catch (§8/§11 below).

- No `db.add`/`db.commit` anywhere in this path — read-only, matching the existing xlsx export's own documented read-only guarantee (`xlsx_export.py:11-14`).
- `reviewer_scope_label` for the backend's own filename/PDF-body text is resolved from `backend/config.py`'s `MEMBER_LABELS` (already the case everywhere reviewer text is shown server-side today) — **not** from `web-view/js/member-registry.js`'s frontend-only `MEMBER_REGISTRY`, since the backend has no access to frontend modules; this means the PDF body's reviewer-scope line and each card's reviewer name/role are resolved independently on each side (backend for the scope summary line, unchanged `member_key` passthrough for per-record reviewer identity — see §6) — both already exist today and neither is new.

### 5.5 `include_all_reviewers` vs. `reviewer_member_key` on the export route

Same mutual-exclusivity rule as LIST (422 if both supplied), enforced inside `_build_review_summary_query` (§5.2) — the export route does not re-implement this check separately, so the two routes can never disagree about when it applies.

## 5.6 ReportLab deployment-validation gate (new, round 1 correction — 2026-08-06)

`reportlab` remains the **selected candidate library** (§3, §5.3) on first-principles grounds — pure Python, no system binary dependency, the same profile as this repository's already-adopted `openpyxl`. This section corrects an overstatement in the original design: §3/§14 already flagged that no `vercel.json` or deployment/runtime config exists in this repository to confirm compatibility, but did not previously state a hard gate blocking production use until that confirmation happens. This section makes that gate explicit and mandatory.

**`reportlab` must not be described or treated as production-compatible until every one of the following passes, in order:**

1. **Version-pinned dependency.** `backend/requirements.txt` pins an exact or minimum-plus-compatible-release version (e.g. `reportlab==4.x.y` or `reportlab~=4.x`, matching this file's existing pinning style for `fastapi>=0.110` etc.) — never an unpinned bare `reportlab` line, so a future transitive upgrade cannot silently change generation behavior.
2. **Clean local install.** `pip install -r backend/requirements.txt` succeeds in a fresh virtual environment (no pre-existing cache or system-level `reportlab` install masking a real failure).
3. **Synthetic multi-page PDF generation.** A test calls `build_review_summary_pdf()` (§5.3) with **synthetic, non-production, invented test data** (fabricated employee label, fabricated reviewer labels, fabricated summary text of a length engineered to force at least 2 pages) and asserts the result is a valid, well-formed, multi-page PDF. **This test must never load, query, or reference real employee, reviewer, or summary data from `management_aios.staff_review_summaries` or any other production table** — it is a pure unit test of the generation function against constructed fixtures, mirroring how `backend/xlsx_export.py`'s own existing tests already exercise `build_weekly_schedule_workbook()` with fixture rows, not live data.
4. **Vercel preview deployment install.** The pinned dependency installs successfully as part of a Vercel preview build for the branch/PR containing this change — a distinct check from step 2, since a serverless build environment can differ from a local developer machine (available system libraries, Python version, build-time memory limits).
5. **Preview function startup.** The backend's serverless function(s) start successfully in that preview deployment with `reportlab` imported — an import-time failure (e.g. a missing transitive C-extension wheel for the target platform) must surface here, before any request is made.
6. **Preview export returns `application/pdf`.** A real HTTP request against the preview deployment's `/api/staff-review-summaries/export/pdf` (with a valid preview-environment token and a non-empty result) returns `Content-Type: application/pdf` with a well-formed PDF body.
7. **Bundle size and execution time within the active Vercel project's limits.** The deployed function's cold bundle size and this route's observed execution time (from step 6's request) are confirmed to sit within whatever limits the active Vercel project/plan currently enforces — this design does not assume a specific numeric limit, since that is a property of the deployment account/plan, not of this codebase; whoever performs this gate must read the actual current limits from the Vercel project settings at gate time, not from a number hard-coded into this document.
8. **Production deployment is blocked if either the preview build or the synthetic export fails.** Steps 1-7 are a hard sequential gate, not independent advisory checks — failure at any step stops progress to production for this feature, with no exception.

**Fallback rule (mandatory).** If `reportlab` cannot be built, imported, or run successfully in the actual Vercel runtime (any failure at gate steps 4-7 above): **stop, and return to technical review.** Do **not**:
- silently fall back to Option B (frontend PDF generation) — that option was already rejected in §4 for reasons independent of `reportlab`'s runtime compatibility (a new frontend dependency, pagination/filter-consistency risk), and a `reportlab` runtime failure does not change that reasoning;
- silently substitute a different backend PDF library (`weasyprint`, `wkhtmltopdf`, `fpdf`, or any other) without a new technical review — each has its own compatibility profile that has not been evaluated, and swapping libraries silently would re-introduce exactly the unverified-compatibility risk this gate exists to catch;
- claim any degree of "production ready" status for the PDF export feature while any gate step above is unresolved.

This gate is a precondition for implementation sign-off, not something this design session can complete itself — no dependency was installed, no Vercel preview was deployed, and no synthetic PDF was generated while producing this design (§14 confirms).

## 6. PDF content contract (Phase 9 detail)

Per record, rendered in the same order the UI already uses (`meeting_date DESC, created_at DESC`, unchanged):

```
Meeting date: <meeting_date>
Reviewed by: <reviewer display name>
Reviewer role: <reviewer role>
Created: <created_at>
Updated: <updated_at>          (always shown, even when equal to created_at — no "Edited"-only convention on the PDF)
<full summary_text, paragraphs/line breaks preserved>
```

- Reviewer display name/role for each record are resolved **server-side** from `record.reviewer_member_key` via a small backend-side lookup built from the same `MEMBER_LABELS` values `member-registry.js` was itself built from (`backend/config.py:90-102`, split on `" — "`), with the identical Paraparan-role exception (`"Auditor"`) `member-registry.js` already documents as a deliberate, sourced-from-the-repo display decision (`member-registry.js:16-25`) — this design does **not** introduce a second, independently-invented copy of that decision; it mirrors the one already approved and shipped in REQ-CAL-REV-TAB-002. Unknown/unrecognized `reviewer_member_key` values resolve to `"Unknown"`/`"Unknown"`, identical fallback behavior to `resolveMember()`.
- No backend schema, response field, or database column changes for this — `reviewer_member_key` is already returned by `_to_out()` unchanged; the PDF-generation module resolves display text from it exactly as `member-registry.js` already does for the on-screen cards, just running once on the server instead of the browser.
- Full `summary_text` — never `summaryPreview()`'s truncated form (decision 17); the export module reads directly from `StaffReviewSummaryOut.summary_text`.
- `reportlab.platypus.Paragraph` (or equivalent flowable) preserves paragraph/line-break structure by converting `\n` to `<br/>` before constructing each Paragraph (the standard `reportlab` idiom for preserving user-authored line breaks in plain-text-sourced content) — never collapsing multiple lines into one run-on paragraph.

## 7. Security and privacy design (Phase 7)

| Control | Design |
|---|---|
| Authentication required | `Depends(get_verified_member)` on the export route — identical to every existing Staff Review Summaries route. |
| Authorization = list-read access | The export route's query is built by the exact same `_build_review_summary_query` LIST already uses — an export can never return a record LIST would not have also returned for the same filters and the same acting member. |
| Selected employee required | `reviewed_staff_id: UUID = Query(...)` — no default, 422 if omitted. |
| No soft-deleted records | Enforced inside the shared filter function (§5.2), not re-implemented. |
| No permanent file | `BytesIO` only, response body streamed from memory, nothing written to disk. |
| No audit/download-history table | No new table, no write to any existing table — this route performs zero `db.add`/`db.commit` calls. |
| No PDF content in database | Confirmed by the read-only guarantee above. |
| `no-store` caching | `_set_no_store(response)`, reused unchanged. |
| No summary text in URL | All record content is in the response body only; the URL carries only `reviewed_staff_id` (a UUID), an optional `reviewer_member_key`, and two optional dates — no summary text, no reviewer names, ever appears in a query parameter. |
| No summary content in `localStorage` | The frontend never persists the fetched PDF Blob or JSON anywhere beyond the in-memory object URL used to trigger the download (§8) — revoked immediately after. |
| No token in URL or filename | The export request sends its Bearer token in the `Authorization` header, exactly like every other Staff Review Summaries request (`reviewSummariesApiRequest`, unchanged) — never as a query parameter. The filename (§9) is built from the sanitized employee name and date only. |
| No row-level content in normal application logs | The route handler never logs `summary_text`, `reviewed_staff_id`, or the resolved employee name — if request logging exists at the ASGI/uvicorn access-log level (path + query string), that is pre-existing infrastructure behavior unrelated to this route and unchanged by this design; no route-level `logging.info(...)` call is added that would place employee-identifying text into an application log. |
No sensitive values in error traces | On a generation failure, the route catches and re-raises as a generic 500 with no employee/summary detail in the response body (§10); FastAPI's default exception behavior in production config does not echo stack traces to the client — unchanged from every other route on this backend. |
| Temporary in-memory generation only | `build_review_summary_pdf()` builds directly into a `BytesIO`, never a temp file on disk. |
| Sanitized `Content-Disposition` filename | §9. |
| **Filename privacy classification (corrected, round 1)** | The filename is **not** free of identifiable information — it deliberately includes the employee's display name (requirement decision 22), an explicit, approved decision, not an oversight. §7's other rows (no NIC, no token, no summary text, no reviewer name/role, no email/phone, no UUIDs of any kind) describe everything the filename must exclude; the employee display name is the one identifiable field the requirement owner explicitly approved for inclusion. This does not weaken any other control in this table. |
| Generic PDF metadata title | `"Management AIOS Employee Review Summary"` only (§5.3) — never the employee's name. |

## 8. Download destination design (Phase 6)

**Primary mechanism (always available, matches the existing weekly-schedule-export precedent exactly):**

1. User clicks **Download PDF** (a direct click-handler invocation — preserves user-activation state for any progressive branch, §8.2).
2. Frontend calls `reviewSummariesApiRequest()` (the existing authenticated fetch wrapper, unchanged) against `/export/pdf?...`, requesting the current employee + current filters.
3. **Corrected, round 1 — response branches on status before touching the Blob path at all**: if the response is `404` with the export route's specific detail text, the handler does **not** call `res.blob()`, does **not** create an object URL, and does **not** click a download anchor — it shows the toast **"No review summaries match the selected filters."** and leaves `state.selectedStaff`, the reviewer filter, and both date filters exactly as they were (no call to `resetWorkspaceState()` or any part of it — this is not an authorization event and not an employee change). Only on a `200` response does the handler proceed to `res.blob()` → `URL.createObjectURL(blob)` → a temporary `<a download="...">` element → `.click()` → `document.body.removeChild()` → `URL.revokeObjectURL()` — the same five-step sequence `downloadWeeklySchedule()` already uses (`instance.js:1899-1906`), applied to the new PDF response instead of the existing `.xlsx` response.
4. Whether the browser then shows a Save As location prompt or silently places the file in its configured Downloads folder is **entirely the browser's own setting** — this application never claims otherwise anywhere in its UI copy (decision 27-29).

This mirrors the existing weekly-schedule export's own established pattern of branching on the response *before* assuming a binary body — `downloadWeeklySchedule()` already inspects `Content-Type` to distinguish its `{"empty": true, ...}` JSON case from its `.xlsx` binary case (`instance.js:1882-1884`) before ever calling `.blob()`. This design's 404-vs-200 branch is the same discipline applied to a status-code distinction instead of a `Content-Type` distinction — not a new pattern invented for this feature.

**Optional progressive enhancement (not required to satisfy any approved decision, listed only because Phase 6 asks for it to be considered):**

- Feature-detect `window.showSaveFilePicker` (Chromium-family only) **and** only invoke it synchronously inside the button's own click handler (the API requires direct user-activation; calling it after an intervening `await` that spans a macrotask boundary can lose activation in some browsers) — if both hold, offer a native save-location picker before falling back to step 3 above on any rejection/unsupported-API error.
- This is explicitly optional, lower-priority, and **not part of the approved decisions** — it is deferred to implementation discretion and is not required for this design to PASS (§13's PASS rule does not depend on it). No repository precedent exists for this API (§3), so there is no established pattern to reuse; the primary mechanism alone already fully satisfies decisions 25-28.
- The PDF is never made available at a permanent, publicly reachable URL — the endpoint requires a valid Bearer token on every call, and the Blob object URL created in step 3 is revoked immediately after the download is triggered, not left addressable.

## 9. PDF layout (Phase 9)

A4 page, `reportlab.platypus.SimpleDocTemplate`, readable margins (reportlab's default ~2cm on all sides is sufficient; no requirement dictates a specific value):

```
Management AIOS
Employee Review Summary

Reviewed employee: <employee display name>
Reviewer scope: All reviewers | <reviewer display name>
From: <date_from, when supplied>
To: <date_to, when supplied>
Generated: <generated_at, Asia/Colombo display, matching this codebase's existing
            Colombo-display convention used by xlsx_export.py>
Total matching records: <count>

────────────────────────────────────

Meeting date: <meeting_date>
Reviewed by: <reviewer display name>
Reviewer role: <reviewer role>
Created: <created_at>
Updated: <updated_at>

<full summary text, paragraphs/line breaks preserved>

────────────────────────────────────

[next record...]
```

- Records ordered `meeting_date DESC, created_at DESC` — identical to the UI and to LIST's own ordering (§5.4), never re-sorted independently.
- A visible separator (a thin rule or spacer, `reportlab.platypus.Spacer` + `HRFlowable` or equivalent) between records, so a long summary's natural page break is never mistaken for a record boundary.
- Long summaries flow onto following pages automatically via `Paragraph`'s own flowable behavior inside `SimpleDocTemplate` — no manual pagination arithmetic, and no clipping (Platypus never truncates a flowable to fit a page; it always continues onto the next one).
- Page numbers via `SimpleDocTemplate`'s standard `onPage`/`canvas.drawString` footer callback (a well-established `reportlab` idiom) — "where supported" per the requirement; `reportlab` supports this natively, so it is included.
- No Edit/Delete controls, no raw UUIDs (`record.id` is never rendered), no token, no metadata beyond the approved content list (§6 of the requirement).

## 10. Backward compatibility (Phase 10)

Unaffected by this design, confirmed by inspection:

- CREATE ownership, shared DETAIL read, owner-only UPDATE/DELETE — untouched; this design adds one new GET route and refactors LIST's *internal* filter-building into a shared function with **identical observable behavior** (§5.2).
- Reviewer/date filters — the export route reuses the same validation rules; no existing filter behavior changes.
- Soft-delete behavior — unchanged, enforced inside the shared function.
- `management_aios.staff_review_summaries` — no schema/migration change; no new column.
- Frontend `member-registry.js`, navigation, state-clearing rules (`resetWorkspaceState()`) — unchanged; the Download PDF button is a new element inside the existing history panel (§ "Files likely to change" below), not a new panel or navigation item.

**No database schema or migration is introduced. No existing record requires migration.**

## 11. Empty and error states (Phase 8)

| State | Behavior |
|---|---|
| No employee selected | Download PDF button is disabled (or hidden — implementation discretion within "disabled or unavailable," decision 4); no request is ever sent; the existing "Select a staff member to see their review history" copy already covers the instruction requirement. |
| No matching records (corrected, round 1 — no PDF, requirement §5.10) | The backend returns **404** with `detail: "No review summaries match the selected filters."` (§5.4 — reasoning: this router's own 404 already means "well-formed request, nothing matches," distinct from its 422 = "malformed request") — **no PDF bytes are generated or returned.** The frontend (§8) inspects the response status before touching the Blob path: on this specific 404, it shows the toast **"No review summaries match the selected filters."**, triggers no Blob creation and no download, and retains the selected employee and both filters unchanged (requirement decision 37) so the user can adjust filters and retry without re-selecting the employee. |
| Invalid date range (`date_from > date_to`) | 422 from the shared filter function (§5.2), identical to LIST's existing rule — the frontend must block the export request client-side using the same validation state that already disables/warns on the date inputs elsewhere in this workspace, and must surface the export-specific 422 via the existing `mapApiError`/toast pattern if the request is somehow still sent. |
| Unauthorized (missing/invalid token) | Identical to every other route on this router — `Depends(get_verified_member)` rejects before any query runs; the frontend's existing `reviewSummariesApiRequest()` 401 handling (`handleUnauthorizedResponse()` → `resetWorkspaceState()`) applies unchanged; no PDF bytes are ever returned. |
| Generation failure (unexpected exception inside `build_review_summary_pdf`) | The route catches the exception, returns a generic 500 with no employee/summary content in the response body (matching §7's log-exposure and error-trace controls) — the frontend maps this through the existing `mapApiError`/toast pattern with a generic user-safe message ("Could not generate the PDF. Try again.") and never surfaces exception detail. No temporary file is ever created in this path (nothing is written to disk at any point in `build_review_summary_pdf`, so there is nothing to clean up on failure). |

## 12. Files likely to change

| File | Change |
|---|---|
| `backend/routers/staff_review_summaries.py` | Extract `_build_review_summary_query` from `list_staff_review_summaries` (behavior-preserving refactor); add new `GET /export/pdf` route, **declared before** the existing `GET /{summary_id}` route in source order (§5.1, corrected round 1 — defense-in-depth route-ordering safeguard); route returns 404 for a zero-record match (§5.4, corrected round 1) |
| `backend/review_summary_pdf_export.py` (**new**) | `build_review_summary_pdf()`, `build_review_summary_pdf_filename()`, reviewer-label resolution helper — mirrors `backend/xlsx_export.py`'s existing module shape |
| `backend/requirements.txt` | Add a **version-pinned** `reportlab` line (e.g. `reportlab~=4.x`, §5.6 gate step 1 — pure-Python PDF library, **not installed this session**, per this task's explicit instruction; production compatibility remains unverified until the full §5.6 deployment-validation gate passes) |
| `web-view/js/review-summaries.js` | Add one "Download PDF" button near the Review History filters (§ "3. Review history" panel); wire it to a new `downloadReviewSummariesPdf()` function following `downloadWeeklySchedule()`'s existing Blob-download pattern; button enabled/disabled state driven by `state.selectedStaff` |
| `web-view/css/review-summaries.css` | Small addition for the new button's placement/styling within the existing filters row |
| `backend/tests/test_staff_review_summaries.py` | New tests for `/export/pdf` (§ test plan below); existing tests unmodified (the LIST extraction is behavior-preserving) |
| `web-view/js/review-summaries.test.mjs` | New tests for the download trigger/button-disabled-state logic (§ test plan below) |

## 13. Files not to change

- `member-aios/mayurika-hr/staff-data/` — protected path, never opened.
- `validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md` — unrelated workflow artifact, never opened or referenced.
- `management_aios.staff_review_summaries` schema/migrations — no column added, no migration file created.
- `backend/schemas.py`, `backend/models.py` — no change; `StaffReviewSummaryOut`/`StaffReviewSummaryListResponse` are reused unchanged as the data shape the export route already has in hand before generating the PDF.
- `web-view/js/member-registry.js` — reused unchanged; not modified to add PDF-specific logic.
- Existing CREATE/UPDATE/DELETE routes and ownership logic (`_get_owned_summary_or_404`) — untouched.
- Existing single-reviewer/all-reviewers LIST *behavior* — unchanged (§5.2's extraction is behavior-preserving, not a rewrite of the rule itself).
- `web-view/js/navigation.js`, `web-view/js/app.js`, `web-view/js/config.js` — no change expected; the export button lives inside the already-mounted workspace, no new panel or nav item.

## 14. Known limitations

1. No live browser walkthrough was performed in this design session (no browser automation tool available in this environment), consistent with prior Calendar-auth and REQ-CAL-REV-TAB-002 design work in this repo.
2. **Runtime/library-compatibility gap (§3), formalized as a mandatory gate (corrected, round 1 — §5.6)**: no `vercel.json` or other deployment/runtime configuration file exists in this repository to confirm `reportlab`'s compatibility (package size, cold-start time, any serverless function limit) against the actual hosting environment. `reportlab` remains the selected candidate on first-principles grounds (pure Python, no system binary dependency, same profile as the already-adopted `openpyxl`), but §5.6's eight-step deployment-validation gate (version pinning → clean install → synthetic multi-page PDF test → Vercel preview install → preview startup → preview `application/pdf` response → bundle size/execution time within plan limits → production blocked on any failure) must pass in full before any claim of production compatibility is made. The fallback rule (§5.6) is explicit: a gate failure returns to technical review, never a silent switch to frontend generation or another library.
3. The exact DOM/CSS placement of the Download PDF button is described functionally (§8, §12) but not pixel-specified — implementation retains normal front-end layout discretion within the stated functional requirement ("near the Review History filters").
4. This design was produced without a live database connection (none was needed — no schema change is proposed) and without running any test suite (no code was changed this session).
5. The optional `showSaveFilePicker` progressive enhancement (§8) is explicitly out of scope for the PASS condition below — if implementation chooses to add it, it should be treated as a separate, additive, browser-feature-detected branch, not a requirement.

## 15. Approval / status

**Status: READY FOR TECHNICAL AND QUERYABILITY REVIEW (corrected, round 1 — 2026-08-06).**

### Numeric pass/fail rule (corrected, round 1 — three conditions added)

This design PASSES readiness for the next phase if and only if:
- 0 unresolved contradictions between this design and REQ-CAL-REV-PDF-003's approved decisions (validation doc confirms this);
- the export route reuses the existing LIST route's filter/soft-delete/authorization logic via one shared function, with 0 duplicated filter rules (§5.2 confirms);
- 0 application/database/dependency files were touched producing this design (confirmed — no `reportlab` install occurred this session);
- the protected path was never opened, and the unrelated staff-roster validation file was never opened (confirmed);
- 0 production writes are introduced by the new route (confirmed — read-only, no `db.add`/`db.commit`);
- 0 permanent server-side file, audit record, or database row is created by an export (confirmed — §7);
- the proposed test count is ≥ 30 (§16 confirms 56);
- the routing-collision risk against the existing `/{summary_id}` route is explicitly resolved, not left implicit, with an additional source-order safeguard beyond the structural path-shape fix (§5.1 confirms);
- **the filename privacy classification states plainly that the embedded employee name is identifiable information, explicitly approved for inclusion, not claimed to be PII-free (§7, requirement §5.8 confirm);**
- **no PDF is generated for a zero-record match — the route returns 404 and the frontend triggers no Blob/download for that response (§5.4, §8, §11 confirm);**
- **`reportlab` production compatibility is stated as unverified until the full §5.6 deployment-validation gate passes — no claim of production readiness for the library is made anywhere in this document (§5.6, §14 confirm).**

All eleven conditions are met.

## 16. Test plan (Phase 11) — 56 numbered tests (corrected, round 1 — was 42; test 38 rewritten, 14 tests added)

### Authorization (5)
1. Missing token cannot export.
2. Invalid token cannot export.
3. Authenticated reader can export records they may read.
4. Cross-reviewer reader can export shared-readable records (another reviewer's active summaries for the same employee).
5. Export cannot expand beyond read authorization (an export request can never return a record the equivalent LIST call would not also return for the same acting member and filters).

### Filters (9)
6. Employee is required — omitting `reviewed_staff_id` returns 422.
7. All-reviewer export includes multiple reviewers' records for one employee.
8. Specific-reviewer export includes only that reviewer's records.
9. Another employee's records are excluded from the export.
10. `date_from` is applied.
11. `date_to` is applied.
12. Both dates are applied together.
13. Empty dates export the complete active history.
14. Soft-deleted records are excluded.

### Content (10)
15. "Management AIOS" heading appears.
16. "Employee Review Summary" title appears.
17. Reviewed employee appears.
18. Applied reviewer scope appears (either "All reviewers" or the specific reviewer's name).
19. Applied From/To date scope appears when present, and is omitted/blank when not supplied.
20. Generated date/time appears.
21. Reviewer display name and reviewer role appear per record.
22. Meeting date, created timestamp, and updated timestamp appear per record.
23. Full summary text appears — never the UI's truncated preview text.
24. Total matching record count appears in the filter-summary section.

### File safety (10)
25. Filename matches `review-summaries_<sanitized-employee-name>_<YYYY-MM-DD>.pdf`.
26. Filename sanitization removes/replaces unsafe characters (e.g. `/`, `\`, quotes).
27. Filename never contains the token, summary text, reviewer names, NIC, contact information, or record UUIDs.
28. `Content-Disposition: attachment` header is present with the sanitized filename.
29. Response `Content-Type` is `application/pdf`.
30. `Cache-Control: no-store` is present on the response.
31. The request token never appears in the request URL (Authorization header only).
32. Summary text never appears in the request URL.
33. No audit/download-history database record is created by an export request.
34. No permanent server-side PDF file remains on disk after the request completes.

### Layout and regression (8)
35. Multiple records render across the document.
36. A long summary spans pages without clipping.
37. Paragraphs and line breaks in the summary text are preserved in the PDF body.
38. **Corrected, round 1**: zero matching authorized records return `404` with no PDF bytes generated — never a blank or misleading PDF document (see tests 43-45 for the full frontend/backend split of this behavior).
39. A generation failure returns a generic error with no employee/summary content exposed, and leaves no temporary file behind.
40. The existing `GET /api/staff-review-summaries` (LIST) route's existing test suite passes unmodified after the `_build_review_summary_query` extraction (behavior-preserving refactor confirmed).
41. `GET /api/staff-review-summaries/export/pdf` does not collide with `GET /api/staff-review-summaries/{summary_id}` — a request to the export path never gets routed to the detail-by-id handler (confirms §5.1's routing-collision fix).
42. No schema or migration change occurs; 0 production database writes occur across the full test run for this feature.

### Route ordering and empty-result correction (new, round 1 — 6)
43. `GET /export/pdf` is declared before `GET /{summary_id}` in `staff_review_summaries.py`'s source, and reaches the export handler (fixed route wins over the dynamic summary route) — confirms §5.1's source-order safeguard, in addition to test 41's structural path-shape confirmation.
44. A request to `/export/pdf` is never parsed as `summary_id = "export"` (i.e. the `{summary_id}` route's `UUID` validator never fires for this path).
45. Existing UUID-based detail routes (`GET /{summary_id}` with a real UUID) continue to work unaffected by the new route's addition.
46. An invalid `summary_id` on the existing detail route (`GET /{summary_id}` with a non-UUID segment other than `export`) retains its current behavior (422 UUID-parse error) — confirms the new route did not change any existing route's validation.
47. The generated OpenAPI schema includes the `/export/pdf` path exactly once, with no duplicate or ambiguous path entry.
48. Zero matching authorized records: the backend returns 404 with the exact detail text, and 0 bytes of PDF content are present in the response body.

### Empty-result frontend handling (new, round 1 — 3)
49. On receiving the export route's specific 404, the frontend shows the toast "No review summaries match the selected filters." and no other message.
50. No `Blob`, no `URL.createObjectURL`, and no download-anchor click occurs when the export route returns that 404.
51. After that 404, `state.selectedStaff`, the reviewer filter, and both date filters remain exactly as they were before the export attempt (no `resetWorkspaceState()` call, no employee deselection).

### Filename privacy (new, round 1 — 2)
52. The employee display name appears in the sanitized filename and nowhere else in the response (not in headers, not in the PDF's internal metadata Title, which stays the generic string per §5.3).
53. None of NIC, token, summary text, reviewer name, reviewer role, personal email, phone number, staff UUID, summary UUID, or any other database ID ever appears in the generated filename (expands test 27 into the requirement's full itemized list, requirement §5.8 decision 24).

### ReportLab deployment-validation gate (new, round 1 — 6)
54. The pinned `reportlab` version installs successfully in a clean test/CI virtual environment (§5.6 gate step 1-2).
55. `build_review_summary_pdf()` generates a valid single-page PDF from synthetic (non-production) fixture data (§5.6 gate step 3).
56. `build_review_summary_pdf()` generates a valid multi-page PDF from synthetic (non-production) fixture data engineered to exceed one page (§5.6 gate step 3), and the generated bytes begin with the standard PDF signature (`%PDF-`).

**Deployment-gate-only checks (documented as acceptance-gate steps, not unit tests — §5.6 gate steps 4-8, not independently numbered above since they require an actual Vercel preview deployment, which cannot run inside this repository's own automated test suite):**
- Vercel preview build installs the pinned `reportlab` dependency successfully and the preview function starts.
- A real request against the preview deployment's `/export/pdf` returns `Content-Type: application/pdf`.
- Production deployment for this feature is blocked if the preview build, preview startup, or preview export check fails — this is a release-process gate, enforced by whoever performs the deployment, not by an automated test in this repository.

### Regression suites to re-run (not new tests)
- Backend: `backend/tests/test_staff_review_summaries.py` (existing suite, confirming the LIST extraction is behavior-preserving), `test_calendar_auth.py`, `test_calendar_mutation_authorization.py`.
- Frontend: `web-view/js/review-summaries.test.mjs` (existing suite), `web-view/js/navigation-structure.test.mjs`.

**Total: 56 (42 original + 14 new: route-ordering/empty-result 6, empty-result frontend handling 3, filename privacy 2, ReportLab deployment gate 6) — was 42. Test 38 is corrected in place (no PDF for an empty result, replacing the prior "still generate a PDF" behavior); its count does not change. Covers every item in this task's own Phase 7 instruction. Meets the ≥30 minimum with margin.**

## 17. Review gate and next step

- **Business requirement approval**: completed — by the repository owner/user (this session's REQ-CAL-REV-PDF-003 approval, including its round-1 correction).
- **Technical review**: required for the new route, the `_build_review_summary_query` extraction, the route-declaration-order safeguard (§5.1), the empty-result 404 design (§5.4), and the `reportlab` dependency choice — **specifically gated on §5.6's deployment-validation gate passing before any production-compatibility claim is made; this is the one open follow-up, formalized as a mandatory gate rather than an advisory note (corrected, round 1).**
- **Queryability review**: not applicable in the REQ-CAL-REV-TAB-002 sense (no new reviewer-identity terminology decision is introduced here — §6 reuses the already-approved Paraparan="Auditor" decision verbatim).
- **Additional domain-member consultation** (Mayurika, Suman, Arun, Rajiv, Paraparan individually): optional, unless separately requested by the repository owner — not a mandatory implementation gate, consistent with CLAUDE.md §18 and REQ-CAL-REV-TAB-002's own review-gate correction.

**Branch strategy**: not defined by this design and must follow the repository owner's explicit instruction at implementation start. This design does not assume `main` or any feature branch, and no branch was created while producing this design.

**One next step**: technical review of this corrected design (§15's numeric pass/fail rule, all eleven conditions met) — specifically running §5.6's full ReportLab deployment-validation gate (version pin → clean install → synthetic PDF test → Vercel preview install/startup/export → bundle-size/execution-time check) — before implementation begins or any production-compatibility claim is made.
