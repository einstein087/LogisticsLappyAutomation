"""
Tests for the report service (Excel generation).
"""
import os
import pytest
import openpyxl

from app import create_app, db as _db
from app.models import LaptopRequest
from app.services import report_service
from tests.config_test import TestConfig


@pytest.fixture(scope="module")
def app():
    import app as app_module
    _orig = app_module._start_scheduler
    app_module._start_scheduler = lambda a: None

    application = create_app(TestConfig)
    with application.app_context():
        _db.create_all()
        yield application
        _db.drop_all()

    app_module._start_scheduler = _orig


@pytest.fixture(autouse=True)
def clean_db(app):
    with app.app_context():
        yield
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


def _create_request(app, **kwargs):
    defaults = dict(
        requester_name="Alice", requester_email="alice@example.com",
        employee_name="Bob", employee_email="bob@example.com",
        department="Engineering", manager_name="Carol",
        manager_email="carol@example.com", priority="normal",
    )
    defaults.update(kwargs)
    req = LaptopRequest(**defaults)
    _db.session.add(req)
    _db.session.commit()
    return req


class TestReportService:
    def test_generates_xlsx_file(self, app):
        with app.app_context():
            _create_request(app)
            file_path = report_service.generate_weekly_report()

        assert os.path.isfile(file_path)
        assert file_path.endswith(".xlsx")
        # Cleanup
        os.remove(file_path)

    def test_xlsx_has_expected_headers(self, app):
        with app.app_context():
            file_path = report_service.generate_weekly_report()

        wb = openpyxl.load_workbook(file_path)
        ws = wb.active
        # Find header row (first row after blanks)
        headers = None
        for row in ws.iter_rows(values_only=True):
            if "Request ID" in row:
                headers = list(row)
                break

        assert headers is not None
        assert "Employee Name" in headers
        assert "Status" in headers
        os.remove(file_path)

    def test_generate_and_upload_skips_sharepoint_when_unconfigured(self, app):
        """When SharePoint is not configured, upload returns '' and doesn't raise."""
        with app.app_context():
            result = report_service.generate_and_upload()

        assert "file_path" in result
        assert "filename" in result
        assert result["sharepoint_url"] == ""
        # Cleanup
        if os.path.isfile(result["file_path"]):
            os.remove(result["file_path"])

    def test_empty_report_still_generates(self, app):
        """Report generation with no requests should still produce a valid file."""
        with app.app_context():
            file_path = report_service.generate_weekly_report()

        assert os.path.isfile(file_path)
        os.remove(file_path)
