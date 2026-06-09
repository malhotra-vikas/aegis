import type { RawMetaPull } from '@aegis/risk-engine';
import type { MetaGraphClient } from './client.js';

// Fields read off the AdAccount node. account_status + disable_reason are the
// terminal/leading-indicator core the engine scores; their integer enums are
// mapped against live Meta docs inside the risk-engine adapter, never here — the
// connector passes the raw integer through untouched (spec 4 accuracy contract).
const AD_ACCOUNT_FIELDS = 'account_status,disable_reason';
const ACCOUNT_STATUS_ACTIVE = 1; // Meta's ACTIVE code; the only state worth (and able) to query for ad-level issues

interface MetaAdAccountNode {
  account_status?: number;
  disable_reason?: number | string | null;
}

/**
 * Pull an ad account's risk-relevant fields into the engine's RawMetaPull shape.
 *
 * This is a partial pull by design: the remaining RawMetaPull fields (disapproved
 * ad counts, payment, verification, page, linkage) come from separate Graph edges
 * wired in later phases. The engine fails closed on what's absent — it never
 * scores an incomplete pull green.
 */
export async function fetchAdAccountPull(
  client: MetaGraphClient,
  opts: { adAccountId: string; accessToken: string },
): Promise<RawMetaPull> {
  const node = `${opts.adAccountId.startsWith('act_') ? '' : 'act_'}${opts.adAccountId}`;
  const account = await client.get<MetaAdAccountNode>(node, {
    accessToken: opts.accessToken,
    params: { fields: AD_ACCOUNT_FIELDS },
  });

  const pull: RawMetaPull = {
    account_status: account.account_status,
    disable_reason: account.disable_reason ?? null,
  };

  // Ad-level policy signals only resolve for a live account; for a disabled/closed
  // one the status signal already dominates and the /ads edge errors anyway. Errors
  // here propagate — we never default a failed read to "0 disapprovals" (fail closed:
  // a read we couldn't complete must not look healthy).
  if (account.account_status === ACCOUNT_STATUS_ACTIVE) {
    pull.disapproved_active_ad_count = await fetchDisapprovedAdCount(client, node, opts.accessToken);
  }

  return pull;
}

/** Count of currently-disapproved ads, via the ads edge's summary total_count. */
async function fetchDisapprovedAdCount(client: MetaGraphClient, node: string, accessToken: string): Promise<number> {
  const res = await client.get<{ summary?: { total_count?: number } }>(`${node}/ads`, {
    accessToken,
    params: { effective_status: '["DISAPPROVED"]', summary: 'total_count', limit: '0' },
  });
  return res.summary?.total_count ?? 0;
}

interface MetaAdAccountsEdge {
  data?: Array<{ id?: string; account_id?: string; name?: string }>;
}

/** List the ad accounts a token grants access to (the connect flow: the user
 *  picks which to monitor). `id` is the `act_<n>` form used as externalId. */
export async function fetchAdAccounts(
  client: MetaGraphClient,
  opts: { accessToken: string },
): Promise<Array<{ externalId: string; displayName: string | null }>> {
  const edge = await client.get<MetaAdAccountsEdge>('me/adaccounts', {
    accessToken: opts.accessToken,
    params: { fields: 'account_id,name' },
  });
  return (edge.data ?? []).map((a) => ({
    externalId: a.id ?? `act_${a.account_id ?? ''}`,
    displayName: a.name ?? null,
  }));
}
