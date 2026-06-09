import { PlatformRole, type Severity } from "@aegis/db";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { bucketBadge, pill } from "@/lib/format";

export const dynamic = "force-dynamic";

const SEVERITY_TONE: Record<Severity, "gray" | "amber" | "red"> = {
  INFO: "gray",
  WARNING: "amber",
  CRITICAL: "red",
};

function timeAgo(date: Date): string {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default async function CustomerDashboard() {
  const user = await requireRole(PlatformRole.CUSTOMER);
  const membership = user.memberships[0];
  const org = membership?.org;

  const accounts = org
    ? await db.connectedAccount.findMany({
        where: { orgId: org.id, deletedAt: null },
        orderBy: { currentScore: "desc" },
        include: {
          snapshots: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { signals: { orderBy: { contribution: "desc" } } },
          },
        },
      })
    : [];

  const atRisk = accounts.filter((a) => a.currentBucket !== "GREEN").length;

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{org?.name ?? "Your account"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Continuous ad-account health monitoring · {org?.subscription?.tier ?? "FREE"} plan
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {accounts.length} account{accounts.length === 1 ? "" : "s"} monitored
          <span className="block">
            {atRisk === 0 ? "all clear" : `${atRisk} need attention`}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {accounts.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            No connected ad accounts yet.
          </div>
        )}

        {accounts.map((account) => {
          const snapshot = account.snapshots[0];
          const signals = snapshot?.signals ?? [];
          return (
            <section key={account.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="font-medium text-gray-900">{account.displayName ?? account.externalId}</h2>
                  <p className="text-xs text-gray-500">
                    {account.externalId}
                    {account.lastSnapshotAt ? ` · checked ${timeAgo(account.lastSnapshotAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold tabular-nums text-gray-900">
                    {account.currentScore?.toFixed(0) ?? "—"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${bucketBadge(account.currentBucket)}`}
                  >
                    {account.currentBucket ?? "UNKNOWN"}
                  </span>
                </div>
              </div>

              {!account.assessable && (
                <div className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-800">
                  Assessment incomplete — we could not read every field, so this is the risk we can see.
                  Never reported as safe on partial data.
                </div>
              )}

              <div className="px-5 py-4">
                {signals.length === 0 ? (
                  <p className="text-sm text-green-700">
                    No risk signals detected. Clean bill of health on the last check.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {signals.map((s) => (
                      <li key={s.id} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill(SEVERITY_TONE[s.severity])}`}
                        >
                          {s.severity}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800">{s.explanation}</p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {s.definitionId} · confidence {(s.confidence * 100).toFixed(0)}% · playbook{" "}
                            <span className="text-gray-500">{s.remediationId}</span>
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
