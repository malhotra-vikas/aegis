'use server';

// Forwards the email-gated pre-assessment lead to the api (web holds no DB).
const apiBase = process.env.API_BASE_URL ?? 'http://localhost:3001';

export async function submitAuditLead(input: {
  email: string;
  indicativeScore: number;
  indicativeBucket: 'GREEN' | 'AMBER' | 'RED';
  answers: Record<string, boolean>;
}): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${apiBase}/audit/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
