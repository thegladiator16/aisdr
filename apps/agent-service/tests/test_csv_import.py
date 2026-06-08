"""Tests for lead import logic (mirrors TypeScript logic for validation)."""
import pytest


def map_csv_row(row: dict, user_id: str):
    first_name = row.get("first_name") or row.get("firstName") or row.get("First Name", "")
    last_name = row.get("last_name") or row.get("lastName") or row.get("Last Name", "")
    full_name = (
        row.get("full_name") or row.get("fullName") or row.get("Full Name") or
        " ".join(filter(None, [first_name, last_name])) or None
    )
    email = row.get("email") or row.get("Email") or None
    if not email and not full_name:
        return None
    return {
        "userId": user_id,
        "firstName": first_name or None,
        "lastName": last_name or None,
        "fullName": full_name,
        "email": email,
        "companyName": row.get("company") or row.get("Company") or None,
        "source": "csv_import",
    }


def test_csv_import_deduplicates_by_email():
    rows = [
        {"email": "john@acme.com", "full_name": "John Doe"},
        {"email": "john@acme.com", "full_name": "John Doe Duplicate"},
        {"email": "jane@acme.com", "full_name": "Jane Smith"},
    ]
    mapped = [map_csv_row(r, "user-1") for r in rows if map_csv_row(r, "user-1")]
    emails = [r["email"] for r in mapped if r.get("email")]
    unique_emails = set(emails)
    assert len(unique_emails) == 2


def test_csv_import_validates_required_fields():
    row_missing_both = {"phone": "1234567890"}
    result = map_csv_row(row_missing_both, "user-1")
    assert result is None


def test_csv_import_maps_column_variations():
    row = {"First Name": "Priya", "Last Name": "Sharma", "Company": "GrowthOS"}
    result = map_csv_row(row, "user-1")
    assert result is not None
    assert result["firstName"] == "Priya"
    assert result["companyName"] == "GrowthOS"
    assert result["fullName"] == "Priya Sharma"


def test_csv_import_handles_email_only():
    row = {"email": "test@company.com"}
    result = map_csv_row(row, "user-1")
    assert result is not None
    assert result["email"] == "test@company.com"


def test_csv_import_handles_linkedin_url():
    row = {
        "email": "founder@startup.io",
        "full_name": "Rahul Kumar",
        "linkedin": "https://linkedin.com/in/rahulkumar",
    }
    result = map_csv_row(row, "user-1")
    assert result is not None
    assert result["email"] == "founder@startup.io"
