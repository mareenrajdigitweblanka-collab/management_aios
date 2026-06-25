---
name: management-action-records-readme
type: inbox-readme
created: 2026-06-25
status: ACTIVE
source-boundary: SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001
---

# Management Action Records Inbox

## Purpose

This folder stores Management Team MD discussion notes and problem/action records in a source-backed, LLM-queryable format.

Records placed here serve as evidence that a discussion happened, a problem was identified, or an action was taken. They are **not** automatic final policy, not parent AIOS truth, and not automatic proof that an action was correct.

Claude must still apply full source discipline, policy checks, sensitivity checks, and [VERIFY] limits before drawing any conclusion from records in this folder.

---

## Users

| Person | Role | Folder |
|---|---|---|
| Mayurika / Mayuri | HR | mayurika-hr/ |
| Arun | Implementation Officer | arun-implementation/ |
| Rajiv | Admin Manager | rajiv-admin-manager/ |
| Suman | Recruiting Officer | suman-recruitment/ |

---

## What Belongs Here

- MD discussion notes
- Problem faced records
- Action taken records
- Evidence-backed management follow-up
- Recruitment / onboarding action records
- KPI / ROI follow-up records
- HR process follow-up records
- Admin Manager action records — only after Admin Manager source boundary is confirmed (see [VERIFY] items 1–5 in context/verify-register.md and CLAUDE.md §14)
- Problem / solution learning records

---

## What Does Not Belong Here

- Unredacted sensitive employee personal details
- Salary, bonus, or compensation data (out of scope at all times — SRC-VAR-001, SRC-POLICY-001 §2.0)
- Medical or private personal data
- Disciplinary case details without explicit MD + HR owner approval
- Final policy changes (those must follow the source registration and Varmen sign-off process)
- Automation instructions
- Parent AIOS promotion decisions (no record in this folder promotes itself to CLAUDE.md truth without Varmen sign-off)
- Individually identifiable HR data beyond what is necessary for process identification

---

## Claude Usage Rule

Claude may treat records in this folder as evidence that a discussion occurred or that an action was recorded by the named person on the recorded date.

Claude must still check all of the following before acting on any record:

1. **evidence/source-register.md** — confirm whether the record relates to a registered source
2. **SRC-POLICY-001** — for any policy-related claims, confirm the policy position
3. **context/verify-register.md** — confirm whether the claim touches an unresolved [VERIFY] item
4. **Reviewer / approval status** — records without a named reviewer or with `[VERIFY — reviewer not confirmed]` must not be treated as approved
5. **Sensitivity limits** — confirm the record does not contain sensitive personal data before citing it
6. **Admin Manager records** — any record in rajiv-admin-manager/ must be treated with extra caution until SRC-ADMIN-001 is received and registered (CLAUDE.md §14 items 1–5)

**Claude must not treat any record in this folder as:**
- Final approved company policy
- Parent AIOS truth
- Automatic proof that an action was correct or compliant

---

## File Naming Rule

Every file placed in a person's subfolder must follow this naming convention:

```
YYYY-MM-DD_person-domain_record-type_short-topic.md
```

**Examples:**

```
2026-06-25_mayurika-hr_md-discussion_leave-update-process.md
2026-06-25_arun-implementation_problem-solution_kpi-review-evidence-gap.md
2026-06-25_rajiv-admin-manager_problem-solution_admin-approval-boundary.md
2026-06-25_suman-recruitment_md-discussion_onboarding-roi-review.md
```

**Record Type Values:**

| Code | Meaning |
|---|---|
| `md-discussion` | MD discussion note |
| `problem-solution` | Problem faced and action taken |
| `follow-up` | Follow-up on a prior record or action |
| `kpi-roi-record` | KPI or ROI related action record |
| `hr-process-record` | HR process follow-up |
| `recruitment-record` | Recruitment or onboarding action record |

---

## Templates

Use one of the two templates in the `templates/` folder for every new record:

| Template | Use When |
|---|---|
| `templates/md-discussion-note-template.md` | Recording a discussion with or about MD direction |
| `templates/problem-solution-action-record-template.md` | Recording a management problem faced and action taken |

---

## Pass/Fail Rule

**PASS** if every record in this folder includes: date, person, role, problem/discussion summary, evidence/source reference, action taken, reviewer name or [VERIFY] note, current status, next step, and source IDs.

**FAIL** if a record is vague, unsupported, missing a reviewer, or contains unsafe personal data.

---

## Source Boundary Note

Records placed in this folder are raw management evidence. They feed into the AIOS intelligence layer. They do not automatically update CLAUDE.md, context files, or skill files. Any update to those files must follow the established source registration and Varmen sign-off process as documented in CLAUDE.md §16 and evidence/source-register.md.

Admin Manager records in rajiv-admin-manager/ have an additional constraint: until SRC-ADMIN-001 is received and Varmen reviews it, no Admin Manager authority, escalation path, or approval chain may be derived from records in that subfolder. See CLAUDE.md §14 [VERIFY] items 1–5.
