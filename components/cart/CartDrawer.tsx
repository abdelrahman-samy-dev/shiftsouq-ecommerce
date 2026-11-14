"use client";

/* ══════════════════════════════════════════════════════════════
   CartDrawer — the mini-cart (ds Drawer, inline-end side)
   ──────────────────────────────────────────────────────────────
   Opened by the header bag, by useCartUi().openCart() anywhere,
   and automatically whenever something is added to the bag
   (outside the cart and checkout pages).
   Lines: photo, name, colour/size, quantity (1–10), remove, line
   price. Free-delivery progress uses the store's threshold from
   settings (passed in by the server). Prices are the cart's
   estimate: checkout recalculates the real total on the server.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Drawer } from "@/components/ds/Overlay";
import { QuantityStepper } from "@/components/ds/QuantityStepper";
import { buttonClasses } from "@/components/ds/Button";
import { useCartStore, selectCartSubtotal, selectCartTotalItems, type CartItem } from "@/lib/store/useCartStore";
import { useCartUi } from "@/lib/store/useCartUi";
import { useHydrated } from "@/components/shared/useHydrated";
import { shellCopy } from "@/components/layout/copy";
import { MAX_LINE_QUANTITY, clampQuantity, freeDeliveryProgress } from "@/components/layout/shell-rules";
import { formatPrice, cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";

interface CartDrawerProps {
  locale: Locale;
  /** settings.shipping.freeThreshold (0 = no free delivery). */
  freeThreshold: number;
  /** Top categories for the empty state. */
  categories: { href: string; label: string }[];
}

/** Pages where adding to the bag should not pop the drawer open. */
const NO_AUTO_OPEN = /^\/(cart|checkout)(\/|$)/;

