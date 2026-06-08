// @aegis/risk-engine — explainable, pure, deterministic ad-account risk scoring.
// See AEGIS_RISK_ENGINE_SPEC.md. The scoring core is platform-agnostic; each
// platform plugs in a catalog + normalizer via PlatformAdapter.

export * from './types.js';
export { assess, assessRaw } from './engine.js';
export { score, signalProbability, severityMultiplier, bucketFor } from './scoring.js';

// Meta v1 adapter
export {
  metaAdapter,
  normalizeMeta,
  META_MODEL_VERSION,
  META_ACCOUNT_STATUS_MAP,
  META_V1_CATALOG,
  META_REQUIRED_FIELDS,
} from './adapters/meta/index.js';
export type { RawMetaPull } from './adapters/meta/index.js';
export type { MetaSnapshotInput, MetaAccountStatus, MetaAutomationRisk } from './adapters/meta/input.js';
