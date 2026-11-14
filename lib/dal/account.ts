import "server-only";

/* ══════════════════════════════════════════════════════════════
   DAL — the buyer's account: overview, address book, guest
   order tracking, sign-in editorial image
   ──────────────────────────────────────────────────────────────
   Account reads run with the buyer's own session, so row-level
   security applies (user_addresses: own rows only). Guest
   tracking uses the service client but returns a small DTO only
   after the order number AND the email on the order match; the
   email is compared in constant time.
   ══════════════════════════════════════════════════════════════ */

import { cache } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getCategories } from "@/lib/dal/categories";
import { getMyOrders, type MyOrderSummary } from "@/lib/dal/orders";
import { normalizeOrderNumber, splitFullName } from "@/components/checkout/checkout-rules";
import { emailsMatch } from "@/lib/checkout/secure-compare";
import type { OrderStatusValue, PaymentMethodValue, PaymentStatusValue } from "@/components/orders/order-rules";

/* ── Types ───────────────────────────────────────────────────── */

export interface SavedAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

export interface AccountUser {
  /** Supabase auth user id (server checks only; never shown). */
  authUserId: string;
  profileId: string;
  email: string;
  fullName: string;
  firstName: string;
  phone: string | null;
  memberSince: string;
}

export interface AccountOverview extends AccountUser {
  lastOrder: MyOrderSummary | null;
  orderCount: number;
  addressCount: number;
}

export interface TrackedOrder {
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
  paymentMethod: PaymentMethodValue | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  governorate: string | null;
  city: string | null;
  items: { name: string; nameAr: string | null; label: string | null; labelAr: string | null; quantity: number; unitPrice: number; image: string | null }[];
}

/* ── Session helpers ─────────────────────────────────────────── */

/** The signed-in buyer with their session client, or null for visitors. */
const sessionBuyer = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) return null;
  return { supabase, user, profile };
});

/** Who is signed in (for the account pages), or null. */
export async function getAccountUser(): Promise<AccountUser | null> {
  try {
    const b = await sessionBuyer();
    if (!b) return null;
    const fullName = (b.profile.full_name as string | null)?.trim() || "";
    return {
      authUserId: b.user.id,
      profileId: b.profile.id,
      email: b.user.email ?? "",
      fullName,
      firstName: splitFullName(fullName).firstName,
      phone: (b.profile.phone as string | null) ?? null,
      memberSince: (b.profile.created_at as string | null) ?? b.user.created_at,
    };
  } catch (err) {
    console.error("[DAL:getAccountUser]", err);
    return null;
  }
}

