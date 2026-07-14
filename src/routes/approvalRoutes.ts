import express from "express";
import { isDbConfigured, query } from "../db";
import { getLocalRequest, updateLocalRequestStatus } from "../services/localRequestStore";
import type { ApprovalAction, ApprovalStatus } from "../types";
import { verifyApprovalToken } from "../utils/approvalTokens";
import { error, info } from "../utils/logger";

const router = express.Router();

interface RequestStatusView {
  requestId: string;
  status: string;
  employeeName?: string;
  employeeEmail?: string;
  pickupLocation?: string;
  dropLocation?: string;
  assetType?: string;
  assetTag?: string;
  accessories?: string;
  createdAt?: string;
  updatedAt?: string;
}

const renderPage = (title: string, heading: string, body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: linear-gradient(135deg, #f8fbff, #eef4ff); color: #1f2937; }
      .card { max-width: 720px; margin: 40px auto; background: white; padding: 28px; border-radius: 18px; box-shadow: 0 14px 40px rgba(37, 99, 235, 0.12); }
      h1 { margin-top: 0; color: #1e3a8a; }
      a { text-decoration: none; color: #464feb; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      tr th, tr td { border: 1px solid #e6e6e6; padding: 10px; text-align: left; }
      tr th { background-color: #f5f5f5; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${heading}</h1>
      ${body}
    </div>
  </body>
</html>`;

const renderInvalid = (reason: string) => renderPage(
  "Approval Link Error",
  "Approval Link Error",
  `<p>The approval link is invalid because it is ${reason}. Please request a new email.</p>`
);

const renderResolved = (requestId: string, status: ApprovalStatus, detail: string) => renderPage(
  `Request ${status}`,
  `Request ${status}`,
  `<table>
    <tr><th>Request ID</th><td>${requestId}</td></tr>
    <tr><th>Status</th><td>${status}</td></tr>
    <tr><th>Detail</th><td>${detail}</td></tr>
  </table>
  <p style="margin-top:16px;"><button onclick="window.print()" style="padding:10px 16px;border:none;border-radius:10px;background:#2563eb;color:white;cursor:pointer;font-weight:700;">Save as PDF</button></p>`
);

const normalizeDisplayStatus = (status: string) => {
  if (status === "Approved" || status === "Rejected") {
    return status;
  }

  if (!status || status === "New Request" || status === "Pending Approval") {
    return "Request Submitted";
  }

  return status;
};

const renderRequestStatus = (request: RequestStatusView) => renderPage(
  `Request ${normalizeDisplayStatus(request.status)}`,
  `Request ${normalizeDisplayStatus(request.status)}`,
  `<table>
    <tr><th>Request ID</th><td>${request.requestId}</td></tr>
    <tr><th>Status</th><td>${normalizeDisplayStatus(request.status)}</td></tr>
    <tr><th>Employee</th><td>${request.employeeName || "N/A"}</td></tr>
    <tr><th>Email</th><td>${request.employeeEmail || "N/A"}</td></tr>
    <tr><th>Pickup Location</th><td>${request.pickupLocation || "N/A"}</td></tr>
    <tr><th>Drop Location</th><td>${request.dropLocation || "N/A"}</td></tr>
    <tr><th>Asset Type</th><td>${request.assetType || "N/A"}</td></tr>
    <tr><th>Asset Tag</th><td>${request.assetTag || "N/A"}</td></tr>
    <tr><th>Accessories</th><td>${request.accessories || "N/A"}</td></tr>
    <tr><th>Created</th><td>${request.createdAt || "N/A"}</td></tr>
    <tr><th>Updated</th><td>${request.updatedAt || "N/A"}</td></tr>
  </table>
  <p style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;">
    <button onclick="window.print()" style="padding:10px 16px;border:none;border-radius:10px;background:#2563eb;color:white;cursor:pointer;font-weight:700;">Save as PDF</button>
    <a href="javascript:window.location.reload()" style="padding:10px 16px;border-radius:10px;background:#eef2ff;color:#4338ca;font-weight:700;">Refresh Status</a>
  </p>`
);

const loadRequestStatus = async (requestId: string): Promise<RequestStatusView | null> => {
  if (!isDbConfigured()) {
    const existing = getLocalRequest(requestId);
    if (!existing) {
      return null;
    }

    return {
      requestId: existing.requestId,
      status: existing.status,
      employeeName: existing.fullName,
      employeeEmail: existing.email,
      pickupLocation: existing.pickupLocation,
      dropLocation: existing.dropLocation,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
  }

  const result = await query(
    `SELECT request_id,
            employee_name,
            employee_email,
            pickup_location,
            delivery_location,
            asset_type,
            asset_tag,
            accessories,
            status,
            created_date,
            updated_date
       FROM request_intake
      WHERE request_id = $1`,
    [requestId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    requestId: String(row.request_id),
    status: String(row.status || "Request Submitted"),
    employeeName: row.employee_name || undefined,
    employeeEmail: row.employee_email || undefined,
    pickupLocation: row.pickup_location || undefined,
    dropLocation: row.delivery_location || undefined,
    assetType: row.asset_type || undefined,
    assetTag: row.asset_tag || undefined,
    accessories: row.accessories || undefined,
    createdAt: row.created_date ? new Date(row.created_date).toISOString() : undefined,
    updatedAt: row.updated_date ? new Date(row.updated_date).toISOString() : undefined,
  };
};

const statusForAction = (action: ApprovalAction): ApprovalStatus => action === "approve" ? "Approved" : "Rejected";

const resolveApproval = async (requestId: string, action: ApprovalAction) => {
  const targetStatus = statusForAction(action);

  if (!isDbConfigured()) {
    const existing = getLocalRequest(requestId);
    if (!existing) {
      return { ok: false, html: renderPage("Request Not Found", "Request Not Found", `<p>No request exists for ${requestId}.</p>`) };
    }
    if (existing.status === "Approved" || existing.status === "Rejected") {
      return { ok: true, html: renderResolved(requestId, existing.status, "This approval link was already used.") };
    }

    updateLocalRequestStatus(requestId, targetStatus);
    info("Local approval resolved", { requestId, status: targetStatus });
    return { ok: true, html: renderResolved(requestId, targetStatus, `The request was marked as ${targetStatus}.`) };
  }

  const existingResult = await query("SELECT status FROM request_intake WHERE request_id = $1", [requestId]);
  if (existingResult.rowCount === 0) {
    return { ok: false, html: renderPage("Request Not Found", "Request Not Found", `<p>No request exists for ${requestId}.</p>`) };
  }

  const existingStatus = String(existingResult.rows[0].status || "");
  if (existingStatus === "Approved" || existingStatus === "Rejected") {
    return { ok: true, html: renderResolved(requestId, existingStatus as ApprovalStatus, "This approval link was already used.") };
  }

  await query("UPDATE request_intake SET status = $1, updated_date = now() WHERE request_id = $2", [targetStatus, requestId]);
  await query(
    "INSERT INTO approval_records (request_id, approver_name, approval_status, comments) VALUES ($1,$2,$3,$4)",
    [requestId, "Manager (email link)", targetStatus, `Action completed through ${action} link`],
  );
  await query(
    "INSERT INTO audit_history (request_id, old_status, new_status, changed_by, remarks) VALUES ($1,$2,$3,$4,$5)",
    [requestId, existingStatus || "Pending Approval", targetStatus, "Manager (email link)", `Action completed through ${action} link`],
  );
  info("Database approval resolved", { requestId, status: targetStatus });
  return { ok: true, html: renderResolved(requestId, targetStatus, `The request was marked as ${targetStatus}.`) };
};

router.get("/:action(approve|reject)/:token", async (req, res) => {
  const action = req.params.action as ApprovalAction;
  const verification = verifyApprovalToken(req.params.token);

  if (!verification.valid) {
    return res.status(400).type("html").send(renderInvalid(verification.reason.replace(/_/g, " ")));
  }

  try {
    const result = await resolveApproval(verification.requestId, action);
    return res.status(result.ok ? 200 : 404).type("html").send(result.html);
  } catch (err) {
    error("Approval route failed", { action, error: String(err) });
    return res.status(500).type("html").send(renderPage("Approval Error", "Approval Error", "<p>Unable to process this approval right now.</p>"));
  }
});

router.get("/request/:token", async (req, res) => {
  const verification = verifyApprovalToken(req.params.token);

  if (!verification.valid) {
    return res.status(400).type("html").send(renderInvalid(verification.reason.replace(/_/g, " ")));
  }

  try {
    const request = await loadRequestStatus(verification.requestId);
    if (!request) {
      return res.status(404).type("html").send(renderPage("Request Not Found", "Request Not Found", `<p>No request exists for ${verification.requestId}.</p>`));
    }

    return res.status(200).type("html").send(renderRequestStatus(request));
  } catch (err) {
    error("Request status route failed", { error: String(err) });
    return res.status(500).type("html").send(renderPage("Request Status Error", "Request Status Error", "<p>Unable to load this request right now.</p>"));
  }
});

export default router;