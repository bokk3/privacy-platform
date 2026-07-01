import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "../lib/logger.js";
import { isProd } from "../config/env.js";

/** Throw this from route handlers/services for expected, user-facing errors. */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = "BAD_REQUEST", details = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const requestId = req.id;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId }, "AppError (5xx)");
    }
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      requestId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      requestId,
    });
  }

  if (err.name === "PrismaClientKnownRequestError") {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "A record with these unique fields already exists.",
        code: "UNIQUE_CONSTRAINT",
        requestId,
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found.", code: "NOT_FOUND", requestId });
    }
  }

  // Unknown/unexpected error — log full detail server-side, return generic message to client.
  logger.error({ err, requestId }, "Unhandled error");
  return res.status(500).json({
    error: isProd ? "Internal server error" : err.message,
    code: "INTERNAL_ERROR",
    requestId,
    stack: isProd ? undefined : err.stack,
  });
}
