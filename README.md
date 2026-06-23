# LEDSone Management AIOS — Skeleton Root

## Status

SKELETON ONLY — stakeholder data pending

## Source

Management_AIOS_Architecture.md

## Owner / Reviewer

Intern builds; Varmen validates

---

## Purpose

This is the LEDSone Management AIOS skeleton repository. It defines the folder structure required to support the AI Operating System for management functions at LEDSone.

---

## Critical Notices

- **Stakeholder data has not been finalised.** No facts about team structure, people, policies, or processes should be treated as truth in this repository.
- **`CLAUDE.md` must not be generated or populated** until stakeholder interviews have been completed, reviewed, and explicitly approved by Varmen.
- **No HR or Management rules should be treated as truth yet.** All content in this skeleton is structural scaffolding only.
- **Sensitive personal HR data must not be stored** anywhere in this repository at any stage without explicit authorisation.

---

## What Belongs Here

- Approved skeleton folder structure only.
- README files describing the purpose and rules of each folder.
- No business logic, no policy content, no stakeholder data.

## What Must NOT Be Stored Here Yet

- Employee names, roles, salaries, performance data, or any personal HR data.
- Leave policies, escalation rules, onboarding procedures, or review cycles.
- Management rules or decisions treated as verified truth.
- Populated `CLAUDE.md`.
- Any content derived from interviews that has not been reviewed and approved by Varmen.

---

## Folder Structure

```
management-aios/
├── context/                                  # Future verified context files only
├── skills/                                   # Future approved skill files only
├── intelligence-inbox/                       # Raw incoming intelligence
│   ├── recurring-issues/                     # Recurring problem patterns
│   ├── stakeholder-interview-notes/          # Raw interview notes (post-interview)
│   └── processed/                            # Processed and filed items
├── evidence/                                 # Validation proof and review logs
├── decisions/                                # Approved decision records
├── validation/                               # Validation checklists and outputs
└── handover/                                 # Intern-to-owner handover notes
```

---

## Evidence / Validation Note

This skeleton must be validated by running:

```
find . -maxdepth 3 -type d | sort
find . -maxdepth 3 -name "README.md" | sort
```

Validation output must be reviewed and signed off by Varmen before any content is added.

---

## Next Step

Phase 0 — Stakeholder interview evidence collection. No further files should be created until Varmen reviews and approves interview outputs.

---

## Pass/Fail Rule

PASS: Skeleton folders and README files exist; no populated `CLAUDE.md`; no stakeholder facts; no policy files; no skill implementation files; no sensitive HR data.

FAIL: Any populated `CLAUDE.md`; any HR/management policy treated as truth; any skill file beyond README; any sensitive personal data stored.

---

## Known Limits

- This skeleton does not represent any live system.
- No integrations (Gmail, Calendar, Drive, HR systems, n8n, OpenFlow, Sheets, databases) are connected or implied.
- No automation is active.
- All content is structural scaffolding pending stakeholder review.
