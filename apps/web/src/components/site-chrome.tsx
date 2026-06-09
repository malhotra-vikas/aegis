import Link from 'next/link';
import { SITE } from '../lib/marketing';

export function SiteHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold">
          {SITE.name}
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/#how" className="text-gray-600 hover:text-gray-900">
            How it works
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/guides" className="text-gray-600 hover:text-gray-900">
            Guides
          </Link>
          <Link href="/app" className="text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
          <Link href="/audit" className="rounded bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700">
            Free audit
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl space-y-2 p-6 text-sm text-gray-500">
        <p className="font-medium text-gray-700">{SITE.name}</p>
        <p>Ad-account health monitoring for Meta advertisers. We help you stay within policy and catch risk early.</p>
        <div className="flex gap-4">
          <Link href="/pricing" className="hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/guides" className="hover:text-gray-900">
            Guides
          </Link>
          <Link href="/audit" className="hover:text-gray-900">
            Free audit
          </Link>
        </div>
      </div>
    </footer>
  );
}
