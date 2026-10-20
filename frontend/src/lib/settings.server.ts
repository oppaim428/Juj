import { db } from "./db.server";

export const PROVIDERS = ["stripe", "paypal", "razorpay", "crypto"] as const;
export type Provider = (typeof PROVIDERS)[number];
export type Settings = {
  site_name: string;
  support_email: string;
  auto_complete_hours: number;
  payment_methods: Record<Provider, boolean>;
};

type SettingsDoc = { _id: string } & Partial<Settings>;
const col = async () => (await db()).collection<SettingsDoc>("settings");

export async function getSettings(): Promise<Settings> {
  const d = await (await col()).findOne({ _id: "site" });
  const methods: Partial<Record<Provider, boolean>> = d?.payment_methods ?? {};
  return {
    site_name: d?.site_name ?? "JUJ",
    support_email: d?.support_email ?? "",
    auto_complete_hours: Number(d?.auto_complete_hours ?? 72) || 72,
    payment_methods: Object.fromEntries(PROVIDERS.map((p) => [p, methods[p] !== false])) as Record<Provider, boolean>,
  };
}

export async function saveSettings(s: Settings) {
  await (await col()).updateOne({ _id: "site" }, { $set: s }, { upsert: true });
}
