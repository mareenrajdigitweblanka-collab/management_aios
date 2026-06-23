---
name: policy-conflict-check
type: validation
created: 2026-06-23
source-id: SRC-POLICY-001
compared-against: CLAUDE.md, context/hr-operations-context.md, context/recruitment-context.md, context/kpi-axiom-context.md, context/confidentiality-rules.md, context/verify-register.md
status: PASS — no conflicts found
---

# Policy Conflict Check

Comparison of SRC-POLICY-001 against existing AIOS content.

**Pass/Fail Rule:** PASS if no policy claim conflicts with a confirmed existing source without Varmen resolution. FAIL if a policy claim contradicts a CONFIRMED source claim and no resolution is recorded.

---

## Conflict Check Table

| Policy Area | Policy Claim (SRC-POLICY-001) | Existing Claim | Existing Source ID | Result | Recommended Action |
|-------------|-------------------------------|----------------|--------------------|--------|--------------------|
| Salary confidentiality | Employees must not share or discuss salary, bonuses, or allowances with other employees (§2.0) | Salary and compensation data is out of scope for this AIOS at all times | SRC-VAR-001 | **Match** — policy states the employee-facing rule; AIOS rule governs what the system stores. Consistent. | Add SRC-POLICY-001 as corroborating source in confidentiality-rules.md |
| Termination during probation | Either party may terminate during evaluation/probationary period (§2.1) | Month 1–6 review framework; "Concern" at Month 1 may lead to discontinuation subject to management review and approval | SRC-SUMAN-001-v2 | **Match** — policy adds mutual termination right; existing content covers performance-based discontinuation. Consistent. | Add to CLAUDE.md §10 Company Policy Context |
| Payment on termination | Voluntary resignation: no additional payment. Company-initiated: payment for days worked (§2.2) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Onboarding process | Pre-employment requirements, orientation, training and support, probation and feedback (§3.0) | Onboarding gaps as AIOS problem area; Month 1–6 review framework (§1, §8 CLAUDE.md) | SRC-VAR-001, SRC-SUMAN-001-v2 | **Match** — policy confirms structured onboarding process and probation feedback loop | Add SRC-POLICY-001 as additional source for onboarding domain in §4 |
| Mandatory AI onboarding | All new hires must complete AI tool training during onboarding (§17.0) | AI Familiarity in 8-point screening criteria | SRC-SUMAN-001-v2 | **Match and extends** — policy formalises AI training as an onboarding obligation | Add to CLAUDE.md §10 Company Policy Context |
| No-gossip and constructive communication | Prohibited gossip behaviors; feedback channels including Critique Meetings and written feedback to Company Director (§4.0–4.1) | Critic Meetings co-facilitated by Mayurika, Muguntha, and Jefri (§9.5 CLAUDE.md) | SRC-MAYU-001 | **Match** — policy spells it "Critique Meetings"; existing content uses "Critic Meetings". Same process; spelling variant noted. New: formal conduct rules and Director escalation channel added. | Note spelling variant (Critique/Critic). Add conduct framework to §10 |
| Late arrival policy | 2 allowable late instances per month; pay deduction schedule for excess (§5.0) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Leave policy — general | 48-hour advance notice; 12% staff cap; team leave limits (max 2 members, or 1 for CST/Content writing/Postage teams); medical/sick leave only for hospitalised conditions with reports (§6.1) | [VERIFY] item 12 — no dedicated leave policy source | SRC-VAR-001 (problem area only) | **VERIFY RESOLVED** — SRC-POLICY-001 §6.0–6.5 provides the full leave framework | Remove [VERIFY] item 12; add leave policy to CLAUDE.md and hr-operations-context.md |
| Leave plan notice periods | 3 days: 1-week notice; 4–7 days: 4-week notice; 7–12 days: 8-week + HR approval; 13–14 days: 3-month + Manager approval (§6.1) | [VERIFY] item 12 | None | **VERIFY RESOLVED** — direct policy detail | As above |
| No leave during probation | No leave during 3-month probationary period; if urgent, can be taken and recovered within weekdays (§6.2) | Month 1–3 probation review framework; no explicit leave restriction stated | SRC-SUMAN-001-v2 | **New policy detail** — adds specific rule not previously stated | Add to recruitment-context.md and CLAUDE.md §10; cross-reference probation framework |
| Junior/senior leave entitlement | Juniors: 1 day/month; Seniors: 2 days/month (32 days per annum) (§6.2) | [VERIFY] item 12 | None | **VERIFY RESOLVED** — direct policy detail | As above |
| Unplanned leave | 5 unplanned leave days per year; notify HR or supervisor; excess = unauthorised (§6.3) | [VERIFY] item 12 | None | **VERIFY RESOLVED** — direct policy detail | As above |
| Short leave and early-off | Maximum 2 hours per month; 24-hour advance notice + supervisor approval (§6.4) | [VERIFY] item 12 | None | **VERIFY RESOLVED** — direct policy detail | As above |
| Maternity leave | 3 months for 1st or 2nd baby; 30 days prior notice; full pay for full-time employees (§6.5) | [VERIFY] item 12 | None | **VERIFY RESOLVED** — direct policy detail | As above |
| Office phone usage | No phones inside office during working hours; emergency use up to 5 minutes permitted (§7.0) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Headphone usage | Headphones for virtual meetings or audio concentration only (§8.0) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Focus time | Structured focus time blocks; 8:30 AM and 9:00 AM schedules with designated deep work periods (§9.0) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Offboarding — notice period | Employees must provide 2-month (60-day) notice before resigning (§10.1) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Offboarding — immediate resignation | No entitlement to unpaid wages or benefits on short notice (§10.2) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Termination by company | Company provides 2-month notice; immediate termination for gross misconduct (§10.3) | No existing claim on termination procedure | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Exit interview | Exit interview conducted by HR (§10.6) | Mayurika confirmed as HR Officer and record custodian | SRC-MAYU-001 | **Match** — consistent with Mayurika's HR role; exit interview by HR adds new explicit step | Add to CLAUDE.md §10 and hr-operations-context.md |
| Final offboarding checklist | Checklist signed by employee, manager, and HR representative (§10.7) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Digital assets — ownership | All digital assets created during employment are company property (§11.0 §4) | Confidentiality rules: no sensitive data stored | SRC-VAR-001 | **Match and extends** — policy adds intellectual property ownership rule; consistent with confidentiality framework | Add to CLAUDE.md §10 Company Policy Context |
| Digital assets — no unauthorized social media groups | Employees prohibited from creating social media groups implying company association without written management approval (§11.0 §7) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Physical assets | Return all physical assets in good condition on resignation or termination; loss/damage must be reported (§11.2) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Non-solicitation | No outside business relationships with colleagues, clients, or partners without written consent (§12.0) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Code of conduct | Act in best interest of company; use designated communication tools; adhere to protocols (§13.0) | No existing claim at policy level | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Confidentiality policy | Protect staff personal data, customer data, company information, financial records, and proprietary details (§14.0) | No individually identifiable HR data without MD + HR owner approval; confidentiality rules framework | SRC-VAR-001, SRC-MAYU-001 | **Match** — policy formally confirms existing confidentiality framework at company policy level | Add SRC-POLICY-001 as source in confidentiality-rules.md |
| Time tracking | Daily work hours log required (§15.0) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Hours of work | Minimum 41.5 hours per week (§16.0) | No existing claim | None | **New source-backed policy** | Add to CLAUDE.md §10 Company Policy Context |
| Mandatory AI tools | AI tools mandatory across all departments; daily use required; subteam leader AI toolkits; non-compliance escalation: formal warning → performance impact → escalation to HR (§17.0) | AI Familiarity in 8-point screening; SKILL file compliance | SRC-SUMAN-001-v2, SRC-MAYU-001 | **Match and extends** — policy formalises company-wide AI mandate; consistent with AI screening criteria and skills tracking | Add new domain to §4; add to CLAUDE.md §10 Company Policy Context |
| Policy revisions | Company reserves right to amend policies; employees notified through official channels (§18.0) | No existing claim | None | **New source-backed policy — informational** | Note in CLAUDE.md §10 |

---

## Conflicts Found

**None.** No policy claim contradicts any confirmed existing source.

## Spelling Variant Note

The policy (§4.1) refers to "Critique Meetings" as a feedback channel. Existing AIOS content (SRC-MAYU-001, CLAUDE.md §9.5) consistently uses "Critic Meetings." These refer to the same process. No conflict. Retain "Critic Meetings" as the canonical term per existing source records (SRC-MAYU-001). The policy spelling variant is noted here for traceability.

## Admin Manager Note

The policy does not mention the Admin Manager by name or describe their authority, approval rights, or escalation role. VERIFY items 1–5 (Admin Manager) remain unresolved by this source.

## Escalation Path Note

The policy (§4.1) describes an employee feedback escalation channel to the Company Director. This is a workplace conduct feedback channel, not the HR operational escalation path described in the AIOS. The [VERIFY] items relating to Admin Manager escalation paths (items 4–5) are not resolved by this policy.

---

## Pass/Fail Result

**PASS** — No conflicts between SRC-POLICY-001 and any confirmed existing source. All new policy claims are additive. VERIFY item 12 is directly resolved. All Admin Manager and Arun [VERIFY] items remain unchanged.
