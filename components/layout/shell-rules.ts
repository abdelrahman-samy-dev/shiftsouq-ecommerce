/* ══════════════════════════════════════════════════════════════
   Storefront shell — pure rules (client- and server-safe)
   ──────────────────────────────────────────────────────────────
   Navigation tree, free-delivery progress, quantity limits,
   announcement rotation, link safety, Arabic day counts and a
   small in-memory rate limiter. No React, no I/O: unit-tested in
   tests/unit/shell.test.ts.
   ══════════════════════════════════════════════════════════════ */

export type LocalizedText = { en: string; ar: string };

export interface NavLink {
  id: string;
  slug: string;
  name: LocalizedText;
}

export interface NavCategory extends NavLink {
  featured: boolean;
  /** Editorial image: the category's own image, else a product photo from it. */
  image: string | null;
  children: NavLink[];
}

export interface NavCollection {
  slug: string;
  title: LocalizedText;
  image: string | null;
}

export interface Navigation {
  categories: NavCategory[];
  collections: NavCollection[];
}

export interface CategoryRow {
  id: string;
  parent_id: string | null;
  slug: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  sort_order: number | null;
  is_featured?: boolean | null;
}

const bySortOrder = (a: CategoryRow, b: CategoryRow) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name_en.localeCompare(b.name_en);

/**
 * Top-level categories with their sub-categories, keeping only
 * branches that have something to sell (so menus never lead to
 * empty pages). `productCount` is the number of visible products
 * filed directly under a category id.
 */
export function buildNavTree(
  rows: readonly CategoryRow[],
  productCount: (categoryId: string) => number,
  fallbackImage: (categoryId: string) => string | null = () => null,
): NavCategory[] {
  const childrenOf = new Map<string, CategoryRow[]>();
  for (const row of rows) {
    if (!row.parent_id) continue;
    const list = childrenOf.get(row.parent_id) ?? [];
    list.push(row);
    childrenOf.set(row.parent_id, list);
  }

  // A category "has products" when it or any descendant does (guards against cycles).
  const memo = new Map<string, number>();
  const total = (id: string, seen: Set<string> = new Set()): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const sum = productCount(id) + (childrenOf.get(id) ?? []).reduce((n, c) => n + total(c.id, seen), 0);
    memo.set(id, sum);
    return sum;
  };

  return rows
    .filter((r) => !r.parent_id && total(r.id) > 0)
    .sort(bySortOrder)
    .map((top) => ({
      id: top.id,
      slug: top.slug,
      name: { en: top.name_en, ar: top.name_ar },
      featured: !!top.is_featured,
      image: top.image_url || fallbackImage(top.id),
      children: (childrenOf.get(top.id) ?? [])
        .filter((c) => total(c.id) > 0)
        .sort(bySortOrder)
        .map((c) => ({ id: c.id, slug: c.slug, name: { en: c.name_en, ar: c.name_ar } })),
    }));
}

/* ── Menu items (desktop mega menu + mobile drawer) ────────── */

export interface MenuLink {
  href: string;
  label: string;
  /** false for routes another area builds (avoid prefetching a 404). */
  prefetch?: boolean;
}

export interface MenuPanel {
  heading: string;
  shopAll: MenuLink | null;
  links: MenuLink[];
  image: string | null;
}

export interface MenuItem {
  key: string;
  label: string;
  /** Top-level destination; absent when the item only opens its panel. */
  href: string | null;
  panel: MenuPanel | null;
}

export const NEW_IN_HREF = "/shop?sort=newest";

export function categoryHref(slug: string): string {
  return `/category/${encodeURIComponent(slug)}`;
}

export function collectionHref(slug: string): string {
  return `/collections/${encodeURIComponent(slug)}`;
}

/** Primary navigation: top-level categories, "New in", then "Collections" when any exist. */
export function buildMenuItems(
  nav: Navigation,
  locale: string,
  labels: { newIn: string; collections: string; shopAll: string },
): MenuItem[] {
  const pick = (v: LocalizedText) => (locale === "ar" ? v.ar || v.en : v.en || v.ar);

  const categories: MenuItem[] = nav.categories.map((c) => {
    const href = categoryHref(c.slug);
    return {
      key: `cat-${c.id}`,
      label: pick(c.name),
      href,
      panel: c.children.length
        ? {
            heading: pick(c.name),
            shopAll: { href, label: labels.shopAll },
            links: c.children.map((s) => ({ href: categoryHref(s.slug), label: pick(s.name) })),
            image: c.image,
          }
        : null,
    };
  });

  const items: MenuItem[] = [...categories, { key: "new-in", label: labels.newIn, href: NEW_IN_HREF, panel: null }];

  if (nav.collections.length) {
    items.push({
      key: "collections",
      label: labels.collections,
      href: null,
      panel: {
        heading: labels.collections,
        shopAll: null,
        links: nav.collections.map((c) => ({ href: collectionHref(c.slug), label: pick(c.title), prefetch: false })),
        image: nav.collections.find((c) => c.image)?.image ?? null,
      },
    });
  }
  return items;
}

