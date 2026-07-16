---
name: management-calendar-leave-copy-requirement
type: requirement-document
created: 2026-07-16
created-by: Mareenraj (builder)
status: IMPLEMENTED — approval/status workflow removed 2026-07-16 (SIMPLIFICATION AMENDMENT, user decision); see §0
requirement-id: REQ-LEAVE-COPY-001
---

# Requirement — Management Calendar Leave Coordination Copy (2026-07-16)

**This document was originally authored as a requirement-only draft, then implemented (backend, schema, and frontend), and has since been amended by an explicit user decision to remove the approval/status workflow described in the original §7–§9/§12/§13. §0 below is the current, authoritative lifecycle description. Sections below it are preserved for historical record but must be read through the §0 amendment — do not treat any "Pending/Approved/Rejected/Cancelled" language in the sections below as current behavior.**

## 0. SIMPLIFICATION AMENDMENT (2026-07-16) — Current Authoritative Lifecycle

**User decision:** the calendar leave-copy feature must not have an approval/status workflow. This amendment supersedes every Pending/Approved/Rejected/Cancelled reference in this document (originally §7, §8.1, §8.2, §8.3, §8.4, §8.5, §8.6, §8.7, §9, §10 `status` row, §11, §12, §13, §18).

**New authoritative rule:** every saved leave record is immediately **active**.

- An active record appears immediately in the calendar, immediately blocks conflicting task saves, and immediately contributes leave-deduction minutes.
- It remains active until deleted.
- Removal is a single **Delete Leave** action (`DELETE /api/member-leave/{member_key}/{leave_id}`), which soft-deletes the row (`deleted_at` populated). A deleted record is excluded from the normal view, no longer blocks tasks, and no longer contributes to reporting.
- There is no replacement active/inactive/status enum. The row's existence with `deleted_at IS NULL` **is** its active state.
- The official-truth boundary (§3) is unchanged by this amendment: the separate HR leave system remains official; this feature still stores only a calendar coordination copy; no approval authority, balance, payroll, no-pay, disciplinary, or medical claim is made or was ever made by the removed "Approved" wording — an "Approved" coordination decision was never an HR-system approval, and its removal does not change the official-truth boundary in any way.
- **Why:** the approval workflow (Pending → Approved/Rejected → Cancelled) added a second, informal decision layer on top of a system that was always meant to be a lightweight calendar coordination copy, not a parallel approval process. The user determined this added complexity without adding value, since the separate official HR leave system already handles real approval.
- **Short-Leave cap:** unchanged rule (maximum 120 minutes per record, maximum 120 active minutes per member per calendar month) — only the cap-membership condition changed, from "status = Approved" to "every row where `deleted_at IS NULL`" (§8.2 below, as amended).
- **Reporting:** `approved_leave_minutes` is renamed `active_leave_minutes` everywhere (schema, report JSON, frontend label) and now sums every active row instead of only Approved rows (§9 below, as amended).
- **API:** `GET /history` and `POST /{leave_id}/cancel` are removed; `PUT` no longer accepts a `status` field; a new `DELETE /{member_key}/{leave_id}` route is added (§12 below, as amended).
- **Frontend:** the Show History button/panel and the Approve/Reject/Cancel controls are removed; a single "Delete Leave" action (with confirmation) replaces them (§13 below, as amended).

See the paired evidence for this amendment:
`validation/leave-status-workflow-removal-check-2026-07-16.md`,
`handover/2026-07-16__leave-status-workflow-removal-closure.md`,
`database/migrations/2026-07-16-remove-member-leave-status-workflow.sql`.

---

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
| Status | Implemented; approval/status workflow removed 2026-07-16 by explicit user decision (§0). Reviewer sign-off on the original design (§15/§20) still open. |

---

## 1. Purpose

Design a calendar-managed **leave coordination copy** feature inside the existing per-member schedule calendar (`web-view/index.html`, `backend/routers/member_schedules.py`), so that:

- Leave taken by the five calendar members is visible on the management calendar.
- Tasks are not silently double-booked against known leave.
- Expected working hours in schedule reports are reduced when leave is active.
- Every saved leave record is immediately active (§0) — there is no separate approval history to preserve; the record's own presence with `deleted_at IS NULL` is the coordination record.

