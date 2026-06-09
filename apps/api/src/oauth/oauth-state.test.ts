import { beforeAll, describe, expect, it } from 'vitest';
import { signState, verifyState } from './oauth-state.js';

beforeAll(() => {
  process.env.AEGIS_OAUTH_STATE_SECRET = 'test-state-secret';
});

describe('oauth state', () => {
  it('round-trips a claim (orgId)', () => {
    expect(verifyState(signState({ orgId: 'org_1' })).orgId).toBe('org_1');
  });

  it('round-trips an email claim (anonymous audit)', () => {
    expect(verifyState(signState({ email: 'a@b.com' })).email).toBe('a@b.com');
  });

  it('rejects a tampered payload', () => {
    const [, sig] = signState({ orgId: 'org_1' }).split('.');
    const forged = `${Buffer.from(JSON.stringify({ orgId: 'org_evil', ts: Date.now() })).toString('base64url')}.${sig}`;
    expect(() => verifyState(forged)).toThrow();
  });

  it('rejects a malformed state', () => {
    expect(() => verifyState('not-a-state')).toThrow();
  });

  it('rejects an expired state', () => {
    const old = signState({ orgId: 'org_1' }, Date.now() - 20 * 60 * 1000);
    expect(() => verifyState(old)).toThrow(/expired/);
  });
});
