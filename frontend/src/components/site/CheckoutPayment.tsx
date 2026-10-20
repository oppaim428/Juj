import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bitcoin, CreditCard, IndianRupee, Wallet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { checkoutFn, fetchPaymentMethods } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import type { Provider } from "@/lib/settings.server";

const meta = {
  stripe: { label: "Card", icon: CreditCard },
  paypal: { label: "PayPal", icon: Wallet },
  razorpay: { label: "Razorpay", icon: IndianRupee },
  crypto: { label: "Crypto", icon: Bitcoin },
} as const;

type Field = { key: string };

/** Checkout flow from Juj, wired to the existing Buy button. Reads field values from the page's inputs by id. */
export function useCheckout(offerId: number, optionId: string | undefined, fields: Field[]) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const methods = useQuery({ queryKey: ["payment-methods"], queryFn: () => fetchPaymentMethods() });
  const [picked, setProvider] = useState<Provider>();
  const provider = picked ?? methods.data?.find((m) => m.available)?.id;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const buy = async () => {
    if (!user) return navigate({ to: "/auth", search: { redirect: path } });
    if (!provider) return;
    const inputs = Object.fromEntries(
      fields.map((f) => [f.key, (document.getElementById(f.key) as HTMLInputElement | null)?.value ?? ""]),
    );
    setBusy(true);
    setErr(null);
    try {
      const r = await checkoutFn({ data: { offerId, optionId: optionId || undefined, quantity: 1, inputs, provider } });
      if (!r.ok) {
        setErr(r.error);
        setBusy(false);
        return;
      }
      window.location.href = r.url;
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return { methods: methods.data ?? [], provider, setProvider, buy, busy, err };
}

type Props = Pick<ReturnType<typeof useCheckout>, "methods" | "provider" | "setProvider">;

export function PaymentMethods({ methods, provider, setProvider }: Props) {
  if (!methods.length) return null;
  return (
    <div className="space-y-2" data-testid="payment-methods">
      <Label>Payment method</Label>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m) => {
          const M = meta[m.id];
          return (
            <button
              key={m.id}
              type="button"
              data-testid={`payment-method-${m.id}`}
              disabled={!m.available}
              onClick={() => setProvider(m.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-start text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${provider === m.id ? "border-primary bg-accent font-semibold" : "hover:border-primary"}`}
            >
              <M.icon className="h-4 w-4 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <span className="truncate">{M.label}</span>
                {!m.available && <span className="text-[10px] uppercase leading-tight text-muted-foreground">{m.configured ? "Unavailable" : "Not set up"}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
