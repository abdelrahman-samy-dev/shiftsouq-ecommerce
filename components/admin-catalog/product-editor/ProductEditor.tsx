"use client";

/* ══════════════════════════════════════════════════════════════
   Product editor — /admin/products/new and /admin/products/[id]
   One form, saved by one server action (one database transaction).
   Sections: basics, description, pricing, sizes & colours, photos,
   search engines, visibility. Unsaved changes are guarded.
   ══════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Price, Select, Textarea } from "@/components/ds";
import { deleteProduct, discardUploadedImage, saveProduct } from "@/lib/actions/admin-catalog";
import { editorFingerprint, initialEditorState, sectionForError, toProductInput, type EditorSection, type EditorState } from "@/lib/admin/catalog-editor";
import { catalogErrorKey, productInputSchema } from "@/lib/admin/catalog-schema";
import type { CatalogCategory, ProductEditorData } from "@/lib/admin/catalog-types";
import { buildTree, flattenTree, slugify } from "@/lib/admin/catalog-utils";
import { catalogError, fmt, formatShortDate, getCatalogText } from "@/lib/admin/i18n-catalog";
import { priceSummary } from "@/lib/seo/pricing";
import { cn } from "@/lib/utils";
import { ConfirmDialog, Switch } from "../controls";
import { FieldGroupLabel, FormSection, StatusLabel } from "../ui";
import { useUnsavedGuard } from "../useUnsavedGuard";
import { MoneyInput, SlugField, TagInput } from "./fields";
import { MediaSection } from "./MediaSection";
import { SeoSection } from "./SeoSection";
import { VariantsSection } from "./VariantsSection";

type Patch = Partial<EditorState> | ((s: EditorState) => Partial<EditorState>);

const SECTIONS: EditorSection[] = ["basics", "content", "pricing", "variants", "media", "seo", "visibility"];

export function ProductEditor({
  data,
  categories,
  locale,
  threshold,
}: {
  data: ProductEditorData | null;
  categories: CatalogCategory[];
  locale: string;
  threshold: number;
}) {
  const t = getCatalogText(locale);
  const ar = locale === "ar";
  const router = useRouter();
  const [state, setState] = useState<EditorState>(() => initialEditorState(data));
  const [baseline] = useState(() => editorFingerprint(initialEditorState(data)));
  const [error, setError] = useState<{ key: string; section: EditorSection | null } | null>(null);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = useCallback((patch: Patch) => setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) })), []);
  const dirty = editorFingerprint(state) !== baseline;
  const guard = useUnsavedGuard(dirty, {
    title: t.common.unsavedTitle,
    body: t.common.unsavedBody,
    leave: t.common.leave,
    stay: t.common.stay,
    close: t.common.close,
  }, () => {
    // Photos uploaded in this visit but never saved: delete the files again.
    for (const img of state.images) if (img.fresh) void discardUploadedImage(img.url);
  });

  const tree = useMemo(() => flattenTree(buildTree(categories)), [categories]);
  const fieldError = (key: string) => (error?.key === key ? catalogError(t, key) : null);

  const showError = (key: string) => {
    const section = sectionForError(key);
    setError({ key, section });
    toast.error(catalogError(t, key));
    if (section) document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const save = () => {
    if (saving || uploading) return;
    startSave(async () => {
      const input = toProductInput(state, data?.id ?? null, data?.updated_at ?? null);
      const check = productInputSchema.safeParse(input);
      if (!check.success) return showError(catalogErrorKey(check.error));
      const res = await saveProduct(input);
      if (!res.ok) return showError(res.error);
      setError(null);
      guard.release();
      toast.success(res.created ? t.editor.created : state.is_active ? t.editor.saved : t.editor.savedHidden);
      if (res.created) router.replace(`/admin/products/${res.id}`);
      else router.refresh();
    });
  };

  // Ctrl / Cmd + S saves.
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remove = () =>
    startDelete(async () => {
      if (!data) return;
      const res = await deleteProduct(data.id);
      setConfirmDelete(false);
      if (!res.ok) return void toast.error(catalogError(t, res.error));
      guard.release();
      if (res.hidden) {
        toast.message(t.editor.hiddenInstead);
        router.refresh();
      } else {
        toast.success(t.editor.deleted);
        router.replace("/admin/products");
      }
    });

  const summary = priceSummary(
    { base_price: state.base_price === "" ? 0 : Number(state.base_price), sale_price: state.sale_price === "" ? null : Number(state.sale_price) },
    state.variants,
  );
  const title = (ar ? state.name_ar || state.name_en : state.name_en || state.name_ar) || t.editor.newTitle;
  const sectionBanner = (s: EditorSection) =>
    error?.section === s ? (
      <p role="alert" className="mb-5 border-s-2 border-destructive bg-destructive-bg px-4 py-3 text-[0.8125rem] text-destructive">
        {catalogError(t, error.key)}
      </p>
    ) : null;

  return (
    <div className="pb-24">
      {/* Sticky bar: title, state, actions, section links */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background px-4 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-16 before:bg-background md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-[0.8125rem] text-text-muted hover:text-text-primary">
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 3.5L5.5 8l4.5 4.5" />
              </svg>
              {t.editor.back}
            </Link>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="t-h2 truncate text-[1.625rem]! md:text-[2rem]!">{title}</h1>
              <span className="flex items-center gap-3 text-[0.8125rem]">
                <StatusLabel active={state.is_active} label={state.is_active ? t.status.active : t.status.draft} />
                <span className={cn("text-text-muted", dirty && "text-warning")} aria-live="polite">
                  {dirty ? t.common.unsavedBadge : data ? t.common.allSaved : null}
                </span>
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {data && data.is_active ? (
              <a
                href={`/product/${data.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden h-9 items-center gap-1.5 px-3 text-[0.8125rem] text-text-primary underline-offset-4 hover:underline sm:inline-flex"
              >
                {t.common.viewInStore}
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 3.5h6.5V10M12.5 3.5L4 12" />
                </svg>
              </a>
            ) : null}
            {/* Phones use the save bar at the bottom. */}
            <span className="hidden md:block">
              <Button size="sm" onClick={save} loading={saving} disabled={uploading || (!dirty && !!data)}>
                {saving ? t.common.saving : data ? t.common.saveChanges : t.common.save}
              </Button>
            </span>
          </div>
        </div>
        <nav aria-label={t.editor.contents} className="no-scrollbar -mb-px flex gap-5 overflow-x-auto">
          {SECTIONS.map((s) => (
            <a
              key={s}
              href={`#${s}`}
              className={cn(
                "shrink-0 border-b py-2.5 text-[0.8125rem] transition-colors",
                error?.section === s ? "border-destructive text-destructive" : "border-transparent text-text-muted hover:border-text-primary hover:text-text-primary",
              )}
            >
              {t.editor.sections[s]}
            </a>
          ))}
        </nav>
      </div>

      {/* Basics */}
      <FormSection id="basics" title={t.editor.sections.basics}>
        {sectionBanner("basics")}
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label={t.editor.basics.nameEn}
              value={state.name_en}
              dir="ltr"
              lang="en"
              maxLength={200}
              error={fieldError("name_en")}
              onChange={(e) => {
                const v = e.target.value;
                update((s) => ({ name_en: v, slug: s.slugEdited ? s.slug : slugify(v) }));
              }}
            />
            <Input
              label={t.editor.basics.nameAr}
              value={state.name_ar}
              dir="rtl"
              lang="ar"
              maxLength={200}
              error={fieldError("name_ar")}
              onChange={(e) => update({ name_ar: e.target.value })}
            />
          </div>
          <SlugField
            kind="product"
            value={state.slug}
            edited={state.slugEdited}
            exceptId={data?.id ?? null}
            prefix="/product/"
            error={fieldError("slug") ?? fieldError("duplicate_slug")}
            onChange={(slug, edited) => update({ slug, slugEdited: edited })}
            labels={{
              label: t.editor.basics.slug,
              hint: t.editor.basics.slugHint,
              auto: t.editor.basics.slugAuto,
              taken: t.editor.basics.slugTaken,
              free: t.editor.basics.slugFree,
              checking: t.editor.basics.slugChecking,
              invalid: t.error.slug,
              useSuggestion: (s) => fmt(t.editor.basics.useSlug, { slug: s }),
            }}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Select
              label={t.editor.basics.category}
              value={state.category_id}
              error={fieldError("category")}
              onChange={(e) => update({ category_id: e.target.value })}
            >
              <option value="" disabled>
                {t.editor.basics.categoryPlaceholder}
              </option>
              {tree.map((c) => (
                <option key={c.id} value={c.id}>
                  {" ".repeat(c.depth)}
                  {ar ? c.name_ar : c.name_en}
                  {c.is_active ? "" : ` (${t.status.hidden})`}
                </option>
              ))}
            </Select>
            <Input
              label={t.editor.basics.brand}
              optional={t.common.optional}
              value={state.brand}
              maxLength={80}
              error={fieldError("brand")}
              onChange={(e) => update({ brand: e.target.value })}
            />
          </div>
          <TagInput
            value={state.tags}
            onChange={(tags) => update({ tags })}
            label={t.editor.basics.tags}
            hint={t.editor.basics.tagsHint}
            placeholder={t.editor.basics.tagsPlaceholder}
            removeLabel={(tag) => fmt(t.editor.basics.removeTag, { tag })}
          />
        </div>
      </FormSection>

      {/* Description */}
      <FormSection id="content" title={t.editor.sections.content}>
        {sectionBanner("content")}
        <div className="grid gap-x-5 gap-y-6 md:grid-cols-2">
          {(["en", "ar"] as const).map((lng) => (
            <div key={lng} className="flex flex-col gap-4">
              <FieldGroupLabel>{lng === "en" ? t.common.english : t.common.arabic}</FieldGroupLabel>
              <Textarea
                label={t.editor.content.description}
                lang={lng}
                dir={lng === "ar" ? "rtl" : "ltr"}
                rows={5}
                maxLength={5000}
                value={state[`description_${lng}`]}
                onChange={(e) => update({ [`description_${lng}`]: e.target.value } as Partial<EditorState>)}
              />
              <Textarea
                label={t.editor.content.details}
                lang={lng}
                dir={lng === "ar" ? "rtl" : "ltr"}
                hint={t.editor.content.detailsHint}
                rows={4}
                maxLength={3000}
                value={state[`details_${lng}`]}
                onChange={(e) => update({ [`details_${lng}`]: e.target.value } as Partial<EditorState>)}
              />
              <Textarea
                label={t.editor.content.care}
                lang={lng}
                dir={lng === "ar" ? "rtl" : "ltr"}
                hint={t.editor.content.careHint}
                rows={3}
                maxLength={2000}
                value={state[`care_${lng}`]}
                onChange={(e) => update({ [`care_${lng}`]: e.target.value } as Partial<EditorState>)}
              />
            </div>
          ))}
        </div>
      </FormSection>

      {/* Pricing */}
      <FormSection id="pricing" title={t.editor.sections.pricing}>
        {sectionBanner("pricing")}
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] md:items-start">
          <MoneyInput
            label={t.editor.pricing.base}
            value={state.base_price}
            currency={t.editor.pricing.currency}
            error={fieldError("base_price")}
            onChange={(v) => update({ base_price: v })}
          />
          <MoneyInput
            label={t.editor.pricing.sale}
            value={state.sale_price}
            currency={t.editor.pricing.currency}
            hint={t.editor.pricing.saleHint}
            error={fieldError("sale_price")}
            onChange={(v) => update({ sale_price: v })}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.8125rem] text-text-secondary">{t.editor.pricing.preview}</span>
            <div className={cn("flex min-h-12 flex-col justify-center gap-1 border-s-2 ps-4", summary.price > 0 ? "border-text-primary" : "border-border")}>
              {summary.price > 0 ? (
                <>
                  <span className="flex items-baseline gap-2">
                    {summary.varies ? <span className="text-[0.8125rem] text-text-muted">{t.editor.pricing.from}</span> : null}
                    <Price amount={summary.price} compareAt={summary.compareAt} locale={locale} size="lg" />
                  </span>
                  {summary.discountPercent || summary.varies ? (
                    <span className="text-[0.75rem] text-text-muted">
                      {[
                        summary.discountPercent ? fmt(t.editor.pricing.previewSave, { percent: summary.discountPercent }) : null,
                        summary.varies ? t.editor.pricing.previewVaries : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-sm text-text-faint">—</span>
              )}
            </div>
          </div>
        </div>
      </FormSection>

      {/* Sizes & colours */}
      <FormSection id="variants" title={t.editor.sections.variants} hint={t.editor.variants.generateHint}>
        {sectionBanner("variants")}
        <VariantsSection state={state} update={update} t={t} locale={locale} productId={data?.id ?? null} threshold={threshold} />
      </FormSection>

      {/* Photos */}
      <FormSection id="media" title={t.editor.sections.media} hint={t.editor.media.sectionHint}>
        {sectionBanner("media")}
        <MediaSection state={state} update={update} t={t} locale={locale} onBusyChange={setUploading} />
      </FormSection>

      {/* Search engines */}
      <FormSection id="seo" title={t.editor.sections.seo} hint={t.editor.seo.hint}>
        {sectionBanner("seo")}
        <SeoSection state={state} update={update} t={t} />
      </FormSection>

      {/* Visibility */}
      <FormSection
        id="visibility"
        title={t.editor.sections.visibility}
        aside={
          data ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.8125rem]">
              <dt className="text-text-muted">{t.editor.meta.created}</dt>
              <dd className="tabular-nums text-text-secondary">{formatShortDate(data.created_at, locale)}</dd>
              <dt className="text-text-muted">{t.editor.meta.updated}</dt>
              <dd className="tabular-nums text-text-secondary">{formatShortDate(data.updated_at, locale)}</dd>
              <dt className="text-text-muted">{t.editor.meta.orders}</dt>
              <dd className="tabular-nums text-text-secondary">{fmt(t.editor.meta.ordersCount, { count: data.order_lines })}</dd>
            </dl>
          ) : null
        }
      >
        <div className="border-t border-border [&>*]:border-b [&>*]:border-border">
          <Switch checked={state.is_active} onChange={(v) => update({ is_active: v })} label={t.editor.visibility.active} description={t.editor.visibility.activeHint} />
          <Switch checked={state.is_featured} onChange={(v) => update({ is_featured: v })} label={t.editor.visibility.featured} description={t.editor.visibility.featuredHint} />
          <Switch checked={state.is_new} onChange={(v) => update({ is_new: v })} label={t.editor.visibility.isNew} description={t.editor.visibility.isNewHint} />
        </div>
        {data ? (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-10 items-center gap-2 rounded-sm px-3 text-[0.8125rem] text-destructive transition-colors hover:bg-destructive-bg"
            >
              {t.editor.deleteProduct}
            </button>
          </div>
        ) : null}
      </FormSection>

      {/* Phones: save stays in reach */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-background px-4 py-3 md:hidden">
        <Button fullWidth onClick={save} loading={saving} disabled={uploading || (!dirty && !!data)}>
          {saving ? t.common.saving : data ? t.common.saveChanges : t.common.save}
        </Button>
      </div>

      {guard.dialog}
      <ConfirmDialog
        open={confirmDelete}
        title={t.editor.deleteTitle}
        body={data && data.order_lines > 0 ? t.editor.deleteBodyOrdered : t.editor.deleteBody}
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
