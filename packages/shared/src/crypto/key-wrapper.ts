import { createCipheriv, createDecipheriv, randomBytes, type CipherGCMTypes } from 'node:crypto';

// Envelope encryption splits the secret (a per-record 256-bit data key) from the
// key that protects it (the master key). This seam is where that protection lives:
// in production the master key never enters app memory and wrap/unwrap are KMS calls;
// locally (and the MVP fallback per AEGIS_OAUTH_SECURITY §5) a master key in the
// secret manager does the same AES-256-GCM wrap in-process. Both are async because
// the production impl is a network round-trip.

const ALGORITHM: CipherGCMTypes = 'aes-256-gcm';
const MASTER_KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // 96-bit GCM nonce
const AUTH_TAG_BYTES = 16;

export interface WrappedKey {
  wrappedDataKey: Buffer;
  keyVersion: number;
}

export interface KeyWrapper {
  /** Wrap a freshly generated data key under the current master key. */
  wrapDataKey(dataKey: Buffer): Promise<WrappedKey>;
  /** Unwrap a data key that was wrapped at `keyVersion`. Throws if the version is
   *  unknown (fail closed) or the ciphertext fails authentication. */
  unwrapDataKey(wrapped: Buffer, keyVersion: number): Promise<Buffer>;
}

export interface MasterKey {
  version: number;
  key: Buffer;
}

/**
 * Master key held in-process. This is the local/dev path and the documented MVP
 * fallback; production swaps in a KMS-backed KeyWrapper with the same interface.
 *
 * The keyring carries every live version so rotation works: new wraps use the
 * current version, while old records still unwrap against the version they were
 * sealed with.
 */
export class LocalKeyWrapper implements KeyWrapper {
  private readonly keys = new Map<number, Buffer>();
  private readonly currentVersion: number;

  constructor(keyring: MasterKey[], currentVersion?: number) {
    if (keyring.length === 0) {
      throw new Error('LocalKeyWrapper requires at least one master key');
    }
    for (const { version, key } of keyring) {
      if (key.length !== MASTER_KEY_BYTES) {
        throw new Error(`master key v${version} must be ${MASTER_KEY_BYTES} bytes, got ${key.length}`);
      }
      this.keys.set(version, key);
    }
    this.currentVersion = currentVersion ?? Math.max(...keyring.map((k) => k.version));
    if (!this.keys.has(this.currentVersion)) {
      throw new Error(`current key version ${this.currentVersion} not present in keyring`);
    }
  }

  async wrapDataKey(dataKey: Buffer): Promise<WrappedKey> {
    const masterKey = this.keys.get(this.currentVersion)!;
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()]);
    const wrappedDataKey = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
    return { wrappedDataKey, keyVersion: this.currentVersion };
  }

  async unwrapDataKey(wrapped: Buffer, keyVersion: number): Promise<Buffer> {
    const masterKey = this.keys.get(keyVersion);
    if (!masterKey) {
      throw new Error(`no master key for version ${keyVersion}`);
    }
    if (wrapped.length <= IV_BYTES + AUTH_TAG_BYTES) {
      throw new Error('wrapped data key is malformed');
    }
    const iv = wrapped.subarray(0, IV_BYTES);
    const authTag = wrapped.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
    const ciphertext = wrapped.subarray(IV_BYTES + AUTH_TAG_BYTES);
    const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

export { IV_BYTES, AUTH_TAG_BYTES, ALGORITHM };
