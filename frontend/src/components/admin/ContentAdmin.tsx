import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import * as C from "@/lib/content.functions";
import { GLOWS, type SiteInfo } from "@/lib/content.schemas";
import { fmtDate } from "@/lib/money";
import { selectCls } from "@/components/site/PanelLayout";
import { ConfirmButton } from "@/components/site/ConfirmButton";
import { ImageInput } from "@/components/site/ImageInput";
import { useRootData } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";

function useRun(keys: string[]) {
  const qc = useQueryClient();
  const router = useRouter();
  const { t } = useI18n();
  return async (fn: () => Promise<unknown>, ok = t("Saved")) => {
    try {
      await fn();
      toast.success(ok);
      for (const k of keys) qc.invalidateQueries({ queryKey: [k] });
      if (keys.includes("site-info")) await router.invalidate();
      return true;
    } catch (e) {
      toast.error(t((e as Error).message.split("\n")[0] ?? ""));
      return false;
    }
  };
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="block space-y-1 text-sm">{label}{children}</label>;
const Check = ({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (v: boolean) => void; testId: string }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid={testId} /> {label}</label>
);

const emptyBanner = { id: undefined as number | undefined, title: "", subtitle: "", image_url: "", link_url: "", button_label: "", placement: "home" as "home" | "category" | "both", sort_order: 0, is_active: true };

export function BannersAdmin() {
  const { t } = useI18n();
  const run = useRun(["admin-banners", "banners"]);
  const d = useQuery({ queryKey: ["admin-banners"], queryFn: () => C.fetchAdminBanners() });
  const [f, setF] = useState(emptyBanner);
  return (
    <>
      <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2" data-testid="banner-form" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => C.saveBannerFn({ data: f }))) setF(emptyBanner);
      }}>
        <div className="md:col-span-2"><Field label={t("Banner image (wide, e.g. 1600×500)")}><ImageInput value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} testId="banner-image" previewClass="h-24 w-full max-w-md" /></Field></div>
        <Field label={t("Title")}><Input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="banner-title" /></Field>
        <Field label={t("Subtitle")}><Input value={f.subtitle} maxLength={255} onChange={(e) => setF({ ...f, subtitle: e.target.value })} data-testid="banner-subtitle" /></Field>
        <Field label={t("Link (/catalog/… or https://…)")}><Input value={f.link_url} onChange={(e) => setF({ ...f, link_url: e.target.value })} data-testid="banner-link" /></Field>
        <Field label={t("Button text")}><Input value={f.button_label} maxLength={40} onChange={(e) => setF({ ...f, button_label: e.target.value })} data-testid="banner-button" /></Field>
        <Field label={t("Show on")}>
          <select className={`${selectCls} w-full`} value={f.placement} onChange={(e) => setF({ ...f, placement: e.target.value as typeof f.placement })} data-testid="banner-placement">
            <option value="home">{t("Home page")}</option><option value="category">{t("Category pages")}</option><option value="both">{t("Home and category pages")}</option>
          </select>
        </Field>
        <Field label={t("Sort order")}><Input type="number" min={0} value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} data-testid="banner-sort" /></Field>
        <Check label={t("Active")} checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} testId="banner-active" />
        <div className="flex gap-2 md:col-span-2">
          <Button size="sm" data-testid="banner-save">{f.id ? t("Save") : t("Add banner")}</Button>
          {f.id && <Button size="sm" type="button" variant="ghost" onClick={() => setF(emptyBanner)}>{t("Cancel")}</Button>}
        </div>
      </form>
      <ul className="grid gap-3 sm:grid-cols-2" data-testid="admin-banners-list">
        {(d.data ?? []).map((b) => (
          <li key={b.id} className="overflow-hidden rounded-xl border bg-card" data-testid={`admin-banner-${b.id}`}>
            <img src={b.image_url} alt="" className="h-28 w-full object-cover" />
            <div className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <span className="min-w-0 flex-1 truncate"><b>{b.title || t("(no title)")}</b> · {b.placement} · #{b.sort_order} {!b.is_active && `· ${t("Hidden")}`}</span>
              <Button size="sm" variant="outline" data-testid={`admin-banner-edit-${b.id}`} onClick={() => setF({ ...b, is_active: !!b.is_active })}>{t("Edit")}</Button>
              <ConfirmButton testId={`admin-banner-delete-${b.id}`} question={t("Delete this banner?")} onConfirm={() => run(() => C.deleteBannerFn({ data: { id: b.id } }))}>{t("Delete")}</ConfirmButton>
            </div>
          </li>
        ))}
        {d.data && !d.data.length && <li className="p-6 text-muted-foreground">{t("No banners yet.")}</li>}
      </ul>
    </>
  );
}

