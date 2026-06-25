---
description: Dry-run KPI and AXIOM review support using source-backed context (SRC-ARUN-001 for KPI/AXIOM definitions and workflow; SRC-MD-HR-001 for MD Governance ROI Evidence Checklist §14). Use only for checklist preparation and missing-evidence review.
disable-model-invocation: true
allowed-tools: Read Grep Glob Write
---

# Skill: /kpi-axiom-review-support

## What This Skill Wrapper Does

This skill wrapper invokes the draft asset at `skills/kpi-axiom-review-support.md`.

It does not replace that file. It provides a Claude Code slash command entry point that reads the draft, applies its checklist logic in dry-run mode, and produces a review-ready output for human inspection.

**Scope note (updated 2026-06-25):** The source draft was extended with SRC-MD-HR-001 (Varmen Reviewed 2026-06-25). A new §14 MD Governance ROI Evidence Checklist was added covering: §14.1 new employee ROI milestone evidence check (1-week, 1-month, 3-month); §14.2 developer and technical team project ROI evidence check; §14.3 requirement and business value metadata check (8 required fields). The previous §14 (VERIFY Constraints) is renumbered §15 and §15 (Confidentiality) is renumbered §16 in the source draft. No Arun [VERIFY] items (8, 9, 10) were changed.

---

## Before Running

Read the following files before processing any input:

1. `skills/kpi-axiom-review-support.md` — the source-backed draft asset
2. `context/verify-register.md` — confirm which [VERIFY] items are active, in particular items 8, 9, and 10 (Arun wording items)
3. `evidence/source-register.md` — confirm SRC-ARUN-001 and SRC-MD-HR-001 are READY

---

## Operating Mode

**DRY-RUN / CHECKLIST PREPARATION ONLY.**

This wrapper must not:

- Make any performance decision for any employee
- Assign AXIOM bands — Arun (Implementation Officer) holds sole authority for AXIOM band placement (SRC-MAYU-001, SRC-ARUN-001)
- Issue First Warning, Second Warning, Third Warning, or PIP
- Trigger PRC reviews or PRC actions
- Approve or deny bonus eligibility — PRC Approval is required (SRC-ARUN-001 §9)
- Approve or deny promotion candidates
- Store individually identifiable performance band placements for named staff
- Resolve [VERIFY] items for Amazon ACOS, Operational Manager PRC scope, or ROI Officer identity — these require Arun confirmation
- Finalize escalation paths through Admin Manager [VERIFY — SRC-ADMIN-001 PENDING]
- Automate any management decision
- Connect to live KPI, AXIOM, or management systems

All [VERIFY] items from Arun (items 8, 9, 10 in verify-register.md) must be preserved exactly as written in the source draft. Do not interpret, resolve, or rephrase these items.

---

## How to Run

Pass team-level KPI status, aggregate band distribution, review schedule status, incident documentation status, or dashboard availability observations as input. Individual named staff AXIOM band placements, salary data, and personal disciplinary case details must not be provided.

**Accepted input examples:**

- "Website Team ROAS this week: 380%"
- "3 staff in Red band, 2 in Amber — net sales week"
- "KPI review for eBay Team not scheduled this week"
- "2 incidents logged; Week 3 reached — Additional Support step not documented"
- "Documentation compliance at 87% — below 90% threshold"
- "Monthly ROI Contribution data not yet collected"

---

## Output Format

Produce checklist-style output for the relevant section(s) of `skills/kpi-axiom-review-support.md`. For each missing input, undocumented step, or unmet condition identified, produce one record:

| Field                              | Description                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Review Area                        | Which section or stage (e.g., Weekly AXIOM Workflow, Bonus Eligibility, PRC Preparation) |
| Missing Input or Undocumented Step | What is not available or not evidenced                                                   |
| Source ID                          | Source ID and section that defines the requirement (SRC-ARUN-001 for KPI/AXIOM items §4–§13; SRC-MD-HR-001 for §14 MD Governance ROI Evidence items) |
| Impact                             | What review activity is blocked or at risk                                               |
| [VERIFY] Status                    | Whether this record involves an unresolved [VERIFY] item                                 |
| Recommended Next Action            | What should happen — by whom                                                             |

At the end of the output, produce a run summary:

| Summary Field            | Value                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PASS/FAIL                | PASS if all checklist items trace to SRC-ARUN-001 and all [VERIFY] constraints applied; FAIL if any KPI threshold is invented, any [VERIFY] removed, any employee decision made, or any escalation triggered |
| Missing Inputs Found     | Count of missing review inputs identified                                                                                                                                                                    |
| Source IDs Used          | List of Source IDs referenced in this run                                                                                                                                                                    |
| [VERIFY] Items Triggered | List of verify-register.md items that constrained this run's output (especially items 8, 9, 10)                                                                                                              |
| Safety Check             | Confirm no performance decisions made, no AXIOM bands assigned, no warnings issued, no PRC actions triggered                                                                                                 |
| Next Action              | What the human reviewer should do with this output                                                                                                                                                           |

---

## [VERIFY] Constraints Active for This Wrapper

The following items from `context/verify-register.md` directly limit what this wrapper may assert:

| [VERIFY] Item                                  | Constraint Applied                                                                                                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amazon ACOS threshold wording (item 8)         | Amazon ACOS trigger in §6 of the draft must not be used operationally. Flag as [VERIFY — Arun: source wording "Amazon ACOSBelow 25%" — threshold direction and formatting must be confirmed with Arun] in all outputs. |
| Operational Manager PRC membership (item 9)    | Do not assert Operational Manager PRC membership or scope without Arun confirmation.                                                                                                                                   |
| ROI Officer feedback — role identity (item 10) | Do not assert ROI Officer Feedback as a confirmed input from a confirmed role. Flag as [VERIFY — Arun: confirm whether ROI Officer is a distinct role or an existing title].                                           |
| Admin Manager PRC role (item 3)                | Do not assert Admin Manager PRC authority or scope. Mark as [VERIFY — awaiting SRC-ADMIN-001].                                                                                                                         |
| Admin Manager escalation authority (items 1–5) | No final escalation paths through Admin Manager may be included.                                                                                                                                                       |
| MD-specific requirements (items 6–7)           | Mark all outputs as Foundation Draft v0.1.                                                                                                                                                                             |

---

## Test Output Location

Save all test run outputs under `validation/skill-test-runs/`.

File naming: `kpi-axiom-review-support-test-YYYY-MM-DD.md`

Do not save test outputs elsewhere.

---

## Confidentiality

- No individually identifiable AXIOM band placements for named staff
- No salary or compensation data
- No disciplinary case personal details
- No health or personal information
- Process-level and aggregate information only
- All outputs are company property under SRC-POLICY-001 §11.0 and §14.0

---

## Status

**DRAFT — Foundation Draft v0.1. Not for operational use until Varmen review and sign-off is complete. Arun confirmation required for [VERIFY] items 8, 9, and 10 before any skill section relying on those items can be used operationally.**
