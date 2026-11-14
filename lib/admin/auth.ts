import "server-only";

/* ══════════════════════════════════════════════════════════════
   Admin — who is calling (server only)
   ──────────────────────────────────────────────────────────────
   Every admin read (DAL) and write (server action) starts here.
   The role is read from the database on each request; the proxy
   only checks that someone is signed in.

   The returned client carries the admin's session, so Postgres
   row-level security (is_admin()) applies to every query as well.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";

export type AdminSupabase = Awaited<ReturnType<typeof createServerClient>>;

export interface AdminContext {
  supabase: AdminSupabase;
  userId: string;
  profileId: string;
  email: string;
  /** "super_admin" = store owner (settings, team); "admin" = staff. */
  role: "admin" | "super_admin";
}

/** The signed-in admin for this request, or null. Cached per request. */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) return null;

  return {
    supabase,
    userId: user.id,
    profileId: profile.id as string,
    email: user.email ?? "",
    role: profile.role as AdminContext["role"],
  };
});

export class AdminAccessError extends Error {
  constructor() {
    super("Admin access required.");
  }
}

/** For DAL reads: throws when the caller is not an admin. */
export async function requireAdminContext(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) throw new AdminAccessError();
  return ctx;
}
