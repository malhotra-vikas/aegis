import type { Metadata } from 'next';
import Link from 'next/link';
import { RiskScoreCard } from '../components/risk-score-card';
import { SiteFooter, SiteHeader } from '../components/site-chrome';
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
  // SoftwareApplication structured data for SEO.
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <section className="bg-gradient-to-b from-blue-50/60 to-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-medium text-blue-600">Ad-account survival for Meta advertisers</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{SITE.tagline}</h1>
            <p className="mt-5 text-lg text-gray-600">{SITE.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/audit" className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700">
                Run a free audit
              </Link>
              <Link href="/pricing" className="rounded-lg border border-gray-300 px-6 py-3 font-medium transition hover:bg-gray-50">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">Free &amp; point-in-time · no card required.</p>
          </div>

          {/* Show the product, not just tell. A representative verdict card. */}
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
            <p className="mt-2 text-center text-xs text-gray-400">A real verdict, explained — with the fix for each flag.</p>
          </div>
        </div>
      </section>

      <div className="border-y border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-8 gap-y-2 px-4 py-4 text-sm text-gray-600">
          <span>🔒 Strictly read-only</span>
          <span>🚫 We never touch your ads</span>
          <span>⚡ Verdict in under a minute</span>
          <span>📋 Compliance-first, not adversarial</span>
        </div>
      </div>

      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-2xl font-semibold">Suspensions don’t come out of nowhere</h2>
          <p className="mt-3 text-gray-600">
            Most ad-account disables are preceded by signals an advertiser can see — a risk-review flag, a cluster of disapprovals,
            a failed payment. The tools you already use chase performance. None of them watch the things that actually get accounts
            shut down. Aegis does only that.
          </p>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="mt-6 space-y-4">
          {[
            ['Connect, read-only', 'One-click Meta connect. We only ever request read access — never the ability to change your ads.'],
            ['We read the survival signals', 'Account status, disapprovals, payments, verification, linkage — the documented causes of enforcement.'],
            ['Get a score and a fix', 'A 0–100 risk score, green/amber/red, with every flagged issue explained and a step-by-step remediation.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-gray-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-2xl font-semibold">What we watch for</h2>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DETECTS.map((d) => (
              <div key={d.label} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{d.cat}</p>
                <p className="text-sm text-gray-800">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h2 className="text-2xl font-semibold">Start free, upgrade when you want it watched</h2>
        <p className="mt-3 text-gray-600">The audit is free and point-in-time. Continuous monitoring starts at $39/mo.</p>
        <Link href="/pricing" className="mt-6 inline-block rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50">
          See pricing
        </Link>
      </section>

      <section className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-lg font-semibold">Recovery &amp; prevention guides</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GUIDES.slice(0, 6).map((g) => (
              <Link key={g.slug} href={`/guides/meta/${g.slug}`} className="text-sm text-blue-700 hover:underline">
                {g.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