## 2. Business Question

"How do we stop management-calendar tasks and reports from silently ignoring leave that HR already knows about, without turning this AIOS into a second HR leave system?"

## 3. Official-Truth Boundary

This is the single non-negotiable constraint governing every other section of this document:

- The **external HR leave system remains official**. This feature does not replace it.
- Every row this feature stores is a **calendar coordination copy**, not official HR leave truth.
- This feature does **not** calculate or claim: official leave balance, payroll, no-pay status, disciplinary status, or medical truth.
- No official HR approval authority is or was ever implied by any wording in this system, including the now-removed "Approved" status — it was always a coordination decision recorded on the calendar, never an HR-system approval, and its removal does not change this boundary.
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
- (2026-07-16) Re-introducing any approval/status workflow, or any active/inactive/status enum replacing it — the §0 amendment is a deliberate, explicit user decision, not an open item.

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

These values are **leave-system credited minutes** (recorded here as `effective_leave_minutes`, snapshotted at creation and recalculated on any date/time edit — §0, §8.5) — they represent what the official leave system attributes to a half-day or full-day absence. They must **not** be described or reasoned about as independently verified actual productive working time; see §6.2 for why the two concepts are separate.

### 6.2 Actual Office Break (Distinct From Leave-System Periods)

The actual company break is a separate, physical-schedule fact and is **not** the basis for any leave-deduction calculation in this feature:

| Constant | Value |
|---|---|
| `ACTUAL_OFFICE_BREAK_START` | 12:45 |
| `ACTUAL_OFFICE_BREAK_END` | 13:30 |

The leave-system's own period boundaries (First Half ending 13:00, Second Half starting 13:30) do **not** reflect the actual 45-minute office break duration — they are the official leave system's own definitions, adopted here for mirroring purposes only. Do not recalculate, adjust, or reconcile the 270/270/540 leave-deduction minutes using the actual 12:45–13:30 break window; the two concepts are tracked independently in this document.

## 7. Lifecycle (2026-07-16 SIMPLIFICATION AMENDMENT — supersedes the original "Statuses and Transitions" section)

**There is no status field and no status transition.** A leave record has exactly two lifecycle states, both derived from `deleted_at`:

| State | Condition | Meaning |
|---|---|---|
| Active | `deleted_at IS NULL` | Visible in the normal calendar; blocks conflicting task saves; contributes leave-deduction minutes. |
| Deleted | `deleted_at IS NOT NULL` | Excluded from the normal calendar; does not block tasks; does not contribute to reporting. |

**Lifecycle transitions:**

| From | To | Mechanism |
|---|---|---|
| (none) | Active | `POST /api/member-leave/{member_key}` — creation, immediately active |
| Active | Active (edited) | `PUT /api/member-leave/{member_key}/{leave_id}` — field edits (date/time/purpose/external_reference), `effective_leave_minutes` recalculated when date/time changes |
| Active | Deleted | `DELETE /api/member-leave/{member_key}/{leave_id}` — soft delete (`deleted_at` set) |
| Deleted | (any) | Not allowed — a deleted record cannot be edited or reactivated; a new record must be created instead |

No role enforcement applies to any of these actions (see §11) — any calendar user may create, edit, or delete any leave record for any of the five members.

## 8. Visibility, Cap, Configuration, and Conflict Rules

### 8.1 Normal Calendar Visibility (amended)

| State | Normal calendar |
|---|---|
| Active (`deleted_at IS NULL`) | Visible |
| Deleted (`deleted_at IS NOT NULL`) | Hidden |

