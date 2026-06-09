import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001';

// Hands off to the api's anonymous audit start, which redirects to Meta. The
// email (from the pre-assessment) is carried through; no login required.
export default async function AuditConnect({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  if (!email) redirect('/audit');
  redirect(`${apiBase}/audit/connect/start?email=${encodeURIComponent(email)}`);
}
