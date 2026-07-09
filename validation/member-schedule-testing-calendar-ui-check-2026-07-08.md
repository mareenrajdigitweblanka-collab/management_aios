---
name: member-schedule-testing-calendar-ui-check
type: validation
created: 2026-07-08
created-by: Mareenraj (builder)
status: AMBER — TESTING UI ONLY
supersedes-in-part: validation/member-schedule-placeholder-ui-check-2026-07-08.md
---

# Validation — Member Schedule Testing Calendar UI Check (Arun, Rajiv, Suman)

## A. Purpose

Expand the earlier small placeholder cards for Arun (Implementation Officer), Rajiv (Admin Manager), and
Suman (Recruiting Officer) into a full calendar-style UI matching the visual pattern of Mayurika's HR
Schedule Pilot (month-view grid, colour legend, priority preview area, safety footer, collapsed technical
details). This is strictly a **testing / sample data** build — it does not introduce any confirmed schedule
facts for any of the three members.

## B. User Clarification

The user clarified that the previous small placeholder style (a single text card reading "Schedule Calendar
— Pending Confirmation") was not sufficient. The instruction was: "Other team members should be same as
Mayurika. This is for testing now. Real data will come in the future." This build responds to that
clarification by matching Mayurika's visual layout while keeping all displayed data as generic,
non-attributable sample entries.

## C. Files Changed

| File | Change |
|---|---|
| `web-view/index.html` | Suman, Arun, and Rajiv "Schedule Calendar" sections replaced — expanded from single placeholder cards into full testing calendar UI (month-view grid + priority preview area), matching Mayurika's HR Schedule Pilot visual pattern |
| `validation/member-schedule-testing-calendar-ui-check-2026-07-08.md` | This file — created |
| `handover/2026-06-30__web-view-dashboard-closure.md` | Correction note appended recording the change from placeholder to testing calendar UI |

No new CSS was added — all sections reuse existing HR Schedule Pilot classes
(`hr-cal-header`, `hr-chip` family, `hr-table-card`, `hr-cal-legend`, `hr-cal-month*`, `hr-cal-footer`).

## D. What Was Changed From Placeholder to Testing Calendar UI

For each of Suman, Arun, and Rajiv, the previous single-card placeholder (from
`validation/member-schedule-placeholder-ui-check-2026-07-08.md`) was replaced with:

1. **Header card** — member name/role, three status chips ("Testing Preview Only", "Sample Data", "Real Data
   Pending Confirmation"), and the required plain-English explanation sentence.
2. **Month View — Sample Layout** — a full 5-week calendar grid (same visual structure as Mayurika's Month
   View card: day headers, day numbers, "today" marker, coloured chips), populated only with generic sample
   labels: "Sample Task", "Sample Review", "Sample Follow-up", "Sample Planning". No clock times, no real
   meeting names, no real staff or candidate names.
3. **Priority Preview — Sample** — a card mirroring the HR pilot's "Priority Queue" card, with table markup
   intentionally omitted (text explanation only) and explicitly marked as reserved for future use once real
   data is confirmed.
4. **Safety footer** — states this is a static testing preview, sample data, no calendar connection, no
   automation, no live editing.
5. **Collapsed "Technical details" block** — contains only the path to this validation file. No source IDs,
   evidence paths, commit hashes, or PASS/AMBER audit text appear in the main visible UI.

**Rajiv's section additionally includes**, visibly (not collapsed, as a safety-critical disclaimer): "This
does not confirm Admin Manager approval, escalation, or authority rules." This sentence appears in the
header card, in the month-view explanation text, in the priority preview text, in the closing paragraph, and
in the safety footer.

## E. Confirmation That All Data Is Sample/Testing Only

- All calendar chip labels are limited to exactly four generic terms: "Sample Task", "Sample Review",
  "Sample Follow-up", "Sample Planning" — used identically in all three members' calendars, with no
  member-specific real content.
- No clock times are shown (unlike the HR pilot's unconfirmed reference chips, which still carried
  MD-screenshot-derived times) — this build uses labels only, to avoid any appearance of a real scheduled
  time.
- No real staff names, candidate names, customer names, or policy/authority wording appear anywhere in the
  three sections.
- The day-number grid (28 through 1, spanning a generic 5-week month) is a layout structure only, matching
  the pre-existing HR pilot's generic month-grid pattern — it does not represent any confirmed date for any
  real event.
- Each section repeats the phrase "for UI testing only" and "Sample Data" at least twice (header chip and
  body text) to prevent the sample content from being mistaken as confirmed.

## F. Confirmation Real Data Is Pending Future Member/Domain-Owner Confirmation

Each section's header card and closing paragraph state: "This calendar is for UI testing only. Real schedule
data will be added after member/domain-owner confirmation." Per §18 Reviewer Routing Rule, the relevant
domain owners are: Arun (KPI/implementation), Suman (recruitment), and Rajiv (admin, after SRC-ADMIN-001).
No real schedule data can be added until each owner (and Varmen/MD, where applicable) confirms scope in the
same way the HR pilot's MD request was captured and registered as a source.

## G. Duplicate / Parent-Truth Risk

- This build does not create or imply a competing source of truth — no new source was registered, and all
  three sections explicitly and repeatedly state the data is sample/testing only.
- The HR Schedule Pilot remains the only calendar section with any (still unconfirmed) source basis; its own
  status, banner text, and 8 open confirmation items are untouched by this build.
- CLAUDE.md remains canonical root truth. This dashboard change is a UI-testing layer only, consistent with
  the dashboard's existing safety warning ("This web view is not parent AIOS truth. Root CLAUDE.md is
  canonical.").
- Because the visual style is now identical across all four members, there is a readability risk that a
  casual viewer could mistake the sample calendars for confirmed schedules if the chip/header labels were
  removed or ignored — this is mitigated by repeating "Testing Preview Only" / "Sample Data" / "Real Data
  Pending Confirmation" in every section's header, and by the explanatory sentence appearing at both the top
  and bottom of each section.

## H. Rajiv / Admin Authority Safety Note

Rajiv's section carries the explicit, non-collapsed statement: "This does not confirm Admin Manager
approval, escalation, or authority rules." This exact sentence appears twice (header card and closing
paragraph), plus four further paraphrased authority disclaimers elsewhere in the section (month-view note,
priority-preview note, and safety footer) reinforcing the same point in different wording. SRC-ADMIN-001
remains PENDING and was not registered, edited, or referenced as resolved by this build. No approval right,
escalation authority, PRC role, or final responsibility is implied anywhere in Rajiv's testing calendar.

## I. Pass/Fail Rule

**PASS** if all three sections render the exact required status labels ("Testing Preview Only", "Sample
Data", "Real Data Pending Confirmation") and required explanation sentence, contain only the four approved
generic sample labels with no real names/times/meetings, and no source-register, verify-register,
SRC-ADMIN-001, or HR Schedule Pilot status changes occurred. **FAIL** if any real schedule fact, real name,
real time, source registration, [VERIFY] resolution, or Admin Manager authority implication is found.

Result: **PASS** against this rule — see confirmation checks recorded in the appended handover note for this
task.

## J. Status

**AMBER / TESTING UI ONLY** — this is a UI-style testing build, not an evidence-backed calendar. No real
schedule data exists for Arun, Rajiv, or Suman. Real data pending future member/domain-owner confirmation.
