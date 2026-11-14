"use client";

/* Change password: current password (checked by the server), then the new one twice (8+ characters). */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ds";
import { changePassword } from "@/lib/actions/profile";
import { createPasswordChangeSchema, type PasswordChangeInput } from "@/lib/validations/profile";
import type { ValidationMessages } from "@/lib/validations/messages";
import { fieldErrors } from "@/components/checkout/checkout-rules";
import { PasswordInput } from "../_components/PasswordInput";
import { accountCopy } from "../_components/copy";

const EMPTY: PasswordChangeInput = { currentPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordForm({ locale, messages }: { locale: string; messages: ValidationMessages }) {
  const t = accountCopy(locale);
  const schema = useMemo(() => createPasswordChangeSchema(messages), [messages]);
  const [values, setValues] = useState<PasswordChangeInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (name: keyof PasswordChangeInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    if (errors[name]) setErrors((x) => ({ ...x, [name]: "" }));
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setFormError(null);
    const r = schema.safeParse(values);
    if (!r.success) {
      const all = fieldErrors(r.error.issues);
      setErrors(all);
      form.querySelector<HTMLElement>(`[name="${Object.keys(all)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await changePassword(r.data);
      if (res.success) {
        toast.success(res.message);
        setValues(EMPTY);
        setErrors({});
      } else if (res.field) {
        setErrors({ [res.field]: res.message });
        form.querySelector<HTMLElement>(`[name="${res.field}"]`)?.focus();
      } else setFormError(res.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-md flex-col gap-5">
      <PasswordInput
        id="security-current"
        name="currentPassword"
        autoComplete="current-password"
        label={t.currentPassword}
        value={values.currentPassword}
        onChange={set("currentPassword")}
        error={errors.currentPassword || undefined}
        showLabel={t.showPassword}
        hideLabel={t.hidePassword}
        maxLength={72}
        required
      />
      <PasswordInput
        id="security-new"
        name="newPassword"
        autoComplete="new-password"
        label={t.newPassword}
        hint={t.newPasswordHint}
        value={values.newPassword}
        onChange={set("newPassword")}
        error={errors.newPassword || undefined}
        showLabel={t.showPassword}
        hideLabel={t.hidePassword}
        maxLength={72}
        required
      />
      <PasswordInput
        id="security-confirm"
        name="confirmPassword"
        autoComplete="new-password"
        label={t.confirmPassword}
        value={values.confirmPassword}
        onChange={set("confirmPassword")}
        error={errors.confirmPassword || undefined}
        showLabel={t.showPassword}
        hideLabel={t.hidePassword}
        maxLength={72}
        required
      />
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-6 pt-2">
        <Button type="submit" size="lg" loading={busy}>
          {t.updatePassword}
        </Button>
        <Link href="/forgot-password" className="text-sm text-text-secondary underline underline-offset-4 decoration-border-hover hover:text-text-primary">
          {t.forgot}
        </Link>
      </div>
    </form>
  );
}
