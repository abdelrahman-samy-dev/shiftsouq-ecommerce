/* ══════════════════════════════════════════════════════════════
   Admin catalogue — data shapes passed from the server to screens.
   Only the fields the screens need.
   ══════════════════════════════════════════════════════════════ */

import type { SizeSystem } from "./catalog-variants";

export interface CatalogProductRow {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category_id: string | null;
  category_name_en: string | null;
  category_name_ar: string | null;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  created_at: string | null;
  updated_at: string | null;
  thumbnail_url: string | null;
  total_stock: number;
  variant_count: number;
  min_stock: number;
}

export interface CatalogCategory {
  id: string;
  parent_id: string | null;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  product_count: number;
}

export interface EditorVariant {
  id: string;
  sku: string;
  size: string | null;
  color_en: string | null;
  color_ar: string | null;
  color_hex: string | null;
  stock: number;
  price_override: number | null;
  position: number;
  /** Has orders that are not finished: can't be removed. */
  locked: boolean;
}

export interface EditorImage {
  id: string;
  url: string;
  color_en: string | null;
  alt_text_en: string | null;
  alt_text_ar: string | null;
  is_primary: boolean;
}

export interface ProductEditorData {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  category_id: string;
  brand: string | null;
  tags: string[];
  description_en: string | null;
  description_ar: string | null;
  details_en: string | null;
  details_ar: string | null;
  care_en: string | null;
  care_ar: string | null;
  base_price: number;
  sale_price: number | null;
  size_system: SizeSystem;
  seo_title_en: string | null;
  seo_title_ar: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  created_at: string | null;
  updated_at: string | null;
  variants: EditorVariant[];
  images: EditorImage[];
  /** Order lines that reference this product (any status). */
  order_lines: number;
}

export interface PickerProduct {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  thumbnail_url: string | null;
  is_active: boolean;
  base_price: number;
  sale_price: number | null;
}

export interface CollectionRow {
  id: string;
  slug: string;
  title_en: string;
  title_ar: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string | null;
  product_count: number;
}

export interface CollectionEditorData extends CollectionRow {
  description_en: string | null;
  description_ar: string | null;
  products: PickerProduct[];
}

export interface InventoryRow {
  id: string;
  product_id: string;
  product_name_en: string;
  product_name_ar: string;
  product_slug: string;
  product_active: boolean;
  sku: string;
  size: string | null;
  color_en: string | null;
  color_ar: string | null;
  color_hex: string | null;
  stock: number;
  thumbnail_url: string | null;
}

export interface ListResult<T> {
  rows: T[];
  count: number;
  totalPages: number;
  page: number;
}
