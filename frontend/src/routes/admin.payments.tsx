import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAdminPayments } from "@/lib/admin-panel.functions";
import { formatPrice } from "@/lib/money";
import { PageTitle, fmtDate, providerLabel, selectCls } from "@/components/site/PanelLayout";
import { StatusBadge } from "@/components/site/StatusBadge";

export const Route = createFileRoute("/admin/payments")({
  component: Page,
});

function Page() {
  const [status, setStatus] = useState("");
  const q = useQuery({ queryKey: ["admin-payments", status], queryFn: () => fetchAdminPayments({ data: { status: status || undefined } }) });
  return (
    <>
      <PageTitle
        action={
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} data-testid="admin-payments-status-filter">
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        }
      >
        Payments
      </PageTitle>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm" data-testid="admin-payments-table">
          <thead className="border-b text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">#</th><th className="p-3">Order</th><th className="p-3">Method</th><th className="p-3">Reference</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody className="divide-y">
            {q.data?.map((t) => (
              <tr key={t.id} data-testid={`admin-payment-row-${t.id}`}>
                <td className="p-3 text-muted-foreground">{t.id}</td>
                <td className="max-w-[220px] p-3">
                  <Link to="/admin/orders/$id" params={{ id: String(t.order_id) }} className="block truncate hover:underline">#{t.order_id} · {t.offer_title}</Link>
                  <span className="text-xs text-muted-foreground">{t.buyer_email}</span>
                </td>
                <td className="p-3">{providerLabel[t.provider]}</td>
                <td className="max-w-[160px] truncate p-3 font-mono text-xs">{t.external_id}</td>
                <td className="p-3 font-semibold">{formatPrice(t.amount_minor, t.currency)}</td>
                <td className="p-3"><StatusBadge status={t.payment_status} /></td>
                <td className="whitespace-nowrap p-3 text-muted-foreground">{fmtDate(t.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {q.data && !q.data.length && <p className="p-8 text-center text-muted-foreground" data-testid="admin-payments-empty">No payments yet.</p>}
      </div>
    </>
  );
}
