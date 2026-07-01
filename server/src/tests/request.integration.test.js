import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp, generateTestToken, expectJson } from "./helpers.js";

// Mock Prisma
vi.mock("../lib/prisma.js", () => ({
    prisma: {
        $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
        $transaction: vi.fn((arr) => Promise.all(arr)),
        user: { findUnique: vi.fn(), count: vi.fn().mockResolvedValue(0) },
        privacyRequest: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
        },
        requestEvent: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn(),
        },
        broker: { findUnique: vi.fn() },
        identity: { findUnique: vi.fn() },
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

describe("Requests API integration", () => {
    let app;

    beforeEach(() => {
        vi.clearAllMocks();
        app = createTestApp();
    });

    describe("GET /api/v1/requests", () => {
        it("should reject unauthenticated requests", async () => {
            const res = await request(app).get("/api/v1/requests");
            expect(res.status).toBe(401);
        });

        it("should return 200 for authenticated user", async () => {
            const token = generateTestToken();
            const res = await request(app)
                .get("/api/v1/requests")
                .set("Authorization", `Bearer ${token}`);

            // The service will run the mock so it returns empty array
            expect(res.status).toBe(200);
        });

        it("should validate query params", async () => {
            const token = generateTestToken();
            const res = await request(app)
                .get("/api/v1/requests?take=-1")
                .set("Authorization", `Bearer ${token}`);

            expect(res.status).toBe(422);
        });
    });

    describe("POST /api/v1/requests", () => {
        it("should reject unauthenticated requests", async () => {
            const res = await request(app)
                .post("/api/v1/requests")
                .send({});

            expect(res.status).toBe(401);
        });

        it("should reject with missing identityId", async () => {
            const token = generateTestToken({ emailVerified: true });
            const res = await request(app)
                .post("/api/v1/requests")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    brokerId: "550e8400-e29b-41d4-a716-446655440000",
                    method: "EMAIL",
                });

            expect(res.status).toBe(422);
        });

        it("should reject with invalid brokerId format", async () => {
            const token = generateTestToken({ emailVerified: true });
            const res = await request(app)
                .post("/api/v1/requests")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    identityId: "550e8400-e29b-41d4-a716-446655440000",
                    brokerId: "not-a-uuid",
                    method: "EMAIL",
                });

            expect(res.status).toBe(422);
        });

        it("should reject with invalid method", async () => {
            const token = generateTestToken({ emailVerified: true });
            const res = await request(app)
                .post("/api/v1/requests")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    identityId: "550e8400-e29b-41d4-a716-446655440000",
                    brokerId: "550e8400-e29b-41d4-a716-446655440001",
                    method: "INVALID_METHOD",
                });

            expect(res.status).toBe(422);
        });

        it("should reject unverified email users", async () => {
            const token = generateTestToken({ emailVerified: false });
            const res = await request(app)
                .post("/api/v1/requests")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    identityId: "550e8400-e29b-41d4-a716-446655440000",
                    brokerId: "550e8400-e29b-41d4-a716-446655440001",
                    method: "EMAIL",
                });

            expect(res.status).toBe(403);
        });
    });

    describe("GET /api/v1/requests/:id/timeline", () => {
        it("should reject unauthenticated requests", async () => {
            const res = await request(app).get("/api/v1/requests/some-id/timeline");
            expect(res.status).toBe(401);
        });
    });
});
