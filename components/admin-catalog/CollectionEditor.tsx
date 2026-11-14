"use client";

/* Collection editor: titles, descriptions, slug, cover, visibility, sort order and an ordered product picker. */

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@/components/ds";
import { deleteCollection, discardUploadedImage, saveCollection, searchProductsForPicker } from "@/lib/actions/admin-catalog";
import { catalogErrorKey, collectionInputSchema } from "@/lib/admin/catalog-schema";
import type { CollectionEditorData, PickerProduct } from "@/lib/admin/catalog-types";
import { slugify } from "@/lib/admin/catalog-utils";
import { moveItem } from "@/lib/admin/catalog-variants";
import { catalogError, fmt, getCatalogText } from "@/lib/admin/i18n-catalog";
import { productPrice } from "@/lib/seo/pricing";
import { cn, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { ConfirmDialog, Switch } from "./controls";
import { ImageField } from "./ImageField";
import { SlugField } from "./product-editor/fields";
import { FieldGroupLabel, FormSection, StatusLabel, Thumb } from "./ui";
import { useUnsavedGuard } from "./useUnsavedGuard";

interface Draft {
  title_en: string;
  title_ar: string;
  slug: string;
  slugEdited: boolean;
  description_en: string;
  description_ar: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: string;
  products: PickerProduct[];
}

const toDraft = (c: CollectionEditorData | null, nextSort: number): Draft =>
  c
    ? {
        title_en: c.title_en,
        title_ar: c.title_ar,
        slug: c.slug,
        slugEdited: true,
        description_en: c.description_en ?? "",
        description_ar: c.description_ar ?? "",
        image_url: c.image_url,
        is_active: c.is_active,
        sort_order: String(c.sort_order),
        products: c.products,
      }
    : { title_en: "", title_ar: "", slug: "", slugEdited: false, description_en: "", description_ar: "", image_url: null, is_active: true, sort_order: String(nextSort), products: [] };

const fingerprint = (d: Draft) => JSON.stringify({ ...d, slugEdited: undefined, products: d.products.map((p) => p.id) });

export function CollectionEditor({ data, locale, nextSort }: { data: CollectionEditorData | null; locale: string; nextSort: number }) {
  const t = getCatalogText(locale);
  const tc = t.collections;
  const ar = locale === "ar";
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => toDraft(data, nextSort));
  const [baseline] = useState(() => fingerprint(toDraft(data, nextSort)));
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<string[]>([]);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = fingerprint(d) !== baseline;
  const guard = useUnsavedGuard(
    dirty,
    { title: t.common.unsavedTitle, body: t.common.unsavedBody, leave: t.common.leave, stay: t.common.stay, close: t.common.close },
    () => {
      for (const url of uploads) if (url !== data?.image_url) void discardUploadedImage(url);
    },
  );
  const set = (patch: Partial<Draft>) => setD((s) => ({ ...s, ...patch }));
  const err = (key: string) => (error === key ? catalogError(t, key) : null);

  const save = () =>
    startSave(async () => {
      const input = {
        id: data?.id ?? null,
        title_en: d.title_en,
        title_ar: d.title_ar,
        slug: d.slug,
        description_en: d.description_en,
        description_ar: d.description_ar,
        image_url: d.image_url,
        is_active: d.is_active,
        sort_order: d.sort_order,
        product_ids: d.products.map((p) => p.id),
      };
      const check = collectionInputSchema.safeParse(input);
      if (!check.success) {
        const key = catalogErrorKey(check.error);
        setError(key);
        return void toast.error(catalogError(t, key));
      }
      const res = await saveCollection(input);
      if (!res.ok) {
        setError(res.error);
        return void toast.error(catalogError(t, res.error));
      }
      for (const url of uploads) if (url !== d.image_url) void discardUploadedImage(url);
      setUploads([]);
      setError(null);
      guard.release();
      toast.success(res.created ? tc.created : tc.saved);
      if (res.created) router.replace(`/admin/collections/${res.id}`);
      else router.refresh();
    });

  const remove = () =>
    startDelete(async () => {
      if (!data) return;
      const res = await deleteCollection(data.id);
      setConfirmDelete(false);
      if (!res.ok) return void toast.error(catalogError(t, res.error));
      guard.release();
      toast.success(tc.deleted);
      router.replace("/admin/collections");
    });

  const title = (ar ? d.title_ar || d.title_en : d.title_en || d.title_ar) || tc.newTitle;

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background px-4 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-16 before:bg-background md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
          <div className="min-w-0 flex-1">
            <Link href="/admin/collections" className="inline-flex items-center gap-1.5 text-[0.8125rem] text-text-muted hover:text-text-primary">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3.5L5.5 8l4.5 4.5" />
              </svg>
              {tc.back}
            </Link>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="t-h2 truncate text-[1.625rem]! md:text-[2rem]!">{title}</h1>
              <span className="flex items-center gap-3 text-[0.8125rem]">
                <StatusLabel active={d.is_active} label={d.is_active ? t.status.active : t.status.hidden} />
                <span className={cn("text-text-muted", dirty && "text-warning")} aria-live="polite">
                  {dirty ? t.common.unsavedBadge : data ? t.common.allSaved : null}
                </span>
              </span>
            </div>
          </div>
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty && !!data}>
            {saving ? t.common.saving : data ? t.common.saveChanges : t.common.save}
          </Button>
        </div>
      </div>

      {error && !["title_en", "title_ar", "slug", "duplicate_slug", "sort_order"].includes(error) ? (
        <p role="alert" className="mt-6 border-s-2 border-destructive bg-destructive-bg px-4 py-3 text-[0.8125rem] text-destructive">
          {catalogError(t, error)}
        </p>
      ) : null}

      <FormSection id="details" title={tc.details}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label={tc.titleEn}
              value={d.title_en}
              dir="ltr"
              lang="en"
              maxLength={120}
              error={err("title_en")}
              onChange={(e) => {
                const v = e.target.value;
                setD((s) => ({ ...s, title_en: v, slug: s.slugEdited ? s.slug : slugify(v) }));
              }}
            />
            <Input label={tc.titleAr} value={d.title_ar} dir="rtl" lang="ar" maxLength={120} error={err("title_ar")} onChange={(e) => set({ title_ar: e.target.value })} />
          </div>
          <SlugField
            kind="collection"
            value={d.slug}
            edited={d.slugEdited}
            exceptId={data?.id ?? null}
            prefix="/collections/"
            error={err("slug") ?? err("duplicate_slug")}
            onChange={(slug, edited) => set({ slug, slugEdited: edited })}
            labels={{
              label: tc.slug,
              hint: t.editor.basics.slugHint,
              auto: t.editor.basics.slugAuto,
              taken: t.error.duplicate_slug,
              free: t.editor.basics.slugFree,
              checking: t.editor.basics.slugChecking,
              invalid: t.error.slug,
              useSuggestion: (s) => fmt(t.editor.basics.useSlug, { slug: s }),
            }}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <FieldGroupLabel>{t.common.english}</FieldGroupLabel>
              <Textarea label={tc.descriptionEn} rows={4} dir="ltr" lang="en" maxLength={2000} value={d.description_en} onChange={(e) => set({ description_en: e.target.value })} />
            </div>
            <div className="flex flex-col gap-3">
              <FieldGroupLabel>{t.common.arabic}</FieldGroupLabel>
              <Textarea label={tc.descriptionAr} rows={4} dir="rtl" lang="ar" maxLength={2000} value={d.description_ar} onChange={(e) => set({ description_ar: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <ImageField
              value={d.image_url}
              onChange={(url) => set({ image_url: url })}
              onUploaded={(url) => setUploads((u) => [...u, url])}
              scope="collections"
              aspect="aspect-[16/9]"
              labels={{
                label: tc.image,
                drop: t.upload.dropOne,
                hint: t.upload.hint,
                replace: t.upload.replace,
                remove: t.upload.remove,
                uploading: t.upload.uploading,
                errors: t.error,
                fallbackError: t.upload.failed,
              }}
            />
            <div className="flex flex-col gap-4">
              <Input
                label={tc.sortOrder}
                hint={tc.sortHint}
                inputMode="numeric"
                dir="ltr"
                value={d.sort_order}
                error={err("sort_order")}
                onChange={(e) => set({ sort_order: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                wrapperClassName="max-w-40"
              />
              <div className="border-y border-border">
                <Switch checked={d.is_active} onChange={(v) => set({ is_active: v })} label={tc.active} description={tc.activeHint} />
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection id="products" title={tc.picker} hint={tc.pickerHint}>
        <ProductPicker value={d.products} onChange={(products) => set({ products })} locale={locale} />
      </FormSection>

      {data ? (
        <div className="pt-8">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-10 items-center rounded-sm px-3 text-[0.8125rem] text-destructive transition-colors hover:bg-destructive-bg"
          >
            {t.common.delete}
          </button>
        </div>
      ) : null}

      {guard.dialog}
      <ConfirmDialog
        open={confirmDelete}
        title={tc.deleteTitle}
        body={tc.deleteBody}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        destructive
        busy={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function ProductPicker({ value, onChange, locale }: { value: PickerProduct[]; onChange: (v: PickerProduct[]) => void; locale: string }) {
  const t = getCatalogText(locale);
  const tc = t.collections;
  const ar = locale === "ar";
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PickerProduct[] | null>(null);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chosen = new Set(value.map((p) => p.id));
  const name = (p: PickerProduct) => (ar ? p.name_ar || p.name_en : p.name_en);
  const price = (p: PickerProduct) => formatPrice(productPrice(p), (ar ? "ar" : "en") as Locale);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const search = (q: string) => {
    setTerm(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchProductsForPicker(q);
      setSearching(false);
      setResults(res.ok ? res.products : []);
    }, 250);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="relative">
          <span className="sr-only">{tc.pickerSearch}</span>
          <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
          <input
            type="search"
            value={term}
            placeholder={tc.pickerSearch}
            onFocus={() => results === null && search(term)}
            onChange={(e) => search(e.target.value)}
            className="h-11 w-full rounded-sm border border-border bg-surface-elevated ps-9 pe-3 text-sm outline-none placeholder:text-text-faint hover:border-border-hover focus:border-text-primary"
          />
        </label>
        <ul className="max-h-[26rem] overflow-y-auto" aria-busy={searching || undefined} aria-live="polite">
          {results !== null && results.length === 0 && !searching ? <li className="py-6 text-center text-sm text-text-muted">{tc.pickerNoResults}</li> : null}
          {(results ?? []).map((p) => {
            const added = chosen.has(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 border-b border-border py-2">
                <Thumb src={p.thumbnail_url} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">{name(p)}</span>
                  <span className="block text-[0.75rem] text-text-muted tabular-nums">
                    {price(p)}
                    {p.is_active ? "" : ` · ${t.status.draft}`}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={added}
                  aria-label={fmt(tc.addProduct, { name: name(p) })}
                  onClick={() => onChange([...value, p])}
                  className="h-9 shrink-0 rounded-sm border border-border px-3 text-[0.8125rem] text-text-primary hover:border-text-primary disabled:border-transparent disabled:text-text-muted"
                >
                  {added ? tc.added : `+ ${t.common.add}`}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="t-eyebrow mb-2">{fmt(tc.products, { count: value.length })}</p>
        {value.length === 0 ? (
          <p className="border-y border-border py-8 text-center text-sm text-text-muted">{tc.pickerEmpty}</p>
        ) : (
          <ol className="border-t border-border">
            {value.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 border-b border-border py-2">
                <span className="w-5 shrink-0 text-end text-[0.75rem] text-text-muted tabular-nums">{i + 1}</span>
                <Thumb src={p.thumbnail_url} size={32} />
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{name(p)}</span>
                <span className="flex shrink-0 items-center">
                  <SmallIcon label={`${t.common.moveUp}: ${name(p)}`} disabled={i === 0} onClick={() => onChange(moveItem(value, i, i - 1))} path="M4 10l4-4 4 4" />
                  <SmallIcon label={`${t.common.moveDown}: ${name(p)}`} disabled={i === value.length - 1} onClick={() => onChange(moveItem(value, i, i + 1))} path="M4 6l4 4 4-4" />
                  <SmallIcon label={fmt(tc.removeProduct, { name: name(p) })} onClick={() => onChange(value.filter((x) => x.id !== p.id))} path="M4 4l8 8M12 4l-8 8" danger />
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function SmallIcon({ label, onClick, path, disabled, danger }: { label: string; onClick: () => void; path: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("inline-flex size-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface disabled:opacity-25", danger ? "hover:text-destructive" : "hover:text-text-primary")}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={path} />
      </svg>
    </button>
  );
}
