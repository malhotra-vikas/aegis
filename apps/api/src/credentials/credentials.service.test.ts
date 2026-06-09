import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { LocalKeyWrapper, openTokenBundle, type TokenBundle } from '@aegis/shared';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { CredentialsService } from './credentials.service.js';

const MASTER_KEY = randomBytes(32);

beforeAll(() => {
  process.env.AEGIS_MASTER_KEY = MASTER_KEY.toString('base64');
  process.env.AEGIS_MASTER_KEY_VERSION = '1';
});

const bundle: TokenBundle = {
  accessToken: 'long-lived-secret-token',
  tokenType: 'USER_LONG_LIVED',
  scopes: ['ads_read', 'business_management'],
  expiresAt: '2026-08-01T00:00:00.000Z',
  dataAccessExpiresAt: null,
  grantedAccountIds: ['act_1'],
};

describe('CredentialsService.storeMetaCredential', () => {
  it('seals the bundle, persists only ciphertext, and round-trips — under the tenant scope', async () => {
    const credentialUpsert = vi.fn(async () => ({}));
    const tx = {
      connectedAccount: { upsert: vi.fn(async () => ({ id: 'ca_1' })) },
      credential: { upsert: credentialUpsert },
    };
    const prisma = {
      withOrg: vi.fn(async (_orgId: string, fn: (t: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;

    const id = await new CredentialsService(prisma).storeMetaCredential(
      'org_1',
      { externalId: 'act_1', displayName: 'Acme' },
      bundle,
    );

    expect(id).toBe('ca_1');
    expect(prisma.withOrg).toHaveBeenCalledWith('org_1', expect.any(Function));

    const args = credentialUpsert.mock.calls[0]![0] as { create: Record<string, unknown> };
    const payload = args.create;
    expect(payload.orgId).toBe('org_1');
    expect(payload.tokenType).toBe('USER_LONG_LIVED');
    expect(payload.scopes).toEqual(['ads_read', 'business_management']);

    const ciphertext = payload.ciphertext as Buffer;
    const wrappedDataKey = payload.wrappedDataKey as Buffer;
    expect(Buffer.concat([ciphertext, wrappedDataKey]).toString('latin1')).not.toContain('long-lived-secret-token');

    const wrapper = new LocalKeyWrapper([{ version: payload.keyVersion as number, key: MASTER_KEY }]);
    const opened = await openTokenBundle(
      {
        ciphertext,
        iv: payload.iv as Buffer,
        authTag: payload.authTag as Buffer,
        wrappedDataKey,
        keyVersion: payload.keyVersion as number,
      },
      wrapper,
    );
    expect(opened).toEqual(bundle);
  });
});