const emptyPage = { id: undefined as number | undefined, slug: "", title: "", body: "", is_published: true, show_in_footer: true, sort_order: 0 };

export function PagesAdmin() {
  const { t } = useI18n();
  const run = useRun(["admin-pages", "site-info"]);
  const d = useQuery({ queryKey: ["admin-pages"], queryFn: () => C.fetchAdminPages() });
  const [f, setF] = useState(emptyPage);
  return (
    <>
      <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3" data-testid="page-form" onSubmit={async (e) => {
        e.preventDefault();
        if (await run(() => C.savePageFn({ data: f }))) setF(emptyPage);
      }}>
        <Field label={t("Title")}><Input required value={f.title} maxLength={150} onChange={(e) => setF({ ...f, title: e.target.value, slug: f.id ? f.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} data-testid="page-title-input" /></Field>
        <Field label={t("Address: /pages/…")}><Input required value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase() })} data-testid="page-slug-input" /></Field>
        <Field label={t("Sort order")}><Input type="number" min={0} value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} data-testid="page-sort-input" /></Field>
        <div className="md:col-span-3"><Field label={t("Content — blank line = new paragraph, start a line with ## for a heading")}><Textarea rows={10} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} data-testid="page-body-input" /></Field></div>
        <Check label={t("Published")} checked={f.is_published} onChange={(v) => setF({ ...f, is_published: v })} testId="page-published" />
        <Check label={t("Show in footer")} checked={f.show_in_footer} onChange={(v) => setF({ ...f, show_in_footer: v })} testId="page-footer" />
        <div className="flex gap-2">
          <Button size="sm" data-testid="page-save">{f.id ? t("Save") : t("Add page")}</Button>
          {f.id && <Button size="sm" type="button" variant="ghost" onClick={() => setF(emptyPage)}>{t("Cancel")}</Button>}
        </div>
      </form>
      <ul className="divide-y rounded-xl border bg-card" data-testid="admin-pages-list">
        {(d.data ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 p-3 text-sm" data-testid={`admin-page-${p.slug}`}>
            <span className="min-w-0 flex-1"><b>{p.title}</b> <span className="text-muted-foreground">/pages/{p.slug} {!p.is_published && `· ${t("Draft")}`}</span></span>
            <Link to="/pages/$slug" params={{ slug: p.slug }} className="text-sm underline" data-testid={`admin-page-view-${p.slug}`}>{t("View")}</Link>
            <Button size="sm" variant="outline" data-testid={`admin-page-edit-${p.slug}`} onClick={() => setF({ ...p, is_published: !!p.is_published, show_in_footer: !!p.show_in_footer })}>{t("Edit")}</Button>
            <ConfirmButton testId={`admin-page-delete-${p.slug}`} question={t("Delete this page?")} onConfirm={() => run(() => C.deletePageFn({ data: { id: p.id } }))}>{t("Delete")}</ConfirmButton>
          </li>
        ))}
      </ul>
    </>
  );
}

