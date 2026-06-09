import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { WorkosAuthGuard } from '../auth/workos-auth.guard.js';
import { CurrentOrg } from '../tenant/current-org.decorator.js';
import type { TenantRequest } from '../tenant/tenant-request.js';

@Controller('me')
@UseGuards(WorkosAuthGuard)
export class MeController {
  // Echoes the resolved tenant context — the simplest proof that auth + org
  // provisioning worked end-to-end.
  @Get()
  me(@CurrentOrg() orgId: string, @Req() req: TenantRequest): { orgId: string; userId: string | null } {
    return { orgId, userId: req.userId ?? null };
  }
}
