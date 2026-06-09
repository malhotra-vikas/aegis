import 'reflect-metadata';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CredentialsService } from '../credentials/credentials.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AssessmentService } from './assessment.service.js';

// Shared, hoisted so the vi.mock factory can read it safely.
const pull = vi.hoisted(() => ({ mode: 'disabled' as 'disabled' | 'empty' }));
vi.mock('@aegis/connectors', () => ({
  MetaGraphClient: class {},
  // account_status 2 = DISABLED (terminal -> red); empty pull -> not assessable.
  fetchAdAccountPull: vi.fn(async () => (pull.mode === 'empty' ? {} : { account_status: 2 })),
}));

beforeAll(() => {
  process.env.META_APP_ID = 'a';
  process.env.META_APP_SECRET = 's';
  process.env.META_OAUTH_REDIRECT_URI = 'r';
});

function deps() {
  const snapshotCreate = vi.fn(async () => ({ createdAt: new Date() }));
  const accountUpdate = vi.fn(async () => ({}));
  const prisma = {
    withOrg: vi.fn(async (_orgId: string, fn: (t: unknown) => Promise<unknown>) =>
      fn({ healthSnapshot: { create: snapshotCreate }, connectedAccount: { update: accountUpdate } }),
    ),
  } as unknown as PrismaService;
  const credentials = {
    openMetaCredential: vi.fn(async () => ({
      accessToken: 'tok',
      tokenType: 'USER_LONG_LIVED',
      scopes: ['ads_read'],
      expiresAt: null,
      dataAccessExpiresAt: null,
      grantedAccountIds: [],
    })),
  } as unknown as CredentialsService;
  return { prisma, credentials, snapshotCreate, accountUpdate };
}

describe('AssessmentService.assessAccount', () => {
  it('pulls, scores with the real engine, persists a snapshot + signals, and denormalizes', async () => {
    pull.mode = 'disabled';
    const { prisma, credentials, snapshotCreate, accountUpdate } = deps();

    const result = await new AssessmentService(prisma, credentials).assessAccount('org_1', { id: 'ca_1', externalId: 'act_1' });

    expect(result.bucket).toBe('red'); // disabled is terminal
    expect(result.score).toBeGreaterThanOrEqual(95);

    const snap = (snapshotCreate.mock.calls[0]![0] as { data: { bucket: string; signals: { create: unknown[] } } }).data;
    expect(snap.bucket).toBe('RED');
    expect(snap.signals.create.length).toBeGreaterThan(0);

    const upd = (accountUpdate.mock.calls[0]![0] as { data: { currentBucket: string; currentScore: number } }).data;
    expect(upd.currentBucket).toBe('RED');
    expect(upd.currentScore).toBe(result.score);
  });

  it('marks the account not-assessable when the pull is empty (fail closed)', async () => {
    pull.mode = 'empty';
    const { prisma, credentials } = deps();

    const result = await new AssessmentService(prisma, credentials).assessAccount('org_1', { id: 'ca_1', externalId: 'act_1' });
    expect(result.assessable).toBe(false);
    expect(result.bucket).not.toBe('green');
  });
});
