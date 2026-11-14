/* ══════════════════════════════════════════════════════════════
   Shipping — governorates and the default delivery rates
   ──────────────────────────────────────────────────────────────
   The live rates are the store owner's: store_settings.shipping,
   read with getStoreSettings() and priced with shippingFeeFor()
   (lib/settings). The constants below are only the defaults used
   until the owner saves their own, and the list of governorates
   a delivery address may name. The server never trusts a fee sent
   by the browser.
   ══════════════════════════════════════════════════════════════ */

/** Default: orders at or above this subtotal (EGP, after discount) ship for free. */
export const FREE_SHIPPING_THRESHOLD = 500;

/** Default fee for a governorate without its own rate (EGP). */
export const DEFAULT_SHIPPING_FEE = 100;

/** Default fee per governorate (EGP). The keys are the governorates we deliver to. */
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

/** Governorates with their names in both languages, in the order buyers expect. */
export const GOVERNORATES = [
  { value: "cairo", en: "Cairo", ar: "القاهرة" },
  { value: "giza", en: "Giza", ar: "الجيزة" },
  { value: "alexandria", en: "Alexandria", ar: "الإسكندرية" },
  { value: "dakahlia", en: "Dakahlia", ar: "الدقهلية" },
  { value: "sharqia", en: "Sharqia", ar: "الشرقية" },
  { value: "qalyubia", en: "Qalyubia", ar: "القليوبية" },
  { value: "kafr-el-sheikh", en: "Kafr El-Sheikh", ar: "كفر الشيخ" },
  { value: "gharbia", en: "Gharbia", ar: "الغربية" },
  { value: "monufia", en: "Monufia", ar: "المنوفية" },
  { value: "beheira", en: "Beheira", ar: "البحيرة" },
  { value: "ismailia", en: "Ismailia", ar: "الإسماعيلية" },
  { value: "suez", en: "Suez", ar: "السويس" },
  { value: "port-said", en: "Port Said", ar: "بور سعيد" },
  { value: "damietta", en: "Damietta", ar: "دمياط" },
  { value: "fayoum", en: "Fayoum", ar: "الفيوم" },
  { value: "beni-suef", en: "Beni Suef", ar: "بني سويف" },
  { value: "minya", en: "Minya", ar: "المنيا" },
  { value: "asyut", en: "Asyut", ar: "أسيوط" },
  { value: "sohag", en: "Sohag", ar: "سوهاج" },
  { value: "qena", en: "Qena", ar: "قنا" },
  { value: "luxor", en: "Luxor", ar: "الأقصر" },
  { value: "aswan", en: "Aswan", ar: "أسوان" },
  { value: "red-sea", en: "Red Sea", ar: "البحر الأحمر" },
  { value: "new-valley", en: "New Valley", ar: "الوادي الجديد" },
  { value: "matruh", en: "Matruh", ar: "مطروح" },
  { value: "north-sinai", en: "North Sinai", ar: "شمال سيناء" },
  { value: "south-sinai", en: "South Sinai", ar: "جنوب سيناء" },
] as const;

export const isKnownGovernorate = (g: string): boolean =>
  typeof g === "string" && Object.prototype.hasOwnProperty.call(GOVERNORATE_SHIPPING, g);

/** "cairo" → "Cairo" / "القاهرة"; unknown values are returned as they are. */
export function governorateName(value: string | null | undefined, lang: "en" | "ar"): string {
  if (!value) return "";
  const g = GOVERNORATES.find((x) => x.value === value);
  return g ? g[lang] : value;
}

/**
 * Fee with the DEFAULT rates (kept for tests and pages without settings).
 * Checkout itself uses shippingFeeFor(settings.shipping, …).
 */
export function shippingFee(governorate: string, subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return isKnownGovernorate(governorate) ? GOVERNORATE_SHIPPING[governorate] : DEFAULT_SHIPPING_FEE;
}
