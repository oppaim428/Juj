import { db, nextId } from "./db.server";
import { getOffer, publicClient } from "./catalog.server";
import { checkoutSchema, type CheckoutInput } from "./checkout.schemas";
import { checkPayment, configuredProviders, createCheckout, refundPayment, type PayState } from "./payments.server";
import { getSettings, type Provider } from "./settings.server";

export type OrderStatus = "pending_payment" | "paid" | "delivered" | "completed" | "disputed" | "refunded" | "cancelled";
export type Buyer = { id: string; email: string };
export type OrderDoc = {
  _id: number; buyer_id: string; buyer_email: string; seller_id: string; seller_name: string | null;
  offer_id: number; offer_slug: string; image_url: string | null; offer_title: string; option_id: string | null; option_label: string | null;
  quantity: number; unit_price_minor: number; total_minor: number; commission_minor: number; currency: string;
  input_values: Record<string, string>; delivery_type: string; status: OrderStatus; payment_provider: Provider; payment_ref: string | null;
  paid_at: Date | null; delivered_at: Date | null; completed_at: Date | null; created_at: Date;
};
export type TxDoc = {
  _id: number; order_id: number; provider: Provider; external_id: string; amount_minor: number; currency: string;
  status: "initiated" | "completed" | "failed" | "pending"; payment_status: PayState; created_at: Date; updated_at: Date;
};
export type MsgDoc = { order_id: number; sender: "buyer" | "admin" | "system"; kind: "message" | "delivery" | "system"; body: string; created_at: Date };

export const orders = async () => (await db()).collection<OrderDoc>("orders");
export const transactions = async () => (await db()).collection<TxDoc>("payment_transactions");
export const messages = async () => (await db()).collection<MsgDoc>("order_messages");
const fail = (error: string) => ({ ok: false as const, error });

export async function sysMsg(order_id: number, body: string, kind: MsgDoc["kind"] = "system", sender: MsgDoc["sender"] = "system") {
  await (await messages()).insertOne({ order_id, sender, kind, body, created_at: new Date() });
}

export const toOrder = ({ _id, ...o }: OrderDoc) => ({ id: _id, ...o });

async function startPayment(o: OrderDoc, origin: string) {
  const { url, externalId } = await createCheckout(o.payment_provider, {
    id: o._id, title: o.offer_title + (o.option_label ? ` — ${o.option_label}` : ""),
    unit: o.unit_price_minor, quantity: o.quantity, total: o.total_minor, currency: o.currency, origin,
  });
  const now = new Date();
  await (await transactions()).insertOne({
    _id: await nextId("payment_transactions"), order_id: o._id, provider: o.payment_provider, external_id: externalId,
    amount_minor: o.total_minor, currency: o.currency, status: "initiated", payment_status: "pending", created_at: now, updated_at: now,
  });
  await (await orders()).updateOne({ _id: o._id }, { $set: { payment_ref: externalId } });
  return url;
}

export async function availableMethods() {
  const [settings, configured] = [await getSettings(), configuredProviders()];
  return (Object.keys(configured) as Provider[]).map((id) => ({ id, available: settings.payment_methods[id] && configured[id] }));
}

export async function createOrder(buyer: Buyer, raw: CheckoutInput, origin: string) {
  const input = checkoutSchema.parse(raw);
  const methods = await availableMethods();
  if (!methods.find((x) => x.id === input.provider)?.available) return fail("This payment method is not available right now.");
  const data = await getOffer(input.offerId);
  if (!data) return fail("This offer isn't available.");
  const { offer, options, fields, seller } = data;
  if (offer.seller_id === buyer.id) return fail("You can't buy your own offer.");
  if (offer.stock_count < input.quantity) return fail("Not enough stock for this quantity.");
  const opt = options.find((o) => o.id === input.optionId);
  if (options.length && !opt) return fail("Choose an option.");
  const values: Record<string, string> = {};
  for (const f of fields) {
    const v = (input.inputs[f.key] ?? "").trim();
    if (!v) {
      if (f.required) return fail("Please fill in all required fields.");
      continue;
    }
    if (f.type === "number" && !/^\d{1,20}$/.test(v)) return fail("Please fill in all required fields.");
    if (f.type === "select" && !(f.select_options ?? []).includes(v)) return fail("Please fill in all required fields.");
    values[f.label] = v;
  }
  const { data: cat } = await publicClient().from("categories").select("commission_percent").eq("id", offer.category_id).maybeSingle();
  const unit = opt?.price_minor ?? offer.price_minor;
  const total = unit * input.quantity;
  const order: OrderDoc = {
    _id: await nextId("orders"), buyer_id: buyer.id, buyer_email: buyer.email, seller_id: offer.seller_id, seller_name: seller?.display_name ?? null,
    offer_id: offer.id, offer_slug: offer.slug, image_url: offer.image_url, offer_title: offer.title, option_id: opt?.id ?? null,
    option_label: opt?.label ?? null, quantity: input.quantity, unit_price_minor: unit, total_minor: total,
    commission_minor: Math.round((total * Number(cat?.commission_percent ?? 0)) / 100), currency: offer.currency,
    input_values: values, delivery_type: offer.delivery_type, status: "pending_payment", payment_provider: input.provider,
    payment_ref: null, paid_at: null, delivered_at: null, completed_at: null, created_at: new Date(),
  };
  await (await orders()).insertOne(order);
  try {
    return { ok: true as const, orderId: order._id, url: await startPayment(order, origin) };
  } catch (e) {
    console.error("[checkout]", e);
    await (await orders()).updateOne({ _id: order._id }, { $set: { status: "cancelled" } });
    return fail("Could not start the payment. Please try another method.");
  }
}

