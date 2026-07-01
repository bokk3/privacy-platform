import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createBrokerSchema, updateBrokerSchema, paginationSchema } from "../schemas/admin.schemas.js";
import * as adminService from "../services/admin.service.js";

export const adminRouter = Router();

// Secure entire router implicitly
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/health", async (req, res, next) => {
    try {
        const health = await adminService.getSystemHealth();
        res.json(health);
    } catch (err) {
        next(err);
    }
});

adminRouter.get("/users", validate(paginationSchema, "query"), async (req, res, next) => {
    try {
        const { take, skip } = req.query;
        const users = await adminService.getUsersList(take, skip);
        res.json({ data: users });
    } catch (err) {
        next(err);
    }
});

adminRouter.get("/brokers", async (req, res, next) => {
    try {
        const brokers = await adminService.getBrokersList();
        res.json({ data: brokers });
    } catch (err) {
        next(err);
    }
});

adminRouter.post("/brokers", validate(createBrokerSchema), async (req, res, next) => {
    try {
        const broker = await adminService.createBroker(req.body);
        res.status(201).json({ data: broker });
    } catch (err) {
        next(err);
    }
});

adminRouter.patch("/brokers/:id", validate(updateBrokerSchema), async (req, res, next) => {
    try {
        const broker = await adminService.updateBroker(req.params.id, req.body);
        res.json({ data: broker });
    } catch (err) {
        next(err);
    }
});

adminRouter.get("/audit-logs", async (req, res, next) => {
    try {
        const logs = await adminService.getAuditLogs(Number(req.query.take || 100));
        res.json({ data: logs });
    } catch (err) {
        next(err);
    }
});

