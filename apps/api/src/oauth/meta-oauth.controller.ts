import { randomBytes } from 'node:crypto';
import { BadRequestException, Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { WorkosAuthGuard } from '../auth/workos-auth.guard.js';
import { CurrentOrg } from '../tenant/current-org.decorator.js';
import type { TenantRequest } from '../tenant/tenant-request.js';
import { MetaOAuthService } from './meta-oauth.service.js';

const STATE_COOKIE = 'meta_oauth_state';

@Controller('oauth/meta')
export class MetaOAuthController {
  constructor(private readonly oauth: MetaOAuthService) {}

  // Begin the connect flow. The CSRF state and the initiating org are bound into
  // an httpOnly cookie; the callback verifies both.
  @Get('start')
  @UseGuards(WorkosAuthGuard)
  start(@CurrentOrg() orgId: string, @Res({ passthrough: true }) res: Response): { authorizationUrl: string } {
    const state = randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, `${orgId}:${state}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
    });
    return { authorizationUrl: this.oauth.authorizationUrl(state) };
  }

  // Meta redirects here with ?code&state. The org comes from the state cookie
  // (bound at start), so the redirect need not carry app auth.
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: TenantRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ connectedAccountIds: string[] }> {
    const bound = parseCookie(req.headers.cookie, STATE_COOKIE);
    if (!bound) throw new BadRequestException('missing oauth state');
    const [orgId, expectedState] = bound.split(':');
    if (!code || !state || !orgId || state !== expectedState) {
      throw new BadRequestException('invalid oauth state');
    }
    res.clearCookie(STATE_COOKIE);
    return this.oauth.handleCallback(orgId, code);
  }
}

/** Read a single cookie value from a raw Cookie header (avoids a cookie-parser dep). */
function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}
