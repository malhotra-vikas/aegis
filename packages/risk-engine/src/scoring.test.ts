import { describe, expect, it } from 'vitest';
import { META_V1_CATALOG } from './adapters/meta/catalog.js';
import { bucketFor, score, signalProbability } from './scoring.js';
import type { DetectedSignal, SignalDefinition } from './types.js';

const catalogById = new Map<string, SignalDefinition>(META_V1_CATALOG.map((d) => [d.id, d as SignalDefinition]));

function sig(definitionId: string, severity: DetectedSignal['severity'], confidence: number): DetectedSignal {
  const def = catalogById.get(definitionId)!;
  return { definitionId, category: def.category, severity, confidence, evidence: {}, explanation: '' };
}

describe('signalProbability (spec 3.1)', () => {
  it('p_s = (weight/100) * severityMultiplier * confidence', () => {
    expect(signalProbability(40, 'warning', 0.9)).toBeCloseTo(0.216, 10);
    expect(signalProbability(30, 'warning', 1.0)).toBeCloseTo(0.18, 10);
    expect(signalProbability(25, 'info', 1.0)).toBeCloseTo(0.0625, 10);
  });
});

describe('bucketFor (spec 3.4)', () => {
  it('green 0..24, amber 25..59, red 60..100', () => {
    expect(bucketFor(0)).toBe('green');
    expect(bucketFor(24.99)).toBe('green');
    expect(bucketFor(25)).toBe('amber');
    expect(bucketFor(59.99)).toBe('amber');
    expect(bucketFor(60)).toBe('red');
    expect(bucketFor(100)).toBe('red');
  });
});

describe('golden fixture — worked example (spec 3.5)', () => {
  // payment failure (w40, warning, conf0.9), minor disapprovals (w30, warning,
  // conf1.0), verification incomplete (w25, info, conf1.0) => 39.73 amber.
  const workedExample: DetectedSignal[] = [
    sig('meta.payment_failure', 'warning', 0.9),
    sig('meta.ad_disapprovals_minor', 'warning', 1.0),
    sig('meta.business_verification_incomplete', 'info', 1.0),
  ];

  it('scores 39.73 / amber', () => {
    const result = score(workedExample, catalogById, true, 'test');
    expect(result.score).toBe(39.73);
    expect(result.bucket).toBe('amber');
    expect(result.assessable).toBe(true);
  });

  it('orders signals by contribution descending (spec 5)', () => {
    const result = score(workedExample, catalogById, true, 'test');
    expect(result.signals.map((s) => s.definitionId)).toEqual([
      'meta.payment_failure',
      'meta.ad_disapprovals_minor',
      'meta.business_verification_incomplete',
    ]);
    const contributions = result.signals.map((s) => s.contribution);
    expect(contributions).toEqual([...contributions].sort((a, b) => b - a));
  });

  it('terminal override: adding circumventing-systems floors to 95 / red (spec 3.3)', () => {
    const withTerminal = [...workedExample, sig('meta.circumventing_systems', 'critical', 1.0)];
    const result = score(withTerminal, catalogById, true, 'test');
    expect(result.score).toBe(95); // max(39.73, terminalFloor 95)
    expect(result.bucket).toBe('red');
  });
});

describe('terminal floors', () => {
  it('account_disabled floors at 100', () => {
    const result = score([sig('meta.account_disabled', 'critical', 1.0)], catalogById, true, 'test');
    expect(result.score).toBe(100);
    expect(result.bucket).toBe('red');
  });

  it('highest floor wins when multiple terminals present', () => {
    const result = score(
      [sig('meta.account_pending_review', 'critical', 1.0), sig('meta.circumventing_systems', 'critical', 1.0)],
      catalogById,
      true,
      'test',
    );
    expect(result.score).toBe(95); // max(floor 90, floor 95)
    expect(result.bucket).toBe('red');
  });
});

describe('property: clean & fail-closed', () => {
  it('no signals, full pull => 0 / green / assessable', () => {
    const result = score([], catalogById, true, 'test');
    expect(result.score).toBe(0);
    expect(result.bucket).toBe('green');
  });

  it('assessable=false never yields green (spec 4, 9)', () => {
    const result = score([], catalogById, false, 'test');
    expect(result.assessable).toBe(false);
    expect(result.bucket).not.toBe('green');
    expect(result.bucket).toBe('amber');
  });
});

describe('property: score bounds and monotonicity (spec 10)', () => {
  const allNonTerminal: DetectedSignal[] = [
    sig('meta.account_grace_period', 'warning', 1.0),
    sig('meta.ad_disapprovals_minor', 'warning', 1.0),
    sig('meta.restricted_category_active', 'warning', 1.0),
    sig('meta.payment_failure', 'warning', 1.0),
    sig('meta.payment_method_risk', 'info', 1.0),
    sig('meta.linked_disabled_account', 'critical', 0.6),
    sig('meta.business_verification_incomplete', 'info', 1.0),
    sig('meta.linked_page_restricted', 'critical', 1.0),
  ];

  it('score always within [0,100]', () => {
    for (let i = 0; i <= allNonTerminal.length; i++) {
      const result = score(allNonTerminal.slice(0, i), catalogById, true, 'test');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it('adding a signal never decreases the score', () => {
    let prev = -1;
    for (let i = 0; i <= allNonTerminal.length; i++) {
      const result = score(allNonTerminal.slice(0, i), catalogById, true, 'test');
      expect(result.score).toBeGreaterThanOrEqual(prev);
      prev = result.score;
    }
  });

  it('any terminal forces red regardless of other signals', () => {
    const result = score([...allNonTerminal, sig('meta.account_disabled', 'critical', 1.0)], catalogById, true, 'test');
    expect(result.bucket).toBe('red');
  });
});
