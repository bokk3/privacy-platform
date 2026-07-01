import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { createIdentitySchema, updateIdentitySchema } from "../schemas/identity.schemas.js";
import * as identityService from "../services/identity.service.js";

export const identityRouter = Router();

// Highly sensitive - force auth on all identity scopes
identityRouter.use(requireAuth);

identityRouter.get("/", async (req, res, next) => {
    try {
        const result = await identityService.getUserIdentities(req.user.sub);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

identityRouter.post("/", validate(createIdentitySchema), async (req, res, next) => {
    try {
        const result = await identityService.createIdentity({
            userId: req.user.sub,
            data: req.body,
            ip: req.ip
        });
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
});

identityRouter.put("/:id", validate(updateIdentitySchema), async (req, res, next) => {
    try {
        const result = await identityService.updateIdentity({
            id: req.params.id,
            userId: req.user.sub,
            data: req.body,
            ip: req.ip
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

identityRouter.delete("/:id", async (req, res, next) => {
    try {
        const result = await identityService.deleteIdentity({
            id: req.params.id,
            userId: req.user.sub,
            ip: req.ip
        });
        res.json(result);
    } catch (err) {
        next(err);
    }
});
