---
name: management-calendar-leave-copy-requirement-readiness-check
type: validation
created: 2026-07-16
status: PASS — requirement + design documents drafted; leave-system time periods and deduction minutes confirmed (270/270/540, mirrors official leave system); actual office break (12:45–13:30) recorded as a separate concept; 0 numeric configuration values open; 0 architecture questions open; no implementation performed
source-boundary: docs/2026-07-16_management-calendar-leave-copy-requirement.md, docs/management-calendar-leave-copy-design.md — new documentation files only. backend/models.py, backend/schemas.py, backend/config.py, backend/main.py, backend/routers/member_schedules.py, database/, web-view/index.html — all read-confirmed unchanged, not touched.
root-truth: CLAUDE.md — canonical
requirement-id: REQ-LEAVE-COPY-001
---

# Management Calendar Leave Coordination Copy — Requirement Readiness Check — 2026-07-16

**Requirement:** Produce a formal, source-disciplined requirement and design contract for a calendar-managed leave coordination-copy feature, per CLAUDE.md §11.3 (85% specification rule before development may begin). This check validates that threshold and records what remains open. No implementation of any kind was performed as part of this check or the documents it validates.

**2026-07-16 correction pass:** the three previously-open numeric configuration values are now confirmed and documented in both source files. This check has been updated accordingly — see "Configuration Correction Confirmation" below.

---

## Configuration Correction Confirmation (2026-07-16)

The requirement and design documents previously left three configuration values open with no numeric value stated. This pass confirms and records:

| Item | Value |
|---|---|
| Actual company office break | `ACTUAL_OFFICE_BREAK_START=12:45`, `ACTUAL_OFFICE_BREAK_END=13:30` |
| Leave-system First Half period | 08:30–13:00 |
| Leave-system Second Half period | 13:30–18:00 |
| Leave-system Full-Day period | 08:30–18:00 |
| `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES` | 270 |
| `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES` | 270 |
| `LEAVE_FULL_DAY_DEDUCTION_MINUTES` | 540 |

**Verified in both source documents:**

- The actual office break (12:45–13:30) is documented as a distinct concept from the leave-system periods (requirement §6.2, design §7.1) — it is not used as the basis for any leave-deduction calculation.
- The leave-system First Half (08:30–13:00), Second Half (13:30–18:00), and Full-Day (08:30–18:00) periods are preserved exactly as the official leave system defines them (requirement §6.1, design §7.1) — they are **not** recalculated using the actual 45-minute break duration.
- The 270/270/540 deduction values are preserved and explicitly labeled as mirrored from the official leave system, not independently computed (requirement §6.1/§8.5, design §7.1/§8).
- No document in this feature's documentation set claims the 540-minute Full-Day value was calculated from, or is equivalent to, the actual office break duration. A targeted re-read of both files confirms no such statement exists anywhere in either document.
- Terminology check: both documents consistently use "leave deduction minutes" / "leave-system credited minutes" / `effective_leave_minutes`, and explicitly instruct against describing these values as verified actual productive working time (requirement §8.5, design §7.2).

## Folder-Path Note

The instructing task specified `01_REQUIREMENTS/` and `04_DESIGN/` as target folders. Neither exists in this repository. The closest established precedent is `docs/` (already holding `docs/member-dashboard-schedule-api-plan-2026-07-09.md`, a prior design-only document for this same calendar subsystem). Both new documents were placed there instead:

- `docs/2026-07-16_management-calendar-leave-copy-requirement.md`
- `docs/management-calendar-leave-copy-design.md`

`validation/` and `handover/` already exist and were used as instructed.

## 85%-Specification Tally (CLAUDE.md §11.3)

