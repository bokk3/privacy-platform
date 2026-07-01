import { z } from "zod";

const password = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters");

const email = z.string().email("Invalid email address").max(255).transform((v) => v.toLowerCase());

export const registerSchema = z.object({
    email,
    password,
});

export const loginSchema = z.object({
    email,
    password: z.string().min(1, "Password is required"),
});

export const verifyMfaLoginSchema = z.object({
    challengeToken: z.string().min(1),
    totpCode: z.string().length(6, "TOTP code must be 6 digits").regex(/^\d{6}$/),
});

export const verifyEmailSchema = z.object({
    token: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
    email,
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: password,
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1),
});

export const mfaCodeSchema = z.object({
    totpCode: z.string().length(6, "TOTP code must be 6 digits").regex(/^\d{6}$/),
});
