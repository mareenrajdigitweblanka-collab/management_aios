---
name: review-summary-pdf-reportlab-preflight
type: validation-report
created: 2026-08-06
created-by: Mareenraj (builder)
requirement-id: REQ-CAL-REV-PDF-003
---

# Gate A — ReportLab Pre-Implementation Dependency Preflight (2026-08-06)

## Requirement ID

REQ-CAL-REV-PDF-003.

## Purpose

Execute Gate A of the three-stage ReportLab deployment-validation gate
(`docs/2026-08-06_review-summary-pdf-export-technical-design.md` §5.6, corrected
round 2) — verify, in a throwaway environment outside tracked repository
assets, that a candidate `reportlab` version installs cleanly and generates
valid single-page and multi-page PDF output from fabricated data, before any
application code for the PDF export feature is written.

## Approved design source

- `docs/2026-08-06_review-summary-pdf-export-requirement.md` — REQ-CAL-REV-PDF-003 requirement (38 approved decisions).
- `docs/2026-08-06_review-summary-pdf-export-technical-design.md` §5.6 — the three-stage gate (Gate A / Gate B / Gate C) and the "Final dependency-pin rule" this preflight satisfies.
- `validation/review-summary-pdf-export-design-check-2026-08-06.md` — companion design consistency check.

## Scope of this run

Gate A only. No application endpoint, PDF-generation module, or route was
implemented. No file under `backend/` was modified. `backend/requirements.txt`
was not touched. No PostgreSQL connection was made. No deployment of any kind
occurred. No production employee, reviewer, or summary data was used at any
point — every value in the synthetic test data below is fabricated
("Test Employee", "Test Reviewer", "Test Role", invented dates, invented
filler text).

## Phase 2 — Preflight runtime evidence

| Item | Value |
|---|---|
| Local operating system | Windows 10 Pro (build 10.0.19045), verified via `systeminfo` and Git Bash's `uname -a` (MINGW64_NT-10.0-19045) |
| Local Python executable | `python`/`python3` resolved from `AppData\Local\Python\bin\` (per-user Python install) — confirmed via `where python` |
| Local Python version | 3.14.4 |
| Architecture | AMD64 / 64-bit (`platform.machine()` = `AMD64`, `platform.architecture()` = `('64bit', 'WindowsPE')`) |
| Local pip version (before upgrade) | 26.0.1 |
| Repository-declared Python floor | **Yes — found.** `pyproject.toml` (repo root): `requires-python = ">=3.12"`. This file's own header comment records that it is the actual source Vercel installs dependencies from (added 2026-07-10 after a production `ModuleNotFoundError` traced to Vercel not installing from `backend/requirements.txt` via the `-r` reference) — so this floor is real, in-repo production-runtime evidence, not inferred. |
| Exact Vercel Python interpreter version | **Not found.** No `runtime.txt`, no `.python-version`, no `vercel.json`, and `pyproject.toml`'s `[tool.vercel]` section declares only `entrypoint = "backend.main:app"` — no `pythonVersion` or equivalent pinned interpreter field. |
| Vercel runtime details available in-repo | Partial — the dependency floor (`>=3.12`) and the entrypoint are declared; the exact interpreter version Vercel's Python runtime will actually use at build/execution time is not declared anywhere in this repository. |

**Statement (per task instruction, since exact production interpreter version evidence is absent):** Gate A validates the available local Python environment (3.14.4, which satisfies the repository's declared floor of `>=3.12`) only. Vercel runtime compatibility remains unverified until Gate C.

## Phase 3 — Throwaway environment

- Created via `python -m venv` at a path under the current session's OS temp directory (Claude scratchpad, itself under the current user's `AppData\Local\Temp`), **outside all tracked repository content**.
- Path recorded internally during this session; not reproduced here in full to avoid including the local Windows username unnecessarily in this evidence file, per task instruction. The parent location class was: OS temp directory → session scratchpad → a dedicated `reportlab-preflight-venv` subfolder, created solely for this preflight and deleted at the end of this run (Phase 6 below).
- Packaging tools upgraded inside that environment only:

| Package | Version after upgrade |
|---|---|
| pip | 26.2.1 |
| setuptools | 83.0.0 |
| wheel | 0.47.0 |
| packaging (wheel's own dependency) | 26.3 |

No packaging tool was upgraded in any environment other than this throwaway one.

## Phase 4 — Candidate ReportLab version selection and installation

**Selection method (not assumed from memory or from the design's own illustrative examples):** queried PyPI's JSON API directly (`https://pypi.org/pypi/reportlab/json`) for the live release list, parsed with `packaging.version.Version`, excluded pre-releases, dev-releases, and fully-yanked releases. The most recent qualifying release was `5.0.0`, uploaded 2026-06-18, preceded by 4.5.1 (2026-05-12) and 4.5.0 (2026-04-29) — a normal, non-anomalous release cadence, not a same-day or suspicious release.

