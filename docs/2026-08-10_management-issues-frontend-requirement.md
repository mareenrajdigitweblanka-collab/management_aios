---
Project Name: Management AIOS Issues Frontend Tab
Start Date: 2026-08-10
Expected Deadline: N/A (frontend-only phase; backend integration is a separate future requirement)
User / Stakeholder: Mareenraj (builder), Varmen (relayed scope)
Company Value Contribution: Gives the Management AIOS a single place to view, filter, and (once a backend exists) triage cross-domain operational issues raised by the team, instead of that information living only in a standalone reference page with no persistence
MVP Submission Date: 2026-08-10
Project Owner: Mareenraj
Status: Implemented — frontend-only, backend integration explicitly deferred
---

# Management AIOS Issues Frontend Tab — Requirement — REQ-ISSUES-UI-001

## 1. Purpose

Add a Management AIOS frontend workspace ("Issues") that reproduces the UX of a supplied standalone reference HTML page (`postage-daily-issues.html` — an ad hoc issue tracker with a hardcoded dataset and in-memory-only assignment) as a proper tab inside this dashboard, without adopting either of that reference's two production-unsafe shortcuts:

1. Its hardcoded `const ISSUES = [...]` array — real issue records, must never ship as production data.
2. Its `const assignments = {}` in-memory object — the reference page itself documents that this is browser-memory-only and disappears on refresh; this phase must not pretend otherwise.

The Issue System remains the authoritative source of issue truth. This phase builds only the frontend shell and interaction experience so a later, separately-approved backend/API integration can populate it safely.

## 2. Scope

**In scope:**
- One new sidebar item ("Issues") and one new top-level panel (`#tab-issues`), reusing the existing generic navigation controller (`web-view/js/navigation.js`) — no second navigation framework.
- Two internal sub-views inside that panel: Issues (filterable/sortable table) and Assigned Tickets (card list), mirroring the reference page's UX.
- Filters (Raised By, Domain, RED/AMBER/GREEN status), sortable columns, truncate/expand ("more"/"less") long fields, a "View Data" external link with `target="_blank" rel="noopener noreferrer"`.
- Admin-only bulk assignment UX (Select All / Assign To / Assign), gated by a registry-derived Admin role check — never a hardcoded display-name comparison.
- Assigned Tickets cards with a per-ticket Solving Status selector (Not Solved / Partially Solved / Solved Completely), kept structurally separate from the issue's own RED/AMBER/GREEN triage status.
- A replaceable data adapter so a future backend can be wired in without touching the rendering code.

**Explicitly out of scope (per instruction):**
- Any backend code, database schema, migration, or table.
- Any write to `varman_aios` or `varmen_db`.
- The actual Issue-System integration API.
- Deployment / push to remote.

## 3. Source material

UX/interaction reference only: the standalone HTML page supplied in-conversation (`postage-daily-issues.html`), a single-file issue tracker built for a different, unrelated dataset (postage/purchase/listing/pricing daily issues). Used to determine layout, filters, sort behavior, truncate/expand pattern, and the Assign/Assigned-Tickets flow — never as a source of production data or of its own assignment-persistence model.

## 4. Sample behaviors reused

- Issues / Assigned Tickets internal tabs.
- Raised By filter, Domain filter, RED/AMBER/GREEN status filter tabs (color + text, not color alone).
- Sortable table columns with a visible sort indicator.
- Ticket ID styling, priority display, "—" for missing values.
- Truncate long text at a fixed length with a "more"/"less" toggle.
- "View Data" external link pattern.
- Select All (scoped to currently-filtered, currently-unassigned tickets only) + Assign To + Assign, with a live selected-count.
- Assigned Tickets card layout: Ticket ID / Raised By / Date Raised / Domain header, Title, Description/Root Cause/What Is Happening/Fix fields, Assigned To / Assigned Date / Solving Status footer.
- Assignee filter on the Assigned Tickets view.
- Not Solved / Partially Solved / Solved Completely solving-status states, mapped to red/amber/green.

## 5. Sample behaviors deliberately NOT reused

| Reference behavior | Why it was not carried over | What this build does instead |
|---|---|---|
| `const ISSUES = [...]` hardcoded array | Real issue records must never be shipped as production frontend source | Production adapter (`createProductionIssuesAdapter`) always resolves an empty issue list; a fixture array exists only inside `issues.test.mjs`, never imported by production code |
| `const assignments = {}` in-memory object presented as if it were "the" data | The reference page's own comment already says this is browser-memory-only and vanishes on refresh — treating that as production behavior would misrepresent persistence to the user | A replaceable adapter interface; the shipped production adapter's `assignTickets()`/`updateSolvingStatus()` always resolve `{status: 'pending_backend'}`, and the UI shows an explicit "Assignment connection pending" notice rather than a false "saved" state |
| Hardcoded assignee names `Rajive`, `Maurika` (misspelled) and no `Paraparan` | Names must come from the authoritative Management Team registry, not be invented/misspelled | Assignee list is built from `web-view/js/member-registry.js`'s `MEMBER_REGISTRY` (Mayurika, Suman, Arun, Rajiv, Paraparan), excluding MD |
| No defined "Admin" concept (the reference assumed one implicit user) | Requirement explicitly forbids `if (name === "Rajiv")`-style hardcoding | Admin status is derived from `MEMBER_REGISTRY[key].role === 'Admin Manager'` (`isAdminMemberKey()`, `member-registry.js`) — a role read from the existing registry, not a name comparison |
| Using `localStorage`/`sessionStorage` for anything | Not used by the reference for assignments (it explicitly avoids this), but flagged here as a hard rule for this build too | `issues.js` never references `localStorage`/`sessionStorage` anywhere (enforced by a source-text test) |

