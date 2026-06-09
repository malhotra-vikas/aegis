// @aegis/db — the only path to the database (CLAUDE.md). The Prisma schema in
// prisma/schema.prisma is the source of truth; this re-exports the generated
// client plus a small factory that wires the Postgres driver adapter.
//
// Prisma 7 takes the connection via a driver adapter rather than a schema-side
// `url`, so callers build a client through `createPrismaClient()`.

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

/**
 * Build a PrismaClient bound to a Postgres connection string.
 * Fails loud if no connection string is available — a misconfigured DB URL
 * must never silently fall back (CLAUDE.md: fail loud, fail closed).
 */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error('createPrismaClient: DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export { applyTenantRls } from './rls.js';
export { PrismaClient } from './generated/prisma/client.js';
export { Prisma } from './generated/prisma/client.js';
export * from './generated/prisma/enums.js';
export type * from './generated/prisma/models.js';
