---
name: calendar-review-summaries-technical-design
type: technical-design-document
created: 2026-08-03
created-by: Mareenraj (builder)
status: READY FOR IMPLEMENTATION (updated 2026-08-03 after live staff.id verification, see §20) — one open business parameter remains (summary maximum length)
requirement-id: REQ-CAL-REV-001
---

# Technical Design — Management AIOS Calendar Review Summaries (2026-08-03)

## 0. Requirement metadata / source

| Field | Value |
|---|---|
| Requirement ID | REQ-CAL-REV-001 |
| Requirement file | `docs/2026-08-03_calendar-review-summaries-requirement.md` |
| Requirement commit | `309fc6e` |
| Requirement branch | `docs/calendar-review-summaries-requirement` |
| Design branch | `design/calendar-review-summaries` |
| Companion validation (requirement phase) | `validation/calendar-review-summaries-identifier-decision-check-2026-08-03.md` |
| This document | `docs/2026-08-03_calendar-review-summaries-technical-design.md` |
| Companion validation (design phase) | `validation/calendar-review-summaries-technical-design-check-2026-08-03.md` |

This is a design document only. No application code, migration, or database object was created or executed while producing it. The protected path `member-aios/mayurika-hr/staff-data/` was never opened.

## 1. Architecture overview

Staff Review Summaries is a net-new, fully isolated slice of the Management AIOS Calendar backend/frontend:

- **Backend**: one new ORM model (`StaffReviewSummary`), one new router (`staff_review_summaries.py`) registered alongside the existing 4 routers in `backend/main.py`, and one new migration file. No existing table, router, or schema is modified except the additive `id` field on `StaffRecordOut`.
- **Frontend**: one new self-contained module (`review-summaries.js`), mounted inside each of the 5 existing member tab-panels, following the exact `staff-data.js`/`app.js` module-init convention already used in this codebase.
- **Identity model**: reuses the existing 5-member Calendar bearer-token system (`backend/routers/calendar_auth.py`) unchanged. No new authentication mechanism is introduced.
- **Key structural deviation from existing Task/Leave patterns** (documented in detail in §7 and §8): (a) Staff Review Summaries routes carry **no `{member_key}` URL path segment** — ownership is always "whoever the token verifies as," so cross-reviewer denial is a non-disclosing 404, not the existing 403 pattern; (b) **every route, including GET, requires a valid token** — a deliberate divergence from Task/Leave's public-GET convention, justified by the private nature of review content.

## 2. Staff-id verification (Phase 2)

Investigated: `backend/models.py`, `backend/schemas.py`, `backend/routers/staff.py`, `database/migrations/2026-07-13-create-staff-dashboard-records.sql`, `scripts/import_staff_dashboard_csv.py`, `scripts/update_staff_locations_from_hr_sources.py`. No protected path accessed.

| Verification item | Result | Evidence |
|---|---|---|
| Table/column owning `staff.id` | `management_aios.staff_dashboard_records.id` | `backend/models.py:309`; `database/migrations/2026-07-13-create-staff-dashboard-records.sql:32` |
| Exact DB type | Postgres native `UUID` | migration line 32: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| ORM type | `sqlalchemy.dialects.postgresql.UUID(as_uuid=True)` | `backend/models.py:62` (import), `:309` (column) |
| Nullability | `NOT NULL` (implicit via PK) | PK constraint, both DDL and ORM |
| PK / unique constraint | `PRIMARY KEY` | migration line 32 |
| Every staff row has an `id`? | YES — schema-level guarantee (PK + `DEFAULT gen_random_uuid()` at DDL layer, reinforced by ORM-side `default=uuid.uuid4`) | migration line 32; `backend/models.py:309` |
| Does `id` change on import/refresh/upsert/rebuild/duplicate-reconciliation? | NO — the only two write paths (`scripts/import_staff_dashboard_csv.py`, `scripts/update_staff_locations_from_hr_sources.py`) match/update existing rows by `source_record_key`, never reassign `id`; a genuinely new `source_record_key` gets a new row with a new random `id` | `scripts/import_staff_dashboard_csv.py:278-339` (match/update by `source_record_key`), docstring lines 25-28: "Never deletes a row" |
| Do deleted/inactive staff retain their `id`? | YES — no hard-delete code path exists anywhere; `staff_status` is a plain data column, not a lifecycle/soft-delete flag | `backend/models.py:293-295` (CHECK constraint); grep for `DELETE FROM staff`/`.delete(` in `scripts/` returned zero matches |
| Privacy/technical issue exposing `id`? | NO — cryptographically random UUIDv4 (`gen_random_uuid()`/`uuid.uuid4()`), not sequential; leaks no row-order or row-count information | migration line 32; `backend/models.py:309` |
| FK feasibility | YES, same-schema — `staff_dashboard_records` lives in `management_aios`, and so would the new `staff_review_summaries` table (every existing Calendar table already lives there) | `backend/models.py:306` (`{"schema": "management_aios"}`); `MemberScheduleEvent` (`:116`), `MemberLeaveRecord` (`:241`) same schema |

