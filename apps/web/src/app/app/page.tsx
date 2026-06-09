import { signOut, withAuth } from '@workos-inc/authkit-nextjs';

// The real (non-demo) authenticated app shell. Requires WorkOS env to be set;
// the demo lives separately under /demo and is unaffected.
export const dynamic = 'force-dynamic';

export default async function AppHome() {
  // ensureSignedIn redirects to the WorkOS sign-in flow when unauthenticated.
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001';

  // Prove the web->api boundary: call the api as this user; the api verifies the
  // WorkOS token, provisions/resolves the org, and returns the tenant context.
  let me: unknown = null;
  let apiError: string | null = null;
  try {
    const res = await fetch(`${apiBase}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (res.ok) me = await res.json();
    else apiError = `api /me responded ${res.status}`;
  } catch {
    apiError = 'api unreachable';
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Aegis</h1>
      <p>
        Signed in as <strong>{user.email}</strong>
      </p>
      <section className="rounded border border-gray-200 p-4">
        <h2 className="mb-2 font-medium">API tenant context (/me)</h2>
        {apiError ? (
          <p className="text-red-600">{apiError}</p>
        ) : (
          <pre className="text-sm">{JSON.stringify(me, null, 2)}</pre>
        )}
      </section>
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
