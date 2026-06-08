// Core data contracts for the risk engine.
// See AEGIS_RISK_ENGINE_SPEC.md section 2. These types are the stable
// boundary between the (platform-agnostic) scoring core and the per-platform
// adapters. Adding a platform must not change anything in this file.

export type Platform = 'meta' | 'google' | 'tiktok';

export type Severity = 'info' | 'warning' | 'critical';

export type Category =
  | 'policy'
  | 'payment'
  | 'linkage'
  | 'automation'
  | 'verification'
  | 'page'
  | 'circumvention'
  | 'status';

export type Bucket = 'green' | 'amber' | 'red';

/**
 * The normalized input a platform adapter produces from a raw API pull.
 * Detection (`SignalDefinition.detect`) reads only normalized fields, never
 * raw platform payloads, so the scoring core stays platform-agnostic.
 *
 * `missingRequiredFields` drives the fail-closed rule: if the connector could
 * not fetch one or more fields the catalog needs, the assessment is marked
 * incomplete (`assessable = false`) and the engine will never report green.
 */
export interface PlatformSnapshotInput {
  platform: Platform;
  /**
   * Names of required fields the connector could not read on this pull.
   * Non-empty => the assessment is incomplete. Empty => a full pull.
   */
  missingRequiredFields: string[];
}

export interface SignalDefinition<I extends PlatformSnapshotInput = PlatformSnapshotInput> {
  id: string; // e.g. 'meta.payment_failure'
  platform: Platform;
  category: Category;
  weight: number; // 0..100, max points at full severity + confidence
  defaultSeverity: Severity;
  terminal?: boolean; // forces red and a score floor
  terminalFloor?: number; // e.g. 95; required when terminal is true
  remediationId: string; // FK into the remediation playbook library
  /** Pure: returns the detected signal or null if the rule does not fire. */
  detect(input: I): DetectedSignal | null;
}

export interface DetectedSignal {
  definitionId: string;
  category: Category;
  severity: Severity;
  confidence: number; // 0..1, observed = 1.0, inferred < 1.0
  evidence: Record<string, unknown>; // raw fields that triggered it
  explanation: string; // human-readable, shown verbatim in UI
}

/**
 * A detected signal enriched with the per-signal risk probability `p_s` and
 * whether it is a terminal signal. This is a superset of `DetectedSignal`:
 * `contribution` is what `RiskSignal.contribution` persists, and the UI orders
 * the breakdown by it (descending). See AEGIS_DATA_MODEL.md RiskSignal.
 */
export interface ScoredSignal extends DetectedSignal {
  contribution: number; // p_s in [0,1]
  terminal: boolean;
}

export interface RiskResult {
  score: number; // 0..100, higher = more risk
  bucket: Bucket;
  /** Contributing signals, ordered by `contribution` (p_s) descending. */
  signals: ScoredSignal[];
  assessable: boolean; // false if required fields were missing
  modelVersion: string;
}

/**
 * A platform adapter contributes a signal catalog plus a normalizer that maps
 * a raw platform pull into the input the catalog reads. The scoring math does
 * not change per platform. See AEGIS_RISK_ENGINE_SPEC.md section 8.
 */
export interface PlatformAdapter<I extends PlatformSnapshotInput = PlatformSnapshotInput> {
  platform: Platform;
  modelVersion: string;
  definitions: SignalDefinition<I>[];
  normalize(raw: unknown): I;
}
