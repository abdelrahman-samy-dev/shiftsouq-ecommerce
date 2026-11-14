"use client";

/* ══════════════════════════════════════════════════════════════
   Store settings form (owner edits, admins read).
   Validated in the browser and again on the server with the
   same zod schema (lib/admin/settings-schema.ts). A sticky bar
   appears when something changed; leaving with unsaved changes
   asks first.
   ══════════════════════════════════════════════════════════════ */

import Image from "next/image";
import { Fragment, useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ds";
import { saveStoreSettings } from "@/lib/actions/admin-owner";
import { errorText, fill, getAdminText } from "@/lib/admin/i18n";
import { GOVERNORATE_KEYS, MAX_ANNOUNCEMENTS, isHeroImage, settingsErrors, settingsSchema, type SettingsValues } from "@/lib/admin/settings-schema";
import { GOVERNORATES } from "@/lib/store/useCheckoutStore";
import { cn } from "@/lib/utils";
import { adminButton } from "../components/buttons";
import { Panel } from "../components/ui";

export type PaymobStatus = "configured" | "test" | "missing";

type Path = (string | number)[];

function getAt(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string | number, unknown>)[k] : undefined), obj);
}

function setAt<T>(obj: T, path: Path, value: unknown): T {
  const copy = structuredClone(obj) as Record<string | number, unknown>;
  let cur = copy;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string | number, unknown>;
  cur[path[path.length - 1]] = value;
  return copy as T;
}

const inputClass =
  "h-10 w-full rounded-[3px] border border-border bg-background px-3 text-[0.8125rem] text-text-primary placeholder:text-text-faint outline-none transition-[border-color,box-shadow] " +
  "hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] " +
  "aria-[invalid=true]:border-destructive disabled:cursor-not-allowed disabled:opacity-70 pointer-coarse:h-11";

const SECTIONS = ["announcement", "contact", "social", "shipping", "payments", "policies", "home", "inventory"] as const;

