import "../config/env";
import axios from "axios";
import nodemailer from "nodemailer";
import { info, warn, error } from "../utils/logger";

const SMS_WEBHOOK_URL = process.env.SMS_WEBHOOK_URL?.trim() || "";
const SMTP_HOST = process.env.SMTP_HOST?.trim() || "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER?.trim() || "";
const SMTP_PASS = process.env.SMTP_PASS?.trim() || "";
const SMTP_FROM = process.env.SMTP_FROM?.trim() || SMTP_USER;
const SMTP_SERVICE = process.env.SMTP_SERVICE?.trim() || "";
const MANAGER_APPROVAL_EMAIL = process.env.MANAGER_APPROVAL_EMAIL?.trim() || "yashupadrasta99@gmail.com";

export interface UserNotificationRequest {
  requestId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  pickupLocation?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  dropLocation?: string;
  dropContactName?: string;
  dropContactPhone?: string;
  assetType?: string;
  assetTag?: string;
  accessories?: string;
  currentStatus?: string;
}

export interface ManagerApprovalRequest extends UserNotificationRequest {
  managerEmail?: string;
  approveUrl: string;
  rejectUrl: string;
}

export interface NotificationResult {
  channel: "email" | "sms";
  status: "sent" | "skipped" | "failed";
  detail: string;
}

export interface NotificationConfigStatus {
  email: {
    configured: boolean;
    mode: "smtp" | "unconfigured";
    detail: string;
  };
  sms: {
    configured: boolean;
    mode: "webhook" | "unconfigured";
    detail: string;
  };
  managerEmail: {
    target: string;
  };
}

const buildSubject = (request: UserNotificationRequest) =>
  `Laptop Pickup & Delivery Request - ${request.pickupLocation || "Source"} to ${request.dropLocation || "Destination"}`;

const buildMessage = (request: UserNotificationRequest) => (
  `Hi ${request.fullName || "User"}, your request ${request.requestId} has been captured. `
  + `Current status: ${request.currentStatus || "Pending Pickup"}.\n`
  + `Pickup: ${request.pickupLocation || "Source"} | Contact: ${request.pickupContactName || "N/A"} | Phone: ${request.pickupContactPhone || "N/A"}.\n`
  + `Drop: ${request.dropLocation || "Destination"} | Contact: ${request.dropContactName || "N/A"} | Phone: ${request.dropContactPhone || "N/A"}.\n`
  + `Asset: ${request.assetType || "N/A"} | Tag: ${request.assetTag || "N/A"} | Accessories: ${request.accessories || "N/A"}.`
);

const buildHtmlMessage = (request: UserNotificationRequest) => `
  <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <h2 style="margin-bottom:12px;">Laptop Pickup & Delivery Request</h2>
    <p>Hi ${request.fullName || "User"},</p>
    <p>Your request <strong>${request.requestId}</strong> has been captured.</p>
    <p><strong>Status:</strong> ${request.currentStatus || "Pending Pickup"}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr>
        <th style="border:1px solid #e6e6e6;background-color:#f5f5f5;padding:8px;text-align:left;">Field</th>
        <th style="border:1px solid #e6e6e6;background-color:#f5f5f5;padding:8px;text-align:left;">Value</th>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Pickup Location</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.pickupLocation || "Source"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Pickup Contact</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.pickupContactName || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Pickup Phone</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.pickupContactPhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Drop Location</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.dropLocation || "Destination"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Drop Contact</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.dropContactName || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Drop Phone</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.dropContactPhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Asset Type</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.assetType || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Asset Tag</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.assetTag || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Accessories</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.accessories || "N/A"}</td>
      </tr>
    </table>
  </div>
`;

const buildManagerApprovalHtml = (request: ManagerApprovalRequest) => `
  <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5;">
    <h3 style="margin-bottom:12px;">Laptop Approval Request</h3>
    <p><strong>Employee:</strong> ${request.fullName || "User"}</p>
    <p><strong>Request ID:</strong> ${request.requestId}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr>
        <th style="border:1px solid #e6e6e6;background-color:#f5f5f5;padding:8px;text-align:left;">Field</th>
        <th style="border:1px solid #e6e6e6;background-color:#f5f5f5;padding:8px;text-align:left;">Value</th>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Pickup Location</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.pickupLocation || "Source"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Pickup Contact</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.pickupContactName || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Pickup Phone</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.pickupContactPhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Drop Location</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.dropLocation || "Destination"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Drop Contact</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.dropContactName || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Drop Phone</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.dropContactPhone || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Asset Type</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.assetType || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Asset Tag</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.assetTag || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Accessories</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.accessories || "N/A"}</td>
      </tr>
      <tr>
        <td style="border:1px solid #e6e6e6;padding:8px;">Status</td>
        <td style="border:1px solid #e6e6e6;padding:8px;">${request.currentStatus || "Pending Approval"}</td>
      </tr>
    </table>
    <p style="margin-top:16px;">
      <a href="${request.approveUrl}" style="text-decoration:none;color:#464feb;font-weight:700;">Approve</a>
      &nbsp;|&nbsp;
      <a href="${request.rejectUrl}" style="text-decoration:none;color:#464feb;font-weight:700;">Reject</a>
    </p>
    <p style="margin-top:12px;">Approve: ${request.approveUrl}<br /><br />Reject: ${request.rejectUrl}</p>
  </div>
`;

