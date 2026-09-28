import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await createPublicClient().from("tours").select("slug, updated_at").eq("status", "published");
  const pages = ["", "/tours", "/about", "/contact"].map((p) => ({ url: `${site.url}${p}` }));
  return [
    ...pages,
    ...(data ?? []).map((t) => ({ url: `${site.url}/tours/${t.slug}`, lastModified: t.updated_at })),
  ];
}
