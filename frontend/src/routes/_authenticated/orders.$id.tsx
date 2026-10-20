import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { confirmReceivedFn, fetchMyOrder, retryPaymentFn } from "@/lib/orders.functions";
import { formatPrice, offerPath } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/site/StatusBadge";
import { ConfirmButton } from "@/components/site/ConfirmButton";
import { OrderTimeline } from "@/components/site/OrderTimeline";
import { fmtDate, providerLabel } from "@/components/site/PanelLayout";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  validateSearch: z.object({ cancelled: z.coerce.number().optional().catch(undefined) }),
  head: ({ params }) => ({ meta: [{ title: `Order #${params.id} — JUJ` }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { cancelled } = Route.useSearch();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-order", id], queryFn: () => fetchMyOrder({ data: { id: Number(id) } }) });
  const [busy, setBusy] = useState(false);
  if (q.isPending) return <p className="py-24 text-center text-muted-foreground">Loading…</p>;
  if (!q.data) return <p className="py-24 text-center" data-testid="order-not-found">Order not found.</p>;
  const { order: o, messages, can } = q.data;

  const pay = async () => {
    setBusy(true);
    const r = await retryPaymentFn({ data: { orderId: o.id } });
    if (r.ok) return void (window.location.href = r.url);
    setBusy(false);
    toast.error(r.error);
  };
  const confirm = async () => {
    await confirmReceivedFn({ data: { orderId: o.id } });
    toast.success("Order completed. Thank you!");
    qc.invalidateQueries({ queryKey: ["my-order", id] });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6" data-testid="order-detail">
      <Link to="/orders" className="text-sm text-muted-foreground hover:underline" data-testid="order-back-link">← My orders</Link>
      {cancelled && o.status === "pending_payment" && (
        <p className="rounded-lg border bg-accent p-3 text-sm" data-testid="order-cancelled-note">The payment was cancelled. You can try again below.</p>
      )}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border bg-card p-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {o.image_url && <img src={o.image_url} alt="" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs text-muted-foreground">Order #{o.id} · {fmtDate(o.created_at)}</p>
          <Link to="/catalog/product/$offer" params={{ offer: offerPath(o.offer_slug, o.offer_id) }} className="block font-display text-lg font-semibold hover:underline">
            {o.offer_title}{o.option_label ? ` — ${o.option_label}` : ""}
          </Link>
          <p className="text-sm text-muted-foreground">×{o.quantity} · {providerLabel[o.payment_provider]} · Seller: {o.seller_name ?? "—"}</p>
        </div>
        <div className="space-y-1 text-end">
          <p className="font-display text-2xl font-bold" data-testid="order-total">{formatPrice(o.total_minor, o.currency)}</p>
          <StatusBadge status={o.status} />
        </div>
      </div>
      {Object.keys(o.input_values).length > 0 && (
        <dl className="grid gap-2 rounded-xl border bg-card p-4 text-sm sm:grid-cols-2">
          {Object.entries(o.input_values).map(([k, v]) => (
            <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
      )}
      <div className="flex flex-wrap gap-3">
        {can.pay && <Button size="lg" onClick={pay} disabled={busy} data-testid="order-pay-button">{busy ? "Redirecting to payment…" : "Pay now"}</Button>}
        {can.confirm && <ConfirmButton variant="default" question="Confirm you received the item?" onConfirm={confirm} testId="order-confirm-received">I received the item</ConfirmButton>}
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold">Updates</h2>
        <OrderTimeline messages={messages} />
      </section>
    </div>
  );
}
