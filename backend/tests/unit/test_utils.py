from datetime import date, timedelta

from app.shared.utils import calculate_days_worked


def test_calculate_days_worked_returns_zero_when_start_date_missing() -> None:
    assert calculate_days_worked(None) == 0


def test_calculate_days_worked_returns_zero_for_same_day_start() -> None:
    assert calculate_days_worked(date.today()) == 0


def test_calculate_days_worked_returns_expected_positive_days() -> None:
    assert calculate_days_worked(date.today() - timedelta(days=5)) == 5


def test_calculate_days_worked_clamps_future_dates_to_zero() -> None:
    assert calculate_days_worked(date.today() + timedelta(days=3)) == 0


def test_calculate_days_worked_uses_explicit_end_date() -> None:
    start_date = date(2026, 3, 20)
    end_date = date(2026, 3, 27)

    assert calculate_days_worked(start_date, end_date) == 7
