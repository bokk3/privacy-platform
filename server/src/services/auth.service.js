import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/hash.js";
import {
    signAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    generateSecureToken,
    parseDuration,
} from "../lib/jwt.js";
import { generateTotpSecret, verifyTotp } from "../lib/totp.js";
import {
    sendVerificationEmail,
    sendPasswordResetEmail,
} from "../lib/email.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { auditLog } from "./audit.service.js";
import { AUDIT_ACTION } from "@opaca-engine/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min

function isLocked(user) {
    return user.lockedUntil && user.lockedUntil > new Date();
}

async function incrementFailedLogins(userId) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: { failedLoginCount: { increment: 1 } },
    });
    if (user.failedLoginCount >= LOCKOUT_THRESHOLD) {
        await prisma.user.update({
            where: { id: userId },
            data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
        });
    }
}

async function resetFailedLogins(userId) {
    await prisma.user.update({
        where: { id: userId },
        data: { failedLoginCount: 0, lockedUntil: null },
    });
}

async function issueTokenPair(user, { ip, userAgent }) {
    const accessToken = signAccessToken({
        userId: user.id,
        role: user.role,
        emailVerified: !!user.emailVerifiedAt,
    });

    const { raw: refreshRaw, hash: refreshHash } = generateRefreshToken();
    const refreshTtlMs = parseDuration(env.JWT_REFRESH_TTL);

    await prisma.refreshToken.create({
        data: {
            userId: user.id,
            tokenHash: refreshHash,
            ip,
            userAgent,
            expiresAt: new Date(Date.now() + refreshTtlMs),
        },
    });

    return { accessToken, refreshToken: refreshRaw };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new user. Sends a verification email. Returns the token pair
 * so the user is logged in immediately (email-unverified state is enforced
 * at the middleware layer for protected routes).
 */
export async function register({ email, password, ip, userAgent }) {
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
        throw new AppError("An account with this email already exists.", 409, "EMAIL_TAKEN");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
        data: { email: email.toLowerCase(), passwordHash },
    });

    // Send verification email (fire-and-forget — don't block registration)
    const { raw: tokenRaw, hash: tokenHash } = generateSecureToken();
    await prisma.emailVerificationToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
    });
    sendVerificationEmail(user.email, tokenRaw);

    await auditLog({
        actorId: user.id,
        actorType: "USER",
        action: AUDIT_ACTION.USER_REGISTERED,
        entityType: "User",
        entityId: user.id,
        ip,
    });

    const tokens = await issueTokenPair(user, { ip, userAgent });
    return { user: sanitizeUser(user), ...tokens };
}

/**
 * Login with email + password. Returns token pair or, if MFA is enabled,
 * a challenge object that must be completed via `verifyMfaLogin`.
 */
export async function login({ email, password, ip, userAgent }) {
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (!user || user.deletedAt) {
        throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    if (isLocked(user)) {
        throw new AppError(
            "Account temporarily locked due to too many failed attempts. Try again later.",
            423,
            "ACCOUNT_LOCKED",
        );
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
        await incrementFailedLogins(user.id);
        throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    await resetFailedLogins(user.id);

    // If MFA is enabled, return a challenge instead of tokens
    if (user.mfaEnabled) {
        // Generate a short-lived MFA challenge token so the second step
        // authenticates the same user without re-submitting the password.
        const { raw: mfaRaw, hash: mfaHash } = generateSecureToken();
        // Store as a special-purpose refresh token with very short TTL
        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: mfaHash,
                ip,
                userAgent,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
                replacedBy: "mfa-challenge", // marker so we can identify this type
            },
        });

        return { mfaRequired: true, mfaChallengeToken: mfaRaw };
    }

    await auditLog({
        actorId: user.id,
        actorType: "USER",
        action: AUDIT_ACTION.USER_LOGIN,
        entityType: "User",
        entityId: user.id,
        ip,
    });

    const tokens = await issueTokenPair(user, { ip, userAgent });
    return { user: sanitizeUser(user), ...tokens };
}

/**
 * Complete MFA challenge by providing the TOTP code.
 */
export async function verifyMfaLogin({ challengeToken, totpCode, ip, userAgent }) {
    const tokenHash = hashRefreshToken(challengeToken);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record || record.revokedAt || record.expiresAt < new Date() || record.replacedBy !== "mfa-challenge") {
        throw new AppError("Invalid or expired MFA challenge.", 401, "MFA_CHALLENGE_INVALID");
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
        throw new AppError("MFA is not configured for this account.", 400, "MFA_NOT_CONFIGURED");
    }

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) {
        throw new AppError("Invalid TOTP code.", 401, "MFA_CODE_INVALID");
    }

    // Revoke the challenge token
    await prisma.refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
    });

    await auditLog({
        actorId: user.id,
        actorType: "USER",
        action: AUDIT_ACTION.USER_LOGIN,
        entityType: "User",
        entityId: user.id,
        ip,
        metadata: { mfa: true },
    });

    const tokens = await issueTokenPair(user, { ip, userAgent });
    return { user: sanitizeUser(user), ...tokens };
}

