---
name: verify-register
type: context
created: 2026-06-23
last-updated: 2026-06-23
extracted-from: CLAUDE.md Foundation Draft v0.1 §13
status: ACTIVE — 13 items outstanding; 1 item resolved
---

# [VERIFY] Register

All unresolved [VERIFY] items extracted from CLAUDE.md Foundation Draft v0.1.

**Rule:** A [VERIFY] tag must not be removed without producing registered source evidence and updating evidence/source-register.md. Removal requires Varmen sign-off on each resolved item.

**Pass/Fail Rule:** PASS if all items in this register match the [VERIFY] items in CLAUDE.md §13 exactly. FAIL if any item is removed without a corresponding source registration and Varmen confirmation.

---

## Register Table

| # | [VERIFY] Item | Affected Section(s) in CLAUDE.md | Source Needed | Reviewer Needed | Status | Next Step |
|---|---------------|----------------------------------|---------------|-----------------|--------|-----------|
| 1 | Admin Manager document | §3 org structure, §5 role boundaries, §7.8 PRC, §13 | SRC-ADMIN-001 | Varmen | PENDING | Obtain Admin Manager documents; place in `intelligence-inbox/raw-stakeholder-documents/admin-manager/`; register as SRC-ADMIN-001 |
| 2 | Admin Manager authority scope | §3, §5, §13 | SRC-ADMIN-001 | Varmen | PENDING | As above |
| 3 | Admin Manager PRC role and authority within PRC | §7.8, §13 | SRC-ADMIN-001 | Varmen | PENDING | As above |
| 4 | Admin Manager approval chains and escalation paths | §3, §13 | SRC-ADMIN-001 | Varmen | PENDING | As above |
| 5 | Final escalation paths (routes through Admin Manager) | §3, §13 | SRC-ADMIN-001 | Varmen | PENDING | As above |
| 6 | MD-specific requirements beyond Varmen relay | §1, §5, §13 | Future MD interview / registered MD source | Varmen + MD | PENDING | Conduct MD review meeting; document and register findings |
| 7 | Final implementation scope | §1, §13 | MD review meeting completed | Varmen | PENDING | MD review meeting; update CLAUDE.md after sign-off |
| 8 | Amazon ACOS threshold wording | §7.3, §13 | Arun confirmation | Arun | PENDING | Ask Arun to confirm exact wording and threshold direction; update SRC-ARUN-001 note if confirmed |
| 9 | Operational Manager PRC membership and scope | §3, §7.8, §13 | Arun or dedicated Operational Manager source | Arun | PENDING | Confirm with Arun or obtain dedicated source |
| 10 | ROI Officer identity / title in review inputs | §7.4, §13 | Arun confirmation | Arun | PENDING — VERIFY Resolved Candidate | Confirm with Arun whether "ROI officer" is a distinct role or an existing title. **Candidate resolution:** SRC-MD-SUMAN-001 (07/05/2026) identifies ROI Officers as Arun and Mayurika jointly, with Selva auditing submissions. [VERIFY] tag must remain until Arun directly confirms — see `validation/md-discussion-conflict-check.md` and `validation/pending-md-discussion-source-plan.md`. |
| 12 | Director authority beyond leadership review | §5, §13 | Dedicated Director source or interview | Varmen | PENDING | Obtain dedicated Director source or conduct interview |
| 13 | Exact tool names for HR and EOD systems | §9.4, §13 | Mayurika confirmation | Mayurika | PENDING | Confirm actual tool names with Mayurika; several listed as (assumed) in SRC-MAYU-001 |

---

## Resolved Items

| # (Original) | [VERIFY] Item | Resolved By | Resolution Date | Resolution Note |
|--------------|---------------|-------------|-----------------|-----------------|
| 12 (original) | Leave policy detail | SRC-POLICY-001 §6.0–6.5 | 2026-06-23 | Full leave framework provided in Final Approved Company Policy Manual. Documented in CLAUDE.md §10.1 and context/hr-operations-context.md §9. |
| 11 (original) | Line Manager identity in 180-day handover | SRC-SUMAN-CONF-001 | 2026-06-25 | Suman confirmed the "Line Manager" reference in SRC-SUMAN-001-v2 was a typing mistake. There is no Line Manager role in the 180-day handover. Confirmed attendees are Mayurika, Arun, and Suman only. See evidence/stakeholder-confirmations/suman-line-manager-typing-correction-2026-06-25.md. |

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
9. Obtain Varmen sign-off before promoting to v0.2

---

## Arun Wording Items Summary

Items 8, 9, and 10 require Arun confirmation. These can be resolved by email or direct question and do not require a full document source. Once confirmed:

- Update the inline [VERIFY — Arun] tags in CLAUDE.md
- Update `validation/claude-source-map.md`
- Note the confirmation method (email / verbal / document) in the source register

---

## Item Count

| Status | Count |
|--------|-------|
| PENDING | 12 |
| RESOLVED | 2 |
| TOTAL | 14 |

**Note:** Original item 12 (Leave policy detail) resolved by SRC-POLICY-001 on 2026-06-23. Items 13–14 in the original register renumbered to 12–13 above. Original item 11 (Line Manager identity in 180-day handover) resolved by SRC-SUMAN-CONF-001 on 2026-06-25 — Suman confirmed the reference was a typing mistake; no Line Manager role exists in the handover. Remaining open items renumbered to 11–12 (former items 12–13) in the register table above.

---

## Pass/Fail Result

**PASS — Updated 2026-06-25** — 12 [VERIFY] items remain open. Item 11 (Line Manager identity in 180-day handover) resolved by SRC-SUMAN-CONF-001 on 2026-06-25 — Suman confirmed the reference was a typing mistake. Item 12 (leave policy) resolved by SRC-POLICY-001 on 2026-06-23. Both resolved items moved to the Resolved Items table. No items removed without registered source evidence. All 12 remaining open items are correctly tagged.
