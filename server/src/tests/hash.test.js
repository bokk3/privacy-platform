import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/hash.js";

describe("hash (Argon2id)", () => {
    it("should hash a password and produce a string starting with $argon2id$", async () => {
        const hash = await hashPassword("MySuperSecretPassword123!");
        expect(typeof hash).toBe("string");
        expect(hash.startsWith("$argon2id$")).toBe(true);
    });

    it("should verify a correct password", async () => {
        const password = "CorrectHorseBatteryStaple";
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(hash, password);
        expect(isValid).toBe(true);
    });

    it("should reject an incorrect password", async () => {
        const hash = await hashPassword("RealPassword");
        const isValid = await verifyPassword(hash, "WrongPassword");
        expect(isValid).toBe(false);
    });

    it("should produce different hashes for the same password (random salt)", async () => {
        const password = "SamePasswordTwice";
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);
        expect(hash1).not.toBe(hash2);
    });
});
