import { type RiskBucket } from '@aegis/db';
import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface AuditLeadBody {
  email?: string;
  indicativeScore?: number;
  indicativeBucket?: RiskBucket;
  answers?: Record<string, unknown>;
}

const BUCKETS = new Set(['GREEN', 'AMBER', 'RED']);

// Anonymous, pre-signup lead capture for the free audit's email-gated
// pre-assessment (AEGIS_GTM_SEO §2.3, §7). No tenant scope — AuditResult exists
// before an org. Account creation happens later, at upgrade.
@Controller('audit')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('lead')
  async lead(@Body() body: AuditLeadBody): Promise<{ ok: true }> {
    if (!body.email || !body.email.includes('@')) throw new BadRequestException('valid email required');
    const bucket: RiskBucket = body.indicativeBucket && BUCKETS.has(body.indicativeBucket) ? body.indicativeBucket : 'AMBER';

    await this.prisma.client.auditResult.create({
      data: {
        email: body.email,
        platform: 'META',
        score: typeof body.indicativeScore === 'number' ? body.indicativeScore : 0,
        bucket,
        assessable: false, // a self-reported pre-assessment, not a real connect
        signals: (body.answers ?? {}) as object,
        modelVersion: 'self-report-v0',
      },
    });
    return { ok: true };
  }
}
