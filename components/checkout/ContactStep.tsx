"use client";

/* ══════════════════════════════════════════════════════════════
   ContactStep — Step 1: Contact Information Form
   ──────────────────────────────────────────────────────────────
   Collects the customer's name, email, and Egyptian mobile number
   (also used for courier calls and mobile-wallet payments).
   React Hook Form + Zod, with messages in the buyer's language.
   ══════════════════════════════════════════════════════════════ */

import { useMemo, type ElementType } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, User, Mail } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import type { ContactInfo } from "@/lib/store/useCheckoutStore";
import { cn } from "@/lib/utils";
import { contactSchema } from "./checkout-rules";

/* ── Animation ───────────────────────────────────────────────── */

const fieldVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

/* ── Egypt-only "country select" ─────────────────────────────── */

/** We deliver in Egypt only, so the country picker is just the flag. */
function EgyptFlag({ iconComponent: Icon }: { iconComponent: ElementType<{ country: string; label: string }> }) {
  return (
    <span className="flex items-center" aria-hidden="true">
      <Icon country="EG" label="Egypt" />
    </span>
  );
}

/* ── Component ───────────────────────────────────────────────── */

interface ContactStepProps {
  defaultValues: ContactInfo;
  onSubmit: (data: ContactInfo) => void;
  locale: string;
}

export function ContactStep({ defaultValues, onSubmit, locale }: ContactStepProps) {
  const isAr = locale === "ar";
  const schema = useMemo(() => contactSchema(isAr ? "ar" : "en"), [isAr]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContactInfo>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      initial="hidden"
      animate="visible"
      className="space-y-5"
      noValidate
    >
      {/* Section Header */}
      <motion.div custom={0} variants={fieldVariant}>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
          {isAr ? "معلومات التواصل" : "Contact Information"}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          {isAr
            ? "أدخل بياناتك حتى نتمكن من التواصل معك بخصوص طلبك"
            : "Enter your details so we can reach you about your order"}
        </p>
      </motion.div>

      {/* Name Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div custom={1} variants={fieldVariant}>
          <label
            htmlFor="checkout-firstName"
            className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {isAr ? "الاسم الأول" : "First Name"}
          </label>
          <div
            className={cn(
              "flex items-center gap-3 px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all",
              errors.firstName && "border-[var(--destructive)]"
            )}
          >
            <User size={18} className="text-[var(--text-faint)] flex-shrink-0" />
            <input
              id="checkout-firstName"
              type="text"
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
              placeholder={isAr ? "أحمد" : "Ahmed"}
              {...register("firstName")}
            />
          </div>
          {errors.firstName && (
            <p className="mt-1 text-xs text-[var(--destructive)]" role="alert">
              {errors.firstName.message}
            </p>
          )}
        </motion.div>

        <motion.div custom={2} variants={fieldVariant}>
          <label
            htmlFor="checkout-lastName"
            className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {isAr ? "اسم العائلة" : "Last Name"}
          </label>
          <div
            className={cn(
              "flex items-center gap-3 px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all",
              errors.lastName && "border-[var(--destructive)]"
            )}
          >
            <User size={18} className="text-[var(--text-faint)] flex-shrink-0" />
            <input
              id="checkout-lastName"
              type="text"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
              placeholder={isAr ? "محمد" : "Mohamed"}
              {...register("lastName")}
            />
          </div>
          {errors.lastName && (
            <p className="mt-1 text-xs text-[var(--destructive)]" role="alert">
              {errors.lastName.message}
            </p>
          )}
        </motion.div>
      </div>

      {/* Email */}
      <motion.div custom={3} variants={fieldVariant}>
        <label
          htmlFor="checkout-email"
          className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
        >
          {isAr ? "البريد الإلكتروني" : "Email Address"}
        </label>
        <div
          className={cn(
            "flex items-center gap-3 px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all",
            errors.email && "border-[var(--destructive)]"
          )}
        >
          <Mail size={18} className="text-[var(--text-faint)] flex-shrink-0" />
          <input
            id="checkout-email"
            type="email"
            autoComplete="email"
            dir="ltr"
            aria-invalid={!!errors.email}
            className={cn(
              "flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]",
              isAr && "text-right"
            )}
            placeholder="ahmed@example.com"
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-xs text-[var(--destructive)]" role="alert">
            {errors.email.message}
          </p>
        )}
      </motion.div>

      {/* Phone */}
      <motion.div custom={4} variants={fieldVariant}>
        <label
          htmlFor="checkout-phone"
          className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
        >
          {isAr ? "رقم الهاتف المحمول" : "Mobile Number"}
        </label>
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              id="checkout-phone"
              name={field.name}
              value={field.value || undefined}
              onChange={(v) => field.onChange(v ?? "")}
              onBlur={field.onBlur}
              defaultCountry="EG"
              initialValueFormat="national"
              countries={["EG"]}
              addInternationalOption={false}
              limitMaxLength
              autoComplete="tel"
              placeholder="010 1234 5678"
              aria-invalid={!!errors.phone}
              numberInputProps={{ dir: "ltr", inputMode: "tel" }}
              className={cn(
                "flex items-center w-full px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all",
                "[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:me-3",
                "[&_.PhoneInputCountryIcon]:w-6 [&_.PhoneInputCountryIcon]:h-4 [&_.PhoneInputCountryIcon]:shadow-sm",
                "[&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:py-2 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-[var(--text-primary)] [&_.PhoneInputInput]:placeholder:text-[var(--text-muted)]",
                isAr && "[&_.PhoneInputInput]:text-right",
                errors.phone && "border-[var(--destructive)]"
              )}
              countrySelectComponent={EgyptFlag}
            />
          )}
        />
        {errors.phone ? (
          <p className="mt-1 text-xs text-[var(--destructive)]" role="alert">
            {errors.phone.message}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[var(--text-faint)]">
            {isAr
              ? "رقم محمول مصري من 11 رقمًا، مثل 01012345678"
              : "Egyptian mobile, 11 digits — e.g. 01012345678"}
          </p>
        )}
      </motion.div>

      {/* Submit */}
      <motion.div custom={5} variants={fieldVariant} className="pt-2">
        <button
          type="submit"
          className="btn-primary w-full h-12 text-sm font-bold gap-2"
        >
          {isAr ? "متابعة إلى الشحن" : "Continue to Shipping"}
          <ArrowRight size={18} className="rtl:rotate-180" />
        </button>
      </motion.div>
    </motion.form>
  );
}
