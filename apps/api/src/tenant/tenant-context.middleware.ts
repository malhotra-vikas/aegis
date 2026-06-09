import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** Request augmented with the resolved tenant. */
export interface TenantRequest extends Request {
  orgId?: string;
}

/**
 * Resolves the tenant for the request and attaches it as `req.orgId`. Routes that
 * touch tenant data read it via @CurrentOrg() and pass it to PrismaService.withOrg.
 *
 * STUB: the org currently comes from an `x-org-id` header. Real auth (slice 4)
 * resolves it from the session/membership instead — only this resolution step
 * changes; the RLS mechanism downstream stays identical.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction): void {
    const orgId = req.header('x-org-id');
    if (orgId) req.orgId = orgId;
    next();
  }
}
