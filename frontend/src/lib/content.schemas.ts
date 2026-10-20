import { z } from "zod";

const imageUrl = z.string().trim().max(500).regex(/^(https:\/\/|\/)/, "Use an https:// link or upload an image").or(z.literal(""));

export const GLOWS = ["green", "orange", "yellow", "blue"] as const;
export type Glow = (typeof GLOWS)[number];

export const siteInfoSchema = z.object({
  site_name: z.string().trim().min(1).max(60),
  site_tagline: z.string().trim().max(255).default(""),
  logo_url: imageUrl.default(""),
  favicon_url: imageUrl.default(""),
  default_glow: z.enum(GLOWS).default("orange"),
  contact_email: z.string().trim().email().max(254).or(z.literal("")).default(""),
  contact_phone: z.string().trim().max(40).default(""),
  contact_address: z.string().trim().max(255).default(""),
  social_links: z.string().trim().max(2000).default(""),
});
export type SiteInfoInput = z.input<typeof siteInfoSchema>;
export type SiteInfo = z.output<typeof siteInfoSchema> & { pages: { slug: string; title: string }[] };

export const bannerSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().trim().max(120).default(""),
  subtitle: z.string().trim().max(255).default(""),
  image_url: imageUrl.refine((v) => v !== "", "Add an image"),
  link_url: z.string().trim().max(500).regex(/^(https:\/\/|\/)/, "Links start with / or https://").or(z.literal("")).default(""),
  button_label: z.string().trim().max(40).default(""),
  placement: z.enum(["home", "category", "both"]).default("home"),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});
export type BannerInput = z.input<typeof bannerSchema>;

export const pageSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{1,80}$/, "Use lowercase letters, numbers and dashes"),
  title: z.string().trim().min(1).max(150),
  body: z.string().max(100_000).default(""),
  is_published: z.boolean().default(true),
  show_in_footer: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});
export type PageInput = z.input<typeof pageSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().max(150).default(""),
  message: z.string().trim().min(5).max(5000),
});
export type ContactInput = z.input<typeof contactSchema>;

/** "Label | https://url" per line. */
export const parseSocial = (s: string) =>
  s.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p): p is [string, string] => p.length === 2 && !!p[0] && /^https:\/\//.test(p[1] ?? ""));
