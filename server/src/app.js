import express from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";

import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import yamljs from "yamljs";

import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import {
  helmetMiddleware,
  corsMiddleware,
  globalRateLimiter,
  hppMiddleware,
} from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { requestRouter } from "./routes/request.routes.js";
import { webhookRouter } from "./routes/webhook.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { billingRouter } from "./routes/billing.routes.js";
import { identityRouter } from "./routes/identity.routes.js";

export function createApp() {
  const app = express();

  // Load OpenAPI Spec
  const swaggerDocument = yamljs.load(path.join(process.cwd(), "..", "docs", "openapi.yaml"));

  // Trust the first proxy hop (nginx) so req.ip / rate limiting see the real
  // client IP instead of the container network address.
  app.set("trust proxy", 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers["x-request-id"] || randomUUID(),
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
    }),
  );

  app.use(helmetMiddleware());
  app.use(corsMiddleware());
  app.use(hppMiddleware());
  app.use(compression());
  app.use(express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      // Capture raw body for Stripe webhook signature verification
      if (req.originalUrl.startsWith("/api/v1/billing/webhook")) {
        req.rawBody = buf;
      }
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(globalRateLimiter());

  app.use("/health", healthRouter);

  // Versioned API namespace. Subsequent steps mount /api/v1/auth,
  // /api/v1/brokers, /api/v1/requests, /api/v1/admin, etc. here.
  const apiV1 = express.Router();

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use("/api/v1", apiV1);

  apiV1.get("/", (req, res) => {
    res.json({
      name: env.APP_NAME || "Privacy Platform API",
      status: "ok",
      version: "v1",
    });
  });

  apiV1.use("/auth", authRouter);
  apiV1.use("/identities", identityRouter);
  apiV1.use("/requests", requestRouter);
  apiV1.use("/webhooks", webhookRouter);
  apiV1.use("/billing", billingRouter);
  apiV1.use("/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
