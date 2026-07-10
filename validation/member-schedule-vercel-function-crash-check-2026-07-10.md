# Member Schedule Backend — Vercel Function Crash Diagnosis (2026-07-10)

**Task type:** Diagnosis and minimal fix only. No commit, no push, no CLI deploy performed.

---

## 1. Observed Vercel error

Production error page on `https://management-aios-api.vercel.app`:

```
500: INTERNAL_SERVER_ERROR
Code: FUNCTION_INVOCATION_FAILED
```

Shown on requests to `/`, `/health`, and `/favicon.ico`.

## 2. Redacted runtime-log cause (user-provided)

```
could not import "backend/main.py":
Traceback (most recent call last):
  File "/var/task/_vendor/vercel_runtime/vc_init.py", line 487, in <module>
    __vc_module = import_module(_entrypoint_modname, _entrypoint_abs)
  File "/var/task/_vendor/vercel_runtime/resolver.py", line 24, in import_module
    spec.loader.exec_module(mod)
  File "<frozen importlib._bootstrap_external>", line 999, in exec_module
  File "<frozen importlib._bootstrap>", line 488, in _call_with_frames_removed
  File "/var/task/backend/main.py", line 9, in <module>
    from fastapi import FastAPI
ModuleNotFoundError: No module named 'fastapi'
Python process exited with exit status: 1.
```

Recurred identically across three separate deployments (`management-aios-rgp6ptv7k-digitweb1`,
`management-aios-a2b97izsx-digitweb1` build, and the `management-aios-api.vercel.app` alias),
confirming the failure is deterministic, not transient.

## 3. Classification

**Missing Python package** at Vercel build/runtime — not an entrypoint/app-discovery error, not a
missing environment variable, not a database issue, not a Pydantic/settings error.

**Entrypoint discovery: confirmed working, not the cause.** The traceback shows
`vc_init.py` successfully resolving `_entrypoint_modname`/`_entrypoint_abs` to
`/var/task/backend/main.py` and beginning `exec_module` on it — Vercel found and attempted to run
the correct file via the existing `[tool.vercel] entrypoint = "backend.main:app"` declaration. The
crash happens *inside* that file's own top-level `from fastapi import FastAPI` (line 9), because
the `fastapi` package itself was never installed into the deployed function's environment. Per this
task's explicit rule, `[tool.vercel] entrypoint` was **left unchanged** — switching to
`[project.scripts]` would not have addressed this failure and was not evidenced by the traceback.

## 4. Previous entrypoint format

```toml
[tool.vercel]
entrypoint = "backend.main:app"
```

## 5. Corrected entrypoint format

**Unchanged** — confirmed correct by the traceback (see §3). No entrypoint edit made.

## 6. Root cause

Root `pyproject.toml` declared no `[project.dependencies]` (a deliberate choice recorded in the
original deployment-prep validation doc, to avoid ambiguity over which manifest Vercel would treat
as authoritative if both `pyproject.toml` and `requirements.txt` declared packages). The root
`requirements.txt` contained only `-r backend/requirements.txt`. The production crash is direct
evidence that Vercel's build did not install packages via that `-r` reference — most likely because
Vercel's Python-project/framework detection (which the docs describe as scanning `requirements.txt`,
`pyproject.toml`, or `Pipfile` for a *recognized dependency name*) never saw a literal package name
match `-r backend/requirements.txt` is not itself a package name — and, with `pyproject.toml`
declaring no dependencies either, no package installation step ran at all. This confirms the
uncertainty flagged as "residual, unverified against a real build" in
`validation/member-schedule-vercel-neon-deployment-preparation-check-2026-07-10.md` §6 and the
matching item in the handover doc's "Known limitations."

## 7. Dependency result

`backend/requirements.txt` already correctly lists all backend third-party imports (`fastapi`,
`uvicorn[standard]`, `sqlalchemy`, `psycopg[binary]`, `pydantic`, `python-dotenv`) — confirmed
against actual `import` statements in `backend/main.py`, `backend/config.py`, `backend/database.py`,
`backend/models.py`, `backend/schemas.py`, `backend/routers/member_schedules.py`. No package was
missing from `backend/requirements.txt`, and no genuinely missing dependency was added there.
`pydantic-settings` is not used anywhere in this backend (`backend/config.py` reads `os.environ`
directly) and was correctly not added.

## 8. Minimal fix applied

**File changed: `pyproject.toml` only.**

Added a `[project.dependencies]` array, mirrored from `backend/requirements.txt`, so Vercel's
Python runtime installs the required packages regardless of whether it resolves the root
`requirements.txt`'s `-r` include:

