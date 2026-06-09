import type { Metadata } from 'next';
import Link from 'next/link';
import { SitePage } from '../../components/site-chrome';
import { SITE, TIERS } from '../../lib/marketing';

export const metadata: Metadata = {
  title: `Pricing — ${SITE.name}`,
  description: 'Free point-in-time audit. Continuous monitoring from $39/mo. Per-account pricing that scales with the client accounts you manage.',
  alternates: { canonical: '/pricing' },
};

const FAQS = [
  { q: 'Is the audit really free?', a: 'Yes. The free tier runs a one-click, point-in-time health audit on one account with a full risk score and issue list. No card required.' },
  { q: 'What does "per account" mean?', a: 'Each connected ad account counts toward your tier. Agencies add client accounts as they grow — that is the model, and account-add is one click.' },
  { q: 'Do you need write access to my ads?', a: 'Never. Aegis is strictly read-only. We never request the ability to change, pause, or create ads.' },
  { q: 'Can I cancel anytime?', a: 'Yes, self-serve. Monitoring is month-to-month.' },
];

export default function Pricing() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  return (
    <SitePage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Pricing</h1>
          <p className="mt-3 text-slate-400">Start with a free audit. Turn on monitoring when you want it watched.</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-4">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`flex flex-col rounded-xl border bg-slate-900 p-5 transition hover:border-slate-700 ${
                t.highlight ? 'border-teal-400 ring-1 ring-teal-400 md:-translate-y-2' : 'border-slate-800'
              }`}
            >
              {t.highlight && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-400">Most popular</p>}
              <h2 className="text-lg font-semibold text-white">{t.name}</h2>
              <p className="mt-2">
                <span className="text-3xl font-bold text-white">{t.price}</span>
                <span className="text-slate-400">{t.cadence}</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">{t.accounts}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-teal-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={t.name === 'Free' ? '/audit' : '/app'}
                className={`mt-5 rounded-lg px-4 py-2 text-center text-sm font-semibold transition ${
                  t.highlight
                    ? 'bg-teal-400 text-slate-950 hover:bg-teal-300'
                    : 'border border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Per-account pricing — add client accounts as you grow, billed automatically.
        </p>

        <div className="mx-auto mt-16 max-w-2xl">
          <h2 className="text-2xl font-semibold text-white">Questions</h2>
          <dl className="mt-6 space-y-5">
            {FAQS.map((f) => (
              <div key={f.q}>
                <dt className="font-medium text-white">{f.q}</dt>
                <dd className="mt-1 text-slate-400">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </SitePage>
  );
}