## 6. Admin / MD rules

- Admin-only controls (Select All, Assign To, Assign): rendered only when `isAdminMemberKey(getAuthenticatedMemberKey())` is true. Today that is Rajiv only (`MEMBER_REGISTRY.rajiv.role === 'Admin Manager'`), but the check is role-based, not name-based, so it tracks the registry automatically if it ever changes.
- Non-Admin authenticated members may view and filter Issues and Assigned Tickets, but never see the assignment controls at all (not merely disabled).
- MD (`MEMBER_REGISTRY.md`, role `'Read-only'`) is never an assignee and never sees assignment controls — this falls out of the same role check with no MD-specific carve-out required.
- This is a **UI-only** gate. There is no backend assignment endpoint yet; when one is built, it must independently re-verify Admin authority from the request's own identity, exactly like `member-registry.js`'s own header comment already documents for `isReadOnlyMember()`.

## 7. Data contract

```js
{
  ticketId, member, raisedBy, dateRaised, domain, status, priority,
  title, description, rootCause, whatIsHappening, documentGap, fix,
  dataLink, assignedTo, assignedDate, solvingStatus
}
```

`assignedTo` / `assignedDate` / `solvingStatus` are never present on the base issue record — they live only in the adapter's separate assignment map, merged in only for rendering the Assigned Tickets view.

## 8. States

- **Loading** — "Loading issues…"
- **Empty** — "No issues are available yet." (Issues) / "No tickets are currently assigned." (Assigned Tickets)
- **Filtered-to-nothing** — "No issues match this filter."
- **Error** — "Issues could not be loaded. Please try again." with a Retry button
- **Data** — the table / card list

## 9. Protected path

`member-aios/mayurika-hr/staff-data/` was never opened or modified.

## 10. Next integration requirement

A separate, explicitly-approved requirement is needed to: (1) define the real Issue-System backend endpoint(s) for fetch/assign/solving-status-update, and (2) wire a real adapter implementation in place of `createProductionIssuesAdapter()`. Until then, the workspace shows 3 clearly-labeled demo records (see §11) rather than real Issue System data.

## 11. Correction — 2026-08-10 (confirmed business rules, post-deployment review)

Live-browser review of the initial implementation surfaced that "Raised By" and "Domain" had no real system source to draw from (the production adapter had zero issue records, so both option lists rendered empty) — correct behavior, but it exposed a question worth answering properly rather than deferring. The following corrections were confirmed and implemented, superseding the relevant parts of §2/§4/§5/§6/§7 above:

1. **Raised By is sourced from the real Staff Data API** (`GET /api/staff`, active staff only, reusing `web-view/js/staff-data.js`'s own `STAFF_API_BASE` — no second host-detection constant, no hardcoded name list). The reference sample's `Nandhi`/`Nivarnan`/`Sasi`/`Sathis` names never appear in production source.
2. **"Domain" is renamed to "Team"** — both the visible UI label and the issue record's field (`domain` → `team`, a safe frontend-only rename since no backend Issues API exists yet to desynchronize with). Team options come from `GET /api/staff/filter-options`'s `teams` array — the live, real set of department/team values recorded in the system. The reference sample's `Listing`/`PH`/`Postage`/`Pricing`/`Purchase` list never appears in production source.
3. **Exactly 3 synthetic demo issues** (`DEMO-ISSUE-001`/`002`/`003`) are shown while the Issue System integration remains unbuilt, each bound to real Raised By/Team values pulled from the Staff Data API above (never fabricated names) — never presented as real issue truth. A visible, accessibly-styled banner ("Demo data — 3 temporary issues are shown while the Issue System connection is pending.") accompanies them at all times; this is not small footer text.
4. **Assignment authority is now an exact identity check.** `hasAssignmentAuthority(memberKey)` (`issues.js`) is true only when the authenticated `member_key` is literally `'rajiv'` — this replaces the role-based `isAdminMemberKey()`/`role === 'Admin Manager'` check from §6 above, which a business review confirmed was the wrong shape: a role check would incorrectly grant assignment rights to any future second "Admin Manager" the registry might ever gain. `isAdminMemberKey()` was removed from `member-registry.js` entirely. "Assign To" itself (who may be assigned, as opposed to who may do the assigning) is **unchanged** — still exactly the 5 Management Team members from `MEMBER_REGISTRY`, never MD, never a general staff member.
5. Data contract §7's `domain` field is renamed to `team`; `assignedTo`/`assignedDate`/`solvingStatus` remain adapter-only, unchanged.
6. Loading state gains a variant: "Loading staff and team options…" for the real production wiring (waiting on the Staff Data API before any demo issue can be safely bound); "Loading issues…" remains the generic default for other adapters (e.g. test fixtures).
7. New error variant: "Staff/team options could not be loaded." — shown when the Staff Data API fetch fails, or succeeds but returns an empty list (treated identically: never bind a demo record to a fabricated/blank value). The demo issues and banner stay hidden in this state.
8. Assignment persistence remains explicitly out of scope (per instruction) — the production adapter's `assignTickets()`/`updateSolvingStatus()` still always resolve `{status: 'pending_backend'}`; clicking Assign on a demo issue never moves it into Assigned Tickets and never claims a save occurred.
