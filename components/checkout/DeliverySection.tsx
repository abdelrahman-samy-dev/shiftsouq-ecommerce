"use client";

/* ══════════════════════════════════════════════════════════════
   Delivery: recipient and address. Signed-in buyers pick one of
   their saved addresses or add a new one (optionally saved to the
   account). The fee and delivery time shown come from the same
   store settings the server charges with.
   ══════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Button, Checkbox, Input, RadioCard, Select } from "@/components/ds";
import type { SavedAddress } from "@/lib/dal/account";
import type { DeliveryInfo } from "@/lib/store/useCheckoutStore";
import { GOVERNORATES, governorateName } from "@/lib/checkout/shipping";
import { shippingFeeFor, type ShippingSettings } from "@/lib/settings/types";
import {
  deliveryEta,
  deliverySchema,
  fieldErrors,
  formatAddress,
  formatEgyptianMobile,
  formatMoney,
  splitFullName,
  type Lang,
} from "./checkout-rules";
import { checkoutCopy } from "./copy";

interface DeliverySectionProps {
  locale: string;
  initial: DeliveryInfo;
  addresses: SavedAddress[];
  signedIn: boolean;
  rates: ShippingSettings;
  /** Subtotal after discount (decides free delivery). */
  afterDiscount: number;
  onGovernorateChange: (governorate: string) => void;
  onDone: (delivery: DeliveryInfo) => void;
}

const NEW = "new";

function fromSaved(a: SavedAddress, keep: DeliveryInfo): DeliveryInfo {
  const { firstName, lastName } = splitFullName(a.fullName);
  return {
    ...keep,
    addressId: a.id,
    firstName,
    lastName,
    governorate: a.governorate,
    city: a.city,
    address: a.address,
    apartment: a.apartment ?? "",
    postalCode: a.postalCode ?? "",
    saveAddress: false,
  };
}

