import 'reflect-metadata';
import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IdentityService } from './identity.service.js';
import { WorkosAuthGuard } from './workos-auth.guard.js';
import type { WorkosAuthService } from './workos-auth.service.js';

interface FakeReq {
  headers: Record<string, string>;
  orgId?: string;
  userId?: string;
}

function makeCtx(headers: Record<string, string> = {}) {
  const req: FakeReq = { headers };
  const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
  return { ctx, req };
}

const noService = {} as unknown as WorkosAuthService;
const noIdentity = {} as unknown as IdentityService;

afterEach(() => {
  delete process.env.AEGIS_DEV_ORG_ID;
});

describe('WorkosAuthGuard', () => {
  it('uses the dev bypass when AEGIS_DEV_ORG_ID is set', async () => {
    process.env.AEGIS_DEV_ORG_ID = 'org_dev';
    const { ctx, req } = makeCtx();
    expect(await new WorkosAuthGuard(noService, noIdentity).canActivate(ctx)).toBe(true);
    expect(req.orgId).toBe('org_dev');
  });

  it('401s when there is no bearer token and no bypass', async () => {
    const { ctx } = makeCtx();
    await expect(new WorkosAuthGuard(noService, noIdentity).canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifies the token and resolves the org', async () => {
    const workos = { verify: vi.fn(async () => ({ workosOrgId: 'o', workosUserId: 'u' })) } as unknown as WorkosAuthService;
    const identity = { resolveOrgId: vi.fn(async () => 'org_db') } as unknown as IdentityService;
    const { ctx, req } = makeCtx({ authorization: 'Bearer abc.def.ghi' });

    expect(await new WorkosAuthGuard(workos, identity).canActivate(ctx)).toBe(true);
    expect(req.orgId).toBe('org_db');
    expect(req.userId).toBe('u');
  });
});
