// Cross-tenant RLS isolation — the required CI gate (CLAUDE.md, AEGIS_RISK_REGISTER R7).
// Connects, applies RLS, then acts AS the least-privilege aegis_app role (no
// BYPASSRLS) exactly as the production API does, and proves a tenant cannot read
// or write across the boundary. Everything runs in one transaction that is rolled
// back, so it leaves no residue in the dev database.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { applyTenantRls } from './rls.js';

const ORG_A = `test_org_a_${randomUUID()}`;
const ORG_B = `test_org_b_${randomUUID()}`;
const ACC_A = `test_acc_a_${randomUUID()}`;
const ACC_B = `test_acc_b_${randomUUID()}`;

let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await applyTenantRls(client);
});

afterAll(async () => {
  await client?.end();
});

/** Seed two tenants (as the superuser, RLS-bypassed), then drop to aegis_app
 *  scoped to ORG_A, run the assertions, and roll the whole thing back. */
async function asScopedTenant(orgId: string, fn: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    for (const [org, acc] of [
      [ORG_A, ACC_A],
      [ORG_B, ACC_B],
    ]) {
      await client.query('INSERT INTO "Organization" (id, name, "createdAt", "updatedAt") VALUES ($1, $1, now(), now())', [org]);
      await client.query(
        'INSERT INTO "ConnectedAccount" (id, "orgId", platform, "externalId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, now(), now())',
        [acc, org, 'META', `act_${acc}`],
      );
    }
    await client.query('SET LOCAL ROLE aegis_app');
    await client.query(`SELECT set_config('app.current_org_id', $1, true)`, [orgId]);
    await fn();
  } finally {
    await client.query('ROLLBACK');
  }
}

async function expectBlocked(sql: string, params: unknown[]): Promise<void> {
  await client.query('SAVEPOINT sp');
  await expect(client.query(sql, params)).rejects.toThrow();
  await client.query('ROLLBACK TO SAVEPOINT sp');
}

describe('cross-tenant RLS isolation', () => {
  it('reads only the scoped tenant rows, never another tenant', async () => {
    await asScopedTenant(ORG_A, async () => {
      const own = await client.query('SELECT id FROM "ConnectedAccount" WHERE id = $1', [ACC_A]);
      expect(own.rowCount).toBe(1);

      const other = await client.query('SELECT id FROM "ConnectedAccount" WHERE id = $1', [ACC_B]);
      expect(other.rowCount).toBe(0);

      const all = await client.query('SELECT id FROM "ConnectedAccount"');
      expect(all.rows.every((r) => r.id === ACC_A)).toBe(true);
    });
  });

  it('blocks inserting a row for another tenant (WITH CHECK)', async () => {
    await asScopedTenant(ORG_A, async () => {
      await expectBlocked(
        'INSERT INTO "ConnectedAccount" (id, "orgId", platform, "externalId", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, now(), now())',
        [`test_acc_x_${randomUUID()}`, ORG_B, 'META', 'act_x'],
      );
    });
  });

  it('blocks moving a row to another tenant (UPDATE)', async () => {
    await asScopedTenant(ORG_A, async () => {
      await expectBlocked('UPDATE "ConnectedAccount" SET "orgId" = $1 WHERE id = $2', [ORG_B, ACC_A]);
    });
  });

  it('sees nothing when the tenant GUC is unset (fail closed)', async () => {
    await asScopedTenant('', async () => {
      const rows = await client.query('SELECT id FROM "ConnectedAccount"');
      expect(rows.rowCount).toBe(0);
    });
  });
});

describe('aegis_app role configuration', () => {
  it('has no BYPASSRLS', async () => {
    const { rows } = await client.query(`SELECT rolbypassrls FROM pg_roles WHERE rolname = 'aegis_app'`);
    expect(rows[0]?.rolbypassrls).toBe(false);
  });

  it('cannot UPDATE or DELETE the append-only AuditLog', async () => {
    const { rows } = await client.query(
      `SELECT privilege_type FROM information_schema.role_table_grants
       WHERE grantee = 'aegis_app' AND table_name = 'AuditLog'`,
    );
    const privs = rows.map((r) => r.privilege_type);
    expect(privs).toContain('INSERT');
    expect(privs).toContain('SELECT');
    expect(privs).not.toContain('UPDATE');
    expect(privs).not.toContain('DELETE');
  });
});
