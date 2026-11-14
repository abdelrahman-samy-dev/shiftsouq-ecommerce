"use client";

/* ══════════════════════════════════════════════════════════════
   Address book — saved addresses with add / edit (drawer form),
   delete (confirm dialog) and "set as default". Validation is the
   checkout delivery rule (addressSchema); the server checks again.
   ══════════════════════════════════════════════════════════════ */

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge, Button, Checkbox, Dialog, Drawer, Input, Select } from "@/components/ds";
import type { SavedAddress } from "@/lib/dal/account";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/lib/actions/addresses";
import { GOVERNORATES } from "@/lib/checkout/shipping";
import {
  addressSchema,
  fieldErrors,
  formatAddress,
  formatEgyptianMobile,
  type AddressInput,
  type Lang,
} from "@/components/checkout/checkout-rules";
import { accountCopy } from "../_components/copy";

const EMPTY: AddressInput = {
  label: "",
  fullName: "",
  phone: "",
  governorate: "",
  city: "",
  address: "",
  apartment: "",
  postalCode: "",
  isDefault: false,
};

const toInput = (a: SavedAddress): AddressInput => ({
  label: a.label ?? "",
  fullName: a.fullName,
  phone: a.phone,
  governorate: a.governorate,
  city: a.city,
  address: a.address,
  apartment: a.apartment ?? "",
  postalCode: a.postalCode ?? "",
  isDefault: a.isDefault,
});

