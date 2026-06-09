// Meta OAuth: Authorization Code exchange + token inspection (AEGIS_OAUTH_SECURITY §4).
// The authorization dialog lives on facebook.com; token exchange and debug_token
// on graph.facebook.com. The app secret and tokens never appear in thrown errors.

const DEFAULT_GRAPH_BASE = 'https://graph.facebook.com';
const DEFAULT_DIALOG_BASE = 'https://www.facebook.com';

// Least-privilege, read-only allowlist (locked decision: never request ads_management
// or any write scope). We only ever REQUEST scopes in this set.
const ALLOWED_SCOPES = new Set(['ads_read', 'business_management', 'pages_read_engagement', 'pages_show_list', 'read_insights']);

// Write scopes we must never hold. Meta auto-grants benign reads (e.g.
// public_profile) we don't request, so granted-scope checks use this denylist
// rather than the request allowlist — only an actual write scope is a problem.
const FORBIDDEN_SCOPES = new Set([
  'ads_management',
  'pages_manage_ads',
  'pages_manage_posts',
  'pages_manage_metadata',
  'pages_manage_engagement',
  'catalog_management',
]);

export class MetaOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaOAuthError';
  }
}

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  graphVersion: string;
  graphBaseUrl?: string;
  dialogBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface MetaTokenResponse {
  accessToken: string;
  tokenType: string;
  /** Seconds until expiry, or null if Meta returns a non-expiring token. */
  expiresInSec: number | null;
}

export interface MetaTokenInspection {
  scopes: string[];
  isValid: boolean;
  expiresAt: string | null; // ISO 8601
  dataAccessExpiresAt: string | null;
}

/** Build the OAuth dialog URL. Rejects any scope outside the read-only allowlist. */
export function buildAuthorizationUrl(
  cfg: MetaOAuthConfig,
  opts: { redirectUri: string; state: string; scopes: string[] },
): string {
  assertAllowedScopes(opts.scopes);
  const url = new URL(`${cfg.dialogBaseUrl ?? DEFAULT_DIALOG_BASE}/${cfg.graphVersion}/dialog/oauth`);
  url.searchParams.set('client_id', cfg.appId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('state', opts.state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', opts.scopes.join(','));
  return url.toString();
}

/** Exchange an authorization code for a short-lived access token. */
export async function exchangeCodeForToken(
  cfg: MetaOAuthConfig,
  opts: { code: string; redirectUri: string },
): Promise<MetaTokenResponse> {
  const url = graphUrl(cfg, 'oauth/access_token', {
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    redirect_uri: opts.redirectUri,
    code: opts.code,
  });
  return parseTokenResponse(await getJson(cfg, url, 'code exchange'));
}

/** Upgrade a short-lived token to a long-lived one (~60 days). */
export async function exchangeForLongLivedToken(
  cfg: MetaOAuthConfig,
  opts: { shortLivedToken: string },
): Promise<MetaTokenResponse> {
  const url = graphUrl(cfg, 'oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    fb_exchange_token: opts.shortLivedToken,
  });
  return parseTokenResponse(await getJson(cfg, url, 'long-lived exchange'));
}

/** Inspect a token via debug_token to read its granted scopes and expiry. */
export async function inspectToken(cfg: MetaOAuthConfig, opts: { token: string }): Promise<MetaTokenInspection> {
  const url = graphUrl(cfg, 'debug_token', {
    input_token: opts.token,
    access_token: `${cfg.appId}|${cfg.appSecret}`, // app access token
  });
  const body = (await getJson(cfg, url, 'token inspection')) as {
    data?: { scopes?: string[]; is_valid?: boolean; expires_at?: number; data_access_expires_at?: number };
  };
  const data = body.data ?? {};
  assertNoForbiddenScopes(data.scopes ?? []);
  return {
    scopes: data.scopes ?? [],
    isValid: data.is_valid ?? false,
    expiresAt: unixToIso(data.expires_at),
    dataAccessExpiresAt: unixToIso(data.data_access_expires_at),
  };
}

// Request-time: we only ever ASK for read scopes in the allowlist.
function assertAllowedScopes(scopes: string[]): void {
  const forbidden = scopes.filter((s) => !ALLOWED_SCOPES.has(s));
  if (forbidden.length > 0) {
    throw new MetaOAuthError(`refusing to request scope(s) outside the read-only allowlist: ${forbidden.join(', ')}`);
  }
}

// Grant-time: tolerate benign reads Meta adds (public_profile, email), reject any
// actual write scope.
function assertNoForbiddenScopes(scopes: string[]): void {
  const held = scopes.filter((s) => FORBIDDEN_SCOPES.has(s));
  if (held.length > 0) {
    throw new MetaOAuthError(`refusing forbidden write scope(s): ${held.join(', ')}`);
  }
}

function graphUrl(cfg: MetaOAuthConfig, path: string, params: Record<string, string>): URL {
  const url = new URL(`${cfg.graphBaseUrl ?? DEFAULT_GRAPH_BASE}/${cfg.graphVersion}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

async function getJson(cfg: MetaOAuthConfig, url: URL, op: string): Promise<unknown> {
  const fetchImpl = cfg.fetchImpl ?? fetch;
  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    // Never echo the URL — it carries the app secret and/or the code/token.
    throw new MetaOAuthError(`Meta OAuth ${op} failed (HTTP ${response.status})`);
  }
  return response.json();
}

function parseTokenResponse(body: unknown): MetaTokenResponse {
  const b = body as { access_token?: string; token_type?: string; expires_in?: number };
  if (!b.access_token) throw new MetaOAuthError('Meta OAuth response missing access_token');
  return {
    accessToken: b.access_token,
    tokenType: b.token_type ?? 'bearer',
    expiresInSec: typeof b.expires_in === 'number' ? b.expires_in : null,
  };
}

function unixToIso(seconds: number | undefined): string | null {
  // Meta uses 0 to mean "never expires".
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}
