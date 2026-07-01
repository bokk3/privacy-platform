import pino from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  // Pretty-print in dev for readability; structured JSON in prod for log aggregation.
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
      },
  redact: {
    // Never let secrets or raw PII leak into log output, even accidentally.
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.refreshToken",
      "*.accessToken",
      "*.mfaSecret",
    ],
    censor: "[REDACTED]",
  },
});
