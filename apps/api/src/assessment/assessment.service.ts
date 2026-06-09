import { fetchAdAccountPull, MetaGraphClient } from '@aegis/connectors';
import { SnapshotReason } from '@aegis/db';
import type { RiskBucket, RiskCategory, Severity } from '@aegis/db';
import { assessRaw, META_V1_CATALOG, metaAdapter, type RawMetaPull, type RiskResult } from '@aegis/risk-engine';
import { Injectable, Logger } from '@nestjs/common';
import { metaConfig } from '../config/env.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Catalog lookup for weight + remediationId when persisting RiskSignal rows.
const catalogById = new Map(META_V1_CATALOG.map((d) => [d.id, d] as const));

// The engine uses lowercase buckets/categories/severities; the DB enums are
// uppercase. These map 1:1.
const toBucket = (b: string) => b.toUpperCase() as RiskBucket;
const toCategory = (c: string) => c.toUpperCase() as RiskCategory;
const toSeverity = (s: string) => s.toUpperCase() as Severity;

/**
 * Turns a connected account into a live risk assessment: decrypt the credential,
 * pull the account from Meta, run the (pure) risk engine, and persist a
 * HealthSnapshot + RiskSignals, denormalizing current state onto ConnectedAccount
 * (the hybrid-write strategy). All DB writes run under the tenant's RLS scope.
 */
@Injectable()
export class AssessmentService {
  private readonly logger = new Logger('Assessment');

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: CredentialsService,
  ) {}

  /** Assess every Meta account in the org. Per-account failures are isolated. */
  async assessOrg(orgId: string, reason: SnapshotReason = SnapshotReason.MANUAL_AUDIT): Promise<void> {
    const accounts = await this.prisma.withOrg(orgId, (tx) =>
      tx.connectedAccount.findMany({ where: { platform: 'META', deletedAt: null }, select: { id: true, externalId: true } }),
    );
    for (const account of accounts) {
      try {
        await this.assessAccount(orgId, account, reason);
      } catch (e) {
        this.logger.error(`assess ${account.externalId} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  async assessAccount(
    orgId: string,
    account: { id: string; externalId: string },
    reason: SnapshotReason = SnapshotReason.MANUAL_AUDIT,
  ): Promise<RiskResult> {
    const bundle = await this.credentials.openMetaCredential(orgId, account.id);
    if (!bundle) throw new Error(`no credential for ${account.externalId}`);

    const cfg = metaConfig();
    const client = new MetaGraphClient({ appSecret: cfg.appSecret, graphVersion: cfg.graphVersion });

    // A failed pull (e.g. revoked token) yields an empty pull, which the engine
    // scores as not-assessable rather than green (fail closed). A lost token is a
    // risk event, surfaced via assessable=false on the account.
    let raw: RawMetaPull;
    try {
      raw = await fetchAdAccountPull(client, { adAccountId: account.externalId, accessToken: bundle.accessToken });
    } catch (e) {
      this.logger.warn(`pull ${account.externalId} failed: ${e instanceof Error ? e.message : String(e)}`);
      raw = {};
    }

    const result = assessRaw(metaAdapter, raw);
    await this.persist(orgId, account.id, reason, raw, result);
    return result;
  }

  private async persist(
    orgId: string,
    accountId: string,
    reason: SnapshotReason,
    raw: RawMetaPull,
    result: RiskResult,
  ): Promise<void> {
    await this.prisma.withOrg(orgId, async (tx) => {
      const snapshot = await tx.healthSnapshot.create({
        data: {
          orgId,
          connectedAccountId: accountId,
          reason,
          score: result.score,
          bucket: toBucket(result.bucket),
          assessable: result.assessable,
          modelVersion: result.modelVersion,
          rawPayload: raw as object,
          signals: {
            create: result.signals.map((s) => {
              const def = catalogById.get(s.definitionId)!;
              return {
                orgId,
                definitionId: s.definitionId,
                category: toCategory(s.category),
                severity: toSeverity(s.severity),
                weight: def.weight,
                confidence: s.confidence,
                contribution: s.contribution,
                evidence: s.evidence as object,
                explanation: s.explanation,
                remediationId: def.remediationId,
              };
            }),
          },
        },
      });

      const disabled = result.signals.some((s) => s.definitionId === 'meta.account_disabled');
      await tx.connectedAccount.update({
        where: { id: accountId },
        data: {
          currentScore: result.score,
          currentBucket: toBucket(result.bucket),
          assessable: result.assessable,
          lastSnapshotAt: snapshot.createdAt,
          lastAssessableAt: result.assessable ? snapshot.createdAt : undefined,
          disabledAt: disabled ? snapshot.createdAt : undefined,
        },
      });
    });
  }
}
