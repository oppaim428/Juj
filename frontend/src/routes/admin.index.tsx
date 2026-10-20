import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminStats } from "@/lib/admin-panel.functions";
import { formatPrice } from "@/lib/money";
import { PageTitle, StatCard, providerLabel } from "@/components/site/PanelLayout";
import { StatusBadge } from "@/components/site/StatusBadge";

export const Route = createFileRoute("/admin/")({
  component: Page,
});

function Page() {
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchAdminStats() });
  const s = q.data;
  if (!s) return <p className="text-muted-foreground">Loading…</p>;
  const o = s.orders;
  return (
    <>
      <PageTitle>Dashboard</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard testId="admin-stat-gmv" label="Sales volume" value={formatPrice(s.gmv)} hint={`${s.itemsSold} items sold`} />
        <StatCard testId="admin-stat-commission" label="Platform earnings" value={formatPrice(s.commission)} hint="From completed orders" />
        <StatCard testId="admin-stat-todo" label="Orders to deliver" value={o.paid ?? 0} />
        <StatCard testId="admin-stat-pending" label="Awaiting payment" value={o.pending_payment ?? 0} />
        <StatCard testId="admin-stat-completed" label="Completed" value={o.completed ?? 0} />
        <StatCard testId="admin-stat-delivered" label="Delivered" value={o.delivered ?? 0} />
        <StatCard testId="admin-stat-refunded" label="Refunded" value={o.refunded ?? 0} />
        <StatCard testId="admin-stat-transactions" label="Payment attempts" value={s.transactions} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <section className="space-y-1 rounded-xl border bg-card p-4" data-testid="admin-recent-orders">
          <h2 className="font-display text-lg font-bold">Recent orders</h2>
          {!s.recent.length && <p className="py-6 text-sm text-muted-foreground">No orders yet.</p>}
          {s.recent.map((r) => (
            <Link key={r.id} to="/admin/orders/$id" params={{ id: String(r.id) }} data-testid={`admin-recent-order-${r.id}`} className="flex justify-between gap-2 rounded-lg p-2 text-sm hover:bg-accent">
              <span className="truncate">#{r.id} · {r.offer_title}</span>
              <span className="flex shrink-0 items-center gap-2">{formatPrice(r.total_minor, r.currency)} <StatusBadge status={r.status} /></span>
            </Link>
          ))}
        </section>
        <section className="space-y-2 rounded-xl border bg-card p-4" data-testid="admin-sales-by-provider">
          <h2 className="font-display text-lg font-bold">Sales by method</h2>
          {!s.byProvider.length && <p className="text-sm text-muted-foreground">No sales yet.</p>}
          {s.byProvider.map((p) => (
            <div key={p.provider} className="flex justify-between text-sm">
              <span>{providerLabel[p.provider as keyof typeof providerLabel] ?? p.provider} <span className="text-muted-foreground">×{p.n}</span></span>
              <span className="font-semibold">{formatPrice(p.total)}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
