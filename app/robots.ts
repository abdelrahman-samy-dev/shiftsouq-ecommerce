/* ══════════════════════════════════════════════════════════════
   Robots — /robots.txt
   ──────────────────────────────────────────────────────────────
   Public catalogue pages are crawlable; account, checkout, cart,
   admin and API routes are not. The sitemap URL comes from
   NEXT_PUBLIC_SITE_URL (see lib/seo/site.ts).
   ══════════════════════════════════════════════════════════════ */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/checkout", "/orders", "/profile", "/cart", "/wishlist"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
