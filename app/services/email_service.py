import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app, render_template


def _send(to_addresses: list[str], subject: str, html_body: str, text_body: str = "") -> None:
    """Send an email via configured SMTP server."""
    cfg = current_app.config
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["MAIL_DEFAULT_SENDER"]
    msg["To"] = ", ".join(to_addresses)

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(cfg["MAIL_SERVER"], cfg["MAIL_PORT"]) as server:
        if cfg["MAIL_USE_TLS"]:
            server.starttls(context=context)
        if cfg["MAIL_USERNAME"] and cfg["MAIL_PASSWORD"]:
            server.login(cfg["MAIL_USERNAME"], cfg["MAIL_PASSWORD"])
        server.sendmail(cfg["MAIL_DEFAULT_SENDER"], to_addresses, msg.as_string())


def send_approval_request(request_obj, approve_url: str, reject_url: str) -> None:
    """Email the manager asking for one-click approval."""
    subject = f"[Action Required] Laptop Provisioning Request – {request_obj.employee_name}"
    html = render_template(
        "email/approval_request.html",
        req=request_obj,
        approve_url=approve_url,
        reject_url=reject_url,
    )
    text = (
        f"Laptop provisioning request for {request_obj.employee_name}.\n"
        f"Approve: {approve_url}\n"
        f"Reject:  {reject_url}\n"
    )
    _send([request_obj.manager_email], subject, html, text)


def send_status_notification(request_obj) -> None:
    """Notify the requester that their request status has changed."""
    subject = f"Laptop Request Update – {request_obj.status.replace('_', ' ').title()}"
    html = render_template("email/status_update.html", req=request_obj)
    text = (
        f"Your laptop provisioning request is now: {request_obj.status.replace('_', ' ').title()}.\n"
        f"Track your request at {current_app.config['APP_BASE_URL']}/requests/{request_obj.id}\n"
    )
    recipients = [request_obj.requester_email]
    _send(recipients, subject, html, text)
