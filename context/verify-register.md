---
name: verify-register
type: context
created: 2026-06-23
last-updated: 2026-06-30
extracted-from: CLAUDE.md Foundation Draft v0.1 §13
status: ACTIVE — 9 items outstanding; 5 items resolved
---

# [VERIFY] Register

All unresolved [VERIFY] items extracted from CLAUDE.md Foundation Draft v0.1.

**Rule:** A [VERIFY] tag must not be removed without producing registered source evidence and updating evidence/source-register.md. Removal requires registered source evidence and relevant Management Team/domain owner confirmation. *(Reviewer routing updated 2026-06-26 — see validation/reviewer-model-correction-note.md. Varmen provided initial setup guidance only; ongoing [VERIFY] resolution routes to the relevant domain owner.)*

**Pass/Fail Rule:** PASS if all items in this register match the [VERIFY] items in CLAUDE.md §13 exactly. FAIL if any item is removed without a corresponding source registration and Varmen confirmation.

---

## Register Table

| # | [VERIFY] Item | Affected Section(s) in CLAUDE.md | Source Needed | Reviewer Needed | Status | Next Step |
|---|---------------|----------------------------------|---------------|-----------------|--------|-----------|
| 1 | Admin Manager document | §3 org structure, §5 role boundaries, §7.8 PRC, §13 | SRC-ADMIN-001 | Rajiv (Admin Manager) | PENDING | Obtain Admin Manager documents; place in `intelligence-inbox/raw-stakeholder-documents/admin-manager/`; register as SRC-ADMIN-001 |
| 2 | Admin Manager authority scope | §3, §5, §13 | SRC-ADMIN-001 | Rajiv (Admin Manager) | PENDING | As above |
| 3 | Admin Manager PRC role and authority within PRC | §7.8, §13 | SRC-ADMIN-001 | Rajiv (Admin Manager) | PENDING | As above |
| 4 | Admin Manager approval chains and escalation paths | §3, §13 | SRC-ADMIN-001 | Rajiv (Admin Manager) | PENDING | As above |
| 5 | Final escalation paths (routes through Admin Manager) | §3, §13 | SRC-ADMIN-001 | Rajiv (Admin Manager) | PENDING | As above |
| 6 | MD-specific requirements beyond Varmen relay | §1, §5, §13 | Future MD interview / registered MD source | MD-level authority; relevant Management Team member documents | PENDING | Conduct MD review meeting; document and register findings |
| 7 | Final implementation scope | §1, §13 | MD review meeting completed | Relevant Management Team/domain owner | PENDING | MD review meeting; update CLAUDE.md after sign-off |
| 8 | Director authority beyond leadership review | §5, §13 | Dedicated Director source or interview | Relevant Management Team member | PENDING | Obtain dedicated Director source or conduct interview |
| 9 | Exact tool names for HR and EOD systems | §9.4, §13 | Mayurika confirmation | Mayurika | PENDING | Confirm actual tool names with Mayurika; several listed as (assumed) in SRC-MAYU-001 |

---

## Resolved Items

