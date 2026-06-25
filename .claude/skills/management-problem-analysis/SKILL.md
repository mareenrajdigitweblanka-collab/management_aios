---
description: Dry-run Management Problem Analysis using source-backed Management AIOS context. Use only to analyze one management problem, identify evidence found/missing, check VERIFY limits, route to reviewer, and prepare safe next action. Does not make decisions or approve escalation.
disable-model-invocation: true
allowed-tools: Read Grep Glob Write
---

# Management Problem Analysis Wrapper

## Operating Mode

Dry-run / review-support only.

This wrapper invokes the source-backed draft skill:

skills/management-problem-analysis.md

It must read:
- skills/management-problem-analysis.md
- validation/management-problem-analysis-source-map.md
- validation/management-problem-analysis-readiness.md
- context/verify-register.md
- evidence/source-register.md

## Allowed Use

Use this command to:
- analyze one redacted management problem
- identify affected domain
- identify evidence found
- identify evidence missing
- check [VERIFY] limits
- classify problem type
- identify likely reviewer
- suggest safe next action
- create a closure note

## Forbidden Use

Do not:
- make final decisions
- approve escalation
- assign blame
- make HR decisions
- make recruitment decisions
- make KPI, bonus, warning, or PIP decisions
- finalize Admin Manager authority
- finalize Arun wording
- use pending sources as evidence
- use sensitive personal data
- send messages
- automate actions

## Required Output

Every output must include:
- Problem Title
- Problem Statement
- Affected Domain
- Problem Type
- Source IDs Used
- Evidence Found
- Evidence Missing
- Root Cause Hypothesis, clearly marked as hypothesis
- Risk Level: LOW / MEDIUM / HIGH
- Reviewer Needed
- [VERIFY] Limits
- Forbidden Decisions Avoided
- Safe Recommended Next Action
- Pass/Fail Rule
- Closure Note

## Evidence Save Rule

Save dry-run outputs only under:

validation/skill-test-runs/

## Pass/Fail Rule

PASS if the wrapper produces source-backed analysis only and avoids decisions.
FAIL if the wrapper makes a decision, assigns blame, approves escalation, removes [VERIFY], or uses sensitive data.
