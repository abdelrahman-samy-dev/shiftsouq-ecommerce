/* ══════════════════════════════════════════════════════════════
   ShiftSouq – TypeScript Type Definitions
   Database row types + UI enriched types + utility types
   ══════════════════════════════════════════════════════════════ */

// ── Enums ─────────────────────────────────────────────────────
export type UserRole = "customer" | "admin";
export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";
export type DiscountType = "percentage" | "fixed";
export type Locale = "en" | "ar";

// ── Database Row Types ────────────────────────────────────────

export interface Profile {
  id: string;
  auth_user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description_en: string | null;
  description_ar: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rating: number;
  total_orders: number;
  address: string | null;
  phone: string | null;
  operating_hours: Record<string, string> | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  store_id: string | null;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en: string | null;
  description_ar: string | null;
  base_price: number;
  sale_price: number | null;
  brand: string | null;
  rating: number;
  review_count: number;
  total_orders: number;
  is_featured: boolean;
  is_new: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color_en: string | null;
  color_ar: string | null;
  color_hex: string | null;
  sku: string;
  stock: number;
  price_override: number | null;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text_en: string | null;
  alt_text_ar: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_variant_id: string;
  quantity: number;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface Promocode {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  promocode_id: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_email: string | null;
  shipping_country: string | null;
  shipping_city: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_variant_id: string | null;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  image_url: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// ── Joined / Enriched UI Types ────────────────────────────────

export interface ProductWithDetails extends Product {
  category: Pick<Category, "name_en" | "name_ar" | "slug"> | null;
  primary_image: ProductImage | null;
  store: Pick<Store, "name" | "slug"> | null;
  variants?: Pick<ProductVariant, "id" | "size" | "color_en">[];
}

export interface ProductFull extends Product {
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
  store: Store | null;
  reviews: Review[];
}

export interface CartItemWithProduct extends CartItem {
  variant: ProductVariant & {
    product: Pick<Product, "id" | "name_en" | "name_ar" | "slug" | "base_price" | "sale_price">;
    product_image: ProductImage | null;
  };
}

export interface CategoryWithChildren extends Category {
  children: Category[];
}

// ── Utility Types ─────────────────────────────────────────────

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

/** Pagination params */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** Product filter params */
export interface ProductFilters {
  categorySlug?: string;
  categoryIds?: string[];
  storeSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  sortBy?: "price_asc" | "price_desc" | "newest" | "rating" | "popular";
  search?: string;
  isNew?: boolean;
  isFeatured?: boolean;
}
