"use client";

/* ══════════════════════════════════════════════════════════════
   AccountMenu — the header's account icon
   ──────────────────────────────────────────────────────────────
   Signed out: a link to /login. Signed in: a small disclosure
   menu (orders, profile, wishlist, admin for staff, sign out).
   The visitor arrives as a promise from the server so the rest
   of the header never waits for the auth check.
   ══════════════════════════════════════════════════════════════ */

import { use, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { Viewer } from "@/lib/dal/navigation";
import { shellCopy } from "./copy";
import { headerIcon } from "./HeaderActions";
import { cn } from "@/lib/utils";

export function AccountLink({ locale, className }: { locale: string; className?: string }) {
  const copy = shellCopy(locale);
  return (
    <Link href="/login" aria-label={copy.signIn} title={copy.signIn} className={cn(headerIcon, className)}>
      <UserRound className="size-5" strokeWidth={1.5} />
    </Link>
  );
}

export function AccountMenu({ viewer, locale, className }: { viewer: Promise<Viewer | null>; locale: string; className?: string }) {
  const user = use(viewer);
  if (!user) return <AccountLink locale={locale} className={className} />;
  return <SignedInMenu user={user} locale={locale} className={className} />;
}

function SignedInMenu({ user, locale, className }: { user: Viewer; locale: string; className?: string }) {
  const copy = shellCopy(locale);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const pathname = usePathname();

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const links = [
    { href: "/orders", label: copy.myOrders },
    { href: "/profile", label: copy.profile },
    { href: "/wishlist", label: copy.wishlist },
    ...(user.isAdmin ? [{ href: "/admin", label: copy.admin }] : []),
  ];
  const display = user.name || user.email.split("@")[0];

  return (
    <div
      ref={wrapper}
      className={cn("relative", className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={copy.accountMenu}
        title={copy.account}
        onClick={() => setOpen((o) => !o)}
        className={headerIcon}
      >
        <UserRound className="size-5" strokeWidth={1.5} />
        <span
          aria-hidden="true"
          className="absolute bottom-2 end-2 size-1.5 rounded-full bg-current ring-2 ring-background group-data-[overlay=true]/header:ring-transparent"
        />
      </button>

      <div
        id={menuId}
        hidden={!open}
        className="absolute end-0 top-[calc(100%+0.75rem)] z-50 w-64 border border-border bg-surface-elevated text-text-primary shadow-[var(--shadow-float)] animate-[fade-in_150ms_ease-out_both] motion-reduce:animate-none"
      >
        <div className="border-b border-border px-4 py-3.5">
          <p className="truncate text-sm font-medium">{copy.hello(display)}</p>
          <p className="truncate text-[0.8125rem] text-text-muted" dir="ltr">
            {user.email}
          </p>
        </div>
        <ul className="py-1.5">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                prefetch={false}
                onClick={() => setOpen(false)}
                aria-current={pathname === l.href ? "page" : undefined}
                className="flex min-h-11 items-center px-4 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary aria-[current=page]:text-text-primary aria-[current=page]:font-medium"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action={logoutAction} className="border-t border-border py-1.5">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center px-4 text-start text-sm text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          >
            {copy.signOut}
          </button>
        </form>
      </div>
    </div>
  );
}
