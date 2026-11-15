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

/**
 * This project's Supabase host when it is served over https (production).
 * Images and API calls are allowed from this one project only — never from
 * any *.supabase.co project (lib/admin/catalog-images.ts uses the same rule).
 */
function supabaseHttpsHost(): string | null {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "https:" && !url.port ? url.hostname : null;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHttpsHost();

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
 *
 * Accepted risk (security review 2026-11-14): with 'unsafe-inline'
 * scripts, the CSP does not stop an injected inline script; it still
 * limits where scripts, frames, images and requests may come from.
 * XSS is prevented at the source (React escaping, no
 * dangerouslySetInnerHTML with user content, JSON-LD escaped).
 * Moving to nonces would make every page dynamic.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob:", "https://images.unsplash.com", "https://cdn.dummyjson.com", supabase?.http]
    .filter(Boolean)
    .join(" "),
  "font-src 'self' data:",
  ["connect-src 'self'", supabase?.http, supabase?.ws].filter(Boolean).join(" "),
  `frame-src ${PAYMOB_FRAMES.join(" ")}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // The Paymob return page is shown inside our own checkout page.
  "frame-ancestors 'self'",
  // Only when the site itself is served over https (a local production build on http keeps working).
  ...(!isDev && (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://") ? ["upgrade-insecure-requests"] : []),
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
  // No floating dev badge (keeps local screenshots and recordings clean).
  devIndicators: false,
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private pages: never in search results.
      ...["/admin/:path*", "/admin", "/checkout/:path*", "/checkout", "/orders/:path*", "/orders", "/profile", "/cart", "/wishlist", "/login", "/register", "/account", "/account/:path*", "/track", "/forgot-password", "/reset-password"].map(
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
      /* ── This project's Supabase Storage only ───────────── */
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/**" }] : []),
      /* ── Local Supabase (development only) ─────────────── */
      ...(isDev
        ? [
            { protocol: "http" as const, hostname: "127.0.0.1", port: "54321", pathname: "/storage/**" },
            { protocol: "http" as const, hostname: "localhost", port: "54321", pathname: "/storage/**" },
          ]
        : []),
    ],
    // Local Supabase runs on a private address; allow it only in development.
    dangerouslyAllowLocalIP: isDev,
  },
};

export default nextConfig;
