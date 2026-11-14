"use client";

/* ══════════════════════════════════════════════════════════════
   ProductCard — editorial product tile (docs/design-system.md §5)
   ──────────────────────────────────────────────────────────────
   No box: photo on a sand ground, name and price underneath.
   • Second photo cross-fades in on hover (mouse only; it is
     fetched on the first hover, so phones never download it).
   • Quick add: a single option adds straight away; one colour in
     several sizes shows the sizes along the photo (hover on
     desktop, "+" on touch); several colours open the product.
   • Price = what checkout charges (lib/seo/pricing).
   ══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductImage, ProductVariant } from "@/lib/types";
import { Badge, Price } from "@/components/ds";
import { priceSummary, unitPrice, variantInStock } from "@/lib/seo/pricing";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { useCartStore } from "@/lib/store/useCartStore";
import { useCartUi } from "@/lib/store/useCartUi";
import { useHydrated } from "./use-hydrated";
import { cn } from "@/lib/utils";

type CardVariant = Pick<ProductVariant, "id" | "size" | "color_en"> &
  Partial<Pick<ProductVariant, "color_ar" | "color_hex" | "stock" | "price_override">>;

type CardImage = Pick<ProductImage, "url" | "alt_text_en" | "alt_text_ar">;

/** The fields a card reads (any listing product fits). */
export type CardProduct = Pick<Product, "id" | "slug" | "name_en" | "name_ar" | "base_price" | "sale_price" | "is_new"> & {
  primary_image?: CardImage | null;
  secondary_image?: CardImage | null;
  variants?: CardVariant[];
};

/** Kept for compatibility with existing callers; the card has its own bilingual copy. */
type CardDict = { products?: Partial<Record<string, string>> };

interface ProductCardProps {
  product: CardProduct;
  locale: string;
  dict?: CardDict;
  /** Image `sizes` matching the grid (default: 2 columns on phones, 4 on desktop). */
  sizes?: string;
  /** First row above the fold: load the photo eagerly at high priority. */
  priority?: boolean;
}

const DEFAULT_SIZES = "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw";

