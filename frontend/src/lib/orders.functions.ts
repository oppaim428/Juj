import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkoutSchema, type CheckoutInput } from "./checkout.schemas";
import * as orders from "./orders.server";

const idOnly = z.object({ orderId: z.number().int().positive() });
type Ctx = { userId: string; claims: { email?: string } };
const buyerOf = (c: Ctx): orders.Buyer => ({ id: c.userId, email: String(c.claims.email ?? "") });
const origin = () => {
  const h = getRequest().headers;
  return h.get("origin") ?? `https://${h.get("x-forwarded-host") ?? h.get("host")}`;
};

export const fetchPaymentMethods = createServerFn({ method: "GET" }).handler(() => orders.availableMethods());

export const checkoutFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: CheckoutInput) => checkoutSchema.parse(d))
  .handler(async ({ data, context }) => orders.createOrder(buyerOf(context as Ctx), data, origin()));

export const retryPaymentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: number }) => idOnly.parse(d))
  .handler(async ({ data, context }) => orders.retryPayment(buyerOf(context as Ctx), data.orderId, origin()));

export const confirmCheckoutFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: number }) => idOnly.parse(d))
  .handler(async ({ data, context }) => {
    const d = await orders.getBuyerOrder(buyerOf(context as Ctx), data.orderId);
    if (!d) return { status: null };
    return { status: await orders.confirmPayment(data.orderId) };
  });

export const fetchMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => orders.listBuyerOrders(buyerOf(context as Ctx)));

export const fetchMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number }) => z.object({ id: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => orders.getBuyerOrder(buyerOf(context as Ctx), data.id));

export const confirmReceivedFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: number }) => idOnly.parse(d))
  .handler(async ({ data, context }) => {
    await orders.confirmReceived(buyerOf(context as Ctx), data.orderId);
    return { ok: true };
  });
