"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutSidebar — Persistent Order Summary
   ──────────────────────────────────────────────────────────────
   Sticky sidebar showing cart items, promo code, subtotal,
   discount, shipping and total. The numbers come from the server
   quote (quoteCheckout) — the same prices, promo rules and
   shipping table the order will be charged with. Items are
   collapsible on mobile; the promo field and totals stay visible.
   ══════════════════════════════════════════════════════════════ */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, ShoppingBag, Package, Truck, Tag, X, Loader2 } from "lucide-react";
import { useCartStore, selectCartTotalItems } from "@/lib/store/useCartStore";
import { cn } from "@/lib/utils";
import { formatMoney, freeShippingProgress, type CheckoutTotals } from "./checkout-rules";

interface CheckoutSidebarProps {
  locale: string;
  /** Totals to show (server quote, or a local estimate while it loads). */
  totals: CheckoutTotals;
  /** Server unit price per line, keyed "<productId>:<variantId>". */
  unitPrices?: Record<string, number | null>;
  /** True while a newer quote is on its way. */
  updating?: boolean;
  /** Promo code accepted for this cart, if any. */
  promoCode: string | null;
  /** Message about the promo code (e.g. it stopped applying after a cart change). */
  promoNotice?: string | null;
  /** Checks a code on the server; resolves to an error message, or null when applied. */
  onApplyPromo: (code: string) => Promise<string | null>;
  onRemovePromo: () => void;
  /** Lock the promo field while an order is being placed / paid. */
  locked?: boolean;
}

