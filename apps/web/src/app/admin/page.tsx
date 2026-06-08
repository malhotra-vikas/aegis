import { LeadStatus, PlatformRole, type RiskBucket, SubscriptionTier } from "@aegis/db";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { bucketBadge, money, pill } from "@/lib/format";
import { addLead, convertLead } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<LeadStatus, "gray" | "blue" | "amber" | "green" | "red"> = {
  NEW: "gray",
  CONTACTED: "blue",
  QUALIFIED: "amber",
  CONVERTED: "green",
  LOST: "red",
};

const OPEN_STATUSES: LeadStatus[] = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED];
const BUCKET_RANK: Record<RiskBucket, number> = { RED: 3, AMBER: 2, GREEN: 1 };

function worstBucket(buckets: (RiskBucket | null)[]): RiskBucket | null {
  return buckets.reduce<RiskBucket | null>((worst, b) => {
    if (!b) return worst;
    if (!worst || BUCKET_RANK[b] > BUCKET_RANK[worst]) return b;
    return worst;
  }, null);
}

export default async function AdminDashboard() {
  await requireRole(PlatformRole.ADMIN);

  const [reps, leads, orgs] = await Promise.all([
    db.user.findMany({ where: { platformRole: PlatformRole.SALES }, orderBy: { name: "asc" } }),
    db.lead.findMany({ include: { salesRep: true, organization: true }, orderBy: { createdAt: "desc" } }),
    db.organization.findMany({
      where: { deletedAt: null },
      include: { subscription: true, lead: { include: { salesRep: true } }, connectedAccounts: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const activeMrr = leads.filter((l) => l.status === "CONVERTED").reduce((s, l) => s + l.mrr, 0);
  const pipelineMrr = leads.filter((l) => OPEN_STATUSES.includes(l.status)).reduce((s, l) => s + l.mrr, 0);

  const byRep = reps.map((rep) => {
    const own = leads.filter((l) => l.salesRepId === rep.id);
    return {
      rep,
      closed: own.filter((l) => l.status === "CONVERTED").reduce((s, l) => s + l.mrr, 0),
      pipeline: own.filter((l) => OPEN_STATUSES.includes(l.status)).reduce((s, l) => s + l.mrr, 0),
      count: own.length,
    };
  });

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-1 text-sm text-gray-500">Leads, revenue, and customers across both GTM motions.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Active MRR" value={money(activeMrr)} sub={`${money(activeMrr * 12)} ARR`} />
        <Kpi label="Pipeline MRR" value={money(pipelineMrr)} sub={`${leads.filter((l) => OPEN_STATUSES.includes(l.status)).length} open leads`} />
        <Kpi label="Customers" value={String(orgs.length)} sub={`${orgs.filter((o) => !o.lead).length} self-serve`} />
        <Kpi label="Leads" value={String(leads.length)} sub={`${leads.filter((l) => l.status === "CONVERTED").length} converted`} />
      </div>

      {/* Revenue by rep */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Revenue by sales rep</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Sales rep</th>
                <th className="px-4 py-2 font-medium">Leads</th>
                <th className="px-4 py-2 font-medium text-right">Closed MRR</th>
                <th className="px-4 py-2 font-medium text-right">Pipeline MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byRep.map(({ rep, closed, pipeline, count }) => (
                <tr key={rep.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{rep.name ?? rep.email}</td>
                  <td className="px-4 py-2 text-gray-600">{count}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-green-700">{money(closed)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">{money(pipeline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Leads */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Leads</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Rep</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium text-right">MRR</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{lead.company}</td>
                  <td className="px-4 py-2 text-gray-600">{lead.contactEmail}</td>
                  <td className="px-4 py-2 text-gray-600">{lead.salesRep.name ?? lead.salesRep.email}</td>
                  <td className="px-4 py-2 text-gray-600">{lead.tier ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{money(lead.mrr)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill(STATUS_TONE[lead.status])}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {!lead.organizationId && lead.status !== "LOST" && (
                      <form action={convertLead}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <button className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700">
                          Convert
                        </button>
                      </form>
                    )}
                    {lead.organizationId && <span className="text-xs text-gray-400">customer ✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add lead */}
        <form action={addLead} className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-6">
          <input name="company" placeholder="Company" required className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <input name="contactEmail" type="email" placeholder="Contact email" required className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <input name="contactName" placeholder="Contact name" className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <select name="salesRepId" required className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name ?? r.email}</option>
            ))}
          </select>
          <select name="tier" defaultValue={SubscriptionTier.SOLO} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
            {Object.values(SubscriptionTier).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input name="mrr" type="number" min="0" step="1" placeholder="MRR" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          <button className="col-span-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
            Add lead
          </button>
        </form>
      </section>

      {/* Customers */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Customers</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Plan</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Accounts</th>
                <th className="px-4 py-2 font-medium">Worst standing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((org) => {
                const worst = worstBucket(org.connectedAccounts.map((a) => a.currentBucket));
                return (
                  <tr key={org.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{org.name}</td>
                    <td className="px-4 py-2 text-gray-600">{org.subscription?.tier ?? "FREE"}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {org.lead ? `Sales · ${org.lead.salesRep.name ?? org.lead.salesRep.email}` : "Self-serve"}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{org.connectedAccounts.length}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${bucketBadge(worst)}`}>
                        {worst ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
