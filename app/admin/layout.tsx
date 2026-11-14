/* ══════════════════════════════════════════════════════════════
   Admin layout — server component
   ──────────────────────────────────────────────────────────────
   Checks the admin role in the database on every request (the
   proxy only checks that someone is signed in), then renders the
   client shell with the sidebar counters and the signed-in user.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getAdminContext } from "@/lib/admin/auth";
import { brand, t as pick } from "@/lib/brand/config";
import { getLocale } from "@/lib/i18n/server";
import { createServerClient } from "@/lib/supabase/server";
import { getAdminProfileName, getQueueCounts } from "@/lib/dal/admin";
import AdminShell from "./AdminShell";
import { adminButton } from "./components/buttons";

export const metadata: Metadata = {
  title: { template: `%s · Admin · ${brand.name.en}`, default: `Admin · ${brand.name.en}` },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [ctx, locale] = await Promise.all([getAdminContext(), getLocale()]);

  if (!ctx) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?redirect=/admin");
    const ar = locale === "ar";
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <ShieldAlert aria-hidden="true" className="mb-5 size-10 text-text-muted" strokeWidth={1.25} />
        <h1 className="t-h2">{ar ? "لا تملك صلاحية الدخول" : "No access"}</h1>
        <p className="mt-3 max-w-md text-text-secondary">
          {ar ? "هذه المنطقة مخصّصة لفريق إدارة المتجر." : "This area is for the store's admin team."}
        </p>
        <Link href="/" className={adminButton("primary", "md", "mt-8")}>
          {ar ? "العودة إلى المتجر" : "Back to the store"}
        </Link>
      </div>
    );
  }

  const [counts, name, cookieStore] = await Promise.all([getQueueCounts(), getAdminProfileName(), cookies()]);
  return (
    <AdminShell
      locale={locale}
      storeName={pick(brand.name, locale)}
      initialCollapsed={cookieStore.get("admin_sidebar")?.value === "collapsed"}
      user={{ name, email: ctx.email, role: ctx.role }}
      counts={{
        toFulfil: counts.toFulfil,
        lowStock: counts.lowStock,
        pendingReviews: counts.pendingReviews,
        unreadMessages: counts.unreadMessages,
      }}
    >
      {children}
    </AdminShell>
  );
}
