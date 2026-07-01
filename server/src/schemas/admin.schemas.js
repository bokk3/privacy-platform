import { z } from "zod";
import { BROKER_METHOD, BROKER_STATUS } from "@privacy-platform/shared";

export const createBrokerSchema = z.object({
    name: z.string().min(1, "Broker name is required").max(255),
    website: z.string().url("Website must be a valid URL"),
    contactEmail: z.string().email().optional().nullable(),
    privacyUrl: z.string().url().optional().nullable(),
    optOutUrl: z.string().url().optional().nullable(),
    method: z.nativeEnum(BROKER_METHOD),
    apiSupport: z.boolean().default(false),
    apiConfig: z.record(z.unknown()).optional().nullable(),
    expectedResponseDays: z.coerce.number().int().min(1).max(365).default(30),
    status: z.nativeEnum(BROKER_STATUS).default("ACTIVE"),
    notes: z.string().max(2000).optional().nullable(),
});

export const updateBrokerSchema = createBrokerSchema.partial();

export const paginationSchema = z.object({
    take: z.coerce.number().int().min(1).max(200).default(50),
    skip: z.coerce.number().int().min(0).default(0),
});
