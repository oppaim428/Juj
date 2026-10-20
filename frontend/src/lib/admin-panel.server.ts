import { escapeRegex } from "./db.server";
import {
  autoCompleteOrders, cancelOrder, completeOrder, deliverOrder, orderMessages, orders, refundOrder, toOrder, transactions,
  type OrderDoc, type OrderStatus,
} from "./orders.server";
import { getSettings, saveSettings } from "./settings.server";
import { configuredProviders } from "./payments.server";
import { orderActionSchema, settingsSchema } from "./checkout.schemas";

const SOLD = ["paid", "delivered", "completed", "disputed"];

export async function adminStats() {
  await autoCompleteOrders();
  const col = await orders();
  const [byStatus, money, byProvider, recent, txCount] = await Promise.all([
    col.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    col.aggregate<{ gmv: number; commission: number; sold: number }>([
      { $match: { status: { $in: SOLD } } },
      { $group: { _id: null, gmv: { $sum: "$total_minor" }, sold: { $sum: "$quantity" },
        commission: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$commission_minor", 0] } } } },
    ]).toArray(),
    col.aggregate<{ _id: string; total: number; n: number }>([
      { $match: { status: { $in: SOLD } } },
      { $group: { _id: "$payment_provider", total: { $sum: "$total_minor" }, n: { $sum: 1 } } },
    ]).toArray(),
    col.find({}).sort({ _id: -1 }).limit(8).toArray(),
    (await transactions()).countDocuments(),
  ]);
  return {
    orders: Object.fromEntries(byStatus.map((s) => [s._id, s.n])) as Partial<Record<OrderStatus, number>>,
    gmv: money[0]?.gmv ?? 0,
    commission: money[0]?.commission ?? 0,
    itemsSold: money[0]?.sold ?? 0,
    byProvider: byProvider.map((p) => ({ provider: p._id, total: p.total, n: p.n })),
    recent: recent.map(toOrder),
    transactions: txCount,
  };
}

export async function listOrdersAdmin(status?: string, q?: string) {
  await autoCompleteOrders();
  const filter: Record<string, unknown> = {};
  if (status) filter["status"] = status;
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter["$or"] = [{ _id: Number(q) || -1 }, { offer_title: rx }, { buyer_email: rx }];
  }
  const list = await (await orders()).find(filter as Partial<OrderDoc>).sort({ _id: -1 }).limit(300).toArray();
  return list.map(toOrder);
}

export async function getOrderAdmin(id: number) {
  const o = await (await orders()).findOne({ _id: id });
  if (!o) return null;
  const txs = await (await transactions()).find({ order_id: id }).sort({ _id: -1 }).toArray();
  const s = o.status;
  return {
    order: toOrder(o),
    messages: await orderMessages(id),
    transactions: txs.map(({ _id, ...t }) => ({ id: _id, ...t })),
    can: { refund: ["paid", "delivered", "disputed"].includes(s), release: ["paid", "delivered", "disputed"].includes(s), cancel: s === "pending_payment", deliver: s === "paid" },
  };
}

export async function resolveOrder(raw: unknown) {
  const { orderId, action, note } = orderActionSchema.parse(raw);
  if (action === "refund") return refundOrder(orderId);
  if (action === "release") return completeOrder(orderId, "The platform team completed this order and released the payment to the seller.");
  if (action === "deliver") return deliverOrder(orderId, note);
  return cancelOrder(orderId);
}

export async function listPayments(status?: string) {
  const txs = await (await transactions()).find(status ? { payment_status: status as "paid" } : {}).sort({ _id: -1 }).limit(300).toArray();
  const ords = await (await orders()).find({ _id: { $in: txs.map((t) => t.order_id) } }, { projection: { offer_title: 1, buyer_email: 1 } }).toArray();
  const byId = new Map(ords.map((o) => [o._id, o]));
  return txs.map(({ _id, ...t }) => ({ id: _id, ...t, offer_title: byId.get(t.order_id)?.offer_title ?? "", buyer_email: byId.get(t.order_id)?.buyer_email ?? "" }));
}

export async function adminSettings() {
  return { settings: await getSettings(), configured: configuredProviders() };
}

export async function updateSettings(raw: unknown) {
  await saveSettings(settingsSchema.parse(raw));
}
