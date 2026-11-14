import "server-only";

/* Constant-time comparisons for secrets and personal data (server only). */

import { createHash, timingSafeEqual } from "crypto";
import { normalizeEmail } from "@/components/checkout/checkout-rules";

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Case-insensitive email match in constant time, whatever the lengths (both are hashed first). */
export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizeEmail(a);
  const y = normalizeEmail(b);
  const equal = timingSafeEqual(digest(x), digest(y));
  return equal && x.length > 0;
}
