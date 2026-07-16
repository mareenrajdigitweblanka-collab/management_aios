---
name: management-calendar-leave-copy-implementation-closure
type: handover-closure
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: REQ-LEAVE-COPY-001
status: AMBER — implementation complete, tested (128/128), and committed; database migration not yet executed against the correct Management AIOS database; reviewer sign-off pending
---

# Handover Closure — Management Calendar Leave Coordination Copy Implementation — 2026-07-16

**Closure date:** 2026-07-16

## Requirement

Implement REQ-LEAVE-COPY-001 — a calendar-managed leave coordination copy for the five Management AIOS calendar members (mayurika, suman, arun, rajiv, paraparan), per the approved requirement/design documents dated 2026-07-16. Implementation was explicitly authorized to proceed ahead of formal Mayurika/Arun reviewer sign-off, per direct user instruction.

## Architecture

Dedicated table `management_aios.member_leave_records`, entirely separate from `management_aios.member_schedule_events` — no leave data lives inside the task table, and the existing task table's schema, CHECK constraints, and calculation functions (`classify_schedule_category`, `_task_duration_minutes`, `_aggregate_schedule_period`, `_duration_percentages`, `_duration_change`, category immutability) are unmodified. Leave logic (weekday expansion, cap validation, effective-minutes snapshotting, overlap-deduplicated reporting, conflict detection) lives in a new shared module, `backend/routers/leave_logic.py`, called from both the new `backend/routers/member_leave.py` router and the existing `backend/routers/member_schedules.py` router (for the conflict check and additive report fields only).

## Asset Paths

**New:**
- `backend/routers/leave_logic.py`
- `backend/routers/member_leave.py`
- `backend/tests/test_member_leave.py`
- `database/member_leave_records_schema.sql`
- `database/migrations/2026-07-16-create-member-leave-records.sql`
- `evidence/database/management-calendar-leave-copy-migration-execution-2026-07-16.md`
- `validation/management-calendar-leave-copy-implementation-check-2026-07-16.md`
- `handover/2026-07-16__management-calendar-leave-copy-implementation-closure.md` (this file)

**Modified (additive):**
- `backend/config.py`, `backend/models.py`, `backend/schemas.py`, `backend/routers/member_schedules.py`, `backend/main.py`, `web-view/index.html`

## Database Path

`database/migrations/2026-07-16-create-member-leave-records.sql` (companion: `database/member_leave_records_schema.sql`). **Not yet executed** — see Deployment Result and the dedicated database evidence file.

## API Routes

```
GET    /api/member-leave/{member_key}
GET    /api/member-leave/{member_key}/history
POST   /api/member-leave/{member_key}
PUT    /api/member-leave/{member_key}/{leave_id}
POST   /api/member-leave/{member_key}/{leave_id}/cancel
GET    /api/member-leave/{member_key}/summary
```
Mounted in `backend/main.py` alongside the pre-existing `member_schedules_router`/`staff_router`; CORS configuration unchanged.

## Frontend Behavior

Within the existing shared `mountScheduleCalendarInstance` factory (one instance per member, unchanged pattern): a new "Leave Coordination (Calendar Copy)" card with an official-truth banner, a leave-creation form (fields conditional on leave type), a Pending/Approved leave list with Approve/Reject/Cancel actions matching the allowed-transition set, and a lazy-loaded History view (all four statuses). Leave renders in Month view as distinct chips, in Week/Day view as all-day banners (Full-Day/Multi-Day) or non-interactive timed blocks (Short Leave/Half-Day) — never draggable or resizable, never reusing the task-category color classes. Task save conflicts (HTTP 409 from an Approved-leave overlap) surface as a clear status message via the existing `showApiStatus` mechanism. Schedule Summary gained four new, clearly-labeled leave-deduction reference rows without altering any existing Scheduled/Unscheduled figures.

## Configuration Values

