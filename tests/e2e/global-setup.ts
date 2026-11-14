/**
 * Prepares the LOCAL database for the browser tests:
 * a buyer and an admin account, enough stock on the test product, and no
 * leftovers from earlier runs that would trip the order limits (at most 3
 * open unpaid orders per phone / email, a few orders per hour).
 * Refuses to run against anything but a local Supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { ACCOUNTS, E2E_PHONE, TEST_PRODUCT_SLUG } from "./fixtures";

export default async function globalSetup() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url) || !key) {
    throw new Error("E2E tests need a LOCAL Supabase (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local).");
  }
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;

  for (const account of Object.values(ACCOUNTS)) {
    let userId = list.users.find((u) => u.email?.toLowerCase() === account.email)?.id;
    if (!userId) {
      const { data, error } = await db.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { first_name: account.firstName, last_name: account.lastName },
      });
      if (error) throw error;
      userId = data.user.id;
    } else {
      await db.auth.admin.updateUserById(userId, { password: account.password });
    }
    const { error } = await db
      .from("profiles")
      .upsert({ auth_user_id: userId, role: account.role }, { onConflict: "auth_user_id" });
    if (error) throw error;
  }

  const { data: product, error: productError } = await db
    .from("products")
    .select("id")
    .eq("slug", TEST_PRODUCT_SLUG)
    .single();
  if (productError) throw productError;
  await db.from("product_variants").update({ stock: 50 }).eq("product_id", product.id);

  // Earlier runs' orders still waiting for payment / confirmation (test phone or test accounts).
  const emails = Object.values(ACCOUNTS).map((a) => a.email);
  const { error: openError } = await db
    .from("orders")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .in("payment_status", ["unpaid", "failed"])
    .or(`shipping_phone.eq.${E2E_PHONE},shipping_email.in.(${emails.join(",")})`);
  if (openError) throw openError;
  // Hourly order limits (local counters only).
  const { error: limitError } = await db.from("rate_limits").delete().like("key", "order%");
  if (limitError) throw limitError;
}
