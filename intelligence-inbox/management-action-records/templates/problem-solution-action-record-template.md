---
name: problem-solution-action-record-template
type: template
created: 2026-06-25
status: ACTIVE — copy this file into the relevant person subfolder; do not edit this template directly
---

# Problem / Solution Action Record

> **Instructions:** Copy this template into the relevant person subfolder. Rename the file using the convention:
> `YYYY-MM-DD_person-domain_problem-solution_short-topic.md`
> Fill in every field. Do not leave any field blank — write `N/A` or `[VERIFY — reason]` if a field cannot yet be completed.

---

## Record ID

```
MGMT-ACTION-YYYYMMDD-001
```

*(Increment the suffix if more than one problem/solution record is created on the same date by the same person.)*

---

## Date

YYYY-MM-DD

---

## Created By

Name / Role

*(Example: Arun / Implementation Officer)*

---

## Related Domain

Select one or more:

- [ ] HR
- [ ] Recruitment
- [ ] KPI
- [ ] Admin
- [ ] Management
- [ ] Policy
- [ ] Documentation
- [ ] Other — specify: _______________

---

## Problem Faced

Describe the problem clearly in plain English. Include:

- What was observed or missing
- When it was identified
- Who identified it

Do not include sensitive personal employee data, salary figures, disciplinary case details, or private candidate information unless approved (see Sensitivity section below).

---

## Why This Problem Matters

Explain the business or operational impact of this problem. Link to AIOS domains where relevant.

*(Example: "Missing KPI evidence means band placement cannot be validated. Affects AXIOM review accuracy — SRC-ARUN-001.")*

---

## Evidence / Source Used

List all source IDs and file paths that confirm the problem exists or provide context.

| Evidence | Type | Source ID / File Path | Status |
|---|---|---|---|
| Example: KPI Definitions doc | Stakeholder Document | SRC-ARUN-001 | READY |
| Example: Company Policy §6.0 | Policy | SRC-POLICY-001 | READY |

*(If no registered source is available: [VERIFY — no registered source for this problem])*

---

## What Was Missing

Explain specifically what was absent when the problem was identified. Choose from:

- Missing evidence
- Missing process
- Missing owner
- Missing update
- Missing document
- Missing source registration
- Missing reviewer sign-off
- Other — specify: _______________

*(Be specific. "Missing evidence" alone is insufficient — state what evidence, from whom, for what purpose.)*

---

## Action Taken

Describe only the action that was actually taken. Do not describe planned or hypothetical actions here — use the Follow-up Needed section for those.

*(Example: "Leave update template created and placed in management-action-records/mayurika-hr/ for HR review.")*

---

## Reason for Action

Explain why this action was taken. Reference the relevant policy, source, or management directive.

*(Example: "Leave update process gap identified in SRC-VAR-001. Action taken to document the gap as a management record pending Varmen review.")*

---

## Reviewer / Approval

Who reviewed or approved this action before it was filed?

Name / Role / Date

**If not yet reviewed, write:**
[VERIFY — reviewer not confirmed]

*(Records without a confirmed reviewer must not be treated as approved evidence.)*

---

## Policy / Rule Checked

List the policy section or source ID that was checked before this action was taken.

| Policy / Rule | Source ID | Section | Applicable? |
|---|---|---|---|
| Example: Leave policy | SRC-POLICY-001 | §6.0–6.5 | YES |

**If not checked, write:**
[VERIFY — policy/source support not confirmed for this action]

---

## Staff / Candidate Personal Data Included?

**YES / NO**

If YES — specify what personal data is present and confirm approval:

- Data type:
- Reason for inclusion:
- Approval from MD: YES / NO / [VERIFY]
- Approval from HR owner (Mayurika): YES / NO / [VERIFY]

*(Default position: no sensitive personal data. See context/confidentiality-rules.md.)*

---

## Outcome / Status

Select one:

- [ ] Open
- [ ] In Progress
- [ ] Done
- [ ] Waiting for Review
- [ ] Blocked — specify blocker: _______________

---

## Follow-up Needed

What should happen next? Be specific about who should do what and by when.

*(Example: "Varmen to review this record by YYYY-MM-DD. If approved, update evidence/source-register.md.")*

---

## Risk Level

Select one:

- [ ] LOW — process-level gap; no immediate business impact
- [ ] MEDIUM — operational gap; may affect review accuracy or compliance
- [ ] HIGH — governance or policy breach; requires immediate escalation

**Risk Justification:**

*(Explain why this risk level was assigned.)*

---

## Can Claude Use This?

YES, as evidence of a recorded management action only.

Claude must still check:

- evidence/source-register.md — confirm source registration status
- context/verify-register.md — confirm whether the issue touches a [VERIFY] item
- Reviewer / approval status above
- Policy / Rule Checked section above
- Sensitivity check above
- Admin Manager boundary if record touches Admin Manager authority (CLAUDE.md §14 items 1–5)

**Claude must not treat this record as:**

- Final approved policy
- Parent AIOS truth
- Proof that the action was correct without independent source verification

---

## Known Limits

List what is still unclear about this problem or action at the time of filing.

| # | Limit | What Is Needed | Status |
|---|---|---|---|
| | | | PENDING |

*(If none: write: No known limits at time of filing.)*

---

## Pass/Fail Rule

**PASS** if: the problem is clearly described, evidence is referenced, action is stated, reviewer is named or [VERIFY] is applied, status is set, follow-up is specified, and risk level is assigned.

**FAIL** if: the action is unsupported by any source or policy reference, the problem is vague, sensitive personal data is present without approval, the reviewer field is empty, or no next step is recorded.
