/* ══════════════════════════════════════════════════════════════
   Address book — /account/addresses
   Add, edit, delete and choose the default delivery address.
   Signed-in buyers only; the data is theirs alone (RLS).
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getMyAddresses } from "@/lib/dal/account";
import { normalizeEgyptianMobile } from "@/components/checkout/checkout-rules";
import { AccountShell } from "../_components/AccountShell";
import { accountCopy } from "../_components/copy";
import { requireAccountUser } from "../_components/require-user";
import { AddressBook } from "./AddressBook";

export async function generateMetadata(): Promise<Metadata> {
  const t = accountCopy(await getLocale());
  return { title: t.addressesTitle, robots: { index: false, follow: false } };
}

export default async function AddressesPage() {
  const locale = await getLocale();
  const t = accountCopy(locale);
  const user = await requireAccountUser("/account/addresses");
  const addresses = await getMyAddresses();

  return (
    <AccountShell locale={locale} user={user} active="addresses" title={t.addressesTitle} intro={t.addressesIntro}>
      <AddressBook
        locale={locale}
        addresses={addresses}
        defaultName={user.fullName}
        defaultPhone={normalizeEgyptianMobile(user.phone) ?? ""}
      />
    </AccountShell>
  );
}
