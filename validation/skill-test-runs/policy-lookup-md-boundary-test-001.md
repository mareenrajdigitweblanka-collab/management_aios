---
run-id: policy-lookup-md-boundary-test-001
skill: policy-lookup
skill-version: Foundation Draft v0.1
date: 2026-06-25
mode: DRY-RUN — REVIEW SUPPORT ONLY
input-type: Policy scope boundary question — MD governance vs. company policy distinction
output-location: validation/skill-test-runs/policy-lookup-md-boundary-test-001.md
---

# Policy Lookup — MD Boundary Dry-Run Test 001

**Status: DRY-RUN. No legal advice given. No HR decisions made. No personal case data processed. For human review only.**

---

## Input Question

> "Dry-run only. Explain whether MD governance discussion notes should be treated as company policy. Use SRC-POLICY-001 as policy truth and SRC-MD-HR-001 / SRC-MD-SUMAN-001 only as MD governance evidence. Do not give legal advice, HR decisions, or personal case handling."

---

## Pre-Run Source Check

| Source ID | Required By | Status |
|-----------|------------|--------|
| SRC-POLICY-001 | Sole policy truth source for this skill | READY — Final Approved, Varmen Reviewed |
| SRC-MD-HR-001 | Referenced in this question as MD governance evidence | READY — Varmen Reviewed 2026-06-25 |
| SRC-MD-SUMAN-001 | Referenced in this question as MD governance evidence | READY — Varmen Reviewed 2026-06-25 |

Pre-run check: PASS. SRC-POLICY-001 is READY and is the sole policy truth source. SRC-MD-HR-001 and SRC-MD-SUMAN-001 are READY — both referenced only as MD governance evidence in this output, not as policy sources. This is consistent with the scope boundary in skills/policy-lookup.md §1.

---

## Policy Lookup Record

| Field | Detail |
|-------|--------|
| **Policy Topic** | Are MD governance discussion notes (SRC-MD-HR-001 / SRC-MD-SUMAN-001) company policy? |
| **Source Section** | SRC-POLICY-001 (sole policy truth). SRC-MD-HR-001 and SRC-MD-SUMAN-001 referenced for classification only — not as policy sources. |
| **Plain-Language Explanation** | See full explanation below. |
| **What Is Allowed** | Treating SRC-POLICY-001 as the authoritative company policy source. Using SRC-MD-HR-001 and SRC-MD-SUMAN-001 as MD governance standards that extend operational expectations — not as replacements for or equivalents to company policy. Querying management-gap-detection and recruitment-quality-check skills for MD governance requirements. |
| **What Is Not Allowed** | Treating MD discussion notes as company policy. Applying MD governance requirements using this skill (policy-lookup). Overriding SRC-POLICY-001 with MD discussion note content. Querying this skill for MD governance requirements — use the appropriate skill instead. |
| **Reviewer Needed** | Varmen for any question about the boundary between company policy and MD governance standards. Mayurika for operational application of both. No HR decisions or legal interpretations made here. |
| **[VERIFY] Status** | No active [VERIFY] item directly constrains this policy boundary record. [VERIFY] items 6 and 7 (MD-specific requirements) are active and noted below. |

---

## Plain-Language Explanation

### 1. What SRC-POLICY-001 Is

SRC-POLICY-001 is the Final Approved Company Policy Manual. Varmen reviewed and confirmed this is the authoritative company-wide policy source, despite the filename containing "Draft." It covers:

- Resignation and termination procedures
- Leave entitlements (all types — planned, unplanned, maternity, short leave)
- Onboarding and probation requirements
- Offboarding and credential revocation
- Workplace conduct (no-gossip, feedback channels, non-solicitation)
- Mandatory AI tool requirements
- Late arrival, hours of work, time tracking
- Digital and physical asset ownership and return
- Salary confidentiality
- Post-departure obligations

**SRC-POLICY-001 is the sole truth source for this skill.** All 21 policy lookup areas in this skill draw from it exclusively. When a policy question can be answered from SRC-POLICY-001, the answer is given with direct reference to that source.

---

### 2. What SRC-MD-HR-001 and SRC-MD-SUMAN-001 Are

These are MD discussion note sources — records of discussions between the Managing Director and HR/Recruitment stakeholders, spanning late 2025 to June 2026. They capture:

