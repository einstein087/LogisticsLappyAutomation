"""
Shared utilities: signed token generation / verification.
"""
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature


def generate_approval_token(request_id: int, action: str, app) -> str:
    """Return a URL-safe signed token encoding request_id and action."""
    s = URLSafeTimedSerializer(app.config["SECRET_KEY"])
    return s.dumps({"request_id": request_id, "action": action}, salt="approval-link")


def decode_approval_token(token: str, app) -> dict | None:
    """
    Verify and decode an approval token.
    Returns the payload dict on success, or None if expired / invalid.
    """
    s = URLSafeTimedSerializer(app.config["SECRET_KEY"])
    max_age = app.config.get("APPROVAL_TOKEN_MAX_AGE", 7 * 24 * 3600)
    try:
        payload = s.loads(token, salt="approval-link", max_age=max_age)
        return payload
    except (SignatureExpired, BadSignature):
        return None
