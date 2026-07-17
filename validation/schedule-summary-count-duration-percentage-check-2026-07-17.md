# Validation — Schedule Summary Count & Duration Split Percentages (2026-07-17)

**Feature ID:** schedule-summary-count-duration-percentage
**Requirement source:** User-confirmed requirement, 2026-07-17 (this session)
**Branch:** main
**Scope:** Additive display + one new backend field pair. No leave lifecycle, database,
task-classification, or conflict-logic change.

---

## 1. Confirmed requirement

Add four rows to every Schedule Summary card (Daily / Weekly / Monthly, for all five
members — mayurika, suman, arun, rajiv, paraparan), directly below the existing **Total**
row and before **Tasks used** / **Tasks ignored**:

1. Scheduled Count %
2. Unscheduled Count %
3. Scheduled Duration %
4. Unscheduled Duration %

---

## 2. Confirmed formulas

| Row | Formula |
|-----|---------|
| Scheduled Count % | `scheduled_count / total_count * 100` |
| Unscheduled Count % | `unscheduled_count / total_count * 100` |
| Scheduled Duration % | `scheduled_duration_minutes / total_duration_minutes * 100` |
| Unscheduled Duration % | `unscheduled_duration_minutes / total_duration_minutes * 100` |

Where `total_count = scheduled_count + unscheduled_count` and
`total_duration_minutes = scheduled_duration_minutes + unscheduled_duration_minutes`.

The Unscheduled value is derived as `100 − (part / total × 100)` from the same raw fraction
(not computed independently), so each pair always sums to exactly `100.00` — no 99.99 / 100.01
drift.

---

## 3. Zero-denominator rule

| Condition | Result |
|-----------|--------|
| `total_count == 0` | Scheduled Count % = N/A, Unscheduled Count % = N/A |
| `total_duration_minutes == 0` | Scheduled Duration % = N/A, Unscheduled Duration % = N/A |

Backend returns `null` for these; the frontend renders `null`/`undefined` as `N/A`. A valid
`0.00%` (zero share with a non-zero denominator) is a distinct claim from N/A and is never
collapsed into it.

---

## 4. Decimal format

- Two decimal places, e.g. `59.33%`.
- Exact zero share with a valid denominator: `0.00%`.
- Exact full share: `100.00%`.
- Raw decimal fractions are never shown.
- `N/A` is never converted to `0.00%`.

---

## 5. Display location & order

Rendered by the single shared `renderSummaryStats()` factory in `web-view/index.html`
(one function serves all five member instances and all three report cards). Final row order:

1. Scheduled
2. Unscheduled
3. Total
4. **Scheduled Count %**
5. **Unscheduled Count %**
6. **Scheduled Duration %**
7. **Unscheduled Duration %**
8. Tasks used
9. Tasks ignored
10. Scheduled vs. previous
11. Unscheduled vs. previous
12. Existing leave-deduction rows

The four rows sit inside the existing counts `.msc-summary-group` (below Total, no extra
divider) to avoid an unnecessary blank gap.

---

## 6. Backend fields

| Field | Type | Null when |
|-------|------|-----------|
| `scheduled_count_percentage` | `Optional[float]` | `total_count == 0` |
| `unscheduled_count_percentage` | `Optional[float]` | `total_count == 0` |
| `scheduled_duration_percentage` | `Optional[float]` | `total_duration_minutes == 0` |
| `unscheduled_duration_percentage` | `Optional[float]` | `total_duration_minutes == 0` |

- Count percentages are **new** (2026-07-17): helper `_count_percentages()` in
  `backend/routers/member_schedules.py`, populated in `_aggregate_schedule_period()`, added to
  `DailyScheduleReportOut`, `WeeklyScheduleReportOut`, `MonthlyScheduleReportOut`.
- Duration percentages are **reused** — `scheduled_duration_percentage` /
  `unscheduled_duration_percentage` already existed (2026-07-14 duration reporting), already
  two-decimal floats, already `null` on a zero denominator. They exactly match the confirmed
  formula and N/A behavior, so no duplicate calculation was introduced; the frontend simply
  now displays them.
- The pre-existing whole-number `scheduled_percentage` / `unscheduled_percentage` fields
  (which return `0` on a zero denominator) are **untouched** and remain unused by the renderer.

All percentages are computed **backend-side**; the frontend performs no percentage arithmetic
and reads no leave field to produce them.

