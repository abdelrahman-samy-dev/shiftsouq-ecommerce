/* ══════════════════════════════════════════════════════════════
   Admin Layout — Server Component
   ──────────────────────────────────────────────────────────────
   Verifies admin role securely via DB, then wraps children
   in the client-side Admin UI Shell.
   ══════════════════════════════════════════════════════════════ */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { Locale } from "@/lib/types";
import AdminShell from "./AdminShell";
import { getUnreadMessageCount } from "@/lib/dal/admin";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en";
  const dict = await getDictionary(locale);

  // Verify Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Strict DB-level Admin Check (Proxy only does an optimistic check)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white p-4">
        <div className="text-center bg-white dark:bg-zinc-900 p-8 rounded-2xl max-w-md w-full border border-red-500/20 shadow-xl shadow-red-500/5">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-5" />
          <h1 className="text-2xl font-bold mb-3 tracking-tight">Access Denied</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
            You do not have administrative privileges to access this secure area.
          </p>
          <Link href="/" className="btn-primary w-full inline-flex justify-center py-3">
            Return to Store
          </Link>
        </div>
      </div>
    );
  }

  const unreadMessages = await getUnreadMessageCount();

  return (
    <AdminShell userEmail={user.email || ""} dict={dict} locale={locale} unreadMessages={unreadMessages}>
      {children}
    </AdminShell>
  );
}