/**
 * Verify email using the token sent during registration.
 */
export async function verifyEmail({ token }) {
    const tokenHash = hashRefreshToken(token); // same sha256 helper
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new AppError("Invalid or expired verification link.", 400, "VERIFICATION_INVALID");
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { id: record.userId },
            data: { emailVerifiedAt: new Date() },
        }),
        prisma.emailVerificationToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
        }),
    ]);

    return { verified: true };
}

/**
 * Resend email verification token.
 */
export async function resendVerification({ userId }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");
    if (user.emailVerifiedAt) throw new AppError("Email already verified.", 400, "ALREADY_VERIFIED");

    // Invalidate old tokens by not cleaning them up — they'll naturally expire.
    const { raw: tokenRaw, hash: tokenHash } = generateSecureToken();
    await prisma.emailVerificationToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });

    await sendVerificationEmail(user.email, tokenRaw);
    return { sent: true };
}

/**
 * Request a password reset. Always returns success to prevent email enumeration.
 */
export async function forgotPassword({ email, ip }) {
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    // Don't reveal whether the email exists
    if (!user || user.deletedAt) return { sent: true };

    const { raw: tokenRaw, hash: tokenHash } = generateSecureToken();
    await prisma.passwordResetToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
    });

    await sendPasswordResetEmail(user.email, tokenRaw);

    await auditLog({
        actorId: user.id,
        actorType: "USER",
        action: AUDIT_ACTION.PASSWORD_RESET_REQUESTED,
        entityType: "User",
        entityId: user.id,
        ip,
    });

    return { sent: true };
}

/**
 * Reset password using the token from the forgot-password email.
 */
export async function resetPassword({ token, newPassword, ip }) {
    const tokenHash = hashRefreshToken(token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
        throw new AppError("Invalid or expired reset link.", 400, "RESET_INVALID");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
        prisma.user.update({
            where: { id: record.userId },
            data: { passwordHash },
        }),
        prisma.passwordResetToken.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
        }),
        // Revoke all existing refresh tokens for this user (force re-login)
        prisma.refreshToken.updateMany({
            where: { userId: record.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
    ]);

    await auditLog({
        actorId: record.userId,
        actorType: "USER",
        action: AUDIT_ACTION.PASSWORD_RESET_COMPLETED,
        entityType: "User",
        entityId: record.userId,
        ip,
    });

    return { reset: true };
}

/**
 * Rotate the refresh token: revoke the old one, issue a new pair.
 * Implements refresh-token rotation: if someone replays an already-revoked
 * token, we revoke the entire family (all tokens for that user) as a
 * security measure — this detects token theft.
 */
export async function refreshTokens({ refreshToken: rawToken, ip, userAgent }) {
    const tokenHash = hashRefreshToken(rawToken);
    const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!record) {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    // Replay detection: token was already used → revoke entire family
    if (record.revokedAt) {
        await prisma.refreshToken.updateMany({
            where: { userId: record.userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        throw new AppError(
            "Refresh token reuse detected. All sessions revoked for security.",
            401,
            "TOKEN_REUSE_DETECTED",
        );
    }

    if (record.expiresAt < new Date()) {
        throw new AppError("Refresh token expired. Please log in again.", 401, "REFRESH_TOKEN_EXPIRED");
    }

    // Skip MFA challenge tokens
    if (record.replacedBy === "mfa-challenge") {
        throw new AppError("Invalid refresh token.", 401, "INVALID_REFRESH_TOKEN");
    }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || user.deletedAt) {
        throw new AppError("Account not found.", 401, "ACCOUNT_NOT_FOUND");
    }

    // Revoke old token and issue new pair atomically
    const { raw: newRaw, hash: newHash } = generateRefreshToken();
    const refreshTtlMs = parseDuration(env.JWT_REFRESH_TTL);

    await prisma.$transaction([
        prisma.refreshToken.update({
            where: { id: record.id },
            data: { revokedAt: new Date(), replacedBy: newHash },
        }),
        prisma.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: newHash,
                ip,
                userAgent,
                expiresAt: new Date(Date.now() + refreshTtlMs),
            },
        }),
    ]);

    const accessToken = signAccessToken({
        userId: user.id,
        role: user.role,
        emailVerified: !!user.emailVerifiedAt,
    });

    return { accessToken, refreshToken: newRaw };
}

/**
 * Logout: revoke the given refresh token.
 */
