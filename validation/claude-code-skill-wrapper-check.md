---
name: claude-code-skill-wrapper-check
type: validation
created: 2026-06-23
last-updated: 2026-06-25
tracks: .claude/skills/ — Claude Code skill wrappers for Tier 1 draft skills
---

# Claude Code Skill Wrapper Check

**Pass/Fail Rule:** PASS if all four wrappers exist, each points to its correct source draft, each enforces dry-run / review-support mode, and each wrapper preserves all active [VERIFY] constraints. FAIL if any wrapper is missing, any wrapper makes decisions, or any [VERIFY] item is removed.

---

## Wrapper Status

| Slash Command | Wrapper Path | Source Draft | Status | Safety Mode | PASS/FAIL |
|---|---|---|---|---|---|
| /management-gap-detection | `.claude/skills/management-gap-detection/SKILL.md` | `skills/management-gap-detection.md` | CREATED | Dry-run / Review-support only | PASS |
| /recruitment-quality-check | `.claude/skills/recruitment-quality-check/SKILL.md` | `skills/recruitment-quality-check.md` | CREATED | Dry-run / Sample or redacted data only | PASS |
| /kpi-axiom-review-support | `.claude/skills/kpi-axiom-review-support/SKILL.md` | `skills/kpi-axiom-review-support.md` | CREATED | Dry-run / Checklist preparation only | PASS |
| /policy-lookup | `.claude/skills/policy-lookup/SKILL.md` | `skills/policy-lookup.md` | CREATED | Dry-run / Process-level reference only | PASS |

---

## Source Draft Preservation Check

| Wrapper | Source Draft Untouched? | Note |
|---------|------------------------|------|
| /management-gap-detection | YES | `skills/management-gap-detection.md` not modified |
| /recruitment-quality-check | YES | `skills/recruitment-quality-check.md` not modified |
| /kpi-axiom-review-support | YES | `skills/kpi-axiom-review-support.md` not modified |
| /policy-lookup | YES | `skills/policy-lookup.md` not modified |

---

## [VERIFY] Constraint Coverage

All 13 active [VERIFY] items from `context/verify-register.md` that are relevant to Tier 1 skills are carried forward into the wrapper files.

| [VERIFY] Item | Wrapper(s) Applying It |
|---------------|------------------------|
| Admin Manager authority scope (items 1–5) | All four wrappers |
| MD-specific requirements (items 6–7) | All four wrappers |
| Amazon ACOS threshold wording (item 8) | /kpi-axiom-review-support |
| Operational Manager PRC membership (item 9) | /kpi-axiom-review-support |
| ROI Officer feedback — role identity (item 10) | /kpi-axiom-review-support |
| Line Manager identity in 180-day handover (item 11) | /recruitment-quality-check |
| Director authority beyond leadership review (item 12) | /management-gap-detection, /policy-lookup |
| Exact tool names for HR and EOD systems (item 13) | /management-gap-detection, /policy-lookup |

---

## Forbidden Actions Check (Per Wrapper)

| Forbidden Action | /management-gap-detection | /recruitment-quality-check | /kpi-axiom-review-support | /policy-lookup |
|-----------------|---|---|---|---|
| Makes HR or management decisions | NO | NO | NO | NO |
| Makes hiring, probation, or discontinuation decisions | NO | NO | NO | NO |
| Assigns AXIOM bands | NO | NO | NO | NO |
| Issues warnings, PIPs, or PRC actions | NO | NO | NO | NO |
| Approves or denies bonus or promotion | NO | NO | NO | NO |
| Gives legal advice | NO | NO | NO | NO |
| Stores sensitive personal data | NO | NO | NO | NO |
| Connects to live HR or management systems | NO | NO | NO | NO |
| Removes [VERIFY] tags | NO | NO | NO | NO |
| Invents policy rules or thresholds | NO | NO | NO | NO |
| Sends messages to staff on behalf of HR | NO | NO | NO | NO |
| Treats Foundation Draft v0.1 as final operational truth | NO | NO | NO | NO |

**Result: NO FORBIDDEN ACTIONS IN ANY WRAPPER — PASS**

---

## Test Output Directory

All skill test run outputs must be saved under `validation/skill-test-runs/`.

| Directory | Status |
|-----------|--------|
| `validation/skill-test-runs/` | CREATED |

---

## How to Run

```text
/management-gap-detection "sample input here"
/recruitment-quality-check "sample input here"
/kpi-axiom-review-support "sample input here"
/policy-lookup "sample input here"
```

**Example inputs for dry-run testing:**

