import { describe, it, expect } from "vitest";
import { encryptField, decryptField, hmacIndex } from "../lib/encryption.js";

describe("encryption", () => {
    describe("encryptField / decryptField", () => {
        it("should encrypt and decrypt a string round-trip", () => {
            const plaintext = "John Doe";
            const encrypted = encryptField(plaintext);
            expect(encrypted).not.toBe(plaintext);
            expect(encrypted.startsWith("v1:")).toBe(true);
            expect(decryptField(encrypted)).toBe(plaintext);
        });

        it("should produce different ciphertext for the same input (random IV)", () => {
            const plaintext = "Same input twice";
            const a = encryptField(plaintext);
            const b = encryptField(plaintext);
            expect(a).not.toBe(b); // Different IVs
            expect(decryptField(a)).toBe(decryptField(b)); // Same plaintext
        });

        it("should handle null and undefined as passthrough", () => {
            expect(encryptField(null)).toBeNull();
            expect(encryptField(undefined)).toBeUndefined();
            expect(decryptField(null)).toBeNull();
            expect(decryptField(undefined)).toBeUndefined();
        });

        it("should handle empty string", () => {
            const encrypted = encryptField("");
            expect(encrypted.startsWith("v1:")).toBe(true);
            expect(decryptField(encrypted)).toBe("");
        });

        it("should handle numeric input by coercing to string", () => {
            const encrypted = encryptField(12345);
            expect(decryptField(encrypted)).toBe("12345");
        });

        it("should handle unicode / emoji content", () => {
            const plaintext = "日本語テスト 🔒";
            const encrypted = encryptField(plaintext);
            expect(decryptField(encrypted)).toBe(plaintext);
        });

        it("should throw on tampered ciphertext", () => {
            const encrypted = encryptField("sensitive data");
            const parts = encrypted.split(":");
            // Flip a byte in the ciphertext portion
            parts[3] = "ff" + parts[3].slice(2);
            const tampered = parts.join(":");
            expect(() => decryptField(tampered)).toThrow();
        });

        it("should throw on unrecognized format", () => {
            expect(() => decryptField("v2:abc:def:ghi")).toThrow("Unrecognized encrypted field format");
            expect(() => decryptField("plaintext")).toThrow("Unrecognized encrypted field format");
        });
    });

    describe("hmacIndex", () => {
        it("should produce a deterministic hex hash", () => {
            const a = hmacIndex("test@example.com");
            const b = hmacIndex("test@example.com");
            expect(a).toBe(b);
            expect(a).toMatch(/^[0-9a-f]{64}$/);
        });

        it("should be case-insensitive and trim whitespace", () => {
            expect(hmacIndex("Test@Example.COM")).toBe(hmacIndex("test@example.com"));
            expect(hmacIndex("  test@example.com  ")).toBe(hmacIndex("test@example.com"));
        });

        it("should produce different hashes for different inputs", () => {
            expect(hmacIndex("a@b.com")).not.toBe(hmacIndex("c@d.com"));
        });
    });
});
