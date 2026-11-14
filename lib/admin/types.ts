/* ══════════════════════════════════════════════════════════════
   Admin — data shapes passed from the server to admin pages.
   Only the fields the screens need (no access tokens, no raw rows).
   ══════════════════════════════════════════════════════════════ */

import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { PaymentMethod } from "./orders";

export interface AdminOrderListItem {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  total: number;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  governorate: string | null;
  city: string | null;
}

export interface AdminOrderItem {
  id: string;
  product_name: string;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  image_url: string | null;
  sku: string | null;
  product_slug: string | null;
}

export interface AdminOrderDetail extends AdminOrderListItem {
  updated_at: string | null;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  tax_amount: number;
  promo_code: string | null;
  country: string | null;
  address: string | null;
  notes: string | null;
  transaction_id: string | null;
  paymob_order_id: string | null;
  stock_released: boolean;
  has_account: boolean;
  items: AdminOrderItem[];
}

export interface LowStockVariant {
  id: string;
  sku: string;
  size: string | null;
  color_en: string | null;
  stock: number;
  product_id: string;
  product_name_en: string;
  product_name_ar: string;
  product_active: boolean;
}

export interface AdminDashboardStats {
  totalOrders: number;
  revenue: number;
  revenueOrders: number;
  awaitingPayment: number;
  toFulfil: number;
  cashToCollect: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: AdminOrderListItem[];
  lowStock: LowStockVariant[];
  lowStockCount: number;
}

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export type InboxView = "inbox" | "unread" | "archived";

export interface AdminProductVariant {
  id: string;
  sku: string;
  size: string | null;
  color_en: string | null;
  color_ar: string | null;
  stock: number;
  price_override: number | null;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  base_price: number;
  sale_price: number | null;
  category_id: string;
  is_active: boolean;
  category: { name_en: string; name_ar: string } | null;
  images: { url: string; is_primary: boolean; sort_order: number }[];
  variants: AdminProductVariant[];
  total_stock: number;
}

export interface AdminCategory {
  id: string;
  name_en: string;
  name_ar: string;
}

export interface OrderFilters {
  search?: string;
  status?: string;
  payment?: string;
  method?: string;
}
