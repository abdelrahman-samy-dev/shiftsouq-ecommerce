"use client";

/* ══════════════════════════════════════════════════════════════
   SearchPanel — the header search experience
   ──────────────────────────────────────────────────────────────
   Native modal <dialog>: below the header on desktop (the header
   stays visible above, the page is dimmed), full screen on
   phones. Large input; before typing: recent searches, popular
   categories and best sellers; while typing: matching
   categories and up to 6 products (debounced ~200 ms, the
   previous request aborted).
   Keyboard: ↓ / ↑ move between the input and the results,
   Enter opens a result (or searches from the input), Esc closes.
   Loaded on demand by SearchOverlayTrigger.
   ══════════════════════════════════════════════════════════════ */

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Search, X } from "lucide-react";
import { Price } from "@/components/ds/Display";
import type { Locale } from "@/lib/types";
import type { SuggestCategory, SuggestProduct } from "@/lib/dal/products";
import { discoveryCopy } from "@/lib/search/copy";
import { cleanQuery } from "@/lib/search/normalize";
import { cn } from "@/lib/utils";
import { clearRecentSearches, readRecentSearches, saveRecentSearch } from "./recent-searches";

interface Suggestions {
  query: string;
  total: number;
  products: SuggestProduct[];
  categories: SuggestCategory[];
}

const searchHref = (q: string) => `/search?q=${encodeURIComponent(q)}`;
const categoryHref = (slug: string) => `/category/${encodeURIComponent(slug)}`;
const productHref = (slug: string) => `/product/${encodeURIComponent(slug)}`;

