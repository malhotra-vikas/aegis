// The Meta platform adapter: catalog + normalize(). normalize() maps a raw
// Graph API pull into the engine's normalized MetaSnapshotInput. The scoring
// math never touches raw payloads.

import type { PlatformAdapter } from '../../types.js';
import { META_V1_CATALOG } from './catalog.js';
import type { MetaAccountStatus, MetaSnapshotInput } from './input.js';

/** Scoring model version, stamped onto every snapshot (spec 1 #5, 7.1). */
export const META_MODEL_VERSION = 'aegis-meta-rules-v0.1';

/**
 * Raw Meta account_status integer -> normalized status.
 *
 * ⚠️ VERIFY AGAINST LIVE META DOCS BEFORE IMPLEMENTATION (spec 4 accuracy
 * contract). These integer meanings change and must NOT be trusted from memory.
 * This table is the single place to correct when the mapping is verified;
 * detection depends only on the normalized MetaAccountStatus, never on the int.
 */
export const META_ACCOUNT_STATUS_MAP: Record<number, MetaAccountStatus> = {
  1: 'active', // ACTIVE
  2: 'disabled', // DISABLED
  3: 'disabled', // UNSETTLED
  7: 'pending_review', // PENDING_RISK_REVIEW — the key leading indicator
  8: 'grace_limited', // PENDING_SETTLEMENT
  9: 'grace_limited', // IN_GRACE_PERIOD
  100: 'disabled', // PENDING_CLOSURE
  101: 'disabled', // CLOSED
};

/** Loose shape of the fields we read from a Meta pull. All optional: a partial
 * pull marks the missing required fields and fails closed. */
export interface RawMetaPull {
  account_status?: number;
  disable_reason?: string | number | null;
  disapproved_active_ad_count?: number;
  restricted_category_active?: boolean;
  payment_failure?: boolean;
  payment_method_risk?: boolean;
  linked_disabled_account?: boolean;
  automation_risk?: { detected: boolean; confidence: number } | null;
  business_verification_incomplete?: boolean;
  linked_page_restricted?: boolean;
  circumventing_systems?: boolean;
}

/** account_status is the one field the catalog cannot proceed without. */
const REQUIRED_FIELDS = ['account_status'] as const;

export function normalizeMeta(raw: unknown): MetaSnapshotInput {
  const pull = (raw ?? {}) as RawMetaPull;
  const missingRequiredFields: string[] = [];

  let accountStatus: MetaAccountStatus = 'unknown';
  if (typeof pull.account_status === 'number') {
    accountStatus = META_ACCOUNT_STATUS_MAP[pull.account_status] ?? 'unknown';
  } else {
    missingRequiredFields.push('account_status');
  }

  return {
    platform: 'meta',
    missingRequiredFields,
    accountStatus,
    disableReason: pull.disable_reason == null ? null : String(pull.disable_reason),
    disapprovedActiveAdCount: pull.disapproved_active_ad_count ?? 0,
    restrictedCategoryActive: pull.restricted_category_active ?? false,
    paymentFailure: pull.payment_failure ?? false,
    paymentMethodRisk: pull.payment_method_risk ?? false,
    linkedDisabledAccount: pull.linked_disabled_account ?? false,
    automationRisk: pull.automation_risk ?? undefined,
    businessVerificationIncomplete: pull.business_verification_incomplete ?? false,
    linkedPageRestricted: pull.linked_page_restricted ?? false,
    circumventingSystems: pull.circumventing_systems ?? false,
  };
}

export const metaAdapter: PlatformAdapter<MetaSnapshotInput> = {
  platform: 'meta',
  modelVersion: META_MODEL_VERSION,
  definitions: META_V1_CATALOG,
  normalize: normalizeMeta,
};

export { META_V1_CATALOG } from './catalog.js';
export type { MetaSnapshotInput, MetaAccountStatus, MetaAutomationRisk } from './input.js';
export { REQUIRED_FIELDS as META_REQUIRED_FIELDS };
