"use client";

/* ══════════════════════════════════════════════════════════════
   Admin sidebar navigation — grouped links with counters.
   Used by the desktop sidebar (expanded or collapsed to icons)
   and by the mobile drawer (touch-sized rows).
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  FolderTree,
  LayoutDashboard,
  Layers,
  Lock,
  Mail,
  MessageSquareQuote,
  Newspaper,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  UsersRound,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_NAV, activeNavItem, type NavCounter, type NavItemId } from "@/lib/admin/nav";
import { fill, formatInt, getAdminText } from "@/lib/admin/i18n";
import { cn } from "@/lib/utils";

const ICONS: Record<NavItemId, LucideIcon> = {
  overview: LayoutDashboard,
  orders: ShoppingBag,
  customers: Users,
  promos: Tag,
  products: Package,
  categories: FolderTree,
  collections: Layers,
  inventory: Warehouse,
  reviews: MessageSquareQuote,
  messages: Mail,
  newsletter: Newspaper,
  settings: Settings,
  team: UsersRound,
  activity: Activity,
};

/** Counter colour: orders and messages need someone now (ink), low stock is a warning. */
const COUNTER_TONE: Record<NavCounter, string> = {
  toFulfil: "bg-text-primary text-background",
  unreadMessages: "bg-text-primary text-background",
  pendingReviews: "bg-surface-inset text-text-secondary",
  lowStock: "bg-warning-bg text-warning",
};

export type NavCounts = Record<NavCounter, number>;

export function SidebarNav({
  locale,
  counts,
  role,
  collapsed = false,
  touch = false,
  onNavigate,
}: {
  locale: string;
  counts: NavCounts;
  role: "admin" | "super_admin";
  collapsed?: boolean;
  touch?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = getAdminText(locale);
  const active = activeNavItem(pathname);

  return (
    <nav aria-label={t.shell.mainNav} className={cn("flex flex-col py-3", collapsed ? "px-2" : "px-3")}>
      {ADMIN_NAV.map((group, gi) => (
        <div key={group.id} className={cn(gi > 0 && (collapsed ? "mt-2 border-t border-border pt-2" : "mt-5"))}>
          {group.id !== "overview" && !collapsed ? (
            <p id={`nav-group-${group.id}`} className="t-eyebrow mb-1.5 px-3">
              {t.shell.groups[group.id]}
            </p>
          ) : null}
          <ul aria-labelledby={group.id !== "overview" && !collapsed ? `nav-group-${group.id}` : undefined} className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.id];
              const label = t.shell.nav[item.id];
              const isActive = active?.id === item.id;
              const count = item.counter ? counts[item.counter] : 0;
              const counterText = item.counter && count > 0 ? fill(t.shell.counter[item.counter], { count: formatInt(count, locale) }) : null;
              const locked = item.ownerOnly && role !== "super_admin";
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? (counterText ? `${label} · ${counterText}` : label) : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-[3px] text-[0.84375rem] outline-offset-[-2px] transition-colors",
                      touch ? "h-11 px-3" : "h-9 px-3",
                      collapsed && "justify-center px-0",
                      isActive
                        ? "bg-surface font-medium text-text-primary before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:rounded-full before:bg-text-primary"
                        : "text-text-secondary hover:bg-surface/70 hover:text-text-primary",
                    )}
                  >
                    <span className="relative">
                      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={isActive ? 2 : 1.6} />
                      {collapsed && count > 0 ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute -end-1 -top-1 size-2 rounded-full ring-2 ring-background",
                            item.counter === "lowStock" ? "bg-warning" : "bg-text-primary",
                          )}
                        />
                      ) : null}
                    </span>
                    <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
                    {!collapsed && count > 0 && item.counter ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "ms-auto min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] font-medium leading-5 tabular-nums",
                          COUNTER_TONE[item.counter],
                        )}
                      >
                        {count > 99 ? "99+" : formatInt(count, locale)}
                      </span>
                    ) : null}
                    {!collapsed && locked ? <Lock aria-hidden="true" className="ms-auto size-3 text-text-faint" strokeWidth={1.75} /> : null}
                    {counterText ? <span className="sr-only">, {counterText}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
