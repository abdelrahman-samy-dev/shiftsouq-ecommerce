/* Shared class strings for the checkout, bag, receipt and account screens (server-safe). */

/** Display-serif title for sections and panels (smaller than .t-h2; Arabic in semibold). */
export const panelTitle =
  "font-display text-[1.625rem] leading-[1.1] text-text-primary [&:lang(ar)]:font-semibold [&:lang(ar)]:text-[1.375rem] [&:lang(ar)]:leading-[1.4]";

/** Small muted meta line. */
export const metaText = "text-[0.8125rem] text-text-muted";

/** A hairline list row: label at the start, value at the end. */
export const totalRow = "flex items-baseline justify-between gap-4 text-sm";

/** Inline text link (underline grows darker on hover). */
export const textLink =
  "underline underline-offset-4 decoration-1 decoration-border-hover hover:decoration-text-primary transition-colors";

/** Notice banners. */
export const noticeTone = {
  neutral: "border-border bg-surface-elevated text-text-secondary",
  warning: "border-warning/40 bg-warning-bg text-text-primary",
  danger: "border-destructive-border bg-destructive-bg text-text-primary",
  success: "border-success/30 bg-success-bg text-text-primary",
} as const;
