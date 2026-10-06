import Image from "next/image";
import Link from "next/link";
import { articleCardExcerpt, blogArticlePath, formatArticleDate } from "@/lib/blog";
import type { ShopifyArticleSummary } from "@/lib/shopify/types";

export default function BlogArticleCard({ article }: { article: ShopifyArticleSummary }) {
  const href = blogArticlePath(article.handle);
  const publishedDate = formatArticleDate(article.publishedAt);

  return (
    <article className="h-full">
      <Link
        href={href}
        aria-label={`Read ${article.title}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none"
      >
        <span className="relative block aspect-video overflow-hidden border-b border-border bg-surface-muted">
          {article.image ? (
            <Image
              src={article.image.url}
              alt={article.image.altText || article.title}
              fill
              sizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc((100vw - 4.5rem) / 2), (max-width: 1599px) calc((100vw - 7rem) / 3), 520px"
              className="object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
            />
          ) : (
            <span className="flex h-full items-center justify-center px-5 text-center text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              Apex Guides &amp; Advice
            </span>
          )}
        </span>
        <span className="flex flex-1 flex-col p-5 sm:p-6">
          {publishedDate ? <time dateTime={article.publishedAt} className="text-sm text-muted">{publishedDate}</time> : null}
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground group-hover:text-primary sm:text-2xl">{article.title}</h2>
          <span className="mt-3 line-clamp-3 leading-6 text-muted">{articleCardExcerpt(article)}</span>
          <span className="mt-auto pt-5 font-semibold text-primary">Read article <span aria-hidden="true">→</span></span>
        </span>
      </Link>
    </article>
  );
}
