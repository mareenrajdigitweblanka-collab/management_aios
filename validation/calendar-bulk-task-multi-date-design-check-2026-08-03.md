---
name: calendar-bulk-task-multi-date-design-check
type: validation-report
created: 2026-08-03
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-BULK-DATES-001
---

# Validation — Calendar Bulk Task Multi-Date Design Check (2026-08-03)

Companion evidence for `docs/2026-08-03_calendar-bulk-task-multi-date-technical-design.md`. This is a design-document-only session — no application code, migration, or production data was touched. The protected path `member-aios/mayurika-hr/staff-data/` was never opened.

## 1. Source references

- Requirement ID: REQ-CAL-BULK-DATES-001
- Discovery report: this session's prior turn (read-only investigation, three parallel discovery passes over frontend/backend/database, plus direct reading of the existing `same-day-bulk-task-creation`, `per-row-date` (commit `0a77f8b`), and `multiple-time-frames-task-entry` evidence trail)
- Design path: `docs/2026-08-03_calendar-bulk-task-multi-date-technical-design.md`
- Baseline: local `main` == `origin/main` == `3e1eed7`

## 2. Discovery-evidence reflection check

| Discovery finding | Reflected in design? | Where |
|---|---|---|
| Bulk endpoint already accepts `tasks: List[BulkTaskRowIn]`, per-row `date`, optional `time_frames` | YES | §4, §5, §8 |
| `BulkTaskRowIn`/`TimeFrameIn` already match the task brief's example JSON shape exactly | YES — stated explicitly, not re-derived | §4 |
| Atomic single-transaction commit (`db.add()` loop → one `flush()`/`commit()`, rollback on error) | YES | §12 |
| Two independent existing caps: `MAX_BULK_TASK_ROWS=30` (rows), `MAX_TASK_OCCURRENCES_PER_SUBMISSION=30` (expanded occurrences) | YES — both named, only the occurrence cap is relevant to this feature's new counting rule | §9 |
| Hard duplicate block (`classify_same_task_conflict`) not bypassable; soft warning/confirmation layer still exists | YES | §10 |
| No UNIQUE DB constraint for duplicates — application-layer only | YES | §4 |
| Authorization: bearer token only, `require_matching_member`, no override | YES | §11 |
| No recurrence/repeat/series concept anywhere in the repo | YES — explicitly confirmed absent and not introduced | §4, §5, §20 |
| No past-date restriction exists today at task-creation time | YES — explicitly stated as a discovery finding, not assumed | §3 item 6 |
| `event_date` stored verbatim, no timezone conversion at creation | YES — directly informs the algorithm's no-timezone-conversion requirement | §4, §7 |
| Existing `expandWeekdaysClientSide`/`parseDateStr`/`toDateStr`/`isValidDateStr` helpers in `core.js` | YES — the new `expandTaskDates()` is designed to reuse this exact idiom, not invent a second one | §4, §7 |
| No dedicated frontend DOM test file exists yet for the bulk modal | YES — reflected in the test-plan/files-to-change sections as a gap this design's test plan closes | §16, §18 |

## 3. No schema change proposed

Confirmed: §17 of the design document explicitly lists `backend/models.py`, `database/member_schedule_events_schema.sql`, and every file under `database/migrations/` as **not expected to change**, with no new column, table, index, or constraint proposed anywhere in the document. Grep of the design document for `ALTER TABLE|CREATE TABLE|migration` outside of historical/discovery citations returns zero proposed schema statements.

## 4. Existing API contract reused

Confirmed: §5 and §8 state the existing `POST /api/member-schedules/{member_key}/bulk` route, `BulkTaskCreateRequest`/`BulkTaskRowIn`/`TimeFrameIn` schemas are reused with **zero shape change** — the design's payload-generation rule (§8) produces exactly the same per-row object shape the endpoint already accepts today, just with more rows per submission (one per generated date instead of one per manually-typed row). §17 explicitly lists `backend/routers/member_schedules.py` and `backend/schemas.py` as not expected to change.

## 5. 30-occurrence limit preserved

Confirmed: §9 defines the new combined-occurrence counting rule (`Σ generated_date_count × resolved_time_frame_count` per card) explicitly against the **existing, unmodified** `MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30` value — the design does not propose changing this number, and explicitly states the frontend pre-submit check "does not replace backend enforcement." §17 confirms `backend/config.py` is not expected to change.

## 6. Current duplicate logic preserved

