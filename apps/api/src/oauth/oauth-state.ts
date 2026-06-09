import { createHmac, timingSafeEqual } from 'node:crypto';

// OAuth CSRF state, bound to the initiating org and signed (HMAC-SHA256) so the
// callback can trust it across the web->api->Meta->api hop without a cookie. An
// attacker can't forge a state for an org they don't control, and stale states
// expire. Signed with AEGIS_OAUTH_STATE_SECRET (falls back to the master key).

const MAX_AGE_MS = 10 * 60 * 1000;

function secret(): string {
  const value = process.env.AEGIS_OAUTH_STATE_SECRET ?? process.env.AEGIS_MASTER_KEY;
  if (!value) throw new Error('missing AEGIS_OAUTH_STATE_SECRET (or AEGIS_MASTER_KEY)');
  return value;
}

function hmac(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function signState(orgId: string, nowMs: number = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ orgId, ts: nowMs })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

export function verifyState(state: string, nowMs: number = Date.now()): { orgId: string } {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw new Error('malformed state');

  const expected = hmac(payload);
  const got = Buffer.from(sig);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new Error('bad state signature');

  const { orgId, ts } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { orgId?: string; ts?: number };
  if (!orgId || typeof ts !== 'number' || nowMs - ts > MAX_AGE_MS) throw new Error('expired or invalid state');
  return { orgId };
}
