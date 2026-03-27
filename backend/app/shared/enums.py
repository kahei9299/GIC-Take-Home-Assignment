"""Shared enums used by request schemas, models, and services."""

from enum import Enum


class Gender(str, Enum):
    """Canonical gender values defined by the assignment contract."""

    MALE = "Male"
    FEMALE = "Female"
