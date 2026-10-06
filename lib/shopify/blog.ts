import "server-only";

import { cache } from "react";
import { BLOG_PAGE_SIZE, resolveBlogPage } from "../blog";
import { siteConfig } from "../../config/site";
import { storefrontRequest } from "./client";
import { BLOG_ARCHIVE_QUERY, BLOG_ARTICLE_QUERY, SITEMAP_BLOG_ARTICLES_QUERY } from "./queries";
import type {
  ShopifyArticle,
  ShopifyArticleSummary,
  ShopifyBlog,
  ShopifySitemapArticle,
} from "./types";

export const BLOG_REVALIDATE_SECONDS = 60 * 60;
const SITEMAP_PAGE_SIZE = 250;
const BLOG_CACHE_OPTIONS = {
  revalidate: BLOG_REVALIDATE_SECONDS,
  tags: ["shopify-blog"],
};

export interface BlogArchivePage {
  blog: ShopifyBlog;
  articles: ShopifyArticleSummary[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface BlogArchiveResponse {
  blog: (ShopifyBlog & {
    articles: {
      nodes: ShopifyArticleSummary[];
      pageInfo: BlogArchivePage["pageInfo"];
    };
  }) | null;
}

interface BlogArticleResponse {
  blog: (ShopifyBlog & { articleByHandle: ShopifyArticle | null }) | null;
}

interface SitemapBlogResponse {
  blog: {
    articles: {
      nodes: ShopifySitemapArticle[];
      pageInfo: BlogArchivePage["pageInfo"];
    };
  } | null;
}

async function getArchiveCursorPage(after?: string): Promise<BlogArchivePage | null> {
  const data = await storefrontRequest<BlogArchiveResponse>(
    BLOG_ARCHIVE_QUERY,
    {
      blogHandle: siteConfig.blog.shopifyHandle,
      first: BLOG_PAGE_SIZE,
      after: after || null,
    },
    BLOG_CACHE_OPTIONS,
  );
  if (!data.blog) return null;
  return {
    blog: data.blog,
    articles: data.blog.articles.nodes,
    pageInfo: data.blog.articles.pageInfo,
  };
}

export const getBlogArchivePage = cache((pageNumber: number) => (
  resolveBlogPage(pageNumber, getArchiveCursorPage)
));

export const getBlogArticle = cache(async (handle: string): Promise<ShopifyArticle | null> => {
  const data = await storefrontRequest<BlogArticleResponse>(
    BLOG_ARTICLE_QUERY,
    { blogHandle: siteConfig.blog.shopifyHandle, articleHandle: handle },
    BLOG_CACHE_OPTIONS,
  );
  return data.blog?.articleByHandle ?? null;
});

export const getSitemapBlogArticles = cache(async (): Promise<ShopifySitemapArticle[]> => {
  const articles: ShopifySitemapArticle[] = [];
  let after: string | null = null;

  while (true) {
    const data: SitemapBlogResponse = await storefrontRequest<SitemapBlogResponse>(
      SITEMAP_BLOG_ARTICLES_QUERY,
      { blogHandle: siteConfig.blog.shopifyHandle, first: SITEMAP_PAGE_SIZE, after },
      BLOG_CACHE_OPTIONS,
    );
    if (!data.blog) return [];
    articles.push(...data.blog.articles.nodes.filter((article) => article.handle.trim()));
    if (!data.blog.articles.pageInfo.hasNextPage) break;
    const nextCursor = data.blog.articles.pageInfo.endCursor;
    if (!nextCursor || nextCursor === after) {
      throw new Error("Shopify blog sitemap pagination could not continue");
    }
    after = nextCursor;
  }

  return articles;
});
