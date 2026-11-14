"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  locale?: string;
  size?: "sm" | "md";
  className?: string;
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, locale = "en", size = "md", className }: QuantityStepperProps) {
  const isAr = locale === "ar";
  const h = size === "sm" ? "h-8" : "h-11";
  const w = size === "sm" ? "w-8" : "w-11";
  return (
    <div
      role="group"
      aria-label={isAr ? "الكمية" : "Quantity"}
      className={cn("inline-flex items-center border border-border rounded-sm", h, className)}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={isAr ? "تقليل الكمية" : "Decrease quantity"}
        className={cn("inline-flex items-center justify-center text-text-primary hover:bg-surface disabled:opacity-35", h, w)}
      >
        <Minus className="size-3.5" strokeWidth={1.5} />
      </button>
      <output aria-live="polite" className="min-w-8 text-center text-sm tabular-nums">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={isAr ? "زيادة الكمية" : "Increase quantity"}
        className={cn("inline-flex items-center justify-center text-text-primary hover:bg-surface disabled:opacity-35", h, w)}
      >
        <Plus className="size-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
