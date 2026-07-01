import { describe, it, expect } from "vitest";
import {
    REQUEST_STATUS,
    REQUEST_STATUS_TRANSITIONS,
    canTransition,
    BROKER_METHOD,
    BROKER_STATUS,
    USER_ROLE,
    QUEUE_NAMES,
} from "@opaca-engine/shared";

describe("shared constants", () => {
    describe("REQUEST_STATUS", () => {
        it("should define all expected statuses", () => {
            const expected = ["PENDING", "SENT", "WAITING", "VERIFIED", "COMPLETED", "REJECTED", "RETRY", "FAILED", "ESCALATED"];
            expect(Object.keys(REQUEST_STATUS)).toEqual(expected);
        });

        it("should be frozen", () => {
            expect(Object.isFrozen(REQUEST_STATUS)).toBe(true);
        });
    });

    describe("REQUEST_STATUS_TRANSITIONS (state machine)", () => {
        it("should have a transition map entry for every status", () => {
            for (const status of Object.values(REQUEST_STATUS)) {
                expect(REQUEST_STATUS_TRANSITIONS).toHaveProperty(status);
                expect(Array.isArray(REQUEST_STATUS_TRANSITIONS[status])).toBe(true);
            }
        });

        it("COMPLETED should be a terminal state (no outbound transitions)", () => {
            expect(REQUEST_STATUS_TRANSITIONS[REQUEST_STATUS.COMPLETED]).toEqual([]);
        });

        it("PENDING → SENT should be allowed", () => {
            expect(REQUEST_STATUS_TRANSITIONS[REQUEST_STATUS.PENDING]).toContain(REQUEST_STATUS.SENT);
        });

        it("COMPLETED → PENDING should NOT be allowed (no regression)", () => {
            expect(REQUEST_STATUS_TRANSITIONS[REQUEST_STATUS.COMPLETED]).not.toContain(REQUEST_STATUS.PENDING);
        });

        it("SENT → RETRY should be allowed", () => {
            expect(REQUEST_STATUS_TRANSITIONS[REQUEST_STATUS.SENT]).toContain(REQUEST_STATUS.RETRY);
        });

        it("RETRY → SENT should be allowed (retry loop)", () => {
            expect(REQUEST_STATUS_TRANSITIONS[REQUEST_STATUS.RETRY]).toContain(REQUEST_STATUS.SENT);
        });

        it("all transition targets should be valid statuses", () => {
            const validStatuses = new Set(Object.values(REQUEST_STATUS));
            for (const [from, targets] of Object.entries(REQUEST_STATUS_TRANSITIONS)) {
                for (const target of targets) {
                    expect(validStatuses.has(target)).toBe(true);
                }
            }
        });
    });

    describe("canTransition", () => {
        it("should return true for valid transitions", () => {
            expect(canTransition("PENDING", "SENT")).toBe(true);
            expect(canTransition("SENT", "WAITING")).toBe(true);
            expect(canTransition("WAITING", "COMPLETED")).toBe(true);
        });

        it("should return false for invalid transitions", () => {
            expect(canTransition("COMPLETED", "PENDING")).toBe(false);
            expect(canTransition("PENDING", "COMPLETED")).toBe(false);
        });

        it("should return false for unknown statuses", () => {
            expect(canTransition("BOGUS", "SENT")).toBe(false);
        });
    });

    describe("BROKER_METHOD", () => {
        it("should include EMAIL, WEB_FORM, API, CSV_EXPORT, CUSTOM", () => {
            expect(Object.values(BROKER_METHOD)).toEqual(
                expect.arrayContaining(["EMAIL", "WEB_FORM", "API", "CSV_EXPORT", "CUSTOM"])
            );
        });
    });

    describe("BROKER_STATUS", () => {
        it("should include ACTIVE, UNRESPONSIVE, DISABLED, UNDER_REVIEW", () => {
            expect(Object.values(BROKER_STATUS)).toEqual(
                expect.arrayContaining(["ACTIVE", "UNRESPONSIVE", "DISABLED", "UNDER_REVIEW"])
            );
        });
    });

    describe("USER_ROLE", () => {
        it("should include USER, ADMIN, SUPPORT", () => {
            expect(Object.values(USER_ROLE)).toEqual(
                expect.arrayContaining(["USER", "ADMIN", "SUPPORT"])
            );
        });
    });

    describe("QUEUE_NAMES", () => {
        it("should include core queues", () => {
            expect(QUEUE_NAMES.DISPATCH_REQUEST).toBe("dispatch-request");
            expect(QUEUE_NAMES.CHECK_RESPONSE).toBe("check-response");
            expect(QUEUE_NAMES.RETRY_REQUEST).toBe("retry-request");
        });
    });
});
