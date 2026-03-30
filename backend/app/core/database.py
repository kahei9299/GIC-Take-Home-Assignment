from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings
from app.core.resilience import classify_database_dependency_error


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models in the backend."""


SessionLocal = sessionmaker(autoflush=False, autocommit=False, expire_on_commit=False)
_engine: Engine | None = None


def get_engine() -> Engine:
    """Create and cache the SQLAlchemy engine the first time it is needed."""

    global _engine

    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.database_url,
            future=True,
            pool_pre_ping=True,
            pool_timeout=settings.database_pool_timeout_seconds,
            pool_recycle=settings.database_pool_recycle_seconds,
            pool_size=settings.database_pool_size,
            max_overflow=settings.database_max_overflow,
            connect_args={"connect_timeout": settings.database_connect_timeout_seconds},
        )

        @event.listens_for(_engine, "connect")
        def configure_connection(dbapi_connection, _connection_record) -> None:
            """Set a per-connection statement timeout so DB calls stay bounded."""

            if _engine is None or _engine.dialect.name != "postgresql":
                return

            with dbapi_connection.cursor() as cursor:
                cursor.execute(f"SET statement_timeout = {settings.database_statement_timeout_ms}")

    return _engine


def get_db_session() -> Generator[Session, None, None]:
    """Yield a request-scoped database session bound to the shared engine."""

    session = SessionLocal(bind=get_engine())
    try:
        yield session
    except SQLAlchemyError as exc:
        dependency_error = classify_database_dependency_error(exc)
        if dependency_error is not None:
            raise dependency_error from exc
        raise
    finally:
        session.close()


def dispose_engine() -> None:
    """Dispose the shared SQLAlchemy engine when the process is shutting down."""

    global _engine

    if _engine is not None:
        _engine.dispose()
        _engine = None


def check_database_readiness(timeout_seconds: float | None = None) -> None:
    """Raise when PostgreSQL cannot be reached within the readiness timeout budget."""

    settings = get_settings()
    timeout_ms = int((timeout_seconds or settings.readiness_check_timeout_seconds) * 1000)
    engine = get_engine()

    try:
        with engine.connect() as connection:
            if engine.dialect.name == "postgresql":
                # Scope the readiness timeout to this probe transaction so pooled
                # request connections keep their normal statement timeout.
                with connection.begin():
                    connection.exec_driver_sql(f"SET LOCAL statement_timeout = {timeout_ms}")
                    connection.execute(text("SELECT 1"))
            else:
                connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        dependency_error = classify_database_dependency_error(exc)
        if dependency_error is not None:
            raise dependency_error from exc
        raise
