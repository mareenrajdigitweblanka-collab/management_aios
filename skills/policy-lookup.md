---
name: policy-lookup
type: skill
tier: 1
status: DRAFT — Foundation Draft v0.1
sources: SRC-POLICY-001
context-files: context/confidentiality-rules.md, context/hr-operations-context.md, context/verify-register.md
created: 2026-06-23
owner-for-review: Varmen (validation); Mayurika (operational review after foundation approval)
---

# Skill: Policy Lookup

**Pass/Fail Rule:** PASS if every policy area, rule, threshold, and output field traces to SRC-POLICY-001 and all [VERIFY] tags are preserved. FAIL if any policy rule is invented or inferred beyond what SRC-POLICY-001 states, if any [VERIFY] is removed without registered source evidence, if any HR decision is made, or if any personal employee case data is exposed.

---

## 1. What This Skill Does

*(Source: SRC-POLICY-001 — Final Approved Company Policy Manual, Varmen reviewed)*

This skill supports source-backed lookup and plain-language explanation of confirmed company policy areas drawn from SRC-POLICY-001. It enables questions about policy to be answered with direct reference to the approved policy source, without requiring the original document to be searched manually.

It does not give legal advice. It does not make HR decisions. It does not expose personal employee case details. It does not override management or HR authority.

**Scope boundary — MD governance evidence is not policy:**

SRC-POLICY-001 is the sole policy truth source for this skill. MD discussion sources (SRC-MD-HR-001 and SRC-MD-SUMAN-001), which contain MD-directed operational governance standards (e.g. LLM-queryable documentation standard, 85% specification rule, Task ID standard, OLOS validation requirements), are not company policy documents and are not covered by this skill. Those governance standards are handled by `skills/management-gap-detection.md` and `skills/recruitment-quality-check.md`. Do not query this skill for MD governance requirements — query the appropriate skill instead.

---

## 2. What This Skill Does NOT Do

- Does not give legal advice of any kind
- Does not make disciplinary decisions or recommend disciplinary outcomes
- Does not approve or deny leave requests
- Does not confirm or deny individual employee conduct cases
- Does not expose personal employee data, case files, or individual HR records
- Does not override HR or management decisions
- Does not resolve [VERIFY] items
- Does not invent policy rules, thresholds, or entitlements not in SRC-POLICY-001
- Does not send policy communications to staff on behalf of HR or management
- Does not apply policy to individual named employees
- Does not finalize escalation paths involving Admin Manager authority [VERIFY — SRC-ADMIN-001 PENDING]

---

## 3. Allowed Policy Lookup Areas

The following policy areas may be looked up using this skill. All content is drawn from SRC-POLICY-001 — Final Approved.

| # | Policy Area | Source Section | Status |
|---|-------------|---------------|--------|
| 1 | Salary confidentiality | SRC-POLICY-001 §2.0 | CONFIRMED |
| 2 | General confidentiality obligation | SRC-POLICY-001 §14.0 | CONFIRMED |
| 3 | Digital assets | SRC-POLICY-001 §11.0 | CONFIRMED |
| 4 | Physical assets | SRC-POLICY-001 §11.2 | CONFIRMED |
| 5 | Leave policy (all types) | SRC-POLICY-001 §6.0–6.5 | CONFIRMED |
| 6 | Onboarding and probation | SRC-POLICY-001 §3.0, §17.0 | CONFIRMED |
| 7 | Termination — resignation notice | SRC-POLICY-001 §10.1–10.2 | CONFIRMED |
| 8 | Termination — company-initiated | SRC-POLICY-001 §10.3–10.4 | CONFIRMED |
| 9 | Payment on termination | SRC-POLICY-001 §2.2 | CONFIRMED |
| 10 | Offboarding — credential revocation, exit interview, final checklist | SRC-POLICY-001 §10.5–10.7 | CONFIRMED |
| 11 | Post-departure obligations | SRC-POLICY-001 §10.8 | CONFIRMED |
| 12 | Workplace conduct (no-gossip, feedback channels) | SRC-POLICY-001 §4.0–4.1 | CONFIRMED |
| 13 | Non-solicitation | SRC-POLICY-001 §12.0 | CONFIRMED |
| 14 | Code of conduct | SRC-POLICY-001 §13.0 | CONFIRMED |
| 15 | Mandatory AI tools | SRC-POLICY-001 §17.0 | CONFIRMED |
| 16 | Late arrival | SRC-POLICY-001 §5.0 | CONFIRMED |
| 17 | Office phone usage | SRC-POLICY-001 §7.0 | CONFIRMED |
| 18 | Headphone usage | SRC-POLICY-001 §8.0 | CONFIRMED |
| 19 | Focus time | SRC-POLICY-001 §9.0 | CONFIRMED |
| 20 | Hours of work | SRC-POLICY-001 §16.0 | CONFIRMED |
| 21 | Time tracking | SRC-POLICY-001 §15.0 | CONFIRMED |