| Requirement area | Specified? |
|---|---|
| Purpose / business question | Yes |
| Official-truth boundary | Yes — explicit, itemized |
| In-scope members | Yes — 5 members, existing `member_key` roster |
| Out-of-scope items | Yes |
| Leave types (5) | Yes |
| Statuses (4) and transitions | Yes — allowed/disallowed both enumerated |
| Visibility rules (normal vs. history) | Yes |
| Short-leave cap rule + who consumes it | Yes — Approved-only, explicitly reasoned |
| Half/Full/Multi-day rules | Yes |
| Configuration placeholders | Yes — mechanism, behavior, and all 3 numeric values confirmed (270/270/540, mirrors official leave system) |
| Conflict rules (Approved blocks, Pending doesn't) | Yes |
| Reporting rules + additive fields | Yes |
| Data model | Yes — every field classified required/optional/conditional/server-controlled |
| API contract | Yes |
| Frontend contract | Yes |
| Security/access boundary | Yes — no-auth model explicit |
| Reviewers | Yes — routed per CLAUDE.md §18 |
| Known limitations | Yes |
| Acceptance criteria | Yes — 11 testable criteria |
| PASS/FAIL rule | Yes — numeric/binary, stated in requirement §19 |

**Tally: 19 of 19 areas fully specified** (configuration values confirmed in this pass). This exceeds the 85% threshold; the only remaining open item is reviewer sign-off (§15 of the requirement document), not a specification gap.

## Confirmed Behavioral Rules (spot-checked against the requirement and design documents)

- **Pending does not consume the short-leave monthly cap** — confirmed in requirement §8.2, design §6. Only `status = 'Approved'` rows are summed; Pending/Rejected/Cancelled/soft-deleted are excluded from every cap query.
- **Pending does not block task saving** — confirmed in requirement §8.6, design §10 (conflict query explicitly filters to Approved rows only; Pending rows are never queried by the conflict check).
- **Missing configuration blocks approval but permits a Pending save** — confirmed in requirement §8.3/§8.4/§8.5 and design §7 for all three configuration-dependent leave types (Half-Day First, Half-Day Second, Full-Day/Multi-Day).
- **Public holidays are explicitly deferred, not silently assumed** — confirmed in requirement §8.4/§16 and design §17 ("Multi-day + future holiday interaction"); no holiday calendar is introduced, and this is stated as a scope boundary rather than a gap.
- **No implementation work was performed** — confirmed by file-system check: only the two `docs/` files plus this validation file and its companion handover file were created; `backend/`, `database/`, and `web-view/index.html` are unmodified (see source-boundary above, and Step 3 confirmation below).

## Architecture-Question Closure Check

Per the instructing task, confirm zero unresolved architecture questions remain:

- Storage architecture: **resolved** — dedicated `member_leave_records` table (design §2/§3), not an extension of `member_schedule_events`.
- Multi-day representation: **resolved** — single row with `start_date`/`end_date`, weekday expansion computed on read (design §8/§9), not a parent+child model.
- Cap-enforcement mechanism: **resolved** — application-level transaction with row-locking, explicitly not a CHECK constraint (design §6).
- Config-value staleness: **resolved** — snapshot `effective_leave_minutes` at Approval time (design §7).
- Overlap/duplicate double-deduction: **resolved** — date-union deduplication algorithm (design §9).
- Status-transition set: **resolved** — 4 allowed, 3 explicitly disallowed with stated rationale (requirement §7).

**Result: 0 open architecture questions.**

## Numeric Open Items — Now Resolved (previously 3, now 0)

1. `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES = 270` — confirmed, mirrors leave-system First Half 08:30–13:00.
2. `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES = 270` — confirmed, mirrors leave-system Second Half 13:30–18:00.
3. `LEAVE_FULL_DAY_DEDUCTION_MINUTES = 540` — confirmed, mirrors leave-system Full-Day 08:30–18:00.

No value was invented — all three were supplied directly in this correction pass and mirror the separate official leave system's own periods, not any internal recalculation from the actual office break. Each remains documented as backend-only, environment-variable-driven, and snapshot-on-approval (requirement §8.5, design §7.2).

## Implementation-Boundary Confirmation

Confirmed via file listing at the time of this check: no file under `backend/`, `database/`, or `web-view/` was created or modified. `member-aios/mayurika-hr/staff-data/` was not accessed. No migration was created or executed. No PostgreSQL table was created. No existing task record was changed.

## PASS / FAIL

**PASS.** The requirement document meets the 85%+ specification threshold with 0 open numeric values and 0 open architecture questions; Pending-does-not-consume-cap, Pending-does-not-block-tasks, missing-config-blocks-approval-but-permits-Pending-save, and public-holiday deferral are all explicitly and correctly specified; the actual office break (12:45–13:30) is correctly documented as distinct from the mirrored leave-system periods and deduction minutes; no implementation work of any kind was performed while producing or correcting this documentation set.

## Next Step

Route this document and the companion design document to Arun (KPI/reporting-adjacent rules) and Mayurika (HR/leave-policy alignment) for reviewer sign-off per requirement document §15. Implementation must not begin until that sign-off is recorded.