export function CheckoutSidebar({
  locale,
  totals,
  unitPrices,
  updating = false,
  promoCode,
  promoNotice,
  onApplyPromo,
  onRemovePromo,
  locked = false,
}: CheckoutSidebarProps) {
  const isAr = locale === "ar";
  const lang = isAr ? "ar" : "en";
  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore(selectCartTotalItems);
  const progress = freeShippingProgress(totals.afterDiscount);

  const [isExpanded, setIsExpanded] = useState(false);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const apply = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || applying) return;
    setApplying(true);
    setPromoError(null);
    try {
      const error = await onApplyPromo(trimmed);
      if (error) setPromoError(error);
      else setCode("");
    } finally {
      setApplying(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="card-elevated overflow-hidden lg:sticky lg:top-24"
      aria-busy={updating}
    >
      {/* Mobile Toggle */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between p-4 text-start"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)" }}
          >
            <ShoppingBag size={16} className="text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {isAr ? "ملخص الطلب" : "Order Summary"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {itemCount} {isAr ? (itemCount === 1 ? "منتج" : "منتجات") : itemCount === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">{formatMoney(totals.total, lang)}</span>
          <ChevronDown
            size={18}
            className={cn("text-[var(--text-muted)] transition-transform duration-300", isExpanded && "rotate-180")}
          />
        </div>
      </button>

      <div className="px-5 pb-5 lg:p-6">
        {/* Desktop Title */}
        <h2 className="hidden lg:flex items-center gap-2 text-lg font-bold text-[var(--text-primary)] mb-5">
          <ShoppingBag size={18} strokeWidth={2} />
          {isAr ? "ملخص الطلب" : "Order Summary"}
        </h2>

        {/* Items List (collapsible on mobile) */}
        <div className={cn("hidden lg:block", isExpanded && "!block")}>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pe-1">
            {items.map((item) => {
              const serverPrice = unitPrices?.[`${item.productId}:${item.variantId}`];
              const unit = typeof serverPrice === "number" ? serverPrice : item.price;
              const unavailable = serverPrice === null;
              return (
                <div
                  key={item.cartKey}
                  className="flex gap-3 py-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  {/* Thumbnail */}
                  <Link href={`/product/${item.slug}`} className="relative w-14 h-14 flex-shrink-0 group/thumb">
                    <div
                      className="w-full h-full rounded-lg overflow-hidden relative transition-opacity group-hover/thumb:opacity-80"
                      style={{ background: "var(--surface)" }}
                    >
                      <Image src={item.image} alt={isAr ? item.name_ar : item.name_en} fill sizes="56px" className="object-cover" />
                    </div>
                    {/* Quantity badge */}
                    <span className="absolute -top-2 -end-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-950 z-10">
                      {item.quantity}
                    </span>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.slug}`}
                      className="block text-sm font-medium text-[var(--text-primary)] truncate hover:text-[var(--accent)] transition-colors"
                    >
                      {isAr ? item.name_ar : item.name_en}
                    </Link>
                    {(item.size || item.color_en) && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {[item.size, isAr ? item.color_ar : item.color_en].filter(Boolean).join(" / ")}
                      </p>
                    )}
                    {unavailable && (
                      <p className="text-xs text-[var(--destructive)] mt-0.5">
                        {isAr ? "لم يعد هذا المنتج متاحًا" : "No longer available"}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <span className="text-sm font-semibold text-[var(--text-primary)] flex-shrink-0">
                    {formatMoney(unit * item.quantity, lang)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="divider my-4" />
        </div>

        {/* Promo code */}
        {promoCode ? (
          <div
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm"
            style={{ background: "var(--success-bg)", border: "1px solid var(--border)" }}
          >
            <span className="flex items-center gap-2 min-w-0 text-[var(--text-primary)]">
              <Tag size={14} className="text-[var(--success)] flex-shrink-0" />
              <span className="font-mono font-semibold truncate" dir="ltr">{promoCode.toUpperCase()}</span>
              <span className="text-xs text-[var(--text-muted)]">{isAr ? "مُطبَّق" : "applied"}</span>
            </span>
            <button
              type="button"
              onClick={onRemovePromo}
              disabled={locked}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <X size={14} />
              {isAr ? "إزالة" : "Remove"}
            </button>
          </div>
        ) : (
          <form onSubmit={apply} className="space-y-1.5" noValidate>
            <label htmlFor="checkout-promo" className="block text-xs font-semibold text-[var(--text-secondary)]">
              {isAr ? "رمز الخصم" : "Promo code"}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 input-field">
                <Tag size={14} className="text-[var(--text-faint)] flex-shrink-0" />
                <input
                  id="checkout-promo"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (promoError) setPromoError(null);
                  }}
                  maxLength={40}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  dir="ltr"
                  disabled={locked}
                  aria-invalid={!!promoError}
                  aria-describedby={promoError || promoNotice ? "checkout-promo-msg" : undefined}
                  placeholder={isAr ? "أدخل الرمز" : "Enter code"}
                  className={cn(
                    "flex-1 min-w-0 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] uppercase placeholder:normal-case placeholder:text-[var(--text-muted)]",
                    isAr && "text-right"
                  )}
                />
              </div>
              <button
                type="submit"
                disabled={!code.trim() || applying || locked}
                className="btn-secondary h-10 px-4 text-sm font-semibold gap-1.5 flex-shrink-0"
              >
                {applying && <Loader2 size={14} className="animate-spin" />}
                {isAr ? "تطبيق" : "Apply"}
              </button>
            </div>
            {(promoError || promoNotice) && (
              <p id="checkout-promo-msg" className="text-xs text-[var(--destructive)]" role="alert">
                {promoError || promoNotice}
              </p>
            )}
          </form>
        )}

        <div className="divider my-4" />

        {/* Summary Lines */}
        <div className={cn("space-y-2.5 transition-opacity", updating && "opacity-60")}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Package size={14} className="text-[var(--text-faint)]" />
              {isAr ? "المجموع الفرعي" : "Subtotal"}
            </span>
            <span className="font-semibold text-[var(--text-primary)]">{formatMoney(totals.subtotal, lang)}</span>
          </div>

          {totals.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Tag size={14} className="text-[var(--text-faint)]" />
                {isAr ? "الخصم" : "Discount"}
                {promoCode && (
                  <span className="text-xs text-[var(--text-muted)] font-mono" dir="ltr">
                    ({promoCode.toUpperCase()})
                  </span>
                )}
              </span>
              <span className="font-semibold text-[var(--success)]" dir="ltr">
                −{formatMoney(totals.discount, lang)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Truck size={14} className="text-[var(--text-faint)]" />
              {isAr ? "الشحن" : "Shipping"}
            </span>
            <span className="font-semibold text-[var(--text-primary)]">
              {totals.shipping === 0 ? (
                <span className="text-success">{isAr ? "مجانًا" : "Free"}</span>
              ) : totals.shipping !== null ? (
                formatMoney(totals.shipping, lang)
              ) : (
                <span className="text-[var(--text-faint)] text-xs font-normal">
                  {isAr ? "يُحدَّد بعد اختيار المحافظة" : "Calculated after you choose a governorate"}
                </span>
              )}
            </span>
          </div>

          {/* Free shipping progress (same threshold the server applies, after discount) */}
          {!progress.qualifies && items.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
                <span>
                  {isAr
                    ? `أضف ${formatMoney(progress.remaining, lang)} لتحصل على شحن مجاني`
                    : `Add ${formatMoney(progress.remaining, lang)} more for free shipping`}
                </span>
                <span dir="ltr">{progress.percent}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-inset)" }}>
                <div className="h-full rounded-full" style={{ width: `${progress.percent}%`, background: "var(--accent)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="divider my-4" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-[var(--text-primary)]">{isAr ? "الإجمالي" : "Total"}</span>
          <span className={cn("text-xl font-bold text-[var(--text-primary)] transition-opacity", updating && "opacity-60")}>
            {formatMoney(totals.total, lang)}
          </span>
        </div>
        {totals.shipping === null && (
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {isAr ? "لا يشمل الشحن بعد." : "Shipping not included yet."}
          </p>
        )}
      </div>
    </motion.div>
  );
}
