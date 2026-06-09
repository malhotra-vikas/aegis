import { createHmac } from 'node:crypto';

// Rate-limit-aware Meta Graph API client (AEGIS_OAUTH_SECURITY §8). Three things
// this must get right, because our own polling must never become the abusive
// pattern that gets a customer's account flagged:
//   - appsecret_proof on every call (§4 #3) — a leaked token alone can't be replayed;
//   - respect X-Business-Use-Case-Usage and back off before we hit a hard limit;
//   - exponential backoff + jitter on transient/rate-limit errors.
// The access token rides in the Authorization header, never the URL, so it can't
// leak through query strings in logs or proxies. Tokens never appear in errors.

const DEFAULT_BASE_URL = 'https://graph.facebook.com';
const MAX_BACKOFF_MS = 30_000;

/** Parsed worst-case usage across every business-use-case bucket in the header. */
export interface BusinessUseCaseUsage {
  /** Highest of call-count / cpu-time / total-time percentages (0–100+). */
  usagePct: number;
  /** Minutes Meta says we must wait to regain access; 0 when not throttled. */
  estimatedTimeToRegainAccessMin: number;
}

export interface MetaGraphClientOptions {
  appSecret: string;
  /** Pinned Graph API version, e.g. "v21.0". Required: pin explicitly and track
   *  the deprecation schedule rather than relying on a default (§8). */
  graphVersion: string;
  baseUrl?: string;
  maxRetries?: number;
  baseBackoffMs?: number;
  /** Pre-emptively slow down once usage crosses this percentage. */
  usageThrottleThresholdPct?: number;
  // Injectable seams for tests.
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

interface MetaErrorBody {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export class MetaApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly subcode?: number;
  readonly fbtraceId?: string;
  /** Auth/permission failure — caller should mark the account assessable=false
   *  and raise a risk event, not retry (locked decision: a lost/invalid token is
   *  a risk event). */
  readonly isAuthError: boolean;
  readonly retryable: boolean;
  /** When rate-limited, how long Meta suggests waiting before retrying (ms). */
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    opts: {
      status: number;
      code?: number;
      subcode?: number;
      fbtraceId?: string;
      isAuthError?: boolean;
      retryable?: boolean;
      retryAfterMs?: number;
    },
  ) {
    super(message);
    this.name = 'MetaApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.subcode = opts.subcode;
    this.fbtraceId = opts.fbtraceId;
    this.isAuthError = opts.isAuthError ?? false;
    this.retryable = opts.retryable ?? false;
    this.retryAfterMs = opts.retryAfterMs;
  }
}

export class MetaGraphClient {
  private readonly appSecret: string;
  private readonly graphVersion: string;
  private readonly baseUrl: string;
  private readonly allowedHost: string;
  private readonly maxRetries: number;
  private readonly baseBackoffMs: number;
  private readonly throttleThresholdPct: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  /** Worst-case usage from the most recent response; null until the first call. */
  lastUsage: BusinessUseCaseUsage | null = null;

  constructor(opts: MetaGraphClientOptions) {
    this.appSecret = opts.appSecret;
    this.graphVersion = opts.graphVersion;
    this.baseUrl = opts.baseUrl ?? DEFAULT_BASE_URL;
    this.allowedHost = new URL(this.baseUrl).host;
    this.maxRetries = opts.maxRetries ?? 4;
    this.baseBackoffMs = opts.baseBackoffMs ?? 500;
    this.throttleThresholdPct = opts.usageThrottleThresholdPct ?? 90;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? defaultSleep;
    this.random = opts.random ?? Math.random;
  }

