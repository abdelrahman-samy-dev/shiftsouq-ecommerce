/* ══════════════════════════════════════════════════════════════
   Product editor — form state ⇄ save payload (pure, client-safe)
   ══════════════════════════════════════════════════════════════ */

import type { ProductInput } from "./catalog-schema";
import type { ProductEditorData } from "./catalog-types";
import { coloursFromVariants, sizesFromVariants, SIZE_PRESETS, type ColourOption, type SizeSystem, type VariantRow } from "./catalog-variants";

export interface EditorImage {
  key: string;
  id: string | null;
  url: string;
  color_en: string | null;
  alt_text_en: string;
  alt_text_ar: string;
  /** Uploaded in this session and not saved yet (removing it deletes the file at once). */
  fresh: boolean;
}

export interface EditorState {
  name_en: string;
  name_ar: string;
  slug: string;
  /** The admin typed the slug: stop following the English name. */
  slugEdited: boolean;
  category_id: string;
  brand: string;
  tags: string[];
  description_en: string;
  description_ar: string;
  details_en: string;
  details_ar: string;
  care_en: string;
  care_ar: string;
  base_price: string;
  sale_price: string;
  size_system: SizeSystem;
  sizes: string[];
  colours: ColourOption[];
  variants: VariantRow[];
  images: EditorImage[];
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
}

let seq = 0;
export const newKey = (prefix = "k") => `${prefix}${Date.now().toString(36)}${(seq++).toString(36)}`;

const money = (n: number | null | undefined) => (n == null ? "" : String(n));

export function initialEditorState(data: ProductEditorData | null, defaultCategoryId = ""): EditorState {
  if (!data) {
    return {
      name_en: "",
      name_ar: "",
      slug: "",
      slugEdited: false,
      category_id: defaultCategoryId,
      brand: "",
      tags: [],
      description_en: "",
      description_ar: "",
      details_en: "",
      details_ar: "",
      care_en: "",
      care_ar: "",
      base_price: "",
      sale_price: "",
      size_system: "apparel",
      sizes: [...SIZE_PRESETS.apparel.slice(1, 5)],
      colours: [],
      variants: [],
      images: [],
      seo_title_en: "",
      seo_title_ar: "",
      seo_description_en: "",
      seo_description_ar: "",
      is_active: false,
      is_featured: false,
      is_new: true,
    };
  }
  const variants: VariantRow[] = data.variants.map((v) => ({
    key: v.id,
    id: v.id,
    sku: v.sku,
    size: v.size,
    color_en: v.color_en,
    color_ar: v.color_ar,
    color_hex: v.color_hex,
    stock: v.stock,
    stock_loaded: v.stock,
    price_override: v.price_override,
    locked: v.locked,
  }));
  return {
    name_en: data.name_en,
    name_ar: data.name_ar,
    slug: data.slug,
    slugEdited: true,
    category_id: data.category_id,
    brand: data.brand ?? "",
    tags: data.tags,
    description_en: data.description_en ?? "",
    description_ar: data.description_ar ?? "",
    details_en: data.details_en ?? "",
    details_ar: data.details_ar ?? "",
    care_en: data.care_en ?? "",
    care_ar: data.care_ar ?? "",
    base_price: money(data.base_price),
    sale_price: money(data.sale_price),
    size_system: data.size_system,
    sizes: sizesFromVariants(variants, data.size_system),
    colours: coloursFromVariants(variants, () => newKey("c")),
    variants,
    images: data.images.map((i) => ({
      key: i.id,
      id: i.id,
      url: i.url,
      color_en: i.color_en,
      alt_text_en: i.alt_text_en ?? "",
      alt_text_ar: i.alt_text_ar ?? "",
      fresh: false,
    })),
    seo_title_en: data.seo_title_en ?? "",
    seo_title_ar: data.seo_title_ar ?? "",
    seo_description_en: data.seo_description_en ?? "",
    seo_description_ar: data.seo_description_ar ?? "",
    is_active: data.is_active,
    is_featured: data.is_featured,
    is_new: data.is_new,
  };
}

/** What the save action receives. The first image is the main photo. */
export function toProductInput(state: EditorState, id: string | null, expectedUpdatedAt: string | null): ProductInput {
  return {
    id,
    expected_updated_at: expectedUpdatedAt,
    product: {
      name_en: state.name_en,
      name_ar: state.name_ar,
      slug: state.slug,
      category_id: state.category_id,
      brand: state.brand,
      tags: state.tags,
      description_en: state.description_en,
      description_ar: state.description_ar,
      details_en: state.details_en,
      details_ar: state.details_ar,
      care_en: state.care_en,
      care_ar: state.care_ar,
      base_price: state.base_price,
      sale_price: state.sale_price,
      size_system: state.size_system,
      seo_title_en: state.seo_title_en,
      seo_title_ar: state.seo_title_ar,
      seo_description_en: state.seo_description_en,
      seo_description_ar: state.seo_description_ar,
      is_active: state.is_active,
      is_featured: state.is_featured,
      is_new: state.is_new,
    },
    variants: state.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color_en: v.color_en,
      color_ar: v.color_ar,
      color_hex: v.color_hex,
      stock: v.stock,
      stock_loaded: v.stock_loaded,
      price_override: v.price_override,
    })),
    images: state.images.map((img, i) => ({
      id: img.id,
      url: img.url,
      color_en: img.color_en,
      alt_text_en: img.alt_text_en,
      alt_text_ar: img.alt_text_ar,
      is_primary: i === 0,
    })),
  };
}

/** A stable fingerprint of what would be saved, for the unsaved-changes check. */
export function editorFingerprint(state: EditorState): string {
  // The save payload plus the size / colour choices not generated yet (React keys left out).
  return JSON.stringify({
    input: toProductInput(state, null, null),
    sizes: state.sizes,
    colours: state.colours.map((c) => [c.name_en, c.name_ar, c.hex]),
  });
}

/** Which editor section shows a given error key. */
export type EditorSection = "basics" | "content" | "pricing" | "variants" | "media" | "seo" | "visibility";

const SECTION_OF: Record<string, EditorSection> = {
  name_en: "basics",
  name_ar: "basics",
  slug: "basics",
  duplicate_slug: "basics",
  category: "basics",
  brand: "basics",
  tags: "basics",
  description: "content",
  details: "content",
  care: "content",
  base_price: "pricing",
  sale_price: "pricing",
  price: "variants",
  size_system: "variants",
  sku: "variants",
  duplicate_sku: "variants",
  duplicate_variant: "variants",
  stock: "variants",
  stock_changed: "variants",
  size: "variants",
  color_en: "variants",
  color_ar: "variants",
  color_hex: "variants",
  too_many_variants: "variants",
  no_variants: "variants",
  variant_has_open_orders: "variants",
  image_url: "media",
  duplicate_image: "media",
  too_many_images: "media",
  image_colour: "media",
  alt_text: "media",
  seo_title: "seo",
  seo_description: "seo",
};

export function sectionForError(key: string): EditorSection | null {
  return SECTION_OF[key] ?? null;
}
