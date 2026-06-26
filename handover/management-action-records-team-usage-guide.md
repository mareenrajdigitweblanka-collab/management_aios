---
name: management-action-records-team-usage-guide
type: handover
created: 2026-06-25
status: READY FOR MANAGEMENT TEAM ROLLOUT — REVIEWER MODEL UPDATED 2026-06-26
source-boundary: SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001, SRC-ARUN-001, SRC-SUMAN-001-v2, SRC-MD-HR-001, SRC-MD-SUMAN-001
---

# Management Action Records — Team Usage Guide

## Status

Ready for Management Team rollout. *(Reviewer model updated 2026-06-26 — see validation/reviewer-model-correction-note.md.)*

This guide may be shared with Mayurika, Arun, Rajiv, and Suman. Distribution does not require Varmen confirmation for normal ongoing Management AIOS work. If explicit Varmen input is needed on a specific item, the user must request it directly.

---

## Purpose

The Management Action Records folder is a shared inbox where Management Team members can write down what happened — clearly and in a format that Claude can read and use later.

When you record an MD discussion, a problem you faced, an action you took, or a follow-up you need to track, you place that record in your personal subfolder using the correct template. Claude will then be able to find it when the team needs to understand what was done, by whom, and why.

**The goal is simple:** If it is not written down in this folder in a format Claude can read, it effectively did not happen for AIOS purposes. This rule comes directly from the MD governance standard (SRC-MD-HR-001): any activity not documented in LLM-queryable format is considered "not happened."

This folder is for evidence of recorded action and discussion. Records here are not automatic final policy, not automatic approvals, and not automatic company decisions. They are a living log that keeps the AIOS informed.

---

## Who Uses This

| Person | Role | Folder |
|---|---|---|
| Mayurika / Mayuri | HR Officer | `intelligence-inbox/management-action-records/mayurika-hr/` |
| Arun | Implementation Officer | `intelligence-inbox/management-action-records/arun-implementation/` |
| Rajiv | Admin Manager | `intelligence-inbox/management-action-records/rajiv-admin-manager/` |
| Suman | Recruiting Officer | `intelligence-inbox/management-action-records/suman-recruitment/` |

Each person writes records only in their own subfolder. Do not place records in another person's folder.

---

## When to Create a Record

Create a record when any of the following happen:

- MD gives a direction or instruction that should be tracked
- A management problem is identified that needs documenting
- An action is taken on a problem or process gap
- A follow-up is assigned to someone for completion
- A problem is solved and the solution should be saved for future reference
- Evidence needs to be saved so a reviewer can confirm what happened later
- Claude should be able to answer later: what happened here, who did it, and what was the outcome

You do not need to wait until something is fully resolved. Create a record at the point of the event. If the situation is still in progress, set the Status field to "In Progress" and update the record when it closes.

---

## Which Template to Use

Two templates are available in the `templates/` folder:

| Template | Use When |
|---|---|
| `templates/md-discussion-note-template.md` | Recording a discussion with or about MD direction — use this when an MD instruction, directive, or management discussion needs to be saved as an evidence record |
| `templates/problem-solution-action-record-template.md` | Recording a management problem faced and an action taken — use this when you have identified a gap, documented a solution, or tracked a corrective action |

If you are unsure which template to use, default to the problem-solution template. You can always note that the source of the problem was an MD discussion within that template.

---

## File Naming Rule

Every file you create must follow this naming convention exactly:

```
YYYY-MM-DD_person-domain_record-type_short-topic.md
```

- **YYYY-MM-DD** — the date the record was created (e.g., 2026-06-25)
- **person-domain** — your name and domain (see table below)
- **record-type** — the type of record (see table below)
- **short-topic** — a short description of the topic in lowercase with hyphens (no spaces)

**Person-domain codes:**

| Person | Person-Domain Code |
|---|---|
| Mayurika | `mayurika-hr` |
| Arun | `arun-implementation` |
| Rajiv | `rajiv-admin-manager` |
| Suman | `suman-recruitment` |

**Record-type codes:**

| Code | Use When |
|---|---|
| `md-discussion` | Recording a discussion with or about MD direction |
| `problem-solution` | Recording a management problem and action taken |
| `follow-up` | Recording a follow-up on a prior record or action |
| `kpi-roi-record` | Recording a KPI or ROI related action |
| `hr-process-record` | Recording an HR process follow-up |
| `recruitment-record` | Recording a recruitment or onboarding action |

**Examples:**

```
2026-06-25_mayurika-hr_md-discussion_leave-update-process.md
2026-06-25_arun-implementation_problem-solution_kpi-review-evidence-gap.md
2026-06-25_rajiv-admin-manager_problem-solution_admin-approval-boundary.md
2026-06-25_suman-recruitment_md-discussion_onboarding-roi-review.md
```

