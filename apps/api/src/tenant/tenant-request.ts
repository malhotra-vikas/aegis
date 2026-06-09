import type { Request } from 'express';

/** Request augmented with the resolved tenant + user, set by WorkosAuthGuard. */
export interface TenantRequest extends Request {
  orgId?: string;
  userId?: string;
}
