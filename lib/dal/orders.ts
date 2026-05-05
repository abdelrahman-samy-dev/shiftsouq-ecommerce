/* ══════════════════════════════════════════════════════════════
   DAL – Orders Repository
   ──────────────────────────────────────────────────────────────
   Data-access module for order entities. Uses the authenticated
   Supabase server client so RLS policies restrict each user to
   only their own orders.

   All queries run server-side; no direct DB calls from client.
   ══════════════════════════════════════════════════════════════ */

import { createServerClient } from "@/lib/supabase/server";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaginationParams,
} from "@/lib/types";

/* ── Types ───────────────────────────────────────────────────── */

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface OrdersResult {
  orders: OrderWithItems[];
  count: number;
}

export interface OrderFilters {
  status?: OrderStatus;
}

/* ── Constants ───────────────────────────────────────────────── */

const ORDERS_PER_PAGE = 10;

/* ── Public Methods ──────────────────────────────────────────── */

/**
 * Fetches paginated orders for the currently authenticated user.
 * RLS ensures only the user's own orders are returned.
 *
 * @param pagination - Page number and page size.
 * @param filters    - Optional status filter.
 * @returns Orders array with nested order_items, plus total count.
 */
export async function getUserOrders(
  pagination?: PaginationParams,
  filters?: OrderFilters
): Promise<OrdersResult> {
  try {
    const supabase = await createServerClient();

    /* Verify authentication */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { orders: [], count: 0 };
    }

    /* Get profile ID from auth user ID */
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return { orders: [], count: 0 };
    }

    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? ORDERS_PER_PAGE;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    /* Build query */
    let query = supabase
      .from("orders")
      .select(
        `*,
         order_items(
           id, order_id, product_variant_id, product_name,
           variant_label, unit_price, quantity, image_url, created_at
         )`,
        { count: "exact" }
      )
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    /* Apply status filter */
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[DAL:getUserOrders]", error.message);
      return { orders: [], count: 0 };
    }

    return {
      orders: (data ?? []) as OrderWithItems[],
      count: count ?? 0,
    };
  } catch (err) {
    console.error("[DAL:getUserOrders] unexpected:", err);
    return { orders: [], count: 0 };
  }
}

/**
 * Fetches a single order by ID for the current user.
 * RLS enforces ownership; returns null if not found or not owned.
 *
 * @param orderId - The order UUID.
 * @returns Full order with items, or null.
 */
export async function getOrderById(
  orderId: string
): Promise<OrderWithItems | null> {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("orders")
      .select(
        `*,
         order_items(
           id, order_id, product_variant_id, product_name,
           variant_label, unit_price, quantity, image_url, created_at
         )`
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("[DAL:getOrderById]", error.message);
      return null;
    }

    return data as OrderWithItems | null;
  } catch (err) {
    console.error("[DAL:getOrderById] unexpected:", err);
    return null;
  }
}
