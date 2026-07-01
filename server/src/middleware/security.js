import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { doubleCsrf } from "csrf-csrf";
import { env, isProd } from "../config/env.js";
import { redis } from "../lib/redis.js";

export function helmetMiddleware() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
  });
}

export function corsMiddleware() {
  return cors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  });
}

/** Global rate limit, backed by Redis so it works correctly across multiple server instances. */
export function globalRateLimiter() {
  if (env.NODE_ENV === "test") return (req, res, next) => next();
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    store: env.NODE_ENV === "test" ? undefined : new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: "rl:global:",
    }),
    message: { error: "Too many requests, please try again later." },
  });
}

/** Stricter limiter for auth endpoints — mitigates credential stuffing / brute force. */
export function authRateLimiter() {
  if (env.NODE_ENV === "test") return (req, res, next) => next();
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: env.NODE_ENV === "test" ? undefined : new RedisStore({
      sendCommand: (...args) => redis.call(...args),
      prefix: "rl:auth:",
    }),
    message: { error: "Too many authentication attempts. Please wait before retrying." },
  });
}

/** HTTP Parameter Pollution protection (?role=USER&role=ADMIN style attacks). */
export function hppMiddleware() {
  return hpp();
}

/** Double-submit-cookie CSRF protection for cookie-authenticated browser sessions. */
export const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  cookieName: isProd ? "__Host-csrf" : "csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: isProd,
    path: "/",
  },
  size: 64,
  getTokenFromRequest: (req) => req.headers["x-csrf-token"],
});
