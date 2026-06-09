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
  /** Separate callback for the anonymous free audit (distinct flow). */
  auditRedirectUri: string;
  scopes: string[];
}

export function metaConfig(): MetaConfig {
  return {
    appId: required('META_APP_ID'),
    appSecret: required('META_APP_SECRET'),
    graphVersion: process.env.META_GRAPH_VERSION ?? 'v21.0',
    redirectUri: required('META_OAUTH_REDIRECT_URI'),
    auditRedirectUri: process.env.META_AUDIT_REDIRECT_URI ?? 'http://localhost:3001/audit/connect/callback',
    scopes: (process.env.META_OAUTH_SCOPES ?? 'ads_read,business_management').split(','),
  };
}

/** Where the web tier lives, for redirecting the browser back after OAuth. */
export function webBaseUrl(): string {
  return process.env.WEB_BASE_URL ?? 'http://localhost:3000';
}

export interface WorkosConfig {
  jwksUrl: string;
  issuer?: string;
}

export function workosConfig(): WorkosConfig {
  const clientId = required('WORKOS_CLIENT_ID');
  return {
    jwksUrl: process.env.WORKOS_JWKS_URL ?? `https://api.workos.com/sso/jwks/${clientId}`,
    issuer: process.env.WORKOS_ISSUER,
  };
}

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

export function stripeConfig(): StripeConfig {
  return {
    secretKey: required('STRIPE_SECRET_KEY'),
    webhookSecret: required('STRIPE_WEBHOOK_SECRET'),
  };
}

export type PaidTier = 'SOLO' | 'AGENCY' | 'SCALE';

/** The Stripe price id for a paid tier (from STRIPE_PRICE_<TIER>). */
export function stripePriceId(tier: PaidTier): string {
  return required(`STRIPE_PRICE_${tier}`);
}

/** Reverse map: which tier a Stripe price id belongs to (for webhook plan changes). */
export function tierForPriceId(priceId: string): PaidTier | null {
  const tiers: PaidTier[] = ['SOLO', 'AGENCY', 'SCALE'];
  return tiers.find((t) => process.env[`STRIPE_PRICE_${t}`] === priceId) ?? null;
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
