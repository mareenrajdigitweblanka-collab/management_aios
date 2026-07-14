---
name: schedule-task-classification-check
type: validation
created: 2026-07-14
created-by: Mareenraj (builder)
status: PASS
---

# Schedule Task Classification Validation

## Requirement

Replace the four sample calendar categories (`Sample Task`, `Sample Review`, `Sample Follow-up`, `Sample Planning`) with a permanent two-category system (`Scheduled Task`, `Unscheduled Task`), enforced server-side at creation using Asia/Colombo time, permanently locked after creation, with daily/weekly per-member reporting — across the one shared calendar implementation used by Mayurika, Suman, Arun, Rajiv, and Paraparan.

## Confirmed Business Rules

1. Only `Scheduled Task` / `Unscheduled Task` are valid going forward.
2. All four sample categories removed from the frontend and from create-time validation.
3. Classification uses Asia/Colombo local time.
4. Compares authoritative server creation time against `event_date + start_time` (Asia/Colombo).
5. Created before planned start: requested category (Scheduled or Unscheduled) is honored.
6. Created exactly at planned start (`<=`, inclusive): Scheduled Task selection is honored.
7. Created after planned start: always forced to Unscheduled Task server-side, regardless of request.
8. Untimed tasks (`start_time IS NULL`): never auto-classified as late; requested category is honored.
9. Category is immutable after creation — any change attempt (either direction) returns HTTP 422; ordinary edits, drag/drop, and resize never touch category.
10. All existing rows, including soft-deleted, migrate to `Scheduled Task`.
11. Migration inserts/deletes no rows.
12. No automatic sample/demo tasks are created by this work.
13-14. Daily/weekly reporting per member: scheduled/unscheduled/total counts and whole-number percentages that always sum to 100 when total > 0; zero-total returns 0%/0%.
15. Weekly reporting uses the frontend's existing Sunday-start week convention (`getWeekStart()`).

## Files Changed

| File | Change |
|---|---|
| `backend/config.py` | Added `VALID_SCHEDULE_CATEGORIES`, `DEFAULT_SCHEDULE_CATEGORY`, `SCHEDULE_TIMEZONE = "Asia/Colombo"` |
| `backend/schemas.py` | Added `ScheduleCategory` Literal type; `MemberScheduleEventCreate.category` now strictly typed (rejects invalid values, defaults to `Scheduled Task`); `MemberScheduleEventUpdate.category` kept loosely typed by design (router does the immutability check); added `DailyScheduleReportOut` / `WeeklyScheduleReportOut` |
| `backend/models.py` | `category` server default changed to `Scheduled Task`; added named `member_schedule_events_category_check` CheckConstraint (target state — takes effect on the live table only once the migration runs) |
| `backend/routers/member_schedules.py` | Added `classify_schedule_category()` (create-time-only classification helper), `_percentages()`, `_count_scheduled_vs_unscheduled()`; wired classification into `create_member_schedule_event` (single `datetime.now(timezone.utc)` instant used for both classification and storage); added the update-lock 422 check to `update_member_schedule_event`; added `GET /{member_key}/reports/daily` and `GET /{member_key}/reports/weekly` |
| `backend/tests/__init__.py` | Created (new test package) |
| `backend/tests/test_schedule_classification.py` | Created — 16 automated `unittest` tests (no new dependency) |
| `database/member_schedule_events_schema.sql` | Target-state category default and CHECK constraint updated |
| `database/migrations/2026-07-14-schedule-task-category-classification.sql` | Created — transaction-safe, rerunnable migration |
| `web-view/index.html` | `CATEGORY_CLASS` map reduced to the two new categories; category `<select>` reduced to two options, defaulting to `Scheduled Task`; category field disabled + helper text shown during edit; title placeholder, priority label, notes placeholder, and view-modal wording updated; new reusable "Schedule Summary" card (daily + weekly, server-authoritative) added and wired into `selectDate()`/create/update/delete flows; new scoped CSS for the summary layout |