export function DeliverySection({
  locale,
  initial,
  addresses,
  signedIn,
  rates,
  afterDiscount,
  onGovernorateChange,
  onDone,
}: DeliverySectionProps) {
  const lang: Lang = locale === "ar" ? "ar" : "en";
  const t = checkoutCopy(lang);
  const schema = useMemo(() => deliverySchema(lang), [lang]);
  const formRef = useRef<HTMLFormElement>(null);

  const [choice, setChoice] = useState<string>(() =>
    initial.addressId && addresses.some((a) => a.id === initial.addressId) ? initial.addressId : addresses.length && !initial.address ? addresses[0].id : NEW,
  );
  const [values, setValues] = useState<DeliveryInfo>(() => {
    const picked = addresses.find((a) => a.id === choice);
    return picked && !initial.address ? fromSaved(picked, initial) : { ...initial, saveAddress: signedIn ? initial.saveAddress : false };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fee = values.governorate ? shippingFeeFor(rates, values.governorate, afterDiscount) : null;

  const validateField = (name: string, next: DeliveryInfo) => {
    const r = schema.safeParse(next);
    const all = r.success ? {} : fieldErrors(r.error.issues);
    setErrors((e) => ({ ...e, [name]: all[name] ?? "" }));
  };

  const set =
    (name: keyof DeliveryInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const next = { ...values, [name]: e.target.value };
      setValues(next);
      if (name === "governorate") {
        onGovernorateChange(e.target.value);
        validateField(name, next);
      } else if (errors[name]) validateField(name, next);
    };

  const blur = (name: keyof DeliveryInfo) => () => {
    if (values[name]) validateField(name, values);
  };

  function pick(id: string) {
    setChoice(id);
    setErrors({});
    const a = addresses.find((x) => x.id === id);
    const next = a ? fromSaved(a, values) : { ...values, addressId: null, saveAddress: true };
    setValues(next);
    if (next.governorate) onGovernorateChange(next.governorate);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(values);
    if (!r.success) {
      const all = fieldErrors(r.error.issues);
      setErrors(all);
      // A saved address that misses something opens as a form to complete.
      if (choice !== NEW) setChoice(NEW);
      requestAnimationFrame(() => {
        const first = Object.keys(all)[0];
        formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      });
      return;
    }
    onDone({ ...values, ...r.data, addressId: choice === NEW ? null : choice, saveAddress: signedIn && choice === NEW && values.saveAddress });
  }

  const showForm = choice === NEW || addresses.length === 0;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-6">
      {addresses.length > 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-[0.8125rem] text-text-secondary">{t.savedAddresses}</legend>
          {addresses.map((a) => (
            <RadioCard
              key={a.id}
              name="saved-address"
              value={a.id}
              checked={choice === a.id}
              onChange={() => pick(a.id)}
              label={
                <span className="flex flex-wrap items-baseline gap-x-2">
                  {a.label || a.fullName}
                  {a.isDefault ? <span className="text-[0.75rem] font-normal text-text-muted">· {t.defaultAddress}</span> : null}
                </span>
              }
              description={
                <>
                  <span className="block">{formatAddress(a, lang)}</span>
                  <span className="block text-start rtl:text-end" dir="ltr">
                    {a.label ? `${a.fullName} · ` : ""}
                    {formatEgyptianMobile(a.phone)}
                  </span>
                </>
              }
            />
          ))}
          <RadioCard name="saved-address" value={NEW} checked={choice === NEW} onChange={() => pick(NEW)} label={t.newAddress} />
        </fieldset>
      ) : null}

      {showForm ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id="checkout-firstName"
            name="firstName"
            className="[unicode-bidi:plaintext]"
            autoComplete="given-name"
            label={t.firstName}
            value={values.firstName}
            onChange={set("firstName")}
            onBlur={blur("firstName")}
            error={errors.firstName || undefined}
            maxLength={60}
            required
          />
          <Input
            id="checkout-lastName"
            name="lastName"
            className="[unicode-bidi:plaintext]"
            autoComplete="family-name"
            label={t.lastName}
            value={values.lastName}
            onChange={set("lastName")}
            onBlur={blur("lastName")}
            error={errors.lastName || undefined}
            maxLength={60}
            required
          />
          <Select
            id="checkout-governorate"
            name="governorate"
            autoComplete="address-level1"
            label={t.governorate}
            value={values.governorate}
            onChange={set("governorate")}
            error={errors.governorate || undefined}
            wrapperClassName="md:col-span-2"
            required
          >
            <option value="" disabled>
              {t.chooseGovernorate}
            </option>
            {GOVERNORATES.map((g) => (
              <option key={g.value} value={g.value}>
                {g[lang]}
              </option>
            ))}
          </Select>
          <Input
            id="checkout-city"
            name="city"
            className="[unicode-bidi:plaintext]"
            autoComplete="address-level2"
            label={t.city}
            placeholder={t.cityPlaceholder}
            value={values.city}
            onChange={set("city")}
            onBlur={blur("city")}
            error={errors.city || undefined}
            maxLength={80}
            required
          />
          <Input
            id="checkout-address"
            name="address"
            className="[unicode-bidi:plaintext]"
            autoComplete="address-line1"
            label={t.address}
            placeholder={t.addressPlaceholder}
            value={values.address}
            onChange={set("address")}
            onBlur={blur("address")}
            error={errors.address || undefined}
            maxLength={200}
            required
          />
          <Input
            id="checkout-apartment"
            name="apartment"
            className="[unicode-bidi:plaintext]"
            autoComplete="address-line2"
            label={t.apartment}
            optional={t.optional}
            value={values.apartment}
            onChange={set("apartment")}
            error={errors.apartment || undefined}
            maxLength={40}
          />
          <Input
            id="checkout-postalCode"
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
      ) : null}

      <Input
        id="checkout-notes"
        name="notes"
        className="[unicode-bidi:plaintext]"
        label={t.notes}
        optional={t.optional}
        placeholder={t.notesPlaceholder}
        value={values.notes}
        onChange={set("notes")}
        error={errors.notes || undefined}
        maxLength={500}
      />

      <div className="flex min-h-12 flex-col justify-center gap-0.5 border-y border-border py-3 text-sm" aria-live="polite">
        {values.governorate ? (
          <>
            <span className="flex items-baseline justify-between gap-4">
              <span className="text-text-primary">{t.feeTo(governorateName(values.governorate, lang))}</span>
              <span className="t-price">{fee === 0 ? t.free : formatMoney(fee ?? 0, lang)}</span>
            </span>
            <span className="text-[0.8125rem] text-text-muted">{deliveryEta(rates.etaDays, lang)}</span>
          </>
        ) : (
          <span className="text-text-muted">{t.chooseForFee}</span>
        )}
      </div>

      {signedIn && showForm ? (
        <Checkbox
          name="saveAddress"
          label={t.saveAddress}
          checked={values.saveAddress}
          onChange={(e) => setValues({ ...values, saveAddress: e.target.checked })}
        />
      ) : null}

      <div>
        <Button type="submit" size="lg" className="w-full md:w-auto md:min-w-48">
          {t.continue}
        </Button>
      </div>
    </form>
  );
}
