---
name: management-action-records-rollout-note
type: handover
created: 2026-06-26
status: READY FOR MANAGEMENT TEAM DISTRIBUTION
reviewer-model: Updated 2026-06-26 — see validation/reviewer-model-correction-note.md
source-boundary: SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001, SRC-ARUN-001, SRC-SUMAN-001-v2, SRC-MD-HR-001, SRC-MD-SUMAN-001, SRC-MD-ARUN-001
---

# Management Action Records — Rollout Note

## Status

**READY FOR MANAGEMENT TEAM DISTRIBUTION**

Reviewer model updated 2026-06-26. Varmen is not required for normal ongoing Management AIOS distribution or use. Reviews route to the relevant Management Team/domain owner per CLAUDE.md §18 and validation/reviewer-model-correction-note.md.

---

## Purpose

This note records that the Management Action Records folder and team usage guide are ready to be shared with the four Management Team users: Mayurika, Arun, Rajiv, and Suman.

It documents who receives which files, what each person is expected to do, what safety boundaries apply, and what Claude may and may not conclude from the records created.

---

## Files to Share

| File | Purpose |
|---|---|
| `handover/management-action-records-team-usage-guide.md` | Primary guide — how to create records, which template to use, required fields, naming rules, and safety limits |
| `intelligence-inbox/management-action-records/README.md` | Inbox overview — what belongs, what does not, Claude usage rule, file naming rule |
| `intelligence-inbox/management-action-records/INDEX.md` | Index — folder roles, when Claude checks, what Claude may and must not assume |
| `intelligence-inbox/management-action-records/templates/md-discussion-note-template.md` | Template for recording MD discussions and MD-directed instructions |
| `intelligence-inbox/management-action-records/templates/problem-solution-action-record-template.md` | Template for recording management problems and actions taken |

---

## Users and Folders

| User | Role | Personal Folder |
|---|---|---|
| Mayurika / Mayuri | HR Officer | `intelligence-inbox/management-action-records/mayurika-hr/` |
| Arun | Implementation Officer | `intelligence-inbox/management-action-records/arun-implementation/` |
| Rajiv | Admin Manager | `intelligence-inbox/management-action-records/rajiv-admin-manager/` |
| Suman | Recruiting Officer | `intelligence-inbox/management-action-records/suman-recruitment/` |

Each person writes records only in their own subfolder. Records must not be placed in another person's folder.

---

## What Each Person Should Do

### On Receiving This Guide

1. Read `handover/management-action-records-team-usage-guide.md` — the full usage guide.
2. Locate your personal subfolder listed in the table above.
3. Use the correct template from the `templates/` folder for every new record you create.
4. Follow the file naming convention exactly: `YYYY-MM-DD_person-domain_record-type_short-topic.md`

### When to Create a Record

Create a record when any of the following happen:

- MD gives a direction or instruction that should be tracked
- A management problem is identified and needs documenting
- An action is taken on a problem or process gap
- A follow-up is assigned for completion
- A problem is solved and the solution should be saved for future reference
- Evidence needs to be saved so a reviewer can confirm what happened later

Do not wait until something is fully resolved. Create the record at the point of the event. If the situation is still in progress, set Status to "In Progress" and update it when it closes.

### Required Fields in Every Record

Every record must include all of the following. Leave none blank. Write N/A and explain if a field does not apply.

| Field | What to Write |
|---|---|
| Date | YYYY-MM-DD |
| Created by | Your name |
| Role / Domain | Your role and domain |
| Problem or Discussion | Clear description of what happened or was discussed |
| Evidence / Source used | Source ID if registered; otherwise describe the evidence briefly |
| Action taken or action items | What was done, or what actions are assigned and to whom |
| Reviewer / Approval status | Named reviewer, or `[VERIFY — reviewer not confirmed]` |
| Sensitivity check | PASSED if no sensitive data; describe restriction if present |
| Status | Open / In Progress / Closed / Escalated |
| Next step | What happens next and who is responsible |
| Pass/Fail rule | Can a clean LLM read this record and understand what happened, who, why, evidence, reviewer, gaps, and next step? PASS or FAIL with note. |
| Known limits | Any [VERIFY] items, missing approvals, or unresolved gaps |

---

## What Each Person Must Not Add

Do not include any of the following in records:

- Private employee medical details or health information
- Salary, bonus, or compensation data — out of scope at all times (SRC-POLICY-001 §2.0)
- Unredacted candidate personal data (CV details, contact details, interview scores linked to named individuals)
- Disciplinary case details without explicit MD and HR owner approval
- Final policy changes — these must follow the source registration and Management Team/domain owner review process
- Escalation approvals unless explicitly source-backed
- Personal opinions stated without evidence
- Assumptions stated as facts

If unsure whether something is safe to include, leave it out and flag it to Mayurika for guidance.

---

## Reviewer Routing Rule

Per CLAUDE.md §18 (updated 2026-06-26):