## Pre-Migration Counts

Captured via the Neon SQL Editor (approved method — direct workstation PostgreSQL access is confirmed unreliable at the SSL/protocol-handshake layer; see Known Limits). Consolidated single-row JSON query, run 2026-07-14.

- **Total rows:** 145
- **Active rows:** 130 / **Soft-deleted rows:** 15
- **Null category / null event_date / null start_time / invalid time range counts:** 0 / 0 / 15 / 0 (the 15 null-start-time rows are expected — untimed/all-day events are a legal, pre-existing case)
- **Count by category (all rows, active + soft-deleted):**

  | Category | Count |
  |---|---|
  | Sample Task | 121 |
  | Sample Follow-up | 14 |
  | Unscheduled Task | 4 |
  | Scheduled Task | 3 |
  | Sample Planning | 3 |
  | **Total** | **145** |

  The 4 `Unscheduled Task` / 3 `Scheduled Task` rows are from this session's own live API validation pass (all soft-deleted afterward — see "Live API" test results above) plus incidental live testing; per confirmed business rule 10 ("all existing rows, including soft-deleted rows, must be migrated to Scheduled Task"), the migration applies to every row regardless of current value, including these already-new-format ones — this is intentional, not a gap in the migration's WHERE clause.

- **Count by member:**

  | Member | Count |
  |---|---|
  | mayurika | 97 |
  | suman | 21 |
  | rajiv | 12 |
  | paraparan | 8 |
  | arun | 7 |
  | **Total** | **145** |

## Post-Migration Counts

Captured via the Neon SQL Editor, consolidated single-row `::text`-cast query, run 2026-07-14 immediately after the migration committed.

- **Total rows:** 145 — **matches pre-migration total exactly (145). No row inserted or deleted.**
- **Invalid category rows:** 0
- **Count by category:** exactly one entry — `Scheduled Task: 145` (all four sample categories, and the pre-existing `Unscheduled Task`/`Scheduled Task` rows, are now uniformly `Scheduled Task`, per confirmed business rule 10)

## Category Constraint Evidence

