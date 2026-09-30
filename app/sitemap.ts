import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getSitemapCollections, getSitemapProducts } from "@/lib/shopify/sitemap";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections] = await Promise.all([
    getSitemapProducts(),
    getSitemapCollections(),
  ]);
  const entries: MetadataRoute.Sitemap = ["", "/shop", "/about", "/contact"].map((path) => ({
    url: `${siteConfig.url}${path || "/"}`,
  }));
  const seen = new Set(entries.map((entry) => entry.url));

  for (const product of products) {
    const url = `${siteConfig.url}/products/${encodeURIComponent(product.handle)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    entries.push({ url, lastModified: product.updatedAt });
  }

  for (const collection of collections) {
    const url = `${siteConfig.url}/collections/${encodeURIComponent(collection.handle)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    entries.push({ url, lastModified: collection.updatedAt });
  }

  return entries;
}
