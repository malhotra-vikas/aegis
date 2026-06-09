import { metaAdapter } from '@aegis/risk-engine';
import { describe, expect, it, vi } from 'vitest';
import { fetchAdAccountPull, fetchAdAccounts } from './account.js';
import { MetaGraphClient } from './client.js';

function clientReturning(node: unknown) {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify(node), { status: 200 }));
  const c = new MetaGraphClient({ appSecret: 's', graphVersion: 'v21.0', fetchImpl: fetchImpl as unknown as typeof fetch });
  return { c, fetchImpl };
}

describe('fetchAdAccountPull', () => {
  it('requests the risk-relevant fields and maps them into RawMetaPull', async () => {
    const { c, fetchImpl } = clientReturning({ account_status: 7, disable_reason: 3 });
    const pull = await fetchAdAccountPull(c, { adAccountId: 'act_123', accessToken: 't' });

    expect(String(fetchImpl.mock.calls[0]![0])).toContain('fields=account_status%2Cdisable_reason');
    expect(pull).toEqual({ account_status: 7, disable_reason: 3 });
  });

  it('prefixes a bare account id with act_', async () => {
    const { c, fetchImpl } = clientReturning({ account_status: 1 });
    await fetchAdAccountPull(c, { adAccountId: '999', accessToken: 't' });
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('/v21.0/act_999');
  });

  it('defaults a missing disable_reason to null', async () => {
    const { c } = clientReturning({ account_status: 1 });
    const pull = await fetchAdAccountPull(c, { adAccountId: 'act_1', accessToken: 't' });
    expect(pull.disable_reason).toBeNull();
  });

  it('produces a pull the risk engine can normalize (contract check)', async () => {
    const { c } = clientReturning({ account_status: 7 }); // PENDING_RISK_REVIEW
    const pull = await fetchAdAccountPull(c, { adAccountId: 'act_1', accessToken: 't' });
    const normalized = metaAdapter.normalize(pull);
    expect(normalized.accountStatus).toBe('pending_review');
    expect(normalized.missingRequiredFields).toEqual([]);
  });
});

describe('fetchAdAccounts', () => {
  it('maps the me/adaccounts edge to externalId + displayName', async () => {
    const { c, fetchImpl } = clientReturning({
      data: [
        { id: 'act_111', account_id: '111', name: 'Acme' },
        { id: 'act_222', account_id: '222', name: 'Beta' },
      ],
    });
    const accounts = await fetchAdAccounts(c, { accessToken: 't' });
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('/v21.0/me/adaccounts');
    expect(accounts).toEqual([
      { externalId: 'act_111', displayName: 'Acme' },
      { externalId: 'act_222', displayName: 'Beta' },
    ]);
  });

  it('returns an empty list when the edge has no data', async () => {
    const { c } = clientReturning({});
    expect(await fetchAdAccounts(c, { accessToken: 't' })).toEqual([]);
  });
});
