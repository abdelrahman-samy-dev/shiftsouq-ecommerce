"use client";

/* ══════════════════════════════════════════════════════════════
   HeaderActions — wishlist and bag, with live counts
   ──────────────────────────────────────────────────────────────
   Counts come from the persisted stores, so they render only
   after hydration (0 on the server, no mismatch). The bag opens
   the mini-cart drawer; without JavaScript it is a plain link
   to /cart.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { useCartStore, selectCartTotalItems } from "@/lib/store/useCartStore";
import { useWishlistStore, selectWishlistCount } from "@/lib/store/useWishlistStore";
import { useCartUi } from "@/lib/store/useCartUi";
import { useHydrated } from "@/components/shared/useHydrated";
import { shellCopy } from "./copy";
import { cn } from "@/lib/utils";

export const headerIcon =
  "relative inline-flex size-10 items-center justify-center rounded-sm transition-colors duration-150 hover:bg-surface group-data-[overlay=light]/header:hover:bg-white/10 group-data-[overlay=dark]/header:hover:bg-black/5";

function Count({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-1 end-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] font-medium leading-none tabular-nums",
        "bg-text-primary text-background",
        "group-data-[overlay=light]/header:bg-white group-data-[overlay=light]/header:text-black group-data-[overlay=dark]/header:bg-black group-data-[overlay=dark]/header:text-white",
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

export function WishlistLink({ locale, className }: { locale: string; className?: string }) {
  const hydrated = useHydrated();
  const count = useWishlistStore(selectWishlistCount);
  const shown = hydrated ? count : 0;
  const label = shellCopy(locale).wishlistLabel(shown);
  return (
    <Link href="/wishlist" aria-label={label} title={label} className={cn(headerIcon, className)}>
      <Heart className="size-5" strokeWidth={1.5} />
      <Count value={shown} />
    </Link>
  );
}

export function BagButton({ locale, className }: { locale: string; className?: string }) {
  const hydrated = useHydrated();
  const count = useCartStore(selectCartTotalItems);
  const openCart = useCartUi((s) => s.openCart);
  const shown = hydrated ? count : 0;
  const label = shellCopy(locale).bagLabel(shown);
  return (
    <Link
      href="/cart"
      aria-label={label}
      title={label}
      aria-haspopup="dialog"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openCart();
      }}
      className={cn(headerIcon, className)}
    >
      <ShoppingBag className="size-5" strokeWidth={1.5} />
      <Count value={shown} />
    </Link>
  );
}
