import type { Metadata } from 'next';
import Link from 'next/link';
import { RiskScoreCard } from '../components/risk-score-card';
import { SitePage } from '../components/site-chrome';
import { GUIDES, SITE, TIERS } from '../lib/marketing';

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: '/' },
  openGraph: { title: SITE.name, description: SITE.description, type: 'website' },
};

const DETECTS = [
  { label: 'Account disabled & risk-review states', cat: 'Status' },
  { label: 'Ad disapproval clusters', cat: 'Policy' },
  { label: 'Restricted-category exposure', cat: 'Policy' },
  { label: 'Payment failures & method risk', cat: 'Payment' },
  { label: 'Linked-account contagion', cat: 'Linkage' },
  { label: 'Automation / rate-limit patterns', cat: 'Automation' },
  { label: 'Incomplete business verification', cat: 'Verification' },
  { label: 'Restricted linked Pages', cat: 'Page' },
];

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'BusinessApplication',
    description: SITE.description,
    offers: TIERS.filter((t) => t.price !== '$0').map((t) => ({
      '@type': 'Offer',
      name: t.name,
      price: t.price.replace('$', ''),
      priceCurrency: 'USD',
    })),
  };

  return (
    <SitePage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/10 to-transparent" />
        <div className="relative mx-auto grid max-w-5xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium text-teal-400">Ad-account survival for Meta advertisers</p>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{SITE.tagline}</h1>
            <p className="mt-5 text-lg text-slate-400">{SITE.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/audit" className="rounded-lg bg-teal-400 px-6 py-3 font-semibold text-slate-950 shadow-sm transition hover:bg-teal-300">
                Run a free audit
              </Link>
              <Link href="/pricing" className="rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-800">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">Free &amp; point-in-time · no card required.</p>
          </div>

          <div className="md:justify-self-end">
            <RiskScoreCard
              displayName="Acme — Prospecting"
              externalId="act_1009482…"
              score={42}
              bucket="AMBER"
              signals={[
                { severity: 'Warning', explanation: 'A payment was declined — delivery is paused.' },
                { severity: 'Warning', explanation: '2 active ads are disapproved.' },
                { severity: 'Info', explanation: 'Business verification is incomplete.' },
              ]}
            />
            <p className="mt-2 text-center text-xs text-slate-500">A real verdict, explained — with the fix for each flag.</p>
          </div>
        </div>
      </section>

      <div className="border-y border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-8 gap-y-2 px-4 py-4 text-sm text-slate-400">
          <span>🔒 Strictly read-only</span>
          <span>🚫 We never touch your ads</span>
          <span>⚡ Verdict in under a minute</span>
          <span>📋 Compliance-first, not adversarial</span>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-white">Suspensions don’t come out of nowhere</h2>
        <p className="mt-3 text-slate-400">
          Most ad-account disables are preceded by signals an advertiser can see — a risk-review flag, a cluster of disapprovals,
          a failed payment. The tools you already use chase performance. None of them watch the things that actually get accounts
          shut down. Aegis does only that.
        </p>
      </section>

      <section id="how" className="border-y border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-2xl font-semibold text-white">How it works</h2>
          <ol className="mt-6 space-y-4">
            {[
              ['Connect, read-only', 'One-click Meta connect. We only ever request read access — never the ability to change your ads.'],
              ['We read the survival signals', 'Account status, disapprovals, payments, verification, linkage — the documented causes of enforcement.'],
              ['Get a score and a fix', 'A 0–100 risk score, green/amber/red, with every flagged issue explained and a step-by-step remediation.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-400 text-sm font-semibold text-slate-950">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-white">{title}</p>
                  <p className="text-slate-400">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-white">What we watch for</h2>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DETECTS.map((d) => (
            <div key={d.label} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-teal-400">{d.cat}</p>
              <p className="text-sm text-slate-200">{d.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold text-white">Start free, upgrade when you want it watched</h2>
          <p className="mt-3 text-slate-400">The audit is free and point-in-time. Continuous monitoring starts at $39/mo.</p>
          <Link href="/pricing" className="mt-6 inline-block rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-800">
            See pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-lg font-semibold text-white">Recovery &amp; prevention guides</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {GUIDES.slice(0, 6).map((g) => (
            <Link key={g.slug} href={`/guides/meta/${g.slug}`} className="text-sm text-teal-400 hover:underline">
              {g.title}
            </Link>
          ))}
        </div>
      </section>
    </SitePage>
  );
}