  async get<T>(path: string, opts: { accessToken: string; params?: Record<string, string> }): Promise<T> {
    // If the previous call left us near the limit, slow down before the next one.
    if (this.lastUsage && this.lastUsage.usagePct >= this.throttleThresholdPct) {
      await this.sleep(this.backoffMs(1));
    }

    const url = this.buildUrl(path, opts.params, opts.accessToken);
    let lastError: MetaApiError | undefined;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          headers: { Authorization: `Bearer ${opts.accessToken}` },
        });
      } catch {
        // Network-level failure — transient, retry with backoff.
        lastError = new MetaApiError('Meta Graph request failed (network)', { status: 0, retryable: true });
        if (attempt > this.maxRetries) break;
        await this.sleep(this.backoffMs(attempt));
        continue;
      }

      this.lastUsage = parseBusinessUseCaseUsage(response.headers.get('x-business-use-case-usage'));

      if (response.ok) {
        return (await response.json()) as T;
      }

      const error = await this.toError(response);
      if (error.isAuthError || !error.retryable) throw error;
      lastError = error;
      if (attempt > this.maxRetries) break;
      await this.sleep(error.retryAfterMs ?? this.backoffMs(attempt));
    }

    throw lastError ?? new MetaApiError('Meta Graph request exhausted retries', { status: 0, retryable: true });
  }

  private buildUrl(path: string, params: Record<string, string> | undefined, accessToken: string): string {
    const url = new URL(`${this.baseUrl}/${this.graphVersion}/${path.replace(/^\//, '')}`);
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    url.searchParams.set('appsecret_proof', appSecretProof(accessToken, this.appSecret));
    // Egress allowlist (§8): never let a crafted path redirect us off the Graph host.
    if (url.host !== this.allowedHost) {
      throw new Error(`egress blocked: ${url.host} is not the allowed Graph host`);
    }
    return url.toString();
  }

  private async toError(response: Response): Promise<MetaApiError> {
    let body: MetaErrorBody = {};
    try {
      const json = (await response.json()) as { error?: MetaErrorBody };
      body = json.error ?? {};
    } catch {
      // non-JSON error body — fall back to status-only classification
    }
    const retryAfterMs = this.lastUsage?.estimatedTimeToRegainAccessMin
      ? this.lastUsage.estimatedTimeToRegainAccessMin * 60_000
      : undefined;
    return new MetaApiError(body.message ?? `Meta Graph error (HTTP ${response.status})`, {
      status: response.status,
      code: body.code,
      subcode: body.error_subcode,
      fbtraceId: body.fbtrace_id,
      isAuthError: isAuthError(response.status, body.code),
      retryable: isRetryable(response.status, body.code, body.error_subcode),
      retryAfterMs,
    });
  }

  private backoffMs(attempt: number): number {
    const exponential = this.baseBackoffMs * 2 ** (attempt - 1);
    const jittered = exponential * (0.5 + this.random() * 0.5); // full-ish jitter, floored at half
    return Math.min(Math.round(jittered), MAX_BACKOFF_MS);
  }
}

/** HMAC-SHA256 of the access token keyed by the app secret (§4 #3). */
export function appSecretProof(accessToken: string, appSecret: string): string {
  return createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

const AUTH_CODES = new Set([102, 190, 200, 10, 2500]);
const RATE_LIMIT_CODES = new Set([4, 17, 32, 341, 613]);
const RATE_LIMIT_SUBCODES = new Set([2446079, 1487742]);

export function isAuthError(status: number, code?: number): boolean {
  if (status === 401) return true;
  return code !== undefined && AUTH_CODES.has(code);
}

export function isRetryable(status: number, code?: number, subcode?: number): boolean {
  if (status === 429 || status >= 500) return true;
  if (code !== undefined && RATE_LIMIT_CODES.has(code)) return true;
  if (subcode !== undefined && RATE_LIMIT_SUBCODES.has(subcode)) return true;
  return false;
}

/**
 * Parse X-Business-Use-Case-Usage into the single worst-case bucket. Shape:
 * `{ "<business_id>": [{ call_count, total_cputime, total_time,
 *    estimated_time_to_regain_access }, ...] }`.
 */
export function parseBusinessUseCaseUsage(header: string | null): BusinessUseCaseUsage | null {
  if (!header) return null;
  let parsed: Record<string, Array<Record<string, number>>>;
  try {
    parsed = JSON.parse(header);
  } catch {
    return null;
  }
  let usagePct = 0;
  let regain = 0;
  for (const entries of Object.values(parsed)) {
    for (const e of entries ?? []) {
      usagePct = Math.max(usagePct, e.call_count ?? 0, e.total_cputime ?? 0, e.total_time ?? 0);
      regain = Math.max(regain, e.estimated_time_to_regain_access ?? 0);
    }
  }
  return { usagePct, estimatedTimeToRegainAccessMin: regain };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