export async function getAccountOverview(): Promise<AccountOverview | null> {
  const user = await getAccountUser();
  if (!user) return null;
  const b = (await sessionBuyer())!;
  const [{ orders, count }, addresses] = await Promise.all([
    getMyOrders(1, 1),
    b.supabase.from("user_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.profileId),
  ]);
  return { ...user, lastOrder: orders[0] ?? null, orderCount: count, addressCount: addresses.count ?? 0 };
}

/* ── Address book ────────────────────────────────────────────── */

const ADDRESS_COLUMNS = "id, label, full_name, phone, governorate, city, address, apartment, postal_code, is_default, created_at";

interface AddressRow {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string | null;
  postal_code: string | null;
  is_default: boolean;
  created_at: string;
}

const toAddress = (r: AddressRow): SavedAddress => ({
  id: r.id,
  label: r.label,
  fullName: r.full_name,
  phone: r.phone,
  governorate: r.governorate,
  city: r.city,
  address: r.address,
  apartment: r.apartment,
  postalCode: r.postal_code,
  isDefault: r.is_default,
});

/** The buyer's saved addresses, default first, then newest. Empty for visitors. */
export async function getMyAddresses(): Promise<SavedAddress[]> {
  try {
    const b = await sessionBuyer();
    if (!b) return [];
    const { data, error } = await b.supabase
      .from("user_addresses")
      .select(ADDRESS_COLUMNS)
      .eq("user_id", b.profile.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("[DAL:getMyAddresses]", error.message);
      return [];
    }
    return ((data ?? []) as AddressRow[]).map(toAddress);
  } catch (err) {
    console.error("[DAL:getMyAddresses] unexpected:", err);
    return [];
  }
}

/**
 * "Save this address" at checkout: adds it to the buyer's address book unless the
 * same address is already there; the first address becomes the default. Also fills
 * in the profile phone number when the profile has none.
 */
export async function saveAddressFromCheckout(a: {
  fullName: string;
  phone: string;
  governorate: string;
  city: string;
  address: string;
  apartment: string;
  postalCode: string;
}): Promise<boolean> {
  try {
    const b = await sessionBuyer();
    if (!b) return false;
    const { data: existing } = await b.supabase
      .from("user_addresses")
      .select("id, governorate, city, address, apartment, is_default")
      .eq("user_id", b.profile.id);
    const rows = (existing ?? []) as { governorate: string; city: string; address: string; apartment: string | null; is_default: boolean }[];
    const same = (x: string | null | undefined, y: string | null | undefined) => (x ?? "").trim().toLowerCase() === (y ?? "").trim().toLowerCase();
    const duplicate = rows.some((r) => same(r.governorate, a.governorate) && same(r.city, a.city) && same(r.address, a.address) && same(r.apartment, a.apartment));
    if (!duplicate && rows.length < 20) {
      const { error } = await b.supabase.from("user_addresses").insert({
        user_id: b.profile.id,
        full_name: a.fullName.slice(0, 120),
        phone: a.phone,
        governorate: a.governorate,
        city: a.city.slice(0, 80),
        address: a.address.slice(0, 200),
        apartment: a.apartment.slice(0, 40) || null,
        postal_code: a.postalCode.slice(0, 20) || null,
        is_default: !rows.some((r) => r.is_default),
      });
      if (error) console.error("[DAL:saveAddressFromCheckout]", error.message);
    }
    if (!b.profile.phone) await b.supabase.from("profiles").update({ phone: a.phone }).eq("id", b.profile.id);
    return true;
  } catch (err) {
    console.error("[DAL:saveAddressFromCheckout] unexpected:", err);
    return false;
  }
}

/** A signed-in buyer's first order fills in their profile mobile number when it is empty. */
export async function rememberBuyerPhone(phone: string): Promise<void> {
  try {
    const b = await sessionBuyer();
    if (b && !b.profile.phone) await b.supabase.from("profiles").update({ phone }).eq("id", b.profile.id);
  } catch (err) {
    console.error("[DAL:rememberBuyerPhone]", err);
  }
}

/* ── Guest order tracking ────────────────────────────────────── */

/**
 * The order with this number, only if `email` is the email it was placed with.
 * Wrong number and wrong email look the same to the caller (null).
 * Rate limiting is the caller's job (app/track/actions.ts).
 */
export async function trackGuestOrder(orderNumber: string, email: string): Promise<TrackedOrder | null> {
  const number = normalizeOrderNumber(orderNumber);
  if (!/^[A-Z0-9-]{6,40}$/.test(number)) {
    emailsMatch(email, "placeholder@invalid"); // same work as a real lookup
    return null;
  }
  try {
    const { data: o } = await getServiceClient()
      .from("orders")
      .select(
        "order_number, created_at, updated_at, status, payment_status, payment_method, subtotal, discount_amount, shipping_cost, total, shipping_email, shipping_governorate, shipping_city, " +
          "order_items(product_name, product_name_ar, variant_label, variant_label_ar, quantity, unit_price, image_url, created_at)",
      )
      .eq("order_number", number)
      .maybeSingle();
    const row = o as unknown as Record<string, unknown> | null;
    const match = emailsMatch(email, row ? String(row.shipping_email ?? "") : "placeholder@invalid");
    if (!row || !match) return null;

    const items = ((row.order_items ?? []) as {
      product_name: string;
      product_name_ar: string | null;
      variant_label: string | null;
      variant_label_ar: string | null;
      quantity: number;
      unit_price: number | string;
      image_url: string | null;
      created_at: string;
    }[])
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((i) => ({
        name: i.product_name,
        nameAr: i.product_name_ar,
        label: i.variant_label,
        labelAr: i.variant_label_ar,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        image: i.image_url,
      }));

    return {
      orderNumber: String(row.order_number),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at ?? row.created_at),
      status: row.status as OrderStatusValue,
      paymentStatus: row.payment_status as PaymentStatusValue,
      paymentMethod: (row.payment_method as PaymentMethodValue | null) ?? null,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount_amount ?? 0),
      shipping: Number(row.shipping_cost ?? 0),
      total: Number(row.total),
      governorate: (row.shipping_governorate as string | null) ?? null,
      city: (row.shipping_city as string | null) ?? null,
      items,
    };
  } catch (err) {
    console.error("[DAL:trackGuestOrder]", err);
    return null;
  }
}

/* ── Sign-in pages: editorial image ──────────────────────────── */

/** Image of the first featured category (else the first with an image), or null for a calm solid panel. */
export async function getAuthEditorial(): Promise<{ image: string; alt: { en: string; ar: string } } | null> {
  try {
    const categories = (await getCategories()) as (Awaited<ReturnType<typeof getCategories>>[number] & { is_featured?: boolean })[];
    const pick = categories.find((c) => c.is_featured && c.image_url) ?? categories.find((c) => c.image_url);
    return pick?.image_url ? { image: pick.image_url, alt: { en: pick.name_en, ar: pick.name_ar } } : null;
  } catch {
    return null;
  }
}
