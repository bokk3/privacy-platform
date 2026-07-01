/**
 * Vitest global test setup — runs before each test file.
 *
 * Responsibilities:
 *   1. Override env variables for test context (avoid importing real .env)
 *   2. Set NODE_ENV to "test"
 */

// Override env BEFORE any application imports load config/env.js
process.env.NODE_ENV = "test";
process.env.APP_NAME = "Privacy Platform (Test)";
process.env.API_PORT = "4000"; // Positive port required by Zod config
process.env.APP_URL = "http://localhost:5173";
process.env.API_URL = "http://localhost:4000";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dev:dev@localhost:5432/incognito_test?schema=public";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET = "test_access_secret_must_be_at_least_32_chars";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_must_be_at_least_32_chars";
process.env.JWT_ACCESS_TTL = "15m";
process.env.JWT_REFRESH_TTL = "30d";
process.env.COOKIE_SECRET = "test_cookie_secret_16plus";
process.env.FIELD_ENCRYPTION_KEY = "0000000000000000000000000000000000000000000000000000000000000000";
process.env.ARGON2_MEMORY_COST = "1024"; // Low for fast tests
process.env.ARGON2_TIME_COST = "2";
process.env.ARGON2_PARALLELISM = "1";
process.env.SMTP_HOST = "smtp.test.internal";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_FROM_NAME = "Test Platform";
process.env.SMTP_FROM_EMAIL = "test@incognito.test";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX = "1000"; // Generous for tests
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.LOG_LEVEL = "fatal"; // Suppress log noise in tests
process.env.PLAYWRIGHT_HEADLESS = "true";
process.env.BROKER_JOB_CONCURRENCY = "1";
process.env.BROKER_JOB_TIMEOUT_MS = "5000";
