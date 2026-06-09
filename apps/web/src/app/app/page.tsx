import { signOut, withAuth } from '@workos-inc/authkit-nextjs';
import { redirect } from 'next/navigation';

// The real (non-demo) authenticated app shell. Requires WorkOS env to be set;
// the demo lives separately under /demo and is unaffected.
export const dynamic = 'force-dynamic';

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001';

// Server action: ask the api for the Meta authorization URL (with our session),
// then send the browser to Meta to grant access.
async function connectMeta() {
  'use server';
  const { accessToken } = await withAuth({ ensureSignedIn: true });
  const res = await fetch(`${apiBase}/oauth/meta/start`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`could not start Meta connect: ${res.status} ${await res.text()}`);
  const { authorizationUrl } = (await res.json()) as { authorizationUrl: string };
  redirect(authorizationUrl);
}

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ meta?: string; accounts?: string }>;
}) {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });
  const { meta, accounts } = await searchParams;

  // Prove the web->api boundary: call the api as this user; it verifies the
  // WorkOS token, resolves the org, and returns the tenant context.
  let me: unknown = null;
  let apiError: string | null = null;
  try {
    const res = await fetch(`${apiBase}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (res.ok) me = await res.json();
    else apiError = `api /me responded ${res.status}: ${await res.text()}`;
  } catch {
    apiError = 'api unreachable';
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Aegis</h1>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>

      {meta === 'connected' && (
        <p className="rounded bg-green-50 p-3 text-green-700">Connected {accounts ?? 0} Meta ad account(s).</p>
      )}
      {meta === 'error' && (
        <p className="rounded bg-red-50 p-3 text-red-700">Meta connection failed. Check the api logs.</p>
      )}

      <section className="rounded border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">API tenant context (/me)</h2>
        {apiError ? (
          <p className="text-red-600">{apiError}</p>
        ) : (
          <pre className="text-sm">{JSON.stringify(me, null, 2)}</pre>
        )}
      </section>

      <form action={connectMeta}>
        <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
          Connect Meta account
        </button>
      </form>

      <form
        action={async () => {
          'use server';
          await signOut();
        }}
      >
        <button className="rounded bg-gray-900 px-4 py-2 text-white" type="submit">
          Sign out
        </button>
      </form>
    </main>
  );
}
