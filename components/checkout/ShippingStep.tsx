"use client";

/* ══════════════════════════════════════════════════════════════
   ShippingStep — Step 2: Shipping Address Form
   ──────────────────────────────────────────────────────────────
   Collects the customer's delivery address. The shipping fee shown
   comes from the same table and rule the server charges with
   (lib/checkout/shipping: by governorate, free from EGP 500 after
   discount). "Save this address" stores it on the buyer's profile
   when the order is placed, and prefills the next checkout.
   ══════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, Home, Building2, Truck, ChevronDown, Search, Check } from "lucide-react";
import { GOVERNORATES, type ShippingAddress } from "@/lib/store/useCheckoutStore";
import { shippingFee } from "@/lib/checkout/shipping";
import { cn } from "@/lib/utils";
import { formatMoney, shippingSchema } from "./checkout-rules";

type ShippingFormValues = ShippingAddress;

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

interface ShippingStepProps {
  defaultValues: ShippingAddress;
  onSubmit: (data: ShippingAddress) => void;
  onBack: () => void;
  locale: string;
  /** Order subtotal after the promo discount — decides free shipping, as on the server. */
  subtotalAfterDiscount: number;
  /** Lets the order summary follow the governorate while the buyer is still typing. */
  onGovernorateChange?: (governorate: string) => void;
}

