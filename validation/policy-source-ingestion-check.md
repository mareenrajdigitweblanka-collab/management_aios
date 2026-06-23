---
name: policy-source-ingestion-check
type: validation
created: 2026-06-23
source-id: SRC-POLICY-001
status: PASS
---

# Policy Source Ingestion Check

## File Found

YES — `intelligence-inbox/raw-stakeholder-documents/company-policy/Draft DIGIT WEB LANKA - Company Policy Manual.md`

## Source Register Updated

YES — SRC-POLICY-001 registered in `evidence/source-register.md` as READY — Final Approved.

## Varman Review Status

Final Approved

## Policy Status

Final Approved

## Policy Areas Detected

The following policy areas were found in the file:

| # | Policy Area | CLAUDE.md Section | New or Confirms Existing? |
|---|-------------|-------------------|--------------------------|
| 1 | Salary Confidentiality — employees prohibited from discussing salaries, bonuses, allowances (§2.0) | §6 Confidentiality | Confirms and extends existing rule |
| 2 | Termination during probation — either party may terminate; payment terms on resignation vs company-initiated (§2.1–2.2) | New | New source-backed policy |
| 3 | Onboarding Policy — pre-employment requirements, orientation, training, probation and feedback (§3.0) | §4 Domains, §8 Recruitment | Confirms existing domain |
| 4 | Mandatory AI onboarding for new hires (§17.0) | §8 Recruitment | New — adds AI onboarding obligation |
| 5 | No-Gossip and Constructive Communication — prohibited behaviors; appropriate feedback channels including Critique Meetings and written feedback to Company Director (§4.0–4.1) | §9.5 Critic Meeting | Confirms Critic/Critique Meetings; new conduct framework |
| 6 | Late Arrival Policy — 2 instances/month allowable; pay deduction schedule for excess tardiness (§5.0) | New | New source-backed policy |
| 7 | Leave Policy — 48-hour advance notice; 12% staff limit; team leave limits; medical/sick leave; notice periods by leave duration; no leave during 3-month probation; junior/senior entitlements; 5 unplanned days/year; 2-hour short leave/month; 3-month maternity leave (§6.0–6.5) | [VERIFY] item 12 — RESOLVED | VERIFY RESOLVED — full leave framework provided |
| 8 | Office Phone Usage — no phones inside office during working hours; emergency and accommodation exceptions (§7.0) | New | New source-backed policy |
| 9 | Headphone Usage — limited to virtual meetings or audio concentration tasks (§8.0) | New | New source-backed policy |
| 10 | Focus Time — structured focus blocks; 8:30 AM and 9:00 AM schedules with defined time slots (§9.0) | New | New source-backed policy |
| 11 | Offboarding — 2-month notice for resignation; immediate termination for gross misconduct; credential revocation; exit interview by HR; final checklist signed by employee, manager, and HR (§10.0–10.8) | New | New source-backed policy; HR role confirmed for exit interview |
| 12 | Digital and Physical Assets — work-only use; all created assets are company property; credential revocation on termination; no unauthorized social media groups (§11.0–11.2) | §6 Confidentiality | Confirms and extends confidentiality framework |
| 13 | Non-Solicitation — no outside business relationships without written consent (§12.0) | New | New source-backed policy |
| 14 | Code of Conduct and Ethics — act in company's best interest; use designated communication tools (§13.0) | New | New source-backed policy |
| 15 | Confidentiality Policy — protect staff personal data, customer data, financial records, proprietary details (§14.0) | §6 Confidentiality | Confirms existing confidentiality framework at policy level |
| 16 | Time Tracking and Daily Planners — daily work hours log required (§15.0) | New | New source-backed policy |
| 17 | Hours of Work — minimum 41.5 hours per week (§16.0) | New | New source-backed policy |
| 18 | Mandatory AI Tools — AI is mandatory across all departments; daily use required; subteam AI toolkits; monitoring and escalation for non-compliance (§17.0) | New — AI domain | New source-backed policy |
| 19 | Policy Revisions — company reserves right to amend; employees notified through official channels (§18.0) | New — informational | New source-backed policy |

## Sensitivity Check

Does the policy contain sensitive personal employee data?

**NO** — The policy is process-level and rule-level throughout. It contains no individually identifiable employee data, no salary figures, no disciplinary case details, no health information, and no personal employee records. Safe to ingest at process level.

## Use Decision

**READY** — All policy content is process-level. No sensitive personal data identified. SRC-POLICY-001 registered and source-backed. Varmen reviewed and approved.

## Filename Note

The filename contains "Draft" (`Draft DIGIT WEB LANKA - Company Policy Manual.md`), but Varman has confirmed this is the final reviewed company policy source. The "Draft" label in the filename does not reflect the reviewed status. All references in AIOS files use SRC-POLICY-001 as Final Approved.

## VERIFY Items Resolved

| VERIFY Item | Resolved By |
|-------------|-------------|
| Item 12 — Leave policy detail | SRC-POLICY-001 §6.0–6.5 — comprehensive leave framework directly provided |

## VERIFY Items Not Resolved

Items 1–5 (Admin Manager), 6–7 (MD requirements), 8–10 (Arun wording), 11 (Line Manager identity), 13 (Director authority), 14 (tool names) — none of these are addressed in the policy. All remain [VERIFY].

## Pass/Fail Rule

**PASS** — Policy is registered as SRC-POLICY-001, Varmen-reviewed, Final Approved, and no sensitive personal case details have been copied into context. Policy content traced only at process level. VERIFY item 12 resolved by direct policy evidence.
