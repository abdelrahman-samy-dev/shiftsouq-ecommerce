import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Buttons — docs/design-system.md §5. Square corners, ink fill, sentence case. */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
  "transition-[background-color,color,border-color,opacity] duration-150 ease-out " +
  "disabled:opacity-45 disabled:pointer-events-none aria-disabled:opacity-45 aria-disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-85 rounded-sm",
  secondary: "border border-text-primary text-text-primary bg-transparent hover:bg-text-primary hover:text-background rounded-sm",
  ghost: "text-text-primary hover:bg-surface rounded-sm",
  link: "text-text-primary underline underline-offset-4 decoration-1 decoration-border-hover hover:decoration-text-primary h-auto! px-0!",
  inverse: "bg-background text-text-primary hover:opacity-90 rounded-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-[0.9375rem]",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", fullWidth = false, className?: string) {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", fullWidth, loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={buttonClasses(variant, size, fullWidth, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      <span className={cn(loading && "opacity-80")}>{children}</span>
    </button>
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
};

export function ButtonLink({ variant = "primary", size = "md", fullWidth, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, fullWidth, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

type IconButtonProps = ComponentPropsWithoutRef<"button"> & { label: string; size?: "sm" | "md" };

/** 40px (md) / 32px (sm) square icon button. `label` is required: it becomes the aria-label. */
export function IconButton({ label, size = "md", className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-sm text-text-primary hover:bg-surface transition-colors duration-150",
        size === "md" ? "size-10" : "size-8",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-4 rounded-full border-[1.5px] border-current border-e-transparent animate-spin", className)}
    />
  );
}
