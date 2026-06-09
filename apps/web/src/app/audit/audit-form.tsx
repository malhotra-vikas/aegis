'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { submitAuditLead } from './actions';

// Step 1 of the two-step audit (AEGIS_GTM_SEO §2.3): an email-gated self-report
// that gives an indicative read and captures the lead at peak intent, before the
// OAuth-connect friction. The full, real audit is the connect step.
const QUESTIONS: { key: string; label: string; weight: number }[] = [
  { key: 'inReview', label: 'Is your ad account currently in review, restricted, or limited?', weight: 0.7 },
  { key: 'disapprovals', label: 'Have you had ads disapproved recently?', weight: 0.45 },
  { key: 'paymentFailed', label: 'Any failed or declined payments on the account?', weight: 0.4 },
  { key: 'restrictedCategory', label: 'Do you advertise a restricted category (crypto, supplements, gambling)?', weight: 0.35 },
  { key: 'verificationIncomplete', label: 'Is your business verification incomplete?', weight: 0.25 },
];

function bucketOf(score: number): 'GREEN' | 'AMBER' | 'RED' {
  if (score >= 60) return 'RED';
  if (score >= 25) return 'AMBER';
  return 'GREEN';
}

const VERDICT_COPY: Record<string, string> = {
  GREEN: 'Low indicative risk. A real connect-based audit confirms there are no hidden flags.',
  AMBER: 'Elevated indicative risk. Several of these are early warning signs worth confirming.',
  RED: 'High indicative risk. Connect for the full picture and the specific fixes — this is the moment to act.',
};

const BUCKET_CLASSES: Record<string, string> = {
  RED: 'bg-red-100 text-red-800',
  AMBER: 'bg-amber-100 text-amber-800',
  GREEN: 'bg-green-100 text-green-800',
};

export function AuditForm() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [verdict, setVerdict] = useState<{ score: number; bucket: 'GREEN' | 'AMBER' | 'RED' } | null>(null);
  const [email, setEmail] = useState('');
  const [captured, setCaptured] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function computeVerdict() {
    // Indicative only — noisy-OR over "yes" answers, mirroring the engine's shape.
    const product = QUESTIONS.reduce((acc, q) => (answers[q.key] ? acc * (1 - q.weight) : acc), 1);
    const score = Math.round(100 * (1 - product));
    setVerdict({ score, bucket: bucketOf(score) });
  }

  async function captureEmail(e: FormEvent) {
    e.preventDefault();
    if (!verdict) return;
    setSubmitting(true);
    await submitAuditLead({ email, indicativeScore: verdict.score, indicativeBucket: verdict.bucket, answers });
    setSubmitting(false);
    setCaptured(true);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {QUESTIONS.map((q) => (
          <label key={q.key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 p-3">
            <span className="text-sm text-slate-200">{q.label}</span>
            <input
              type="checkbox"
              className="h-5 w-5 accent-teal-400"
              checked={!!answers[q.key]}
              onChange={(ev) => setAnswers((a) => ({ ...a, [q.key]: ev.target.checked }))}
            />
          </label>
        ))}
      </div>

      {!verdict && (
        <button onClick={computeVerdict} className="rounded-lg bg-teal-400 px-5 py-2.5 font-semibold text-slate-950 hover:bg-teal-300">
          See my risk read
        </button>
      )}

      {verdict && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <span className={`rounded px-3 py-1 text-sm font-semibold ${BUCKET_CLASSES[verdict.bucket]}`}>
              {verdict.bucket} · {verdict.score}
            </span>
            <span className="text-sm text-slate-400">Indicative risk read</span>
          </div>
          <p className="text-slate-300">{VERDICT_COPY[verdict.bucket]}</p>

          {!captured ? (
            <form onSubmit={captureEmail} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-teal-400 px-5 py-2 font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Email me the full breakdown'}
              </button>
            </form>
          ) : (
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-4">
              <p className="font-medium text-white">Saved. Now run the real thing.</p>
              <p className="mt-1 text-sm text-slate-400">
                The full audit connects your account read-only and scores it against every signal — no self-reporting.
              </p>
              <Link href="/audit/connect" className="mt-3 inline-block rounded-lg bg-teal-400 px-5 py-2 font-semibold text-slate-950 hover:bg-teal-300">
                Connect for the full audit
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
