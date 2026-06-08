// The normalized Meta snapshot input. The catalog's detect() functions read
// ONLY these fields, never the raw Graph API payload. The adapter's normalize()
// (input.ts is the type; normalize lives in index.ts) maps a raw pull into this.
//
// See AEGIS_RISK_ENGINE_SPEC.md section 4 for the field-to-signal mapping.

import type { PlatformSnapshotInput } from '../../types.js';

/**
 * Normalized account status.
 *
 * IMPORTANT (spec 4 accuracy contract): Meta's integer `account_status` /
 * `disable_reason` enums change and must be mapped against LIVE Meta docs at
 * implementation time, never from memory. The mapping lives in
 * META_ACCOUNT_STATUS_MAP (index.ts) and is the only place that needs to change
 * when the enum mapping is verified/updated. Detection depends only on this
 * normalized type, so the catalog is insulated from enum churn.
 */
export type MetaAccountStatus =
  | 'active'
  | 'disabled' // disabled / unsettled / closed — terminal
  | 'pending_review' // in risk review — the key leading indicator
  | 'grace_limited' // grace / limited / spend-capped
  | 'unknown'; // could not be determined from the pull

/** Detected automation-pattern risk, with a derived confidence (spec 11 #2). */
export interface MetaAutomationRisk {
  detected: boolean;
  /** 0.5..0.8, derived from observed change velocity; higher = more confident. */
  confidence: number;
}

export interface MetaSnapshotInput extends PlatformSnapshotInput {
  platform: 'meta';

  // --- Status (terminal class) ---
  accountStatus: MetaAccountStatus;
  disableReason?: string | null;

  // --- Policy ---
  /** Count of currently-disapproved active ads. */
  disapprovedActiveAdCount: number;
  /** Running a restricted vertical (crypto, supplements, gambling, etc.) without whitelist. */
  restrictedCategoryActive: boolean;

  // --- Payment ---
  paymentFailure: boolean;
  paymentMethodRisk: boolean;

  // --- Linkage (inferred) ---
  linkedDisabledAccount: boolean;

  // --- Automation (inferred, derived confidence) ---
  automationRisk?: MetaAutomationRisk;

  // --- Verification ---
  businessVerificationIncomplete: boolean;

  // --- Page ---
  linkedPageRestricted: boolean;

  // --- Circumvention (terminal class) ---
  circumventingSystems: boolean;
}
