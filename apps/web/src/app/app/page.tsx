import { signOut, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

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

const BUCKET_CLASSES: Record<string, string> = {
  RED: 'bg-red-100 text-red-800 border-red-300',
  AMBER: 'bg-amber-100 text-amber-800 border-amber-300',
  GREEN: 'bg-green-100 text-green-800 border-green-300',
};

function bucketClasses(bucket: string | null): string {
  return (bucket && BUCKET_CLASSES[bucket]) ?? 'bg-gray-100 text-gray-600 border-gray-300';
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

      <div className="space-y-4">
        {accounts.map((acc) => (
          <section key={acc.id} className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-medium">{acc.displayName ?? acc.externalId}</h2>
                <p className="text-xs text-gray-500">{acc.externalId}</p>
              </div>
              <div className={`rounded border px-3 py-1 text-sm font-semibold ${bucketClasses(acc.bucket)}`}>
                {acc.assessable ? (
                  <>
                    {acc.bucket ?? '—'} · {acc.score != null ? Math.round(acc.score) : '—'}
                  </>
                ) : (
                  'Not assessable'
                )}
              </div>
            </div>

            {acc.signals.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {acc.signals.map((s) => (
                  <li key={s.definitionId} className="rounded bg-gray-50 p-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{s.severity}</span>
                      <span className="text-gray-500">{Math.round(s.contribution * 100)}%</span>
                    </div>
                    <p className="text-gray-700">{s.explanation}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                {acc.lastSnapshotAt ? 'No risk signals detected.' : 'Not yet assessed.'}
              </p>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
