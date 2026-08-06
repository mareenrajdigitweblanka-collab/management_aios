---
Project Name: MD Read-Only Review Summary Authorization
Start Date: 2026-08-06
Expected Deadline: 2026-08-06
User / Stakeholder: Mareenraj (builder), Managing Director (MD), Management Team
Company Value Contribution: Documents the authorization architecture selected so MD's read-only access can never silently expand into a write/Calendar/Task/Leave capability as the codebase evolves.
MVP Submission Date: 2026-08-06
Project Owner: Mareenraj
Status: Implemented — see validation/md-read-only-review-summary-check-2026-08-06.md
---

# MD Read-Only Review Summary Authorization — Technical Design — 2026-08-06

**Requirement ID:** REQ-CAL-REV-MD-READ-006. Requirement: `docs/2026-08-06_md-read-only-review-summary-requirement.md`.

## 1. Existing authorization chain (discovered, unmodified in shape)

```text
CALENDAR_AUTH_TOKEN_HASH_<MEMBER> (env var, SHA-256 hex digest)
  -> load_calendar_auth_token_hashes()      [backend/config.py — fail-closed, all 5 mandatory]
  -> validate_calendar_auth_token(header)   [backend/routers/calendar_auth.py — hmac.compare_digest loop]
  -> member_key ("mayurika" | "suman" | "arun" | "rajiv" | "paraparan")
  -> get_verified_member (FastAPI dependency, every mutation + every Review Summary route)
  -> VALID_MEMBER_KEYS / require_matching_member (Task/Leave own-key write gate)
  -> MEMBER_DIRECTORY / MEMBER_LABELS (display label, DB CHECK constraint on reviewer_member_key)
```

`VALID_MEMBER_KEYS`, `CALENDAR_AUTH_TOKEN_ENV_VARS`, and `MEMBER_DIRECTORY` are the same three structures that gate Task/Leave ownership (`require_matching_member`'s own-key match) and the Review Summary `reviewer_member_key` DB CHECK constraint. Adding a sixth key to any of them would let that key own a Task/Leave record under its own `{member_key}` URL segment, or become a reviewer — both explicitly forbidden for MD.

## 2. Option assessed and selected

**Option C (global valid member key) was rejected outright** — adding `"md"` to `VALID_MEMBER_KEYS` would let an MD token successfully create/update/delete its own Task/Leave rows via `POST /api/member-schedules/md`, since `require_matching_member` has "no bypass" by design (own-key match is all it takes) — that is a Calendar/Task/Leave mutation capability, explicitly forbidden.

**Selected: a hybrid of Option A and Option B — the smallest design that preserves existing behavior:**

- **Option B's shape** (dedicated reader path, writable identities unchanged): MD is folded into the *same* `validate_calendar_auth_token` comparison loop as the five Management Team tokens (one authoritative chain, never a second resolver — see §3), but is deliberately **excluded** from `VALID_MEMBER_KEYS` / `CALENDAR_AUTH_TOKEN_ENV_VARS` / `MEMBER_DIRECTORY`. Existing Management Team identities and every existing route's behavior are completely unchanged.
- **Option A's shape** (capability awareness), applied minimally: rather than a full capability-matrix registry (unnecessary for one read-only identity with two write routes to guard), MD's only two capability-relevant differences from a full member are expressed as two explicit, narrow checks: `_reject_md_write()` (backend/routers/staff_review_summaries.py, called first in CREATE and UPDATE) and MD's structural absence from `VALID_MEMBER_KEYS` (which transitively blocks Task/Leave and reviewer-filter selection with zero new code in those routers).

No route or existing behavior needed to change for LIST, DETAIL, or PDF export — both already grant "any authenticated identity" shared read access (2026-08-03 revised business rule), with no owner filter. MD simply becomes one more identity `get_verified_member` can resolve.

## 3. Backend implementation

### 3.1 Config (`backend/config.py`)

- `MD_MEMBER_KEY = "md"`, `MD_DISPLAY_LABEL = "MD — Read-only"`.
- `MD_CALENDAR_AUTH_TOKEN_ENV_VAR = "CALENDAR_AUTH_TOKEN_HASH_MD"`.
- `load_md_review_summary_token_hash(environ=None)` — **optional-config loader**, the deliberate opposite of `load_calendar_auth_token_hashes`: never raises. Returns `None` (not an exception) when the env var is absent, blank, a recognized placeholder (`set_a_real_token_hash_here`, `<set-in-deployment-environment>`), or not a 64-character SHA-256 hex digest. `None` means "MD authorization unavailable" — every MD-token request then fails closed with 401, the backend never fails to start over this, and the five existing member tokens are completely unaffected either way.
- `member_display_label(member_key)` — the one place that resolves a verified `member_key` to a safe label for both the five members (`MEMBER_LABELS[key]`) and MD (`MD_DISPLAY_LABEL`), so `/verify` and `require_matching_member`'s error message never do a raw dict lookup that would `KeyError` for `"md"`.

### 3.2 Token verification (`backend/routers/calendar_auth.py`)

`validate_calendar_auth_token` now builds ONE combined hash dict per request: the five mandatory hashes (unchanged) plus MD's hash *only if configured AND not colliding with any of the five real hashes* (a collision would make the comparison loop ambiguous about which identity a matching token belongs to — MD is silently left unavailable rather than crashing or guessing). The existing no-early-return, `hmac.compare_digest`-per-candidate loop is otherwise untouched.

### 3.3 Review Summary routes (`backend/routers/staff_review_summaries.py`)

- **LIST / DETAIL / PDF export — zero code changes.** All three already resolve shared read access from `Depends(get_verified_member)` alone.
- **CREATE / UPDATE** — `_reject_md_write(acting_member)` is called FIRST, before any other validation or DB access, raising `403 {"error": "review_summary_read_only_member", ...}`. This is defense in depth on top of the fact that UPDATE's existing `_get_owned_summary_or_404` would also 404 for MD regardless (no summary can ever be owned by `"md"` — the DB CHECK constraint doesn't permit it), but an explicit, typed 403 checked first is clearer than relying on an incidental side effect of the ownership query, and matches this codebase's own `require_matching_member` 403 convention for "authenticated but not authorized to do this."
- **DELETE — zero code changes.** Already rejects every caller identically with 409, regardless of identity (REQ-CAL-REV-LOCK-004).

