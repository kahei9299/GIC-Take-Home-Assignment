"""Unit tests for hosted-runtime database lifecycle helpers."""

from types import SimpleNamespace

from app.core.database import check_database_readiness, dispose_engine
import app.core.database as database_module


class FakeTransaction:
    def __init__(self, connection) -> None:
        self.connection = connection

    def __enter__(self):
        self.connection.events.append("begin")
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.connection.events.append("end")


class FakeConnection:
    def __init__(self) -> None:
        self.events: list[object] = []

    def __enter__(self):
        self.events.append("connect")
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.events.append("disconnect")

    def begin(self) -> FakeTransaction:
        return FakeTransaction(self)

    def exec_driver_sql(self, statement: str) -> None:
        self.events.append(statement)

    def execute(self, statement) -> None:
        self.events.append(str(statement))


class FakeEngine:
    def __init__(self, connection: FakeConnection, dialect_name: str = "postgresql") -> None:
        self._connection = connection
        self.dialect = SimpleNamespace(name=dialect_name)
        self.disposed = False

    def connect(self) -> FakeConnection:
        return self._connection

    def dispose(self) -> None:
        self.disposed = True


def test_check_database_readiness_uses_local_timeout_for_postgres(monkeypatch) -> None:
    connection = FakeConnection()
    engine = FakeEngine(connection)

    monkeypatch.setattr(database_module, "get_settings", lambda: SimpleNamespace(readiness_check_timeout_seconds=1.5))
    monkeypatch.setattr(database_module, "get_engine", lambda: engine)

    check_database_readiness()

    assert connection.events == [
        "connect",
        "begin",
        "SET LOCAL statement_timeout = 1500",
        "SELECT 1",
        "end",
        "disconnect",
    ]


def test_dispose_engine_resets_shared_engine() -> None:
    engine = FakeEngine(FakeConnection())
    database_module._engine = engine

    try:
        dispose_engine()
    finally:
        database_module._engine = None

    assert engine.disposed is True
    assert database_module._engine is None
