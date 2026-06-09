import type { MetaOAuthConfig } from '@aegis/connectors';
import { LocalKeyWrapper, type KeyWrapper } from '@aegis/shared';

// Config is read lazily (on first use of a feature), not at boot, so the api
// still starts — and /health works — before Meta/KMS env is provisioned. Each
// reader fails loud if its required vars are missing (CLAUDE.md: fail closed).

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`missing required env var: ${name}`);
  return value;
}

export interface MetaConfig extends MetaOAuthConfig {
  redirectUri: string;
  scopes: string[];
}

export function metaConfig(): MetaConfig {
  return {
    appId: required('META_APP_ID'),
    appSecret: required('META_APP_SECRET'),
    graphVersion: process.env.META_GRAPH_VERSION ?? 'v21.0',
    redirectUri: required('META_OAUTH_REDIRECT_URI'),
    scopes: (process.env.META_OAUTH_SCOPES ?? 'ads_read,business_management').split(','),
  };
}

/**
 * The envelope master key, from the environment (the documented MVP path —
 * AEGIS_OAUTH_SECURITY §5). Production swaps a KMS-backed KeyWrapper in here.
 * AEGIS_MASTER_KEY is base64 of 32 raw bytes.
 */
export function buildKeyWrapper(): KeyWrapper {
  const key = Buffer.from(required('AEGIS_MASTER_KEY'), 'base64');
  const version = Number(process.env.AEGIS_MASTER_KEY_VERSION ?? '1');
  return new LocalKeyWrapper([{ version, key }], version);
}