**Live database verification: UNVERIFIED this session.** No approved read-only database connection was available (the `claude.ai Supabase` MCP connector requires authorization not completable in this non-interactive session). The above conclusions rest entirely on repository schema/code evidence — the DB-level PK/NOT NULL/default constraints are strong guarantees against future null/duplicate `id` values, but the *current live* row count, null count, and duplicate count on the deployed table were not queried and remain outstanding pre-implementation checklist items (already flagged in the requirement's §6 "Technical verification required").

## 3. Source-to-target map

| Approved business rule (requirement doc) | Design element | Where |
|---|---|---|
| Reviewer ownership from `get_verified_member()` only | `Depends(get_verified_member)` on all 5 routes; `reviewer_member_key` never accepted from request body | §7 |
| `employee_number` prohibited | Selector uses `staff.id` only; `StaffRecordOut.id` addition | §4, §5 |
| `GET /api/staff` reuse, no duplicate list | Reviewed-staff selector calls existing `fetchStaffRecords()`/`STAFF_API_BASE` | §5, §9 |
| Multiple summaries same staff/date allowed | No uniqueness constraint on `(reviewer_member_key, reviewed_staff_id, meeting_date)` | §6 |
| Soft delete only | `deleted_at` column, DELETE route sets it, never a hard `DELETE FROM` | §6, §7 |
| History order `meeting_date DESC, created_at DESC` | Composite index + `ORDER BY` clause | §6, §10 |
| No Phase 1 MD sending | No email/notification code path designed or referenced anywhere in this document | — |
| Cross-reviewer access forbidden, private reads | Every route (including GET) requires token; every query filters `reviewer_member_key = acting_member`; cross-reviewer returns non-disclosing 404 | §7, §11 |

**Phase 1 consistency check result: no contradiction found.** All eight business rules above are preserved by the design below.

## 4. Staff API design (Phase 3)

**Minimum change to `StaffRecordOut`** (`backend/schemas.py:764-791`):

```python
class StaffRecordOut(BaseModel):
    id: UUID                      # NEW — additive only
    employee_number: Optional[str] = None
    ... (existing 16 fields, unchanged) ...
    model_config = {"from_attributes": True}
```

- `UUID` is already imported (`backend/schemas.py:29`) — no new import needed.
- `model_config = {"from_attributes": True}` already reads ORM attributes by name; since the column is literally named `id` (`backend/models.py:309`), no alias mapping is required.
- **Backward compatible**: purely additive. All 16 existing fields are untouched. `StaffListResponse`/`StaffSummaryResponse`/`StaffFilterOptionsResponse` are unaffected.
- **Existing consumer check**: `web-view/js/staff-data.js`'s `STAFF_MAIN_COLUMNS`/`STAFF_PRIMARY_COLUMNS` enumerate only the 13 dashboard-display columns; nothing reads `r.id` today, and the CSV export (`exportStaffCsvFromRows`) iterates only `STAFF_MAIN_COLUMNS`, so `id` is guaranteed not to leak into any existing export unless deliberately added later.

**Selector design**: value = `staff.id`; display = `full_name`/`calling_name` (existing approved fields, already rendered by `renderStaffPrimaryCell`). `employee_number` is never used as the option value — confirmed non-unique both by the approved requirement and by DB evidence (only `source_record_key` carries a `UNIQUE` constraint; the import script's own docstring documents 5 `employee_number` values reused across 11 rows in the live source, by design, uncorrected). No duplicate staff list is created — the selector calls the existing `GET /api/staff` via the existing `fetchStaffRecords()` helper.

**Active/inactive recommendation — Option A (active staff only by default, with an explicit "include inactive" opt-in), not Option B.**

Reasoning: `GET /api/staff`'s base query already filters `is_current.is_(True)` before any status filtering (`backend/routers/staff.py:57-60`), and every existing dashboard view layers a further status filter on top (`STAFF_SUBTAB_BASE_FILTERS`, `staff-data.js:207-211`) rather than showing one undifferentiated all-status list. A review-summary selector's overwhelmingly common case is an active employee; defaulting to Active with an "include inactive" toggle (`?staff_status=Inactive`, already supported at `backend/routers/staff.py:73-79`) avoids surfacing departed staff by default while still allowing an exit-review discussion to be recorded without a second UI. No backend change is required beyond the existing query parameter.

## 5. Proposed data model (Phase 4)

```python
class StaffReviewSummary(Base):
    __tablename__ = "staff_review_summaries"
    __table_args__ = (
        CheckConstraint(
            "reviewer_member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')",
            name="staff_review_summaries_reviewer_member_key_check",
        ),
        CheckConstraint(
            "length(trim(summary_text)) > 0",
            name="staff_review_summaries_summary_text_nonblank_check",
        ),
        CheckConstraint(
            "length(summary_text) <= 10000",
            name="staff_review_summaries_summary_text_max_length_check",
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reviewer_member_key = Column(String, nullable=False)
    reviewed_staff_id = Column(
        UUID(as_uuid=True),
        ForeignKey("management_aios.staff_dashboard_records.id"),
        nullable=False,
    )
    meeting_date = Column(Date, nullable=False)
    summary_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True)
```

| Field | Type | Nullable | Default | Validation | Source | Ownership | Indexed | Update behavior |
|---|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()`/`uuid.uuid4()` | PK uniqueness | server | system | PK | immutable |
| `reviewer_member_key` | TEXT | No | none | CHECK against 5 keys (`backend/config.py:55` `VALID_MEMBER_KEYS`) | **server-derived only, never body** | reviewer | yes (composite) | immutable after creation |
| `reviewed_staff_id` | UUID | No | none | FK to `staff_dashboard_records.id`; must resolve to an existing row (422 if not) | client | n/a | yes (composite) | immutable after creation (no "reassign reviewed person" in Phase 1) |
| `meeting_date` | DATE | No | none | valid date | client | n/a | yes (composite) | editable via PUT |
| `summary_text` | TEXT | No | none | trimmed non-empty, max 10,000 chars (pending final confirmation), paragraphs/line breaks preserved | client | n/a | not indexed | editable via PUT |
| `created_at` | TIMESTAMPTZ | No | `now()` | none | server | n/a | used in composite index | immutable — never touched by PUT |
| `updated_at` | TIMESTAMPTZ | No | `now()` | none | server | n/a | no | refreshed on every PUT |
| `deleted_at` | TIMESTAMPTZ | Yes | NULL | set only by DELETE | server | n/a | used in every partial index | set once by soft-delete; never cleared (no undelete in Phase 1) |

**`reviewed_staff_name_snapshot` — recommendation: do NOT add.** The repo's only comparable precedent (`MemberLeaveRecord.member_label`/`MemberScheduleEvent.member_label`) denormalizes a small, hand-maintained 5-entry constant, not a live per-row database field — a fundamentally different situation. Since staff rows are never hard-deleted (§2), a live join to `staff_dashboard_records` can never orphan. A snapshot would instead cause old summaries to show a *stale* name even after HR corrects a typo, which is the wrong default for a management review record. The requirement itself (§7) states this column "must not be introduced without a clear historical-display justification" — none exists here.

### Constraints

- `reviewer_member_key` CHECK against the 5 known keys (`backend/config.py:55`).
- `reviewed_staff_id` FK → `management_aios.staff_dashboard_records.id` (safe: target is a new empty table referencing an existing PK, zero backfill risk).
- `meeting_date` required (`NOT NULL`).
- `summary_text` trimmed non-empty CHECK + max-length CHECK (10,000, pending final confirmation).
- `deleted_at` nullable, soft-delete only.

### Recommended indexes

Both are Postgres partial indexes, directly precedented by `MemberLeaveRecord`'s own indexes (`database/member_leave_records_schema.sql:97-113`, e.g. `idx_member_leave_records_member_date ... WHERE deleted_at IS NULL`):

```sql
CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_staff_date
ON management_aios.staff_review_summaries (reviewer_member_key, reviewed_staff_id, meeting_date DESC, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_id
ON management_aios.staff_review_summaries (reviewer_member_key, id)
WHERE deleted_at IS NULL;
```

This repo targets Postgres exclusively in production (`database/member_leave_records_schema.sql`; SQLite appears only in the test harness, `backend/tests/calendar_auth_test_support.py:88-100`) — partial indexes with `DESC` multi-column ordering are standard, valid Postgres syntax matching the cited precedent exactly.

### Same-date behavior

Multiple summaries for the same reviewer+staff+date are allowed — no uniqueness constraint. Disambiguated by `created_at DESC` as the secondary sort key.

## 6. Migration design (Phase 5) — design only, not created or run

**Convention confirmed**: this repo uses hand-written, timestamped raw SQL migration files under `database/migrations/` (no Alembic — zero `alembic*` files found). Naming: `YYYY-MM-DD-description.sql`. Every existing migration wraps in `BEGIN; ... COMMIT;`, uses `CREATE TABLE IF NOT EXISTS`/`CREATE INDEX IF NOT EXISTS` for idempotency, appends post-COMMIT validation `SELECT`s, and ends with a commented-out, explicitly-scoped rollback block. Migrations are applied manually (`psql ... -f ...` or pasted into the Neon SQL Editor) — `backend/main.py` does not run migrations on startup.

**Proposed file**: `database/migrations/<date>-create-staff-review-summaries.sql`, mirroring `database/migrations/2026-07-16-create-member-leave-records.sql`:

```sql
BEGIN;

CREATE SCHEMA IF NOT EXISTS management_aios;

CREATE TABLE IF NOT EXISTS management_aios.staff_review_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_member_key TEXT NOT NULL,
    reviewed_staff_id UUID NOT NULL REFERENCES management_aios.staff_dashboard_records(id),
    meeting_date DATE NOT NULL,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL,

    CONSTRAINT staff_review_summaries_reviewer_member_key_check
        CHECK (reviewer_member_key IN ('mayurika', 'suman', 'arun', 'rajiv', 'paraparan')),
    CONSTRAINT staff_review_summaries_summary_text_nonblank_check
        CHECK (length(trim(summary_text)) > 0),
    CONSTRAINT staff_review_summaries_summary_text_max_length_check
        CHECK (length(summary_text) <= 10000)
);

CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_staff_date
ON management_aios.staff_review_summaries (reviewer_member_key, reviewed_staff_id, meeting_date DESC, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_review_summaries_reviewer_id
ON management_aios.staff_review_summaries (reviewer_member_key, id)
WHERE deleted_at IS NULL;

COMMIT;

-- Post-COMMIT validation SELECTs and a commented-out rollback block follow,
-- per this repo's existing migration-file convention.
```

**FK safety**: safe to apply — the target (`staff_dashboard_records.id`) is already `PRIMARY KEY`, and this is a brand-new table with zero rows, so there is no FK-violation risk on creation. **Zero-existing-data expectation**: confirmed — nothing to backfill.

### Rollback — three distinct concepts, not to be conflated

1. **Deployment rollback** (before the migration is ever applied): trivial — do not apply the SQL file; nothing to undo.
2. **Feature disablement** (after real reviewer data exists): unmount `staff_review_summaries_router` from `backend/main.py` and/or hide the frontend entry point. All reviewer rows remain intact, simply unreachable via API. **This is the correct operational rollback once real data exists.**
3. **Destructive schema rollback** (`DROP TABLE`): **must never be the automatic/default rollback once real reviewer data exists** — it permanently destroys every Management Team member's private review history. Precedent: `database/migrations/2026-07-13-create-staff-dashboard-records.sql` captions its own `DROP TABLE` rollback as "only safe before this table holds data anyone depends on" — the same caveat applies here with higher stakes. If ever genuinely required after real data exists, it must be preceded by an explicit export/backup and explicit business-owner sign-off.

## 7. API contract design (Phase 6)

Modeled on `backend/routers/member_leave.py` (route-wrapper pattern) and `backend/routers/calendar_auth.py` (auth dependency), with one deliberate structural difference: Staff Review Summaries routes carry **no `{member_key}`/`{reviewer_member_key}` URL path segment** — ownership is always "whoever the token verifies as." The `require_matching_member`/403-on-mismatch pattern used by Task/Leave does not apply; every filter is instead an implicit `WHERE reviewer_member_key = acting_member` added directly in the query, mirroring how `_get_active_record_or_404` already combines id + owner + `deleted_at IS NULL` in one filter call.

Auth dependency for every route: `acting_member: str = Depends(get_verified_member)` (`backend/routers/calendar_auth.py:97-103`), identical to the existing `member_leave.py:267` usage.

### `POST /api/staff-review-summaries`
- Request body: `{reviewed_staff_id: UUID, meeting_date: date, summary_text: str}` — `reviewer_member_key` is **never** accepted (not declared on the create schema at all, mirroring `MemberLeaveRecordCreate`'s exclusion of server-derived fields).
- Response: 201, full record (`id, reviewer_member_key, reviewed_staff_id, meeting_date, summary_text, created_at, updated_at`).
- `reviewer_member_key = acting_member`, assigned server-side exactly like `member_key=member_key` is assigned from the token-derived value in `member_leave.py`.
- Validation: unknown `reviewed_staff_id` → 422 (client input error, not 404 — 404 is reserved for "authenticated but not this reviewer's record"). `meeting_date` required. `summary_text` server-trimmed, 1–10,000 chars, following `TaskOutcomeUpdate.validate_reason_for_outcome`'s exact trim/validate pattern.

### `GET /api/staff-review-summaries?reviewed_staff_id=&date_from=&date_to=`
- Filters: `reviewer_member_key = acting_member` (always) AND `deleted_at IS NULL` AND optional `reviewed_staff_id` AND optional `meeting_date` range — mirrors `member_leave.py`'s existing `start_date`/`end_date` optional-range pattern.
- Order: `meeting_date DESC, created_at DESC`.
- **Pagination recommendation: `limit`/`offset`, default 50, max 500** — copying the only existing paginated-list precedent in this repo (`GET /api/staff`). No cursor scheme is warranted; this repo has zero cursor-pagination precedent. Response includes a `total` count field, matching `StaffListResponse.total`.

### `GET /api/staff-review-summaries/{summary_id}`
- Filter: `id = summary_id AND reviewer_member_key = acting_member AND deleted_at IS NULL` — one combined query (not "look up then check owner"), avoiding any existence-leaking timing/logic split.
- **404** for: nonexistent id, soft-deleted id, OR an id belonging to a different reviewer — all three collapse to the identical response by construction, which is what makes it non-disclosing.

### `PUT /api/staff-review-summaries/{summary_id}`
- Request body: `{meeting_date: Optional[date], summary_text: Optional[str]}` — `reviewed_staff_id` is **not editable** in Phase 1 (no requirement mentions reassigning who was reviewed; mirrors `MemberLeaveRecordUpdate`'s exclusion of `leave_type`).
- Same combined lookup → same 404 collapse as detail.
- `updated_at` set unconditionally on every successful PUT; `created_at` never touched — identical to `member_leave.py`'s update pattern.

### `DELETE /api/staff-review-summaries/{summary_id}`
- Soft delete only: sets `deleted_at`, never a hard `DELETE FROM` — identical to `delete_member_leave_record`.
- Same combined lookup → 404 for nonexistent/already-deleted/cross-reviewer, matching the existing repeat-delete-returns-404 convention.

### Cross-cutting behavior

- **401**: missing/malformed/invalid/blank token → `validate_calendar_auth_token` raises 401 before any DB access — reused as-is via `Depends(get_verified_member)`.
- **404**: unknown id and cross-reviewer id are indistinguishable by construction — never a 403 for cross-reviewer, which is the explicit design correction from `member_leave.py`'s URL-named-identity pattern (Staff Review Summaries has no such path-named claim to be honest about).
- **422**: standard FastAPI/Pydantic automatic validation (malformed UUID/date/body shape) plus explicit `model_validator`-driven `ValueError` for blank/overlong `summary_text`, following `TaskOutcomeUpdate.validate_reason_for_outcome` as the exact template.
- **Audit timestamps**: `created_at` immutable, `updated_at` refreshed on every PUT — both copy the `MemberLeaveRecord` convention.

## 8. Reviewer ownership rules (Phases 6–7 consolidated)

- **Create**: `reviewer_member_key = acting_member` (server-derived from `get_verified_member()`), never from the client body. The browser may send only `reviewed_staff_id`, `meeting_date`, `summary_text`.
- **Read/history**: every list and detail query filters `reviewer_member_key = acting_member AND deleted_at IS NULL`. No route exists for cross-reviewer or public listing.
- **Update/delete**: fetched only under the same combined ownership filter before any mutation; a record belonging to another reviewer (or nonexistent, or already soft-deleted) returns 404 — the mutation function never distinguishes "not found" from "not yours."
- **Public access**: none allowed on any route, including GET — a deliberate divergence from Task/Leave's public-GET convention.
- **Reviewed-person access**: none allowed in Phase 1 — the system's only identity primitive is the 5-key Calendar member token; a reviewed staff member has no token-issuing mechanism at all.

## 9. Datewise query design (Phase 7)

```sql
SELECT * FROM management_aios.staff_review_summaries
WHERE reviewer_member_key = :acting_member
  AND deleted_at IS NULL
  AND (:reviewed_staff_id IS NULL OR reviewed_staff_id = :reviewed_staff_id)
  AND (:date_from IS NULL OR meeting_date >= :date_from)
  AND (:date_to IS NULL OR meeting_date <= :date_to)
ORDER BY meeting_date DESC, created_at DESC
LIMIT :limit OFFSET :offset
```

Served entirely by `idx_staff_review_summaries_reviewer_staff_date` — leading columns match the equality filters, trailing `meeting_date DESC, created_at DESC` matches the `ORDER BY` exactly. Pagination: same `limit`/`offset` (default 50 / max 500) as §7 — one convention reused across the feature's single history query.

### Edge-case behavior

| Scenario | Behavior | Reasoning |
|---|---|---|
| Reviewed staff becomes inactive | History still shows normally, FK still resolves | `staff_status` is a data column on the *staff* row, unrelated to the FK; staff rows are never hard-deleted (§2) |
| Staff display name changes | History shows the **current** name (live join, no snapshot) | Direct consequence of the §5 no-snapshot decision — documented explicitly as the trade-off it produces |
| Staff record becomes unavailable/deleted | Not reachable in the current system | No hard-delete code path exists for `staff_dashboard_records` anywhere (§2) — this is a forward-looking note only, not a Phase 1 concern |
| Reviewer's token is rotated | No effect on stored data | `reviewer_member_key` is the fixed 5-value member key, never derived from the token string/hash itself; rotating a hash still resolves to the same `member_key` on the next login |

## 10. Frontend integration design (Phase 8)

**Integration point**: a new `<details class="member-testing-table-card collapsible-section">` block inside each of the 5 member tab-panels (`web-view/index.html`), placed immediately after each `.msc-instance` Calendar mount and before the existing testing-table `<details>` blocks. This matches the established collapsible-section convention (native `<details>`/`<summary>`, no new toggle JS) and avoids touching `instance.js`'s ~6,000-line closure factory, which its own header comment states was deliberately not split up during the 2026-07-17 modularization.

**Critical caveat to surface in the UI**: Calendar auth is browser-wide, not per-tab (`web-view/js/calendar/auth.js` lines 4-9) — a Review Summaries block mounted under "Suman's" tab does not mean the summaries shown there belong to Suman; they belong to whichever member's token is currently authorized in this browser. The block's heading should dynamically render "My Review Summaries — Authorized as: {label}" rather than implying tab identity determines data ownership.

**Key technical deviation**: `instance.js`'s `apiRequest`/`leaveApiRequest` attach the Authorization header only when `method !== 'GET'` — GETs are always anonymous today. Staff Review Summaries requires the opposite (every request including GET must carry the bearer token), so the new module needs its own fetch wrapper calling `ensureAuthorized()` unconditionally — it cannot reuse `apiRequest`/`leaveApiRequest` as-is.

### 14 UI states

1. **Reviewed-staff search/select** — debounced text input, reusing the existing `debounce()` pattern and `fetchStaffRecords()`'s `filters.search` param; option value = `staff.id`, label = `full_name`/`calling_name`, never `employee_number`.
2. **Meeting-date selection** — defaults to `getColomboTodayStr()` (already exported from `core.js`). The Calendar's "currently selected date" is not currently exported from `instance.js`'s private closure state — linking to it is deferred as an optional follow-up, not Phase 1 scope.
3. **Multiline summary entry** — plain `<textarea>` with `maxlength="10000"` soft guard and a live character counter.
4. **Save Summary** — POST, `setButtonBusy`/`.finally()` pattern identical to existing Task/Leave saves; client-side validation via the existing `ui/form-feedback.js` helpers before the request fires.
5. **Selected staff history** — GET list, rendered newest-first as stacked cards (reusing existing `.hr-table-card`/`.card` visual language, not a dense table, since summary text is prose).
6. **Date-from/date-to filters** — two `<input type="date">` feeding the list query, same `buildQuery()` shape as `staff-data.js`'s existing filter composition.
7. **Full-summary view** — detail panel/modal reusing the existing `.msc-view-modal` foundation; renders via `textContent` (see §12), not `innerHTML`.
8. **Edit** — PUT, prefills the same form component used for Create.
9. **Soft delete confirmation** — reuses `confirmDestructive()` from `ui/dialog.js` as-is (already supports async `onConfirm`, busy-button handling, and the danger-red confirm variant) — no new confirmation dialog needed.
10. **Loading state** — reuses `renderSkeletonRows()`/`showInlineLoading()` from `ui/loading.js`.
11. **Empty state** — two distinct messages: "Select a staff member to see their review history" (before selection) vs. "No review summaries yet for this staff member" (after selection, zero results).
12. **Validation error state** — reuses `setFieldError`/`focusFirstInvalid` from `ui/form-feedback.js`, matching existing Task/Leave error styling.
13. **Authorization error state** — 401 reuses `handleUnauthorizedResponse()` exactly (clears stored token, re-renders topbar indicator, next action re-triggers the authorize dialog); 404 reuses the existing generic `not_found` copy in `ui/error-mapper.js` verbatim (already non-disclosing — says nothing about permissions).
14. **Network error state** — reuses `mapApiError()`'s `network` entry and `showToast()`, matching `staff-data.js`'s existing error-handling convention.

### Hard exclusions — confirmed design compliance

Review content is never stored in Task notes, Leave records, Task outcome records, Calendar event records, or `localStorage`/any browser storage. It is fetched fresh via a token-authenticated request on every read; no client-side caching of summary text across page loads. The only existing localStorage key in this codebase (`management_aios_calendar_auth_v1`) stores only `{version, token, verifiedMemberKey, verifiedAt}` — never summary content — and the new module introduces no equivalent key.

### Expected frontend files (new + modified)

| File | New/Modified |
|---|---|
| `web-view/js/review-summaries.js` | New |
| `web-view/js/review-summaries.test.mjs` | New |
| `web-view/js/config.js` | Modified — add `STAFF_REVIEW_SUMMARIES_API_BASE` |
| `web-view/js/app.js` | Modified — wire `initReviewSummaries()` into `boot()` |
| `web-view/index.html` | Modified — one mount point per member tab-panel (5 insertions) |
| `web-view/css/calendar.css` or new `review-summaries.css` | Modified/New — layout + the `white-space: pre-wrap` rule (§12) |
| `web-view/js/ui/error-mapper.js` | Likely unchanged — the existing generic `not_found` entry already fits |

No change to `instance.js`, `auth.js`, `core.js`, or `staff-data.js` is required for the minimum-safe version.

## 11. Authorization matrix (Phase 10)

| Identity | POST (create) | GET (list) | GET (detail) | PUT (update) | DELETE |
|---|---|---|---|---|---|
| Owner reviewer | 201 | 200 | 200 | 200 | 200 |
| Different valid reviewer | 201 (creates their own separate row) | 200 (own rows only) | 404 | 404 | 404 |
| Missing token | 401 | 401 | 401 | 401 | 401 |
| Invalid/expired token | 401 | 401 | 401 | 401 | 401 |
| Reviewed staff member | N/A — no route accepts this identity | N/A | N/A | N/A | N/A |
| Public / anonymous | 401 | 401 | 401 | 401 | 401 |

The "different valid reviewer" row for POST/list is not a denial — every route is scoped to "your own records," so a second reviewer's create/list simply operates on their own separate data. "Reviewed staff member" is a true N/A, not a policy gap: this system's only identity primitive is the 5-key Calendar member token, and a reviewed staff member has no token-issuing mechanism at all.

**Frontend 401 handling — full reuse recommended, no new logic.** `handleUnauthorizedResponse()` (`web-view/js/calendar/auth.js`, clears stored token + re-renders the "Authorized as" indicator) should be called identically to how `instance.js`'s `apiRequest`/`leaveApiRequest` already call it. One deliberate divergence: the new feature should call `ensureAuthorized()` but should **not** call `guardMutationAccess()` — that function checks a URL-embedded target member against the stored token's member, a comparison Staff Review Summaries has no equivalent of (the acting reviewer is always "self").

## 12. Safe-text / privacy design (Phase 9)

**Recommendation: `textContent` + CSS `white-space: pre-wrap`, not `escapeHtml()` + `\n`→`<br>` + `innerHTML`.**

Reasoning: (a) zero HTML-injection surface — no escaping step to get subtly wrong; (b) this repo already has a working precedent for exactly this pattern: `ui.css`'s `.ui-dialog-message` uses `white-space: pre-line` specifically so `textContent`-set strings with real `\n` characters render as separated lines without `<br>` insertion (comment states verbatim: *"textContent never inserts `<br>`, so without this the two paragraphs would visually run together"*). `pre-line` collapses runs of consecutive spaces/tabs, which is fine for short dialog messages but likely wrong for a 10,000-char review summary where intentional spacing should survive — **`white-space: pre-wrap`** (preserves all whitespace, still wraps long lines) is the correct choice, and is a new, minimal, one-line CSS rule not yet present anywhere in `web-view/css/` — flagged explicitly here, not silently added.

**Additional controls, all confirmed against existing repo evidence:**

- No summary content in a URL — the only URL-bearing params are `reviewed_staff_id` (UUID) and `date_from`/`date_to`; `summary_text` is always request-body-only.
- No summary content in `console.log`/`console.error` — no existing calendar/staff module logs raw field values; the new module follows the same convention.
- No summary content in analytics — confirmed no analytics/telemetry SDK exists anywhere in `web-view/`.
- No production summary content in screenshots — process rule, not code, carried forward as a documentation constraint.
- No summary content persisted in browser storage — see §10 hard exclusions.
- No public caching of API responses — recommend `Cache-Control: no-store` on all 5 new backend routes (no existing route sets explicit cache headers today; this is a new, deliberate addition for this specifically private data), plus `cache: 'no-store'` client-side in the new fetch wrapper as a belt-and-suspenders addition.
- Soft deletion only (§6, §7) — no hard delete of review content in Phase 1.
- Optional access-event logging is a recommendation, not a Phase 1 requirement — not designed here; would need its own follow-up scoping.

## 13. Test matrix (Phase 11)

### Backend — 31 named cases

Modeled on `backend/tests/test_calendar_mutation_authorization.py` (HTTP-level `TestClient` against the real app, isolated in-memory SQLite per test) and `backend/tests/test_calendar_auth.py` (fixed test tokens, `bearer_header()` helper).

1. `test_staff_record_out_exposes_id_field`
2. `test_staff_id_is_stable_across_reimport`
3. `test_staff_id_is_uuid_type_not_employee_number`
4. `test_create_summary_valid_request_returns_201`
5. `test_create_summary_missing_token_returns_401`
6. `test_create_summary_invalid_token_returns_401`
7. `test_create_summary_reviewer_key_is_server_derived_spoof_attempt_ignored`
8. `test_create_summary_unknown_reviewed_staff_id_returns_422`
9. `test_create_summary_allows_inactive_reviewed_staff`
10. `test_list_summaries_returns_only_owner_reviewers_rows`
11. `test_list_summaries_cross_reviewer_rows_invisible`
12. `test_list_summaries_public_denied`
13. `test_detail_owner_returns_200`
14. `test_detail_cross_reviewer_returns_404_not_403`
15. `test_detail_nonexistent_id_returns_404`
16. `test_list_ordering_meeting_date_desc`
17. `test_list_ordering_created_at_desc_secondary_tiebreak`
18. `test_list_date_from_filter`
19. `test_list_date_to_filter`
20. `test_list_empty_result_when_no_matches`
21. `test_update_owner_returns_200_and_refreshes_updated_at`
22. `test_update_cross_reviewer_returns_404`
23. `test_update_blank_summary_text_returns_422`
24. `test_create_summary_at_max_length_boundary_accepted`
25. `test_create_summary_over_max_length_rejected`
26. `test_summary_text_special_characters_persisted_safely`
27. `test_delete_owner_soft_deletes_returns_200`
28. `test_delete_cross_reviewer_returns_404_and_row_untouched`
29. `test_deleted_summary_excluded_from_list`
30. `test_deleted_summary_detail_returns_404`
31. `test_multiple_summaries_same_staff_same_date_allowed`

### Frontend — 9 named cases

Modeled on `web-view/js/calendar/auth.test.mjs`'s hand-rolled DOM stand-in (`node --test`, no npm dependencies).

1. `staff selector uses staff.id as the option value, never employee_number`
2. `create form rejects a blank summary before any request is sent`
3. `create form rejects a summary over 10,000 characters before any request is sent`
4. `history list renders newest-first (meeting_date DESC, created_at DESC)`
5. `safe rendering: a summary containing "<script>"/HTML-like text renders literally, never executes`
6. `edit flow prefills the form from the fetched record and submits a PUT to the correct id`
7. `delete confirmation: Cancel leaves the record intact; Confirm calls DELETE and removes the row`
8. `401 response triggers the same reauthorization flow as Calendar mutations`
9. `404 on a specific record shows the generic "not found" message, never a permission-denied message`

**Total proposed test count: 40** (31 backend + 9 frontend), exceeding the required minimum of 30.

### Regression suites to re-run (not new tests)

- Backend: `test_calendar_auth.py`, `test_calendar_mutation_authorization.py`, `test_member_leave.py`, `test_task_outcome.py`, `test_task_outcome_endpoint.py`, full existing `backend/tests/` Calendar/Task suite.
- Frontend: `auth.test.mjs` and the full existing `web-view/js/calendar/*.test.mjs` suite (all run together via `node --test *.test.mjs`).

## 14. Deployment sequence

1. Apply the migration (`database/migrations/<date>-create-staff-review-summaries.sql`) manually against the target database.
2. Deploy the backend change (additive `StaffRecordOut.id` field + new router registration in `backend/main.py`).
3. Run the full existing backend test suite plus the 31 new tests to confirm zero regressions.
4. Deploy the frontend change (new module + 5 mount points + config addition).
5. Run the full existing frontend test suite plus the 9 new tests.
6. Manual browser walkthrough (not performed this session — no browser automation tool available, consistent with prior Calendar-auth work in this repo).

## 15. Rollback plan

See §6 for the full three-tier breakdown. Summary: deployment rollback (don't apply) is trivial pre-deploy; feature disablement (unmount router + hide UI, data preserved) is the correct operational rollback once real data exists; destructive `DROP TABLE` must never be automatic once real reviewer data exists and requires explicit export + sign-off.

## 16. Implementation file map

**Backend — new**: `backend/routers/staff_review_summaries.py`, `database/migrations/<date>-create-staff-review-summaries.sql`, `database/staff_review_summaries_schema.sql`, `backend/tests/test_staff_review_summaries.py`.
**Backend — modified**: `backend/models.py` (add `StaffReviewSummary`), `backend/schemas.py` (add create/update/out schemas + `StaffRecordOut.id`), `backend/main.py` (register router).
**Frontend — new**: `web-view/js/review-summaries.js`, `web-view/js/review-summaries.test.mjs`.
**Frontend — modified**: `web-view/js/config.js`, `web-view/js/app.js`, `web-view/index.html`, `web-view/css/calendar.css` (or a new CSS file).

None of these files were created or modified during this design session.

## 17. Known limitations

1. ~~Live staff-id verification (row count, null count, duplicate count against the actually-deployed table) is UNVERIFIED this session — no approved database connection was available.~~ **RESOLVED 2026-08-03** — see §20. Live query confirms 310 rows, 0 null ids, 0 duplicate ids, `id` is `uuid` NOT NULL, PK-constrained. One residual note carried forward from that verification: the live column has no DB-level `DEFAULT` clause (see §20) — id generation currently relies on the SQLAlchemy ORM-side default, not a Postgres-side one; this does not affect the null/duplicate/uniqueness guarantees already enforced by the `PRIMARY KEY` constraint, but should be considered when the migration in §6 is finalized (adding `DEFAULT gen_random_uuid()` to the live column, or accepting the ORM-only default, is an implementation-phase decision, not a blocker).
2. Summary maximum length (10,000 characters) is proposed but not finally confirmed by the business owner.
3. The Calendar's "currently selected date" cannot be used to prefill `meeting_date` without a new export from `instance.js`'s private closure state — deferred as an optional follow-up, not Phase 1 scope.
4. No live browser walkthrough was performed (no browser automation tool available in this environment), consistent with the pattern already documented for prior Calendar-auth work in this repo.
5. `Cache-Control: no-store` on the new routes is a new, not-yet-precedented convention in this backend — flagged as a deliberate addition, not inherited from an existing pattern.

## 18. Approval / status

**Original status (2026-08-03, design session): READY WITH LIMITATION.**

Per this task's explicit instruction, READY FOR IMPLEMENTATION could not be claimed while staff.id stability rested on repository schema evidence rather than a live database query (Known Limitation #1). The design itself was complete and internally consistent with the approved requirement (§3), and every technical question raised in the requirement's §6 "Technical verification required" list had a documented answer or an explicit UNVERIFIED flag — nothing was BLOCKED, and no open item required a further business decision beyond the already-flagged summary-length confirmation.

**Updated status (2026-08-03, live verification session): READY FOR IMPLEMENTATION.** See §20 for the live database evidence that resolves Known Limitation #1. The single remaining open item is the non-blocking summary-maximum-length business parameter (§10), which does not gate implementation start per the requirement's own framing.

### Numeric pass/fail rule

This design PASSES readiness for the next phase if and only if:
- 0 unresolved contradictions between this design and REQ-CAL-REV-001 (§3 confirms 0);
- all 5 API routes have a fully documented request/response/auth/ownership/error contract (§7 confirms 5/5);
- the authorization matrix has 0 blank cells across the 6×5 grid (§11 confirms 30/30 filled);
- the proposed test count is ≥ 30 (§13 confirms 40);
- 0 application code, migration, or database files were touched in producing this design (confirmed).

All five conditions are met. The single outstanding item (live staff-id verification) is a pre-implementation checklist item, not a design defect — hence READY WITH LIMITATION rather than BLOCKED.

## 19. One next step

~~Obtain an approved read-only database connection (or request an operator to run the row-count/null-count/duplicate-`id` queries manually) to close Known Limitation #1, then begin backend implementation starting with the additive `StaffRecordOut.id` field (§4) — the one change every other part of this design depends on.~~ **Superseded by §20** — the database connection was obtained and Known Limitation #1 is resolved. The next step is now: begin backend implementation starting with the additive `StaffRecordOut.id` field (§4).

## 20. Live Staff ID Verification (2026-08-03)

Read-only verification performed against the live PostgreSQL database using an already-approved, pre-authorized connection (`claude.ai postgres` MCP connector). No credentials, connection strings, or passwords are recorded here.

| Item | Result |
|---|---|
| Connection target confirmed | Database `order_management_copy`, user `postgres`, `search_path = "$user", public` |
| Database/table checked | `management_aios.staff_dashboard_records` |
| Table existence | Confirmed present |
| Column checked | `id` |
| Column data type | `uuid` (`data_type` = `uuid`, `udt_name` = `uuid`) |
| Nullability | `is_nullable = NO` |
| Column default | **None** — the live column carries no `DEFAULT` clause at the database level (see note below; this is a discrepancy from the repository migration-file evidence cited in §2, which specifies `DEFAULT gen_random_uuid()`) |
| Primary-key result | Confirmed — constraint `staff_dashboard_records_pkey`, type `PRIMARY KEY`, column `id` |
| Total row count | 310 |
| Null-id count | 0 |
| Distinct-id count | 310 |
| Duplicate-id count | 310 − 310 = **0** |
| Read-only method | Individual `SELECT`-only metadata/aggregate statements (see note below on transaction wrapping), plus one no-op `ROLLBACK` issued for compliance with the task's transaction-close instruction |
| Row-level staff data displayed | **NO** — only schema metadata and aggregate counts were queried or reported; no names, employee numbers, emails, phones, or full rows were selected or displayed |
| Database writes executed | **0** |
| Verification date | 2026-08-03 |
| Remaining limitation | The live `id` column has no DB-level `DEFAULT`. Non-null/uniqueness is still fully guaranteed by the `PRIMARY KEY` constraint for any row already in the table, and by the SQLAlchemy ORM's `default=uuid.uuid4()` for any row inserted through the application — but a row inserted by a tool that bypasses the ORM (e.g. a raw `INSERT` without an explicit `id`) would fail rather than auto-generate one. This is a note for the implementation phase (§6's migration should consider adding `DEFAULT gen_random_uuid()` to match the originally-designed DDL), not a blocker to this design's readiness. |

**Note on transaction wrapping**: the available query tool executes each statement independently; a combined `BEGIN READ ONLY; ...; ROLLBACK;` batch did not return the intermediate `SELECT` result (only the trailing statement's empty result was visible), so per this task's explicit fallback instruction ("If the driver or environment cannot guarantee read-only mode, run only the listed SELECT metadata and aggregate queries"), each metadata/aggregate query was instead run individually. Every statement executed was a `SELECT` against `information_schema`/`management_aios.staff_dashboard_records` or a no-op `ROLLBACK` — no `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, or DDL statement was issued at any point.

**Status-rule evaluation**: table exists ✓; `id` type is `uuid` ✓; primary key confirmed ✓; null-id count is 0 ✓; duplicate-id count is 0 ✓; no write occurred ✓. All six conditions required for READY FOR IMPLEMENTATION (§18) are met.
