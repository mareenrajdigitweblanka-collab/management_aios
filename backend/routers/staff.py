"""Staff Data dashboard endpoints — read-only.

This router exposes the management_aios.staff_dashboard_records
projection for the Staff Data dashboard module. It never writes: there is
no create/update/delete route here, and none is planned for this phase.
The only write path to this table is scripts/import_staff_dashboard_csv.py.

HR remains the authoritative staff-record source (CLAUDE.md §9.1). This
table and API are a controlled dashboard projection, not a replacement HR
master.

No salary/home_address/personal_email/personal_phone/contact_number/
guardian_phone/guardian_number field is ever returned — those columns do
not exist on StaffDashboardRecord at all (see backend/models.py), and
StaffRecordOut (backend/schemas.py) additionally only declares the 16
approved fields, so nothing else could be exposed by this router even if
the ORM model changed shape unexpectedly.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from backend.config import VALID_EMPLOYMENT_STAGES, VALID_LOCATIONS, VALID_STAFF_STATUSES
from backend.database import get_db
from backend.models import StaffDashboardRecord
from backend.schemas import (
    StaffFilterOptionsResponse,
    StaffListResponse,
    StaffRecordOut,
    StaffSummaryResponse,
)

router = APIRouter(prefix="/api/staff", tags=["staff"])

DEFAULT_LIMIT = 50
MAX_LIMIT = 500

# UI sort key -> ORM column. Table sorting only (Staff Table UX upgrade,
# 2026-07-13) — omitting sort_by preserves the original hardcoded order
# below exactly, so existing callers see no behavior change.
SORTABLE_COLUMNS = {
    "full_name": StaffDashboardRecord.full_name,
    "employee_number": StaffDashboardRecord.employee_number,
    "department_team": StaffDashboardRecord.department_team,
    "designation": StaffDashboardRecord.designation,
    "staff_status": StaffDashboardRecord.staff_status,
    "employment_stage": StaffDashboardRecord.employment_stage,
    "location": StaffDashboardRecord.location,
    "date_of_joining": StaffDashboardRecord.date_of_joining,
}
VALID_SORT_DIRECTIONS = ("asc", "desc")


def _base_query(db: Session):
    return db.query(StaffDashboardRecord).filter(
        StaffDashboardRecord.is_current.is_(True)
    )


def _apply_filters(
    query,
    team: Optional[str],
    staff_status: Optional[str],
    employment_stage: Optional[List[str]],
    search: Optional[str],
    location: Optional[str] = None,
):
    if team:
        query = query.filter(StaffDashboardRecord.department_team == team)
    if staff_status:
        if staff_status not in VALID_STAFF_STATUSES:
            raise HTTPException(
                status_code=422,
                detail=f"staff_status must be one of {VALID_STAFF_STATUSES}.",
            )
        query = query.filter(StaffDashboardRecord.staff_status == staff_status)
    if location:
        if location not in VALID_LOCATIONS:
            raise HTTPException(
                status_code=422,
                detail=f"location must be one of {VALID_LOCATIONS}.",
            )
        query = query.filter(StaffDashboardRecord.location == location)
    if employment_stage:
        for stage in employment_stage:
            if stage not in VALID_EMPLOYMENT_STAGES:
                raise HTTPException(
                    status_code=422,
                    detail=f"employment_stage must be one of {VALID_EMPLOYMENT_STAGES}.",
                )
        query = query.filter(StaffDashboardRecord.employment_stage.in_(employment_stage))
    if search:
        like_term = f"%{search}%"
        query = query.filter(
            or_(
                StaffDashboardRecord.full_name.ilike(like_term),
                StaffDashboardRecord.calling_name.ilike(like_term),
                StaffDashboardRecord.employee_number.ilike(like_term),
                StaffDashboardRecord.designation.ilike(like_term),
            )
        )
    return query


@router.get("", response_model=StaffListResponse)
def list_staff_records(
    team: Optional[str] = Query(default=None),
    staff_status: Optional[str] = Query(default=None),
    employment_stage: Optional[List[str]] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=100),
    location: Optional[str] = Query(default=None),
    sort_by: Optional[str] = Query(default=None),
    sort_direction: str = Query(default="asc"),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    query = _apply_filters(_base_query(db), team, staff_status, employment_stage, search, location)

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
        # employee_number is a stable secondary tiebreaker for any requested
        # sort column, matching the tiebreaker role it already plays in the
        # default ordering below.
        order_clauses = [primary.nulls_last(), asc(StaffDashboardRecord.employee_number)]
    else:
        # Deterministic default ordering: full_name (nulls last), then
        # employee_number, then source_row_reference as a final tiebreaker
        # so pagination is stable across requests even for rows with
        # identical/blank names. Unchanged from before sort_by existed.
        order_clauses = [
            asc(StaffDashboardRecord.full_name).nulls_last(),
            asc(StaffDashboardRecord.employee_number),
            asc(StaffDashboardRecord.source_row_reference),
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
            "team": team,
            "staff_status": staff_status,
            "employment_stage": employment_stage,
            "search": search,
            "location": location,
            "sort_by": sort_by,
            "sort_direction": sort_direction,
        },
    )


@router.get("/summary", response_model=StaffSummaryResponse)
def staff_summary(db: Session = Depends(get_db)):
    base = _base_query(db)

    def count_where(*conditions):
        q = base
        for c in conditions:
            q = q.filter(c)
        return q.with_entities(func.count(StaffDashboardRecord.id)).scalar()

    return StaffSummaryResponse(
        total=count_where(),
        active=count_where(StaffDashboardRecord.staff_status == "Active"),
        inactive=count_where(StaffDashboardRecord.staff_status == "Inactive"),
        ph=count_where(StaffDashboardRecord.department_team == "PH"),
        permanent=count_where(StaffDashboardRecord.employment_stage == "Permanent"),
        probation=count_where(StaffDashboardRecord.employment_stage == "Probation"),
        training_7_day=count_where(StaffDashboardRecord.employment_stage == "training_7_day"),
        verify=count_where(StaffDashboardRecord.employment_stage == "[VERIFY]"),
    )


@router.get("/filter-options", response_model=StaffFilterOptionsResponse)
def staff_filter_options(db: Session = Depends(get_db)):
    base = _base_query(db)

    teams = [
        row[0]
        for row in base.with_entities(StaffDashboardRecord.department_team)
        .filter(StaffDashboardRecord.department_team.isnot(None))
        .distinct()
        .order_by(StaffDashboardRecord.department_team)
        .all()
    ]
    statuses = [
        row[0]
        for row in base.with_entities(StaffDashboardRecord.staff_status)
        .filter(StaffDashboardRecord.staff_status.isnot(None))
        .distinct()
        .order_by(StaffDashboardRecord.staff_status)
        .all()
    ]
    stages = [
        row[0]
        for row in base.with_entities(StaffDashboardRecord.employment_stage)
        .filter(StaffDashboardRecord.employment_stage.isnot(None))
        .distinct()
        .order_by(StaffDashboardRecord.employment_stage)
        .all()
    ]
    locations = [
        row[0]
        for row in base.with_entities(StaffDashboardRecord.location)
        .filter(StaffDashboardRecord.location.isnot(None))
        .distinct()
        .order_by(StaffDashboardRecord.location)
        .all()
    ]

    return StaffFilterOptionsResponse(
        teams=teams,
        staff_statuses=statuses,
        employment_stages=stages,
        locations=locations,
    )
