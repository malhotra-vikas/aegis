import { SnapshotReason } from '@aegis/db';
import type { RawMetaPull, RiskResult } from '@aegis/risk-engine';
import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { AssessmentService } from '../assessment/assessment.service.js';
import { WorkosAuthGuard } from '../auth/workos-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CurrentOrg } from '../tenant/current-org.decorator.js';

export interface AccountRiskView {
  id: string;
  externalId: string;
  displayName: string | null;
  score: number | null;
  bucket: string | null;
  assessable: boolean;
  lastSnapshotAt: string | null;
  signals: {
    definitionId: string;
    category: string;
    severity: string;
    contribution: number;
    explanation: string;
    remediationId: string;
  }[];
}

@Controller('accounts')
@UseGuards(WorkosAuthGuard)
export class AccountsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessment: AssessmentService,
  ) {}

  // The dashboard payload: each connected account with its denormalized current
  // risk + the signal breakdown from its latest snapshot.
  @Get()
  async list(@CurrentOrg() orgId: string): Promise<AccountRiskView[]> {
    const accounts = await this.prisma.withOrg(orgId, (tx) =>
      tx.connectedAccount.findMany({
        where: { platform: 'META', deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          snapshots: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { signals: { orderBy: { contribution: 'desc' } } },
          },
        },
      }),
    );

    return accounts.map((a) => ({
      id: a.id,
      externalId: a.externalId,
      displayName: a.displayName,
      score: a.currentScore,
      bucket: a.currentBucket,
      assessable: a.assessable,
      lastSnapshotAt: a.lastSnapshotAt?.toISOString() ?? null,
      signals: (a.snapshots[0]?.signals ?? []).map((s) => ({
        definitionId: s.definitionId,
        category: s.category,
        severity: s.severity,
        contribution: s.contribution,
        explanation: s.explanation,
        remediationId: s.remediationId,
      })),
    }));
  }

  // Re-pull + re-score every account in the org.
  @Post('assess')
  async assess(@CurrentOrg() orgId: string): Promise<{ ok: true }> {
    await this.assessment.assessOrg(orgId, SnapshotReason.MANUAL_AUDIT);
    return { ok: true };
  }

  // Dev-only: score a hand-crafted pull for an account so the dashboard shows the
  // full risk range without a real enforcement. Disabled in production.
  @Post(':id/simulate')
  async simulate(@CurrentOrg() orgId: string, @Param('id') id: string, @Body() raw: RawMetaPull): Promise<RiskResult> {
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    return this.assessment.simulate(orgId, id, raw);
  }
}
