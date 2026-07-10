---
name: dashboard-professional-ui-polish-request-2026-07-02
type: stakeholder-confirmation
created: 2026-07-02
last-updated: 2026-07-02
requested-by: User (Varmen unavailable)
status: UI POLISH REQUEST — safe visual improvement approved by user; Varmen visual review still pending
---

# Dashboard Professional UI Polish — Request Record

**Date:** 2026-07-02
**Request source:** User. Varmen is currently unavailable. User approved UI polish work to proceed.
**Type:** UI / visual improvement only

---

## Request Summary

Improve the Management AIOS dashboard UI (`web-view/index.html`) to be professional and best quality — executive-ready and clean. This is visual and design polish only, not a data or truth change.

---

## Scope — Allowed

- Cleaner executive header / topbar
- Better tab bar spacing, hover states, and active tab styling
- Improved card spacing and hover effects
- Improved section grouping and visual hierarchy
- Better status badges with clearer colour differentiation
- Improved table readability (zebra rows, better column headers)
- Better mobile responsiveness
- Consistent typography and scale
- Clear "Preview / Read-only" labels
- Dashboard footer or status note with safety label
- Better empty-state and blocked-state presentation
- Better Document Register visual grouping
- Stronger visual separation between ACTIVE, PREVIEW, AMBER, and BLOCKED states
- New `tab-badge-preview` CSS class (teal/sky) distinct from amber to represent PREVIEW state
- Safety note bar: "Read-only Management AIOS preview. Sensitive HR data, leave records, onboarding records, KPI scores, and staff personal data are not shown."

---

## Boundary — What Is Not Changed

| Boundary | Instruction |
|---|---|
| Operational truth | No new data, no new tables, no new sections beyond what already exists |
| Table scope | No new blocked tables built (Team Table, Leave Requests, Onboarding Tracker, KPI Schedule, Decisions, Attendance Dashboard remain excluded) |
| Sensitive data | No staff names, leave records, HR data, salary, health, PDPA, disciplinary, or candidate data added |
| Blocked sections | Rajiv / Admin remains BLOCKED; no Admin Manager content added |
| Sample data | No Varmen sample HR rows or draft file names used |
| [VERIFY] items | None resolved |
| Source register | evidence/source-register.md not touched |
| Verify register | context/verify-register.md not touched |
| CLAUDE.md | Not touched |

---

## Status

**UI POLISH REQUEST — SAFE**

Visual/UI polish approved by user. Business truth, data governance, and all source/verify registers remain unchanged. Varmen visual review of the updated layout is still pending. No operational content may be promoted to final until Varmen confirms the layout.

---

## Evidence of Request

Conversation record: User instruction 2026-07-02 — "USER UPDATE: Varmen is busy now. User wants a professional and best UI."

---

## Next Step

Commit updated files; redeploy to Netlify. Then route updated dashboard to Varmen for visual layout review when available.
