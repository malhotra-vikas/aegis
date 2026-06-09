import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SitePage } from '../../../../components/site-chrome';
import { GUIDES, guideBySlug, SITE } from '../../../../lib/marketing';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  return {
    title: `${guide.title} — ${SITE.name}`,
    description: guide.metaDescription,
    alternates: { canonical: `/guides/meta/${guide.slug}` },
    openGraph: { title: guide.title, description: guide.metaDescription, type: 'article' },
  };
}

const SEVERITY_LABEL: Record<string, string> = { critical: 'Critical', warning: 'Warning', info: 'Heads-up' };

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: guide.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: guide.title,
      step: guide.howToFix.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
    },
  ];

  return (
    <SitePage>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-400">Meta · {SEVERITY_LABEL[guide.severity]}</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{guide.title}</h1>

        <h2 className="mt-8 text-xl font-semibold text-white">What it means</h2>
        <p className="mt-2 text-slate-300">{guide.whatItMeans}</p>

        <h2 className="mt-8 text-xl font-semibold text-white">Why it happens</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
          {guide.whyItHappens.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-semibold text-white">How to fix it</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-300">
          {guide.howToFix.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        <div className="my-10 rounded-xl border border-teal-500/30 bg-teal-500/10 p-5 text-center">
          <p className="font-medium text-white">Want to know if your account is at risk right now?</p>
          <p className="mt-1 text-sm text-slate-400">Run a free, read-only audit and get your risk score in under a minute.</p>
          <Link href="/audit" className="mt-4 inline-block rounded-lg bg-teal-400 px-5 py-2.5 font-semibold text-slate-950 hover:bg-teal-300">
            Run a free audit
          </Link>
        </div>

        <h2 className="mt-8 text-xl font-semibold text-white">FAQ</h2>
        <dl className="mt-3 space-y-4">
          {guide.faqs.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-white">{f.q}</dt>
              <dd className="mt-1 text-slate-300">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 border-t border-slate-800 pt-6">
          <p className="text-sm font-medium text-slate-200">Related guides</p>
          <div className="mt-2 flex flex-col gap-1">
            {GUIDES.filter((g) => g.slug !== guide.slug)
              .slice(0, 4)
              .map((g) => (
                <Link key={g.slug} href={`/guides/meta/${g.slug}`} className="text-sm text-teal-400 hover:underline">
                  {g.title}
                </Link>
              ))}
          </div>
        </div>
      </article>
    </SitePage>
  );
}
