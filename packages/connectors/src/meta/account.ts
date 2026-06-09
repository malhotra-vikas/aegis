import type { RawMetaPull } from '@aegis/risk-engine';
import type { MetaGraphClient } from './client.js';

// Fields read off the AdAccount node. account_status + disable_reason are the
// terminal/leading-indicator core the engine scores; their integer enums are
// mapped against live Meta docs inside the risk-engine adapter, never here — the
// connector passes the raw integer through untouched (spec 4 accuracy contract).
const AD_ACCOUNT_FIELDS = 'account_status,disable_reason';

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

  return {
    account_status: account.account_status,
    disable_reason: account.disable_reason ?? null,
  };
}
