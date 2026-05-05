"use client";

/* ══════════════════════════════════════════════════════════════
   ContactStep — Step 1: Contact Information Form
   ──────────────────────────────────────────────────────────────
   Collects the customer's name, email, and phone number.
   Uses React Hook Form + Zod for validation.
   ══════════════════════════════════════════════════════════════ */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { ArrowRight, User, Mail, Search, ChevronDown } from "lucide-react";
import PhoneInput, { getCountryCallingCode } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useState, useRef, useEffect } from "react";
import type { ContactInfo } from "@/lib/store/useCheckoutStore";
import { cn } from "@/lib/utils";

/* ── Schema ──────────────────────────────────────────────────── */

const contactSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[\d+\s()-]+$/, "Please enter a valid phone number"),
});

/* ── Animation ───────────────────────────────────────────────── */

const fieldVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

/* ── Component ───────────────────────────────────────────────── */

const CountrySelect = ({ value, onChange, options, iconComponent: Icon }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option: any) =>
    option.label && option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none"
      >
        <Icon country={value} label={value} />
        <ChevronDown size={14} className="text-[var(--text-faint)]" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 flex flex-col" style={{ direction: "ltr" }}>
          <div className="p-2 sticky top-0 bg-[var(--surface-elevated)] border-b border-[var(--border-subtle)] z-10">
            <div className="flex items-center gap-2 bg-[var(--surface)] px-2 py-1.5 rounded-md border border-[var(--border)] focus-within:border-[var(--primary)] transition-colors">
              <Search size={14} className="text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-[var(--text-primary)]"
                placeholder="Search country..."
                autoFocus
              />
            </div>
          </div>
          <div className="p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option: any, index: number) => {
                if (option.divider) return <div key={`divider-${index}`} className="my-1 border-b border-[var(--border-subtle)]" />;
                return (
                  <button
                    key={option.value || `option-${index}`}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--surface)] flex items-center gap-2 transition-colors",
                      value === option.value ? "text-[var(--primary)] bg-[var(--surface)] font-medium" : "text-[var(--text-primary)]"
                    )}
                  >
                    {option.value && <Icon country={option.value} label={option.label} />}
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.value && <span className="text-xs text-[var(--text-muted)]">+{getCountryCallingCode(option.value)}</span>}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-sm text-[var(--text-muted)] text-center">No countries found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ContactStepProps {
  defaultValues: ContactInfo;
  onSubmit: (data: ContactInfo) => void;
  locale: string;
}

export function ContactStep({ defaultValues, onSubmit, locale }: ContactStepProps) {
  const isAr = locale === "ar";
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ContactInfo>({
    resolver: zodResolver(contactSchema),
    defaultValues,
  });

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      initial="hidden"
      animate="visible"
      className="space-y-5"
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
              className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
              placeholder={isAr ? "أحمد" : "Ahmed"}
              {...register("firstName")}
            />
          </div>
          {errors.firstName && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
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
              className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
              placeholder={isAr ? "محمد" : "Mohamed"}
              {...register("lastName")}
            />
          </div>
          {errors.lastName && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
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
            className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
            placeholder={isAr ? "ahmed@example.com" : "ahmed@example.com"}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-xs text-[var(--destructive)]">
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
          {isAr ? "رقم الهاتف" : "Phone Number"}
        </label>
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              {...field}
              id="checkout-phone"
              international
              defaultCountry="EG"
              className={cn(
                "flex items-center w-full px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all",
                "[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountry]:mr-3 rtl:[&_.PhoneInputCountry]:mr-0 rtl:[&_.PhoneInputCountry]:ml-3",
                "[&_.PhoneInputCountryIcon]:w-6 [&_.PhoneInputCountryIcon]:h-4 [&_.PhoneInputCountryIcon]:shadow-sm",
                "[&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:border-none [&_.PhoneInputInput]:outline-none [&_.PhoneInputInput]:py-2 [&_.PhoneInputInput]:text-sm [&_.PhoneInputInput]:text-[var(--text-primary)] [&_.PhoneInputInput]:placeholder:text-[var(--text-muted)]",
                isAr && "[&_.PhoneInputInput]:text-right",
                errors.phone && "border-[var(--destructive)]"
              )}
              countrySelectComponent={CountrySelect}
            />
          )}
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-[var(--destructive)]">
            {errors.phone.message}
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
