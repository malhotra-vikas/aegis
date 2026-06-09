import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter, SiteHeader } from '../../components/site-chrome';
import { GUIDES, SITE } from '../../lib/marketing';

export const metadata: Metadata = {
  title: `Meta ad-account recovery & prevention guides — ${SITE.name}`,
  description: 'Plain-English guides to the Meta enforcement states that get ad accounts suspended — what each means, why it happens, and how to fix it.',
  alternates: { canonical: '/guides' },
};

export default function GuidesIndex() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">Recovery &amp; prevention guides</h1>
        <p className="mt-3 text-gray-600">
          The Meta enforcement states that put ad accounts at risk — what each one means, why it happens, and the steps to fix it.
        </p>
        <ul className="mt-8 space-y-4">
          {GUIDES.map((g) => (
            <li key={g.slug} className="rounded-lg border border-gray-200 p-4">
              <Link href={`/guides/meta/${g.slug}`} className="font-medium text-blue-700 hover:underline">
                {g.title}
              </Link>
              <p className="mt-1 text-sm text-gray-600">{g.metaDescription}</p>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </>
  );
}
