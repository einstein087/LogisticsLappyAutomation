import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const ALGORITHM = "aes-256-gcm";
const KEY = crypto.createHash("sha256").update(process.env.ENCRYPTION_KEY ?? "default-secret-key").digest();

export const encryptText = (plaintext: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
};

export const decryptText = (ciphertext: string) => {
  const [ivB64, encryptedB64, tagB64] = ciphertext.split(":");
  if (!ivB64 || !encryptedB64 || !tagB64) {
    throw new Error("Invalid encrypted payload");
  }

  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};
