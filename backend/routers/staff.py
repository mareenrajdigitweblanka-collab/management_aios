"""Staff Data dashboard endpoints — read-only.

This router exposes the management_aios.staff_dashboard_records table,
which as of 2026-08-11 is an EXACT mirror of employee_management.staff on
the Ledsone operational database — per explicit, deliberate user
instruction (see backend/models.py StaffDashboardRecord docstring and
member-aios/staff-data/README.md §0 for the full rationale, including the
fcm_token exclusion). There is currently no write path to this table — the
2026-08-11 population was a one-time bulk load, not a repeatable script
(scripts/sync_staff_dashboard_from_ledsone.py is superseded, built for the
prior curated 5-column shape).

Field names below match employee_management.staff exactly (staff_code,
name, team_id, joined_date, ...) rather than the former dashboard-specific
names (employee_number, full_name, department_team, date_of_joining) —
this is a breaking API contract change. team_id is a raw integer (mostly
NULL in the source) with no name lookup available in this table; the
former human-readable `department_team` filter/sort/team-list is gone
without a direct replacement — see StaffFilterOptionsResponse docstring.

No `is_current`/soft-delete filtering is applied by default — every row in
the table is returned unless the caller filters on `delete_status`
explicitly, consistent with "exact mirror, no curation".

Authentication (REQ-AUTH-MODULES-007, 2026-08-10): every route below
requires the existing Calendar member token — Depends(get_verified_member),
the same dependency every Task/Leave mutation route already uses (backend/
routers/calendar_auth.py). Any authenticated Management Team member (or MD)
may read; there is no per-member scoping here, matching Knowledge
Management's own "any authenticated member may read" convention rather
than Task/Leave's own-member-only mutation lock (staff records are not
owned by a particular member).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import StaffDashboardRecord
from backend.routers.calendar_auth import get_verified_member
from backend.schemas import (
    StaffFilterOptionsResponse,
    StaffListResponse,
    StaffRecordOut,
)

router = APIRouter(prefix="/api/staff", tags=["staff"])

DEFAULT_LIMIT = 50
MAX_LIMIT = 500

# UI sort key -> ORM column. Table sorting only (Staff Table UX upgrade,
# 2026-07-13) — field names updated 2026-08-11 to match the exact Ledsone
# mirror (see module docstring).
SORTABLE_COLUMNS = {
    "name": StaffDashboardRecord.name,
    "staff_code": StaffDashboardRecord.staff_code,
    "team_id": StaffDashboardRecord.team_id,
    "designation": StaffDashboardRecord.designation,
    "joined_date": StaffDashboardRecord.joined_date,
}
VALID_SORT_DIRECTIONS = ("asc", "desc")


def _apply_filters(
    query,
    team_id: Optional[int],
    search: Optional[str],
):
    if team_id is not None:
        query = query.filter(StaffDashboardRecord.team_id == team_id)
    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                StaffDashboardRecord.name.ilike(like_term),
                StaffDashboardRecord.staff_code.ilike(like_term),
                StaffDashboardRecord.designation.ilike(like_term),
            )
        )
    return query


@router.get("", response_model=StaffListResponse)
def list_staff_records(
    team_id: Optional[int] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=100),
    sort_by: Optional[str] = Query(default=None),
    sort_direction: str = Query(default="asc"),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    acting_member: str = Depends(get_verified_member),
):
    query = _apply_filters(db.query(StaffDashboardRecord), team_id, search)

    total = query.with_entities(func.count(StaffDashboardRecord.id)).scalar()

    if sort_by is not None:
        if sort_by not in SORTABLE_COLUMNS:
            raise HTTPException(
                status_code=422,
                detail=f"sort_by must be one of {sorted(SORTABLE_COLUMNS)}.",
            )
        if sort_direction not in VALID_SORT_DIRECTIONS:
            raise HTTPException(
                status_code=422,
                detail=f"sort_direction must be one of {VALID_SORT_DIRECTIONS}.",
            )
        sort_col = SORTABLE_COLUMNS[sort_by]
        primary = desc(sort_col) if sort_direction == "desc" else asc(sort_col)
        # staff_code is a stable secondary tiebreaker for any requested
        # sort column, matching the tiebreaker role it already plays in the
        # default ordering below.
        order_clauses = [primary.nulls_last(), asc(StaffDashboardRecord.staff_code)]
    else:
        # Deterministic default ordering: name (nulls last), then
        # staff_code, then id as a final tiebreaker so pagination is
        # stable across requests even for rows with identical/blank names.
        order_clauses = [
            asc(StaffDashboardRecord.name).nulls_last(),
            asc(StaffDashboardRecord.staff_code),
            asc(StaffDashboardRecord.id),
        ]

    rows = (
        query.order_by(*order_clauses)
        .offset(offset)
        .limit(limit)
        .all()
    )

    return StaffListResponse(
        records=[StaffRecordOut.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
        filters={
            "team_id": team_id,
            "search": search,
            "sort_by": sort_by,
            "sort_direction": sort_direction,
        },
    )


@router.get("/filter-options", response_model=StaffFilterOptionsResponse)
def staff_filter_options(db: Session = Depends(get_db), acting_member: str = Depends(get_verified_member)):
    team_ids = [
        row[0]
        for row in db.query(StaffDashboardRecord)
        .with_entities(StaffDashboardRecord.team_id)
        .filter(StaffDashboardRecord.team_id.isnot(None))
        .distinct()
        .order_by(StaffDashboardRecord.team_id)
        .all()
    ]

    return StaffFilterOptionsResponse(team_ids=team_ids)
