---
name: management-calendar-leave-copy-requirement
type: requirement-document
created: 2026-07-16
created-by: Mareenraj (builder)
status: DRAFT — NOT IMPLEMENTED — leave-system time periods and deduction minutes confirmed (mirrors official leave system); awaiting reviewer sign-off
requirement-id: REQ-LEAVE-COPY-001
---

# Requirement — Management Calendar Leave Coordination Copy (2026-07-16)

**This is a requirement document only. No backend code, no SQL migration files, no changes to
`web-view/index.html` have been made as part of this document. Nothing in this document is
source-registered, verify-registered, or promoted to parent-AIOS truth.**

## Metadata (per CLAUDE.md §11.3 — Requirement Documentation Governance)

| Field | Value |
|---|---|
| Project Name | Management Calendar Leave Coordination Copy |
| Start Date | 2026-07-16 |
| Expected Deadline | Not yet set — pending reviewer sign-off |
| User / Stakeholder | Mayurika (HR), Arun (Implementation/KPI), Suman (Recruitment), Rajiv (Admin Manager), Paraparan — the five calendar members; HR Lead Mayurika as primary AIOS operational owner |
| Company Value Contribution | Reduces onboarding/leave-recording inconsistency (one of the four core problem areas named in CLAUDE.md §1, SRC-VAR-001); improves task-conflict prevention and expected-hours reporting accuracy in the management calendar |
| MVP Submission Date | Not yet set |
| Project Owner | Mareenraj (builder), guidance from Varmen; Mayurika as ongoing operational owner post-handover |
| Status | Requirement drafted, ~95%+ specified — leave-system time periods and deduction minutes confirmed (mirrors official leave system, §6.1); actual office break also recorded (§6.2); reviewer sign-off still open (see §17) |

---

## 1. Purpose

Design a calendar-managed **leave coordination copy** feature inside the existing per-member schedule calendar (`web-view/index.html`, `backend/routers/member_schedules.py`), so that:

- Leave taken by the five calendar members is visible on the management calendar.
- Tasks are not silently double-booked against known leave.
- Expected working hours in schedule reports are reduced when leave is Approved.
- A history of leave coordination decisions (Pending/Approved/Rejected/Cancelled) is preserved.

## 2. Business Question

"How do we stop management-calendar tasks and reports from silently ignoring leave that HR already knows about, without turning this AIOS into a second HR leave system?"

## 3. Official-Truth Boundary

This is the single non-negotiable constraint governing every other section of this document:

- The **external HR leave system remains official**. This feature does not replace it.
- Every row this feature stores is a **calendar coordination copy**, not official HR leave truth.
- This feature does **not** calculate or claim: official leave balance, payroll, no-pay status, disciplinary status, or medical truth.
- No official HR approval authority is implied by an "Approved" status in this system — it is a coordination decision recorded on the calendar, not an HR-system approval.
- No synchronization with the official HR system is claimed or implemented.
- No historical leave notes are imported from the official HR system.
- No attachments (medical certificates, forms, etc.) are stored.
- Every UI surface, API response, and schema field description must carry this boundary explicitly (`coordination_copy_only = TRUE`, official-copy banner/disclaimer — see §9, §13).

## 4. In-Scope Members

Exactly the five existing calendar members, using the existing `member_key`/`member_label` ownership already defined in `backend/config.py` (`VALID_MEMBER_KEYS`, `MEMBER_LABELS`):

- `mayurika`
- `suman`
- `arun`
- `rajiv`
- `paraparan`

No employee number or general staff identifier is introduced. No member outside this roster is in scope.

## 5. Out-of-Scope Items

- Any change to the external/official HR leave system.
- Official leave balance calculation, payroll, no-pay determination, disciplinary action, or medical record-keeping.
- Authentication, sessions, or role-based authorization of any kind (see §11).
- Public-holiday calendar or public-holiday-aware leave calculation (explicitly deferred, §8.4).
- Overnight/multi-day task support for the existing `member_schedule_events` table (a separate, already-documented gap — `handover/2026-07-14__schedule-duration-reporting-closure.md`, "Future Overnight Feature" — not solved or touched by this requirement).
- Any change to `member_schedule_events`'s `category` values, CHECK constraints, or the existing `_task_duration_minutes`/`_aggregate_schedule_period`/`_duration_percentages`/`_duration_change` calculation functions.
- `member-aios/mayurika-hr/staff-data/` and any other staff-record/PDPA-governed data.

