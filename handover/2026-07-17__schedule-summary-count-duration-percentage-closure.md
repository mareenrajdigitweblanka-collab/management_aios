# Handover — Schedule Summary Count & Duration Split Percentages (2026-07-17)

**Feature ID:** schedule-summary-count-duration-percentage
**Branch:** main
**Validation evidence:** `validation/schedule-summary-count-duration-percentage-check-2026-07-17.md`

---

## Requirement

Add four rows to every Schedule Summary card (Daily / Weekly / Monthly, for mayurika, suman,
arun, rajiv, paraparan), directly below **Total** and before **Tasks used**:

1. Scheduled Count % = `scheduled_count / total_count * 100`
2. Unscheduled Count % = `unscheduled_count / total_count * 100`
3. Scheduled Duration % = `scheduled_duration_minutes / total_duration_minutes * 100`
4. Unscheduled Duration % = `unscheduled_duration_minutes / total_duration_minutes * 100`

Two decimals (`59.33%`); `0.00%` for a zero share with a valid denominator; `100.00%` for a
full share; **N/A** when the denominator is 0. Percentages describe only the
Scheduled/Unscheduled split — no leave-deduction / adjusted-reference denominator.

---

## Files changed

| File | Change |
|------|--------|
| `backend/routers/member_schedules.py` | New pure helper `_count_percentages()`; populated `scheduled_count_percentage` / `unscheduled_count_percentage` in `_aggregate_schedule_period()`. Duration percentages reused unchanged. |
| `backend/schemas.py` | Added `scheduled_count_percentage` / `unscheduled_count_percentage` (`Optional[float] = None`) to `DailyScheduleReportOut`, `WeeklyScheduleReportOut`, `MonthlyScheduleReportOut`. |
| `web-view/index.html` | Four new rows in shared `renderSummaryStats()` (below Total, above Tasks used); generalized formatter `formatDurationPercentage()` → `formatPercentage()` (was unused); refreshed stale renderer comments. |
| `backend/tests/test_schedule_duration_reports.py` | New `CountPercentageTests` class + two duration-matrix cases; imported `_count_percentages`. |
| `validation/schedule-summary-count-duration-percentage-check-2026-07-17.md` | New validation evidence. |
| `handover/2026-07-17__schedule-summary-count-duration-percentage-closure.md` | This file. |

---

## API fields

Every daily/weekly/monthly report response now carries four nullable float percentage fields:
`scheduled_count_percentage`, `unscheduled_count_percentage`, `scheduled_duration_percentage`,
`unscheduled_duration_percentage`. `null` ⇒ N/A (zero denominator). Count pair is new;
duration pair pre-existed (2026-07-14) and is reused. No existing field renamed or removed.

---

## UI order

Scheduled → Unscheduled → Total → **Scheduled Count %** → **Unscheduled Count %** →
**Scheduled Duration %** → **Unscheduled Duration %** → Tasks used → Tasks ignored →
Scheduled vs. previous → Unscheduled vs. previous → leave-deduction rows.

---

## Tests

`python -m unittest discover -s backend/tests` → **167 tests, OK**. Covers count matrix
(75/25, 0/100, N/A on 0/0, 33.33/66.67), duration matrix (66.67/33.33, 0/100, N/A), count/
duration denominator independence, leave-field isolation, and all pre-existing metrics.

Node.js unavailable on this workstation → no `node --check`; frontend verified by label/pattern
parity plus live render (below).

---

## Deployment

Vercel GitHub auto-deploy on push to `origin/main` (frontend `management-aios`, backend
`management-aios-api`). No CLI deploy, no env/DB change required.

- Commit hash: **<FILLED AT COMMIT — see final report>**
- Push result: **<FILLED AFTER PUSH>**
- Deployment / live result: **<FILLED AFTER DEPLOY — do not claim success until the four rows
  render correctly at https://management-aios.vercel.app/>**

---

## Queryability

This handover + the validation file document the formulas, N/A rule, format, display location,
backend fields, and test/live results in LLM-queryable Markdown (SRC-MD-HR-001 §11.1). A clean
LLM can answer "how is Scheduled Count % computed and when is it N/A?" from these files.

---

## Limitations

- Live DB-backed report responses are validated against the deployed API, not locally (direct
  Neon access hangs at the SSL handshake on this workstation — see
  `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` §7).
- Whole-number `scheduled_percentage`/`unscheduled_percentage` fields remain in the API for
  backward compatibility but are unused by the UI; a future cleanup could remove them after
  confirming no other consumer.

---

## One next step

After the Vercel deploy of this commit is live, open a Daily card with only Unscheduled tasks
and confirm Scheduled Count % = `0.00%` and Unscheduled Count % = `100.00%`, then record the
live results in §10 of the validation file and the Deployment block above.

---

## Verdict

Backend + tests + frontend static: **PASS**. Live: **pending deploy confirmation**.
