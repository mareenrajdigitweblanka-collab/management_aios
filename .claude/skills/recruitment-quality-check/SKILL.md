---
description: Dry-run recruitment quality completeness checks using source-backed recruitment context. Use only with sample/redacted data before business approval.
disable-model-invocation: true
allowed-tools: Read Grep Glob Write
---

# Skill: /recruitment-quality-check

## What This Skill Wrapper Does

This skill wrapper invokes the draft asset at `skills/recruitment-quality-check.md`.

It does not replace that file. It provides a Claude Code slash command entry point that reads the draft, applies its checklist logic in dry-run mode, and produces a review-ready output for human inspection.

---

## Before Running

Read the following files before processing any input:

1. `skills/recruitment-quality-check.md` — the source-backed draft asset
2. `context/verify-register.md` — confirm which [VERIFY] items are active, in particular item 11 (Line Manager identity in 180-day handover)
3. `evidence/source-register.md` — confirm SRC-SUMAN-001-v2, SRC-MAYU-001, and SRC-POLICY-001 are READY

---

## Operating Mode

**DRY-RUN ONLY. Use only with sample or redacted data.**

This wrapper must not:
- Approve or reject any candidate
- Make probation decisions
- Make discontinuation decisions (subject to management review and approval — SRC-SUMAN-001-v2 §8.8)
- Identify the Line Manager in the 180-day handover [VERIFY — item 11: role holder not identified in SRC-SUMAN-001-v2; confirm with Suman or Varmen before this check can be fully completed]
- Accept or store personal candidate data (names, personal contact details, personal information)
- Finalize escalation paths involving Admin Manager authority [VERIFY — SRC-ADMIN-001 PENDING]
- Invent screening thresholds, scoring criteria, or review timelines beyond what is stated in registered sources
- Automate any recruitment action
- Send messages to candidates or staff on behalf of HR
- Use real individual candidate or employee data without explicit MD and HR owner approval with access controls in place

---

## How to Run

Pass process-level or aggregate recruitment status observations as input. No personal candidate data may be provided.

**Accepted input examples:**
- "Candidate shortlisted; 8-point screen not completed"
- "AI Familiarity criterion not assessed"
- "Interview score recorded as 28/50"
- "Month 1 status: Concern — corrective action plan not yet produced"
- "Month 6 reached; 180-day handover meeting not scheduled"
- "No daily capture entry for last 3 working days"

---

## Output Format

For each recruitment process gap identified, produce one record with all of the following fields:

| Field | Description |
|-------|-------------|
| Stage | Which stage of the recruitment process (e.g., 8-Point Screen, Month 1 Review, 180-Day Handover) |
| Check Item | Which specific check item failed |
| Evidence | What was observed or reported |
| Source Affected | Source ID and section that defines the expected standard |
| Impact | What risk or downstream harm may occur if this gap is not addressed |
| Owner | Who is responsible for this stage (process-level — no personal decisions) |
| [VERIFY] Status | Whether this gap record depends on an unresolved [VERIFY] item |
| Recommended Next Action | What should happen next — by whom, at what stage |

At the end of the output, produce a run summary:

| Summary Field | Value |
|---------------|-------|
| PASS/FAIL | PASS if all gaps trace to registered sources and all [VERIFY] constraints applied; FAIL if any recruitment rule is invented, any [VERIFY] removed, any personal candidate data stored, or any hiring decision made |
| Gaps Found | Count of gaps identified in this run |
| Source IDs Used | List of Source IDs referenced in this run |
| [VERIFY] Items Triggered | List of verify-register.md items that constrained this run's output |
| Safety Check | Confirm no hiring decisions made, no personal data stored, no escalations triggered |
| Next Action | What the human reviewer should do with this output |

---

## [VERIFY] Constraints Active for This Wrapper

The following items from `context/verify-register.md` directly limit what this wrapper may assert:

| [VERIFY] Item | Constraint Applied |
|---------------|--------------------|
| Line Manager identity in 180-day handover (item 11) | Handover attendee check cannot confirm Line Manager identity. Output must flag as [VERIFY] until Suman or Varmen confirms role holder. |
| Admin Manager authority (items 1–5) | No escalation path through Admin Manager may be included in any output. |
| MD-specific requirements (items 6–7) | This skill may change scope after MD review. Mark all outputs as Foundation Draft v0.1. |

---

## Test Output Location

Save all test run outputs under `validation/skill-test-runs/`.

File naming: `recruitment-quality-check-test-YYYY-MM-DD.md`

Do not save test outputs elsewhere.

---

## Confidentiality

- No personal candidate data (names, contact details, personal information)
- No salary negotiation figures
- No health or medical information about candidates
- Process-level and aggregate information only
- All outputs are company property under SRC-POLICY-001 §11.0 and §14.0

---

## Status

**DRAFT — Foundation Draft v0.1. Not for operational use until Varmen review and sign-off is complete. Use only with sample or redacted data before business approval.**
