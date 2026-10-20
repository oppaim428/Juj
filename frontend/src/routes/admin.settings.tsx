import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchAdminSettings, saveSettingsFn } from "@/lib/admin-panel.functions";
import { PageTitle, providerLabel } from "@/components/site/PanelLayout";
import type { Settings } from "@/lib/settings.server";

export const Route = createFileRoute("/admin/settings")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchAdminSettings() });
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => { if (q.data) setS(q.data.settings); }, [q.data]);
  if (!s || !q.data) return <p className="text-muted-foreground">Loading…</p>;
  const configured = q.data.configured;

  const save = async () => {
    try {
      await saveSettingsFn({ data: s });
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
    } catch {
      toast.error("Check the values and try again.");
    }
  };

  return (
    <>
      <PageTitle action={<Button onClick={save} data-testid="admin-settings-save">Save</Button>}>Settings</PageTitle>
      <section className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="site_name">Site name</Label>
          <Input id="site_name" value={s.site_name} onChange={(e) => setS({ ...s, site_name: e.target.value })} data-testid="admin-settings-site-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="support_email">Support email</Label>
          <Input id="support_email" value={s.support_email} onChange={(e) => setS({ ...s, support_email: e.target.value })} data-testid="admin-settings-support-email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ach">Auto-complete after (hours)</Label>
          <Input id="ach" type="number" min={1} max={720} value={s.auto_complete_hours} onChange={(e) => setS({ ...s, auto_complete_hours: Number(e.target.value) })} data-testid="admin-settings-auto-complete" />
        </div>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg font-bold">Payment methods</h2>
        {(Object.keys(s.payment_methods) as (keyof Settings["payment_methods"])[]).map((p) => (
          <div key={p} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
            <div>
              <p className="font-medium">{providerLabel[p]}</p>
              <p className="text-xs text-muted-foreground" data-testid={`admin-provider-configured-${p}`}>{configured[p] ? "API keys configured" : "Not set up — add the keys to .env"}</p>
            </div>
            <Switch checked={s.payment_methods[p]} onCheckedChange={(v) => setS({ ...s, payment_methods: { ...s.payment_methods, [p]: v } })} data-testid={`admin-provider-toggle-${p}`} />
          </div>
        ))}
      </section>
    </>
  );
}
