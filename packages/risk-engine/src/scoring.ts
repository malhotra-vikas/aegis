// The scoring core. Pure and deterministic: no I/O, no clock, no randomness.
// See AEGIS_RISK_ENGINE_SPEC.md section 3.

import type { Bucket, DetectedSignal, RiskResult, ScoredSignal, Severity, SignalDefinition } from './types.js';

/** severityMultiplier: info = 0.25, warning = 0.6, critical = 1.0 (spec 3.1). */
const SEVERITY_MULTIPLIER: Record<Severity, number> = {
  info: 0.25,
  warning: 0.6,
  critical: 1.0,
};

export function severityMultiplier(severity: Severity): number {
  return SEVERITY_MULTIPLIER[severity];
}

/**
 * Per-signal risk probability `p_s` in [0,1] (spec 3.1):
 *   p_s = (weight / 100) * severityMultiplier(severity) * confidence
 */
export function signalProbability(weight: number, severity: Severity, confidence: number): number {
  return (weight / 100) * severityMultiplier(severity) * confidence;
}

/** Bucketing thresholds (spec 3.4): green 0..24, amber 25..59, red 60..100. */
export function bucketFor(score: number): Bucket {
  if (score >= 60) return 'red';
  if (score >= 25) return 'amber';
  return 'green';
}

/**
 * Combine a list of detected signals into a RiskResult.
 *
 * Aggregation (spec 3.2, noisy-OR over NON-terminal signals):
 *   risk = 100 * (1 - Π_s (1 - p_s))
 * Terminal override (spec 3.3): if any terminal signal is present, the score is
 * floored at the highest terminal floor and the bucket is red. Terminal signals
 * do not enter the noisy-OR product; they contribute only their floor. This
 * matches the worked example (3.5): max(noisyOR 39.73, floor 95) = 95.
 *
 * Fail closed (spec 4, 9): when `assessable` is false the engine never reports
 * green; a would-be-green bucket is raised to amber.
 *
 * `weightOf` resolves each detected signal back to its definition so we know
 * whether it is terminal and its floor. The catalog is the source of truth for
 * weight/terminal; the DetectedSignal carries the observed severity/confidence.
 */
export function score(
  detected: DetectedSignal[],
  definitionsById: Map<string, SignalDefinition>,
  assessable: boolean,
  modelVersion: string,
): RiskResult {
  const scored: ScoredSignal[] = detected.map((d) => {
    const def = definitionsById.get(d.definitionId);
    if (!def) {
      throw new Error(`scoring: no SignalDefinition for detected signal "${d.definitionId}"`);
    }
    return {
      ...d,
      contribution: signalProbability(def.weight, d.severity, d.confidence),
      terminal: def.terminal === true,
    };
  });

  // Noisy-OR over non-terminal signals only.
  const product = scored
    .filter((s) => !s.terminal)
    .reduce((acc, s) => acc * (1 - s.contribution), 1);
  let computed = 100 * (1 - product);

  // Terminal override: floor at the highest present terminal floor, force red.
  const terminalFloors = scored
    .filter((s) => s.terminal)
    .map((s) => definitionsById.get(s.definitionId)?.terminalFloor ?? 0);
  let bucket: Bucket;
  if (terminalFloors.length > 0) {
    computed = Math.max(computed, Math.max(...terminalFloors));
    bucket = 'red';
  } else {
    bucket = bucketFor(computed);
  }

  // Fail closed: an incomplete assessment is never green.
  if (!assessable && bucket === 'green') {
    bucket = 'amber';
  }

  // Round to 2dp for stable storage/comparison; ordering by contribution desc
  // gives the explainability breakdown (spec 5).
  const roundedScore = Math.round(computed * 100) / 100;
  scored.sort((a, b) => b.contribution - a.contribution);

  return {
    score: roundedScore,
    bucket,
    signals: scored,
    assessable,
    modelVersion,
  };
}
