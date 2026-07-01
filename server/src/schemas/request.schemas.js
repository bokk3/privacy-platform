import { z } from "zod";
import { BROKER_METHOD } from "@opaca-engine/shared";

export const createRequestSchema = z.object({
    identityId: z.string().uuid("Invalid Identity ID"),
    brokerId: z.string().uuid("Invalid Broker ID"),
    method: z.nativeEnum(BROKER_METHOD),
    templateId: z.string().uuid("Invalid Template ID").optional(),
});

export const getRequestsQuerySchema = z.object({
    status: z.string().optional(),
    brokerId: z.string().optional(),
    skip: z.coerce.number().min(0).default(0),
    take: z.coerce.number().min(1).max(100).default(50),
});
