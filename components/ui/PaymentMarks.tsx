/* ══════════════════════════════════════════════════════════════
   PaymentMarks — the payment methods a store accepts, shown the way
   shoppers recognise them: card-scheme logos (Visa, Mastercard,
   Meeza) on small white tiles, plus clear icon tiles for cash on
   delivery and mobile wallets. Tiles stay white in dark mode so the
   brand colours keep their contrast. Server-safe (no hooks).
   Logos: public/payments/*.svg.
   ══════════════════════════════════════════════════════════════ */

import { Banknote, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMarkId = "cod" | "visa" | "mastercard" | "meeza" | "wallet";

const LOGOS: Record<"visa" | "mastercard" | "meeza", { src: string; label: string; w: number; h: number }> = {
  visa: { src: "/payments/visa.svg", label: "Visa", w: 38, h: 13 },
  mastercard: { src: "/payments/mastercard.svg", label: "Mastercard", w: 30, h: 20 },
  meeza: { src: "/payments/meeza.svg", label: "Meeza", w: 42, h: 20 },
};

const tile =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[4px] border border-[#e4e0d8] bg-white text-[#161513]";

/** One mark. `size` "md" = 32px tall (footer), "sm" = 24px (inside a checkout row). */
export function PaymentMark({
  id,
  locale,
  size = "md",
  className,
}: {
  id: PaymentMarkId;
  locale: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const isAr = locale === "ar";
  const h = size === "md" ? "h-8" : "h-6";

  if (id === "cod" || id === "wallet") {
    const Icon = id === "cod" ? Banknote : Smartphone;
    const label =
      id === "cod" ? (isAr ? "الدفع عند الاستلام" : "Cash on delivery") : isAr ? "المحافظ الإلكترونية" : "Mobile wallets";
    return (
      <span className={cn(tile, h, "px-2.5", className)}>
        <Icon className={size === "md" ? "size-4" : "size-3.5"} strokeWidth={1.75} aria-hidden="true" />
        <span className={cn("font-medium leading-none", size === "md" ? "text-[0.75rem]" : "text-[0.6875rem]")}>
          {label}
        </span>
      </span>
    );
  }

  const logo = LOGOS[id];
  const scale = size === "md" ? 1 : 0.8;
  return (
    <span className={cn(tile, h, size === "md" ? "min-w-14 px-2.5" : "min-w-11 px-2", className)} title={logo.label}>
      {/* Plain <img>: tiny static SVGs, no optimisation needed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt={logo.label}
        width={Math.round(logo.w * scale)}
        height={Math.round(logo.h * scale)}
        loading="lazy"
        decoding="async"
        className="block"
      />
    </span>
  );
}

/** The marks for the payment methods switched on in store settings. */
export function marksFor(payments: { cod: boolean; card: boolean; wallet: boolean }): PaymentMarkId[] {
  return [
    ...(payments.cod ? (["cod"] as const) : []),
    ...(payments.card ? (["visa", "mastercard", "meeza"] as const) : []),
    ...(payments.wallet ? (["wallet"] as const) : []),
  ];
}

export function PaymentMarks({
  ids,
  locale,
  size = "md",
  className,
  label,
}: {
  ids: PaymentMarkId[];
  locale: string;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  if (!ids.length) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)} aria-label={label}>
      {ids.map((id) => (
        <li key={id} className="flex">
          <PaymentMark id={id} locale={locale} size={size} />
        </li>
      ))}
    </ul>
  );
}
