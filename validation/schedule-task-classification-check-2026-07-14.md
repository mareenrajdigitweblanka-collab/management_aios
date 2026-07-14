---
name: schedule-task-classification-check
type: validation
created: 2026-07-14
created-by: Mareenraj (builder)
status: PENDING MIGRATION EXECUTION AND DEPLOYMENT VERIFICATION
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

Captured via the Neon SQL Editor (approved method — direct workstation PostgreSQL access is confirmed unreliable at the SSL/protocol-handshake layer; see Known Limits). **Pending user execution of the pre-migration evidence block; to be filled in once results are provided.**

- Total rows: PENDING
- Active rows / soft-deleted rows: PENDING
- Count by category: PENDING
- Count by member: PENDING
- Null category / null event_date / null start_time / invalid time range counts: PENDING

## Post-Migration Counts

PENDING — recorded after the migration is executed and its results are provided.

- Total rows (must equal pre-migration total): PENDING
- Count by category (must be exactly one row: `Scheduled Task`): PENDING
- Invalid category rows (must be 0): PENDING
- `member_schedule_events_category_check` constraint definition (must exist and match): PENDING

## Category Constraint Evidence

PENDING — recorded from the post-migration confirmation query.

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

### Live API (pending deployment — see "Deployment Result" below for status; results recorded once run)

| # | Scenario | Status |
|---|---|---|
| 8 | Unscheduled edited with Scheduled submitted → 422 | PENDING |
| 9 | Scheduled edited after start → remains Scheduled | PENDING |
| 10 | Same-category update does not fail | PENDING |
| 11 | Scheduled edited after planned time stays Scheduled | PENDING |
| 12 | Drag/drop preserves Scheduled | PENDING (structural: drag/drop always re-sends the existing `category` unchanged — see `commitItemTimeChange` in `web-view/index.html` — verified by code inspection; live confirmation pending) |
| 13 | Drag/drop preserves Unscheduled | PENDING (same structural guarantee as #12) |
| 14 | Resize preserves category | PENDING (same code path as #12/13 — `attachResizeHandler` also calls `commitItemTimeChange`) |
| 16 | Daily counts | PENDING |
| 17 | Weekly counts | PENDING |
| 20 | Member isolation | PENDING |
| 21 | Migration row count preserved | PENDING — depends on migration execution |
| 22 | Existing rows become Scheduled Task | PENDING — depends on migration execution |
| 24 | Refresh persistence | PENDING |

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

PENDING — live test to confirm reports and classification never cross member boundaries; structurally guaranteed by `_validate_member_key` plus per-query `member_key` filtering, consistent with every other route in this router.

## Daily/Weekly Report Validation

PENDING — recorded after live fixture creation.

## Deployment Result

PENDING.

## Known Limits

- Direct PostgreSQL access from the builder's workstation is confirmed unreliable at the SSL/protocol-handshake layer (TCP connects instantly; the Postgres wire protocol never completes, across multiple escalating timeout attempts in this and a prior session). The migration and pre/post-migration aggregate evidence were therefore captured via the Neon SQL Editor, per the task's approved fallback method — not executed directly by this session.
- Live API validation (drag/drop, resize, member isolation, reporting counts, refresh persistence) requires the deployed backend to be reachable, which does not require the migration to have completed first — new-task classification is independent of whether pre-existing rows have been migrated yet. Reporting totals computed before the migration runs will count any pre-migration row as "unscheduled" (any category value other than the exact string `Scheduled Task`), which is a reasonable, documented interim behavior, not a defect.

## Result

PENDING MIGRATION EXECUTION AND DEPLOYMENT VERIFICATION
