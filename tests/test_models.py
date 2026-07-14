"""
Tests for database models.
"""
import pytest
from datetime import datetime, timezone

from app import create_app, db as _db
from app.models import LaptopRequest, ApprovalToken, AuditLog
from tests.config_test import TestConfig


@pytest.fixture(scope="module")
def app():
    # Patch scheduler so it doesn't interfere in tests
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
    """Roll back any changes after each test."""
    with app.app_context():
        yield
        _db.session.rollback()
        for table in reversed(_db.metadata.sorted_tables):
            _db.session.execute(table.delete())
        _db.session.commit()


def _make_request(**kwargs):
    defaults = dict(
        requester_name="Alice Smith",
        requester_email="alice@example.com",
        employee_name="Bob Jones",
        employee_email="bob@example.com",
        department="Engineering",
        manager_name="Carol White",
        manager_email="carol@example.com",
        priority="normal",
    )
    defaults.update(kwargs)
    return LaptopRequest(**defaults)


class TestLaptopRequest:
    def test_default_status_is_pending(self, app):
        with app.app_context():
            req = _make_request()
            _db.session.add(req)
            _db.session.commit()
            assert req.status == LaptopRequest.STATUS_PENDING

    def test_status_label(self, app):
        with app.app_context():
            req = _make_request()
            req.status = "in_progress"
            assert req.status_label() == "In Progress"

    def test_created_at_is_set(self, app):
        with app.app_context():
            req = _make_request()
            _db.session.add(req)
            _db.session.commit()
            assert req.created_at is not None
            assert isinstance(req.created_at, datetime)

    def test_repr(self, app):
        with app.app_context():
            req = _make_request()
            _db.session.add(req)
            _db.session.commit()
            assert "Bob Jones" in repr(req)
            assert "pending" in repr(req)


class TestApprovalToken:
    def test_token_linked_to_request(self, app):
        with app.app_context():
            req = _make_request()
            _db.session.add(req)
            _db.session.flush()

            token = ApprovalToken(request_id=req.id, token="abc123", action="approve")
            _db.session.add(token)
            _db.session.commit()

            loaded = ApprovalToken.query.filter_by(token="abc123").first()
            assert loaded is not None
            assert loaded.request_id == req.id
            assert loaded.used_at is None

    def test_token_marked_used(self, app):
        with app.app_context():
            req = _make_request()
            _db.session.add(req)
            _db.session.flush()

            token = ApprovalToken(request_id=req.id, token="tok456", action="reject")
            _db.session.add(token)
            _db.session.commit()

            token.used_at = datetime.now(timezone.utc)
            token.used_by_ip = "10.0.0.1"
            _db.session.commit()

            loaded = ApprovalToken.query.get(token.id)
            assert loaded.used_at is not None
            assert loaded.used_by_ip == "10.0.0.1"


class TestAuditLog:
    def test_audit_log_creation(self, app):
        with app.app_context():
            req = _make_request()
            _db.session.add(req)
            _db.session.flush()

            log = AuditLog(
                request_id=req.id,
                actor="system",
                action="request_created",
                detail="Test entry",
            )
            _db.session.add(log)
            _db.session.commit()

            loaded = AuditLog.query.filter_by(request_id=req.id).first()
            assert loaded.action == "request_created"
            assert loaded.actor == "system"

    def test_cascade_delete(self, app):
        with app.app_context():
            req = _make_request()
            _db.session.add(req)
            _db.session.flush()

            log = AuditLog(request_id=req.id, actor="system", action="test")
            _db.session.add(log)
            _db.session.commit()

            req_id = req.id
            _db.session.delete(req)
            _db.session.commit()

            assert AuditLog.query.filter_by(request_id=req_id).count() == 0
