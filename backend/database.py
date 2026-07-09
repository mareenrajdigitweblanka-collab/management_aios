"""SQLAlchemy engine/session setup for the member schedule API.

DATABASE_URL must be provided via the environment (see backend/config.py and
.env.example). This module does not fall back to any hardcoded connection
string — if DATABASE_URL is unset, engine creation is deferred until first
use so the app can still import cleanly (e.g. for syntax/import checks)
without a live database.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.config import DATABASE_URL

Base = declarative_base()

_engine = None
_SessionLocal = None


def get_engine():
    global _engine
    if _engine is None:
        if not DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL environment variable is not set. "
                "Copy .env.example to .env and provide a real connection string "
                "before running the API against a database."
            )
        _engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(
            bind=get_engine(), autocommit=False, autoflush=False
        )
    return _SessionLocal


def get_db():
    session_factory = get_session_factory()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()
