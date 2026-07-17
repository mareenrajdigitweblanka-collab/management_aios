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

Verified against the deployed Vercel API (`https://management-aios-api.vercel.app`) and
frontend (`https://management-aios.vercel.app`) for commit `b568803`, 2026-07-17. Health
endpoint returned `{"status":"ok",...}`.

**Backend field presence + computed values (live):**

| Member / period | scheduled / unscheduled / total | Count % (S/U) | Duration % (S/U) |
|-----------------|--------------------------------|---------------|------------------|
| mayurika — daily 2026-07-17 | 15 / 0 / 15 | 100.00 / 0.00 | 100.00 / 0.00 |
| mayurika — weekly 2026-07-13 | 88 / 0 / 88 | 100.00 / 0.00 | 100.00 / 0.00 |
| mayurika — daily 2026-12-25 | 0 / 0 / 0 | **null / null (N/A)** | **null / null (N/A)** |
| suman — monthly 2026-07 | 42 / 0 / 42 | 100.00 / 0.00 | 100.00 / 0.00 |
| arun — monthly 2026-07 | 0 / 0 / 0 | **null / null (N/A)** | **null / null (N/A)** |
| rajiv — monthly 2026-07 | 12 / 0 / 12 | 100.00 / 0.00 | 100.00 / 0.00 |
| paraparan — monthly 2026-07 | **5 / 12 / 17** | **29.41 / 70.59** | **23.02 / 76.98** |

- All four keys present on every daily/weekly/monthly response (all five members). Case
  presence: **PASS**.
- paraparan is a live mixed split: 5/17 → 29.41, 12/17 → 70.59 (sum 100.00); duration 23.02 /
  76.98 (sum 100.00) — confirms live two-decimal rounding, derive-the-second-value, and the
  100.00 sum guarantee on real data.
- Empty periods (mayurika 2026-12-25, arun 2026-07) → all four `null` ⇒ N/A. **Case C: PASS.**

**Requirement example cases:**

| Case | Expectation | Result |
|------|-------------|--------|
| A — Scheduled 0 / Unscheduled N | Count % 0.00% / 100.00% | **PASS by unit test COUNT 2 + live proxy** — no live period had exactly 0 scheduled with tasks present; paraparan (5/12) proves the unscheduled-majority computation live (70.59% unscheduled), and `test_count_2_zero_scheduled_all_unscheduled` proves the exact 0.00 / 100.00 boundary. |
| B — all-Unscheduled duration | Duration % 0.00% / 100.00% | **PASS by unit test DURATION 6 + live proxy** — paraparan duration split 23.02 / 76.98 proves live duration % on mixed data; `test_matrix_duration_6` proves the exact 0.00 / 100.00 boundary. |
| C — No tasks | all four = N/A | **PASS live** (mayurika 2026-12-25, arun 2026-07). |
| D — Tasks exist, no valid duration | count % valued, duration % N/A | **PASS by unit test MATRIX 8** — every live member with tasks had valid durations, so this split did not occur naturally in live data; `test_count_percentages_independent_of_duration` proves count valid + duration N/A. |
| Daily / Weekly / Monthly | same behavior | **PASS live** — verified across daily (mayurika), weekly (mayurika), monthly (suman/arun/rajiv/paraparan). |
| All five members | rows present | **PASS live** — mayurika, suman, arun, rajiv, paraparan all return the four fields. |

**Frontend (live raw HTML, 339 KB):** each of the four labels appears exactly once;
`function formatPercentage` present once; live row order confirmed
Scheduled → Unscheduled → Total → Scheduled Count % → Unscheduled Count % →
Scheduled Duration % → Unscheduled Duration % → Tasks used. **PASS.**

**Disclosure (no silent cap):** live data on 2026-07-17 was all-scheduled or empty for four of
five members; only paraparan had unscheduled tasks. The exact 0.00 / 100.00 boundary (Case A/B)
and the count-valid/duration-N/A boundary (Case D) were therefore confirmed by unit test rather
than by a naturally-occurring live period. No test data was fabricated in the live database to
force these cases.

---

## 11. Verdict

- Backend fields, formulas, N/A behavior, formatting: **PASS**
- Test suite (167): **PASS**
- Frontend static validation: **PASS**
- Live validation (commit `b568803`, five members, daily/weekly/monthly, N/A + mixed split):
  **PASS**
- Protected path `member-aios/mayurika-hr/staff-data/` untouched: **PASS**

Overall: **PASS**.
