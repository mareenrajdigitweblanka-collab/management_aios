---
description: Dry-run Management AIOS gap detection using source-backed context. Use only for documentation review, missing-evidence detection, and Varmen review support.
disable-model-invocation: true
allowed-tools: Read Grep Glob Write
---

# Skill: /management-gap-detection

## What This Skill Wrapper Does

This skill wrapper invokes the draft asset at `skills/management-gap-detection.md`.

It does not replace that file. It provides a Claude Code slash command entry point that reads the draft, applies its logic in dry-run mode, and produces a review-ready output for human inspection.

---

## Before Running

Read the following files before processing any input:

1. `skills/management-gap-detection.md` — the source-backed draft asset
2. `evidence/source-register.md` — confirm all source IDs referenced are READY
3. `context/verify-register.md` — confirm which [VERIFY] items are active and apply their constraints

Do not proceed if `evidence/source-register.md` shows any source cited in the gap detection logic as PENDING, unless that source is referenced only as a [VERIFY] constraint.

---

## Operating Mode

**DRY-RUN / REVIEW-SUPPORT ONLY.**

This wrapper must not:

- Make management decisions of any kind
- Make HR decisions of any kind
- Finalize or assert escalation paths (Admin Manager authority is [VERIFY] — awaiting SRC-ADMIN-001)
- Remove or resolve [VERIFY] tags
- Invent policy rules, process steps, or governance logic not present in registered sources
- Store or accept personally identifiable HR data, salary data, disciplinary case details, or health information
- Connect to or write to any live HR or management system
- Automate any action — all outputs require human review and approval
- Promote any output to parent AIOS truth without Varmen sign-off
- Treat this skill as final operational truth — Foundation Draft v0.1 only

---

## How to Run

Pass a process-level or aggregate observation as input. Personal, salary, health, or disciplinary data must not be provided.

**Accepted input examples:**

- "Onboarding checklist not received for new joiner"
- "No leave record updated for team member on leave"
- "KPI meeting for Website Team missed this week"
- "Decision record missing from management folder"
- "3 of 5 team members missing PDPA acknowledgement"

---

## Output Format

For each gap detected, produce one record with all of the following fields:

| Field                    | Description                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- |
| Gap Title                | Short description of the gap observed                                             |
| Evidence Source          | What was observed or reported that indicates this gap                             |
| Policy / Source Affected | Source ID and section that defines the expected standard                          |
| Impact                   | What operational harm this gap may cause if not addressed                         |
| Owner / Reviewer         | Who is responsible for closing this gap (process level — not a personal decision) |
| [VERIFY] Status          | Whether any aspect of this gap record depends on an unresolved [VERIFY] item      |
| Recommended Next Action  | What should be done next — by whom, at what stage                                 |

At the end of the output, produce a run summary:

| Summary Field            | Value                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| PASS/FAIL                | PASS if all claims traced to registered sources and all [VERIFY] constraints applied; FAIL if any gap claim is invented or any [VERIFY] removed |
| Evidence Sources Used    | List of Source IDs referenced in this run                                                                                                       |
| [VERIFY] Items Triggered | List of verify-register.md items that constrained this run's output                                                                             |
| Safety Check             | Confirm no decisions made, no escalations triggered, no sensitive data processed                                                                |
| Next Action              | What the human reviewer should do with this output                                                                                              |

---

## Test Output Location

Save all test run outputs under `validation/skill-test-runs/`.

File naming: `management-gap-detection-test-YYYY-MM-DD.md`

Do not save test outputs elsewhere.

---

## [VERIFY] Constraints Active for This Wrapper

The following items from `context/verify-register.md` directly limit what this wrapper may assert:

| [VERIFY] Item                                         | Constraint Applied                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Admin Manager authority scope (items 1–5)             | No escalation paths through Admin Manager. Any output involving Admin Manager must be marked [VERIFY — awaiting SRC-ADMIN-001]. |
| MD-specific requirements (items 6–7)                  | This skill may change scope after MD review. Mark all outputs as Foundation Draft v0.1.                                         |
| Director authority beyond leadership review (item 12) | Reference Director only for confirmed Leadership Review co-facilitation role.                                                   |
| Exact tool names for HR and EOD systems (item 13)     | Do not name HR or EOD tools until confirmed by Mayurika.                                                                        |

---

## Confidentiality

- Default to process-level and aggregate information only
- No individually identifiable sensitive HR data
- No salary or compensation data
- No disciplinary case personal details
- No health or medical information
- No grievance case details
- No raw PDPA personal data
- No individual AXIOM band placement for named staff
- All outputs are company property (SRC-POLICY-001 §11.0)

---

## Status

**DRAFT — Foundation Draft v0.1. Not for operational use until Varmen review and sign-off is complete.**