export default function SearchPanel({
  locale,
  open,
  top,
  onClose,
}: {
  locale: Locale;
  open: boolean;
  /** Distance from the top of the viewport (the header's bottom edge); 0 = full screen. */
  top: number;
  onClose: () => void;
}) {
  const copy = discoveryCopy(locale);
  const isAr = locale === "ar";
  const router = useRouter();
  const baseId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, Suggestions>());

  const [text, setText] = useState("");
  const [results, setResults] = useState<Suggestions | null>(null);
  const [starters, setStarters] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches());

  const q = cleanQuery(text);
  const current = q && results?.query === q ? results : null;

  /* ── Dialog open / close and page scroll lock ───────────────── */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    if (!open && el.open) el.close();
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handle = () => onClose();
    el.addEventListener("close", handle);
    return () => el.removeEventListener("close", handle);
  }, [onClose]);

  /* ── Popular categories + best sellers (once) ───────────────── */
  useEffect(() => {
    if (!open || starters) return;
    const controller = new AbortController();
    fetch("/api/search/suggest", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Suggestions | null) => {
        if (data) setStarters(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, starters]);

  /* ── Live results: debounced, previous request aborted ──────── */
  useEffect(() => {
    if (!q) return;
    const cached = cache.current.get(q);
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        if (cached) {
          setResults(cached);
          return;
        }
        setLoading(true);
        try {
          const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
          if (!res.ok) return;
          const data = (await res.json()) as Suggestions;
          cache.current.set(q, data);
          setResults(data);
        } catch {
          /* aborted or offline */
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      cached ? 0 : 200,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  function go(href: string, remember?: string) {
    if (remember) setRecent(saveRecentSearch(remember));
    onClose();
    router.push(href);
  }

  /** ↓ / ↑ between the input and every visible result link. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("[data-option]") ?? []).filter(
      (el) => el.offsetParent !== null,
    );
    if (items.length === 0) return;
    e.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      items[index < 0 ? 0 : Math.min(index + 1, items.length - 1)].focus();
    } else if (index <= 0) {
      inputRef.current?.focus();
    } else {
      items[index - 1].focus();
    }
  }

  /** Link that closes the panel, remembers the search and navigates client-side. */
  const link = (href: string, remember?: string) => ({
    href,
    "data-option": "",
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      go(href, remember);
    },
  });

  const products = q ? current?.products ?? [] : starters?.products ?? [];
  const categories = q ? current?.categories ?? [] : starters?.categories ?? [];
  const noMatch = Boolean(q && current && current.total === 0 && current.categories.length === 0);
  const status = !q
    ? ""
    : loading && !current
      ? copy.searching
      : current
        ? current.total > 0
          ? copy.countLabel(current.total)
          : copy.noMatches(q)
        : "";
  const rowClass =
    "-mx-2 flex h-11 items-center gap-3 rounded-sm px-2 text-sm text-text-primary transition-colors hover:bg-surface focus-visible:bg-surface";

  return (
    <dialog
      ref={dialogRef}
      aria-label={copy.searchLabel}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-text-primary backdrop:bg-transparent"
    >
      <div
        className="flex h-full flex-col"
        style={{ paddingTop: top }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={cn(
            "flex min-h-0 flex-col bg-background transition-[opacity,translate] duration-300 ease-out",
            "starting:-translate-y-2 starting:opacity-0 motion-reduce:transition-none",
            top === 0 ? "h-full" : "max-h-[min(80dvh,760px)] border-b border-border",
          )}
        >
          {/* ── Input ─────────────────────────────────────────── */}
          <form
            role="search"
            action="/search"
            onSubmit={(e) => {
              e.preventDefault();
              if (q) go(searchHref(q), q);
            }}
            className="shrink-0"
          >
            <div className="container-x">
              <div className="relative flex h-16 items-center gap-3 border-b border-border transition-colors focus-within:border-text-primary md:h-24 md:gap-5">
                <Search aria-hidden="true" className="size-5 shrink-0 text-text-muted md:size-6" strokeWidth={1.5} />
                <label htmlFor={`${baseId}-input`} className="sr-only">
                  {copy.searchLabel}
                </label>
                <input
                  ref={inputRef}
                  id={`${baseId}-input`}
                  name="q"
                  type="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  maxLength={60}
                  placeholder={copy.searchPlaceholder}
                  aria-describedby={`${baseId}-status`}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent text-lg text-text-primary outline-none placeholder:text-text-faint md:font-[family-name:var(--font-display)] md:text-[2rem] md:leading-none md:tracking-[-0.01em] [&::-webkit-search-cancel-button]:hidden"
                />
                {text ? (
                  <button
                    type="button"
                    onClick={() => {
                      setText("");
                      inputRef.current?.focus();
                    }}
                    className="inline-flex h-11 shrink-0 items-center px-1 text-[0.8125rem] text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
                  >
                    {copy.clearSearch}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={copy.closeSearch}
                  className="-me-2 inline-flex size-11 shrink-0 items-center justify-center rounded-sm hover:bg-surface"
                >
                  <X className="size-5" strokeWidth={1.5} />
                </button>
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-x-0 -bottom-px h-px bg-text-primary transition-opacity duration-300",
                    loading ? "animate-pulse opacity-100" : "opacity-0",
                  )}
                />
              </div>
            </div>
          </form>

          <p id={`${baseId}-status`} className="sr-only" role="status" aria-live="polite">
            {status}
          </p>

          {/* ── Results ───────────────────────────────────────── */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="container-x grid gap-10 py-7 md:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] md:gap-16 md:py-10">
              <div className="flex flex-col gap-9">
                {!q && recent.length > 0 ? (
                  <section aria-labelledby={`${baseId}-recent`}>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 id={`${baseId}-recent`} className="t-eyebrow">
                        {copy.recentSearches}
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          clearRecentSearches();
                          setRecent([]);
                          inputRef.current?.focus();
                        }}
                        className="inline-flex h-9 items-center text-[0.8125rem] text-text-muted underline-offset-4 hover:text-text-primary hover:underline"
                      >
                        {copy.clearRecent}
                      </button>
                    </div>
                    <ul className="flex flex-col">
                      {recent.map((r) => (
                        <li key={r}>
                          <a {...link(searchHref(r), r)} className={rowClass}>
                            <Clock aria-hidden="true" className="size-4 shrink-0 text-text-muted" strokeWidth={1.5} />
                            <span className="truncate">{r}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {categories.length > 0 ? (
                  <section aria-labelledby={`${baseId}-cats`}>
                    <h2 id={`${baseId}-cats`} className="t-eyebrow mb-2">
                      {q ? copy.categories : copy.popularCategories}
                    </h2>
                    <ul className="flex flex-col">
                      {categories.map((c) => {
                        const parent = isAr ? c.parent_ar : c.parent_en;
                        return (
                          <li key={c.slug}>
                            <a {...link(categoryHref(c.slug), q || undefined)} className={cn(rowClass, "justify-between")}>
                              <span className="truncate">
                                {isAr ? c.name_ar : c.name_en}
                                {parent ? <span className="ms-2 text-text-muted">{copy.inCategory(parent)}</span> : null}
                              </span>
                              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-text-muted rtl:-scale-x-100" strokeWidth={1.5} />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}

                {current && current.total > 0 ? (
                  <a
                    {...link(searchHref(q), q)}
                    className="hidden h-11 items-center gap-2 self-start rounded-sm text-sm font-medium text-text-primary md:inline-flex"
                  >
                    <span className="underline decoration-border-hover underline-offset-4">{copy.viewAll(current.total)}</span>
                    <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" strokeWidth={1.5} />
                  </a>
                ) : null}
              </div>

              <div>
                {noMatch ? (
                  <div>
                    <p className="t-h3">{copy.noMatches(q)}</p>
                    <p className="mt-2 text-text-secondary">{copy.noResultsBody}</p>
                  </div>
                ) : products.length > 0 ? (
                  <section aria-labelledby={`${baseId}-products`}>
                    <h2 id={`${baseId}-products`} className="t-eyebrow mb-4">
                      {q ? copy.products : copy.trending}
                    </h2>
                    <ul className="grid grid-cols-3 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-4 xl:grid-cols-6">
                      {products.map((p) => (
                        <li key={p.slug}>
                          <a {...link(productHref(p.slug), q || undefined)} className="group block rounded-sm">
                            <div className="relative aspect-[4/5] overflow-hidden bg-surface">
                              {p.image ? (
                                <Image
                                  src={p.image}
                                  alt=""
                                  fill
                                  sizes="(min-width: 1280px) 180px, (min-width: 768px) 16vw, 30vw"
                                  className="object-cover"
                                />
                              ) : null}
                            </div>
                            <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-snug text-text-primary group-hover:underline group-hover:underline-offset-4">
                              {isAr ? p.name_ar : p.name_en}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
                              {p.varies ? <span className="text-[0.75rem] text-text-muted">{copy.from}</span> : null}
                              <Price amount={p.price} compareAt={p.compareAt} locale={locale} size="sm" />
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {current && current.total > 0 ? (
                  <a
                    {...link(searchHref(q), q)}
                    className="mt-8 flex h-12 items-center justify-center gap-2 rounded-sm border border-text-primary text-sm font-medium text-text-primary md:hidden"
                  >
                    {copy.viewAll(current.total)}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {top > 0 ? (
          <div
            aria-hidden="true"
            onClick={onClose}
            className="min-h-0 flex-1 bg-[rgb(22_21_19/0.38)] transition-opacity duration-300 starting:opacity-0 motion-reduce:transition-none"
          />
        ) : null}
      </div>
    </dialog>
  );
}
