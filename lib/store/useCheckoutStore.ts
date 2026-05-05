/* ══════════════════════════════════════════════════════════════
   useCheckoutStore — Checkout Flow State (Zustand)
   ──────────────────────────────────────────────────────────────
   Manages the multi-step checkout state including contact info,
   shipping address, payment method, and shipping costs.
   
   Not persisted — checkout state should be fresh each visit.
   ══════════════════════════════════════════════════════════════ */

import { create } from "zustand";

/* ── Types ───────────────────────────────────────────────────── */

export type CheckoutStep = 1 | 2 | 3;
export type PaymentMethod = "cod" | "card" | "wallet";

/** Egyptian governorates with their shipping cost tier */
export const GOVERNORATE_SHIPPING: Record<string, number> = {
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

/** Governorate display labels (EN + AR) */
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

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface ShippingAddress {
  governorate: string;
  city: string;
  address: string;
  apartment: string;
  postalCode: string;
  saveAddress: boolean;
}

interface CheckoutState {
  /** Current step (1 = Contact, 2 = Shipping, 3 = Payment) */
  step: CheckoutStep;
  /** Contact information */
  contact: ContactInfo;
  /** Shipping address */
  shipping: ShippingAddress;
  /** Selected payment method */
  paymentMethod: PaymentMethod;
  /** Calculated shipping cost */
  shippingCost: number;
  /** Whether the order is being processed */
  isProcessing: boolean;

  /* ── Actions ──────────────────────────────────────────────── */
  setStep: (step: CheckoutStep) => void;
  setContact: (contact: ContactInfo) => void;
  setShipping: (shipping: ShippingAddress) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setShippingCost: (cost: number) => void;
  setIsProcessing: (v: boolean) => void;
  resetCheckout: () => void;
}

const INITIAL_CONTACT: ContactInfo = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

const INITIAL_SHIPPING: ShippingAddress = {
  governorate: "",
  city: "",
  address: "",
  apartment: "",
  postalCode: "",
  saveAddress: false,
};

/* ── Store ───────────────────────────────────────────────────── */

export const useCheckoutStore = create<CheckoutState>()((set) => ({
  step: 1,
  contact: INITIAL_CONTACT,
  shipping: INITIAL_SHIPPING,
  paymentMethod: "cod",
  shippingCost: 0,
  isProcessing: false,

  setStep: (step) => set({ step }),
  setContact: (contact) => set({ contact }),
  setShipping: (shipping) => set({ shipping }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setShippingCost: (cost) => set({ shippingCost: cost }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  resetCheckout: () =>
    set({
      step: 1,
      contact: INITIAL_CONTACT,
      shipping: INITIAL_SHIPPING,
      paymentMethod: "cod",
      shippingCost: 0,
      isProcessing: false,
    }),
}));
