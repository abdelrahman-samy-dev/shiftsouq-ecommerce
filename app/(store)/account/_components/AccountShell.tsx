/* ══════════════════════════════════════════════════════════════
   AccountShell — the frame of every account page
   ──────────────────────────────────────────────────────────────
   Greeting, then a side navigation (desktop) or scrollable tabs
   (phones): Overview, Orders, Addresses, Wishlist, Profile,
   Security, Sign out. Used by /account/*, /orders, /profile and
   (when signed in) /wishlist. Server component.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth";
import type { AccountUser } from "@/lib/dal/account";
import { cn } from "@/lib/utils";
import { accountCopy } from "./copy";

export type AccountSection = "overview" | "orders" | "addresses" | "wishlist" | "profile" | "security";

interface AccountShellProps {
  locale: string;
  user: AccountUser;
  active: AccountSection;
  /** Page title (h1). Defaults to the greeting. */
  title?: ReactNode;
  intro?: ReactNode;
  /** Extra content beside the title (e.g. an action). */
  aside?: ReactNode;
  children: ReactNode;
}

export function AccountShell({ locale, user, active, title, intro, aside, children }: AccountShellProps) {
  const t = accountCopy(locale);
  const links: { key: AccountSection; href: string; label: string }[] = [
    { key: "overview", href: "/account", label: t.overview },
    { key: "orders", href: "/orders", label: t.orders },
    { key: "addresses", href: "/account/addresses", label: t.addresses },
    { key: "wishlist", href: "/wishlist", label: t.wishlist },
    { key: "profile", href: "/profile", label: t.profile },
    { key: "security", href: "/account/security", label: t.security },
  ];

  return (
    <div className="container-x pb-24 pt-8 md:pt-12">
      <p className="t-eyebrow">{t.account}</p>

      <div className="mt-6 grid gap-x-16 lg:grid-cols-[200px_minmax(0,1fr)] xl:gap-x-24">
        {/* Navigation: tabs on phones / tablets, a side list on desktop */}
        <nav aria-label={t.accountNav} className="-mx-5 border-b border-border md:-mx-8 lg:mx-0 lg:border-0">
          <ul className="no-scrollbar flex gap-6 overflow-x-auto px-5 md:px-8 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            {links.map((l) => {
              const current = l.key === active;
              return (
                <li key={l.key} className="shrink-0">
                  <Link
                    href={l.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "relative flex h-12 items-center whitespace-nowrap text-sm transition-colors lg:h-10",
                      current ? "text-text-primary" : "text-text-muted hover:text-text-primary",
                      // Underline (tabs) / leading rule (side list) for the current section
                      current && "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-text-primary lg:after:hidden",
                      current && "lg:font-medium lg:before:absolute lg:before:-start-4 lg:before:top-1/2 lg:before:h-4 lg:before:w-px lg:before:-translate-y-1/2 lg:before:bg-text-primary",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 lg:mt-4 lg:border-t lg:border-border lg:pt-4">
              <form action={logoutAction}>
                <button type="submit" className="flex h-12 items-center whitespace-nowrap text-sm text-text-muted transition-colors hover:text-text-primary lg:h-10">
                  {t.signOut}
                </button>
              </form>
            </li>
          </ul>
        </nav>

        <div className="min-w-0 pt-10 lg:pt-0">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <div className="flex max-w-2xl flex-col gap-3">
              <h1 className="t-h1">{title ?? t.hello(user.firstName)}</h1>
              {intro ? <p className="text-text-secondary">{intro}</p> : null}
            </div>
            {aside}
          </div>
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
