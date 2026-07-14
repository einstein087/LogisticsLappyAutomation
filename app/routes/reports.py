"""
Reports blueprint.

GET  /reports              – list generated reports
POST /reports/generate     – manually trigger weekly report generation
GET  /reports/<filename>   – download a report file
"""
import os
import logging

from flask import Blueprint, render_template, redirect, url_for, flash, send_from_directory, abort, current_app

from app.services import report_service

logger = logging.getLogger(__name__)

bp = Blueprint("reports", __name__, url_prefix="/reports")


def _reports_dir() -> str:
    return os.path.join(current_app.root_path, "..", "reports")


@bp.route("/")
def list_reports():
    rdir = _reports_dir()
    files = []
    if os.path.isdir(rdir):
        files = sorted(
            [f for f in os.listdir(rdir) if f.endswith(".xlsx")],
            reverse=True,
        )
    return render_template("reports.html", files=files)


@bp.route("/generate", methods=["POST"])
def generate():
    try:
        result = report_service.generate_and_upload()
        msg = f"Report generated: {result['filename']}"
        if result.get("sharepoint_url"):
            msg += f" | SharePoint: {result['sharepoint_url']}"
        flash(msg, "success")
    except Exception as exc:  # noqa: BLE001
        logger.error("Report generation failed: %s", exc)
        flash(f"Report generation failed: {exc}", "danger")
    return redirect(url_for("reports.list_reports"))


@bp.route("/download/<path:filename>")
def download(filename: str):
    rdir = os.path.abspath(_reports_dir())
    # Security: prevent path traversal
    full_path = os.path.abspath(os.path.join(rdir, filename))
    if not full_path.startswith(rdir + os.sep) and full_path != rdir:
        abort(400, "Invalid filename.")
    if not os.path.isfile(full_path):
        abort(404)
    return send_from_directory(rdir, filename, as_attachment=True)
