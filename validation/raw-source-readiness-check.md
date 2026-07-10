---
name: raw-source-readiness-check
type: validation
created: 2026-06-23
last-checked: 2026-06-23
---

# Raw Source Readiness Check

This document validates whether raw stakeholder sources are sufficient to begin drafting CLAUDE.md. It must be reviewed and updated whenever new sources are added or sources change status.

---

## 1. Folder Check

| Folder Path | Expected? | Exists? | Notes |
|-------------|-----------|---------|-------|
| `intelligence-inbox/stakeholder-interview-notes/` | YES | YES | Contains varmen-2026-06-22.md |
| `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/` | YES | YES | Contains HR.Mayu.Skill.md and digitweb_org_chart.jpg |
| `intelligence-inbox/raw-stakeholder-documents/arun-implementation/` | YES | YES | Contains KPI framework .md and schedule .csv |
| `intelligence-inbox/raw-stakeholder-documents/suman-recruitment/` | YES | YES | Contains Recruitment_Quality_Control_Process.docx |
| `intelligence-inbox/raw-stakeholder-documents/admin-manager/` | YES | **YES — EMPTY** | Folder exists but contains no documents. Admin Manager documents not yet received. |
| `intelligence-inbox/raw-stakeholder-documents/company-policy/` | YES | YES | Contains `Draft DIGIT WEB LANKA - Company Policy Manual.md` — registered as SRC-POLICY-001; Varmen reviewed, Final Approved. |
| `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/` | YES | YES | Contains MD & HR Discussion Notes.md (SRC-MD-HR-001) and MD & Suman Discussions Notes.md (SRC-MD-SUMAN-001) — registered 2026-06-25. |

**Folder Check Result: CONDITIONAL PASS — 7 of 7 folders present. Admin-manager folder still empty (SRC-ADMIN-001 still PENDING). MD discussion notes folder present with both sources registered.**

---

## 2. Ready Sources

The following sources are present, file-verified, and Varmen-confirmed. They are cleared for use in CLAUDE.md drafting.

| Source ID | File | Cleared For |
|-----------|------|-------------|
| SRC-VAR-001 | `varmen-2026-06-22.md` | Primary owner directives, priorities, escalation preferences |
| SRC-MAYU-001 | `HR.Mayu.Skill.md` | HR policy, leave management, onboarding, appraisal workflow |
| SRC-MAYU-002 | `digitweb_org_chart.jpg` | Org structure, reporting lines, team layout |
| SRC-ARUN-001 | `KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md` | KPI definitions, performance band logic, review cycles |
| SRC-ARUN-002 | `my day check list-arun - shedule.csv` | Daily operational workflow, check-in timing |
| SRC-SUMAN-001-v2 | `Recruitment_Quality_Control_Process.md` | Candidate pipeline, 8-point screening, interview scoring, rejected/on-hold tracking, commitment records, 7/14-day review, Month 1/3/6 reviews, source quality monitoring, 180-day handover, daily knowledge capture |
| SRC-POLICY-001 | `Draft DIGIT WEB LANKA - Company Policy Manual.md` | Company-wide conduct, leave policy, onboarding, offboarding, AI tools mandate, confidentiality, assets, hours of work, attendance |
| SRC-MD-HR-001 | `MD & HR Discussion Notes.md` | MD governance directives: LLM-queryable compliance, requirement file governance, documentation standards, new employee ROI monitoring, developer project monitoring, management folder structure, BGCT collection, EOD strengthening, task ID standard, business logic standard. Varmen Reviewed 2026-06-25. Sensitivity limits apply. |
| SRC-MD-SUMAN-001 | `MD & Suman Discussions Notes.md` | MD governance directives: Suman formal role, six-month hire ROI audit, OLOS onboarding validation, BGCT completion, weekly deliverables, LLM-in-the-loop requirement, department handbooks/SOPs, pipeline baseline. Varmen Reviewed 2026-06-25. Sensitivity limits apply — no candidate names/CV/salary to context. |

Ready Source Count: 9 of 10 (SRC-MD-HR-001 and SRC-MD-SUMAN-001 added 2026-06-25, Varmen Reviewed 2026-06-25)

