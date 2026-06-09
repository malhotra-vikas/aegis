import { buildAuthorizationUrl, exchangeCodeForToken } from '@aegis/connectors';
import { type RiskBucket } from '@aegis/db';
import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { metaConfig, webBaseUrl } from '../config/env.js';
import { signState, verifyState } from '../oauth/oauth-state.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from './audit.service.js';

interface AuditLeadBody {
  email?: string;
  indicativeScore?: number;
  indicativeBucket?: RiskBucket;
  answers?: Record<string, unknown>;
}

const BUCKETS = new Set(['GREEN', 'AMBER', 'RED']);

// Anonymous, pre-signup. Lead capture (email pre-assessment) + the anonymous
// OAuth audit (AEGIS_SPEC §13, AEGIS_GTM_SEO §7). No auth, no tenant scope.
@Controller('audit')
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Step 1: email-gated self-report lead.
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
        assessable: false,
        signals: (body.answers ?? {}) as object,
        modelVersion: 'self-report-v0',
      },
    });
    return { ok: true };
  }

  // Step 2a: start the anonymous OAuth audit. The email is bound into the signed
  // state (no login). Redirects the browser to Meta.
  @Get('connect/start')
  connectStart(@Query('email') email: string | undefined, @Res() res: Response): void {
    if (!email || !email.includes('@')) throw new BadRequestException('valid email required');
    const cfg = metaConfig();
    const url = buildAuthorizationUrl(cfg, { redirectUri: cfg.auditRedirectUri, state: signState({ email }), scopes: cfg.scopes });
    res.redirect(url);
  }

  // Step 2b: Meta redirects here. Exchange, run the point-in-time audit, redirect
  // the browser to the verdict page with the AuditResult id.
  @Get('connect/callback')
  async connectCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const web = webBaseUrl();
    try {
      if (error || !code || !state) throw new Error(`audit oauth declined or missing params (${error ?? 'no code/state'})`);
      const { email } = verifyState(state);
      if (!email) throw new Error('state missing email');
      const cfg = metaConfig();
      const token = await exchangeCodeForToken(cfg, { code, redirectUri: cfg.auditRedirectUri });
      const id = await this.audit.runAudit(email, token.accessToken);
      res.redirect(`${web}/audit/result?id=${id}`);
    } catch {
      res.redirect(`${web}/audit?error=1`);
    }
  }

  // The verdict, for the result page to render.
  @Get('result/:id')
  async result(@Param('id') id: string): Promise<unknown> {
    const found = await this.audit.getResult(id);
    if (!found) throw new NotFoundException();
    return {
      externalId: found.externalId,
      score: found.score,
      bucket: found.bucket,
      assessable: found.assessable,
      signals: found.signals,
      createdAt: found.createdAt,
    };
  }
}
