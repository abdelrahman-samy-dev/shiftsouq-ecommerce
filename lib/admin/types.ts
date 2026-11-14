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
  /** Customer account (profile id) when the order was placed signed in. */
  customer_id: string | null;
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
  /** Work queue: "fulfil" | "awaiting" | "cash" (see ORDER_QUEUES in lib/dal/admin.ts). */
  queue?: string;
  /** Sort: "newest" (default) | "oldest" | "total_desc" | "total_asc". */
  sort?: string;
  /** Orders of one customer account (profile id). */
  customer?: string;
}

/* ── Operations (dashboard, customers, engagement, team, activity) ── */

export interface QueueCounts {
  toFulfil: number;
  awaitingPayment: number;
  cashToCollect: number;
  lowStock: number;
  pendingReviews: number;
  unreadMessages: number;
  lowStockThreshold: number;
}

export interface PeriodStats {
  orders: number;
  revenue: number;
  revenueOrders: number;
  newCustomers: number;
}

export interface TopProduct {
  productId: string | null;
  nameEn: string;
  nameAr: string;
  slug: string | null;
  imageUrl: string | null;
  units: number;
  revenue: number;
}

export interface AdminCustomerListItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  joinedAt: string | null;
  lastSignInAt: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface AdminCustomerAddress {
  id: string;
  label: string | null;
  fullName: string | null;
  phone: string | null;
  governorate: string | null;
  city: string | null;
  address: string | null;
  apartment: string | null;
  postalCode: string | null;
  isDefault: boolean;
  /** "book" = address book (user_addresses), "checkout" = saved at checkout (profiles.default_address). */
  source: "book" | "checkout";
}

export interface AdminCustomerDetail extends AdminCustomerListItem {
  country: string | null;
  city: string | null;
  addresses: AdminCustomerAddress[];
  orders: AdminOrderListItem[];
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AdminReview {
  id: string;
  status: ReviewStatus;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  createdAt: string;
  author: { id: string; name: string | null } | null;
  product: { id: string; nameEn: string; nameAr: string; slug: string; imageUrl: string | null } | null;
}

export type NewsletterView = "subscribed" | "unsubscribed" | "all";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  locale: string;
  source: string | null;
  createdAt: string;
  unsubscribedAt: string | null;
}

export interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  role: "admin" | "super_admin";
  joinedAt: string | null;
  lastSignInAt: string | null;
  hasAccount: boolean;
}

export interface AuditEntry {
  id: number;
  createdAt: string;
  action: string;
  entity: string;
  entityId: string | null;
  data: Record<string, unknown>;
  actor: { id: string; name: string | null; email: string | null } | null;
}

export interface QuickSearchResults {
  orders: { id: string; orderNumber: string; customer: string | null; total: number; status: OrderStatus }[];
  customers: { id: string; name: string | null; email: string | null; phone: string | null }[];
  products: { id: string; nameEn: string; nameAr: string; slug: string; active: boolean }[];
}
