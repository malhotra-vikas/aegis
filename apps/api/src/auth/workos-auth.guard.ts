import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { TenantRequest } from '../tenant/tenant-request.js';
import { IdentityService } from './identity.service.js';
import { WorkosAuthService } from './workos-auth.service.js';

/**
 * Authenticates a request and sets the tenant context (req.orgId, req.userId).
 * Apply to routes that act on tenant data. Verifies the WorkOS bearer token,
 * then resolves/provisions the org.
 *
 * Local-dev bypass: if AEGIS_DEV_ORG_ID is set (and not production), the request
 * is scoped to that org without a token — so local runs and tests don't need
 * WorkOS. The bypass is impossible in production.
 */
@Injectable()
export class WorkosAuthGuard implements CanActivate {
  constructor(
    private readonly workos: WorkosAuthService,
    private readonly identity: IdentityService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<TenantRequest>();

    const devOrgId = process.env.AEGIS_DEV_ORG_ID;
    if (devOrgId && process.env.NODE_ENV !== 'production') {
      req.orgId = devOrgId;
      return true;
    }

    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('missing bearer token');
    }
    const principal = await this.workos.verify(header.slice('Bearer '.length));
    req.orgId = await this.identity.resolveOrgId(principal);
    req.userId = principal.workosUserId;
    return true;
  }
}
