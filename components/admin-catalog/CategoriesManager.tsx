"use client";

/* Categories: tree with up/down ordering, create / edit in a drawer, guarded delete. */

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Drawer, Input, Select, Textarea } from "@/components/ds";
import { deleteCategory, discardUploadedImage, moveCategory, saveCategory } from "@/lib/actions/admin-catalog";
import { categoryInputSchema, catalogErrorKey } from "@/lib/admin/catalog-schema";
import type { CatalogCategory } from "@/lib/admin/catalog-types";
import { buildTree, descendantIds, flattenTree, slugify, type TreeNode } from "@/lib/admin/catalog-utils";
import { catalogError, fmt, formatCount, getCatalogText, type CatalogText } from "@/lib/admin/i18n-catalog";
import { cn } from "@/lib/utils";
import { ConfirmDialog, Switch } from "./controls";
import { ImageField } from "./ImageField";
import { SlugField } from "./product-editor/fields";
import { EmptyPanel, PageHeader, StatusLabel, Thumb, tdClass, thClass } from "./ui";

interface Draft {
  id: string | null;
  name_en: string;
  name_ar: string;
  slug: string;
  slugEdited: boolean;
  parent_id: string;
  description_en: string;
  description_ar: string;
  image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
}

const blank = (parent: string | null): Draft => ({
  id: null,
  name_en: "",
  name_ar: "",
  slug: "",
  slugEdited: false,
  parent_id: parent ?? "",
  description_en: "",
  description_ar: "",
  image_url: null,
  is_featured: false,
  is_active: true,
});

const fromCategory = (c: CatalogCategory): Draft => ({
  id: c.id,
  name_en: c.name_en,
  name_ar: c.name_ar,
  slug: c.slug,
  slugEdited: true,
  parent_id: c.parent_id ?? "",
  description_en: c.description_en ?? "",
  description_ar: c.description_ar ?? "",
  image_url: c.image_url,
  is_featured: c.is_featured,
  is_active: c.is_active,
});

