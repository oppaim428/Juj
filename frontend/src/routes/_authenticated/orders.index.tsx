import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { fetchMyOrders } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/money";
import { StatusBadge } from "@/components/site/StatusBadge";
import { fmtDate } from "@/components/site/PanelLayout";

export const Route = createFileRoute("/_authenticated/orders/")({
  head: () => ({
    meta: [
      { title: "My orders — JUJ" },
      { name: "description", content: "Your JUJ orders." },
      { property: "og:title", content: "My orders — JUJ" },
      { property: "og:description", content: "Your JUJ orders." },
    ],
  }),
  component: Page,
});

function Page() {
  const q = useQuery({ queryKey: ["my-orders"], queryFn: () => fetchMyOrders() });
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <h1 className="text-3xl font-bold">My orders</h1>
      {q.isPending ? (
        <p className="py-16 text-center text-muted-foreground">Loading…</p>
      ) : !q.data?.length ? (
        <div className="py-16 text-center text-muted-foreground" data-testid="orders-empty">
          <Package className="mx-auto mb-3 h-10 w-10" />
          No orders yet.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card" data-testid="orders-list">
          {q.data.map((o) => (
            <li key={o.id}>
              <Link to="/orders/$id" params={{ id: String(o.id) }} data-testid={`order-row-${o.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-accent">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {o.image_url && <img src={o.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{o.offer_title}{o.option_label ? ` — ${o.option_label}` : ""}</p>
                  <p className="text-xs text-muted-foreground">#{o.id} · {fmtDate(o.created_at)} · ×{o.quantity}</p>
                </div>
                <div className="text-end">
                  <p className="font-display font-bold">{formatPrice(o.total_minor, o.currency)}</p>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
