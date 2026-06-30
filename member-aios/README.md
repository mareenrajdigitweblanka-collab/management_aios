---
name: member-aios-readme
type: folder-readme
created: 2026-06-30
status: ACTIVE
source-boundary: CLAUDE.md, evidence/source-register.md, context/verify-register.md
---

# Member AIOS — Folder Overview

## What This Folder Is

`member-aios/` contains role-specific workbench folders for each member of the Management Team: Mayurika, Suman, Arun, and Rajiv.

Each subfolder holds navigation files, source pointer lists, and role-specific checklists that help each person work within the Management AIOS without needing to read the entire root document set every time.

**These are workbenches, not separate AIOS systems.**

---

## Why This Folder Exists

The root Management AIOS holds documentation, source evidence, skills, and context files that span all four management roles. A member workbench surfaces only what is relevant to one person's confirmed domain — making day-to-day operation faster, without creating a parallel truth layer.

---

## Root Truth Rule — Read This Before Using Any File Here

**The root CLAUDE.md is canonical. Always.**

Every claim, rule, process detail, authority boundary, or governance standard in this AIOS traces back to CLAUDE.md and the sources registered in `evidence/source-register.md`.

If a workbench file says something different from CLAUDE.md, **CLAUDE.md wins.**

If a workbench file does not yet exist for a topic, **go to CLAUDE.md first.**

---

## What WORKBENCH.md Files Are

Each member's primary file is a `WORKBENCH.md`. It is a role navigation guide:

- It tells the member what their confirmed responsibilities are, and which sources back them
- It points to the relevant skills, context files, and action record inbox
- It lists the [VERIFY] items that affect their domain
- It states what the member may and may not maintain
- It routes review requests to the correct person

A `WORKBENCH.md` file is **not** a policy document, not an authority grant, not a standalone AIOS, and not a copy of source content. It is a pointer layer.

---

## What Member AIOS Files Must Not Do

No file under `member-aios/` may:

- Redefine HR policy — SRC-POLICY-001 is the sole policy truth source
- Redefine KPI rules — SRC-ARUN-001 and SRC-MD-ARUN-001 are the sole KPI sources
- Redefine recruitment rules — SRC-SUMAN-001-v2 and SRC-MD-SUMAN-001 are the sole recruitment sources
- Establish or imply Admin Manager escalation authority before SRC-ADMIN-001 is received
- Resolve any [VERIFY] item — that requires registered source evidence and relevant domain owner confirmation
- Copy full policy text — use section references to root CLAUDE.md and context files instead
- Store personal staff data, salary data, disciplinary case details, health data, grievance details, or private employee case details
- Promote any content to parent AIOS truth — that requires domain owner sign-off

---

## Source Discipline

Every factual claim in any file under `member-aios/` must be backed by a Source ID registered in `evidence/source-register.md`, or must carry a `[VERIFY]` tag.

If a claim has no Source ID and no `[VERIFY]` tag: it is an error. Flag it immediately.

---

## [VERIFY] Rule

`[VERIFY]` tags must not be removed in member AIOS files. If a [VERIFY] item appears in a workbench or checklist, it must remain tagged until:

1. Registered source evidence exists in `evidence/source-register.md`
2. The relevant Management Team/domain owner confirms the resolution
3. `context/verify-register.md` is updated

For the current open [VERIFY] items, see `context/verify-register.md`.

---

## Sensitive HR Data Rule

No member AIOS file may contain:

- Individual staff names beyond operational context where role identification is required
- Salary or compensation data
- Disciplinary case details (aggregate compliance rates only)
- Health or personal leave medical data
- Grievance or complaint details
- Candidate personal data, CV details, or interview scores linked to named individuals
- PDPA personal data

Default to process-level and aggregate information only. See `context/confidentiality-rules.md`.

---

## Review Routing

All member AIOS files follow the reviewer routing rule in CLAUDE.md §18 (updated 2026-06-26):

| Domain | Reviewer |
|---|---|
| HR / leave / staff records / PDPA / EOD / SKILL compliance | Mayurika / Mayuri |
| Recruitment / onboarding / probation / 6-month ROI | Suman |
| KPI / AXIOM / ROI / implementation / incident management | Arun |
| Admin Manager / admin authority / escalation / PRC | Rajiv — only after SRC-ADMIN-001 is received |
| [VERIFY] item resolution | Registered source evidence + relevant domain owner confirmation |
| Skill file updates | Trainee prepares draft; domain owner reviews and confirms |
| Promotion to parent AIOS truth / v0.2 | Relevant domain owner sign-off |

Varmen is not required for normal ongoing Management AIOS work. Historical Varmen review records in existing files must not be altered.

---

## Active Member Workbench Folders

| Member | Folder | Status |
|---|---|---|
| Mayurika / Mayuri — HR | `mayurika-hr/` | DRAFT — created 2026-06-30; pending Mayurika review |
| Suman — Recruitment | `suman-recruitment/` | DRAFT — created 2026-06-30; pending Suman review |
| Arun — KPI / AXIOM / Implementation | `arun-implementation/` | DRAFT — created 2026-06-30; pending Arun review |
| Rajiv — Admin Manager | `rajiv-admin-manager/` | NOT CREATED — blocked; SRC-ADMIN-001 PENDING |

**Rajiv / Admin Manager workbench is blocked until SRC-ADMIN-001 is received.** No Admin Manager authority, escalation path, or PRC role content may be written until the source document is registered and reviewed. See CLAUDE.md §14 [VERIFY] items 1–5.

---

## Pass/Fail Rule

PASS if a clean LLM reading any file in this folder understands that the root CLAUDE.md is the sole source of management truth, and that member workbench files are navigation guides only.

FAIL if any file here creates duplicate policy truth, resolves a [VERIFY] item, stores sensitive personal data, or implies that a member AIOS folder replaces the root Management AIOS.