### 3.4 Employee lookup

`GET /api/staff` needed no change — it already has no auth dependency at all and is the same endpoint Review Summaries already uses for every member's staff selector. MD receives exactly the same (pre-existing, unauthenticated, 16-approved-field) response any caller already receives — REQ-CAL-REV-MD-READ-006 adds no new endpoint, no new field projection, and no new Staff Data dashboard access.

## 4. Frontend implementation

- `web-view/js/member-registry.js` — `MEMBER_REGISTRY` gains one **display-only** `md: {displayName:'MD', role:'Read-only'}` entry (so `resolveMember()`/`authorizedAsLabelText()` render "Authorized as: MD — Read-only" through the same path every other member uses) plus `MD_MEMBER_KEY`, `MD_DISPLAY_LABEL` (derived, not a duplicated literal), and `isReadOnlyMember(memberKey)` (a UI-only convenience — the real enforcement is always the backend 403).
- `web-view/js/review-summaries.js`'s `REVIEWER_FILTER_ORDER` (a *separate* hardcoded array of the five real reviewer keys, independent of `MEMBER_REGISTRY`) is **not** touched — MD can never be a reviewer-filter choice.
- `updateFormVisibility()` now also checks `isReadOnlyMember(getStoredMemberKey())`: when true, the Add/Edit form stays hidden regardless of staff selection, and a new `.review-summaries-readonly-notice` paragraph is shown instead. Edit buttons need no extra code — `isOwnedRecord()` already returns `false` for every record when the authenticated key is `"md"` (no summary is ever owned by `"md"`), so Edit never renders.
- Each history card gets one additional `.review-summaries-card-md-notice` line ("Read-only — MD has viewing access only.") when the viewer is MD — appended after, never replacing, the existing per-record owner/edit-lock status message.
- `web-view/js/calendar/auth.js`'s `labelForMemberKey` special-cases `"md"` before its usual `.msc-instance[data-member-key=...]` DOM lookup, since MD has no Calendar tab at all (by design) and that lookup would otherwise always miss and fall back to the raw key.

## 5. Database

Zero schema/migration changes. `backend/models.py`'s `StaffReviewSummary.__table_args__` CHECK constraint (`reviewer_member_key IN ('mayurika','suman','arun','rajiv','paraparan')`) is untouched — MD structurally can never satisfy it, by construction, not by an application-layer check alone.

## 6. Tests

See `validation/md-read-only-review-summary-check-2026-08-06.md` for the full inventory and results.
