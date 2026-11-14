"use client";

/* ══════════════════════════════════════════════════════════════
   Bag page — lines, summary and checkout
   ──────────────────────────────────────────────────────────────
   • On load the bag is checked against the server (validateCart):
     current prices, stock and products taken off sale. Prices and
     quantities are fixed in place and the buyer is told what
     changed; lines that can't be bought block checkout until
     removed or moved to the wishlist.
   • Delivery is "calculated at checkout" until the buyer picks a
     governorate here (remembered on this device); the estimate
     uses the store's own rates, the same ones checkout charges.
   • Checkout prices everything again on the server regardless.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ButtonLink, Select, Skeleton } from "@/components/ds";
import { useHydrated } from "@/components/shared/useHydrated";
import { useCartStore, selectCartTotalItems, type CartItem } from "@/lib/store/useCartStore";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { readSavedGovernorate, saveGovernorate } from "@/lib/store/useCheckoutStore";
import { validateCart } from "@/lib/actions/checkout";
import { GOVERNORATES } from "@/lib/checkout/shipping";
import { lineKey, maxQuantity, reconcileCart, type CartNotice, type LineStatus } from "@/lib/checkout/cart-sync";
import { shippingFeeFor, type ShippingSettings } from "@/lib/settings/types";
import { formatMoney, freeShippingProgress, round2, type Lang } from "@/components/checkout/checkout-rules";
import { noticeTone, panelTitle, totalRow } from "@/components/checkout/ui";
import { cn } from "@/lib/utils";
import { CartLine } from "./CartLine";
import { cartCopy } from "./copy";

interface CartPageContentProps {
  locale: string;
  rates: ShippingSettings;
  /** Shown when the bag is empty (category links, server-rendered). */
  emptyExtras?: ReactNode;
}

const nameOf = (i: CartItem, lang: Lang) => (lang === "ar" ? i.name_ar || i.name_en : i.name_en);

