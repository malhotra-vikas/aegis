import { getSignInUrl, getSignUpUrl } from '@workos-inc/authkit-nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SitePage } from '../../components/site-chrome';
import { SITE } from '../../lib/marketing';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Sign in — ${SITE.name}`,
  robots: { index: false },
};

// getSignInUrl/getSignUpUrl set a PKCE cookie, which Next only allows inside a
// Server Action or Route Handler — so the hand-off happens on button submit, not
// during render.
async function startSignIn() {
  'use server';
  redirect(await getSignInUrl());
}

async function startSignUp() {
  'use server';
  redirect(await getSignUpUrl());
}

export default function Login() {
  return (
    <SitePage>
      <section className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-white">Welcome to {SITE.name}</h1>
        <p className="mt-3 text-slate-400">Sign in to monitor your ad accounts, or create an account to get started.</p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <form action={startSignIn}>
            <button type="submit" className="w-full rounded-lg bg-teal-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-300">
              Sign in
            </button>
          </form>
          <form action={startSignUp}>
            <button type="submit" className="w-full rounded-lg border border-slate-700 px-6 py-3 font-medium text-slate-200 transition hover:bg-slate-800">
              Create an account
            </button>
          </form>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Just exploring?{' '}
          <Link href="/audit" className="text-teal-400 hover:underline">
            Run a free audit
          </Link>{' '}
          first — no account needed.
        </p>
      </section>
    </SitePage>
  );
}
