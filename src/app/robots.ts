import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/config/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/checkout", "/order/"] }],
    sitemap: `${publicSiteUrl()}/sitemap.xml`,
  };
}