export function AddressBook({ locale, addresses, defaultName, defaultPhone }: { locale: string; addresses: SavedAddress[]; defaultName: string; defaultPhone: string }) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = accountCopy(lang);
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; values: AddressInput } | null>(null);
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () =>
    setEditing({ id: null, values: { ...EMPTY, fullName: defaultName, phone: defaultPhone, isDefault: addresses.length === 0 } });

  function makeDefault(a: SavedAddress) {
    startTransition(async () => {
      const r = await setDefaultAddress(a.id);
      if (r.ok) {
        toast.success(t.defaultSet);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function confirmDelete() {
    const a = deleting;
    if (!a) return;
    startTransition(async () => {
      const r = await deleteAddress(a.id);
      setDeleting(null);
      if (r.ok) {
        toast.success(t.deleted);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Button onClick={openNew} variant="secondary" icon={<Plus className="size-4" strokeWidth={1.5} aria-hidden="true" />}>
          {t.addAddress}
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-start gap-2 border border-dashed border-border-hover p-8 rounded-sm">
          <p className="text-[0.9375rem] text-text-primary">{t.noAddresses}</p>
          <p className="text-sm text-text-secondary">{t.noAddressesBody}</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col gap-4 border border-border p-5 md:p-6 rounded-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[0.9375rem] font-medium text-text-primary">{a.label || a.fullName}</p>
                {a.isDefault ? <Badge tone="ink">{t.default}</Badge> : null}
              </div>
              <address className="flex-1 text-sm not-italic leading-relaxed text-text-secondary">
                {a.label ? <span className="block text-text-primary">{a.fullName}</span> : null}
                <span className="block">{formatAddress(a, lang)}</span>
                <span className="block text-start rtl:text-end" dir="ltr">
                  {formatEgyptianMobile(a.phone)}
                </span>
                {a.postalCode ? <span className="block">{a.postalCode}</span> : null}
              </address>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border pt-3 text-[0.8125rem]">
                <button type="button" onClick={() => setEditing({ id: a.id, values: toInput(a) })} className="min-h-10 text-text-primary underline-offset-4 hover:underline">
                  {t.edit}
                </button>
                {!a.isDefault ? (
                  <button type="button" disabled={pending} onClick={() => makeDefault(a)} className="min-h-10 text-text-secondary underline-offset-4 hover:text-text-primary hover:underline disabled:opacity-45">
                    {t.setDefault}
                  </button>
                ) : null}
                <button type="button" onClick={() => setDeleting(a)} className="ms-auto min-h-10 text-destructive underline-offset-4 hover:underline">
                  {t.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? t.editAddress : t.newAddress} closeLabel={t.cancel}>
        {editing ? (
          <AddressForm
            key={editing.id ?? "new"}
            lang={lang}
            id={editing.id}
            initial={editing.values}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              toast.success(t.saved);
              router.refresh();
            }}
          />
        ) : null}
      </Drawer>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={t.deleteTitle}
        closeLabel={t.cancel}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              {t.keep}
            </Button>
            <Button onClick={confirmDelete} loading={pending}>
              {t.confirmDelete}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-text-secondary">{t.deleteBody}</p>
        {deleting ? <p className="mt-3 text-sm text-text-primary">{formatAddress(deleting, lang)}</p> : null}
      </Dialog>
    </div>
  );
}

function AddressForm({
  lang,
  id,
  initial,
  onCancel,
  onSaved,
}: {
  lang: Lang;
  id: string | null;
  initial: AddressInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = accountCopy(lang);
  const schema = useMemo(() => addressSchema(lang), [lang]);
  const [values, setValues] = useState<AddressInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (name: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...values, [name]: e.target.value };
    setValues(next);
    if (errors[name]) {
      const r = schema.safeParse(next);
      setErrors((x) => ({ ...x, [name]: r.success ? "" : (fieldErrors(r.error.issues)[name] ?? "") }));
    }
  };

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
    setFormError(null);
    try {
      const res = await saveAddress(id, r.data);
      if (res.ok) onSaved();
      else {
        setFormError(res.error);
        if (res.fields) setErrors(res.fields);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 p-5">
      <Input name="label" className="[unicode-bidi:plaintext]" label={t.label} optional={t.optional} placeholder={t.labelPlaceholder} value={values.label} onChange={set("label")} error={errors.label || undefined} maxLength={40} />
      <Input name="fullName" className="[unicode-bidi:plaintext]" autoComplete="name" label={t.fullName} value={values.fullName} onChange={set("fullName")} error={errors.fullName || undefined} maxLength={120} required />
      <Input
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        dir="ltr"
        className="text-start rtl:text-end"
        label={t.phone}
        placeholder="01X XXXX XXXX"
        value={values.phone}
        onChange={set("phone")}
        error={errors.phone || undefined}
        maxLength={20}
        required
      />
      <Select name="governorate" autoComplete="address-level1" label={t.governorate} value={values.governorate} onChange={set("governorate")} error={errors.governorate || undefined} required>
        <option value="" disabled>
          {t.chooseGovernorate}
        </option>
        {GOVERNORATES.map((g) => (
          <option key={g.value} value={g.value}>
            {g[lang]}
          </option>
        ))}
      </Select>
      <Input name="city" className="[unicode-bidi:plaintext]" autoComplete="address-level2" label={t.city} value={values.city} onChange={set("city")} error={errors.city || undefined} maxLength={80} required />
      <Input name="address" className="[unicode-bidi:plaintext]" autoComplete="address-line1" label={t.street} placeholder={t.streetPlaceholder} value={values.address} onChange={set("address")} error={errors.address || undefined} maxLength={200} required />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="apartment" className="[unicode-bidi:plaintext]" autoComplete="address-line2" label={t.apartment} optional={t.optional} value={values.apartment} onChange={set("apartment")} error={errors.apartment || undefined} maxLength={40} />
        <Input
          name="postalCode"
          autoComplete="postal-code"
          inputMode="numeric"
          dir="ltr"
          className="text-start rtl:text-end"
          label={t.postalCode}
          optional={t.optional}
          value={values.postalCode}
          onChange={set("postalCode")}
          error={errors.postalCode || undefined}
          maxLength={20}
        />
      </div>
      <Checkbox name="isDefault" label={t.makeDefault} checked={values.isDefault} onChange={(e) => setValues({ ...values, isDefault: e.target.checked })} />
      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={busy} className="flex-1">
          {t.save}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
