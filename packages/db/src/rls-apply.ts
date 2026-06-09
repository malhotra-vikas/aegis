// Apply tenant RLS to the database in DATABASE_URL. Run after migrations:
//   pnpm --filter @aegis/db rls
import 'dotenv/config';
import { Client } from 'pg';
import { applyTenantRls } from './rls.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('rls-apply: DATABASE_URL is not set');

const client = new Client({ connectionString });
await client.connect();
try {
  await applyTenantRls(client);
  console.log('tenant RLS applied');
} finally {
  await client.end();
}
