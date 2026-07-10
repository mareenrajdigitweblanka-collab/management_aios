---
name: member-dashboard-schedule-api-runtime-test
type: validation
created: 2026-07-09
created-by: Mareenraj (builder)
status: PASS — with 2 code fixes applied during testing
---

# Runtime Test — Member Schedule API Against Local PostgreSQL (2026-07-09)

**Test date:** 2026-07-09
**Branch:** `individual-aios`
**Commit tested (starting point):** `cd2b546` — "Add member schedule API backend draft"
(Two files were fixed during this test and remain locally modified/uncommitted — see §"Files Touched".)

---

## Files Touched

| File | Change | Reason |
|---|---|---|
| `backend/config.py` | Added `from dotenv import load_dotenv; load_dotenv()` before reading `os.environ.get("DATABASE_URL")` | Runtime bug: the server process never actually loaded `.env`, so every request failed with `RuntimeError: DATABASE_URL environment variable is not set` even though `.env` existed locally. |
| `backend/schemas.py` | Renamed imported `date`/`time` types to `date_type`/`time_type` throughout | Runtime bug: `MemberScheduleEventOut` declared a field literally named `date` typed as the `date` class combined with `Field(...)`, which Pydantic v2 could not resolve (`PydanticUserError: ... field name clashing with a type annotation`), breaking `import backend.main` entirely. |

**Not touched:** `web-view/index.html`, `CLAUDE.md`, `evidence/source-register.md`, `context/verify-register.md`, any deployment file. No `.env` file was created, edited, or displayed by Claude — the user created it themselves locally before testing began, per the safety rules for this task.

Both fixes were necessary for the backend to run at all — without them, no endpoint was reachable. They are functional bug fixes uncovered by this being the first real runtime execution (the prior `py_compile` pass only checked syntax, not Pydantic model construction or environment loading).

---

## Credential Handling Result (Redacted)

- `.env` confirmed to exist locally, confirmed git-ignored (`git check-ignore -v .env` → matched `.gitignore:1:.env`).
- `git status --short` never showed `.env` at any point during this session.
- `DATABASE_URL` was loaded programmatically and its value was **never printed**. Only its connection scheme was echoed for confirmation purposes: `postgresql+psycopg`.
- No host, port, username, password, or database name from the real `.env` appears anywhere in this file, in any command output shown to the user, or in any other tracked file.

**Result: PASS — no credential exposure.**

---

## Schema Execution Result

Applied `database/member_schedule_events_schema.sql` against the local PostgreSQL instance using SQLAlchemy (`engine.connect()` + statement-by-statement `execute`, since no `psql` CLI was available in this environment).

**Result: `SCHEMA_APPLIED_OK`** — schema, table, constraints, and both indexes created successfully with no errors.

---

## FastAPI Startup Result

- First startup attempt (before `backend/config.py` fix): server started, but every DB-touching request failed with `RuntimeError: DATABASE_URL environment variable is not set`.
- After fix: server started cleanly —
  ```
  INFO:     Started server process [...]
  INFO:     Waiting for application startup.
  INFO:     Application startup complete.
  INFO:     Uvicorn running on http://127.0.0.1:8000
  ```
- Server was shut down cleanly at the end of testing (`taskkill` on the uvicorn process PID; confirmed unreachable afterward with `curl` returning connection-refused).

**Result: PASS (after fix).**

---

## Endpoint Test Results

| # | Test | Result |
|---|---|---|
| 1 | `GET /health` | `200` — `{"status":"ok","service":"management-aios-member-schedules"}` |
| 2 | `POST /api/member-schedules/mayurika` (valid) | `201` — event created with server-generated UUID; `source_scope="dashboard_testing"`, `is_official_truth=false` forced correctly regardless of request body |
| 3 | `GET /api/member-schedules/mayurika` | `200` — returned the one active event, correctly shaped |
| 4 | `PUT /api/member-schedules/mayurika/{event_id}` (partial update: title only) | `200` — title updated, all other fields unchanged, `updated_at` bumped |
| 5 | `DELETE /api/member-schedules/mayurika/{event_id}` | `200` — `{"id":"...","deleted":true}`; confirmed event no longer appears in subsequent `GET` list (soft-delete via `deleted_at`, not a hard delete) |
| 6 | `POST /api/member-schedules/arun` ×2 | `201` ×2 — two events created |
| 7 | `DELETE /api/member-schedules/arun/clear-testing-data` | `200` — `{"member_key":"arun","cleared_count":2}`; confirmed both cleared, subsequent `GET` list empty |

