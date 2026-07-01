import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Issue a short-lived access token. Contains only the user id, role, and
 * email-verification status — enough for middleware to authorize requests
 * without hitting the DB on every call.
 */
export function signAccessToken(payload) {
    return jwt.sign(
        {
            sub: payload.userId,
            role: payload.role,
            emailVerified: payload.emailVerified,
        },
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_TTL, algorithm: "HS256" },
    );
}

/** Verify and decode an access token, throws on expiry / invalid sig. */
export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
}

/**
 * Issue a long-lived refresh token (an opaque random string). The raw value
 * is sent to the client; only the SHA-256 hash is stored server-side so a
 * DB breach alone doesn't yield usable tokens.
 */
export function generateRefreshToken() {
    const raw = crypto.randomBytes(48).toString("base64url");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    return { raw, hash };
}

/** Hash a raw refresh token for DB lookup. */
export function hashRefreshToken(raw) {
    return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a secure random token for email verification / password reset. */
export function generateSecureToken() {
    const raw = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    return { raw, hash };
}

/** Parse a duration string like "15m" or "30d" into milliseconds. */
export function parseDuration(duration) {
    const match = duration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) throw new Error(`Invalid duration format: ${duration}`);
    const [, value, unit] = match;
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return Number(value) * multipliers[unit];
}
