/* ══════════════════════════════════════════════════════════════
   Admin — which stored image URLs the admin may render (pure)
   ──────────────────────────────────────────────────────────────
   next/image only loads hosts listed in next.config.ts. Product
   images come from those hosts (lib/admin/products) or from this
   project's Supabase storage, which in local development is plain
   http on 127.0.0.1 — that one is shown unoptimised (the browser
   loads it directly; the CSP allows the Supabase origin).
   ══════════════════════════════════════════════════════════════ */

import { isAllowedImageUrl } from "./products";

export interface AdminImage {
  src: string;
  unoptimized: boolean;
}

export function adminImage(url: string | null | undefined): AdminImage | null {
  if (!url) return null;
  if (isAllowedImageUrl(url)) return { src: url, unoptimized: false };
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  try {
    const u = new URL(url);
    const origin = new URL(base).origin;
    if (u.origin === origin && u.pathname.startsWith("/storage/v1/object/public/")) return { src: url, unoptimized: true };
  } catch {
    return null;
  }
  return null;
}
