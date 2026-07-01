import { z } from "zod";
import { BROKER_METHOD, BROKER_STATUS } from "@opaca-engine/shared";

/**
 * Schema for a single form field mapping step.
 * Each step tells the Playwright engine what selector to target and what data to fill.
 */
const formFieldSchema = z.object({
    selector: z.string().min(1, "CSS selector is required"),
    dataKey: z.enum([
        "firstName", "lastName", "email", "phone",
        "addressLine1", "addressLine2", "city", "region", "postalCode", "country",
        "fullName", "birthYear", "custom",
    ]),
    customValue: z.string().optional(), // only used when dataKey === 'custom'
    action: z.enum(["fill", "select", "check", "click"]).default("fill"),
});

/**
 * Schema for a navigation step (multi-page forms).
 * After filling the fields on the current page, perform this action to advance.
 */
const navigationStepSchema = z.object({
    clickSelector: z.string().min(1),
    waitFor: z.enum(["navigation", "selector", "timeout"]).default("navigation"),
    waitSelector: z.string().optional(),
    waitTimeoutMs: z.number().int().min(100).max(60000).optional(),
});

/**
 * Structured mapping schema for WEB_FORM broker automation.
 *
 * Example:
 * {
 *   "steps": [
 *     {
 *       "fields": [
 *         { "selector": "#first-name", "dataKey": "firstName" },
 *         { "selector": "#last-name",  "dataKey": "lastName" },
 *         { "selector": "#email",      "dataKey": "email" }
 *       ],
 *       "navigation": { "clickSelector": "button.next-step", "waitFor": "selector", "waitSelector": "#step-2" }
 *     },
 *     {
 *       "fields": [
 *         { "selector": "#address",    "dataKey": "addressLine1" }
 *       ]
 *     }
 *   ],
 *   "submitSelector": "button[type='submit']",
 *   "confirmationSelector": ".success-message"
 * }
 */
const formMappingSchema = z.object({
    steps: z.array(z.object({
        fields: z.array(formFieldSchema).min(1),
        navigation: navigationStepSchema.optional(),
    })).min(1),
    submitSelector: z.string().min(1),
    confirmationSelector: z.string().optional(),
}).optional().nullable();

export const createBrokerSchema = z.object({
    name: z.string().min(1, "Broker name is required").max(255),
    website: z.string().url("Website must be a valid URL"),
    contactEmail: z.string().email().optional().nullable(),
    privacyUrl: z.string().url().optional().nullable(),
    optOutUrl: z.string().url().optional().nullable(),
    method: z.nativeEnum(BROKER_METHOD),
    apiSupport: z.boolean().default(false),
    apiConfig: z.record(z.unknown()).optional().nullable(),
    formMapping: formMappingSchema,
    expectedResponseDays: z.coerce.number().int().min(1).max(365).default(30),
    status: z.nativeEnum(BROKER_STATUS).default("ACTIVE"),
    notes: z.string().max(2000).optional().nullable(),
});

export const updateBrokerSchema = createBrokerSchema.partial();

export const paginationSchema = z.object({
    take: z.coerce.number().int().min(1).max(200).default(50),
    skip: z.coerce.number().int().min(0).default(0),
});
