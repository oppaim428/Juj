const labels: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  delivered: "Delivered",
  completed: "Completed",
  disputed: "Disputed",
  refunded: "Refunded",
  cancelled: "Cancelled",
  initiated: "Initiated",
  pending: "Pending",
  failed: "Failed",
};

const tone: Record<string, string> = {
  pending_payment: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  initiated: "bg-muted text-muted-foreground",
  paid: "bg-chart-4/20 text-foreground",
  delivered: "bg-chart-2/20 text-foreground",
  completed: "bg-primary/25 text-foreground",
  disputed: "bg-destructive/15 text-destructive",
  refunded: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
};

export const orderStatusLabel = (s: string) => labels[s] ?? s;

export function StatusBadge({ status }: { status: string }) {
  return (
    <span data-testid={`status-${status}`} className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[status] ?? "bg-secondary"}`}>
      {orderStatusLabel(status)}
    </span>
  );
}
