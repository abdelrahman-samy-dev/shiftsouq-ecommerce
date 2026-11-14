/* ══════════════════════════════════════════════════════════════
   Application Constants
   ══════════════════════════════════════════════════════════════ */

export const APP_NAME = "ShiftSouq";
export const APP_DESCRIPTION =
  "Discover curated collections of menswear, womenswear, sneakers & accessories. Premium quality, modern design.";

/** Number of products per page in listings */
export const PRODUCTS_PER_PAGE = 12;

/** Supported currencies */
export const CURRENCIES = ["USD", "SAR", "EGP"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Default tax rate (14%) */
export const TAX_RATE = 0.14;

/** Free shipping threshold amount (shared with the server). */
export { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/shipping";

/** Image quality for Unsplash URLs */
export const IMAGE_QUALITY = 80;

/** Max items in cart */
export const MAX_CART_QUANTITY = 10;

/** Order number prefix */
export const ORDER_PREFIX = "SS";
