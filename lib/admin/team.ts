/* ══════════════════════════════════════════════════════════════
   Admin — team rules (pure; shared by the server actions, the UI
   and the tests)
   ──────────────────────────────────────────────────────────────
   • Only the store owner (super admin) changes roles.
   • The owner switches people between customer and admin; the
     owner role itself only moves through "transfer ownership".
   • Nobody changes their own role, and the store never loses its
     last owner. The database enforces the same rules (role guard
     and last-owner triggers); these checks give clear messages
     and hide buttons that would fail.
   ══════════════════════════════════════════════════════════════ */

export type Role = "customer" | "admin" | "super_admin";
export type AssignableRole = "customer" | "admin";

export const isRole = (v: unknown): v is Role => v === "customer" || v === "admin" || v === "super_admin";
export const isAssignableRole = (v: unknown): v is AssignableRole => v === "customer" || v === "admin";

export type TeamError =
  | "owner_only"
  | "self"
  | "invalid_role"
  | "same_role"
  | "owner_role"
  | "last_owner"
  | "no_account"
  | "not_admin";

export type TeamCheck = { ok: true } | { ok: false; error: TeamError };

export interface RoleChange {
  actorRole: Role;
  actorId: string;
  targetId: string;
  targetRole: Role;
  newRole: string;
}

/** May the actor give the target `newRole` (customer ↔ admin)? */
export function checkRoleChange(c: RoleChange): TeamCheck {
  if (c.actorRole !== "super_admin") return { ok: false, error: "owner_only" };
  if (c.actorId === c.targetId) return { ok: false, error: "self" };
  if (!isAssignableRole(c.newRole)) return { ok: false, error: "invalid_role" };
  if (c.targetRole === "super_admin") return { ok: false, error: "owner_role" };
  if (c.targetRole === c.newRole) return { ok: false, error: "same_role" };
  return { ok: true };
}

export interface OwnershipTransfer {
  actorRole: Role;
  actorId: string;
  targetId: string;
  targetRole: Role;
  targetHasAccount: boolean;
}

/** May the owner hand the store to this team member? (The old owner becomes an admin.) */
export function checkOwnershipTransfer(t: OwnershipTransfer): TeamCheck {
  if (t.actorRole !== "super_admin") return { ok: false, error: "owner_only" };
  if (t.actorId === t.targetId) return { ok: false, error: "self" };
  if (t.targetRole !== "admin") return { ok: false, error: "not_admin" };
  if (!t.targetHasAccount) return { ok: false, error: "no_account" };
  return { ok: true };
}

/** Would removing the owner role from `targetId` leave the store without an owner? */
export function wouldRemoveLastOwner(owners: readonly { id: string; hasAccount: boolean }[], targetId: string): boolean {
  return !owners.some((o) => o.id !== targetId && o.hasAccount);
}

/** Readable temporary password for a new team member: 4 groups, no look-alike characters. */
export function temporaryPassword(random: (n: number) => Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const limit = 256 - (256 % alphabet.length); // rejection sampling: no modulo bias
  const chars: string[] = [];
  while (chars.length < 16) {
    for (const b of random(32)) {
      if (b < limit && chars.length < 16) chars.push(alphabet[b % alphabet.length]);
    }
  }
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}