## 6. Leave Types

1. **Short Leave** — single date, `start_time`/`end_time` required.
2. **Half-Day Leave — First Half** — single date, no user-entered time; leave-system period and deduction minutes come from backend configuration (§6.1).
3. **Half-Day Leave — Second Half** — single date, same configuration-driven approach (§6.1).
4. **Full-Day Leave** — single date, no user-entered time; leave-deduction minutes come from backend configuration (§6.1).
5. **Multi-Day Leave** — `start_date`/`end_date` range; each included weekday behaves as Full-Day leave; Saturdays and Sundays excluded automatically.

### 6.1 Leave-System Time Periods (Mirrored, Not Locally Calculated)

The Management AIOS leave feature is a coordination copy and **mirrors** the separate official leave system's defined periods. These periods and their deduction minutes are **confirmed values**, not derived or recalculated from any internal AIOS observation of office activity:

| Leave type | Leave-system period | Configuration constant | Leave-deduction minutes |
|---|---|---|---|
| Half-Day — First Half | 08:30–13:00 | `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES` | 270 |
| Half-Day — Second Half | 13:30–18:00 | `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES` | 270 |
| Full-Day | 08:30–18:00 | `LEAVE_FULL_DAY_DEDUCTION_MINUTES` | 540 |

These values are **leave-system credited minutes** (recorded here as `effective_leave_minutes` once a record is Approved — §8.5, §10) — they represent what the official leave system attributes to a half-day or full-day absence. They must **not** be described or reasoned about as independently verified actual productive working time; see §6.2 for why the two concepts are separate.

### 6.2 Actual Office Break (Distinct From Leave-System Periods)

The actual company break is a separate, physical-schedule fact and is **not** the basis for any leave-deduction calculation in this feature:

| Constant | Value |
|---|---|
| `ACTUAL_OFFICE_BREAK_START` | 12:45 |
| `ACTUAL_OFFICE_BREAK_END` | 13:30 |

The leave-system's own period boundaries (First Half ending 13:00, Second Half starting 13:30) do **not** reflect the actual 45-minute office break duration — they are the official leave system's own definitions, adopted here for mirroring purposes only. Do not recalculate, adjust, or reconcile the 270/270/540 leave-deduction minutes using the actual 12:45–13:30 break window; the two concepts are tracked independently in this document.

## 7. Statuses and Transitions

**Statuses:** Pending, Approved, Rejected, Cancelled.

**Allowed transitions:**

| From | To | Allowed? |
|---|---|---|
| Pending | Approved | Yes |
| Pending | Rejected | Yes |
| Pending | Cancelled | Yes |
| Approved | Cancelled | Yes |

**Disallowed transitions (must return 422, require a new record instead of reopening):**

| From | To | Allowed? |
|---|---|---|
| Rejected | Pending | No |
| Cancelled | Pending | No |
| Approved | Rejected | No |

Rationale for the disallowed set: a rejection or cancellation is a completed coordination decision at a point in time; reopening it in place would erase the history it represents. An Approved record that must no longer stand is represented as **Approved → Cancelled**, not **Approved → Rejected** — this preserves the fact that it was once approved rather than rewriting history to say it was never approved.

No role enforcement applies to any transition (see §11) — any calendar user may perform any allowed transition.

## 8. Visibility, Cap, Configuration, and Conflict Rules

### 8.1 Normal Calendar Visibility

| Status | Normal calendar | History view |
|---|---|---|
| Pending | Visible | Visible |
| Approved | Visible | Visible |
| Rejected | Hidden | Visible |
| Cancelled | Hidden | Visible |

The normal `GET` endpoint must server-side filter out Rejected/Cancelled rows (not rely on client-side filtering) — matching the existing `member_schedules` list route's server-side `deleted_at IS NULL` filtering convention.

### 8.2 Short-Leave Rules

