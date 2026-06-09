import type { Metadata } from 'next';
import { SiteFooter, SiteHeader } from '../../components/site-chrome';
import { SITE } from '../../lib/marketing';
import { AuditForm } from './audit-form';

export const metadata: Metadata = {
  title: `Free Meta ad-account health check — ${SITE.name}`,
  description: 'A free, read-only health check for your Meta ad account. Get an indicative risk read in under a minute, then connect for the full audit.',
  alternates: { canonical: '/audit' },
};

export default function AuditPage() {
  return (
    <>
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">Free ad-account health check</h1>
        <p className="mt-3 text-gray-600">
          Answer a few quick questions for an indicative risk read. Then connect your Meta account read-only for the full audit —
          scored against every signal, with the specific fixes.
        </p>
        <div className="mt-8">
          <AuditForm />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
