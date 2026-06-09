import 'reflect-metadata';
import type { PrismaClient } from '@aegis/db';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService.withOrg', () => {
  it('sets the tenant GUC inside the transaction, then runs the callback with the tx client', async () => {
    const executeRaw = vi.fn(async () => 1);
    const tx = { $executeRaw: executeRaw };
    const client = { $transaction: vi.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)) };

    const svc = new PrismaService(client as unknown as PrismaClient);
    const result = await svc.withOrg('org_123', async (t) => {
      expect(t).toBe(tx);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(client.$transaction).toHaveBeenCalledOnce();
    const [strings, ...values] = executeRaw.mock.calls[0]! as [TemplateStringsArray, ...unknown[]];
    expect(strings.join('?')).toContain('set_config');
    expect(strings.join('?')).toContain('app.current_org_id');
    expect(values).toContain('org_123');
  });
});
