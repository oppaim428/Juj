import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchAdminOrder, resolveOrderFn } from "@/lib/admin-panel.functions";
import { formatPrice } from "@/lib/money";
import { PageTitle, fmtDate, providerLabel } from "@/components/site/PanelLayout";
import { StatusBadge } from "@/components/site/StatusBadge";
import { ConfirmButton } from "@/components/site/ConfirmButton";
import { OrderTimeline } from "@/components/site/OrderTimeline";

export const Route = createFileRoute("/admin/orders/$id")({
  component: Page,
});

type Action = "refund" | "release" | "cancel" | "deliver";

function Page() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-order", id], queryFn: () => fetchAdminOrder({ data: { id: Number(id) } }) });
  if (q.isPending) return <p className="text-muted-foreground">Loading…</p>;
  if (!q.data) return <p data-testid="admin-order-not-found">Order not found.</p>;
  const { order: o, messages, transactions, can } = q.data;

  const run = async (action: Action, note = "") => {
    const r = await resolveOrderFn({ data: { orderId: o.id, action, note } });
    if (r.ok) toast.success("Order updated");
    else toast.error("This action is not possible for the current status.");
    qc.invalidateQueries({ queryKey: ["admin-order", id] });
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const rows: [string, string][] = [
    ["Buyer", o.buyer_email],
    ["Seller", o.seller_name ?? o.seller_id],
    ["Quantity", `×${o.quantity} · ${formatPrice(o.unit_price_minor, o.currency)} each`],
    ["Platform fee", formatPrice(o.commission_minor, o.currency)],
    ["Payment method", providerLabel[o.payment_provider]],
    ["Payment ref", o.payment_ref ?? "—"],
    ["Created", fmtDate(o.created_at)],
    ["Paid", fmtDate(o.paid_at)],
    ["Delivered", fmtDate(o.delivered_at)],
    ["Completed", fmtDate(o.completed_at)],
    ...Object.entries(o.input_values),
  ];

  return (
    <div className="space-y-6" data-testid="admin-order-detail">
      <Link to="/admin/orders" className="text-sm text-muted-foreground hover:underline" data-testid="admin-order-back">← All orders</Link>
      <PageTitle action={<StatusBadge status={o.status} />}>Order #{o.id}</PageTitle>
      <div className="rounded-xl border bg-card p-4">
        <p className="font-display text-lg font-semibold">{o.offer_title}{o.option_label ? ` — ${o.option_label}` : ""}</p>
        <p className="font-display text-3xl font-bold" data-testid="admin-order-total">{formatPrice(o.total_minor, o.currency)}</p>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b py-1"><dt className="text-muted-foreground">{k}</dt><dd className="truncate text-end font-medium">{v}</dd></div>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap gap-2" data-testid="admin-order-actions">
        {can.deliver && <ConfirmButton variant="default" question="Deliver this order?" withNote="Delivery message / code for the buyer" onConfirm={(n) => run("deliver", n)} testId="admin-order-deliver">Deliver</ConfirmButton>}
        {can.release && <ConfirmButton question="Complete the order and release the payment?" onConfirm={() => run("release")} testId="admin-order-release">Release payment</ConfirmButton>}
        {can.refund && <ConfirmButton variant="destructive" question="Refund this order to the buyer?" onConfirm={() => run("refund")} testId="admin-order-refund">Refund</ConfirmButton>}
        {can.cancel && <ConfirmButton question="Cancel this unpaid order?" onConfirm={() => run("cancel")} testId="admin-order-cancel">Cancel order</ConfirmButton>}
      </div>
      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">Payment attempts</h2>
        <ul className="divide-y rounded-xl border bg-card text-sm" data-testid="admin-order-transactions">
          {!transactions.length && <li className="p-3 text-muted-foreground">None.</li>}
          {transactions.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span className="truncate font-mono text-xs">{providerLabel[t.provider]} · {t.external_id}</span>
              <span className="flex items-center gap-2">{formatPrice(t.amount_minor, t.currency)} <StatusBadge status={t.payment_status} /></span>
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-lg font-bold">Timeline</h2>
        <OrderTimeline messages={messages} />
      </section>
    </div>
  );
}
