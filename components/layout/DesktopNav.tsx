"use client";

/* ══════════════════════════════════════════════════════════════
   DesktopNav — primary navigation with mega menus (≥1024px)
   ──────────────────────────────────────────────────────────────
   Disclosure pattern with top-level links: the label navigates,
   the small chevron button (aria-expanded) opens the panel.
   Mouse users get the panel on hover (with a short intent delay).
   Esc closes and returns focus; leaving the item with Tab closes.
   Panels hang from the <header> (full width): sub-category
   columns, a "Shop all" link and an editorial photo.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { chunk, type MenuItem } from "./shell-rules";
import { cn } from "@/lib/utils";

const OPEN_DELAY = 90;
const CLOSE_DELAY = 160;

export function DesktopNav({ items, label, openLabel }: { items: MenuItem[]; label: string; openLabel: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const pathname = usePathname();
  const baseId = useId();

  // A navigation closes any open panel.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
  }

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const schedule = (next: string | null, delay: number) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), delay);
  };

  return (
    <nav aria-label={label} className="hidden h-full lg:block">
      <ul className="flex h-full items-stretch gap-6 xl:gap-8">
        {items.map((item) => {
          const isOpen = open === item.key;
          const panelId = `${baseId}-${item.key}`;
          const current = item.href && pathname === item.href.split("?")[0] && !item.href.includes("?");
          return (
            <li
              key={item.key}
              className="flex items-center"
              onPointerEnter={(e) => e.pointerType === "mouse" && schedule(item.panel ? item.key : null, open ? 0 : OPEN_DELAY)}
              onPointerLeave={(e) => e.pointerType === "mouse" && schedule(null, CLOSE_DELAY)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && isOpen) {
                  e.stopPropagation();
                  setOpen(null);
                  (e.currentTarget.querySelector("[data-disclosure]") as HTMLElement | null)?.focus();
                }
              }}
              onBlur={(e) => {
                if (isOpen && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(null);
              }}
            >
              <span
                className={cn(
                  "relative flex h-full items-center gap-0.5",
                  "after:absolute after:inset-x-0 after:bottom-[calc(50%-0.95rem)] after:h-px ltr:after:origin-left rtl:after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-200",
                  (isOpen || current) && "after:scale-x-100",
                )}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className="py-2 text-[0.8125rem] font-medium whitespace-nowrap"
                    onClick={() => setOpen(null)}
                  >
                    {item.label}
                  </Link>
                ) : null}
                {item.panel ? (
                  <button
                    type="button"
                    data-disclosure
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    aria-label={item.href ? openLabel.replace("{name}", item.label) : undefined}
                    onClick={() => {
                      if (timer.current) window.clearTimeout(timer.current);
                      setOpen(isOpen ? null : item.key);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 py-2 text-[0.8125rem] font-medium whitespace-nowrap",
                      item.href && "-me-1 size-6 justify-center",
                    )}
                  >
                    {item.href ? null : item.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={cn("size-3 opacity-60 transition-transform duration-200", isOpen && "rotate-180")}
                      strokeWidth={1.75}
                    />
                  </button>
                ) : null}
              </span>

              {item.panel ? (
                <div
                  id={panelId}
                  hidden={!isOpen}
                  data-mega-open={isOpen || undefined}
                  className="absolute inset-x-0 top-full border-y border-border bg-background text-text-primary shadow-[var(--shadow-float)]"
                >
                  <MegaPanel item={item} onNavigate={() => setOpen(null)} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MegaPanel({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const panel = item.panel!;
  const columns = chunk(panel.links, 6).slice(0, 3);
  return (
    <div className="container-x grid grid-cols-12 gap-8 py-10 animate-[fade-in_240ms_ease-out_both] motion-reduce:animate-none">
      <div className="col-span-8 grid grid-cols-3 gap-8">
        {columns.map((links, col) => (
          <div key={col} className="flex flex-col gap-4">
            <p className={cn("t-eyebrow", col > 0 && "invisible")} aria-hidden={col > 0 || undefined}>
              {panel.heading}
            </p>
            <ul className="flex flex-col gap-0.5">
              {col === 0 && panel.shopAll ? (
                <li>
                  <Link
                    href={panel.shopAll.href}
                    onClick={onNavigate}
                    className="inline-block py-1.5 text-[0.9375rem] font-medium underline decoration-border-hover underline-offset-4 hover:decoration-text-primary"
                  >
                    {panel.shopAll.label}
                  </Link>
                </li>
              ) : null}
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={link.prefetch === false ? false : undefined}
                    onClick={onNavigate}
                    className="inline-block py-1.5 text-[0.9375rem] text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {panel.image ? (
        <figure className="col-span-4 flex flex-col gap-3">
          <div className="relative aspect-[4/3] overflow-hidden bg-surface">
            <Image src={panel.image} alt="" fill sizes="(min-width: 1600px) 480px, 30vw" className="object-cover" />
          </div>
          <figcaption className="flex items-baseline justify-between gap-4">
            <span className="t-h3">{panel.heading}</span>
            {panel.shopAll ? (
              <Link
                href={panel.shopAll.href}
                onClick={onNavigate}
                tabIndex={-1}
                className="text-[0.8125rem] text-text-secondary underline underline-offset-4 decoration-border-hover hover:text-text-primary"
              >
                {panel.shopAll.label}
              </Link>
            ) : null}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}
