import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from 'jose';
import { workosConfig } from '../config/env.js';

export interface WorkosPrincipal {
  workosOrgId: string;
  workosUserId: string;
  email?: string;
  name?: string;
}

type KeyResolver = Parameters<typeof jwtVerify>[1];

/**
 * Verifies WorkOS AuthKit access tokens (JWTs) against the WorkOS JWKS, so the
 * api trusts a cryptographically-verified principal rather than the cookie
 * (docs/design/AUTH.md). The `keys` constructor arg is for tests; production
 * resolves the remote JWKS lazily.
 */
@Injectable()
export class WorkosAuthService {
  private keys?: KeyResolver;

  constructor(@Optional() keys?: KeyResolver) {
    this.keys = keys;
  }

  private resolveKeys(): KeyResolver {
    return (this.keys ??= createRemoteJWKSet(new URL(workosConfig().jwksUrl)));
  }

  async verify(token: string): Promise<WorkosPrincipal> {
    let payload: JWTPayload;
    try {
      const options = process.env.WORKOS_ISSUER ? { issuer: process.env.WORKOS_ISSUER } : {};
      ({ payload } = await jwtVerify(token, this.resolveKeys(), options));
    } catch {
      // Never echo the token or the underlying jose error.
      throw new UnauthorizedException('invalid token');
    }

    const workosOrgId = typeof payload.org_id === 'string' ? payload.org_id : undefined;
    const workosUserId = payload.sub;
    if (!workosOrgId || !workosUserId) {
      throw new UnauthorizedException('token missing organization or subject');
    }
    return {
      workosOrgId,
      workosUserId,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  }
}
