---
name: source-register
type: evidence
created: 2026-06-23
status: active
---

# Source Register

All raw stakeholder documents and interview notes that feed into CLAUDE.md must be registered here before use. No source may be referenced in CLAUDE.md without a Source ID entry in this register.

## Register Table

| Source ID | File Path | Provided By | Role | Source Type | Varmen Verified? | Sensitivity | Use in CLAUDE.md? | Status |
|-----------|-----------|-------------|------|-------------|------------------|-------------|-------------------|--------|
| SRC-VAR-001 | `intelligence-inbox/stakeholder-interview-notes/varmen-2026-06-22.md` | Varmen | Owner / Principal | Interview Notes | YES — self-authored | HIGH — owner directives | YES — primary authority source | READY |
| SRC-MAYU-001 | `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/HR.Mayu.Skill.md` | Mayurika | HR Manager | Stakeholder Document | YES — confirmed in interview | MEDIUM — HR policy detail | YES — HR workflows and policies | READY |
| SRC-MAYU-002 | `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/digitweb_org_chart.jpg` | Mayurika | HR Manager | Org Chart (Image) | YES — confirmed in interview | MEDIUM — org structure | YES — team structure reference | READY |
| SRC-ARUN-001 | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md` | Arun | Implementation Manager | Stakeholder Document | YES — confirmed in interview | HIGH — performance framework | YES — KPI and tracking logic | READY |
| SRC-ARUN-002 | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/my day check list-arun - shedule.csv` | Arun | Implementation Manager | Daily Schedule / Checklist | YES — confirmed in interview | LOW — operational schedule | YES — daily workflow reference | READY |
| SRC-SUMAN-001-v1 | `intelligence-inbox/raw-stakeholder-documents/suman-recruitment/archive/Recruitment_Quality_Control_Process.docx` | Suman | Recruitment Officer | Recruitment Process Document | YES — confirmed in interview | MEDIUM — recruitment process | NO — superseded | SUPERSEDED — binary/unreadable; replaced by v2 |
| SRC-SUMAN-001-v2 | `intelligence-inbox/raw-stakeholder-documents/suman-recruitment/Recruitment_Quality_Control_Process.md` | Suman | Recruitment Officer | Recruitment Process Document | YES — confirmed in interview | MEDIUM — recruitment process | YES — current readable source | READY |
| SRC-ADMIN-001 | `intelligence-inbox/raw-stakeholder-documents/admin-manager/` *(folder exists; no documents inside)* | Admin Manager | Admin Manager | Stakeholder Documents | NO — not yet interviewed | UNKNOWN — pending review | PARTIAL — authority and escalation logic marked [VERIFY] until received | PENDING |
| SRC-POLICY-001 | `intelligence-inbox/raw-stakeholder-documents/company-policy/Draft DIGIT WEB LANKA - Company Policy Manual.md` | Management / HR | Company Policy | Company Policy Manual | YES — Varmen reviewed; Final Approved | INTERNAL / RESTRICTED | YES — company-wide conduct, leave, onboarding, offboarding, AI tools, confidentiality, assets | READY — Final Approved |
| SRC-MD-HR-001 | `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & HR Discussion Notes.md` | Management / HR / MD Governance | MD Discussion Notes with HR | MD Discussion Notes spanning 19/11/2025–22/06/2026 | YES — Varmen reviewed 2026-06-25 | INTERNAL / RESTRICTED — contains individual staff names in operational context; individual performance case references; do not copy personal case details to context | YES — with source mapping and sensitivity limits | READY — Varmen Reviewed |
| SRC-MD-SUMAN-001 | `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & Suman Discussions Notes.md` | Recruitment / Onboarding / MD Governance | MD Discussion Notes with Suman | MD Discussion Notes spanning 24/02/2026–23/06/2026 | YES — Varmen reviewed 2026-06-25 | INTERNAL / RESTRICTED — contains candidate names with statuses; individual CV/salary details (14/05/2026 entry); individual performance assessment references; do not copy candidate personal data, CV, or salary details to context | YES — with source mapping and sensitivity limits | READY — Varmen Reviewed |

| SRC-SUMAN-CONF-001 | `evidence/stakeholder-confirmations/suman-line-manager-typing-correction-2026-06-25.md` | Suman | Recruitment Officer | Stakeholder Confirmation | YES — project default for confirmed project documents; not contradicted | INTERNAL | YES — limited to Line Manager typing correction resolution only | READY — Current Evidence Source |
| MGMT-ACTION-RECORDS-FOLDER | `intelligence-inbox/management-action-records/` | Mayurika, Arun, Rajiv, Suman | Management Team | Ongoing Management Action Records Inbox — ongoing records created by Management Team members documenting problems, actions, and follow-ups | YES — Varmen reviewed folder standard (2026-06-25) | INTERNAL — individual records must each be sensitivity-checked before use; no bulk sensitivity clearance | YES — as record index / evidence location; see `intelligence-inbox/management-action-records/INDEX.md` and `context/management-action-records-context.md` for reading rules | ACTIVE FOLDER STANDARD |

---

## Source Count Summary

| Status | Count |
|--------|-------|
| READY (Full) | 9 |
| READY — Conditional (Varmen review pending) | 0 |
| SUPERSEDED | 1 |
| PENDING | 1 |
| ACTIVE FOLDER STANDARD | 1 |
| TOTAL | 12 |

---

## Notes

- SRC-VAR-001 is the **highest-authority source**. All conflicts between other sources must defer to Varmen's stated intent.
- SRC-SUMAN-001-v1 is SUPERSEDED. The .docx was binary/unreadable by Claude Code and has been moved to the `archive` subfolder (folder name as created by user). SRC-SUMAN-001-v2 (.md) is the current active source. Do not reference v1 for any new claims.
- SRC-ADMIN-001 is **blocked**. The admin-manager folder exists but is empty — no documents have been placed inside it. Any Admin Manager authority, escalation paths, or approval chains in CLAUDE.md must carry the tag `[VERIFY — awaiting SRC-ADMIN-001]` until documents are received and registered.
- Sensitivity ratings guide redaction decisions if CLAUDE.md is shared externally.
- Do not invent or infer Admin Manager information from other sources as a substitute for SRC-ADMIN-001.
- SRC-POLICY-001 was registered on 2026-06-23 as Final Approved following Varmen review. The source filename contains "Draft" but Varmen confirmed this is the reviewed and approved company policy. It is the authoritative source for all company-wide policy claims in this AIOS.