- Single date; `start_time` and `end_time` required; `end_time` must be later than `start_time`.
- Maximum 2 hours (120 minutes) per single request — **block save** if exceeded.
- Maximum 2 Approved hours per member per calendar month — **block approval** if exceeded.
- Only **Approved** records consume the monthly cap. Pending, Rejected, Cancelled, and soft-deleted records do not.
- No warning-only bypass anywhere in this rule; both blocks are hard, backend-authoritative.
- Cross-row monthly aggregation **must not** be represented as a database CHECK constraint (CHECK constraints cannot reference other rows) — application-level, transaction-safe validation is required (see design document §6 for the transaction strategy).
- Concurrent approval requests for the same member/month must serialize safely so the cap cannot be exceeded by a race condition.

### 8.3 Half-Day and Full-Day Rules

- Single date. Half-Day requires a First/Second Half selection; no user-entered start/end time for either Half-Day or Full-Day.
- The clock periods (First Half 08:30–13:00, Second Half 13:30–18:00, Full-Day 08:30–18:00) and their leave-deduction minutes mirror the separate official leave system (§6.1) — they are **not** derived from the actual office break (§6.2) and must never be recalculated using it.
- Leave-deduction minutes for both halves and for Full-Day come from **backend configuration only** — never a frontend-hardcoded value.
- A **Pending** record may be saved even if the relevant configuration value is missing.
- **Approval is blocked** until the required configuration value exists (see §8.5).

### 8.4 Multi-Day Rules

- One request row with `start_date`/`end_date`; `end_date >= start_date`.
- Saturdays and Sundays are excluded automatically from the leave-deduction calculation.
- Each included Monday–Friday date uses the configured Full-Day leave-deduction minutes (540 minutes, per §6.1) — one Full-Day-equivalent deduction per included weekday.
- **Public holidays receive no special handling in this phase** — this is an explicit, deferred scope boundary, not an oversight. No holiday calendar is introduced. A weekday that happens to be a public holiday is still treated as a normal working weekday for this feature's purposes until a future phase addresses it.
- Pending may be saved while Full-Day configuration is missing; approval is blocked until it exists.

### 8.5 Configuration Values — Confirmed (Mirrors Official Leave System)

The three configuration values are now confirmed. They are **not invented** by this document — they mirror the separate official leave system's own First Half / Second Half / Full-Day periods (§6.1), and are **not** derived, adjusted, or recalculated from the actual office break (§6.2):

| Configuration constant | Confirmed value |
|---|---|
| `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES` | 270 |
| `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES` | 270 |
| `LEAVE_FULL_DAY_DEDUCTION_MINUTES` | 540 |

**Terminology:** these are **leave deduction minutes** / **leave-system credited minutes**, stored per-record as `effective_leave_minutes` once Approved. They must not be described as verified actual productive working time or actual office minutes — they are the official leave system's own credited figures, mirrored here for coordination purposes only.

Requirements on these values:

- Exist only in the backend (e.g. `backend/config.py`, environment-variable-driven — same mechanism `DATABASE_URL`/`ALLOWED_ORIGINS` already use).
- Never duplicated as a frontend constant in `web-view/index.html`.
- Returned as API response metadata where useful, so the frontend can display the configured leave-deduction minutes without hardcoding a copy.
- **Snapshotted** as `effective_leave_minutes` on the leave record at the moment it becomes Approved, so a later configuration change never silently rewrites an already-Approved record's historical reporting contribution.

**Missing-configuration behavior (still applicable — e.g. if a value is later unset or a new leave type is added without configuration):** Pending save is permitted without the value; **approval is blocked with a clear configuration error** until the value exists. This is stricter than "store silently with zero deduction" — a silently-stored Approved record with an undetected zero deduction would misreport expected hours as unchanged when leave actually occurred, which directly contradicts this feature's purpose.

### 8.6 Pending Behavior

Pending leave:

- Is visible in the normal calendar.
- Does **not** consume the short-leave monthly cap.
- Does **not** reduce expected working hours.
- Does **not** block task saving (no hard conflict block).
- **May** produce a non-blocking warning indicator in the UI (e.g. "a pending leave request overlaps this task") — informational only, never save-blocking.

