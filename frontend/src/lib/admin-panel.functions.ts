import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as admin from "./admin-panel.server";
import { currentAdmin, loginAdmin, logoutAdmin, requireAdmin } from "./admin-auth.server";

const filter = z.object({ q: z.string().max(100).optional(), status: z.string().max(30).optional() });

export const currentAdminFn = createServerFn({ method: "GET" }).handler(() => currentAdmin());

export const adminLoginFn = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(({ data }) => loginAdmin(data));

export const adminLogoutFn = createServerFn({ method: "POST" }).handler(() => {
  logoutAdmin();
  return { ok: true };
});

export const fetchAdminStats = createServerFn({ method: "GET" }).handler(async () => (await requireAdmin(), admin.adminStats()));

export const fetchAdminOrders = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string | undefined; status?: string | undefined }) => filter.parse(d))
  .handler(async ({ data }) => (await requireAdmin(), admin.listOrdersAdmin(data.status, data.q)));

export const fetchAdminOrder = createServerFn({ method: "GET" })
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data }) => (await requireAdmin(), admin.getOrderAdmin(data.id)));

export const resolveOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: number; action: "refund" | "release" | "cancel" | "deliver"; note?: string }) => d)
  .handler(async ({ data }) => (await requireAdmin(), { ok: await admin.resolveOrder(data) }));

export const fetchAdminPayments = createServerFn({ method: "GET" })
  .inputValidator((d: { status?: string | undefined }) => filter.parse(d))
  .handler(async ({ data }) => (await requireAdmin(), admin.listPayments(data.status)));

export const fetchAdminSettings = createServerFn({ method: "GET" }).handler(async () => (await requireAdmin(), admin.adminSettings()));

export const saveSettingsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d)
  .handler(async ({ data }) => (await requireAdmin(), await admin.updateSettings(data), { ok: true }));
