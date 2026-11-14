/* ══════════════════════════════════════════════════════════════
   Display pricing — mirrors the server pricing rule
   ──────────────────────────────────────────────────────────────
   place_order() (supabase/migrations/20261114000000_security_
   hardening.sql) charges, per unit:

     COALESCE(variant.price_override,
              sale_price  IF sale_price > 0 AND sale_price < base_price,
              base_price)

   Everything that shows a price to a buyer (cards, product page,
   JSON-LD offers, OpenGraph price tags) goes through these pure,
   client-safe helpers so the page never promises a different
   price from the one checkout charges.
   ══════════════════════════════════════════════════════════════ */

type Numeric = number | string | null | undefined;

export interface PricedProduct {
  base_price: Numeric;
  sale_price?: Numeric;
}

export interface PricedVariant {
  price_override?: Numeric;
  stock?: number | null;
}

function toNumber(value: Numeric): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Product-level price: the sale price when it is valid, otherwise the base price. */
export function productPrice(product: PricedProduct): number {
  const base = toNumber(product.base_price) ?? 0;
  const sale = toNumber(product.sale_price);
  return sale !== null && sale > 0 && sale < base ? sale : base;
}

/** Unit price the server charges for this product + variant. */
export function unitPrice(product: PricedProduct, variant?: PricedVariant | null): number {
  const override = toNumber(variant?.price_override);
  return override !== null ? override : productPrice(product);
}

/** True when the variant (or, without stock info, nothing) can be bought. */
export function variantInStock(variant: PricedVariant): boolean {
  return (variant.stock ?? 0) > 0;
}

export interface PriceSummary {
  /** Lowest price a buyer can currently pay. */
  price: number;
  /** Highest price among the variants considered. */
  maxPrice: number;
  /** True when variants are priced differently ("From …"). */
  varies: boolean;
  /** Base price to strike through when the buyer pays less, else null. */
  compareAt: number | null;
  /** Whole-percent discount against `compareAt` (0 when none). */
  discountPercent: number;
  /** At least one variant has stock. */
  inStock: boolean;
  /** The product has variants, so it can be ordered at all. */
  purchasable: boolean;
}

/**
 * Summarises what a buyer pays for a product. Prices are taken
 * from in-stock variants when there are any, so "From" never
 * advertises a price that can't be bought.
 */
export function priceSummary(
  product: PricedProduct,
  variants: readonly PricedVariant[] | null | undefined
): PriceSummary {
  const list = variants ?? [];
  const inStockVariants = list.filter(variantInStock);
  const considered = inStockVariants.length > 0 ? inStockVariants : list;
  const prices =
    considered.length > 0
      ? considered.map((v) => unitPrice(product, v))
      : [productPrice(product)];

  const price = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const base = toNumber(product.base_price) ?? 0;
  const compareAt = base > 0 && price < base ? base : null;

  return {
    price,
    maxPrice,
    varies: maxPrice !== price,
    compareAt,
    discountPercent: compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0,
    inStock: inStockVariants.length > 0,
    purchasable: list.length > 0,
  };
}
