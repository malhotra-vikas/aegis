import { describe, expect, it } from 'vitest';
import { assessRaw } from '../../engine.js';
import { META_V1_CATALOG } from './catalog.js';
import { metaAdapter, normalizeMeta, type RawMetaPull } from './index.js';

describe('Meta catalog coverage', () => {
  it('every definition has a remediationId and unique id', () => {
    const ids = META_V1_CATALOG.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of META_V1_CATALOG) {
      expect(def.remediationId).toBeTruthy();
      expect(def.platform).toBe('meta');
      if (def.terminal) expect(typeof def.terminalFloor).toBe('number');
    }
  });
});

describe('normalizeMeta — fail closed (spec 9)', () => {
  it('missing account_status marks the assessment incomplete', () => {
    const input = normalizeMeta({});
    expect(input.accountStatus).toBe('unknown');
    expect(input.missingRequiredFields).toContain('account_status');
  });

  it('maps known account_status integers via the (verify-against-docs) table', () => {
    expect(normalizeMeta({ account_status: 1 }).accountStatus).toBe('active');
    expect(normalizeMeta({ account_status: 2 }).accountStatus).toBe('disabled');
    expect(normalizeMeta({ account_status: 7 }).accountStatus).toBe('pending_review');
    expect(normalizeMeta({ account_status: 9 }).accountStatus).toBe('grace_limited');
    expect(normalizeMeta({ account_status: 99999 }).accountStatus).toBe('unknown');
  });
});

describe('assessRaw(metaAdapter, …) end-to-end', () => {
  it('clean active account => 0 / green / assessable', () => {
    const result = assessRaw(metaAdapter, { account_status: 1 } satisfies RawMetaPull);
    expect(result.score).toBe(0);
    expect(result.bucket).toBe('green');
    expect(result.assessable).toBe(true);
    expect(result.signals).toHaveLength(0);
    expect(result.modelVersion).toBe('aegis-meta-rules-v0.1');
  });

  it('partial pull (no account_status) never reports green', () => {
    const result = assessRaw(metaAdapter, { payment_failure: false } satisfies RawMetaPull);
    expect(result.assessable).toBe(false);
    expect(result.bucket).not.toBe('green');
  });

  it('disabled account is terminal red at 100', () => {
    const result = assessRaw(metaAdapter, { account_status: 2, disable_reason: 'POLICY' } satisfies RawMetaPull);
    expect(result.score).toBe(100);
    expect(result.bucket).toBe('red');
    expect(result.signals[0]?.definitionId).toBe('meta.account_disabled');
  });

  it('disapproval count routes to minor vs major, mutually exclusive', () => {
    const minor = assessRaw(metaAdapter, { account_status: 1, disapproved_active_ad_count: 2 } satisfies RawMetaPull);
    expect(minor.signals.map((s) => s.definitionId)).toEqual(['meta.ad_disapprovals_minor']);

    const major = assessRaw(metaAdapter, { account_status: 1, disapproved_active_ad_count: 5 } satisfies RawMetaPull);
    expect(major.signals.map((s) => s.definitionId)).toEqual(['meta.ad_disapprovals_major']);
  });

  it('pending_review is the leading-indicator terminal (floor 90)', () => {
    const result = assessRaw(metaAdapter, { account_status: 7 } satisfies RawMetaPull);
    expect(result.score).toBe(90);
    expect(result.bucket).toBe('red');
    expect(result.signals[0]?.definitionId).toBe('meta.account_pending_review');
  });

  it('inferred linkage signal carries reduced confidence (0.6)', () => {
    const result = assessRaw(metaAdapter, { account_status: 1, linked_disabled_account: true } satisfies RawMetaPull);
    const linkage = result.signals.find((s) => s.definitionId === 'meta.linked_disabled_account');
    expect(linkage?.confidence).toBe(0.6);
  });

  it('automation risk confidence is clamped to the 0.5..0.8 inferred range', () => {
    const high = assessRaw(metaAdapter, {
      account_status: 1,
      automation_risk: { detected: true, confidence: 0.99 },
    } satisfies RawMetaPull);
    expect(high.signals.find((s) => s.definitionId === 'meta.api_rate_pattern_risk')?.confidence).toBe(0.8);

    const low = assessRaw(metaAdapter, {
      account_status: 1,
      automation_risk: { detected: true, confidence: 0.1 },
    } satisfies RawMetaPull);
    expect(low.signals.find((s) => s.definitionId === 'meta.api_rate_pattern_risk')?.confidence).toBe(0.5);
  });

  it('combined non-terminal signals reproduce the worked example (39.73 amber)', () => {
    const result = assessRaw(metaAdapter, {
      account_status: 1,
      disapproved_active_ad_count: 1, // minor disapprovals, conf 1.0
      business_verification_incomplete: true, // info, conf 1.0
      payment_failure: true, // NB: catalog observes payment at conf 1.0, not 0.9
    } satisfies RawMetaPull);
    // Payment failure is directly observed => confidence 1.0 here (the doc's
    // worked example used 0.9 as an illustration), so the end-to-end score is
    // slightly higher than 39.73. Assert the bucket and ordering instead; the
    // exact 39.73 fixture is pinned in scoring.test.ts against the doc's inputs.
    expect(result.bucket).toBe('amber');
    expect(result.signals[0]?.definitionId).toBe('meta.payment_failure');
  });
});
