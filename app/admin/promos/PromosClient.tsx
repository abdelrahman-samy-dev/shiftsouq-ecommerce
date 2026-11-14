"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Edit, Loader2, Plus, Power, Tag, X } from "lucide-react";
import { savePromoCode, setPromoActive } from "@/lib/actions/admin";
import { errorText, fill, getAdminText } from "@/lib/admin/i18n";
import { promoState, type PromoRow } from "@/lib/admin/promos";

const STATE_CLASS = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  inactive: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  expired: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  used_up: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20",
} as const;

/** ISO timestamp → yyyy-mm-dd in the admin's own time zone (for <input type="date">). */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PromosClient({ promos, locale, currency }: { promos: PromoRow[]; locale: string; currency: string }) {
  const t = getAdminText(locale).promos;
  const [editing, setEditing] = useState<PromoRow | "new" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const nf = (n: number) => n.toLocaleString(locale === "ar" ? "ar-EG" : "en-EG", { maximumFractionDigits: 2 });

  const toggle = (p: PromoRow) => {
    setBusyId(p.id);
    startTransition(async () => {
      const res = await setPromoActive(p.id, !p.is_active);
      setBusyId(null);
      if (res.ok) toast.success(p.is_active ? t.deactivated : t.activated);
      else toast.error(errorText(t.error, res.error));
    });
  };

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-1.5">{t.title}</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">{fill(t.description, { count: promos.length })}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="px-4 py-2 bg-gradient-to-b from-zinc-800 to-zinc-950 dark:from-zinc-100 dark:to-zinc-300 text-white dark:text-black rounded-lg text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} strokeWidth={3} /> {t.add}
          </button>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
          {promos.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500 flex flex-col items-center gap-3">
              <Tag size={28} className="text-zinc-400" />
              {t.empty}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-4 text-start">{t.code}</th>
                    <th className="px-5 py-4 text-start">{t.value}</th>
                    <th className="px-5 py-4 text-start">{t.uses}</th>
                    <th className="px-5 py-4 text-start">{t.expires}</th>
                    <th className="px-5 py-4 text-start">{t.active}</th>
                    <th className="px-5 py-4 text-end">
                      <span className="sr-only">{t.edit}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {promos.map((p) => {
                    const state = promoState(p);
                    const used = p.current_uses ?? 0;
                    const pct = p.max_uses ? Math.min(100, Math.round((used / p.max_uses) * 100)) : 0;
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                        <td className="px-5 py-4 font-mono font-bold text-zinc-900 dark:text-white" dir="ltr">
                          {p.code}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {p.discount_type === "percentage" ? `${nf(p.discount_value)}%` : `${nf(p.discount_value)} ${currency}`} {t.off}
                          </div>
                          {p.min_order_amount ? (
                            <div className="text-xs text-zinc-500">{fill(t.minShort, { amount: `${nf(p.min_order_amount)} ${currency}` })}</div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-900 dark:text-white">
                            {nf(used)} / {p.max_uses ? nf(p.max_uses) : t.unlimited}
                          </div>
                          {p.max_uses ? (
                            <div className="mt-1 h-1.5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                              <div className="h-full bg-zinc-900 dark:bg-white" style={{ width: `${pct}%` }} />
                            </div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-zinc-600 dark:text-zinc-400">
                          {p.expires_at
                            ? new Date(p.expires_at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" })
                            : t.never}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${STATE_CLASS[state]}`}>
                            {t.state[state]}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => toggle(p)}
                              disabled={busyId === p.id}
                              title={p.is_active ? t.deactivate : t.activate}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                            >
                              {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                              {p.is_active ? t.deactivate : t.activate}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(p)}
                              title={t.edit}
                              aria-label={`${t.edit} ${p.code}`}
                              className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
                            >
                              <Edit size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <PromoForm
          key={editing === "new" ? "new" : editing.id}
          promo={editing === "new" ? null : editing}
          locale={locale}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function PromoForm({ promo, locale, onClose }: { promo: PromoRow | null; locale: string; onClose: () => void }) {
  const t = getAdminText(locale).promos;
  const [code, setCode] = useState(promo?.code ?? "");
  const [type, setType] = useState<"percentage" | "fixed">(promo?.discount_type ?? "percentage");
  const [value, setValue] = useState(promo ? String(promo.discount_value) : "");
  const [minOrder, setMinOrder] = useState(promo?.min_order_amount ? String(promo.min_order_amount) : "");
  const [maxUses, setMaxUses] = useState(promo?.max_uses ? String(promo.max_uses) : "");
  const [expires, setExpires] = useState(toDateInput(promo?.expires_at ?? null));
  const [active, setActive] = useState(promo ? promo.is_active !== false : true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // End of the chosen day, in the admin's time zone.
    const expiresIso = expires ? new Date(`${expires}T23:59:59`).toISOString() : null;
    startTransition(async () => {
      const res = await savePromoCode(promo?.id ?? null, {
        code,
        discount_type: type,
        discount_value: value,
        min_order_amount: minOrder,
        max_uses: maxUses,
        expires_at: expiresIso,
        is_active: active,
      });
      if (res.ok) {
        toast.success(t.saved);
        onClose();
      } else {
        setError(errorText(t.error, res.error));
      }
    });
  };

  const input =
    "w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0a0a0a] px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white";
  const label = "block text-[13px] font-bold text-zinc-700 dark:text-zinc-300 mb-1.5";
  const hint = "text-xs text-zinc-500 mt-1";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={locale === "ar" ? "rtl" : "ltr"}>
      <form
        onSubmit={submit}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{promo ? t.edit : t.add}</h2>
          <button type="button" onClick={onClose} aria-label={t.cancel} className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className={label} htmlFor="promo-code">{t.code}</label>
            <input
              id="promo-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={`${input} font-mono uppercase`}
              dir="ltr"
              maxLength={32}
              autoComplete="off"
            />
            <p className={hint}>{t.codeHint}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="promo-type">{t.type}</label>
              <select id="promo-type" value={type} onChange={(e) => setType(e.target.value as "percentage" | "fixed")} className={input}>
                <option value="percentage">{t.percentage}</option>
                <option value="fixed">{t.fixed}</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="promo-value">{t.value}</label>
              <input
                id="promo-value"
                required
                type="number"
                inputMode="decimal"
                min={0.01}
                max={type === "percentage" ? 100 : undefined}
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={input}
                dir="ltr"
              />
            </div>
            <div>
              <label className={label} htmlFor="promo-min">{t.minOrder}</label>
              <input id="promo-min" type="number" min={0} step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className={input} dir="ltr" />
            </div>
            <div>
              <label className={label} htmlFor="promo-max">{t.maxUses}</label>
              <input id="promo-max" type="number" min={1} step={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={input} dir="ltr" />
              <p className={hint}>
                {t.maxUsesHint}
                {promo ? ` (${t.uses}: ${promo.current_uses ?? 0})` : ""}
              </p>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="promo-expires">{t.expires}</label>
            <input id="promo-expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={input} />
            <p className={hint}>{t.expiresHint}</p>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4" />
            {t.active}
          </label>
          {error && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400">
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
