import { authenticator } from "otplib";
import { encryptField, decryptField } from "./encryption.js";

/**
 * TOTP (Time-based One-Time Password) helpers for MFA. Secrets are
 * encrypted at rest, same as PII fields.
 */

/** Generate a new TOTP secret and return { raw, encrypted, otpauthUrl }. */
export function generateTotpSecret(email) {
    const raw = authenticator.generateSecret();
    const encrypted = encryptField(raw);
    const otpauthUrl = authenticator.keyuri(email, "Opaca Engine", raw);
    return { raw, encrypted, otpauthUrl };
}

/** Verify a TOTP code against an encrypted secret. */
export function verifyTotp(code, encryptedSecret) {
    const secret = decryptField(encryptedSecret);
    return authenticator.verify({ token: code, secret });
}
