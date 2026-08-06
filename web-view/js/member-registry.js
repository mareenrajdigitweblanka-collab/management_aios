/* member-registry.js — single reusable Management Team identity registry
   (REQ-CAL-REV-TAB-002, 2026-08-06).

   Resolves a member_key to {displayName, role} for display purposes only
   (never authorization — see calendar/auth.js for the actual token-based
   identity source). Introduced because no single existing frontend
   structure already combined name+role per member: backend/config.py's
   MEMBER_LABELS returns one combined "Name — Role" string with no role at
   all for Paraparan; web-view/index.html's sidebar nav markup carries the
   short role words as raw HTML spans, not importable data.

   Every value below already exists verbatim elsewhere in this repository
   — nothing here is invented:
     - displayName (all 5) and role (Mayurika/Suman/Arun/Rajiv) are taken
       from splitting backend/config.py's MEMBER_LABELS[key] on " — ".
     - Paraparan's role ("Auditor") is taken from web-view/index.html's own
       sidebar nav sub-label and Paraparan's member-tab <h2> heading — the
       approved display terminology confirmed for this task — NOT from
       MEMBER_LABELS["paraparan"], which still carries no role because the
       underlying External Auditor vs. Accountant designation dispute
       remains open (backend/config.py:95-98,
       member-aios/staff-data/evidence/paraparan-designation-review-2026-07-13.md).
       This is a deliberate, documented registry-data gap between this
       frontend-only display decision and backend/config.py, not a
       resolution of that dispute — fixing config.py is out of scope here.

   Unknown-key fallback: any member_key not in MEMBER_REGISTRY resolves to
   {displayName: 'Unknown', role: 'Unknown'} — never a fabricated or
   guessed value, never a thrown error. Not reachable today (the backend's
   VALID_MEMBER_KEYS is fixed at exactly these 5 keys) but guards against
   future data drift. */

export var MEMBER_REGISTRY = {
  mayurika: { displayName: 'Mayurika', role: 'HR' },
  suman: { displayName: 'Suman', role: 'Recruiting Officer' },
  arun: { displayName: 'Arun', role: 'Implementation Officer' },
  rajiv: { displayName: 'Rajiv', role: 'Admin Manager' },
  paraparan: { displayName: 'Paraparan', role: 'Auditor' }
};

var UNKNOWN_ENTRY = { displayName: 'Unknown', role: 'Unknown' };

/* Returns {displayName, role} — never null/undefined, never throws.
   Reviewer display name and role are resolved this way at render time
   only; neither value is ever written to the database (see
   backend/routers/staff_review_summaries.py — reviewer_member_key is the
   only reviewer identity field the API returns or stores). */
export function resolveMember(memberKey) {
  if (!memberKey) { return UNKNOWN_ENTRY; }
  var entry = MEMBER_REGISTRY[memberKey];
  return entry || UNKNOWN_ENTRY;
}
