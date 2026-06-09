import { Injectable, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { createPrismaClient, Prisma, type PrismaClient } from '@aegis/db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  // The API connects as the least-privilege aegis_app role (NO BYPASSRLS) so RLS
  // policies actually apply; locally it falls back to DATABASE_URL. The client arg
  // exists for tests. (createPrismaClient throws loud if no connection string.)
  constructor(@Optional() client?: PrismaClient) {
    this.client = client ?? createPrismaClient(process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL);
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  /**
   * Run a unit of work scoped to one tenant. Opens a transaction, sets the RLS
   * tenant GUC on that connection, and hands the transaction client to `fn`.
   * Every tenant query MUST go through here: the per-request org scope is enforced
   * by Postgres RLS, not by app-level filtering (AEGIS_DATA_MODEL §3).
   */
  withOrg<T>(orgId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, true)`;
      return fn(tx);
    });
  }
}
