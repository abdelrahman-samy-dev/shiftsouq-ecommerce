"use client";

/* Profile: full name and Egyptian mobile (editable), sign-in email (shown). */

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Input } from "@/components/ds";
import { updateProfile } from "@/lib/actions/profile";
import { createProfileSchema } from "@/lib/validations/profile";
import type { ValidationMessages } from "@/lib/validations/messages";
import { fieldErrors } from "@/components/checkout/checkout-rules";
import { accountCopy } from "@/app/account/_components/copy";

interface ProfileFormProps {
  locale: string;
  messages: ValidationMessages;
  phoneMessage: string;
  initial: { fullName: string; phone: string; email: string };
}

export default function ProfileForm({ locale, messages, phoneMessage, initial }: ProfileFormProps) {
  const t = accountCopy(locale);
  const schema = useMemo(() => createProfileSchema(messages, phoneMessage).pick({ full_name: true, phone: true }), [messages, phoneMessage]);
  const [values, setValues] = useState({ full_name: initial.fullName, phone: initial.phone });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const dirty = values.full_name !== initial.fullName || values.phone !== initial.phone;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const r = schema.safeParse(values);
    if (!r.success) {
      const all = fieldErrors(r.error.issues);
      setErrors(all);
      form.querySelector<HTMLElement>(`[name="${Object.keys(all)[0]}"]`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await updateProfile(r.data);
      if (res.success) {
        toast.success(res.message);
        setErrors({});
      } else if (res.field) setErrors({ [res.field]: res.message });
      else toast.error(res.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-xl flex-col gap-5">
      <Input
        id="profile-name"
        name="full_name"
        className="[unicode-bidi:plaintext]"
        autoComplete="name"
        label={t.name}
        value={values.full_name}
        onChange={(e) => setValues({ ...values, full_name: e.target.value })}
        error={errors.full_name || undefined}
        maxLength={100}
      />
      <Input
        id="profile-phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        dir="ltr"
        className="text-start rtl:text-end"
        label={t.mobile}
        hint={t.mobileHint}
        placeholder="01X XXXX XXXX"
        value={values.phone}
        onChange={(e) => setValues({ ...values, phone: e.target.value })}
        error={errors.phone || undefined}
        maxLength={20}
      />
      <Input
        id="profile-email"
        type="email"
        dir="ltr"
        className="text-start text-text-secondary rtl:text-end"
        label={t.email}
        hint={t.emailNote}
        value={initial.email}
        readOnly
      />
      <div className="pt-2">
        <Button type="submit" size="lg" loading={busy} disabled={!dirty}>
          {t.saveChanges}
        </Button>
      </div>
    </form>
  );
}
