"use client";

/* ══════════════════════════════════════════════════════════════
   Admin shell — a calm desktop-app frame around every admin page
   ──────────────────────────────────────────────────────────────
   • Collapsible, grouped sidebar with counters (≥1024px); a
     drawer from the start side on smaller screens.
   • Top bar: breadcrumbs, quick search, view store, language,
     theme (sky switch) and the account menu.
   • Covers the storefront header/footer that the root layout
     renders (fixed layer) and makes them inert so keyboard and
     screen-reader users stay inside the admin.
   • /admin/orders/[id]/print gets a bare frame that prints cleanly.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ExternalLink, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Drawer } from "@/components/ds";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { activeNavItem, ADMIN_NAV } from "@/lib/admin/nav";
import { getAdminText } from "@/lib/admin/i18n";
import { cn } from "@/lib/utils";
import { adminButton } from "./components/buttons";
import { AccountMenu } from "./_components/AccountMenu";
import { LanguageButton } from "./_components/LanguageButton";
import { QuickSearch } from "./_components/QuickSearch";
import { SidebarNav, type NavCounts } from "./_components/SidebarNav";

const SIDEBAR_COOKIE = "admin_sidebar";

/** Everything outside the admin (store header, footer, mini-cart…) becomes inert while the admin is open. */
function useIsolateFromStore(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const touched: Element[] = [];
    let node: Element = root;
    while (node.parentElement && node !== document.body) {
      const parent: Element = node.parentElement;
      for (const sib of Array.from(parent.children)) {
        if (sib === node || sib.hasAttribute("inert")) continue;
        if (/^(SCRIPT|STYLE|LINK|TEMPLATE|NOSCRIPT|NEXT-ROUTE-ANNOUNCER)$/.test(sib.tagName)) continue;
        if (sib.matches("section[aria-live], [data-sonner-toaster]")) continue; // toasts stay announced
        sib.setAttribute("inert", "");
        touched.push(sib);
      }
      node = parent;
    }
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      for (const el of touched) el.removeAttribute("inert");
      html.style.overflow = previous;
    };
  }, [rootRef]);
}

export interface AdminShellUser {
  name: string | null;
  email: string;
  role: "admin" | "super_admin";
}

