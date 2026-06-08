import { createPrismaClient, type PrismaClient } from "@aegis/db";

// Single Prisma client across hot reloads in dev (avoids connection storms).
const globalForDb = globalThis as unknown as { aegisDb?: PrismaClient };

export const db: PrismaClient = globalForDb.aegisDb ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForDb.aegisDb = db;
