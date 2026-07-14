# LogisticsLappyAutomation

A lightweight logistics automation app for laptop pickup, delivery, and approval workflows.

## Overview

This project captures intake requests and sends email notifications via SMTP. It supports:
- web intake requests
- Oracle and ServiceNow request endpoints
- Outlook email ingestion stubs
- manager approval links via email
- database-backed intake or local fallback when `DATABASE_URL` is not configured

## Project structure

- `src/index.ts` - main Express server and web UI
- `src/routes/requestRoutes.ts` - API endpoints for intake and notification health
- `src/routes/approvalRoutes.ts` - approval link handling
- `src/services/notificationService.ts` - SMTP email and optional SMS notifications
- `src/db.ts` - PostgreSQL connection helper
- `src/types.ts` - shared request and approval types
- `src/services/*` - service integration stubs for Oracle, ServiceNow, Outlook
- `sql/schema.sql` - database schema definitions

## Running locally

1. Copy `.env.example` to `.env`.
2. Set SMTP env vars in `.env`:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
3. Optionally set `DATABASE_URL` for PostgreSQL.
4. Run `npm install` and `npm run dev` to start the app.
5. To expose the app publicly via localtunnel, use `node scripts/start-tunnel.js` in a second terminal.

## Email and SMS notifications

- Email is sent via SMTP only. Set the SMTP variables above.
- SMS is optional. Set `SMS_WEBHOOK_URL` only if SMS notifications are required.
- Approval link URLs depend on `APP_BASE_URL` and must be reachable from the manager's browser.

## Notes

- If `DATABASE_URL` is missing, the app stores requests in memory and still sends notifications.
- If you need a public URL for approvals during local development, use a tunnel and update `APP_BASE_URL`.

