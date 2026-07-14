"""
Integration tests for web routes using Flask test client.
"""
import pytest
from unittest.mock import patch, MagicMock

from app import create_app, db as _db
from app.models import LaptopRequest, ApprovalToken, AuditLog
from app.utils import generate_approval_token
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


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    with app.app_context():
        yield
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


def _post_new_request(client, **overrides):
    data = dict(
        requester_name="Alice Smith",
        requester_email="alice@example.com",
        employee_name="Bob Jones",
        employee_email="bob@example.com",
        department="Engineering",
        manager_name="Carol White",
        manager_email="carol@example.com",
        laptop_model="Dell Latitude 5540",
        priority="normal",
        notes="New hire",
    )
    data.update(overrides)
    with patch("app.routes.requests.email_service.send_approval_request"):
        return client.post("/requests/new", data=data, follow_redirects=True)


class TestDashboard:
    def test_dashboard_loads(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        assert b"Dashboard" in resp.data

    def test_dashboard_alias(self, client):
        resp = client.get("/dashboard")
        assert resp.status_code == 200


class TestNewRequest:
    def test_get_form(self, client):
        resp = client.get("/requests/new")
        assert resp.status_code == 200
        assert b"New Laptop" in resp.data

    def test_submit_valid_request(self, client, app):
        resp = _post_new_request(client)
        assert resp.status_code == 200
        # Should redirect to detail page
        assert b"Request #" in resp.data
        with app.app_context():
            assert LaptopRequest.query.count() == 1

    def test_submit_missing_field_shows_error(self, client, app):
        with patch("app.routes.requests.email_service.send_approval_request"):
            resp = client.post(
                "/requests/new",
                data={"requester_name": "Alice"},  # missing many required fields
                follow_redirects=True,
            )
        assert resp.status_code == 200
        assert b"Please fill in" in resp.data
        with app.app_context():
            assert LaptopRequest.query.count() == 0

    def test_approval_tokens_created(self, client, app):
        _post_new_request(client)
        with app.app_context():
            req = LaptopRequest.query.first()
            tokens = ApprovalToken.query.filter_by(request_id=req.id).all()
            actions = {t.action for t in tokens}
            assert "approve" in actions
            assert "reject" in actions


class TestRequestsList:
    def test_list_empty(self, client):
        resp = client.get("/requests/")
        assert resp.status_code == 200
        assert b"No requests found" in resp.data

    def test_list_shows_request(self, client, app):
        _post_new_request(client)
        resp = client.get("/requests/")
        assert resp.status_code == 200
        assert b"Bob Jones" in resp.data

    def test_list_filter_by_status(self, client, app):
        _post_new_request(client)
        resp = client.get("/requests/?status=pending")
        assert resp.status_code == 200
        assert b"Bob Jones" in resp.data

    def test_list_filter_shows_empty_for_other_status(self, client, app):
        _post_new_request(client)
        resp = client.get("/requests/?status=delivered")
        assert b"No requests found" in resp.data


class TestRequestDetail:
    def test_detail_page(self, client, app):
        _post_new_request(client)
        with app.app_context():
            req = LaptopRequest.query.first()
        resp = client.get(f"/requests/{req.id}")
        assert resp.status_code == 200
        assert b"Bob Jones" in resp.data

    def test_detail_404(self, client):
        resp = client.get("/requests/9999")
        assert resp.status_code == 404

    def test_update_status(self, client, app):
        _post_new_request(client)
        with app.app_context():
            req = LaptopRequest.query.first()
            # First approve manually so update_status can transition
            req.status = LaptopRequest.STATUS_APPROVED
            _db.session.commit()
            req_id = req.id

        with patch("app.routes.requests.email_service.send_status_notification"):
            resp = client.post(
                f"/requests/{req_id}/update",
                data={"status": "in_progress", "actor": "sd@example.com"},
                follow_redirects=True,
            )
        assert resp.status_code == 200
        with app.app_context():
            updated = LaptopRequest.query.get(req_id)
            assert updated.status == "in_progress"


class TestApprovals:
    def test_valid_approve_token(self, client, app):
        _post_new_request(client)
        with app.app_context():
            req = LaptopRequest.query.first()
            token_rec = ApprovalToken.query.filter_by(
                request_id=req.id, action="approve"
            ).first()
            token_str = token_rec.token

        with patch("app.routes.approvals.email_service.send_status_notification"):
            resp = client.get(f"/approvals/action/{token_str}", follow_redirects=True)
        assert resp.status_code == 200
        assert b"approved" in resp.data.lower()

        with app.app_context():
            updated = LaptopRequest.query.first()
            assert updated.status == LaptopRequest.STATUS_APPROVED

    def test_valid_reject_token(self, client, app):
        _post_new_request(client)
        with app.app_context():
            req = LaptopRequest.query.first()
            token_rec = ApprovalToken.query.filter_by(
                request_id=req.id, action="reject"
            ).first()
            token_str = token_rec.token

        with patch("app.routes.approvals.email_service.send_status_notification"):
            resp = client.get(f"/approvals/action/{token_str}", follow_redirects=True)
        assert resp.status_code == 200
        assert b"rejected" in resp.data.lower()

    def test_invalid_token_shows_error(self, client):
        resp = client.get("/approvals/action/not-a-real-token")
        assert resp.status_code == 200
        assert b"expired or is invalid" in resp.data

    def test_replay_attack_blocked(self, client, app):
        """Using the same token twice should be rejected on second attempt."""
        _post_new_request(client)
        with app.app_context():
            req = LaptopRequest.query.first()
            token_rec = ApprovalToken.query.filter_by(
                request_id=req.id, action="approve"
            ).first()
            token_str = token_rec.token

        with patch("app.routes.approvals.email_service.send_status_notification"):
            client.get(f"/approvals/action/{token_str}")
            resp = client.get(f"/approvals/action/{token_str}", follow_redirects=True)

        assert b"already been used" in resp.data


class TestReports:
    def test_reports_list_page(self, client):
        resp = client.get("/reports/")
        assert resp.status_code == 200
        assert b"Compliance Reports" in resp.data

    def test_generate_report(self, client, app):
        with patch("app.routes.reports.report_service.generate_and_upload") as mock_gen:
            mock_gen.return_value = {
                "file_path": "/tmp/test_report.xlsx",
                "filename": "test_report.xlsx",
                "sharepoint_url": "",
            }
            resp = client.post("/reports/generate", follow_redirects=True)
        assert resp.status_code == 200
        assert b"test_report.xlsx" in resp.data or b"generated" in resp.data.lower()

    def test_download_path_traversal_blocked(self, client):
        resp = client.get("/reports/download/../../etc/passwd")
        assert resp.status_code in (400, 404)