export function SettingsForm({
  locale,
  initial,
  updatedAt,
  readOnly,
  paymob,
}: {
  locale: string;
  initial: SettingsValues;
  updatedAt: string | null;
  readOnly: boolean;
  paymob: { card: PaymobStatus; wallet: PaymobStatus };
}) {
  const t = getAdminText(locale);
  const S = t.settings;
  const [values, setValues] = useState<SettingsValues>(initial);
  const [baseline, setBaseline] = useState<SettingsValues>(initial);
  const [version, setVersion] = useState(updatedAt);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const dirty = useMemo(() => JSON.stringify(values) !== JSON.stringify(baseline), [values, baseline]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (path: Path, value: unknown) => {
    setValues((v) => setAt(v, path, value));
    const key = path.join(".");
    if (errors[key])
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
  };
  const err = (path: Path) => {
    const code = errors[path.join(".")];
    return code ? (S.errors[code] ?? S.errors.required) : undefined;
  };

  const focusFirstError = () =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>("[data-settings-form] [aria-invalid=true]");
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const save = () => {
    const parsed = settingsSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(settingsErrors(parsed.error));
      toast.error(S.fixErrors);
      focusFirstError();
      return;
    }
    startTransition(async () => {
      const res = await saveStoreSettings(values, version);
      if (res.ok) {
        setBaseline(values);
        setVersion(res.updatedAt);
        setErrors({});
        toast.success(S.saved);
      } else {
        if (res.fields) {
          setErrors(res.fields);
          focusFirstError();
        }
        toast.error(errorText(S.error, res.error));
      }
    });
  };

  /* ── Field helpers ──────────────────────────────────────── */

  function Text({
    label,
    path,
    hint,
    type = "text",
    dir,
    placeholder,
    inputMode,
    className,
  }: {
    label: string;
    path: Path;
    hint?: string;
    type?: string;
    dir?: "ltr" | "rtl";
    placeholder?: string;
    inputMode?: "numeric" | "decimal" | "tel" | "email" | "url";
    className?: string;
  }) {
    return (
      <FieldRow label={label} hint={hint} error={err(path)} className={className}>
        {(id, describedBy) => (
          <input
            id={id}
            type={type}
            dir={dir}
            inputMode={inputMode}
            placeholder={placeholder}
            value={String(getAt(values, path) ?? "")}
            onChange={(e) => set(path, e.target.value)}
            aria-invalid={err(path) ? true : undefined}
            aria-describedby={describedBy}
            className={inputClass}
          />
        )}
      </FieldRow>
    );
  }

  function NumberField({ label, path, hint, step = 1, suffix, className }: { label: string; path: Path; hint?: string; step?: number; suffix?: string; className?: string }) {
    const v = getAt(values, path) as number;
    return (
      <FieldRow label={label} hint={hint} error={err(path)} className={className}>
        {(id, describedBy) => (
          <div className="relative">
            <input
              id={id}
              type="number"
              inputMode={step < 1 ? "decimal" : "numeric"}
              min={0}
              step={step}
              dir="ltr"
              value={Number.isFinite(v) ? v : ""}
              onChange={(e) => set(path, e.target.value === "" ? Number.NaN : Number(e.target.value))}
              aria-invalid={err(path) ? true : undefined}
              aria-describedby={describedBy}
              className={cn(inputClass, "tabular-nums", suffix && "pe-14")}
            />
            {suffix ? (
              <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[0.75rem] text-text-muted">
                {suffix}
              </span>
            ) : null}
          </div>
        )}
      </FieldRow>
    );
  }

  /* ── Sections ───────────────────────────────────────────── */

  const announcements = values.announcement;
  const hero = values.home.hero;
  const heroOk = hero.image !== "" && isHeroImage(hero.image);
  const heroLocal = locale === "ar" ? "ar" : "en";
  const currency = locale === "ar" ? "ج.م" : "EGP";

  return (
    <div data-settings-form className="grid grid-cols-1 gap-8 xl:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label={S.title} className="hidden xl:block">
        <ul className="sticky top-0 space-y-0.5 text-[0.8125rem]">
          {SECTIONS.map((s) => (
            <li key={s}>
              <a href={`#settings-${s}`} className="block rounded-[3px] px-3 py-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary">
                {S.sections[s]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!readOnly) save();
        }}
        noValidate
        className="min-w-0"
      >
        <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-6 border-0 p-0">
          {/* Announcement */}
          <Panel id="settings-announcement" title={S.sections.announcement} description={S.announcement.desc} className="scroll-mt-6">
            {announcements.length === 0 ? <p className="mb-4 text-[0.8125rem] text-text-muted">{S.announcement.empty}</p> : null}
            <ol className="space-y-4">
              {announcements.map((_, i) => (
                <li key={i} className="rounded-[3px] border border-border p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[0.75rem] font-medium text-text-muted">{fill(S.announcement.message, { n: i + 1 })}</span>
                    {!readOnly ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={adminButton("ghost", "icon")}
                          aria-label={fill(S.announcement.up, { n: i + 1 })}
                          disabled={i === 0}
                          onClick={() => {
                            const next = [...announcements];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            set(["announcement"], next);
                          }}
                        >
                          <ArrowUp aria-hidden="true" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className={adminButton("ghost", "icon")}
                          aria-label={fill(S.announcement.down, { n: i + 1 })}
                          disabled={i === announcements.length - 1}
                          onClick={() => {
                            const next = [...announcements];
                            [next[i + 1], next[i]] = [next[i], next[i + 1]];
                            set(["announcement"], next);
                          }}
                        >
                          <ArrowDown aria-hidden="true" strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          className={adminButton("ghost", "icon")}
                          aria-label={fill(S.announcement.remove, { n: i + 1 })}
                          onClick={() => set(["announcement"], announcements.filter((__, j) => j !== i))}
                        >
                          <Trash2 aria-hidden="true" strokeWidth={1.75} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {Text({ label: S.announcement.english, path: ["announcement", i, "en"], dir: "ltr" })}
                    {Text({ label: S.announcement.arabic, path: ["announcement", i, "ar"], dir: "rtl" })}
                  </div>
                </li>
              ))}
            </ol>
            {!readOnly ? (
              <button
                type="button"
                className={adminButton("outline", "sm", "mt-4")}
                disabled={announcements.length >= MAX_ANNOUNCEMENTS}
                onClick={() => set(["announcement"], [...announcements, { en: "", ar: "" }])}
              >
                <Plus aria-hidden="true" strokeWidth={1.75} />
                {S.announcement.add}
              </button>
            ) : null}
            {err(["announcement"]) ? <p className="mt-2 text-[0.75rem] text-destructive">{err(["announcement"])}</p> : null}
          </Panel>

          {/* Contact */}
          <Panel id="settings-contact" title={S.sections.contact} description={S.contact.desc} className="scroll-mt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Text({ label: S.contact.email, path: ["contact", "email"], type: "email", dir: "ltr", inputMode: "email" })}
              {Text({ label: S.contact.phone, path: ["contact", "phone"], type: "tel", dir: "ltr", inputMode: "tel" })}
              {Text({ label: S.contact.whatsapp, path: ["contact", "whatsapp"], type: "tel", dir: "ltr", inputMode: "tel", hint: S.contact.whatsappHint })}
              <div className="hidden md:block" />
              {Text({ label: S.contact.addressEn, path: ["contact", "address", "en"], dir: "ltr" })}
              {Text({ label: S.contact.addressAr, path: ["contact", "address", "ar"], dir: "rtl" })}
              {Text({ label: S.contact.hoursEn, path: ["contact", "hours", "en"], dir: "ltr" })}
              {Text({ label: S.contact.hoursAr, path: ["contact", "hours", "ar"], dir: "rtl" })}
            </div>
          </Panel>

          {/* Social */}
          <Panel id="settings-social" title={S.sections.social} description={S.social.desc} className="scroll-mt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(["instagram", "facebook", "tiktok", "x"] as const).map((k) => (
                <Fragment key={k}>{Text({ label: S.social[k], path: ["social", k], type: "url", dir: "ltr", inputMode: "url", placeholder: "https://" })}</Fragment>
              ))}
            </div>
          </Panel>

          {/* Shipping */}
          <Panel id="settings-shipping" title={S.sections.shipping} description={S.shipping.desc} className="scroll-mt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {NumberField({ label: S.shipping.defaultFee, path: ["shipping", "defaultFee"], hint: S.shipping.defaultFeeHint, suffix: currency })}
              {NumberField({ label: S.shipping.freeThreshold, path: ["shipping", "freeThreshold"], hint: S.shipping.freeThresholdHint, suffix: currency })}
              {NumberField({ label: S.shipping.etaMin, path: ["shipping", "etaDays", "min"] })}
              {NumberField({ label: S.shipping.etaMax, path: ["shipping", "etaDays", "max"] })}
            </div>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
              <h3 className="text-[0.8125rem] font-medium text-text-primary">{S.shipping.zones}</h3>
              {!readOnly ? (
                <button
                  type="button"
                  className={adminButton("ghost", "sm", "-me-2")}
                  onClick={() => {
                    const fee = values.shipping.defaultFee;
                    if (!Number.isFinite(fee)) return;
                    set(["shipping", "zones"], Object.fromEntries(GOVERNORATE_KEYS.map((k) => [k, fee])));
                  }}
                >
                  {S.shipping.applyDefault}
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-8 border-t border-border sm:grid-cols-2 xl:grid-cols-3" role="group" aria-label={S.shipping.zones}>
              {GOVERNORATES.map((g) => {
                const path = ["shipping", "zones", g.value];
                const v = getAt(values, path) as number;
                const name = locale === "ar" ? g.ar : g.en;
                const e = err(path);
                const inputId = `zone-${g.value}`;
                return (
                  <div key={g.value} className="flex items-center justify-between gap-3 border-b border-border py-2">
                    <label htmlFor={inputId} className="min-w-0 truncate text-[0.8125rem] text-text-secondary">
                      {name}
                      <span className="sr-only"> · {S.shipping.fee}</span>
                    </label>
                    <div className="relative w-32 shrink-0">
                      <input
                        id={inputId}
                        type="number"
                        min={0}
                        step={1}
                        dir="ltr"
                        inputMode="numeric"
                        value={Number.isFinite(v) ? v : ""}
                        onChange={(ev) => set(path, ev.target.value === "" ? Number.NaN : Number(ev.target.value))}
                        aria-invalid={e ? true : undefined}
                        title={e}
                        className={cn(inputClass, "h-9 pe-12 text-end tabular-nums")}
                      />
                      <span aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-text-muted">
                        {currency}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Payments */}
          <Panel id="settings-payments" title={S.sections.payments} description={S.payments.desc} className="scroll-mt-6" padded={false}>
            <ul className="divide-y divide-border">
              {(["cod", "card", "wallet"] as const).map((m) => {
                const status = m === "cod" ? null : paymob[m];
                return (
                  <li key={m} className="px-4 py-4 sm:px-5">
                    <Switch
                      checked={values.payments[m]}
                      onChange={(c) => set(["payments", m], c)}
                      label={S.payments[m]}
                      description={S.payments[`${m}Desc` as "codDesc"]}
                    />
                    {status ? (
                      <p
                        className={cn(
                          "ms-14 mt-2 text-[0.75rem]",
                          status === "configured" && "text-success",
                          status === "test" && "text-text-muted",
                          status === "missing" && "text-warning",
                        )}
                      >
                        {status === "configured" ? S.payments.configured : status === "test" ? S.payments.testMode : S.payments.missing}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {err(["payments"]) ? <p className="px-5 pb-4 text-[0.75rem] text-destructive">{err(["payments"])}</p> : null}
          </Panel>

          {/* Policies */}
          <Panel id="settings-policies" title={S.sections.policies} description={S.policies.desc} className="scroll-mt-6">
            <div className="max-w-xs">{NumberField({ label: S.policies.returnDays, path: ["policies", "returnDays"] })}</div>
          </Panel>

          {/* Home hero */}
          <Panel id="settings-home" title={S.sections.home} description={S.home.desc} className="scroll-mt-6">
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Text({ label: S.home.image, path: ["home", "hero", "image"], dir: "ltr", hint: S.home.imageHint, className: "md:col-span-2", placeholder: "https://" })}
                {Text({ label: S.home.titleEn, path: ["home", "hero", "title", "en"], dir: "ltr" })}
                {Text({ label: S.home.titleAr, path: ["home", "hero", "title", "ar"], dir: "rtl" })}
                {Text({ label: S.home.subtitleEn, path: ["home", "hero", "subtitle", "en"], dir: "ltr" })}
                {Text({ label: S.home.subtitleAr, path: ["home", "hero", "subtitle", "ar"], dir: "rtl" })}
                {Text({ label: S.home.ctaEn, path: ["home", "hero", "ctaLabel", "en"], dir: "ltr" })}
                {Text({ label: S.home.ctaAr, path: ["home", "hero", "ctaLabel", "ar"], dir: "rtl" })}
                {Text({ label: S.home.ctaHref, path: ["home", "hero", "ctaHref"], dir: "ltr", hint: S.home.ctaHrefHint, className: "md:col-span-2" })}
              </div>
              <div>
                <p className="mb-1.5 text-[0.8125rem] text-text-secondary">{S.home.preview}</p>
                <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] border border-border bg-surface">
                  {heroOk ? (
                    <>
                      <Image src={hero.image} alt="" fill unoptimized sizes="(min-width: 1536px) 26rem, 100vw" className="object-cover" />
                      <div className="absolute inset-0 bg-black/30" />
                      <div lang={heroLocal} dir={heroLocal === "ar" ? "rtl" : "ltr"} className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <p className="font-display text-[1.75rem] leading-[1.05] [&:lang(ar)]:font-sans [&:lang(ar)]:text-[1.375rem] [&:lang(ar)]:font-semibold">
                          {hero.title[heroLocal] || "—"}
                        </p>
                        {hero.subtitle[heroLocal] ? <p className="mt-2 text-[0.8125rem] text-white/85">{hero.subtitle[heroLocal]}</p> : null}
                        {hero.ctaLabel[heroLocal] ? (
                          <span className="mt-4 inline-flex h-9 items-center rounded-[2px] bg-white px-4 text-[0.8125rem] font-medium text-[#161513]">
                            {hero.ctaLabel[heroLocal]}
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="absolute inset-0 grid place-items-center p-6 text-center text-[0.8125rem] text-text-muted">{S.home.previewEmpty}</p>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          {/* Inventory */}
          <Panel id="settings-inventory" title={S.sections.inventory} description={S.inventory.desc} className="scroll-mt-6">
            <div className="max-w-md">{NumberField({ label: S.inventory.lowStock, path: ["inventory", "lowStockThreshold"], hint: S.inventory.lowStockHint })}</div>
          </Panel>
        </fieldset>

        {/* Save bar */}
        {!readOnly && dirty ? (
          <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-border bg-surface-elevated px-4 py-3 shadow-[var(--shadow-float)]">
            <p role="status" className="flex items-center gap-2 text-[0.8125rem] text-text-primary">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
              {S.unsaved}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={adminButton("ghost", "sm")}
                disabled={pending}
                onClick={() => {
                  setValues(baseline);
                  setErrors({});
                }}
              >
                {S.discard}
              </button>
              <button type="submit" className={adminButton("primary", "sm")} disabled={pending} aria-busy={pending || undefined}>
                {pending ? <Spinner /> : null}
                {S.save}
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  );
}

/* ── Small pieces ──────────────────────────────────────────── */

function FieldRow({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[0.8125rem] text-text-secondary">
        {label}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-error`} className="text-[0.75rem] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.75rem] text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-4">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60",
          checked ? "border-text-primary bg-text-primary" : "border-border-hover bg-surface-inset",
        )}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 size-[18px] -translate-y-1/2 rounded-full bg-background transition-[inset-inline-start] duration-150",
            checked ? "start-[19px]" : "start-[2px]",
          )}
        />
      </button>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[0.875rem] text-text-primary">{label}</span>
        {description ? (
          <span id={`${id}-desc`} className="block text-[0.8125rem] text-text-muted">
            {description}
          </span>
        ) : null}
      </label>
    </div>
  );
}
