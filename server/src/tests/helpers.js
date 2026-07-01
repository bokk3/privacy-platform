/**
 * Shared test utilities for backend tests.
 *
 * Provides helper functions for creating test apps, generating auth tokens,
 * and common assertions.
 */
import { createApp } from "../app.js";
import { signAccessToken } from "../lib/jwt.js";

/**
 * Creates a fresh Express app instance for testing with Supertest.
 */
export function createTestApp() {
    return createApp();
}

/**
 * Generate a valid JWT access token for testing authenticated endpoints.
 */
export function generateTestToken(overrides = {}) {
    return signAccessToken({
        userId: overrides.userId || "test-user-id-0000",
        role: overrides.role || "USER",
        emailVerified: overrides.emailVerified ?? true,
        ...overrides,
    });
}

/**
 * Generate an admin JWT access token.
 */
export function generateAdminToken(overrides = {}) {
    return generateTestToken({
        userId: "test-admin-id-0000",
        role: "ADMIN",
        emailVerified: true,
        ...overrides,
    });
}

/**
 * Assert a response has JSON content type.
 */
export function expectJson(res) {
    expect(res.headers["content-type"]).toMatch(/application\/json/);
}
