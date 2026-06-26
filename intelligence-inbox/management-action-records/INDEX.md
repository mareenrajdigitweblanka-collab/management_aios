---
name: management-action-records-index
type: index
created: 2026-06-25
status: ACTIVE
source-boundary: SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001, SRC-ARUN-001, SRC-SUMAN-001-v2, SRC-MD-HR-001, SRC-MD-SUMAN-001
---

# Management Action Records Index

## Purpose

This index tells Claude and future users where to look for ongoing management action records created by the Management Team (Mayurika, Arun, Rajiv, and Suman).

It also clarifies the relationship between two distinct folder types so that Claude does not confuse historical MD discussion source documents with ongoing management action records.

---

## Folder Roles

| Folder | Purpose | Use As |
|---|---|---|
| `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/` | Historical MD discussion source files already ingested and source-mapped (SRC-MD-HR-001, SRC-MD-SUMAN-001) | MD governance evidence — historical; source-registered and Varmen-reviewed |
| `intelligence-inbox/management-action-records/` | Ongoing records created by Management Team members (Mayurika, Arun, Rajiv, Suman) | Evidence of recorded discussion, action, problem, or follow-up — ongoing; individual records require reviewer and status check |

**Critical distinction:** Do not treat records in `management-action-records/` as replacements for or equivalents of the registered historical MD discussion sources (SRC-MD-HR-001, SRC-MD-SUMAN-001). These are different evidence layers with different registration status.

---

## Active User Folders

| Person | Role | Folder |
|---|---|---|
| Mayurika / Mayuri | HR Officer | `mayurika-hr/` |
| Arun | Implementation Officer | `arun-implementation/` |
| Rajiv | Admin Manager | `rajiv-admin-manager/` |
| Suman | Recruiting Officer | `suman-recruitment/` |

---

## When Claude Should Check This Folder

Claude should check this folder when the user asks about:

- Management problems faced by the team
- Actions taken by HR, Arun, Rajiv, or Suman
- MD discussion follow-up or implementation progress
- Problem–solution history for recurring management issues
- Evidence that an action was taken or recorded
- Recurring management gaps or unresolved follow-ups
- Review pack preparation — whether prior actions are on record
- `management-problem-analysis` skill inputs — action history evidence
- Whether a specific process failure has been documented before

---

## How Claude May Use These Records

Claude may use records here as evidence that:

- A discussion was documented by the named Management Team member
- A problem was recorded with a date and description
- An action was taken and assigned to a responsible person
- A follow-up was identified and assigned
- A reviewer or approval status was recorded against the action

---

## What Claude Must Still Check Before Using Any Record

Claude must still check all of the following before acting on any record in this folder:

| Check | Where |
|---|---|
| Source registration status | `evidence/source-register.md` |
| Unresolved [VERIFY] items | `context/verify-register.md` |
| Policy position for any policy-related claim | SRC-POLICY-001 (`intelligence-inbox/raw-stakeholder-documents/company-policy/`) |
| Relevant context file for the domain | `context/` — see below |
| Reviewer and approval status | Inside the individual record |
| Sensitivity limits | `context/confidentiality-rules.md` |
| Admin Manager boundary | CLAUDE.md §14 items 1–5 for any record in `rajiv-admin-manager/` |

**Context files to check by domain:**

| Domain | Context File |
|---|---|
| HR operations | `context/hr-operations-context.md` |
| Recruitment | `context/recruitment-context.md` |
| KPI / AXIOM | `context/kpi-axiom-context.md` |
| Management gaps | `context/management-aios-purpose.md` |
| Confidentiality | `context/confidentiality-rules.md` |
| [VERIFY] items | `context/verify-register.md` |

---

## What Claude Must Not Assume

Claude must not assume:

- The action recorded was automatically correct or compliant
- The action was formally approved unless a reviewer is explicitly named and confirmed
- The record represents final company policy
- Admin Manager authority is confirmed — it remains [VERIFY] pending SRC-ADMIN-001
- Escalation paths through the Admin Manager are valid — they remain [VERIFY]
- Any pending [VERIFY] item in `context/verify-register.md` has been resolved by a record in this folder
- Records here replace or override the source-registered MD discussion documents in `md-discussion-notes/`

---

## Pass/Fail Rule

**PASS** if Claude can understand when and how to use the `management-action-records` folder without verbal explanation, and without creating duplicate truth or unsupported authority claims.

**FAIL** if Claude treats records in this folder as automatic approved policy, treats them as equivalent to the registered source documents in `md-discussion-notes/`, or uses them to resolve [VERIFY] items without independent source registration and relevant Management Team/domain owner confirmation. *(Reviewer routing updated 2026-06-26 — see validation/reviewer-model-correction-note.md.)*
