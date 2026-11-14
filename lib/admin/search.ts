/* ══════════════════════════════════════════════════════════════
   Admin — search terms for PostgREST filters (pure)
   ──────────────────────────────────────────────────────────────
   Search text is put inside an `or=(…)` filter. Commas, brackets,
   quotes and wildcards there would change the filter itself, so
   only characters that can appear in names, emails, phone numbers
   and order numbers are kept.
   ══════════════════════════════════════════════════════════════ */

const MAX_LENGTH = 80;

/** Keeps letters (any script), digits, spaces and @ . + - _ ; trims and caps the length. */
export function cleanSearchTerm(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s@.+\-_]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_LENGTH);
}

/**
 * For a phone-like term, the national digits without country code or
 * leading zero, so "010 1234 5678", "+20 10 1234 5678" and "1012345678"
 * all find the same order. Returns null when the term is not a phone number.
 */
export function phoneDigits(term: string): string | null {
  const compact = term.replace(/[\s\-+]/g, "");
  if (!/^\d{4,15}$/.test(compact)) return null;
  let digits = compact;
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length >= 12) digits = digits.slice(2);
  digits = digits.replace(/^0+/, "");
  return digits.length >= 4 ? digits : null;
}

/** Builds an `or` filter matching the term in any of `columns` (ilike, quoted). */
export function ilikeAny(columns: readonly string[], term: string): string {
  const value = `"%${term}%"`;
  return columns.map((c) => `${c}.ilike.${value}`).join(",");
}
