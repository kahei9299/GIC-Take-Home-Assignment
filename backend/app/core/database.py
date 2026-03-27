from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models in the backend."""


SessionLocal = sessionmaker(autoflush=False, autocommit=False, expire_on_commit=False)
_engine: Engine | None = None


def get_engine() -> Engine:
    """Create and cache the SQLAlchemy engine the first time it is needed."""

    global _engine

    if _engine is None:
        settings = get_settings()
        _engine = create_engine(settings.database_url, future=True)

    return _engine


def get_db_session() -> Generator[Session, None, None]:
    """Yield a request-scoped database session bound to the shared engine."""

    session = SessionLocal(bind=get_engine())
    try:
        yield session
    finally:
        session.close()
