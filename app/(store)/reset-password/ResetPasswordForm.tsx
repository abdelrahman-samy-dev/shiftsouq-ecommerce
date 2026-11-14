"use client";

/* New password from a reset link (the link signed this browser in); then the account opens. */

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ds";
import { resetPasswordAction } from "@/lib/actions/auth";
import { createNewPasswordSchema, type NewPasswordInput } from "@/lib/validations/profile";
import type { ValidationMessages } from "@/lib/validations/messages";
import { fieldErrors } from "@/components/checkout/checkout-rules";
import { noticeTone } from "@/components/checkout/ui";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/app/(store)/account/_components/PasswordInput";
import { authCopy } from "@/app/(store)/(auth)/_components/copy";

export function ResetPasswordForm({ locale, messages, email }: { locale: string; messages: ValidationMessages; email: string }) {
  const t = authCopy(locale);
  const schema = useMemo(() => createNewPasswordSchema(messages), [messages]);
  const [values, setValues] = useState<NewPasswordInput>({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    const res = await resetPasswordAction(r.data);
    if (res?.error) {
      setBusy(false);
      if (res.field) setErrors({ [res.field]: res.error });
      else setServerError(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="t-h1">{t.resetTitle}</h1>
        <p className="text-text-secondary">{t.resetIntro}</p>
        {email ? (
          <p className="text-sm text-text-muted" dir="ltr">
            <span className="block text-start rtl:text-end">{email}</span>
          </p>
        ) : null}
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {/* Lets password managers save the new password for the right account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        {serverError ? (
          <p role="alert" className={cn("border px-4 py-3 text-sm rounded-sm", noticeTone.danger)}>
            {serverError}
          </p>
        ) : null}
        <PasswordInput
          id="reset-new"
          name="newPassword"
          autoComplete="new-password"
          label={t.newPassword}
          hint={t.passwordHint}
          value={values.newPassword}
          onChange={(e) => setValues({ ...values, newPassword: e.target.value })}
          error={errors.newPassword || undefined}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          maxLength={72}
          required
        />
        <PasswordInput
          id="reset-confirm"
          name="confirmPassword"
          autoComplete="new-password"
          label={t.confirmPassword}
          value={values.confirmPassword}
          onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })}
          error={errors.confirmPassword || undefined}
          showLabel={t.showPassword}
          hideLabel={t.hidePassword}
          maxLength={72}
          required
        />
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {t.savePassword}
        </Button>
      </form>
    </div>
  );
}
