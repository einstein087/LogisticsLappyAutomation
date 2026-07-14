"""
Dashboard blueprint – read-only overview for the Service Desk.
"""
from flask import Blueprint, render_template
from app.models import LaptopRequest, AuditLog
from app import db

bp = Blueprint("dashboard", __name__)


@bp.route("/")
@bp.route("/dashboard")
def index():
    # Counts by status
    statuses = [
        LaptopRequest.STATUS_PENDING,
        LaptopRequest.STATUS_APPROVED,
        LaptopRequest.STATUS_IN_PROGRESS,
        LaptopRequest.STATUS_DISPATCHED,
        LaptopRequest.STATUS_DELIVERED,
        LaptopRequest.STATUS_REJECTED,
        LaptopRequest.STATUS_CANCELLED,
    ]
    counts = {}
    for s in statuses:
        counts[s] = LaptopRequest.query.filter_by(status=s).count()

    # Recent requests (last 20)
    recent = (
        LaptopRequest.query
        .order_by(LaptopRequest.created_at.desc())
        .limit(20)
        .all()
    )

    # Recent audit activity (last 10)
    activity = (
        db.session.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
        .all()
    )

    return render_template(
        "dashboard.html",
        counts=counts,
        recent=recent,
        activity=activity,
    )