---

## 3. Pending Sources

The following sources are not yet available. CLAUDE.md sections that depend on these sources must be left incomplete or marked `[VERIFY]`.

| Source ID | Reason Pending | Blocked Sections in CLAUDE.md |
|-----------|---------------|-------------------------------|
| SRC-ADMIN-001 | Admin Manager folder exists but is empty. No documents received. Admin Manager has not yet been interviewed or confirmed by Varmen. | Admin Manager authority scope, approval chains involving Admin Manager, operational escalation paths that route through Admin, any Admin-specific workflows |

**Action required:** Obtain Admin Manager documents and schedule interview confirmation with Varmen before these sections can be finalized.

---

## 4. Sensitive Data Check

| Source ID | Sensitivity Level | Risk | Handling Instruction |
|-----------|------------------|------|----------------------|
| SRC-VAR-001 | HIGH | Owner directives, strategic intent | Do not share raw file externally. Summarise only what is needed in CLAUDE.md. |
| SRC-MAYU-001 | MEDIUM | HR policy, employee-facing rules | Extract policy logic only. Do not include personally identifiable employee details. |
| SRC-MAYU-002 | MEDIUM | Org chart with names and roles | Use for structure reference. Do not embed image directly in CLAUDE.md if shared externally. |
| SRC-ARUN-001 | HIGH | Performance bands, KPI targets, internal scoring | Include logic and definitions only. Do not expose individual scoring records if any exist in source. |
| SRC-ARUN-002 | LOW | Operational schedule | Safe for internal reference use in CLAUDE.md. |
| SRC-SUMAN-001 | MEDIUM | Candidate handling process | Include process steps only. No candidate names or personal data to be referenced. |
| SRC-ADMIN-001 | UNKNOWN | Content not yet reviewed | Cannot assess. Mark all Admin Manager content [VERIFY] until source is received and reviewed. |
| SRC-POLICY-001 | INTERNAL / RESTRICTED | Company policy manual — process-level rules only; no personal employee data | Include process-level policy rules only. No employee case data, salary figures, or personal data in this source. |
| SRC-MD-HR-001 | INTERNAL / RESTRICTED | Contains individual staff names in operational context; individual performance case references (Prakalathan case, backup resource planning for named staff, project failure examples by name) | Include process-level governance claims only. Do not copy individual performance case details, individual staff performance examples, or named operational cases to context. Names may be used only as source evidence markers. |
| SRC-MD-SUMAN-001 | INTERNAL / RESTRICTED | Contains candidate names with statuses; individual CV/salary/interview details (14/05/2026 entry); individual performance assessment reference | Do not copy candidate names, CV details, salary data, or individual performance assessments to context. Use process-level recruitment governance claims only. |

**Sensitive Data Check Result: MANAGEABLE — known sources have clear handling rules. SRC-ADMIN-001 sensitivity is unassessed. SRC-POLICY-001 contains no sensitive personal data.**

---

## 5. CLAUDE.md Readiness Decision

> **DECISION: READY FOR FOUNDATION DRAFT v0.1 ONLY**

Six of seven registered sources are present and cleared. The available sources cover:

- Owner directives and priorities (Varmen)
- HR policies and org structure (Mayurika)
- KPI framework and performance tracking (Arun)
- Recruitment quality control process (Suman)

**What can be drafted now:** The foundation of CLAUDE.md — owner intent, team roles (excluding Admin Manager), HR workflow, KPI logic, recruitment process, and daily operational reference.

**What must NOT be drafted yet:** Any section that assigns authority, escalation paths, or approval logic to the Admin Manager role. These sections must carry the tag:

```
[VERIFY — awaiting SRC-ADMIN-001: Admin Manager documents not yet received]
```

Final Admin Manager authority scope and escalation logic must remain **[VERIFY]** until SRC-ADMIN-001 is received, reviewed, and validated with Varmen.

---

## 6. Pass / Fail Rule

