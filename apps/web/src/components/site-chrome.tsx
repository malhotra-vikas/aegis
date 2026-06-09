import Link from 'next/link';
import type { ReactNode } from 'react';
import { SITE } from '../lib/marketing';

// Dark theme + teal brand accent (keeprsteady-style). The marketing surfaces wrap
// in <SitePage> so the dark theme stays scoped to marketing — /demo and /app keep
// their own light styling under the shared root layout.

export function SiteHeader() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold text-white">
          {SITE.name}
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/#how" className="text-slate-300 hover:text-white">
            How it works
          </Link>
          <Link href="/pricing" className="text-slate-300 hover:text-white">
            Pricing
          </Link>
          <Link href="/guides" className="text-slate-300 hover:text-white">
            Guides
          </Link>
          <Link href="/login" className="text-slate-300 hover:text-white">
            Sign in
          </Link>
          <Link href="/audit" className="rounded-lg bg-teal-400 px-3 py-1.5 font-semibold text-slate-950 hover:bg-teal-300">
            Free audit
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-2 p-6 text-sm text-slate-400">
        <p className="font-medium text-slate-200">{SITE.name}</p>
        <p>Ad-account health monitoring for Meta advertisers. We help you stay within policy and catch risk early.</p>
        <div className="flex gap-4">
          <Link href="/pricing" className="hover:text-teal-400">
            Pricing
          </Link>
          <Link href="/guides" className="hover:text-teal-400">
            Guides
          </Link>
          <Link href="/audit" className="hover:text-teal-400">
            Free audit
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Dark-themed marketing page shell: header + content + footer. */
export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
