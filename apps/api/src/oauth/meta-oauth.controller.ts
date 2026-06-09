import { Controller, Get, Logger, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { WorkosAuthGuard } from '../auth/workos-auth.guard.js';
import { webBaseUrl } from '../config/env.js';
import { CurrentOrg } from '../tenant/current-org.decorator.js';
import { MetaOAuthService } from './meta-oauth.service.js';
import { signState, verifyState } from './oauth-state.js';

@Controller('oauth/meta')
export class MetaOAuthController {
  private readonly logger = new Logger('MetaOAuth');

  constructor(private readonly oauth: MetaOAuthService) {}

  // Begin the connect flow. Requires the WorkOS session; the org is bound into a
  // signed state param the callback verifies (no cookie — survives the
  // web->api->Meta->api hop).
  @Get('start')
  @UseGuards(WorkosAuthGuard)
  start(@CurrentOrg() orgId: string): { authorizationUrl: string } {
    return { authorizationUrl: this.oauth.authorizationUrl(signState(orgId)) };
  }

  // Meta redirects here with ?code&state (or ?error if the user declined). We
  // verify the signed state, run the exchange+store, then bounce the browser
  // back to the web app with the outcome.
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const web = webBaseUrl();
    try {
      if (error || !code || !state) throw new Error(`oauth declined or missing params (${error ?? 'no code/state'})`);
      const { orgId } = verifyState(state);
      const { connectedAccountIds } = await this.oauth.handleCallback(orgId, code);
      res.redirect(`${web}/app?meta=connected&accounts=${connectedAccountIds.length}`);
    } catch (e) {
      // Log the detail server-side; never put it in the redirect URL.
      this.logger.error(e instanceof Error ? e.message : String(e));
      res.redirect(`${web}/app?meta=error`);
    }
  }
}
