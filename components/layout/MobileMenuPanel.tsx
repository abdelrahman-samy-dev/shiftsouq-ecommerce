"use client";

/* ══════════════════════════════════════════════════════════════
   MobileMenuPanel — the drawer behind the menu button
   ──────────────────────────────────────────────────────────────
   Full height from the start side: large type, categories as an
   accordion (<details>: keyboard and screen-reader friendly),
   then account, wishlist, orders, language and theme. Built on
   the ds Drawer (native <dialog>: focus trap, Esc, scroll lock).
   Loaded on demand by MobileMenu; links don't prefetch.
   ══════════════════════════════════════════════════════════════ */

import { Suspense, use } from "react";
import Link from "next/link";
import { Drawer } from "@/components/ds/Overlay";
import { logoutAction } from "@/lib/actions/auth";
import type { Viewer } from "@/lib/dal/navigation";
import type { Locale } from "@/lib/types";
import { useWishlistStore, selectWishlistCount } from "@/lib/store/useWishlistStore";
import { useHydrated } from "@/components/shared/useHydrated";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { shellCopy } from "./copy";
import type { MenuItem } from "./shell-rules";
import { cn } from "@/lib/utils";

export interface MobileMenuPanelProps {
  items: MenuItem[];
  locale: Locale;
  viewer: Promise<Viewer | null>;
  open: boolean;
  onClose: () => void;
}

export default function MobileMenuPanel({ items, locale, viewer, open, onClose }: MobileMenuPanelProps) {
  const copy = shellCopy(locale);
  const close = onClose;

  return (
    <Drawer open={open} onClose={close} side="start" title={copy.menu} closeLabel={copy.closeMenu} className="max-w-[420px]">
      <div className="flex min-h-full flex-col">
        <nav aria-label={copy.primaryNav} className="px-5 pt-2">
          <ul>
            {items.map((item) => (
              <li key={item.key} className="border-b border-border">
                {item.panel ? (
                  <details className="group" name="mobile-menu">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                      <span className="font-display text-[1.75rem] leading-tight rtl:text-[1.375rem] rtl:font-semibold">
                        {item.label}
                      </span>
                      <PlusMinus />
                    </summary>
                    <ul className="flex flex-col pb-5">
                      {item.panel.shopAll ? (
                        <li>
                          <MenuLink href={item.panel.shopAll.href} onNavigate={close} strong>
                            {item.panel.shopAll.label}
                          </MenuLink>
                        </li>
                      ) : null}
                      {item.panel.links.map((link) => (
                        <li key={link.href}>
                          <MenuLink href={link.href} onNavigate={close}>
                            {link.label}
                          </MenuLink>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={close}
                    className="flex min-h-16 items-center font-display text-[1.75rem] leading-tight rtl:text-[1.375rem] rtl:font-semibold"
                  >
                    {item.label}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-5 py-6">
          <Suspense fallback={<div className="h-40" aria-hidden="true" />}>
            <AccountLinks viewer={viewer} locale={locale} onNavigate={close} />
          </Suspense>
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 border-t border-border px-5 py-5">
          <LanguageSwitcher currentLocale={locale} variant="outline" />
          <div className="flex items-center gap-3 text-[0.8125rem] text-text-muted">
            <span aria-hidden="true">{copy.theme}</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function PlusMinus() {
  return (
    <span aria-hidden="true" className="relative size-3.5 shrink-0 text-text-secondary">
      <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
      <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform duration-200 group-open:scale-y-0" />
    </span>
  );
}

function MenuLink({ href, children, onNavigate, strong }: { href: string; children: React.ReactNode; onNavigate: () => void; strong?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center text-base transition-colors",
        strong ? "font-medium text-text-primary underline decoration-border-hover underline-offset-4" : "text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </Link>
  );
}

function AccountLinks({ viewer, locale, onNavigate }: { viewer: Promise<Viewer | null>; locale: Locale; onNavigate: () => void }) {
  const user = use(viewer);
  const copy = shellCopy(locale);
  const hydrated = useHydrated();
  const wishCount = useWishlistStore(selectWishlistCount);
  const wishlist = `${copy.wishlist}${hydrated && wishCount ? ` (${wishCount})` : ""}`;

  const row = "flex min-h-11 items-center text-[0.9375rem] text-text-secondary transition-colors hover:text-text-primary";

  if (!user) {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/login"
            prefetch={false}
            onClick={onNavigate}
            className="inline-flex h-11 items-center justify-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            {copy.signIn}
          </Link>
          <Link
            href="/register"
            prefetch={false}
            onClick={onNavigate}
            className="inline-flex h-11 items-center justify-center rounded-sm border border-text-primary px-4 text-sm font-medium"
          >
            {copy.register}
          </Link>
        </div>
        <ul>
          <li>
            <Link href="/wishlist" prefetch={false} onClick={onNavigate} className={row}>
              {wishlist}
            </Link>
          </li>
          <li>
            <Link href="/contact" prefetch={false} onClick={onNavigate} className={row}>
              {copy.contactUs}
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  const display = user.name || user.email.split("@")[0];
  return (
    <div className="flex flex-col gap-2">
      <p className="t-eyebrow">{copy.hello(display)}</p>
      <ul>
        <li>
          <Link href="/orders" prefetch={false} onClick={onNavigate} className={row}>
            {copy.myOrders}
          </Link>
        </li>
        <li>
          <Link href="/profile" prefetch={false} onClick={onNavigate} className={row}>
            {copy.profile}
          </Link>
        </li>
        <li>
          <Link href="/wishlist" prefetch={false} onClick={onNavigate} className={row}>
            {wishlist}
          </Link>
        </li>
        {user.isAdmin ? (
          <li>
            <Link href="/admin" prefetch={false} onClick={onNavigate} className={row}>
              {copy.admin}
            </Link>
          </li>
        ) : null}
        <li>
          <form action={logoutAction}>
            <button type="submit" className={cn(row, "w-full text-start")}>
              {copy.signOut}
            </button>
          </form>
        </li>
      </ul>
    </div>
  );
}
