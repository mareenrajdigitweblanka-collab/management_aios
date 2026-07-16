---
name: schedule-item-title-limit-120-check
type: validation
created: 2026-07-16
status: PASS — Schedule Item title limit raised from 60 to 120 characters consistently across frontend, backend schema, ORM, and database; migration applied and confirmed on the correct database; 138/138 backend tests pass
source-boundary: backend/models.py, backend/schemas.py, backend/tests/test_schedule_classification.py, backend/tests/test_member_leave.py, database/member_schedule_events_schema.sql, database/migrations/2026-07-16-increase-member-schedule-title-limit.sql, web-view/index.html. member-aios/mayurika-hr/staff-data/ not accessed. Leave purpose (240) and external_reference (120) limits confirmed unchanged.
root-truth: CLAUDE.md — canonical
---

# Schedule Item Title Limit Increase to 120 — Validation Check — 2026-07-16

## Requirement

Increase the Schedule Item Title field's maximum length from ~60 characters to 120 characters, consistently across the frontend input, backend Pydantic schema, ORM column, and live database constraint, with matching tests. Leave purpose (240) and external reference (120) limits must remain unchanged.

## Old Limit

60 characters, enforced in four places:
1. `web-view/index.html` — `<input class="msc-field-title" maxlength="60" ...>`
2. `backend/schemas.py` — `MemberScheduleEventCreate.title: str = Field(..., max_length=60, min_length=1)`
3. `backend/schemas.py` — `MemberScheduleEventUpdate.title: Optional[str] = Field(default=None, max_length=60, min_length=1)`
4. `backend/models.py` — `title = Column(String(60), nullable=False)`, mirrored by `database/member_schedule_events_schema.sql`'s `title VARCHAR(60) NOT NULL`

No `CHECK` constraint on title length existed in the database — the 60-character limit was enforced entirely by the `VARCHAR(60)` column type modifier plus the Pydantic `max_length` fields above.

## New Limit

120 characters, applied identically at all four locations (frontend `maxlength`, both Pydantic schemas, ORM column, database column type).

## Frontend Location

`web-view/index.html` — the Schedule Item Title `<input class="msc-field-title">`'s `maxlength` attribute changed from `"60"` to `"120"`. Field name, CSS class, `container.querySelector('.msc-field-title')` reference, and all event handlers (`addBtn`/`updateBtn`/`editItem`/`resetForm`) are unchanged. A character counter (`0 / 120`, class `.msc-field-title-counter`) was added directly below the input, updated on the input's `input` event via a new `updateTitleCounter()` function (container-scoped, no global ID, called once per `.msc-instance`) and refreshed whenever the field's value is set programmatically (`resetForm()`, `editItem()`) so it never shows a stale count. The counter gains a `--near-limit` modifier class (amber text) once the count reaches 110/120, purely presentational. The actual enforcement remains the input's own `maxlength` attribute and the backend schema validation — the counter is informational only.

## Backend Schema Location

`backend/schemas.py` — both `MemberScheduleEventCreate.title` and `MemberScheduleEventUpdate.title` changed from `max_length=60` to `max_length=120`; `min_length=1` unchanged on both (still rejects an empty string). The module docstring's "title required, max 60 characters" note was updated to "max 120 characters" for accuracy. No other field (`notes`, `priority`, `category`, `start`/`end`) was touched. Leave-related schemas (`MemberLeaveRecordCreate`/`Update` — `purpose` max_length=240, `external_reference` max_length=120) were not modified.

## ORM Location

`backend/models.py` — `MemberScheduleEvent.title` changed from `Column(String(60), nullable=False)` to `Column(String(120), nullable=False)`. No other column on `MemberScheduleEvent`, and no column on `StaffDashboardRecord` or `MemberLeaveRecord`, was touched.

## Database Constraint / Location

