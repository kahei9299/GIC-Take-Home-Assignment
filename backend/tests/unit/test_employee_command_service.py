from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import ConflictError
from app.employees import command_service
from app.employees.schemas import EmployeeWriteRequest


class DummySession:
    def __init__(self) -> None:
        self.committed = False
        self.rolled_back = False

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


def test_create_unique_employee_id_retries_on_collision(monkeypatch) -> None:
    session = object()
    candidates = iter(["UIAAAAAAA", "UIBBBBBBB"])

    monkeypatch.setattr(command_service, "generate_employee_id", lambda: next(candidates))
    monkeypatch.setattr(
        command_service,
        "fetch_employee",
        lambda _session, employee_id: SimpleNamespace(id=employee_id) if employee_id == "UIAAAAAAA" else None,
    )

    assert command_service.create_unique_employee_id(session) == "UIBBBBBBB"


def test_apply_assignment_transition_preserves_same_cafe_assignment(monkeypatch) -> None:
    session = object()
    assignment = SimpleNamespace(cafe_id="cafe-1", end_date=None)

    monkeypatch.setattr(command_service, "fetch_active_assignment", lambda _session, _employee_id: assignment)
    monkeypatch.setattr(command_service, "update_assignment", lambda *_args, **_kwargs: pytest.fail("should not update"))
    monkeypatch.setattr(command_service, "create_assignment", lambda *_args, **_kwargs: pytest.fail("should not create"))

    command_service._apply_assignment_transition(session, "employee-1", "cafe-1")

    assert assignment.end_date is None


def test_apply_assignment_transition_closes_old_row_and_creates_new_one(monkeypatch) -> None:
    session = object()
    assignment = SimpleNamespace(cafe_id="cafe-1", end_date=None)
    created: dict = {}

    monkeypatch.setattr(command_service, "fetch_active_assignment", lambda _session, _employee_id: assignment)
    monkeypatch.setattr(command_service, "update_assignment", lambda _session, current: current)
    monkeypatch.setattr(
        command_service,
        "create_assignment",
        lambda _session, employee_id, cafe_id, start_date: created.update(
            {"employee_id": employee_id, "cafe_id": cafe_id, "start_date": start_date}
        ),
    )

    command_service._apply_assignment_transition(session, "employee-1", "cafe-2")

    assert assignment.end_date == date.today()
    assert created == {
        "employee_id": "employee-1",
        "cafe_id": "cafe-2",
        "start_date": date.today(),
    }


def test_apply_assignment_transition_unassigns_without_creating_new_row(monkeypatch) -> None:
    session = object()
    assignment = SimpleNamespace(cafe_id="cafe-1", end_date=None)
    monkeypatch.setattr(command_service, "fetch_active_assignment", lambda _session, _employee_id: assignment)
    monkeypatch.setattr(command_service, "update_assignment", lambda _session, current: current)
    monkeypatch.setattr(command_service, "create_assignment", lambda *_args, **_kwargs: pytest.fail("should not create"))

    command_service._apply_assignment_transition(session, "employee-1", None)

    assert assignment.end_date == date.today()


def test_commit_or_raise_conflict_rolls_back_and_raises_conflict() -> None:
    session = DummySession()
    session.commit = lambda: (_ for _ in ()).throw(
        IntegrityError(
            "stmt",
            {},
            SimpleNamespace(diag=SimpleNamespace(constraint_name="uq_employees_email_address")),
        )
    )

    with pytest.raises(ConflictError, match="Employee email address or phone number already exists"):
        command_service._commit_or_raise_conflict(session)

    assert session.rolled_back is True


def test_raise_employee_conflict_maps_active_assignment_constraint() -> None:
    exc = IntegrityError(
        "stmt",
        {},
        SimpleNamespace(diag=SimpleNamespace(constraint_name="uq_employee_assignments_one_active_per_employee")),
    )

    with pytest.raises(ConflictError, match="Employee already has an active assignment"):
        command_service._raise_employee_conflict(exc)


def test_raise_employee_conflict_falls_back_to_generic_message() -> None:
    exc = IntegrityError(
        "stmt",
        {},
        SimpleNamespace(diag=SimpleNamespace(constraint_name="some_other_constraint")),
    )

    with pytest.raises(ConflictError, match="Employee write conflicted with existing data"):
        command_service._raise_employee_conflict(exc)


def test_employee_write_request_trims_name_and_validates_fields() -> None:
    payload = EmployeeWriteRequest(
        name="  Alicia Tan  ",
        email_address="alicia.tan@example.com",
        phone_number="81230001",
        gender="Female",
        cafe_id=None,
    )

    assert payload.name == "Alicia Tan"
