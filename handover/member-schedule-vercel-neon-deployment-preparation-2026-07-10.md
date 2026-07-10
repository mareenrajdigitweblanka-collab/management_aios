# Handover — Member Schedule Backend Vercel + Neon Deployment Preparation (2026-07-10)

**This is a preparation handover, not a deployment record.** No commit, push, or Vercel CLI
deploy was performed. Everything below is local code preparation on `main`, ready for a human
to review and then deploy manually.

Evidence: `validation/member-schedule-vercel-neon-deployment-preparation-check-2026-07-10.md`

---

## 0. Before doing anything else: rotate the Neon password

A live Neon Postgres username/password is currently tracked in git on `main` (commit `6497c7c`,
`.env`). This was identified earlier in this session and is unrelated to the changes below, but
it should be treated as the top-priority action:

1. In the Neon console, reset the `neondb_owner` password.
2. Decide whether to also remove the old committed `.env` from git history (`git filter-repo` or
   similar) given it has already been pushed to `origin/main`.
3. Update your local `.env` (not tracked going forward) with the new password before testing the
   steps below.

## 1. Vercel backend project creation steps

1. Go to Vercel → **Add New Project** → import
   `https://github.com/mareenrajdigitweblanka-collab/management_aios` **again, as a new project**
   (do not reuse the existing `management-aios` frontend project).
2. **Root Directory:** leave as the repository root — do **not** set it to `backend`. The
   `backend` package uses `from backend.config import ...`-style imports that only resolve when
   the build root is the repo root.
3. **Production branch:** `main`.
4. Framework preset / build / install / output command fields: leave on auto — Vercel's Python
   runtime detects the entrypoint via `pyproject.toml` (`[tool.vercel] entrypoint =
   "backend.main:app"`) and installs from root `requirements.txt`.
5. **Environment variables** — set these three in the Vercel dashboard (names only; enter real
   values there, never in the repo):
   - `DATABASE_URL` — the **rotated** Neon pooled connection string (see §2)
   - `ALLOWED_ORIGINS` — `https://management-aios.vercel.app` (add more, comma-separated, if
     other frontend origins need access later)
   - `ENVIRONMENT` — `production`
6. Deploy.

## 2. Neon schema and pooled-runtime URL guidance

- Use Neon's **pooled** connection string (the `-pooler` hostname) for `DATABASE_URL`, not the
  direct one — Vercel Functions open many short-lived connections per invocation, which the
  pooler is designed to absorb.
- Keep `sslmode=require` in the connection string.
- You can paste Neon's value as-is even if it starts with `postgresql://` — `backend/config.py`
  normalizes that to `postgresql+psycopg://` automatically at startup so the correct driver
  (`psycopg` v3, the one actually installed) is used.
- Apply the schema once against the Neon database before first use, if not already applied:
  ```bash
  psql "$DATABASE_URL" -f database/member_schedule_events_schema.sql
  ```
  or paste the file's contents into the Neon console's SQL Editor and run it. It is idempotent
  (`CREATE ... IF NOT EXISTS`) and safe to re-run.

## 3. Health and Swagger test paths

Once deployed, replace `<backend-project>` with the actual Vercel project domain:

- Health: `https://<backend-project>.vercel.app/health` → expect `{"status": "ok", "service": "management-aios-member-schedules"}`
- Swagger UI: `https://<backend-project>.vercel.app/docs`

## 4. Where to replace the final backend domain

`web-view/index.html` currently resolves `MEMBER_SCHEDULE_API_BASE` to a placeholder,
`https://REPLACE_WITH_ACTUAL_BACKEND_PROJECT.vercel.app/api/member-schedules`, for any host other
than `localhost`/`127.0.0.1`. Once the backend project's real domain is known:

1. Open `web-view/index.html`, find `PRODUCTION_BASE` (single declaration, near the top of the
   schedule-calendar `<script>` block).
2. Replace `REPLACE_WITH_ACTUAL_BACKEND_PROJECT` with the real backend project subdomain.
3. Redeploy the frontend project (`management-aios.vercel.app`) so the change takes effect there.

## 5. End-to-end test steps (after both projects are deployed)

1. Confirm `/health` on the backend returns `200`.
2. Open `https://management-aios.vercel.app`, switch to each of the four member tabs (Mayurika,
   Suman, Arun, Rajiv).
3. For each: add a schedule item, refresh, confirm it persists; edit it, refresh, confirm the
   edit persists; delete it, refresh, confirm the deletion persists.
4. On one tab, add two items and use "Clear Testing Data" — confirm only that member's
   `dashboard_testing` rows are removed.
5. Open browser dev tools → Network tab and confirm requests go to the real backend domain (not
   `127.0.0.1` and not the literal placeholder string).
6. Confirm no CORS errors appear in the console.

## 6. Rollback instructions

This preparation made no commits, so there is nothing to revert in git history. If a real deploy
later needs to be rolled back:

- **Frontend:** in Vercel, redeploy a previous deployment of the `management-aios` project (or
  revert the `web-view/index.html` API-base commit and redeploy).
- **Backend:** in Vercel, redeploy a previous deployment of the new backend project, or delete the
  project if it should not exist yet.
- **Database:** the schema script is additive/idempotent only; it does not drop anything, so
  there is no schema rollback needed. Data rollback (if any real rows were written) would need a
  manual `DELETE`/restore from a Neon branch/snapshot.

## 7. Known limitations

- **No authentication** on `POST`/`PUT`/`DELETE` endpoints. CORS restricts which browser origins
  can call the API, but not direct API calls (`curl`, scripts) from anyone with the URL. Confined
  to testing/demo-scope data only (`source_scope='dashboard_testing'`, `is_official_truth=false`,
  enforced server-side) — do not point this API at official data without adding real auth first.
- **`pyproject.toml` dependency ambiguity, unverified against a real build:** `pyproject.toml`
  deliberately does not declare `[project.dependencies]`, relying on root `requirements.txt`
  instead (see validation doc §6 for the reasoning). This could not be verified against an actual
  Vercel build in this environment — **first real deploy should be treated as a smoke test** for
  this specific point. If the deploy log shows missing packages (e.g. `sqlalchemy`/`psycopg` not
  installed), that confirms Vercel picked a different dependency source than expected.
  - **Actually monitor**: check the Vercel deploy build log for confirmation of which files it
    used to install dependencies. If dependency detection is a problem, evaluate adding a
    `[project.dependencies]` list to `pyproject.toml` (mirroring `backend/requirements.txt`) as
    the fix.
- **Neon cold start / pooler latency:** earlier in this session, a raw `psycopg` connection
  attempt from this workstation appeared slow/hung. Cause not conclusively diagnosed (could be
  Neon compute cold-start, or local network/firewall). Worth watching on first real requests after
  a deploy, especially after a period of inactivity (Neon free tier scales to zero).
- **Credential exposure (pre-existing, unrelated to this task):** see §0.

## 8. Evidence path

`validation/member-schedule-vercel-neon-deployment-preparation-check-2026-07-10.md`

## 9. Next action

1. Rotate the Neon password (§0) — do this regardless of deployment timing.
2. Review the diffs in `backend/config.py`, `backend/main.py`, `backend/README.md`,
   `.env.example`, `web-view/index.html`, and the new `pyproject.toml`/`requirements.txt`.
3. If approved, commit and push manually (this task did not commit or push).
4. Follow §1–§3 above to create the Vercel backend project and set environment variables.
5. Follow §4 to replace the frontend production placeholder once the backend domain is known.
6. Run the end-to-end test in §5.
