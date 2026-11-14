/* ══════════════════════════════════════════════════════════════
   Shipping rates — single source of truth
   ──────────────────────────────────────────────────────────────
   Used by the checkout UI to *show* the fee and by the server to
   *charge* it. The server never trusts a fee sent by the browser.
   ══════════════════════════════════════════════════════════════ */

/** Orders at or above this subtotal (EGP) ship for free. */
export const FREE_SHIPPING_THRESHOLD = 500;

/** Fee for any governorate not listed below (EGP). */
export const DEFAULT_SHIPPING_FEE = 100;

/** Egyptian governorates and their shipping fee (EGP). */
export const GOVERNORATE_SHIPPING: Readonly<Record<string, number>> = {
  cairo: 50,
  giza: 50,
  alexandria: 100,
  dakahlia: 100,
  sharqia: 100,
  qalyubia: 100,
  "kafr-el-sheikh": 100,
  gharbia: 100,
  monufia: 100,
  beheira: 100,
  ismailia: 100,
  suez: 100,
  "port-said": 100,
  damietta: 100,
  fayoum: 100,
  "beni-suef": 100,
  minya: 100,
  asyut: 100,
  sohag: 100,
  qena: 100,
  luxor: 100,
  aswan: 100,
  "red-sea": 100,
  "new-valley": 100,
  matruh: 100,
  "north-sinai": 100,
  "south-sinai": 100,
};

export const isKnownGovernorate = (g: string): boolean =>
  Object.prototype.hasOwnProperty.call(GOVERNORATE_SHIPPING, g);

/** Shipping fee for a governorate and an order subtotal (after discount). */
export function shippingFee(governorate: string, subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return isKnownGovernorate(governorate) ? GOVERNORATE_SHIPPING[governorate] : DEFAULT_SHIPPING_FEE;
}
