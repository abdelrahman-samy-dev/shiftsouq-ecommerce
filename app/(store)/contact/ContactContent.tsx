"use client";

/* ══════════════════════════════════════════════════════════════
   Contact form (client)
   ──────────────────────────────────────────────────────────────
   ds fields with labels above and errors linked through
   aria-describedby. Instant checks in the visitor's language;
   the submitContactForm Server Function validates again,
   throttles and stores the message. A hidden honeypot field
   catches bots. On success the form gives way to a short
   confirmation.
   ══════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState, useTransition } from "react";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { submitContactForm } from "@/lib/actions/contact";
import { createContactSchema, CONTACT_MESSAGE_MAX } from "@/lib/validations/contact";
import { Button } from "@/components/ds/Button";
import { Input, Select, Textarea } from "@/components/ds/Field";

type ContactField = "name" | "email" | "subject" | "message";

interface Props {
  dict: Dictionary;
  labels: { required: string; another: string; sentTitle: string };
}

export default function ContactContent({ dict, labels }: Props) {
  const form = dict.contact.form;
  const subjects = dict.contact.subjects;
  const schema = useMemo(() => createContactSchema(dict.validation), [dict.validation]);

  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const subjectOptions = [
    { value: "general", label: subjects.general },
    { value: "order", label: subjects.order },
    { value: "return", label: subjects.return },
    { value: "product", label: subjects.product },
    { value: "other", label: subjects.other },
  ];

  const set = (field: ContactField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((x) => ({ ...x, [field]: undefined }));
  };

  function focusFirst(next: Partial<Record<ContactField, string>>) {
    const first = (["name", "email", "subject", "message"] as const).find((f) => next[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFailure(null);
    const subjectLabel = subjectOptions.find((o) => o.value === values.subject)?.label ?? "";
    const parsed = schema.safeParse({ ...values, subject: subjectLabel });
    if (!parsed.success) {
      const next: Partial<Record<ContactField, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as ContactField;
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      focusFirst(next);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await submitContactForm({ ...values, subject: subjectLabel, website });
      if (result.success) {
        setSent(result.message);
        setValues({ name: "", email: "", subject: "", message: "" });
        return;
      }
      if (result.field) {
        const next = { [result.field]: result.message };
        setErrors(next);
        focusFirst(next);
      } else {
        setFailure(result.message);
      }
    });
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 border-t border-text-primary pt-8">
        <h2 className="t-h2">{labels.sentTitle}</h2>
        <p className="max-w-md text-text-secondary">{sent}</p>
        <Button variant="secondary" onClick={() => setSent(null)} className="mt-2">
          {labels.another}
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5" aria-busy={pending || undefined}>
      {/* Honeypot: invisible to people and screen readers; bots fill it in. */}
      <div className="absolute -start-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id="contact-name"
          name="name"
          label={form.name}
          value={values.name}
          onChange={set("name")}
          autoComplete="name"
          required
          aria-required="true"
          maxLength={120}
          error={errors.name}
        />
        <Input
          id="contact-email"
          name="email"
          type="email"
          inputMode="email"
          label={form.email}
          value={values.email}
          onChange={set("email")}
          autoComplete="email"
          required
          aria-required="true"
          maxLength={254}
          dir="ltr"
          className="rtl:text-right"
          error={errors.email}
        />
      </div>

      <Select id="contact-subject" name="subject" label={form.subject} value={values.subject} onChange={set("subject")} required aria-required="true" error={errors.subject}>
        <option value="" disabled>
          {form.subjectPlaceholder}
        </option>
        {subjectOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Textarea
        id="contact-message"
        name="message"
        label={form.message}
        value={values.message}
        onChange={set("message")}
        rows={7}
        required
        aria-required="true"
        maxLength={CONTACT_MESSAGE_MAX}
        error={errors.message}
        hint={`${values.message.length}/${CONTACT_MESSAGE_MAX}`}
      />

      {failure ? (
        <p role="alert" className="border-s-2 border-destructive ps-3 text-[0.875rem] text-destructive">
          {failure}
        </p>
      ) : null}

      <div className="flex flex-col-reverse items-start gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.8125rem] text-text-muted">{labels.required}</p>
        <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:min-w-48">
          {pending ? form.sending : form.submit}
        </Button>
      </div>
    </form>
  );
}
