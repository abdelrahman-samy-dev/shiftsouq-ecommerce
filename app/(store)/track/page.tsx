/* ══════════════════════════════════════════════════════════════
   Order tracking — /track (guests and members)
   Order number + email → status timeline. Private: never indexed.
   ══════════════════════════════════════════════════════════════ */

import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { normalizeOrderNumber } from "@/components/checkout/checkout-rules";
import { TrackOrder } from "./TrackOrder";
import { trackCopy } from "./copy";

export async function generateMetadata(): Promise<Metadata> {
  const t = trackCopy(await getLocale());
  return { title: t.title, description: t.intro, robots: { index: false, follow: false } };
}

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string | string[] }> }) {
  const [{ order }, locale] = await Promise.all([searchParams, getLocale()]);
  const initialOrder = typeof order === "string" ? normalizeOrderNumber(order).slice(0, 40) : "";
  return <TrackOrder locale={locale} initialOrder={initialOrder} />;
}
