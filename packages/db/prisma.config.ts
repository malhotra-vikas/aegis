// Prisma 7 config. The connection URL lives here (for migrate/introspect)
// rather than in schema.prisma. Loaded from the environment via dotenv so
// `prisma migrate` / `prisma db` pick up DATABASE_URL locally and in CI.

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
