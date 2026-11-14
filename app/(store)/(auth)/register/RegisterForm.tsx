"use client";

/* Create an account: first and last name, email, password (8+). Returns to ?redirect= or the account. */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ds";
import { registerAction } from "@/lib/actions/auth";
import { createRegisterSchema, type RegisterInput } from "@/lib/validations/auth";
import type { ValidationMessages } from "@/lib/validations/messages";
import { fieldErrors } from "@/components/checkout/checkout-rules";
import { noticeTone, textLink } from "@/components/checkout/ui";
import { PasswordInput } from "@/app/(store)/account/_components/PasswordInput";
import { cn } from "@/lib/utils";
import { authCopy } from "../_components/copy";

interface RegisterFormProps {
  locale: string;
  messages: ValidationMessages;
  redirectTo?: string;
  /** Email of the order just placed in this browser (guest receipt → "Create account"). */
  initialEmail?: string;
}

export default function RegisterForm({ locale, messages, redirectTo, initialEmail = "" }: RegisterFormProps) {
  const t = authCopy(locale);
  const schema = useMemo(() => createRegisterSchema(messages), [messages]);
  const [values, setValues] = useState<RegisterInput>({ firstName: "", lastName: "", email: initialEmail, password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const withRedirect = (path: string) => (redirectTo ? `${path}?redirect=${encodeURIComponent(redirectTo)}` : path);

  const set = (name: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    if (errors[name]) setErrors((x) => ({ ...x, [name]: "" }));
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setServerError(null);
    const r = schema.safeParse(values);
    if (!r.success) {
      const all = fieldErrors(r.error.issues);
      setErrors(all);
      form.querySelector<HTMLElement>(`[name="${Object.keys(all)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    // Success with a session redirects on the server; otherwise an error or "check your inbox" comes back.
    const res = await registerAction(r.data, redirectTo);
    setBusy(false);
    if (res?.error) setServerError(res.error);
    else if (res?.confirmEmail) setConfirmFor(r.data.email);
  }

  if (confirmFor) {
    return (
      <div className="flex flex-col gap-6" role="status">
        <h1 className="t-h1">{t.checkInbox}</h1>
        <p className="text-text-secondary">{t.checkInboxBody(confirmFor)}</p>
        <Link href={withRedirect("/login")} className={cn("self-start text-sm text-text-primary", textLink)}>
          {t.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="t-h1">{t.registerTitle}</h1>
        <p className="text-text-secondary">{t.registerIntro}</p>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {serverError ? (
          <p role="alert" className={cn("border px-4 py-3 text-sm rounded-sm", noticeTone.danger)}>
            {serverError}
          </p>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <Input id="reg-firstName" name="firstName" className="[unicode-bidi:plaintext]" autoComplete="given-name" label={t.firstName} value={values.firstName} onChange={set("firstName")} error={errors.firstName || undefined} maxLength={60} required />
          <Input id="reg-lastName" name="lastName" className="[unicode-bidi:plaintext]" autoComplete="family-name" label={t.lastName} value={values.lastName} onChange={set("lastName")} error={errors.lastName || undefined} maxLength={60} required />
        </div>
        <Input
          id="reg-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          className="text-start rtl:text-end"
          label={t.email}
          value={values.email}
          onChange={set("email")}
          error={errors.email || undefined}
          maxLength={254}
          required
        />
        <PasswordInput
          id="reg-password"
          name="password"
          autoComplete="new-password"
          label={t.password}
          hint={t.passwordHint}
          value={values.password}
          onChange={set("password")}
          error={errors.password || undefined}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          maxLength={72}
          required
        />
        <Button type="submit" size="lg" fullWidth loading={busy} className="mt-1">
          {t.create}
        </Button>
        <p className="text-[0.8125rem] text-text-muted">
          {t.agree}{" "}
          <Link href="/terms" className={textLink}>
            {t.terms}
          </Link>
          {t.and}
          <Link href="/privacy-policy" className={textLink}>
            {t.privacy}
          </Link>
          .
        </p>
      </form>

      <p className="border-t border-border pt-6 text-sm text-text-secondary">
        {t.haveAccount}{" "}
        <Link href={withRedirect("/login")} className={cn("text-text-primary", textLink)}>
          {t.signIn}
        </Link>
      </p>
    </div>
  );
}
