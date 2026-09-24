import type { Metadata } from "next";
import Link from "next/link";
import ShopProductGrid from "@/components/ShopProductGrid";
import { getProductSearchPage, normalizeSearchQuery } from "@/lib/shopify/search";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = normalizeSearchQuery(firstValue((await searchParams).q));
  return {
    title: query ? `Search results for “${query}”` : "Search",
    description: query
      ? `Search results for ${query} from Apex Business Supplies.`
      : "Search products from Apex Business Supplies.",
    robots: { index: false, follow: true },
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = normalizeSearchQuery(firstValue((await searchParams).q));
  let searchPage = null;
  let failed = false;

  if (query.length >= 2) {
    try {
      searchPage = await getProductSearchPage(query);
    } catch {
      failed = true;
    }
  }

  const queryString = new URLSearchParams({ q: query }).toString();

  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10">
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">Home</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page">Search</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Search the catalogue</p>
          <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">
            {query ? <>Search results for “{query}”</> : "Search products"}
          </h1>
          {searchPage && (
            <p className="mt-3 text-muted">
              {searchPage.totalCount} {searchPage.totalCount === 1 ? "product" : "products"} found
            </p>
          )}
        </header>

        {query.length < 2 ? (
          <section className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">Enter at least two characters to search.</h2>
            <p className="mt-2 text-muted">Use the search field in the header to find products, categories and brands.</p>
            <Link href="/shop" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Browse all products
            </Link>
          </section>
        ) : failed || !searchPage ? (
          <section className="rounded-xl border border-border bg-surface px-6 py-16 text-center" role="alert">
            <h2 className="text-xl font-semibold">Search is temporarily unavailable.</h2>
            <p className="mt-2 text-muted">Please try again shortly or browse the full catalogue.</p>
            <Link href="/shop" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Browse all products
            </Link>
          </section>
        ) : (
          <ShopProductGrid
            key={query}
            initialPage={searchPage}
            queryString={queryString}
            loadMorePath="/api/search"
            clearHref="/shop"
            emptyTitle={`No products found for “${query}”.`}
            emptyDescription="Try a broader search term or browse the full catalogue."
            emptyActionLabel="Browse all products"
          />
        )}
      </div>
    </main>
  );
}
