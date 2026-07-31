"""Calendar member-token authorization (2026-07-29 approved requirement).

Everyone may continue viewing all Calendar data and existing read-only
reports without a token. Creating, updating, deleting, dragging/resizing,
changing Task outcomes, clearing testing data, and managing Leave all
require a valid member token. Five separate per-member tokens exist (see
backend/config.py CALENDAR_AUTH_TOKEN_ENV_VARS) — a token may only ever
mutate that same member's own records; there is no cross-member override.

ONE internal function, validate_calendar_auth_token below, is the single
source of truth for "is this token valid, and for which member." Both the
FastAPI dependency (get_verified_member, added to every mutation route in
backend/routers/member_schedules.py and backend/routers/member_leave.py)
and POST /api/calendar-auth/verify call it directly; neither re-implements
any part of the hashing/comparison.

require_matching_member is the single shared cross-member guard every
mutation route calls, before any database access, to compare the verified
acting member against the route's own {member_key} path segment.
"""

import hashlib
import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from backend.config import MEMBER_LABELS, load_calendar_auth_token_hashes

router = APIRouter(prefix="/api/calendar-auth", tags=["calendar-auth"])

_BEARER_PREFIX = "Bearer "


def _hash_token(token: str) -> str:
    """SHA-256 hex digest of a candidate token — the same shape every
    configured CALENDAR_AUTH_TOKEN_HASH_* value must already be in
    (backend/config.py _looks_like_sha256_hex_digest), so the two are
    always directly comparable."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def validate_calendar_auth_token(authorization: Optional[str]) -> str:
    """THE single internal complete-token validator — never duplicated by
    any other function in this codebase. Accepts the raw Authorization
    header value only (never a query param, body field, or cookie).

    Returns the verified member_key on success. Raises HTTPException(401)
    for every failure case — missing header, malformed/non-Bearer header,
    blank token, an unconfigured/misconfigured backend, or a token that
    matches no configured member — so a caller can never distinguish "the
    backend isn't configured" from "the token is wrong" by status code
    alone (fail closed: misconfiguration is never treated as "no auth
    required").

    Never logs the header, the token, any hash, or any prefix/substring of
    either — only a fixed, token-free message ever leaves this function."""
    if not authorization or not authorization.startswith(_BEARER_PREFIX):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header. Expected: Bearer <token>.",
        )

    token = authorization[len(_BEARER_PREFIX):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token.")

    try:
        configured_hashes = load_calendar_auth_token_hashes()
    except RuntimeError:
        # Fail closed — a misconfigured backend must never accept ANY
        # token as valid. Startup validation (backend/main.py lifespan)
        # is what normally stops a misconfigured deployment from ever
        # serving traffic; this branch only guards a request that
        # somehow still reaches here despite that.
        raise HTTPException(status_code=401, detail="Calendar authorization is not available.")

    candidate_hash = _hash_token(token)

    # Compares against EVERY configured member hash with
    # hmac.compare_digest, with no early return on the first match — an
    # early-exit loop would let response timing hint at which member's
    # hash the candidate token is closest to. Hash uniqueness is already
    # enforced by load_calendar_auth_token_hashes, so at most one match is
    # ever possible here.
    matched_member: Optional[str] = None
    for member_key, configured_hash in configured_hashes.items():
        if hmac.compare_digest(candidate_hash, configured_hash):
            matched_member = member_key

    if matched_member is None:
        raise HTTPException(status_code=401, detail="Invalid token.")

    return matched_member


def get_verified_member(authorization: Optional[str] = Header(default=None)) -> str:
    """FastAPI dependency — the ONLY way any mutation route obtains an
    acting-member identity. Delegates entirely to
    validate_calendar_auth_token; adds no comparison logic of its own, so
    the dependency and POST /api/calendar-auth/verify can never disagree
    about what counts as a valid token."""
    return validate_calendar_auth_token(authorization)


def require_matching_member(route_member_key: str, acting_member: str) -> None:
    """The single shared cross-member guard every mutation route calls
    before any database access. Raises 403 (never 404 — the member named
    in the URL is a real, valid member; the caller is simply not
    authorized to act as them) when the verified acting member does not
    match the route's own {member_key} target. No admin/coordinator/HR/
    manager override exists — this comparison has no bypass.

    The returned detail carries machine-readable actingMember/targetMember
    fields alongside the approved human-readable message so the frontend
    never needs to re-derive the message text itself from an untrusted
    local value."""
    if route_member_key != acting_member:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "cross_member_mutation_denied",
                "message": (
                    "You are authorized as " + MEMBER_LABELS[acting_member]
                    + ". You can view " + MEMBER_LABELS[route_member_key]
                    + "'s schedule, but you can only manage your own Tasks and Leave."
                ),
                "actingMember": acting_member,
                "targetMember": route_member_key,
            },
        )


@router.post("/verify")
def verify_calendar_auth_token(member_key: str = Depends(get_verified_member)) -> dict:
    """POST /api/calendar-auth/verify — the only endpoint a browser calls
    to check a token BEFORE storing it in localStorage. Reuses
    get_verified_member (which reuses validate_calendar_auth_token) rather
    than re-implementing any comparison. Returns only a member key and a
    safe display label — never the token, never a hash, never any other
    member's information."""
    return {"memberKey": member_key, "displayLabel": MEMBER_LABELS[member_key]}
