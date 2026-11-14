"use client";

/* ══════════════════════════════════════════════════════════════
   Quick search in the admin top bar.
   ──────────────────────────────────────────────────────────────
   Order number, e-mail, phone, customer or product name → grouped
   results (orders, customers, products) in a listbox under the
   field. ARIA combobox: ↑/↓ move, Enter opens, Esc closes.
   Ctrl/⌘ K or "/" focuses it from anywhere in the admin.
   On phones the field opens in a dialog from an icon button.
   ══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, Spinner } from "@/components/ds";
import { adminQuickSearch } from "@/lib/actions/admin-ops";
import { fill, formatAmount, getAdminText } from "@/lib/admin/i18n";
import type { QuickSearchResults } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { adminButton } from "../components/buttons";

type Option = { id: string; href: string; group: "orders" | "customers" | "products" | "all"; title: string; meta?: string };

function toOptions(r: QuickSearchResults, q: string, locale: string): Option[] {
  const t = getAdminText(locale);
  const opts: Option[] = [];
  for (const o of r.orders)
    opts.push({
      id: `o-${o.id}`,
      href: `/admin/orders/${o.id}`,
      group: "orders",
      title: o.orderNumber,
      meta: [o.customer, t.status[o.status], formatAmount(o.total, locale)].filter(Boolean).join(" · "),
    });
  for (const c of r.customers)
    opts.push({
      id: `c-${c.id}`,
      href: `/admin/customers/${c.id}`,
      group: "customers",
      title: c.name || c.email || t.customers.noName,
      meta: [c.email, c.phone].filter(Boolean).join(" · "),
    });
  for (const p of r.products)
    opts.push({
      id: `p-${p.id}`,
      href: `/admin/products/${p.id}`,
      group: "products",
      title: locale === "ar" ? p.nameAr : p.nameEn,
      meta: p.active ? undefined : t.shell.search.hidden,
    });
  if (q.trim().length >= 2)
    opts.push({ id: "all-orders", href: `/admin/orders?search=${encodeURIComponent(q.trim())}`, group: "all", title: fill(t.shell.search.allOrders, { q: q.trim() }) });
  return opts;
}

function SearchBox({
  locale,
  autoFocus,
  inline = false,
  onDone,
  inputRef,
}: {
  locale: string;
  autoFocus?: boolean;
  /** Results flow under the field (inside a dialog) instead of floating over the page. */
  inline?: boolean;
  onDone?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const t = getAdminText(locale).shell.search;
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<QuickSearchResults | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pending, startTransition] = useTransition();
  const seq = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++seq.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const r = await adminQuickSearch(term).catch(() => null);
        if (id === seq.current) {
          setResults(r ?? { orders: [], customers: [], products: [] });
          setActiveIndex(-1);
        }
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const short = q.trim().length < 2;
  const options = results && !short ? toOptions(results, q, locale) : [];
  const go = (opt: Option) => {
    setOpen(false);
    setQ("");
    setResults(null);
    onDone?.();
    router.push(opt.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (options.length ? (i - 1 + options.length) % options.length : -1));
    } else if (e.key === "Enter") {
      const opt = options[activeIndex] ?? (q.trim().length >= 2 ? options[options.length - 1] : undefined);
      if (opt) {
        e.preventDefault();
        go(opt);
      }
    } else if (e.key === "Escape") {
      if (open && q) {
        e.preventDefault();
        setOpen(false);
      } else {
        onDone?.();
      }
    }
  };

  const groups: { key: Option["group"]; label: string }[] = [
    { key: "orders", label: t.orders },
    { key: "customers", label: t.customers },
    { key: "products", label: t.products },
    { key: "all", label: "" },
  ];
  const showPanel = open && q.trim().length > 0;
  const activeId = activeIndex >= 0 && options[activeIndex] ? `${listId}-${options[activeIndex].id}` : undefined;

  return (
    <div ref={boxRef} className="relative w-full">
      <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" strokeWidth={1.75} />
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={t.label}
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        maxLength={80}
        placeholder={t.placeholder}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-[3px] border border-border bg-surface-elevated ps-9 pe-16 text-[0.8125rem] text-text-primary placeholder:text-text-faint outline-none transition-[border-color,box-shadow] hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] pointer-coarse:h-11"
      />
      <span className="pointer-events-none absolute end-2.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {pending ? <Spinner className="text-text-muted" /> : null}
        <kbd className="hidden rounded-[2px] border border-border px-1.5 font-sans text-[0.6875rem] leading-5 text-text-muted lg:inline" dir="ltr">
          {t.shortcut}
        </kbd>
      </span>

      <div
        id={listId}
        role="listbox"
        aria-label={t.label}
        hidden={!showPanel}
        className={cn(
          "rounded-[4px] border border-border bg-surface-elevated p-1",
          inline ? "mt-2" : "absolute inset-x-0 top-full z-40 mt-1 max-h-[min(70vh,28rem)] overflow-y-auto shadow-[var(--shadow-float)]",
        )}
      >
        {short ? (
          <p className="px-3 py-3 text-[0.8125rem] text-text-muted">{t.minChars}</p>
        ) : !results ? (
          <p className="px-3 py-3 text-[0.8125rem] text-text-muted">{t.searching}</p>
        ) : (
          <>
            {options.length <= 1 ? (
              <p className="px-3 py-3 text-[0.8125rem] text-text-muted">{fill(t.none, { q: q.trim() })}</p>
            ) : null}
            {groups.map((g) => {
              const items = options.filter((o) => o.group === g.key);
              if (!items.length) return null;
              return (
                <div key={g.key} role="group" aria-label={g.label || undefined} className={cn(g.key === "all" && "mt-1 border-t border-border pt-1")}>
                  {g.label ? <p className="t-eyebrow px-3 pb-1 pt-2">{g.label}</p> : null}
                  {items.map((opt) => {
                    const index = options.indexOf(opt);
                    return (
                      <div
                        key={opt.id}
                        id={`${listId}-${opt.id}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => go(opt)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex cursor-pointer flex-col rounded-[2px] px-3 py-2 pointer-coarse:py-3",
                          index === activeIndex ? "bg-surface" : "hover:bg-surface",
                        )}
                      >
                        <span className={cn("truncate text-[0.8125rem] text-text-primary", g.key === "orders" && "tabular-nums", g.key === "all" && "text-text-secondary")}>
                          {opt.title}
                        </span>
                        {opt.meta ? <span className="truncate text-[0.75rem] text-text-muted">{opt.meta}</span> : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export function QuickSearch({ locale }: { locale: string }) {
  const t = getAdminText(locale).shell.search;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const focusSearch = useCallback(() => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop) inputRef.current?.focus();
    else setDialogOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        focusSearch();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [focusSearch]);

  return (
    <>
      <div className="hidden w-64 md:block lg:w-80 xl:w-96">
        <SearchBox locale={locale} inputRef={inputRef} onDone={() => inputRef.current?.blur()} />
      </div>
      <button type="button" className={adminButton("ghost", "icon", "md:hidden")} aria-label={t.label} onClick={() => setDialogOpen(true)}>
        <Search aria-hidden="true" strokeWidth={1.75} />
      </button>
      {dialogOpen ? (
        <Dialog open onClose={() => setDialogOpen(false)} title={t.short} closeLabel={t.close} className="w-[calc(100vw-2rem)]">
          <div className="pb-2">
            <SearchBox locale={locale} autoFocus inline onDone={() => setDialogOpen(false)} />
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
