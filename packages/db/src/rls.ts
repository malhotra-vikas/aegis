import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The RLS DDL lives in SQL (it's what Prisma can't express); this applies it.
// Resolved relative to this module so it works from both src (vitest) and dist.
const SQL_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'sql', 'rls_and_partitioning.sql');

/** Apply the idempotent tenant-RLS DDL (policies, aegis_app role, grants). */
export async function applyTenantRls(client: { query(sql: string): Promise<unknown> }): Promise<void> {
  await client.query(readFileSync(SQL_PATH, 'utf8'));
}
