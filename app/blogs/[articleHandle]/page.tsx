import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import ShopifyRichText from "@/components/ShopifyRichText";
import { siteConfig } from "@/config/site";
import {
  articleSeoDescription,
  articleSeoTitle,
  blogArticlePath,
  estimateReadingMinutes,
  formatArticleDate,
} from "@/lib/blog";
import { getBlogArticle } from "@/lib/shopify/blog";
import { buildArticleStructuredData } from "@/lib/structured-data";

interface ArticlePageProps {
  params: Promise<{ articleHandle: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { articleHandle } = await params;
  const article = await getBlogArticle(articleHandle);
  if (!article) return { title: "Article not found", robots: { index: false, follow: false } };

  const title = articleSeoTitle(article);
  const description = articleSeoDescription(article);
  const canonical = `${siteConfig.url}${blogArticlePath(article.handle)}`;
  const image = article.image ? {
    url: article.image.url,
    alt: article.image.altText || article.title,
    ...(article.image.width ? { width: article.image.width } : {}),
    ...(article.image.height ? { height: article.image.height } : {}),
  } : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: siteConfig.name,
      publishedTime: article.publishedAt,
      ...(article.authorV2?.name ? { authors: [article.authorV2.name] } : {}),
      ...(article.tags.length ? { tags: article.tags } : {}),
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image.url] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { articleHandle } = await params;
  const article = await getBlogArticle(articleHandle);
  if (!article) notFound();

  const publishedDate = formatArticleDate(article.publishedAt);
  const readingMinutes = estimateReadingMinutes(article.content);

  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10">
      <JsonLd id="article-structured-data" data={buildArticleStructuredData(article)} />
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="mb-7 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Home</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li><Link href="/blogs" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{siteConfig.blog.title}</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page" className="min-w-0 break-words">{article.title}</li>
          </ol>
        </nav>

        <article>
          <header className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{siteConfig.blog.title}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">{article.title}</h1>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted">
              {publishedDate ? <time dateTime={article.publishedAt}>{publishedDate}</time> : null}
              {article.authorV2?.name ? <><span aria-hidden="true">·</span><span>{article.authorV2.name}</span></> : null}
              <span aria-hidden="true">·</span><span>{readingMinutes} min read</span>
            </div>
            {article.excerpt ? <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted sm:text-xl">{article.excerpt}</p> : null}
          </header>

          {article.image ? (
            <div className="mx-auto mt-9 max-w-6xl overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <div className="relative aspect-video">
                <Image
                  src={article.image.url}
                  alt={article.image.altText || article.title}
                  fill
                  priority
                  sizes="(max-width: 1279px) calc(100vw - 2rem), 1152px"
                  className="object-contain"
                  style={{ objectFit: "contain" }}
                />
              </div>
            </div>
          ) : null}

          <div className="mx-auto mt-10 max-w-3xl">
            <ShopifyRichText html={article.contentHtml} text={article.content} variant="article" />
          </div>

          {article.tags.length ? (
            <footer className="mx-auto mt-10 max-w-3xl border-t border-border pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Topics</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {article.tags.map((tag) => <li key={tag} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted">{tag}</li>)}
              </ul>
            </footer>
          ) : null}
        </article>
      </div>
    </main>
  );
}
