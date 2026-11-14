"use client";

/* Account menu in the admin top bar: who is signed in, their role, store link, sign out. */

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ExternalLink, LogOut, UserRound } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { getAdminText } from "@/lib/admin/i18n";
import { cn } from "@/lib/utils";
import { Avatar, Tag } from "../components/ui";

export function AccountMenu({
  locale,
  user,
}: {
  locale: string;
  user: { name: string | null; email: string; role: "admin" | "super_admin" };
}) {
  const t = getAdminText(locale).shell;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    const list = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(i + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(i - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const roleLabel = user.role === "super_admin" ? t.owner : t.adminRole;
  const item =
    "flex w-full items-center gap-2.5 rounded-[2px] px-3 py-2 text-start text-[0.8125rem] text-text-primary outline-none hover:bg-surface focus-visible:bg-surface pointer-coarse:py-3 [&_svg]:size-4 [&_svg]:text-text-muted";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t.account}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-[3px] px-1 hover:bg-surface pointer-coarse:h-11"
      >
        <Avatar name={user.name} email={user.email} size={28} />
        <span className="hidden max-w-36 truncate text-[0.8125rem] text-text-primary xl:inline">{user.name || user.email}</span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t.account}
          onKeyDown={onKey}
          className="absolute end-0 top-full z-40 mt-1 w-64 rounded-[4px] border border-border bg-surface-elevated p-1 shadow-[var(--shadow-float)]"
        >
          <div className="flex items-start gap-3 px-3 py-3">
            <Avatar name={user.name} email={user.email} size={36} />
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-medium text-text-primary">{user.name || user.email}</p>
              <p className="truncate text-[0.75rem] text-text-muted" dir="ltr">
                {user.email}
              </p>
              <Tag tone={user.role === "super_admin" ? "ink" : "neutral"} className={cn("mt-2")}>
                {roleLabel}
              </Tag>
            </div>
          </div>
          <div role="separator" className="my-1 h-px bg-border" />
          <a href="/" target="_blank" rel="noopener" role="menuitem" tabIndex={-1} className={item} onClick={() => setOpen(false)}>
            <ExternalLink aria-hidden="true" strokeWidth={1.75} />
            {t.viewStore}
          </a>
          <Link href="/profile" role="menuitem" tabIndex={-1} className={item} onClick={() => setOpen(false)}>
            <UserRound aria-hidden="true" strokeWidth={1.75} />
            {t.myProfile}
          </Link>
          <div role="separator" className="my-1 h-px bg-border" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" tabIndex={-1} className={item}>
              <LogOut aria-hidden="true" className="rtl:-scale-x-100" strokeWidth={1.75} />
              {t.signOut}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
