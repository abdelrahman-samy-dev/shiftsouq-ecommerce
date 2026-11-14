"use client";

/* Password field with a show / hide button (ds field styles, label above, error below). */

import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldShell, controlClasses } from "@/components/ds";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  showLabel: string;
  hideLabel: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { id, label, error, hint, showLabel, hideLabel, className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          dir="ltr"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(controlClasses, "pe-12 text-start rtl:text-end", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          className="absolute end-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-sm text-text-muted hover:text-text-primary"
        >
          {visible ? <EyeOff className="size-4" strokeWidth={1.5} /> : <Eye className="size-4" strokeWidth={1.5} />}
        </button>
      </div>
    </FieldShell>
  );
});