export function CartPageContent({ locale, rates, emptyExtras }: CartPageContentProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = cartCopy(lang);
  const mounted = useHydrated();
  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectCartTotalItems);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const wishlist = useWishlistStore((s) => s.productIds);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);

  /* ── Server check of the bag (when the set of lines changes) ── */
  const linesKey = items.map((i) => lineKey(i.productId, i.variantId)).sort().join("|");
  const [status, setStatus] = useState<{ key: string; lines: Record<string, LineStatus> } | null>(null);
  const [notices, setNotices] = useState<CartNotice[]>([]);

  useEffect(() => {
    if (!mounted || !linesKey) return;
    let cancelled = false;
    const snapshot = useCartStore.getState().items;
    validateCart(snapshot.map((i) => ({ productId: i.productId, variantId: i.variantId })))
      .then((lines) => {
        if (cancelled) return;
        const current = useCartStore.getState().items;
        const { notices: found, fixes } = reconcileCart(current, lines);
        if (fixes.length) {
          useCartStore.setState({
            items: current.map((i) => {
              const f = fixes.find((x) => x.cartKey === i.cartKey);
              return f ? { ...i, price: f.price ?? i.price, quantity: f.quantity ?? i.quantity } : i;
            }),
          });
        }
        setStatus({ key: linesKey, lines });
        setNotices((prev) => [...prev.filter((n) => !found.some((f) => f.cartKey === n.cartKey && f.kind === n.kind)), ...found]);
      })
      .catch(() => {
        /* offline: checkout checks again */
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, linesKey]);

  const lines = status?.lines ?? {};
  const unavailable = new Set(items.filter((i) => lines[lineKey(i.productId, i.variantId)]?.available === false || lines[lineKey(i.productId, i.variantId)]?.stock === 0).map((i) => i.cartKey));

  /* ── Delivery estimate ─────────────────────────────────────── */
  const [governorate, setGovernorate] = useState<string | null>(null);
  const chosen = governorate ?? (mounted ? readSavedGovernorate() : "");
  const subtotal = round2(items.filter((i) => !unavailable.has(i.cartKey)).reduce((n, i) => n + i.price * i.quantity, 0));
  const fee = chosen ? shippingFeeFor(rates, chosen, subtotal) : null;
  const progress = freeShippingProgress(subtotal, rates.freeThreshold);

  const noticeText = useMemo(
    () =>
      notices
        .map((n) => {
          const item = items.find((i) => i.cartKey === n.cartKey);
          if (!item) return null;
          const name = nameOf(item, lang);
          if (n.kind === "price_changed") return t.priceChanged(name, formatMoney(n.from, lang), formatMoney(n.to, lang));
          if (n.kind === "low_stock") return t.lowStock(name, n.left);
          return t.goneNotice(name);
        })
        .filter((x): x is string => !!x),
    [notices, items, lang, t],
  );

  if (!mounted) return <CartSkeleton label={t.loading} />;

  if (items.length === 0) {
    return (
      <div className="container-x pb-8 pt-16 md:pt-24">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
          <h1 className="t-h1">{t.emptyTitle}</h1>
          <p className="text-text-secondary">{t.emptyBody}</p>
          {emptyExtras}
        </div>
      </div>
    );
  }

  function moveToWishlist(item: CartItem) {
    if (!wishlist.includes(item.productId)) toggleWishlist(item.productId);
    removeItem(item.cartKey);
    toast.success(t.movedToWishlist);
  }

  const blocked = unavailable.size > 0;

  return (
    <div className="container-x pb-16 pt-8 md:pt-12">
      <div className="flex items-baseline gap-4">
        <h1 className="t-h1">{t.title}</h1>
        <span className="text-sm text-text-muted">{t.count(count)}</span>
      </div>

      {noticeText.length ? (
        <div role="status" className={cn("mt-8 border px-4 py-3.5 text-sm rounded-sm", noticeTone.warning)}>
          <p className="font-medium">{t.updatesTitle}</p>
          <ul className="mt-1 flex flex-col gap-0.5 text-text-secondary">
            {noticeText.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 grid gap-x-16 gap-y-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-x-24">
        <ul className="divide-y divide-border border-y border-border" aria-label={t.title}>
          {items.map((item) => (
            <CartLine
              key={item.cartKey}
              item={item}
              lang={lang}
              unavailable={unavailable.has(item.cartKey)}
              max={maxQuantity(lines[lineKey(item.productId, item.variantId)])}
              onQuantity={(q) => updateQuantity(item.cartKey, q)}
              onRemove={() => {
                removeItem(item.cartKey);
                toast(t.removed);
              }}
              onMoveToWishlist={() => moveToWishlist(item)}
            />
          ))}
        </ul>

        <aside aria-labelledby="bag-summary" className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="flex flex-col gap-6 bg-surface p-6 md:p-8">
            <h2 id="bag-summary" className={panelTitle}>
              {t.summary}
            </h2>

            <div className="flex flex-col gap-3">
              <div className={totalRow}>
                <span className="text-text-secondary">{t.subtotal}</span>
                <span className="t-price">{formatMoney(subtotal, lang)}</span>
              </div>
              <div className={totalRow}>
                <span className="text-text-secondary">{t.delivery}</span>
                <span className={cn("t-price", fee === null && "font-normal text-text-muted")}>
                  {fee === null ? t.deliveryAtCheckout : fee === 0 ? t.free : formatMoney(fee, lang)}
                </span>
              </div>
              <Select
                id="bag-governorate"
                label={t.estimateFor}
                value={chosen}
                onChange={(e) => {
                  setGovernorate(e.target.value);
                  saveGovernorate(e.target.value);
                }}
                className="h-11 text-sm"
              >
                <option value="">{t.chooseGovernorate}</option>
                {GOVERNORATES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g[lang]}
                  </option>
                ))}
              </Select>
              <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
                <span className="text-base font-medium text-text-primary">{t.estimatedTotal}</span>
                <span className="t-price text-xl">{formatMoney(subtotal + (fee ?? 0), lang)}</span>
              </div>
            </div>

            {rates.freeThreshold > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-[0.8125rem] text-text-secondary">{progress.qualifies ? t.freeReached : t.freeLeft(formatMoney(progress.remaining, lang))}</p>
                <div
                  role="progressbar"
                  aria-label={t.freeProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                  className="h-0.5 w-full bg-border"
                >
                  <div className="h-full bg-text-primary transition-[width] duration-300 ease-out" style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <ButtonLink
                href="/checkout"
                size="lg"
                fullWidth
                aria-disabled={blocked || undefined}
                tabIndex={blocked ? -1 : undefined}
                onClick={(e) => {
                  if (blocked) e.preventDefault();
                }}
              >
                {t.checkout}
              </ButtonLink>
              {blocked ? <p className="text-[0.8125rem] text-destructive">{t.checkoutBlocked}</p> : null}
              <p className="text-center text-[0.8125rem] text-text-muted">{t.promoNote}</p>
            </div>
          </div>
          <p className="mt-4 text-center text-[0.8125rem] text-text-muted">{t.secure}</p>
        </aside>
      </div>
    </div>
  );
}

function CartSkeleton({ label }: { label: string }) {
  return (
    <div className="container-x pb-16 pt-8 md:pt-12" aria-busy="true" aria-label={label}>
      <Skeleton className="h-12 w-40" />
      <div className="mt-8 grid gap-x-16 gap-y-10 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-x-24">
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4 py-6 md:gap-6">
              <Skeleton className="h-[8.75rem] w-28 md:h-[11.25rem] md:w-36" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-auto h-11 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-[26rem]" />
      </div>
    </div>
  );
}
