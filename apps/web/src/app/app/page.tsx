import { signOut, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
import { Logo } from '../../components/logo';
import { type Bucket, RiskScoreCard } from '../../components/risk-score-card';

// The real (non-demo) authenticated risk dashboard. Requires WorkOS env; the
// demo lives separately under /demo and is unaffected.
export const dynamic = 'force-dynamic';

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001';

interface AccountRisk {
  id: string;
  externalId: string;
  displayName: string | null;
  score: number | null;
  bucket: 'GREEN' | 'AMBER' | 'RED' | null;
  assessable: boolean;
  lastSnapshotAt: string | null;
  signals: { definitionId: string; category: string; severity: string; contribution: number; explanation: string }[];
}

async function api(path: string, accessToken: string, init?: RequestInit) {
  return fetch(`${apiBase}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
}

async function connectMeta() {
  'use server';
  const { accessToken } = await withAuth({ ensureSignedIn: true });
  const res = await api('/oauth/meta/start', accessToken);
  if (!res.ok) throw new Error(`could not start Meta connect: ${res.status} ${await res.text()}`);
  const { authorizationUrl } = (await res.json()) as { authorizationUrl: string };
  redirect(authorizationUrl);
}

async function refreshRisk() {
  'use server';
  const { accessToken } = await withAuth({ ensureSignedIn: true });
  await api('/accounts/assess', accessToken, { method: 'POST' });
  redirect('/app');
}

async function upgrade(formData: FormData) {
  'use server';
  const tier = formData.get('tier');
  const { accessToken } = await withAuth({ ensureSignedIn: true });
  const res = await api('/billing/checkout', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) throw new Error(`checkout failed: ${res.status} ${await res.text()}`);
  const { url } = (await res.json()) as { url: string };
  redirect(url);
}

async function manageBilling() {
  'use server';
  const { accessToken } = await withAuth({ ensureSignedIn: true });
  const res = await api('/billing/portal', accessToken, { method: 'POST' });
  if (!res.ok) throw new Error(`portal failed: ${res.status}`);
  const { url } = (await res.json()) as { url: string };
  redirect(url);
}

export default async function AppHome({ searchParams }: { searchParams: Promise<{ meta?: string; upgraded?: string }> }) {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });
  const { meta, upgraded } = await searchParams;

  let accounts: AccountRisk[] = [];
  let loadError: string | null = null;
  try {
    const res = await api('/accounts', accessToken);
    if (res.ok) accounts = (await res.json()) as AccountRisk[];
    else loadError = `could not load accounts: ${res.status}`;
  } catch {
    loadError = 'api unreachable';
  }

  let plan: { tier: string; accountQuota: number } | null = null;
  try {
    const res = await api('/billing/subscription', accessToken);
    if (res.ok) plan = (await res.json()) as { tier: string; accountQuota: number } | null;
  } catch {
    plan = null;
  }
  const tier = plan?.tier ?? 'FREE';

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <Logo wordmarkClass="text-gray-900" />
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{user.email}</span>
          <form
            action={async () => {
              'use server';
              await signOut();
            }}
          >
            <button className="rounded border border-gray-300 px-3 py-1" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {meta === 'connected' && <p className="rounded bg-green-50 p-3 text-green-700">Meta account(s) connected.</p>}
      {meta === 'error' && <p className="rounded bg-red-50 p-3 text-red-700">Meta connection failed. Check the api logs.</p>}
      {upgraded && <p className="rounded bg-green-50 p-3 text-green-700">You’re upgraded — continuous monitoring is on.</p>}

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-sm">
          <span className="text-gray-500">Plan</span>{' '}
          <span className="font-semibold text-gray-900">{tier}</span>
          {plan && <span className="text-gray-500"> · up to {plan.accountQuota} accounts</span>}
        </div>
        {tier === 'FREE' ? (
          <form action={upgrade} className="flex gap-2">
            <button name="tier" value="SOLO" className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
              Solo · $39
            </button>
            <button name="tier" value="AGENCY" className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
              Agency · $149
            </button>
            <button name="tier" value="SCALE" className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
              Scale · $449
            </button>
          </form>
        ) : (
          <form action={manageBilling}>
            <button className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Manage billing</button>
          </form>
        )}
      </section>

      <div className="flex gap-3">
        <form action={connectMeta}>
          <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
            Connect Meta account
          </button>
        </form>
        {accounts.length > 0 && (
          <form action={refreshRisk}>
            <button className="rounded border border-gray-300 px-4 py-2" type="submit">
              Refresh risk
            </button>
          </form>
        )}
      </div>

      {loadError && <p className="text-red-600">{loadError}</p>}

      {!loadError && accounts.length === 0 && (
        <p className="text-gray-600">No connected accounts yet. Connect a Meta account to see its risk.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {accounts.map((acc) =>
          acc.assessable && acc.bucket && acc.score != null ? (
            <RiskScoreCard
              key={acc.id}
              displayName={acc.displayName ?? acc.externalId}
              externalId={acc.externalId}
              score={acc.score}
              bucket={acc.bucket as Bucket}
              signals={acc.signals.map((s) => ({ severity: s.severity, explanation: s.explanation, contribution: s.contribution }))}
            />
          ) : (
            <div key={acc.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-gray-900">{acc.displayName ?? acc.externalId}</p>
              <p className="text-xs text-gray-400">{acc.externalId}</p>
              <p className="mt-4 text-sm text-gray-500">{acc.lastSnapshotAt ? 'Not assessable — connection or data gap.' : 'Not yet assessed.'}</p>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
