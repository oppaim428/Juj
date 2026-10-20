import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function requireAdmin(context: Ctx) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: admin only");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const sb = context.supabase;
    const [users, sellers, offers, orders, revenue] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("seller_profiles").select("user_id", { count: "exact", head: true }),
      sb.from("offers").select("id", { count: "exact", head: true }),
      sb.from("orders").select("id", { count: "exact", head: true }),
      sb.from("orders").select("total_minor, commission:order_items(commission_minor)").in("status", ["paid", "delivering", "delivered", "completed"]),
    ]);
    const rows = revenue.data ?? [];
    const totalRevenue = rows.reduce((s: number, o: any) => s + (o.total_minor ?? 0), 0);
    const totalCommission = rows.reduce(
      (s: number, o: any) => s + (o.commission ?? []).reduce((a: number, i: any) => a + (i.commission_minor ?? 0), 0),
      0,
    );
    return {
      users: users.count ?? 0,
      sellers: sellers.count ?? 0,
      offers: offers.count ?? 0,
      orders: orders.count ?? 0,
      totalRevenue,
      totalCommission,
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const sb = context.supabase;
    const [profiles, roles, sellers] = await Promise.all([
      sb.from("profiles").select("id, email, status, locale, currency, created_at").order("created_at", { ascending: false }),
      sb.from("user_roles").select("user_id, role"),
      sb.from("seller_profiles").select("user_id, display_name, verification_status, rating_avg, sales_count"),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const r of roles.data ?? []) roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    const sellerMap = new Map((sellers.data ?? []).map((s: any) => [s.user_id, s]));
    return (profiles.data ?? []).map((p: any) => ({
      ...p,
      roles: roleMap.get(p.id) ?? [],
      seller: sellerMap.get(p.id) ?? null,
    }));
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), status: z.enum(["active", "suspended", "banned"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    if (data.userId === context.userId) throw new Error("You cannot change your own status");
    const { error } = await context.supabase.from("profiles").update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.userId);
    if (error) throw new Error("Failed to update user");
    return { ok: true };
  });

export const setSellerVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), status: z.enum(["unverified", "pending", "verified", "rejected"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { error } = await context.supabase.from("seller_profiles").update({ verification_status: data.status }).eq("user_id", data.userId);
    if (error) throw new Error("Failed to update seller");
    return { ok: true };
  });

export const listAdminOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const { data, error } = await context.supabase
      .from("offers")
      .select("id, slug, title, price_minor, currency, status, stock_count, sales_count, delivery_type, created_at, seller:seller_profiles(display_name), category:categories(name)")
      .order("id", { ascending: false });
    if (error) throw new Error("Failed to load offers");
    return data;
  });

export const setOfferStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.number().int(), status: z.enum(["draft", "active", "paused", "archived"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { error } = await context.supabase.from("offers").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Failed to update offer");
    return { ok: true };
  });

export const listAdminCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const { data, error } = await context.supabase
      .from("categories")
      .select("id, parent_id, slug, name, icon, commission_percent, sort_order, show_in_header, is_active")
      .order("sort_order");
    if (error) throw new Error("Failed to load categories");
    return data;
  });

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  parent_id: z.string().uuid().nullable(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(120),
  icon: z.string().max(60).nullable().optional(),
  commission_percent: z.number().min(0).max(100),
  sort_order: z.number().int().min(0),
  show_in_header: z.boolean(),
  is_active: z.boolean(),
});

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => categoryInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { id, ...rest } = data;
    const row = { ...rest, icon: rest.icon ?? null };
    if (id && row.parent_id === id) throw new Error("A category cannot be its own parent");
    const { error } = id
      ? await context.supabase.from("categories").update(row).eq("id", id)
      : await context.supabase.from("categories").insert(row);
    if (error) throw new Error("Failed to save category");
    return { ok: true };
  });

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, number, status, total_minor, currency, guest_email, created_at, buyer:profiles(email), items:order_items(id, qty, unit_price_minor, commission_minor, status, offer:offers(title))")
      .order("number", { ascending: false });
    if (error) throw new Error("Failed to load orders");
    return data;
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["cancelled", "refunded", "completed", "needs_attention"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { error } = await context.supabase.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error("Failed to update order");
    return { ok: true };
  });