---

## Required Fields

Every record you create must include all of the following fields. Do not leave any field blank. If a field does not apply, write "N/A" and explain why.

| Field | What to Write |
|---|---|
| **Date** | The date the record was created (YYYY-MM-DD format) |
| **Created by** | Your name |
| **Role / Domain** | Your role and domain (e.g., HR Officer — HR Domain) |
| **Problem or Discussion** | A clear description of what happened, what was discussed, or what problem was identified |
| **Evidence / Source used** | What evidence or source you are drawing on. Reference a Source ID if one exists (e.g., SRC-MAYU-001). If no registered source, describe the evidence briefly (e.g., "verbal direction from MD on 2026-06-25"). |
| **Action taken or action items** | What was done, or what actions are assigned and to whom |
| **Reviewer / Approval status** | Who reviewed or approved this record. If not yet reviewed, write [VERIFY — reviewer not confirmed] |
| **Sensitivity check** | Confirm whether this record contains any sensitive data that should be restricted. State PASSED if no sensitive data is present, or describe restrictions if present. |
| **Status** | Open / In Progress / Closed / Escalated |
| **Next step** | What happens next, and who is responsible |
| **Pass/Fail rule** | State whether a clean LLM reading this record could understand: what happened, who did it, why it was done, what evidence supports it, who reviews it, what is missing, and what happens next. Write PASS or FAIL with a brief note. |
| **Known limits** | Note any [VERIFY] items, missing approvals, or unresolved gaps that apply to this record |

---

## What Not to Add

Do not include any of the following in your records:

- Private employee medical details or health information
- Salary, bonus, or compensation data — these are out of scope at all times (SRC-POLICY-001 §2.0)
- Unredacted candidate personal data (CV details, contact details, interview scores linked to named individuals)
- Disciplinary case details without explicit MD and HR owner approval
- Final policy changes — these must follow the source registration and Varmen sign-off process
- Escalation approvals unless the approval is explicitly source-backed
- Personal opinions without evidence
- Assumptions stated as facts

If you are unsure whether something is safe to include, leave it out and flag it to Varmen or Mayurika for guidance.

---

## Claude Usage Rule

After your records are saved, Claude may use them as evidence that:

- A discussion happened on the recorded date
- A problem was recorded by the named person
- An action was taken and assigned
- A follow-up exists with an assigned owner

Claude must not assume:

- The action was correct or fully compliant
- The action was approved unless a named reviewer is explicitly listed in the record
- The record represents final company policy
- The record resolves any [VERIFY] item in the AIOS
- Admin Manager authority is confirmed (see Rajiv / Admin Manager Special Rule below)

---

## Rajiv / Admin Manager Special Rule

Until SRC-ADMIN-001 is received and reviewed by Varmen, all records in `rajiv-admin-manager/` must include the following note in the Known Limits field:

```
[VERIFY — Admin Manager authority not yet confirmed. SRC-ADMIN-001 PENDING. No Admin Manager approval, escalation path, or PRC role may be derived from this record until SRC-ADMIN-001 is received and Varmen-reviewed.]
```

This rule does not prevent Rajiv from creating records. It means that until the Admin Manager source document is received, no record in that folder can be used to establish or confirm Admin Manager authority, escalation paths, or PRC membership.

---

## Review Rule

Each record should be reviewed by the relevant Management Team/domain owner before being treated as reliable evidence for governance or decision-making purposes. *(Reviewer routing updated 2026-06-26: Mayurika for HR, Suman for recruitment, Arun for KPI/implementation, Rajiv for admin once SRC-ADMIN-001 received. Varmen is not required for normal ongoing reviews.)*

Records with `[VERIFY — reviewer not confirmed]` in the Reviewer/Approval Status field must not be cited as approved policy or authority. They may still be cited as evidence that an event was documented.

---

## Pass/Fail Rule

**PASS** if a clean LLM reading the record can clearly answer all of the following:

- What happened?
- Who was involved and in what role?
- Why did it happen or why was the action taken?
- What evidence supports this record?
- Who reviewed or approved it (or what is blocking review)?
- What is missing or unresolved?
- What happens next and who is responsible?

**FAIL** if the record is vague, unsupported by evidence, missing a reviewer/status field, contains unsafe personal data, or cannot answer the questions above without verbal explanation.

---

## This Guide Covers Evidence Use Only

Records in this folder are evidence — not authority. Creating a record does not approve a policy, finalize a decision, or override any existing registered source. If an action you take or a discussion you record needs to become formal company policy or governance, it must be submitted for source registration and relevant Management Team/domain owner review separately.

This folder is the intelligence input layer for the AIOS. It feeds into analysis and review support — it does not replace or override the foundation sources already registered in `evidence/source-register.md`.