export async function logout({ refreshToken: rawToken, userId, ip }) {
    if (rawToken) {
        const tokenHash = hashRefreshToken(rawToken);
        await prisma.refreshToken.updateMany({
            where: { tokenHash, userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: AUDIT_ACTION.USER_LOGOUT,
        entityType: "User",
        entityId: userId,
        ip,
    });

    return { loggedOut: true };
}

/**
 * Logout from all sessions: revoke all refresh tokens for the user.
 */
export async function logoutAll({ userId, ip }) {
    await prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: AUDIT_ACTION.USER_LOGOUT,
        entityType: "User",
        entityId: userId,
        ip,
        metadata: { allSessions: true },
    });

    return { loggedOut: true };
}

// ---------------------------------------------------------------------------
// MFA enrollment
// ---------------------------------------------------------------------------

/**
 * Begin MFA enrollment: generate TOTP secret, return QR-code–ready URL.
 * The secret isn't saved to the user row until `confirmMfaSetup` — this
 * ensures the user actually has the code in their authenticator before we
 * enable MFA.
 */
export async function startMfaSetup({ userId }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");
    if (user.mfaEnabled) throw new AppError("MFA is already enabled.", 400, "MFA_ALREADY_ENABLED");

    const { raw, encrypted, otpauthUrl } = generateTotpSecret(user.email);

    // Temporarily store encrypted secret so confirmMfaSetup can verify a code
    await prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: encrypted },
    });

    return { secret: raw, otpauthUrl };
}

/**
 * Confirm MFA setup: user supplies a TOTP code to prove they saved the
 * secret. If valid, MFA is enabled.
 */
export async function confirmMfaSetup({ userId, totpCode }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");
    if (user.mfaEnabled) throw new AppError("MFA is already enabled.", 400, "MFA_ALREADY_ENABLED");
    if (!user.mfaSecret) throw new AppError("Start MFA setup first.", 400, "MFA_NOT_STARTED");

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) {
        // Wipe the temp secret so the user must re-start setup
        await prisma.user.update({ where: { id: userId }, data: { mfaSecret: null } });
        throw new AppError("Invalid TOTP code. Please restart MFA setup.", 400, "MFA_CODE_INVALID");
    }

    await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
    });

    return { mfaEnabled: true };
}

/**
 * Disable MFA: requires the user to supply a valid TOTP code as proof.
 */
export async function disableMfa({ userId, totpCode }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");
    if (!user.mfaEnabled) throw new AppError("MFA is not enabled.", 400, "MFA_NOT_ENABLED");

    const valid = verifyTotp(totpCode, user.mfaSecret);
    if (!valid) throw new AppError("Invalid TOTP code.", 401, "MFA_CODE_INVALID");

    await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaSecret: null },
    });

    return { mfaEnabled: false };
}

// ---------------------------------------------------------------------------
// Profile (read-only, used by /me endpoint)
// ---------------------------------------------------------------------------

export async function getProfile(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            emailVerifiedAt: true,
            mfaEnabled: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user) throw new AppError("User not found.", 404, "NOT_FOUND");
    return user;
}

// ---------------------------------------------------------------------------
// Compliance & Right-to-Access
// ---------------------------------------------------------------------------

export async function exportData(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            identities: {
                include: {
                    aliases: true,
                    addresses: true,
                    emails: true,
                    phones: true,
                },
            },
            privacyRequests: {
                include: {
                    broker: { select: { name: true, method: true } },
                    events: true,
                },
            },
            auditLogs: {
                orderBy: { createdAt: "desc" }
            },
        },
    });

    if (!user || user.deletedAt) throw new AppError("Account not found.", 404, "NOT_FOUND");

    // Remove sensitive technical boundaries before dropping the json tree
    delete user.passwordHash;
    delete user.mfaSecret;

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: "PRIVACY_DATA_EXPORTED", // Custom action for GDPR trail
        entityType: "User",
        entityId: userId,
        ip: null,
    });

    return user;
}

export async function deleteAccount(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError("Account not found.", 404, "NOT_FOUND");

    const scramble = `deleted_${userId.split("-")[0]}_${Date.now()}@deleted.local`;

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                email: scramble,
                passwordHash: "DELETED",
                mfaSecret: null,
                mfaEnabled: false,
            },
        }),
        prisma.identity.updateMany({
            where: { userId },
            data: { deletedAt: new Date() },
        }),
        prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
        // Pause all recurring schedules instantly
        prisma.recurringSchedule.updateMany({
            where: { userId, active: true },
            data: { active: false },
        })
    ]);

    await auditLog({
        actorId: userId,
        actorType: "USER",
        action: "USER_DELETED_ACCOUNT",
        entityType: "User",
        entityId: userId,
        ip: null,
    });

    return { deleted: true };
}

// ---------------------------------------------------------------------------
// Sanitize helper
// ---------------------------------------------------------------------------

function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: !!user.emailVerifiedAt,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
    };
}
