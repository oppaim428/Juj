import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { fetchAdminOrders } from "@/lib/admin-panel.functions";
import { formatPrice } from "@/lib/money";
import { PageTitle, fmtDate, providerLabel, selectCls } from "@/components/site/PanelLayout";
import { StatusBadge, orderStatusLabel } from "@/components/site/StatusBadge";

export const Route = createFileRoute("/admin/orders/")({
  component: Page,
});

const STATUSES = ["pending_payment", "paid", "delivered", "completed", "disputed", "refunded", "cancelled"];

function Page() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["admin-orders", status, q],
    queryFn: () => fetchAdminOrders({ data: { status: status || undefined, q: q || undefined } }),
  });
  return (
    <>
      <PageTitle>Orders & sales</PageTitle>
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search by #, title or buyer email" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-xs" data-testid="admin-orders-search" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} data-testid="admin-orders-status-filter">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm" data-testid="admin-orders-table">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Order</th><th className="p-3">Buyer</th><th className="p-3">Method</th><th className="p-3">Total</th><th className="p-3">Fee</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody className="divide-y">
            {list.data?.map((o) => (
              <tr key={o.id} className="hover:bg-accent/50" data-testid={`admin-order-row-${o.id}`}>
                <td className="max-w-[260px] p-3">
                  <Link to="/admin/orders/$id" params={{ id: String(o.id) }} className="block truncate font-medium hover:underline" data-testid={`admin-order-link-${o.id}`}>#{o.id} · {o.offer_title}</Link>
                </td>
                <td className="p-3">{o.buyer_email}</td>
                <td className="p-3">{providerLabel[o.payment_provider]}</td>
                <td className="p-3 font-semibold">{formatPrice(o.total_minor, o.currency)}</td>
                <td className="p-3 text-muted-foreground">{formatPrice(o.commission_minor, o.currency)}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="whitespace-nowrap p-3 text-muted-foreground">{fmtDate(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.data && !list.data.length && <p className="p-8 text-center text-muted-foreground" data-testid="admin-orders-empty">No orders found.</p>}
      </div>
    </>
  );
}
