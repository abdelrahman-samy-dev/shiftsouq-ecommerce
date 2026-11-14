/* ══════════════════════════════════════════════════════════════
   Admin catalogue — size systems, colours and the variant matrix
   ──────────────────────────────────────────────────────────────
   Pure and client-safe: used by the product editor (live) and by
   the unit tests. The server re-validates everything it receives.
   ══════════════════════════════════════════════════════════════ */

export const SIZE_SYSTEMS = ["apparel", "waist", "shoes", "kids", "one_size"] as const;
export type SizeSystem = (typeof SIZE_SYSTEMS)[number];

/** Sizes offered for each system, in display order. "One size" variants have no size. */
export const SIZE_PRESETS: Record<SizeSystem, readonly string[]> = {
  apparel: ["XS", "S", "M", "L", "XL", "XXL"],
  waist: ["28", "29", "30", "31", "32", "33", "34", "36", "38", "40"],
  shoes: ["38", "39", "40", "41", "42", "43", "44", "45", "46"],
  kids: ["2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-11Y", "12-13Y"],
  one_size: [],
};

export function isSizeSystem(v: unknown): v is SizeSystem {
  return typeof v === "string" && (SIZE_SYSTEMS as readonly string[]).includes(v);
}

export const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
export const SKU_PATTERN = /^[A-Za-z0-9._\-/]{1,64}$/;

export interface ColourOption {
  /** Stable key for React lists (not stored). */
  key: string;
  name_en: string;
  name_ar: string;
  hex: string;
}

export interface VariantRow {
  /** Stable key for React lists (not stored). */
  key: string;
  /** Database id, or null for a row that is not saved yet. */
  id: string | null;
  sku: string;
  size: string | null;
  color_en: string | null;
  color_ar: string | null;
  color_hex: string | null;
  stock: number;
  /** Stock when the editor loaded the row (null for new rows). */
  stock_loaded: number | null;
  price_override: number | null;
  /** Has orders that are not finished yet: can't be removed. */
  locked: boolean;
}

/* ── Codes ───────────────────────────────────────────────────── */

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

/** "Overshirt" → "OVR": first letter, then consonants, padded with the remaining letters. */
export function compressWord(word: string, length = 3): string {
  const letters = word.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!letters) return "";
  const out = [letters[0]];
  const rest = letters.slice(1).split("");
  for (const ch of rest) if (out.length < length && !VOWELS.has(ch)) out.push(ch);
  for (const ch of rest) {
    if (out.length >= length) break;
    if (VOWELS.has(ch)) out.push(ch);
  }
  return out.join("").slice(0, length);
}

/** Product part of a SKU from its English name or slug: "Linen Overshirt" → "LNNOVR". */
export function skuBase(name: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const base = words.slice(0, 2).map((w) => compressWord(w)).join("");
  return base || "SKU";
}

/** Colour part of a SKU: "Black" → "BLC", "Off White" → "OFFWHT". Non-Latin names fall back to "C<n>". */
export function colourCode(name: string | null | undefined, index = 0): string {
  if (!name) return "";
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const code = words.slice(0, 2).map((w) => compressWord(w)).join("");
  return code || `C${index + 1}`;
}