### 8.7 Approved Conflict Behavior

Approved leave **blocks** conflicting task saves. Conflict cases requiring a backend-authoritative check:

1. Timed task overlaps Approved Short Leave.
2. Task overlaps the Approved Half-Day leave-system period (First Half 08:30–13:00, or Second Half 13:30–18:00 — §6.1).
3. Any task occurs on an Approved Full-Day date.
4. Any task occurs on an included weekday of Approved Multi-Day leave.
5. An existing task is edited into a leave period.
6. A drag-and-drop move places a task into a leave period.
7. A resize extends a task into a leave period.

Backend response on conflict:

- HTTP 409.
- Error code `leave_conflict`.
- Human-readable message.
- Conflicting leave `id`, `leave_type`, `status`, `date`/`time` range.
- **Omit** `purpose` and any other unnecessary sensitive free text from the conflict response.

The backend must **never**, as a side effect of a conflict: auto-cancel the task, auto-reclassify the task's category, silently change the task's date/time, or otherwise bypass the existing category-immutability lock in `update_member_schedule_event`.

## 9. Reporting Rules

Existing task calculations (`_task_duration_minutes`, `_aggregate_schedule_period`, `_duration_percentages`, `_duration_change` in `backend/routers/member_schedules.py`) remain **unchanged** — this requirement is strictly additive on top of them.

- Approved leave never appears in the Scheduled count, the Unscheduled count, or task duration totals.
- Approved leave **reduces expected working minutes** by its leave-system credited minutes (`effective_leave_minutes`) — this is a credited-minutes deduction mirrored from the official leave system, not a measurement of actual observed productive time.
- Pending, Rejected, and Cancelled leave have **no** expected-hours impact.

**Proposed additive fields** (superposed on `DailyScheduleReportOut`/`WeeklyScheduleReportOut`/`MonthlyScheduleReportOut`):

- `base_expected_work_minutes`
- `approved_leave_minutes`
- `adjusted_expected_work_minutes`
- `task_coverage_percentage`

**Expected-hour deduction per leave type (leave-deduction minutes, not verified actual working time):**

| Leave type | Deduction basis | Minutes |
|---|---|---|
| Short Leave | Exact Approved request minutes | Up to 120 (request-specific) |
| Half-Day — First Half | Snapshotted `effective_leave_minutes` (§6.1) | 270 |
| Half-Day — Second Half | Snapshotted `effective_leave_minutes` (§6.1) | 270 |
| Full-Day | Snapshotted `effective_leave_minutes` (§6.1) | 540 |
| Multi-Day | 540 (configured Full-Day minutes) × count of included Monday–Friday dates that overlap the report's own date range | 540 per included weekday |

Overlapping/duplicate Approved leave records covering the same date must **not** double-deduct — the design document specifies a date-union deduplication safeguard (see design document §8).

## 10. Data Model (proposed — not created)

Table: `management_aios.member_leave_records` (new, additive; does not alter `member_schedule_events`).

| Field | Classification | Notes |
|---|---|---|
| `id` | Server-controlled | UUID PK |
| `member_key` | Required | CHECK against the 5-member roster |
| `member_label` | Required | Denormalized at write time |
| `leave_type` | Required | CHECK: Short/Half-First/Half-Second/Full-Day/Multi-Day |
| `half_day_period` | Conditional | Required only when `leave_type` is a half-day type; NULL otherwise |
| `start_date` | Required | Single date, or range start for Multi-Day |
| `end_date` | Required | Equal to `start_date` except Multi-Day; CHECK `end_date >= start_date` |
| `start_time` | Conditional | Required only for Short Leave |
| `end_time` | Conditional | Required only for Short Leave; CHECK `end_time > start_time` |
| `status` | Required | CHECK: Pending/Approved/Rejected/Cancelled |
| `purpose` | Optional | Free text, short cap; process-level only |
| `external_reference` | Optional | Free-text pointer to the official HR record; never validated or synced |
| `coordination_copy_only` | Server-controlled | Boolean, fixed `TRUE`, not client-settable |
| `policy_source_id` | Required | References SRC-POLICY-001 rather than duplicating leave-quantity policy text |
| `effective_leave_minutes` | Server-controlled | Snapshotted at the moment status becomes Approved; NULL until then |
| `created_by` | Optional | Unauthenticated free-text label |
| `updated_by` | Optional | Unauthenticated free-text label |
| `created_at` | Server-controlled | |
| `updated_at` | Server-controlled | |
| `deleted_at` | Server-controlled | Soft delete only; Cancelled is a status, not a delete — Cancelled rows remain queryable in history |