- `database/member_schedule_events_schema.sql` — `title VARCHAR(60) NOT NULL` changed to `title VARCHAR(120) NOT NULL` (fresh-install target state), with a dated comment explaining the change and pointing to the migration for existing deployments (matching this file's established convention for prior changes).
- `database/migrations/2026-07-16-increase-member-schedule-title-limit.sql` — new, additive migration: `ALTER TABLE management_aios.member_schedule_events ALTER COLUMN title TYPE VARCHAR(120);` inside `BEGIN`/`COMMIT`, with 3 post-migration validation queries and a documented (non-destructive-by-default, commented-out) rollback. Does not drop the table, does not modify any existing row's stored title value (a VARCHAR-widening `ALTER COLUMN TYPE` is a metadata-only operation in PostgreSQL — no table rewrite, no data touched), and does not touch `category`, `priority`, `notes`, `member_key`, date/time columns, `source_scope`, `is_official_truth`, `created_by`/`updated_by`, timestamps, `deleted_at`, or any other table (`staff_dashboard_records`, `member_leave_records`). Idempotent: re-running `ALTER COLUMN ... TYPE VARCHAR(120)` against an already-120 column is a documented no-op in PostgreSQL (no error).

## 120-Character Result

**Accepted**, confirmed by unit test `TitleLengthLimitTests.test_120_char_title_accepted_on_create` (and the parallel update test) in `backend/tests/test_schedule_classification.py`: a title of exactly 120 characters is constructed successfully via `MemberScheduleEventCreate`/`MemberScheduleEventUpdate` with no `ValidationError`.

## 121-Character Result

**Rejected**, confirmed by unit test `test_121_char_title_rejected_on_create` (and the parallel update test): a title of 121 characters raises `pydantic.ValidationError` on both `MemberScheduleEventCreate` and `MemberScheduleEventUpdate` — this is Pydantic's standard `max_length` violation response, which the existing router surfaces as an HTTP 422 (unchanged error-handling path — no new exception handling was added).

## Rendering Result

Reviewed every place a task title is displayed, with no code change required — the existing CSS already handles arbitrary-length text safely:

| Surface | CSS rule | Behavior with a long (up to 120-char) title |
|---|---|---|
| Month view chip (`.msc-cal-chip`) | `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` | Truncates visually with ellipsis — no horizontal overflow, no cell expansion. Stored title unaffected. |
| Week/Day timed event (`.msc-tg-event-title`) | `white-space: nowrap; text-overflow: ellipsis; overflow: hidden;` | Same — truncates within the fixed-height time-grid block. |
| Week/Day all-day chip (`.msc-tg-allday-chip`) | No `nowrap` set (default `white-space: normal`) | Wraps normally within its column — no horizontal overflow (wrapping only grows height, not width). |
| Schedule Items list item (`.msc-item-title`) | No `nowrap`/truncation set | Wraps normally across multiple lines — the full title remains fully visible, no overflow. |
| View/detail modal (`.msc-modal h4` / `.msc-view-title`) | `.msc-modal` has `max-width: 420px; width: 100%`, no `nowrap` on the heading | Wraps within the bounded modal width — the complete, untruncated title is always shown here, satisfying "preserve the full title in detail/view UI." |

No CSS was modified for rendering — the existing rules were verified sufficient and are documented here as confirmation, per the instruction to use CSS presentation only and not invent unnecessary styling changes.

## All-Five-Member Result

Confirmed: the title input, counter, and every rendering surface reviewed above live inside the single shared `mountScheduleCalendarInstance` factory and its one `container.innerHTML` template — no per-member branch exists anywhere in this diff. All five member instances (mayurika, suman, arun, rajiv, paraparan) inherit the 120-character limit and counter identically.

## Regression Tests

- **Task classification** — `ClassifyScheduleCategoryTests` (16-item matrix, `backend/tests/test_schedule_classification.py`) unchanged and still passing; classification logic never inspects `title`.
- **Category immutability** — unchanged code path in `update_member_schedule_event`; not touched by this diff.
- **Leave-conflict checks** — `backend/routers/leave_logic.py`/conflict-check call sites in `member_schedules.py` unchanged; conflict detection never inspects `title`.
- **Leave purpose limit unchanged** — new test `test_purpose_limit_unchanged_at_240_by_schedule_item_title_increase` (`backend/tests/test_member_leave.py`) confirms 240 chars accepted, 241 rejected.
- **Leave external_reference limit unchanged** — new test `test_external_reference_limit_unchanged_at_120` confirms 120 accepted, 121 rejected — verifying this limit (which now happens to numerically equal the new title limit) remains independently enforced, not accidentally removed or altered.
- **Whitespace-only title behavior unchanged** — new test `test_whitespace_only_title_behavior_unchanged` documents and locks in the pre-existing behavior: the Pydantic schema has never trimmed or rejected a whitespace-only title beyond `min_length=1` (character count); this task did not add new schema-level whitespace enforcement. The frontend's own `.trim()` check (unchanged) is what actually blocks whitespace-only submission in the UI, exactly as before.
- **Existing shorter titles** — `test_existing_short_title_still_succeeds` and `test_old_60_char_title_still_within_new_limit` confirm a title at or below the old 60-character ceiling still succeeds under the new 120-character ceiling (a strict widening, never a narrowing).
- **Empty title still rejected** — `test_empty_title_still_rejected` confirms `min_length=1` is unaffected.

## Database Execution Result

**PASS.** The migration was applied by the user directly via the Neon SQL Editor against the confirmed-correct Management AIOS Neon database (project "AIOS", branch "production", database `schedule`). Post-migration query confirmed `title` is now `character varying` with `character_maximum_length = 120`. No existing row's title exceeds 120 characters (0 rows returned by the over-120 check). Full detail in `evidence/database/schedule-item-title-limit-120-migration-execution-2026-07-16.md`.

**Correction note:** an MCP-connected Postgres tool available in this session reported a different database (`order_management_copy`) — this was explicitly identified as the wrong connection and was not used for any write. All migration statements were run by the user directly against the correct `schedule` database via the Neon SQL Editor.

## Static Checks

- `python -m unittest discover -s backend/tests` — **138 tests, 138 passed, 0 failed** (128 pre-existing + 10 new: 8 title-boundary tests, 2 leave-limit-unchanged regression tests).
- `python -c "import backend.main"` — passed.
- `node --check` on the extracted schedule-calendar `<script>` block (94,598 characters) — passed, no syntax errors.
- Python `html.parser` full-file tag-balance check — 0 errors, 0 unclosed tags.
- Grep-confirmed: exactly one `maxlength="120"` on the title input; Notes (240), Leave purpose (240), and Leave external_reference (120) `maxlength` values are unchanged and untouched by this diff.

## PASS / AMBER / FAIL

**PASS.** The 120-character limit is now enforced consistently at the frontend, Pydantic schema (create + update), ORM model, and live database column; the database migration was executed and confirmed against the correct Management AIOS database; all rendering surfaces were reviewed and confirmed safe with no code change needed; 138/138 backend tests pass including 10 new boundary/regression tests; Leave purpose/external-reference limits and task classification/conflict logic are confirmed unchanged.