| # (Original) | [VERIFY] Item | Resolved By | Resolution Date | Resolution Note |
|--------------|---------------|-------------|-----------------|-----------------|
| 12 (original) | Leave policy detail | SRC-POLICY-001 §6.0–6.5 | 2026-06-23 | Full leave framework provided in Final Approved Company Policy Manual. Documented in CLAUDE.md §10.1 and context/hr-operations-context.md §9. |
| 11 (original) | Line Manager identity in 180-day handover | SRC-SUMAN-CONF-002 (supersedes SRC-SUMAN-CONF-001) | 2026-06-30 | Suman clarified (2026-06-30) that the Line Manager role does exist in the 180-day handover and refers to the employee's Team Lead — a role-based attendee, not a fixed named person. Confirmed attendees: Mayurika, Arun, Suman, and the employee's Team Lead (Line Manager). SRC-SUMAN-CONF-002 supersedes SRC-SUMAN-CONF-001 for this claim only. SRC-SUMAN-CONF-001 (2026-06-25) had stated the reference was a typing mistake — that position is superseded; SRC-SUMAN-CONF-001 preserved as historical record. See `evidence/stakeholder-confirmations/suman-line-manager-role-reconfirmation-2026-06-30.md`. |
| 8 (original) | Amazon ACOS threshold wording | SRC-ARUN-CONF-001 | 2026-06-30 | Arun confirmed (2026-06-30): Amazon ACOS threshold is ACOS below 25% / ROAS 4. Source: `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`. Applied in CLAUDE.md §7.3 and context/kpi-axiom-context.md §3. |
| 9 (original) | Operational Manager escalation authority | SRC-ARUN-CONF-001 | 2026-06-30 | Arun confirmed (2026-06-30): Operational Manager may delay or avoid suspension/termination under the escalation policy if the staff member provides a firm commitment with a defined deadline to achieve the required ROI. **Scope limit:** escalation authority only — full PRC membership scope and voting rights remain unconfirmed pending a dedicated Operational Manager source. Applied in CLAUDE.md §7.8 and context/kpi-axiom-context.md §8. |
| 10 (original) | ROI Officer identity / title in review inputs | SRC-ARUN-CONF-001 | 2026-06-30 | Arun confirmed (2026-06-30): Replace "ROI Officer" with "Implementation Officer – Arunraj". Paraparan is the External Auditor. Supersedes VERIFY Resolved Candidate from SRC-MD-SUMAN-001. Applied in CLAUDE.md §7.4 and context/kpi-axiom-context.md §4. |

---

## Admin Manager Blocker Summary

Items 1–5 and the escalation path gap are all blocked by the same root cause: SRC-ADMIN-001 has not been received. The Admin Manager source folder exists but is empty.

**Resolution path:**

1. Obtain Admin Manager documents and/or conduct Admin Manager interview
2. Place documents in `intelligence-inbox/raw-stakeholder-documents/admin-manager/`
3. Register as SRC-ADMIN-001 in `evidence/source-register.md`
4. Update `validation/raw-source-readiness-check.md` — change SRC-ADMIN-001 from PENDING to READY
5. Review and resolve items 1–5 above
6. Update CLAUDE.md §3, §5, §7.8 with confirmed Admin Manager claims
7. Update `validation/claude-source-map.md` with new Admin Manager rows
8. Remove resolved items from `validation/pending-admin-manager-gaps.md`
9. Obtain relevant Management Team/domain owner sign-off before promoting to v0.2

---

## Arun Wording Items Summary

Items 8, 9, and 10 — **RESOLVED 2026-06-30 by SRC-ARUN-CONF-001.** Arun directly confirmed all three items on 2026-06-30. Evidence: `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`. Root propagation applied to CLAUDE.md, context/kpi-axiom-context.md, and evidence/source-register.md.

**Item 9 scope limit preserved:** Operational Manager escalation authority confirmed only — full PRC membership scope and voting rights remain unconfirmed pending a dedicated Operational Manager source. This scope limit is preserved in all root files.

---

## Item Count

| Status | Count |
|--------|-------|
| PENDING | 9 |
| RESOLVED | 5 |
| TOTAL | 14 |

**Note:** Original item 12 (Leave policy detail) resolved by SRC-POLICY-001 on 2026-06-23. Original item 11 (Line Manager identity in 180-day handover) resolved 2026-06-30 by SRC-SUMAN-CONF-002. Original items 8 (Amazon ACOS threshold), 9 (Operational Manager escalation authority), and 10 (ROI Officer identity) resolved 2026-06-30 by SRC-ARUN-CONF-001. Remaining open items renumbered to 8–9 (former items 11–12) in the register table above.

---

## Pass/Fail Result

**PASS — Updated 2026-06-30** — 9 [VERIFY] items remain open. Items 8, 9, and 10 (Arun wording items) resolved 2026-06-30 by SRC-ARUN-CONF-001 — Arun direct confirmation. Item 9 propagated with escalation authority scope limit only; full Operational Manager PRC scope remains unconfirmed. All five resolved items are in the Resolved Items table with history preserved. No items removed without registered source evidence. All 9 remaining open items are correctly tagged.