export function ShippingStep({
  defaultValues,
  onSubmit,
  onBack,
  locale,
  subtotalAfterDiscount,
  onGovernorateChange,
}: ShippingStepProps) {
  const isAr = locale === "ar";
  const schema = useMemo(() => shippingSchema(isAr ? "ar" : "en"), [isAr]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ShippingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...defaultValues,
      apartment: defaultValues.apartment || "",
      postalCode: defaultValues.postalCode || "",
      saveAddress: !!defaultValues.saveAddress,
    },
  });

  const [isGovOpen, setIsGovOpen] = useState(false);
  const [govSearch, setGovSearch] = useState("");
  const govRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (govRef.current && !govRef.current.contains(event.target as Node)) {
        setIsGovOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedGov = useWatch({ control, name: "governorate" });
  const saveAddress = useWatch({ control, name: "saveAddress" });
  const shippingCost = selectedGov ? shippingFee(selectedGov, subtotalAfterDiscount) : 0;

  const handleFormSubmit = (data: ShippingFormValues) => {
    onSubmit({
      governorate: data.governorate,
      city: data.city.trim(),
      address: data.address.trim(),
      apartment: data.apartment.trim(),
      postalCode: data.postalCode.trim(),
      saveAddress: data.saveAddress,
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit(handleFormSubmit)}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* Section Header */}
      <motion.div custom={0} variants={fieldVariant}>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">
          {isAr ? "عنوان الشحن" : "Shipping Address"}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          {isAr
            ? "أدخل عنوان التوصيل الخاص بك"
            : "Enter the address where you'd like your order delivered"}
        </p>
      </motion.div>

      {/* Governorate + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div custom={1} variants={fieldVariant} className="relative" ref={govRef}>
          <label
            htmlFor="checkout-governorate"
            className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {isAr ? "المحافظة" : "Governorate"}
          </label>
          <button
            type="button"
            id="checkout-governorate"
            aria-expanded={isGovOpen}
            onClick={() => setIsGovOpen(!isGovOpen)}
            className={cn(
              "w-full text-start flex items-center gap-3 px-3.5 py-1 input-field cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20 focus-visible:border-[var(--primary)] transition-all",
              errors.governorate && "border-[var(--destructive)]"
            )}
          >
            <MapPin size={18} className="text-[var(--text-faint)] flex-shrink-0" />
            <span className="flex-1 py-2 text-sm text-[var(--text-primary)] select-none">
              {selectedGov ? (
                isAr ? GOVERNORATES.find(g => g.value === selectedGov)?.ar : GOVERNORATES.find(g => g.value === selectedGov)?.en
              ) : (
                <span className="text-[var(--text-muted)]">{isAr ? "اختر المحافظة" : "Select governorate"}</span>
              )}
            </span>
            <ChevronDown size={16} className={cn("text-[var(--text-faint)] transition-transform", isGovOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {isGovOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-[72px] left-0 right-0 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-[240px]"
              >
                <div className="p-2 border-b border-[var(--border-subtle)] flex items-center gap-2">
                  <Search size={16} className="text-[var(--text-faint)] ms-2" />
                  <input
                    type="text"
                    aria-label={isAr ? "ابحث عن محافظة" : "Search governorate"}
                    autoFocus
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-[var(--text-primary)] py-1.5"
                    placeholder={isAr ? "ابحث عن محافظة..." : "Search governorate..."}
                    value={govSearch}
                    onChange={(e) => setGovSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="overflow-y-auto flex-1 p-1">
                  {GOVERNORATES.filter(g => (isAr ? g.ar : g.en).toLowerCase().includes(govSearch.toLowerCase())).map(g => (
                    <button
                      key={g.value}
                      type="button"
                      aria-pressed={selectedGov === g.value}
                      onClick={() => {
                        setValue("governorate", g.value, { shouldValidate: true });
                        onGovernorateChange?.(g.value);
                        setIsGovOpen(false);
                        setGovSearch("");
                      }}
                      className={cn(
                        "w-full text-start px-3 py-2 text-sm rounded-lg hover:bg-[var(--surface)] transition-colors",
                        selectedGov === g.value ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium" : "text-[var(--text-secondary)]"
                      )}
                    >
                      {isAr ? g.ar : g.en}
                    </button>
                  ))}
                  {GOVERNORATES.filter(g => (isAr ? g.ar : g.en).toLowerCase().includes(govSearch.toLowerCase())).length === 0 && (
                    <div className="p-3 text-center text-sm text-[var(--text-muted)]">
                      {isAr ? "لا توجد نتائج" : "No results found"}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errors.governorate && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
              {errors.governorate.message}
            </p>
          )}
        </motion.div>

        <motion.div custom={2} variants={fieldVariant}>
          <label
            htmlFor="checkout-city"
            className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {isAr ? "المدينة / الحي" : "City / District"}
          </label>
          <div
            className={cn(
              "flex items-center gap-3 px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all",
              errors.city && "border-[var(--destructive)]"
            )}
          >
            <Building2 size={18} className="text-[var(--text-faint)] flex-shrink-0" />
            <input
              id="checkout-city"
              type="text"
              className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
              placeholder={isAr ? "مدينة نصر" : "Nasr City"}
              {...register("city")}
            />
          </div>
          {errors.city && (
            <p className="mt-1 text-xs text-[var(--destructive)]">
              {errors.city.message}
            </p>
          )}
        </motion.div>
      </div>

      {/* Street Address */}
      <motion.div custom={3} variants={fieldVariant}>
        <label
          htmlFor="checkout-address"
          className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
        >
          {isAr ? "العنوان التفصيلي" : "Street Address"}
        </label>
        <div
          className={cn(
            "flex items-center gap-3 px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all",
            errors.address && "border-[var(--destructive)]"
          )}
        >
          <Home size={18} className="text-[var(--text-faint)] flex-shrink-0" />
          <input
            id="checkout-address"
            type="text"
            className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
            placeholder={
              isAr ? "٥ شارع التحرير، الدور الثالث" : "5 Tahrir St., 3rd Floor"
            }
            {...register("address")}
          />
        </div>
        {errors.address && (
          <p className="mt-1 text-xs text-[var(--destructive)]">
            {errors.address.message}
          </p>
        )}
      </motion.div>

      {/* Apartment + Postal Code */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div custom={4} variants={fieldVariant}>
          <label
            htmlFor="checkout-apartment"
            className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {isAr ? "الشقة / الوحدة" : "Apt / Suite"}{" "}
            <span className="text-[var(--text-faint)] font-normal">
              ({isAr ? "اختياري" : "Optional"})
            </span>
          </label>
          <div className="flex items-center px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all">
            <input
              id="checkout-apartment"
              type="text"
              className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
              placeholder={isAr ? "شقة ١٢" : "Apt 12"}
              {...register("apartment")}
            />
          </div>
        </motion.div>

        <motion.div custom={5} variants={fieldVariant}>
          <label
            htmlFor="checkout-postalCode"
            className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5"
          >
            {isAr ? "الرمز البريدي" : "Postal Code"}{" "}
            <span className="text-[var(--text-faint)] font-normal">
              ({isAr ? "اختياري" : "Optional"})
            </span>
          </label>
          <div className="flex items-center px-3.5 py-1 input-field focus-within:ring-2 focus-within:ring-[var(--primary)]/20 focus-within:border-[var(--primary)] transition-all">
            <input
              id="checkout-postalCode"
              type="text"
              className="flex-1 bg-transparent border-none focus:outline-none py-2 text-sm text-[var(--text-primary)] w-full placeholder:text-[var(--text-muted)]"
              placeholder="11511"
              {...register("postalCode")}
            />
          </div>
        </motion.div>
      </div>

      {/* Shipping Cost Indicator */}
      {selectedGov && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Truck size={16} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {isAr ? "تكلفة الشحن" : "Shipping Cost"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {(selectedGov === "cairo" || selectedGov === "giza")
                ? (isAr ? "القاهرة والجيزة — توصيل سريع" : "Cairo & Giza — Express Delivery")
                : (isAr ? "باقي المحافظات" : "Other Governorates")}
            </p>
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {shippingCost === 0 ? (
              <span className="text-success">{isAr ? "مجانًا" : "Free"}</span>
            ) : (
              formatMoney(shippingCost, isAr ? "ar" : "en")
            )}
          </span>
        </motion.div>
      )}

      {/* Save Address Toggle — stored on the buyer's profile when the order is placed */}
      <motion.label
        custom={6}
        variants={fieldVariant}
        htmlFor="checkout-saveAddress"
        className="flex items-start gap-3 cursor-pointer group"
      >
        <input
          id="checkout-saveAddress"
          type="checkbox"
          className="sr-only peer"
          {...register("saveAddress")}
        />
        <span
          className={cn(
            "mt-0.5 w-5 h-5 rounded-md border-2 flex flex-shrink-0 items-center justify-center transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)]/20",
            saveAddress ? "bg-[var(--primary)] border-[var(--primary)]" : "border-[var(--border-hover)]"
          )}
          aria-hidden="true"
        >
          <Check
            size={12}
            strokeWidth={3.5}
            className={cn("text-[var(--primary-foreground)] transition-opacity", saveAddress ? "opacity-100" : "opacity-0")}
          />
        </span>
        <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {isAr ? "احفظ هذا العنوان في حسابي للطلبات القادمة" : "Save this address to my account for future orders"}
          <span className="block text-xs text-[var(--text-faint)] mt-0.5">
            {isAr
              ? "سيُحفظ عند تأكيد الطلب، وسنملؤه لك تلقائيًا في المرة القادمة."
              : "Saved when you place the order, and filled in for you next time."}
          </span>
        </span>
      </motion.label>

      {/* Actions */}
      <motion.div custom={7} variants={fieldVariant} className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex-shrink-0 gap-2"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {isAr ? "رجوع" : "Back"}
        </button>
        <button type="submit" className="btn-primary flex-1 h-12 text-sm font-bold gap-2">
          {isAr ? "متابعة إلى الدفع" : "Continue to Payment"}
          <ArrowRight size={18} className="rtl:rotate-180" />
        </button>
      </motion.div>
    </motion.form>
  );
}
