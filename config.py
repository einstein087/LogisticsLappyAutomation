import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'lappy.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Email (SMTP)
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.office365.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", MAIL_USERNAME)

    # Application base URL (used in email links)
    APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:5000")

    # Token expiry for approval links (seconds)
    APPROVAL_TOKEN_MAX_AGE = int(os.environ.get("APPROVAL_TOKEN_MAX_AGE", 7 * 24 * 3600))

    # SharePoint / Microsoft Graph
    SHAREPOINT_TENANT_ID = os.environ.get("SHAREPOINT_TENANT_ID", "")
    SHAREPOINT_CLIENT_ID = os.environ.get("SHAREPOINT_CLIENT_ID", "")
    SHAREPOINT_CLIENT_SECRET = os.environ.get("SHAREPOINT_CLIENT_SECRET", "")
    SHAREPOINT_SITE_ID = os.environ.get("SHAREPOINT_SITE_ID", "")
    SHAREPOINT_DRIVE_ID = os.environ.get("SHAREPOINT_DRIVE_ID", "")
    SHAREPOINT_FOLDER_PATH = os.environ.get("SHAREPOINT_FOLDER_PATH", "Compliance Reports/Laptop Provisioning")

    # Weekly report schedule (cron-style, 24h clock)
    REPORT_DAY_OF_WEEK = os.environ.get("REPORT_DAY_OF_WEEK", "mon")
    REPORT_HOUR = int(os.environ.get("REPORT_HOUR", 7))
    REPORT_MINUTE = int(os.environ.get("REPORT_MINUTE", 0))