Explicitly excluded: any medical, payroll, disciplinary, or attachment field.

## 11. Security / Access Boundary

- No authentication.
- No role-based authorization.
- Any calendar user may create, edit, assign, approve, reject, or cancel any leave record for any of the five members.
- `created_by`/`updated_by`, if populated, are **unauthenticated free-text labels** and must never be presented anywhere as a verified identity.

## 12. API Contract (proposed — not implemented)

```
GET    /api/member-leave/{member_key}                       # normal view: Pending + Approved only
GET    /api/member-leave/{member_key}/history                # all four statuses
POST   /api/member-leave/{member_key}                        # create (status starts Pending)
PUT    /api/member-leave/{member_key}/{leave_id}              # edit fields and/or status transition
POST   /api/member-leave/{member_key}/{leave_id}/cancel       # cancel action (not DELETE — Cancelled stays queryable)
GET    /api/member-leave/{member_key}/summary                 # monthly cap usage + expected-hours contribution
```

Normal `GET` returns Pending and Approved only; `history` returns all four statuses. Full request/response field and conflict-check design is in the companion design document.

## 13. Frontend Contract (proposed — not implemented)

- "Create Leave" action beside the existing "Create Task" action, using one shared implementation across all five member calendar instances (same `.msc-instance` factory convention already used).
- Leave-specific form with fields conditional on `leave_type` (time fields only for Short Leave; half/period selector only for Half-Day; date range only for Multi-Day).
- Status action buttons rendered only for currently-valid transitions per §7.
- Month/Week/Day rendering: Short Leave and Half-Day render as time-grid blocks (non-draggable); Full-Day and Multi-Day render as all-day banners.
- Visually distinct from tasks — a new leave-status badge family, not reusing the existing `CATEGORY_CLASS`/Scheduled-Unscheduled styling.
- History view accessible per member instance.
- Persistent official-copy coordination banner/disclaimer on every leave surface.
- Conflict messages rendered from the 409 response body.
- Expected-hours report fields added to the existing shared `renderSummaryStats()` function.

## 14. Evidence Required

- This requirement document (85%+ specified per §17).
- Companion design document (`docs/management-calendar-leave-copy-design.md`).
- Validation readiness check confirming the specification threshold and open-items list.
- Handover closure recording that no implementation was performed.
- Prior to implementation: reviewer confirmation of the open items in §17, and the three configuration values.

## 15. Reviewers

Per CLAUDE.md §18 Reviewer Routing Rule:

| Domain | Reviewer |
|---|---|
| KPI/AXIOM/implementation/incident (Approved-conflict blocking policy owner) | Arun |
| HR/leave/staff records (config values, Pending-conflict policy owner) | Mayurika |
| Cross-domain/unresolved ownership | Relevant Management Team member; trainee documents any gap |
| Promotion to parent AIOS truth / v0.2 | Relevant Management Team/domain owner sign-off |

No Varmen approval is required for this ongoing work unless explicitly requested in a specific conversation turn.

## 16. Known Limitations

- Multi-day leave cannot reuse `member_schedule_events`'s single-`event_date`/TIME-only schema — this requirement's dedicated table sidesteps that gap but does not solve it for tasks; overnight-task support remains a separate, unaddressed prerequisite decision (per `handover/2026-07-14__schedule-duration-reporting-closure.md`).
- `external_reference` is free text only; there is no automatic reconciliation against the official HR system, and none is claimed.
- Public-holiday handling is deferred; a weekday that is a public holiday is treated as a normal working weekday in expected-minutes calculations until a future phase.
- No conflict check exists today for tasks against tasks (only leave-vs-task is in scope here) — pre-existing gap, unchanged by this requirement.

