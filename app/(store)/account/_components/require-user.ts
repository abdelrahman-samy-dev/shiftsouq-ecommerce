import "server-only";

/* Account pages: the signed-in buyer, or a redirect to sign in that comes back here (safety net behind proxy.ts). */

import { redirect } from "next/navigation";
import { getAccountUser, type AccountUser } from "@/lib/dal/account";
import { safeRedirectPath } from "@/lib/i18n/safe-redirect";

export async function requireAccountUser(returnTo: string): Promise<AccountUser> {
  const user = await getAccountUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(safeRedirectPath(returnTo, "/account"))}`);
  return user;
}
