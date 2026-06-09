import { fetchAdAccountPull, fetchAdAccounts, MetaGraphClient } from '@aegis/connectors';
import type { RiskBucket } from '@aegis/db';
import { assessRaw, metaAdapter, type RawMetaPull } from '@aegis/risk-engine';
import { Injectable, Logger } from '@nestjs/common';
import { metaConfig } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

// The anonymous free audit: point-in-time, one account, keyed to email. No
// credential is stored and no monitoring runs (AEGIS_SPEC §3.1 cost discipline) —
// the verdict (AuditResult) is the conversion asset; account creation is at upgrade.
@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  /** Pull the first ad account the token grants, score it, store the AuditResult. */
  async runAudit(email: string, accessToken: string): Promise<string> {
    const cfg = metaConfig();
    const client = new MetaGraphClient({ appSecret: cfg.appSecret, graphVersion: cfg.graphVersion });
    const accounts = await fetchAdAccounts(client, { accessToken });
    const account = accounts[0];

    if (!account) {
      const empty = await this.prisma.client.auditResult.create({
        data: { email, platform: 'META', score: 0, bucket: 'AMBER', assessable: false, signals: [], modelVersion: 'meta-audit-v0' },
      });
      return empty.id;
    }

    let raw: RawMetaPull;
    try {
      raw = await fetchAdAccountPull(client, { adAccountId: account.externalId, accessToken });
    } catch (e) {
      this.logger.warn(`audit pull failed for ${account.externalId}: ${e instanceof Error ? e.message : String(e)}`);
      raw = {};
    }

    const result = assessRaw(metaAdapter, raw);
    const created = await this.prisma.client.auditResult.create({
      data: {
        email,
        platform: 'META',
        externalId: account.externalId,
        score: result.score,
        bucket: result.bucket.toUpperCase() as RiskBucket,
        assessable: result.assessable,
        signals: result.signals.map((s) => ({
          definitionId: s.definitionId,
          category: s.category,
          severity: s.severity,
          contribution: s.contribution,
          explanation: s.explanation,
        })) as object,
        modelVersion: result.modelVersion,
      },
    });
    return created.id;
  }

  getResult(id: string) {
    return this.prisma.client.auditResult.findUnique({ where: { id } });
  }
}
