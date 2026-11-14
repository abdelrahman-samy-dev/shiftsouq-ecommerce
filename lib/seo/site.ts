/* ══════════════════════════════════════════════════════════════
   Site URL helpers (client-safe, no request APIs)
   ──────────────────────────────────────────────────────────────
   One place that decides the public origin used for canonical
   URLs, OpenGraph tags, JSON-LD, the sitemap and robots.txt.
   ══════════════════════════════════════════════════════════════ */

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  return "https://shiftsouq.com";
}

/** Public origin of the store, without a trailing slash. */
export const SITE_URL = resolveSiteUrl();

/**
 * Turns a site path into an absolute URL. Absolute URLs are
 * returned unchanged (e.g. product images on a CDN).
 */
export function absoluteUrl(path: string = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
