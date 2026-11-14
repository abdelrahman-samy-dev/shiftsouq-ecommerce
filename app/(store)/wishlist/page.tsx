/* ══════════════════════════════════════════════════════════════
   Wishlist — /wishlist
   Saved pieces (kept in this browser) as product cards with
   "Move to bag". Signed-in buyers see it inside their account;
   visitors get the same grid on a plain page.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getAccountUser } from "@/lib/dal/account";
import { WishlistPageContent } from "@/components/wishlist/WishlistPageContent";
import { AccountShell } from "@/app/(store)/account/_components/AccountShell";
import { accountCopy } from "@/app/(store)/account/_components/copy";

export async function generateMetadata(): Promise<Metadata> {
  return { title: accountCopy(await getLocale()).wishlist, robots: { index: false, follow: true } };
}

export default async function WishlistPage() {
  const [locale, user] = await Promise.all([getLocale(), getAccountUser()]);
  const t = accountCopy(locale);

  if (user) {
    return (
      <AccountShell locale={locale} user={user} active="wishlist" title={t.wishlist}>
        <WishlistPageContent locale={locale} showTitle={false} />
      </AccountShell>
    );
  }

  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <h1 className="t-h1">{t.wishlist}</h1>
      <div className="mt-10">
        <WishlistPageContent locale={locale} showTitle={false} />
      </div>
    </div>
  );
}
