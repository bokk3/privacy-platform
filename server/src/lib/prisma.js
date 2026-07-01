import { PrismaClient } from "@prisma/client";
import { isProd } from "../config/env.js";

// Reuse a single PrismaClient instance across the process. In dev with
// `node --watch`, stash it on globalThis so hot-reloads don't exhaust the
// Postgres connection pool by creating a new client every reload.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: isProd ? ["error", "warn"] : ["error", "warn", "query"],
  });

if (!isProd) {
  globalForPrisma.__prisma = prisma;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