## 17. Open Items (must be resolved before implementation)

**Resolved since original draft (2026-07-16 correction pass):**

1. ~~`LEAVE_HALF_DAY_FIRST_EXPECTED_MINUTES`~~ — **confirmed as `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES = 270`**, mirroring the official leave system's First Half period 08:30–13:00 (§6.1). Not derived from the actual office break.
2. ~~`LEAVE_HALF_DAY_SECOND_EXPECTED_MINUTES`~~ — **confirmed as `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES = 270`**, mirroring the official leave system's Second Half period 13:30–18:00 (§6.1). Not derived from the actual office break.
3. ~~`LEAVE_FULL_DAY_EXPECTED_MINUTES`~~ — **confirmed as `LEAVE_FULL_DAY_DEDUCTION_MINUTES = 540`**, mirroring the official leave system's Full-Day period 08:30–18:00 (§6.1). Not derived from the actual office break.

**Remaining open item:**

4. **Pending-leave conflict policy** — this document specifies "Pending does not block task saving, may warn" (§8.6) as the recommended and now-confirmed interpretation for this requirement; if a future reviewer wants Pending to also block, that is a scope change to this document, not an ambiguity within it.

No open architecture question remains — the dedicated `member_leave_records` table, the status-transition set, the cap-consumption rule (Approved-only), and the missing-configuration behavior (block approval, allow Pending) are all settled by this document. **0 numeric configuration values remain open** — all three leave-deduction minute values are now confirmed (§6.1, §8.5).

## 18. Acceptance Criteria

1. A calendar user can create a Pending leave record of each of the 5 types for any of the 5 members without authentication.
2. Short Leave save is blocked when the single request exceeds 120 minutes; approval is blocked when the Approved monthly total for that member/month would exceed 120 minutes; Pending/Rejected/Cancelled/soft-deleted rows never count toward that total.
3. Half-Day/Full-Day/Multi-Day Pending records can be saved without the relevant configuration value present; approval of the same record is blocked with a clear configuration error until the value exists.
4. Rejected and Cancelled records are excluded from the normal calendar view and retrievable from the history view.
5. Only the four allowed status transitions succeed; all three disallowed transitions return an error and do not mutate status.
6. An Approved leave record blocks a conflicting task create, edit, drag, and resize, each returning HTTP 409 with error code `leave_conflict` and no automatic task mutation.
7. A Pending leave record never blocks a task save.
8. Approved leave reduces `adjusted_expected_work_minutes` in daily/weekly/monthly reports without altering existing Scheduled/Unscheduled counts, durations, or percentages.
9. Overlapping Approved leave records covering the same date do not double-deduct expected minutes.
10. No medical, payroll, disciplinary, or attachment field exists anywhere in the schema, API, or UI.
11. Every leave API response and UI surface carries the coordination-copy/official-truth-boundary disclaimer.

## 19. Numeric / Binary PASS-FAIL Rule

**PASS** requires all of the following to be true simultaneously:

- 0 open numeric configuration values remain (§17 items 1–3 are resolved: 270/270/540, mirroring the official leave-system periods — §6.1).
- 0 open architecture questions remain.
- All 11 acceptance criteria in §18 are testable as written (verified in the companion design document's test matrix) without requiring further clarification.
- No implementation artifact (backend code, migration, frontend change) exists as a result of this requirement's authoring.

**FAIL** if any acceptance criterion cannot be tested as written, if an architecture question remains open, if any document claims the confirmed leave-deduction minutes were calculated from the actual 12:45–13:30 office break rather than mirrored from the official leave system, or if any implementation file was created/modified during this requirement-authoring pass.

This requirement currently scores **PASS** against this rule (see validation readiness check for the detailed specification-percentage tally).

## 20. Next Step

All three leave-deduction configuration values are now confirmed (§6.1, §8.5) and require no further routing to HR. Route this document and the companion design document to Arun (KPI/reporting-adjacent rules) and Mayurika (HR/leave-policy alignment) for reviewer sign-off per §15. Implementation must not begin until that sign-off is recorded.
