"""
Test configuration: in-memory SQLite database, scheduler disabled.
"""
import os


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret-key"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAIL_SERVER = "localhost"
    MAIL_PORT = 25
    MAIL_USE_TLS = False
    MAIL_USERNAME = ""
    MAIL_PASSWORD = ""
    MAIL_DEFAULT_SENDER = "test@example.com"
    APP_BASE_URL = "http://localhost"
    APPROVAL_TOKEN_MAX_AGE = 3600
    SHAREPOINT_TENANT_ID = ""
    SHAREPOINT_CLIENT_ID = ""
    SHAREPOINT_CLIENT_SECRET = ""
    SHAREPOINT_SITE_ID = ""
    SHAREPOINT_DRIVE_ID = ""
    SHAREPOINT_FOLDER_PATH = "Reports"
    REPORT_DAY_OF_WEEK = "mon"
    REPORT_HOUR = 7
    REPORT_MINUTE = 0
