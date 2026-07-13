---
name: staff-data-api-check
type: validation
created: 2026-07-13
status: PASS — code-level verification and live production query tests both complete
source-boundary: backend/routers/staff.py, backend/schemas.py, backend/models.py
root-truth: CLAUDE.md — canonical
---

# Staff Data API — Check — 2026-07-13

**Task type:** Read-only Staff API implementation and verification.
**Task boundary:** No write endpoint; no salary/address/email/phone/guardian field ever returned; no full database dump; HR remains the authoritative source.

---

## Endpoint List

Confirmed via the FastAPI app's generated OpenAPI schema (`app.openapi()`), not assumed:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/staff` | List staff records with server-side filtering (`team`, `staff_status`, `employment_stage` — repeatable, `search`), pagination (`limit`, `offset`), deterministic ordering |
| GET | `/api/staff/summary` | Aggregate counts only: total, active, inactive, ph, permanent, probation, training_7_day, verify |
| GET | `/api/staff/filter-options` | Distinct `team`/`staff_status`/`employment_stage` values currently present, for populating filter dropdowns from real data |

No other path exists under `/api/staff` — confirmed no accidental `{id}`-style route, no `POST`/`PUT`/`DELETE` registered anywhere in `backend/routers/staff.py`.

Existing `/api/member-schedules/*` routes are unchanged — Staff records were not added to the schedule API, and the schedule API's routes still show exactly their pre-existing shape (verified via the same `app.openapi()` inspection used in the Paraparan task).

---

## Code-Level Verification (No DB Required)

| Check | Result |
|---|---|
| `python -m py_compile` on all backend files including the new `staff.py` | PASS |
| `backend.main:app` imports cleanly with the staff router included | PASS |
| `app.openapi()` shows the 3 expected `/api/staff*` paths, all GET-only | PASS |
| `StaffRecordOut` (response schema) declares only the 16 approved fields | PASS — verified by reading `backend/schemas.py`; no salary/address/email/phone/guardian field is declared |
| `StaffDashboardRecord` (ORM model) has no salary/address/email/phone/guardian column | PASS — verified by reading `backend/models.py`; the strongest guarantee, since a field that doesn't exist on the model cannot be returned regardless of schema-layer mistakes |
| Read-only result | PASS — router has no `db.add`/`db.commit`/`db.delete` call anywhere; every function only builds and executes `SELECT`-shaped SQLAlchemy queries |
| No full database dump in logs | PASS by construction — the router never logs query results; the only console output anywhere in this feature is the import script's counts-only summary (a separate, offline process) |

---

## Pagination

**Implemented, not yet live-tested.** `limit` (default 50, max 500, `ge=1`) and `offset` (default 0, `ge=0`) are FastAPI `Query` parameters with built-in validation (an out-of-range value returns `422` automatically, before any handler code runs). `StaffListResponse.total` reports the true total matching row count independent of `limit`/`offset`, computed via a separate `count()` query on the same filtered query object (not `len(rows)`), so pagination and the displayed total stay consistent even when only one page is fetched.

---

## Team Filter

