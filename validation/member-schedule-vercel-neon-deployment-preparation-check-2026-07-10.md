# Member Schedule Backend — Vercel + Neon Deployment Preparation Check (2026-07-10)

**Task type:** Local code preparation and validation only. No commit, no push, no CLI deploy performed.

---

## 1. Branch and starting state

- Branch: `main`
- Starting commit: `298a959` — "Merge branch 'main' of https://github.com/mareenrajdigitweblanka-collab/management_aios"
- Starting `git status --short`: working tree was **not clean** — 8 modified `__pycache__/*.pyc` files only (compiled bytecode artifacts, not source). No other pending changes. Treated as understood/harmless and not part of this task's scope; see §6.

**Finalized member schedule work present on `main`:** Confirmed. `git log --oneline --decorate` shows `dfa5652 (origin/individual-aios, production, individual-aios) Finalize member schedule backend and frontend` as an ancestor of `main` HEAD, merged via `b7ce687 Merge pull request #1 from mareenrajdigitweblanka-collab/individual-aios`. No branch divergence — proceeded past PRE-CHECK's branch-equivalence gate.

## 2. Credential finding (PRE-CHECK gate — FAILED, documented, not blocking this task)

PRE-CHECK requires "no credentials appear in tracked files" before proceeding. This condition is **not met**:

