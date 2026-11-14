/* ══════════════════════════════════════════════════════════════
   Safe same-site redirect targets
   ──────────────────────────────────────────────────────────────
   Used for `?next=` (language links) and `?redirect=` (login) so a
   crafted link can never send visitors to another site.
   ══════════════════════════════════════════════════════════════ */

const PLACEHOLDER_ORIGIN = "http://shiftsouq.invalid";

/**
 * Returns `target` if it is a relative path on this site (a single
 * leading "/", no "//" or "/\" protocol-relative tricks), otherwise
 * `fallback`. The check runs on the *parsed* URL, so tabs, newlines
 * or encoded tricks that browsers normalise away are caught too.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/"): string {
  if (!target || typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }

  try {
    const url = new URL(target, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
