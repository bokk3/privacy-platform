import { z } from "zod";

export const createIdentitySchema = z.object({
    label: z.string().min(1, "Label is required").max(100),
    type: z.enum(["PRIMARY", "RELATIVE", "SPOUSE"]),
    firstName: z.string().min(1, "First name is required"),
    middleName: z.string().optional().nullable(),
    lastName: z.string().min(1, "Last name is required"),
    dob: z.string().datetime().optional().nullable(),

    // Arrays for relations
    aliases: z.array(z.object({
        firstName: z.string(),
        middleName: z.string().optional().nullable(),
        lastName: z.string()
    })).optional().default([]),

    addresses: z.array(z.object({
        street1: z.string(),
        street2: z.string().optional().nullable(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        country: z.string().default("US")
    })).optional().default([]),

    emails: z.array(z.object({
        email: z.string().email()
    })).optional().default([]),

    phones: z.array(z.object({
        phone: z.string()
    })).optional().default([])
});

export const updateIdentitySchema = createIdentitySchema.partial();
