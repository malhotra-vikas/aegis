# Aegis Risk Engine Specification

> The risk engine is the product IP. This document specifies the scoring model, the Meta signal catalog, the explainability contract, the outcome-capture path to learned scoring, and the test strategy. It governs the `packages/risk-engine` module.

---

## 1. Design principles

1. **Explainable always.** Every score must decompose into the signals that produced it, in plain language. A black-box score does not build trust and does not convert. This constraint shapes every later modeling choice, including the deliberate avoidance of opaque models in v2.
2. **Pure and deterministic.** The engine is a pure function of a snapshot input. No I/O, no network, no time-of-call randomness. Fetching is the connector's job; scoring is the engine's job. This makes it trivially testable and replayable.
3. **Platform-agnostic core, per-platform adapters.** The scoring math is platform-independent. Each platform contributes a signal catalog and a detection adapter. Meta ships in v1; Google and TikTok plug in later without touching the core.
4. **Fail closed.** If key fields could not be fetched, the engine never reports green. It reports the risk it can see and marks the assessment incomplete. A monitoring product that shows "safe" when it actually failed to read the account is the one unforgivable failure.
5. **Versioned.** The scoring model carries a version string, stored on every snapshot, so historical scores remain interpretable after weights change.

---

## 2. Core data contracts

```ts
type Platform = 'meta' | 'google' | 'tiktok';
type Severity = 'info' | 'warning' | 'critical';
type Category =
  | 'policy' | 'payment' | 'linkage'
  | 'automation' | 'verification' | 'page' | 'circumvention' | 'status';
type Bucket = 'green' | 'amber' | 'red';

interface SignalDefinition {
  id: string;                 // e.g. 'meta.payment_failure'
  platform: Platform;
  category: Category;
  weight: number;             // 0..100, max points at full severity + confidence
  defaultSeverity: Severity;
  terminal?: boolean;         // forces red and a score floor
  terminalFloor?: number;     // e.g. 95
  remediationId: string;      // FK into the remediation playbook library
  detect(input: PlatformSnapshotInput): DetectedSignal | null;
}

interface DetectedSignal {
  definitionId: string;
  category: Category;
  severity: Severity;
  confidence: number;         // 0..1, observed = 1.0, inferred < 1.0
  evidence: Record<string, unknown>;  // raw fields that triggered it
  explanation: string;        // human-readable, shown verbatim in UI
}

interface RiskResult {
  score: number;              // 0..100, higher = more risk
  bucket: Bucket;
  signals: DetectedSignal[];
  assessable: boolean;        // false if required fields were missing
  modelVersion: string;
}
```

---

## 3. Scoring model

### 3.1 Per-signal risk probability

Each detected signal is converted to an independent risk probability `p` in [0, 1]:

```
severityMultiplier:  info = 0.25,  warning = 0.6,  critical = 1.0

p_s = (weight_s / 100) * severityMultiplier(severity_s) * confidence_s
```

Confidence keeps inferred signals (for example, automation-pattern risk) from dominating directly observed ones (for example, account_status read straight from the API).

### 3.2 Aggregation (noisy-OR)

Non-terminal signals combine by noisy-OR, which is bounded in [0, 100], monotonic (adding a signal never lowers risk), and compounds sublinearly so several moderate issues do not trivially max out:

```
risk = 100 * (1 - Π_s (1 - p_s))
```

Read in plain language: each issue independently raises the risk of suspension, and the engine combines them as "any of these could be the one that triggers it."

### 3.3 Terminal override

If any terminal signal is present (account already disabled, circumventing-systems restriction, account pending risk review), the noisy-OR result is floored:

```
if any terminal signal:  score = max(noisyOR, max(terminalFloor of present terminals))
                          bucket = red
```

### 3.4 Buckets

```
green: 0  to 24
amber: 25 to 59
red:   60 to 100
```

### 3.5 Worked example

Three signals detected on a Meta account:

- Payment failure: weight 40, warning (0.6), confidence 0.9
  - p = (40 / 100) * 0.6 * 0.9 = 0.40 * 0.6 * 0.9 = 0.24 * 0.9 = 0.216
- Ad disapprovals, minor (1 to 2): weight 30, warning (0.6), confidence 1.0
  - p = (30 / 100) * 0.6 * 1.0 = 0.30 * 0.6 = 0.18
