import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { IdentityService } from './identity.service.js';

function fakePrisma(client: Record<string, unknown>) {
  const membershipUpsert = vi.fn(async () => ({}));
  const prisma = {
    client,
    withOrg: vi.fn(async (_orgId: string, fn: (tx: unknown) => Promise<unknown>) =>
      fn({ membership: { upsert: membershipUpsert } }),
    ),
  } as unknown as PrismaService;
  return { prisma, membershipUpsert };
}

describe('IdentityService.resolveOrgId', () => {
  it('provisions org, user, and membership on first sign-in', async () => {
    const client = {
      organization: { upsert: vi.fn(async () => ({ id: 'org_db_1' })) },
      user: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({ id: 'user_db_1' })) },
    };
    const { prisma, membershipUpsert } = fakePrisma(client);

    const orgId = await new IdentityService(prisma).resolveOrgId({
      workosOrgId: 'org_1',
      workosUserId: 'user_1',
      email: 'a@b.com',
    });

    expect(orgId).toBe('org_db_1');
    expect(client.user.create).toHaveBeenCalled();
    expect(prisma.withOrg).toHaveBeenCalledWith('org_db_1', expect.any(Function));
    expect(membershipUpsert).toHaveBeenCalled();
  });

  it('links a pre-existing user found by email instead of creating a duplicate', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce(null) // by workosUserId
      .mockResolvedValueOnce({ id: 'user_existing' }); // by email
    const client = {
      organization: { upsert: vi.fn(async () => ({ id: 'org_db_1' })) },
      user: { findUnique, update: vi.fn(async () => ({ id: 'user_existing' })), create: vi.fn() },
    };
    const { prisma } = fakePrisma(client);

    await new IdentityService(prisma).resolveOrgId({ workosOrgId: 'org_1', workosUserId: 'user_1', email: 'a@b.com' });

    expect(client.user.update).toHaveBeenCalledWith({ where: { id: 'user_existing' }, data: { workosUserId: 'user_1' } });
    expect(client.user.create).not.toHaveBeenCalled();
  });
});
