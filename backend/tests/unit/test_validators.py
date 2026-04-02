from app.shared.enums import Gender
from app.shared.validators import (
    EMPLOYEE_ID_PATTERN,
    generate_employee_id,
    is_valid_email,
    is_valid_employee_id,
    is_valid_logo_value,
    is_valid_phone_number,
    normalize_location,
)


def test_gender_enum_exposes_expected_values() -> None:
    assert Gender.MALE.value == "Male"
    assert Gender.FEMALE.value == "Female"
    assert {member.value for member in Gender} == {"Male", "Female"}


def test_valid_employee_id_passes_validation() -> None:
    assert is_valid_employee_id("UIABC1234") is True


def test_invalid_employee_ids_fail_validation() -> None:
    assert is_valid_employee_id("XXABC1234") is False
    assert is_valid_employee_id("UIabc1234") is False
    assert is_valid_employee_id("UIABC123") is False
    assert is_valid_employee_id("UIABC12345") is False
    assert is_valid_employee_id("UIABC12$4") is False


def test_valid_phone_numbers_pass_validation() -> None:
    assert is_valid_phone_number("81234567") is True
    assert is_valid_phone_number("91234567") is True


def test_invalid_phone_numbers_fail_validation() -> None:
    assert is_valid_phone_number("71234567") is False
    assert is_valid_phone_number("8123456") is False
    assert is_valid_phone_number("812345678") is False
    assert is_valid_phone_number("81234A67") is False


def test_valid_emails_pass_validation() -> None:
    assert is_valid_email("alice@example.com") is True
    assert is_valid_email("bob.smith@example.co") is True


def test_invalid_emails_fail_validation() -> None:
    assert is_valid_email("aliceexample.com") is False
    assert is_valid_email("alice@") is False
    assert is_valid_email("alice @example.com") is False


def test_logo_value_accepts_http_and_data_urls() -> None:
    assert is_valid_logo_value("https://example.com/logo.png") is True
    assert is_valid_logo_value("data:image/png;base64,ZmFrZQ==") is True


def test_logo_value_rejects_invalid_strings() -> None:
    assert is_valid_logo_value("ftp://example.com/logo.png") is False
    assert is_valid_logo_value("not-a-logo") is False


def test_location_normalization_trims_and_lowercases() -> None:
    assert normalize_location("  Bugis  ") == "bugis"


def test_generated_employee_id_matches_expected_format() -> None:
    employee_id = generate_employee_id()

    assert len(employee_id) == 9
    assert bool(EMPLOYEE_ID_PATTERN.match(employee_id)) is True
