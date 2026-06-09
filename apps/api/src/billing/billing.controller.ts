import { BadRequestException, Body, Controller, Get, Headers, Post, type RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { type PaidTier } from '../config/env.js';
import { WorkosAuthGuard } from '../auth/workos-auth.guard.js';
import { CurrentOrg } from '../tenant/current-org.decorator.js';
import { BillingService } from './billing.service.js';

const PAID_TIERS = new Set<PaidTier>(['SOLO', 'AGENCY', 'SCALE']);

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  // Current plan for the dashboard.
  @Get('subscription')
  @UseGuards(WorkosAuthGuard)
  async subscription(@CurrentOrg() orgId: string): Promise<{ tier: string; accountQuota: number; status: string } | null> {
    const sub = await this.billing.getSubscription(orgId);
    return sub ? { tier: sub.tier, accountQuota: sub.accountQuota, status: sub.status } : null;
  }

  // Start a Checkout for a paid tier.
  @Post('checkout')
  @UseGuards(WorkosAuthGuard)
  async checkout(@CurrentOrg() orgId: string, @Body() body: { tier?: PaidTier }): Promise<{ url: string }> {
    if (!body.tier || !PAID_TIERS.has(body.tier)) throw new BadRequestException('valid paid tier required');
    return { url: await this.billing.createCheckout(orgId, body.tier) };
  }

  // Open the Stripe customer portal.
  @Post('portal')
  @UseGuards(WorkosAuthGuard)
  async portal(@CurrentOrg() orgId: string): Promise<{ url: string }> {
    return { url: await this.billing.createPortal(orgId) };
  }

  // Stripe webhook — signature-verified against the raw body. No auth: Stripe
  // calls it. orgId travels in the event metadata (set at checkout).
  @Post('webhook')
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string): Promise<{ received: true }> {
    if (!req.rawBody || !signature) throw new BadRequestException('missing webhook body or signature');
    let event;
    try {
      event = this.billing.constructEvent(req.rawBody, signature);
    } catch {
      throw new BadRequestException('invalid webhook signature');
    }
    await this.billing.handleEvent(event);
    return { received: true };
  }
}
