"use client";

/* Forgotten password: email → reset link. The answer never says whether the account exists. */

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ds";
import { forgotPasswordAction } from "@/lib/actions/auth";
import { createForgotPasswordSchema } from "@/lib/validations/auth";
import type { ValidationMessages } from "@/lib/validations/messages";
import { noticeTone, textLink } from "@/components/checkout/ui";
import { cn } from "@/lib/utils";
import { authCopy } from "@/app/(auth)/_components/copy";

export function ForgotPasswordForm({ locale, messages, linkExpired }: { locale: string; messages: ValidationMessages; linkExpired: boolean }) {
  const t = authCopy(locale);
  const schema = useMemo(() => createForgotPasswordSchema(messages), [messages]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = schema.safeParse({ email });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await forgotPasswordAction(r.data);
      if (res.sent) setSentTo(r.data.email);
      else setError(res.error ?? null);
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col gap-6" role="status">
        <h1 className="t-h1">{t.sentTitle}</h1>
        <p className="text-text-secondary">{t.sentBody(sentTo)}</p>
        <p className="text-sm text-text-muted">{t.sentHint}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm">
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setEmail("");
            }}
            className={cn("min-h-10 text-text-primary", textLink)}
          >
            {t.tryAgain}
          </button>
          <Link href="/login" className={cn("inline-flex min-h-10 items-center text-text-secondary", textLink)}>
            {t.backToSignIn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="t-h1">{t.forgotTitle}</h1>
        <p className="text-text-secondary">{t.forgotIntro}</p>
      </div>
      {linkExpired ? (
        <p role="status" className={cn("border px-4 py-3 text-sm rounded-sm", noticeTone.warning)}>
          {t.resetExpiredBody}
        </p>
      ) : null}
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <Input
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          dir="ltr"
          className="text-start rtl:text-end"
          label={t.email}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          error={error ?? undefined}
          maxLength={254}
          required
        />
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {t.sendLink}
        </Button>
      </form>
      <p className="border-t border-border pt-6 text-sm text-text-secondary">
        {t.rememberIt}{" "}
        <Link href="/login" className={cn("text-text-primary", textLink)}>
          {t.signIn}
        </Link>
      </p>
    </div>
  );
}
