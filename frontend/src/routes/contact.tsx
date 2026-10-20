import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactFn } from "@/lib/content.functions";
import { parseSocial } from "@/lib/content.schemas";
import { useRootData } from "@/hooks/useAuth";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact us — JUJ" }, { name: "description", content: "Get in touch with the JUJ team." }] }),
  component: Page,
});

const empty = { name: "", email: "", subject: "", message: "" };

function Page() {
  const { site } = useRootData();
  const { t } = useI18n();
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitContactFn({ data: f });
      setSent(true);
      setF(empty);
    } catch (err) {
      toast.error(t((err as Error).message.split("\n")[0] ?? "") || t("Please check the form and try again."));
    } finally {
      setBusy(false);
    }
  };

  const info = [
    site.contact_email && { icon: Mail, label: site.contact_email, href: `mailto:${site.contact_email}` },
    site.contact_phone && { icon: Phone, label: site.contact_phone, href: `tel:${site.contact_phone.replace(/\s/g, "")}` },
    site.contact_address && { icon: MapPin, label: site.contact_address },
  ].filter(Boolean) as { icon: typeof Mail; label: string; href?: string }[];

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_1.3fr]" data-testid="contact-page">
      <div className="space-y-6">
        <h1 className="text-4xl font-bold sm:text-5xl">{t("Contact us")}</h1>
        <p className="text-muted-foreground">{t("Questions about an order or selling on JUJ? Send us a message and we'll reply by email.")}</p>
        <ul className="space-y-3" data-testid="contact-info">
          {info.map((i) => (
            <li key={i.label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent"><i.icon className="h-4 w-4" /></span>
              {i.href ? <a href={i.href} className="hover:underline">{i.label}</a> : <span>{i.label}</span>}
            </li>
          ))}
        </ul>
        {parseSocial(site.social_links).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {parseSocial(site.social_links).map(([label, url]) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1 text-sm hover:border-primary">{label}</a>
            ))}
          </div>
        )}
      </div>
      {sent ? (
        <div className="flex flex-col items-start justify-center gap-3 rounded-2xl border bg-card p-8" data-testid="contact-success">
          <Send className="h-8 w-8 text-primary" />
          <h2 className="text-2xl font-bold">{t("Message sent")}</h2>
          <p className="text-muted-foreground">{t("Thanks! We'll get back to you by email soon.")}</p>
          <Button variant="outline" onClick={() => setSent(false)} data-testid="contact-send-another">{t("Send another message")}</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-card p-6" data-testid="contact-form">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="c-name">{t("Name")}</Label><Input id="c-name" required maxLength={100} value={f.name} onChange={set("name")} data-testid="contact-name" /></div>
            <div className="space-y-1.5"><Label htmlFor="c-email">{t("Email")}</Label><Input id="c-email" type="email" required maxLength={254} value={f.email} onChange={set("email")} data-testid="contact-email" /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="c-subject">{t("Subject")}</Label><Input id="c-subject" maxLength={150} value={f.subject} onChange={set("subject")} data-testid="contact-subject" /></div>
          <div className="space-y-1.5"><Label htmlFor="c-message">{t("Message")}</Label><Textarea id="c-message" required minLength={5} maxLength={5000} rows={6} value={f.message} onChange={set("message")} data-testid="contact-message" /></div>
          <Button className="button-glow" disabled={busy} data-testid="contact-submit">{busy ? t("Sending…") : t("Send message")}</Button>
        </form>
      )}
    </div>
  );
}
