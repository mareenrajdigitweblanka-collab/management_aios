"""SQLAlchemy ORM model for management_aios.member_schedule_events.

This model mirrors database/member_schedule_events_schema.sql exactly. It
does not create or alter the table itself — the SQL file is the source of
truth for schema DDL; this class is only the Python-side mapping used by
the API.
"""

import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    String,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import UUID

from backend.database import Base


class MemberScheduleEvent(Base):
    __tablename__ = "member_schedule_events"
    __table_args__ = (
        CheckConstraint(
            "member_key IN ('mayurika', 'suman', 'arun', 'rajiv')",
            name="member_schedule_events_member_key_check",
        ),
        CheckConstraint(
            "priority IN ('High', 'Medium', 'Low')",
            name="member_schedule_events_priority_check",
        ),
        CheckConstraint(
            "source_scope IN ('dashboard_testing', 'pilot', 'approved_live')",
            name="member_schedule_events_source_scope_check",
        ),
        CheckConstraint(
            "start_time IS NULL OR end_time IS NULL OR end_time > start_time",
            name="member_schedule_events_time_check",
        ),
        {"schema": "management_aios"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    member_key = Column(String, nullable=False)
    member_label = Column(String, nullable=False)

    event_date = Column(Date, nullable=False)
    title = Column(String(60), nullable=False)
    category = Column(String, nullable=False, server_default="Sample Task")
    priority = Column(String, nullable=False, server_default="Medium")
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    notes = Column(String(240), nullable=True)

    source_scope = Column(String, nullable=False, server_default="dashboard_testing")
    is_official_truth = Column(Boolean, nullable=False, server_default=text("false"))

    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    deleted_at = Column(DateTime(timezone=True), nullable=True)
