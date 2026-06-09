import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/session-actions";
import { pill } from "@/lib/format";

const ROLE_TONE = { ADMIN: "blue", SALES: "green", CUSTOMER: "amber" } as const;

export async function TopBar() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/demo" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="inline-block h-5 w-5 rounded bg-gray-900" aria-hidden />
          Aegis
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            demo
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{user.name ?? user.email}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${pill(ROLE_TONE[user.platformRole])}`}
            >
              {user.platformRole}
            </span>
            <Link href="/demo" className="text-gray-500 hover:text-gray-900">
              Switch persona
            </Link>
            <form action={logout}>
              <button type="submit" className="text-gray-500 hover:text-gray-900">
                Log out
              </button>
            </form>
          </div>
        ) : (
          <Link href="/demo" className="text-sm text-gray-500 hover:text-gray-900">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