- Business verification incomplete: weight 25, info (0.25), confidence 1.0
  - p = (25 / 100) * 0.25 * 1.0 = 0.25 * 0.25 = 0.0625

Noisy-OR:

```
1 - 0.216  = 0.784
1 - 0.18   = 0.820
1 - 0.0625 = 0.9375

0.784 * 0.820   = 0.64288
0.64288 * 0.9375 = 0.60270
1 - 0.60270     = 0.39730
score = 100 * 0.39730 = 39.73
```

Result: score 39.73, bucket amber. Reads correctly: a payment issue plus a couple of disapprovals plus a verification gap is moderate, not critical.

Now add a circumventing-systems restriction (terminal, floor 95):

```
score = max(39.73, 95) = 95, bucket red
```

---

## 4. Meta signal catalog (v1)

> Account status codes: map `account_status` and `disable_reason` to the current documented Meta enum at implementation time. Do not hardcode integer meanings from memory; they change and the exact mapping must come from live docs.

### Status (terminal class)
| id | source | rule | weight | severity | terminal | remediation |
|----|--------|------|--------|----------|----------|-------------|
| meta.account_disabled | account_status, disable_reason | account in a disabled/unsettled state | 100 | critical | yes, floor 100 | recovery.meta.disabled |
| meta.account_pending_review | account_status | account in pending risk review | 55 | critical | yes, floor 90 | prevent.meta.pending_review |
| meta.account_grace_period | account_status | account in a grace/limited state | 45 | warning | no | prevent.meta.grace |

`meta.account_pending_review` is the highest-value leading indicator. It is the state that precedes a disable, and catching it is the core "before suspension" promise.

### Policy
| id | source | rule | weight | severity | remediation |
|----|--------|------|--------|----------|-------------|
| meta.ad_disapprovals_minor | ad effective_status / approval | 1 to 2 disapproved active ads | 30 | warning | policy.meta.disapproval |
| meta.ad_disapprovals_major | ad effective_status / approval | 3 or more disapproved active ads | 45 | critical | policy.meta.disapproval |
| meta.restricted_category_active | creative + category signals | running restricted vertical without whitelist (crypto, supplements, gambling, dropshipping, adult) | 35 | warning | policy.meta.restricted |

### Payment
| id | source | rule | weight | severity | remediation |
|----|--------|------|--------|----------|-------------|
| meta.payment_failure | funding/billing | failed or declined payment | 40 | warning | payment.meta.failure |
| meta.payment_method_risk | funding source metadata | high-risk-region or mismatched billing method | 25 | info | payment.meta.method |

### Linkage
| id | source | rule | weight | severity | confidence basis | remediation |
|----|--------|------|--------|----------|------------------|-------------|
| meta.linked_disabled_account | shared payment/identity graph | shares a payment method or identity with a known-disabled account | 50 | critical | inferred, confidence ~0.6 | linkage.meta.shared |

### Automation
| id | source | rule | weight | severity | confidence basis | remediation |
|----|--------|------|--------|----------|------------------|-------------|
| meta.api_rate_pattern_risk | our connector telemetry + change velocity | call/change patterns Meta's risk system reads as abusive (rapid budget changes, bulk updates) | 30 | warning | inferred, confidence ~0.5 to 0.8 | automation.meta.throttle |

This reuses MetaAdsSafe rate-limiting logic. It is also a self-check: our own polling must never be the pattern that triggers this.

### Verification
| id | source | rule | weight | severity | remediation |
|----|--------|------|--------|----------|-------------|
| meta.business_verification_incomplete | business verification state | verification missing or inconsistent | 25 | info | verification.meta.incomplete |

### Page
| id | source | rule | weight | severity | remediation |
|----|--------|------|--------|----------|-------------|
| meta.linked_page_restricted | connected page status | a connected page is restricted for organic violations | 45 | critical | page.meta.restricted |

### Circumvention (terminal class)
| id | source | rule | weight | severity | terminal | remediation |
|----|--------|------|--------|----------|----------|-------------|
| meta.circumventing_systems | account quality / BM-level flags | circumventing-systems restriction or BM-level enforcement | 100 | critical | yes, floor 95 | circumvention.meta |

---

## 5. Explainability contract

The UI must always be able to render, for any score:

