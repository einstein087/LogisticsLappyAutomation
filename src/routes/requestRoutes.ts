import express from "express";
import { query, isDbConfigured } from "../db";
import type { UnifiedRequest } from "../types";
import { getLocalRequest, getAllLocalRequests, saveLocalRequest } from "../services/localRequestStore";
import { createApprovalToken } from "../utils/approvalTokens";
import { encryptText } from "../utils/encryption";
import { getOutlookMessageText, parseOutlookEmail, fetchRecentLaptopEmails } from "../services/outlookService";
import { getNotificationConfigStatus, sendManagerApprovalEmail, triggerUserNotifications } from "../services/notificationService";
import { debug, info, warn, error } from "../utils/logger";

const router = express.Router();

const asyncHandler = (fn: express.RequestHandler) => (req: express.Request, res: express.Response, next: express.NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const jsonError = (res: express.Response, message: string, status = 500) =>
  res.status(status).json({ error: message });

router.get("/notifications/health", asyncHandler(async (req, res) => {
  res.json({
    status: "ok",
    notifications: getNotificationConfigStatus(),
  });
}));

router.get("/requests", asyncHandler(async (req, res) => {
  if (!isDbConfigured()) {
    return res.json({
      source: "local",
      count: getAllLocalRequests().length,
      requests: getAllLocalRequests(),
    });
  }

  try {
    const result = await query(`
      SELECT request_id,
             source_system,
             employee_id,
             employee_name,
             employee_email,
             project_name,
             allocation_type,
             status,
             created_date,
             updated_date
      FROM request_intake
      ORDER BY created_date DESC
      LIMIT 50`,
    []);

    return res.json({
      source: "database",
      count: result.rowCount,
      requests: result.rows,
    });
  } catch (err) {
      error("Failed to load requests", { error: String(err) });
      return res.status(500).json({ error: "Failed to fetch requests." });
    }
  }));
const resolveRequestBaseUrl = (req: express.Request) => `${req.protocol}://${req.get("host")}`;

const buildApprovalLinks = (req: express.Request, requestId: string) => {
  const token = createApprovalToken(requestId);
  const baseUrl = resolveRequestBaseUrl(req);
  return {
    approveUrl: `${baseUrl}/approve/${token}`,
    rejectUrl: `${baseUrl}/reject/${token}`,
  };
};

router.post("/oracle", asyncHandler(async (req, res) => {
  const request: UnifiedRequest = {
    source_system: "ORACLE",
    ticket_number: req.body.ticket_number,
    employee_id: req.body.employee_id,
    project_name: req.body.project_name,
    allocation_type: req.body.allocation_type,
    business_justification: req.body.business_justification,
    priority: req.body.priority ?? "Normal",
    status: "New Request",
  };

  const insertSql = `
    INSERT INTO request_intake (
      source_system,
      ticket_number,
      employee_id,
      project_name,
      allocation_type,
      priority,
      business_justification,
      status,
      created_date,
      updated_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now()) RETURNING request_id`;

  try {
    const result = await query(insertSql, [
      request.source_system,
      request.ticket_number,
      request.employee_id,
      request.project_name,
      request.allocation_type,
      request.priority,
      request.business_justification,
      request.status,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create Oracle request." });
  }
}));

router.post("/servicenow", asyncHandler(async (req, res) => {
  const request: UnifiedRequest = {
    source_system: "SERVICENOW",
    ticket_number: req.body.request_number,
    employee_id: req.body.employee_id,
    allocation_type: req.body.request_type,
    business_justification: req.body.business_justification,
    priority: req.body.priority,
    project_name: req.body.location,
    status: "New Request",
  };

  const insertSql = `
    INSERT INTO request_intake (
      source_system,
      ticket_number,
      employee_id,
      project_name,
      allocation_type,
      priority,
      business_justification,
      status,
      created_date,
      updated_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),now()) RETURNING request_id`;

  try {
    const result = await query(insertSql, [
      request.source_system,
      request.ticket_number,
      request.employee_id,
      request.project_name,
      request.allocation_type,
      request.priority,
      request.business_justification,
      request.status,
    ]);
    info("ServiceNow request created", { requestId: result.rows[0].request_id });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    error("ServiceNow request failed", { error: String(err) });
    res.status(500).json({ error: "Failed to create ServiceNow request." });
  }
}));

router.post("/intake", asyncHandler(async (req, res) => {
  const payload = req.body ?? {};
  const request: UnifiedRequest = {
    source_system: "WEB",
    employee_id: String(payload.employeeId ?? "").trim() || "unknown",
    employee_name: String(payload.fullName ?? "").trim() || undefined,
    employee_email: String(payload.email ?? "").trim() || undefined,
    project_name: String(payload.department ?? "").trim() || undefined,
    allocation_type: String(payload.requestType ?? "").trim() || undefined,
    business_justification:
      [String(payload.notes ?? "").trim(), String(payload.logisticsNotes ?? "").trim()]
        .filter(Boolean)
        .join(" \n"),
    pickup_details: {
      location: String(payload.pickupLocation ?? "").trim() || undefined,
      name: String(payload.pickupContacts ?? "").trim() || undefined,
      phone: String(payload.pickupPhone ?? "").trim() || undefined,
      address: String(payload.pickupAddress ?? "").trim() || undefined,
    },
    delivery_details: {
      location: String(payload.dropLocation ?? "").trim() || undefined,
      name: String(payload.dropRecipient ?? "").trim() || undefined,
      phone: String(payload.dropPhone ?? "").trim() || undefined,
      address: String(payload.dropAddress ?? "").trim() || undefined,
    },
    asset_details: {
      asset_type: String(payload.assetType ?? "").trim() || undefined,
      asset_tag: String(payload.assetTag ?? "").trim() || undefined,
      accessories: String(payload.accessories ?? "").trim() || undefined,
    },
    status: "New Request",
  };

  if (!isDbConfigured()) {
    const fallbackRequestId = payload.trackingRequestId || `local-${Date.now()}`;
    const approvalLinks = buildApprovalLinks(req, fallbackRequestId);
    saveLocalRequest({
      requestId: fallbackRequestId,
      employeeId: request.employee_id,
      fullName: request.employee_name,
      email: request.employee_email,
      phone: String(payload.phone ?? "").trim() || undefined,
      pickupLocation: request.pickup_details?.location,
      dropLocation: request.delivery_details?.location,
      managerEmail: String(payload.managerEmail ?? "").trim() || undefined,
      status: "Pending Approval",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const notificationSummary = await triggerUserNotifications({
      requestId: fallbackRequestId,
      fullName: String(payload.fullName ?? "").trim() || undefined,
      email: String(payload.email ?? "").trim() || undefined,
      phone: String(payload.phone ?? "").trim() || undefined,
      pickupLocation: request.pickup_details?.location,
      pickupContactName: request.pickup_details?.name,
      pickupContactPhone: request.pickup_details?.phone,
      dropLocation: request.delivery_details?.location,
      dropContactName: request.delivery_details?.name,
      dropContactPhone: request.delivery_details?.phone,
      assetType: request.asset_details?.asset_type,
      assetTag: request.asset_details?.asset_tag,
      accessories: request.asset_details?.accessories,
      currentStatus: String(payload.currentStatus ?? "").trim() || "Pending Pickup",
    });
    const managerNotification = await sendManagerApprovalEmail({
      requestId: fallbackRequestId,
      fullName: String(payload.fullName ?? "").trim() || undefined,
      email: String(payload.email ?? "").trim() || undefined,
      pickupLocation: request.pickup_details?.location,
      pickupContactName: request.pickup_details?.name,
      pickupContactPhone: request.pickup_details?.phone,
      dropLocation: request.delivery_details?.location,
      dropContactName: request.delivery_details?.name,
      dropContactPhone: request.delivery_details?.phone,
      assetType: request.asset_details?.asset_type,
      assetTag: request.asset_details?.asset_tag,
      accessories: request.asset_details?.accessories,
      currentStatus: "Pending Approval",
      managerEmail: String(payload.managerEmail ?? "").trim() || undefined,
      approveUrl: approvalLinks.approveUrl,
      rejectUrl: approvalLinks.rejectUrl,
    });
    info("Web intake request accepted without database", {
      requestId: fallbackRequestId,
      employeeId: request.employee_id,
      notifications: notificationSummary,
      managerNotification,
    });
    return res.status(201).json({
      request_id: fallbackRequestId,
      status: "queued",
      message: "User information and logistics details captured successfully.",
      note: "Database is not configured; request captured locally for now.",
      notifications: notificationSummary,
      manager_notification: managerNotification,
    });
  }

  const insertSql = `
    INSERT INTO request_intake (
      source_system,
      employee_id,
      employee_name,
      employee_email,
      project_name,
      allocation_type,
      priority,
      business_justification,
      pickup_location,
      pickup_name,
      pickup_phone,
      pickup_address,
      delivery_location,
      delivery_name,
      delivery_phone,
      delivery_address,
      asset_type,
      asset_tag,
      accessories,
      status,
      created_date,
      updated_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now(),now()) RETURNING request_id`;

  try {
    const result = await query(insertSql, [
      request.source_system,
      request.employee_id,
      request.employee_name,
      request.employee_email,
      request.project_name,
      request.allocation_type,
      request.priority ?? "Normal",
      request.business_justification,
      request.pickup_details?.location,
      request.pickup_details?.name,
      request.pickup_details?.phone,
      request.pickup_details?.address,
      request.delivery_details?.location,
      request.delivery_details?.name,
      request.delivery_details?.phone,
      request.delivery_details?.address,
      request.asset_details?.asset_type,
      request.asset_details?.asset_tag,
      request.asset_details?.accessories,
      request.status,
    ]);
    const createdRequestId = String(result.rows[0].request_id);
    const approvalLinks = buildApprovalLinks(req, createdRequestId);
    const notificationSummary = await triggerUserNotifications({
      requestId: createdRequestId,
      fullName: String(payload.fullName ?? "").trim() || undefined,
      email: String(payload.email ?? "").trim() || undefined,
      phone: String(payload.phone ?? "").trim() || undefined,
      pickupLocation: request.pickup_details?.location,
      pickupContactName: request.pickup_details?.name,
      pickupContactPhone: request.pickup_details?.phone,
      dropLocation: request.delivery_details?.location,
      dropContactName: request.delivery_details?.name,
      dropContactPhone: request.delivery_details?.phone,
      assetType: request.asset_details?.asset_type,
      assetTag: request.asset_details?.asset_tag,
      accessories: request.asset_details?.accessories,
      currentStatus: String(payload.currentStatus ?? "").trim() || "Pending Pickup",
    });
    const managerNotification = await sendManagerApprovalEmail({
      requestId: createdRequestId,
      fullName: String(payload.fullName ?? "").trim() || undefined,
      email: String(payload.email ?? "").trim() || undefined,
      pickupLocation: request.pickup_details?.location,
      pickupContactName: request.pickup_details?.name,
      pickupContactPhone: request.pickup_details?.phone,
      dropLocation: request.delivery_details?.location,
      dropContactName: request.delivery_details?.name,
      dropContactPhone: request.delivery_details?.phone,
      assetType: request.asset_details?.asset_type,
      assetTag: request.asset_details?.asset_tag,
      accessories: request.asset_details?.accessories,
      currentStatus: "Pending Approval",
      managerEmail: String(payload.managerEmail ?? "").trim() || undefined,
      approveUrl: approvalLinks.approveUrl,
      rejectUrl: approvalLinks.rejectUrl,
    });
    info("Web intake request created", { requestId: result.rows[0].request_id });
    res.status(201).json({
      request_id: result.rows[0].request_id,
      status: "created",
      message: "User information and logistics details captured successfully.",
      notifications: notificationSummary,
      manager_notification: managerNotification,
    });
  } catch (err) {
    error("Web intake request failed", { error: String(err) });
    res.status(500).json({ error: "Failed to create intake request." });
  }
}));

router.post("/outlook", asyncHandler(async (req, res) => {
  const request: UnifiedRequest = {
    source_system: "OUTLOOK",
    employee_id: req.body.employee_id,
    project_name: req.body.project,
    business_justification: req.body.business_justification,
    priority: req.body.priority ?? "Normal",
    pickup_details: req.body.pickup_details,
    delivery_details: req.body.delivery_details,
    asset_details: req.body.asset_details,
    status: "New Request",
  };

  if (!isDbConfigured()) {
    const fallbackRequestId = `local-${Date.now()}`;
    info("Outlook request accepted without database", { requestId: fallbackRequestId, employeeId: request.employee_id });
    return res.status(201).json({
      request_id: fallbackRequestId,
      status: "queued",
      note: "Database is not configured; request captured locally for now.",
    });
  }

  const insertSql = `
    INSERT INTO request_intake (
      source_system,
      employee_id,
      project_name,
      priority,
      business_justification,
      pickup_location,
      pickup_name,
      pickup_phone,
      pickup_address,
      delivery_location,
      delivery_name,
      delivery_phone,
      delivery_address,
      asset_type,
      asset_tag,
      accessories,
      status,
      created_date,
      updated_date
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now(),now()) RETURNING request_id`;

  try {
    const result = await query(insertSql, [
      request.source_system,
      request.employee_id,
      request.project_name,
      request.priority,
      request.business_justification,
      request.pickup_details?.location ?? null,
      request.pickup_details?.name ?? null,
      request.pickup_details?.phone ?? null,
      request.pickup_details?.address ?? null,
      request.delivery_details?.location ?? null,
      request.delivery_details?.name ?? null,
      request.delivery_details?.phone ?? null,
      request.delivery_details?.address ?? null,
      request.asset_details?.asset_type ?? null,
      request.asset_details?.asset_tag ?? null,
      request.asset_details?.accessories ?? null,
      request.status,
    ]);
    info("Outlook request created", { requestId: result.rows[0].request_id });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    error("Outlook request failed", { error: String(err) });
    res.status(500).json({ error: "Failed to create Outlook request." });
  }
}));

router.post("/outlook/parse", asyncHandler(async (req, res) => {
  if (typeof req.body.body !== "string") {
    return res.status(400).json({ error: "Email body is required as plain text." });
  }

  const parsed = parseOutlookEmail(req.body.body);
  return res.json(parsed);
}));

router.post("/outlook/ingest", asyncHandler(async (req, res) => {
  try {
    const messages = await fetchRecentLaptopEmails();
    const created: Array<Record<string, unknown>> = [];

    for (const message of messages) {
      const bodyText = getOutlookMessageText(message.body);
      const parsed = parseOutlookEmail(bodyText);
      const insertSql = `
        INSERT INTO request_intake (
          source_system,
          employee_id,
          project_name,
          priority,
          business_justification,
          pickup_location,
          pickup_name,
          pickup_phone,
          pickup_address,
          delivery_location,
          delivery_name,
          delivery_phone,
          delivery_address,
          asset_type,
          asset_tag,
          accessories,
          sender_email_encrypted,
          recipient_emails_encrypted,
          status,
          created_date,
          updated_date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now(),now()) RETURNING request_id`;

      const senderEmail = message.from?.emailAddress?.address ?? null;
      const recipientEmails = Array.isArray(message.toRecipients)
        ? message.toRecipients.map((recipient: any) => recipient.emailAddress?.address).filter(Boolean).join(";")
        : null;

      const result = await query(insertSql, [
        "OUTLOOK",
        parsed.employee_id || null,
        parsed.project || null,
        parsed.priority || "Normal",
        parsed.business_justification || null,
        parsed.pickup_details?.location ?? null,
        parsed.pickup_details?.name ?? null,
        parsed.pickup_details?.phone ?? null,
        parsed.pickup_details?.address ?? null,
        parsed.delivery_details?.location ?? null,
        parsed.delivery_details?.name ?? null,
        parsed.delivery_details?.phone ?? null,
        parsed.delivery_details?.address ?? null,
        parsed.asset_details?.asset_type ?? null,
        parsed.asset_details?.asset_tag ?? null,
        parsed.asset_details?.accessories ?? null,
        senderEmail ? encryptText(senderEmail) : null,
        recipientEmails ? encryptText(recipientEmails) : null,
        "New Request",
      ]);

      created.push({ request_id: result.rows[0].request_id, subject: message.subject });
    }

    return res.json({ imported: created.length, records: created });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to ingest Outlook messages." });
  }
  }));

export default router;
