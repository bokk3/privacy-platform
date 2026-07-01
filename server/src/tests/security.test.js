import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, generateTestToken, generateAdminToken } from "./helpers.js";

// Mock Prisma
vi.mock("../lib/prisma.js", () => ({
    prisma: {
        $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
        user: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
        privacyRequest: { count: vi.fn().mockResolvedValue(0) },
        broker: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
            update: vi.fn(),
            count: vi.fn().mockResolvedValue(5),
        },
        auditLog: { findMany: vi.fn().mockResolvedValue([]) },
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
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
}));

// Mock BullMQ queues
vi.mock("../queues/index.js", () => ({
    dispatchQueue: { add: vi.fn() },
    checkResponseQueue: { add: vi.fn() },
    retryQueue: { add: vi.fn() },
}));

describe("Security middleware", () => {
    let app;

    beforeEach(() => {
        vi.clearAllMocks();
        app = createTestApp();
    });

    describe("CORS", () => {
        it("should set Access-Control-Allow-Origin header", async () => {
            const res = await request(app)
                .options("/api/v1/")
                .set("Origin", "http://localhost:5173");

            expect(res.headers["access-control-allow-origin"]).toBeDefined();
        });
    });

    describe("Helmet (security headers)", () => {
        it("should set X-Content-Type-Options to nosniff", async () => {
            const res = await request(app).get("/api/v1/");
            expect(res.headers["x-content-type-options"]).toBe("nosniff");
        });

        it("should set Content-Security-Policy header", async () => {
            const res = await request(app).get("/api/v1/");
            expect(res.headers["content-security-policy"]).toBeDefined();
        });
    });

    describe("404 handler", () => {
        it("should return JSON 404 for unknown routes", async () => {
            const res = await request(app).get("/nonexistent/route");
            expect(res.status).toBe(404);
            expect(res.body.error).toBe("Not found");
        });
    });

    describe("Health endpoints", () => {
        it("GET /health/live should return 200", async () => {
            const res = await request(app).get("/health/live");
            expect(res.status).toBe(200);
        });

        it("GET /health/ready should return 200", async () => {
            const res = await request(app).get("/health/ready");
            expect(res.status).toBe(200);
        });
    });

    describe("API root", () => {
        it("GET /api/v1/ should return service info", async () => {
            const res = await request(app).get("/api/v1/");
            expect(res.status).toBe(200);
            expect(res.body.status).toBe("ok");
            expect(res.body.version).toBe("v1");
        });
    });

    describe("Admin RBAC", () => {
        it("should reject non-admin users from admin endpoints", async () => {
            const token = generateTestToken({ role: "USER" });
            const res = await request(app)
                .get("/api/v1/admin/health")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(403);
        });

        it("should reject unauthenticated requests to admin endpoints", async () => {
            const res = await request(app).get("/api/v1/admin/health");
            expect(res.status).toBe(401);
        });

        it("should allow ADMIN role to access admin endpoints", async () => {
            const token = generateAdminToken();
            const res = await request(app)
                .get("/api/v1/admin/health")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(200);
        });
    });

    describe("Admin broker validation", () => {
        it("should reject broker creation with missing name", async () => {
            const token = generateAdminToken();
            const res = await request(app)
                .post("/api/v1/admin/brokers")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    website: "https://example.com",
                    method: "EMAIL",
                });

            expect(res.status).toBe(422);
        });

        it("should reject broker creation with invalid website URL", async () => {
            const token = generateAdminToken();
            const res = await request(app)
                .post("/api/v1/admin/brokers")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    name: "Test Broker",
                    website: "not-a-url",
                    method: "EMAIL",
                });

            expect(res.status).toBe(422);
        });
    });
});
