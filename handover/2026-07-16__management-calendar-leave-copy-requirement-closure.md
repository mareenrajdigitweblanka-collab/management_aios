---
name: management-calendar-leave-copy-requirement-closure
type: handover-closure
created: 2026-07-16
created-by: Mareenraj (builder)
requirement-id: REQ-LEAVE-COPY-001
status: PASS — requirement and design documented; leave-system deduction minutes confirmed (270/270/540, mirrors official leave system); actual office break (12:45–13:30) recorded as a separate concept; no implementation performed
---

# Handover Closure — Management Calendar Leave Coordination Copy Requirement — 2026-07-16

**Closure date:** 2026-07-16 (original pass), corrected 2026-07-16 (same-day correction pass — leave-time interpretation)

## Requirement

Produce the formal written requirement and design contract for a calendar-managed leave coordination-copy feature (`management_aios.member_leave_records`), covering the 5 existing calendar members, 5 leave types, 4-status lifecycle, short-leave monthly cap, half/full/multi-day configuration handling, Approved-leave task-conflict blocking, and additive expected-hours reporting — as a documentation-only pass. No backend code, no migration, no frontend change was authorized or performed in this pass.

## Correction Pass (2026-07-16)

A same-day correction was applied to the requirement and design documents to record confirmed leave-time values and to distinguish two previously-conflated concepts:

- **Actual company office break** — `ACTUAL_OFFICE_BREAK_START=12:45`, `ACTUAL_OFFICE_BREAK_END=13:30` — a physical-schedule fact, recorded as its own concept (requirement §6.2, design §7.1).
- **Official leave-system periods** — First Half 08:30–13:00, Second Half 13:30–18:00, Full-Day 08:30–18:00 — mirrored from the separate official HR leave system, **not** recalculated from the actual break duration (requirement §6.1, design §7.1).
- **Leave-deduction minutes**, now confirmed: `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES=270`, `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES=270`, `LEAVE_FULL_DAY_DEDUCTION_MINUTES=540`. These resolve the three previously-open numeric configuration items and are explicitly labeled as leave-system credited minutes, not verified actual productive working time.

No backend, database, or frontend file was touched in this correction pass, consistent with the original pass.

## Files Created

- `docs/2026-07-16_management-calendar-leave-copy-requirement.md` — requirement document, REQ-LEAVE-COPY-001.
- `docs/management-calendar-leave-copy-design.md` — companion design document.
- `validation/management-calendar-leave-copy-requirement-readiness-check-2026-07-16.md` — readiness check confirming the 85% specification threshold, 0 open architecture questions, 3 open numeric values.
- `handover/2026-07-16__management-calendar-leave-copy-requirement-closure.md` — this file.

**Folder-path deviation:** the instructing task named `01_REQUIREMENTS/` and `04_DESIGN/`, neither of which exists in this repository. The closest established precedent is `docs/` (already used for the prior calendar-subsystem design document, `docs/member-dashboard-schedule-api-plan-2026-07-09.md`); both new documents were placed there instead. `validation/` and `handover/` already existed and were used as instructed.

## Files Confirmed Unchanged

`backend/models.py`, `backend/schemas.py`, `backend/config.py`, `backend/main.py`, `backend/routers/member_schedules.py`, `database/member_schedule_events_schema.sql`, `database/migrations/`, `backend/tests/`, `web-view/index.html`. `member-aios/mayurika-hr/staff-data/` was not accessed at any point in this session.

## Validation Path

`validation/management-calendar-leave-copy-requirement-readiness-check-2026-07-16.md`

## Requirement ID

`REQ-LEAVE-COPY-001`

## Scope Summary

- 5 members: mayurika, suman, arun, rajiv, paraparan (existing `member_key`/`member_label` roster, unchanged).
- 5 leave types: Short Leave, Half-Day First, Half-Day Second, Full-Day, Multi-Day.
- 4 statuses: Pending, Approved, Rejected, Cancelled — 4 allowed transitions, 3 explicitly disallowed.
- No authentication, no roles — matches the existing calendar's no-auth access model.
- Dedicated table `management_aios.member_leave_records`, additive to the schema, no change to `member_schedule_events`.

## Open Items

All three numeric configuration values are now resolved (see Correction Pass above):

1. ~~`LEAVE_HALF_DAY_FIRST_EXPECTED_MINUTES`~~ — resolved as `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES = 270`.
2. ~~`LEAVE_HALF_DAY_SECOND_EXPECTED_MINUTES`~~ — resolved as `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES = 270`.
3. ~~`LEAVE_FULL_DAY_EXPECTED_MINUTES`~~ — resolved as `LEAVE_FULL_DAY_DEDUCTION_MINUTES = 540`.

Remaining: reviewer sign-off (Arun, Mayurika — requirement §15) before implementation begins. No open architecture questions remain (storage model, multi-day representation, cap-enforcement transaction strategy, config-snapshot timing, and overlap-deduplication algorithm are all resolved in the design document).

## Compatibility Result

Existing Scheduled/Unscheduled task classification, duration calculation, percentage calculation, and previous-period comparison logic in `backend/routers/member_schedules.py` are unmodified and unreferenced for write access by this requirement — confirmed by direct inspection, not merely asserted. The requirement's reporting section is explicitly additive-only.

## Implementation Result

**None performed.** No backend route, model, schema, config value, migration, or frontend markup/script was added or changed. This closure covers documentation only.

## Deployment Result

Not applicable — no deployable artifact was produced.

## Commit Hash

See final report below (recorded after commit).

## Queryability Result

All four files are LLM-queryable Markdown with proper frontmatter, consistent with this repository's existing requirement/design/validation/handover conventions.

## Blocker Status

No technical blocker and no remaining numeric configuration gap — all three leave-deduction values are confirmed (270/270/540, mirroring the official leave system). Remaining step is reviewer sign-off only (CLAUDE.md §11.3 — 85%+ specification is met).

## Next Step

Route this document and the companion design document to Arun (Approved-conflict/KPI-adjacent reporting rules) and Mayurika (HR/leave-policy alignment) for reviewer sign-off before any implementation work begins.

## PASS / FAIL

**PASS.** Requirement and design documents drafted, corrected, and internally consistent; readiness check confirms the 85%+ specification threshold with 0 open numeric values and 0 open architecture questions; the actual office break (12:45–13:30) is correctly recorded as distinct from the mirrored official leave-system periods and deduction minutes (270/270/540); no implementation of any kind was performed; no existing file was modified; the protected staff-data folder was not accessed.
