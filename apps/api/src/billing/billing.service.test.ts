import 'reflect-metadata';
import type Stripe from 'stripe';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { BillingService } from './billing.service.js';

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test';
  process.env.STRIPE_PRICE_SOLO = 'price_solo';
  process.env.STRIPE_PRICE_AGENCY = 'price_agency';
  process.env.STRIPE_PRICE_SCALE = 'price_scale';
});

function subEvent(type: string, object: Record<string, unknown>): Stripe.Event {
  return { type, data: { object } } as unknown as Stripe.Event;
}

describe('BillingService.handleEvent', () => {
  it('syncs a subscription to the right tier + quota, under the org RLS scope', async () => {
    const upsert = vi.fn(async () => ({}));
    const prisma = {
      withOrg: vi.fn(async (_orgId: string, fn: (t: unknown) => Promise<unknown>) => fn({ subscription: { upsert } })),
    } as unknown as PrismaService;

    await new BillingService(prisma).handleEvent(
      subEvent('customer.subscription.updated', {
        id: 'sub_1',
        customer: 'cus_1',
        status: 'active',
        metadata: { orgId: 'org_1' },
        items: { data: [{ price: { id: 'price_agency' } }] },
        current_period_end: 1_800_000_000,
      }),
    );

    expect(prisma.withOrg).toHaveBeenCalledWith('org_1', expect.any(Function));
    const arg = upsert.mock.calls[0]![0] as { create: { tier: string; accountQuota: number; status: string } };
    expect(arg.create.tier).toBe('AGENCY');
    expect(arg.create.accountQuota).toBe(20);
    expect(arg.create.status).toBe('ACTIVE');
  });

  it('downgrades to FREE on subscription deletion', async () => {
    const update = vi.fn(async () => ({}));
    const prisma = {
      withOrg: vi.fn(async (_orgId: string, fn: (t: unknown) => Promise<unknown>) => fn({ subscription: { update } })),
    } as unknown as PrismaService;

    await new BillingService(prisma).handleEvent(subEvent('customer.subscription.deleted', { id: 'sub_1', metadata: { orgId: 'org_1' } }));

    const arg = update.mock.calls[0]![0] as { data: { tier: string; status: string } };
    expect(arg.data.tier).toBe('FREE');
    expect(arg.data.status).toBe('CANCELED');
  });

  it('ignores events without an orgId in metadata', async () => {
    const withOrg = vi.fn();
    const prisma = { withOrg } as unknown as PrismaService;
    await new BillingService(prisma).handleEvent(
      subEvent('customer.subscription.updated', { id: 'sub_1', metadata: {}, customer: 'c', status: 'active', items: { data: [] } }),
    );
    expect(withOrg).not.toHaveBeenCalled();
  });
});
