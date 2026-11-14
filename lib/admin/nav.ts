/* ══════════════════════════════════════════════════════════════
   Admin — navigation map and entity links (pure)
   ──────────────────────────────────────────────────────────────
   One list drives the sidebar, the breadcrumbs and the quick
   links in search. Labels live in lib/admin/i18n.ts (shell.nav).
   ══════════════════════════════════════════════════════════════ */

export type NavItemId =
  | "overview"
  | "orders"
  | "customers"
  | "promos"
  | "products"
  | "categories"
  | "collections"
  | "inventory"
  | "reviews"
  | "messages"
  | "newsletter"
  | "settings"
  | "team"
  | "activity";

export type NavGroupId = "overview" | "sales" | "catalogue" | "engagement" | "store";

/** Sidebar counters (from admin_queue_counts). */
export type NavCounter = "toFulfil" | "lowStock" | "pendingReviews" | "unreadMessages";

export interface NavItem {
  id: NavItemId;
  href: string;
  counter?: NavCounter;
  /** Counter shown in the warning tone (needs attention) instead of neutral. */
  urgent?: boolean;
  ownerOnly?: boolean;
}

export interface NavGroup {
  id: NavGroupId;
  items: NavItem[];
}

export const ADMIN_NAV: readonly NavGroup[] = [
  { id: "overview", items: [{ id: "overview", href: "/admin" }] },
  {
    id: "sales",
    items: [
      { id: "orders", href: "/admin/orders", counter: "toFulfil" },
      { id: "customers", href: "/admin/customers" },
      { id: "promos", href: "/admin/promos" },
    ],
  },
  {
    id: "catalogue",
    items: [
      { id: "products", href: "/admin/products" },
      { id: "categories", href: "/admin/categories" },
      { id: "collections", href: "/admin/collections" },
      { id: "inventory", href: "/admin/inventory", counter: "lowStock", urgent: true },
    ],
  },
  {
    id: "engagement",
    items: [
      { id: "reviews", href: "/admin/reviews", counter: "pendingReviews" },
      { id: "messages", href: "/admin/messages", counter: "unreadMessages" },
      { id: "newsletter", href: "/admin/newsletter" },
    ],
  },
  {
    id: "store",
    items: [
      { id: "settings", href: "/admin/settings", ownerOnly: true },
      { id: "team", href: "/admin/team", ownerOnly: true },
      { id: "activity", href: "/admin/activity" },
    ],
  },
];

export const NAV_ITEMS: readonly NavItem[] = ADMIN_NAV.flatMap((g) => g.items);

/** The nav item a path belongs to ("/admin/orders/123" → orders). */
export function activeNavItem(pathname: string): NavItem | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return NAV_ITEMS[0];
  let best: NavItem | null = null;
  for (const item of NAV_ITEMS) {
    if (item.href === "/admin") continue;
    if ((path === item.href || path.startsWith(item.href + "/")) && (!best || item.href.length > best.href.length)) best = item;
  }
  return best;
}

/** Where an audited entity lives in the admin (null when it has no page). */
export function entityHref(entity: string, id: string | null, action = ""): string | null {
  if (action.startsWith("team.")) return "/admin/team";
  if (!id) return entity === "store_settings" ? "/admin/settings" : null;
  const safe = encodeURIComponent(id);
  switch (entity) {
    case "orders":
      return `/admin/orders/${safe}`;
    case "profiles":
      return `/admin/customers/${safe}`;
    case "products":
      return `/admin/products/${safe}`;
    case "categories":
      return `/admin/categories`;
    case "collections":
      return `/admin/collections`;
    case "promocodes":
      return `/admin/promos`;
    case "reviews":
      return `/admin/reviews`;
    case "contact_messages":
      return `/admin/messages?id=${safe}`;
    case "newsletter_subscribers":
      return `/admin/newsletter`;
    case "store_settings":
      return `/admin/settings`;
    default:
      return null;
  }
}

/** Entities the activity log can be filtered by. */
export const AUDIT_ENTITIES = [
  "orders",
  "products",
  "categories",
  "collections",
  "promocodes",
  "reviews",
  "contact_messages",
  "newsletter_subscribers",
  "store_settings",
  "profiles",
] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];
export const isAuditEntity = (v: unknown): v is AuditEntity =>
  typeof v === "string" && (AUDIT_ENTITIES as readonly string[]).includes(v);