export function MessagesAdmin() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<"" | "new" | "read">("");
  const run = useRun(["admin-messages"]);
  const d = useQuery({ queryKey: ["admin-messages", status], queryFn: () => C.fetchMessages({ data: { status: status || undefined } }) });
  return (
    <>
      <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} data-testid="admin-messages-filter">
        <option value="">{t("All")}</option><option value="new">{t("New")}</option><option value="read">{t("Read")}</option>
      </select>
      <ul className="space-y-3" data-testid="admin-messages-list">
        {(d.data ?? []).map((msg) => (
          <li key={msg.id} className={`space-y-2 rounded-xl border bg-card p-4 text-sm ${msg.status === "new" ? "border-primary" : ""}`} data-testid={`admin-message-${msg.id}`}>
            <div className="flex flex-wrap items-center gap-2">
              <b>{msg.name}</b>
              <a href={`mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject}`)}`} className="underline">{msg.email}</a>
              <span className="text-xs text-muted-foreground">{fmtDate(msg.created_at, locale)}</span>
              {msg.status === "new" && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{t("New")}</span>}
            </div>
            {msg.subject && <p className="font-semibold">{msg.subject}</p>}
            <p className="whitespace-pre-line break-words text-muted-foreground">{msg.message}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" data-testid={`admin-message-toggle-${msg.id}`} onClick={() => run(() => C.setMessageStatusFn({ data: { id: msg.id, status: msg.status === "new" ? "read" : "new" } }))}>
                {msg.status === "new" ? t("Mark as read") : t("Mark as new")}
              </Button>
              <ConfirmButton testId={`admin-message-delete-${msg.id}`} question={t("Delete this message?")} onConfirm={() => run(() => C.setMessageStatusFn({ data: { id: msg.id, status: "delete" } }))}>{t("Delete")}</ConfirmButton>
            </div>
          </li>
        ))}
        {d.data && !d.data.length && <li className="rounded-xl border bg-card p-6 text-center text-muted-foreground">{t("No messages.")}</li>}
      </ul>
    </>
  );
}

const glowSwatch: Record<string, string> = { green: "oklch(0.75 0.18 127)", orange: "oklch(0.7 0.21 45)", yellow: "oklch(0.9 0.2 95)", blue: "oklch(0.55 0.25 260)" };

export function SiteAdmin() {
  const { t } = useI18n();
  const { site } = useRootData();
  const run = useRun(["site-info"]);
  const [s, setS] = useState<Omit<SiteInfo, "pages">>(site);
  useEffect(() => setS(site), [site]);
  const set = (k: keyof typeof s) => (e: { target: { value: string } }) => setS({ ...s, [k]: e.target.value });
  return (
    <form className="space-y-6" data-testid="site-form" onSubmit={(e) => { e.preventDefault(); void run(() => C.saveSiteInfoFn({ data: s })); }}>
      <section className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2">
        <h2 className="font-display text-lg font-bold md:col-span-2">{t("Website info")}</h2>
        <Field label={t("Site name")}><Input required value={s.site_name} maxLength={60} onChange={set("site_name")} data-testid="site-name" /></Field>
        <Field label={t("Tagline (footer)")}><Input value={s.site_tagline} maxLength={255} onChange={set("site_tagline")} data-testid="site-tagline" /></Field>
        <Field label={t("Logo (leave empty to show the site name)")}><ImageInput value={s.logo_url} onChange={(v) => setS({ ...s, logo_url: v })} testId="site-logo" previewClass="h-12 w-auto" /></Field>
        <Field label={t("Favicon (square PNG or ICO)")}><ImageInput value={s.favicon_url} onChange={(v) => setS({ ...s, favicon_url: v })} testId="site-favicon" previewClass="h-10 w-10" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/webp" /></Field>
      </section>
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-display text-lg font-bold">{t("Standard color")}</h2>
        <p className="text-sm text-muted-foreground">{t("Everyone sees this color first. Visitors can still pick another one with the palette button.")}</p>
        <div className="flex flex-wrap gap-2">
          {GLOWS.map((g) => (
            <button key={g} type="button" onClick={() => setS({ ...s, default_glow: g })} data-testid={`site-glow-${g}`}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm capitalize ${s.default_glow === g ? "border-primary bg-accent font-semibold" : ""}`}>
              <span className="h-4 w-4 rounded-full" style={{ background: glowSwatch[g] }} /> {t(g)}
            </button>
          ))}
        </div>
      </section>
      <section className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
        <h2 className="font-display text-lg font-bold md:col-span-3">{t("Contact info")}</h2>
        <Field label={t("Email")}><Input type="email" value={s.contact_email} onChange={set("contact_email")} data-testid="site-contact-email" /></Field>
        <Field label={t("Phone")}><Input value={s.contact_phone} maxLength={40} onChange={set("contact_phone")} data-testid="site-contact-phone" /></Field>
        <Field label={t("Address")}><Input value={s.contact_address} maxLength={255} onChange={set("contact_address")} data-testid="site-contact-address" /></Field>
        <div className="md:col-span-3"><Field label={t("Social links — one per line: Name | https://link")}><Textarea rows={4} value={s.social_links} onChange={set("social_links")} placeholder={"Instagram | https://instagram.com/…\nTelegram | https://t.me/…"} data-testid="site-social" /></Field></div>
      </section>
      <Button data-testid="site-save">{t("Save")}</Button>
    </form>
  );
}
