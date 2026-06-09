import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ALGORITHM, AUTH_TAG_BYTES, IV_BYTES, type KeyWrapper } from './key-wrapper.js';

// Envelope encryption for OAuth credentials (AEGIS_OAUTH_SECURITY §5). The token
// bundle is encrypted with a fresh per-record 256-bit data key (AES-256-GCM); the
// data key is then wrapped by the master key via the KeyWrapper. A DB compromise
// yields only ciphertext — decryption also requires the master key.

const DATA_KEY_BYTES = 32; // AES-256

/** Exactly what gets encrypted — nothing more (AEGIS_OAUTH_SECURITY §5). */
export interface TokenBundle {
  accessToken: string;
  tokenType: 'USER_LONG_LIVED' | 'SYSTEM_USER';
  scopes: string[];
  expiresAt: string | null; // ISO 8601
  dataAccessExpiresAt: string | null;
  grantedAccountIds: string[];
}

/** The stored ciphertext fields, mapping 1:1 to the Credential model's Bytes columns. */
export interface SealedEnvelope {
  ciphertext: Buffer;
  iv: Buffer;
  authTag: Buffer;
  wrappedDataKey: Buffer;
  keyVersion: number;
}

export async function sealTokenBundle(bundle: TokenBundle, wrapper: KeyWrapper): Promise<SealedEnvelope> {
  const dataKey = randomBytes(DATA_KEY_BYTES);
  try {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, dataKey, iv);
    const plaintext = Buffer.from(JSON.stringify(bundle), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const { wrappedDataKey, keyVersion } = await wrapper.wrapDataKey(dataKey);
    return { ciphertext, iv, authTag, wrappedDataKey, keyVersion };
  } finally {
    dataKey.fill(0); // don't leave the data key sitting in the heap after use
  }
}

export async function openTokenBundle(sealed: SealedEnvelope, wrapper: KeyWrapper): Promise<TokenBundle> {
  const dataKey = await wrapper.unwrapDataKey(sealed.wrappedDataKey, sealed.keyVersion);
  try {
    if (sealed.iv.length !== IV_BYTES || sealed.authTag.length !== AUTH_TAG_BYTES) {
      throw new Error('sealed envelope is malformed');
    }
    const decipher = createDecipheriv(ALGORITHM, dataKey, sealed.iv);
    decipher.setAuthTag(sealed.authTag);
    const plaintext = Buffer.concat([decipher.update(sealed.ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as TokenBundle;
  } finally {
    dataKey.fill(0);
  }
}
