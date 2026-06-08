// Demo-only authentication: a session is just the signed-in user's id in a
// cookie, no password. This is a local persona switcher to walk the three
// experiences — NOT production auth (that is Phase 0 proper). Real OAuth /
// sessions land with the NestJS api layer.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlatformRole } from "@aegis/db";
import { db } from "./db";

export const SESSION_COOKIE = "aegis_session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Resolve the logged-in user from the session cookie, with org membership. */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  return db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: { include: { org: { include: { subscription: true } } } },
    },
  });
}

/** Redirect to /login when there is no session. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a specific platform role; send the wrong role to their own home. */
export async function requireRole(role: PlatformRole) {
  const user = await requireUser();
  if (user.platformRole !== role) redirect(homePathFor(user.platformRole));
  return user;
}

/** The landing route for each persona. */
export function homePathFor(role: PlatformRole): string {
  switch (role) {
    case PlatformRole.ADMIN:
      return "/admin";
    case PlatformRole.SALES:
      return "/sales";
    case PlatformRole.CUSTOMER:
      return "/app";
  }
}