```text
/management-gap-detection "Onboarding checklist not received for new joiner; AI tool training not confirmed"
/recruitment-quality-check "Month 1 status: Concern — corrective action plan not yet produced"
/kpi-axiom-review-support "Website Team ROAS this week: 380% — below 400% threshold"
/policy-lookup "What is the notice period required for a 5-day leave request?"
```

---

## Allowed Tools (Per Wrapper)

All four wrappers restrict tool use to: `Read Grep Glob Write`

No network access, no live system connections, no shell execution.

---

## Overall Result: PASS

| Check | Result |
|-------|--------|
| All four wrappers created | PASS |
| Each wrapper references correct source draft | PASS |
| Source drafts untouched | PASS |
| All [VERIFY] constraints carried forward | PASS |
| No forbidden actions in any wrapper | PASS |
| Test output directory created | PASS |
| All wrappers enforce dry-run safety mode | PASS |
| All wrappers marked Foundation Draft v0.1 | PASS |

**PASS — All four Claude Code skill wrappers are created, source-backed, [VERIFY]-compliant, and within the allowed action scope of Foundation Draft v0.1.**

Skills must not be used operationally until Varmen review and sign-off is complete.

---

## Wrapper Review — MD Discussion Skill Update (2026-06-25)

**Date:** 2026-06-25

**Trigger:** Tier 1 skill drafts updated with SRC-MD-HR-001 and SRC-MD-SUMAN-001 (both Varmen Reviewed 2026-06-25). Wrapper accuracy check required to confirm SKILL.md files still describe the updated skill scope correctly.

| Command | Wrapper Path | Updated? | Reason | Safety Status |
| --- | --- | --- | --- | --- |
| /management-gap-detection | `.claude/skills/management-gap-detection/SKILL.md` | YES | Description and body updated to reflect SRC-MD-HR-001 additions: LLM-queryable documentation compliance (§4.7 new), requirement governance, BGCT/folder consolidation, business logic standards, new employee/project ROI milestone checks. Before Running and [VERIFY] constraints unchanged — still accurate. | PASS |
| /recruitment-quality-check | `.claude/skills/recruitment-quality-check/SKILL.md` | YES | Description and body updated to reflect SRC-MD-SUMAN-001 additions: Suman formal role (Head Hunter, Onboarder, 6-Month Progress ROI Reviewer), OLOS validation (§4.13 new), BGCT compliance (§4.14 new), six-month ROI audit evidence, weekly deliverables, shovel-ready requirement, 14-day pipeline baseline. Before Running section updated to add SRC-MD-SUMAN-001 to the READY check. [VERIFY] constraints unchanged. | PASS |
| /kpi-axiom-review-support | `.claude/skills/kpi-axiom-review-support/SKILL.md` | YES | Description updated from "Arun context" to include SRC-MD-HR-001 and new §14. Body updated to note §14 additions and §14/§15/§16 renumbering. Before Running section updated to add SRC-MD-HR-001 to READY check. Output Format Source ID field updated to reference both SRC-ARUN-001 (§4–§13) and SRC-MD-HR-001 (§14). Arun [VERIFY] items 8, 9, 10 constraints unchanged. | PASS |
| /policy-lookup | `.claude/skills/policy-lookup/SKILL.md` | YES | Operating Mode updated with explicit MD governance boundary note: SRC-MD-HR-001 and SRC-MD-SUMAN-001 are not policy sources and are not in scope. Users directed to management-gap-detection and recruitment-quality-check for MD governance queries. No policy rules changed. | PASS |

**Safety Confirmation:**

| Safety Check | Result |
| --- | --- |
| No skill business logic changed | CONFIRMED — only wrapper descriptions, Before Running source lists, and scope notes updated |
| No [VERIFY] tags removed | CONFIRMED — all 13 items preserved; [VERIFY] constraint sections in wrappers unchanged |
| No operational approval language added | CONFIRMED — all wrappers remain dry-run / review-support only |
| No sensitive personal data allowed | CONFIRMED — confidentiality sections unchanged in all wrappers |
| No automation added | CONFIRMED — no tool connections or automation logic added |
| Dry-run / review-support boundary preserved | CONFIRMED — Operating Mode sections unchanged in management-gap-detection, recruitment-quality-check, kpi-axiom-review-support; policy-lookup boundary strengthened |

**Dry-run required:** YES — wrapper content changed. Dry-run must be repeated before operational use.

---

## Next Step

1. Varmen reviews all four wrappers and their source drafts
2. Varmen reviews `validation/tier-1-wrapper-md-update-report.md`
3. Run dry-run tests using sample inputs; save outputs under `validation/skill-test-runs/`
4. Confirm wrapper behaviour matches draft asset intent
5. Do not promote to operational use until Varmen sign-off and all active [VERIFY] items affecting operational scope are resolved
