import { createHmac, timingSafeEqual } from 'node:crypto';

// Signed (HMAC-SHA256) OAuth CSRF state, carrying one bound claim across the
// browser hop without a cookie: orgId for the authed connect, email for the
// anonymous free audit. An attacker can't forge a state, and stale states expire.
// Signed with AEGIS_OAUTH_STATE_SECRET (falls back to the master key).

const MAX_AGE_MS = 10 * 60 * 1000;

function secret(): string {
  const value = process.env.AEGIS_OAUTH_STATE_SECRET ?? process.env.AEGIS_MASTER_KEY;
  if (!value) throw new Error('missing AEGIS_OAUTH_STATE_SECRET (or AEGIS_MASTER_KEY)');
  return value;
}

function hmac(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function signState(claims: Record<string, string>, nowMs: number = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ ...claims, ts: nowMs })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

/** Verify signature + freshness; returns the signed claims (ts stripped). */
export function verifyState(state: string, nowMs: number = Date.now()): Record<string, string> {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw new Error('malformed state');

  const expected = hmac(payload);
  const got = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new Error('bad state signature');

  const { ts, ...claims } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { ts?: number } & Record<string, string>;
  if (typeof ts !== 'number' || nowMs - ts > MAX_AGE_MS) throw new Error('expired or invalid state');
  return claims;
}
