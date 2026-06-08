"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { homePathFor, SESSION_COOKIE } from "./auth";

/** Log in as a seeded user (demo persona switch) and route to their home. */
export async function loginAs(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Unknown user");

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(homePathFor(user.platformRole));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
