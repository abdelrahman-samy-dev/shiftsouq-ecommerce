import "server-only";

/* ══════════════════════════════════════════════════════════════
   Admin audit log — who changed what, when.
   Call after a successful admin write:
     await logAdminAction(ctx, "order.status", "orders", id, { from, to });
   Written with the service key (customers and admins can't insert
   rows themselves); never throws, so a logging hiccup can't undo
   the change it describes.
   ══════════════════════════════════════════════════════════════ */

import { getServiceClient } from "@/lib/supabase/service";
import type { AdminContext } from "./auth";

export async function logAdminAction(
  ctx: Pick<AdminContext, "profileId">,
  action: string,
  entity: string,
  entityId: string | null,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await getServiceClient()
      .from("audit_log")
      .insert({ actor_id: ctx.profileId, action, entity, entity_id: entityId, data });
    if (error) throw error;
  } catch (err) {
    console.error("[audit] could not record", action, entityId, err instanceof Error ? err.message : err);
  }
}
