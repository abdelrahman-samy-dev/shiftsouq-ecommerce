/* ══════════════════════════════════════════════════════════════
   Robots — /robots.txt
   ──────────────────────────────────────────────────────────────
   Instructs search engine crawlers on which paths to index.
   Blocks admin routes and API endpoints while allowing all
   public-facing pages.

   R2 from the Security & SEO Audit.
   ══════════════════════════════════════════════════════════════ */

import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://shiftsouq.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout/", "/orders/", "/profile/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