- MD-directed governance standards (e.g., LLM-queryable documentation standard, 85% specification rule, Task ID standard)
- MD-directed operational expectations for specific roles (e.g., Suman's OLOS validation requirements, weekly recruitment deliverables, 6-month ROI audit)
- MD-directed project and documentation governance (e.g., requirement file metadata, BGCT consolidation, management folder structure)
- MD-directed performance monitoring standards (e.g., new employee ROI milestones at 1-week, 1-month, 3-month)

**These are operational governance standards directed by the MD, not company policy.** They extend and complement SRC-POLICY-001 but are a different category of document.

---

### 3. The Governing Distinction

| Dimension | SRC-POLICY-001 | SRC-MD-HR-001 / SRC-MD-SUMAN-001 |
|-----------|---------------|-----------------------------------|
| **Document type** | Company Policy Manual (formal, company-wide) | MD Discussion Notes (operational governance, role-specific) |
| **Scope** | All staff, all departments — universal rules | MD-directed standards for specific roles and processes |
| **Authority type** | Formal company policy — applies to all employees | MD governance directive — applies to operational processes and role holders |
| **Examples of content** | Leave entitlements, resignation notice, AI tool mandate, exit interview | LLM-queryable documentation standard, weekly deliverables for Suman, OLOS validation, 85% specification rule |
| **Enforcement** | HR and management — through company policy procedures | HR and management — through management governance and review processes |
| **Which skill to query** | This skill (policy-lookup) | management-gap-detection, recruitment-quality-check, kpi-axiom-review-support |

**The short answer to the question:** MD governance discussion notes should **not** be treated as company policy. They are a distinct category — MD-directed operational governance standards — that carry their own authority as operational requirements but are not equivalent to the company-wide policy documented in SRC-POLICY-001.

---

### 4. Why This Distinction Matters in Practice

- **If you treat MD discussion notes as policy:** You may apply role-specific governance standards (such as the LLM-queryable documentation requirement or the 85% specification rule) as if they were universal company policy — which they are not stated as in SRC-POLICY-001. Conversely, you may import company-wide policy obligations (such as resignation notice, leave rules, or termination procedures) from this skill when you should be querying SRC-POLICY-001.

- **If you treat company policy as MD governance:** You risk understating the authority of SRC-POLICY-001. Company policy applies to all staff. MD governance standards apply to specific roles and operational processes.

- **Correct practice:** Use this skill (policy-lookup) for company-wide policy questions referencing SRC-POLICY-001. Use management-gap-detection, recruitment-quality-check, and kpi-axiom-review-support for MD governance standard questions referencing SRC-MD-HR-001 and SRC-MD-SUMAN-001. Do not merge the two categories.

---

### 5. [VERIFY] Note

[VERIFY] items 6 and 7 (MD-specific requirements — CLAUDE.md §14) are active:

> Item 6: MD-specific requirements beyond Varmen relay — pending direct MD review meeting.
> Item 7: Final implementation scope — pending MD review meeting completion.

This means: while the content of SRC-MD-HR-001 and SRC-MD-SUMAN-001 has been registered and Varmen-reviewed (2026-06-25), the full scope of MD governance requirements has not yet been gathered directly from the MD. The governance standards captured in the current sources are conditionally trusted but the AIOS must not be treated as having a complete picture of MD intent until the MD review meeting occurs. This does not change the policy/governance distinction explained above — it means the governance side may grow.

---

### 6. Scope Reminder for This Skill

This skill does not and cannot:
- Give legal advice on the distinction between policy and governance directives
- Confirm whether a specific individual employee is subject to MD governance standards
- Override Varmen's or Mayurika's authority to interpret the practical application of either category
- Determine whether an MD governance standard carries policy-equivalent enforcement weight — that is a management and HR decision

---

## Run Summary

| Summary Field | Value |
|---------------|-------|
| **PASS/FAIL** | **PASS** — All content traces to SRC-POLICY-001 (policy truth), SRC-MD-HR-001, and SRC-MD-SUMAN-001 (governance evidence, referenced for classification only). The policy scope boundary from skills/policy-lookup.md §1 was applied correctly — MD discussion notes were not treated as policy sources within this skill. All [VERIFY] constraints applied. No legal advice, HR decisions, or personal case data included. |
| **Evidence Sources Used** | SRC-POLICY-001 (policy truth); SRC-MD-HR-001 and SRC-MD-SUMAN-001 (referenced for classification only — not as policy sources) |
| **[VERIFY] Items Triggered** | Items 6 and 7 (MD-specific requirements) — noted in §5. Items 1–5 (Admin Manager escalation) — not triggered by this question. Item 12 (Director authority) — not triggered. Item 13 (HR tool names) — not triggered. |
| **Safety Check** | CONFIRMED — No legal advice given. No HR decisions made. No personal employee case data processed. No escalations triggered. No live systems accessed. No [VERIFY] tags removed. All output requires human review before any operational application. |
| **Foundation Draft Status** | This output is produced from Foundation Draft v0.1. The policy/governance distinction explained here is based on current registered sources only. It may require revision after the direct MD review meeting (VERIFY items 6 and 7) is completed. |
| **Next Action** | Human reviewer (Varmen or Mayurika) to review this boundary explanation. If the distinction will be referenced in team briefings or governance communications, Varmen sign-off is required before sharing. Do not apply or distribute this explanation as final operational guidance without human review and approval. |