export default function ProductCard({ product, locale, sizes = DEFAULT_SIZES, priority = false }: ProductCardProps) {
  const isAr = locale === "ar";
  const hydrated = useHydrated();
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);
  const wishlistIds = useWishlistStore((s) => s.productIds);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartUi((s) => s.openCart);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoverPhoto, setHoverPhoto] = useState<false | "loading" | "ready">(false);

  const variants = product.variants ?? [];
  const stockKnown = variants.every((v) => typeof v.stock === "number");
  const priced = stockKnown ? variants : variants.map((v) => ({ ...v, stock: 1 }));
  const summary = priceSummary(product, priced);
  const soldOut = !summary.purchasable || !summary.inStock;

  const colours = Array.from(
    new Map(variants.filter((v) => v.color_hex || v.color_en).map((v) => [v.color_en ?? v.color_hex, v])).values(),
  );
  const singleColour = colours.length <= 1;
  const single = variants.length === 1 ? variants[0] : null;
  // One colour, several sizes → sizes can be picked right on the card.
  const sizeOptions = singleColour && variants.length > 1 ? variants.filter((v) => v.size) : [];

  const name = isAr ? product.name_ar : product.name_en;
  const href = `/product/${product.slug}`;
  const wishlisted = hydrated && wishlistIds.includes(product.id);
  const alt = (img: CardProduct["primary_image"]) => (img ? (isAr ? img.alt_text_ar : img.alt_text_en) || name : name);

  function add(variant: CardVariant) {
    addItem({
      productId: product.id,
      variantId: variant.id,
      name_en: product.name_en,
      name_ar: product.name_ar,
      slug: product.slug,
      image: product.primary_image?.url || "",
      size: variant.size || null,
      color_en: variant.color_en || null,
      color_ar: variant.color_ar || null,
      color_hex: variant.color_hex || null,
      price: unitPrice(product, variant),
      quantity: 1,
    });
    setPickerOpen(false);
    toast.success(isAr ? "أُضيف إلى الحقيبة" : "Added to bag", {
      description: variant.size ? `${name} · ${variant.size}` : name,
      action: { label: isAr ? "عرض الحقيبة" : "View bag", onClick: openCart },
    });
  }

  const badge = soldOut ? (
    <Badge tone="neutral">{isAr ? "نفد" : "Sold out"}</Badge>
  ) : summary.discountPercent ? (
    <Badge tone="accent">
      <bdi dir="ltr">−{summary.discountPercent}%</bdi>
    </Badge>
  ) : product.is_new ? (
    <Badge tone="neutral">{isAr ? "جديد" : "New"}</Badge>
  ) : null;

  const canQuickAdd = !soldOut && (single || sizeOptions.length > 0);

  return (
    <article
      className="group/card relative flex flex-col"
      onPointerEnter={(e) => {
        // The hover photo is fetched on the first mouse hover, never on touch screens.
        if (e.pointerType === "mouse" && product.secondary_image && !hoverPhoto) setHoverPhoto("loading");
      }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <Link href={href} aria-label={name} className="absolute inset-0 block">
          {product.primary_image ? (
            <Image
              src={product.primary_image.url}
              alt={alt(product.primary_image)}
              fill
              sizes={sizes}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
              className={cn(
                "object-cover transition-opacity duration-500 ease-out",
                hoverPhoto === "ready" && "[@media(hover:hover)]:group-hover/card:opacity-0",
              )}
            />
          ) : null}
          {product.secondary_image && hoverPhoto ? (
            <Image
              src={product.secondary_image.url}
              alt=""
              fill
              sizes={sizes}
              onLoad={() => setHoverPhoto("ready")}
              className="object-cover opacity-0 transition-opacity duration-500 ease-out [@media(hover:hover)]:group-hover/card:opacity-100"
            />
          ) : null}
        </Link>

        {badge ? <div className="pointer-events-none absolute start-3 top-3 flex gap-1.5">{badge}</div> : null}

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wishlisted}
          aria-label={
            wishlisted
              ? isAr ? `إزالة ${name} من المفضلة` : `Remove ${name} from wishlist`
              : isAr ? `إضافة ${name} إلى المفضلة` : `Add ${name} to wishlist`
          }
          className="absolute end-2 top-2 inline-flex size-9 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-background/80"
        >
          <Heart className={cn("size-[18px]", wishlisted && "fill-current")} strokeWidth={1.5} />
        </button>

        {canQuickAdd ? (
          <>
            {/* Touch: "+" toggles the size row. Desktop: the row appears on hover. */}
            <button
              type="button"
              onClick={() => (single ? add(single) : setPickerOpen((o) => !o))}
              aria-expanded={single ? undefined : pickerOpen}
              aria-label={
                pickerOpen
                  ? isAr ? "إغلاق المقاسات" : "Close sizes"
                  : isAr ? `إضافة ${name} إلى الحقيبة` : `Add ${name} to bag`
              }
              className="absolute bottom-2 end-2 z-10 inline-flex size-9 items-center justify-center rounded-full bg-background/90 text-text-primary [@media(hover:hover)]:hidden"
            >
              {pickerOpen ? <X className="size-4" strokeWidth={1.5} /> : <Plus className="size-4" strokeWidth={1.5} />}
            </button>

            <div
              className={cn(
                "absolute inset-x-2 bottom-2 bg-background/95 p-2 transition-[opacity,translate] duration-200",
                pickerOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2",
                "[@media(hover:hover)]:group-hover/card:pointer-events-auto [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-hover/card:translate-y-0",
                "[@media(hover:hover)]:group-focus-within/card:pointer-events-auto [@media(hover:hover)]:group-focus-within/card:opacity-100 [@media(hover:hover)]:group-focus-within/card:translate-y-0",
              )}
            >
              {single ? (
                <button
                  type="button"
                  onClick={() => add(single)}
                  className="h-9 w-full text-[0.8125rem] font-medium text-text-primary hover:bg-surface"
                >
                  {isAr ? "أضف إلى الحقيبة" : "Add to bag"}
                </button>
              ) : (
                <>
                  <p className="mb-1.5 px-1 text-[0.6875rem] text-text-muted">{isAr ? "اختر المقاس" : "Quick add — choose size"}</p>
                  <div className="flex flex-wrap gap-1">
                    {sizeOptions.map((v) => {
                      const out = stockKnown && !variantInStock({ ...v, stock: v.stock ?? 0 });
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={out}
                          onClick={() => add(v)}
                          aria-label={out ? `${v.size} — ${isAr ? "نفد" : "sold out"}` : `${isAr ? "أضف مقاس" : "Add size"} ${v.size}`}
                          className="h-8 min-w-10 px-2 text-[0.8125rem] tabular-nums text-text-primary border border-border hover:border-text-primary disabled:text-text-faint disabled:line-through disabled:hover:border-border"
                        >
                          {v.size}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-1 pt-3">
        <h3 className="text-sm leading-snug text-text-primary">
          <Link href={href} className="line-clamp-1 hover:underline underline-offset-4 decoration-1">
            {name}
          </Link>
        </h3>
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            {summary.varies ? <span className="text-[0.8125rem] text-text-muted">{isAr ? "من" : "From"}</span> : null}
            <Price amount={summary.price} compareAt={summary.compareAt} locale={locale} size="sm" />
          </div>
          {colours.length > 1 ? (
            <span className="flex items-center gap-1" aria-label={isAr ? `${colours.length} ألوان` : `${colours.length} colours`}>
              {colours.slice(0, 4).map((c) => (
                <span
                  key={c.id}
                  title={(isAr ? c.color_ar : c.color_en) ?? undefined}
                  className="size-2.5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: c.color_hex ?? "#ccc" }}
                />
              ))}
              {colours.length > 4 ? <span className="text-[0.6875rem] text-text-muted">+{colours.length - 4}</span> : null}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
