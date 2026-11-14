/* Admin Promo codes — /admin/promos: list, create, edit, activate / deactivate. */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getPromoCodes } from "@/lib/dal/admin";
import { APP_NAME } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/types";
import { PromosClient } from "./PromosClient";

export const metadata: Metadata = {
  title: `Promo codes | ${APP_NAME} Admin`,
};

export default async function AdminPromosPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value === "ar" ? "ar" : "en") as Locale;
  const dict = await getDictionary(locale);
  const promos = await getPromoCodes();
  return <PromosClient promos={promos} locale={locale} currency={dict.common?.currency || "EGP"} />;
}
