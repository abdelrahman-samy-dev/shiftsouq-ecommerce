"use client";

/* ══════════════════════════════════════════════════════════════
   LazyCartDrawer — loads the mini-cart after the page is up
   ──────────────────────────────────────────────────────────────
   The drawer is invisible until opened, so its code (dialog,
   stepper, cart lines) stays out of the first bundle and arrives
   right after hydration. An openCart() call made earlier is kept
   in the useCartUi store and honoured as soon as it mounts.
   ══════════════════════════════════════════════════════════════ */

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CartDrawer as CartDrawerType } from "@/components/cart/CartDrawer";

const CartDrawer = dynamic(() => import("@/components/cart/CartDrawer").then((m) => m.CartDrawer), { ssr: false });

export function LazyCartDrawer(props: ComponentProps<typeof CartDrawerType>) {
  return <CartDrawer {...props} />;
}
