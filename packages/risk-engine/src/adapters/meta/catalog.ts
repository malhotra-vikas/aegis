// Meta v1 signal catalog. One SignalDefinition per row in
// AEGIS_RISK_ENGINE_SPEC.md section 4. Weights/severities are v0.1 informed
// priors (spec 11 #3), not tuned values — the starting point for calibration
// once outcome data accrues. remediationId values match
// AEGIS_REMEDIATION_PLAYBOOKS.md section 5 exactly.

import type { DetectedSignal, SignalDefinition } from '../../types.js';
import type { MetaSnapshotInput } from './input.js';

type MetaSignal = SignalDefinition<MetaSnapshotInput>;

/** Small helper to keep each definition focused on its detect rule. */
function signal(def: MetaSignal): MetaSignal {
  return def;
}

function detected(
  def: MetaSignal,
  fields: { severity?: DetectedSignal['severity']; confidence?: number; evidence: Record<string, unknown>; explanation: string },
): DetectedSignal {
  return {
    definitionId: def.id,
    category: def.category,
    severity: fields.severity ?? def.defaultSeverity,
    confidence: fields.confidence ?? 1.0,
    evidence: fields.evidence,
    explanation: fields.explanation,
  };
}

// ---------- Status (terminal class) ----------

const accountDisabled: MetaSignal = signal({
  id: 'meta.account_disabled',
  platform: 'meta',
  category: 'status',
  weight: 100,
  defaultSeverity: 'critical',
  terminal: true,
  terminalFloor: 100,
  remediationId: 'recovery.meta.disabled',
  detect(input) {
    if (input.accountStatus !== 'disabled') return null;
    return detected(this, {
      evidence: { accountStatus: input.accountStatus, disableReason: input.disableReason ?? null },
      explanation: 'This ad account is disabled. Active ads are paused and billing is stopped.',
    });
  },
});

const accountPendingReview: MetaSignal = signal({
  id: 'meta.account_pending_review',
  platform: 'meta',
  category: 'status',
  weight: 55,
  defaultSeverity: 'critical',
  terminal: true,
  terminalFloor: 90,
  remediationId: 'prevent.meta.pending_review',
  detect(input) {
    if (input.accountStatus !== 'pending_review') return null;
    return detected(this, {
      evidence: { accountStatus: input.accountStatus },
      explanation:
        'This account is in a risk-review state. This is the window before a possible disable and the best moment to act.',
    });
  },
});

const accountGracePeriod: MetaSignal = signal({
  id: 'meta.account_grace_period',
  platform: 'meta',
  category: 'status',
  weight: 45,
  defaultSeverity: 'warning',
  remediationId: 'prevent.meta.grace',
  detect(input) {
    if (input.accountStatus !== 'grace_limited') return null;
    return detected(this, {
      evidence: { accountStatus: input.accountStatus },
      explanation: 'This account is in a limited or grace state. Spend or functionality is restricted.',
    });
  },
});

// ---------- Policy ----------

const adDisapprovalsMinor: MetaSignal = signal({
  id: 'meta.ad_disapprovals_minor',
  platform: 'meta',
  category: 'policy',
  weight: 30,
  defaultSeverity: 'warning',
  remediationId: 'policy.meta.disapproval',
  detect(input) {
    const n = input.disapprovedActiveAdCount;
    if (n < 1 || n > 2) return null;
    return detected(this, {
      evidence: { disapprovedActiveAdCount: n },
      explanation: `${n} active ad${n === 1 ? ' is' : 's are'} disapproved. A few are routine, but a rising count raises account risk.`,
    });
  },
});

const adDisapprovalsMajor: MetaSignal = signal({
  id: 'meta.ad_disapprovals_major',
  platform: 'meta',
  category: 'policy',
  weight: 45,
  defaultSeverity: 'critical',
  remediationId: 'policy.meta.disapproval',
  detect(input) {
    const n = input.disapprovedActiveAdCount;
    if (n < 3) return null;
    return detected(this, {
      evidence: { disapprovedActiveAdCount: n },
      explanation: `${n} active ads are disapproved. A disapproval cluster signals an account-level standing risk.`,
    });
  },
});

const restrictedCategoryActive: MetaSignal = signal({
  id: 'meta.restricted_category_active',
  platform: 'meta',
  category: 'policy',
  weight: 35,
  defaultSeverity: 'warning',
  remediationId: 'policy.meta.restricted',
  detect(input) {
    if (!input.restrictedCategoryActive) return null;
    return detected(this, {
      evidence: { restrictedCategoryActive: true },
      explanation:
        'This account is running in a restricted vertical without whitelisting, which carries elevated suspension risk.',
    });
  },
});

// ---------- Payment ----------

