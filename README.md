<<<<<<< HEAD
# Lappy Logistics Automation

A starter scaffold for a Unified IT Asset Request & Lifecycle Management Platform.

## Overview

This project is designed to ingest laptop allocation requests from:
- Oracle request forms
- ServiceNow catalog tickets
- Outlook email intake

It enriches requests through Oracle Fusion HCM, manages approval workflows, tracks assets, and generates weekly reports for SharePoint.

## Project Structure

- `src/index.ts` - application entry point
- `src/routes/requestRoutes.ts` - inbound request API endpoints
- `src/services` - integration service stubs for Oracle HCM, ServiceNow, Outlook, reporting, and SharePoint
- `src/db.ts` - PostgreSQL connection helper
- `src/types.ts` - shared request and asset types
- `sql/schema.sql` - database schema definitions

## Next Steps

1. Add real Oracle HCM API credentials and endpoints.
2. Implement ServiceNow ticket ingestion and Outlook mailbox parsing.
3. Wire approvals, escalation timers, and report generation.
4. Deploy a Power BI dashboard or front-end UI over the normalized request table.

## Email And SMS Notifications

The intake route triggers user notifications after submission.

### Email

You must configure one of these options:

1. Webhook mode
	1. Set `EMAIL_WEBHOOK_URL`
2. SMTP mode
	1. Set `SMTP_SERVICE=Gmail` or provide `SMTP_HOST`
	2. Set `SMTP_PORT`
	3. Set `SMTP_SECURE`
	4. Set `SMTP_USER`
	5. Set `SMTP_PASS`
	6. Set `SMTP_FROM`

For Gmail, use an app password, not your normal account password.

### SMS

1. Set `SMS_WEBHOOK_URL` to your SMS provider webhook.

### Environment Setup

Copy values from `.env.example` into your local environment configuration before running the app.

### UI Behavior

If intake is captured but email delivery is not configured or fails, the page now shows that explicitly after submit instead of implying that the user was notified.
=======
# LogisticsLappyAutomation
Making sure I am making things easy for Logistics and Support Team by building an Application and providing EMail configurations so that they receive their emails and able to approve requests accordingly, track the laptop assets accordingly by automated emails.
>>>>>>> 7e94909973590a1c3b98e70c1d6f5f84cf7e0b88