---

## 4. Policy Lookup: Full Reference

### 4.1 Salary Confidentiality

*(Source: SRC-POLICY-001 §2.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Employees must not share or discuss their individual salaries, bonuses, or allowances with other employees |
| What is allowed | Discussing your own compensation privately with HR or management as appropriate |
| What is not allowed | Disclosing, comparing, or discussing individual salaries, bonuses, or allowances with colleagues |
| Reviewer needed | HR (Mayurika) for any employee-level action. Management for policy decisions. |
| [VERIFY] | None |

---

### 4.2 General Confidentiality Obligation

*(Source: SRC-POLICY-001 §14.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Employees must protect sensitive information including staff personal data, customer data, company information, financial records, and proprietary details |
| What is allowed | Access to and use of information required for your assigned role |
| What is not allowed | Disclosure, sharing, or use of sensitive information outside of authorised purposes. Failure to comply may result in disciplinary action or legal consequences. |
| Reviewer needed | HR and management for any case-level action |
| [VERIFY] | None |

---

### 4.3 Digital Assets

*(Source: SRC-POLICY-001 §11.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Digital assets are private and confidential; all digital assets created during employment are the sole property of the company |
| What is allowed | Use of digital assets for authorised work purposes only |
| What is not allowed | Disclosure or sharing of digital assets outside authorised personnel; employees cannot claim ownership of digital assets created for the company; no unauthorised social media groups implying company association |
| Reviewer needed | Management for any asset-related action |
| [VERIFY] | None |

---

### 4.4 Physical Assets

*(Source: SRC-POLICY-001 §11.2)*

| Field | Detail |
|-------|--------|
| What is the rule | All physical equipment must be returned in good condition on departure; loss or damage must be reported immediately |
| What is allowed | Use of company physical equipment for authorised work purposes |
| What is not allowed | Retaining company equipment after departure; failing to report damage or loss |
| Reviewer needed | HR and management for departure or incident handling |
| [VERIFY] | None |

---

### 4.5 Leave Policy

*(Source: SRC-POLICY-001 §6.0–6.5)*

#### General Leave Guidelines

| Field | Detail |
|-------|--------|
| Advance notice | Leave must be updated in the leave system at least 48 hours in advance |
| Simultaneous leave cap | Maximum 12% of staff on leave at the same time. Excess is unauthorised leave. |
| Team leave limit | Maximum 2 team members per day (or 1 in CST, Content Writing, and Postage teams) |
| Medical/sick leave | Hospitalised conditions with supporting medical reports only |
| Saturday | No leave coverage available on Saturdays |

#### Leave Plan Notice Periods

| Leave Duration | Notice Required | Approval Level |
|----------------|----------------|----------------|
| 3 days | 1 week | Subteam Leader |
| 4–7 days | 4 weeks | Team Leader |
| 7–12 days | 8 weeks | HR approval |
| 13–14 days | 3 months | Manager approval |

#### Planned Leave Entitlements

| Category | Entitlement | Note |
|----------|-------------|------|
| Probationary period | No leave | If urgent, leave may be taken and recovered within weekdays |
| Junior staff | 1 day per month | — |
| Senior staff | 2 days per month (32 days per annum) | — |

#### Unplanned Leave

| Field | Detail |
|-------|--------|
| Entitlement | 5 unplanned leave days per year |
| Notification | HR or supervisor must be notified as soon as possible |
| Excess | Treated as unauthorised leave; may lead to disciplinary action |

#### Short Leave / Early-Off

| Field | Detail |
|-------|--------|
| Maximum | 2 hours per month |
| Notice required | 24-hour advance notice and supervisor approval |

#### Maternity Leave

| Field | Detail |
|-------|--------|
| Duration | 3 months (applicable to 1st or 2nd baby) |
| Notice | 30 days prior notice required |
| Pay | Full salary for full-time employees |

**What is allowed:** Leave taken within entitlement, with correct notice and approval level.

**What is not allowed:** Leave without required advance notice; simultaneous leave exceeding the 12% cap or team limits; leave during probation without documented justification and recovery; unplanned leave beyond 5 days per year without authorisation; short leave exceeding 2 hours per month without approval.

**Reviewer needed:** HR (Mayurika) for leave compliance and disputes. Subteam Leader, Team Leader, or Manager as required by notice period table.

---

### 4.6 Onboarding and Probation

*(Source: SRC-POLICY-001 §3.0, §17.0)*

| Field | Detail |
|-------|--------|
| Pre-employment | Required documents collected before start date |
| First-day orientation | Team introduction, company culture, key policies |
| Training | Role-specific training with mentor or supervisor support |
| Probation | Defined probation period with regular feedback |
| AI tool training | All new hires must complete AI tool training during onboarding (§17.0 — mandatory) |
| Department change | Employees shifting departments must complete role-specific AI reorientation (§17.0) |
| What is allowed | Onboarding completed in full as described |
| What is not allowed | Starting employment without collecting pre-employment documents; skipping AI tool training during onboarding |
| Reviewer needed | HR (Mayurika) for onboarding compliance |
| [VERIFY] | None |

---

### 4.7 Termination — Resignation

*(Source: SRC-POLICY-001 §10.1–10.2)*

| Field | Detail |
|-------|--------|
| Notice period | 2 months (60 days) required from the employee |
| Immediate resignation | No entitlement to unpaid wages or benefits |
| What is allowed | Resignation with full 2-month notice |
| What is not allowed | Leaving without providing the required notice without accepting the consequential loss of entitlements |
| Reviewer needed | HR and management to confirm notice receipt and process |
| [VERIFY] | None |

---

### 4.8 Termination — Company-Initiated

*(Source: SRC-POLICY-001 §10.3–10.4)*

| Field | Detail |
|-------|--------|
| Standard company notice | 2-month notice provided by company |
| Immediate termination | Without notice for gross misconduct: theft, harassment, fraud, breach of confidentiality, or serious workplace disruption |
| What is allowed | Termination following policy procedures with appropriate notice or documented grounds for immediate termination |
| What is not allowed | Immediate termination without documented gross misconduct grounds |
| Reviewer needed | HR and management. All termination decisions require appropriate human authority — this skill does not make or recommend termination decisions. |
| [VERIFY] | None |

---

### 4.9 Payment on Termination

*(Source: SRC-POLICY-001 §2.2)*

| Field | Detail |
|-------|--------|
| Voluntary resignation | No additional payment |
| Company-initiated | Payment based on days worked |
| What is allowed | Payment per policy |
| What is not allowed | Making or implying specific payment commitments beyond what is stated in policy |
| Reviewer needed | HR and management |
| [VERIFY] | None |

---

### 4.10 Offboarding — Credential Revocation, Exit Interview, Final Checklist

*(Source: SRC-POLICY-001 §10.5–10.7)*

| Field | Detail |
|-------|--------|
| Credential revocation | All critical login credentials revoked promptly on resignation or termination |
| Exit interview | Conducted by HR to confirm return of property, digital assets, and transfer of duties |
| Final checklist | Signed by employee, their manager, and an HR representative |
| What is allowed | Offboarding completed in full following this sequence |
| What is not allowed | Departure without credential revocation; no exit interview conducted; final checklist not completed and signed |
| Reviewer needed | HR (Mayurika) for exit interview and checklist |
| [VERIFY] | None |

---

### 4.11 Post-Departure Obligations

*(Source: SRC-POLICY-001 §10.8)*

| Field | Detail |
|-------|--------|
| Confidentiality | Ongoing confidentiality obligation continues after departure |
| Digital asset access | Former employees prohibited from accessing company digital assets after departure |
| What is allowed | Compliance with post-departure obligations |
| What is not allowed | Accessing company systems or sharing company information after departure |
| Reviewer needed | Management and legal for any post-departure incident |
| [VERIFY] | None |

---

### 4.12 Workplace Conduct

*(Source: SRC-POLICY-001 §4.0–4.1)*

| Field | Detail |
|-------|--------|
| No-gossip policy | Employees must not discuss others' personal or professional lives without consent; must not make negative comments about colleagues or management; must not share unverified rumours |
| Feedback channels | One-on-one discussions; written feedback to the relevant department or supervisor; Critique Meetings; written feedback to the Company Director |
| Constructive criticism | All feedback must be specific, actionable, and focused on work performance or procedures |
| What is allowed | Raising concerns through designated feedback channels |
| What is not allowed | Gossip, rumour-sharing, or negative commentary about colleagues or management |
| Reviewer needed | HR and management for any conduct issue |
| [VERIFY] | None |

---

### 4.13 Non-Solicitation

*(Source: SRC-POLICY-001 §12.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Employees must not engage in outside business relationships with colleagues, clients, or partners without written consent from the company |
| What is allowed | With written company consent |
| What is not allowed | Outside business relationships with company colleagues, clients, or partners without written consent |
| Reviewer needed | Management and HR |
| [VERIFY] | None |

---

### 4.14 Code of Conduct

*(Source: SRC-POLICY-001 §13.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Employees must act in the company's best interest and use designated communication tools |
| What is allowed | Acting in the company's best interest; using designated tools for work communication |
| What is not allowed | Acting against company interest; using non-designated communication channels for company business |
| Reviewer needed | Management and HR for any conduct issue |
| [VERIFY] | None |

---

### 4.15 Mandatory AI Tools

*(Source: SRC-POLICY-001 §17.0)*

| Field | Detail |
|-------|--------|
| Mandatory use | AI tools are mandatory across all departments and roles; daily use is required and monitored |
| Performance review impact | AI inactivity negatively impacts performance reviews |
| Onboarding requirement | All new hires must complete AI tool training during onboarding |
| Department change | Role-specific AI reorientation required on department shift |
| Subteam leader responsibility | Each subteam leader maintains a standardised AI toolkit and ensures staff competency |
| Monthly contribution | At least one AI-based contribution or efficiency gain per month must be reported |
| Data restriction | Do not input sensitive customer, financial, or personal information into AI tools |
| Non-compliance escalation | Formal warning → Performance impact → Escalation to HR with potential removal from key responsibilities |
| What is allowed | Daily AI tool use for work tasks, within the data restriction rules |
| What is not allowed | AI inactivity; inputting sensitive data into AI tools; failing to complete AI onboarding training; failing to complete AI reorientation on department change |
| Reviewer needed | HR (Mayurika) for compliance tracking; management for escalation decisions |
| [VERIFY] | None |

---

### 4.16 Late Arrival

*(Source: SRC-POLICY-001 §5.0)*

| Field | Detail |
|-------|--------|
| Allowable instances | 2 late arrivals per month |
| Deduction — 15 minutes late | 30-minute pay deduction |
| Deduction — 30–60 minutes late | 4-hour pay deduction |
| 60+ minutes late | May escalate to disciplinary action |
| What is allowed | 2 late arrivals per month within policy |
| What is not allowed | Exceeding 2 late arrivals per month without consequence |
| Reviewer needed | HR for deduction and disciplinary action |
| [VERIFY] | None |

---

### 4.17 Office Phone Usage

*(Source: SRC-POLICY-001 §7.0)*

| Field | Detail |
|-------|--------|
| General rule | No personal phones inside the office during working hours |
| Emergency calls | Up to 5 minutes outside the workspace |
| Social media | Prohibited during work hours |
| What is allowed | Emergency calls outside the workspace within 5-minute limit |
| What is not allowed | Phones inside office; social media during work hours |
| Reviewer needed | Management and HR for any conduct issue |
| [VERIFY] | None |

---

### 4.18 Headphone Usage

*(Source: SRC-POLICY-001 §8.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Headphones permitted for virtual meetings or audio concentration tasks only |
| What is allowed | Headphones for approved use cases |
| What is not allowed | General personal music or entertainment use during work hours |
| Reviewer needed | Management for any conduct issue |
| [VERIFY] | None |

---

### 4.19 Focus Time

*(Source: SRC-POLICY-001 §9.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Structured focus blocks in place at 8:30 AM and 9:00 AM; Skype communication restricted during deep work periods |
| What is allowed | Deep work during designated focus blocks |
| What is not allowed | Non-emergency Skype communication during designated focus time |
| Reviewer needed | Management |
| [VERIFY] | None |

---

### 4.20 Hours of Work

*(Source: SRC-POLICY-001 §16.0)*

| Field | Detail |
|-------|--------|
| Minimum hours | 41.5 hours per week |
| Additional hours | May be required to meet deadlines |
| What is allowed | Meeting minimum hours requirement |
| What is not allowed | Consistently working below 41.5 hours without documented reason |
| Reviewer needed | Management and HR |
| [VERIFY] | None |

---

### 4.21 Time Tracking

*(Source: SRC-POLICY-001 §15.0)*

| Field | Detail |
|-------|--------|
| What is the rule | Employees required to log work hours daily |
| What is allowed | Daily work hour logging |
| What is not allowed | Failure to log work hours daily |
| Reviewer needed | Management for compliance |
| [VERIFY] | None |

---

## 5. Output Format

For each policy lookup, produce a record in the following format:

| Field | Description |
|-------|-------------|
| Policy Topic | The policy area being looked up |
| Source Section | SRC-POLICY-001 section number |
| Plain-Language Explanation | What the policy says in clear terms |
| What Is Allowed | What is permitted under this policy |
| What Is Not Allowed | What is prohibited under this policy |
| Reviewer Needed | Who holds decision authority for this area |
| [VERIFY] | Whether any aspect of this policy record depends on an unresolved [VERIFY] item |

**Outputs are for information and reference only. They do not constitute HR advice, legal advice, or management decisions.**

---

## 6. Forbidden Actions

This skill must not:

- Give legal advice of any kind
- Make disciplinary decisions or recommend specific disciplinary outcomes for named employees
- Expose personal HR case details, individual employee records, or personal data
- Override any HR or management decision
- Apply policy to named individuals — policy explanations are process-level only
- Assert policy rules not in SRC-POLICY-001
- Resolve [VERIFY] items
- Confirm or deny escalation paths through the Admin Manager [VERIFY — SRC-ADMIN-001 PENDING]
- Send communications to employees on behalf of HR or management

---

## 7. [VERIFY] Constraints Active for This Skill

| [VERIFY] Item | Effect on This Skill |
|---------------|---------------------|
| Admin Manager authority and escalation paths (items 1–5) | No escalation path through Admin Manager may be explained or confirmed. |
| MD-specific requirements (items 6–7) | This skill may change scope after MD review. Foundation Draft v0.1 only. |
| Director authority beyond leadership review (item 12) | Only Director responsibilities confirmed by SRC-MAYU-001 may be referenced. |
| Exact tool names for HR and EOD systems (item 13) | HR and EOD tool names may not be stated by name until confirmed with Mayurika. |

---

## 8. Confidentiality Rules Active for This Skill

*(Source: context/confidentiality-rules.md — SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001)*

- No individually identifiable employee data
- No salary or compensation data (salary confidentiality — SRC-POLICY-001 §2.0)
- No disciplinary case personal details
- No health or medical information
- No grievance case specifics
- All outputs are company property under SRC-POLICY-001 §11.0 and §14.0
- Do not input sensitive customer, financial, or personal information into AI tools when using this skill (SRC-POLICY-001 §17.0)

---

## Pass/Fail Result

**DRAFT — CONDITIONAL PASS — Updated 2026-06-25**

All 21 policy lookup areas, rules, thresholds, and output fields trace to SRC-POLICY-001 — Final Approved. All [VERIFY] constraints are preserved and marked. No HR decisions, legal advice, personal data exposure, or invented policy rules included.

**MD discussion source boundary note added (2026-06-25):** §1 updated with scope boundary clarification: SRC-POLICY-001 is sole policy truth; MD governance sources (SRC-MD-HR-001, SRC-MD-SUMAN-001) are not policy and are not covered by this skill. No MD governance content added to policy lookup areas. No policy rules changed.

Safe for Varmen review. Not yet safe for operational use — Foundation Draft v0.1 only.