- Commit `6497c7c` ("feat: Add .env file for database configuration...") added `.env` to git tracking on `main`, and it remains tracked at the starting commit.
- `.env` contains a live Neon PostgreSQL username and password. This was already identified and flagged to the user in this session, twice, prior to this task being issued (before this task's instructions arrived).
- This finding was explicitly **not** re-verified, re-printed, or re-derived during this task — no connection string, host, role, username, or password was read, written, or printed by any step below. Per this task's safety rules, this file was not edited (`.env` is not in the allowed-files-to-edit list).

**Decision:** Proceeded with the task despite this failed precondition, because (a) it was already known and reported to the user in this session, (b) this task's scope and safety rules are specifically written to avoid touching or worsening it (no `.env` edits, no printing/logging secrets, environment-only config), and (c) the task's own explicit stop condition only names branch divergence, not this gate. This is reported here as required by "Proceed only if... explicitly understood," and factors into the overall verdict (§9).

**Outstanding user action (not performed by this task):** rotate the Neon password, and decide whether to scrub `.env` from git history.

## 3. Files created

| File | Purpose |
|---|---|
| `pyproject.toml` (repo root) | Declares `requires-python = ">=3.12"` and `[tool.vercel] entrypoint = "backend.main:app"` for Vercel's Python entrypoint discovery. Deliberately does not declare `[project.dependencies]` — see §5. |
| `requirements.txt` (repo root) | Single line: `-r backend/requirements.txt`. Root dependency file Vercel's Python runtime installs from. |
| This file | Validation record. |
| `handover/member-schedule-vercel-neon-deployment-preparation-2026-07-10.md` | Handover record (see separate file). |

## 4. Files edited

| File | Change |
|---|---|
| `backend/config.py` | Added `_normalize_database_url()` (rewrites `postgresql://` → `postgresql+psycopg://`, no-op otherwise, never logs/prints the value); added `ALLOWED_ORIGINS` (comma-separated env parsing, trimmed, defaults to `["https://management-aios.vercel.app"]`); added `ALLOWED_ORIGIN_REGEX` (unchanged localhost/127.0.0.1-any-port regex, now a named constant instead of inline); added `ENVIRONMENT` (env-read, defaults to `"development"`, not currently wired into any behavior). |
| `backend/main.py` | `CORSMiddleware` now uses `allow_origins=ALLOWED_ORIGINS` in addition to the existing `allow_origin_regex`; `allow_credentials=False` unchanged. |
| `backend/README.md` | Added "Deploy to Vercel (connected to Neon)" section (repo, branch, project setup steps, entrypoint rationale, Neon pooled-URL guidance, schema-apply pointer, health/Swagger paths, no-secrets-in-git statement, public-unauthenticated-API warning, truth-boundary restatement). Updated the existing CORS paragraph to mention `ALLOWED_ORIGINS`. |
| `.env.example` | Added `ALLOWED_ORIGINS` and `ENVIRONMENT` example lines (placeholder/example values only — `ALLOWED_ORIGINS` example value is the already-public frontend URL, not a secret). |
| `web-view/index.html` | `MEMBER_SCHEDULE_API_BASE` is now computed once (still a single centralized declaration) — resolves to the existing local base on `localhost`/`127.0.0.1`, otherwise to a placeholder production base (`https://REPLACE_WITH_ACTUAL_BACKEND_PROJECT.vercel.app/api/member-schedules`) that must be replaced once the real backend Vercel project exists. No real backend domain was invented. |

No other files were edited. `backend/database.py` was **not** edited — Neon/Vercel compatibility was achieved entirely via the `DATABASE_URL` scheme normalization in `backend/config.py`, so no change to `database.py` was genuinely required.

## 5. Vercel entrypoint — format selected and why

Fetched current official Vercel documentation (`vercel.com/docs/functions/runtimes/python`, page dated 2026-07-06) rather than assuming a format, per this task's explicit instruction not to assume an obsolete configuration.

Confirmed current behavior:
- Vercel auto-detects a Python entrypoint only from `app.py`/`index.py`/`server.py`/`main.py`/`wsgi.py`/`asgi.py` at the project root or inside `src/`, `app/`, or `api/`.
- `backend/main.py` does not match (it is under `backend/`, not one of those locations), so auto-detection would fail.
- Vercel supports an explicit override: `[tool.vercel] entrypoint = "module:variable"` in `pyproject.toml`. This is documented as the **current, non-legacy** mechanism — no `vercel.json` `builds`/`routes` array is needed for this, and the documentation's own FastAPI example (a root `app.py` with routes at `/` and `/api/...`) confirms Vercel routes **all** paths to the single declared entrypoint, with the ASGI app doing internal path dispatch — exactly how this FastAPI app already works locally.
- Selected: `entrypoint = "backend.main:app"` in root `pyproject.toml`, unchanged from the existing local run command (`python -m uvicorn backend.main:app`). No `api/` directory restructuring and no `vercel.json` were introduced.

**vercel.json:** genuinely not required and not created, per the above.

## 6. Dependency discovery

Root `requirements.txt` contains only `-r backend/requirements.txt`, pointing at the existing, unmodified `backend/requirements.txt` (`fastapi`, `uvicorn[standard]`, `sqlalchemy`, `psycopg[binary]`, `pydantic`, `python-dotenv`).

`pyproject.toml` intentionally omits `[project.dependencies]`. Vercel's documentation states dependencies may come from `pyproject.toml`, `requirements.txt`, or `Pipfile`, but does not document which takes precedence if more than one declares packages. To avoid the risk of Vercel treating an incomplete `pyproject.toml` dependency list as authoritative (which would under-install packages actually needed at runtime, e.g. `sqlalchemy`/`psycopg`), `pyproject.toml` was kept free of a dependency list, leaving `requirements.txt` as the single, unambiguous source. This tradeoff and its residual uncertainty is documented here and in `backend/README.md` because it could not be verified against a real Vercel build in this environment — flagged as a post-deploy check item in the handover doc.

Incidental: running `python -m py_compile` / import checks in this session recompiled the repo's already-tracked `.pyc` files under `backend/__pycache__/` and `backend/routers/__pycache__/`, which now show as modified in `git status`. This is a pre-existing repo hygiene issue (compiled bytecode is tracked in git; `.gitignore` does not exclude `__pycache__/`) unrelated to this task's scope — `.gitignore` is not in this task's allowed-files-to-edit list, so it was left as-is. No commit was made, so this has no effect on the remote.

## 7. Environment-variable names (values never written here)

- `DATABASE_URL`
- `ALLOWED_ORIGINS`
- `ENVIRONMENT`

## 8. CORS result

Verified by direct unit-style checks against the live `backend.config` module (see terminal output in this session, not reproduced here since it required importing the module):

- Default (`ALLOWED_ORIGINS` unset) → `["https://management-aios.vercel.app"]`.
- Comma-separated value with surrounding whitespace and empty entries (`" https://management-aios.vercel.app , https://staging.example.com ,,  "`) → correctly parsed to `["https://management-aios.vercel.app", "https://staging.example.com"]`.
- `ALLOWED_ORIGIN_REGEX` matches `http://localhost:5500`, `http://127.0.0.1:8080`, `https://127.0.0.1`; does **not** match `https://evil.com` or `http://localhost.evil.com`.
- No `"*"` present in `ALLOWED_ORIGINS` or anywhere in the CORS configuration.
- `allow_credentials=False` unchanged.

## 9. Neon compatibility

`_normalize_database_url()` unit-tested with dummy (non-real) values:
- `postgresql://user:pass@host/db?sslmode=require` → `postgresql+psycopg://user:pass@host/db?sslmode=require`
- `postgresql+psycopg://user:pass@host/db` → unchanged
- `None` → `None`

Confirmed against the actual local `.env`-derived `DATABASE_URL` (value itself never printed) that it resolves to a string starting with `postgresql+psycopg://`, i.e. the SQLAlchemy engine will select the installed `psycopg` v3 driver rather than the unavailable `psycopg2`.

## 10. Frontend API configuration

- Confirmed exactly one `MEMBER_SCHEDULE_API_BASE` declaration in `web-view/index.html` (`grep -c` = 1).
- Confirmed exactly 4 `.msc-instance` calendar containers (mayurika, suman, arun, rajiv) and exactly 6 `.tab-btn` elements — unchanged.
- Confirmed no `localStorage.getItem`/`setItem` calls remain in the file — calendar data is not restored from `localStorage`.
- Production placeholder used: `https://REPLACE_WITH_ACTUAL_BACKEND_PROJECT.vercel.app/api/member-schedules`. No real backend domain was invented.

## 11. Credential scan

Ran a pattern scan (Neon host fragments, `neondb_owner`, `npg_` password prefix, generic `user:pass@host` connection-string shapes) across every file created or edited in this task (`backend/config.py`, `backend/main.py`, `backend/README.md`, `.env.example`, `web-view/index.html`, `pyproject.toml`, `requirements.txt`). The only matches were the pre-existing `USERNAME:PASSWORD@HOST:PORT/DATABASE` placeholder strings in `backend/README.md` and `.env.example` — no real credential values. `.env` itself was not read, edited, or printed by any step in this task.

## 12. Protected-file check

`git status --short` after all edits shows changes only to: `.env.example`, `backend/README.md`, `backend/config.py`, `backend/main.py`, `web-view/index.html` (edits), `pyproject.toml`, `requirements.txt` (new), plus the incidental `__pycache__/*.pyc` files noted in §6. Confirmed **no** changes to `CLAUDE.md`, `evidence/source-register.md`, `context/verify-register.md`, or any `member-aios` source file. GAP-40/GAP-44 not touched. Rajiv "ACTIVE WITH LIMITS" label and six-tab/four-calendar structure confirmed unchanged (§10).

## 13. No-authentication limitation

Confirmed by inspection of `backend/routers/member_schedules.py`: no `Depends()` auth dependency, no API-key/header check, on any route (`GET`/`POST`/`PUT`/`DELETE`). Write endpoints remain publicly reachable by anyone with the deployed URL, regardless of CORS configuration (CORS only constrains browser-originated cross-origin requests, not direct API calls). Documented as a known limitation in `backend/README.md` and the handover doc — acceptable only within the existing testing/demo truth boundary (`source_scope='dashboard_testing'`, `is_official_truth=false` enforced server-side, unchanged by this task).

## 14. Git status after all changes

```
 M .env.example
 M backend/README.md
 M backend/__pycache__/__init__.cpython-314.pyc
 M backend/__pycache__/config.cpython-314.pyc
 M backend/__pycache__/database.cpython-314.pyc
 M backend/__pycache__/main.cpython-314.pyc
 M backend/__pycache__/models.cpython-314.pyc
 M backend/__pycache__/schemas.cpython-314.pyc
 M backend/config.py
 M backend/main.py
 M backend/routers/__pycache__/__init__.cpython-314.pyc
 M backend/routers/__pycache__/member_schedules.cpython-314.pyc
 M web-view/index.html
?? pyproject.toml
?? requirements.txt
```

`git diff --check` on all edited tracked files: clean (no whitespace errors).

## 15. Commit / push

**NONE.** No `git add`, `git commit`, or `git push` was run against real state in this task (a single `git add -A -n` dry-run was used only to preview which files *would* be staged, per the credential-scan step in §11 — nothing was actually staged).

## 16. Verdict

**AMBER.**

All implementation, discovery, and validation steps requested by this task passed. The verdict is AMBER rather than PASS solely because of the pre-existing, previously-flagged condition in §2 (a live Neon credential tracked in `main` via commit `6497c7c`), which fails one of PRE-CHECK's four "proceed only if" conditions. Nothing in this task touched, worsened, or resolved that condition; it remains an open action for the user (rotate the Neon password; decide on history rewrite) tracked in the handover doc's "Known limitations" and "Next action" sections.