**Implemented, not yet live-tested.** `team` query parameter maps directly to `WHERE department_team = :team` (exact match, no partial matching — matches the frontend's dropdown-driven selection model, populated from `/api/staff/filter-options`, not free text).

---

## Active/Inactive Filter

**Implemented, not yet live-tested.** `staff_status` query parameter validated against `VALID_STAFF_STATUSES = ("Active", "Inactive")` (`backend/config.py`) — any other value returns `422` with a clear message rather than silently matching nothing.

---

## Employment-Stage Filter

**Implemented, not yet live-tested.** `employment_stage` accepts **repeated** query parameters (`?employment_stage=Probation&employment_stage=training_7_day&employment_stage=[VERIFY]`), each validated against `VALID_EMPLOYMENT_STAGES = ("Permanent", "Probation", "training_7_day", "[VERIFY]")` — this is what lets the Onboarding Staff Process subtab express its 3-value base classification as genuine server-side filtering, not a client-side fetch-then-filter workaround.

---

## PH Count

**Implemented, not yet live-tested.** `/api/staff/summary`'s `ph` field counts `WHERE department_team = 'PH'`. Expected value once imported: **42** (per `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md` §5 — evidence-backed PH normalization, unchanged by this task).

---

## Excluded-Field Response Scan

**PASS, by construction — not just by testing.** `StaffRecordOut` (the only schema any `/api/staff*` endpoint returns) has exactly 16 declared fields, none of which is `salary`/`home_address`/`personal_email`/`personal_phone`/`contact_number`/`guardian_phone`/`guardian_number`. Since `StaffDashboardRecord` (the ORM model `StaffRecordOut.model_validate()` reads from) also has no such column, there is no code path — intentional or accidental — by which any of the 7 excluded fields could appear in an API response. This was verified by direct reading of both files, not by pattern-matching a live response (which is still pending — see below).

---

## Read-Only Result

**Confirmed.** No `POST`/`PUT`/`DELETE`/`PATCH` route exists under `/api/staff`. This is a hard architectural guarantee (no such route is registered on the `APIRouter`), not a policy note — there is no code path that could write to `staff_dashboard_records` through this API in this phase, by design, matching the task's explicit "no write endpoints in this phase" instruction.

---

## Credential Exposure

**NONE.** `DATABASE_URL` is never printed or logged by `backend/routers/staff.py` or any file touched in this task.

---

## Live Query Tests — Resolved (2026-07-13)

Migration applied and import completed (see `validation/staff-data-database-import-check-2026-07-13.md`). The code was then committed, pushed (`42bf2e3..dc9fd5c`), and deployed — **an explicit user decision, recorded in `member-aios/staff-data/README.md` §9c as an accepted technical-pilot risk**, since the deployed API still has no authentication layer. Deployment confirmed live: `GET /health`-equivalent (`/api/staff/summary`) returned `200` within ~75s of push.

All tests below were run against the live production API (`https://management-aios-api.vercel.app/api/staff*`) from this sandbox — reachable because this is a standard HTTPS request, not a direct Postgres connection (the restriction that blocked the import script only applies to raw PostgreSQL-protocol traffic).

| # | Test | Result |
|---|---|---|
| 1 | `GET /api/staff` with pagination (`limit=5`, then `offset=5`) | PASS — `total: 310` on both pages, 5 records returned each time, `filters` object correctly echoed |
| 2 | `GET /api/staff?staff_status=Active` | PASS — `total: 142` |
| 2b | `GET /api/staff?staff_status=Inactive` | PASS — `total: 168` (142+168=310, full partition) |
| 3 | `GET /api/staff?team=PH` | PASS — `total: 42` |
| 4 | `GET /api/staff?employment_stage=[VERIFY]` | PASS — `total: 310` |
| 5 | `GET /api/staff?search=Executive` | PASS — `total: 182` (real substring match across name/designation fields) |
| 5b | `GET /api/staff?search=<nonsense term>` | PASS — `total: 0` |
| 6 | `GET /api/staff?employment_stage=Probation&employment_stage=training_7_day&employment_stage=[VERIFY]` (repeated-param multi-value, the Onboarding tab's exact base filter) | PASS — `total: 310`, `filters.employment_stage` echoed as `['Probation', 'training_7_day', '[VERIFY]']` — confirms genuine server-side OR-filtering across 3 values, not a client-side workaround |
| 7 | `GET /api/staff?staff_status=NotARealStatus` | PASS — `422 {"detail":"staff_status must be one of ('Active', 'Inactive')."}` |
| 7b | `GET /api/staff?employment_stage=NotARealStage` | PASS — `422 {"detail":"employment_stage must be one of (...)."}` |
| 8 | Excluded-field scan of a real 50-record response body | PASS — **zero** of the 7 excluded field names present; response keys are exactly the 16 approved fields |
| 9 | `GET /api/staff/filter-options` | PASS — `staff_statuses: ["Active", "Inactive"]`, `employment_stages: ["[VERIFY]"]` (both exactly matching the confirmed data state); `teams` returns ~80 distinct raw values including `"PH"` — expected, since only the PH group has been normalized (per `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md` §5–§6, "normalize conservatively") |
| 10 | Duplicate `employee_number` preservation, via a full 310-record fetch | PASS — 5 distinct values with count > 1, 11 rows total, distribution `[2, 2, 2, 2, 3]` — matches the known source condition exactly |

**Verdict: PASS.** Every live test matches its expected value exactly, including the two deliberately-invalid-filter tests correctly returning `422` rather than silently succeeding or 500ing.
