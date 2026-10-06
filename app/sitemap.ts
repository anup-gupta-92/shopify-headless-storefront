import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { blogArticlePath } from "@/lib/blog";
import { getSitemapBlogArticles } from "@/lib/shopify/blog";
import { getSitemapCollections, getSitemapProducts } from "@/lib/shopify/sitemap";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, articles] = await Promise.all([
    getSitemapProducts(),
    getSitemapCollections(),
    getSitemapBlogArticles(),
  ]);
  const entries: MetadataRoute.Sitemap = ["", "/shop", "/blogs", "/about", "/contact"].map((path) => ({
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

  for (const article of articles) {
    const url = `${siteConfig.url}${blogArticlePath(article.handle)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    entries.push({ url, lastModified: article.publishedAt });
  }

  return entries;
}
