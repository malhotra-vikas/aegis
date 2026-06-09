import 'reflect-metadata';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { CredentialsService } from '../credentials/credentials.service.js';
import { MetaOAuthService } from './meta-oauth.service.js';

vi.mock('@aegis/connectors', () => ({
  buildAuthorizationUrl: vi.fn(() => 'https://www.facebook.com/dialog/url'),
  exchangeCodeForToken: vi.fn(async () => ({ accessToken: 'short', tokenType: 'bearer', expiresInSec: 3600 })),
  exchangeForLongLivedToken: vi.fn(async () => ({ accessToken: 'long', tokenType: 'bearer', expiresInSec: 5184000 })),
  inspectToken: vi.fn(async () => ({ scopes: ['ads_read'], isValid: true, expiresAt: '2026-08-01T00:00:00.000Z', dataAccessExpiresAt: null })),
  fetchAdAccounts: vi.fn(async () => [
    { externalId: 'act_1', displayName: 'Acme' },
    { externalId: 'act_2', displayName: 'Beta' },
  ]),
  MetaGraphClient: class {},
}));

beforeAll(() => {
  process.env.META_APP_ID = 'app';
  process.env.META_APP_SECRET = 'secret';
  process.env.META_OAUTH_REDIRECT_URI = 'https://aegis.dev/oauth/meta/callback';
});

describe('MetaOAuthService', () => {
  it('builds an authorization url', () => {
    const svc = new MetaOAuthService({} as unknown as CredentialsService);
    expect(svc.authorizationUrl('state123')).toBe('https://www.facebook.com/dialog/url');
  });

  it('exchanges, inspects, enumerates accounts, and stores one credential per account', async () => {
    const store = vi.fn(async (_orgId: string, acct: { externalId: string }) => `ca_${acct.externalId}`);
    const credentials = { storeMetaCredential: store } as unknown as CredentialsService;

    const res = await new MetaOAuthService(credentials).handleCallback('org_1', 'auth-code');

    expect(res.connectedAccountIds).toEqual(['ca_act_1', 'ca_act_2']);
    expect(store).toHaveBeenCalledTimes(2);

    const bundle = store.mock.calls[0]![2] as { accessToken: string; grantedAccountIds: string[]; scopes: string[] };
    expect(bundle.accessToken).toBe('long'); // the long-lived token, not the short one
    expect(bundle.grantedAccountIds).toEqual(['act_1', 'act_2']);
    expect(bundle.scopes).toEqual(['ads_read']);
  });
});
