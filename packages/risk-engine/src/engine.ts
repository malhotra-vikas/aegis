// The engine entry point: run an adapter's catalog over a normalized input and
// score the result. Pure — fetching/normalizing raw payloads is the connector's
// and adapter's job. See AEGIS_RISK_ENGINE_SPEC.md sections 2 and 9.

import { score } from './scoring.js';
import type { DetectedSignal, PlatformAdapter, PlatformSnapshotInput, RiskResult, SignalDefinition } from './types.js';

/**
 * Assess a normalized snapshot input against a set of signal definitions.
 *
 * `assessable` is false when the connector reported missing required fields, so
 * the engine "scores what it can see" and never reports green on a partial pull
 * (spec 9). A clean full pull with no signals scores 0 / green / assessable.
 */
export function assess<I extends PlatformSnapshotInput>(
  input: I,
  definitions: SignalDefinition<I>[],
  modelVersion: string,
): RiskResult {
  const detected: DetectedSignal[] = [];
  for (const def of definitions) {
    const signal = def.detect(input);
    if (signal) detected.push(signal);
  }

  const byId = new Map<string, SignalDefinition>(definitions.map((d) => [d.id, d as SignalDefinition]));
  const assessable = input.missingRequiredFields.length === 0;
  return score(detected, byId, assessable, modelVersion);
}

/** Convenience: assess a raw platform pull end-to-end through an adapter. */
export function assessRaw<I extends PlatformSnapshotInput>(adapter: PlatformAdapter<I>, raw: unknown): RiskResult {
  const input = adapter.normalize(raw);
  return assess(input, adapter.definitions, adapter.modelVersion);
}
