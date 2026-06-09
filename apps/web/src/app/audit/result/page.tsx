import type { Metadata } from 'next';
import Link from 'next/link';
import { type Bucket, RiskScoreCard } from '../../../components/risk-score-card';
import { SitePage } from '../../../components/site-chrome';
import { SITE } from '../../../lib/marketing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Your audit result — ${SITE.name}`,
  robots: { index: false }, // per-result, not for indexing
};

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001';

interface AuditResultView {
  externalId: string | null;
  score: number;
  bucket: Bucket;
  assessable: boolean;
  signals: { severity: string; explanation: string; contribution?: number }[];
}

export default async function AuditResult({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  let result: AuditResultView | null = null;
  if (id) {
    try {
      const res = await fetch(`${apiBase}/audit/result/${id}`, { cache: 'no-store' });
      if (res.ok) result = (await res.json()) as AuditResultView;
    } catch {
      result = null;
    }
  }

  return (
    <SitePage>
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold text-white">Your audit result</h1>

        {!result ? (
          <p className="mt-4 text-slate-400">
            We couldn’t find that audit. <Link href="/audit" className="text-teal-400 hover:underline">Run a new one</Link>.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            {result.assessable ? (
              <RiskScoreCard
                displayName={result.externalId ?? 'Your ad account'}
                externalId={result.externalId ?? undefined}
                score={result.score}
                bucket={result.bucket}
                signals={result.signals}
              />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300">
                We couldn’t fully read this account. That itself is worth a closer look — reconnect or check the account’s access.
              </div>
            )}

            <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-5">
              <p className="font-semibold text-white">This is a point-in-time snapshot. Accounts change daily.</p>
              <p className="mt-1 text-sm text-slate-400">
                Turn on continuous monitoring to catch a flag the moment it appears — before it becomes a suspension.
              </p>
              <Link href="/pricing" className="mt-4 inline-block rounded-lg bg-teal-400 px-5 py-2.5 font-semibold text-slate-950 hover:bg-teal-300">
                Turn on monitoring
              </Link>
            </div>
          </div>
        )}
      </section>
    </SitePage>
  );
}
