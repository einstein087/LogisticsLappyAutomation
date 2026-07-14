# LogisticsLappyAutomation

A lightweight **Flask web application** that automates the laptop provisioning workflow for the Logistics & Support team — eliminating manual Excel trackers, reducing email routing overhead, and providing full end-to-end visibility.

---

## Features

| Feature | Description |
|---|---|
| **Request Portal** | Web form to raise laptop provisioning requests (linked to Oracle ticket IDs) |
| **One-Click Approvals** | Manager receives a branded email with **Approve / Reject** buttons — no login required |
| **Real-Time Dashboard** | Service Desk sees live counts, recent requests, and audit activity across all status stages |
| **Full Audit Trail** | Every status change is immutably logged with actor, timestamp, and notes |
| **Employee Visibility** | Automatic email notifications to the employee at every status transition |
| **Weekly Compliance Reports** | Excel (.xlsx) reports auto-generated each Monday, colour-coded by status |
| **SharePoint Archiving** | Reports automatically uploaded to the configured SharePoint document library via Microsoft Graph |

---

## Architecture

```
run.py                  ← entry-point
config.py               ← all configuration (reads from .env)
app/
  __init__.py           ← Flask app factory + APScheduler setup
  models.py             ← SQLAlchemy models (LaptopRequest, ApprovalToken, AuditLog)
  utils.py              ← signed token generation/verification (itsdangerous)
  routes/
    dashboard.py        ← Service Desk overview dashboard
    requests.py         ← create / list / update requests
    approvals.py        ← one-click approve/reject handler
    reports.py          ← report list / download / manual trigger
  services/
    email_service.py    ← SMTP email sending
    report_service.py   ← Excel report generation
    sharepoint_service.py ← Microsoft Graph upload
  templates/            ← Jinja2 HTML templates
  static/               ← CSS + JS assets
tests/                  ← pytest test suite
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd LogisticsLappyAutomation
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your SMTP credentials, APP_BASE_URL, and optionally SharePoint details
```

### 3. Initialise the database

```bash
flask --app run db init
flask --app run db migrate -m "initial"
flask --app run db upgrade
```

### 4. Run

```bash
python run.py
# Open http://localhost:5000
```

---

## Workflow

```
Request submitted (web form)
        ↓
Manager receives approval email with one-click Approve / Reject
        ↓
Service Desk sees status update on dashboard
        ↓
Service Desk updates status: In Progress → Dispatched → Delivered
        ↓
Employee notified by email at each stage
        ↓
Every Monday at 07:00 a compliance report is generated (.xlsx)
and archived to SharePoint
```

---

## Configuration Reference

All settings are read from environment variables (or a `.env` file).

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `change-me` | Flask secret key — **change in production** |
| `DATABASE_URL` | `sqlite:///lappy.db` | SQLAlchemy connection string |
| `APP_BASE_URL` | `http://localhost:5000` | Public URL used in email links |
| `MAIL_SERVER` | `smtp.office365.com` | SMTP host |
| `MAIL_PORT` | `587` | SMTP port |
| `MAIL_USE_TLS` | `true` | Enable STARTTLS |
| `MAIL_USERNAME` | — | SMTP login |
| `MAIL_PASSWORD` | — | SMTP password |
| `MAIL_DEFAULT_SENDER` | — | From address |
| `APPROVAL_TOKEN_MAX_AGE` | `604800` | Approval link expiry (seconds, default 7 days) |
| `SHAREPOINT_TENANT_ID` | — | Azure AD tenant |
| `SHAREPOINT_CLIENT_ID` | — | App registration client ID |
| `SHAREPOINT_CLIENT_SECRET` | — | App registration secret |
| `SHAREPOINT_SITE_ID` | — | SharePoint site ID |
| `SHAREPOINT_DRIVE_ID` | — | Document library drive ID |
| `SHAREPOINT_FOLDER_PATH` | `Compliance Reports/Laptop Provisioning` | Folder in the drive |
| `REPORT_DAY_OF_WEEK` | `mon` | Day for weekly report (APScheduler cron) |
| `REPORT_HOUR` | `7` | Hour for weekly report (24h) |
| `REPORT_MINUTE` | `0` | Minute for weekly report |

---

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```

---

## Security Notes

- Approval links are **signed with itsdangerous** and expire after 7 days
- Each token is **single-use** — replay attacks are blocked
- The reports download endpoint prevents **path traversal**
- Never commit `.env` to source control — it is listed in `.gitignore`

