"""
Tests for the approval token utilities.
"""
import pytest
from app import create_app
from app.utils import generate_approval_token, decode_approval_token
from tests.config_test import TestConfig


@pytest.fixture(scope="module")
def app():
    import app as app_module
    _orig = app_module._start_scheduler
    app_module._start_scheduler = lambda a: None

    application = create_app(TestConfig)
    app_module._start_scheduler = _orig
    return application


class TestApprovalTokenUtils:
    def test_generate_and_decode_approve(self, app):
        token = generate_approval_token(42, "approve", app)
        payload = decode_approval_token(token, app)
        assert payload is not None
        assert payload["request_id"] == 42
        assert payload["action"] == "approve"

    def test_generate_and_decode_reject(self, app):
        token = generate_approval_token(7, "reject", app)
        payload = decode_approval_token(token, app)
        assert payload["action"] == "reject"
        assert payload["request_id"] == 7

    def test_invalid_token_returns_none(self, app):
        result = decode_approval_token("not-a-valid-token", app)
        assert result is None

    def test_tampered_token_returns_none(self, app):
        token = generate_approval_token(1, "approve", app)
        tampered = token[:-4] + "XXXX"
        result = decode_approval_token(tampered, app)
        assert result is None

    def test_expired_token_returns_none(self, app):
        """Simulate expiry by patching time so the token appears old."""
        from unittest.mock import patch
        import time

        token = generate_approval_token(5, "approve", app)
        # Patch time to be far in the future so the token appears expired
        future_time = time.time() + app.config["APPROVAL_TOKEN_MAX_AGE"] + 10
        with patch("itsdangerous.timed.time") as mock_time:
            mock_time.return_value = future_time
            result = decode_approval_token(token, app)
        assert result is None