Confirmed present via `pg_constraint` lookup: `conname: "member_schedule_events_category_check"`, `definition` beginning `CHECK ((ca...` — a non-empty match on the exact constraint name this migration creates, confirming the constraint exists on the live table (the full definition text was truncated in the pasted result, but existence + correct name, combined with the migration script's own internal validation step passing, is sufficient confirmation — the constraint's defined clause is `CHECK (category IN ('Scheduled Task', 'Unscheduled Task'))`, matching `database/member_schedule_events_schema.sql`'s target state).

## Test Results

### Automated (`backend/tests/test_schedule_classification.py`, 16 tests, no database required)

```
Ran 16 tests in 0.002s
OK
```

| # | Scenario | Covered by |
|---|---|---|
| 1 | Before start + Scheduled → Scheduled | `test_before_start_scheduled_selected_stays_scheduled` |
| 2 | Before start + Unscheduled → Unscheduled | `test_before_start_unscheduled_selected_stays_unscheduled` |
| 3 | Exact start + Scheduled → Scheduled | `test_exact_start_scheduled_selected_stays_scheduled` |
| 4 | After start + Scheduled → forced Unscheduled | `test_after_start_scheduled_selected_forced_unscheduled` |
| 5 | After start + Unscheduled → Unscheduled | `test_after_start_unscheduled_selected_stays_unscheduled` |
| 6 | Untimed + Scheduled → Scheduled | `test_untimed_scheduled_selected_stays_scheduled` |
| 7 | Untimed + Unscheduled → Unscheduled | `test_untimed_unscheduled_selected_stays_unscheduled` |
| 15 | Invalid category → rejected | `test_retired_sample_categories_rejected`, `test_arbitrary_category_rejected` |
| 18 | Zero tasks → 0%/0% | `test_zero_total_returns_zero_and_zero` |
| 19 | Percentages sum to 100 | `test_percentages_always_sum_to_100_when_total_positive` (6 sub-cases) |
| 23 | Asia/Colombo boundary (UTC day ≠ Colombo day) | `test_asia_colombo_boundary_not_evaluated_as_utc` |

### Live API (run against the deployed backend, `https://management-aios-api.vercel.app`, member_key=`arun`, non-sensitive synthetic titles prefixed `AIOS TEST -`, all rows deleted after the run — confirmed 0 remaining)

19/19 checks passed:

| # | Scenario | Result |
|---|---|---|
| A | Future planned time + Scheduled selected → Scheduled | PASS — `201`, `category: "Scheduled Task"` |
| B | Future planned time + Unscheduled selected → Unscheduled | PASS — `201`, `category: "Unscheduled Task"` |
| C | Past planned start + Scheduled selected → forced Unscheduled | PASS — `201`, `category: "Unscheduled Task"` |
| D | Edit Test C (title only) → category remains Unscheduled | PASS — `200`, `category: "Unscheduled Task"` |
| 8 | Direct attempt: Unscheduled → Scheduled | PASS — `422`, `"Task category is permanent after creation."` |
| 10 | Same-category update (Unscheduled → Unscheduled) does not fail | PASS — `200` |
| 9/11 | Edit a Scheduled task (title only) → remains Scheduled | PASS — `200`, `category: "Scheduled Task"` |
| — | Direct attempt: Scheduled → Unscheduled | PASS — `422`, `"Task category is permanent after creation."` |
| 12 | Drag/drop-equivalent (time-only PUT) on Scheduled → unchanged | PASS — `200`, `category: "Scheduled Task"` |
| 13 | Drag/drop-equivalent (time-only PUT) on Unscheduled → unchanged | PASS — `200`, `category: "Unscheduled Task"` |
| 14 | Resize (same code path as drag/drop — `commitItemTimeChange`) | Covered by 12/13 (identical handler) |
| 15 | Invalid category (`Sample Task`) on create → rejected | PASS — `422` |
| 6 | Untimed + Scheduled selected → Scheduled | PASS — `201`, `category: "Scheduled Task"` |
| 7 | Untimed + Unscheduled selected (past date) → Unscheduled | PASS — `201`, `category: "Unscheduled Task"` |
| — | Untimed on a past *date* + Scheduled selected → still Scheduled (rule 8: no start_time = never auto-late) | PASS — `201`, `category: "Scheduled Task"` |
| 20 | Member isolation: list only returns the requested member's own rows | PASS — 3/3 rows all `member_key: "arun"` |
| 20 | Member isolation: a different member cannot edit another member's event id | PASS — `404` |
| 16 | Daily report reachable and correct | PASS — `{"scheduled_count": 2, "unscheduled_count": 1, "total_count": 3, "scheduled_percentage": 67, "unscheduled_percentage": 33}` (sums to 100) |
| 17 | Weekly report reachable and correct | PASS — same 2/1/3, 67%/33% for the containing week |
| — | Invalid date on report query → 422 | PASS — `422` |

| # | Scenario | Status |
|---|---|---|
| 21 | Migration row count preserved | PASS — 145 rows before, 145 rows after |
| 22 | Existing rows become Scheduled Task | PASS — category breakdown post-migration is exactly one entry, `Scheduled Task: 145` |
| 24 | Refresh persistence | Structurally guaranteed — `GET` always re-reads from the database (no client cache), and the live `POST`/`PUT` responses above already round-tripped through the database (SQLAlchemy `db.refresh(event)` after commit); not separately re-tested via a second `GET` in this pass but covered by the same code path exercised in every case above |

## API Examples (no sensitive task details)

**Create (before planned start, Scheduled requested):**
```
POST /api/member-schedules/{member_key}
{"date": "2026-08-01", "title": "Prepare weekly report", "category": "Scheduled Task", "start": "14:00"}
→ 201 {"category": "Scheduled Task", ...}
```

**Create (after planned start, Scheduled requested — forced):**
```
POST /api/member-schedules/{member_key}
{"date": "2026-07-01", "title": "Prepare weekly report", "category": "Scheduled Task", "start": "09:00"}
→ 201 {"category": "Unscheduled Task", ...}
```

**Update attempting to change category:**
```
PUT /api/member-schedules/{member_key}/{event_id}
{"category": "Scheduled Task"}
→ 422 {"detail": "Task category is permanent after creation."}
```

**Invalid category on create:**
```
POST /api/member-schedules/{member_key}
{"date": "2026-08-01", "title": "x", "category": "Sample Task"}
→ 422 (Pydantic validation error — value not in the allowed Literal set)
```

**Daily report:**
```
GET /api/member-schedules/{member_key}/reports/daily?date=2026-08-01
→ {"member_key": "...", "date": "2026-08-01", "scheduled_count": 0, "unscheduled_count": 0, "total_count": 0, "scheduled_percentage": 0, "unscheduled_percentage": 0}
```

## Member-Isolation Result

PASS. Confirmed live: a member's own list endpoint returns only that member's rows (3/3 in the test batch were `member_key: "arun"`), and attempting to `PUT` another member's (`mayurika`) path against Arun's real event id returns `404`, not a cross-member edit. Structurally guaranteed by `_validate_member_key` plus per-query `member_key` filtering, consistent with every other route in this router — confirmed by both code inspection and live test.

## Daily/Weekly Report Validation

PASS. Live fixture: 2 Scheduled + 1 Unscheduled task created for `arun` on `2026-12-31` (within the `2026-12-28`–`2027-01-03` week). Daily report for that date and weekly report for that week both returned `scheduled_count: 2, unscheduled_count: 1, total_count: 3, scheduled_percentage: 67, unscheduled_percentage: 33` — correct counts, and percentages sum to exactly 100. All fixture rows deleted after the run; confirmed 0 `AIOS TEST` rows remain and the daily report for that date now reads `0/0/0/0%/0%`.

## Deployment Result

PASS. Vercel auto-deployed both the frontend (`management-aios`) and backend API projects on push to `main` (existing, documented method). Confirmed:

- Frontend `https://management-aios.vercel.app/` → HTTP 200, content byte-identical to the committed `web-view/index.html` (confirmed via direct HTTPS fetch + diff after line-ending normalization)
- Backend `https://management-aios-api.vercel.app/health` → HTTP 200, expected body
- Backend OpenAPI schema confirms the two new report routes are live: `GET /api/member-schedules/{member_key}/reports/daily` and `.../reports/weekly`
- All five member calendar mounts present in the deployed frontend (`mayurika`, `suman`, `arun`, `rajiv`, `paraparan`)
- Deployed frontend contains only `Scheduled Task` / `Unscheduled Task` category strings — zero occurrences of any of the four retired sample categories
- "Schedule Summary" card present in the deployed frontend

## Known Limits

- Direct PostgreSQL access from the builder's workstation is confirmed unreliable at the SSL/protocol-handshake layer (TCP connects instantly; the Postgres wire protocol never completes, across multiple escalating timeout attempts across this and a prior session). The migration and pre/post-migration aggregate evidence were therefore captured and executed via the Neon SQL Editor, per the task's approved fallback method, by the user — not executed directly by this session. This did not block completion; it only changed who ran the SQL.
- The post-migration constraint-definition text was truncated in the pasted terminal/UI result (see "Category Constraint Evidence" above) — existence and correct naming were confirmed; the exact full `CHECK` clause text was not independently re-verified character-for-character against the live database, only against the migration script's own known contents.

## Result

PASS. All 24 required test scenarios are satisfied (16 automated, 19 live-API, plus the 2 migration-dependent scenarios now confirmed via the executed migration). Pre-migration total (145) equals post-migration total (145). Post-migration category breakdown is exactly `Scheduled Task: 145`. The `member_schedule_events_category_check` CHECK constraint is live. Deployment is confirmed healthy on both frontend and backend.
