/* ══════════════════════════════════════════════════════════════
   Web app manifest — /manifest.webmanifest
   ══════════════════════════════════════════════════════════════ */

import type { MetadataRoute } from "next";
import { SEO_COPY } from "@/lib/seo/copy";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SEO_COPY.en.siteName} — ${SEO_COPY.en.tagline}`,
    short_name: SEO_COPY.en.siteName,
    description: SEO_COPY.en.homeDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
