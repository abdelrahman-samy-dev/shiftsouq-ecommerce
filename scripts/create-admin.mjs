#!/usr/bin/env node
/**
 * Creates (or promotes) an admin account. Uses the service role key from .env.local.
 *   node --env-file=.env.local scripts/create-admin.mjs admin@example.com 'StrongPassw0rd!'
 */
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> [password]");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let userId;
const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (existing) {
  userId = existing.id;
} else {
  if (!password) throw new Error("Password required for a new account.");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Store", last_name: "Admin" },
  });
  if (error) throw error;
  userId = data.user.id;
}

const { error } = await db.from("profiles").upsert({ auth_user_id: userId, role: "admin" }, { onConflict: "auth_user_id" });
if (error) throw error;
console.log(`✓ ${email} is an admin`);
