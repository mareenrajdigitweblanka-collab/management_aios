---
description: Dry-run lookup of final approved company policy source for process-level explanation. Does not provide legal advice or HR decisions.
disable-model-invocation: true
allowed-tools: Read Grep Glob Write
---

# Skill: /policy-lookup

## What This Skill Wrapper Does

This skill wrapper invokes the draft asset at `skills/policy-lookup.md`.

It does not replace that file. It provides a Claude Code slash command entry point that reads the draft and produces process-level policy explanations drawn from SRC-POLICY-001 (Final Approved Company Policy Manual, Varmen reviewed).

---

## Before Running

Read the following files before processing any input:

1. `skills/policy-lookup.md` — the source-backed draft asset
2. `evidence/source-register.md` — confirm SRC-POLICY-001 status is READY — Final Approved before answering any policy question
3. `context/verify-register.md` — confirm which [VERIFY] items are active

Do not answer any policy question if SRC-POLICY-001 is not confirmed READY in `evidence/source-register.md`.

---

## Operating Mode

**DRY-RUN / PROCESS-LEVEL REFERENCE ONLY.**

This wrapper must not:
- Give legal advice of any kind
- Make disciplinary decisions or recommend specific disciplinary outcomes for named employees
- Approve or deny leave requests
- Confirm or deny individual employee conduct cases
- Expose personal employee data, case files, or individual HR records
- Override HR or management decisions
- Resolve [VERIFY] items
- Invent policy rules, thresholds, or entitlements not present in SRC-POLICY-001
- Send policy communications to staff on behalf of HR or management
- Apply policy to named individuals — all explanations are process-level only
- Finalize escalation paths involving Admin Manager authority [VERIFY — SRC-ADMIN-001 PENDING]

---

## How to Run

Pass a policy topic question as input. Reference process-level or aggregate scenarios only. No individual personal HR cases may be provided.

**Accepted input examples:**
- "What is the leave notice period for a 5-day leave request?"
- "Is AI tool use mandatory for all staff?"
- "What happens to login credentials when an employee resigns?"
- "What is the late arrival deduction rule?"
- "How many unplanned leave days are permitted per year?"

---

## Output Format

For each policy lookup, produce a record with all of the following fields:

| Field | Description |
|-------|-------------|
| Policy Topic | The policy area being looked up |
| Source Section | SRC-POLICY-001 section number |
| Plain-Language Explanation | What the policy says in clear terms |
| What Is Allowed | What is permitted under this policy |
| What Is Not Allowed | What is prohibited under this policy |
| Reviewer Needed | Who holds decision authority for this area |
| [VERIFY] | Whether any aspect of this policy record depends on an unresolved [VERIFY] item |

At the end of the output, produce a run summary:

| Summary Field | Value |
|---------------|-------|
| PASS/FAIL | PASS if all policy content traces to SRC-POLICY-001 and all [VERIFY] constraints applied; FAIL if any policy rule is invented, any [VERIFY] removed, any HR decision made, or any personal data exposed |
| Policy Topic Answered | Name of the policy area looked up |
| Source Section | SRC-POLICY-001 section referenced |
| Allowed / Not Allowed | Brief restatement of the core rule |
| Reviewer Needed | Role with decision authority for this topic |
| [VERIFY] Triggered | Any verify-register.md items that constrained this run's output |
| Safety Check | Confirm no legal advice given, no HR decisions made, no personal data exposed |
| Next Action | What the human reviewer should do with this output (e.g., route to Mayurika for leave compliance question; confirm with management for conduct question) |

---

## [VERIFY] Constraints Active for This Wrapper

The following items from `context/verify-register.md` directly limit what this wrapper may assert:

| [VERIFY] Item | Constraint Applied |
|---------------|--------------------|
| Admin Manager authority and escalation paths (items 1–5) | No escalation path through Admin Manager may be explained or confirmed in any output. |
| MD-specific requirements (items 6–7) | Mark all outputs as Foundation Draft v0.1. |
| Director authority beyond leadership review (item 12) | Reference Director only for confirmed Leadership Review co-facilitation role (SRC-MAYU-001). |
| Exact tool names for HR and EOD systems (item 13) | Do not state HR or EOD tool names by name until confirmed with Mayurika. |

---

## Test Output Location

Save all test run outputs under `validation/skill-test-runs/`.

File naming: `policy-lookup-test-YYYY-MM-DD.md`

Do not save test outputs elsewhere.

---

## Confidentiality

- No individually identifiable employee data
- No salary or compensation data (salary confidentiality — SRC-POLICY-001 §2.0)
- No disciplinary case personal details
- No health or medical information
- No grievance case specifics
- All outputs are company property under SRC-POLICY-001 §11.0 and §14.0
- Do not input sensitive customer, financial, or personal information into AI tools when using this skill (SRC-POLICY-001 §17.0)

---

## Status

**DRAFT — Foundation Draft v0.1. Not for operational use until Varmen review and sign-off is complete. Outputs are for information and reference only — they do not constitute HR advice, legal advice, or management decisions.**
