import { db } from "@/lib/db";
import { loginAs } from "@/lib/session-actions";
import { pill } from "@/lib/format";

export const dynamic = "force-dynamic";

const ROLE_TONE = { ADMIN: "blue", SALES: "green", CUSTOMER: "amber" } as const;
const ROLE_ORDER = { ADMIN: 0, SALES: 1, CUSTOMER: 2 } as const;

const ROLE_BLURB: Record<string, string> = {
  ADMIN: "Internal — manage leads, revenue, and customers",
  SALES: "Internal — your pipeline and the customers you brought in",
  CUSTOMER: "External advertiser — sees their own risk dashboard",
};

export default async function LoginPage() {
  const users = await db.user.findMany({
    include: { memberships: { include: { org: true } } },
  });
  users.sort(
    (a, b) =>
      ROLE_ORDER[a.platformRole] - ROLE_ORDER[b.platformRole] ||
      (a.name ?? a.email).localeCompare(b.name ?? b.email),
  );

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Log in as…</h1>
      <p className="mt-1 text-sm text-gray-500">
        Demo persona switcher — pick any account to experience the product as that role. No password
        (local demo only).
      </p>

      <ul className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {users.map((u) => {
          const org = u.memberships[0]?.org?.name;
          return (
            <li key={u.id}>
              <form action={loginAs}>
                <input type="hidden" name="userId" value={u.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50"
                >
                  <span>
                    <span className="block font-medium text-gray-900">{u.name ?? u.email}</span>
                    <span className="block text-xs text-gray-500">
                      {u.email}
                      {org ? ` · ${org}` : ""}
                    </span>
                    <span className="mt-1 block text-xs text-gray-400">
                      {ROLE_BLURB[u.platformRole]}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill(ROLE_TONE[u.platformRole])}`}
                  >
                    {u.platformRole}
                  </span>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
