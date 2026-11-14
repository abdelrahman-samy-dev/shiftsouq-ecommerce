/* ══════════════════════════════════════════════════════════════
   Admin — promo code input (shared by the form and the server)
   ══════════════════════════════════════════════════════════════ */

import { z } from "zod";

export const PROMO_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

const money = (max: number) => z.coerce.number().finite().max(max);

/** Empty strings from form fields become null. */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), schema.nullable());

export const promoInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .pipe(z.string().regex(PROMO_CODE_PATTERN, { error: "code" })),
    discount_type: z.enum(["percentage", "fixed"], { error: "discount_type" }),
    discount_value: money(999999.99).positive({ error: "discount_value" }),
    min_order_amount: optional(money(999999.99).min(0, { error: "min_order_amount" })),
    max_uses: optional(z.coerce.number().int({ error: "max_uses" }).positive({ error: "max_uses" }).max(1_000_000)),
    expires_at: optional(z.iso.datetime({ offset: true, error: "expires_at" })),
    is_active: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.discount_type === "percentage" && v.discount_value > 100) {
      ctx.addIssue({ code: "custom", path: ["discount_value"], message: "percentage_over_100" });
    }
  });

export type PromoInput = z.input<typeof promoInputSchema>;
export type PromoValues = z.output<typeof promoInputSchema>;

/** Field keys / reasons the form translates into messages. */
export type PromoErrorKey =
  | "code"
  | "discount_type"
  | "discount_value"
  | "percentage_over_100"
  | "min_order_amount"
  | "max_uses"
  | "expires_at"
  | "max_below_used"
  | "duplicate"
  | "not_found"
  | "generic";

/** First validation problem as a key the form can translate. */
export function promoErrorKey(error: z.ZodError): PromoErrorKey {
  const issue = error.issues[0];
  if (!issue) return "generic";
  if (issue.message === "percentage_over_100") return "percentage_over_100";
  const field = String(issue.path[0] ?? "");
  const known: PromoErrorKey[] = ["code", "discount_type", "discount_value", "min_order_amount", "max_uses", "expires_at"];
  return (known as string[]).includes(field) ? (field as PromoErrorKey) : "generic";
}

export interface PromoRow {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  current_uses: number | null;
  expires_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export type PromoState = "active" | "inactive" | "expired" | "used_up";

/** How the code behaves at checkout right now. */
export function promoState(p: PromoRow, now = Date.now()): PromoState {
  if (!p.is_active) return "inactive";
  if (p.expires_at && new Date(p.expires_at).getTime() <= now) return "expired";
  if (p.max_uses != null && (p.current_uses ?? 0) >= p.max_uses) return "used_up";
  return "active";
}
