"use client";

/* Sign in: email + password. Returns to ?redirect= (same-site only, checked on the server) or the account. */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ds";
import { loginAction } from "@/lib/actions/auth";
import { createLoginSchema } from "@/lib/validations/auth";
import type { ValidationMessages } from "@/lib/validations/messages";
import { fieldErrors } from "@/components/checkout/checkout-rules";
import { noticeTone, textLink } from "@/components/checkout/ui";
import { PasswordInput } from "@/app/(store)/account/_components/PasswordInput";
import { cn } from "@/lib/utils";
import { authCopy } from "../_components/copy";

interface LoginFormProps {
  locale: string;
  messages: ValidationMessages;
  redirectTo?: string;
  linkExpired?: boolean;
}

export default function LoginForm({ locale, messages, redirectTo, linkExpired }: LoginFormProps) {
  const t = authCopy(locale);
  const schema = useMemo(() => createLoginSchema(messages), [messages]);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const withRedirect = (path: string) => (redirectTo ? `${path}?redirect=${encodeURIComponent(redirectTo)}` : path);

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
    // Success redirects on the server (the page changes); only failures come back.
    const res = await loginAction(r.data, redirectTo);
    if (res?.error) {
      setServerError(res.error);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="t-h1">{t.signInTitle}</h1>
        <p className="text-text-secondary">{t.signInIntro}</p>
      </div>

      {linkExpired ? (
        <p role="status" className={cn("border px-4 py-3 text-sm rounded-sm", noticeTone.warning)}>
          {t.linkExpired}
        </p>
      ) : null}

      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {serverError ? (
          <p role="alert" className={cn("border px-4 py-3 text-sm rounded-sm", noticeTone.danger)}>
            {serverError}
          </p>
        ) : null}
        <Input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          className="text-start rtl:text-end"
          label={t.email}
          value={values.email}
          onChange={(e) => {
            setValues({ ...values, email: e.target.value });
            if (errors.email) setErrors({ ...errors, email: "" });
          }}
          error={errors.email || undefined}
          maxLength={254}
          required
        />
        <PasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          label={t.password}
          value={values.password}
          onChange={(e) => {
            setValues({ ...values, password: e.target.value });
            if (errors.password) setErrors({ ...errors, password: "" });
          }}
          error={errors.password || undefined}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          maxLength={72}
          required
        />
        <div className="-mt-1 flex justify-end">
          <Link href="/forgot-password" className={cn("min-h-10 text-sm text-text-secondary hover:text-text-primary", textLink)}>
            {t.forgot}
          </Link>
        </div>
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {t.signIn}
        </Button>
      </form>

      <p className="border-t border-border pt-6 text-sm text-text-secondary">
        {t.newHere}{" "}
        <Link href={withRedirect("/register")} className={cn("text-text-primary", textLink)}>
          {t.createAccount}
        </Link>
      </p>
    </div>
  );
}
