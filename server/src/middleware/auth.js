import { verifyAccessToken } from "../lib/jwt.js";
import { AppError } from "./errorHandler.js";

/**
 * Authenticate the request by verifying the JWT access token from the
 * Authorization header. Sets `req.user` with the decoded payload:
 *   { sub, role, emailVerified, iat, exp }
 *
 * Usage: router.get("/x", requireAuth, handler)
 */
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        throw new AppError("Authentication required.", 401, "AUTH_REQUIRED");
    }

    const token = header.slice(7);
    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new AppError("Access token expired.", 401, "TOKEN_EXPIRED");
        }
        throw new AppError("Invalid access token.", 401, "TOKEN_INVALID");
    }
}

/**
 * Require that the user's email is verified. Must be used AFTER requireAuth.
 */
export function requireVerifiedEmail(req, res, next) {
    if (!req.user?.emailVerified) {
        throw new AppError(
            "Email verification required. Please verify your email first.",
            403,
            "EMAIL_NOT_VERIFIED",
        );
    }
    next();
}

/**
 * Require a specific role (or one of several roles).
 * Usage: router.get("/admin/x", requireAuth, requireRole("ADMIN"), handler)
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            throw new AppError("Insufficient permissions.", 403, "FORBIDDEN");
        }
        next();
    };
}
