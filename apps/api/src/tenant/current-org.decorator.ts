import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { TenantRequest } from './tenant-context.middleware.js';

/** Injects the resolved tenant orgId, or 401s if the request has no tenant context. */
export const CurrentOrg = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<TenantRequest>();
  if (!req.orgId) throw new UnauthorizedException('no tenant context');
  return req.orgId;
});