**Wheel-compatibility check before installing:** `reportlab==5.0.0`'s PyPI file listing shows a single universal wheel, `reportlab-5.0.0-py3-none-any.whl` (`requires_python: >=3.9,<4`), plus an sdist — no platform-specific build, meaning reportlab's own package is pure Python and imposes no Python-version or OS-specific wheel constraint beyond the `>=3.9,<4` floor, which is looser than and consistent with the repository's own `>=3.12` floor.

**Exact installation command used:**
```
python -m pip install reportlab==5.0.0
```

**Installation result: succeeded**, resolving two transitive dependencies:

| Package | Version | Wheel used |
|---|---|---|
| `reportlab` | **5.0.0** | `reportlab-5.0.0-py3-none-any.whl` |
| `pillow` | 12.3.0 | `pillow-12.3.0-cp314-cp314-win_amd64.whl` (platform/interpreter-specific — this is the one dependency whose wheel availability could differ on a different OS/Python-version target; flagged as a Gate C watch item below) |
| `charset-normalizer` | 3.4.9 | `charset_normalizer-3.4.9-cp314-cp314-win_amd64.whl` |

**Post-install verification:**
```
python -m pip show reportlab
```
→ `Name: reportlab`, `Version: 5.0.0`, `Requires: charset-normalizer, pillow`, `Required-by:` (none).

```
python -c "import reportlab; print(reportlab.Version)"
```
→ `5.0.0`

`backend/requirements.txt` was not opened for writing at any point in this phase — only read, earlier, to confirm no PDF library already existed (unchanged from prior design sessions).

## Phase 5 — Synthetic PDF preflight

A temporary, non-tracked test script (`reportlab_preflight_test.py`, created only inside the same throwaway scratchpad location, deleted in Phase 6) exercised `reportlab.platypus` (`SimpleDocTemplate`, `Paragraph`, `Spacer`, `HRFlowable`) — the same API family the approved technical design (§5.3, §9) specifies for the real implementation — against **entirely fabricated content**:

- Heading: "Management AIOS" / "Employee Review Summary"
- Fictional employee: "Test Employee"
- Fictional reviewer: "Test Reviewer", fictional role: "Test Role"
- Fabricated date: "2026-01-15"
- Three short fabricated summaries, plus one long fabricated summary spanning multiple paragraphs with an explicit mid-paragraph line break and a blank-line paragraph separator, engineered with repeated filler sentences to force pagination

No real employee, reviewer, or summary record — and no data read from `management_aios.staff_review_summaries` or any other table — was loaded, queried, or referenced. No PostgreSQL connection was opened by this script at all.

**Single-page generation result:**

| Check | Result |
|---|---|
| Bytes non-empty | Yes — 2,207 bytes |
| Begins with `%PDF-` | Yes |
| Page count (via `pypdf`) | 1 |
| Generation duration | 0.0089 s |
| Extracted text contains "Management AIOS" | Yes |
| Extracted text contains "Test Employee" | Yes |

**Multi-page generation result:**

| Check | Result |
|---|---|
| Bytes non-empty | Yes — 3,966 bytes |
| Begins with `%PDF-` | Yes |
| Page count (via `pypdf`) | 2 (≥ 2 required — confirmed) |
| Generation duration | 0.0329 s |
| Extracted text contains "Management AIOS" | Yes |
| Extracted text contains "Test Reviewer" | Yes |

Paragraphs and the explicit line break in the fabricated long summary were confirmed present in the extracted text of the multi-page output (not silently dropped or collapsed) — consistent with the approved design's §6 requirement to preserve paragraph/line-break structure via `\n`→`<br/>` conversion before constructing each `Paragraph`.

**Test-only parser used for page-count verification:** `pypdf==6.14.2`, installed into the same throwaway environment only. This is explicitly a **test-only tool for this preflight** — it is not part of the application's PDF-generation design (which produces PDFs, never parses them), was never added to `backend/requirements.txt`, and is not treated as an application dependency of any kind.

**Overall script exit code: 0 (PASS)** — every assertion (both signatures valid, single-page count == 1, multi-page count ≥ 2, both heading/employee/reviewer text extracted correctly) held.

## Phase 6 — Cleanup verification

