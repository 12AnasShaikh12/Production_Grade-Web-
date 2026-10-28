import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/config/env";
import { activeProducts } from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getSiteContent();
  const base = publicSiteUrl();
  const staticRoutes = ["", "/shop", "/ingredients", "/skin-guide", "/about", "/faq", "/contact"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));
  const products = activeProducts(content).map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));
  // Only published policies are listed; unpublished placeholders are noindex.
  const policies = content.policies
    .filter((p) => p.status === "approved" && p.body)
    .map((p) => ({ url: `${base}/policies/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3 }));
  return [...staticRoutes, ...products, ...policies];
}
