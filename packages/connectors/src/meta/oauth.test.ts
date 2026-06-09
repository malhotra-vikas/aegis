import { describe, expect, it, vi } from 'vitest';
import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  inspectToken,
  MetaOAuthError,
  type MetaOAuthConfig,
} from './oauth.js';

const cfg: MetaOAuthConfig = { appId: 'app123', appSecret: 'the-app-secret', graphVersion: 'v21.0' };

function ok(body: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
}

describe('buildAuthorizationUrl', () => {
  it('builds the dialog URL with the read-only scopes', () => {
    const url = new URL(buildAuthorizationUrl(cfg, { redirectUri: 'https://aegis.dev/cb', state: 'xyz', scopes: ['ads_read', 'business_management'] }));
    expect(url.host).toBe('www.facebook.com');
    expect(url.pathname).toContain('/dialog/oauth');
    expect(url.searchParams.get('client_id')).toBe('app123');
    expect(url.searchParams.get('state')).toBe('xyz');
    expect(url.searchParams.get('scope')).toBe('ads_read,business_management');
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('refuses a write scope (never request ads_management)', () => {
    expect(() => buildAuthorizationUrl(cfg, { redirectUri: 'https://aegis.dev/cb', state: 's', scopes: ['ads_read', 'ads_management'] })).toThrow(MetaOAuthError);
  });
});

describe('token exchange', () => {
  it('exchanges a code for a short-lived token', async () => {
    const fetchImpl = ok({ access_token: 'short-tok', token_type: 'bearer', expires_in: 3600 });
    const res = await exchangeCodeForToken({ ...cfg, fetchImpl }, { code: 'auth-code', redirectUri: 'https://aegis.dev/cb' });
    expect(res).toEqual({ accessToken: 'short-tok', tokenType: 'bearer', expiresInSec: 3600 });
    const url = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toContain('code=auth-code');
    expect(url).toContain('oauth/access_token');
  });

  it('upgrades to a long-lived token with grant_type=fb_exchange_token', async () => {
    const fetchImpl = ok({ access_token: 'long-tok', token_type: 'bearer', expires_in: 5184000 });
    const res = await exchangeForLongLivedToken({ ...cfg, fetchImpl }, { shortLivedToken: 'short-tok' });
    expect(res.accessToken).toBe('long-tok');
    const url = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toContain('grant_type=fb_exchange_token');
    expect(url).toContain('fb_exchange_token=short-tok');
  });

  it('never leaks the app secret in an error', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"error":{}}', { status: 400 })) as unknown as typeof fetch;
    const err = await exchangeCodeForToken({ ...cfg, fetchImpl }, { code: 'c', redirectUri: 'r' }).catch((e) => e as MetaOAuthError);
    expect(err).toBeInstanceOf(MetaOAuthError);
    expect(err.message).not.toContain('the-app-secret');
  });
});

describe('inspectToken', () => {
  it('maps debug_token data to scopes and expiry', async () => {
    const fetchImpl = ok({
      data: { scopes: ['ads_read', 'business_management'], is_valid: true, expires_at: 1700000000, data_access_expires_at: 1705000000 },
    });
    const res = await inspectToken({ ...cfg, fetchImpl }, { token: 'tok' });
    expect(res.scopes).toEqual(['ads_read', 'business_management']);
    expect(res.isValid).toBe(true);
    expect(res.expiresAt).toBe(new Date(1700000000 * 1000).toISOString());
    expect(res.dataAccessExpiresAt).toBe(new Date(1705000000 * 1000).toISOString());
  });

  it('treats expires_at of 0 as non-expiring', async () => {
    const fetchImpl = ok({ data: { scopes: ['ads_read'], is_valid: true, expires_at: 0 } });
    const res = await inspectToken({ ...cfg, fetchImpl }, { token: 'tok' });
    expect(res.expiresAt).toBeNull();
  });

  it('tolerates benign auto-granted scopes like public_profile', async () => {
    const fetchImpl = ok({ data: { scopes: ['ads_read', 'public_profile'], is_valid: true } });
    const res = await inspectToken({ ...cfg, fetchImpl }, { token: 'tok' });
    expect(res.scopes).toContain('public_profile');
  });

  it('rejects a granted write scope (ads_management)', async () => {
    const fetchImpl = ok({ data: { scopes: ['ads_read', 'ads_management'], is_valid: true } });
    await expect(inspectToken({ ...cfg, fetchImpl }, { token: 'tok' })).rejects.toThrow(MetaOAuthError);
  });
});