| Item | Result |
|---|---|
| `single_page_preflight.pdf` | Deleted |
| `multi_page_preflight.pdf` | Deleted |
| `reportlab_preflight_test.py` | Deleted |
| Throwaway virtual environment (`reportlab-preflight-venv`) | Deleted (`rm -rf`), confirmed via directory listing showing the scratchpad directory empty afterward |
| Any generated PDF remaining in the tracked repository | None — confirmed via `git status --short` (only the pre-existing, unrelated untracked roster file present) and a repository-wide search for stray `.pdf`/`reportlab_preflight*` files, which found only the pre-existing, already-tracked `docs/user-guides/Management_AIOS_Calendar_User_Guide_v1.pdf` (unrelated, not created or touched this session) |
| Any temporary script remaining in the tracked repository | None |
| Any dependency installed into the project's own environment | None — `reportlab`, `pillow`, `charset-normalizer`, and `pypdf` exist only inside the now-deleted throwaway virtual environment |
| `backend/requirements.txt` | Unchanged — `git diff --stat backend/requirements.txt` returns no output |
| Application files | Unchanged |

No process held the throwaway environment open at cleanup time; deletion succeeded on the first attempt, no residual artifact remains.

## Confirmations

- Application files changed: **0**.
- Requirements files changed: **0**.
- Database/schema changes: **0**.
- Production data access: **0** — no PostgreSQL connection was opened; no real employee/reviewer/summary content was used anywhere in this run.
- Production writes: **0**.
- Protected path (`member-aios/mayurika-hr/staff-data/`) accessed: **0** — never opened.
- Unrelated roster report (`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md`) accessed: **0** — never opened, modified, or staged.

## Gate A limitations

1. This preflight validates the **local development environment only** (Windows 10, Python 3.14.4, AMD64). It does not and cannot validate the actual Vercel serverless runtime (typically Linux, and possibly a different pinned Python minor version) — that confirmation is Gate C's job, and remains fully unrun as of this report.
2. `pillow` (a transitive dependency of `reportlab`, required for image handling) installed a platform/interpreter-specific wheel (`cp314-win_amd64`) here. Its availability as a prebuilt wheel for whatever exact Python version and OS Vercel's Python runtime actually uses is **not confirmed by this preflight** and is explicitly flagged as a Gate C watch item — a missing prebuilt wheel on the target platform would force a source build, which could fail or behave differently in a serverless build environment even though it succeeded locally.
3. No live browser, no HTTP endpoint, and no FastAPI integration was exercised — this preflight tests the `reportlab` library and generation approach only, in isolation, exactly as designed for Gate A.
4. The PyPI release history query (Phase 4) reflects the state of the public index at the time this preflight ran; it is not a permanent guarantee that `5.0.0` remains the latest non-yanked release at Gate B's later implementation time — if Gate B is performed materially later, re-confirming the latest stable release before pinning is reasonable, though not re-running the full Gate A preflight, provided no other Gate A finding has changed.

## Gate B authorized

**YES.** Gate A's four required checks (candidate version installs cleanly, single-page synthetic PDF valid, multi-page synthetic PDF valid with the required page-count/signature/text assertions, exact version and environment evidence recorded) all passed. Implementation (Gate B) may proceed using the exact verified version: `reportlab==5.0.0`.

## Gate C still required

**Yes — unchanged.** Gate A's PASS authorizes Gate B (implementation) only. Gate C (Vercel preview validation — pinned-dependency install in the actual preview build, function startup, OpenAPI presence, token rejection, `application/pdf` response, headers, empty-result 404, bundle-size/execution-time against the active Vercel project's real limits, browser download walkthrough) has not been run and cannot be run until Gate B produces a working endpoint to deploy to preview.

## Validation-plan normalization

| Gate | Checks |
|---|---|
| Gate A | 4 |
| Gate B | 53 |
| Gate C | 12 |
| **Overall** | **69** |

This reconciles `docs/2026-08-06_review-summary-pdf-export-technical-design.md` §16's 57 numbered checks (4 Gate A preflight + 53 Gate B implementation, tests 1-53 excluding the renumbered Gate A block) plus Gate C's 12-item non-numbered preview checklist, for a full-lifecycle total of 69 discrete checks across all three gates.

## PASS / FAIL

**PASS.**

## One next step

Begin Gate B: pin `reportlab==5.0.0` in `backend/requirements.txt`, implement the in-memory PDF-generation module and the authenticated `/export/pdf` endpoint per the approved technical design, and run the full Gate B automated test suite (tests 1-53) plus existing regression suites — only after that, proceed to Gate C.