There is no separate history view (§13, amended) — deleted rows remain in PostgreSQL for technical audit/recovery only (per CLAUDE.md §16's management-action-records reading rule pattern), never exposed as a user-facing workflow.

### 8.2 Short-Leave Rules (amended)

- Single date; `start_time` and `end_time` required; `end_time` must be later than `start_time`.
- Maximum 2 hours (120 minutes) per single request — **block save** if exceeded.
- Maximum 2 active hours per member per calendar month — **block creation or edit** if exceeded.
- Every active row (`deleted_at IS NULL`) consumes the monthly cap; a deleted row does not. There is no Pending/Approved distinction — the cap check runs at creation time and again at edit time (previously only at approval time).
- No warning-only bypass anywhere in this rule; both blocks are hard, backend-authoritative.
- Cross-row monthly aggregation **must not** be represented as a database CHECK constraint (CHECK constraints cannot reference other rows) — application-level, transaction-safe validation is required (see design document §6 for the transaction strategy).
- Concurrent creation/edit requests for the same member/month must serialize safely so the cap cannot be exceeded by a race condition.

### 8.3 Half-Day and Full-Day Rules (amended)

- Single date. Half-Day requires a First/Second Half selection; no user-entered start/end time for either Half-Day or Full-Day.
- The clock periods (First Half 08:30–13:00, Second Half 13:30–18:00, Full-Day 08:30–18:00) and their leave-deduction minutes mirror the separate official leave system (§6.1) — they are **not** derived from the actual office break (§6.2) and must never be recalculated using it.
- Leave-deduction minutes for both halves and for Full-Day come from **backend configuration only** — never a frontend-hardcoded value.
- Since every record is immediately active (§0), **creation itself is blocked** if the required configuration value is missing — there is no longer a separate Pending/Approval split where a record could be saved without it. This is defense-in-depth only: the three configuration values are already confirmed (§8.5) and always present in this deployment.

### 8.4 Multi-Day Rules (amended)

- One request row with `start_date`/`end_date`; `end_date >= start_date`.
- Saturdays and Sundays are excluded automatically from the leave-deduction calculation.
- Each included Monday–Friday date uses the configured Full-Day leave-deduction minutes (540 minutes, per §6.1) — one Full-Day-equivalent deduction per included weekday.
- **Public holidays receive no special handling in this phase** — this is an explicit, deferred scope boundary, not an oversight. No holiday calendar is introduced. A weekday that happens to be a public holiday is still treated as a normal working weekday for this feature's purposes until a future phase addresses it.
- Creation is blocked (defense-in-depth only) if the Full-Day configuration value is missing — see §8.3.

### 8.5 Configuration Values — Confirmed (Mirrors Official Leave System)

The three configuration values are confirmed. They are **not invented** by this document — they mirror the separate official leave system's own First Half / Second Half / Full-Day periods (§6.1), and are **not** derived, adjusted, or recalculated from the actual office break (§6.2):

| Configuration constant | Confirmed value |
|---|---|
| `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES` | 270 |
| `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES` | 270 |
| `LEAVE_FULL_DAY_DEDUCTION_MINUTES` | 540 |

**Terminology:** these are **leave deduction minutes** / **leave-system credited minutes**, stored per-record as `effective_leave_minutes`, computed and snapshotted **at creation** (amended — no longer "at the moment status becomes Approved", since there is no Approved status) and recalculated in the same transaction whenever a date/time field is edited. They must not be described as verified actual productive working time or actual office minutes.

Requirements on these values:

- Exist only in the backend (e.g. `backend/config.py`, environment-variable-driven — same mechanism `DATABASE_URL`/`ALLOWED_ORIGINS` already use).
- Never duplicated as a frontend constant in `web-view/index.html`.
- Returned as API response metadata where useful, so the frontend can display the configured leave-deduction minutes without hardcoding a copy.
- **Snapshotted** as `effective_leave_minutes` on the leave record at creation, and recomputed whenever the record's date/time fields are edited, so `effective_leave_minutes` always reflects the record's own current shape — never silently rewritten by a later, unrelated configuration change.

**Missing-configuration behavior (amended — still applicable defense-in-depth, e.g. if a value is later unset or a new leave type is added without configuration):** since there is no longer a Pending/Approval split, **creation itself is blocked with a clear configuration error** until the value exists — there is no "save now, block later at approval" path anymore.

### 8.6 (Removed — Pending Behavior no longer applies)

The original §8.6 described Pending-leave behavior (visible but non-blocking). Pending no longer exists (§0, §7) — every record is active from creation, so this section has no current content. Preserved as a removed-section marker only, per the instruction not to silently delete historical section numbering without a note.

### 8.7 Active Conflict Behavior (amended — was "Approved Conflict Behavior")

Active leave **blocks** conflicting task saves. Conflict cases requiring a backend-authoritative check:

1. Timed task overlaps active Short Leave.
2. Task overlaps the active Half-Day leave-system period (First Half 08:30–13:00, or Second Half 13:30–18:00 — §6.1).
3. Any task occurs on an active Full-Day date.
4. Any task occurs on an included weekday of active Multi-Day leave.
5. An existing task is edited into a leave period.
6. A drag-and-drop move places a task into a leave period.
7. A resize extends a task into a leave period.

Backend response on conflict:

- HTTP 409.
- Error code `leave_conflict`.
- Human-readable message.
- Conflicting leave `id`, `leave_type`, `date`/`time` range. **No `status` field** (amended — there is no status to report).
- **Omit** `purpose` and any other unnecessary sensitive free text from the conflict response.

The backend must **never**, as a side effect of a conflict: auto-cancel the task, auto-reclassify the task's category, silently change the task's date/time, or otherwise bypass the existing category-immutability lock in `update_member_schedule_event`.

## 9. Reporting Rules (amended)

Existing task calculations (`_task_duration_minutes`, `_aggregate_schedule_period`, `_duration_percentages`, `_duration_change` in `backend/routers/member_schedules.py`) remain **unchanged** — this requirement is strictly additive on top of them.

- Active leave never appears in the Scheduled count, the Unscheduled count, or task duration totals.
- Active leave **reduces expected working minutes** by its leave-system credited minutes (`effective_leave_minutes`) — this is a credited-minutes deduction mirrored from the official leave system, not a measurement of actual observed productive time.
- Deleted leave has **no** expected-hours impact. (There is no separate Pending/Rejected/Cancelled category anymore — amended.)

**Additive fields** (superposed on `DailyScheduleReportOut`/`WeeklyScheduleReportOut`/`MonthlyScheduleReportOut`):

- `base_leave_deduction_reference_minutes`
- `active_leave_minutes` (amended — renamed from `approved_leave_minutes`; sums every leave row where `deleted_at IS NULL`)
- `adjusted_expected_work_minutes`
- `task_coverage_percentage`

**Expected-hour deduction per leave type (leave-deduction minutes, not verified actual working time):**

| Leave type | Deduction basis | Minutes |
|---|---|---|
| Short Leave | Exact active request minutes | Up to 120 (request-specific) |
| Half-Day — First Half | Snapshotted `effective_leave_minutes` (§6.1) | 270 |
| Half-Day — Second Half | Snapshotted `effective_leave_minutes` (§6.1) | 270 |
| Full-Day | Snapshotted `effective_leave_minutes` (§6.1) | 540 |
| Multi-Day | 540 (configured Full-Day minutes) × count of included Monday–Friday dates that overlap the report's own date range | 540 per included weekday |

Overlapping/duplicate active leave records covering the same date must **not** double-deduct — the design document specifies a date-union deduplication safeguard (see design document §9).

## 10. Data Model (amended — implemented, then amended 2026-07-16)

Table: `management_aios.member_leave_records` (additive when created; the `status` column and its CHECK constraint were later removed by `database/migrations/2026-07-16-remove-member-leave-status-workflow.sql`; does not alter `member_schedule_events`).

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
| ~~`status`~~ | **REMOVED 2026-07-16** | Column and CHECK constraint dropped by the simplification amendment migration; no replacement enum exists |
| `purpose` | Optional | Free text, short cap; process-level only |
| `external_reference` | Optional | Free-text pointer to the official HR record; never validated or synced |
| `coordination_copy_only` | Server-controlled | Boolean, fixed `TRUE`, not client-settable |
| `policy_source_id` | Required | References SRC-POLICY-001 rather than duplicating leave-quantity policy text |
| `effective_leave_minutes` | Server-controlled | Snapshotted at creation; recalculated on any date/time edit (amended — was "at the moment status becomes Approved") |
| `created_by` | Optional | Unauthenticated free-text label |
| `updated_by` | Optional | Unauthenticated free-text label |
| `created_at` | Server-controlled | |
| `updated_at` | Server-controlled | |
| `deleted_at` | Server-controlled | **The only lifecycle mechanism (amended)** — soft delete only; a row's existence with `deleted_at IS NULL` is its entire active state |

Explicitly excluded: any medical, payroll, disciplinary, or attachment field.

## 11. Security / Access Boundary (amended)

- No authentication.
- No role-based authorization.
- Any calendar user may create, edit, or delete any leave record for any of the five members. (Amended — "assign, approve, reject, or cancel" no longer apply; there is no status to act on.)
- `created_by`/`updated_by`, if populated, are **unauthenticated free-text labels** and must never be presented anywhere as a verified identity.

## 12. API Contract (amended — implemented, then amended 2026-07-16)

```
GET    /api/member-leave/{member_key}                       # every active row (deleted_at IS NULL)
POST   /api/member-leave/{member_key}                        # create; immediately active
PUT    /api/member-leave/{member_key}/{leave_id}              # edit fields on an active record
DELETE /api/member-leave/{member_key}/{leave_id}              # soft-delete (amended — new route)
GET    /api/member-leave/{member_key}/summary                 # monthly cap usage + expected-hours contribution
```

Removed (amended, 2026-07-16): `GET /api/member-leave/{member_key}/history` and `POST /api/member-leave/{member_key}/{leave_id}/cancel` — there is no status history to serve and no cancel transition to apply; `DELETE` replaces both.

`GET` accepts optional `start_date`/`end_date` filters, mirroring the existing `member_schedules` list route's convention. Full request/response field and conflict-check design is in the companion design document.

## 13. Frontend Contract (amended — implemented, then amended 2026-07-16)

- "Create Leave" action beside the existing "Create Task" action, using one shared implementation across all five member calendar instances (same `.msc-instance` factory convention already used).
- Leave-specific form with fields conditional on `leave_type` (time fields only for Short Leave; half/period selector only for Half-Day; date range only for Multi-Day).
- **Removed (amended):** status action buttons (Approve/Reject/Cancel), the Show History button, and the history panel — there is no status to act on and no separate history view.
- **Added (amended):** a single "Delete Leave" action per leave item, with a confirmation prompt, calling the new `DELETE` route; the calendar, leave list, and leave-deduction reports refresh immediately after a successful delete.
- Month/Week/Day rendering: Short Leave and Half-Day render as time-grid blocks (non-draggable); Full-Day and Multi-Day render as all-day banners. Type-only labels (no status text) — unchanged by this amendment (already the case per the prior label-wording cleanup, 2026-07-16).
- Visually distinct from tasks — a single leave-chip/-block visual treatment, not reusing the existing `CATEGORY_CLASS`/Scheduled-Unscheduled styling. (Amended — no per-status color variant exists anymore, since there is only one active state.)
- Persistent official-copy coordination banner/disclaimer on every leave surface.
- Conflict messages rendered from the 409 response body.
- Expected-hours report fields added to the existing shared `renderSummaryStats()` function, using the renamed `active_leave_minutes` field and the "Leave deduction" label (amended — was "Approved leave (deduction minutes)").

## 14. Evidence Required

- This requirement document (historical: 85%+ specified per §17 at original authoring; now amended per §0).
- Companion design document (`docs/management-calendar-leave-copy-design.md`), also amended.
- Simplification-amendment evidence: `validation/leave-status-workflow-removal-check-2026-07-16.md`, `handover/2026-07-16__leave-status-workflow-removal-closure.md`, `evidence/database/member-leave-status-removal-migration-execution-2026-07-16.md`.
- Prior to any further change: reviewer confirmation per §15.

## 15. Reviewers

Per CLAUDE.md §18 Reviewer Routing Rule:

| Domain | Reviewer |
|---|---|
| KPI/AXIOM/implementation/incident (active-conflict blocking policy owner) | Arun |
| HR/leave/staff records (config values, cap policy owner) | Mayurika |
| Cross-domain/unresolved ownership | Relevant Management Team member; trainee documents any gap |
| Promotion to parent AIOS truth / v0.2 | Relevant Management Team/domain owner sign-off |

No Varmen approval is required for this ongoing work unless explicitly requested in a specific conversation turn.

## 16. Known Limitations

- Multi-day leave cannot reuse `member_schedule_events`'s single-`event_date`/TIME-only schema — this requirement's dedicated table sidesteps that gap but does not solve it for tasks; overnight-task support remains a separate, unaddressed prerequisite decision (per `handover/2026-07-14__schedule-duration-reporting-closure.md`).
- `external_reference` is free text only; there is no automatic reconciliation against the official HR system, and none is claimed.
- Public-holiday handling is deferred; a weekday that is a public holiday is treated as a normal working weekday in expected-minutes calculations until a future phase.
- No conflict check exists today for tasks against tasks (only leave-vs-task is in scope here) — pre-existing gap, unchanged by this requirement.
- (2026-07-16) A soft-deleted row's original approval state (Pending vs. Approved, prior to this amendment) is not reconstructable from `deleted_at` alone — the migration mapping (§0, migration file) is a one-way, explicit business decision, not a lossless data transform.

## 17. Open Items (historical — preserved for record; not reopened by the §0 amendment)

**Resolved since original draft (2026-07-16 correction pass):**

1. ~~`LEAVE_HALF_DAY_FIRST_EXPECTED_MINUTES`~~ — **confirmed as `LEAVE_HALF_DAY_FIRST_DEDUCTION_MINUTES = 270`**, mirroring the official leave system's First Half period 08:30–13:00 (§6.1). Not derived from the actual office break.
2. ~~`LEAVE_HALF_DAY_SECOND_EXPECTED_MINUTES`~~ — **confirmed as `LEAVE_HALF_DAY_SECOND_DEDUCTION_MINUTES = 270`**, mirroring the official leave system's Second Half period 13:30–18:00 (§6.1). Not derived from the actual office break.
3. ~~`LEAVE_FULL_DAY_EXPECTED_MINUTES`~~ — **confirmed as `LEAVE_FULL_DAY_DEDUCTION_MINUTES = 540`**, mirroring the official leave system's Full-Day period 08:30–18:00 (§6.1). Not derived from the actual office break.
4. ~~Pending-leave conflict policy~~ — **moot as of 2026-07-16**: Pending no longer exists (§0). Preserved here as a historical record of the original open item, not as a live question.

No open architecture question remains. The dedicated `member_leave_records` table, the cap-consumption rule (every active row), and the missing-configuration behavior (block creation) are all settled by this document as amended.

## 18. Acceptance Criteria (amended)

1. A calendar user can create an active leave record of each of the 5 types for any of the 5 members without authentication.
2. Short Leave save is blocked when the single request exceeds 120 minutes; creation/edit is blocked when the active monthly total for that member/month would exceed 120 minutes; deleted rows never count toward that total.
3. Half-Day/Full-Day/Multi-Day creation is blocked with a clear configuration error if the relevant configuration value is missing (defense-in-depth; all three values are confirmed in this deployment).
4. Deleted records are excluded from the normal calendar view. (Amended — there is no separate history view; deleted rows remain in PostgreSQL for technical audit only.)
5. `DELETE` soft-deletes an active record; repeating `DELETE` on an already-deleted or nonexistent id returns 404. (Amended — replaces the original status-transition criterion.)
6. An active leave record blocks a conflicting task create, edit, drag, and resize, each returning HTTP 409 with error code `leave_conflict` and no automatic task mutation.
7. (Removed — amended) The original "a Pending leave record never blocks a task save" criterion no longer applies; there is no Pending state.
8. Active leave reduces `adjusted_expected_work_minutes` in daily/weekly/monthly reports without altering existing Scheduled/Unscheduled counts, durations, or percentages.
9. Overlapping active leave records covering the same date do not double-deduct expected minutes.
10. No medical, payroll, disciplinary, or attachment field exists anywhere in the schema, API, or UI.
11. Every leave API response and UI surface carries the coordination-copy/official-truth-boundary disclaimer.

## 19. Numeric / Binary PASS-FAIL Rule (historical — describes the original, pre-amendment design)

This section described the original design's completeness before implementation. It is preserved for historical record. The current PASS/AMBER/FAIL determination for the 2026-07-16 simplification amendment itself is in `validation/leave-status-workflow-removal-check-2026-07-16.md`.

## 20. Next Step

The approval/status workflow has been removed per explicit user decision (§0), implemented across backend, database, and frontend, and validated (see §14 evidence paths). Route this amended document and the companion design document to Arun (KPI/reporting-adjacent rules) and Mayurika (HR/leave-policy alignment) for reviewer sign-off per §15, alongside the original (still-open) reviewer sign-off request.
