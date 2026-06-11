import { PrismaClient } from "@prisma/client";

/**
 * Lazy Prisma singleton.
 *
 * The client is created on first use, never at module import time, so that
 * `next build` (which imports route modules to collect metadata) succeeds
 * without a database or DATABASE_URL present. The instance is cached on
 * globalThis to survive HMR in development.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getDb(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}
