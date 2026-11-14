"use client";

/* Promo code: "Add a promo code" opens a small form; an applied code shows with "Remove". */

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Tag, X } from "lucide-react";
import { Button, controlClasses } from "@/components/ds";
import { cn } from "@/lib/utils";
import { formatMoney, type Lang } from "./checkout-rules";
import { checkoutCopy } from "./copy";
import { textLink } from "./ui";

interface PromoCodeFieldProps {
  locale: string;
  appliedCode: string | null;
  discount: number;
  /** Server message about a code that stopped applying (cart changed, used up…). */
  notice: string | null;
  onApply: (code: string) => Promise<string | null>;
  onRemove: () => void;
  disabled?: boolean;
  idPrefix: string;
}

export function PromoCodeField({ locale, appliedCode, discount, notice, onApply, onRemove, disabled, idPrefix }: PromoCodeFieldProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = checkoutCopy(lang);
  const auto = useId();
  const inputId = `${idPrefix}-promo-${auto}`;
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Opening the form (a deliberate click) moves focus into the field.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const problem = await onApply(value);
      if (problem) setError(problem);
      else {
        setCode("");
        setOpen(false);
      }
    } finally {
      setBusy(false);
    }
  }

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-3 border border-border px-3 py-2.5 rounded-sm">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <Tag className="size-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
          <span className="truncate font-medium tracking-wide text-text-primary" dir="ltr">
            {appliedCode}
          </span>
          {discount > 0 ? <span className="t-price text-accent">−{formatMoney(discount, lang)}</span> : null}
          <span className="sr-only">{t.promoApplied(appliedCode)}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="inline-flex min-h-10 items-center gap-1 text-[0.8125rem] text-text-secondary hover:text-text-primary disabled:opacity-45"
        >
          <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          {t.remove}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {notice ? (
        <p role="status" className="text-[0.8125rem] text-warning">
          {notice}
        </p>
      ) : null}
      {open ? (
        <form onSubmit={submit} className="flex flex-col gap-1.5" noValidate>
          <label htmlFor={inputId} className="text-[0.8125rem] text-text-secondary">
            {t.promo}
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={40}
              dir="ltr"
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className={cn(controlClasses, "h-11 min-w-0 flex-1 uppercase tracking-wide placeholder:normal-case")}
              placeholder="SUMMER10"
              ref={inputRef}
            />
            <Button type="submit" variant="secondary" loading={busy} disabled={disabled || !code.trim()}>
              {t.apply}
            </Button>
          </div>
          {error ? (
            <p id={`${inputId}-error`} role="alert" className="text-[0.8125rem] text-destructive">
              {error}
            </p>
          ) : null}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={cn("self-start min-h-10 text-sm text-text-primary disabled:opacity-45", textLink)}
        >
          {t.addPromo}
        </button>
      )}
    </div>
  );
}
