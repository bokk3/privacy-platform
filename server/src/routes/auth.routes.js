import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/security.js";
import {
    registerSchema,
    loginSchema,
    verifyMfaLoginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    refreshTokenSchema,
    mfaCodeSchema,
} from "../schemas/auth.schemas.js";
import * as authService from "../services/auth.service.js";

export const authRouter = Router();

// All auth routes get the stricter rate limiter (10 req / 15 min)
authRouter.use(authRateLimiter());

// ---------------------------------------------------------------------------
// Registration & Login
// ---------------------------------------------------------------------------

authRouter.post("/register", validate(registerSchema), async (req, res, next) => {
    try {
        const result = await authService.register({
            ...req.body,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/login", validate(loginSchema), async (req, res, next) => {
    try {
        const result = await authService.login({
            ...req.body,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/login/mfa", validate(verifyMfaLoginSchema), async (req, res, next) => {
    try {
        const result = await authService.verifyMfaLogin({
            ...req.body,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

authRouter.post("/verify-email", validate(verifyEmailSchema), async (req, res, next) => {
    try {
        const result = await authService.verifyEmail(req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/resend-verification", requireAuth, async (req, res, next) => {
    try {
        const result = await authService.resendVerification({ userId: req.user.sub });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

authRouter.post("/forgot-password", validate(forgotPasswordSchema), async (req, res, next) => {
    try {
        const result = await authService.forgotPassword({
            ...req.body,
            ip: req.ip,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/reset-password", validate(resetPasswordSchema), async (req, res, next) => {
    try {
        const result = await authService.resetPassword({
            ...req.body,
            ip: req.ip,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

authRouter.post("/refresh", validate(refreshTokenSchema), async (req, res, next) => {
    try {
        const result = await authService.refreshTokens({
            ...req.body,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
    try {
        const result = await authService.logout({
            refreshToken: req.body.refreshToken,
            userId: req.user.sub,
            ip: req.ip,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/logout-all", requireAuth, async (req, res, next) => {
    try {
        const result = await authService.logoutAll({
            userId: req.user.sub,
            ip: req.ip,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// MFA management
// ---------------------------------------------------------------------------

authRouter.post("/mfa/setup", requireAuth, async (req, res, next) => {
    try {
        const result = await authService.startMfaSetup({ userId: req.user.sub });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/mfa/confirm", requireAuth, validate(mfaCodeSchema), async (req, res, next) => {
    try {
        const result = await authService.confirmMfaSetup({
            userId: req.user.sub,
            totpCode: req.body.totpCode,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

authRouter.post("/mfa/disable", requireAuth, validate(mfaCodeSchema), async (req, res, next) => {
    try {
        const result = await authService.disableMfa({
            userId: req.user.sub,
            totpCode: req.body.totpCode,
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

authRouter.get("/me", requireAuth, async (req, res, next) => {
    try {
        const user = await authService.getProfile(req.user.sub);
        res.json(user);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------------------
// Compliance & Right-to-Access
// ---------------------------------------------------------------------------

authRouter.get("/export", requireAuth, async (req, res, next) => {
    try {
        const data = await authService.exportData(req.user.sub);
        res.json(data);
    } catch (err) {
        next(err);
    }
});

authRouter.delete("/account", requireAuth, async (req, res, next) => {
    try {
        const result = await authService.deleteAccount(req.user.sub);
        res.json(result);
    } catch (err) {
        next(err);
    }
});
