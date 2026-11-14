"use client";

/* Editor field helpers: tags as chips, slug with availability check, money input. */

import { useEffect, useId, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { controlClasses, FieldShell } from "@/components/ds";
import { checkSlug } from "@/lib/actions/admin-catalog";
import { isValidSlug, MAX_TAGS, normalizeTags } from "@/lib/admin/catalog-utils";
import { cn } from "@/lib/utils";

/* ── Tags ─────────────────────────────────────────────────────── */

export function TagInput({
  value,
  onChange,
  label,
  hint,
  placeholder,
  removeLabel,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  label: string;
  hint: string;
  placeholder: string;
  removeLabel: (tag: string) => string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const commit = (text: string) => {
    const parts = text.split(/[,،\n]/);
    const next = normalizeTags([...value, ...parts]);
    onChange(next);
    setDraft("");
  };
  return (
    <FieldShell id={id} label={label} hint={hint}>
      <div
        className={cn(
          controlClasses,
          "flex h-auto min-h-12 flex-wrap items-center gap-1.5 px-2 py-2 focus-within:border-text-primary",
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex h-8 items-center gap-1 rounded-[2px] bg-surface ps-2.5 pe-1 text-[0.8125rem] text-text-primary">
            {tag}
            <button
              type="button"
              aria-label={removeLabel(tag)}
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="inline-flex size-6 items-center justify-center rounded-[2px] text-text-muted hover:bg-surface-inset hover:text-text-primary"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS ? (
          <input
            id={id}
            value={draft}
            aria-describedby={`${id}-hint`}
            placeholder={value.length ? "" : placeholder}
            onChange={(e) => {
              const v = e.target.value;
              if (/[,،]/.test(v)) commit(v);
              else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (draft.trim()) commit(draft);
              } else if (e.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={() => draft.trim() && commit(draft)}
            className="h-8 min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-text-faint"
          />
        ) : null}
      </div>
    </FieldShell>
  );
}

/* ── Slug ─────────────────────────────────────────────────────── */

type SlugStatus = "idle" | "checking" | "free" | "taken";

export function SlugField({
  kind,
  value,
  edited,
  exceptId,
  onChange,
  prefix,
  labels,
  error,
}: {
  kind: "product" | "category" | "collection";
  value: string;
  edited: boolean;
  exceptId: string | null;
  onChange: (slug: string, edited: boolean) => void;
  prefix: string;
  labels: { label: string; hint: string; auto: string; taken: string; free: string; checking: string; invalid: string; useSuggestion: (s: string) => string };
  error?: string | null;
}) {
  const id = useId();
  const [status, setStatus] = useState<{ slug: string; state: SlugStatus; suggestion: string | null }>({ slug: "", state: "idle", suggestion: null });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!isValidSlug(value)) return;
    timer.current = setTimeout(async () => {
      setStatus({ slug: value, state: "checking", suggestion: null });
      const res = await checkSlug(kind, value, exceptId);
      if (res.ok) setStatus({ slug: value, state: res.available ? "free" : "taken", suggestion: res.suggestion });
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, kind, exceptId]);

  const current = status.slug === value ? status : { state: "idle" as SlugStatus, suggestion: null };
  const invalid = value.length > 0 && !isValidSlug(value);
  const message = error ?? (invalid ? labels.invalid : current.state === "taken" ? labels.taken : null);

  const field = (
    <FieldShell id={id} label={labels.label} error={message} hint={labels.hint}>
      <div
        className={cn(controlClasses, "flex items-center gap-0 px-0 focus-within:border-text-primary", message && "border-destructive")}
        dir="ltr"
      >
        <span className="hidden shrink-0 ps-4 text-sm text-text-faint sm:inline">{prefix}</span>
        <input
          id={id}
          value={value}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-error` : `${id}-hint`}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, "-"), true)}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-text-primary outline-none sm:ps-0.5"
        />
        <span className="shrink-0 pe-4 text-[0.75rem]" aria-live="polite">
          {current.state === "checking" ? (
            <span className="text-text-muted">{labels.checking}</span>
          ) : current.state === "free" ? (
            <span className="text-success">{labels.free}</span>
          ) : !edited && value ? (
            <span className="text-text-faint">{labels.auto}</span>
          ) : null}
        </span>
      </div>
    </FieldShell>
  );
  if (current.state !== "taken" || !current.suggestion) return field;
  const suggestion = current.suggestion;
  return (
    <div className="flex flex-col gap-1.5">
      {field}
      <button type="button" onClick={() => onChange(suggestion, true)} className="self-start text-[0.8125rem] text-text-primary underline underline-offset-4">
        {labels.useSuggestion(suggestion)}
      </button>
    </div>
  );
}

/* ── Money ────────────────────────────────────────────────────── */

type MoneyProps = Omit<ComponentPropsWithoutRef<"input">, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  currency: string;
  hint?: string;
  error?: string | null;
};

export function MoneyInput({ label, value, onChange, currency, hint, error, className, ...props }: MoneyProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative" dir="ltr">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          className={cn(controlClasses, "pe-14 tabular-nums", className)}
          {...props}
        />
        <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[0.8125rem] text-text-muted">{currency}</span>
      </div>
    </FieldShell>
  );
}