export function CartDrawer({ locale, freeThreshold, categories }: CartDrawerProps) {
  const copy = shellCopy(locale);
  const hydrated = useHydrated();
  const open = useCartUi((s) => s.open);
  const openCart = useCartUi((s) => s.openCart);
  const closeCart = useCartUi((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectCartTotalItems);
  const subtotal = useCartStore(selectCartSubtotal);
  const pathname = usePathname();
  const [justAdded, setJustAdded] = useState<string | null>(null);

  // Close on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) closeCart();
  }

  // Open after "add to bag": an item with a newer addedAt than anything seen so far.
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);
  useEffect(() => {
    let newest = Math.max(Date.now() - 1000, ...useCartStore.getState().items.map((i) => i.addedAt));
    return useCartStore.subscribe((state) => {
      const latest = state.items.reduce<CartItem | null>((a, i) => (!a || i.addedAt > a.addedAt ? i : a), null);
      if (!latest || latest.addedAt <= newest) return;
      newest = latest.addedAt;
      if (NO_AUTO_OPEN.test(pathRef.current)) return;
      setJustAdded(latest.cartKey);
      openCart();
      // The drawer confirms the add; drop the duplicate "Added to bag" toast.
      window.setTimeout(() => toast.dismiss(), 0);
    });
  }, [openCart]);

  const onClose = () => {
    setJustAdded(null);
    closeCart();
  };

  const progress = freeDeliveryProgress(subtotal, freeThreshold);
  const sorted = [...items].sort((a, b) => b.addedAt - a.addedAt);
  const empty = items.length === 0;

  const footer = empty ? undefined : (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">{copy.subtotal}</span>
        <span className="t-price text-base">{formatPrice(subtotal, locale)}</span>
      </div>
      <p className="-mt-2 text-[0.8125rem] leading-relaxed text-text-muted">{copy.estimateNote}</p>
      <Link href="/checkout" onClick={onClose} className={buttonClasses("primary", "lg", true)}>
        {copy.checkout}
      </Link>
      <Link
        href="/cart"
        onClick={onClose}
        className="mx-auto inline-flex min-h-11 items-center text-sm underline decoration-border-hover underline-offset-4 hover:decoration-text-primary"
      >
        {copy.viewBag}
      </Link>
    </div>
  );

  return (
    <Drawer
      open={open && hydrated}
      onClose={onClose}
      side="end"
      title={
        <span>
          {copy.yourBag}
          {count ? <span className="ms-2 text-text-muted tabular-nums">{count}</span> : null}
        </span>
      }
      closeLabel={copy.close}
      footer={footer}
    >
      {empty ? (
        <div className="flex flex-col gap-6 px-5 py-10">
          <div className="flex flex-col gap-3">
            <h3 className="t-h2">{copy.emptyBag}</h3>
            <p className="text-text-secondary">{copy.emptyBagBody}</p>
          </div>
          {categories.length ? (
            <ul className="border-t border-border">
              {categories.map((c) => (
                <li key={c.href} className="border-b border-border">
                  <Link
                    href={c.href}
                    onClick={onClose}
                    className="group flex min-h-14 items-center justify-between gap-4 text-[0.9375rem]"
                  >
                    {c.label}
                    <span aria-hidden="true" className="text-text-muted transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1">
                      <span className="rtl:hidden">→</span>
                      <span className="ltr:hidden">←</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/shop" onClick={onClose} className={buttonClasses("primary", "lg", true)}>
            {copy.browseShop}
          </Link>
        </div>
      ) : (
        <>
          {progress.enabled ? (
            <div className="border-b border-border px-5 py-4">
              <p className="text-[0.8125rem] text-text-secondary" aria-live="polite">
                {progress.reached ? copy.freeDeliveryReached : copy.freeDeliveryLeft(formatPrice(progress.remaining, locale))}
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                aria-label={copy.freeDeliveryProgress}
                className="mt-3 h-0.5 w-full overflow-hidden bg-border"
              >
                <div
                  className={cn(
                    "h-full origin-[0_50%] rtl:origin-[100%_50%] transition-transform duration-500 ease-out motion-reduce:transition-none",
                    progress.reached ? "bg-success" : "bg-text-primary",
                  )}
                  style={{ transform: `scaleX(${progress.percent / 100})` }}
                />
              </div>
            </div>
          ) : null}

          <ul className="divide-y divide-border px-5">
            {sorted.map((item) => (
              <CartLine key={item.cartKey} item={item} locale={locale} highlight={item.cartKey === justAdded} onNavigate={onClose} />
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}

function CartLine({ item, locale, highlight, onNavigate }: { item: CartItem; locale: Locale; highlight: boolean; onNavigate: () => void }) {
  const copy = shellCopy(locale);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const name = locale === "ar" ? item.name_ar || item.name_en : item.name_en || item.name_ar;
  const colour = locale === "ar" ? item.color_ar || item.color_en : item.color_en || item.color_ar;
  const href = `/product/${item.slug}`;
  const meta = [colour, item.size ? `${copy.size} ${item.size}` : null].filter(Boolean).join(" · ");

  return (
    <li className={cn("flex gap-4 py-5 transition-colors duration-700", highlight && "animate-[fade-in_400ms_ease-out_both]")}>
      <Link href={href} onClick={onNavigate} tabIndex={-1} aria-hidden="true" className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden bg-surface">
        {item.image ? <Image src={item.image} alt="" fill sizes="80px" className="object-cover" /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} onClick={onNavigate} className="line-clamp-2 text-sm leading-snug hover:underline underline-offset-4 decoration-1">
            {name}
          </Link>
          <p className="t-price shrink-0 text-sm">{formatPrice(item.price * item.quantity, locale)}</p>
        </div>
        {meta ? (
          <p className="mt-1 flex items-center gap-1.5 text-[0.8125rem] text-text-muted">
            {item.color_hex ? (
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full ring-1 ring-border-hover" style={{ backgroundColor: item.color_hex }} />
            ) : null}
            {meta}
          </p>
        ) : null}
        {item.quantity > 1 ? (
          <p className="mt-0.5 text-[0.75rem] text-text-faint tabular-nums">
            {item.quantity} × {formatPrice(item.price, locale)}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <QuantityStepper
            size="md"
            locale={locale}
            value={item.quantity}
            min={1}
            max={MAX_LINE_QUANTITY}
            onChange={(q) => updateQuantity(item.cartKey, clampQuantity(q))}
          />
          <button
            type="button"
            onClick={() => removeItem(item.cartKey)}
            aria-label={copy.removeItem(name)}
            className="inline-flex min-h-11 items-center px-1 text-[0.8125rem] text-text-muted underline decoration-border-hover underline-offset-4 hover:text-text-primary"
          >
            {copy.remove}
          </button>
        </div>
      </div>
    </li>
  );
}
