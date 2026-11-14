"use client";

/* Contact: email + Egyptian mobile. Validates on blur and on "Continue"; focus goes to the first error. */

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Button, Input } from "@/components/ds";
import type { ContactInfo } from "@/lib/store/useCheckoutStore";
import { contactSchema, fieldErrors, normalizeEgyptianMobile, type Lang } from "./checkout-rules";
import { checkoutCopy } from "./copy";

interface ContactSectionProps {
  locale: string;
  initial: ContactInfo;
  /** Error from the server (e.g. "invalid_phone") to show on a field. */
  serverErrors?: Partial<Record<keyof ContactInfo, string>>;
  onDone: (contact: ContactInfo) => void;
}

const schemaFor = (lang: Lang) => contactSchema(lang).pick({ email: true, phone: true });

export function ContactSection({ locale, initial, serverErrors, onDone }: ContactSectionProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = checkoutCopy(lang);
  const schema = useMemo(() => schemaFor(lang), [lang]);
  const [values, setValues] = useState<ContactInfo>(initial);
  const [errors, setErrors] = useState<Record<string, string>>(() => ({ ...serverErrors }));
  const formRef = useRef<HTMLFormElement>(null);

  const validateField = (name: keyof ContactInfo, next: ContactInfo) => {
    const r = schema.safeParse(next);
    const all = r.success ? {} : fieldErrors(r.error.issues);
    setErrors((e) => ({ ...e, [name]: all[name] ?? "" }));
  };

  const set = (name: keyof ContactInfo) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...values, [name]: e.target.value };
    setValues(next);
    if (errors[name]) validateField(name, next);
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(values);
    if (!r.success) {
      const all = fieldErrors(r.error.issues);
      setErrors(all);
      const first = Object.keys(all)[0];
      formRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    onDone({ email: r.data.email.trim(), phone: normalizeEgyptianMobile(r.data.phone) ?? r.data.phone });
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-5">
      <p className="-mt-2 text-sm text-text-secondary">{t.contactHint}</p>
      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id="checkout-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          label={t.email}
          placeholder={t.emailPlaceholder}
          value={values.email}
          onChange={set("email")}
          onBlur={() => values.email && validateField("email", values)}
          error={errors.email || undefined}
          className="text-start rtl:text-end"
          required
        />
        <Input
          id="checkout-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          dir="ltr"
          label={t.mobile}
          placeholder={t.mobilePlaceholder}
          value={values.phone}
          onChange={set("phone")}
          onBlur={() => values.phone && validateField("phone", values)}
          error={errors.phone || undefined}
          hint={t.mobileHint}
          className="text-start rtl:text-end"
          maxLength={20}
          required
        />
      </div>
      <div>
        <Button type="submit" size="lg" className="w-full md:w-auto md:min-w-48">
          {t.continue}
        </Button>
      </div>
    </form>
  );
}
