#!/usr/bin/env node
/**
 * Creates (or promotes) a team account. Uses the service role key from .env.local.
 *
 *   Admin (staff):            node --env-file=.env.local scripts/create-admin.mjs admin@example.com 'StrongPassw0rd!'
 *   Store owner (super admin): node --env-file=.env.local scripts/create-admin.mjs --owner owner@example.com 'StrongPassw0rd!'
 *   (or: npm run admin:create -- [--owner] <email> [password])
 *
 * - An existing account keeps its password; a new account needs one (it is created confirmed).
 * - --owner makes the account a super admin (store owner: settings and team). Existing owners stay
 *   owners; to hand the store over completely, use Admin → Team → "Make owner" afterwards.
 * - Without --owner, an existing owner is never demoted (the database refuses to remove the last owner).
 */
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const owner = args.includes("--owner");
const [email, password] = args.filter((a) => a !== "--owner");
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs [--owner] <email> [password]");
  process.exit(1);
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function findUser(address) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === address.toLowerCase());
    if (hit || data.users.length < 1000) return hit ?? null;
  }
  return null;
}

let userId;
const existing = await findUser(email);
if (existing) {
  userId = existing.id;
} else {
  if (!password) throw new Error("Password required for a new account.");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: "Store", last_name: owner ? "Owner" : "Admin" },
  });
  if (error) throw error;
  userId = data.user.id;
}

const { data: profile } = await db.from("profiles").select("id, role").eq("auth_user_id", userId).maybeSingle();
const role = owner ? "super_admin" : profile?.role === "super_admin" ? "super_admin" : "admin";
const { error } = await db.from("profiles").upsert({ auth_user_id: userId, role }, { onConflict: "auth_user_id" });
if (error) throw error;
console.log(`✓ ${email} is ${role === "super_admin" ? "a store owner (super admin)" : "an admin"}`);
