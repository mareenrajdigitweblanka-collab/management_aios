---
name: management-action-records-context
type: context
created: 2026-06-25
status: Foundation Context — Evidence Use Only
source-boundary: SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001, SRC-ARUN-001, SRC-SUMAN-001-v2, SRC-MD-HR-001, SRC-MD-SUMAN-001
---

# Management Action Records Context

**Pass/Fail Rule:** PASS if this context correctly directs Claude to check `intelligence-inbox/management-action-records/` when asked about management problems or action history, without treating those records as final policy or automatic authority. FAIL if the reading path creates duplicate truth, allows [VERIFY] items to be removed via action records, or treats action records as equivalent to registered source documents.

---

## Status

Foundation Context — Evidence Use Only

This context file defines how Claude should locate and use ongoing records created by Mayurika, Arun, Rajiv, and Suman in the management action records inbox. It does not grant authority to any record in that folder beyond evidence-of-action status.

---

## Folder Paths

| Folder | Type |
|---|---|
| `intelligence-inbox/management-action-records/` | Ongoing management action records inbox |
| `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/` | Historical MD discussion source documents (source-registered, Varmen-reviewed) |

---

## Relationship Between Folders

These two folders are distinct evidence layers and must not be conflated.

**`md-discussion-notes/` — historical source evidence:**

- Contains registered source documents: SRC-MD-HR-001 (`MD & HR Discussion Notes.md`) and SRC-MD-SUMAN-001 (`MD & Suman Discussions Notes.md`)
- Both are ingested, source-mapped, sensitivity-checked, and Varmen-reviewed (2026-06-25)
- These documents established the MD governance principles now documented in CLAUDE.md §11 and the relevant context files
- Claude uses these as historical MD governance evidence — they are the foundation layer
- Do not move, duplicate, or treat these as ongoing inbox files

**`management-action-records/` — ongoing action records:**

- Contains records created by Management Team members as they encounter problems, take actions, or document follow-ups
- Records are not automatically registered sources — they are raw management evidence
- Records have individual reviewer and status fields that must be checked before use
- This folder is the ongoing intelligence input layer, sitting above the historical source layer
- Records here do not automatically update CLAUDE.md, context files, or skill files — that requires source registration and relevant Management Team/domain owner review

**Both are evidence, not automatic authority.** Neither folder grants permission to resolve [VERIFY] items, approve escalation paths, or finalize Admin Manager authority without the standard source registration and relevant Management Team/domain owner review process.

---

## Claude Reading Rule

When asked about a management problem, action history, or recorded follow-up, Claude should check in this order:

1. **CLAUDE.md** — confirm domain scope, [VERIFY] limits, allowed/forbidden actions
2. **`evidence/source-register.md`** — confirm which sources are registered and ready
3. **`context/verify-register.md`** — confirm whether the question touches an unresolved [VERIFY] item
4. **Relevant context file** — check domain-specific process rules before looking at action records:
   - HR domain → `context/hr-operations-context.md`
   - Recruitment domain → `context/recruitment-context.md`
   - KPI/AXIOM domain → `context/kpi-axiom-context.md`
   - Gap detection → `context/management-aios-purpose.md`
   - Confidentiality → `context/confidentiality-rules.md`
5. **`intelligence-inbox/management-action-records/INDEX.md`** — confirm which person folder to check and what the usage rules are
6. **Relevant person folder under `management-action-records/`** — locate the record(s) relevant to the question
7. **`md-discussion-notes/`** — only when historical MD governance evidence is specifically needed (SRC-MD-HR-001 or SRC-MD-SUMAN-001)

---

## User Folders and Safe Scope

| Person | Folder | Safe Scope |
|---|---|---|
| Mayurika / Mayuri | `mayurika-hr/` | HR process records, leave follow-up, onboarding records, PDPA tracking records, EOD monitoring records, Critic Meeting records, SKILL file compliance records, leadership review records — all process-level only; no personal employee data |
| Arun | `arun-implementation/` | KPI tracking records, AXIOM review records, incident management records, dashboard records, daily checklist records — all process-level; no individual staff performance band records; [VERIFY] items 8–10 (ACOS, Operational Manager, ROI Officer) remain open |
| Rajiv | `rajiv-admin-manager/` | Admin Manager domain records — CRITICAL: SRC-ADMIN-001 is PENDING; no Admin Manager authority, escalation path, or PRC role may be derived from records in this folder until SRC-ADMIN-001 is received and Varmen reviews it; [VERIFY] items 1–5 remain open |
| Suman | `suman-recruitment/` | Recruitment process records, onboarding records, 6-month ROI audit records, OLOS validation records, weekly deliverable records — all process-level; no candidate personal data, CV details, or salary information |

---

## Safety Boundary

Records in `management-action-records/` are evidence of an action or discussion. They carry the following constraints:

| Constraint | Rule |
|---|---|
| Not final policy | Records do not change or create company policy — SRC-POLICY-001 is the sole policy truth source |
| Not approval by default | A record does not prove an action was approved unless a named reviewer is explicitly listed and confirmed |
| Not parent AIOS truth | Records do not update CLAUDE.md or skill files — that requires source registration and relevant Management Team/domain owner review |
| Not [VERIFY] resolution | Records do not resolve any outstanding [VERIFY] item — those require registered source evidence and Varmen confirmation |
| Not Admin Manager authority | Records in `rajiv-admin-manager/` cannot establish Admin Manager authority, escalation paths, or PRC roles — these remain [VERIFY] pending SRC-ADMIN-001 |
| Sensitivity always applies | Records must not contain unredacted personal data, salary data, candidate CV details, disciplinary case details beyond aggregate/process level — check `context/confidentiality-rules.md` |

---

## Pass/Fail Rule

**PASS** if every record used from this folder has:
- Source or evidence reference
- Named reviewer or explicit [VERIFY — reviewer not confirmed] note
- Status field (Open / In Progress / Closed / Escalated)
- Next step
- Sensitivity check passed

**FAIL** if a record is vague, unsupported, missing a reviewer, contains unsafe personal data, or is used to make a policy, authority, or escalation claim that bypasses the source registration process.
