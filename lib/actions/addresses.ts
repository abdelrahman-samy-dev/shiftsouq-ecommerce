"use server";

/* ══════════════════════════════════════════════════════════════
   Address book — add, edit, delete, make default
   ──────────────────────────────────────────────────────────────
   Runs with the buyer's own session: the user_addresses RLS
   policy only lets a buyer touch their own rows, and every query
   is also filtered by their profile id. Same validation as the
   checkout delivery step (addressSchema). One default address
   per buyer (partial unique index); the first address is the
   default, and deleting the default promotes the newest one.
   ══════════════════════════════════════════════════════════════ */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { addressSchema, fieldErrors, normalizeEgyptianMobile, type AddressInput } from "@/components/checkout/checkout-rules";

export type AddressResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

const MAX_ADDRESSES = 20;

const copy = {
  en: {
    signIn: "Please sign in again.",
    invalid: "Please check the highlighted fields.",
    full: `You can keep up to ${MAX_ADDRESSES} addresses. Delete one to add another.`,
    notFound: "This address no longer exists.",
    generic: "We couldn't save your address. Please try again.",
  },
  ar: {
    signIn: "يرجى تسجيل الدخول مرة أخرى.",
    invalid: "يرجى مراجعة الحقول المشار إليها.",
    full: `يمكنك حفظ ${MAX_ADDRESSES} عنوانًا كحد أقصى. احذف عنوانًا لإضافة آخر.`,
    notFound: "هذا العنوان لم يعد موجودًا.",
    generic: "تعذر حفظ العنوان. يرجى المحاولة مرة أخرى.",
  },
};

async function buyer() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
  return profile ? { supabase, profileId: profile.id as string } : null;
}

const toRow = (a: AddressInput) => ({
  label: a.label.trim() || null,
  full_name: a.fullName.trim(),
  phone: normalizeEgyptianMobile(a.phone)!,
  governorate: a.governorate,
  city: a.city.trim(),
  address: a.address.trim(),
  apartment: a.apartment.trim() || null,
  postal_code: a.postalCode.trim() || null,
});

function refresh() {
  revalidatePath("/account/addresses");
  revalidatePath("/account");
  revalidatePath("/checkout");
}

/** Clears the current default (except `keepId`) so another row can take it. */
async function clearDefault(b: NonNullable<Awaited<ReturnType<typeof buyer>>>, keepId?: string) {
  let q = b.supabase.from("user_addresses").update({ is_default: false }).eq("user_id", b.profileId).eq("is_default", true);
  if (keepId) q = q.neq("id", keepId);
  return q;
}

export async function saveAddress(id: string | null, input: AddressInput): Promise<AddressResult> {
  const lang = (await getLocale()) === "ar" ? "ar" : "en";
  const t = copy[lang];
  const parsed = addressSchema(lang).safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid, fields: fieldErrors(parsed.error.issues) };
  if (id !== null && !z.guid().safeParse(id).success) return { ok: false, error: t.notFound };

  try {
    const b = await buyer();
    if (!b) return { ok: false, error: t.signIn };

    const { data: rows } = await b.supabase.from("user_addresses").select("id, is_default").eq("user_id", b.profileId);
    const existing = (rows ?? []) as { id: string; is_default: boolean }[];
    const hasDefault = existing.some((r) => r.is_default && r.id !== id);
    const makeDefault = parsed.data.isDefault || !hasDefault;

    if (id === null) {
      if (existing.length >= MAX_ADDRESSES) return { ok: false, error: t.full };
      if (makeDefault) await clearDefault(b);
      const { error } = await b.supabase
        .from("user_addresses")
        .insert({ ...toRow(parsed.data), user_id: b.profileId, is_default: makeDefault });
      if (error) throw error;
    } else {
      if (!existing.some((r) => r.id === id)) return { ok: false, error: t.notFound };
      if (makeDefault) await clearDefault(b, id);
      const { error } = await b.supabase
        .from("user_addresses")
        .update({ ...toRow(parsed.data), is_default: makeDefault })
        .eq("id", id)
        .eq("user_id", b.profileId);
      if (error) throw error;
    }
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[saveAddress]", err);
    return { ok: false, error: t.generic };
  }
}

export async function deleteAddress(id: string): Promise<AddressResult> {
  const lang = (await getLocale()) === "ar" ? "ar" : "en";
  const t = copy[lang];
  if (!z.guid().safeParse(id).success) return { ok: false, error: t.notFound };
  try {
    const b = await buyer();
    if (!b) return { ok: false, error: t.signIn };
    const { data, error } = await b.supabase
      .from("user_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", b.profileId)
      .select("is_default");
    if (error) throw error;
    if (!data?.length) return { ok: false, error: t.notFound };

    if (data[0].is_default) {
      const { data: next } = await b.supabase
        .from("user_addresses")
        .select("id")
        .eq("user_id", b.profileId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (next) await b.supabase.from("user_addresses").update({ is_default: true }).eq("id", next.id).eq("user_id", b.profileId);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[deleteAddress]", err);
    return { ok: false, error: t.generic };
  }
}

export async function setDefaultAddress(id: string): Promise<AddressResult> {
  const lang = (await getLocale()) === "ar" ? "ar" : "en";
  const t = copy[lang];
  if (!z.guid().safeParse(id).success) return { ok: false, error: t.notFound };
  try {
    const b = await buyer();
    if (!b) return { ok: false, error: t.signIn };
    const { data: own } = await b.supabase.from("user_addresses").select("id").eq("id", id).eq("user_id", b.profileId).maybeSingle();
    if (!own) return { ok: false, error: t.notFound };
    await clearDefault(b, id);
    const { error } = await b.supabase.from("user_addresses").update({ is_default: true }).eq("id", id).eq("user_id", b.profileId);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (err) {
    console.error("[setDefaultAddress]", err);
    return { ok: false, error: t.generic };
  }
}