| Constant | Value |
|---|---|
| `LEAVE_HALF_DAY_FIRST_START` / `_END` | 08:30 / 13:00 |
| `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES` | 270 |
| `LEAVE_HALF_DAY_SECOND_START` / `_END` | 13:30 / 18:00 |
| `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES` | 270 |
| `LEAVE_FULL_DAY_START` / `_END` | 08:30 / 18:00 |
| `LEAVE_FULL_DAY_DEDUCTION_MINUTES` | 540 |
| `ACTUAL_OFFICE_BREAK_START` / `_END` (informational only) | 12:45 / 13:30 |
| `SHORT_LEAVE_MAX_REQUEST_MINUTES` | 120 |
| `SHORT_LEAVE_MONTHLY_CAP_MINUTES` | 120 |

All defined once in `backend/config.py`; never duplicated as frontend constants (the frontend only displays values the backend already returned, plus the confirmed leave-system clock times as read-only informational label text).

## Rollback Steps

1. **Frontend**: revert the `web-view/index.html` commit (or remove the "Leave Coordination" card's `container.innerHTML` block and its associated JS functions) — this hides all leave UI without touching backend or database state.
2. **Router**: remove the two `member_leave_router` lines from `backend/main.py` (import + `app.include_router(...)`) to unmount the API surface entirely; the app still boots and every pre-existing route is unaffected.
3. **Conflict/report integration**: revert the additive changes in `backend/routers/member_schedules.py` (conflict check calls and `_leave_report_additions`) to stop leave from affecting task saves or reports; the underlying calculation functions were never touched, so this is a clean, isolated revert.
4. **Database**: **do not** auto-drop the table. If the table was applied and needs to be fully removed, the commented rollback in the migration file (`DROP TABLE IF EXISTS management_aios.member_leave_records;`) requires explicit deletion approval, since it destroys coordination-copy history that the approved requirement treats as worth preserving. The preferred rollback path is steps 1–3 (application-level disablement), leaving any applied table and its data intact.

## Deployment Result

**Not deployed.** Per the task's explicit AMBER path: this session confirmed the only reachable database connection (via the connected Postgres MCP server) is an **unrelated company database** — it has no `management_aios` schema and no `member_schedule_events` table, so the migration was correctly withheld rather than run against the wrong database. No live frontend/backend deployment or live URL check was performed as a result — deploying the frontend/backend code without the migration would surface a working UI against a 500-erroring API for every leave route, which is worse than not deploying. **Recommendation: do not deploy this commit's frontend/backend changes to production until the migration has been applied to the correct Management AIOS Neon database and re-validated per the follow-up checklist in the database evidence file.**

## Commit Hash

See final report (recorded after commit).

## Reviewer Sign-Off Follow-Up

Per direct user authorization, implementation proceeded without Mayurika (HR/leave-policy) or Arun (KPI/reporting-adjacent) sign-off. This remains an open governance follow-up:
1. Route `docs/2026-07-16_management-calendar-leave-copy-requirement.md` and `docs/management-calendar-leave-copy-design.md` (already existing, unmodified by this pass) plus this implementation closure to Mayurika and Arun for review.
2. Confirm the three leave-deduction minute values (270/270/540) and the Pending-does-not-block-tasks policy against actual HR/company practice, since the source documents recorded these as the builder's confirmed-but-provisional interpretation.
3. Record sign-off (or requested changes) in a follow-up evidence file before this feature is promoted beyond a coordination-copy draft.

## Blockers

1. **Database not deployed** — the correct Management AIOS Neon connection was not reachable from this workstation/session. This is the single blocker preventing PASS instead of AMBER.
2. No other technical blocker — all code, migration files, and tests are complete.

## One Next Step

Apply `database/migrations/2026-07-16-create-member-leave-records.sql` to the correct Management AIOS Neon database from an environment that can actually reach it (e.g. the Vercel-deployed backend's own deployment pipeline, or a workstation without the documented SSL-handshake limitation), run the six embedded validation queries, and record the results in a follow-up update to `evidence/database/management-calendar-leave-copy-migration-execution-2026-07-16.md` before considering this feature live.

## PASS / FAIL

**AMBER.** All code, schema/migration files, and tests (128/128 passing, 0 regressions) are complete, committed, and pushed. The feature is not yet deployed/live because the database migration could not be executed against the correct database in this session, and live browser/end-to-end validation could not be performed in this environment. No implementation work was skipped; the gap is entirely in this session's access to live infrastructure — see the validation and database evidence files for full detail.