const hasSmtpConfig = () => Boolean(SMTP_FROM && ((SMTP_SERVICE && SMTP_USER && SMTP_PASS) || (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)));

const createSmtpTransport = () => {
  if (SMTP_SERVICE) {
    return nodemailer.createTransport({
      service: SMTP_SERVICE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

export const getNotificationConfigStatus = (): NotificationConfigStatus => ({
  email: hasSmtpConfig()
    ? {
        configured: true,
        mode: "smtp",
        detail: "Email delivery is configured through SMTP settings.",
      }
    : {
        configured: false,
        mode: "unconfigured",
        detail: "Set SMTP_* variables to send user emails.",
      },
  sms: SMS_WEBHOOK_URL
    ? {
        configured: true,
        mode: "webhook",
        detail: "SMS delivery is configured through SMS_WEBHOOK_URL.",
      }
    : {
        configured: false,
        mode: "unconfigured",
        detail: "Set SMS_WEBHOOK_URL only if SMS notifications are required.",
      },
  managerEmail: {
    target: MANAGER_APPROVAL_EMAIL,
  },
});

const sendConfiguredEmail = async (payload: {
  to: string;
  subject: string;
  message: string;
  html: string;
  requestId: string;
  extra?: Record<string, unknown>;
}) => {
  const transporter = createSmtpTransport();
  await transporter.sendMail({
    from: SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.message,
    html: payload.html,
  });
};

export const sendEmailNotification = async (request: UserNotificationRequest): Promise<NotificationResult> => {
  if (!request.email) {
    return { channel: "email", status: "skipped", detail: "User email is missing." };
  }

  if (!hasSmtpConfig()) {
    warn("Email delivery not configured", { requestId: request.requestId });
    return {
      channel: "email",
      status: "skipped",
      detail: "Configure SMTP_* environment variables.",
    };
  }

  try {
    await sendConfiguredEmail({
      to: request.email,
      subject: buildSubject(request),
      message: buildMessage(request),
      html: buildHtmlMessage(request),
      requestId: request.requestId,
      extra: { template: "user_confirmation" },
    });
    info("Email notification sent", { requestId: request.requestId, recipient: request.email });
    return { channel: "email", status: "sent", detail: "Email sent." };
  } catch (err) {
    error("Email notification failed", { requestId: request.requestId, error: String(err) });
    return { channel: "email", status: "failed", detail: "Email sending failed." };
  }
};

export const sendSmsNotification = async (request: UserNotificationRequest): Promise<NotificationResult> => {
  if (!request.phone) {
    return { channel: "sms", status: "skipped", detail: "User phone is missing." };
  }

  if (!SMS_WEBHOOK_URL) {
    warn("SMS webhook not configured", { requestId: request.requestId });
    return { channel: "sms", status: "skipped", detail: "SMS_WEBHOOK_URL is not configured." };
  }

  try {
    await axios.post(SMS_WEBHOOK_URL, {
      to: request.phone,
      message: buildMessage(request),
      requestId: request.requestId,
    });
    info("SMS notification sent", { requestId: request.requestId, recipient: request.phone });
    return { channel: "sms", status: "sent", detail: "SMS sent." };
  } catch (err) {
    error("SMS notification failed", { requestId: request.requestId, error: String(err) });
    return { channel: "sms", status: "failed", detail: "SMS sending failed." };
  }
};

export const triggerUserNotifications = async (request: UserNotificationRequest) => {
  const [emailResult, smsResult] = await Promise.all([
    sendEmailNotification(request),
    sendSmsNotification(request),
  ]);

  return {
    email: emailResult,
    sms: smsResult,
  };
};

export const sendManagerApprovalEmail = async (request: ManagerApprovalRequest): Promise<NotificationResult> => {
  const targetEmail = request.managerEmail || MANAGER_APPROVAL_EMAIL;

  if (!hasSmtpConfig()) {
    warn("Manager approval email not configured", { requestId: request.requestId, targetEmail });
    return {
      channel: "email",
      status: "skipped",
      detail: "Configure SMTP_* environment variables.",
    };
  }

  try {
    await sendConfiguredEmail({
      to: targetEmail,
      subject: `Approval Required - ${buildSubject(request)}`,
      message:
        `Employee: ${request.fullName || "User"}\n`
        + `Request ID: ${request.requestId}\n`
        + `Pickup: ${request.pickupLocation || "Source"} | Contact: ${request.pickupContactName || "N/A"} | Phone: ${request.pickupContactPhone || "N/A"}\n`
        + `Drop: ${request.dropLocation || "Destination"} | Contact: ${request.dropContactName || "N/A"} | Phone: ${request.dropContactPhone || "N/A"}\n`
        + `Asset: ${request.assetType || "N/A"} | Tag: ${request.assetTag || "N/A"} | Accessories: ${request.accessories || "N/A"}\n`
        + `Approve: ${request.approveUrl}\n`
        + `Reject: ${request.rejectUrl}`,
      html: buildManagerApprovalHtml(request),
      requestId: request.requestId,
      extra: {
        template: "manager_approval",
        approveUrl: request.approveUrl,
        rejectUrl: request.rejectUrl,
      },
    });
    info("Manager approval email sent", { requestId: request.requestId, recipient: targetEmail });
    return { channel: "email", status: "sent", detail: `Manager approval email sent to ${targetEmail}.` };
  } catch (err) {
    error("Manager approval email failed", { requestId: request.requestId, error: String(err) });
    return { channel: "email", status: "failed", detail: "Manager approval email failed." };
  }
};