| Condition | Result |
|-----------|--------|
| All 7 sources READY | FULL PASS — CLAUDE.md may be drafted completely |
| 6 of 7 sources READY, pending source is non-critical path | CONDITIONAL PASS — foundation draft may proceed; blocked sections tagged [VERIFY] |
| 5 or fewer sources READY, or Varmen source missing | FAIL — do not begin CLAUDE.md drafting |
| Any source flagged as unverified by Varmen | FAIL — re-interview required before drafting |

**Current Result: CONDITIONAL PASS**

- SRC-VAR-001 is present and is the primary authority source.
- 6 of 7 sources are READY.
- SRC-ADMIN-001 is PENDING. Admin Manager sections in CLAUDE.md must remain [VERIFY].
- Foundation Draft v0.1 may proceed on all non-Admin-Manager sections.

---

## Validation Sign-off

| Check | Result |
|-------|--------|
| Folder check | CONDITIONAL PASS — 7 of 7 folders present; admin-manager still empty; md-discussion-notes folder present with both sources |
| Ready sources | 9 of 10 (7 full READY + 2 READY — Conditional) |
| Pending sources | 1 (SRC-ADMIN-001) |
| Sensitive data handling defined | YES for all known sources including SRC-MD-HR-001 and SRC-MD-SUMAN-001 |
| CLAUDE.md readiness | CONDITIONAL PASS — Foundation Draft v0.1; company policy integrated as §10; MD discussion sources registered for integration |
| Admin Manager sections | BLOCKED — must remain [VERIFY] |
| SRC-POLICY-001 status | READY — Varmen reviewed, Final Approved, registered 2026-06-23 |
| SRC-MD-HR-001 status | READY — Varmen Reviewed 2026-06-25; sensitivity limits apply |
| SRC-MD-SUMAN-001 status | READY — Varmen Reviewed 2026-06-25; sensitivity limits apply |

**Overall Validation Status: CONDITIONAL PASS — Updated 2026-06-25 (MD discussion sources Varmen Reviewed 2026-06-25)**

---

## 7. Mayurika Confirmation Backlog — Batch Registration Note (2026-07-07)

This section is a bookkeeping addendum only. It does not change the Foundation Draft v0.1 readiness decision above, which concerns raw stakeholder source folders (Section 1) and primary interview/document sources (Section 2), not stakeholder-confirmation evidence.

- `SRC-MAYU-CONF-007` through `SRC-MAYU-CONF-020` (14 IDs) were registered in `evidence/source-register.md` on 2026-07-07, resolving GAP-42 (`SRC-MAYU-CONF-007` mapping ambiguity).
- These are Mayurika stakeholder-confirmation sources (evidence layer), not raw stakeholder documents — they do not add a new folder or primary source to Sections 1–2 above.
- Numbering basis: chronological batch registration per `validation/mayurika-conf-id-chronological-batch-numbering-plan-2026-07-07.md` (Mayurika-confirmed approach).
- No [VERIFY] items are resolved by this registration. No CLAUDE.md sections are affected.
- Full registration detail: `validation/mayurika-conf-id-batch-registration-check-2026-07-07.md`.

---

## 8. Suman Source Registration — Onboarding & Queryability Gaps (2026-07-07)

This section is a bookkeeping addendum only. It does not change the Foundation Draft v0.1 readiness decision above.

- `SRC-SUMAN-ONBOARD-001` — READY — Suman Confirmed 2026-07-07
- `SRC-SUMAN-QUERY-001` — READY — Suman Confirmed 2026-07-07
- Privacy/redaction check: PASS — individual names from the onboarding gaps raw document do not appear in any reusable intake, workbench, quick-reference, context, or dashboard file; role/team-level descriptors only, per Suman's confirmed privacy rule.
- Raised-only routing-note preservation check: PASS — "Informed to MD," "Informed to Admin Manager," and "Informed to Team Leader" rows remain recorded as raised/routed-only, not resolved or fully actioned, per Suman's confirmation.
- No [VERIFY] items resolved by this registration. No CLAUDE.md sections affected. No canonical recruitment skill file merged.
- Full registration detail: `validation/suman-source-registration-check-2026-07-07.md`.
