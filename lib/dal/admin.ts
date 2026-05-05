/* ══════════════════════════════════════════════════════════════
   Admin Data Access Layer (DAL)
   ──────────────────────────────────────────────────────────────
   Fetches admin-specific data using the authenticated server client.
   RLS policies ensure only admins can access this data.
   ══════════════════════════════════════════════════════════════ */

import { createServerClient } from "@/lib/supabase/server";
import type { PaginationParams } from "@/lib/types";

export interface AdminPaginationParams extends PaginationParams {
  search?: string;
  status?: string;
}

export interface AdminDashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: any[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createServerClient();

  try {
    // All four counts + revenue query in parallel — no full table scans
    const [ordersCount, revenueResult, productsCount, usersCount, recentOrdersResult] =
      await Promise.all([
        // 1) Total Orders — count only, no row data
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true }),

        // 2) Total Revenue — fetch only `total` column, not entire rows
        supabase
          .from("orders")
          .select("total"),

        // 3) Total Products — count only
        supabase
          .from("products")
          .select("*", { count: "exact", head: true }),

        // 4) Total Users — count only
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),

        // 5) Recent 5 orders — fetch only what we display
        supabase
          .from("orders")
          .select("id, total, created_at, status, shipping_email, user:profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    if (ordersCount.error) throw ordersCount.error;
    if (revenueResult.error) throw revenueResult.error;
    if (productsCount.error) throw productsCount.error;
    if (usersCount.error) throw usersCount.error;
    if (recentOrdersResult.error) throw recentOrdersResult.error;

    const totalRevenue = (revenueResult.data || []).reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    return {
      totalOrders: ordersCount.count || 0,
      totalRevenue,
      totalProducts: productsCount.count || 0,
      totalUsers: usersCount.count || 0,
      recentOrders: recentOrdersResult.data || [],
    };
  } catch (error) {
    console.error("[getAdminDashboardStats] Error:", error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalProducts: 0,
      totalUsers: 0,
      recentOrders: [],
    };
  }
}

export async function getAllOrders({ page = 1, pageSize = 10, search, status }: AdminPaginationParams) {
  const supabase = await createServerClient();
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from("orders")
      .select("*, shipping_email, user:profiles(full_name)", { count: "exact" });

    if (search) {
      // Supabase text search. In a real app, you might use FTS or multiple ilike conditions.
      // Since order ID is UUID, casting might be needed for ID, but email and user are easy.
      // Wait, we can't easily search across joined tables with standard ilike in Supabase REST.
      // We will search by shipping_email or id (if it's a valid uuid). Let's stick to shipping_email for now.
      query = query.ilike("shipping_email", `%${search}%`);
    }

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return {
      orders: data || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    };
  } catch (error) {
    console.error("[getAllOrders] Error:", error);
    return { orders: [], count: 0, totalPages: 0 };
  }
}

export async function getAllProducts({ page = 1, pageSize = 10, search, status }: AdminPaginationParams) {
  const supabase = await createServerClient();
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from("products")
      .select("*, category:categories(name_en, name_ar)", { count: "exact" });

    if (search) {
      query = query.or(`name_en.ilike.%${search}%,name_ar.ilike.%${search}%`);
    }

    if (status && status !== "all") {
      if (status === "active") query = query.eq("is_active", true);
      if (status === "draft") query = query.eq("is_active", false);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return {
      products: data || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 0,
    };
  } catch (error) {
    console.error("[getAllProducts] Error:", error);
    return { products: [], count: 0, totalPages: 0 };
  }
}
