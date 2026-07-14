"""
Request management blueprint.

GET  /requests            – list all requests (with filter support)
GET  /requests/new        – new request form
POST /requests/new        – submit a new request
GET  /requests/<id>       – request detail / history
POST /requests/<id>/update – Service Desk status update
"""
import logging
from datetime import datetime, timezone

from flask import Blueprint, render_template, request, redirect, url_for, flash, abort, current_app

from app import db
from app.models import LaptopRequest, AuditLog, ApprovalToken
from app.services import email_service
from app.utils import generate_approval_token

logger = logging.getLogger(__name__)

bp = Blueprint("requests", __name__, url_prefix="/requests")

_PRIORITIES = ["low", "normal", "high", "urgent"]
_UPDATABLE_STATUSES = [
    LaptopRequest.STATUS_IN_PROGRESS,
    LaptopRequest.STATUS_DISPATCHED,
    LaptopRequest.STATUS_DELIVERED,
    LaptopRequest.STATUS_CANCELLED,
]


@bp.route("/")
def list_requests():
    status_filter = request.args.get("status", "")
    query = LaptopRequest.query.order_by(LaptopRequest.created_at.desc())
    if status_filter:
        query = query.filter_by(status=status_filter)
    reqs = query.all()
    return render_template("requests_list.html", requests=reqs, status_filter=status_filter)


@bp.route("/new", methods=["GET", "POST"])
def new_request():
    if request.method == "POST":
        form = request.form

        # Basic validation
        required = [
            "requester_name", "requester_email",
            "employee_name", "employee_email", "department",
            "manager_name", "manager_email",
        ]
        missing = [f for f in required if not form.get(f, "").strip()]
        if missing:
            flash(f"Please fill in: {', '.join(missing)}", "danger")
            return render_template("new_request.html", form=form, priorities=_PRIORITIES)

        req = LaptopRequest(
            requester_name=form["requester_name"].strip(),
            requester_email=form["requester_email"].strip().lower(),
            employee_name=form["employee_name"].strip(),
            employee_email=form["employee_email"].strip().lower(),
            department=form["department"].strip(),
            manager_name=form["manager_name"].strip(),
            manager_email=form["manager_email"].strip().lower(),
            laptop_model=form.get("laptop_model", "").strip() or None,
            priority=form.get("priority", "normal"),
            notes=form.get("notes", "").strip() or None,
            oracle_ref=form.get("oracle_ref", "").strip() or None,
        )
        db.session.add(req)
        db.session.flush()  # get req.id

        _log(req, "system", "request_created", f"Submitted by {req.requester_email}")

        # Generate and store approval tokens
        approve_token_str = generate_approval_token(req.id, "approve", current_app)
        reject_token_str = generate_approval_token(req.id, "reject", current_app)

        db.session.add(ApprovalToken(request_id=req.id, token=approve_token_str, action="approve"))
        db.session.add(ApprovalToken(request_id=req.id, token=reject_token_str, action="reject"))
        db.session.commit()

        base = current_app.config["APP_BASE_URL"]
        approve_url = f"{base}/approvals/action/{approve_token_str}"
        reject_url = f"{base}/approvals/action/{reject_token_str}"

        try:
            email_service.send_approval_request(req, approve_url, reject_url)
            flash("Request submitted – approval email sent to manager.", "success")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to send approval email for request %s: %s", req.id, exc)
            flash("Request submitted. (Approval email could not be delivered – please contact IT support.)", "warning")

        return redirect(url_for("requests.detail", request_id=req.id))

    return render_template("new_request.html", form={}, priorities=_PRIORITIES)


@bp.route("/<int:request_id>")
def detail(request_id: int):
    req = LaptopRequest.query.get_or_404(request_id)
    logs = req.audit_logs.order_by(AuditLog.timestamp.desc()).all()
    return render_template("request_detail.html", req=req, logs=logs,
                           updatable_statuses=_UPDATABLE_STATUSES)


@bp.route("/<int:request_id>/update", methods=["POST"])
def update_status(request_id: int):
    req = LaptopRequest.query.get_or_404(request_id)
    new_status = request.form.get("status", "")
    asset_tag = request.form.get("asset_tag", "").strip()
    laptop_model = request.form.get("laptop_model", "").strip()
    notes = request.form.get("notes", "").strip()
    actor = request.form.get("actor", "service_desk")

    if new_status not in _UPDATABLE_STATUSES:
        flash("Invalid status update.", "danger")
        return redirect(url_for("requests.detail", request_id=request_id))

    if req.status in (LaptopRequest.STATUS_DELIVERED, LaptopRequest.STATUS_CANCELLED):
        flash("This request is already closed.", "warning")
        return redirect(url_for("requests.detail", request_id=request_id))

    old_status = req.status
    req.status = new_status
    if asset_tag:
        req.asset_tag = asset_tag
    if laptop_model:
        req.laptop_model = laptop_model
    if notes:
        req.notes = notes

    now = datetime.now(timezone.utc)
    if new_status == LaptopRequest.STATUS_DISPATCHED:
        req.dispatched_at = now
    elif new_status == LaptopRequest.STATUS_DELIVERED:
        req.delivered_at = now

    _log(req, actor, f"status_changed_to_{new_status}",
         f"Previous status: {old_status}. Notes: {notes}")
    db.session.commit()

    try:
        email_service.send_status_notification(req)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to send status notification for request %s: %s", req.id, exc)

    flash(f"Status updated to '{req.status_label()}'.", "success")
    return redirect(url_for("requests.detail", request_id=request_id))


def _log(req, actor: str, action: str, detail: str = "") -> None:
    db.session.add(AuditLog(request_id=req.id, actor=actor, action=action, detail=detail))
