"use client";

/* Internal order note (order_internal_notes): team-only, saved with the admin's session and audited. */

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ds";
import { saveOrderNote } from "@/lib/actions/admin";
import { errorText, fill, getAdminText } from "@/lib/admin/i18n";
import { adminButton } from "../../components/buttons";

const MAX = 2000;

export function OrderNote({ orderId, initial, locale }: { orderId: string; initial: string; locale: string }) {
  const t = getAdminText(locale);
  const id = useId();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const tooLong = value.length > MAX;
  const dirty = value.trim() !== saved.trim();

  const save = () =>
    startTransition(async () => {
      const res = await saveOrderNote(orderId, value);
      if (res.ok) {
        setSaved(value.trim());
        setValue(value.trim());
        toast.success(t.note.saved);
      } else {
        toast.error(res.error === "note_too_long" ? t.note.tooLong : errorText(t.orderError, res.error));
      }
    });

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {t.note.title}
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        placeholder={t.note.placeholder}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={tooLong || undefined}
        aria-describedby={`${id}-hint`}
        className="w-full resize-y rounded-[3px] border border-border bg-background px-3 py-2.5 text-[0.8125rem] leading-relaxed text-text-primary placeholder:text-text-faint outline-none transition-[border-color,box-shadow] hover:border-border-hover focus:border-text-primary focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--text-primary)_12%,transparent)] aria-[invalid=true]:border-destructive"
      />
      <div className="mt-2 flex items-start justify-between gap-3">
        <p id={`${id}-hint`} className={tooLong ? "text-[0.75rem] text-destructive" : "text-[0.75rem] text-text-muted"}>
          {tooLong ? t.note.tooLong : t.note.hint}
        </p>
        <span className="shrink-0 text-[0.6875rem] tabular-nums text-text-faint">{fill(t.note.count, { n: value.length })}</span>
      </div>
      <button type="button" onClick={save} disabled={!dirty || tooLong || pending} className={adminButton("outline", "sm", "mt-3")}>
        {pending ? <Spinner /> : null}
        {t.note.save}
      </button>
    </div>
  );
}
