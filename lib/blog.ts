import { siteConfig } from "../config/site.ts";
import { cleanMetadataText, conciseMetadataDescription } from "./seo.ts";

export const BLOG_PAGE_SIZE = 12;

type PageParam = string | string[] | undefined;

interface ArticleSeoSource {
  title: string;
  excerpt: string | null;
  excerptHtml: string | null;
  content?: string;
  seo: { title: string | null; description: string | null };
}

interface CursorPage {
  articles: unknown[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

export function parseBlogPageNumber(value: PageParam): number | null {
  if (value === undefined) return 1;
  if (Array.isArray(value) || !/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export function blogArticlePath(handle: string): string {
  return `/blogs/${encodeURIComponent(handle.trim())}`;
}

export function blogArchivePath(pageNumber = 1): string {
  return pageNumber > 1 ? `/blogs?page=${pageNumber}` : "/blogs";
}

export function articleSeoTitle(article: ArticleSeoSource): string {
  return cleanMetadataText(article.seo.title)
    || `${cleanMetadataText(article.title) || siteConfig.blog.title} | ${siteConfig.name}`;
}

export function articleSeoDescription(article: ArticleSeoSource): string {
  return cleanMetadataText(article.seo.description)
    || conciseMetadataDescription(
      article.excerpt || article.excerptHtml || article.content || "",
      siteConfig.blog.description,
    );
}

export function articleCardExcerpt(article: Pick<ArticleSeoSource, "excerpt" | "excerptHtml">): string {
  return conciseMetadataDescription(
    article.excerpt || article.excerptHtml || "",
    "Read the full guide from Apex Business Supplies.",
    170,
  );
}

export function estimateReadingMinutes(content: string): number {
  const words = cleanMetadataText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function formatArticleDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date);
}

export async function resolveBlogPage<TPage extends CursorPage>(
  pageNumber: number,
  fetchPage: (after?: string) => Promise<TPage | null>,
): Promise<TPage | null> {
  let page = await fetchPage();
  if (!page || !page.articles.length) return pageNumber === 1 ? page : null;

  for (let currentPage = 2; currentPage <= pageNumber; currentPage += 1) {
    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) return null;
    page = await fetchPage(page.pageInfo.endCursor);
    if (!page?.articles.length) return null;
  }

  return page;
}
