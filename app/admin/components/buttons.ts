/* ══════════════════════════════════════════════════════════════
   Admin button classes (plain module: usable from server and
   client components, on <button>, <Link> and <a>).
     className={adminButton("outline", "sm")}
   Variants: primary (ink), outline (hairline), ghost, danger (outline),
   dangerSolid / warningSolid (confirm buttons).
   Sizes: sm 36px, md 40px — both grow to 44px on touch screens.
   ══════════════════════════════════════════════════════════════ */

import { cn } from "@/lib/utils";

export type AdminButtonVariant = "primary" | "outline" | "ghost" | "danger" | "dangerSolid" | "warningSolid";
export type AdminButtonSize = "sm" | "md" | "icon";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[3px] font-medium select-none " +
  "transition-[background-color,border-color,color,opacity] duration-150 " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<AdminButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-85",
  outline: "border border-border bg-surface-elevated text-text-primary hover:border-border-hover hover:bg-surface",
  ghost: "text-text-secondary hover:bg-surface hover:text-text-primary",
  danger: "border border-destructive-border bg-surface-elevated text-destructive hover:bg-destructive-bg",
  dangerSolid: "bg-destructive text-background hover:opacity-90",
  warningSolid: "bg-warning text-background hover:opacity-90",
};

const sizes: Record<AdminButtonSize, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem] pointer-coarse:h-11",
  md: "h-10 px-4 text-sm pointer-coarse:h-11",
  icon: "size-9 pointer-coarse:size-11",
};

/** Utility groups an extra className may override (the default from base/size is dropped). */
const GROUPS: [RegExp, RegExp][] = [
  [/^(inline-flex|flex|hidden|block|grid|inline-grid)$/, /^(inline-flex|flex|hidden|block|grid|inline-grid)$/],
  [/^justify-/, /^justify-/],
  [/^px-/, /^px-/],
  [/^h-/, /^h-/],
  [/^gap-/, /^gap-/],
];

function merge(defaults: string, extra?: string): string {
  if (!extra) return defaults;
  const extras = extra.split(/\s+/).filter(Boolean);
  const plain = extras.filter((c) => !c.includes(":"));
  const kept = defaults
    .split(/\s+/)
    .filter(Boolean)
    .filter((d) => d.includes(":") || !GROUPS.some(([extraRe, defRe]) => defRe.test(d) && plain.some((e) => extraRe.test(e))));
  return cn(kept.join(" "), extra);
}

export function adminButton(variant: AdminButtonVariant = "outline", size: AdminButtonSize = "sm", className?: string): string {
  return merge(cn(base, variants[variant], sizes[size]), className);
}
