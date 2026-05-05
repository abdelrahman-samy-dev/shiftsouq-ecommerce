"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string;
}

export function AdminFilterDropdown({
  options,
  defaultLabel,
  className,
}: {
  options: FilterOption[];
  defaultLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStatus = searchParams.get("status") || "all";

  const handleSelect = (status: string) => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    params.set("page", "1");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel =
    currentStatus === "all"
      ? defaultLabel
      : options.find((o) => o.value === currentStatus)?.label || defaultLabel;

  return (
    <div className={`relative ${className || ""}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`w-full flex items-center justify-between min-w-[160px] px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all disabled:opacity-50 ${
          isOpen ? "ring-2 ring-zinc-900 dark:ring-white" : ""
        }`}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          size={16}
          className={`ml-2 text-zinc-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[160px] mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg origin-top-right right-0 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => handleSelect("all")}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
              currentStatus === "all"
                ? "text-zinc-900 dark:text-white font-medium"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {defaultLabel}
            {currentStatus === "all" && <Check size={16} className="text-zinc-900 dark:text-white" />}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                currentStatus === opt.value
                  ? "text-zinc-900 dark:text-white font-medium"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {opt.label}
              {currentStatus === opt.value && <Check size={16} className="text-zinc-900 dark:text-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
