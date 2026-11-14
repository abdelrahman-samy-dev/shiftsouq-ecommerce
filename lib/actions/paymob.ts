"use server";

/* ══════════════════════════════════════════════════════════════
   Payment server action — start a card / wallet payment
   ──────────────────────────────────────────────────────────────
   The browser identifies the order (id + access token from
   createOrder); the amount and billing data come from the
   database. See lib/payments/paymob.ts.
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";
import { startOnlinePayment, type StartPaymentResult } from "@/lib/payments/paymob";
import { createServerClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  orderId: z.guid(),
  accessToken: z.guid(),
  method: z.enum(["card", "wallet"]),
  walletPhone: z
    .string()
    .trim()
    .regex(/^\+?\d{10,15}$/)
    .optional(),
});

export async function startPayment(input: z.input<typeof schema>): Promise<StartPaymentResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, code: "not_found", error: "Invalid payment request." };

  let ownerProfileId: string | null = null;
  try {
    const auth = await createServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (user) {
      const { data } = await getServiceClient().from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
      ownerProfileId = data?.id ?? null;
    }
    return await startOnlinePayment(parsed.data, ownerProfileId);
  } catch (err) {
    console.error("[startPayment]", err);
    return { success: false, code: "gateway", error: "The payment could not be started. Please try again." };
  }
}
