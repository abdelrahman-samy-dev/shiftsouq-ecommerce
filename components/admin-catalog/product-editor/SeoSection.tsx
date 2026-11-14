"use client";

/* Search engines: title and description per language, character counters and a search-result preview. */

import { useId } from "react";
import { controlClasses } from "@/components/ds";
import { brand } from "@/lib/brand/config";
import type { EditorState } from "@/lib/admin/catalog-editor";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, snippetText } from "@/lib/admin/catalog-utils";
import { fmt, type CatalogText } from "@/lib/admin/i18n-catalog";
import { cn } from "@/lib/utils";

function CountedField({
  label,
  value,
  onChange,
  max,
  multiline,
  lang,
  placeholder,
  t,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  multiline?: boolean;
  lang: "en" | "ar";
  placeholder: string;
  t: CatalogText;
}) {
  const id = useId();
  const over = value.length > max;
  const props = {
    id,
    value,
    placeholder,
    dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const),
    lang,
    "aria-describedby": `${id}-count`,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
    maxLength: max + (multiline ? 40 : 20),
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] text-text-secondary">
          {label}
        </label>
        <span id={`${id}-count`} className={cn("text-[0.75rem] tabular-nums", over ? "text-warning" : "text-text-muted")}>
          {fmt(t.editor.seo.chars, { count: value.length, max })}
          {over ? <span className="sr-only"> {t.editor.seo.tooLong}</span> : null}
        </span>
      </div>
      {multiline ? (
        <textarea {...props} rows={3} className={cn(controlClasses, "h-auto resize-y py-3 leading-relaxed")} />
      ) : (
        <input {...props} className={controlClasses} />
      )}
    </div>
  );
}

function Snippet({ title, description, path, lang }: { title: string; description: string; path: string; lang: "en" | "ar" }) {
  const host = brand.siteUrl.replace(/^https?:\/\//, "");
  return (
    <div lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-sm border border-border bg-surface-elevated p-4">
      <p className="truncate text-[0.75rem] text-text-muted" dir="ltr">
        {host}
        {path}
      </p>
      <p className="mt-1 line-clamp-1 text-[1.0625rem] leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{title}</p>
      <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-text-secondary">{description}</p>
    </div>
  );
}

export function SeoSection({ state, update, t }: { state: EditorState; update: (patch: Partial<EditorState>) => void; t: CatalogText }) {
  const ts = t.editor.seo;
  const site = brand.name;
  const path = `/product/${state.slug || "…"}`;
  const titleEn = snippetText(`${state.seo_title_en || state.name_en || "—"} | ${site.en}`, SEO_TITLE_MAX + 10);
  const titleAr = snippetText(`${state.seo_title_ar || state.name_ar || "—"} | ${site.ar}`, SEO_TITLE_MAX + 10);
  const descEn = snippetText(state.seo_description_en || state.description_en || "", SEO_DESCRIPTION_MAX);
  const descAr = snippetText(state.seo_description_ar || state.description_ar || "", SEO_DESCRIPTION_MAX);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="t-eyebrow">{t.common.english}</p>
          <CountedField t={t} lang="en" label={ts.title} value={state.seo_title_en} max={SEO_TITLE_MAX} placeholder={state.name_en} onChange={(v) => update({ seo_title_en: v })} />
          <CountedField
            t={t}
            lang="en"
            multiline
            label={ts.description}
            value={state.seo_description_en}
            max={SEO_DESCRIPTION_MAX}
            placeholder={snippetText(state.description_en, SEO_DESCRIPTION_MAX)}
            onChange={(v) => update({ seo_description_en: v })}
          />
        </div>
        <div className="flex flex-col gap-4">
          <p className="t-eyebrow">{t.common.arabic}</p>
          <CountedField t={t} lang="ar" label={ts.title} value={state.seo_title_ar} max={SEO_TITLE_MAX} placeholder={state.name_ar} onChange={(v) => update({ seo_title_ar: v })} />
          <CountedField
            t={t}
            lang="ar"
            multiline
            label={ts.description}
            value={state.seo_description_ar}
            max={SEO_DESCRIPTION_MAX}
            placeholder={snippetText(state.description_ar, SEO_DESCRIPTION_MAX)}
            onChange={(v) => update({ seo_description_ar: v })}
          />
        </div>
      </div>
      <div>
        <p className="mb-2 text-[0.8125rem] text-text-secondary">{ts.preview}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Snippet lang="en" title={titleEn} description={descEn} path={path} />
          <Snippet lang="ar" title={titleAr} description={descAr} path={path} />
        </div>
      </div>
    </div>
  );
}
