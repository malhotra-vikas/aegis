import {
  buildAuthorizationUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchAdAccounts,
  inspectToken,
  MetaGraphClient,
} from '@aegis/connectors';
import { SnapshotReason } from '@aegis/db';
import type { TokenBundle } from '@aegis/shared';
import { Injectable, Logger } from '@nestjs/common';
import { AssessmentService } from '../assessment/assessment.service.js';
import { metaConfig, type MetaConfig } from '../config/env.js';
import { CredentialsService } from '../credentials/credentials.service.js';

/**
 * Drives the Meta connect flow: authorization URL on `start`, and on `callback`
 * exchange code → long-lived token → inspect scopes/expiry → enumerate granted
 * ad accounts → store an envelope-encrypted credential per account.
 *
 * This is account-data authorization, not app sign-in (see docs/design/AUTH.md).
 */
@Injectable()
export class MetaOAuthService {
  private cfg?: MetaConfig;
  private readonly logger = new Logger('MetaOAuth');

  constructor(
    private readonly credentials: CredentialsService,
    private readonly assessment: AssessmentService,
  ) {}

  private config(): MetaConfig {
    return (this.cfg ??= metaConfig());
  }

  authorizationUrl(state: string): string {
    const cfg = this.config();
    return buildAuthorizationUrl(cfg, { redirectUri: cfg.redirectUri, state, scopes: cfg.scopes });
  }

  async handleCallback(orgId: string, code: string): Promise<{ connectedAccountIds: string[] }> {
    const cfg = this.config();
    const short = await exchangeCodeForToken(cfg, { code, redirectUri: cfg.redirectUri });
    const longLived = await exchangeForLongLivedToken(cfg, { shortLivedToken: short.accessToken });
    const inspection = await inspectToken(cfg, { token: longLived.accessToken });

    const client = new MetaGraphClient({ appSecret: cfg.appSecret, graphVersion: cfg.graphVersion });
    const accounts = await fetchAdAccounts(client, { accessToken: longLived.accessToken });

    const bundle: TokenBundle = {
      accessToken: longLived.accessToken,
      tokenType: 'USER_LONG_LIVED', // quick path; system-user tokens come later for Agency/Scale
      scopes: inspection.scopes,
      expiresAt: inspection.expiresAt,
      dataAccessExpiresAt: inspection.dataAccessExpiresAt,
      grantedAccountIds: accounts.map((a) => a.externalId),
    };

    const connectedAccountIds: string[] = [];
    for (const account of accounts) {
      connectedAccountIds.push(await this.credentials.storeMetaCredential(orgId, account, bundle));
    }

    // Score the freshly-connected accounts so the dashboard has data immediately.
    // Non-fatal: the connection already succeeded if scoring hiccups.
    try {
      await this.assessment.assessOrg(orgId, SnapshotReason.INITIAL);
    } catch (e) {
      this.logger.error(`initial assessment failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { connectedAccountIds };
  }
}
