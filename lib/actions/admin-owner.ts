"use server";

/* ══════════════════════════════════════════════════════════════
   Server Actions — store owner (super admin) only
   ──────────────────────────────────────────────────────────────
   Store settings and the team. Every action checks the role on
   the server first; the database checks again:
   • store_settings can only be updated when is_super_admin()
     (row-level security), so an admin's update changes 0 rows;
   • only is_super_admin() may change a profile's role (guard
     trigger) and the last owner can never be removed (trigger).
   The service key is used for one thing only: creating the sign-in
   account of a new team member who doesn't have one yet.
   ══════════════════════════════════════════════════════════════ */

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";
import { mergeSettingsJson, sameJson, settingsErrors, settingsSchema, settingsToRow, type SettingsErrorCode } from "@/lib/admin/settings-schema";
import { checkOwnershipTransfer, checkRoleChange, isRole, temporaryPassword, type Role } from "@/lib/admin/team";
import { getServiceClient } from "@/lib/supabase/service";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

type DbError = { code?: string; message?: string } | null | undefined;
function logDb(where: string, error: DbError) {
  if (error) console.error(`[admin-owner:${where}]`, error.code ?? "", error.message ?? "");
}

const idSchema = z.guid();

/* ── Store settings ───────────────────────────────────────────── */

export type SaveSettingsResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string; fields?: Record<string, SettingsErrorCode> };

const SECTIONS = ["announcement", "contact", "social", "shipping", "payments", "policies", "home", "inventory"] as const;

/**
 * Saves every settings section at once. `expectedUpdatedAt` is the
 * version the form was loaded with: if someone saved in between, the
 * save is refused instead of silently overwriting their changes.
 */
export async function saveStoreSettings(input: unknown, expectedUpdatedAt: string | null): Promise<SaveSettingsResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (ctx.role !== "super_admin") return fail("owner_only");

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: settingsErrors(parsed.error) };
  const row = settingsToRow(parsed.data);

  const { data: current, error: readError } = await ctx.supabase
    .from("store_settings")
    .select("announcement, contact, social, shipping, payments, policies, home, inventory, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (readError) return (logDb("settings.read", readError), fail("save_failed"));
  if (current && expectedUpdatedAt && current.updated_at && new Date(current.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) {
    return fail("changed");
  }

  // Merge over what is stored: keys this form doesn't edit (hero alt text, photo credit,
  // delivery days per governorate…) are kept.
  const stored = (current ?? {}) as Record<string, unknown>;
  const merged = Object.fromEntries(SECTIONS.map((k) => [k, mergeSettingsJson(stored[k], row[k])]));

  const updatedAt = new Date().toISOString();
  const { data, error } = await ctx.supabase
    .from("store_settings")
    .update({ ...merged, updated_at: updatedAt, updated_by: ctx.profileId })
    .eq("id", 1)
    .select("id");
  if (error) return (logDb("settings.update", error), fail("save_failed"));
  if (!data?.length) return fail("owner_only"); // row-level security refused the update

  const changed = SECTIONS.filter((k) => !sameJson(stored[k], merged[k]));
  await logAdminAction(ctx, "settings.update", "store_settings", "1", { sections: changed });
  // Announcement bar, footer, checkout fees, home hero… every storefront page reads settings.
  revalidatePath("/", "layout");
  return { ok: true, updatedAt };
}

/* ── Team ─────────────────────────────────────────────────────── */

type TeamResult = { ok: true } | Fail;

/** Database errors from the role guards, as friendly keys. */
function roleErrorKey(error: DbError): string {
  const msg = error?.message ?? "";
  if (/at least one owner/i.test(msg)) return "last_owner";
  if (error?.code === "42501") return "owner_only";
  return "save_failed";
}

async function readProfile(ctx: NonNullable<Awaited<ReturnType<typeof getAdminContext>>>, id: string) {
  const { data, error } = await ctx.supabase.from("profiles").select("id, role, auth_user_id").eq("id", id).maybeSingle();
  if (error) logDb("team.read", error);
  if (!data || !isRole(data.role)) return null;
  return { id: data.id as string, role: data.role as Role, hasAccount: Boolean(data.auth_user_id) };
}

/** Switches a person between customer and admin. Owner only; never yourself, never the owner. */
export async function setTeamRole(profileId: string, role: string): Promise<TeamResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (ctx.role !== "super_admin") return fail("owner_only");
  if (!idSchema.safeParse(profileId).success) return fail("not_found");

  const target = await readProfile(ctx, profileId);
  if (!target) return fail("not_found");
  const check = checkRoleChange({
    actorRole: ctx.role,
    actorId: ctx.profileId,
    targetId: target.id,
    targetRole: target.role,
    newRole: role,
  });
  if (!check.ok) return fail(check.error);

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ role })
    .eq("id", target.id)
    .eq("role", target.role)
    .select("id");
  if (error) return (logDb("team.role", error), fail(roleErrorKey(error)));
  if (!data?.length) return fail("changed");

  await logAdminAction(ctx, "team.role", "profiles", target.id, { from: target.role, to: role });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());
