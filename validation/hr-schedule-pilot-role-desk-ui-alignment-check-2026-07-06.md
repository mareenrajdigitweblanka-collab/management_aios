# HR Schedule Pilot — Role Desk UI Alignment Check (2026-07-06)

## 1. Purpose

The user uploaded a reference file, `aios_role_desk_views.html`, and asked that the "HR Schedule Pilot — Internal Calendar Preview" section in `web-view/index.html` be visually aligned to its style — professional card layout, MD/request banner, calendar grid, colour-coded chips, compact legend, priority queue, recurring template reference, member-schedule preview feel, and clear [VERIFY] discipline. Approved scope for this pass is **HR-only** (Mayurika). No full Management Team schedule (Arun, Suman, Rajiv, Varmen) was built.

## 2. Visual reference used

- `aios_role_desk_views.html` (uploaded file) — used strictly as a **UI/style reference**.
- Its sample rows (owners, dates, statuses, member names, priority labels) are illustrative layout data only and were **not** copied into the dashboard as fact. No unverified owners, priorities, task statuses, or member schedules from the reference file were treated as source truth.
- Elements borrowed for style only: dark navy "MD request banner" block, compact colour legend above the calendar grid, priority-queue lane layout (High/Medium/Low), a distinct recurring-template reference panel, and collapsible evidence details.

## 3. What changed

In `web-view/index.html`, inside the existing `#tab-mayurika-hr` panel, the "HR Schedule Pilot — Internal Calendar Preview" section (title unchanged) was extended with:

1. **MD request / HR pilot banner** (`.hr-md-banner`) — navy background matching the reference's banner style. States: source (MD schedule request relayed to Mayurika, 6 July 2026), that scope is HR pilot only, that the full Management Team schedule is not built yet, and that all open fields remain [VERIFY].
2. **Compact colour legend** (`.hr-cal-legend`) — three legend items (HR placeholder task / MD screenshot reference-only / [VERIFY] unresolved field) shown above the weekly calendar grid.
3. **Recurring Template Reference panel** — new block distinct from the existing "MD screenshot reference blocks" panel, pointing to the two real source files:
   - `schedules/hr/recurring-templates/hr-schedule-block-template.md`
   - `schedules/hr/recurring-templates/md-screenshot-recurring-blocks-reference.md`
4. **Evidence / source details block expanded** — now lists the exact paths: `schedules/hr/README.md`, `schedules/hr/mayurika.md`, `schedules/hr/priority-queue.md`, `evidence/stakeholder-confirmations/hr-schedule-pilot-confirmation-request-2026-07-06.md`, plus the existing skeleton/professional-UI validation paths and this new validation file.

The following pieces already existed from the prior "professional calendar-style UI" pass (2026-07-06) and were left unchanged in content, only re-ordered/contextualised by the additions above: header card with AMBER/HR-only/read-only badges, non-functional toolbar mock, Mon–Fri × Morning/Midday/Afternoon/Follow-up event-card grid, "MD screenshot reference blocks — HR applicability [VERIFY]" panel (5 cards matching the confirmed MD calendar screenshot blocks), "Today's Priority Queue" High/Medium/Low lane panel, the 8-item verification checklist panel, and the static-preview safety footer line.

New CSS added (scoped, inside the existing inline `<style>` block, no external stylesheet): `.hr-md-banner`, `.hr-md-banner-icon`, `.hr-cal-legend`, `.hr-cal-legend-item`, `.hr-cal-legend-dot`.

## 4. Files changed

| File | Change |
|---|---|
| `web-view/index.html` | HR Schedule Pilot section extended with banner, legend, recurring-template-reference panel, and expanded evidence details (see §3) |
| `validation/web-view-html-dashboard-check.md` | New section "HR Schedule Pilot Role Desk UI Alignment Check (2026-07-06)" added |
| `handover/2026-06-30__web-view-dashboard-closure.md` | New note "HR Schedule Pilot — Role Desk Views UI Alignment (2026-07-06)" added |
| `validation/hr-schedule-pilot-role-desk-ui-alignment-check-2026-07-06.md` | This file — created |

## 5. HR-only scope check