---

## 7. Leave-denominator exclusion

The four percentages use `total_count` and `total_duration_minutes` only. None of the
following is ever used as a denominator: `base_leave_deduction_reference_minutes`,
`active_leave_minutes`, `adjusted_expected_work_minutes`, task coverage of adjusted reference,
or any expected-working-minutes figure. Test `test_count_percentages_independent_of_duration`
and `test_count_distinct_from_whole_number_helper_on_zero` guard this boundary; the leave rows
render from their own fields, unchanged.

---

## 8. Test results

`python -m unittest discover -s backend/tests` → **167 tests, OK** (0 failures, 0 errors).

New/covered matrix cases:

| # | Case | Expected | Test |
|---|------|----------|------|
| COUNT 1 | Scheduled 3, Unscheduled 1 | 75.00 / 25.00 | `test_count_1_three_one_split` |
| COUNT 2 | Scheduled 0, Unscheduled 3 | 0.00 / 100.00 | `test_count_2_zero_scheduled_all_unscheduled` |
| COUNT 3 | Scheduled 0, Unscheduled 0 | null / null (N/A) | `test_count_3_zero_total_returns_none` |
| COUNT 4 | Scheduled 1, Unscheduled 2 | 33.33 / 66.67 | `test_count_4_one_two_split_rounds_and_sums_to_100` |
| DURATION 5 | 60 min / 30 min | 66.67 / 33.33 | `test_matrix_duration_5_sixty_thirty_split` |
| DURATION 6 | 0 min / 120 min | 0.00 / 100.00 | `test_matrix_duration_6_zero_scheduled_all_unscheduled` |
| DURATION 7 | 0 min / 0 min | null / null (N/A) | `test_12_zero_total_duration_returns_none` |
| MATRIX 8 | Counts exist, no valid durations | count % valid, duration % N/A | `test_count_percentages_independent_of_duration` |
| MATRIX 9 | Leave deduction exists | four percentages unchanged by leave values | boundary tests + helper isolation |
| MATRIX 11 | Existing task metrics | unchanged | full suite green (`test_14…` etc.) |
| MATRIX 12 | All existing tests | pass | 167 OK |

Same helpers feed Daily/Weekly/Monthly via `_aggregate_schedule_period()` (MATRIX 10 — one
calculation path, three report routes).

---

## 9. Frontend static validation

- Each of the four labels appears exactly **once** in the shared renderer (`grep -c` = 1 each).
- Rows appear **below Total** and **before Tasks used**.
- Single shared percentage formatter `formatPercentage()` (generalized from the previously
  unused `formatDurationPercentage()`); used 4× + defined once (grep = 5).
- `null`/`undefined` → `N/A`; numeric → `toFixed(2) + '%'`. N/A never coerced to 0.00%.
- No frontend calculation from leave fields (formatter only formats a backend value).
- Concatenation pattern identical to existing rows; HTML groups remain balanced; responsive
  three/two/one-column card layout untouched (no CSS change).
- Old function name `formatDurationPercentage` fully removed (grep = 0).

Note: Node.js is unavailable on this workstation, so no `node --check` was run; validation is
by pattern/label parity against the pre-existing, already-shipping row template plus live
render verification (§10).

---

## 10. Live validation

_Live results are recorded after deployment in the handover closure file
(`handover/2026-07-17__schedule-summary-count-duration-percentage-closure.md`) and appended
below once the Vercel deploy of this commit is confirmed live._

| Case | Expectation | Result |
|------|-------------|--------|
| A — Daily: Scheduled 0, Unscheduled 3 | Count % 0.00% / 100.00% | _pending live_ |
| B — Daily: total duration 3h59m all Unscheduled | Duration % 0.00% / 100.00% | _pending live_ |
| C — No tasks | all four = N/A | _pending live_ |
| D — Tasks exist, no valid duration | count % valued, duration % N/A | _pending live_ |
| Daily / Weekly / Monthly | same behavior | _pending live_ |
| All five members | rows present | _pending live_ |

---

## 11. Verdict

- Backend fields, formulas, N/A behavior, formatting: **PASS**
- Test suite (167): **PASS**
- Frontend static validation: **PASS**
- Live validation: **pending deploy** (see §10 / closure handover)
- Protected path `member-aios/mayurika-hr/staff-data/` untouched: **PASS**

Overall (pre-deploy): **PASS**, pending live confirmation.