export default function AdminShell({
  children,
  locale,
  user,
  counts,
  initialCollapsed,
  storeName,
}: {
  children: ReactNode;
  locale: string;
  user: AdminShellUser;
  counts: NavCounts;
  initialCollapsed: boolean;
  storeName: string;
}) {
  const t = getAdminText(locale);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [menuOpen, setMenuOpen] = useState(false);
  useIsolateFromStore(rootRef);

  // Close the drawer after navigating (adjust state while rendering, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  const isPrint = /\/print\/?$/.test(pathname);
  if (isPrint) {
    return (
      <div ref={rootRef} data-admin-root className="fixed inset-0 z-[100] overflow-y-auto bg-surface text-text-primary print:static print:overflow-visible print:bg-white">
        {children}
      </div>
    );
  }

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/admin; max-age=31536000; samesite=lax`;
  };

  // Breadcrumbs: group › section › details.
  const item = activeNavItem(pathname);
  const group = item ? ADMIN_NAV.find((g) => g.items.includes(item)) : null;
  const crumbs: { label: string; href?: string }[] = [];
  if (item && group && group.id !== "overview") crumbs.push({ label: t.shell.groups[group.id] });
  if (item) crumbs.push({ label: t.shell.nav[item.id], href: item.href });
  const deeper = item && pathname.replace(/\/+$/, "") !== item.href;
  if (deeper && item) {
    crumbs.push({ label: item.id === "orders" ? t.orders.order : item.id === "customers" ? t.customers.col.name : t.shell.detail });
  }
  const current = crumbs[crumbs.length - 1]?.label ?? t.shell.admin;
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div ref={rootRef} data-admin-root className="fixed inset-0 z-[100] flex bg-background text-text-primary">
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-[3px] focus:bg-text-primary focus:px-3 focus:py-2 focus:text-[0.8125rem] focus:text-background"
      >
        {t.shell.skip}
      </a>

      {/* ── Sidebar (desktop) ─────────────────────────────── */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-e border-border bg-background transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-border", collapsed ? "justify-center" : "gap-2.5 px-5")}>
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5" aria-label={`${storeName} · ${t.shell.admin}`}>
            {collapsed ? (
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-[3px] bg-text-primary font-display text-lg leading-none text-background">
                {storeName.charAt(0)}
              </span>
            ) : (
              <>
                <span className="truncate font-display text-[1.375rem] leading-none text-text-primary [&:lang(ar)]:font-sans [&:lang(ar)]:text-[1.0625rem] [&:lang(ar)]:font-semibold">
                  {storeName}
                </span>
                <span className="t-eyebrow mt-0.5">{t.shell.admin}</span>
              </>
            )}
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          <SidebarNav locale={locale} counts={counts} role={user.role} collapsed={collapsed} />
        </div>
        <div className={cn("shrink-0 border-t border-border p-2", collapsed && "flex justify-center")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? t.shell.expand : t.shell.collapse}
            aria-expanded={!collapsed}
            title={collapsed ? t.shell.expand : undefined}
            className={adminButton("ghost", collapsed ? "icon" : "sm", collapsed ? undefined : "w-full justify-start px-3")}
          >
            <CollapseIcon aria-hidden="true" className="rtl:-scale-x-100" strokeWidth={1.6} />
            {collapsed ? null : <span className="text-text-muted">{t.shell.collapse}</span>}
          </button>
        </div>
      </aside>

      {/* ── Drawer (phones and tablets) ───────────────────── */}
      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        side="start"
        title={storeName}
        closeLabel={t.shell.closeMenu}
        className="max-w-[300px] lg:hidden"
        footer={
          <div className="flex flex-col gap-2">
            <a href="/" target="_blank" rel="noopener" className={adminButton("outline", "md", "w-full")}>
              <ExternalLink aria-hidden="true" strokeWidth={1.75} />
              {t.shell.viewStore}
            </a>
            <div className="flex items-center justify-between gap-2">
              <LanguageButton locale={locale} />
              <ThemeToggle />
            </div>
          </div>
        }
      >
        <SidebarNav locale={locale} counts={counts} role={user.role} touch onNavigate={() => setMenuOpen(false)} />
      </Drawer>

      {/* ── Main column ───────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.shell.openMenu}
            aria-expanded={menuOpen}
            className={adminButton("ghost", "icon", "-ms-1 lg:hidden")}
          >
            <Menu aria-hidden="true" strokeWidth={1.75} />
          </button>

          <nav aria-label={t.shell.breadcrumb} className="hidden min-w-0 sm:block">
            <ol className="flex min-w-0 items-center gap-2 text-[0.8125rem]">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={i} className="flex min-w-0 items-center gap-2">
                    {i > 0 ? (
                      <span aria-hidden="true" className="text-text-faint">
                        /
                      </span>
                    ) : null}
                    {c.href && !last ? (
                      <Link href={c.href} className="truncate text-text-muted hover:text-text-primary">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current={last ? "page" : undefined} className={cn("truncate", last ? "font-medium text-text-primary" : "text-text-muted")}>
                        {c.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          <span className="truncate text-[0.875rem] font-medium sm:hidden">{current}</span>

          <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
            <QuickSearch locale={locale} />
            <div className="hidden items-center gap-1.5 md:flex">
              <a href="/" target="_blank" rel="noopener" title={t.shell.storeLink} className={adminButton("ghost", "sm", "px-2.5")}>
                <ExternalLink aria-hidden="true" strokeWidth={1.75} />
                <span className="hidden xl:inline">{t.shell.viewStore}</span>
                <span className="sr-only xl:hidden">{t.shell.viewStore}</span>
              </a>
              <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
              <LanguageButton locale={locale} />
              <ThemeToggle />
            </div>
            <AccountMenu locale={locale} user={user} />
          </div>
        </header>

        <div id="admin-content" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none">
          <div className="mx-auto w-full max-w-[1360px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
