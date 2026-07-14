"""
Approvals blueprint.

GET /approvals/action/<token>  – manager clicks Approve or Reject link from email
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, render_template, request as flask_request, redirect, url_for, current_app

from app import db
from app.models import LaptopRequest, ApprovalToken, AuditLog
from app.services import email_service
from app.utils import decode_approval_token

logger = logging.getLogger(__name__)

bp = Blueprint("approvals", __name__, url_prefix="/approvals")


@bp.route("/action/<token>")
def handle_action(token: str):
    """Validate the signed token and apply the approval/rejection."""
    payload = decode_approval_token(token, current_app)
    if payload is None:
        return render_template("approval_result.html",
                               success=False,
                               message="This approval link has expired or is invalid. "
                                       "Please contact the Service Desk for assistance.")

    request_id, action = payload["request_id"], payload["action"]

    # Look up stored token record (for audit / replay-prevention)
    token_record = ApprovalToken.query.filter_by(token=token).first()
    if token_record and token_record.used_at is not None:
        return render_template("approval_result.html",
                               success=False,
                               message="This approval link has already been used.")

    req = db.session.get(LaptopRequest, request_id)
    if req is None:
        return render_template("approval_result.html",
                               success=False,
                               message="Request not found.")

    if req.status != LaptopRequest.STATUS_PENDING:
        return render_template("approval_result.html",
                               success=False,
                               message=f"This request is already in '{req.status_label()}' state "
                                       f"and cannot be actioned again.")

    now = datetime.now(timezone.utc)
    actor_ip = flask_request.remote_addr or "unknown"

    if action == "approve":
        req.status = LaptopRequest.STATUS_APPROVED
        req.approved_at = now
        action_label = "approved"
    else:
        req.status = LaptopRequest.STATUS_REJECTED
        action_label = "rejected"

    # Mark token as used
    if token_record:
        token_record.used_at = now
        token_record.used_by_ip = actor_ip

    db.session.add(AuditLog(
        request_id=req.id,
        actor=req.manager_email,
        action=f"request_{action_label}_by_manager",
        detail=f"One-click {action_label} via email link from IP {actor_ip}",
    ))
    db.session.commit()

    try:
        email_service.send_status_notification(req)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Status notification failed for request %s: %s", req.id, exc)

    return render_template(
        "approval_result.html",
        success=True,
        req=req,
        action_label=action_label,
        message=f"Request for {req.employee_name} has been {action_label}. "
                f"The Service Desk has been notified.",
    )