export function CategoriesManager({ categories, locale, meta }: { categories: CatalogCategory[]; locale: string; meta?: ReactNode }) {
  const t = getCatalogText(locale);
  const ar = locale === "ar";
  const router = useRouter();
  const rows = useMemo(() => flattenTree(buildTree(categories)), [categories]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<TreeNode<CatalogCategory> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = (d: Draft) => {
    setDraft(d);
    setDrawerOpen(true);
  };

  const move = (id: string, direction: "up" | "down") => {
    setBusyId(id);
    startTransition(async () => {
      const res = await moveCategory(id, direction);
      setBusyId(null);
      if (!res.ok) return void toast.error(catalogError(t, res.error));
      router.refresh();
    });
  };

  const confirmDelete = () =>
    startTransition(async () => {
      if (!deleting) return;
      const res = await deleteCategory(deleting.id);
      if (!res.ok) return void toast.error(catalogError(t, res.error));
      setDeleting(null);
      toast.success(t.categories.deleted);
      router.refresh();
    });

  const siblings = (c: TreeNode<CatalogCategory>) => rows.filter((r) => (r.parent_id ?? null) === (c.parent_id ?? null));
  const blockedReason = (c: TreeNode<CatalogCategory>) =>
    c.product_count > 0
      ? fmt(t.categories.cantDeleteProducts, { count: c.product_count })
      : c.children.length > 0
        ? t.categories.cantDeleteChildren
        : null;

  return (
    <>
      <PageHeader
        title={t.categories.title}
        description={t.categories.description}
        meta={meta}
        actions={
          <Button size="sm" onClick={() => open(blank(null))}>
            {t.categories.add}
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyPanel
          title={t.categories.emptyTitle}
          body={t.categories.emptyBody}
          action={
            <Button size="sm" onClick={() => open(blank(null))}>
              {t.categories.add}
            </Button>
          }
        />
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead className="hidden md:table-header-group">
            <tr className="border-y border-border">
              <th scope="col" className={thClass}>
                {t.categories.columns.name}
              </th>
              <th scope="col" className={cn(thClass, "w-32")}>
                {t.categories.columns.products}
              </th>
              <th scope="col" className={cn(thClass, "w-36")}>
                {t.categories.columns.status}
              </th>
              <th scope="col" className={cn(thClass, "w-24")}>
                {t.categories.columns.order}
              </th>
              <th scope="col" className={cn(thClass, "w-56 text-end")}>
                <span className="sr-only">{t.common.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const sibs = siblings(c);
              const index = sibs.findIndex((s) => s.id === c.id);
              const name = ar ? c.name_ar : c.name_en;
              return (
                <tr key={c.id} className="flex flex-wrap items-center border-b border-border py-2 md:table-row md:py-0">
                  <td className={cn(tdClass, "w-full md:w-auto")}>
                    <div className="flex items-center gap-3" style={{ paddingInlineStart: `${c.depth * 1.75}rem` }}>
                      {c.depth > 0 ? (
                        <span aria-hidden="true" className="-ms-4 h-5 w-3 shrink-0 border-b border-s border-border-hover rtl:rounded-none" />
                      ) : null}
                      <Thumb src={c.image_url} size={32} />
                      <button type="button" onClick={() => open(fromCategory(c))} className="min-w-0 text-start">
                        <span className={cn("block truncate text-text-primary hover:underline hover:underline-offset-4", c.depth === 0 && "font-medium")}>{name}</span>
                        <span className="block truncate text-[0.75rem] text-text-muted" dir="ltr">
                          /{c.slug}
                        </span>
                      </button>
                    </div>
                  </td>
                  <td className={cn(tdClass, "text-text-secondary tabular-nums")}>
                    <Link href={`/admin/products?category=${c.id}`} className="hover:text-text-primary hover:underline hover:underline-offset-4">
                      <span className="md:hidden">{fmt(t.categories.products, { count: formatCount(c.product_count, locale) })}</span>
                      <span className="hidden md:inline">{formatCount(c.product_count, locale)}</span>
                    </Link>
                  </td>
                  <td className={tdClass}>
                    <StatusLabel active={c.is_active} label={c.is_active ? t.status.active : t.status.hidden} />
                    {c.is_featured ? <span className="mt-0.5 block text-[0.75rem] text-text-muted">{t.status.featured}</span> : null}
                  </td>
                  <td className={tdClass}>
                    <div className="flex items-center">
                      <OrderButton label={`${t.common.moveUp}: ${name}`} disabled={index <= 0 || pending} busy={busyId === c.id} onClick={() => move(c.id, "up")} up />
                      <OrderButton label={`${t.common.moveDown}: ${name}`} disabled={index === sibs.length - 1 || pending} busy={busyId === c.id} onClick={() => move(c.id, "down")} />
                    </div>
                  </td>
                  <td className={cn(tdClass, "ms-auto text-end")}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => open(blank(c.id))} className="h-9 whitespace-nowrap rounded-sm px-2 text-[0.8125rem] text-text-secondary hover:bg-surface hover:text-text-primary">
                        + {t.categories.addChild}
                      </button>
                      <button
                        type="button"
                        aria-label={`${t.common.delete}: ${name}`}
                        title={t.common.delete}
                        onClick={() => setDeleting(c)}
                        className="inline-flex size-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-destructive"
                      >
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.25">
                          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <CategoryDrawer
        key={draft ? (draft.id ?? `new-${draft.parent_id}`) : "none"}
        open={drawerOpen}
        draft={draft}
        categories={categories}
        t={t}
        locale={locale}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          setDrawerOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title={deleting ? fmt(t.categories.deleteTitle, { name: ar ? deleting.name_ar : deleting.name_en }) : ""}
        body={deleting ? (blockedReason(deleting) ?? t.categories.deleteBody) : ""}
        confirmLabel={deleting && blockedReason(deleting) ? t.common.close : t.common.delete}
        cancelLabel={deleting && blockedReason(deleting) ? undefined : t.common.cancel}
        closeLabel={t.common.close}
        destructive={!!deleting && !blockedReason(deleting)}
        busy={pending}
        onConfirm={() => (deleting && blockedReason(deleting) ? setDeleting(null) : confirmDelete())}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function OrderButton({ label, disabled, busy, onClick, up }: { label: string; disabled: boolean; busy: boolean; onClick: () => void; up?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-busy={busy || undefined}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface hover:text-text-primary disabled:opacity-25"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={up ? "M4 10l4-4 4 4" : "M4 6l4 4 4-4"} />
      </svg>
    </button>
  );
}

function CategoryDrawer({
  open,
  draft: initial,
  categories,
  t,
  locale,
  onClose,
  onSaved,
}: {
  open: boolean;
  draft: Draft | null;
  categories: CatalogCategory[];
  t: CatalogText;
  locale: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ar = locale === "ar";
  const [d, setD] = useState<Draft>(initial ?? blank(null));
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<string[]>([]);
  const [saving, startSave] = useTransition();
  const tc = t.categories;

  const parentOptions = useMemo(() => {
    const blocked = d.id ? descendantIds(categories, d.id) : new Set<string>();
    return flattenTree(buildTree(categories)).filter((c) => !blocked.has(c.id));
  }, [categories, d.id]);

  const set = (patch: Partial<Draft>) => setD((s) => ({ ...s, ...patch }));

  const cancel = () => {
    // Uploaded here but not kept: delete the files again.
    for (const url of uploads) if (url !== initial?.image_url) void discardUploadedImage(url);
    setUploads([]);
    onClose();
  };

  const save = () =>
    startSave(async () => {
      const input = {
        id: d.id,
        name_en: d.name_en,
        name_ar: d.name_ar,
        slug: d.slug,
        parent_id: d.parent_id || null,
        description_en: d.description_en,
        description_ar: d.description_ar,
        image_url: d.image_url,
        is_featured: d.is_featured,
        is_active: d.is_active,
      };
      const check = categoryInputSchema.safeParse(input);
      if (!check.success) return setError(catalogErrorKey(check.error));
      const res = await saveCategory(input);
      if (!res.ok) return setError(res.error);
      for (const url of uploads) if (url !== d.image_url && url !== initial?.image_url) void discardUploadedImage(url);
      setUploads([]);
      setError(null);
      toast.success(tc.saved);
      onSaved();
    });

  const err = (key: string) => (error === key ? catalogError(t, key) : null);

  return (
    <Drawer
      open={open}
      onClose={cancel}
      title={d.id ? tc.edit : tc.add}
      closeLabel={t.common.close}
      className="max-w-[520px]"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={cancel}>
            {t.common.cancel}
          </Button>
          <Button onClick={save} loading={saving}>
            {t.common.save}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-5">
        {error && !["name_en", "name_ar", "slug", "duplicate_slug"].includes(error) ? (
          <p role="alert" className="border-s-2 border-destructive bg-destructive-bg px-4 py-3 text-[0.8125rem] text-destructive">
            {catalogError(t, error)}
          </p>
        ) : null}
        <Input
          label={tc.nameEn}
          value={d.name_en}
          dir="ltr"
          lang="en"
          maxLength={100}
          error={err("name_en")}
          onChange={(e) => {
            const v = e.target.value;
            setD((s) => ({ ...s, name_en: v, slug: s.slugEdited ? s.slug : slugify(v) }));
          }}
        />
        <Input label={tc.nameAr} value={d.name_ar} dir="rtl" lang="ar" maxLength={100} error={err("name_ar")} onChange={(e) => set({ name_ar: e.target.value })} />
        <SlugField
          kind="category"
          value={d.slug}
          edited={d.slugEdited}
          exceptId={d.id}
          prefix="/category/"
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
            useSuggestion: (s) => (ar ? `استخدم ${s}` : `Use ${s}`),
          }}
        />
        <Select label={tc.parent} value={d.parent_id} onChange={(e) => set({ parent_id: e.target.value })} error={err("category_parent")}>
          <option value="">{tc.noParent}</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {" ".repeat(c.depth)}
              {ar ? c.name_ar : c.name_en}
            </option>
          ))}
        </Select>
        <Textarea label={tc.descriptionEn} rows={3} dir="ltr" lang="en" maxLength={1000} value={d.description_en} onChange={(e) => set({ description_en: e.target.value })} />
        <Textarea label={tc.descriptionAr} rows={3} dir="rtl" lang="ar" maxLength={1000} value={d.description_ar} onChange={(e) => set({ description_ar: e.target.value })} />
        <ImageField
          value={d.image_url}
          onChange={(url) => set({ image_url: url })}
          onUploaded={(url) => setUploads((u) => [...u, url])}
          scope="categories"
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
        <div className="border-t border-border [&>*]:border-b [&>*]:border-border">
          <Switch checked={d.is_active} onChange={(v) => set({ is_active: v })} label={tc.active} description={tc.activeHint} />
          <Switch checked={d.is_featured} onChange={(v) => set({ is_featured: v })} label={tc.featured} description={tc.featuredHint} />
        </div>
      </div>
    </Drawer>
  );
}