/** Size part of a SKU: "2-3Y" → "23Y", "XL" → "XL". */
export function sizeCode(size: string | null | undefined): string {
  return (size ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function makeSku(base: string, colour?: string | null, size?: string | null, colourIndex = 0): string {
  return [base.toUpperCase(), colourCode(colour, colourIndex), sizeCode(size)].filter(Boolean).join("-").slice(0, 64);
}

/** Adds -2, -3 … until the SKU is not in `taken` (compared without letter case). */
export function uniqueSku(sku: string, taken: ReadonlySet<string>): string {
  const has = (s: string) => taken.has(s.toUpperCase());
  if (!has(sku)) return sku;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${sku.slice(0, 60)}-${n}`;
    if (!has(candidate)) return candidate;
  }
  return `${sku.slice(0, 50)}-${Date.now().toString(36).toUpperCase()}`;
}

/* ── Matrix ──────────────────────────────────────────────────── */

const comboKey = (colour: string | null | undefined, size: string | null | undefined) =>
  `${(colour ?? "").trim().toLowerCase()}|${(size ?? "").trim().toLowerCase()}`;

export interface MatrixInput {
  base: string;
  colours: readonly Pick<ColourOption, "name_en" | "name_ar" | "hex">[];
  sizes: readonly string[];
  existing: readonly VariantRow[];
  /** SKUs used by other products, so generated ones don't clash. */
  takenSkus?: ReadonlySet<string>;
  newKey?: () => string;
}

export interface MatrixResult {
  rows: VariantRow[];
  added: number;
  removed: number;
  /** Rows that no longer match a colour/size but have open orders, so they were kept. */
  keptLocked: number;
}

let keySeq = 0;
const defaultKey = () => `v${Date.now().toString(36)}${(keySeq++).toString(36)}`;

/**
 * Builds the colour × size grid. Rows that already exist for a combination are kept
 * (id, SKU, stock and price stay); missing combinations get a new row with a generated
 * SKU; rows that no longer match are dropped unless they are locked by open orders.
 */
export function buildMatrix({ base, colours, sizes, existing, takenSkus, newKey = defaultKey }: MatrixInput): MatrixResult {
  const colourList: (MatrixInput["colours"][number] | null)[] = colours.length ? [...colours] : [null];
  const sizeList: (string | null)[] = sizes.length ? [...sizes] : [null];

  const byCombo = new Map<string, VariantRow>();
  for (const row of existing) {
    const k = comboKey(row.color_en, row.size);
    if (!byCombo.has(k)) byCombo.set(k, row);
  }

  const taken = new Set<string>([...(takenSkus ?? [])].map((s) => s.toUpperCase()));
  for (const row of existing) if (row.sku) taken.add(row.sku.toUpperCase());

  const used = new Set<VariantRow>();
  const rows: VariantRow[] = [];
  let added = 0;

  colourList.forEach((colour, ci) => {
    for (const size of sizeList) {
      const match = byCombo.get(comboKey(colour?.name_en, size));
      if (match && !used.has(match)) {
        used.add(match);
        rows.push({
          ...match,
          color_en: colour?.name_en ?? null,
          color_ar: colour ? colour.name_ar || match.color_ar : null,
          color_hex: colour ? colour.hex || match.color_hex : null,
        });
        continue;
      }
      const sku = uniqueSku(makeSku(base, colour?.name_en, size, ci), taken);
      taken.add(sku.toUpperCase());
      rows.push({
        key: newKey(),
        id: null,
        sku,
        size,
        color_en: colour?.name_en ?? null,
        color_ar: colour?.name_ar ?? null,
        color_hex: colour?.hex ?? null,
        stock: 0,
        stock_loaded: null,
        price_override: null,
        locked: false,
      });
      added++;
    }
  });

  let removed = 0;
  let keptLocked = 0;
  for (const row of existing) {
    if (used.has(row)) continue;
    if (row.locked) {
      rows.push(row);
      keptLocked++;
    } else {
      removed++;
    }
  }
  return { rows, added, removed, keptLocked };
}

/** Distinct colours of a variant list, in first-seen order. */
export function coloursFromVariants(rows: readonly Pick<VariantRow, "color_en" | "color_ar" | "color_hex">[], newKey = defaultKey): ColourOption[] {
  const seen = new Map<string, ColourOption>();
  for (const r of rows) {
    if (!r.color_en) continue;
    const k = r.color_en.trim().toLowerCase();
    if (!seen.has(k)) seen.set(k, { key: newKey(), name_en: r.color_en, name_ar: r.color_ar ?? "", hex: r.color_hex ?? "" });
  }
  return [...seen.values()];
}

/** Distinct sizes of a variant list, ordered like the size system (unknown sizes last). */
export function sizesFromVariants(rows: readonly Pick<VariantRow, "size">[], system: SizeSystem): string[] {
  const preset = SIZE_PRESETS[system];
  const sizes = [...new Set(rows.map((r) => r.size).filter((s): s is string => !!s))];
  const rank = (s: string) => {
    const i = preset.indexOf(s);
    return i === -1 ? preset.length : i;
  };
  return sizes.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "en", { numeric: true }));
}

/** Moves one item of a list (used for variant, image and collection ordering). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}
