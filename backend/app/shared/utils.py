"""Small shared utility helpers for domain calculations."""

from datetime import date


def calculate_days_worked(start_date: date | None, end_date: date | None = None) -> int:
    """Calculate non-negative elapsed days between start and end dates."""

    if start_date is None:
        return 0

    effective_end = end_date or date.today()
    return max((effective_end - start_date).days, 0)
