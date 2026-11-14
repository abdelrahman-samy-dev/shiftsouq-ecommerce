/**
 * Prepares the LOCAL database for the browser tests:
 * a buyer and an admin account, and enough stock on the test product.
 * Refuses to run against anything but a local Supabase.
 */
import { createClient } from "@supabase/supabase-js";
import { ACCOUNTS, TEST_PRODUCT_SLUG } from "./fixtures";

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
}
