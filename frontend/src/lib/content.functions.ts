import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import * as content from "./content.server";
import { requireUser } from "./auth.server";
import type { BannerInput, ContactInput, PageInput, SiteInfoInput } from "./content.schemas";

const admin_ = () => requireUser("admin");
const idOnly = z.object({ id: z.number().int().positive() });
const ok = { ok: true };

export const fetchSiteInfo = createServerFn({ method: "GET" }).handler(() => content.getSiteInfo());
export const siteInfoQuery = () => queryOptions({ queryKey: ["site-info"], queryFn: () => fetchSiteInfo(), staleTime: 5 * 60_000 });

export const fetchBanners = createServerFn({ method: "GET" })
  .validator((d: { placement: "home" | "category" }) => z.object({ placement: z.enum(["home", "category"]) }).parse(d))
  .handler(({ data }) => content.listBanners(data.placement));

export const fetchPage = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(({ data }) => content.getPublishedPage(data.slug));

export const submitContactFn = createServerFn({ method: "POST" })
  .validator((d: ContactInput) => d)
  .handler(async ({ data }) => {
    const h = getRequest().headers;
    const ip = h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "unknown";
    await content.submitContact(data, ip);
    return ok;
  });

export const saveSiteInfoFn = createServerFn({ method: "POST" })
  .validator((d: SiteInfoInput) => d)
  .handler(async ({ data }) => (await admin_(), await content.saveSiteInfo(data), ok));

export const fetchAdminBanners = createServerFn({ method: "GET" }).handler(async () => (await admin_(), content.listBanners()));

export const saveBannerFn = createServerFn({ method: "POST" })
  .validator((d: BannerInput) => d)
  .handler(async ({ data }) => (await admin_(), content.saveBanner(data)));

export const deleteBannerFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => idOnly.parse(d))
  .handler(async ({ data }) => (await admin_(), await content.deleteBanner(data.id), ok));

export const fetchAdminPages = createServerFn({ method: "GET" }).handler(async () => (await admin_(), content.listPages()));

export const savePageFn = createServerFn({ method: "POST" })
  .validator((d: PageInput) => d)
  .handler(async ({ data }) => (await admin_(), content.savePage(data)));

export const deletePageFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => idOnly.parse(d))
  .handler(async ({ data }) => (await admin_(), await content.deletePage(data.id), ok));

export const fetchMessages = createServerFn({ method: "GET" })
  .validator((d: { status?: "new" | "read" | undefined }) => z.object({ status: z.enum(["new", "read"]).optional() }).parse(d))
  .handler(async ({ data }) => (await admin_(), content.listMessages(data.status)));

export const setMessageStatusFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; status: "new" | "read" | "delete" }) => idOnly.extend({ status: z.enum(["new", "read", "delete"]) }).parse(d))
  .handler(async ({ data }) => (await admin_(), await content.setMessageStatus(data.id, data.status), ok));
