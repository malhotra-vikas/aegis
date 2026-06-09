import 'reflect-metadata';
import { type CryptoKey, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { WorkosAuthService } from './workos-auth.service.js';

let publicKey: CryptoKey;
let privateKey: CryptoKey;

beforeAll(async () => {
  ({ publicKey, privateKey } = await generateKeyPair('RS256'));
});

function sign(claims: Record<string, unknown>, key = privateKey): Promise<string> {
  return new SignJWT(claims).setProtectedHeader({ alg: 'RS256' }).setIssuedAt().setExpirationTime('1h').sign(key);
}

describe('WorkosAuthService.verify', () => {
  it('verifies a valid token and extracts the principal', async () => {
    const svc = new WorkosAuthService(publicKey);
    const token = await sign({ sub: 'user_1', org_id: 'org_1', email: 'a@b.com', name: 'Ada' });
    expect(await svc.verify(token)).toEqual({
      workosOrgId: 'org_1',
      workosUserId: 'user_1',
      email: 'a@b.com',
      name: 'Ada',
    });
  });

  it('accepts a token without org_id (solo user, no org context)', async () => {
    const svc = new WorkosAuthService(publicKey);
    const principal = await svc.verify(await sign({ sub: 'user_1' }));
    expect(principal.workosUserId).toBe('user_1');
    expect(principal.workosOrgId).toBeUndefined();
  });

  it('rejects a token missing the subject', async () => {
    const svc = new WorkosAuthService(publicKey);
    await expect(svc.verify(await sign({ org_id: 'org_1' }))).rejects.toThrow();
  });

  it('rejects a token signed by a different key', async () => {
    const svc = new WorkosAuthService(publicKey);
    const attacker = await generateKeyPair('RS256');
    const token = await sign({ sub: 'u', org_id: 'o' }, attacker.privateKey);
    await expect(svc.verify(token)).rejects.toThrow();
  });
});
