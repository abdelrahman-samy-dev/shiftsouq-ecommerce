"use client";

/* ══════════════════════════════════════════════════════════════
   ProductDetail — gallery + buy panel of the product page
   ──────────────────────────────────────────────────────────────
   Holds the selection (colour, size, quantity) shared by the
   gallery (photos of the chosen colour) and the sticky panel.

   Rules kept from checkout (place_order()):
   • a single colour / size is chosen for the buyer;
   • sold-out options are struck through, still focusable, and
     can't be chosen;
   • the price is the server rule (lib/seo/pricing): the chosen
     variant's price, else "From" the lowest price in stock;
   • "Add to bag" adds that exact variant at that price, never
     more than the stock (capped at 10), and is disabled when
     sold out.
   Server-rendered parts (breadcrumbs, title, accordions) come in
   as `intro` and `info`.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Price, QuantityStepper } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { priceSummary, unitPrice } from "@/lib/seo/pricing";
import { useCartStore } from "@/lib/store/useCartStore";
import { useCartUi } from "@/lib/store/useCartUi";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { useHydrated } from "./use-hydrated";
import ProductGallery from "./ProductGallery";
import DeliveryPromise, { type DeliverySettings } from "./DeliveryPromise";
import StickyAddBar from "./StickyAddBar";
import {
  colourKey,
  colourOptions,
  imagesForColour,
  initialSize,
  maxQuantity,
  resolveVariant,
  sizeOptions,
  stockState,
  type PdpImage,
  type PdpVariant,
  type SizeSystem,
} from "./pdp-logic";
import { sizeHeading, sizeLabel, sizeTable } from "./size-guide";
import { pdpCopy } from "./pdp-copy";

const SizeGuideDrawer = dynamic(() => import("./SizeGuideDrawer"), { ssr: false });

export interface ProductDetailData {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  base_price: number;
  sale_price: number | null;
  sizeSystem: SizeSystem;
  variants: (PdpVariant & { position: number })[];
  images: PdpImage[];
}

interface ProductDetailProps {
  product: ProductDetailData;
  locale: Locale;
  initialColour: string | null;
  settings: DeliverySettings & { lowStockThreshold: number };
  intro: ReactNode;
  info: ReactNode;
}

export default function ProductDetail({ product, locale, initialColour, settings, intro, info }: ProductDetailProps) {
  const copy = pdpCopy(locale);
  const isAr = locale === "ar";
  const uid = useId();
  const name = isAr ? product.name_ar || product.name_en : product.name_en;
  const { variants } = product;

  /* ── Options ──────────────────────────────────────────────── */
  const colours = useMemo(() => colourOptions(variants), [variants]);
  const [colour, setColour] = useState<string | null>(initialColour);
  const [size, setSize] = useState<string | null>(() => initialSize(variants));
  const [quantity, setQuantity] = useState(1);
  const [selectError, setSelectError] = useState(false);
  const [guide, setGuide] = useState<"closed" | "open" | "unmounted">("unmounted");

  const sizes = useMemo(() => sizeOptions(variants, colour), [variants, colour]);
  const hasSizes = sizes.length > 0;
  const showSizePicker = hasSizes && !(sizes.length === 1 && product.sizeSystem === "one_size");
  const selectedColour = colours.find((c) => c.key === colour) ?? null;
  const variant = resolveVariant(variants, colour, size);
  const needsColour = colours.length > 0 && !colour;
  const needsSize = hasSizes && !size;
  const images = useMemo(
    () => imagesForColour(product.images, colour, selectedColour?.en),
    [product.images, colour, selectedColour?.en],
  );

  /* ── Price (server rule) ─────────────────────────────────── */
  const scope = colour ? variants.filter((v) => colourKey(v) === colour) : variants;
  const summary = priceSummary(product, scope.length ? scope : variants);
  const price = variant ? unitPrice(product, variant) : summary.price;
  const compareAt = product.base_price > price ? product.base_price : null;
  const discount = compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  const showFrom = !variant && summary.varies;

  /* ── Stock & call to action ──────────────────────────────── */
  const purchasable = variants.length > 0;
  const selectionSoldOut = variant
    ? variant.stock <= 0
    : !(colour ? scope : variants).some((v) => v.stock > 0);
  const comboMissing = purchasable && !variant && !needsColour && !needsSize;
  const disabled = !purchasable || selectionSoldOut || comboMissing;
  const max = disabled ? 1 : maxQuantity(variant?.stock ?? null);
  const qty = Math.min(quantity, max);
  const stock = variant ? stockState(variant.stock, settings.lowStockThreshold) : null;
  const ctaLabel = !purchasable || selectionSoldOut ? copy.soldOut : comboMissing ? copy.unavailable : copy.addToBag;

  /* ── Stores ──────────────────────────────────────────────── */
  const hydrated = useHydrated();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartUi((s) => s.openCart);
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const wishlistIds = useWishlistStore((s) => s.productIds);
  const wishlisted = hydrated && wishlistIds.includes(product.id);

  const ctaRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  /* Keep ?color= in the address bar so the chosen colour can be shared. */
  useEffect(() => {
    if (!colour || colours.length < 2) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("color") === colour) return;
    url.searchParams.set("color", colour);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [colour, colours.length]);

  function chooseColour(key: string) {
    setColour(key);
    setSelectError(false);
    // Keep the size only if this colour has it in stock.
    if (size && sizes.length > 1) {
      const inColour = sizeOptions(variants, key).find((s) => s.size === size);
      if (!inColour || inColour.stock <= 0) setSize(null);
    }
  }

  function add() {
    if (!variant) {
      if (needsColour || needsSize) {
        setSelectError(true);
        const group = optionsRef.current;
        group?.scrollIntoView({ behavior: "smooth", block: "center" });
        group?.querySelector<HTMLButtonElement>("button[aria-pressed='false'][aria-disabled='false']")?.focus({ preventScroll: true });
      }
      return;
    }
    if (variant.stock <= 0) return;
    const inBag = useCartStore.getState().items.find((i) => i.variantId === variant.id)?.quantity ?? 0;
    const room = maxQuantity(variant.stock) - inBag;
    if (room <= 0) {
      toast(copy.bagFull, { action: { label: copy.viewBag, onClick: openCart } });
      return;
    }
    addItem({
      productId: product.id,
      variantId: variant.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      slug: product.slug,
      image: images[0]?.url ?? "",
      size: variant.size,
      color_en: variant.color_en,
      color_ar: variant.color_ar,
      color_hex: variant.color_hex,
      price: unitPrice(product, variant),
      quantity: Math.min(qty, room),
    });
    const detail = [selectedColour?.[locale], variant.size ? sizeLabel(product.sizeSystem, variant.size, locale) : null]
      .filter(Boolean)
      .join(" · ");
    toast.success(copy.addedToBag, { description: detail ? `${name} — ${detail}` : name });
    openCart();
  }

  const errorId = `${uid}-error`;
  const colourLabelId = `${uid}-colour`;
  const sizeLabelId = `${uid}-size`;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-20">
      {/* ── Gallery (edge to edge on phones) ────────────────── */}
      <div className="-mx-[var(--gutter)] lg:mx-0">
        <ProductGallery key={colour ?? "all"} images={images} productName={name} locale={locale} />
      </div>

      {/* ── Panel ───────────────────────────────────────────── */}
      <div className="pt-6 lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:self-start lg:pt-1">
        <div className="flex flex-col gap-4">
          {intro}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {showFrom ? <span className="text-[0.8125rem] text-text-muted">{copy.from}</span> : null}
            <Price amount={price} compareAt={compareAt} locale={locale} size="lg" />
            {discount > 0 ? <Badge tone="accent"><span dir="ltr">−{discount}%</span></Badge> : null}
          </div>
        </div>

        {/* Options */}
        <div ref={optionsRef} className="mt-8 flex flex-col gap-6">
          {colours.length > 0 ? (
            <div role="group" aria-labelledby={colourLabelId}>
              <p id={colourLabelId} className="mb-2 text-[0.8125rem] text-text-muted">
                {copy.colour}
                {selectedColour ? <span className="text-text-primary">: {selectedColour[locale]}</span> : null}
              </p>
              <div className="-ms-1.5 flex flex-wrap">
                {colours.map((c) => {
                  const selected = c.key === colour;
                  const blocked = !c.inStock && !selected;
                  const label = c.inStock ? c[locale] : `${c[locale]} — ${copy.soldOutShort}`;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => (blocked ? undefined : chooseColour(c.key))}
                      aria-pressed={selected}
                      aria-disabled={blocked}
                      aria-label={label}
                      title={label}
                      className={cn("relative inline-flex size-11 items-center justify-center rounded-full", blocked && "cursor-not-allowed")}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block size-7 rounded-full outline-1 outline-offset-[3px] transition-[outline-color] duration-150",
                          "shadow-[inset_0_0_0_1px_var(--border-hover)]",
                          selected ? "outline-text-primary" : "outline-transparent",
                          !c.inStock && "opacity-40",
                        )}
                        style={{ backgroundColor: c.hex ?? "var(--surface-inset)" }}
                      />
                      {!c.inStock ? (
                        <span aria-hidden="true" className="pointer-events-none absolute h-px w-8 -rotate-45 bg-text-secondary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {showSizePicker ? (
            <div role="group" aria-labelledby={sizeLabelId} aria-describedby={selectError ? errorId : undefined}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <p id={sizeLabelId} className="text-[0.8125rem] text-text-muted">
                  {sizeHeading(product.sizeSystem, locale)}
                  {size ? <span className="text-text-primary">: {sizeLabel(product.sizeSystem, size, locale)}</span> : null}
                </p>
                {sizeTable(product.sizeSystem) ? (
                  <button
                    type="button"
                    onClick={() => setGuide("open")}
                    className="-my-3 py-3 text-[0.8125rem] text-text-primary underline decoration-border-hover underline-offset-4 hover:decoration-text-primary"
                  >
                    {copy.sizeGuide}
                  </button>
                ) : null}
              </div>
              <div
                className={cn(
                  "grid gap-1.5",
                  product.sizeSystem === "kids" && isAr
                    ? "grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))]"
                    : "grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))]",
                )}
              >
                {sizes.map((s) => {
                  const selected = s.size === size;
                  const out = s.stock <= 0;
                  const blocked = out && !selected;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      onClick={() => {
                        if (blocked) return;
                        setSize(selected && sizes.length > 1 ? null : s.size);
                        setSelectError(false);
                      }}
                      aria-pressed={selected}
                      aria-disabled={blocked}
                      title={out ? copy.soldOutShort : undefined}
                      className={cn(
                        "relative h-11 overflow-hidden rounded-[2px] border px-2 text-[0.8125rem] tabular-nums transition-colors duration-150",
                        selected
                          ? "border-text-primary bg-text-primary text-background"
                          : out
                            ? "cursor-not-allowed border-border text-text-faint"
                            : "border-border text-text-primary hover:border-text-primary",
                      )}
                    >
                      {sizeLabel(product.sizeSystem, s.size, locale)}
                      {out ? (
                        <>
                          <span className="sr-only"> — {copy.soldOutShort}</span>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--border-hover)_50%,transparent_calc(50%+0.5px))]"
                          />
                        </>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {selectError && (needsColour || needsSize) ? (
            <p id={errorId} role="alert" className="-mt-3 text-[0.8125rem] text-destructive">
              {needsColour ? copy.chooseColourFirst : copy.chooseSizeFirst}
            </p>
          ) : null}
        </div>

        {/* Quantity, add to bag, wishlist */}
        <div className="mt-8 flex flex-col gap-3">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <QuantityStepper value={qty} onChange={setQuantity} min={1} max={max} locale={locale} />
            <p className="text-end text-[0.8125rem]" aria-live="polite">
              {stock?.kind === "low" ? (
                <span className="text-warning">{copy.onlyLeft(stock.count)}</span>
              ) : stock?.kind === "in" ? (
                <span className="inline-flex items-center gap-2 text-text-muted">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                  {copy.inStock}
                </span>
              ) : comboMissing ? (
                <span className="text-text-muted">{copy.unavailable}</span>
              ) : null}
            </p>
          </div>
          <div ref={ctaRef} className="flex gap-2">
            <Button
              size="lg"
              fullWidth
              onClick={add}
              disabled={disabled}
              aria-describedby={selectError ? errorId : undefined}
              className="min-w-0 flex-1"
            >
              {ctaLabel}
            </Button>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-pressed={wishlisted}
              aria-label={wishlisted ? copy.removeWishlist : copy.addWishlist}
              title={wishlisted ? copy.removeWishlist : copy.addWishlist}
              className="inline-flex size-13 shrink-0 items-center justify-center rounded-sm border border-border text-text-primary transition-colors hover:border-text-primary"
            >
              <Heart className={cn("size-5", wishlisted && "fill-current")} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="mt-7">
          <DeliveryPromise settings={settings} amount={price * qty} locale={locale} />
        </div>

        <div className="mt-8">{info}</div>
      </div>

      <StickyAddBar
        targetRef={ctaRef}
        name={name}
        price={price}
        compareAt={compareAt}
        showFrom={showFrom}
        label={ctaLabel}
        disabled={disabled}
        onAdd={add}
        locale={locale}
      />

      {guide !== "unmounted" ? (
        <SizeGuideDrawer
          open={guide === "open"}
          onClose={() => setGuide("closed")}
          system={product.sizeSystem}
          productSizes={sizes.map((s) => s.size)}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
