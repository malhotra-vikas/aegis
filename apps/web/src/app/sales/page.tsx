import { LeadStatus, PlatformRole } from "@aegis/db";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, pill } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<LeadStatus, "gray" | "blue" | "amber" | "green" | "red"> = {
  NEW: "gray",
  CONTACTED: "blue",
  QUALIFIED: "amber",
  CONVERTED: "green",
  LOST: "red",
};
const OPEN_STATUSES: LeadStatus[] = [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED];

export default async function SalesDashboard() {
  const user = await requireRole(PlatformRole.SALES);

  const leads = await db.lead.findMany({
    where: { salesRepId: user.id },
    include: { organization: { include: { subscription: true } } },
    orderBy: { createdAt: "desc" },
  });

  const closed = leads.filter((l) => l.status === "CONVERTED");
  const closedMrr = closed.reduce((s, l) => s + l.mrr, 0);
  const pipelineMrr = leads.filter((l) => OPEN_STATUSES.includes(l.status)).reduce((s, l) => s + l.mrr, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">My pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">{user.name ?? user.email} · leads you own and the customers you brought in.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Kpi label="Closed MRR" value={money(closedMrr)} sub={`${money(closedMrr * 12)} ARR`} />
        <Kpi label="Pipeline MRR" value={money(pipelineMrr)} sub={`${leads.filter((l) => OPEN_STATUSES.includes(l.status)).length} open`} />
        <Kpi label="Customers won" value={String(closed.length)} sub="converted leads" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">My leads</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium text-right">MRR</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Customer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{lead.company}</td>
                  <td className="px-4 py-2 text-gray-600">{lead.contactEmail}</td>
                  <td className="px-4 py-2 text-gray-600">{lead.tier ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{money(lead.mrr)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill(STATUS_TONE[lead.status])}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{lead.organization?.name ?? "—"}</td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No leads assigned yet.</td>
                </tr>
              )}
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
