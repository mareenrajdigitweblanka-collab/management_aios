---
name: employment-stage-rule-review
type: evidence-review
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
status: OPEN — awaiting HR rule definition
source-boundary: member-aios/staff-data/source/normalized/hr-staff-dashboard.csv
root-truth: CLAUDE.md — canonical; this file is a review request, not a decision
---

# Employment Stage Rule — Review — 2026-07-13

## Purpose

The Staff Data dashboard requires an `employment_stage` value of Permanent, Probation, or 7-Day Training for every staff record. No HR-approved rule exists to derive this value from the source data, so all 310 normalized CSV rows currently carry `employment_stage = [VERIFY]`. This file asks Mayurika to define the rule.

## Source

`member-aios/staff-data/source/normalized/hr-staff-dashboard.csv` (`employment_stage` column, all rows); `source-maps/hr-staff-source-map-draft.md` §6.

## Evidence

The source PDF contains no explicit "employment stage" field. The following raw signals exist and *could* be relevant to a future rule, but none has been applied:

| Raw signal observed in source | Example | Currently used to set employment_stage? |
|---|---|---|
| `staff_status` (Active/Inactive) | 142 Active / 168 Inactive | No |
| Role-title/department text containing "Intern" | e.g. "Intern - PH", "Intern - Automation Technical", "Automation Engineer-intern" | No — preserved in `department_team`/`remarks` only |
| Parenthetical join-note qualifiers | e.g. "(Part time)", "(freelancing)", "(rejoining)", "(Intern-unpaid)", "(Intern-Paid)" | No — several of these were dropped during parsing where they could not be cleanly separated from other fields without risking excluded-field leakage; not usable as-is without HR review of the original PDF |
| `date_of_joining` (tenure) | Ranges from 2015 to 2026-06-02 | No |

**No row currently has a non-`[VERIFY]` `employment_stage` value.** 310 of 310 rows are `[VERIFY]`.

## Issue

Without an HR-approved rule, the Onboarding Staff Process and Employment Stage filter (both part of the approved Staff Data sidebar design — see `README.md` §9) cannot function. Building a rule without HR input risks inventing an HR classification, which this task is explicitly not permitted to do.

## Decision Required — Questions for Mayurika

- [ ] **Exact classification rule** for each of the three stages:
  - Permanent — what conditions must be true?
  - Probation — what conditions, and what is the probation duration/end condition?
  - 7-Day Training — is this a fixed 7-calendar-day window from `date_of_joining`, or a distinct tracked status?
- [ ] **Is employment stage stored directly** (HR maintains a stage field in their own system) **or derived** (computed from `staff_status` + `date_of_joining` + role-title text, etc.)? If derived, what is the exact formula?
- [ ] **Effective-date handling** — when a staff member moves from one stage to another (e.g. Probation → Permanent), is there a recorded effective date, and should the dashboard show current stage only, or stage history?
- [ ] **Rejoiners** — how should someone who left and rejoined (see the duplicate-employee-ID review for examples) be classified — do they restart at Probation, or resume at their prior stage?
- [ ] **Interns** — the source data contains many "Intern"-qualified role titles (paid and unpaid). Do interns map to one of the three approved stages, or does a 4th category need separate approval before interns can be classified at all?

## Owner

Mayurika (HR Officer).

## Reviewer

Mareenraj (builder) — implements the rule once defined; does not define it.

## Status

**OPEN** — no rule defined. 310/310 rows unresolved.

## Pass/Fail Rule

PASS if Mayurika provides an explicit, documented rule covering all three stages, storage vs. derivation, effective-date handling, rejoiners, and interns. FAIL if any row's `employment_stage` is set to a non-`[VERIFY]` value without this rule being recorded first, or if a 4th stage category is introduced without separate explicit approval.

## Next Step

Route to Mayurika. On response, record the rule as a stakeholder confirmation, update `source-maps/hr-staff-source-map-draft.md` §6, and only then re-run normalization to populate `employment_stage` for applicable rows — as a separate, explicitly authorized task.

## Known Limits

- This review does not propose a default rule — CLAUDE.md source discipline and this task's instruction both prohibit inventing HR classifications.
- The "Intern" and parenthetical qualifier signals noted in the Evidence table were not fully preserved during CSV normalization (some were dropped to avoid excluded-field leakage) — a rule that depends on those signals may require re-reading the source PDF, not just the current CSV.
- Interacts with the source reconciliation review (SRC-STAFF-001 has no status/stage field at all) and the duplicate-employee-ID review (rejoiner cases).