const nameSchema = z.string().trim().max(120);

export type AddMemberResult = { ok: true; created: false } | { ok: true; created: true; tempPassword: string } | Fail;

/**
 * Adds an admin by e-mail. An existing account is promoted; otherwise a
 * new account is created with a temporary password that is returned once
 * (the owner passes it on; the new admin changes it after signing in).
 */
export async function addTeamMember(rawEmail: string, rawName: string): Promise<AddMemberResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (ctx.role !== "super_admin") return fail("owner_only");
  const email = emailSchema.safeParse(rawEmail);
  if (!email.success) return fail("email");
  const name = nameSchema.safeParse(typeof rawName === "string" ? rawName : "");
  if (!name.success) return fail("name");

  const { data: found, error: findError } = await ctx.supabase.rpc("admin_profile_by_email", { p_email: email.data });
  if (findError) return (logDb("team.find", findError), fail("save_failed"));
  const existing = ((found ?? []) as { profile_id: string; role: string }[])[0];

  if (existing) {
    if (existing.role !== "customer") return fail("already_member");
    const { data, error } = await ctx.supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", existing.profile_id)
      .eq("role", "customer")
      .select("id");
    if (error) return (logDb("team.promote", error), fail(roleErrorKey(error)));
    if (!data?.length) return fail("changed");
    await logAdminAction(ctx, "team.add", "profiles", existing.profile_id, { from: "customer", to: "admin" });
    revalidatePath("/admin", "layout");
    return { ok: true, created: false };
  }

  // No account yet: create one (service key), then make it an admin with the owner's own session.
  const tempPassword = temporaryPassword((n) => randomBytes(n));
  let authUserId: string;
  try {
    const { data, error } = await getServiceClient().auth.admin.createUser({
      email: email.data,
      password: tempPassword,
      email_confirm: true,
      user_metadata: name.data ? { full_name: name.data } : {},
    });
    if (error || !data.user) {
      logDb("team.createUser", error);
      return fail(error?.status === 422 ? "already_member" : "save_failed");
    }
    authUserId = data.user.id;
  } catch (err) {
    console.error("[admin-owner:team.createUser]", err instanceof Error ? err.message : err);
    return fail("save_failed");
  }

  const { data: promoted, error } = await ctx.supabase
    .from("profiles")
    .update({ role: "admin", ...(name.data ? { full_name: name.data } : {}) })
    .eq("auth_user_id", authUserId)
    .select("id");
  if (error || !promoted?.length) {
    logDb("team.promoteNew", error);
    return fail("save_failed");
  }
  await logAdminAction(ctx, "team.invite", "profiles", promoted[0].id as string, { to: "admin", new_account: true });
  revalidatePath("/admin", "layout");
  return { ok: true, created: true, tempPassword };
}

/** Hands the store to another admin; the current owner becomes an admin. */
export async function transferOwnership(profileId: string): Promise<TeamResult> {
  const ctx = await getAdminContext();
  if (!ctx) return fail("unauthorized");
  if (ctx.role !== "super_admin") return fail("owner_only");
  if (!idSchema.safeParse(profileId).success) return fail("not_found");

  const target = await readProfile(ctx, profileId);
  if (!target) return fail("not_found");
  const check = checkOwnershipTransfer({
    actorRole: ctx.role,
    actorId: ctx.profileId,
    targetId: target.id,
    targetRole: target.role,
    targetHasAccount: target.hasAccount,
  });
  if (!check.ok) return fail(check.error);

  const { error } = await ctx.supabase.rpc("transfer_store_ownership", { p_target: target.id });
  if (error) return (logDb("team.transfer", error), fail(roleErrorKey(error)));

  await logAdminAction(ctx, "team.transfer", "profiles", target.id, { from_owner: ctx.profileId, to_owner: target.id });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
