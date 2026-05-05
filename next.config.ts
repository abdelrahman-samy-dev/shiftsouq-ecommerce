import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
