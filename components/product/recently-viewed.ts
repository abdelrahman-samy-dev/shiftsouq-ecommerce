/* ══════════════════════════════════════════════════════════════
   Recently viewed — what the browser remembers (localStorage)
   ──────────────────────────────────────────────────────────────
   Minimal card data only. Prices here are for display; the cart
   and checkout always price from the server. Anything read back
   is validated, since storage can hold anything.
   ══════════════════════════════════════════════════════════════ */

export const RECENT_KEY = "shiftsouq-recently-viewed";
export const RECENT_MAX = 12;

export interface RecentItem {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  image: string | null;
  price: number;
  compareAt: number | null;
  /** True when variants are priced differently ("From …"). */
  varies: boolean;
  viewedAt: number;
}

const isStr = (v: unknown, max = 300): v is string => typeof v === "string" && v.length > 0 && v.length <= max;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Only same-site paths and https URLs are used as image sources. */
function safeImage(v: unknown): string | null {
  if (typeof v !== "string" || v.length > 1000) return null;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    return new URL(v).protocol === "https:" ? v : null;
  } catch {
    return null;
  }
}

function toItem(raw: unknown): RecentItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isStr(r.id, 64) || !isStr(r.slug, 200) || !/^[^\s/?#\\]+$/.test(r.slug)) return null;
  if (!isStr(r.name_en) || !isNum(r.price)) return null;
  return {
    id: r.id,
    slug: r.slug,
    name_en: r.name_en,
    name_ar: isStr(r.name_ar) ? r.name_ar : r.name_en,
    image: safeImage(r.image),
    price: r.price,
    compareAt: isNum(r.compareAt) && r.compareAt > r.price ? r.compareAt : null,
    varies: r.varies === true,
    viewedAt: isNum(r.viewedAt) ? r.viewedAt : 0,
  };
}

/** Parses the stored list; anything malformed is dropped. */
export function parseRecent(raw: string | null | undefined): RecentItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const out: RecentItem[] = [];
    for (const entry of data) {
      const item = toItem(entry);
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= RECENT_MAX) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Puts `item` first, removes its older copy and keeps at most `max` entries. */
export function pushRecent(list: readonly RecentItem[], item: RecentItem, max = RECENT_MAX): RecentItem[] {
  return [item, ...list.filter((i) => i.id !== item.id)].slice(0, max);
}

/** Items to show on a product page: newest first, without the current product. */
export function recentForDisplay(list: readonly RecentItem[], currentId: string, limit = 8): RecentItem[] {
  return list.filter((i) => i.id !== currentId).slice(0, limit);
}
