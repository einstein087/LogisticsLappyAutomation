import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const TOKEN_SECRET = process.env.APPROVAL_TOKEN_SECRET?.trim() || process.env.ENCRYPTION_KEY?.trim() || "default-approval-secret";
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ApprovalTokenPayload {
  requestId: string;
  exp: number;
}

const encodeBase64Url = (value: string) =>
  Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const decodeBase64Url = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64").toString("utf8");
};

const signPayload = (payload: string) =>
  crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const createApprovalToken = (requestId: string, ttlMs: number = DEFAULT_TTL_MS) => {
  const payload: ApprovalTokenPayload = {
    requestId,
    exp: Date.now() + ttlMs,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
};

export type ApprovalTokenVerification =
  | { valid: true; requestId: string }
  | { valid: false; reason: "malformed" | "signature_mismatch" | "expired" };

export const verifyApprovalToken = (token: string): ApprovalTokenVerification => {
  const [encodedPayload, signature] = String(token || "").split(".");

  if (!encodedPayload || !signature) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as ApprovalTokenPayload;
    if (!payload.requestId || !payload.exp) {
      return { valid: false, reason: "malformed" };
    }
    if (Date.now() > payload.exp) {
      return { valid: false, reason: "expired" };
    }

    return { valid: true, requestId: payload.requestId };
  } catch {
    return { valid: false, reason: "malformed" };
  }
};