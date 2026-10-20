import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLoginFn } from "@/lib/admin-panel.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin login — JUJ" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr(null);
    const r = await adminLoginFn({ data: { email: String(f.get("email")), password: String(f.get("password")) } });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    navigate({ to: "/admin" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16" data-testid="admin-login-page">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Admin login</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required data-testid="admin-login-email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required data-testid="admin-login-password" />
        </div>
        {err && <p className="text-sm text-destructive" data-testid="admin-login-error">{err}</p>}
        <Button className="w-full" disabled={busy} data-testid="admin-login-submit">{busy ? "Logging in…" : "Log in"}</Button>
      </form>
    </div>
  );
}
