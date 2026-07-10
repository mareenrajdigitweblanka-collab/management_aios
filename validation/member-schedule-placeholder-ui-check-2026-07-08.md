---
name: member-schedule-placeholder-ui-check
type: validation
created: 2026-07-08
created-by: Mareenraj (builder)
status: AMBER — PLACEHOLDER ONLY
---

# Validation — Member Schedule Placeholder UI Check (Arun, Rajiv, Suman)

## A. Purpose

Add lightweight, non-technical "Schedule Calendar — Pending Confirmation" placeholder sections to the
`web-view/index.html` dashboard for the three Management AIOS members who do not yet have any schedule
calendar UI: Arun (Implementation Officer), Rajiv (Admin Manager), and Suman (Recruiting Officer). This
mirrors the existing HR Schedule Pilot precedent (Mayurika) at the awareness/placeholder stage only — it
does not replicate the HR pilot's calendar grid, priority queue, or recurring-template content, because no
equivalent source evidence exists yet for these three members.

## B. Source / Discovery Basis

Discovery was performed prior to this build (read-only, no edits) confirming:

- No schedule/calendar files or folders exist for Arun, Rajiv, or Suman anywhere in the repo
  (`schedules/hr/` is the only schedule folder; no `schedules/arun/`, `schedules/rajiv/`, `schedules/suman/`).
- `web-view/index.html`'s only existing schedule/calendar UI is the HR Schedule Pilot section
  (Mayurika-only), which itself states: *"Full Management Team schedule (Arun, Suman, Rajiv, Varmen) is not
  built yet."*
- No source has been registered in `evidence/source-register.md` for any of the three members' schedules.
- SRC-ADMIN-001 remains **PENDING** (unchanged by this task).
- No `[VERIFY]` item was touched or resolved by this task.

This build introduces no new source evidence and creates no schedule facts — it only adds an honest "not
yet confirmed" placeholder, consistent with the discovery findings.

## C. Files Changed

| File | Change |
|---|---|
| `web-view/index.html` | Added 3 placeholder "Schedule Calendar — Pending Confirmation" sections — one each at the end of the Suman Recruitment, Arun Implementation, and Rajiv / Admin Blocked tabs |
| `validation/member-schedule-placeholder-ui-check-2026-07-08.md` | This file — created |

No other files were changed. No files were deleted.

## D. What Was Added

For each of Arun, Rajiv, and Suman, a placeholder section was added using the existing HR Schedule Pilot
CSS classes (`hr-cal-header`, `hr-chip`, `hr-chip-amber`, `hr-chip-scope`, `hr-cal-purpose`, `hr-cal-footer`)
already defined in `web-view/index.html`. No new CSS was required. Each section contains:

- Section title: "Schedule Calendar — Pending Confirmation"
- Member name and role (Arun — Implementation Officer / Rajiv — Admin Manager / Suman — Recruiting Officer)
- Two chips: "Pending Confirmation" (amber) and "Placeholder only" (scope)
- Plain-English body text, verbatim:
  - "Schedule Calendar — Pending Confirmation."
  - "No confirmed schedule data registered yet."
  - "Waiting for member/domain-owner confirmation."
- A static footer note: "Static placeholder only. No dates, times, or meeting details are shown. No
  calendar connection. No editing."
- A collapsed `<details>` block ("Technical details") containing only the path to this validation file — no
  evidence paths, source IDs, commit hashes, PASS/AMBER status, or other technical text appear in the main
  visible UI.

**Rajiv's placeholder additionally includes** an explicit disclaimer directly in the visible card (not
collapsed, because this is a safety-critical clarification, not a technical detail): *"This placeholder does
not imply any Admin Manager authority, approval rights, or escalation authority. Admin Manager authority
remains unconfirmed pending SRC-ADMIN-001."*

## E. What Was Intentionally Not Added

- No real schedule dates, times, meeting names, or recurring blocks for any of the three members.
- No calendar grid, month view, priority queue, or recurring-templates register (these exist only for the
  unconfirmed HR pilot and were not copied over — there is no source basis to do so for these members).
- No source registration in `evidence/source-register.md`.
- No `[VERIFY]` item created, edited, or resolved.
- No change to SRC-ADMIN-001 status (remains PENDING).
- No change to the HR Schedule Pilot's own status (remains
  `HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION` — untouched).
- No visible tables added to the Mayurika HR tab (tab was not touched at all by this task).
- No implication of KPI ownership, approval authority, escalation authority, or final decision-making
  responsibility for any of the three members.
- No new source, evidence, or schedule facts created in any format (markdown, JSON, or otherwise).

## F. Duplicate / Parent-Truth Risk

- These placeholders do not compete with or duplicate any existing source of truth — no schedule register
  exists yet for Arun, Rajiv, or Suman for this to duplicate.
- The HR Schedule Pilot remains the only schedule content with any (unconfirmed) source basis; it is
  untouched and still explicitly scoped "HR only" in its own banner text.
- CLAUDE.md remains canonical root truth; this dashboard change is a navigation/awareness layer addition
  only, consistent with the safety warning already present in the dashboard ("This web view is not parent
  AIOS truth. Root CLAUDE.md is canonical.").
- Rajiv's card explicitly disclaims Admin Manager authority to prevent any reader inferring resolved
  authority from the presence of a schedule placeholder.

## G. Confirmation Still Needed

Before any real schedule data can be added for Arun, Rajiv, or Suman:

1. A registered source must exist for each member's schedule (interview, discussion note, or document),
   analogous to how the HR pilot's MD request was captured and registered.
2. The relevant domain owner (Arun, Rajiv, Suman) and Varmen/MD must confirm scope, categories, ownership,
   and cadence — the same class of open questions the HR pilot lists (8 items still open there).
3. For Rajiv specifically: SRC-ADMIN-001 must be received and registered before any Admin Manager–adjacent
   schedule content (e.g., meeting authority, PRC scheduling) can be shown as fact.
4. Per §18 Reviewer Routing Rule, routing goes to: Arun (KPI/implementation), Suman (recruitment), Rajiv
   (admin, after SRC-ADMIN-001).

## H. Pass/Fail Rule

**PASS** if all three placeholders render with the exact required wording, contain no real schedule facts,
recurring meeting facts, or implied authority, and no source-register, verify-register, or HR Schedule Pilot
status changes occurred. **FAIL** if any schedule fact, date, recurring meeting, source registration,
[VERIFY] resolution, or authority implication is found.

Result: **PASS** against this rule — see confirmation checks recorded in the handover note for this task.

## I. Status

**AMBER / PLACEHOLDER ONLY** — awareness-stage UI only. No confirmed schedule data exists for Arun, Rajiv,
or Suman. Do not treat this build as evidence of any confirmed schedule, meeting cadence, or authority.
