"use client";

/* ══════════════════════════════════════════════════════════════
   CheckoutSteps — Visual Progress Indicator
   ──────────────────────────────────────────────────────────────
   A premium 3-step progress bar showing numbered steps inline.
   Steps: Contact → Shipping → Payment
   ══════════════════════════════════════════════════════════════ */

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { CheckoutStep } from "@/lib/store/useCheckoutStore";
import { cn } from "@/lib/utils";

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
  onStepClick: (step: CheckoutStep) => void;
  locale: string;
}

const STEPS = [
  { step: 1 as CheckoutStep, en: "Contact", ar: "التواصل" },
  { step: 2 as CheckoutStep, en: "Shipping", ar: "الشحن" },
  { step: 3 as CheckoutStep, en: "Payment", ar: "الدفع" },
];

export function CheckoutSteps({
  currentStep,
  onStepClick,
  locale,
}: CheckoutStepsProps) {
  const isAr = locale === "ar";

  return (
    <nav aria-label={isAr ? "خطوات الدفع" : "Checkout Steps"} className="mb-6 sm:mb-8">
      <ol className="flex items-center w-full">
        {STEPS.map(({ step, en, ar }, index) => {
          const isCompleted = currentStep > step;
          const isActive = currentStep === step;
          const isClickable = step < currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <li
              key={step}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-2 sm:gap-3 transition-all duration-300 outline-none rounded-lg",
                  isClickable && "cursor-pointer hover:opacity-80"
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-300 flex-shrink-0",
                    isActive
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20"
                      : isCompleted
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "bg-[var(--surface-elevated)] text-[var(--text-faint)] border border-[var(--border)]"
                  )}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    step
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs sm:text-sm font-semibold transition-colors duration-300 whitespace-nowrap",
                    isActive
                      ? "text-[var(--text-primary)]"
                      : isCompleted
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-faint)] hidden sm:inline-block" // Hide inactive text on mobile to save space
                  )}
                >
                  {isAr ? ar : en}
                </span>
              </button>

              {!isLast && (
                <div className="flex-1 mx-2 sm:mx-4 h-[1px] bg-[var(--border)] relative overflow-hidden">
                  {isCompleted && (
                    <motion.div
                      className="absolute inset-0 bg-[var(--primary)]"
                      initial={{ width: 0, originX: isAr ? 1 : 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      style={{ originX: isAr ? 1 : 0 }}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
