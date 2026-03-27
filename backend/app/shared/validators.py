"""Reusable validation and identifier helper functions."""

import re
import secrets
import string

# Shared business-rule patterns used across later schemas and services.
EMPLOYEE_ID_PATTERN = re.compile(r"^UI[A-Z0-9]{7}$")
PHONE_PATTERN = re.compile(r"^[89]\d{7}$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_location(value: str) -> str:
    """Normalize location strings for exact-match filtering."""

    return value.strip().lower()


def is_valid_employee_id(value: str) -> bool:
    """Return whether the value matches the required employee ID format."""

    return bool(EMPLOYEE_ID_PATTERN.match(value))


def is_valid_phone_number(value: str) -> bool:
    """Return whether the value matches Singapore mobile phone rules."""

    return bool(PHONE_PATTERN.match(value))


def is_valid_email(value: str) -> bool:
    """Return whether the value looks like a pragmatic email address."""

    return bool(EMAIL_PATTERN.match(value))


def generate_employee_id() -> str:
    """Generate a correctly formatted employee ID without checking DB uniqueness."""

    alphabet = string.ascii_uppercase + string.digits
    return "UI" + "".join(secrets.choice(alphabet) for _ in range(7))
