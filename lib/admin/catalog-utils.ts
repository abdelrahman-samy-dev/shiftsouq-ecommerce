/* ══════════════════════════════════════════════════════════════
   Admin catalogue — small pure helpers (client-safe)
   Slugs, the category tree, stock states and SEO previews.
   ══════════════════════════════════════════════════════════════ */

/* ── Slugs ───────────────────────────────────────────────────── */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX = 80;

/** URL slug from English text: "Linen Overshirt — Sand" → "linen-overshirt-sand". Arabic-only text gives "". */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug);
}

/** `base`, or `base-2`, `base-3` … — the first one not in `taken`. */
export function nextFreeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; n < 10_000; n++) {
    const candidate = `${base.slice(0, SLUG_MAX - String(n).length - 1)}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`;
}

/* ── Tags ────────────────────────────────────────────────────── */

export const MAX_TAGS = 20;
export const TAG_MAX = 40;

/** Trims, lower-cases Latin letters, drops blanks and duplicates. */
export function normalizeTags(tags: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, TAG_MAX);
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, MAX_TAGS);
}

/* ── Category tree ───────────────────────────────────────────── */

export interface TreeCategory {
  id: string;
  parent_id: string | null;
  name_en: string;
  name_ar: string;
  sort_order: number | null;
}

export type TreeNode<T extends TreeCategory> = T & { depth: number; children: TreeNode<T>[] };

const byOrder = <T extends TreeCategory>(a: T, b: T) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name_en.localeCompare(b.name_en);

/** Nests categories under their parents. Orphans (missing parent) and cycles become roots. */
export function buildTree<T extends TreeCategory>(categories: readonly T[]): TreeNode<T>[] {
  const ids = new Set(categories.map((c) => c.id));
  const children = new Map<string | null, T[]>();
  for (const c of categories) {
    const parent = c.parent_id && ids.has(c.parent_id) && c.parent_id !== c.id ? c.parent_id : null;
    const list = children.get(parent) ?? [];
    list.push(c);
    children.set(parent, list);
  }
  const seen = new Set<string>();
  const build = (parent: string | null, depth: number): TreeNode<T>[] =>
    (children.get(parent) ?? [])
      .slice()
      .sort(byOrder)
      .filter((c) => !seen.has(c.id))
      .map((c) => {
        seen.add(c.id);
        return { ...c, depth, children: build(c.id, depth + 1) };
      });
  const roots = build(null, 0);
  // Anything left is part of a cycle: show it at the top level rather than lose it.
  for (const c of categories) if (!seen.has(c.id)) roots.push({ ...c, depth: 0, children: [] });
  return roots;
}

/** Depth-first list of a tree (for indented selects and tables). */
export function flattenTree<T extends TreeCategory>(nodes: readonly TreeNode<T>[]): TreeNode<T>[] {
  const out: TreeNode<T>[] = [];
  const walk = (list: readonly TreeNode<T>[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/** The category and everything below it. */
export function descendantIds(categories: readonly TreeCategory[], id: string): Set<string> {
  const out = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parent_id && out.has(c.parent_id) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Swaps an id with its neighbour among siblings; returns the new sibling order or null at an edge. */
export function moveAmongSiblings(siblingIds: readonly string[], id: string, direction: "up" | "down"): string[] | null {
  const i = siblingIds.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= siblingIds.length) return null;
  const next = [...siblingIds];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/* ── Stock ───────────────────────────────────────────────────── */

export type StockState = "in" | "low" | "out";

/** One variant: 0 = sold out; at or below the threshold = low. */
export function stockState(stock: number, threshold: number): StockState {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "in";
}

/** A product: sold out when nothing is left; low when any variant is at or below the threshold. */
export function productStockState(total: number, minVariantStock: number, variantCount: number, threshold: number): StockState {
  if (variantCount === 0 || total <= 0) return "out";
  if (minVariantStock <= threshold) return "low";
  return "in";
}

/* ── SEO preview ─────────────────────────────────────────────── */

export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

/** Cuts text for a search-result preview, on a word boundary, with an ellipsis. */
export function snippetText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** "Details" text → bullet lines (one per line, blanks and leading dashes/bullets removed). */
export function detailLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);
}
