import { exec, one, rows } from "./db.server";
import { bannerSchema, contactSchema, pageSchema, siteInfoSchema, type SiteInfo } from "./content.schemas";
import { m } from "./msg";

const SITE_KEYS = ["site_name", "site_tagline", "logo_url", "favicon_url", "default_glow", "contact_email", "contact_phone", "contact_address", "social_links"] as const;

export type Banner = { id: number; title: string; subtitle: string; image_url: string; link_url: string; button_label: string; placement: "home" | "category" | "both"; sort_order: number; is_active: boolean };
export type Page = { id: number; slug: string; title: string; body: string; is_published: boolean; show_in_footer: boolean; sort_order: number; updated_at: Date };

export async function getSiteInfo(): Promise<SiteInfo> {
  const [kv, pages] = await Promise.all([
    rows<{ setting_key: string; value: string }>("SELECT setting_key, value FROM settings WHERE setting_key IN (?)", [SITE_KEYS]),
    rows<{ slug: string; title: string }>("SELECT slug, title FROM pages WHERE is_published = 1 AND show_in_footer = 1 ORDER BY sort_order, id"),
  ]);
  const data = Object.fromEntries(kv.map((r) => [r.setting_key, r.value]));
  const parsed = siteInfoSchema.safeParse({ site_name: "JUJ", ...data });
  return { ...(parsed.success ? parsed.data : siteInfoSchema.parse({ site_name: "JUJ" })), pages };
}

export async function saveSiteInfo(raw: unknown) {
  const d = siteInfoSchema.parse(raw);
  for (const k of SITE_KEYS) {
    await exec("INSERT INTO settings (setting_key, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [k, String(d[k])]);
  }
}

export async function listBanners(placement?: "home" | "category") {
  if (!placement) return rows<Banner>("SELECT * FROM banners ORDER BY sort_order, id");
  return rows<Banner>("SELECT * FROM banners WHERE is_active = 1 AND placement IN (?, 'both') ORDER BY sort_order, id", [placement]);
}

export async function saveBanner(raw: unknown) {
  const d = bannerSchema.parse(raw);
  const cols = [d.title, d.subtitle, d.image_url, d.link_url, d.button_label, d.placement, d.sort_order, d.is_active];
  if (d.id) {
    await exec("UPDATE banners SET title = ?, subtitle = ?, image_url = ?, link_url = ?, button_label = ?, placement = ?, sort_order = ?, is_active = ? WHERE id = ?", [...cols, d.id]);
    return { id: d.id };
  }
  const r = await exec("INSERT INTO banners (title, subtitle, image_url, link_url, button_label, placement, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", cols);
  return { id: r.insertId };
}

export const deleteBanner = (id: number) => exec("DELETE FROM banners WHERE id = ?", [id]);

export const listPages = () => rows<Page>("SELECT * FROM pages ORDER BY sort_order, id");

export const getPublishedPage = (slug: string) =>
  one<Page>("SELECT * FROM pages WHERE slug = ? AND is_published = 1", [slug]);

export async function savePage(raw: unknown) {
  const d = pageSchema.parse(raw);
  const clash = await one<{ id: number }>("SELECT id FROM pages WHERE slug = ? AND id <> ?", [d.slug, d.id ?? 0]);
  if (clash) throw new Error(m("This page address is already used."));
  const cols = [d.slug, d.title, d.body, d.is_published, d.show_in_footer, d.sort_order];
  if (d.id) {
    await exec("UPDATE pages SET slug = ?, title = ?, body = ?, is_published = ?, show_in_footer = ?, sort_order = ? WHERE id = ?", [...cols, d.id]);
    return { id: d.id };
  }
  const r = await exec("INSERT INTO pages (slug, title, body, is_published, show_in_footer, sort_order) VALUES (?, ?, ?, ?, ?, ?)", cols);
  return { id: r.insertId };
}

export const deletePage = (id: number) => exec("DELETE FROM pages WHERE id = ?", [id]);

export async function submitContact(raw: unknown, ip: string) {
  const d = contactSchema.parse(raw);
  const recent = await one<{ n: number }>("SELECT COUNT(*) n FROM contact_messages WHERE ip = ? AND created_at > NOW() - INTERVAL 1 HOUR", [ip]);
  if (Number(recent?.n ?? 0) >= 5) throw new Error(m("Too many messages. Please try again later."));
  await exec("INSERT INTO contact_messages (name, email, subject, message, ip) VALUES (?, ?, ?, ?, ?)", [d.name, d.email, d.subject, d.message, ip]);
}

export const listMessages = (status?: "new" | "read") =>
  rows<{ id: number; name: string; email: string; subject: string; message: string; status: "new" | "read"; created_at: Date }>(
    `SELECT id, name, email, subject, message, status, created_at FROM contact_messages ${status ? "WHERE status = ?" : ""} ORDER BY id DESC LIMIT 300`,
    status ? [status] : [],
  );

export const setMessageStatus = (id: number, status: "new" | "read" | "delete") =>
  status === "delete" ? exec("DELETE FROM contact_messages WHERE id = ?", [id]) : exec("UPDATE contact_messages SET status = ? WHERE id = ?", [status, id]);
