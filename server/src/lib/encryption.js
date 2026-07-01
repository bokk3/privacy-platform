import crypto from "node:crypto";
import { env } from "../config/env.js";

// Application-level encryption at rest for PII columns. Even if the
// database is compromised or a backup leaks, names/addresses/phone numbers
// are unreadable without FIELD_ENCRYPTION_KEY (kept outside the DB, in
// secrets management / environment).
//
// Format stored in the DB column: "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
// Versioned prefix allows future key/algorithm rotation without a hard cutover.

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");

export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptField(stored) {
  if (stored === null || stored === undefined) return stored;
  const parts = String(stored).split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Unrecognized encrypted field format");
  }
  const [, ivHex, authTagHex, ciphertextHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/** Deterministic HMAC used only for equality lookups (e.g. "does this email already exist?") without decrypting every row. */
export function hmacIndex(value) {
  return crypto.createHmac("sha256", KEY).update(String(value).toLowerCase().trim()).digest("hex");
}
