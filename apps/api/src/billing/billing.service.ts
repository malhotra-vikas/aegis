import type { SubscriptionStatus, SubscriptionTier } from '@aegis/db';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { type PaidTier, stripeConfig, stripePriceId, tierForPriceId, webBaseUrl } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Per-tier quotas (AEGIS_SPEC §3). Per-account pricing is the expansion mechanic.
const TIER_LIMITS: Record<SubscriptionTier, { accountQuota: number; seatQuota: number }> = {
  FREE: { accountQuota: 1, seatQuota: 1 },
  SOLO: { accountQuota: 3, seatQuota: 1 },
  AGENCY: { accountQuota: 20, seatQuota: 5 },
  SCALE: { accountQuota: 75, seatQuota: 15 },
};

function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    default:
      return 'CANCELED';
  }
}

/**
 * Stripe billing. The webhook is cross-tenant (Stripe calls it unauthenticated),
 * but Subscription is RLS-scoped — so orgId is carried in the Stripe metadata at
 * checkout and read back here, letting every write go through withOrg(orgId)
 * without needing BYPASSRLS.
 */
@Injectable()
export class BillingService {
  private client?: Stripe;

  constructor(private readonly prisma: PrismaService) {}

  private stripe(): Stripe {
    return (this.client ??= new Stripe(stripeConfig().secretKey));
  }

  /** Self-serve Checkout for a paid tier. Returns the hosted checkout URL. */
  async createCheckout(orgId: string, tier: PaidTier): Promise<string> {
    const existing = await this.prisma.withOrg(orgId, (tx) =>
      tx.subscription.findUnique({ where: { orgId }, select: { stripeCustomerId: true } }),
    );
    const web = webBaseUrl();
    const session = await this.stripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: stripePriceId(tier), quantity: 1 }],
      success_url: `${web}/app?upgraded=1`,
      cancel_url: `${web}/pricing`,
      client_reference_id: orgId,
      customer: existing?.stripeCustomerId ?? undefined,
      subscription_data: { metadata: { orgId } },
      metadata: { orgId },
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return session.url;
  }

  /** Stripe-hosted customer portal for managing/cancelling the subscription. */
  async createPortal(orgId: string): Promise<string> {
    const sub = await this.prisma.withOrg(orgId, (tx) =>
      tx.subscription.findUnique({ where: { orgId }, select: { stripeCustomerId: true } }),
    );
    if (!sub?.stripeCustomerId) throw new Error('no billing customer for this org');
    const session = await this.stripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${webBaseUrl()}/app`,
    });
    return session.url;
  }

  getSubscription(orgId: string) {
    return this.prisma.withOrg(orgId, (tx) => tx.subscription.findUnique({ where: { orgId } }));
  }

  /** Verify + parse a webhook payload (raw body + signature). */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe().webhooks.constructEvent(rawBody, signature, stripeConfig().webhookSecret);
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.client_reference_id ?? session.metadata?.orgId;
        if (!orgId || !session.subscription) return;
        const subscription = await this.stripe().subscriptions.retrieve(session.subscription as string);
        await this.sync(orgId, subscription, session.customer as string);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.orgId;
        if (orgId) await this.sync(orgId, subscription, subscription.customer as string);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const orgId = subscription.metadata?.orgId;
        if (orgId) await this.downgrade(orgId);
        break;
      }
    }
  }

  private async sync(orgId: string, subscription: Stripe.Subscription, customerId: string): Promise<void> {
    const priceId = subscription.items.data[0]?.price.id;
    const tier: SubscriptionTier = (priceId && tierForPriceId(priceId)) || 'SOLO';
    const limits = TIER_LIMITS[tier];
    // current_period_end's location shifts across Stripe API versions; read defensively.
    const periodEnd = (subscription as { current_period_end?: number }).current_period_end;

    const data = {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      tier,
      accountQuota: limits.accountQuota,
      seatQuota: limits.seatQuota,
      status: mapStatus(subscription.status),
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    };

    await this.prisma.withOrg(orgId, (tx) =>
      tx.subscription.upsert({ where: { orgId }, create: { orgId, ...data }, update: data }),
    );
  }

  private async downgrade(orgId: string): Promise<void> {
    await this.prisma.withOrg(orgId, (tx) =>
      tx.subscription.update({
        where: { orgId },
        data: { tier: 'FREE', accountQuota: 1, seatQuota: 1, status: 'CANCELED', stripeSubscriptionId: null },
      }),
    );
  }
}
