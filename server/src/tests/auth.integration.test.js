import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, generateTestToken, expectJson } from "./helpers.js";

// The app integration tests only validate the HTTP layer (routes, middleware,
// validation). They mock Prisma and external services to avoid DB dependencies,
// keeping these tests fast and runnable in CI without a live Postgres instance.

// Mock Prisma
vi.mock("../lib/prisma.js", () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
        },
        refreshToken: {
            create: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        emailVerificationToken: {
            create: vi.fn(),
        },
        $transaction: vi.fn((cb) => cb({
            refreshToken: {
                create: vi.fn(),
                findFirst: vi.fn(),
                update: vi.fn(),
                updateMany: vi.fn(),
            },
        })),
    },
    disconnectPrisma: vi.fn(),
}));

// Mock Redis
vi.mock("../lib/redis.js", () => ({
    redis: {
        status: "ready",
        call: vi.fn().mockResolvedValue("OK"),
        ping: vi.fn().mockResolvedValue("PONG"),
        quit: vi.fn(),
        disconnect: vi.fn(),
    },
}));

// Mock email
vi.mock("../lib/email.js", () => ({
    sendVerificationEmail: vi.fn().mockResolvedValue(true),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

// Mock BullMQ queues
vi.mock("../queues/index.js", () => ({
    dispatchQueue: { add: vi.fn() },
    checkResponseQueue: { add: vi.fn() },
    retryQueue: { add: vi.fn() },
}));

describe("Auth API integration", () => {
    let app;

    beforeEach(() => {
        vi.clearAllMocks();
        app = createTestApp();
    });

    describe("POST /api/v1/auth/register", () => {
        it("should reject registration without email", async () => {
            const res = await request(app)
                .post("/api/v1/auth/register")
                .send({ password: "SecurePass123!" });

            expect(res.status).toBe(422);
            expectJson(res);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("should reject registration without password", async () => {
            const res = await request(app)
                .post("/api/v1/auth/register")
                .send({ email: "test@example.com" });

            expect(res.status).toBe(422);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("should reject registration with short password", async () => {
            const res = await request(app)
                .post("/api/v1/auth/register")
                .send({ email: "test@example.com", password: "short" });

            expect(res.status).toBe(422);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("should reject registration with invalid email", async () => {
            const res = await request(app)
                .post("/api/v1/auth/register")
                .send({ email: "not-an-email", password: "SecurePass123!" });

            expect(res.status).toBe(422);
        });
    });

    describe("POST /api/v1/auth/login", () => {
        it("should reject login without credentials", async () => {
            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({});

            expect(res.status).toBe(422);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });

        it("should reject login with missing password", async () => {
            const res = await request(app)
                .post("/api/v1/auth/login")
                .send({ email: "test@example.com" });

            expect(res.status).toBe(422);
        });
    });

    describe("POST /api/v1/auth/refresh", () => {
        it("should reject without refreshToken in body", async () => {
            const res = await request(app)
                .post("/api/v1/auth/refresh")
                .send({});

            expect(res.status).toBe(422);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });
    });

    describe("POST /api/v1/auth/login/mfa", () => {
        it("should reject without challengeToken", async () => {
            const res = await request(app)
                .post("/api/v1/auth/login/mfa")
                .send({ totpCode: "123456" });

            expect(res.status).toBe(422);
        });

        it("should reject with invalid TOTP code format", async () => {
            const res = await request(app)
                .post("/api/v1/auth/login/mfa")
                .send({ challengeToken: "abc", totpCode: "12abc6" });

            expect(res.status).toBe(422);
        });
    });

    describe("POST /api/v1/auth/forgot-password", () => {
        it("should reject without email", async () => {
            const res = await request(app)
                .post("/api/v1/auth/forgot-password")
                .send({});

            expect(res.status).toBe(422);
        });
    });

    describe("POST /api/v1/auth/reset-password", () => {
        it("should reject without token", async () => {
            const res = await request(app)
                .post("/api/v1/auth/reset-password")
                .send({ newPassword: "ValidNewPass123!" });

            expect(res.status).toBe(422);
        });

        it("should reject with short new password", async () => {
            const res = await request(app)
                .post("/api/v1/auth/reset-password")
                .send({ token: "reset-token", newPassword: "short" });

            expect(res.status).toBe(422);
        });
    });

    describe("Protected endpoints", () => {
        it("GET /api/v1/auth/me should reject without token", async () => {
            const res = await request(app).get("/api/v1/auth/me");
            expect(res.status).toBe(401);
        });

        it("GET /api/v1/auth/me should accept valid token", async () => {
            const token = generateTestToken();
            const res = await request(app)
                .get("/api/v1/auth/me")
                .set("Authorization", `Bearer ${token}`);

            // Will fail with a service-level error (no DB user) but NOT 401
            expect(res.status).not.toBe(401);
        });

        it("POST /api/v1/auth/mfa/setup should reject without token", async () => {
            const res = await request(app).post("/api/v1/auth/mfa/setup");
            expect(res.status).toBe(401);
        });

        it("POST /api/v1/auth/logout should reject without token", async () => {
            const res = await request(app).post("/api/v1/auth/logout");
            expect(res.status).toBe(401);
        });
    });
});
