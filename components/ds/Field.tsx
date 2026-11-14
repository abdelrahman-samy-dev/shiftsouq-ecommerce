"use client";

import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./styles";

/* Form fields — docs/design-system.md §5. Label above, error below, 48px controls. */



interface FieldShellProps {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: string;
  className?: string;
  children: ReactNode;
}

export function FieldShell({ id, label, hint, error, optional, className, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-[0.8125rem] text-text-secondary">
          {label}
          {optional ? <span className="text-text-faint"> · {optional}</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[0.8125rem] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8125rem] text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = ComponentPropsWithoutRef<"input"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: string;
  wrapperClassName?: string;
};

export function Input({ label, hint, error, optional, wrapperClassName, className, id, ...props }: InputProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional} className={wrapperClassName}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(controlClasses, className)}
        {...props}
      />
    </FieldShell>
  );
}

type TextareaProps = ComponentPropsWithoutRef<"textarea"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: string;
  wrapperClassName?: string;
};

export function Textarea({ label, hint, error, optional, wrapperClassName, className, id, rows = 4, ...props }: TextareaProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} optional={optional} className={wrapperClassName}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn(controlClasses, "h-auto py-3 leading-relaxed resize-y", className)}
        {...props}
      />
    </FieldShell>
  );
}

type SelectProps = ComponentPropsWithoutRef<"select"> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
};

/** Native select (best on phones), styled to match. */
export function Select({ label, hint, error, wrapperClassName, className, id, children, ...props }: SelectProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          className={cn(controlClasses, "appearance-none pe-10 cursor-pointer", className)}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute end-4 top-1/2 size-3.5 -translate-y-1/2 text-text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3.5 6l4.5 4.5L12.5 6" />
        </svg>
      </div>
    </FieldShell>
  );
}

type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & { label: ReactNode; description?: ReactNode };

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <label htmlFor={fieldId} className={cn("group flex items-start gap-3 cursor-pointer select-none", className)}>
      <input
        id={fieldId}
        type="checkbox"
        className="peer mt-0.5 size-[18px] shrink-0 appearance-none rounded-[2px] border border-border-hover bg-surface-elevated
          checked:bg-text-primary checked:border-text-primary transition-colors duration-150
          bg-no-repeat bg-center checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23f6f4ef%22 stroke-width=%222%22><path d=%22M3.5 8.5l3 3 6-7%22/></svg>')]
          dark:checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23121110%22 stroke-width=%222%22><path d=%22M3.5 8.5l3 3 6-7%22/></svg>')]"
        {...props}
      />
      <span className="flex flex-col">
        <span className="text-sm text-text-primary">{label}</span>
        {description ? <span className="text-[0.8125rem] text-text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

type RadioCardProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  label: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
  icon?: ReactNode;
};

/** A bordered option row; the selected card gets an ink outline. Group them with the same `name`. */
export function RadioCard({ label, description, aside, icon, className, id, disabled, ...props }: RadioCardProps) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <label
      htmlFor={fieldId}
      className={cn(
        "relative flex items-center gap-4 p-4 border border-border rounded-sm cursor-pointer transition-colors duration-150",
        "hover:border-border-hover has-[:checked]:border-text-primary has-[:checked]:shadow-[inset_0_0_0_1px_var(--text-primary)]",
        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-text-primary",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <input id={fieldId} type="radio" className="sr-only" disabled={disabled} {...props} />
      <span
        aria-hidden="true"
        className="size-[18px] shrink-0 rounded-full border border-border-hover grid place-items-center
          [label:has(:checked)_&]:border-text-primary after:size-2 after:rounded-full after:bg-text-primary after:scale-0
          [label:has(:checked)_&]:after:scale-100 after:transition-transform"
      />
      {icon ? <span className="text-text-secondary">{icon}</span> : null}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        {description ? <span className="block text-[0.8125rem] text-text-muted">{description}</span> : null}
      </span>
      {aside ? <span className="text-sm text-text-secondary">{aside}</span> : null}
    </label>
  );
}