/** Splits a list into columns of at most `size` items (mega menu columns). */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) return [items.slice()];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/* ── Mini-cart ─────────────────────────────────────────────── */

/** Most units of one item the mini-cart stepper allows. */
export const MAX_LINE_QUANTITY = 10;

export function clampQuantity(value: number, max = MAX_LINE_QUANTITY): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, Math.floor(value)));
}

export interface FreeDeliveryProgress {
  /** False when the store has no free-delivery threshold. */
  enabled: boolean;
  reached: boolean;
  /** Amount still needed (0 once reached). */
  remaining: number;
  /** 0–100, for the progress bar. */
  percent: number;
}

/** Progress towards free delivery for an estimated subtotal. */
export function freeDeliveryProgress(subtotal: number, threshold: number): FreeDeliveryProgress {
  const safeSubtotal = Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0;
  if (!Number.isFinite(threshold) || threshold <= 0) {
    return { enabled: false, reached: false, remaining: 0, percent: 0 };
  }
  const reached = safeSubtotal >= threshold;
  return {
    enabled: true,
    reached,
    remaining: reached ? 0 : Math.ceil(threshold - safeSubtotal),
    percent: reached ? 100 : Math.max(0, Math.min(100, Math.round((safeSubtotal / threshold) * 100))),
  };
}

/* ── Announcement bar ──────────────────────────────────────── */

/** Non-empty messages in the visitor's language (falls back to the other language). */
export function announcementMessages(messages: readonly LocalizedText[], locale: string): string[] {
  return messages
    .map((m) => (locale === "ar" ? m.ar || m.en : m.en || m.ar).trim())
    .filter(Boolean);
}

/** Next index in a rotating list (wraps both ways). */
export function rotateIndex(current: number, length: number, step: 1 | -1 = 1): number {
  if (length <= 0) return 0;
  return (((current + step) % length) + length) % length;
}

/** Cookie that hides the announcement bar for the rest of the browser session. */
export const ANNOUNCEMENT_COOKIE = "ss_announcement";

/** Short, stable fingerprint of the messages: a new announcement shows again after a dismissal. */
export function announcementKey(messages: readonly string[]): string {
  let h = 5381;
  for (const ch of messages.join("|")) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

/* ── Links coming from settings ────────────────────────────── */

/** A site path ("/shop") or an http(s) URL; anything else (javascript:, //evil) → null. */
export function safeHref(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\")) return v;
  try {
    const url = new URL(v);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Social profile links with a real URL, in display order. */
export function socialLinks(social: Record<string, string>): { key: string; label: string; href: string }[] {
  const labels: [string, string][] = [
    ["instagram", "Instagram"],
    ["facebook", "Facebook"],
    ["tiktok", "TikTok"],
    ["x", "X"],
  ];
  return labels.flatMap(([key, label]) => {
    const href = safeHref(social[key]);
    // A bare domain ("https://instagram.com/") is a placeholder, not a profile.
    if (!href || !/^https?:\/\//.test(href) || new URL(href).pathname.replace(/\/+$/, "") === "") return [];
    return [{ key, label, href }];
  });
}

/** Digits only, for tel: and WhatsApp links. */
export function phoneHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.replace(/\D/g, "").length >= 6 ? `tel:${digits}` : null;
}

export function whatsappHref(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

/* ── Arabic counts (Western digits) ────────────────────────── */

/** "14 يومًا", "7 أيام", "يومين"… — Arabic number agreement for days. */
export function arabicDays(n: number): string {
  const rule = new Intl.PluralRules("ar").select(n);
  switch (rule) {
    case "one":
      return "يوم واحد";
    case "two":
      return "يومين";
    case "few":
      return `${n} أيام`;
    case "many":
      return `${n} يومًا`;
    default:
      return `${n} يوم`;
  }
}

/** "1 day" / "14 days" or the Arabic equivalent. */
export function dayCount(n: number, locale: string): string {
  return locale === "ar" ? arabicDays(n) : `${n} ${n === 1 ? "day" : "days"}`;
}

/* ── Rate limiting (per server instance) ───────────────────── */

export interface RateLimiter {
  /** True when this attempt is allowed (and records it). */
  hit(key: string, now?: number): boolean;
}

/**
 * Sliding-window limiter kept in memory. It is a speed bump for
 * bots on one server instance, not a security boundary.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.delete(key);
      hits.set(key, recent);
      // Forget the oldest keys so memory stays bounded.
      while (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
      return true;
    },
  };
}