| Check | Result |
|---|---|
| Section remains Mayurika/HR only | YES — banner text states "Current scope: HR pilot only" |
| Full Management Team schedule built | NO — not built; banner explicitly states it is not built yet |
| `schedules/members/` created | NO |
| Arun/Suman/Rajiv/Varmen schedule files created | NO |
| Section title unchanged | YES — "HR Schedule Pilot — Internal Calendar Preview" |

## 6. Role Desk UI alignment checklist

| Reference element | Present in updated HR Schedule Pilot section? |
|---|---|
| Professional card layout | YES — `.hr-cal-header`, `.hr-priority-panel`, `.hr-verify-panel` cards (pre-existing, retained) |
| MD/request banner style | YES — new `.hr-md-banner` (navy, quote-style, matches reference `md-request-banner`) |
| Calendar month/week grid | YES — Mon–Fri × time-slot grid (pre-existing `.hr-cal-grid`, retained) |
| Colour-coded recurring schedule blocks | YES — `.hr-event-card` variants (default / `.ref` / `.verify`), pre-existing |
| Compact legend | YES — new `.hr-cal-legend` row above the grid |
| Priority queue section | YES — "Today's Priority Queue" High/Medium/Low lanes (pre-existing, retained) |
| Recurring template reference section | YES — new dedicated panel added, distinct from the MD-screenshot-blocks panel |
| Member schedule preview style (visual feel only) | Partially — the existing single-owner (Mayurika) weekly grid mirrors the reference's per-member schedule sample layout at card level; no per-member files created, consistent with HR-only scope |
| Clear [VERIFY] discipline | YES — 8-item checklist panel retained verbatim; every unconfirmed field still tagged `[VERIFY]` |
| Clean table/card mix (not raw tables) | YES — no `<table>` elements in this section; all card/list based |

## 7. [VERIFY] preservation check

- All 8 items in the "Before this becomes ACTIVE, confirm" checklist are unchanged and still open: priority scale, HR schedule categories, recurring-block ownership, interview/session scheduling ownership, CST meaning, durations, edit rights, replace-or-parallel schedule rule.
- MD screenshot reference blocks remain labelled "reference only" / "HR applicability [VERIFY]" for all 5 cards (Merchandising, CST call, Team Leader Review, Technical interviews, Technical sessions).
- No [VERIFY] tag was removed. No new fact was asserted without a tag.

## 8. Dashboard safety scan

Grep run against `web-view/index.html` for forbidden tokens:

```
fetch(  XMLHttpRequest  axios  WebSocket  googleapis  calendar.google  <form  onsubmit  localStorage  sessionStorage  indexedDB
```

Result: **zero matches**. Dashboard remains static HTML/CSS with no forms, no client-side storage, no external API calls, and no automation.

## 9. Blocked files untouched check

Confirmed **not edited**: `CLAUDE.md`, `evidence/source-register.md`, `context/verify-register.md`, `schedules/hr/` (source files), `member-aios/`, `intelligence-inbox/raw-stakeholder-documents/`, `HR.Mayu.Skill.md`, BLOS files, thresholds files, KPI/AXIOM files. No PostgreSQL objects or production database touched (this is a static-file-only change).

`git status --short` at the time of this check showed only the three approved files as modified (`web-view/index.html`, `validation/web-view-html-dashboard-check.md`, `handover/2026-06-30__web-view-dashboard-closure.md`) prior to creation of this new validation file.

## 10. PASS / AMBER result

**PASS** — the HR Schedule Pilot UI now visually aligns with the uploaded Role Desk Views reference style (banner, legend, recurring-template-reference panel, calendar grid, priority queue, verification checklist, evidence details) while HR-only scope, all 8 [VERIFY] items, and read-only/static safety are fully preserved.

**AMBER remains** on the underlying HR Schedule Pilot content until Mayurika and Varmen visually sign off and answer the 8 open HR schedule questions. This UI alignment pass does not resolve any [VERIFY] item.

## 11. Next step

Route this updated section to Mayurika and Varmen for visual sign-off alongside the still-open 8-item confirmation request (`evidence/stakeholder-confirmations/hr-schedule-pilot-confirmation-request-2026-07-06.md`). Do not expand to the full Management Team schedule or create `schedules/members/` until that confirmation is received and separately approved.
