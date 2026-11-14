/* ══════════════════════════════════════════════════════════════
   useCheckoutStore — checkout form state (Zustand)
   ──────────────────────────────────────────────────────────────
   One-page checkout: Contact → Delivery → Payment. Holds what the
   buyer typed, which section is open, the payment method, the
   promo code the server accepted and the unpaid online order of
   this visit (so retrying a payment reuses it).

   Kept in sessionStorage (this tab only, cleared when it closes)
   so a buyer who comes back from a failed card / wallet payment
   finds their details, promo code and order still there. Prices
   and totals are never stored here — the server computes them.
   ══════════════════════════════════════════════════════════════ */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/* ── Types ───────────────────────────────────────────────────── */

export type CheckoutSection = "contact" | "delivery" | "payment";
export type PaymentMethod = "cod" | "card" | "wallet";

/** Governorates and default rates live with the shipping rules (re-exported for existing imports). */
export { GOVERNORATES, GOVERNORATE_SHIPPING } from "@/lib/checkout/shipping";

export interface ContactInfo {
  email: string;
  phone: string;
}

export interface DeliveryInfo {
  /** Saved address chosen by a signed-in buyer, or null for a new address. */
  addressId: string | null;
  firstName: string;
  lastName: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string;
  postalCode: string;
  notes: string;
  saveAddress: boolean;
}

/** Unpaid card / wallet order created in this visit — retrying payment reuses it. */
export interface PendingOrder {
  /** Fingerprint of what was ordered (details, method, promo, bag lines). */
  key: string;
  orderId: string;
  orderNumber: string;
  method: "card" | "wallet";
}

interface CheckoutState {
  /** Section currently open. */
  section: CheckoutSection;
  /** Sections the buyer has completed (shown collapsed with a summary). */
  done: { contact: boolean; delivery: boolean };
  contact: ContactInfo;
  delivery: DeliveryInfo;
  paymentMethod: PaymentMethod | null;
  /** Promo code accepted by the server for this bag, or null */
  promoCode: string | null;
  pendingOrder: PendingOrder | null;
  isProcessing: boolean;
  /** Bumped when the form is filled in for the buyer (profile, saved address): the sections remount with it. */
  seed: number;

  open: (section: CheckoutSection) => void;
  completeContact: (contact: ContactInfo) => void;
  completeDelivery: (delivery: DeliveryInfo) => void;
  setContact: (contact: ContactInfo) => void;
  setDelivery: (delivery: DeliveryInfo) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  setPromoCode: (code: string | null) => void;
  setPendingOrder: (order: PendingOrder | null) => void;
  setIsProcessing: (v: boolean) => void;
  bumpSeed: () => void;
  resetCheckout: () => void;
}

export const INITIAL_CONTACT: ContactInfo = { email: "", phone: "" };

export const INITIAL_DELIVERY: DeliveryInfo = {
  addressId: null,
  firstName: "",
  lastName: "",
  governorate: "",
  city: "",
  address: "",
  apartment: "",
  postalCode: "",
  notes: "",
  saveAddress: true,
};

const INITIAL = {
  section: "contact" as CheckoutSection,
  done: { contact: false, delivery: false },
  contact: INITIAL_CONTACT,
  delivery: INITIAL_DELIVERY,
  paymentMethod: null as PaymentMethod | null,
  promoCode: null as string | null,
  pendingOrder: null as PendingOrder | null,
  isProcessing: false,
  seed: 0,
};

/* ── Store ───────────────────────────────────────────────────── */

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      ...INITIAL,
      open: (section) => set({ section }),
      completeContact: (contact) =>
        set((s) => ({ contact, done: { ...s.done, contact: true }, section: s.done.delivery ? "payment" : "delivery" })),
      completeDelivery: (delivery) => set((s) => ({ delivery, done: { ...s.done, delivery: true }, section: "payment" })),
      setContact: (contact) => set({ contact }),
      setDelivery: (delivery) => set({ delivery }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setPromoCode: (promoCode) => set({ promoCode }),
      setPendingOrder: (pendingOrder) => set({ pendingOrder }),
      setIsProcessing: (isProcessing) => set({ isProcessing }),
      bumpSeed: () => set((s) => ({ seed: s.seed + 1 })),
      resetCheckout: () => set({ ...INITIAL }),
    }),
    {
      name: "shiftsouq-checkout",
      version: 2,
      storage: createJSONStorage(() => sessionStorage),
      // Older shapes (multi-step checkout) start fresh.
      migrate: () => ({ ...INITIAL }) as unknown as CheckoutState,
      partialize: (s) => ({
        section: s.section,
        done: s.done,
        contact: s.contact,
        delivery: s.delivery,
        paymentMethod: s.paymentMethod,
        promoCode: s.promoCode,
        pendingOrder: s.pendingOrder,
      }),
    },
  ),
);

/* ── Delivery estimate chosen on the bag page (this device) ──── */

const GOV_KEY = "shiftsouq-delivery-governorate";

export function readSavedGovernorate(): string {
  try {
    return localStorage.getItem(GOV_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveGovernorate(value: string): void {
  try {
    if (value) localStorage.setItem(GOV_KEY, value);
    else localStorage.removeItem(GOV_KEY);
  } catch {
    /* storage blocked: the estimate just isn't remembered */
  }
}
