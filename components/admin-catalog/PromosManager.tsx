"use client";

/* Promo codes: list with usage and state, create / edit in a drawer, activate / deactivate.
   Validation (capitals, unique regardless of case, percentage ≤ 100 …) lives in lib/admin/promos.ts. */

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Drawer, Input, Select } from "@/components/ds";
import { savePromo, setPromoActive } from "@/lib/actions/admin-catalog";
import { promoErrorKey, promoInputSchema, promoState, type PromoRow, type PromoState } from "@/lib/admin/promos";
import { fmt, formatShortDate, getCatalogText, type CatalogText } from "@/lib/admin/i18n-catalog";
import { cn, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";
import { Switch } from "./controls";
import { EmptyPanel, PageHeader, tdStack, thClass } from "./ui";

const STATE_TONE: Record<PromoState, string> = {
  active: "bg-success",
  inactive: "bg-text-faint",
  expired: "bg-warning",
  used_up: "bg-destructive",
};

/** ISO timestamp → yyyy-mm-dd in the admin's own time zone (for <input type="date">). */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PromosManager({ promos, locale, meta }: { promos: PromoRow[]; locale: string; meta?: ReactNode }) {
  const t = getCatalogText(locale);
  const tp = t.promos;
  const router = useRouter();
  const [editing, setEditing] = useState<PromoRow | "new" | null>(null);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const loc = (locale === "ar" ? "ar" : "en") as Locale;
  const nf = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG-u-nu-latn" : "en-US", { maximumFractionDigits: 2 });

  const edit = (p: PromoRow | "new") => {
    setEditing(p);
    setOpen(true);
  };

  const toggle = (p: PromoRow) => {
    setBusyId(p.id);
    startTransition(async () => {
      const res = await setPromoActive(p.id, !p.is_active);
      setBusyId(null);
      if (!res.ok) return void toast.error(tp.error[res.error] ?? tp.error.generic);
      toast.success(p.is_active ? tp.deactivated : tp.activated);
      router.refresh();
    });
  };

  return (
    <>
      <PageHeader
        title={tp.title}
        description={tp.description}
        meta={meta}
        actions={
          <Button size="sm" onClick={() => edit("new")}>
            {tp.add}
          </Button>
        }
      />

      {promos.length === 0 ? (
        <EmptyPanel
          title={tp.emptyTitle}
          body={tp.emptyBody}
          action={
            <Button size="sm" onClick={() => edit("new")}>
              {tp.add}
            </Button>
          }
        />
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead className="hidden md:table-header-group">
            <tr className="border-y border-border">
              <th scope="col" className={thClass}>{tp.columns.code}</th>
              <th scope="col" className={thClass}>{tp.columns.discount}</th>
              <th scope="col" className={thClass}>{tp.columns.uses}</th>
              <th scope="col" className={thClass}>{tp.columns.expires}</th>
              <th scope="col" className={thClass}>{tp.columns.status}</th>
              <th scope="col" className={cn(thClass, "text-end")}>
                <span className="sr-only">{t.common.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => {
              const state = promoState(p);
              const used = p.current_uses ?? 0;
              const pct = p.max_uses ? Math.min(100, Math.round((used / p.max_uses) * 100)) : 0;
              return (
                <tr key={p.id} className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-border py-3 md:table-row md:py-0">
                  <td className={tdStack}>
                    <button type="button" onClick={() => edit(p)} className="font-medium tracking-[0.04em] text-text-primary hover:underline hover:underline-offset-4" dir="ltr">
                      {p.code}
                    </button>
                  </td>
                  <td className={tdStack}>
                    <span className="t-price text-text-primary">
                      {p.discount_type === "percentage" ? `${nf(p.discount_value)}%` : formatPrice(p.discount_value, loc)} {tp.off}
                    </span>
                    {p.min_order_amount ? (
                      <span className="block text-[0.75rem] text-text-muted">{fmt(tp.minShort, { amount: formatPrice(p.min_order_amount, loc) })}</span>
                    ) : null}
                  </td>
                  <td className={tdStack}>
                    <span className="tabular-nums text-text-secondary">
                      {nf(used)} / {p.max_uses ? nf(p.max_uses) : tp.unlimited}
                    </span>
                    {p.max_uses ? (
                      <span className="mt-1.5 block h-0.5 w-24 overflow-hidden bg-border" aria-hidden="true">
                        <span className="block h-full bg-text-primary" style={{ width: `${pct}%` }} />
                      </span>
                    ) : null}
                  </td>
                  <td className={cn(tdStack, "text-[0.8125rem] text-text-secondary tabular-nums")}>
                    {p.expires_at ? formatShortDate(p.expires_at, locale) : tp.never}
                  </td>
                  <td className={tdStack}>
                    <span className="inline-flex items-center gap-2 text-[0.8125rem] text-text-primary">
                      <span aria-hidden="true" className={cn("size-1.5 rounded-full", STATE_TONE[state])} />
                      {tp.state[state]}
                    </span>
                  </td>
                  <td className={cn(tdStack, "col-span-2")}>
                    <div className="flex items-center gap-1 md:justify-end">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => toggle(p)}
                        className="h-9 rounded-sm px-2.5 text-[0.8125rem] text-text-secondary hover:bg-surface hover:text-text-primary disabled:opacity-50"
                      >
                        {p.is_active ? tp.deactivate : tp.activate}
                      </button>
                      <button
                        type="button"
                        onClick={() => edit(p)}
                        aria-label={fmt(tp.editCode, { code: p.code })}
                        className="h-9 rounded-sm px-2.5 text-[0.8125rem] text-text-primary hover:bg-surface"
                      >
                        {t.common.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <PromoDrawer
        key={editing === "new" ? "new" : (editing?.id ?? "none")}
        open={open}
        promo={editing === "new" ? null : editing}
        t={t}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function PromoDrawer({ open, promo, t, onClose, onSaved }: { open: boolean; promo: PromoRow | null; t: CatalogText; onClose: () => void; onSaved: () => void }) {
  const tp = t.promos;
  const [code, setCode] = useState(promo?.code ?? "");
  const [type, setType] = useState<"percentage" | "fixed">(promo?.discount_type ?? "percentage");
  const [value, setValue] = useState(promo ? String(promo.discount_value) : "");
  const [minOrder, setMinOrder] = useState(promo?.min_order_amount ? String(promo.min_order_amount) : "");
  const [maxUses, setMaxUses] = useState(promo?.max_uses ? String(promo.max_uses) : "");
  const [expires, setExpires] = useState(toDateInput(promo?.expires_at ?? null));
  const [active, setActive] = useState(promo ? promo.is_active !== false : true);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const fieldErr = (...keys: string[]) => (error && keys.includes(error) ? tp.error[error] : null);

  const submit = () =>
    startSave(async () => {
      // End of the chosen day, in the admin's time zone.
      const expiresIso = expires ? new Date(`${expires}T23:59:59`).toISOString() : null;
      const input = { code, discount_type: type, discount_value: value, min_order_amount: minOrder, max_uses: maxUses, expires_at: expiresIso, is_active: active };
      const check = promoInputSchema.safeParse(input);
      if (!check.success) return setError(promoErrorKey(check.error));
      const res = await savePromo(promo?.id ?? null, input);
      if (!res.ok) return setError(res.error);
      setError(null);
      toast.success(tp.saved);
      onSaved();
    });

  const general = error && !["code", "duplicate", "discount_value", "percentage_over_100", "min_order_amount", "max_uses", "max_below_used", "expires_at"].includes(error);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={promo ? tp.edit : tp.add}
      closeLabel={t.common.close}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} loading={saving}>
            {tp.save}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-5 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {general ? (
          <p role="alert" className="border-s-2 border-destructive bg-destructive-bg px-4 py-3 text-[0.8125rem] text-destructive">
            {tp.error[error!] ?? tp.error.generic}
          </p>
        ) : null}
        <Input
          label={tp.code}
          hint={tp.codeHint}
          error={fieldErr("code", "duplicate")}
          value={code}
          dir="ltr"
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
          className="font-medium tracking-[0.06em] uppercase"
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label={tp.type} value={type} onChange={(e) => setType(e.target.value as "percentage" | "fixed")}>
            <option value="percentage">{tp.percentage}</option>
            <option value="fixed">{tp.fixed}</option>
          </Select>
          <Input
            label={tp.value}
            error={fieldErr("discount_value", "percentage_over_100")}
            inputMode="decimal"
            dir="ltr"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <Input label={tp.minOrder} error={fieldErr("min_order_amount")} inputMode="decimal" dir="ltr" value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/[^\d.]/g, ""))} />
          <Input
            label={tp.maxUses}
            hint={promo ? `${tp.maxUsesHint} ${fmt(tp.usedSoFar, { count: promo.current_uses ?? 0 })}` : tp.maxUsesHint}
            error={fieldErr("max_uses", "max_below_used")}
            inputMode="numeric"
            dir="ltr"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Input label={tp.expires} hint={tp.expiresHint} error={fieldErr("expires_at")} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        <div className="border-y border-border">
          <Switch checked={active} onChange={setActive} label={tp.active} description={tp.activeHint} />
        </div>
        <button type="submit" hidden />
      </form>
    </Drawer>
  );
}
