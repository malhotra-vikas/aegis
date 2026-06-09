import { signOut, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';
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

export default async function AppHome({ searchParams }: { searchParams: Promise<{ meta?: string; accounts?: string }> }) {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });
  const { meta } = await searchParams;

  let accounts: AccountRisk[] = [];
  let loadError: string | null = null;
  try {
    const res = await api('/accounts', accessToken);
    if (res.ok) accounts = (await res.json()) as AccountRisk[];
    else loadError = `could not load accounts: ${res.status}`;
  } catch {
    loadError = 'api unreachable';
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Aegis</h1>
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
