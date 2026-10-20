import { fmtDate } from "./PanelLayout";

type Msg = { id: string; kind: "message" | "delivery" | "system"; sender: string; body: string; created_at: Date | string };

export function OrderTimeline({ messages }: { messages: Msg[] }) {
  if (!messages.length) return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  return (
    <ul className="space-y-2" data-testid="order-timeline">
      {messages.map((m) => (
        <li
          key={m.id}
          data-testid={`order-msg-${m.kind}`}
          className={`rounded-lg border p-3 text-sm ${m.kind === "delivery" ? "border-primary/50 bg-accent" : "bg-card"}`}
        >
          <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
            {m.kind === "delivery" ? "Delivery" : m.sender} · {fmtDate(m.created_at)}
          </p>
          <p className="whitespace-pre-line break-words">{m.body}</p>
        </li>
      ))}
    </ul>
  );
}
