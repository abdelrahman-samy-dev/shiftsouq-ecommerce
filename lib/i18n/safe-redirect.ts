/* ══════════════════════════════════════════════════════════════
   Safe same-site redirect targets
   ──────────────────────────────────────────────────────────────
   Used for `?next=` (language links, auth email links) and
   `?redirect=` (login) so a crafted link can never send visitors
   to another site.
   ══════════════════════════════════════════════════════════════ */

const PLACEHOLDER_ORIGIN = "http://shiftsouq.invalid";

/** "//host" or "/\host": a browser reads these as another site. */
const protocolRelative = (path: string) => path.startsWith("//") || path.startsWith("/\\");

/**
 * Returns `target` if it is a relative path on this site, otherwise
 * `fallback`. The check runs on the raw value AND on the *parsed* URL:
 * tabs, newlines, encoded tricks or dot-segments that normalise into
 * "//evil.example" (e.g. "/.//evil.example") are refused too.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/"): string {
  if (!target || typeof target !== "string") return fallback;
  if (!target.startsWith("/") || protocolRelative(target)) return fallback;

  try {
    const url = new URL(target, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    if (protocolRelative(url.pathname)) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    // Belt and braces: the result must itself resolve to this site.
    if (new URL(path, PLACEHOLDER_ORIGIN).origin !== PLACEHOLDER_ORIGIN) return fallback;
    return path;
  } catch {
    return fallback;
  }
}
