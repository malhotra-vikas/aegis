import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter, SiteHeader } from '../../../../components/site-chrome';
import { GUIDES, guideBySlug, SITE } from '../../../../lib/marketing';

// One page per Meta cause, generated from the risk taxonomy (AEGIS_GTM_SEO §3.3).
// Statically rendered; the set grows by adding entries to GUIDES.
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

  // FAQ + HowTo structured data — the page types that earn rich results.
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />

      <article className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Meta · {SEVERITY_LABEL[guide.severity]}</p>
        <h1 className="mt-2 text-3xl font-bold">{guide.title}</h1>

        <h2 className="mt-8 text-xl font-semibold">What it means</h2>
        <p className="mt-2 text-gray-700">{guide.whatItMeans}</p>

        <h2 className="mt-8 text-xl font-semibold">Why it happens</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
          {guide.whyItHappens.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>

        <h2 className="mt-8 text-xl font-semibold">How to fix it</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 text-gray-700">
          {guide.howToFix.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>

        <div className="my-10 rounded-xl border border-blue-200 bg-blue-50 p-5 text-center">
          <p className="font-medium">Want to know if your account is at risk right now?</p>
          <p className="mt-1 text-sm text-gray-600">Run a free, read-only audit and get your risk score in under a minute.</p>
          <Link href="/audit" className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700">
            Run a free audit
          </Link>
        </div>

        <h2 className="mt-8 text-xl font-semibold">FAQ</h2>
        <dl className="mt-3 space-y-4">
          {guide.faqs.map((f) => (
            <div key={f.q}>
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 text-gray-700">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 border-t border-gray-100 pt-6">
          <p className="text-sm font-medium text-gray-700">Related guides</p>
          <div className="mt-2 flex flex-col gap-1">
            {GUIDES.filter((g) => g.slug !== guide.slug)
              .slice(0, 4)
              .map((g) => (
                <Link key={g.slug} href={`/guides/meta/${g.slug}`} className="text-sm text-blue-700 hover:underline">
                  {g.title}
                </Link>
              ))}
          </div>
        </div>
      </article>

      <SiteFooter />
    </>
  );
}
