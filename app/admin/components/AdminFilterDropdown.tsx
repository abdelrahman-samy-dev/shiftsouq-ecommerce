"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string;
}

/** Dropdown that sets one URL search param (default "status") and resets to page 1. */
export function AdminFilterDropdown({
  options,
  defaultLabel,
  className,
  param = "status",
}: {
  options: FilterOption[];
  defaultLabel: string;
  className?: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const current = searchParams.get(param) || "all";

  const handleSelect = (value: string) => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(param, value);
    else params.delete(param);
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currentLabel = current === "all" ? defaultLabel : options.find((o) => o.value === current)?.label || defaultLabel;

  const itemClass = (active: boolean) =>
    `w-full text-start px-4 py-2.5 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
      active ? "text-zinc-900 dark:text-white font-medium" : "text-zinc-600 dark:text-zinc-400"
    }`;

  return (
    <div className={`relative ${className || ""}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between min-w-[160px] px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all disabled:opacity-50 ${
          isOpen ? "ring-2 ring-zinc-900 dark:ring-white" : ""
        } ${current !== "all" ? "border-zinc-900 dark:border-white" : ""}`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown size={16} className={`ms-2 text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[160px] mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg end-0 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <button type="button" onClick={() => handleSelect("all")} className={itemClass(current === "all")}>
            {defaultLabel}
            {current === "all" && <Check size={16} className="text-zinc-900 dark:text-white" />}
          </button>
          {options.map((opt) => (
            <button key={opt.value} type="button" onClick={() => handleSelect(opt.value)} className={itemClass(current === opt.value)}>
              {opt.label}
              {current === opt.value && <Check size={16} className="text-zinc-900 dark:text-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