| Domain | Reviewer |
|---|---|
| HR / leave / staff records / PDPA / EOD monitoring / SKILL compliance | Mayurika / Mayuri |
| Recruitment / onboarding / probation / 6-month ROI | Suman |
| KPI / AXIOM / ROI / implementation / incident management | Arun |
| Admin Manager / admin authority / escalation / PRC | Rajiv, after SRC-ADMIN-001 is received |
| Cross-domain or unresolved domain ownership | Relevant Management Team member; trainee documents the gap |
| Queryability / documentation structure | Trainee prepares; domain owner confirms meaning |
| [VERIFY] item resolution | Registered source evidence + relevant Management Team/domain owner confirmation |
| Skill file updates | Trainee prepares draft; domain owner reviews before applying |
| Promotion to parent AIOS truth / v0.2 | Relevant Management Team/domain owner sign-off |

**Varmen is not required for normal ongoing Management AIOS distribution or review.** Historical Varmen review records (e.g., "Varmen Reviewed 2026-06-25") remain intact and must not be altered — they record completed historical events.

---

## Rajiv / Admin Manager Boundary

Rajiv's subfolder (`rajiv-admin-manager/`) is active and ready for use. Rajiv may create records in that folder.

However, until SRC-ADMIN-001 is received and reviewed by the relevant domain owner, all records in that folder must include the following note in the Known Limits field:

```
[VERIFY — Admin Manager authority not yet confirmed. SRC-ADMIN-001 PENDING.
No Admin Manager approval, escalation path, or PRC role may be derived from
this record until SRC-ADMIN-001 is received and confirmed by the relevant
Management Team/domain owner.]
```

This does not prevent Rajiv from creating records. It means that until the Admin Manager source document is received:

- No record in that folder may be used to establish Admin Manager authority
- No escalation paths through the Admin Manager may be treated as confirmed
- No PRC membership claims for the Admin Manager may be derived from these records

See CLAUDE.md §14 [VERIFY] items 1–5 for the full boundary.

---

## Claude Usage Boundary

After records are saved, Claude may use them as evidence that:

- A discussion was documented by the named Management Team member on the recorded date
- A problem was recorded with a date and description
- An action was taken and assigned to a responsible person
- A follow-up exists with an assigned owner and status
- A reviewer or approval status was recorded against the action

Claude must not treat any record in this folder as:

- Final approved company policy
- Automatic proof that an action was correct or compliant
- An approved escalation path or authority decision
- Resolution of any [VERIFY] item in the AIOS — records do not resolve [VERIFY] items
- Parent AIOS truth — no record in this folder updates CLAUDE.md without Management Team/domain owner sign-off

Claude must still check `evidence/source-register.md`, `context/verify-register.md`, relevant context files, and the record's own reviewer/approval status before acting on any record.

---

## Pass/Fail Rule

**PASS** if each user can create a record in their subfolder without verbal explanation, and the record includes:

- Evidence or source reference
- Named reviewer or `[VERIFY — reviewer not confirmed]`
- Status and next step
- Known limits (including Rajiv Admin Manager boundary note where applicable)
- A self-declared Pass/Fail answer

**FAIL** if records are vague, unsupported by evidence, missing reviewer/status fields, contain unsafe personal data, or are treated as final authority or [VERIFY] resolution.

---

## [VERIFY] Count

This rollout note does not resolve any [VERIFY] items.

| Metric | Value |
|---|---|
| [VERIFY] items open before this rollout | 12 |
| [VERIFY] items resolved by this rollout | 0 |
| [VERIFY] count unchanged | YES |

---

## Safety Confirmation

| Safety Constraint | Status |
|---|---|
| No management action records created here | CONFIRMED |
| No MD discussions invented | CONFIRMED |
| No management decisions approved | CONFIRMED |
| No Admin Manager authority finalized | CONFIRMED — [VERIFY] items 1–5 remain open |
| No [VERIFY] items resolved | CONFIRMED |
| No policy changed | CONFIRMED |
| No automation introduced | CONFIRMED |
| No content promoted to parent AIOS truth | CONFIRMED |
| Historical Varmen review records preserved | CONFIRMED |

---

## Next Step

Share the following files with Mayurika, Arun, Rajiv, and Suman:

1. `handover/management-action-records-team-usage-guide.md`
2. `intelligence-inbox/management-action-records/README.md`
3. `intelligence-inbox/management-action-records/INDEX.md`
4. `intelligence-inbox/management-action-records/templates/md-discussion-note-template.md`
5. `intelligence-inbox/management-action-records/templates/problem-solution-action-record-template.md`

Each user should be directed to their personal subfolder and asked to create their first record using the correct template.

---

## Output Summary

| Check | Result |
|---|---|
| PASS/FAIL | PASS |
| Rollout note created | YES |
| Files referenced | 5 files to share; 5 source files read |
| Users covered | Mayurika, Arun, Rajiv, Suman |
| [VERIFY] count unchanged | YES — 12 open, 0 resolved by this note |
| Safety issues found | NONE |
| One next action | Share the usage guide and templates with all four Management Team users and direct each to their personal subfolder |