1. The numeric score and bucket.
2. Every contributing signal, ordered by individual `p_s` descending.
3. For each signal: the plain-language explanation, the severity, the confidence, and the raw evidence (collapsed by default).
4. The matched remediation playbook for each signal.
5. If `assessable` is false: a clear "assessment incomplete, we could not read the following" notice. Never a green badge.

The engine returns everything needed for this; the UI must not invent or summarize away the per-signal breakdown.

---

## 6. Alert trigger semantics

The engine scores current state. Alerting is a separate layer that diffs consecutive snapshots.

Trigger an alert when:
- Bucket worsens (green to amber, amber to red, any to red).
- Any new terminal or critical signal appears, even within the same bucket.
- `assessable` flips to false on a previously assessable account (we lost visibility, which is itself a risk).

Recovery alert when bucket improves or a critical signal clears.

Dedupe key: account id + signal category + day. Alert on transitions, never on steady state, to avoid fatigue.

---

## 7. Outcome capture and v2 learned scoring

The rules engine ships first. The learned model is the moat and must be fed from launch.

### 7.1 Capture (from day one)
- Every `HealthSnapshot` stores the full signal vector, raw fields, score, and model version.
- Label: did the account enter a disabled/circumventing state within N days of the snapshot (N candidates: 7, 14, 30). Positive = disabled within window, negative = survived.
- This labeled dataset is the single asset a buyer cannot replicate, so retention of HealthSnapshot history is a product requirement, not a nice-to-have.

### 7.2 Model (when data is sufficient)
- Start with interpretable models: regularized logistic regression or gradient-boosted trees. Not deep nets. The explainability contract is non-negotiable, so per-feature contributions must remain readable.
- Output: calibrated probability of disable within the window, mapped to 0 to 100.
- Calibration is mandatory (Platt or isotonic). A predicted 70 must mean roughly 70 percent observed disable frequency, or the score is worse than useless.

### 7.3 Coexistence with rules
- Terminal rules always override the learned model. An already-disabled account is red regardless of what any model says.
- Shadow mode first: run the learned model alongside rules, log both, compare against actual outcomes, do not surface it to users.
- Promote per-signal-weight or whole-model only after the learned version beats rules on held-out calibration and recall for the positive class.
- Version every promotion. Snapshots remain interpretable against the model that scored them.

---

## 8. Adapter interface (Google, TikTok later)

```ts
interface PlatformAdapter {
  platform: Platform;
  definitions: SignalDefinition[];
  // maps a raw platform pull into the normalized input the definitions read
  normalize(raw: unknown): PlatformSnapshotInput;
}
```

Adding Google means: implement `normalize` over the Google Ads API pull (customer `AccountStatus`, ad `PolicySummary.approval_status`, `policy_topic_entries`) and supply a Google signal catalog. The core scoring math does not change.

---

## 9. Edge cases and failure modes

| Case | Behavior |
|------|----------|
| Required field missing from pull | exclude its signals, set `assessable = false`, never green |
| Connector error / partial pull | score what is available, `assessable = false`, surface the gap |
| No signals detected, full pull succeeded | score 0, green, `assessable = true` (a genuine clean bill) |
| Conflicting signals | noisy-OR handles naturally; terminals still override |
| Stale snapshot (polling missed) | freshness is tracked outside the engine; a dead-man's-switch alerts on staleness per account |

---

## 10. Test strategy

- **Golden fixtures:** a library of representative snapshot inputs with pinned expected scores and buckets. The worked example in section 3.5 is the first fixture.
- **Property tests:** adding any signal never decreases the score (monotonicity); score always in [0, 100]; any terminal forces red; `assessable = false` never yields green.
- **Calibration tests (v2):** reliability curves on held-out data within tolerance before any promotion.
- **Regression gate:** score changes from a weight edit must diff against golden fixtures in CI, so weight tuning is never silent.

---

## 11. Open decisions

1. Disable-window N for labeling (7 vs 14 vs 30 days). Recommendation: capture all three, primary label at 14.
2. Whether `meta.api_rate_pattern_risk` confidence is fixed or derived from observed change velocity. Recommendation: derive it, it is more honest and more useful.
3. Initial weights in this doc are informed priors, not tuned values. They are the starting point for calibration once outcome data accrues. Treat them as v0.1 of the model, not ground truth.