const paymentFailure: MetaSignal = signal({
  id: 'meta.payment_failure',
  platform: 'meta',
  category: 'payment',
  weight: 40,
  defaultSeverity: 'warning',
  remediationId: 'payment.meta.failure',
  detect(input) {
    if (!input.paymentFailure) return null;
    return detected(this, {
      evidence: { paymentFailure: true },
      explanation: 'A payment failed or was declined. Delivery pauses and, left unresolved, this can trigger account holds.',
    });
  },
});

const paymentMethodRisk: MetaSignal = signal({
  id: 'meta.payment_method_risk',
  platform: 'meta',
  category: 'payment',
  weight: 25,
  defaultSeverity: 'info',
  remediationId: 'payment.meta.method',
  detect(input) {
    if (!input.paymentMethodRisk) return null;
    return detected(this, {
      evidence: { paymentMethodRisk: true },
      explanation: 'The funding source carries risk signals (high-risk region or mismatched billing) that raise baseline risk.',
    });
  },
});

// ---------- Linkage (inferred) ----------

const linkedDisabledAccount: MetaSignal = signal({
  id: 'meta.linked_disabled_account',
  platform: 'meta',
  category: 'linkage',
  weight: 50,
  defaultSeverity: 'critical',
  remediationId: 'linkage.meta.shared',
  detect(input) {
    if (!input.linkedDisabledAccount) return null;
    // Inferred from a shared payment/identity graph — not directly observed.
    return detected(this, {
      confidence: 0.6,
      evidence: { linkedDisabledAccount: true },
      explanation:
        'This account appears linked (shared payment method or identity) to a previously disabled account, a strong enforcement trigger.',
    });
  },
});

// ---------- Automation (inferred, derived confidence) ----------

const apiRatePatternRisk: MetaSignal = signal({
  id: 'meta.api_rate_pattern_risk',
  platform: 'meta',
  category: 'automation',
  weight: 30,
  defaultSeverity: 'warning',
  remediationId: 'automation.meta.throttle',
  detect(input) {
    const risk = input.automationRisk;
    if (!risk?.detected) return null;
    // Confidence is derived from observed change velocity (spec 11 #2),
    // clamped to the documented 0.5..0.8 inferred range.
    const confidence = Math.min(0.8, Math.max(0.5, risk.confidence));
    return detected(this, {
      confidence,
      evidence: { automationRisk: true, derivedConfidence: confidence },
      explanation:
        "This account's change patterns look automated or abusive to Meta's risk system (rapid budget edits or bulk updates).",
    });
  },
});

// ---------- Verification ----------

const businessVerificationIncomplete: MetaSignal = signal({
  id: 'meta.business_verification_incomplete',
  platform: 'meta',
  category: 'verification',
  weight: 25,
  defaultSeverity: 'info',
  remediationId: 'verification.meta.incomplete',
  detect(input) {
    if (!input.businessVerificationIncomplete) return null;
    return detected(this, {
      evidence: { businessVerificationIncomplete: true },
      explanation: 'Business verification is incomplete or inconsistent, which lengthens suspensions and raises baseline risk.',
    });
  },
});

// ---------- Page ----------

const linkedPageRestricted: MetaSignal = signal({
  id: 'meta.linked_page_restricted',
  platform: 'meta',
  category: 'page',
  weight: 45,
  defaultSeverity: 'critical',
  remediationId: 'page.meta.restricted',
  detect(input) {
    if (!input.linkedPageRestricted) return null;
    return detected(this, {
      evidence: { linkedPageRestricted: true },
      explanation: 'A connected page is restricted for organic violations, and the restriction can pull in the ad account.',
    });
  },
});

// ---------- Circumvention (terminal class) ----------

const circumventingSystems: MetaSignal = signal({
  id: 'meta.circumventing_systems',
  platform: 'meta',
  category: 'circumvention',
  weight: 100,
  defaultSeverity: 'critical',
  terminal: true,
  terminalFloor: 95,
  remediationId: 'circumvention.meta',
  detect(input) {
    if (!input.circumventingSystems) return null;
    return detected(this, {
      evidence: { circumventingSystems: true },
      explanation:
        "A circumventing-systems or Business-Manager-level restriction is present — one of Meta's most severe enforcement actions.",
    });
  },
});

/** The full Meta v1 catalog, in spec order. */
export const META_V1_CATALOG: MetaSignal[] = [
  accountDisabled,
  accountPendingReview,
  accountGracePeriod,
  adDisapprovalsMinor,
  adDisapprovalsMajor,
  restrictedCategoryActive,
  paymentFailure,
  paymentMethodRisk,
  linkedDisabledAccount,
  apiRatePatternRisk,
  businessVerificationIncomplete,
  linkedPageRestricted,
  circumventingSystems,
];
