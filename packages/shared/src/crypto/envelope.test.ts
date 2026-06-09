import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { openTokenBundle, sealTokenBundle, type TokenBundle } from './envelope.js';
import { LocalKeyWrapper } from './key-wrapper.js';

const bundle: TokenBundle = {
  accessToken: 'EAAB-secret-access-token',
  tokenType: 'USER_LONG_LIVED',
  scopes: ['ads_read', 'business_management'],
  expiresAt: '2026-08-01T00:00:00.000Z',
  dataAccessExpiresAt: '2026-09-01T00:00:00.000Z',
  grantedAccountIds: ['act_123', 'act_456'],
};

const wrapper = () => new LocalKeyWrapper([{ version: 1, key: randomBytes(32) }]);

describe('envelope encryption', () => {
  it('round-trips a token bundle', async () => {
    const w = wrapper();
    const sealed = await sealTokenBundle(bundle, w);
    expect(await openTokenBundle(sealed, w)).toEqual(bundle);
  });

  it('never stores the access token in plaintext', async () => {
    const sealed = await sealTokenBundle(bundle, wrapper());
    const blob = Buffer.concat([sealed.ciphertext, sealed.iv, sealed.authTag, sealed.wrappedDataKey]);
    expect(blob.toString('utf8')).not.toContain('secret-access-token');
    expect(blob.toString('latin1')).not.toContain(bundle.accessToken);
  });

  it('produces a fresh IV and data key per seal (no deterministic reuse)', async () => {
    const w = wrapper();
    const a = await sealTokenBundle(bundle, w);
    const b = await sealTokenBundle(bundle, w);
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
    expect(a.wrappedDataKey.equals(b.wrappedDataKey)).toBe(false);
  });

  it('fails authentication when the ciphertext is tampered with', async () => {
    const w = wrapper();
    const sealed = await sealTokenBundle(bundle, w);
    sealed.ciphertext[0] ^= 0xff;
    await expect(openTokenBundle(sealed, w)).rejects.toThrow();
  });

  it('fails authentication when the auth tag is tampered with', async () => {
    const w = wrapper();
    const sealed = await sealTokenBundle(bundle, w);
    sealed.authTag[0] ^= 0xff;
    await expect(openTokenBundle(sealed, w)).rejects.toThrow();
  });

  it('cannot be opened by an unrelated master key', async () => {
    const sealed = await sealTokenBundle(bundle, wrapper());
    await expect(openTokenBundle(sealed, wrapper())).rejects.toThrow();
  });
});

describe('key-version rotation', () => {
  it('seals new records under the current version but still opens old ones', async () => {
    const v1 = randomBytes(32);
    const v2 = randomBytes(32);

    // sealed before rotation, under v1
    const beforeRotation = await sealTokenBundle(bundle, new LocalKeyWrapper([{ version: 1, key: v1 }]));
    expect(beforeRotation.keyVersion).toBe(1);

    // rotate: both versions live, v2 current
    const rotated = new LocalKeyWrapper(
      [
        { version: 1, key: v1 },
        { version: 2, key: v2 },
      ],
      2,
    );

    // old record still opens; new records use v2
    expect(await openTokenBundle(beforeRotation, rotated)).toEqual(bundle);
    const afterRotation = await sealTokenBundle(bundle, rotated);
    expect(afterRotation.keyVersion).toBe(2);
    expect(await openTokenBundle(afterRotation, rotated)).toEqual(bundle);
  });

  it('fails closed when the master key for a version is gone', async () => {
    const sealed = await sealTokenBundle(bundle, new LocalKeyWrapper([{ version: 1, key: randomBytes(32) }]));
    const onlyV2 = new LocalKeyWrapper([{ version: 2, key: randomBytes(32) }]);
    await expect(openTokenBundle(sealed, onlyV2)).rejects.toThrow(/no master key for version 1/);
  });
});

describe('LocalKeyWrapper construction', () => {
  it('rejects a master key that is not 32 bytes', () => {
    expect(() => new LocalKeyWrapper([{ version: 1, key: randomBytes(16) }])).toThrow(/32 bytes/);
  });

  it('rejects an empty keyring', () => {
    expect(() => new LocalKeyWrapper([])).toThrow(/at least one/);
  });

  it('rejects a current version absent from the keyring', () => {
    expect(() => new LocalKeyWrapper([{ version: 1, key: randomBytes(32) }], 9)).toThrow(/not present/);
  });
});
