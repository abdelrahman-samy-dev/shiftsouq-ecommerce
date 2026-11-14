import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Origin of the Supabase project (API, auth, storage images, realtime). */
function supabaseOrigin(): { http: string; ws: string } | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { http: url.origin, ws: url.origin.replace(/^http/, "ws") };
  } catch {
    return null;
  }
}

const supabase = supabaseOrigin();

/** Paymob's embedded card form is the only third-party page we frame. */
const PAYMOB_FRAMES = [
  "https://accept.paymob.com",
  "https://egypt.paymob.com",
  "https://accept.paymobsolutions.com",
];

/*
 * Content Security Policy without nonces, so pages stay statically
 * renderable (see node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md, "Without Nonces"). 'unsafe-inline' is
 * needed for Next's inline bootstrap and the theme script.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  [
    "img-src 'self' data: blob:",
    "https://images.unsplash.com",
    "https://cdn.dummyjson.com",
    "https://*.supabase.co",
    supabase?.http,
  ]
    .filter(Boolean)
    .join(" "),
  "font-src 'self' data:",
  ["connect-src 'self'", "https://*.supabase.co", "wss://*.supabase.co", supabase?.http, supabase?.ws]
    .filter(Boolean)
    .join(" "),
  `frame-src ${PAYMOB_FRAMES.join(" ")}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // The Paymob return page is shown inside our own checkout page.
  "frame-ancestors 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private pages: never in search results.
      ...["/admin/:path*", "/admin", "/checkout/:path*", "/checkout", "/orders/:path*", "/orders", "/profile", "/cart", "/wishlist", "/login", "/register"].map(
        (source) => ({ source, headers: noindex }),
      ),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
        pathname: "/**",
      },
      /* ── Supabase Storage ──────────────────────────────── */
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/**",
      },
      /* ── Supabase Self-hosted (if applicable) ──────────── */
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