export async function retryPayment(buyer: Buyer, orderId: number, origin: string) {
  const o = await (await orders()).findOne({ _id: orderId, buyer_id: buyer.id, status: "pending_payment" });
  if (!o) return fail("This order can't be paid anymore.");
  try {
    return { ok: true as const, url: await startPayment(o, origin) };
  } catch (e) {
    console.error("[checkout:retry]", e);
    return fail("Could not start the payment. Please try another method.");
  }
}

/** Marks an order paid exactly once. */
export async function markPaid(orderId: number) {
  const r = await (await orders()).updateOne({ _id: orderId, status: "pending_payment" }, { $set: { status: "paid", paid_at: new Date() } });
  if (r.modifiedCount !== 1) return;
  await sysMsg(orderId, "Payment received. The money is held by the platform until the order is completed.");
}

async function setTx(id: number, state: PayState) {
  await (await transactions()).updateOne(
    { _id: id, payment_status: { $ne: "paid" } },
    { $set: { status: state === "paid" ? "completed" : state, payment_status: state, updated_at: new Date() } },
  );
}

export async function confirmPayment(orderId: number): Promise<OrderStatus | null> {
  const o = await (await orders()).findOne({ _id: orderId });
  if (!o || o.status !== "pending_payment") return o?.status ?? null;
  const t = await (await transactions()).findOne({ order_id: orderId }, { sort: { _id: -1 } });
  if (!t) return o.status;
  let state: PayState = "pending";
  try {
    state = await checkPayment(o.payment_provider, t.external_id, t.payment_status);
  } catch (e) {
    console.error("[payment:check]", e);
  }
  if (state !== "pending") await setTx(t._id, state);
  if (state === "paid") await markPaid(orderId);
  return (await (await orders()).findOne({ _id: orderId }))!.status;
}

/** Called by provider webhooks after their signature was verified. */
export async function paymentNotified(provider: Provider, externalId: string, state: PayState) {
  const t = await (await transactions()).findOne({ provider, external_id: externalId });
  if (!t) return;
  await setTx(t._id, state);
  if (state === "paid") await markPaid(t.order_id);
}

export async function completeOrder(orderId: number, note = "Order completed. The payment was released to the seller.") {
  const r = await (await orders()).updateOne(
    { _id: orderId, status: { $in: ["paid", "delivered", "disputed"] } },
    { $set: { status: "completed", completed_at: new Date() } },
  );
  if (r.modifiedCount !== 1) return false;
  await sysMsg(orderId, note);
  return true;
}

export async function refundOrder(orderId: number) {
  const r = await (await orders()).updateOne({ _id: orderId, status: { $in: ["paid", "delivered", "disputed"] } }, { $set: { status: "refunded" } });
  if (r.modifiedCount !== 1) return false;
  const o = (await (await orders()).findOne({ _id: orderId }))!;
  const auto = o.payment_ref ? await refundPayment(o.payment_provider, o.payment_ref) : false;
  await sysMsg(orderId, auto ? "The order was refunded to the buyer." : "The order was refunded. The admin sends the money back through the payment provider.");
  return true;
}

export async function deliverOrder(orderId: number, body: string) {
  const r = await (await orders()).updateOne({ _id: orderId, status: "paid" }, { $set: { status: "delivered", delivered_at: new Date() } });
  if (r.modifiedCount !== 1) return false;
  await sysMsg(orderId, body || "Your item was delivered.", "delivery", "admin");
  return true;
}

export async function cancelOrder(orderId: number) {
  const r = await (await orders()).updateOne({ _id: orderId, status: "pending_payment" }, { $set: { status: "cancelled" } });
  return r.modifiedCount === 1;
}

export async function autoCompleteOrders() {
  const { auto_complete_hours } = await getSettings();
  const due = await (await orders())
    .find({ status: "delivered", delivered_at: { $lt: new Date(Date.now() - auto_complete_hours * 3600_000) } }, { projection: { _id: 1 } })
    .limit(100).toArray();
  for (const d of due) await completeOrder(d._id, "Order completed automatically. The payment was released to the seller.");
}

export async function listBuyerOrders(buyer: Buyer) {
  await autoCompleteOrders();
  const list = await (await orders()).find({ buyer_id: buyer.id, status: { $ne: "cancelled" } }).sort({ _id: -1 }).limit(200).toArray();
  return list.map(toOrder);
}

export async function orderMessages(orderId: number) {
  const list = await (await messages()).find({ order_id: orderId }).sort({ _id: 1 }).toArray();
  return list.map(({ _id, ...m }) => ({ id: String(_id), ...m }));
}

export async function getBuyerOrder(buyer: Buyer, id: number) {
  await autoCompleteOrders();
  const o = await (await orders()).findOne({ _id: id, buyer_id: buyer.id });
  if (!o) return null;
  const s = o.status;
  return {
    order: toOrder(o),
    messages: await orderMessages(id),
    can: { pay: s === "pending_payment", confirm: s === "paid" || s === "delivered" },
  };
}

export async function confirmReceived(buyer: Buyer, orderId: number) {
  const d = await getBuyerOrder(buyer, orderId);
  if (!d?.can.confirm) throw new Error("This order can't be confirmed now.");
  await completeOrder(orderId);
}