All 7 positive-path tests passed. Route ordering was also implicitly confirmed correct: `clear-testing-data` was matched as the literal path segment, not misrouted into the `{event_id}` UUID-typed route.

---

## Error-Case Test Results

| # | Test | Expected | Actual |
|---|---|---|---|
| 8 | `GET /api/member-schedules/not-a-real-member` | Validation/lookup error | `404` — `{"detail":"Unknown member_key 'not-a-real-member'. Must be one of ('mayurika', 'suman', 'arun', 'rajiv')."}` |
| 9 | `POST .../mayurika` with `"priority":"Urgent"` | Validation error | `422` — Pydantic `value_error`: "priority must be one of ('High', 'Medium', 'Low')" |
| 10 | `POST .../mayurika` with `start=10:00`, `end=09:00` | Validation error | `422` — Pydantic `value_error`: "end must be greater than start when both are provided" |

All 3 error-case tests passed as expected.

---

## Testing/Demo Truth Boundary

Confirmed at runtime, not just in code review:

- Every event created via `POST` in this test run came back with `"source_scope":"dashboard_testing"` and `"is_official_truth":false` — verified in the actual JSON response bodies for both the mayurika and arun test rows, even though neither field was present in any request body.
- `clear-testing-data` only removed the `dashboard_testing`/non-official rows created during this test (`cleared_count: 2` for arun, exactly matching the two rows created) — no mechanism exists in this draft to create or clear `pilot`/`approved_live` rows.
- All test data created during this run (mayurika: 1 row, created then soft-deleted; arun: 2 rows, created then soft-deleted via clear-testing-data) has been cleaned up. `GET` lists for mayurika, suman, and rajiv all returned `[]` at the end of this session.
- GAP-40 and GAP-44 were not referenced, resolved, or affected by this runtime test.

---

## Parent-Truth Risk

- This test exercised only the API layer against a local, non-production PostgreSQL instance. No official HR/Admin file, `evidence/source-register.md`, `context/verify-register.md`, or `CLAUDE.md` was read from or written to.
- No data created during this test is intended to persist as meaningful content — all rows were test fixtures, created and then deleted within the same session.
- SRC-ADMIN-001 was not touched; Rajiv's endpoint (`/api/member-schedules/rajiv`) was checked only for an empty list, not exercised with create/update, and remains untouched by any data.
- Risk unchanged from prior review: the guardrail columns (`source_scope`, `is_official_truth`) are now runtime-confirmed to behave as designed, which is a positive finding for keeping this data out of official-truth status.

---

## Git Status

Before starting: clean (matched pushed commit `cd2b546`, `git status --short` had no output).

After testing (reflecting the two necessary bug fixes):
```
 M backend/config.py
 M backend/schemas.py
```

No `.env`, no `__pycache__`, no other file appears in git status.

---

## Commit/Push Status

**NONE.** No `git add`, `git commit`, or `git push` command was run as part of this task. The two modified files (`backend/config.py`, `backend/schemas.py`) remain uncommitted local working-tree changes, pending a separate explicit commit decision.

---

## Overall Result

**PASS** — the backend runs correctly against a real local PostgreSQL database once two runtime-only bugs (missing `.env` loading, a Pydantic field/type name clash) were fixed. All 7 positive-path endpoint tests and all 3 error-case tests behaved exactly as specified. Testing/demo truth boundary enforcement was confirmed live, not just by static code review. No credentials were exposed at any point. `web-view/index.html` and all protected governance files were untouched.

**Follow-up required before next commit:** the two bug-fix diffs in `backend/config.py` and `backend/schemas.py` should be reviewed and explicitly committed as their own change (e.g. "Fix .env loading and Pydantic field/type name clash in member schedule API"), separate from the original backend draft commit, since they are correctness fixes discovered by this runtime test rather than part of the original design.
