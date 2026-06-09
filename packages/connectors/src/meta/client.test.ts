import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  appSecretProof,
  isAuthError,
  isRetryable,
  MetaApiError,
  MetaGraphClient,
  parseBusinessUseCaseUsage,
} from './client.js';

const TOKEN = 'EAAB-super-secret-token';
const SECRET = 'app-secret-value';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function client(fetchImpl: typeof fetch, overrides: Record<string, unknown> = {}) {
  return new MetaGraphClient({
    appSecret: SECRET,
    graphVersion: 'v21.0',
    baseBackoffMs: 10,
    sleep: vi.fn(async () => {}),
    random: () => 0, // deterministic jitter (floor = 0.5x)
    fetchImpl,
    ...overrides,
  });
}

describe('appSecretProof', () => {
  it('is HMAC-SHA256(token, appSecret) in hex', () => {
    const expected = createHmac('sha256', SECRET).update(TOKEN).digest('hex');
    expect(appSecretProof(TOKEN, SECRET)).toBe(expected);
  });
});

describe('MetaGraphClient.get', () => {
  it('sends the token as a Bearer header and appsecret_proof as a query param, never the token in the URL', async () => {
    const fetchImpl = vi.fn(async () => json(200, { account_status: 1 }));
    const c = client(fetchImpl as unknown as typeof fetch);
    await c.get('act_123', { accessToken: TOKEN });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).not.toContain(TOKEN); // token must not leak into the URL
    expect(String(url)).toContain(`appsecret_proof=${appSecretProof(TOKEN, SECRET)}`);
    expect((init as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOKEN}` });
  });

  it('pins the graph version into the path', async () => {
    const fetchImpl = vi.fn(async () => json(200, {}));
    await client(fetchImpl as unknown as typeof fetch).get('act_9', { accessToken: TOKEN });
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('/v21.0/act_9');
  });

  it('keeps path injection on the allowed host', async () => {
    const fetchImpl = vi.fn(async () => json(200, {}));
    await client(fetchImpl as unknown as typeof fetch).get('https://evil.com/steal', { accessToken: TOKEN });
    expect(new URL(String(fetchImpl.mock.calls[0]![0])).host).toBe('graph.facebook.com');
  });

  it('retries a 429 then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(429, { error: { message: 'rate limited', code: 4 } }))
      .mockResolvedValueOnce(json(200, { account_status: 1 }));
    const sleep = vi.fn(async () => {});
    const c = client(fetchImpl as unknown as typeof fetch, { sleep });

    expect(await c.get('act_1', { accessToken: TOKEN })).toEqual({ account_status: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep.mock.calls[0]![0]).toBeGreaterThan(0);
  });

  it('gives up after maxRetries on persistent 500s', async () => {
    const fetchImpl = vi.fn(async () => json(500, { error: { message: 'boom' } }));
    const sleep = vi.fn(async () => {});
    const c = client(fetchImpl as unknown as typeof fetch, { sleep, maxRetries: 2 });

    await expect(c.get('act_1', { accessToken: TOKEN })).rejects.toBeInstanceOf(MetaApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('does not retry an auth error and flags it as a risk event', async () => {
    const fetchImpl = vi.fn(async () => json(400, { error: { message: 'invalid token', code: 190 } }));
    const sleep = vi.fn(async () => {});
    const c = client(fetchImpl as unknown as typeof fetch, { sleep });

    const err = await c.get('act_1', { accessToken: TOKEN }).catch((e) => e as MetaApiError);
    expect(err).toBeInstanceOf(MetaApiError);
    expect(err.isAuthError).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(err.message).not.toContain(TOKEN); // tokens never surface in errors
  });

  it('retries a network-level failure', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const sleep = vi.fn(async () => {});
    const c = client(fetchImpl as unknown as typeof fetch, { sleep });

    expect(await c.get('act_1', { accessToken: TOKEN })).toEqual({ ok: true });
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('pre-emptively slows down after a response reports high usage', async () => {
    const usage = JSON.stringify({ '123': [{ call_count: 95, total_cputime: 10, total_time: 12 }] });
    const fetchImpl = vi.fn(async () => json(200, {}, { 'x-business-use-case-usage': usage }));
    const sleep = vi.fn(async () => {});
    const c = client(fetchImpl as unknown as typeof fetch, { sleep });

    await c.get('act_1', { accessToken: TOKEN }); // records 95% usage
    expect(sleep).not.toHaveBeenCalled();
    await c.get('act_1', { accessToken: TOKEN }); // next call should pre-throttle
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(c.lastUsage?.usagePct).toBe(95);
  });
});

describe('error classification', () => {
  it('treats 401 and known auth codes as auth errors', () => {
    expect(isAuthError(401)).toBe(true);
    expect(isAuthError(400, 190)).toBe(true);
    expect(isAuthError(400, 4)).toBe(false);
  });

  it('treats 429, 5xx, and rate-limit codes/subcodes as retryable', () => {
    expect(isRetryable(429)).toBe(true);
    expect(isRetryable(503)).toBe(true);
    expect(isRetryable(400, 17)).toBe(true);
    expect(isRetryable(400, undefined, 2446079)).toBe(true);
    expect(isRetryable(400, 190)).toBe(false);
  });
});

describe('parseBusinessUseCaseUsage', () => {
  it('returns the worst-case usage and regain time across buckets', () => {
    const header = JSON.stringify({
      biz1: [{ call_count: 20, total_cputime: 80, total_time: 30, estimated_time_to_regain_access: 0 }],
      biz2: [{ call_count: 91, total_cputime: 10, total_time: 10, estimated_time_to_regain_access: 5 }],
    });
    expect(parseBusinessUseCaseUsage(header)).toEqual({ usagePct: 91, estimatedTimeToRegainAccessMin: 5 });
  });

  it('returns null for a missing or unparseable header', () => {
    expect(parseBusinessUseCaseUsage(null)).toBeNull();
    expect(parseBusinessUseCaseUsage('not json')).toBeNull();
  });
});
