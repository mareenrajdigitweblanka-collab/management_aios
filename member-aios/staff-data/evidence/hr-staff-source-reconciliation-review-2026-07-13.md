---
name: hr-staff-source-reconciliation-review
type: evidence-review
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: OPEN — awaiting HR decision
source-boundary: SRC-STAFF-001, HR-provided PDF (unregistered)
root-truth: CLAUDE.md — canonical; this file is a review request, not a decision
---

# HR Staff Source Reconciliation — Review — 2026-07-13

## Purpose

Two HR-provided staff sources exist in this AIOS with different row counts and field coverage. This file asks Mayurika (HR owner) to decide how they relate, before either is treated as authoritative for dashboard or reporting purposes.

## Source

| | Source A | Source B |
|---|---|---|
| Source ID | SRC-STAFF-001 (registered) | Unregistered — HR-provided PDF, used in this task's normalization pass |
| Path | `intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv` | `raw data for mini aios/Personal Target - HRD - 2 Total Staffs.pdf` (outside git) |
| Registration status | READY — HR-Confirmed (SRC-MAYU-CONF-002, 2026-06-26) | NOT REGISTERED — no Source ID exists in `evidence/source-register.md` |

## Evidence

| Dimension | Source A (SRC-STAFF-001) | Source B (HR PDF) |
|---|---|---|
| Row count | 125 | 310 |
| Date coverage | Not explicitly dated per row; HR confirmed this extract represents currently active staff as of 2026-06-26 | Spans dates of joining from 2015 through 2026-06-02 (most recent row parsed: DWL325, 02/06/2026) |
| Field coverage | Row No., Employee ID, Location, Full Name, Designation, Department/Team | EPF No. (mislabeled — see field map), Date of Joining, Full Name, Location, Status, Calling Name, Department/Team, Designation, CV reference, NIC, Remark (excluded: Address, Personal Email, Contact Number, Guardian Number) |
| Status field | Not present as a column — HR confirmed out-of-band that all 125 rows are active | Present per row: Active/Inactive (142 Active / 168 Inactive) |
| Rows only in Source A | Not yet compared row-by-row — no shared key has been confirmed between the two sources (Source A uses a plain sequential "Employee ID"; Source B's `employee_number` uses the same `DWL###` pattern but contains 5 reused values — see the duplicate-employee-ID review). A reliable name+ID join has not been attempted in this task. | — |
| Rows only in Source B | Not yet compared — same blocker as above | 310 − (overlap, unknown) |

**This review does not perform the row-by-row comparison.** A safe join requires HR to first confirm whether `Employee ID` (Source A) and `employee_number` (Source B) are the same identifier scheme, given Source B's confirmed ID duplicates. Attempting an automated join before that confirmation risks silently mismatching records.

## Issue

Two HR-provided extracts of overlapping but not identical scope exist, and it is not established:

1. Whether Source B (310 rows, spans 2015–2026, includes intern/short-tenure entries) is a superset of Source A (125 active-only rows), a differently-scoped export, or a stale/inconsistent duplicate.
2. Which source should be treated as the dashboard's staff-record input going forward.
3. Whether Source B should be formally registered as a new Source ID, and if so, how its status column (Active/Inactive) relates to Source A's "active-only" framing.

## Decision Required

Mayurika must confirm:

- [ ] Is Source B the current, more complete staff extract, or a separate/older data pull?
- [ ] Should Source B be registered as a new Source ID (e.g. `SRC-STAFF-002`)?
- [ ] Which source is authoritative for headcount/active-staff reporting going forward?
- [ ] Should a row-by-row reconciliation be commissioned as a follow-up task?

**Authoritative-current-source: `[VERIFY]`** — not decided by this review, not decided by any prior task. No default is assumed.

## Owner

Mayurika (HR Officer) — per CLAUDE.md §18, staff records / HR data routes to Mayurika.

## Reviewer

Mareenraj (builder) — technical facilitation only; does not decide source authority.

## Status

**OPEN** — awaiting HR decision. Not blocking documentation work; blocks any dashboard promotion of staff data to "official" status.

## Pass/Fail Rule

PASS if Mayurika confirms which source (or combination) is authoritative and whether Source B should be registered. FAIL if this file is treated as having already decided the answer, or if any downstream file cites Source B as "the" authoritative staff source without this review being closed.

## Next Step

Route this file to Mayurika. On response, record her decision as a new stakeholder confirmation under `evidence/stakeholder-confirmations/` (root-level, following existing project convention) and update `source-maps/hr-staff-source-map-draft.md` §2 accordingly.

## Known Limits

- No row-by-row overlap analysis performed — see Evidence table.
- Does not resolve the 5 duplicate `employee_number` values in Source B (separate review file).
- Does not resolve Paraparan's designation conflict (separate review file).
- Does not register Source B — registration requires this review's outcome first.