Confirmed: §10 states no new duplicate-identity logic is introduced; the hard block and soft warning both remain exactly as they are today, applied per-generated-date exactly as they already apply per-manually-typed-row. The one new frontend behavior (within-card selected-date deduplication in Multiple Dates mode) is explicitly distinguished from cross-task backend duplicate detection and does not weaken or bypass it — confirmed the design does not silently skip duplicates and does not invent a new duplicate identity, per the task's explicit constraints.

## 7. Authorization unchanged

Confirmed: §11 states authorization is completely unchanged — same `guardMutationAccess`, same `apiRequest`/bearer-token attachment, same backend `get_verified_member`/`require_matching_member` — and explicitly notes zero new API calls, zero new auth-relevant fields, and no multi-member concept (approved decision §3 item 1 — current member only). §17 confirms `backend/routers/calendar_auth.py` is not expected to change.

## 8. Recurrence / parallel-truth not introduced

Confirmed: §4 and §5 state the discovery-confirmed absence of any recurrence concept is preserved — this feature introduces no recurring-task record, no series/RRULE concept, and no second source of truth for scheduled tasks. §20 ("Known limits") explicitly states each generated date becomes a fully independent, individually editable/deletable task record with no linkage/grouping identifier retained anywhere — directly ruling out a parallel-truth risk by design, not merely by omission.

## 9. Implementation files scoped

Confirmed: §16 ("Files to change") lists exactly `core.js`, `instance.js`, `calendar.css`, one new pure-function test file, one new DOM test file, and this validation document — all frontend/test/evidence, zero backend/database files. §17 ("Files not to change") explicitly enumerates the backend/database files that must NOT change and states any discovered blocker requiring one of them must be separately raised and approved, not silently actioned.

## 10. Test plan is numeric and binary

Confirmed: §18 lists 14 explicitly numbered, binary PASS/FAIL conditions (exact counts, boundary cases at 30/31 occurrences and inclusive single-day ranges, zero-partial-write-on-failure, byte-for-byte shared-field consistency, zero regression on existing suites) — no vague or subjective condition appears in the list. Per §18's own note, no predicted numeric test-count total is committed in this design-only document; literal runner totals are deferred to the implementation session's evidence, consistent with this repository's established convention (confirmed across the Bulk Tasks, multiple-time-frames, and Review Summaries evidence trails, all of which report only post-hoc literal totals, never pre-implementation estimates).

## 11. Protected path excluded

Confirmed: `member-aios/mayurika-hr/staff-data/` was never opened during discovery or during authoring of this design/validation pair — no reference to any file under that path appears anywhere in either document, and no directory-existence or content check against it was performed this session (unlike some prior sessions where the path was checked for presence only — this session had no need to check it at all, since nothing in this feature touches HR/staff data).

## 12. Business-decision fidelity check

All 7 approved decisions from the task instructions are reproduced verbatim in §3 of the design document, with no answer invented or extrapolated beyond what was explicitly approved:

1. Current member only — reproduced exactly, no multi-member logic anywhere in the design.
2. Monday–Friday default — reproduced exactly (§6.2, §7 `DEFAULT_RANGE_WEEKDAYS`).
3. Weekends selectable, off by default — reproduced exactly.
4. Duplicate rules unchanged — reproduced exactly (§10).
5. 30-occurrence maximum preserved — reproduced exactly (§9).
6. Past dates: no new restriction — reproduced exactly, with the discovery finding (no restriction exists today) stated plainly rather than assumed.
7. Untimed tasks remain allowed — reproduced exactly (§6.4, §8 — `start`/`end`/`time_frames` entries remain nullable, unchanged).

## 13. Application-code check

Confirmed: no `.js`, `.py`, `.css`, `.sql`, or test file was created or modified during this session. `git diff --stat` (recorded at commit time, see the accompanying handover/commit record) shows only the two new documentation paths.

## 14. PASS / AMBER / FAIL

**PASS.** Every item in this checklist (discovery-evidence reflection, no schema change, contract reuse, occurrence-limit preservation, duplicate-logic preservation, authorization preservation, no recurrence/parallel-truth introduction, implementation-file scoping, numeric/binary test plan, protected-path exclusion, and business-decision fidelity) is satisfied by the design document as written. This is a design-phase PASS only — it does not certify implementation, testing, or deployment, none of which have occurred.

## 15. One next step

Route the design document to the relevant Management Team reviewer (per CLAUDE.md §18 routing note in the design document's §22), then begin implementation starting with `expandTaskDates()` in `core.js` and its dedicated pure-function test file, per the design document's §19 rollout plan.