```toml
dependencies = [
    "fastapi>=0.110",
    "uvicorn[standard]>=0.29",
    "sqlalchemy>=2.0",
    "psycopg[binary]>=3.1",
    "pydantic>=2.6",
    "python-dotenv>=1.0",
]
```

`[tool.vercel] entrypoint = "backend.main:app"` left unchanged. Root `requirements.txt` left
unchanged (`-r backend/requirements.txt`) — kept for local `pip install -r requirements.txt` parity
and as a second path to the same packages; no longer the sole dependency declaration. No backend
route, schema, or schedule-calendar business behavior was touched.

**Residual uncertainty (cannot be fully closed without an actual Vercel build):** this fix addresses
the most likely cause per Vercel's documented detection behavior and the observed traceback, but a
real Vercel deploy is the only way to confirm the package now installs. Flagged as the next action.

## 9. Import-safety result (re-confirmed, unaffected by the fix)

No code changed, so the import-time behavior already recorded during deployment prep still holds:
`backend/config.py` only reads/normalizes `DATABASE_URL` as a string (no I/O); `backend/database.py`
defers `create_engine()` to `get_engine()`, called only via the `get_db()` FastAPI dependency, which
`/health` does not use. No real database connection or query happens at import, and `/health` does
not require one.

## 10. /health local result

`fastapi.testclient.TestClient` is not usable in this local environment (`starlette.testclient`
requires `httpx2`, which is not installed and is not a backend runtime dependency — not added to
`backend/requirements.txt` since backend code itself never imports it). Verified equivalently by
importing `backend.main` and calling the route handler function directly:

```
health_check() → {'status': 'ok', 'service': 'management-aios-member-schedules'}
```

Matches the expected `200` response body exactly.

## 11. Required Vercel environment variables (names only, unchanged from deployment prep)

- `DATABASE_URL` — Neon pooled connection string, set only in Vercel project settings
- `ALLOWED_ORIGINS` — expected value `https://management-aios.vercel.app`
- `ENVIRONMENT` — expected value `production`

Environment-variable changes require a new deployment to take effect. Not relevant to this specific
crash (the failure occurred before any environment variable was read — it happened at the
`from fastapi import FastAPI` import line), but restated here since they remain required for the
app to function once the import succeeds.

## 12. Credential handling

`DATABASE_URL` was not read, printed, or inspected at any point in this task. `.env` was not opened.
No host, role, username, password, or connection string appears in `pyproject.toml` or this
document.

## 13. Files edited

- `pyproject.toml` (added `[project.dependencies]`; `[tool.vercel]` block unchanged)
- This validation file (new)

No other file was edited. `web-view/index.html` was not touched. `backend/main.py`,
`backend/config.py`, `backend/database.py`, `backend/requirements.txt`, root `requirements.txt`,
and `backend/README.md` were inspected but required no change for this fix.

## 14. Git status

```
 M backend/__pycache__/__init__.cpython-314.pyc
 M backend/__pycache__/config.cpython-314.pyc
 M backend/__pycache__/database.cpython-314.pyc
 M backend/__pycache__/main.cpython-314.pyc
 M backend/__pycache__/models.cpython-314.pyc
 M backend/__pycache__/schemas.cpython-314.pyc
 M backend/routers/__pycache__/__init__.cpython-314.pyc
 M backend/routers/__pycache__/member_schedules.cpython-314.pyc
 M pyproject.toml
```

The 8 modified `.pyc` files are pre-existing tracked-bytecode noise, untouched by this task (not
staged, not regenerated intentionally, not deleted). `git diff --check` clean (only a benign
LF→CRLF line-ending notice from git, not a whitespace error).

## 15. Commit / push / deploy

**NONE.** No `git add`, `git commit`, `git push`, or Vercel CLI command was run.

## 16. Verdict

**AMBER.**

Diagnosis is log-grounded and conclusive (`ModuleNotFoundError: No module named 'fastapi'`, entrypoint
resolution proven correct), and the minimal fix (`[project.dependencies]` in `pyproject.toml`)
directly targets the confirmed root cause without touching entrypoint config, backend behavior, or
frontend code. Not PASS because: (1) the fix has not yet been validated against a real Vercel build —
that requires the user to commit, push, and let Vercel redeploy, which this task explicitly
prohibits; (2) the previously-flagged un-rotated Neon credential (accepted risk per user decision)
remains outstanding and unrelated to this fix. Next action: commit `pyproject.toml`, push, and
confirm `/health` returns `200` on the real deployment.
