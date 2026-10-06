import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogArticleCard from "@/components/BlogArticleCard";
import { siteConfig } from "@/config/site";
import { blogArchivePath, parseBlogPageNumber } from "@/lib/blog";
import { cleanMetadataText } from "@/lib/seo";
import { getBlogArchivePage } from "@/lib/shopify/blog";

interface BlogsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: BlogsPageProps): Promise<Metadata> {
  const requestedParams = await searchParams;
  const pageNumber = parseBlogPageNumber(requestedParams.page);
  const archive = pageNumber ? await getBlogArchivePage(pageNumber) : null;
  const canonical = `${siteConfig.url}${blogArchivePath(pageNumber ?? 1)}`;
  const baseTitle = cleanMetadataText(archive?.blog.seo.title)
    || `${siteConfig.blog.title} | ${siteConfig.name}`;
  const title = pageNumber && pageNumber > 1 ? `${baseTitle} – Page ${pageNumber}` : baseTitle;
  const description = cleanMetadataText(archive?.blog.seo.description) || siteConfig.blog.description;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    ...(pageNumber === null ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: siteConfig.name,
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function BlogsPage({ searchParams }: BlogsPageProps) {
  const requestedParams = await searchParams;
  const pageNumber = parseBlogPageNumber(requestedParams.page);
  if (pageNumber === null) notFound();

  const archive = await getBlogArchivePage(pageNumber);
  if (!archive) notFound();

  const previousHref = pageNumber > 1 ? blogArchivePath(pageNumber - 1) : undefined;
  const nextHref = archive.pageInfo.hasNextPage ? blogArchivePath(pageNumber + 1) : undefined;

  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10">
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="mb-7 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Home</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page">{siteConfig.blog.title}</li>
          </ol>
        </nav>

        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Apex insights</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl min-[100rem]:text-6xl">{siteConfig.blog.title}</h1>
          <p className="mt-4 text-lg leading-8 text-muted">{siteConfig.blog.description}</p>
        </header>

        {archive.articles.length ? (
          <section aria-label="Published guides and articles" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 min-[100rem]:gap-7">
            {archive.articles.map((article) => <BlogArticleCard key={article.id} article={article} />)}
          </section>
        ) : (
          <section className="mt-10 rounded-2xl border border-border bg-surface p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold">New guides are on the way</h2>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-muted">We’re preparing practical advice to help you choose and use workplace supplies with confidence.</p>
            <Link href="/shop" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Browse products</Link>
          </section>
        )}

        {(previousHref || nextHref) && (
          <nav aria-label="Blog pagination" className="mt-10 grid grid-cols-2 items-center border-t border-border pt-6 text-sm font-semibold sm:text-base">
            <span>{previousHref ? <Link href={previousHref} rel="prev" className="inline-flex min-h-11 items-center rounded-lg text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">← Previous articles</Link> : null}</span>
            <span className="text-right">{nextHref ? <Link href={nextHref} rel="next" className="inline-flex min-h-11 items-center rounded-lg text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Next articles →</Link> : null}</span>
          </nav>
        )}
      </div>
    </main>
  );
}
